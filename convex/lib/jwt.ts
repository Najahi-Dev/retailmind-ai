// convex/lib/jwt.ts
// Minimal, dependency-free HS256 JWT implementation on top of the Web Crypto API.
// Works in the Convex default (V8) runtime, the Convex Node runtime, the Next.js
// proxy/route handlers and the vitest edge-runtime. Shared by backend and frontend
// server code so both sides sign/verify tokens identically.

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (absolute session lifetime)
export const IMPERSONATION_TTL_MS = 60 * 60 * 1000; // 1 hour, never refreshable
export const JWT_ISSUER = "retailmind";
export const JWT_AUDIENCE = "retailmind-app";
const CLOCK_SKEW_SEC = 30;

export type AccessTokenClaims = {
  sub: string; // user id
  sid: string; // session id
  role: string;
  orgId?: string;
  email?: string;
  name?: string;
  imp?: string; // impersonating super admin id
  typ: "access";
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Returns JWT_SECRET, refusing to run with a missing or weak secret. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Server misconfiguration: JWT_SECRET must be set to a random string of at least 32 characters.",
    );
  }
  return secret;
}

const keyCache = new Map<string, Promise<CryptoKey>>();
function getKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    keyCache.set(secret, key);
  }
  return key;
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string = getJwtSecret(),
): Promise<string> {
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await getKey(secret), enc.encode(data));
  return `${data}.${b64urlEncode(new Uint8Array(sig))}`;
}

/**
 * Verifies signature, algorithm, issuer, audience and expiry.
 * Returns the claims, or null for any invalid / expired / tampered token.
 */
export async function verifyJwt(
  token: string,
  secret: string = getJwtSecret(),
  nowMs: number = Date.now(),
): Promise<Record<string, any> | null> {
  try {
    if (typeof token !== "string" || token.length > 4096) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const header = JSON.parse(dec.decode(b64urlDecode(h)));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null; // blocks alg=none / alg confusion
    const ok = await crypto.subtle.verify(
      "HMAC",
      await getKey(secret),
      b64urlDecode(s) as BufferSource,
      enc.encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const claims = JSON.parse(dec.decode(b64urlDecode(p)));
    const nowSec = Math.floor(nowMs / 1000);
    if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SEC < nowSec) return null;
    if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_SEC > nowSec) return null;
    if (claims.iss !== JWT_ISSUER || claims.aud !== JWT_AUDIENCE) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function signAccessToken(
  input: {
    userId: string;
    sessionId: string;
    role: string;
    orgId?: string;
    email?: string;
    name?: string;
    impersonatedBy?: string;
    ttlMs?: number;
  },
  nowMs: number = Date.now(),
  secret?: string,
): Promise<{ token: string; expiresAt: number }> {
  const ttl = input.ttlMs ?? ACCESS_TOKEN_TTL_MS;
  const iat = Math.floor(nowMs / 1000);
  const exp = Math.floor((nowMs + ttl) / 1000);
  const claims: AccessTokenClaims = {
    sub: input.userId,
    sid: input.sessionId,
    role: input.role,
    orgId: input.orgId,
    email: input.email,
    name: input.name,
    imp: input.impersonatedBy,
    typ: "access",
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat,
    exp,
  };
  const token = await signJwt(claims, secret ?? getJwtSecret());
  return { token, expiresAt: exp * 1000 };
}

export async function verifyAccessToken(
  token: string,
  nowMs: number = Date.now(),
  secret?: string,
): Promise<AccessTokenClaims | null> {
  const claims = await verifyJwt(token, secret ?? getJwtSecret(), nowMs);
  if (!claims || claims.typ !== "access" || typeof claims.sub !== "string" || typeof claims.sid !== "string") {
    return null;
  }
  return claims as AccessTokenClaims;
}

/** Cryptographically secure random token (base64url, 256 bits by default). */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64urlEncode(buf);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

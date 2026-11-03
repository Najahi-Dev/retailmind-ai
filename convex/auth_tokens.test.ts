/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { signJwt, signAccessToken, verifyAccessToken, sha256Hex, JWT_ISSUER, JWT_AUDIENCE } from "./lib/jwt";

const modules = import.meta.glob("./**/*.ts");

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", {
      name: "Acme", slug: "acme", inviteCode: "ACME", plan: "growth", isActive: true, createdAt: Date.now(),
    });
    const userId = await ctx.db.insert("users", {
      email: "admin@acme.com", name: "Admin", role: "admin", orgId, isActive: true, createdAt: Date.now(),
    });
    return { orgId, userId };
  });
}

describe("JWT access tokens", () => {
  it("accepts a valid token and rejects tampering / alg=none / wrong secret", async () => {
    const { token } = await signAccessToken({ userId: "u1", sessionId: "s1", role: "admin" });
    expect((await verifyAccessToken(token))?.sub).toBe("u1");

    const [h, p, s] = token.split(".");
    const forgedPayload = btoa(JSON.stringify({ ...JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))), role: "super_admin" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifyAccessToken(`${h}.${forgedPayload}.${s}`)).toBeNull();

    const none = btoa(JSON.stringify({ alg: "none", typ: "JWT" })).replace(/=+$/, "");
    expect(await verifyAccessToken(`${none}.${p}.`)).toBeNull();

    const wrong = await signJwt(
      { sub: "u1", sid: "s1", typ: "access", iss: JWT_ISSUER, aud: JWT_AUDIENCE, exp: Math.floor(Date.now() / 1000) + 60 },
      "a-completely-different-secret-value-xxxxxxxxxx",
    );
    expect(await verifyAccessToken(wrong)).toBeNull();
  });

  it("rejects expired access tokens", async () => {
    const past = Date.now() - 60 * 60 * 1000;
    const { token } = await signAccessToken({ userId: "u1", sessionId: "s1", role: "admin" }, past);
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("authorizes via session and stops working once the session is revoked", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    const token = await createTestSession(t, userId);

    const me = await t.query(api.users.getCurrentUserRecord, { token });
    expect(me?._id).toBe(userId);
    expect((me as any)?.passwordHash).toBeUndefined();

    await t.run(async (ctx) => {
      const s = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", userId)).first();
      await ctx.db.patch(s!._id, { revokedAt: Date.now() });
    });
    expect(await t.query(api.users.getCurrentUserRecord, { token })).toBeNull();
  });

  it("rejects legacy opaque tokens and expired sessions", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    await t.run(async (ctx) =>
      ctx.db.insert("sessions", { userId, token: "legacy-token", expiresAt: Date.now() + 1e9, createdAt: Date.now() }),
    );
    expect(await t.query(api.users.getCurrentUserRecord, { token: "legacy-token" })).toBeNull();
    const expired = await createTestSession(t, userId, { expired: true });
    expect(await t.query(api.users.getCurrentUserRecord, { token: expired })).toBeNull();
  });
});

describe("Refresh token rotation", () => {
  async function loginSession(t: ReturnType<typeof convexTest>, userId: any, refresh: string) {
    return await t.mutation(internal.authInternal.completeLogin, {
      userId, email: "admin@acme.com", refreshTokenHash: await sha256Hex(refresh), ip: "1.1.1.1",
    });
  }

  it("rotates, allows a short multi-tab grace, then revokes on replay", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    await loginSession(t, userId, "rt-1");

    const r1 = await t.mutation(internal.authInternal.rotateRefreshToken, {
      refreshTokenHash: await sha256Hex("rt-1"), newRefreshTokenHash: await sha256Hex("rt-2"), ip: "1.1.1.1",
    });
    expect(r1?.mode).toBe("rotated");

    // Same old token again immediately (another tab) -> grace, no rotation
    const r2 = await t.mutation(internal.authInternal.rotateRefreshToken, {
      refreshTokenHash: await sha256Hex("rt-1"), newRefreshTokenHash: await sha256Hex("rt-x"), ip: "1.1.1.1",
    });
    expect(r2?.mode).toBe("grace");

    // Simulate the old token being replayed after the grace window -> session revoked
    await t.run(async (ctx) => {
      const s = await ctx.db.query("sessions").first();
      await ctx.db.patch(s!._id, { rotatedAt: Date.now() - 10 * 60 * 1000 });
    });
    const r3 = await t.mutation(internal.authInternal.rotateRefreshToken, {
      refreshTokenHash: await sha256Hex("rt-1"), newRefreshTokenHash: await sha256Hex("rt-y"), ip: "6.6.6.6",
    });
    expect(r3).toBeNull();

    // The legitimate current token is now dead too
    const r4 = await t.mutation(internal.authInternal.rotateRefreshToken, {
      refreshTokenHash: await sha256Hex("rt-2"), newRefreshTokenHash: await sha256Hex("rt-3"), ip: "1.1.1.1",
    });
    expect(r4).toBeNull();
    const logs = await t.run(async (ctx) => ctx.db.query("securityLogs").collect());
    expect(logs.some((l) => l.eventType === "REFRESH_TOKEN_REUSE")).toBe(true);
  });

  it("refuses refresh for deactivated users", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    await loginSession(t, userId, "rt-a");
    await t.run(async (ctx) => ctx.db.patch(userId, { isActive: false }));
    const r = await t.mutation(internal.authInternal.rotateRefreshToken, {
      refreshTokenHash: await sha256Hex("rt-a"), newRefreshTokenHash: await sha256Hex("rt-b"), ip: "1.1.1.1",
    });
    expect(r).toBeNull();
  });
});

describe("IP rate limiting & lockout", () => {
  it("limits login attempts per email and per IP", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    for (let i = 0; i < 10; i++) {
      await t.mutation(internal.authInternal.beginLogin, { email: "admin@acme.com", ip: `10.0.0.${i}` });
    }
    await expect(
      t.mutation(internal.authInternal.beginLogin, { email: "admin@acme.com", ip: "10.0.0.99" }),
    ).rejects.toThrow(/Too many requests/);

    for (let i = 0; i < 20; i++) {
      await t.mutation(internal.authInternal.beginLogin, { email: `u${i}@x.com`, ip: "9.9.9.9" });
    }
    await expect(
      t.mutation(internal.authInternal.beginLogin, { email: "other@x.com", ip: "9.9.9.9" }),
    ).rejects.toThrow(/Too many requests/);
  });

  it("locks the account after 5 failed logins", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.authInternal.recordFailedLogin, { userId, ip: "1.2.3.4" });
    }
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.lockedUntil).toBeGreaterThan(Date.now());
  });

  it("server-only rate limit endpoint requires the server secret", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.rateLimits.consumeForIp, { serverSecret: "nope", scope: "email", ip: "1.1.1.1", policy: "emailPerIp" }),
    ).rejects.toThrow(/Forbidden/);
  });
});

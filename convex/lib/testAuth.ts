// convex/lib/testAuth.ts
// Test-only helper (no registered Convex functions): creates a real session row
// and returns a signed access JWT for it, exactly like a login would.
import { signAccessToken } from "./jwt";

export async function createTestSession(
  t: { run: <T>(fn: (ctx: any) => Promise<T>) => Promise<T> },
  userId: string,
  opts: { expired?: boolean; revoked?: boolean; impersonatedBy?: string } = {},
): Promise<string> {
  const now = Date.now();
  const user = await t.run(async (ctx) => await ctx.db.get(userId));
  if (!user) throw new Error("createTestSession: user not found");
  const sessionId = await t.run(async (ctx) =>
    ctx.db.insert("sessions", {
      userId,
      orgId: user.orgId,
      refreshTokenHash: `test-${userId}-${now}-${Math.random()}`,
      expiresAt: opts.expired ? now - 1000 : now + 24 * 60 * 60 * 1000,
      createdAt: now,
      revokedAt: opts.revoked ? now : undefined,
      impersonatedBy: opts.impersonatedBy,
    }),
  );
  const { token } = await signAccessToken({
    userId,
    sessionId,
    role: user.role,
    orgId: user.orgId,
    email: user.email,
  });
  return token;
}

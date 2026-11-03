/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { sha256Hex } from "./lib/jwt";

const modules = import.meta.glob("./**/*.ts");

async function seed(t: ReturnType<typeof convexTest>, extra: Record<string, unknown> = {}) {
  return await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", {
      name: "Acme", slug: "acme", inviteCode: "A", plan: "growth", isActive: true, createdAt: Date.now(),
    });
    const userId = await ctx.db.insert("users", {
      email: "alice@acme.com", name: "Alice", role: "manager", orgId, isActive: true,
      passwordHash: "old-hash", createdAt: Date.now(), ...extra,
    });
    return { orgId, userId };
  });
}

async function request(t: ReturnType<typeof convexTest>, email: string, token: string, ip = "1.1.1.1") {
  await t.mutation(internal.authInternal.createPasswordReset, { email, ip, token, tokenHash: await sha256Hex(token) });
}

describe("Password reset", () => {
  it("stores only a hashed, expiring token and schedules the e-mail", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    await request(t, "alice@acme.com", "tok-1");
    const rows = await t.run(async (ctx) => ctx.db.query("passwordResetTokens").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
    expect(rows[0].tokenHash).toBe(await sha256Hex("tok-1"));
    expect(rows[0].expiresAt - rows[0].createdAt).toBe(30 * 60 * 1000);
    const scheduled = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled.some((s) => s.name.includes("sendPasswordResetEmail"))).toBe(true);
  });

  it("behaves identically for unknown e-mails (no enumeration, no token)", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await expect(request(t, "ghost@nowhere.com", "tok-x")).resolves.toBeUndefined();
    const rows = await t.run(async (ctx) => ctx.db.query("passwordResetTokens").collect());
    expect(rows).toHaveLength(0);
  });

  it("resets once, clears lockout, revokes every session, and the link can't be reused", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t, { failedLoginCount: 3, lockedUntil: Date.now() + 60_000 });
    const session = await createTestSession(t, userId);
    await request(t, "alice@acme.com", "tok-2");

    await t.mutation(internal.authInternal.consumePasswordReset, {
      tokenHash: await sha256Hex("tok-2"), passwordHash: "new-hash", ip: "1.1.1.1",
    });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.passwordHash).toBe("new-hash");
    expect(user!.lockedUntil).toBeUndefined();
    expect(user!.failedLoginCount).toBe(0);
    expect(await t.query(api.users.getCurrentUserRecord, { token: session })).toBeNull();

    await expect(
      t.mutation(internal.authInternal.consumePasswordReset, {
        tokenHash: await sha256Hex("tok-2"), passwordHash: "again", ip: "1.1.1.1",
      }),
    ).rejects.toThrow(/invalid or has expired/);
  });

  it("only the newest link works, and expired links are rejected", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await request(t, "alice@acme.com", "old");
    await request(t, "alice@acme.com", "new");
    await expect(
      t.mutation(internal.authInternal.consumePasswordReset, { tokenHash: await sha256Hex("old"), passwordHash: "x", ip: "1.1.1.1" }),
    ).rejects.toThrow(/invalid or has expired/);

    await t.run(async (ctx) => {
      const row = await ctx.db.query("passwordResetTokens").withIndex("by_token_hash", (q) => q.eq("tokenHash", "")).first();
      void row;
      const all = await ctx.db.query("passwordResetTokens").collect();
      for (const r of all) await ctx.db.patch(r._id, { expiresAt: Date.now() - 1 });
    });
    await expect(
      t.mutation(internal.authInternal.consumePasswordReset, { tokenHash: await sha256Hex("new"), passwordHash: "x", ip: "1.1.1.1" }),
    ).rejects.toThrow(/invalid or has expired/);
  });

  it("rate-limits requests per e-mail", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    for (let i = 0; i < 3; i++) await request(t, "alice@acme.com", `t${i}`, `10.0.0.${i}`);
    await expect(request(t, "alice@acme.com", "t9", "10.0.0.9")).rejects.toThrow(/Too many requests/);
  });

  it("public reset actions require the server secret", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.resetPassword, { token: "x", newPassword: "Abcdefgh12", serverSecret: "bad", ip: "1.1.1.1" }),
    ).rejects.toThrow(/Forbidden/);
  });
});

// app/api/users/update/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convexErrorResponse, getConvexServerClient } from "@/lib/server/request";
import { jsonError, readJson, requireCaller } from "../../_lib/guard";

// Authorization (who may edit whom, which fields, org scoping) is enforced by
// Convex `users.updateUserFullDetail` using the caller's verified access token.
const bodySchema = z.object({
  userId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_]+$/),
  name: z.string().trim().min(1).max(120),
  imageUrl: z
    .string()
    .max(2048)
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^https?:\/\//i.test(v), "imageUrl must be http(s)"),
  role: z.enum(["admin", "manager", "staff", "supplier", "pending"]).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireCaller(req);
    if ("response" in auth) return auth.response;
    const { token } = auth;

    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, "Invalid request body");
    const { userId, name, imageUrl, role, isActive } = parsed.data;

    const client = getConvexServerClient();
    const existingUser = await client.query(api.users.getUserById, {
      token,
      userId: userId as Id<"users">,
    });
    if (!existingUser) return jsonError(404, "User not found");

    const finalRole = role ?? existingUser.role;
    if (finalRole === "super_admin") return jsonError(403, "Forbidden");

    await client.mutation(api.users.updateUserFullDetail, {
      token,
      userId: userId as Id<"users">,
      name,
      imageUrl: imageUrl ?? existingUser.imageUrl,
      // Fields not supplied keep their current value; Convex rejects changes the
      // caller is not allowed to make.
      role: finalRole,
      isActive: isActive ?? existingUser.isActive,
    });

    return NextResponse.json({ success: true, message: "Updated Successfully" });
  } catch (err) {
    const { status, message } = convexErrorResponse(err, "Failed to update user");
    return jsonError(status, message);
  }
}

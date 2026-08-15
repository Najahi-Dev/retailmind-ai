// app/api/users/update/route.ts
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getServerUser } from "@/lib/get-server-user";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  try {
    const caller = await getServerUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, name, imageUrl, role, plan, isActive } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
    }

    const isSelf = caller.id === userId;
    const isAdminOrManager = ["admin", "manager"].includes(caller.role);

    if (!isAdminOrManager && !isSelf) {
      return NextResponse.json({ error: "Access Denied: You cannot edit another user's profile" }, { status: 403 });
    }

    // Fetch existing user to preserve role/plan/isActive if non-admin is updating self
    const existingUser = await convex.query(api.users.getUserById, { userId: userId as Id<"users"> });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const finalRole = isAdminOrManager ? role : existingUser.role;
    const finalPlan = isAdminOrManager ? plan : (existingUser.plan ?? "starter");
    const finalIsActive = isAdminOrManager ? isActive : existingUser.isActive;

    // Update Convex Database Document
    await convex.mutation(api.users.updateUserFullDetail, {
      userId: userId as Id<"users">,
      name,
      imageUrl: imageUrl ?? existingUser.imageUrl,
      role: finalRole,
      plan: finalPlan,
      isActive: finalIsActive,
    });

    return NextResponse.json({
      success: true,
      message: "Updated Successfully",
    });
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

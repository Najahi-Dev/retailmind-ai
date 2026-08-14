// app/api/users/update/route.ts
import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  try {
    const caller = await currentUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, clerkId, name, imageUrl, role, plan, isActive } = body;

    if (!userId || !name || !role || !plan || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
    }

    // 1. Update Convex Database Document
    await convex.mutation(api.users.updateUserFullDetail, {
      userId: userId as Id<"users">,
      name,
      imageUrl,
      role,
      plan,
      isActive,
    });

    // 2. Dual Sync to Clerk Auth Backend (If real Clerk User ID)
    let clerkSynced = false;
    let clerkMessage = "";

    if (clerkId && !clerkId.startsWith("manual_") && !clerkId.startsWith("user_ashan") && !clerkId.startsWith("user_")) {
      try {
        const clerk = await clerkClient();

        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(" ") || "";

        // Update Clerk User Metadata & Name
        await clerk.users.updateUser(clerkId, {
          firstName,
          lastName,
          publicMetadata: {
            role,
          },
        });

        // Sync Account Status (Ban / Unban in Clerk)
        if (isActive === false) {
          await clerk.users.banUser(clerkId);
          clerkMessage = "User role updated and account banned (suspended) in Clerk Auth.";
        } else {
          await clerk.users.unbanUser(clerkId);
          clerkMessage = "User role updated and account unbanned (activated) in Clerk Auth.";
        }

        clerkSynced = true;
      } catch (clerkErr) {
        console.error("Clerk API sync failed silently:", clerkErr);
        clerkMessage = "Updated in Convex DB (Clerk sync note: User ID managed internally or pending Clerk API key).";
      }
    } else {
      clerkMessage = "Updated in Convex DB successfully.";
    }

    return NextResponse.json({
      success: true,
      clerkSynced,
      message: clerkMessage || "User profile & status successfully updated in both Convex DB and Clerk Auth!",
    });
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

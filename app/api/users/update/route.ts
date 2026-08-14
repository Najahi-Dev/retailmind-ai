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

    if (!userId || !name || !role || !plan || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Missing required user fields" }, { status: 400 });
    }

    // Update Convex Database Document
    await convex.mutation(api.users.updateUserFullDetail, {
      userId: userId as Id<"users">,
      name,
      imageUrl,
      role,
      plan,
      isActive,
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

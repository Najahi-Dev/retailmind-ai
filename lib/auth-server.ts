// lib/auth-server.ts
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function getAuthUserRole(userParam?: any): Promise<string> {
  const user = userParam ?? (await currentUser());
  if (!user) return "staff";

  try {
    const convexUser = await convex.query(api.users.getUserByClerkId, {
      clerkId: user.id,
    });

    if (convexUser?.role) {
      if (user.publicMetadata?.role !== convexUser.role) {
        try {
          const clerk = await clerkClient();
          await clerk.users.updateUser(user.id, {
            publicMetadata: { role: convexUser.role },
          });
        } catch (err) {
          console.error("Clerk metadata sync warning:", err);
        }
      }
      return convexUser.role;
    }
  } catch (err) {
    console.error("Convex user role query warning:", err);
  }

  const metaRole = user.publicMetadata?.role as string;
  return metaRole || "admin";
}

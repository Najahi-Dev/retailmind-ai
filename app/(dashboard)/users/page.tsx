// app/(dashboard)/users/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";
import { getAuthUserRole } from "@/lib/auth-server";

export default async function UsersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = await getAuthUserRole(user);

  // Only Admin or Manager can access user management
  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return <UsersClient role={role} />;
}

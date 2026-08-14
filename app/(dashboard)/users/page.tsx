// app/(dashboard)/users/page.tsx
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function UsersPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const role = user.role;

  // Only Admin or Manager can access user management
  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return <UsersClient role={role} />;
}

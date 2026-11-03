import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import AdminBackupClient from "./AdminBackupClient";

export default async function AdminBackupPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    redirect("/access-denied");
  }

  return <AdminBackupClient role={user.role} userEmail={user.email} />;
}

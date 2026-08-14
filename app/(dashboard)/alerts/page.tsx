// app/(dashboard)/alerts/page.tsx
import { redirect } from "next/navigation";
import AlertsClient from "./AlertsClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function AlertsPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const role = user.role;

  // Supplier role cannot access alerts at all
  if (role === "supplier") {
    redirect("/access-denied");
  }

  return <AlertsClient role={role} />;
}

// app/(dashboard)/alerts/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AlertsClient from "./AlertsClient";

export default async function AlertsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = (user.publicMetadata?.role as string) || "staff";

  // Supplier role cannot access alerts at all
  if (role === "supplier") {
    redirect("/access-denied");
  }

  return <AlertsClient role={role} />;
}

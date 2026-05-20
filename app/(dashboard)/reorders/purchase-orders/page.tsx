// app/(dashboard)/reorders/purchase-orders/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PurchaseOrdersClient from "./PurchaseOrdersClient";

export default async function PurchaseOrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager", "supplier"].includes(role)) {
    redirect("/access-denied");
  }

  return <PurchaseOrdersClient role={role} />;
}

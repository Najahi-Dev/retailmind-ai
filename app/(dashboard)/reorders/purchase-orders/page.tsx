import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PurchaseOrders from "./PurchaseOrders";

export default async function PurchaseOrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager", "staff", "supplier"].includes(role)) {
    redirect("/access-denied");
  }

  return <PurchaseOrders role={role} />;
}
import { redirect } from "next/navigation";
import PurchaseOrdersClient from "./PurchaseOrdersClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function PurchaseOrdersPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const role = user.role;

  return <PurchaseOrdersClient role={role} />;
}

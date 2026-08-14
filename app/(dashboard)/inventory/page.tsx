import { redirect } from "next/navigation";
import InventoryClient from "./InventoryClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function InventoryPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const role = user.role;

  return <InventoryClient role={role} />;
}
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager", "staff"].includes(role)) {
    redirect("/access-denied");
  }

  return <InventoryClient role={role} />;
}
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TransferClient from "@/app/(dashboard)/inventory/transfer/TransferClient";

export default async function StockTransferPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) redirect("/access-denied");

  return <TransferClient role={role} />;
}

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StockAdjustmentClient from "./StockAdjustmentClient";

export default async function StockAdjustmentPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) redirect("/access-denied");

  return <StockAdjustmentClient role={role} />;
}

// app/(dashboard)/inventory/stock-out/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import StockOutClient from "./StockOutClient";

export default async function StockOutPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;

  // Only admin and staff can record stock-out
  if (!["admin", "staff"].includes(role)) {
    redirect("/access-denied");
  }

  return <StockOutClient role={role} />;
}

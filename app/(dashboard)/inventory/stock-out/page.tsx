import { redirect } from "next/navigation";
import StockOutClient from "./StockOutClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function StockOutPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const role = user.role;

  return <StockOutClient role={role} />;
}

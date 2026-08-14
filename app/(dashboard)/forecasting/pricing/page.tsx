import { redirect } from "next/navigation";
import PricingClient from "./PricingClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function PricingPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <PricingClient />;
}
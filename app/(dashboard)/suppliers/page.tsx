import { redirect } from "next/navigation";
import SuppliersClient from "./SuppliersClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function SuppliersPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <SuppliersClient />;
}
import { redirect } from "next/navigation";
import ReorderClient from "./ReorderClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function ReordersPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <ReorderClient />;
}
import { redirect } from "next/navigation";
import CreatePOClient from "./CreatePOClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function CreatePOPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <CreatePOClient />;
}
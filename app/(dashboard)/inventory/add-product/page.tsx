import { redirect } from "next/navigation";
import AddProductClient from "./AddProductClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function AddProductPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <AddProductClient />;
}

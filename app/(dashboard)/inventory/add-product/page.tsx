import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AddProductClient from "./AddProductClient";

export default async function AddProductPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) redirect("/access-denied");

  return <AddProductClient />;
}

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReordersClient from "./ReorderClient";

export default async function ReordersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) redirect("/access-denied");
  return <ReordersClient />;
}
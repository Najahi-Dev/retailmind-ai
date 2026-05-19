import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EditProductClient from "./EditProductClient";

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) redirect("/access-denied");

  return <EditProductClient productId={resolvedParams.productId} role={role} />;
}

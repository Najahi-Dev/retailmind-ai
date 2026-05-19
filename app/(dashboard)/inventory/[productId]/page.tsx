import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager", "staff"].includes(role)) {
    redirect("/access-denied");
  }

  const { productId } = await params;

  if (productId === "add") {
    redirect("/inventory/add");
  }

  return <ProductDetailClient productId={productId} role={role} />;
}
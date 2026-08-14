import { redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { getServerUser } from "@/lib/get-server-user";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;
  const role = user.role;

  return <ProductDetailClient productId={resolvedParams.productId} role={role} />;
}
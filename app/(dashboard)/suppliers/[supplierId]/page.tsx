// app/(dashboard)/suppliers/[supplierId]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SupplierDetailClient from "./SupplierDetailClient";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) redirect("/access-denied");
  const { supplierId } = await params;
  return <SupplierDetailClient supplierId={supplierId} />;
}

import { redirect } from "next/navigation";
import SupplierDetailClient from "./SupplierDetailClient";
import { getServerUser } from "@/lib/get-server-user";

interface Props {
  params: Promise<{ supplierId: string }>;
}

export default async function SupplierDetailPage({ params }: Props) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;

  return <SupplierDetailClient supplierId={resolvedParams.supplierId} />;
}

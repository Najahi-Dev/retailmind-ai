import { redirect } from "next/navigation";
import EditProductClient from "./EditProductClient";
import { getServerUser } from "@/lib/get-server-user";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;
  const role = user.role;

  return <EditProductClient productId={resolvedParams.productId} role={role} />;
}

import { redirect } from "next/navigation";
import PODetailClient from "./PODetailClient";
import { getServerUser } from "@/lib/get-server-user";

interface Props {
  params: Promise<{ poId: string }>;
}

export default async function PODetailPage({ params }: Props) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;
  const role = user.role;

  return <PODetailClient poId={resolvedParams.poId} role={role} />;
}

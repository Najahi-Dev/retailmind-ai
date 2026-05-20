// app/(dashboard)/reorders/purchase-orders/[poId]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PODetailClient from "./PODetailClient";

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ poId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager", "staff", "supplier"].includes(role)) {
    redirect("/access-denied");
  }
  const { poId } = await params;
  return <PODetailClient poId={poId} role={role} />;
}

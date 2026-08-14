// app/(dashboard)/users/[userId]/page.tsx
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";
import { getServerUser } from "@/lib/get-server-user";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;
  const role = user.role;

  // Only Admin or Manager can view/edit user details
  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return <UserDetailClient userId={resolvedParams.userId} role={role} />;
}

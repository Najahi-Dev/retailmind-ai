// app/(dashboard)/users/[userId]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";
import { getAuthUserRole } from "@/lib/auth-server";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;
  const role = await getAuthUserRole(user);

  // Only Admin or Manager can view/edit user details
  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return <UserDetailClient userId={resolvedParams.userId} role={role} />;
}

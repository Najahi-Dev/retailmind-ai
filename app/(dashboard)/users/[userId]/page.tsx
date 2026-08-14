// app/(dashboard)/users/[userId]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserDetailClient from "./UserDetailClient";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;
  const role = (user.publicMetadata?.role as string) || "staff";

  // Only Admin or Manager can view/edit user details
  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return <UserDetailClient userId={resolvedParams.userId} role={role} />;
}

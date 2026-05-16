// app/(dashboard)/dashboard/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const role = user.publicMetadata?.role as string;

  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return (
    <>
    <UserButton/>
    </>
  );
}
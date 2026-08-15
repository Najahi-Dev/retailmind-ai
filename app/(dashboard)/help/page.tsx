// app/(dashboard)/help/page.tsx
import { redirect } from "next/navigation";
import HelpClient from "./HelpClient";
import { getServerUser } from "@/lib/get-server-user";

export const metadata = {
  title: "Get Help & Support Center | RetailMind AI",
  description: "RetailMind AI Help Center, documentation, troubleshooting guides, and support ticket system.",
};

export default async function HelpPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <HelpClient user={user} />;
}

import { redirect } from "next/navigation";
import ReorderReviewClient from "./ReorderReviewClient";
import { getServerUser } from "@/lib/get-server-user";

interface Props {
  params: Promise<{ suggestionId: string }>;
}

export default async function SuggestionDetailPage({ params }: Props) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = await params;

  return (
    <ReorderReviewClient
      suggestionId={resolvedParams.suggestionId}
    />
  );
}
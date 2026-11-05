import { redirect } from "next/navigation";
import StockAdjustmentClient from "./StockAdjustmentClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function AdjustStockPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  return (
    <StockAdjustmentClient
      initialProductId={first(params.productId)}
      initialLocationId={first(params.locationId)}
    />
  );
}

import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function AddInventoryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string;
  if (!["admin", "manager"].includes(role)) {
    redirect("/access-denied");
  }

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Add Product</h1>
        <p className="text-sm text-muted-foreground">
          Product creation is not wired up yet. This route is reserved so the
          inventory detail page does not receive the literal "add" segment.
        </p>
        <Button asChild>
          <Link href="/inventory">Go Back</Link>
        </Button>
      </div>
    </div>
  );
}
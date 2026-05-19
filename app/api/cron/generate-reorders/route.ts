import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  // Optional: restrict by a secret header or IP in production
  try {
    const result = await convex.mutation(api.reorder.generateReorderSuggestions, {});
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err: any) {
    console.error(err);
    return new Response(String(err?.message ?? "error"), { status: 500 });
  }
}

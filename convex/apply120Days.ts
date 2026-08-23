import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Delete existing forecasts so we can regenerate them fresh (should be small)
    const oldForecasts = await ctx.db.query("forecasts").take(4000);
    for (const f of oldForecasts) {
      await ctx.db.delete(f._id);
    }

    // 2. Get 5 active products to seed (don't do all to avoid mutation limits)
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(15); // taking 15 products max to stay under limit

    const loc = await ctx.db.query("locations").first();
    const now = Date.now();
    let createdCount = 0;

    // 3. Generate 120 days of history
    for (const p of products) {
      for (let i = 0; i < 120; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const isStockOut = Math.random() < 0.8; // 80% out, 20% in
        const type = isStockOut ? "stock_out" : "stock_in";
        const quantity = isStockOut ? -Math.floor(Math.random() * 40 + 5) : Math.floor(Math.random() * 200 + 100);

        await ctx.db.insert("stockMovements", {
          productId: p._id,
          locationId: loc ? loc._id : p._id as any,
          type: type,
          reason: "Sale",
          quantity: quantity,
          reference: `REF-${Math.floor(Math.random() * 90000 + 10000)}`,
          createdAt: date.getTime(),
        });
        createdCount++;
      }
    }
    
    return `Successfully created ${createdCount} new stock movements across ${products.length} products (120 days each).`;
  }
});

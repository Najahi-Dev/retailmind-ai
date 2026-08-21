import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const generateDummyData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get 5 active products
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(5);

    if (products.length === 0) {
      return "No products found to seed";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loc = await ctx.db.query("locations").first();
    let createdCount = 0;

    for (const p of products) {
      // Create 30 days of history
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Random quantity between 5 and 50
        const qty = Math.floor(Math.random() * 45) + 5;
        
        await ctx.db.insert("stockMovements", {
          productId: p._id,
          locationId: loc ? loc._id : p._id as any,
          type: "stock_out",
          quantity: qty,
          createdAt: date.getTime(),
        });
        createdCount++;
      }
    }
    
    return `Successfully created ${createdCount} stock movements across ${products.length} products`;
  }
});

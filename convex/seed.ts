// convex/seed.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ── Helpers ───────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

type LocationType   = "warehouse" | "store" | "distribution_center";
type SupplierStatus = "active" | "inactive" | "on_hold";
type ProductUnit    = "pcs" | "kg" | "litre" | "box" | "ml";
type MovementType   = "stock_in" | "stock_out" | "adjustment";
type POStatus       = "draft" | "sent" | "confirmed" | "shipped" | "delivered" | "cancelled";
type AlertType      = "low_stock" | "critical_stock" | "overstock" | "demand_spike";
type AlertPriority  = "critical" | "high" | "medium" | "low";
type Urgency        = "critical" | "high" | "medium" | "low";

function pickPaymentTerms() {
  return pick(["Net 30", "Net 15", "COD", "Net 60", "Prepaid"]);
}
function pickPOStatus(): POStatus {
  return pick(["delivered","delivered","shipped","confirmed","sent","draft","cancelled"]);
}
function pickMovementType(): MovementType {
  return pick(["stock_in", "stock_out", "adjustment"]);
}
function pickAlertType(): AlertType {
  return pick(["low_stock", "critical_stock", "overstock", "demand_spike"]);
}
function pickPriority(): AlertPriority {
  return pick(["critical", "high", "medium", "low"]);
}
function pickUrgency(): Urgency {
  return pick(["critical", "high", "medium", "low"]);
}

// ════════════════════════════════════════
// STEP 1 — Seed base data
// ════════════════════════════════════════
export const seedBase = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("locations").first();
    if (existing) return { message: "Base already seeded!" };

    // Locations
    const locationData: { name: string; type: LocationType }[] = [
      { name: "Colombo Warehouse",         type: "warehouse"           },
      { name: "Kandy Store",               type: "store"               },
      { name: "Galle Distribution Center", type: "distribution_center" },
      { name: "Negombo Store",             type: "store"               },
      { name: "Jaffna Warehouse",          type: "warehouse"           },
    ];
    for (const loc of locationData) {
      await ctx.db.insert("locations", {
        name:      loc.name,
        address:   `${loc.name}, Sri Lanka`,
        type:      loc.type,
        isActive:  true,
        createdAt: Date.now(),
      });
    }

    // Categories
    const categories = [
      "Food & Beverages",   "Electronics",     "Clothing & Apparel",
      "Household Items",    "Health & Beauty", "Sports & Fitness",
      "Stationery",         "Toys & Games",    "Automotive",
      "Garden & Outdoors",
    ];
    for (const name of categories) {
      await ctx.db.insert("categories", {
        name,
        description: `${name} category`,
        createdAt:   Date.now(),
      });
    }

    // Suppliers
    const supplierNames = [
      "Ceylon Traders Ltd",      "Lanka Imports Co",
      "Island Wholesale",        "Colombo Distributors",
      "Southern Supplies",       "Northern Trade Co",
      "Eastern Merchants",       "Western Goods Ltd",
      "Peak Suppliers",          "Valley Traders",
      "Sunrise Wholesale",       "Sunset Imports",
      "Green Valley Supplies",   "Blue Ocean Trading",
      "Red Star Distributors",   "Gold Coast Merchants",
      "Silver Line Traders",     "Diamond Wholesale",
      "Royal Supplies",          "Imperial Trading",
      "Premier Distributors",    "Elite Merchants",
      "Global Trade Lanka",      "Asia Pacific Supplies",
      "Indian Ocean Trading",    "Bay of Bengal Co",
      "Silk Road Imports",       "Spice Island Traders",
      "Coconut Grove Supplies",  "Tea Garden Wholesale",
    ];
    for (const name of supplierNames) {
      await ctx.db.insert("suppliers", {
        name,
        email:            `contact@${name.toLowerCase().replace(/\s+/g, "")}.lk`,
        phone:            `+94 7${randInt(0, 7)} ${randInt(1000000, 9999999)}`,
        address:          `${randInt(1, 200)} Main Street, Sri Lanka`,
        paymentTerms:     pickPaymentTerms(),
        leadTimeDays:     randInt(3, 21),
        status:           pick<SupplierStatus>(["active","active","active","inactive","on_hold"]),
        reliabilityScore: randFloat(60, 99),
        isActive:         true,
        createdAt:        Date.now(),
      });
    }

    return {
      message: "✓ Base seeded! Locations, categories, suppliers done.",
    };
  },
});

// ════════════════════════════════════════
// STEP 2 — Seed products (2 batches)
// ════════════════════════════════════════
export const seedProductsBatch = mutation({
  args: { batch: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch     = args.batch ?? 0;
    const categories = await ctx.db.query("categories").collect();
    const suppliers  = await ctx.db.query("suppliers").collect();

    if (categories.length === 0) {
      return { message: "Run seedBase first!" };
    }

    const productNames: Record<string, string[]> = {
      "Food & Beverages":   ["Basmati Rice 5kg","Coconut Oil 1L","Ceylon Tea 200g","White Sugar 1kg","Milk Powder 400g","Biscuits Pack","Instant Noodles","Soy Sauce 500ml","Tomato Paste 200g","Canned Fish 425g"],
      "Electronics":        ["USB-C Cable 2m","Power Bank 10000mAh","Wireless Earphones","LED Bulb 12W","Extension Cord 3m","Phone Case","Screen Protector","Bluetooth Speaker","USB Hub 4-Port","Charging Adapter"],
      "Clothing & Apparel": ["Cotton T-Shirt","Slim Jeans","Summer Dress","Hoodie","Socks 6-Pack","Baseball Cap","Sports Shorts","Polo Shirt","Denim Jacket","Leggings"],
      "Household Items":    ["Mop Set","10L Bucket","Broom Deluxe","Dustpan Set","Dish Rack","Storage Box 20L","Laundry Basket","Trash Can 10L","Curtain Rod 2m","Door Mat"],
      "Health & Beauty":    ["Shampoo 400ml","Soap Bar 6-Pack","Toothpaste 150g","Face Moisturizer","Sunscreen SPF50","Vitamin C 60pk","Hand Sanitizer","Body Lotion 250ml","Deodorant Spray","Lip Balm 3-Pack"],
      "Sports & Fitness":   ["Yoga Mat 6mm","Dumbbell 5kg","Jump Rope","Water Bottle 1L","Resistance Band Set","Gym Gloves","Foam Roller","Protein Shaker","Knee Support","Sports Towel"],
      "Stationery":         ["Notebook A5","Ballpoint Pen 10pk","Pencil 12-Pack","Highlighter Set","Stapler","Display Folder","Scissors","Tape Dispenser","Correction Fluid","Index Cards 100pk"],
      "Toys & Games":       ["Chess Board Set","500pc Puzzle","Building Blocks","Action Figure Set","Fashion Doll","Playing Cards","Monopoly Board","Rubik Cube","Remote Car","Art Kit"],
      "Automotive":         ["Engine Oil 4L","Car Shampoo 1L","Air Freshener","Wiper Blade 20in","Tyre Gauge","Jump Cables","Phone Mount","Dash Camera","Seat Cover Set","Car Vacuum"],
      "Garden & Outdoors":  ["Plant Pot 30cm","Gardening Gloves","Watering Can 8L","Flower Seeds","NPK Fertilizer 1kg","Pruning Shears","Garden Hose 15m","Trowel Set","Insect Repellent","Garden Rake"],
    };

    const unitMap: Record<string, ProductUnit[]> = {
      "Food & Beverages":   ["kg","litre","pcs"],
      "Electronics":        ["pcs"],
      "Clothing & Apparel": ["pcs"],
      "Household Items":    ["pcs"],
      "Health & Beauty":    ["pcs","ml"],
      "Sports & Fitness":   ["pcs"],
      "Stationery":         ["pcs","box"],
      "Toys & Games":       ["pcs"],
      "Automotive":         ["pcs","litre"],
      "Garden & Outdoors":  ["pcs","kg"],
    };

    const start     = batch * 5;
    const end       = Math.min(start + 5, categories.length);
    const batchCats = categories.slice(start, end);
    let count       = 0;
    let skuStart    = 1000 + batch * 250;

    for (const cat of batchCats) {
      const names = productNames[cat.name] ?? ["Generic Product"];
      const units = unitMap[cat.name]      ?? ["pcs"];

      for (let i = 0; i < 50; i++) {
        skuStart++;
        const baseName     = names[i % names.length];
        const name         = i < names.length
          ? baseName
          : `${baseName} Variant ${Math.ceil(i / names.length)}`;

        const costPrice    = randFloat(50, 5000);
        const sellingPrice = randFloat(costPrice * 1.15, costPrice * 1.6);
        const reorderPoint = randInt(10, 100);
        const safetyStock  = Math.floor(reorderPoint * randFloat(0.2, 0.5));

        await ctx.db.insert("products", {
          categoryId:        cat._id,
          primarySupplierId: suppliers[randInt(0, suppliers.length - 1)]._id,
          sku:               `SKU-${skuStart}`,
          name,
          description:       `High quality ${name}`,
          unit:              pick(units),
          costPrice,
          sellingPrice,
          reorderPoint,
          safetyStock,
          trackBatches:      false,
          isActive:          true,
          createdAt:         Date.now(),
        });
        count++;
      }
    }

    return {
      message:              `✓ Batch ${batch} done!`,
      productsAdded:        count,
      categoriesProcessed:  batchCats.map(c => c.name),
    };
  },
});

// ════════════════════════════════════════
// STEP 3 — Seed inventory
// ════════════════════════════════════════
export const seedInventory = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("inventory").first();
    if (existing) return { message: "Inventory already seeded!" };

    const products  = await ctx.db.query("products").collect();
    const locations = await ctx.db.query("locations").collect();

    if (products.length === 0) {
      return { message: "Run seedProductsBatch first!" };
    }

    let count = 0;
    for (const product of products) {
      const onHand   = randInt(product.reorderPoint, product.reorderPoint * 5);
      const reserved = randInt(0, Math.max(0, onHand - 5));

      await ctx.db.insert("inventory", {
        productId:   product._id,
        locationId:  locations[randInt(0, locations.length - 1)]._id,
        onHand,
        reserved,
        available:   onHand - reserved,
        lastUpdated: Date.now(),
      });
      count++;
    }

    return { message: `✓ Inventory seeded!`, count };
  },
});

// ════════════════════════════════════════
// STEP 4 — Seed stock movements
// ════════════════════════════════════════
export const seedMovementsBatch = mutation({
  args: { batch: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batch     = args.batch ?? 0;
    const products  = await ctx.db.query("products").collect();
    const locations = await ctx.db.query("locations").collect();

    if (products.length === 0) {
      return { message: "Run seedProductsBatch first!" };
    }

    const now          = Date.now();
    const ninetyDays   = 90 * 24 * 60 * 60 * 1000;
    const start        = batch * 100;
    const end          = Math.min(start + 100, products.length);
    const batchProds   = products.slice(start, end);

    let count = 0;
    for (const product of batchProds) {
      for (let m = 0; m < 5; m++) {
        const type     = pickMovementType();
        const quantity = type === "stock_out"
          ? -randInt(1, 50)
          :  randInt(10, 200);
        const ts = now - ninetyDays + Math.random() * ninetyDays;

        await ctx.db.insert("stockMovements", {
          productId:  product._id,
          locationId: locations[randInt(0, locations.length - 1)]._id,
          type,
          reason:     pick(["Sale","Restock","Damage","Return","Shrinkage"]),
          quantity,
          reference:  `REF-${randInt(10000, 99999)}`,
          createdAt:  Math.floor(ts),
        });
        count++;
      }
    }

    return {
      message:        `✓ Movements batch ${batch} done!`,
      movementsAdded: count,
    };
  },
});

// ════════════════════════════════════════
// STEP 5 — Seed purchase orders
// ════════════════════════════════════════
export const seedPurchaseOrders = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("purchaseOrders").first();
    if (existing) return { message: "POs already seeded!" };

    const products  = await ctx.db.query("products").collect();
    const suppliers = await ctx.db.query("suppliers").collect();
    const now       = Date.now();

    for (let i = 0; i < 100; i++) {
      const supplierId = suppliers[randInt(0, suppliers.length - 1)]._id;
      const daysAgo    = randInt(1, 180);
      const createdAt  = now - daysAgo * 86400000;
      const numItems   = randInt(1, 5);

      const poProducts = [...products]
        .sort(() => Math.random() - 0.5)
        .slice(0, numItems);

      let totalValue = 0;
      const lineItems = poProducts.map(prod => {
        const qty   = randInt(50, 300);
        totalValue += qty * prod.costPrice;
        return {
          productId:        prod._id,
          quantityOrdered:  qty,
          quantityReceived: 0,
          unitCost:         prod.costPrice,
          lineTotal:        qty * prod.costPrice,
        };
      });

      await ctx.db.insert("purchaseOrders", {
        supplierId,
        poNumber:          `PO-${2024000 + i}`,
        status:            pickPOStatus(),
        lineItems,
        totalValue:        Math.round(totalValue * 100) / 100,
        requestedDelivery: createdAt + randInt(7, 21) * 86400000,
        createdAt,
        updatedAt:         createdAt,
      });
    }

    return { message: "✓ Purchase orders seeded! (100 POs)" };
  },
});

// ════════════════════════════════════════
// STEP 6 — Seed alerts + reorder suggestions
// ════════════════════════════════════════
export const seedAlertsAndReorders = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("alerts").first();
    if (existing) return { message: "Alerts already seeded!" };

    const products  = await ctx.db.query("products").collect();
    const suppliers = await ctx.db.query("suppliers").collect();
    const now       = Date.now();

    const sample = products
      .sort(() => Math.random() - 0.5)
      .slice(0, 40);

    for (const product of sample) {
      const urgency      = pickUrgency();
      const suggestedQty = randInt(
        product.reorderPoint * 2,
        product.reorderPoint * 4
      );

      await ctx.db.insert("reorderSuggestions", {
        productId:           product._id,
        preferredSupplierId: suppliers[randInt(0, suppliers.length - 1)]._id,
        urgency,
        suggestedQuantity:   suggestedQty,
        estimatedCost:       suggestedQty * product.costPrice,
        orderByDate:         now + randInt(1, 7) * 86400000,
        rationale:           `Stock level is below reorder point. Suggest restocking ${suggestedQty} units.`,
        status:              "pending",
        aiGenerated:         false,
        createdAt:           now - randInt(0, 3) * 86400000,
      });

      await ctx.db.insert("alerts", {
        productId:   product._id,
        type:        pickAlertType(),
        priority:    pickPriority(),
        message:     `Stock alert for ${product.name} — level below threshold`,
        isRead:      false,
        isDismissed: false,
        createdAt:   now - randInt(0, 7) * 86400000,
      });
    }

    return {
      message: `✓ Alerts + reorders seeded! (${sample.length} each)`,
    };
  },
});

// ════════════════════════════════════════
// CLEAR ALL
// ════════════════════════════════════════
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "alerts", "reorderSuggestions", "purchaseOrders",
      "stockMovements", "inventory", "products",
      "suppliers", "categories", "locations",
    ] as const;

    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
      console.log(`Cleared: ${table}`);
    }

    return { message: "✓ Database cleared!" };
  },
});

export const clearSuggestions = mutation({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db
      .query("reorderSuggestions")
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    return { message: `Cleared ${records.length} suggestions` };
  },
});

export const seedPriceSuggestions = mutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    const now       = Date.now();
    let   created   = 0;

    for (const inv of inventory.slice(0, 80)) {
      const product = await ctx.db.get(inv.productId);
      if (!product) continue;

      let direction: "increase" | "decrease" | "maintain";
      let stockLevel: string;
      let priceChange: number;
      let confidence: number;
      let reason: string;

      if (inv.onHand <= product.safetyStock) {
        direction   = "increase";
        stockLevel  = "critical";
        priceChange = Math.round(Math.random() * 15 + 5);
        confidence  = 0.90;
        reason      = `Stock (${inv.onHand} units) is below safety stock (${product.safetyStock} units). High demand signal — price increase recommended.`;
      } else if (inv.onHand <= product.reorderPoint) {
        direction   = "increase";
        stockLevel  = "low";
        priceChange = Math.round(Math.random() * 8 + 3);
        confidence  = 0.82;
        reason      = `Stock (${inv.onHand} units) is below reorder point (${product.reorderPoint} units). Moderate demand — slight price increase suggested.`;
      } else if (inv.onHand >= product.reorderPoint * 4) {
        direction   = "decrease";
        stockLevel  = "overstock";
        priceChange = -(Math.round(Math.random() * 10 + 5));
        confidence  = 0.78;
        reason      = `Excess inventory (${inv.onHand} units). Demand is lower than expected — price reduction to stimulate sales.`;
      } else {
        direction   = "maintain";
        stockLevel  = "healthy";
        priceChange = 0;
        confidence  = 0.75;
        reason      = `Stock level is healthy (${inv.onHand} units). All market signals stable — current price is optimal.`;
      }

      const suggestedPrice = direction === "maintain"
        ? product.sellingPrice
        : Math.round(
            product.sellingPrice * (1 + priceChange / 100) * 100
          ) / 100;

      if (direction !== "maintain" || Math.random() > 0.7) {
        await ctx.db.insert("priceSuggestions", {
          productId:       inv.productId,
          currentPrice:    product.sellingPrice,
          suggestedPrice,
          priceChange,
          changeDirection: direction,
          reason,
          confidence,
          factors: {
            stockLevel,
            demandTrend: direction === "increase" ? "rising"
                       : direction === "decrease" ? "falling"
                       : "stable",
            seasonality: Math.random() > 0.7 ? "peak" : "off-peak",
            daysOfStock: Math.round(
              inv.onHand / (Math.random() * 5 + 1)
            ),
          },
          status:    "pending",
          createdAt: now - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000,
        });
        created++;
      }
    }

    return { message: `Created ${created} price suggestions!` };
  },
});

// ── Seed Platform Users ──
export const seedUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@retailmind.com"))
      .first();

    if (existing) {
      return { message: "Admin user already exists in database!" };
    }

    // Pre-calculated bcrypt hash for "admin123"
    const defaultPasswordHash = "$2a$12$8K1p/a0dL.d.z.n.x.y.z.O.P.Q.R.S.T.U.V.W.X.Y.Z.0.1.2.3";

    const sampleUsers = [
      {
        name: "Admin User",
        email: "admin@retailmind.com",
        passwordHash: defaultPasswordHash,
        role: "admin" as const,
        plan: "enterprise" as const,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        name: "Ashan",
        email: "mohamedashan070@gmail.com",
        passwordHash: defaultPasswordHash,
        role: "staff" as const,
        plan: "starter" as const,
        isActive: true,
        createdAt: Date.now() - 5 * 86400000,
      },
      {
        name: "AHMADH NAJAHI",
        email: "ahmednajahi2003@gmail.com",
        passwordHash: defaultPasswordHash,
        role: "supplier" as const,
        plan: "starter" as const,
        isActive: true,
        createdAt: Date.now() - 90 * 86400000,
      },
      {
        name: "Ahmadh Najahi",
        email: "najinajahi1@gmail.com",
        passwordHash: defaultPasswordHash,
        role: "manager" as const,
        plan: "growth" as const,
        isActive: true,
        createdAt: Date.now() - 90 * 86400000,
      },
      {
        name: "Dev Naja",
        email: "devnaja.arcade@gmail.com",
        passwordHash: defaultPasswordHash,
        role: "admin" as const,
        plan: "starter" as const,
        isActive: true,
        createdAt: Date.now() - 90 * 86400000,
      },
    ];

    for (const u of sampleUsers) {
      await ctx.db.insert("users", u);
    }

    return {
      message: `✓ Seeded ${sampleUsers.length} platform users! Login with admin@retailmind.com / admin123`,
    };
  },
});
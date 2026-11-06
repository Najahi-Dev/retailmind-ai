// convex/demoData.ts
// Realistic Sri Lankan supermarket demo dataset. INTERNAL / CLI ONLY.
//
//   1. Wipe business data (keeps users, workspaces, plans, settings):
//        npx convex run demoData:resetAndSeed '{"orgId":"<organizations id>"}'
//   Individual steps are also exposed as internal functions below.
//
// Everything is deterministic (seeded PRNG) so re-running produces the same dataset.
// Forecasts, reorder suggestions and price suggestions are NOT faked: after seeding the
// raw history, the app's own engines are run over it.
import { internalAction, internalMutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const DAY = 24 * 60 * 60 * 1000;
export const HISTORY_DAYS = 90;

/** Business tables cleared by the wipe (users / organizations / plans / settings are kept). */
const BUSINESS_TABLES = [
  "poPayments",
  "stockMovements",
  "forecasts",
  "priceSuggestions",
  "reorderSuggestions",
  "alerts",
  "approvals",
  "priceReferences",
  "purchaseOrders",
  "inventory",
  "products",
  "categories",
  "suppliers",
  "locations",
] as const;

// ── Deterministic PRNG ───────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** EAN-13 with the Sri Lanka GS1 prefix 479. */
function ean13(n: number): string {
  const body = `479${String(1000000 + n).padStart(9, "0")}`.slice(0, 12);
  const sum = body.split("").reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
}

// ── Catalogue ────────────────────────────────────────────────────────────────
type Unit = "pcs" | "kg" | "litre" | "box" | "ml";
type ProductSeed = [name: string, unit: Unit, cost: number, sell: number];

type CategorySeed = {
  code: string;
  name: string;
  description: string;
  demand: number; // category demand multiplier
  festive: boolean; // Deepavali uplift
  supplier: {
    name: string;
    contact: string;
    phone: string;
    address: string;
    leadTimeDays: number;
    paymentTerms: string;
    reliability: number;
  };
  products: ProductSeed[];
};

const CATALOG: CategorySeed[] = [
  {
    code: "RIC", name: "Rice & Grains", description: "Rice, flour, pulses and grains", demand: 1.2, festive: true,
    supplier: { name: "Polonnaruwa Rice Mills (Pvt) Ltd", contact: "orders@polonnaruwarice.lk", phone: "+94 27 222 4518", address: "No. 45, Batticaloa Road, Polonnaruwa", leadTimeDays: 4, paymentTerms: "Net 30", reliability: 94 },
    products: [
      ["Nadu Rice 5kg", "pcs", 1050, 1250], ["Keeri Samba Rice 5kg", "pcs", 1550, 1850], ["Red Raw Rice 5kg", "pcs", 1000, 1200],
      ["Basmati Rice 1kg", "pcs", 780, 950], ["Samba Rice 10kg", "pcs", 2300, 2700], ["Green Gram 1kg", "pcs", 820, 980],
      ["Red Dhal (Mysore) 1kg", "pcs", 300, 360], ["Wheat Flour 1kg", "pcs", 190, 230], ["Kurakkan Flour 500g", "pcs", 260, 320],
      ["Chickpeas 500g", "pcs", 330, 400],
    ],
  },
  {
    code: "DRY", name: "Dairy & Eggs", description: "Milk, milk powder, yoghurt, butter and eggs", demand: 1.4, festive: false,
    supplier: { name: "Ceylon Fresh Dairies (Pvt) Ltd", contact: "supply@ceylonfreshdairies.lk", phone: "+94 81 238 6640", address: "Dairy Estate Road, Ambewela, Nuwara Eliya", leadTimeDays: 2, paymentTerms: "Net 14", reliability: 97 },
    products: [
      ["Fresh Milk 1L", "pcs", 420, 480], ["Anchor Full Cream Milk Powder 400g", "pcs", 1050, 1200], ["Highland Milk Powder 1kg", "pcs", 2500, 2850],
      ["Set Yoghurt 80g", "pcs", 70, 90], ["Buffalo Curd 1L (Clay Pot)", "pcs", 650, 780], ["Salted Butter 200g", "pcs", 780, 900],
      ["Cheddar Cheese 200g", "pcs", 980, 1150], ["Farm Eggs (Pack of 10)", "pcs", 380, 450], ["Kotmale Chocolate Milk 180ml", "pcs", 140, 170],
      ["Vanilla Ice Cream 1L", "pcs", 720, 850],
    ],
  },
  {
    code: "BEV", name: "Beverages", description: "Soft drinks, juices and water", demand: 1.1, festive: true,
    supplier: { name: "Island Beverages Distributors", contact: "sales@islandbeverages.lk", phone: "+94 11 254 9031", address: "No. 210, Negombo Road, Wattala", leadTimeDays: 3, paymentTerms: "Net 30", reliability: 91 },
    products: [
      ["Coca-Cola 1.5L", "pcs", 380, 450], ["EGB Ginger Beer 1.5L", "pcs", 330, 400], ["Mineral Water 1.5L", "pcs", 110, 140],
      ["Orange Juice 1L", "pcs", 620, 750], ["Elephant House Cream Soda 1L", "pcs", 280, 330], ["Sprite 1.5L", "pcs", 380, 450],
      ["Red Bull 250ml", "pcs", 520, 600], ["King Coconut Water 330ml", "pcs", 180, 220], ["Milo Chocolate Malt Drink 400g", "pcs", 1150, 1320],
      ["Mango Nectar 1L", "pcs", 560, 680],
    ],
  },
  {
    code: "TEA", name: "Tea & Coffee", description: "Ceylon tea, herbal tea and coffee", demand: 0.9, festive: false,
    supplier: { name: "Highland Tea Traders", contact: "trade@highlandteatraders.lk", phone: "+94 52 223 5512", address: "No. 12, Lawson Street, Nuwara Eliya", leadTimeDays: 5, paymentTerms: "Net 30", reliability: 95 },
    products: [
      ["Dilmah Pure Ceylon Tea (100 Bags)", "pcs", 780, 900], ["Lipton Ceylonta Tea 400g", "pcs", 1050, 1200], ["BOPF Loose Tea 200g", "pcs", 520, 620],
      ["Green Tea (25 Bags)", "pcs", 480, 560], ["Nescafe Classic 50g", "pcs", 980, 1120], ["3-in-1 Instant Coffee (10 Sachets)", "pcs", 520, 600],
      ["Ginger Tea (20 Bags)", "pcs", 420, 500], ["Kandy Blend Coffee Beans 250g", "pcs", 1650, 1950], ["Ceylon Cinnamon Tea (20 Bags)", "pcs", 450, 540],
      ["Earl Grey Tea (25 Bags)", "pcs", 650, 760],
    ],
  },
  {
    code: "SNK", name: "Biscuits & Snacks", description: "Biscuits, sweets and savoury snacks", demand: 1.2, festive: true,
    supplier: { name: "Lanka Confectionery Distributors", contact: "orders@lankaconfectionery.lk", phone: "+94 11 271 8845", address: "No. 88, High Level Road, Maharagama", leadTimeDays: 3, paymentTerms: "Net 21", reliability: 92 },
    products: [
      ["Munchee Cream Cracker 490g", "pcs", 380, 450], ["Maliban Marie Biscuits 80g", "pcs", 75, 90], ["Lemon Puff 200g", "pcs", 220, 260],
      ["Chocolate Cream Biscuits 100g", "pcs", 160, 190], ["Potato Chips 100g", "pcs", 300, 360], ["Spicy Murukku 200g", "pcs", 280, 340],
      ["Kokis 200g", "pcs", 320, 380], ["Roasted Cashew Nuts 100g", "pcs", 780, 920], ["Jelly Sweets 100g", "pcs", 150, 180],
      ["Milk Chocolate Bar 100g", "pcs", 420, 490],
    ],
  },
  {
    code: "SPC", name: "Spices & Condiments", description: "Spices, oils, sugar and sauces", demand: 1.1, festive: true,
    supplier: { name: "Matale Spice Exporters", contact: "sales@matalespice.lk", phone: "+94 66 222 3907", address: "No. 34, Spice Garden Road, Matale", leadTimeDays: 6, paymentTerms: "Net 45", reliability: 88 },
    products: [
      ["Chilli Powder 100g", "pcs", 230, 280], ["Roasted Curry Powder 100g", "pcs", 260, 310], ["Turmeric Powder 100g", "pcs", 190, 230],
      ["Coconut Oil 1L", "pcs", 820, 950], ["Vegetable Oil 1L", "pcs", 680, 790], ["White Sugar 1kg", "pcs", 260, 310],
      ["Iodised Salt 1kg", "pcs", 90, 120], ["Coconut Milk Powder 300g", "pcs", 560, 650], ["Tomato Sauce 400g", "pcs", 420, 490],
      ["Soy Sauce 300ml", "pcs", 360, 420],
    ],
  },
  {
    code: "BAK", name: "Bakery", description: "Fresh bread, buns and cakes (baked daily)", demand: 2.2, festive: false,
    supplier: { name: "Colombo Bakers Supply Co.", contact: "dispatch@colombobakers.lk", phone: "+94 11 258 7720", address: "No. 5, Baseline Road, Colombo 09", leadTimeDays: 1, paymentTerms: "Cash on delivery", reliability: 96 },
    products: [
      ["Sandwich Bread 450g", "pcs", 160, 190], ["Tea Bun", "pcs", 50, 65], ["Fish Bun", "pcs", 90, 110],
      ["Butter Cake 500g", "pcs", 620, 750], ["Kimbula Bun", "pcs", 60, 75], ["Roast Paan", "pcs", 120, 140],
      ["Chocolate Muffin", "pcs", 140, 170], ["Seeni Sambol Bun", "pcs", 90, 110], ["Whole Wheat Bread 450g", "pcs", 230, 270],
      ["Butter Croissant", "pcs", 160, 190],
    ],
  },
  {
    code: "PRD", name: "Fresh Produce", description: "Up-country vegetables and fresh fruit (sold by kg)", demand: 1.6, festive: true,
    supplier: { name: "Nuwara Eliya Farm Fresh", contact: "orders@nefarmfresh.lk", phone: "+94 52 222 9184", address: "Economic Centre, Dambulla", leadTimeDays: 1, paymentTerms: "Cash on delivery", reliability: 86 },
    products: [
      ["Carrots", "kg", 380, 460], ["Leeks", "kg", 300, 360], ["Big Onions", "kg", 330, 390],
      ["Potatoes", "kg", 360, 420], ["Tomatoes", "kg", 420, 520], ["Ambul Bananas", "kg", 280, 340],
      ["Limes", "kg", 700, 850], ["Pumpkin", "kg", 180, 220], ["Green Beans", "kg", 480, 580],
      ["Cabbage", "kg", 260, 320],
    ],
  },
  {
    code: "MFF", name: "Meat, Fish & Frozen", description: "Fresh meat, seafood and frozen foods", demand: 1.0, festive: false,
    supplier: { name: "Negombo Seafood & Frozen Foods", contact: "orders@negombofrozen.lk", phone: "+94 31 223 6451", address: "No. 19, Lewis Place, Negombo", leadTimeDays: 2, paymentTerms: "Net 14", reliability: 90 },
    products: [
      ["Whole Chicken", "kg", 1150, 1350], ["Chicken Breast", "kg", 1650, 1950], ["Fresh Tuna (Kelawalla)", "kg", 2200, 2600],
      ["Prawns 500g", "pcs", 1500, 1800], ["Chicken Sausages 500g", "pcs", 820, 980], ["Frozen Mixed Vegetables 500g", "pcs", 580, 690],
      ["Fish Fingers 400g", "pcs", 950, 1120], ["Beef", "kg", 2300, 2700], ["Dried Sprats (Haal Masso) 250g", "pcs", 520, 620],
      ["Canned Mackerel 425g", "pcs", 620, 720],
    ],
  },
  {
    code: "HHC", name: "Household Cleaning", description: "Laundry, dishwashing and home cleaning", demand: 0.8, festive: false,
    supplier: { name: "CleanHome Lanka Distributors", contact: "sales@cleanhomelanka.lk", phone: "+94 11 291 4470", address: "No. 301, Kandy Road, Kiribathgoda", leadTimeDays: 5, paymentTerms: "Net 30", reliability: 93 },
    products: [
      ["Sunlight Laundry Soap 110g", "pcs", 95, 115], ["Detergent Powder 1kg", "pcs", 620, 730], ["Dishwash Liquid 500ml", "pcs", 420, 490],
      ["Toilet Cleaner 500ml", "pcs", 520, 610], ["Floor Cleaner 1L", "pcs", 680, 790], ["Bleach 1L", "pcs", 350, 420],
      ["Garbage Bags (Pack of 30)", "pcs", 380, 450], ["Aluminium Foil 10m", "pcs", 560, 650], ["Mosquito Coils (Pack of 10)", "pcs", 220, 260],
      ["Kitchen Towels (2 Rolls)", "pcs", 480, 560],
    ],
  },
  {
    code: "PCR", name: "Personal Care", description: "Oral care, hair care, bath and hygiene", demand: 0.8, festive: false,
    supplier: { name: "Wellness Lanka Traders", contact: "orders@wellnesslanka.lk", phone: "+94 11 282 6631", address: "No. 66, Galle Road, Dehiwala", leadTimeDays: 5, paymentTerms: "Net 30", reliability: 94 },
    products: [
      ["Herbal Toothpaste 120g", "pcs", 280, 330], ["Soft Toothbrush", "pcs", 180, 220], ["Anti-Dandruff Shampoo 180ml", "pcs", 640, 750],
      ["Sandalwood Bath Soap 100g", "pcs", 140, 170], ["Antibacterial Hand Wash 250ml", "pcs", 420, 490], ["Deodorant Spray 150ml", "pcs", 980, 1150],
      ["Herbal Face Wash 100ml", "pcs", 560, 650], ["Coconut Hair Oil 200ml", "pcs", 380, 450], ["Sanitary Pads (Pack of 10)", "pcs", 380, 450],
      ["Disposable Razors (Pack of 3)", "pcs", 520, 610],
    ],
  },
  {
    code: "BBY", name: "Baby Care", description: "Diapers, baby food and baby toiletries", demand: 0.7, festive: false,
    supplier: { name: "LittleOnes Lanka Distributors", contact: "care@littleoneslanka.lk", phone: "+94 11 236 9905", address: "No. 140, Kotte Road, Rajagiriya", leadTimeDays: 7, paymentTerms: "Net 45", reliability: 89 },
    products: [
      ["Baby Diapers Medium (Pack of 40)", "pcs", 3800, 4400], ["Baby Wipes (Pack of 80)", "pcs", 780, 920], ["Baby Lotion 200ml", "pcs", 920, 1080],
      ["Infant Formula Stage 1 400g", "pcs", 2900, 3350], ["Baby Rice Cereal 250g", "pcs", 1250, 1450], ["Tear-Free Baby Shampoo 200ml", "pcs", 850, 990],
      ["Baby Powder 200g", "pcs", 620, 720], ["Feeding Bottle 250ml", "pcs", 1450, 1690], ["Mild Baby Soap 75g", "pcs", 260, 310],
      ["Diaper Rash Cream 50g", "pcs", 1100, 1290],
    ],
  },
];

const LOCATIONS = [
  { name: "Colombo 07 Flagship Store", address: "No. 25, Ward Place, Colombo 07", type: "store" as const, share: 0.55 },
  { name: "Nugegoda Branch", address: "No. 112, Stanley Thilakaratne Mawatha, Nugegoda", type: "store" as const, share: 0.3 },
  { name: "Kelaniya Central Warehouse", address: "No. 9, Industrial Estate, Kelaniya", type: "warehouse" as const, share: 0.15 },
];

/** Deepavali 2026 falls on 8 November; festive buying runs the week before. */
const FESTIVE_START = Date.UTC(2026, 9, 30);
const FESTIVE_END = Date.UTC(2026, 10, 9);

type Profile = {
  baseDaily: number;
  trend: "up" | "down" | "flat";
  stockState: "critical" | "low" | "healthy" | "overstock";
};

/** Stable per-product demand profile. */
function profileFor(catIndex: number, prodIndex: number, sell: number): Profile {
  const cat = CATALOG[catIndex];
  const n = catIndex * 10 + prodIndex;
  const baseDaily = Math.max(1, Math.round(Math.min(60, (2600 / sell) * cat.demand) * 10) / 10);
  const trend = n % 7 === 0 ? "up" : n % 7 === 3 ? "down" : "flat";
  const stockState =
    n % 15 === 4 ? "critical" : n % 15 === 2 || n % 15 === 9 ? "low" : n % 20 === 7 ? "overstock" : "healthy";
  return { baseDaily, trend, stockState };
}

function dailyDemand(p: Profile, festive: boolean, dayIndex: number, ts: number, rand: () => number): number {
  const d = new Date(ts);
  const dow = d.getUTCDay();
  const dom = d.getUTCDate();
  let m = 1;
  if (dow === 6 || dow === 0) m *= 1.35; // weekend shopping
  else if (dow === 5) m *= 1.15;
  if (dom >= 25 || dom <= 3) m *= 1.2; // salary week
  if (festive && ts >= FESTIVE_START && ts < FESTIVE_END) m *= 1.45; // Deepavali
  const progress = dayIndex / (HISTORY_DAYS - 1);
  if (p.trend === "up") m *= 0.75 + 0.6 * progress;
  if (p.trend === "down") m *= 1.25 - 0.55 * progress;
  const noise = 0.75 + rand() * 0.5;
  return Math.max(0, Math.round(p.baseDaily * m * noise));
}

// ── 1. Wipe ──────────────────────────────────────────────────────────────────

/** Deletes one batch of business data across ALL workspaces. Call repeatedly until done. */
export const wipeBusinessDataBatch = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const max = Math.min(args.batchSize ?? 1500, 3000);
    let deleted = 0;
    for (const table of BUSINESS_TABLES) {
      if (deleted >= max) break;
      const docs = await ctx.db.query(table as any).take(max - deleted);
      for (const d of docs) await ctx.db.delete(d._id);
      deleted += docs.length;
    }
    if (deleted === 0) {
      // Detach users from deleted supplier records.
      const users = await ctx.db.query("users").collect();
      for (const u of users) if (u.supplierId) await ctx.db.patch(u._id, { supplierId: undefined });
    }
    return { deleted, done: deleted === 0 };
  },
});

// ── 2. Catalogue, locations, stock ──────────────────────────────────────────

export const seedCatalog = internalMutation({
  args: { orgId: v.id("organizations"), now: v.number() },
  handler: async (ctx, { orgId, now }) => {
    const org = await ctx.db.get(orgId);
    if (!org) throw new Error("Organization not found");
    const createdAt = now - (HISTORY_DAYS + 30) * DAY;

    const locationIds: Id<"locations">[] = [];
    for (const l of LOCATIONS) {
      locationIds.push(
        await ctx.db.insert("locations", { orgId, name: l.name, address: l.address, type: l.type, isActive: true, createdAt }),
      );
    }

    const orgUsers = await ctx.db.query("users").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    const supplierUsers = orgUsers.filter((u) => u.role === "supplier");

    let productCount = 0;
    for (let ci = 0; ci < CATALOG.length; ci++) {
      const cat = CATALOG[ci];
      const categoryId = await ctx.db.insert("categories", { orgId, name: cat.name, description: cat.description, createdAt });

      // The workspace's supplier-portal user (if any) represents the dairy supplier.
      const portalUser = ci === 1 ? supplierUsers[0] : undefined;
      const supplierId = await ctx.db.insert("suppliers", {
        orgId,
        name: cat.supplier.name,
        email: portalUser?.email ?? cat.supplier.contact,
        phone: cat.supplier.phone,
        address: cat.supplier.address,
        paymentTerms: cat.supplier.paymentTerms,
        leadTimeDays: cat.supplier.leadTimeDays,
        status: "active",
        reliabilityScore: cat.supplier.reliability,
        isActive: true,
        createdAt,
      });
      if (portalUser) await ctx.db.patch(portalUser._id, { supplierId });

      for (let pi = 0; pi < cat.products.length; pi++) {
        const [name, unit, cost, sell] = cat.products[pi];
        const prof = profileFor(ci, pi, sell);
        const lead = cat.supplier.leadTimeDays;
        const reorderPoint = Math.max(5, Math.ceil(prof.baseDaily * (lead + 3)));
        const safetyStock = Math.max(2, Math.ceil(prof.baseDaily * 2));
        productCount++;

        const productId = await ctx.db.insert("products", {
          orgId,
          categoryId,
          primarySupplierId: supplierId,
          sku: `${cat.code}-${String(pi + 1).padStart(3, "0")}`,
          name,
          description: `${name} — ${cat.name}`,
          unit,
          costPrice: cost,
          sellingPrice: sell,
          reorderPoint,
          safetyStock,
          minStockLevel: safetyStock,
          trackBatches: ["DRY", "BAK", "MFF", "BBY"].includes(cat.code),
          barcode: ean13(ci * 100 + pi + 1),
          isActive: true,
          createdAt,
          updatedAt: now,
        });

        const target =
          prof.stockState === "critical"
            ? Math.max(0, Math.floor(safetyStock * 0.6))
            : prof.stockState === "low"
              ? Math.max(safetyStock + 1, Math.round(reorderPoint * 0.7))
              : prof.stockState === "overstock"
                ? reorderPoint * 7
                : Math.round(reorderPoint * (2 + ((ci + pi) % 3) * 0.5));

        let remaining = target;
        for (let li = 0; li < LOCATIONS.length; li++) {
          const qty = li === LOCATIONS.length - 1 ? remaining : Math.round(target * LOCATIONS[li].share);
          remaining -= qty;
          await ctx.db.insert("inventory", {
            orgId,
            productId,
            locationId: locationIds[li],
            onHand: qty,
            reserved: 0,
            available: qty,
            lastUpdated: now,
          });
        }
      }
    }
    return { locations: locationIds.length, categories: CATALOG.length, suppliers: CATALOG.length, products: productCount };
  },
});

async function orgContext(ctx: MutationCtx, orgId: Id<"organizations">) {
  const products = await ctx.db.query("products").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  const locations = await ctx.db.query("locations").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  const suppliers = await ctx.db.query("suppliers").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  const users = await ctx.db.query("users").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  const flagship = locations.find((l) => l.name.startsWith("Colombo 07")) ?? locations[0];
  const warehouse = locations.find((l) => l.type === "warehouse") ?? locations[0];
  const staff = users.find((u) => u.role === "manager") ?? users.find((u) => u.role === "admin") ?? users[0];
  const admin = users.find((u) => u.role === "admin") ?? users[0];
  products.sort((a, b) => a.sku.localeCompare(b.sku));
  return { products, flagship, warehouse, suppliers, staff, admin };
}

// ── 3. Sales history ─────────────────────────────────────────────────────────

/** Inserts daily POS sales (one stock_out per product per day) for days [fromDay, toDay). */
export const seedSalesBatch = internalMutation({
  args: { orgId: v.id("organizations"), now: v.number(), fromDay: v.number(), toDay: v.number() },
  handler: async (ctx, { orgId, now, fromDay, toDay }) => {
    const { products, flagship, staff } = await orgContext(ctx, orgId);
    const startOfToday = Math.floor(now / DAY) * DAY;
    let inserted = 0;
    for (let day = fromDay; day < Math.min(toDay, HISTORY_DAYS); day++) {
      const ts = startOfToday - (HISTORY_DAYS - day) * DAY + 19 * 60 * 60 * 1000; // end-of-day close
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const ci = CATALOG.findIndex((c) => p.sku.startsWith(c.code));
        const pi = Number(p.sku.slice(4)) - 1;
        const prof = profileFor(ci, pi, p.sellingPrice);
        const rand = mulberry32(ci * 100000 + pi * 1000 + day);
        const qty = dailyDemand(prof, CATALOG[ci].festive, day, ts, rand);
        if (qty <= 0) continue;
        await ctx.db.insert("stockMovements", {
          orgId,
          productId: p._id,
          locationId: flagship._id,
          userId: staff?._id,
          type: "stock_out",
          reason: "sale",
          quantity: -qty,
          reference: `POS-${new Date(ts).toISOString().slice(0, 10).replace(/-/g, "")}`,
          notes: "Daily POS sales",
          createdAt: ts,
        });
        inserted++;
      }
    }
    return { inserted };
  },
});

// ── 4. Purchase orders, deliveries, payments, wastage ───────────────────────

type POPlan = {
  cat: number;
  daysAgo: number;
  status: "draft" | "sent" | "confirmed" | "shipped" | "delivered" | "cancelled";
  method?: "CASH_ON_DELIVERY" | "CHEQUE" | "CREDIT";
  paid?: "full" | "none" | "partial";
  items: number[];
  note?: string;
};

const PO_PLANS: POPlan[] = [
  { cat: 0, daysAgo: 58, status: "delivered", method: "CREDIT", paid: "full", items: [0, 1, 6, 7] },
  { cat: 1, daysAgo: 55, status: "delivered", method: "CASH_ON_DELIVERY", paid: "full", items: [0, 1, 3, 7] },
  { cat: 2, daysAgo: 50, status: "delivered", method: "CHEQUE", paid: "full", items: [0, 1, 2, 5] },
  { cat: 5, daysAgo: 46, status: "delivered", method: "CREDIT", paid: "full", items: [0, 1, 3, 5, 6] },
  { cat: 3, daysAgo: 41, status: "delivered", method: "CREDIT", paid: "partial", items: [0, 1, 2] },
  { cat: 9, daysAgo: 37, status: "delivered", method: "CHEQUE", paid: "full", items: [0, 1, 2, 4] },
  { cat: 4, daysAgo: 33, status: "delivered", method: "CASH_ON_DELIVERY", paid: "full", items: [0, 1, 2, 5, 6] },
  { cat: 10, daysAgo: 28, status: "delivered", method: "CREDIT", paid: "none", items: [0, 2, 3, 7] },
  { cat: 7, daysAgo: 21, status: "delivered", method: "CASH_ON_DELIVERY", paid: "full", items: [0, 2, 3, 4] },
  { cat: 11, daysAgo: 18, status: "delivered", method: "CHEQUE", paid: "none", items: [0, 1, 3] },
  { cat: 5, daysAgo: 12, status: "delivered", method: "CREDIT", paid: "none", items: [3, 4, 5], note: "Deepavali stock-up: oil and sugar" },
  { cat: 6, daysAgo: 4, status: "delivered", method: "CASH_ON_DELIVERY", paid: "full", items: [0, 1, 4, 8] },
  { cat: 8, daysAgo: 9, status: "shipped", method: "CREDIT", items: [0, 4, 5], note: "Delayed at Negombo cold store — revised ETA requested" },
  { cat: 2, daysAgo: 3, status: "shipped", method: "CHEQUE", items: [3, 6, 8] },
  { cat: 4, daysAgo: 2, status: "shipped", method: "CASH_ON_DELIVERY", items: [3, 7, 9], note: "Festive sweets order" },
  { cat: 0, daysAgo: 3, status: "confirmed", method: "CREDIT", items: [2, 4, 8] },
  { cat: 9, daysAgo: 2, status: "confirmed", method: "CREDIT", items: [5, 6, 9] },
  { cat: 3, daysAgo: 1, status: "confirmed", method: "CHEQUE", items: [5, 7] },
  { cat: 1, daysAgo: 1, status: "sent", method: "CASH_ON_DELIVERY", items: [2, 4, 5] },
  { cat: 1, daysAgo: 0, status: "sent", method: "CREDIT", items: [6, 8, 9] },
  { cat: 10, daysAgo: 0, status: "sent", method: "CREDIT", items: [4, 6, 9] },
  { cat: 11, daysAgo: 0, status: "draft", items: [2, 5, 6] },
  { cat: 7, daysAgo: 0, status: "draft", items: [6, 8, 9] },
  { cat: 8, daysAgo: 25, status: "cancelled", method: "CREDIT", items: [2, 7], note: "Cancelled — supplier price increase not accepted" },
  { cat: 6, daysAgo: 14, status: "cancelled", method: "CASH_ON_DELIVERY", items: [3], note: "Duplicate order raised by mistake" },
];

export const seedPurchaseOrders = internalMutation({
  args: { orgId: v.id("organizations"), now: v.number() },
  handler: async (ctx, { orgId, now }) => {
    const { products, warehouse, flagship, suppliers, admin } = await orgContext(ctx, orgId);
    let poCount = 0;
    let movementCount = 0;

    for (let k = 0; k < PO_PLANS.length; k++) {
      const plan = PO_PLANS[k];
      const cat = CATALOG[plan.cat];
      const supplier = suppliers.find((s) => s.name === cat.supplier.name)!;
      const catProducts = products.filter((p) => p.sku.startsWith(cat.code));
      const createdAt = now - plan.daysAgo * DAY - (k % 5) * 37 * 60 * 1000;

      const lineItems = plan.items.map((idx) => {
        const p = catProducts[idx];
        const qty = Math.max(10, Math.round(p.reorderPoint * 1.5));
        return {
          productId: p._id,
          quantityOrdered: qty,
          quantityReceived: plan.status === "delivered" ? qty : undefined,
          unitCost: p.costPrice,
          lineTotal: qty * p.costPrice,
        };
      });
      const totalValue = lineItems.reduce((s, l) => s + l.lineTotal, 0);
      const delivered = plan.status === "delivered";
      const deliveredAt = createdAt + (cat.supplier.leadTimeDays + (k % 2)) * DAY;
      const paidAmount = !delivered ? 0 : plan.paid === "full" ? totalValue : plan.paid === "partial" ? Math.round(totalValue * 0.5) : 0;
      const creditDays = plan.method === "CREDIT" ? Number(cat.supplier.paymentTerms.match(/\d+/)?.[0] ?? 30) : undefined;

      const paymentStatus =
        !plan.method
          ? undefined
          : delivered
            ? paidAmount >= totalValue
              ? "PAID"
              : paidAmount > 0
                ? "PARTIALLY_PAID"
                : plan.method === "CHEQUE"
                  ? "CHEQUE_PENDING"
                  : creditDays && deliveredAt + creditDays * DAY < now
                    ? "OVERDUE"
                    : "DUE"
            : plan.method === "CASH_ON_DELIVERY"
              ? "PENDING_ON_DELIVERY"
              : plan.method === "CHEQUE"
                ? "CHEQUE_PENDING"
                : "DUE";

      const poId = await ctx.db.insert("purchaseOrders", {
        orgId,
        supplierId: supplier._id,
        createdBy: admin?._id,
        poNumber: `PO-2026-${String(k + 1).padStart(4, "0")}`,
        invoiceNumber: delivered ? `INV-${cat.code}-${String(7300 + k)}` : undefined,
        invoiceDate: delivered ? deliveredAt : undefined,
        status: plan.status,
        lineItems,
        totalValue,
        paymentMethod: plan.method,
        paymentStatus,
        amountPaid: plan.method ? paidAmount : undefined,
        chequeNumber: plan.method === "CHEQUE" ? String(410200 + k * 17) : undefined,
        bankName: plan.method === "CHEQUE" ? ["Commercial Bank", "Sampath Bank", "HNB", "Bank of Ceylon"][k % 4] : undefined,
        chequeAmount: plan.method === "CHEQUE" ? totalValue : undefined,
        chequeDate: plan.method === "CHEQUE" ? createdAt + 7 * DAY : undefined,
        chequeStatus: plan.method === "CHEQUE" ? (paidAmount >= totalValue ? "CLEARED" : "ISSUED") : undefined,
        creditTermDays: creditDays,
        dueDate: creditDays ? (delivered ? deliveredAt : createdAt) + creditDays * DAY : undefined,
        requestedDelivery: createdAt + cat.supplier.leadTimeDays * DAY,
        confirmedDelivery: ["confirmed", "shipped", "delivered"].includes(plan.status) ? createdAt + (cat.supplier.leadTimeDays + 1) * DAY : undefined,
        trackingNumber: plan.status === "shipped" ? `TRK-${cat.code}-${88000 + k * 13}` : undefined,
        notes: plan.note,
        createdAt,
        updatedAt: delivered ? deliveredAt : createdAt,
      });
      poCount++;

      if (delivered) {
        for (const li of lineItems) {
          await ctx.db.insert("stockMovements", {
            orgId,
            productId: li.productId,
            locationId: cat.supplier.leadTimeDays <= 2 ? flagship._id : warehouse._id,
            userId: admin?._id,
            type: "stock_in",
            reason: "purchase_order",
            quantity: li.quantityOrdered,
            reference: `PO-2026-${String(k + 1).padStart(4, "0")}`,
            notes: `Received from ${supplier.name}`,
            createdAt: deliveredAt,
          });
          movementCount++;
        }
        if (paidAmount > 0 && plan.method) {
          await ctx.db.insert("poPayments", {
            orgId,
            poId,
            recordedBy: admin?._id,
            method: plan.method,
            chequeNumber: plan.method === "CHEQUE" ? String(410200 + k * 17) : undefined,
            bankName: plan.method === "CHEQUE" ? ["Commercial Bank", "Sampath Bank", "HNB", "Bank of Ceylon"][k % 4] : undefined,
            chequeStatus: plan.method === "CHEQUE" ? "CLEARED" : undefined,
            amount: paidAmount,
            reference: plan.method === "CREDIT" ? `BANK-TRF-${55000 + k}` : undefined,
            notes: plan.paid === "partial" ? "First instalment (50%)" : "Settled in full",
            paidAt: deliveredAt + (plan.method === "CREDIT" ? 10 : 0) * DAY,
          });
        }
      }
    }

    // Spoilage / count corrections for perishables
    const perishable = products.filter((p) => p.sku.startsWith("PRD") || p.sku.startsWith("BAK"));
    for (let i = 0; i < 24; i++) {
      const p = perishable[(i * 7) % perishable.length];
      const ts = now - ((i * 3) % HISTORY_DAYS) * DAY - 2 * 60 * 60 * 1000;
      const isWaste = i % 3 !== 2;
      await ctx.db.insert("stockMovements", {
        orgId,
        productId: p._id,
        locationId: flagship._id,
        userId: admin?._id,
        type: isWaste ? "write_off" : "adjustment",
        reason: isWaste ? "expired_or_damaged" : "stock_count",
        quantity: isWaste ? -(2 + (i % 4)) : (i % 2 === 0 ? 3 : -2),
        notes: isWaste ? "Spoiled / past best-before date" : "Cycle count correction",
        createdAt: ts,
      });
      movementCount++;
    }
    return { purchaseOrders: poCount, movements: movementCount };
  },
});

// ── 5. Alerts ───────────────────────────────────────────────────────────────

export const seedAlerts = internalMutation({
  args: { orgId: v.id("organizations"), now: v.number() },
  handler: async (ctx, { orgId, now }) => {
    const { products } = await orgContext(ctx, orgId);
    const inventory = await ctx.db.query("inventory").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    const onHand = new Map<string, number>();
    for (const r of inventory) onHand.set(r.productId, (onHand.get(r.productId) ?? 0) + r.onHand);

    let n = 0;
    for (const p of products) {
      const qty = onHand.get(p._id) ?? 0;
      let alert: { type: "critical_stock" | "low_stock" | "overstock"; priority: "critical" | "high" | "low"; message: string } | null = null;
      if (qty <= p.safetyStock) {
        alert = { type: "critical_stock", priority: "critical", message: `${p.name} is critically low: ${qty} left (safety stock ${p.safetyStock}). Reorder immediately.` };
      } else if (qty <= p.reorderPoint) {
        alert = { type: "low_stock", priority: "high", message: `${p.name} is below its reorder point: ${qty} on hand vs ${p.reorderPoint}.` };
      } else if (qty >= p.reorderPoint * 6) {
        alert = { type: "overstock", priority: "low", message: `${p.name} is overstocked: ${qty} units on hand (reorder point ${p.reorderPoint}). Consider a promotion.` };
      }
      if (!alert) continue;
      await ctx.db.insert("alerts", {
        orgId,
        productId: p._id,
        ...alert,
        isRead: alert.type === "overstock",
        isDismissed: false,
        createdAt: now - (n % 6) * 3 * 60 * 60 * 1000,
      });
      n++;
    }

    const byName = (name: string) => products.find((p) => p.name === name);
    const extras: { type: "demand_spike" | "supplier_delay" | "system"; priority: "high" | "medium" | "low"; message: string; product?: string; hoursAgo: number; isRead: boolean }[] = [
      { type: "demand_spike", priority: "high", message: "Deepavali demand spike: Coconut Oil 1L sales up 45% this week.", product: "Coconut Oil 1L", hoursAgo: 5, isRead: false },
      { type: "demand_spike", priority: "medium", message: "Kokis 200g selling 40% above forecast ahead of Deepavali.", product: "Kokis 200g", hoursAgo: 9, isRead: false },
      { type: "supplier_delay", priority: "high", message: "PO-2026-0013 from Negombo Seafood & Frozen Foods is overdue by 6 days.", hoursAgo: 20, isRead: false },
      { type: "system", priority: "low", message: "Nightly AI forecast run completed for 120 products.", hoursAgo: 14, isRead: true },
    ];
    for (const e of extras) {
      await ctx.db.insert("alerts", {
        orgId,
        productId: e.product ? byName(e.product)?._id : undefined,
        type: e.type,
        priority: e.priority,
        message: e.message,
        isRead: e.isRead,
        isDismissed: false,
        createdAt: now - e.hoursAgo * 60 * 60 * 1000,
      });
      n++;
    }
    return { alerts: n };
  },
});

// ── Orchestration ───────────────────────────────────────────────────────────

/** Wipes ALL business data (every workspace) and seeds the demo dataset into `orgId`. */
export const resetAndSeed = internalAction({
  args: { orgId: v.id("organizations"), skipWipe: v.optional(v.boolean()), skipForecasts: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const summary: Record<string, unknown> = {};
    if (!args.skipWipe) {
      let wiped = 0;
      for (;;) {
        const r: { deleted: number; done: boolean } = await ctx.runMutation(internal.demoData.wipeBusinessDataBatch, {});
        wiped += r.deleted;
        if (r.done) break;
      }
      summary.wipedRecords = wiped;
    }

    const now = Date.now();
    summary.catalog = await ctx.runMutation(internal.demoData.seedCatalog, { orgId: args.orgId, now });
    let sales = 0;
    for (let d = 0; d < HISTORY_DAYS; d += 10) {
      const r: { inserted: number } = await ctx.runMutation(internal.demoData.seedSalesBatch, {
        orgId: args.orgId, now, fromDay: d, toDay: d + 10,
      });
      sales += r.inserted;
    }
    summary.salesMovements = sales;
    summary.purchasing = await ctx.runMutation(internal.demoData.seedPurchaseOrders, { orgId: args.orgId, now });
    summary.alerts = await ctx.runMutation(internal.demoData.seedAlerts, { orgId: args.orgId, now });

    // Real engines over the seeded history
    summary.reorderSuggestions = await ctx.runMutation(internal.reorder.generateReorderSuggestions, {});
    summary.priceSuggestions = await ctx.runMutation(internal.pricing.generatePriceSuggestions, {});
    if (!args.skipForecasts) {
      summary.forecasts = await ctx.runAction(internal.forecasting.generateAllForecasts, { orgId: args.orgId });
    }
    return summary;
  },
});

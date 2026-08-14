import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Users ──────────────────────────────────────
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending"),
    ),
    isActive: v.boolean(),
    supplierId: v.optional(v.id("suppliers")),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
    isVipAccess: v.optional(v.boolean()),
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // ── Sessions ───────────────────────────────────
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  // ── Locations ──────────────────────────────────
  locations: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    type: v.union(
      v.literal("warehouse"),
      v.literal("store"),
      v.literal("distribution_center"),
      v.literal("supplier_site"),
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  // ── Categories ─────────────────────────────────
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }),

  // ── Suppliers ──────────────────────────────────
  suppliers: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    leadTimeDays: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_hold"),
    ),
    reliabilityScore: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // ── Products ───────────────────────────────────
  products: defineTable({
    categoryId: v.optional(v.id("categories")),
    primarySupplierId: v.optional(v.id("suppliers")),
    sku: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    unit: v.union(
      v.literal("pcs"),
      v.literal("kg"),
      v.literal("litre"),
      v.literal("box"),
      v.literal("ml"),
    ),
    costPrice: v.number(),
    sellingPrice: v.number(),
    reorderPoint: v.number(),
    safetyStock: v.number(),
    trackBatches: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_sku", ["sku"])
    .index("by_category", ["categoryId"]),

  // ── Inventory ──────────────────────────────────
  inventory: defineTable({
    productId: v.id("products"),
    locationId: v.id("locations"),
    onHand: v.number(),
    reserved: v.number(),
    available: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_location", ["productId", "locationId"]),

  // ── Stock Movements ────────────────────────────
  stockMovements: defineTable({
    productId: v.id("products"),
    locationId: v.id("locations"),
    userId: v.optional(v.id("users")),
    type: v.union(
      v.literal("stock_in"),
      v.literal("stock_out"),
      v.literal("adjustment"),
      v.literal("transfer_out"),
      v.literal("transfer_in"),
      v.literal("write_off"),
    ),
    reason: v.optional(v.string()),
    quantity: v.number(),
    lotNumber: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_created", ["createdAt"])
    .index("by_product_date", ["productId", "createdAt"]),

  // ── Purchase Orders ────────────────────────────
  purchaseOrders: defineTable({
    supplierId: v.id("suppliers"),
    createdBy: v.optional(v.id("users")),
    poNumber: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    lineItems: v.array(
      v.object({
        productId: v.id("products"),
        quantityOrdered: v.number(),
        quantityReceived: v.optional(v.number()), // ← make optional
        unitCost: v.number(),
        lineTotal: v.optional(v.number()), // ← make optional
      }),
    ),
    totalValue: v.number(),
    requestedDelivery: v.optional(v.number()),
    confirmedDelivery: v.optional(v.number()),
    trackingNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ── Reorder Suggestions ────────────────────────
  reorderSuggestions: defineTable({
    productId: v.id("products"),
    preferredSupplierId: v.optional(v.id("suppliers")),
    urgency: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    suggestedQuantity: v.number(),
    estimatedCost: v.optional(v.number()),
    orderByDate: v.optional(v.number()),
    rationale: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("dismissed"),
    ),
    aiGenerated: v.boolean(),
    dismissedReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_status", ["status"]),

  // ── Forecasts ──────────────────────────────────
  forecasts: defineTable({
    productId: v.id("products"),
    forecastDate: v.number(),
    predictedDemand: v.number(),
    upperBound: v.number(),
    lowerBound: v.number(),
    confidenceScore: v.number(),
    modelUsed: v.string(),
    generatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_date", ["productId", "forecastDate"]),

  // priceSuggestions table

  priceSuggestions: defineTable({
    productId: v.id("products"),
    currentPrice: v.number(),
    suggestedPrice: v.number(),
    priceChange: v.number(), // percentage change
    changeDirection: v.union(
      v.literal("increase"),
      v.literal("decrease"),
      v.literal("maintain"),
    ),
    reason: v.string(), // plain English explanation
    confidence: v.number(), // 0.0 to 1.0
    factors: v.object({
      stockLevel: v.string(), // "critical" | "low" | "healthy" | "overstock"
      demandTrend: v.string(), // "rising" | "falling" | "stable"
      seasonality: v.string(), // "peak" | "off-peak" | "normal"
      daysOfStock: v.number(), // estimated days until stockout
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    appliedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_status", ["status"]),

  // ── Alerts ─────────────────────────────────────
  alerts: defineTable({
    productId: v.optional(v.id("products")),
    type: v.union(
      v.literal("low_stock"),
      v.literal("critical_stock"),
      v.literal("overstock"),
      v.literal("demand_spike"),
      v.literal("supplier_delay"),
      v.literal("system"),
    ),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    message: v.string(),
    isRead: v.boolean(),
    isDismissed: v.boolean(),
    snoozedUntil: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_active", ["isDismissed"])
    .index("by_product", ["productId"]),

  // ── Subscriptions ─────────────────────────────
  subscriptions: defineTable({
    clerkId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("growth"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("trialing")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

  // ── User Preferences ─────────────────────────
  userPreferences: defineTable({
    clerkId: v.string(),
    alertTypes: v.object({
      lowStock: v.boolean(),
      criticalStock: v.boolean(),
      overstock: v.boolean(),
      demandSpike: v.boolean(),
      system: v.boolean(),
    }),
    channels: v.object({
      inApp: v.boolean(),
      email: v.boolean(),
    }),
    thresholds: v.object({
      lowStockMultiplier: v.number(),
      criticalStockMultiplier: v.number(),
    }),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // ── Security & Audit Logs ─────────────────────
  securityLogs: defineTable({
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    eventType: v.string(), // "SECURITY_WARNING" | "IDOR_ATTEMPT" | "UNAUTHORIZED_MUTATION"
    details: v.string(),
    targetId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_event_type", ["eventType"]),
});
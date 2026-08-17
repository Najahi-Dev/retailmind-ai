import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Multi-Tenant Organizations / Workspaces ──
  subscriptionPlans: defineTable({
    name: v.string(), // e.g. "Starter", "Growth", "Enterprise"
    tier: v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("ENTERPRISE")),
    description: v.string(),
    monthlyPriceLkr: v.number(),
    yearlyPriceLkr: v.number(),
    stripeProductId: v.optional(v.string()),
    stripeMonthlyPriceId: v.optional(v.string()),
    stripeYearlyPriceId: v.optional(v.string()),
    features: v.object({
      activeSkuLimit: v.union(v.number(), v.literal("unlimited")),
      storeLimit: v.union(v.number(), v.literal("unlimited")),
      staffUserLimit: v.union(v.number(), v.literal("unlimited")),
      aiDemandForecasting: v.boolean(),
      automatedReorder: v.boolean(),
      dynamicPricing: v.boolean(),
      supplierPortal: v.boolean(),
      fullRbac: v.boolean(),
    }),
    isRecommended: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_tier", ["tier"]),

  aiOperationalSettings: defineTable({
    // Forecasting
    forecastHorizonDays: v.number(),
    retrainingSchedule: v.string(), // e.g. "weekly", "daily"
    // Pricing
    globalMinProfitMarginPercent: v.number(),
    globalMaxDiscountPercent: v.number(),
    globalMaxDailyPriceChangePercent: v.number(),
    requireApprovalForHighRisk: v.boolean(),
    // Inventory
    globalSafetyStockDays: v.number(),
    globalExpiryWarningDays: v.number(),
    updatedAt: v.number(),
  }),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    inviteCode: v.string(),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    planTier: v.optional(v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("ENTERPRISE"))),
    subscriptionStatus: v.optional(v.union(
      v.literal("FREE"),
      v.literal("TRIALING"),
      v.literal("ACTIVE"),
      v.literal("PAST_DUE"),
      v.literal("CANCELED"),
      v.literal("trial"),
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due")
    )),
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    subscribedAt: v.optional(v.number()),
    isTrialUsed: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    isActive: v.boolean(),
    limits: v.optional(
      v.object({
        maxSkus: v.number(),
        maxApi: v.number(),
        maxBranches: v.number(),
      })
    ),
    paymentMethod: v.optional(v.union(v.literal("stripe"), v.literal("offline"))),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_invite_code", ["inviteCode"]),

  // ── Users ──────────────────────────────────────
  users: defineTable({
    orgId: v.optional(v.id("organizations")),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"),
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
  })
    .index("by_email", ["email"])
    .index("by_org", ["orgId"]),

  // ── Sessions ───────────────────────────────────
  sessions: defineTable({
    orgId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"]),

  // ── Locations ──────────────────────────────────
  locations: defineTable({
    orgId: v.optional(v.id("organizations")),
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
  }).index("by_org", ["orgId"]),

  // ── Approvals (High-Risk Actions) ─────────────
  approvals: defineTable({
    orgId: v.optional(v.id("organizations")),
    requesterId: v.optional(v.id("users")),
    actionType: v.string(), // e.g. "PRICE_CHANGE", "LARGE_PO"
    details: v.any(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]).index("by_status", ["status"]),

  // ── Integrations ───────────────────────────────
  integrations: defineTable({
    orgId: v.id("organizations"),
    provider: v.string(), // e.g. "xero", "quickbooks", "shopify"
    status: v.union(v.literal("active"), v.literal("error"), v.literal("disconnected")),
    lastSyncAt: v.optional(v.number()),
    config: v.any(), // Encrypted keys or tokens would go here in a real app
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),


  // ── Notification Templates ─────────────────────
  notificationTemplates: defineTable({
    name: v.string(), // e.g. "LOW_STOCK_ALERT", "BILLING_FAILED"
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("in_app")),
    subjectTemplate: v.optional(v.string()),
    bodyTemplate: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // ── Categories ─────────────────────────────────
  categories: defineTable({
    orgId: v.optional(v.id("organizations")),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_org", ["orgId"]),

  // ── Suppliers ──────────────────────────────────
  suppliers: defineTable({
    orgId: v.optional(v.id("organizations")),
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
  })
    .index("by_status", ["status"])
    .index("by_org", ["orgId"]),

  // ── Products ───────────────────────────────────
  products: defineTable({
    orgId: v.optional(v.id("organizations")),
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
    barcode: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    minStockLevel: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_sku", ["sku"])
    .index("by_category", ["categoryId"])
    .index("by_org", ["orgId"]),

  // ── Inventory ──────────────────────────────────
  inventory: defineTable({
    orgId: v.optional(v.id("organizations")),
    productId: v.id("products"),
    locationId: v.id("locations"),
    onHand: v.number(),
    reserved: v.number(),
    available: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_location", ["productId", "locationId"])
    .index("by_org", ["orgId"]),

  // ── Stock Movements ────────────────────────────
  stockMovements: defineTable({
    orgId: v.optional(v.id("organizations")),
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
    .index("by_product_date", ["productId", "createdAt"])
    .index("by_org", ["orgId"]),

  // ── Purchase Orders ────────────────────────────
  purchaseOrders: defineTable({
    orgId: v.optional(v.id("organizations")),
    supplierId: v.id("suppliers"),
    createdBy: v.optional(v.id("users")),
    poNumber: v.string(),
    invoiceNumber: v.optional(v.string()),
    invoiceDate: v.optional(v.number()),
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
        quantityReceived: v.optional(v.number()),
        unitCost: v.number(),
        lineTotal: v.optional(v.number()),
      }),
    ),
    totalValue: v.number(),
    paymentMethod: v.optional(v.union(
      v.literal("CASH_ON_DELIVERY"),
      v.literal("CHEQUE"),
      v.literal("CREDIT"),
      // Legacy: kept for backward compatibility with existing records
      v.literal("cash_on_delivery"),
      v.literal("credit"),
      v.literal("card"),
    )),
    paymentStatus: v.optional(v.union(
      v.literal("PAID"),
      v.literal("DUE"),
      v.literal("PARTIALLY_PAID"),
      v.literal("CHEQUE_PENDING"),
      v.literal("OVERDUE"),
      v.literal("PENDING_ON_DELIVERY"),
      // Legacy statuses
      v.literal("unpaid"),
      v.literal("partial"),
      v.literal("paid"),
    )),
    amountPaid: v.optional(v.number()),
    // ── Cheque payment details ──
    chequeNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    chequeAmount: v.optional(v.number()),
    chequeDate: v.optional(v.number()),
    chequeStatus: v.optional(v.string()), // "ISSUED" | "CLEARED" | "BOUNCED"
    // ── Credit payment details ──
    creditTermDays: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    requestedDelivery: v.optional(v.number()),
    confirmedDelivery: v.optional(v.number()),
    trackingNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_org", ["orgId"]),

  // ── PO Payments (─────────────────────────────────────
  poPayments: defineTable({
    orgId: v.optional(v.id("organizations")),
    poId: v.id("purchaseOrders"),
    recordedBy: v.optional(v.id("users")),
    method: v.union(
      v.literal("CASH_ON_DELIVERY"),
      v.literal("CHEQUE"),
      v.literal("CREDIT"),
      // Legacy
      v.literal("cash_on_delivery"),
      v.literal("credit"),
      v.literal("card"),
    ),
    // Cheque-specific payment metadata
    chequeNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    chequeDate: v.optional(v.number()),
    chequeStatus: v.optional(v.string()),
    amount: v.number(),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    paidAt: v.number(),
  })
    .index("by_po", ["poId"])
    .index("by_org", ["orgId"]),

  // ── Reorder Suggestions ────────────────────────
  reorderSuggestions: defineTable({
    orgId: v.optional(v.id("organizations")),
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
    .index("by_status", ["status"])
    .index("by_org", ["orgId"]),

  // ── Forecasts ──────────────────────────────────
  forecasts: defineTable({
    orgId: v.optional(v.id("organizations")),
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
    .index("by_product_date", ["productId", "forecastDate"])
    .index("by_org", ["orgId"]),

  // ── Price Suggestions ──────────────────────────
  priceSuggestions: defineTable({
    orgId: v.optional(v.id("organizations")),
    productId: v.id("products"),
    currentPrice: v.number(),
    suggestedPrice: v.number(),
    priceChange: v.number(),
    changeDirection: v.union(
      v.literal("increase"),
      v.literal("decrease"),
      v.literal("maintain"),
    ),
    reason: v.string(),
    confidence: v.number(),
    factors: v.object({
      stockLevel: v.string(),
      demandTrend: v.string(),
      seasonality: v.string(),
      daysOfStock: v.number(),
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
    .index("by_status", ["status"])
    .index("by_org", ["orgId"]),

  // ── Alerts ─────────────────────────────────────
  alerts: defineTable({
    orgId: v.optional(v.id("organizations")),
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
    .index("by_product", ["productId"])
    .index("by_org", ["orgId"]),

  // ── Subscriptions ─────────────────────────────
  subscriptions: defineTable({
    orgId: v.optional(v.id("organizations")),
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
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_org", ["orgId"]),

  // ── User Preferences ─────────────────────────
  userPreferences: defineTable({
    orgId: v.optional(v.id("organizations")),
    clerkId: v.string(),
    alertTypes: v.any(),
    channels: v.object({
      inApp: v.boolean(),
      email: v.boolean(),
      push: v.optional(v.boolean()),
    }),
    thresholds: v.object({
      lowStockMultiplier: v.number(),
      criticalStockMultiplier: v.number(),
    }),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_org", ["orgId"]),

  // ── Security & Audit Logs ─────────────────────
  securityLogs: defineTable({
    orgId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    eventType: v.string(),
    details: v.string(),
    targetId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_event_type", ["eventType"])
    .index("by_org", ["orgId"]),

  // ── Support Tickets ───────────────────────────
  supportTickets: defineTable({
    orgId: v.optional(v.id("organizations")),
    ticketId: v.string(),
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    userRole: v.string(),
    userImageUrl: v.optional(v.string()),
    subject: v.string(),
    category: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    details: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
    adminResponse: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_org", ["orgId"]),

  // ── Global Platform Settings ─────────────────
  globalSettings: defineTable({
    maintenanceMode: v.boolean(),
    globalFeatureFlags: v.any(),
    updatedAt: v.number(),
  }),

  // ── System Alerts & Telemetry ────────────────
  systemAlerts: defineTable({
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error"), v.literal("critical")),
    message: v.string(),
    source: v.string(), // e.g. "LLM", "Auth", "Database"
    details: v.optional(v.string()),
    resolved: v.boolean(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]).index("by_resolved", ["resolved"]),

  // ── Admin Audit Logs ─────────────────────────
  adminAuditLogs: defineTable({
    adminId: v.id("users"),
    action: v.string(), // e.g., "IMPERSONATE", "OVERRIDE_LIMITS", "CLONE_TENANT"
    targetOrgId: v.optional(v.id("organizations")),
    targetUserId: v.optional(v.id("users")),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_admin", ["adminId"]).index("by_org", ["targetOrgId"]),

  // ── AI Model Telemetry ───────────────────────
  aiUsageLogs: defineTable({
    orgId: v.optional(v.id("organizations")),
    model: v.string(), // e.g., "gemini-1.5-pro", "gemini-1.5-flash"
    action: v.string(), // e.g., "DEMAND_FORECAST", "OCR"
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(),
    latencyMs: v.optional(v.number()),
    isFallback: v.optional(v.boolean()),
    timestamp: v.number(),
  }).index("by_org", ["orgId"]).index("by_timestamp", ["timestamp"]),

  // ── System Prompt Registry ───────────────────
  systemPrompts: defineTable({
    name: v.string(), // e.g., "DEMAND_FORECASTER"
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    userPromptTemplate: v.optional(v.string()),
    defaultModel: v.string(),
    fallbackModel: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // ── Stripe Webhook DLQ ───────────────────────
  stripeWebhookFailures: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    payload: v.string(),
    error: v.string(),
    status: v.union(v.literal("pending"), v.literal("retried"), v.literal("resolved")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]).index("by_event_id", ["eventId"]),

  // ── Dunning Logs ─────────────────────────────
  dunningLogs: defineTable({
    orgId: v.id("organizations"),
    status: v.union(v.literal("warning_1"), v.literal("warning_3"), v.literal("warning_7"), v.literal("suspended")),
    sentAt: v.number(),
  }).index("by_org", ["orgId"]),

  // ── Global System Banners ────────────────────
  systemBanners: defineTable({
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  // ── Security Events ──────────────────────────
  securityEvents: defineTable({
    orgId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    eventType: v.string(), // "KILL_SWITCH_ACTIVATED", "MULTIPLE_FAILED_LOGINS", "ANOMALOUS_API_USAGE"
    description: v.string(),
    ipAddress: v.optional(v.string()),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    resolved: v.boolean(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]).index("by_resolved", ["resolved"]).index("by_org", ["orgId"]),
});
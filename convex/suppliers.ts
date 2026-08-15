import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg, verifyEntityOrgAccess } from "./lib/roleGuard";

// ── Get all suppliers ─────────────────────────────
export const getSuppliers = query({
  args: {
    token: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    let suppliers = await ctx.db.query("suppliers").collect();

    if (caller && caller.orgId) {
      suppliers = suppliers.filter((s) => !s.orgId || s.orgId === caller.orgId);
    }

    const filtered =
      args.status && args.status !== "all"
        ? suppliers.filter((s) => s.status === args.status)
        : suppliers;

    // Attach PO stats per supplier
    const result = await Promise.all(
      filtered.map(async (s) => {
        const pos = await ctx.db
          .query("purchaseOrders")
          .withIndex("by_supplier", (q) => q.eq("supplierId", s._id))
          .collect();

        const totalOrders = pos.length;
        const totalValue = pos.reduce((sum, po) => sum + po.totalValue, 0);
        const deliveredOrders = pos.filter(
          (po) => po.status === "delivered",
        ).length;
        const pendingOrders = pos.filter((po) =>
          ["sent", "confirmed", "shipped"].includes(po.status),
        ).length;

        return {
          ...s,
          totalOrders,
          totalValue,
          deliveredOrders,
          pendingOrders,
          onTimeRate:
            totalOrders > 0
              ? Math.round((deliveredOrders / totalOrders) * 100)
              : null,
        };
      }),
    );

    return result.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// ── Get supplier detail ───────────────────────────
export const getSupplierDetail = query({
  args: {
    supplierId: v.id("suppliers"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) return null;

    if (caller && caller.orgId) {
      verifyEntityOrgAccess(supplier, caller.orgId);
    }

    // Recent POs
    const pos = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .take(10);

    const posWithDetails = await Promise.all(
      pos.map(async (po) => {
        const lineItems = await Promise.all(
          po.lineItems.map(async (line) => {
            const product = await ctx.db.get(line.productId);
            return { ...line, productName: product?.name ?? "Unknown" };
          }),
        );
        return { ...po, lineItems };
      }),
    );

    // Products supplied by this supplier
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("primarySupplierId"), args.supplierId))
      .collect();

    const productsWithInventory = await Promise.all(
      products.map(async (p) => {
        const inv = await ctx.db
          .query("inventory")
          .withIndex("by_product", (q) => q.eq("productId", p._id))
          .first();
        const category = p.categoryId ? await ctx.db.get(p.categoryId) : null;
        return {
          ...p,
          onHand: inv?.onHand ?? 0,
          categoryName: category?.name ?? "Uncategorized",
        };
      }),
    );

    // Stats
    const allPos = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    const totalValue = allPos.reduce((sum, po) => sum + po.totalValue, 0);
    const delivered = allPos.filter((p) => p.status === "delivered").length;
    const pending = allPos.filter((p) =>
      ["sent", "confirmed", "shipped"].includes(p.status),
    ).length;

    return {
      supplier,
      recentPOs: posWithDetails,
      products: productsWithInventory,
      stats: {
        totalOrders: allPos.length,
        totalValue,
        deliveredOrders: delivered,
        pendingOrders: pending,
        onTimeRate:
          allPos.length > 0
            ? Math.round((delivered / allPos.length) * 100)
            : null,
        totalProducts: products.length,
      },
    };
  },
});

// ── Get supplier stats for KPI cards ─────────────
export const getSupplierStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    let suppliers = await ctx.db.query("suppliers").collect();

    if (caller && caller.orgId) {
      suppliers = suppliers.filter((s) => !s.orgId || s.orgId === caller.orgId);
    }

    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === "active").length,
      inactive: suppliers.filter((s) => s.status === "inactive").length,
      onHold: suppliers.filter((s) => s.status === "on_hold").length,
    };
  },
});

// ── Create supplier ───────────────────────────────
export const createSupplier = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    leadTimeDays: v.number(),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);

    // Check duplicate email in organization
    const existing = await ctx.db
      .query("suppliers")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existing && (!existing.orgId || existing.orgId === orgId)) {
      throw new Error("Supplier with this email already exists in your workspace");
    }

    return await ctx.db.insert("suppliers", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      address: args.address,
      paymentTerms: args.paymentTerms,
      leadTimeDays: args.leadTimeDays,
      orgId,
      status: "active",
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ── Update supplier ───────────────────────────────
export const updateSupplier = mutation({
  args: {
    token: v.optional(v.string()),
    supplierId: v.id("suppliers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    leadTimeDays: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("on_hold")),
    ),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");

    if (orgId) {
      verifyEntityOrgAccess(supplier, orgId);
    }

    const { supplierId, token, ...fields } = args;
    const updateFields = Object.fromEntries(
      Object.entries(fields).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(supplierId, updateFields);
  },
});

export const getActiveSuppliers = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    let suppliers = await ctx.db
      .query("suppliers")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (caller && caller.orgId) {
      suppliers = suppliers.filter((s) => !s.orgId || s.orgId === caller.orgId);
    }

    return suppliers;
  },
});

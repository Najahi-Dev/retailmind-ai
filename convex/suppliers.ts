import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { getCallerUser, requireCallerOrg, getOrgEntity, getSupplierForUser } from "./lib/roleGuard";

// ── Get all suppliers (Strict Org Scoped) ─────────────────────────────
export const getSuppliers = query({
  args: {
    token: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return [];

    let suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_org", (q) => q.eq("orgId", caller.orgId))
      .collect();

    // Supplier users may only see their own supplier record.
    if (caller.role === "supplier") {
      const own = await getSupplierForUser(ctx, caller);
      suppliers = own ? suppliers.filter((s) => s._id === own._id) : [];
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

        const orgPOs = pos.filter((po) => po.orgId === caller.orgId);

        const totalOrders = orgPOs.length;
        const totalValue = orgPOs.reduce((sum, po) => sum + po.totalValue, 0);
        const deliveredOrders = orgPOs.filter(
          (po) => po.status === "delivered",
        ).length;
        const pendingOrders = orgPOs.filter((po) =>
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
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token);
    const exists = await ctx.db.get(args.supplierId);
    if (!exists) return null;
    const supplier = await getOrgEntity<Doc<"suppliers">>(ctx, "suppliers", args.supplierId, orgId);

    // Supplier users may only view their own supplier profile.
    if (caller.role === "supplier") {
      const own = await getSupplierForUser(ctx, caller);
      if (!own || own._id !== supplier._id) {
        throw new ConvexError("Access Denied: Supplier profile belongs to another supplier.");
      }
    }

    // Recent POs
    const pos = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .order("desc")
      .take(10);

    const orgPOs = pos.filter((po) => po.orgId === orgId);

    const posWithDetails = await Promise.all(
      orgPOs.map(async (po) => {
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
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const orgProducts = products.filter((p) => p.primarySupplierId === args.supplierId);

    const productsWithInventory = await Promise.all(
      orgProducts.map(async (p) => {
        const inv = await ctx.db
          .query("inventory")
          .withIndex("by_product", (q) => q.eq("productId", p._id))
          .filter((q) => q.eq(q.field("orgId"), orgId))
          .first();
        const category = p.categoryId ? await ctx.db.get(p.categoryId) : null;
        return {
          ...p,
          onHand: inv?.onHand ?? 0,
          categoryName: category?.name ?? "Uncategorized",
        };
      }),
    );

    const allPos = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
      .collect();

    const filteredAllPOs = allPos.filter((po) => po.orgId === orgId);

    const totalValue = filteredAllPOs.reduce((sum, po) => sum + po.totalValue, 0);
    const delivered = filteredAllPOs.filter((p) => p.status === "delivered").length;
    const pending = filteredAllPOs.filter((p) =>
      ["sent", "confirmed", "shipped"].includes(p.status),
    ).length;

    return {
      supplier,
      recentPOs: posWithDetails,
      products: productsWithInventory,
      stats: {
        totalOrders: filteredAllPOs.length,
        totalValue,
        deliveredOrders: delivered,
        pendingOrders: pending,
        onTimeRate:
          filteredAllPOs.length > 0
            ? Math.round((delivered / filteredAllPOs.length) * 100)
            : null,
        totalProducts: orgProducts.length,
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
    if (!caller || !caller.orgId) {
      return { total: 0, active: 0, inactive: 0, onHold: 0 };
    }

    const allSuppliers = await ctx.db.query("suppliers").collect();
    const suppliers = allSuppliers.filter((s) => s.orgId === caller.orgId);

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

    const supplierId = await ctx.db.insert("suppliers", {
      orgId,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone,
      address: args.address,
      paymentTerms: args.paymentTerms ?? "Net 30",
      leadTimeDays: args.leadTimeDays,
      status: "active",
      reliabilityScore: 90,
      isActive: true,
      createdAt: Date.now(),
    });

    return supplierId;
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
      v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("on_hold"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");

    if (supplier.orgId !== orgId) {
      throw new ConvexError("Access Denied: Supplier belongs to another workspace.");
    }

    const { supplierId, token, ...fields } = args;
    const updateFields = Object.fromEntries(
      Object.entries(fields).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(supplierId, updateFields);
  },
});

export const deleteSupplier = mutation({
  args: {
    token: v.optional(v.string()),
    supplierId: v.id("suppliers"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");

    if (supplier.orgId !== orgId) {
      throw new ConvexError("Access Denied: Supplier belongs to another workspace.");
    }

    // Delete associated user if exists (users with supplierId pointing to this supplier)
    const associatedUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("supplierId"), args.supplierId))
      .collect();

    // Delete the associated users
    for (const user of associatedUsers) {
      await ctx.db.delete(user._id);
    }

    // Delete the supplier
    await ctx.db.delete(args.supplierId);
  },
});

export const getActiveSuppliers = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return [];

    const suppliers = (
      await ctx.db
        .query("suppliers")
        .withIndex("by_org", (q) => q.eq("orgId", caller.orgId))
        .collect()
    ).filter((s) => s.status === "active");

    if (caller.role === "supplier") {
      const own = await getSupplierForUser(ctx, caller);
      return own ? suppliers.filter((s) => s._id === own._id) : [];
    }
    return suppliers;
  },
});

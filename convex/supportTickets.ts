// convex/supportTickets.ts
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCallerUser, requireRole } from "./lib/roleGuard";

// ── 1. Create Support Ticket ──────────────────────────
export const createTicket = mutation({
  args: {
    token: v.optional(v.string()),
    subject: v.string(),
    category: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, args.token);

    const ticketId = `#RM-SUP-${Math.floor(100000 + Math.random() * 900000)}`;

    const id = await ctx.db.insert("supportTickets", {
      ticketId,
      orgId: caller.orgId,
      userId: caller._id,
      userName: caller.name,
      userEmail: caller.email,
      userRole: caller.role,
      userImageUrl: caller.imageUrl,
      subject: args.subject.trim(),
      category: args.category,
      priority: args.priority,
      details: args.details.trim(),
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { id, ticketId };
  },
});

// ── 2. Get User Support Tickets ───────────────────────
export const getUserTickets = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller) return [];

    // Org Admins and Managers see their own organization's tickets; Suppliers and
    // Staff see only their own. Platform-wide access lives in communicationsAdmin
    // (super admin only).
    const orgId = caller.orgId;
    const tickets = ["admin", "manager"].includes(caller.role) && orgId
      ? await ctx.db
          .query("supportTickets")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .order("desc")
          .collect()
      : await ctx.db
          .query("supportTickets")
          .withIndex("by_user", (q) => q.eq("userId", caller._id))
          .order("desc")
          .collect();

    return await Promise.all(
      tickets.map(async (t) => {
        const ticketUser = await ctx.db.get(t.userId);
        return {
          ...t,
          userImageUrl: ticketUser?.imageUrl ?? t.userImageUrl,
          userName: ticketUser?.name ?? t.userName,
        };
      })
    );
  },
});

// ── 3. Delete Support Ticket ──────────────────────────
export const deleteTicket = mutation({
  args: {
    token: v.optional(v.string()),
    ticketDbId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, args.token);
    const ticket = await ctx.db.get(args.ticketDbId);
    if (!ticket) throw new ConvexError("Support ticket not found");

    // Only ticket creator or an Admin/Manager of the SAME organization can delete it
    const isOwner = ticket.userId === caller._id;
    const isOrgAdminOrManager =
      ["admin", "manager"].includes(caller.role) &&
      !!caller.orgId &&
      ticket.orgId === caller.orgId;

    if (!isOwner && !isOrgAdminOrManager) {
      throw new ConvexError("Access Denied: You can only delete your own support tickets");
    }

    await ctx.db.delete(args.ticketDbId);
    return { success: true };
  },
});

// ── 4. Admin Response to Ticket ───────────────────────
export const respondToTicket = mutation({
  args: {
    token: v.optional(v.string()),
    ticketDbId: v.id("supportTickets"),
    adminResponse: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, args.token, ["admin", "manager"]);
    const ticket = await ctx.db.get(args.ticketDbId);
    if (!ticket) throw new ConvexError("Support ticket not found");
    if (!caller.orgId || ticket.orgId !== caller.orgId) {
      throw new ConvexError("Access Denied: Ticket belongs to another organization.");
    }

    await ctx.db.patch(args.ticketDbId, {
      adminResponse: args.adminResponse.trim(),
      status: args.status,
      respondedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

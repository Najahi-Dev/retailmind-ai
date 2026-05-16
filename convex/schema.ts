// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId:   v.string(),
    email:     v.string(),
    name:      v.string(),
    role:      v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier")
    ),
    isActive:  v.boolean(),
    createdAt: v.number(),
  })
  .index("by_clerk_id", ["clerkId"]),
});
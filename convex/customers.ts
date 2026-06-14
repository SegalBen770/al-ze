import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/authz";

/** רשימת כל הלקוחות עם מספר המשתמשים בכל אחד (אדמין בלבד). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const customers = await ctx.db.query("customers").collect();
    return await Promise.all(
      customers.map(async (c) => {
        const users = await ctx.db
          .query("users")
          .withIndex("by_customer", (q) => q.eq("customerId", c._id))
          .collect();
        const pendingInvites = await ctx.db
          .query("invites")
          .withIndex("by_customer", (q) => q.eq("customerId", c._id))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .collect();
        return {
          ...c,
          userCount: users.length,
          pendingInviteCount: pendingInvites.length,
        };
      }),
    );
  },
});

/** הלקוח של המשתמש המחובר (לצורך תצוגת שם בכותרת). */
export const myCustomer = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.customerId) return null;
    return await ctx.db.get(user.customerId);
  },
});

export const create = mutation({
  args: { name: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { name, note }) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("customers", {
      name: name.trim(),
      note,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(id, patch);
  },
});

/** רשימת המשתמשים של לקוח (אדמין בלבד). */
export const usersForCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    const users = await ctx.db
      .query("users")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  },
});

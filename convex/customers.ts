import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser, userDisplayName } from "./lib/authz";

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
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      displayName: userDisplayName(u),
      email: u.email,
      role: u.role,
    }));
  },
});

/** עריכת פרטי משתמש (שם פרטי / משפחה) — אדמין בלבד. */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, firstName, lastName }) => {
    await requireAdmin(ctx);
    const fn = firstName?.trim() || undefined;
    const ln = lastName?.trim() || undefined;
    const fullName = [fn, ln].filter(Boolean).join(" ") || undefined;
    await ctx.db.patch(userId, {
      firstName: fn,
      lastName: ln,
      ...(fullName ? { name: fullName } : {}),
    });
  },
});

/** מחיקת משתמש — כולל חשבונות הזדהות וסשנים (אדמין בלבד). */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId) throw new Error("אי אפשר למחוק את עצמך");

    // מחיקת חשבונות ההזדהות של המשתמש.
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);

    // מחיקת הסשנים והטוקנים.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const s of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", s._id))
        .collect();
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(userId);
  },
});

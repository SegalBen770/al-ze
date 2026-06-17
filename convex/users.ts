import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser, userDisplayName } from "./lib/authz";

/** המשתמש המחובר + מצב גישה. מחזיר null אם לא מחובר. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const customer = user.customerId ? await ctx.db.get(user.customerId) : null;
    const hasAccess = user.role === "admin" || !!user.customerId;

    return {
      _id: user._id,
      name: user.name ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      displayName: userDisplayName(user),
      email: user.email ?? null,
      role: user.role ?? null,
      isAdmin: user.role === "admin",
      hasAccess,
      customerId: user.customerId ?? null,
      customerName: customer?.name ?? null,
    };
  },
});

/** עדכון הפרטים האישיים של המשתמש המחובר. */
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { firstName, lastName }) => {
    const user = await requireUser(ctx);
    const fn = firstName?.trim() || undefined;
    const ln = lastName?.trim() || undefined;
    const fullName = [fn, ln].filter(Boolean).join(" ") || undefined;
    await ctx.db.patch(user._id, {
      firstName: fn,
      lastName: ln,
      ...(fullName ? { name: fullName } : {}),
    });
  },
});

import { query } from "./_generated/server";
import { getCurrentUser, userDisplayName } from "./lib/authz";

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

import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export type AppUser = Doc<"users">;

/** מחזיר את המשתמש המחובר, או null אם לא מחובר. */
export async function getCurrentUser(ctx: QueryCtx): Promise<AppUser | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

/** דורש משתמש מחובר עם גישה (אדמין, או לקוח עם customerId). */
export async function requireUser(ctx: QueryCtx): Promise<AppUser> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("לא מחובר");
  if (user.role !== "admin" && !user.customerId) {
    throw new Error("אין הרשאת גישה — פנה למנהל המערכת");
  }
  return user;
}

/** דורש משתמש אדמין. */
export async function requireAdmin(ctx: QueryCtx): Promise<AppUser> {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("נדרשת הרשאת מנהל");
  }
  return user;
}

export function isAdmin(user: AppUser | null): boolean {
  return user?.role === "admin";
}

/**
 * דורש גישה לטיקט: אדמין רואה הכל, לקוח רק את הטיקטים של הלקוח שלו.
 * מחזיר את הטיקט והמשתמש.
 */
export async function requireTicketAccess(
  ctx: QueryCtx,
  ticketId: Id<"tickets">,
): Promise<{ user: AppUser; ticket: Doc<"tickets"> }> {
  const user = await requireUser(ctx);
  const ticket = await ctx.db.get(ticketId);
  if (!ticket) throw new Error("הטיקט לא נמצא");
  if (user.role !== "admin" && ticket.customerId !== user.customerId) {
    throw new Error("אין הרשאה לטיקט זה");
  }
  return { user, ticket };
}

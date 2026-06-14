import { v } from "convex/values";
import {
  internalAction,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/authz";
import { userRole } from "./schema";

/** יוצר הזמנה למשתמש חדש (אדמין בלבד) ושולח מייל אם מוגדר Resend. */
export const create = mutation({
  args: {
    email: v.string(),
    customerId: v.id("customers"),
    role: v.optional(userRole),
  },
  handler: async (ctx, { email, customerId, role }) => {
    const admin = await requireAdmin(ctx);
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) throw new Error("כתובת מייל לא תקינה");

    const customer = await ctx.db.get(customerId);
    if (!customer) throw new Error("הלקוח לא נמצא");

    // אם כבר קיים משתמש עם המייל — לקשר אותו ישירות במקום הזמנה.
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .first();
    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        customerId,
        role: role ?? "client",
      });
      return { linkedExisting: true };
    }

    // ביטול הזמנות ממתינות קודמות לאותו מייל.
    const prev = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    for (const p of prev) await ctx.db.patch(p._id, { status: "revoked" });

    await ctx.db.insert("invites", {
      email: normalized,
      customerId,
      role: role ?? "client",
      status: "pending",
      invitedBy: admin._id,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.invites.sendInviteEmail, {
      email: normalized,
      customerName: customer.name,
    });

    return { linkedExisting: false };
  },
});

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("invites")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .order("desc")
      .collect();
  },
});

export const revoke = mutation({
  args: { id: v.id("invites") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status: "revoked" });
  },
});

/** שולף את כתובת האתר עבור פעולת המייל. */
export const getSiteUrl = internalQuery({
  args: {},
  handler: async () => process.env.SITE_URL ?? "http://localhost:3000",
});

/**
 * שולח מייל הזמנה דרך Resend אם מוגדר AUTH_RESEND_KEY.
 * אם אין מפתח — מדלג בשקט (ההזמנה עדיין נשמרה והקישור האוטומטי יעבוד).
 */
export const sendInviteEmail = internalAction({
  args: { email: v.string(), customerName: v.string() },
  handler: async (ctx, { email, customerName }) => {
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) {
      console.log(`[invite] אין AUTH_RESEND_KEY — דילגתי על שליחת מייל ל-${email}`);
      return;
    }
    const siteUrl: string = await ctx.runQuery(internal.invites.getSiteUrl, {});
    const from = process.env.AUTH_EMAIL ?? "על זה <onboarding@resend.dev>";
    const loginUrl = `${siteUrl}/login?email=${encodeURIComponent(email)}`;

    const html = `
      <div dir="rtl" style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1e293b">
        <h2 style="color:#0d9488">הוזמנת ל״על זה״ ✅</h2>
        <p>שלום,</p>
        <p>הוזמנת להצטרף למערכת הטיקטים <b>״על זה״</b> של <b>${customerName}</b>.</p>
        <p>מהרגע שתפתח פנייה — אני על זה. כדי להתחבר, היכנס לקישור והזדהה עם המייל הזה (סיסמה או קישור קסם):</p>
        <p style="margin:24px 0">
          <a href="${loginUrl}" style="background:#0d9488;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600">כניסה למערכת</a>
        </p>
        <p style="color:#64748b;font-size:13px">אם לא ציפית להזמנה זו, אפשר להתעלם מהמייל.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `הוזמנת ל״על זה״ — מערכת התמיכה של ${customerName}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[invite] שליחת מייל נכשלה: ${res.status} ${await res.text()}`);
    }
  },
});

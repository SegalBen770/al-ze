import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { createAccount } from "@convex-dev/auth/server";
import { requireAdmin } from "./lib/authz";
import { userRole } from "./schema";

/** יוצר הזמנה: מקים חשבון עם סיסמה חזקה ושולח אותה במייל (אדמין בלבד). */
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

    // אם כבר קיים משתמש עם המייל — רק לשייך אותו ללקוח (בלי סיסמה חדשה).
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

    await ctx.scheduler.runAfter(0, internal.invites.provisionUser, {
      email: normalized,
      customerId,
      role: role ?? "client",
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

/** מקים חשבון Password עם סיסמה אקראית, משייך ללקוח, ושולח את הסיסמה במייל. */
export const provisionUser = internalAction({
  args: {
    email: v.string(),
    customerId: v.id("customers"),
    role: userRole,
    customerName: v.string(),
  },
  handler: async (ctx, { email, customerId, role, customerName }) => {
    const password = generatePassword();
    try {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
        profile: { email },
        shouldLinkViaEmail: true,
      });
    } catch (e) {
      console.error("[provision] יצירת החשבון נכשלה:", e);
      return; // לא נשלח סיסמה שלא תעבוד
    }
    await ctx.runMutation(internal.invites.linkUser, { email, customerId, role });
    await sendCredentialsEmail(email, password, customerName);
  },
});

/** משייך משתמש ללקוח עם תפקיד, ומסמן את ההזמנה כמקובלת. */
export const linkUser = internalMutation({
  args: {
    email: v.string(),
    customerId: v.id("customers"),
    role: userRole,
  },
  handler: async (ctx, { email, customerId, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (user) await ctx.db.patch(user._id, { customerId, role });

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (invite) {
      await ctx.db.patch(invite._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
    }
  },
});

/* ------------------------------- עזרים ------------------------------- */

function generatePassword(length = 14): string {
  // ללא תווים מבלבלים (0/O, 1/l) לקריאוּת.
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function sendCredentialsEmail(
  email: string,
  password: string,
  customerName: string,
): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) {
    console.log(`[provision] אין AUTH_RESEND_KEY — לא נשלחה סיסמה ל-${email}`);
    return;
  }
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const from = process.env.AUTH_EMAIL ?? "על זה <onboarding@resend.dev>";
  const loginUrl = `${siteUrl}/login?email=${encodeURIComponent(email)}`;

  const html = `
    <div dir="rtl" style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1e293b">
      <h2 style="color:#0d9488;margin:0 0 12px">ברוך הבא ל״על זה״ ✅</h2>
      <p>נפתח עבורך חשבון במערכת התמיכה של <b>${customerName}</b>. אלה פרטי הכניסה שלך:</p>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:16px;margin:16px 0;font-size:15px">
        <div style="margin-bottom:8px">אימייל: <b dir="ltr" style="display:inline-block">${email}</b></div>
        <div>סיסמה: <b dir="ltr" style="display:inline-block;font-family:monospace;font-size:16px;letter-spacing:1px">${password}</b></div>
      </div>
      <p style="margin:24px 0">
        <a href="${loginUrl}" style="background:#0d9488;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">כניסה למערכת</a>
      </p>
      <p style="color:#94a3b8;font-size:12px">מומלץ לשמור את הסיסמה במקום בטוח. ברגע שתתחבר, המערכת תזכור אותך לאורך זמן.</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: email,
      subject: `פרטי הכניסה שלך ל״על זה״ — ${customerName}`,
      html,
    }),
  });
  if (!res.ok) {
    console.error(`[provision] שליחת המייל נכשלה: ${res.status} ${await res.text()}`);
  }
}

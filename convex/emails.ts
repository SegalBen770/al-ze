import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const DEFAULT_ADMIN_EMAIL = "bensegal2@gmail.com";

const notifyKind = v.union(
  v.literal("new_ticket"),
  v.literal("new_comment"),
  v.literal("status"),
  v.literal("eta"),
);

function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function buildContent(
  kind: string,
  ticketTitle: string,
  actorName: string,
  body?: string,
): { subject: string; line: string } {
  switch (kind) {
    case "new_ticket":
      return {
        subject: `🎟️ טיקט חדש: ${ticketTitle}`,
        line: `${actorName} פתח טיקט חדש וממתין לטיפול.`,
      };
    case "new_comment":
      return {
        subject: `💬 תגובה חדשה: ${ticketTitle}`,
        line: `${actorName} הוסיף/ה תגובה בטיקט.`,
      };
    case "status":
      return {
        subject: `🔄 עדכון סטטוס: ${ticketTitle}`,
        line: `הסטטוס של הטיקט עודכן ל״${body}״.`,
      };
    case "eta":
      return {
        subject: `📅 עודכן צפי לסיום: ${ticketTitle}`,
        line: body ?? "הצפי לסיום עודכן.",
      };
    default:
      return { subject: ticketTitle, line: "" };
  }
}

function emailHtml(line: string, link: string, snippet?: string): string {
  return `<div dir="rtl" style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1e293b">
    <h2 style="color:#0d9488;margin:0 0 12px">על זה ✅</h2>
    <p style="font-size:15px;line-height:1.6">${line}</p>
    ${
      snippet
        ? `<blockquote style="border-right:3px solid #14b8a6;margin:16px 0;padding:10px 14px;background:#f0fdfa;border-radius:10px;color:#334155;white-space:pre-wrap">${snippet}</blockquote>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${link}" style="background:#0d9488;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">צפייה בטיקט</a>
    </p>
    <p style="color:#94a3b8;font-size:12px">מערכת התמיכה ״על זה״ · <a href="${link}" style="color:#0d9488">${link}</a></p>
  </div>`;
}

/**
 * שולח התראת מייל על אירוע בטיקט דרך Resend.
 * אם אין AUTH_RESEND_KEY או אין נמען — מדלג בשקט.
 * toAdmin=true → נשלח לכתובת המנהל (ADMIN_EMAIL).
 */
export const notify = internalAction({
  args: {
    to: v.optional(v.string()),
    toAdmin: v.optional(v.boolean()),
    kind: notifyKind,
    ticketId: v.id("tickets"),
    ticketTitle: v.string(),
    actorName: v.string(),
    body: v.optional(v.string()),
    snippet: v.optional(v.string()),
  },
  handler: async (_ctx, a) => {
    const key = process.env.AUTH_RESEND_KEY;
    const to = a.toAdmin
      ? process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
      : a.to;

    if (!key) {
      console.log(`[email] אין AUTH_RESEND_KEY — דילגתי על ${a.kind}`);
      return;
    }
    if (!to) {
      console.log(`[email] אין נמען עבור ${a.kind}`);
      return;
    }

    const { subject, line } = buildContent(
      a.kind,
      a.ticketTitle,
      a.actorName,
      a.body,
    );
    const link = `${siteUrl()}/tickets/${a.ticketId}`;
    const html = emailHtml(line, link, a.snippet);
    const from = process.env.AUTH_EMAIL ?? "על זה <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[email] שליחה נכשלה ${res.status}: ${await res.text()}`);
    }
  },
});

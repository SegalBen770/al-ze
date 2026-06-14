import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Resend from "@auth/core/providers/resend";
import { MutationCtx } from "./_generated/server";

// המייל שמקבל הרשאת אדמין אוטומטית (ניתן לעקוף עם משתנה סביבה ADMIN_EMAIL).
const DEFAULT_ADMIN_EMAIL = "bensegal2@gmail.com";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // מייל + סיסמה.
    Password,
    // Magic Link דרך Resend (דורש AUTH_RESEND_KEY ב-deployment).
    Resend({
      from: process.env.AUTH_EMAIL ?? "על זה <onboarding@resend.dev>",
    }),
  ],
  callbacks: {
    // אחרי יצירת/עדכון משתמש: קביעת תפקיד אדמין, או קישור להזמנה ממתינה.
    async afterUserCreatedOrUpdated(rawCtx, { userId }) {
      // ה-ctx של ה-callback מיודע לפי DataModel גנרי — נצמיד לסכמה שלנו.
      const ctx = rawCtx as unknown as MutationCtx;
      const user = await ctx.db.get(userId);
      if (!user) return;

      const adminEmail = (
        process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
      ).toLowerCase();
      const email = user.email?.toLowerCase();
      const patch: Record<string, unknown> = {};

      if (email && email === adminEmail) {
        if (user.role !== "admin") patch.role = "admin";
      } else if (!user.role && email) {
        // קישור אוטומטי להזמנה ממתינה לפי המייל.
        const invite = await ctx.db
          .query("invites")
          .withIndex("by_email", (q) => q.eq("email", email))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();
        if (invite) {
          patch.role = invite.role;
          patch.customerId = invite.customerId;
          await ctx.db.patch(invite._id, {
            status: "accepted",
            acceptedAt: Date.now(),
          });
        }
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(userId, patch);
      }
    },
  },
});

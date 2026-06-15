import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { MutationCtx } from "./_generated/server";

// המייל שמקבל הרשאת אדמין אוטומטית (ניתן לעקוף עם משתנה סביבה ADMIN_EMAIL).
const DEFAULT_ADMIN_EMAIL = "bensegal2@gmail.com";

const SIXTY_DAYS = 1000 * 60 * 60 * 24 * 60;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // רק מייל + סיסמה (ללא קישור קסם, ללא הרשמה עצמית).
  providers: [Password],
  // התחברות נזכרת לאורך זמן — אין צורך להתחבר כל כמה ימים.
  session: {
    totalDurationMs: SIXTY_DAYS,
    inactiveDurationMs: SIXTY_DAYS,
  },
  callbacks: {
    // קביעת תפקיד אדמין אוטומטית למייל המנהל.
    async afterUserCreatedOrUpdated(rawCtx, { userId }) {
      const ctx = rawCtx as unknown as MutationCtx;
      const user = await ctx.db.get(userId);
      if (!user) return;

      const adminEmail = (
        process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
      ).toLowerCase();
      const email = user.email?.toLowerCase();

      if (email && email === adminEmail && user.role !== "admin") {
        await ctx.db.patch(userId, { role: "admin" });
      }
    },
  },
});

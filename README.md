# על זה ✅ — מערכת טיקטים ללקוחות
12
**המסר:** פותח פנייה, ואני כבר *על זה*. מערכת טיקטים נינוחה שמשאירה את הלקוח רגוע.

אתה (אדמין) מנהל לקוחות ומשתמשים, הלקוחות פותחים וצופים בטיקטים
ב-Kanban וברשימה, עם טיים-ליין, תמונות, צפי, ומדדי זמן אוטומטיים.

**טכנולוגיות:** Next.js 15 (App Router) · Convex · Convex Auth · Tailwind · Bun · Vercel.

---

## הפעלה ראשונית (פעם אחת)

הכול רץ עם **Bun**. מהתיקייה של הפרויקט:

```bash
# 1. התקנת תלויות (כבר בוצע)
bun install

# 2. חיבור ל-Convex — פותח דפדפן להתחברות ויוצר פרויקט.
#    זה גם ימלא אוטומטית את NEXT_PUBLIC_CONVEX_URL ב-.env.local
bunx convex dev
```

השאר את `convex dev` רץ. בטרמינל **נפרד**, הגדר את מפתחות ההזדהות (פעם אחת):

```bash
# 3. הגדרת Convex Auth — יוצר מפתחות JWT ומגדיר SITE_URL ב-deployment
bunx @convex-dev/auth
```

### משתני סביבה ב-Convex deployment

הגדר דרך `bunx convex env set <KEY> <VALUE>` (או בלוח הבקרה של Convex):

| משתנה | חובה? | למה |
|---|---|---|
| `ADMIN_EMAIL` | מומלץ | המייל שיקבל הרשאת אדמין אוטומטית. ברירת מחדל: `bensegal2@gmail.com` |
| `SITE_URL` | כן (נקבע ע"י סקריפט ה-Auth) | כתובת האתר, לבניית קישורים |
| `AUTH_RESEND_KEY` | רק ל-Magic Link / מיילים | מפתח API מ-[Resend](https://resend.com) |
| `AUTH_EMAIL` | לא | כתובת שולח, למשל `"תמיכה <support@yourdomain.com>"` |

> **בלי `AUTH_RESEND_KEY`** — כניסה עם **סיסמה** עובדת מצוין; Magic Link והזמנות במייל פשוט לא יישלחו
> (ההזמנה עדיין נשמרת, והמשתמש משויך אוטומטית בכניסה הראשונה עם אותו מייל).

---

## הרצה יומיומית

```bash
bun run dev:all      # מריץ במקביל את Next ואת Convex
# או בשני טרמינלים:
bun run dev          # Next.js  → http://localhost:3000
bunx convex dev      # Convex
```

הכניסה הראשונה עם `ADMIN_EMAIL` תקבל אוטומטית הרשאת **מנהל**, ותזרע סטטוסים/סיווגים/דחיפויות ברירת מחדל.

---

## זרימת עבודה

1. **אדמין** נכנס → לשונית **ניהול** → יוצר לקוח → מזמין משתמשים במייל.
2. **לקוח** מקבל הזמנה, נכנס (סיסמה או Magic Link) ומשויך אוטומטית.
3. הלקוח פותח טיקט (כותרת, פירוט, סיווג, דחיפות, תמונות).
4. האדמין מטפל: גורר בין עמודות ה-Kanban, מעדכן סטטוס וצפי, מגיב.
5. הזמנים נמדדים אוטומטית — "בטיפול כבר X" ו-"הטיפול לקח Y".

---

## פריסה ל-Vercel

1. דחוף את הקוד ל-Git ויבא ל-Vercel.
2. הרץ `bunx convex deploy` (או חבר את ה-deploy ל-Convex production), והגדר ב-Vercel:
   `NEXT_PUBLIC_CONVEX_URL` של ה-production deployment.
3. עדכן `SITE_URL` ב-Convex production לכתובת ה-Vercel, והוסף אותה גם ל-Resend (דומיין מאומת).

---

## אנימציות (LottieFiles)

יש כבר אנימציות SVG מרגיעות מובנות (`CalmCheck`, `BreathingOrb`). כדי להוסיף קובץ Lottie משלך:

```tsx
import calm from "@/public/animations/calm.json";
import { Lottie } from "@/components/animations/Lottie";

<Lottie animationData={calm} loop className="w-40" />
```

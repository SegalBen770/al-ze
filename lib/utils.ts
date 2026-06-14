import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HE_DATE = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const HE_TIME = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
});

/** תאריך מלא בעברית, למשל "14.06.2026". */
export function formatDate(ts: number): string {
  return HE_DATE.format(new Date(ts));
}

/** תאריך + שעה, למשל "14.06.2026, 13:45". */
export function formatDateTime(ts: number): string {
  return `${HE_DATE.format(new Date(ts))}, ${HE_TIME.format(new Date(ts))}`;
}

/** "לפני 5 דקות" / "לפני שעתיים" / "לפני 3 ימים". */
export function timeAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ממש עכשיו";
  if (min < 60) return `לפני ${min} ${min === 1 ? "דקה" : "דקות"}`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `לפני ${hours === 2 ? "שעתיים" : `${hours} שעות`}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `לפני ${days === 1 ? "יום" : days === 2 ? "יומיים" : `${days} ימים`}`;
  const months = Math.floor(days / 30);
  return `לפני ${months === 1 ? "חודש" : months === 2 ? "חודשיים" : `${months} חודשים`}`;
}

/** משך זמן קריא: "3 ימים 4 שעות" / "מעל שעה" וכו'. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "פחות מדקה";
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "יום" : "ימים"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "שעה" : "שעות"}`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "דקה" : "דקות"}`);
  return parts.slice(0, 2).join(" ו") || "פחות מדקה";
}

/** האם צבע רקע כהה (לבחירת צבע טקסט מנוגד). */
export function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.6;
}

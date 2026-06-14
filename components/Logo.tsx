import { cn } from "@/lib/utils";

/**
 * סמל המותג "על זה" — וי בטוח בריבוע גרדיאנט, עם נקודה חיה (ירוקה)
 * שמשדרת "פעיל, על זה ממש עכשיו".
 */
export function LogoMark({
  size = 36,
  className,
  live = true,
}: {
  size?: number;
  className?: string;
  live?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-xl shadow-sm",
        className,
      )}
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, hsl(175 60% 42%), hsl(192 72% 50%))",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.6}
        height={size * 0.6}
        fill="none"
      >
        <path
          d="M5 13 L10 18 L19 6.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {live && (
        <span className="absolute -top-0.5 -end-0.5 grid place-items-center">
          <span className="absolute size-2.5 animate-ping rounded-full bg-emerald-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
        </span>
      )}
    </span>
  );
}

/** הלוגו המלא: סמל + שם המערכת "על זה". */
export function Logo({
  className,
  showText = true,
  size = 36,
  live = true,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
  live?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} live={live} />
      {showText && (
        <span className="text-lg font-extrabold tracking-tight">על זה</span>
      )}
    </span>
  );
}

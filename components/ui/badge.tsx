import * as React from "react";
import { cn, isDarkColor } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  dot?: boolean;
}

/** תג צבעוני רך. אם מועבר color (hex) — נצבע אותו עם רקע עדין. */
export function Badge({ className, color, dot, children, style, ...props }: BadgeProps) {
  const colorStyle: React.CSSProperties = color
    ? {
        backgroundColor: `${color}1a`,
        color: isDarkColor(color) ? color : color,
        borderColor: `${color}40`,
        ...style,
      }
    : style ?? {};
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        !color && "border-border bg-secondary text-secondary-foreground",
        className,
      )}
      style={colorStyle}
      {...props}
    >
      {dot && color && (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </span>
  );
}

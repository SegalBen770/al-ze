"use client";

import { motion } from "framer-motion";

/**
 * כדור נושם רגוע — לשימוש במצבים ריקים, טעינה, ורגעי המתנה.
 * תחושת שקט ו"אני על זה".
 */
export function BreathingOrb({ size = 120 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative grid place-items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: size * (0.5 + i * 0.22),
            height: size * (0.5 + i * 0.22),
            background:
              "radial-gradient(circle at 50% 40%, hsl(178 60% 60% / 0.25), hsl(200 70% 70% / 0.05))",
          }}
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.6, 0.95, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
      <motion.span
        className="relative rounded-full"
        style={{
          width: size * 0.32,
          height: size * 0.32,
          background: "linear-gradient(135deg, hsl(178 52% 48%), hsl(190 60% 55%))",
          boxShadow: "0 8px 24px hsl(178 52% 42% / 0.35)",
        }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

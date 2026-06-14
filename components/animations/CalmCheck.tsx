"use client";

import { motion } from "framer-motion";

/**
 * אנימציית "התקבל ובטיפול" — וי מרגיע עם טבעות נשימה.
 * משדר ביטחון ורוגע ברגע שטיקט נפתח.
 */
export function CalmCheck({ size = 96 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
        {/* טבעות נשימה */}
        {[0, 1].map((i) => (
          <motion.circle
            key={i}
            cx="60"
            cy="60"
            r="44"
            stroke="hsl(178 52% 42%)"
            strokeWidth="2"
            initial={{ scale: 0.7, opacity: 0.5 }}
            animate={{ scale: [0.7, 1.15], opacity: [0.5, 0] }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              delay: i * 1.3,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "center" }}
          />
        ))}
        {/* עיגול מלא */}
        <motion.circle
          cx="60"
          cy="60"
          r="38"
          fill="hsl(168 45% 92%)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          style={{ transformOrigin: "center" }}
        />
        {/* הווי */}
        <motion.path
          d="M44 61 L55 72 L78 49"
          stroke="hsl(178 52% 38%)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// טעינה דינמית (ללא SSR) כדי למנוע בעיות hydration.
const LottiePlayer = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * עטיפה ל-LottieFiles. השמט/החלף בקבצי JSON משלך תחת public/animations.
 * דוגמה:
 *   import calm from "@/public/animations/calm.json";
 *   <Lottie animationData={calm} loop className="w-40" />
 */
export function Lottie(props: ComponentProps<typeof LottiePlayer>) {
  return <LottiePlayer {...props} />;
}

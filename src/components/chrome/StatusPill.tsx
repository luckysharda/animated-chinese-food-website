"use client";

import { motion } from "motion/react";
import { site } from "@/data/content";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * StatusPill — instrument frame, hard against the 12px left inset, one
 * nav-height below the top. Crimson is spent here and nowhere else in the
 * chrome; it is the only pulsing thing on the page.
 */
export default function StatusPill(): React.ReactElement {
  const reduced = useReducedMotion();

  return (
    <div className="pointer-events-none fixed left-3 top-[68px] z-40">
      <div className="flex items-center gap-2.5 rounded-[4px] border border-line-100 bg-ink-900/55 px-2.5 py-[5px] backdrop-blur-sm">
        <span className="relative flex h-[7px] w-[7px] shrink-0 items-center justify-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-crimson"
            style={{ boxShadow: "0 0 8px 0 rgb(224 27 36 / 0.85)" }}
            animate={reduced ? undefined : { opacity: [1, 0.28, 1], scale: [1, 0.78, 1] }}
            transition={
              reduced
                ? undefined
                : { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </span>

        <span className="micro-xs font-jp! text-text-mid!">{site.openLabel}</span>

        <span aria-hidden className="h-2.5 w-px bg-line-100" />

        <span className="micro-xs tabular-nums text-text-low!">{site.hours}</span>
      </div>
    </div>
  );
}

"use client";

/**
 * Reveal — the staggered enter. opacity 0→1, y 28→0, expo out, once.
 *
 * This is REACT-STATE motion (an in-view trigger), so it belongs to motion, not
 * to GSAP. Never put a Reveal inside a scrubbed timeline — a scrub owns the DOM
 * directly and the two will fight.
 *
 * Reduced motion ships in this file: the children render as the END STATE with
 * no animation at all.
 */

import { createElement } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** The house ease. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** The house slow duration, in seconds. */
const DURATION = 0.9;

/**
 * `delay` is in SECONDS (motion's unit), so a 70–90ms stagger is 0.07–0.09.
 * A value above 5 is read as milliseconds, so `delay={80}` still behaves —
 * ten agents write these call sites and a 70-second delay is not a fair trap.
 */
function toSeconds(delay: number): number {
  return delay > 5 ? delay / 1000 : delay;
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}): React.ReactElement {
  const reduced = useReducedMotion();

  if (reduced) {
    // createElement rather than <Tag/>: JSX resolves the props of an ElementType
    // union to the INTERSECTION of every intrinsic element's props, which lands on
    // `never` for className/children. createElement types the union correctly.
    return createElement(as, { className }, children);
  }

  // Type-only cast: the proxy still resolves the real tag name at runtime.
  const MotionTag = motion[as as "div"];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: DURATION, delay: toSeconds(delay), ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;

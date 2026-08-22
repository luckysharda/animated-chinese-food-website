"use client";

import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { retainRefreshDiscipline } from "@/hooks/useScrollScrub";

export interface CountUpOptions {
  /** Seconds. Default 1.6. */
  duration?: number;
  /** Decimal places. Default 0 — integers snap, so no flicker of "3.7194". */
  decimals?: number;
  /** Appended to every frame, e.g. "H", "°C", "%". */
  suffix?: string;
  /** Prepended to every frame, e.g. "€". */
  prefix?: string;
  /** Where the count starts. Default 0. */
  from?: number;
  /** Fires when the element's top crosses this line. Default "top 70%". */
  start?: string;
}

/**
 * A count-up that is a TRIGGER, not a scrub.
 *
 * It fires once when the element crosses 70% of the viewport and never runs again —
 * scrolling back up does not rewind it, because a number that yo-yos with the wheel
 * reads as a toy rather than an instrument.
 *
 * Writes via textContent, never React state: this ticks at 60fps.
 *
 * Render the FINAL value in your JSX (so the page still states the fact if JS never
 * runs); the hook overwrites it with the start value on mount. And because a numeral
 * mutating 60x/second is announced as garbage, mark the animating span aria-hidden
 * and put the final value in an adjacent sr-only span:
 *
 *     const { ref } = useCountUp(60, { suffix: "H" });
 *     <span ref={ref} aria-hidden className="numeric">60H</span>
 *     <span className="sr-only">60 hours</span>
 *
 * Use the .numeric utility (or tabular-nums) on the span — Anton's proportional
 * digits change width every frame and will shove the layout around otherwise.
 */
export function useCountUp(
  target: number,
  opts?: CountUpOptions,
): { ref: RefObject<HTMLSpanElement | null> } {
  const duration = opts?.duration ?? 1.6;
  const decimals = opts?.decimals ?? 0;
  const suffix = opts?.suffix ?? "";
  const prefix = opts?.prefix ?? "";
  const from = opts?.from ?? 0;
  const start = opts?.start ?? "top 70%";

  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const format = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;

      const reduce =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        el.textContent = format(target);
        return;
      }

      const state = { v: from };
      // Overwrite the server-rendered final value before the element can be seen.
      el.textContent = format(from);

      gsap.to(state, {
        v: target,
        duration,
        ease: "expo.out",
        // Integers snap so the readout never shows a fractional frame.
        ...(decimals === 0 ? { snap: { v: 1 } } : null),
        onUpdate: () => {
          el.textContent = format(state.v);
        },
        onComplete: () => {
          // Land exactly on the target regardless of float drift.
          el.textContent = format(target);
        },
        scrollTrigger: {
          trigger: el,
          start,
          // once:true kills the trigger after the first entry — no reverse on scroll up.
          once: true,
        },
      });

      const release = retainRefreshDiscipline();
      return () => {
        release();
      };
    },
    {
      dependencies: [target, duration, decimals, suffix, prefix, from, start],
      scope: ref,
      revertOnUpdate: true,
    },
  );

  return { ref };
}

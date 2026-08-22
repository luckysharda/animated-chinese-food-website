"use client";

/**
 * HeroRuler — the measure across the bottom of the stage, gutter to gutter.
 *
 * Three parts, and the difference between them is the whole point:
 *
 *   · The TICK SCALE is static. A minor tick every 7px, a tall one every fifth,
 *     drawn as two repeating gradients so there is no per-frame work and no
 *     hundred-node DOM. It never moves, never scrolls, never animates. It is the
 *     rule the fill is measured against.
 *   · The FILL is the only live part. It grows from the far left, LINEARLY —
 *     no easing on the mapping, because an eased ruler is a lie about position —
 *     and ends in a 6px rounded cap carrying an amber bloom.
 *   · The DATUM KNOB is a white circle at exactly 50%. It is a mark on the rule,
 *     not a playhead: it is never bound to progress, and the fill passes through
 *     and beyond it. Every scrubber on the internet moves the knob; this one is
 *     nailed down, and that is what makes the fill read as a measurement.
 *
 * Progress arrives as two custom properties written once per frame — --p (0..1)
 * and --w (the measured track width) — so the fill is a scaleX and the cap is a
 * translate. Neither touches layout, and neither touches React.
 */

import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { HeroTick } from "./Hero";

export interface HeroRulerHandle {
  update(t: HeroTick): void;
}

/** Static scale: 1px ticks every 7px, a taller one every 5th (35px). */
const TICKS: React.CSSProperties = {
  backgroundImage: [
    "repeating-linear-gradient(90deg, rgb(107 120 135 / 0.8) 0 1px, transparent 1px 35px)",
    "repeating-linear-gradient(90deg, rgb(107 120 135 / 0.34) 0 1px, transparent 1px 7px)",
  ].join(","),
  backgroundSize: "100% 11px, 100% 5px",
  backgroundPosition: "left bottom, left bottom",
  backgroundRepeat: "no-repeat, no-repeat",
};

const INITIAL = { "--p": "0", "--w": "0px" } as React.CSSProperties;

export default function HeroRuler({
  ref,
}: {
  ref?: React.Ref<HeroRulerHandle>;
}): React.ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastRef = useRef(-1);

  const update = useCallback((t: HeroTick) => {
    const el = rootRef.current;
    if (!el) return;
    const p = t.p < 0 ? 0 : t.p > 1 ? 1 : t.p;
    if (Math.abs(p - lastRef.current) < 0.0004) return;
    lastRef.current = p;
    el.style.setProperty("--p", p.toFixed(5));
  }, []);

  useImperativeHandle(ref, () => ({ update }), [update]);

  // The cap translates by --p * --w, so the width is measured rather than
  // recomputed per frame. Percentage translation would resolve against the cap
  // itself, and a per-frame `left` would put layout in the scroll path.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => el.style.setProperty("--w", `${el.clientWidth}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute bottom-[26px] left-3 right-[4.8vw] z-20 h-[18px]"
      style={INITIAL}
    >
      {/* baseline */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-line-100" />

      {/* the static scale */}
      <div className="absolute inset-x-0 bottom-px h-3" style={TICKS} />

      {/* the fill — clipped, so it can only ever grow from the far left */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
        <div
          className="h-full w-full origin-left bg-amber-400 will-change-transform"
          style={{
            transform: "scaleX(var(--p))",
            boxShadow: "0 0 14px rgb(255 197 61 / 0.5)",
          }}
        />
      </div>

      {/* the datum knob — fixed at 50%, never bound to progress */}
      <div className="absolute bottom-[-4px] left-1/2 h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-text-hi ring-[3px] ring-ink-900" />

      {/* the live cap */}
      <div
        className="absolute bottom-[-1.5px] left-0 h-[6px] w-[6px] rounded-full bg-amber-400 will-change-transform"
        style={{
          transform: "translate3d(calc(var(--p) * var(--w) - 3px), 0, 0)",
          boxShadow: "0 0 18px 3px rgb(255 197 61 / 0.55), 0 0 40px 8px rgb(255 107 24 / 0.28)",
        }}
      />
    </div>
  );
}

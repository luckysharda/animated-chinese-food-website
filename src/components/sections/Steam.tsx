"use client";

/**
 * // 03 湯気の世界 — THE STEAM.
 *
 * Two rows, no pin, no scrub.
 *
 *   TOP     a three-column spec table hard against the left of the content frame,
 *           and the simmer loop mounted in a right-hand bracket frame with a
 *           live badge sitting on its bottom edge. The header hugs top-left, the
 *           document stamp hugs top-right; the middle is left to the photography.
 *   BOTTOM  four measurements in one band, divided by 1px vertical hairlines
 *           (2x2 under 768px). The numerals COUNT UP — a trigger at 70% of the
 *           viewport, once, never reversing on the way back up.
 *
 * Reduced motion ships here, in this file: useCountUp lands on the final value
 * immediately, the badge stops pulsing, and Reveal renders its end state.
 */

import { motion } from "motion/react";

import { assets } from "@/data/assets";
import { site, steam } from "@/data/content";
import { BracketFrame } from "@/components/ui/BracketFrame";
import { LazyVideo } from "@/components/ui/LazyVideo";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useCountUp } from "@/hooks/useCountUp";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** "180 L" → { numeral: "180", unit: "L" }. The unit belongs in .numeric-unit. */
function splitValue(value: string): { numeral: string; unit?: string } {
  const i = value.indexOf(" ");
  if (i === -1) return { numeral: value };
  return { numeral: value.slice(0, i), unit: value.slice(i + 1) };
}

/**
 * The band's hairlines, per cell. 2 columns under 768px, 4 above it:
 * a left rule on every cell that is not first in its row, and a top rule on the
 * second mobile row only — which stops existing once the band is one row wide.
 */
const CELL_RULES = [
  "",
  "border-l border-line-100",
  "border-t border-line-100 md:border-t-0 md:border-l",
  "border-l border-t border-line-100 md:border-t-0",
] as const;

export default function Steam(): React.ReactElement {
  const reduced = useReducedMotion();
  const video = assets.video.simmer01;

  return (
    <section
      id="steam"
      className="relative isolate overflow-hidden bg-ink-800 py-[clamp(80px,12vh,160px)]"
    >
      {/* INSTRUMENT FRAME — ignores the container: 12px left, 4.8vw right. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 right-[4.8vw] top-0 block h-px bg-line-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 select-none xl:block"
      >
        <span className="micro-xs block rotate-180 text-text-dim! [writing-mode:vertical-rl]">
          {steam.latin}
        </span>
      </span>

      <div className="frame-content">
        {/* ── header: title top-left, stamp top-right ── */}
        <div className="flex items-start justify-between gap-8">
          <Reveal>
            <SectionHeader
              no={steam.no}
              jp={steam.jp}
              latin={steam.latin}
              kicker={steam.kicker}
            />
          </Reveal>

          <div className="hidden shrink-0 flex-col items-end gap-2 pt-1 sm:flex">
            <span aria-hidden className="block h-px w-16 bg-line-100" />
            <Micro xs className="font-jp! text-text-dim!">
              {site.name}
            </Micro>
          </div>
        </div>

        {/* ── top row: spec table left, loop right ── */}
        <div className="mt-12 grid gap-x-10 gap-y-12 lg:mt-16 lg:grid-cols-12 lg:items-start">
          <Reveal className="lg:col-span-5" delay={0.07}>
            <dl className="grid grid-cols-1 border-y border-line-100 sm:grid-cols-3">
              {steam.spec.map((row, i) => {
                const { numeral, unit } = splitValue(row.value);
                return (
                  <div
                    key={row.label}
                    className={cx(
                      "flex flex-col gap-3 py-5 pr-4 sm:py-6",
                      i > 0 &&
                        "border-t border-line-100 sm:border-l sm:border-t-0 sm:pl-4 lg:pl-3",
                    )}
                  >
                    <dt>
                      <Micro className="block">{row.label}</Micro>
                    </dt>
                    <dd className="leading-none">
                      <Numeric
                        className="text-[clamp(30px,3.4vw,46px)] leading-[0.85]"
                        value={numeral}
                        unit={unit}
                      />
                    </dd>
                    <div className="mt-1 flex flex-col gap-1.5 border-t border-line-100 pt-3">
                      <Micro xs className="block">
                        {row.sub}
                      </Micro>
                      <Micro xs className="block text-text-dim!">
                        {row.sub2}
                      </Micro>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.14}>
            <BracketFrame corners="right" className="p-3 sm:p-4">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-900">
                <LazyVideo
                  src={video.src}
                  poster={video.poster}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span aria-hidden className="scrim pointer-events-none absolute inset-0 block" />

                {/* bottom-centre live badge */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-[3px] border border-line-100 bg-ink-900/70 px-3 py-[6px] backdrop-blur-sm">
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
                  <Micro xs className="text-text-mid!">
                    {steam.liveBadge}
                  </Micro>
                </div>
              </div>
            </BracketFrame>
          </Reveal>
        </div>

        {/* ── bottom row: the four measurements, one band ── */}
        <div className="mt-16 grid grid-cols-2 border-y border-line-100 md:mt-24 md:grid-cols-4">
          {steam.stats.map((stat, i) => (
            <StatCell key={stat.no} stat={stat} rule={CELL_RULES[i] ?? ""} delay={0.07 * i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * One cell of the band. The count-up lives here rather than in a map in the
 * parent so the hook is called once per component, not N times per render.
 * The JSX ships the FINAL value — the hook overwrites it with the start frame
 * on mount, so the fact still stands if JS never runs.
 */
function StatCell({
  stat,
  rule,
  delay,
}: {
  stat: (typeof steam.stats)[number];
  rule: string;
  delay: number;
}): React.ReactElement {
  const { ref } = useCountUp(stat.value, { duration: 1.6 });

  return (
    <div className={cx("px-4 py-8 md:px-6 md:py-12", rule)}>
      <Reveal delay={delay}>
        <Micro xs className="block text-text-dim!">
          {stat.no}
        </Micro>

        <div className="mt-4 flex items-baseline">
          <span aria-hidden>
            <Numeric
              className="text-[clamp(56px,6vw,96px)] leading-[0.82]"
              value={<span ref={ref}>{stat.value}</span>}
              unit={stat.unit || undefined}
            />
          </span>
          <span className="sr-only">{`${stat.value}${stat.unit} — ${stat.label}`}</span>
        </div>

        <Micro className="mt-5 block text-text-mid!">{stat.label}</Micro>

        <p className="mt-3 max-w-[34ch] text-[13px] leading-[1.7] text-text-low">{stat.body}</p>
      </Reveal>
    </div>
  );
}

"use client";

/**
 * // 02  BUILD YOUR RAMEN — the interactive one.
 *
 * Everything here is a function of REACT STATE, so every animation belongs to
 * motion, not to GSAP. The single exception is the running total: it is a number
 * that has to INTERPOLATE at 60fps, so it is animated with motion's imperative
 * `animate()` and written straight into a text node with `el.textContent`. It
 * never re-renders React while it counts. React renders that span exactly once
 * (with the mount-time value held in a ref) so it can never fight the tween.
 *
 * Layout: two columns inside the content frame, 1fr / 1.1fr, 48px gap, stacking
 * under 900px. Left is the configurator, right is a sticky preview panel.
 *
 * Reduced motion ships in this file: the crossfade, the chip pop, the row slide
 * and the count-up all collapse to their end state.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, animate, motion } from "motion/react";
import { build } from "@/data/content";
import { assets, type BowlKey, type ToppingKey } from "@/data/assets";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { TagChip } from "@/components/ui/TagChip";
import { Reveal } from "@/components/ui/Reveal";
import { BracketFrame } from "@/components/ui/BracketFrame";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ── house motion constants ───────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FAST = 0.18; // 180ms — the chip pop
const CROSS = 0.3; // 300ms — the bowl crossfade / row slide
const COUNT = 0.4; // 400ms — the total interpolation

type Topping = (typeof build.toppings)[number];
type Broth = (typeof build.broths)[number];

/** key → record, so a selection array can be replayed in the order it was made. */
const TOPPING_MAP = Object.fromEntries(
  build.toppings.map((t) => [t.key, t]),
) as Record<ToppingKey, Topping>;

const DEFAULT_BROTH: BowlKey = build.broths[0].key;
const DEFAULT_TOPPINGS: ToppingKey[] = ["chashu", "ajitama"];

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** The instrument step rule: // + label + a hairline running to the right edge. */
function StepRule({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className="slashes text-[13px] leading-none">{"//"}</span>
      <Micro className="whitespace-nowrap text-text-mid!">{label}</Micro>
      <span aria-hidden className="h-px min-w-6 flex-1 bg-line-100" />
    </div>
  );
}

export default function BuildYourRamen(): React.ReactElement {
  const reduced = useReducedMotion();

  const [broth, setBroth] = useState<BowlKey>(DEFAULT_BROTH);
  const [picked, setPicked] = useState<ToppingKey[]>(DEFAULT_TOPPINGS);

  const brothRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const current: Broth = build.broths.find((b) => b.key === broth) ?? build.broths[0];
  const chosen: Topping[] = picked.map((k) => TOPPING_MAP[k]);
  const total: number = chosen.reduce<number>((sum, t) => sum + t.price, current.base);

  /* ── the total: interpolated, never snapped, never through state ──────── */
  const totalRef = useRef<HTMLSpanElement | null>(null);
  /** Mount-time value. React renders this ONCE; the tween owns the node after. */
  const mountTotal = useRef(total).current;
  /** The live displayed value, so an interrupted tween resumes from where it is. */
  const shown = useRef(total);

  useEffect(() => {
    const el = totalRef.current;
    if (!el) return;

    if (reduced || shown.current === total) {
      shown.current = total;
      el.textContent = String(total);
      return;
    }

    const controls = animate(shown.current, total, {
      duration: COUNT,
      ease: EASE,
      onUpdate: (v: number) => {
        shown.current = v;
        el.textContent = String(Math.round(v));
      },
      onComplete: () => {
        shown.current = total;
        el.textContent = String(total);
      },
    });

    return () => controls.stop();
  }, [total, reduced]);

  /* ── selection ────────────────────────────────────────────────────────── */
  function toggleTopping(key: ToppingKey): void {
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  /** Arrow-key roving focus across the broth radiogroup. */
  function onBrothKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number): void {
    const n = build.broths.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;

    e.preventDefault();
    setBroth(build.broths[next].key);
    brothRefs.current[next]?.focus();
  }

  return (
    <section id="build" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="frame-content">
        {/* ── header: title hugs top-left, telemetry hugs top-right ───────── */}
        <div className="flex items-start justify-between gap-6 border-t border-line-100 pt-7">
          <Reveal>
            <SectionHeader
              no={build.no}
              jp={build.jp}
              latin={build.latin}
              kicker={build.kicker}
            />
          </Reveal>

          <Reveal delay={0.09} className="hidden shrink-0 pt-1 text-right sm:block">
            <Micro xs className="block">
              {current.name} / {current.jp}
            </Micro>
            <Micro xs className="mt-2 block tabular-nums">
              {String(picked.length).padStart(2, "0")} / {build.toppings.length}
            </Micro>
            <Micro xs className="mt-2 block tabular-nums">
              {current.note}
            </Micro>
          </Reveal>
        </div>

        {/* ── the configurator ────────────────────────────────────────────── */}
        <div className="mt-14 grid grid-cols-1 gap-12 min-[900px]:grid-cols-[1fr_1.1fr]">
          {/* ═══ LEFT: steps ═══ */}
          <div>
            {/* STEP 1 — broth, single-select radiogroup */}
            <Reveal>
              <StepRule label={build.step1} />
            </Reveal>

            <Reveal delay={0.07}>
              <div
                role="radiogroup"
                aria-label={build.step1}
                className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
              >
                {build.broths.map((b, i) => {
                  const on = b.key === broth;
                  return (
                    <button
                      key={b.key}
                      ref={(el) => {
                        brothRefs.current[i] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={on ? 0 : -1}
                      onClick={() => setBroth(b.key)}
                      onKeyDown={(e) => onBrothKeyDown(e, i)}
                      className={cx(
                        "group relative flex h-[190px] flex-col justify-between overflow-hidden",
                        "border p-2.5 text-left sm:h-[232px] sm:p-3.5",
                        "transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                        on
                          ? "glow-box border-amber-400 bg-ink-600"
                          : "border-line-100 bg-ink-700 hover:border-line-200",
                      )}
                    >
                      <Image
                        src={assets.bowls[b.key]}
                        alt=""
                        aria-hidden
                        fill
                        sizes="(max-width: 900px) 33vw, 20vw"
                        className={cx(
                          "pointer-events-none object-cover",
                          "transition-opacity duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                          on ? "opacity-40" : "opacity-15 group-hover:opacity-25",
                        )}
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/85 to-ink-900/35"
                      />

                      <span className="relative flex items-start justify-between">
                        <Micro xs className="tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </Micro>
                        <span
                          aria-hidden
                          className={cx(
                            "mt-px h-[6px] w-[6px] shrink-0",
                            on ? "bg-amber-400" : "bg-line-100",
                          )}
                        />
                      </span>

                      <span className="relative block">
                        <span className="block font-jp text-[clamp(1.35rem,2.6vw,1.75rem)] font-black leading-none text-text-hi">
                          {b.jp}
                        </span>
                        <span
                          className={cx(
                            "mt-2.5 block font-mono text-[10px] leading-tight tracking-[0.16em] uppercase",
                            on ? "text-text-hi" : "text-text-mid",
                          )}
                        >
                          {b.name}
                        </span>
                        <span className="mt-1.5 flex items-baseline justify-between gap-1">
                          <Micro xs className="truncate">
                            {b.note}
                          </Micro>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-mid">
                            €{b.base}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Reveal>

            {/* STEP 2 — toppings, multi-select */}
            <Reveal delay={0.07} className="mt-12 block">
              <StepRule label={build.step2} />
            </Reveal>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
              {build.toppings.map((t, i) => {
                const on = picked.includes(t.key);
                return (
                  <Reveal key={t.key} delay={Math.min(i * 0.07, 0.42)}>
                    <motion.button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTopping(t.key)}
                      animate={reduced ? undefined : { scale: on ? 1.02 : 1 }}
                      transition={{ duration: FAST, ease: EASE }}
                      className={cx(
                        "relative flex h-16 w-full items-center gap-3 overflow-hidden border px-2.5 text-left",
                        "transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                        on
                          ? "glow-box border-amber-400 bg-ink-600"
                          : "border-line-100 bg-ink-600 hover:border-line-200",
                      )}
                    >
                      {on ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgb(255_197_61/0.22)_0%,rgb(255_197_61/0.06)_58%,transparent_100%)]"
                        />
                      ) : null}

                      <span className="relative h-11 w-11 shrink-0 overflow-hidden border border-line-100">
                        <Image
                          src={assets.toppings[t.key]}
                          alt=""
                          aria-hidden
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </span>

                      <span className="relative min-w-0 flex-1">
                        <span
                          className={cx(
                            "block truncate font-mono text-[10px] leading-tight tracking-[0.16em] uppercase",
                            on ? "text-text-hi" : "text-text-mid",
                          )}
                        >
                          {t.name}
                        </span>
                        <span className="mt-1 block truncate font-jp text-[11px] leading-tight text-text-low">
                          {t.jp}
                        </span>
                      </span>

                      <span
                        className={cx(
                          "relative shrink-0 font-mono text-[11px] tabular-nums",
                          on ? "text-text-hi" : "text-text-low",
                        )}
                      >
                        +€{t.price}
                      </span>
                    </motion.button>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* ═══ RIGHT: the sticky preview ═══ */}
          <div className="min-[900px]:h-full">
            <div className="min-[900px]:sticky min-[900px]:top-24">
              <div className="border border-line-100 bg-ink-700/70 p-3 sm:p-4">
                {/* the bowl — crossfades on broth change */}
                <BracketFrame corners="right">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-900">
                    {reduced ? (
                      <Image
                        src={assets.bowls[broth]}
                        alt={`${current.name} — ${current.jp}`}
                        fill
                        sizes="(max-width: 900px) 92vw, 46vw"
                        className="object-cover"
                      />
                    ) : (
                      <AnimatePresence initial={false}>
                        <motion.div
                          key={broth}
                          className="absolute inset-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: CROSS, ease: EASE }}
                        >
                          <Image
                            src={assets.bowls[broth]}
                            alt={`${current.name} — ${current.jp}`}
                            fill
                            sizes="(max-width: 900px) 92vw, 46vw"
                            className="object-cover"
                          />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    <span aria-hidden className="scrim pointer-events-none absolute inset-0" />

                    {/* caption sits in the bottom-left of its own image */}
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      <Micro xs className="block">
                        {build.no} / {build.latin}
                      </Micro>
                      <h3 className="mt-1.5 font-jp text-[clamp(1.75rem,4vw,2.5rem)] font-black leading-none text-text-hi">
                        {current.jp}
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <TagChip>{current.name}</TagChip>
                        <TagChip>{current.note}</TagChip>
                        {chosen.length > 0 ? (
                          <TagChip className="tabular-nums">
                            +{String(chosen.length).padStart(2, "0")}
                          </TagChip>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </BracketFrame>

                {/* line items */}
                <ul className="mt-5 border-t border-line-100">
                  <li className="flex items-center justify-between gap-4 border-b border-line-100/60 py-2.5">
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <Micro xs className="tabular-nums">
                        01
                      </Micro>
                      <span className="truncate font-mono text-[11px] tracking-[0.14em] uppercase text-text-hi">
                        {current.name}
                      </span>
                      <span className="shrink-0 font-jp text-[11px] text-text-low">
                        {current.jp}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-mid">
                      €{current.base}
                    </span>
                  </li>

                  <AnimatePresence initial={false}>
                    {chosen.map((t, i) => {
                      const row = (
                        <span className="flex w-full items-center justify-between gap-4">
                          <span className="flex min-w-0 items-baseline gap-2.5">
                            <Micro xs className="tabular-nums">
                              {String(i + 2).padStart(2, "0")}
                            </Micro>
                            <span className="truncate font-mono text-[11px] tracking-[0.14em] uppercase text-text-mid">
                              {t.name}
                            </span>
                            <span className="shrink-0 font-jp text-[11px] text-text-low">
                              {t.jp}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-mid">
                            +€{t.price}
                          </span>
                        </span>
                      );

                      return reduced ? (
                        <li
                          key={t.key}
                          className="flex items-center border-b border-line-100/60 py-2.5"
                        >
                          {row}
                        </li>
                      ) : (
                        <motion.li
                          key={t.key}
                          layout
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: CROSS, ease: EASE }}
                          className="flex items-center border-b border-line-100/60 py-2.5"
                        >
                          {row}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>

                {/* total */}
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="pb-1.5">
                    <Micro className="block text-text-mid!">{build.totalLabel}</Micro>
                    <Micro xs className="mt-2 block tabular-nums">
                      {String(chosen.length + 1).padStart(2, "0")} /{" "}
                      {build.toppings.length + 1}
                    </Micro>
                  </div>

                  <span aria-hidden className="block">
                    <Numeric
                      className="text-[clamp(2.75rem,7vw,4rem)] leading-[0.8]"
                      value={<span ref={totalRef}>{mountTotal}</span>}
                      unit="€"
                    />
                  </span>
                  <span className="sr-only" aria-live="polite">
                    {build.totalLabel} {total} EUR
                  </span>
                </div>

                <button
                  type="button"
                  className={cx(
                    "mt-5 flex h-14 w-full items-center justify-center gap-3",
                    "bg-amber-400 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-900",
                    "transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    "hover:bg-amber-500",
                  )}
                >
                  {build.cta}
                  <span aria-hidden className="text-[13px] leading-none">
                    →
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

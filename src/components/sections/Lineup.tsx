"use client";

/**
 * // 01 ラインナップ — THE LINEUP
 *
 * Three bowl cards in the CONTENT frame. Two coordinate systems meet here:
 *   · the 2px ember light-line and the right-hugging bowl index live in the
 *     INSTRUMENT frame (viewport-flush, 12px left / 4.8vw right, never centred);
 *   · the header and the card grid live in .frame-content.
 *
 * Ownership of motion, per the scroll doctrine:
 *   · the light-line's opacity is a function of SCROLL → GSAP writes it straight
 *     to the DOM inside useScrollScrub. No React state, no re-render.
 *   · the card lift / glow / image scale are a function of REACT STATE (hover)
 *     → motion owns them, and they never appear under a scrub.
 *
 * Reduced motion ships in this file: Reveal renders its end state, useScrollScrub
 * writes progress 1 once (the line is simply there), and the hover variants are
 * withheld so nothing transforms.
 */

import Image from "next/image";
import { useCallback, useRef } from "react";
import { motion, type Variants } from "motion/react";

import { lineup } from "@/data/content";
import { assets } from "@/data/assets";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollScrub } from "@/hooks/useScrollScrub";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TagChip } from "@/components/ui/TagChip";

/** The house ease, as motion's cubic-bezier tuple. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** The house base duration, in seconds. */
const DUR = 0.42;

/** Rest → hover: the card lifts 6px. */
const cardVariants: Variants = {
  rest: { y: 0, transition: { duration: DUR, ease: EASE } },
  hover: { y: -6, transition: { duration: DUR, ease: EASE } },
};

/** Rest → hover: the bowl's own glow gains 40% (0.25 → 0.35). */
const glowVariants: Variants = {
  rest: { opacity: 0.25, transition: { duration: DUR, ease: EASE } },
  hover: { opacity: 0.35, transition: { duration: DUR, ease: EASE } },
};

/** Rest → hover: the photograph pushes in 4%. */
const imageVariants: Variants = {
  rest: { scale: 1, transition: { duration: DUR, ease: EASE } },
  hover: { scale: 1.04, transition: { duration: DUR, ease: EASE } },
};

/** next/image sizing: full bleed on mobile, a third of the frame on desktop. */
const CARD_SIZES =
  "(max-width: 767px) calc(100vw - 40px), (max-width: 1439px) 32vw, 448px";

export default function Lineup(): React.ReactElement {
  const reduced = useReducedMotion();

  const sectionRef = useRef<HTMLElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);

  /* The light-line is a function of scroll, so GSAP owns it and writes the DOM
     directly — it never becomes state. It wipes in from the left as the hero
     releases the top of this section. */
  const drawLine = useCallback((p: number) => {
    const el = lineRef.current;
    if (!el) return;
    el.style.opacity = String(p);
    el.style.transform = `scaleX(${(0.4 + p * 0.6).toFixed(4)})`;
  }, []);

  useScrollScrub(sectionRef, drawLine, {
    start: "top bottom",
    end: "top 62%",
    scrub: 0.6,
  });

  /* Hover is state-owned motion; under reduced motion the props are simply
     withheld and every card renders at rest. */
  const hoverProps = reduced
    ? {}
    : ({ initial: "rest", animate: "rest", whileHover: "hover" } as const);
  const variantProps = (v: Variants) => (reduced ? {} : { variants: v });

  return (
    <section
      id="lineup"
      ref={sectionRef}
      className="relative py-[clamp(88px,13vh,168px)]"
    >
      {/* ── INSTRUMENT FRAME: the 2px ember light-line on the top edge.
             Rendered at its END STATE so the markup is correct with no JS;
             useScrollScrub overwrites it before first paint. ── */}
      <span
        aria-hidden
        ref={lineRef}
        className="pointer-events-none absolute left-[var(--gutter-l)] right-[var(--gutter-r)] top-0 h-[2px] origin-left bg-ember-500 will-change-[transform,opacity]"
        style={{ boxShadow: "0 0 18px -2px rgb(255 107 24 / 0.65)" }}
      />

      <div className="frame-content">
        {/* Title hugs top-left; the index hugs top-right. Never mirrored. */}
        <div className="flex items-start justify-between gap-8">
          <SectionHeader
            no={lineup.no}
            jp={lineup.jp}
            latin={lineup.latin}
            kicker={lineup.kicker}
            align="left"
          />

          <ul className="hidden shrink-0 flex-col items-end gap-2 pt-1 md:flex">
            {lineup.bowls.map((bowl) => (
              <li key={bowl.key} className="flex items-baseline gap-3">
                <Micro xs className="text-text-dim">
                  {bowl.no}
                </Micro>
                <span className="font-jp text-[13px] leading-none tracking-[0.06em] text-text-low">
                  {bowl.jp}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── the three bowls ── */}
        <div className="mt-[clamp(40px,6vw,72px)] grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
          {lineup.bowls.map((bowl, i) => (
            <Reveal key={bowl.key} delay={i * 0.08} className="relative h-full">
              {/* isolate: the glow sits at -z-10 inside this box, so it paints
                  BEHIND the card without escaping to the page background. */}
              <motion.div className="relative isolate h-full" {...hoverProps}>
                <motion.span
                  aria-hidden
                  {...variantProps(glowVariants)}
                  className="pointer-events-none absolute -inset-5 -z-10 rounded-[32px] blur-[48px]"
                  style={{
                    opacity: 0.25,
                    background: `radial-gradient(closest-side, ${bowl.glow} 0%, transparent 72%)`,
                  }}
                />

                <motion.article
                  {...variantProps(cardVariants)}
                  className="flex h-full flex-col overflow-hidden rounded-[10px] border border-line-100 bg-ink-600 transition-colors duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200"
                >
                  {/* photo — 3:2, the middle of the card is left to it */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden">
                    <motion.div
                      {...variantProps(imageVariants)}
                      className="absolute inset-0"
                      style={{ scale: 1 }}
                    >
                      <Image
                        src={assets.bowls[bowl.key]}
                        alt={`${bowl.name} — ${bowl.jp}`}
                        fill
                        sizes={CARD_SIZES}
                        className="object-cover"
                      />
                    </motion.div>
                    <span aria-hidden className="scrim absolute inset-0" />
                    {/* caption in the bottom-left of its own image */}
                    <Micro
                      xs
                      className="absolute bottom-3 left-3 text-text-mid"
                    >{`${bowl.no} / ${bowl.jp}`}</Micro>
                  </div>

                  <div className="flex flex-1 flex-col p-5 lg:p-6">
                    {/* title row — name left, bare amber price on the same baseline */}
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-[clamp(1.25rem,2.1vw,1.75rem)] uppercase leading-[0.95] tracking-[0.01em] text-text-hi">
                        {bowl.name}
                      </h3>
                      <Numeric
                        className="shrink-0 text-[clamp(1.4rem,2.3vw,1.9rem)] leading-[0.95]"
                        value={
                          <>
                            <span className="numeric-unit">€</span>
                            {bowl.price}
                          </>
                        }
                      />
                    </div>

                    <p className="mt-2 font-jp text-[15px] leading-none tracking-[0.08em] text-text-low">
                      {bowl.jp}
                    </p>

                    <p className="mt-4 text-[13.5px] leading-[1.7] text-text-mid">
                      {bowl.body}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {bowl.tags.map((tag) => (
                        <TagChip key={tag}>{tag}</TagChip>
                      ))}
                    </div>

                    {/* The one place the page inverts: the lightest surface in
                        the section, and the only primary CTA in it. */}
                    <button
                      type="button"
                      className="micro mt-6 w-full rounded-[6px] px-4 py-3 text-center font-semibold text-ember-700 transition-[filter,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-[1.06] active:translate-y-[1px]"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, #F0E2C6, #FFF6E4)",
                        // .micro sets a colour of its own; win it back from the
                        // token rather than betting on utility source order.
                        color: "var(--color-ember-700)",
                      }}
                    >
                      {lineup.cta}
                    </button>
                  </div>
                </motion.article>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

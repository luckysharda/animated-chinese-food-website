"use client";

/**
 * // 05  手選素材 九種類 — id="ingredients"
 *
 * Layout doctrine:
 *   · The header hugs the TOP-LEFT of the content frame; the sourcing paragraph
 *     sits TOP-RIGHT on the SAME row and is right-aligned. Never stacked, never
 *     centred — mirrored left-to-right it would read wrong, which is the test.
 *   · A ruler in the INSTRUMENT FRAME (12px left inset, 4.8vw right inset) runs
 *     between the two: it ignores the 1440px container entirely and its amber
 *     fill is driven by scroll, which is the one ruler-fill amber this section spends.
 *   · Then a nine-cell bento on uneven rows — 260 / 340 / 300px — so no two rows
 *     scan the same. 3 columns → 2 → 1, 16px gaps throughout.
 *
 * Motion doctrine:
 *   · The ENTER is React-state motion, so it belongs to <Reveal> (motion), staggered
 *     80ms across each row of three.
 *   · The PARALLAX is a function of scroll, so it belongs to GSAP and never touches
 *     React state: one scrubbed ScrollTrigger per cell, writing yPercent straight
 *     onto the image wrapper through a quickSetter.
 *   · Hover is state, so it stays in CSS transitions: image to 1.06, caption up 4px.
 *   · Reduced motion ships here, not later — <Reveal> renders its end state, and
 *     useScrollScrub is handed enabled:false plus a 0.5 (centred) end progress, so
 *     the images sit still and the ruler reads full.
 */

import { useCallback, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollScrub } from "@/hooks/useScrollScrub";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Micro } from "@/components/ui/Micro";
import { Reveal } from "@/components/ui/Reveal";
import { ingredients } from "@/data/content";
import { assets } from "@/data/assets";

/** The image is 115% of its frame, leaving ±7.5% of the frame as slack. */
const IMAGE_SCALE = 1.15;
/** Travel, as a fraction of the FRAME height: -7% → +7%. Inside the slack, so
 *  the frame is never unfilled at either end of the span. */
const TRAVEL_OF_FRAME = 0.07;
/** gsap yPercent is a fraction of the ELEMENT's own height, so convert. */
const SHIFT_PCT = (TRAVEL_OF_FRAME / IMAGE_SCALE) * 100;


type Cell = (typeof ingredients.cells)[number];

export default function Ingredients(): React.ReactElement {
  const gridRef = useRef<HTMLUListElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();

  // The ruler fill is a function of scroll → written straight to the DOM.
  const writeFill = useCallback((p: number) => {
    const el = fillRef.current;
    if (!el) return;
    const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
    el.style.transform = `scaleX(${clamped})`;
  }, []);

  useScrollScrub(gridRef, writeFill, {
    start: "top 88%",
    end: "bottom 12%",
    scrub: 0.5,
    reducedProgress: 1,
  });

  return (
    <section id="ingredients" className="relative isolate bg-ink-800 py-[clamp(88px,13vh,168px)]">
      {/* ── header row: title hard left, sourcing note hard right ── */}
      <div className="frame-content">
        <div className="flex flex-col gap-9 md:flex-row md:items-start md:justify-between md:gap-10 lg:gap-16">
          <Reveal className="md:min-w-0 md:flex-1">
            <SectionHeader
              no={ingredients.no}
              jp={ingredients.jp}
              latin={ingredients.latin}
              kicker={ingredients.kicker}
            />
          </Reveal>

          <Reveal delay={0.08} className="md:max-w-[34ch] md:shrink-0 md:pt-1 lg:max-w-[44ch]">
            <p className="text-[13px] leading-[1.8] text-text-mid md:text-right">
              {ingredients.body}
            </p>
            <div className="mt-5 flex items-center gap-2 md:justify-end">
              <Micro xs>{ingredients.cells[0].no}</Micro>
              <span aria-hidden className="h-px w-8 bg-line-100" />
              <Micro xs>{ingredients.cells[ingredients.cells.length - 1].no}</Micro>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── instrument frame: the ruler. Viewport-flush, ignores the container. ── */}
      <div aria-hidden className="mt-12 select-none pl-3 pr-[4.8vw] sm:mt-14">
        <div className="relative h-[2px] w-full overflow-hidden bg-line-100">
          <span
            ref={fillRef}
            className="absolute inset-0 origin-left scale-x-0 bg-amber-400 will-change-transform"
          />
        </div>
        <div className="flex h-3">
          {ingredients.cells.map((cell, i) => (
            <span
              key={cell.no}
              className={`flex-1 border-l border-line-100 ${i % 3 === 0 ? "h-3" : "h-1.5"}`}
            />
          ))}
        </div>
      </div>

      {/* ── the nine-cell bento ── */}
      <div className="frame-content">
        <ul
          ref={gridRef}
          className="mt-10 grid list-none grid-cols-1 gap-4 auto-rows-[280px] grid-rows-[repeat(3,240px_300px_268px)] sm:mt-12 sm:grid-cols-2 sm:grid-rows-[260px_340px_300px_260px_340px] lg:grid-cols-3 lg:grid-rows-[260px_340px_300px]"
        >
          {ingredients.cells.map((cell, i) => (
            <BentoCell
              key={cell.no}
              cell={cell}
              src={assets.ingredients[i]}
              // 80ms stagger across each row of three.
              delay={(i % 3) * 0.08}
              reduced={reduced}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   One cell. Owns exactly one ScrollTrigger, which owns exactly one
   transform, which React never sees.
   ═══════════════════════════════════════════════════════════════════ */

function BentoCell({
  cell,
  src,
  delay,
  reduced,
}: {
  cell: Cell;
  src: string;
  delay: number;
  reduced: boolean;
}): React.ReactElement {
  const frameRef = useRef<HTMLElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  // quickSetter caches its target, so it is re-made if the element identity changes.
  const setter = useRef<{ el: HTMLElement; set: (v: number) => void } | null>(null);

  const writeParallax = useCallback((p: number) => {
    const el = imageRef.current;
    if (!el) return;
    if (setter.current?.el !== el) {
      setter.current = {
        el,
        set: gsap.quickSetter(el, "yPercent") as (v: number) => void,
      };
    }
    // p 0→1 maps to -SHIFT_PCT → +SHIFT_PCT.
    setter.current.set((p - 0.5) * 2 * SHIFT_PCT);
  }, []);

  useScrollScrub(frameRef, writeParallax, {
    // The cell's own span: entering the bottom of the viewport to leaving the top.
    start: "top bottom",
    end: "bottom top",
    scrub: 0.6,
    // Reduced motion parks the image dead centre instead of at an extreme.
    reducedProgress: 0.5,
    enabled: !reduced,
  });

  return (
    <li className="h-full min-w-0">
      <Reveal delay={delay} className="h-full">
        <figure
          ref={frameRef}
          className="group relative h-full w-full overflow-hidden border border-line-100 bg-ink-700 transition-colors duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200"
        >
          {/* the parallax carriage — 115% tall, hung 7.5% high so travel stays inside it */}
          <div
            ref={imageRef}
            className="absolute inset-x-0 top-[-7.5%] h-[115%] will-change-transform"
          >
            <Image
              src={src}
              alt={`${cell.name} — ${cell.jp}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
            />
          </div>

          {/* A SMALL BOTTOM scrim only. The house .scrim utility is the top+bottom
              gradient for a FULL-BLEED image; at 260px the top half of it would sit
              as a dark band across the ingredient itself, and the middle of every
              cell is meant to be left to the photography. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-transparent"
          />

          <figcaption
            className="pointer-events-none absolute bottom-0 left-0 z-10 p-4 transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
          >
            <Micro xs className="block">
              <span className="text-amber-400">{cell.no}</span>
            </Micro>
            <Micro className="mt-2 block">
              <span className="text-text-hi">{cell.name}</span>
            </Micro>
            <span className="mt-1 block font-jp text-[15px] font-medium leading-tight text-text-mid">
              {cell.jp}
            </span>
            <Micro xs className="mt-2 block">
              {cell.note}
            </Micro>
          </figcaption>
        </figure>
      </Reveal>
    </li>
  );
}

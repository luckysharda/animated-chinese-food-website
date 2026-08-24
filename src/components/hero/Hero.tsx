"use client";

/**
 * Hero — a 500dvh track, a 100dvh sticky stage, and exactly one ScrollTrigger.
 *
 * THE TRACK, NOT A PIN
 *   The distance is reserved by the track's height and the stage is held by CSS
 *   `sticky`. The ScrollTrigger only READS progress (no `pin` property) — adding
 *   one would double-count the distance the section occupies.
 *
 * ONE CLOCK, FOUR INSTRUMENTS
 *   Progress is derived exactly once per frame into a single mutable tick object
 *   — frame, temperature, steam rate, chapter — and handed to four imperative
 *   children that write it straight to the DOM. No scroll-derived value is ever
 *   allowed into React state: at 60fps that is 60 renders a second, and the
 *   whole hero would fall over. The one exception is a single boolean, flipped
 *   once, that mounts the 3D bowl before it is needed — off by default now,
 *   see WEBGL_CLIMAX, because the footage supplies its own exploded view.
 *
 * THE TWO GUTTERS
 *   Left  0.8% → 21% of the viewport, welded to a 12px inset  (HeroCaptionDeck)
 *   Right 81% → 95.2%, welded to the 4.8vw inset               (HeroIdentity)
 *   Between them, 21% → 81%, there is nothing but the food. Ever.
 *
 * REDUCED MOTION
 *   The scrub is never built; `useScrollScrub` writes one static progress and
 *   stops. It is deliberately 0.62 rather than 1: at 1 the left gutter has faded
 *   for the climax and the hero is, correctly, almost wordless — an end state
 *   that is right as a destination and useless as a still. 0.62 is the last
 *   progress at which every element is stating its facts: the plate on its final
 *   frame, the dossier open with the temperature clamped at 92, the ruler and
 *   the readouts live. That is the still this hero should print as.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HERO_FRAME_COUNT } from "@/data/assets";
import { useScrollScrub } from "@/hooks/useScrollScrub";
import { WEBGL_CLIMAX } from "./config";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import HeroCanvas, { type HeroCanvasHandle } from "./HeroCanvas";
import HeroCaptionDeck, { type HeroCaptionDeckHandle } from "./HeroCaptionDeck";
import HeroIdentity from "./HeroIdentity";
import HeroInstrumentBar, { type HeroInstrumentBarHandle } from "./HeroInstrumentBar";
import HeroRuler, { type HeroRulerHandle } from "./HeroRuler";

/** Everything the hero shows is a pure function of one of these. */
export interface HeroTick {
  /** Raw scrub progress, 0..1. */
  p: number;
  /** 1..120 — the plate sequence, mapped off the WHOLE pin. */
  frame: number;
  /** 50 → 92 across p 0.19 → 0.28 — inside the dossier card — then held. */
  temp: number;
  /** 0.60 → 1.42 across p 0.33 → 0.42 — inside the steam card — then held. */
  steam: number;
  /** 1..3. */
  chapter: number;
}

/* The bowl is another agent's component and it owns three.js; keep it out of the
   server render and out of the initial bundle entirely. */
const ExplodedBowl = dynamic(() => import("@/components/hero3d/ExplodedBowl"), {
  ssr: false,
});

const TEMP_FROM = 50;
const TEMP_TO = 92;
const STEAM_FROM = 0.6;
const STEAM_TO = 1.42;

/** Normalised position inside [a,b], clamped at both ends. */
function seg(p: number, a: number, b: number): number {
  const v = (p - a) / (b - a);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export default function Hero(): React.ReactElement {
  const trackRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bowlRef = useRef<HTMLDivElement | null>(null);

  const canvasRef = useRef<HeroCanvasHandle | null>(null);
  const deckRef = useRef<HeroCaptionDeckHandle | null>(null);
  const rulerRef = useRef<HeroRulerHandle | null>(null);
  const barRef = useRef<HeroInstrumentBarHandle | null>(null);

  /** The scroll value handed to the 3D scene. It never crosses React. */
  const explodeRef = useRef({ v: 0 });

  const tickRef = useRef<HeroTick>({ p: 0, frame: 1, temp: TEMP_FROM, steam: STEAM_FROM, chapter: 1 });
  const bowlOpacityRef = useRef(-1);
  const onScreenRef = useRef(true);
  const mountedBowlRef = useRef(false);
  const [bowlMounted, setBowlMounted] = useState(false);

  /** visibility is driven by two independent facts, so it has one owner. */
  const applyBowlVisibility = useCallback(() => {
    const el = bowlRef.current;
    if (!el) return;
    const visible = onScreenRef.current && bowlOpacityRef.current > 0.004;
    const next = visible ? "visible" : "hidden";
    if (el.style.visibility !== next) el.style.visibility = next;
  }, []);

  const onUpdate = useCallback(
    (p: number) => {
      const t = tickRef.current;
      t.p = p;
      t.frame = 1 + Math.round(p * (HERO_FRAME_COUNT - 1));
      t.temp = TEMP_FROM + seg(p, 0.19, 0.28) * (TEMP_TO - TEMP_FROM);
      t.steam = STEAM_FROM + seg(p, 0.33, 0.42) * (STEAM_TO - STEAM_FROM);
      // 3 falls back to 2 when the dossier card returns — that is truthful,
      // the reference reprises chapter 02 rather than counting onward.
      t.chapter = p < 0.185 ? 1 : p < 0.325 ? 2 : p < 0.468 ? 3 : 2;

      canvasRef.current?.update(t);
      deckRef.current?.update(t);
      rulerRef.current?.update(t);
      barRef.current?.update(t);

      // The bowl reads this ref on its own frame loop.
      explodeRef.current.v = seg(p, 0.75, 1);

      // One state change for the whole pin: bring the scene in before it is due.
      if (WEBGL_CLIMAX && !mountedBowlRef.current && p > 0.45 && !prefersReducedMotion()) {
        mountedBowlRef.current = true;
        setBowlMounted(true);
      }

      const el = bowlRef.current;
      if (WEBGL_CLIMAX && el) {
        const o = seg(p, 0.72, 0.79);
        if (Math.abs(o - bowlOpacityRef.current) > 0.002) {
          bowlOpacityRef.current = o;
          el.style.opacity = o.toFixed(3);
          applyBowlVisibility();
        }
      }
    },
    [applyBowlVisibility],
  );

  useScrollScrub(trackRef, onUpdate, { scrub: 0.6, reducedProgress: 0.62 });

  /**
   * Stop paying for the WebGL layer once the hero is not on screen. Doing this
   * on progress >= 1 alone would blank the stage for the last viewport of the
   * track, which is still fully visible — the sticky stage only starts leaving
   * AT progress 1. Intersection is the honest signal.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onScreenRef.current = entry.isIntersecting;
          applyBowlVisibility();
        }
      },
      { threshold: 0 },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, [applyBowlVisibility]);

  return (
    <section id="hero" ref={trackRef} className="relative h-[500dvh] bg-ink-900">
      <div
        ref={stageRef}
        className="sticky top-0 isolate h-[100dvh] w-full overflow-hidden bg-ink-900"
      >
        {/* the dead middle: media only, 21% → 81% */}
        <HeroCanvas ref={canvasRef} />

        <div
          ref={bowlRef}
          className="absolute inset-0 z-[1]"
          style={{ opacity: 0, visibility: "hidden" }}
          aria-hidden
        >
          {bowlMounted ? <ExplodedBowl explodeRef={explodeRef} /> : null}
        </div>

        {/* the two gutters — neither centred, neither ever moving */}
        <HeroCaptionDeck ref={deckRef} />
        <HeroIdentity />

        {/* the instrument frame */}
        <HeroInstrumentBar ref={barRef} />
        <HeroRuler ref={rulerRef} />
      </div>
    </section>
  );
}

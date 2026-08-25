"use client";

/**
 * // 04 煮込み — THE SIMMER
 *
 * A 300dvh sticky TRACK with a 100dvh stage. The ScrollTrigger only READS
 * progress (scrub 0.6, no `pin` — the sticky child already pins, and doing both
 * double-counts the distance).
 *
 * Everything animated here is a function of SCROLL, so it belongs to GSAP and
 * never touches React state: the layer scale, the crossfade, the title envelope,
 * the ruler fill and the hour counter are all written straight to the DOM with
 * quickSetters / textContent inside the scrub.
 *
 * Reduced motion ships in this file: no track, no scale, no crossfade — the first
 * clip's poster, the title static, and the counter parked at its end value.
 */

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollScrub } from "@/hooks/useScrollScrub";
import { BracketFrame } from "@/components/ui/BracketFrame";
import { LazyVideo } from "@/components/ui/LazyVideo";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { assets } from "@/data/assets";
import { simmer } from "@/data/content";
import { SIMMER_TRACK_VH } from "@/lib/scroll-config";

/* ── the pin's shape ───────────────────────────────────────────────────────── */

/** Hours on the counter: 00H → 16H, matching content.simmer.latin. */
const HOURS = 16;
/** Slow push-in across the whole pin. */
const SCALE_TO = 1.12;
/** Crossfade window, clip 01 → clip 02. */
const CUT_IN = 0.45;
const CUT_OUT = 0.55;
/** Title / counter envelopes: in at ~0.05, out at ~0.90. */
const TITLE_IN: readonly [number, number] = [0.02, 0.1];
const TITLE_OUT: readonly [number, number] = [0.86, 0.94];
const COUNT_IN: readonly [number, number] = [0.06, 0.14];
const COUNT_OUT: readonly [number, number] = [0.88, 0.96];

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Linear ramp between two progress marks. */
const ramp = (p: number, [a, b]: readonly [number, number]): number =>
  clamp01((p - a) / (b - a));

/** Smoothstep — keeps the fades from arriving with a hard edge. */
const smooth = (t: number): number => t * t * (3 - 2 * t);

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

type Setter = (value: number) => void;

interface Setters {
  scaleA?: Setter;
  scaleB?: Setter;
  fadeB?: Setter;
  fadeTitle?: Setter;
  slideTitle?: Setter;
  fadeCount?: Setter;
  fill?: Setter;
}

/* ── section ───────────────────────────────────────────────────────────────── */

export default function Simmer(): React.ReactElement {
  const trackRef = useRef<HTMLElement | null>(null);
  const layerARef = useRef<HTMLDivElement | null>(null);
  const layerBRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const hourRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);

  const reduced = useReducedMotion();

  // quickSetters are built lazily against whatever nodes are mounted, and thrown
  // away when the tree swaps between the animated and the reduced-motion branch.
  const setters = useRef<Setters>({});
  const lastHour = useRef(-1);

  useEffect(() => {
    setters.current = {};
    lastHour.current = -1;
  }, [reduced]);

  const onUpdate = useCallback((p: number) => {
    const s = setters.current;

    const a = layerARef.current;
    const b = layerBRef.current;
    const title = titleRef.current;
    const counter = counterRef.current;
    const fill = fillRef.current;

    if (a && !s.scaleA) s.scaleA = gsap.quickSetter(a, "scale") as Setter;
    if (b && !s.scaleB) {
      s.scaleB = gsap.quickSetter(b, "scale") as Setter;
      s.fadeB = gsap.quickSetter(b, "opacity") as Setter;
    }
    if (title && !s.fadeTitle) {
      s.fadeTitle = gsap.quickSetter(title, "opacity") as Setter;
      s.slideTitle = gsap.quickSetter(title, "y", "px") as Setter;
    }
    if (counter && !s.fadeCount) s.fadeCount = gsap.quickSetter(counter, "opacity") as Setter;
    if (fill && !s.fill) s.fill = gsap.quickSetter(fill, "scaleX") as Setter;

    // Slow push-in across the whole pin — both layers together, so the cut is a
    // fade between two identically-framed shots rather than a jump in scale.
    const scale = 1 + (SCALE_TO - 1) * p;
    s.scaleA?.(scale);
    s.scaleB?.(scale);

    // 01 → 02.
    s.fadeB?.(smooth(clamp01((p - CUT_IN) / (CUT_OUT - CUT_IN))));

    const titleIn = smooth(ramp(p, TITLE_IN));
    const titleOut = smooth(ramp(p, TITLE_OUT));
    s.fadeTitle?.(titleIn * (1 - titleOut));
    s.slideTitle?.((1 - titleIn) * 26 - titleOut * 20);

    s.fadeCount?.(smooth(ramp(p, COUNT_IN)) * (1 - smooth(ramp(p, COUNT_OUT))));

    s.fill?.(p);

    // textContent, not state: this runs every frame of the scrub.
    const h = Math.min(HOURS, Math.round(p * HOURS));
    if (h !== lastHour.current) {
      lastHour.current = h;
      const el = hourRef.current;
      if (el) el.textContent = pad2(h);
    }
  }, []);

  useScrollScrub(trackRef, onUpdate, { scrub: 0.6, enabled: !reduced });

  /* ── reduced motion: the end state, statically ── */
  if (reduced) {
    return (
      <section id="simmer" ref={trackRef} className="relative bg-ink-900">
        <div className="relative h-[100dvh] w-full overflow-hidden">
          <Image
            src={assets.video.simmer01.poster}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden className="scrim pointer-events-none absolute inset-0" />
          <TitleBlock />
          <CounterBlock hours={pad2(HOURS)} />
          <Ruler />
        </div>
      </section>
    );
  }

  /* ── the track ── */
  return (
    <section
      id="simmer"
      ref={trackRef}
      className="relative bg-ink-900"
      style={{ height: `${SIMMER_TRACK_VH}dvh` }}
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        {/* full-bleed footage — two stacked layers, B crossfades in over A */}
        <div
          ref={layerARef}
          className="absolute inset-0 will-change-transform"
          style={{ transform: "scale(1)" }}
        >
          <LazyVideo
            src={assets.video.simmer01.src}
            poster={assets.video.simmer01.poster}
            className="h-full w-full object-cover"
          />
        </div>
        <div
          ref={layerBRef}
          className="absolute inset-0 will-change-[transform,opacity]"
          style={{ transform: "scale(1)", opacity: 0 }}
        >
          <LazyVideo
            src={assets.video.simmer02.src}
            poster={assets.video.simmer02.poster}
            className="h-full w-full object-cover"
          />
        </div>

        <div aria-hidden className="scrim pointer-events-none absolute inset-0" />

        {/* INSTRUMENT FRAME — 12px left inset / 4.8vw right inset, never centred */}
        <TitleBlock ref={titleRef} animated />
        <CounterBlock ref={counterRef} hoursRef={hourRef} animated />
        <Ruler fillRef={fillRef} animated />
      </div>
    </section>
  );
}

/* ── instrument pieces, shared by both branches ────────────────────────────── */

function TitleBlock({
  ref,
  animated,
}: {
  ref?: React.RefObject<HTMLDivElement | null>;
  animated?: boolean;
}): React.ReactElement {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-[12px] top-[clamp(92px,14vh,168px)] z-10 max-w-[min(78vw,620px)] [text-shadow:0_1px_24px_rgb(7_9_12/0.85)]"
      style={animated ? { opacity: 0 } : undefined}
    >
      <SectionHeader
        no={simmer.no}
        jp={simmer.jp}
        latin={simmer.latin}
        kicker={simmer.kicker}
      />
    </div>
  );
}

function CounterBlock({
  ref,
  hoursRef,
  hours,
  animated,
}: {
  ref?: React.RefObject<HTMLDivElement | null>;
  hoursRef?: React.RefObject<HTMLSpanElement | null>;
  hours?: string;
  animated?: boolean;
}): React.ReactElement {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute right-[4.8vw] top-1/2 z-10 -translate-y-1/2 text-right"
      style={animated ? { opacity: 0 } : undefined}
    >
      <BracketFrame corners="right" className="py-3 pr-5">
        <Micro className="block pr-3">{simmer.counterLabel}</Micro>
        <Numeric
          className="mt-1 block pr-3 text-[clamp(64px,9vw,150px)] leading-[0.8]"
          value={
            <span ref={hoursRef} className="tabular-nums">
              {hours ?? "00"}
            </span>
          }
          unit="H"
        />
      </BracketFrame>
    </div>
  );
}

/** The bottom ruler: 16 hour ticks, amber fill driven by the same progress. */
function Ruler({
  fillRef,
  animated,
}: {
  fillRef?: React.RefObject<HTMLDivElement | null>;
  animated?: boolean;
}): React.ReactElement {
  return (
    <div className="pointer-events-none absolute bottom-[clamp(22px,4vh,46px)] left-[12px] right-[4.8vw] z-10">
      <div className="relative h-3">
        {Array.from({ length: HOURS + 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={`absolute bottom-0 w-px ${
              i % 4 === 0 ? "h-3 bg-line-200" : "h-1.5 bg-line-100"
            }`}
            style={{ left: `${(i / HOURS) * 100}%` }}
          />
        ))}
      </div>
      <div className="relative mt-[1px] h-px w-full bg-line-100">
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 w-full origin-left bg-amber-400"
          style={{ transform: animated ? "scaleX(0)" : "scaleX(1)" }}
        />
      </div>
    </div>
  );
}

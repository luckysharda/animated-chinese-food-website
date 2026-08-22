"use client";

/**
 * HeroCaptionDeck — the LEFT instrument gutter.
 *
 * A deck of three cards played against the scrub as FOUR states with real gaps
 * between them:
 *
 *   0.00 → 0.07   A   the 旨味 / 拉麵 lockup
 *   0.07 → 0.10       blank — the gutter is completely empty
 *   0.10 → 0.29   B   the dossier: a specimen sheet, spec table and all
 *   0.29 → 0.35       blank
 *   0.35 → 0.55   C   structurally different: an inline numeral, its own live
 *                     STEAM RATE readout, no temperature, no table
 *   0.55 → 0.58       blank
 *   0.58 → 0.74   B'  the dossier returns, temperature already clamped at 92
 *   0.74 → 0.78       the WHOLE gutter fades out as one block and stays empty
 *
 * Two things make this read as an instrument rather than a slideshow:
 *
 *   1. NOTHING here translates, scales or parallaxes. Opacity is the only
 *      property that ever animates, for the entire pin. The stillness of the
 *      gutters is what makes the media in the middle move.
 *   2. Card changes ALWAYS pass through zero. The outgoing card is taken to 0
 *      and the incoming one is held back until the full 300ms has elapsed, so a
 *      fast scrub can never cross-dissolve two cards into a smear. The blank
 *      windows above are real: at 0.08 the gutter is genuinely empty.
 *
 * B and B' are the same DOM node — a reprise is the same sheet coming back, not
 * a copy of it, and that is also why its temperature is already at 92.
 *
 * Everything the scrub touches is written straight to the DOM.
 */

import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { hero } from "@/data/content";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import type { HeroTick } from "./Hero";

export interface HeroCaptionDeckHandle {
  update(t: HeroTick): void;
}

const [lockup, dossier, steamCard, reprise] = hero.cards;

/** The whole gutter leaves as one block, and the climax is played with it empty. */
const BLOCK_FADE_FROM = 0.74;
const BLOCK_FADE_TO = 0.78;
/** Opacity-only, and it always passes through zero on the way. */
const FADE_MS = 300;

type CardId = "lockup" | "dossier" | "steam";

/**
 * The reprise is held ACTIVE past its own window so the block fade above owns the
 * exit — otherwise the card fades on its own schedule and the gutter stops
 * reading as a single object leaving the frame.
 */
function activeAt(p: number): CardId | null {
  if (p >= lockup.from && p < lockup.to) return "lockup";
  if (p >= dossier.from && p < dossier.to) return "dossier";
  if (p >= steamCard.from && p < steamCard.to) return "steam";
  if (p >= reprise.from && p < BLOCK_FADE_TO + 0.005) return "dossier";
  return null;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const CARD =
  "absolute inset-x-0 top-0 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity]";

export default function HeroCaptionDeck({
  ref,
}: {
  ref?: React.Ref<HeroCaptionDeckHandle>;
}): React.ReactElement {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const cards = useRef<Record<CardId, HTMLDivElement | null>>({
    lockup: null,
    dossier: null,
    steam: null,
  });
  const tempRef = useRef<HTMLSpanElement | null>(null);
  const rateRef = useRef<HTMLSpanElement | null>(null);

  /** What is at opacity 1 right now — the markup ships with the lockup up. */
  const visibleRef = useRef<CardId | null>("lockup");
  const desiredRef = useRef<CardId | null>("lockup");
  const blankAtRef = useRef(-1e9);
  const timerRef = useRef<number | null>(null);
  const lastTempRef = useRef("");
  const lastRateRef = useRef("");
  const lastBlockRef = useRef(-1);

  const paint = useCallback((id: CardId | null) => {
    const map = cards.current;
    (Object.keys(map) as CardId[]).forEach((key) => {
      const el = map[key];
      if (el) el.style.opacity = key === id ? "1" : "0";
    });
  }, []);

  const setDesired = useCallback(
    (id: CardId | null) => {
      if (id === desiredRef.current) return;
      desiredRef.current = id;

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const fade = prefersReducedMotion() ? 0 : FADE_MS;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();

      // Whatever is up goes to zero first, always.
      if (visibleRef.current !== null) {
        visibleRef.current = null;
        blankAtRef.current = now;
        paint(null);
      }
      if (id === null) return;

      // Hold the incoming card until the outgoing fade has actually finished.
      const wait = Math.max(0, fade - (now - blankAtRef.current));
      if (wait <= 0) {
        visibleRef.current = id;
        paint(id);
        return;
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const next = desiredRef.current;
        visibleRef.current = next;
        paint(next);
      }, wait);
    },
    [paint],
  );

  const update = useCallback(
    (t: HeroTick) => {
      setDesired(activeAt(t.p));

      const temp = t.temp.toFixed(0);
      if (temp !== lastTempRef.current) {
        lastTempRef.current = temp;
        if (tempRef.current) tempRef.current.textContent = temp;
      }

      const rate = t.steam.toFixed(2);
      if (rate !== lastRateRef.current) {
        lastRateRef.current = rate;
        if (rateRef.current) rateRef.current.textContent = rate;
      }

      const gutter = gutterRef.current;
      if (gutter) {
        const o = 1 - clamp01((t.p - BLOCK_FADE_FROM) / (BLOCK_FADE_TO - BLOCK_FADE_FROM));
        if (Math.abs(o - lastBlockRef.current) > 0.002) {
          lastBlockRef.current = o;
          gutter.style.opacity = o.toFixed(3);
        }
      }
    },
    [setDesired],
  );

  useImperativeHandle(ref, () => ({ update }), [update]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div
      ref={gutterRef}
      className="pointer-events-none absolute left-3 top-[28%] z-20 h-[46%] w-[clamp(180px,48vw,340px)] select-none sm:w-[clamp(190px,20.2vw,340px)]"
      style={{ opacity: 1 }}
    >
      {/* ── A · the lockup ─────────────────────────────────────────────── */}
      <div
        ref={(el) => {
          cards.current.lockup = el;
        }}
        className={CARD}
        style={{ opacity: 1 }}
      >
        <Micro xs className="block">
          {lockup.kicker}
        </Micro>

        <div className="mt-3 font-jp text-[clamp(38px,3.6vw,58px)] font-black leading-[0.88] tracking-[-0.03em] text-text-hi">
          <div>{lockup.jpLine1}</div>
          {/* The // OPENS the second line. It is a mark, not a separator. */}
          <div className="flex items-baseline gap-[0.12em]">
            <span className="slashes text-[0.56em] leading-none">{"//"}</span>
            <span>{lockup.jpLine2}</span>
          </div>
        </div>

        <Micro className="mt-4 block">{lockup.latin}</Micro>
        <p className="mt-2 max-w-[26ch] text-[11px] leading-[1.6] text-text-mid">
          {lockup.tagline}
        </p>
      </div>

      {/* ── B / B' · the dossier ───────────────────────────────────────── */}
      <div
        ref={(el) => {
          cards.current.dossier = el;
        }}
        className={CARD}
        style={{ opacity: 0 }}
      >
        <Micro xs className="block">
          {dossier.kicker}
        </Micro>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="slashes text-[15px] leading-none">{`// ${dossier.no}`}</span>
          <span className="font-jp text-[26px] font-black leading-none tracking-[-0.02em] text-text-hi">
            {dossier.jpChapter}
          </span>
        </div>
        <Micro className="mt-2.5 block">{dossier.latin}</Micro>

        <div className="mt-5">
          <Micro xs className="block">
            {dossier.tempLabel}
          </Micro>
          <Numeric
            className="mt-1.5 block text-[clamp(38px,3.4vw,52px)] leading-[0.8]"
            value={<span ref={tempRef}>50</span>}
            unit="°C"
          />
        </div>

        <p className="mt-4 text-[11px] leading-[1.62] text-text-mid">{dossier.body}</p>

        {/* The specimen sheet. Labels flush left and dim, values flush right and
            brighter, a 21px row pitch and a hairline under every row. */}
        <div className="mt-5 border-t border-line-100/70">
          {dossier.spec.map(([label, value]) => (
            <div
              key={label}
              className="flex h-[21px] items-center justify-between gap-3 border-b border-line-100/70"
            >
              <span className="micro-xs text-text-dim">{label}</span>
              <span className="font-mono text-[9px] uppercase leading-none tracking-[0.14em] tabular-nums text-text-mid">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── C · the steam chapter ──────────────────────────────────────── */}
      <div
        ref={(el) => {
          cards.current.steam = el;
        }}
        className={CARD}
        style={{ opacity: 0 }}
      >
        <Micro xs className="block">
          {steamCard.kicker}
        </Micro>

        <div className="mt-3 font-jp text-[clamp(30px,2.9vw,44px)] font-black leading-[0.94] tracking-[-0.03em] text-text-hi">
          {/* The numeral sets INLINE with the first word — not above it. */}
          <div className="flex items-baseline gap-[0.16em]">
            <span className="numeric text-[0.74em] leading-none">{`${steamCard.no}.`}</span>
            <span>{steamCard.jpInline}</span>
          </div>
          <div>{steamCard.jpLine2}</div>
        </div>

        <Micro className="mt-3 block">{steamCard.latin}</Micro>
        <p className="mt-3 text-[11px] leading-[1.62] text-text-mid">{steamCard.body}</p>

        <div className="mt-5 border-t border-line-100/70 pt-3">
          <Micro xs className="block">
            {steamCard.readoutLabel}
          </Micro>
          <Numeric
            className="mt-1.5 block text-[30px] leading-none"
            value={<span ref={rateRef}>0.60</span>}
            unit={steamCard.readoutUnit}
          />
        </div>
      </div>
    </div>
  );
}

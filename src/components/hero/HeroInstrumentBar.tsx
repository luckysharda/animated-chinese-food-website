"use client";

/**
 * HeroInstrumentBar — the row of readouts sitting directly above the ruler.
 *
 * Bottom-left  an OUTLINED "SCRUB ACTIVE" pill with one small SOLID amber chip
 *              in it, carrying the live percentage. The chip is the only filled
 *              thing on this side: it is the value, so it is the thing that is
 *              allowed to be loud.
 * Bottom-right four mono groups — TEMP / STEAM / CH nn/03 / FRAME nnn/120, all
 *              live off the same scrub — and then the one solid amber CTA this
 *              section is permitted.
 *
 * The four readouts stay white on purpose. They are dense and they are always on
 * screen; amber on all of them would blow the metering in a single row. The chip
 * and the CTA are the section's amber budget, and they are 400 pixels between them.
 *
 * Every value is written with textContent, and only when the string actually
 * changes — a scrub calls this 60 times a second and most frames move nothing.
 */

import { useCallback, useImperativeHandle, useRef } from "react";
import { hero } from "@/data/content";
import { HERO_FRAME_COUNT } from "@/data/assets";
import { Micro } from "@/components/ui/Micro";
import { scrollToId } from "@/lib/lenis";
import type { HeroTick } from "./Hero";

export interface HeroInstrumentBarHandle {
  update(t: HeroTick): void;
}

const [TEMP, STEAM, CH, FRAME] = hero.instrument.rightGroups;

function Readout({
  label,
  valueRef,
  initial,
}: {
  label: string;
  valueRef: React.RefObject<HTMLSpanElement | null>;
  initial: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-end gap-[4px]">
      <Micro xs className="text-text-dim">
        {label}
      </Micro>
      <span
        ref={valueRef}
        className="font-mono text-[10px] leading-none tracking-[0.12em] tabular-nums text-text-hi"
      >
        {initial}
      </span>
    </div>
  );
}

export default function HeroInstrumentBar({
  ref,
}: {
  ref?: React.Ref<HeroInstrumentBarHandle>;
}): React.ReactElement {
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const tempRef = useRef<HTMLSpanElement | null>(null);
  const steamRef = useRef<HTMLSpanElement | null>(null);
  const chapterRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<HTMLSpanElement | null>(null);

  const last = useRef({ pct: "", temp: "", steam: "", chapter: "", frame: "" });

  const update = useCallback((t: HeroTick) => {
    const p = t.p < 0 ? 0 : t.p > 1 ? 1 : t.p;

    const pct = `${String(Math.round(p * 100)).padStart(2, "0")}%`;
    if (pct !== last.current.pct) {
      last.current.pct = pct;
      if (pctRef.current) pctRef.current.textContent = pct;
    }

    const temp = `${t.temp.toFixed(0)}°C`;
    if (temp !== last.current.temp) {
      last.current.temp = temp;
      if (tempRef.current) tempRef.current.textContent = temp;
    }

    const steam = `${t.steam.toFixed(2)} G/S`;
    if (steam !== last.current.steam) {
      last.current.steam = steam;
      if (steamRef.current) steamRef.current.textContent = steam;
    }

    const chapter = `${String(t.chapter).padStart(2, "0")}/03`;
    if (chapter !== last.current.chapter) {
      last.current.chapter = chapter;
      if (chapterRef.current) chapterRef.current.textContent = chapter;
    }

    const frame = `${String(t.frame).padStart(3, "0")}/${HERO_FRAME_COUNT}`;
    if (frame !== last.current.frame) {
      last.current.frame = frame;
      if (frameRef.current) frameRef.current.textContent = frame;
    }
  }, []);

  useImperativeHandle(ref, () => ({ update }), [update]);

  return (
    <div className="pointer-events-none absolute bottom-[56px] left-3 right-[4.8vw] z-20 flex items-end justify-between gap-4 select-none">
      {/* ── left: the state of the instrument ────────────────────────────── */}
      <div
        aria-hidden
        className="flex items-center gap-2 rounded-full border border-line-100 bg-ink-900/45 py-1 pl-3 pr-1 backdrop-blur-[2px]"
      >
        <Micro xs className="text-text-mid">
          {hero.instrument.leftPill}
        </Micro>
        <span
          ref={pctRef}
          className="rounded-full bg-amber-400 px-[7px] py-[3px] font-mono text-[9px] font-bold leading-none tracking-[0.1em] tabular-nums text-ink-900"
        >
          00%
        </span>
      </div>

      {/* ── right: the numbers, then the one CTA ─────────────────────────── */}
      <div className="flex items-end gap-5 md:gap-7">
        <div aria-hidden className="hidden items-end gap-5 sm:flex md:gap-7">
          <Readout label={TEMP} valueRef={tempRef} initial="50°C" />
          <Readout label={STEAM} valueRef={steamRef} initial="0.60 G/S" />
          <Readout label={CH} valueRef={chapterRef} initial="01/03" />
          <Readout label={FRAME} valueRef={frameRef} initial={`001/${HERO_FRAME_COUNT}`} />
        </div>

        <a
          href="#lineup"
          onClick={(e) => {
            e.preventDefault();
            scrollToId("#lineup", -64);
          }}
          className="pointer-events-auto rounded-full bg-amber-400 px-3.5 py-[7px] font-mono text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-ink-900 transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-amber-500"
        >
          {hero.instrument.cta}
        </a>
      </div>
    </div>
  );
}

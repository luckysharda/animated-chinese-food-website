"use client";

/**
 * HeroCanvas — the 120-frame plate sequence, drawn into a <canvas>.
 *
 * Rules this file obeys:
 *   · Every frame is preloaded BEFORE the sequence is allowed to paint. A frame
 *     sequence that decodes while you scrub is worse than no sequence at all, so
 *     the trigger is answered from a buffer (`pendingRef`) until the last byte
 *     lands. A mono 00–100% loader states the wait rather than hiding it.
 *   · Cover-fit is done in draw space, not with CSS: the canvas backing store is
 *     sized to the stage times a DPR clamped to 2 (above 2 you pay 3x the fill
 *     rate for a difference nobody sees), and the image is scaled by
 *     max(w/iw, h/ih) and centred — the same maths `object-fit: cover` uses.
 *   · p 0 → 0.75 maps to frame 1 → 120. From 0.75 the 3D bowl owns the stage, so
 *     the whole plate layer cross-fades out over 0.75 → 0.82 and is taken out of
 *     the compositor with visibility:hidden once it is invisible.
 *   · Reduced motion: the final frame is drawn once and the scrub is ignored
 *     outright — 119 images are never requested.
 *
 * Nothing here routes through React state. The only React work after mount is
 * the ref handle itself.
 */

import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import Image from "next/image";
import { assets, heroFrame, HERO_FRAME_COUNT } from "@/data/assets";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import type { HeroTick } from "./Hero";

export interface HeroCanvasHandle {
  update(t: HeroTick): void;
}

/** The plate sequence hands the stage to the 3D bowl here. */
const HANDOFF_FROM = 0.75;
const HANDOFF_TO = 0.82;
/** Parallel image requests. Enough to saturate the connection, not enough to starve it. */
const CONCURRENCY = 10;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export default function HeroCanvas({
  ref,
}: {
  ref?: React.Ref<HeroCanvasHandle>;
}): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const framesRef = useRef<Array<HTMLImageElement | undefined>>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  /** Frame currently painted, 1-based. 0 = nothing painted yet. */
  const paintedRef = useRef(0);
  /** Frame the scrub has asked for, honoured as soon as the buffer is full. */
  const pendingRef = useRef(1);
  const readyRef = useRef(false);
  const staticRef = useRef(false);
  const opacityRef = useRef(-1);

  /* ── painting ─────────────────────────────────────────────────────────── */

  const drawFrame = useCallback((n: number) => {
    const ctx = ctxRef.current;
    const img = framesRef.current[n - 1];
    if (!ctx || !img || !img.complete || img.naturalWidth === 0) return;

    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    // cover-fit: scale to the larger ratio, centre the overflow.
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    paintedRef.current = n;
  }, []);

  const resize = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cvs.clientWidth || window.innerWidth;
    const h = cvs.clientHeight || window.innerHeight;
    sizeRef.current = { w, h };

    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (cvs.width !== bw || cvs.height !== bh) {
      cvs.width = bw;
      cvs.height = bh;
    }
    // Resizing the backing store resets the transform, so it is re-applied every time.
    ctxRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (paintedRef.current > 0) drawFrame(paintedRef.current);
    else if (readyRef.current) drawFrame(pendingRef.current);
  }, [drawFrame]);

  /* ── the scrub answer ─────────────────────────────────────────────────── */

  const update = useCallback(
    (t: HeroTick) => {
      const n = staticRef.current
        ? HERO_FRAME_COUNT
        : t.frame < 1
          ? 1
          : t.frame > HERO_FRAME_COUNT
            ? HERO_FRAME_COUNT
            : t.frame;

      pendingRef.current = n;
      if (readyRef.current && n !== paintedRef.current) drawFrame(n);

      const wrap = wrapRef.current;
      if (!wrap) return;

      // Under reduced motion the plate is the only media there is — never fade it.
      const o = staticRef.current
        ? 1
        : 1 - clamp01((t.p - HANDOFF_FROM) / (HANDOFF_TO - HANDOFF_FROM));

      if (Math.abs(o - opacityRef.current) > 0.002) {
        opacityRef.current = o;
        wrap.style.opacity = o.toFixed(3);
        wrap.style.visibility = o < 0.004 ? "hidden" : "visible";
      }
    },
    [drawFrame],
  );

  useImperativeHandle(ref, () => ({ update }), [update]);

  /* ── context + resize wiring ──────────────────────────────────────────── */

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // alpha:false — the plate is opaque, and an opaque context composites cheaper.
    ctxRef.current = cvs.getContext("2d", { alpha: false });
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(cvs);
    window.addEventListener("orientationchange", resize);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    };
  }, [resize]);

  /* ── preload ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    // Read the media query here rather than through the hook: the first client
    // render still reports the server snapshot, and this runs before that lands.
    const reduce = prefersReducedMotion();
    staticRef.current = reduce;

    let cancelled = false;
    let hideTimer: number | undefined;
    const frames: Array<HTMLImageElement | undefined> = new Array(HERO_FRAME_COUNT);
    framesRef.current = frames;

    const finish = () => {
      if (cancelled) return;
      readyRef.current = true;

      const cvs = canvasRef.current;
      if (cvs) cvs.style.opacity = "1";
      drawFrame(reduce ? HERO_FRAME_COUNT : pendingRef.current);

      if (posterRef.current) posterRef.current.style.opacity = "0";
      const loader = loaderRef.current;
      if (loader) {
        loader.style.opacity = "0";
        hideTimer = window.setTimeout(() => {
          if (!cancelled) loader.style.visibility = "hidden";
        }, 480);
      }
    };

    const load = (index: number, onDone: () => void) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = onDone;
      img.onerror = onDone;
      img.src = heroFrame(index + 1);
      frames[index] = img;
    };

    if (reduce) {
      load(HERO_FRAME_COUNT - 1, () => {
        if (!cancelled) finish();
      });
      return () => {
        cancelled = true;
        if (hideTimer !== undefined) window.clearTimeout(hideTimer);
      };
    }

    let issued = 0;
    let done = 0;

    const report = () => {
      const ratio = done / HERO_FRAME_COUNT;
      const pct = Math.round(ratio * 100);
      if (pctRef.current) pctRef.current.textContent = `${String(pct).padStart(2, "0")}%`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };

    const pump = () => {
      if (cancelled || issued >= HERO_FRAME_COUNT) return;
      const index = issued;
      issued += 1;
      load(index, () => {
        if (cancelled) return;
        done += 1;
        report();
        if (done === HERO_FRAME_COUNT) finish();
        else pump();
      });
    };

    report();
    for (let k = 0; k < CONCURRENCY; k += 1) pump();

    return () => {
      cancelled = true;
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
      for (const img of frames) {
        if (img) {
          img.onload = null;
          img.onerror = null;
        }
      }
    };
  }, [drawFrame]);

  /* ── markup ───────────────────────────────────────────────────────────── */

  return (
    <>
      <div ref={wrapRef} className="absolute inset-0 z-0" style={{ opacity: 1 }} aria-hidden>
        {/* The poster stands in until the buffer is full, then gets out of the way. */}
        <div
          ref={posterRef}
          className="absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        >
          <Image
            src={assets.hero.poster}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full opacity-0 transition-opacity duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        />

        {/* Legibility scrims. The middle stays clean — that is where the food is. */}
        <div className="scrim pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[34%]"
          style={{
            background:
              "linear-gradient(90deg, rgb(7 9 12 / 0.88) 0%, rgb(7 9 12 / 0.55) 46%, transparent 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[26%]"
          style={{
            background:
              "linear-gradient(270deg, rgb(7 9 12 / 0.82) 0%, rgb(7 9 12 / 0.45) 52%, transparent 100%)",
          }}
        />
      </div>

      {/* The loader lives in the INSTRUMENT FRAME, never in the dead middle. */}
      <div
        ref={loaderRef}
        className="pointer-events-none absolute bottom-[96px] left-3 z-30 transition-opacity duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        <span className="micro-xs block text-text-low">LOADING SEQUENCE</span>
        <div className="mt-[7px] flex items-baseline gap-2">
          <span
            ref={pctRef}
            className="font-mono text-[11px] leading-none tracking-[0.14em] tabular-nums text-amber-400"
          >
            00%
          </span>
          <span className="micro-xs text-text-dim">{HERO_FRAME_COUNT} FRAMES</span>
        </div>
        <div className="mt-2 h-px w-[136px] bg-line-100">
          <div
            ref={barRef}
            className="h-px w-full origin-left bg-text-low"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </>
  );
}

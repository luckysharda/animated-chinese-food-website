"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ══════════ shared refresh discipline ══════════════════════════════════════
   ScrollTrigger.refresh() re-measures EVERY trigger on the page, so it must be
   installed once for the document, not once per section. Ten sections calling
   this hook share one fonts.ready listener and one debounced resize listener. */

let listeners = 0;
let fontsWatched = false;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;

function onResize(): void {
  // ScrollTrigger refreshes on resize by itself; this debounced pass is the safety
  // net for the tail of a drag-resize, after which sticky-track distances are final.
  if (resizeTimer !== undefined) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = undefined;
    ScrollTrigger.refresh();
  }, 200);
}

/**
 * Install the document-wide refresh listeners. Ref-counted: returns a release
 * function, and the listeners come off when the last consumer unmounts.
 */
export function retainRefreshDiscipline(): () => void {
  if (typeof window === "undefined") return () => {};

  if (listeners === 0) {
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
  }
  listeners += 1;

  // Fonts change text metrics -> document height -> every measured start/end.
  // Once per page load; document.fonts.ready never resolves twice.
  if (!fontsWatched && typeof document !== "undefined" && "fonts" in document) {
    fontsWatched = true;
    void document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    listeners -= 1;
    if (listeners <= 0) {
      listeners = 0;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (resizeTimer !== undefined) {
        clearTimeout(resizeTimer);
        resizeTimer = undefined;
      }
    }
  };
}

export interface ScrollScrubOptions {
  /** Default "top top" — the track's top meets the viewport top. */
  start?: string;
  /** Default "bottom bottom" — the track's bottom meets the viewport bottom. */
  end?: string;
  /** Smoothing, in seconds of catch-up. Default 0.6. `true` = no smoothing. */
  scrub?: number | boolean;
  /**
   * Progress written once when the visitor prefers reduced motion.
   * Default 1 — the END STATE, per the scroll doctrine.
   */
  reducedProgress?: number;
  /** Set false to skip the trigger entirely (e.g. a desktop-only stage). */
  enabled?: boolean;
}

/**
 * Scrubbed progress for a sticky TRACK element.
 *
 *     <section ref={track} className="relative h-[500dvh]">      <- the track
 *       <div className="sticky top-0 h-[100dvh] overflow-hidden"> <- the stage
 *
 * The ScrollTrigger only READS progress — there is no `pin`, because the sticky
 * child already does the pinning and adding both double-counts the distance.
 *
 * `onUpdate` is called with 0..1 on every frame the value moves. It NEVER routes
 * through React state — write to the DOM inside it (gsap.quickSetter, a ref,
 * el.textContent). The callback is held in a ref, so passing an inline arrow is
 * fine: changing its identity will not rebuild the trigger.
 *
 * Note on `scrub`: a bare ScrollTrigger's `self.progress` is the raw, unsmoothed
 * scroll ratio — `scrub` only smooths an ATTACHED animation. So this hook scrubs a
 * proxy tween and reports the tween's eased value, which is what actually makes a
 * sticky stage feel weighted rather than glued to the wheel.
 */
export function useScrollScrub(
  trackRef: RefObject<HTMLElement | null>,
  onUpdate: (p: number) => void,
  opts?: ScrollScrubOptions,
): void {
  const start = opts?.start ?? "top top";
  const end = opts?.end ?? "bottom bottom";
  const scrub = opts?.scrub === false ? true : (opts?.scrub ?? 0.6);
  const reducedProgress = opts?.reducedProgress ?? 1;
  const enabled = opts?.enabled ?? true;

  // Latest-callback ref, updated before any scroll event can fire.
  const cb = useRef(onUpdate);
  useIsoLayoutEffect(() => {
    cb.current = onUpdate;
  }, [onUpdate]);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || !enabled) return;

      const write = (p: number) => cb.current(p);

      // Read the media query here, not from useReducedMotion(): this callback runs
      // as a layout effect, and it needs the real answer at build time.
      const reduce =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        // No trigger at all — write the end state once and leave the DOM alone.
        write(reducedProgress);
        return;
      }

      const state = { p: 0 };
      write(0);

      gsap.to(state, {
        p: 1,
        // Under a scrub, scroll is the clock; duration only sets the mapping ratio.
        duration: 1,
        ease: "none",
        onUpdate: () => write(state.p),
        scrollTrigger: {
          trigger: track,
          start,
          end,
          scrub,
          invalidateOnRefresh: true,
          // After a refresh the scrub tween is re-seeded; prime the DOM in the same
          // frame so a resize does not leave a stale readout on screen.
          onRefresh: (self) => {
            state.p = self.progress;
            write(state.p);
          },
        },
      });

      const release = retainRefreshDiscipline();

      // The tween and its ScrollTrigger are owned by useGSAP's gsap.context and are
      // reverted on unmount / dependency change; only the listeners need releasing.
      return () => {
        release();
      };
    },
    {
      dependencies: [start, end, scrub, reducedProgress, enabled],
      scope: trackRef,
      revertOnUpdate: true,
    },
  );
}

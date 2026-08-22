"use client";

/**
 * Lenis, driven by GSAP's ticker.
 *
 * Three layers, and they must not blur:
 *   1. Lenis owns the scroll POSITION. It scrolls the real window — no transformed
 *      wrapper — so window.scrollY stays truthful and ScrollTrigger's normal viewport
 *      scroller path is correct. That is why there is no scrollerProxy here; adding
 *      one "for safety" double-reports positions.
 *   2. gsap.ticker owns the FRAME LOOP. lenis.raf runs inside it (autoRaf: false), so
 *      there is exactly one rAF on the page and GSAP and Lenis never fight over order.
 *   3. ScrollTrigger READS that position, once per scroll event.
 *
 * Never call ScrollTrigger.normalizeScroll(true) alongside this — both intercept
 * wheel/touch and hand you two fighting scroll positions.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* The lenis.css rules (html.lenis height:auto, .lenis-smooth scroll-behavior:auto,
   .lenis-stopped overflow:hidden) already live in globals.css, so the package
   stylesheet is deliberately not imported here. */

const LenisContext = createContext<Lenis | null>(null);

/** Module-level handle, for callers that are not React components. */
let active: Lenis | null = null;

/** The live Lenis instance, or null under reduced motion / before mount. */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

/** Alias — same thing, for call sites that prefer the longer name. */
export function useLenisInstance(): Lenis | null {
  return useContext(LenisContext);
}

/** The live Lenis instance outside React (event handlers, GSAP callbacks). */
export function getLenis(): Lenis | null {
  return active;
}

/**
 * Smooth-scroll to an in-page anchor. Falls back to a native scroll when Lenis is
 * absent (reduced motion, or before mount), so nav links work either way.
 * `offset` is in px and is usually negative, to clear the fixed nav.
 */
export function scrollToId(id: string, offset = 0): void {
  if (typeof document === "undefined") return;
  const selector = id.startsWith("#") ? id : `#${id}`;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  const lenis = active;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.1 });
    return;
  }

  const reduce =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}

export function SmoothScroll({ children }: { children: ReactNode }): ReactElement {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Read the media query directly rather than trusting `reduced`: on the very first
    // client render useReducedMotion() still reports the server snapshot (false), and
    // this effect runs before the corrected re-render lands.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Don't let the browser restore a scroll offset into the middle of a sticky stage
    // before its ScrollTriggers have measured anything.
    const previousRestoration = history.scrollRestoration;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const instance = new Lenis({
      // REQUIRED. The default is already false in lenis 1.3, but state it: a stray
      // `true` gives you two rAF loops and a scrub that stutters under load.
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: true,
      // Leave native momentum alone on touch.
      syncTouch: false,
      // We handle anchors ourselves via scrollToId(), so the nav can apply its own offset.
      anchors: false,
    });

    // Wrapped rather than passing ScrollTrigger.update directly: Lenis invokes scroll
    // callbacks with the Lenis instance as the argument, and ScrollTrigger.update's own
    // parameter list is not part of its public contract. Passing nothing is unambiguous.
    const onScroll = () => ScrollTrigger.update();
    instance.on("scroll", onScroll);

    // gsap.ticker hands out seconds; Lenis wants milliseconds.
    const tick = (time: number) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tick);

    // GSAP's lag smoothing skips time after a long frame, which desyncs Lenis's easing
    // from every scrub on the page. Off for the lifetime of this provider.
    gsap.ticker.lagSmoothing(0);

    active = instance;
    setLenis(instance);

    // Lenis toggles classes on <html>, which can change layout height.
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP's documented defaults
      instance.off("scroll", onScroll);
      instance.destroy();
      if (active === instance) active = null;
      setLenis(null);
      if ("scrollRestoration" in history) history.scrollRestoration = previousRestoration;
    };
  }, [reduced]);

  // Fonts change text metrics, which changes document height, which invalidates every
  // start/end measured before the swap. Anton and the JP faces land well after paint.
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

export default SmoothScroll;

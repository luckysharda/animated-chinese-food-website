"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

let mql: MediaQueryList | null = null;

function query(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  if (!mql) mql = window.matchMedia(QUERY);
  return mql;
}

function subscribe(onStoreChange: () => void): () => void {
  const m = query();
  if (!m) return () => {};
  m.addEventListener("change", onStoreChange);
  return () => m.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return query()?.matches ?? false;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * True when the visitor has asked the OS for reduced motion.
 *
 * SSR-safe: the server snapshot is `false`, so the first (hydration) render always
 * agrees with the HTML; React re-renders with the real value immediately after.
 * That means you must render a state that is *valid either way* — in practice, ship
 * the END STATE in the markup and let the animation walk backwards from it.
 *
 * Live: it is subscribed, so toggling the OS setting updates the page without a reload.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The same answer, outside React — for use inside a GSAP callback, where the value
 * must be read at the moment the animation is built rather than at render time.
 */
export function prefersReducedMotion(): boolean {
  return getSnapshot();
}

/**
 * Shared hero configuration.
 *
 * This lives in its own module rather than in Hero.tsx because HeroCanvas needs
 * it too, and HeroCanvas already imports the HeroTick type from Hero — pulling a
 * runtime value across that edge as well would make a real import cycle.
 */

import { FLAG_DEFAULTS, getFlag } from "@/lib/flags";

/**
 * Hand the climax to the three.js bowl instead of the footage.
 *
 * OFF by default. The hero footage ends on a real exploded-view shot — chashu,
 * ajitama, nori, a noodle nest and broth droplets suspended over the bowl — and
 * a WebGL scene built from lathes and torus knots cannot beat a photograph of
 * the thing itself. The scene, its lighting and its instanced droplets are all
 * still in src/components/hero3d/; turn the flag on to cross-fade into them at
 * p 0.72 instead, which is what this hero did before there was footage.
 *
 * Turning it on also restores the plate's fade-out over 0.75 → 0.82, which is
 * what clears the stage for the bowl.
 *
 * The default is the "webgl-climax" registry default in src/lib/flags.ts —
 * `false`. Sourcing it from the registry rather than repeating the literal here
 * means the two can never drift apart.
 */
export const WEBGL_CLIMAX_DEFAULT: boolean = FLAG_DEFAULTS["webgl-climax"];

/** Where the plate sequence yields the stage — only used when WEBGL_CLIMAX. */
export const HANDOFF_FROM = 0.75;
export const HANDOFF_TO = 0.82;

/* ── the live value ──────────────────────────────────────────────────────── *
 *
 * Hero.tsx and HeroCanvas.tsx read `WEBGL_CLIMAX` as a plain identifier from
 * inside their per-tick GSAP callbacks. That rules out useFlag() — a hook
 * cannot be called from a scrub tick — so the flag is read with getFlag() and
 * published through an ES module LIVE BINDING: `webglClimax` is a `let`, and
 * `export { webglClimax as WEBGL_CLIMAX }` re-exports the variable itself
 * rather than a snapshot of it. Every consumer therefore sees the value as of
 * the moment it reads the identifier, with no change at any call site.
 *
 * Why this cannot tear hydration:
 *
 *   · The binding starts at WEBGL_CLIMAX_DEFAULT, which is also the SSR value
 *     and the value flags.ts serves until hydration has committed.
 *   · Both consumers read it only inside scroll callbacks — never in a render
 *     body — so the value never decides prerendered markup. Even if it did, the
 *     first read after module load still answers with the default.
 *
 * Refreshing is deliberately minimal: one task at module load. flags.ts queues
 * its own `markHydrated` timeout when IT loads, and it loads first (this module
 * imports it), so by the time ours runs the env-JSON and localStorage layers are
 * live. Both are synchronous, so that single read is the whole story — the
 * resolution is final and nothing polls.
 *
 * Anything that needs a guaranteed-fresh read can call refreshWebglClimax(),
 * which re-reads the flag, republishes the binding and returns the value.
 */

let webglClimax: boolean = WEBGL_CLIMAX_DEFAULT;

/**
 * Re-read "webgl-climax" and republish it to the WEBGL_CLIMAX binding.
 * Returns the value it just published. Safe on the server (answers with the
 * default and writes nothing that could leak between requests).
 */
export function refreshWebglClimax(): boolean {
  if (typeof window === "undefined") return WEBGL_CLIMAX_DEFAULT;
  webglClimax = getFlag("webgl-climax");
  return webglClimax;
}

export { webglClimax as WEBGL_CLIMAX };

if (typeof window !== "undefined") {
  // After flags.ts flips its own hydration gate — same task queue, and it was
  // scheduled first. Both remaining flag layers (env JSON and localStorage) are
  // synchronous, so this single read is final and nothing polls.
  window.setTimeout(refreshWebglClimax, 0);
}

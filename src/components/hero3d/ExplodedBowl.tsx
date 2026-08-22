"use client";

/**
 * ExplodedBowl — the hero's exploded-view ramen bowl.
 *
 * The contract with the hero is one object and one number:
 *
 *     const explode = useRef({ v: 0 });          // hero owns it
 *     gsap.to(explode.current, { v: 1, scrollTrigger: { ... scrub } });
 *     <ExplodedBowl explodeRef={explode} />
 *
 * `explodeRef.current.v` is a function of SCROLL, so per the scroll doctrine it
 * belongs to GSAP and never to React. It is never read during render here — it
 * is read inside useFrame in <BowlScene>, and it is read on the GSAP ticker in
 * this file for the sole purpose of deciding whether a frame is worth drawing.
 *
 * ── why frameloop="demand" works ────────────────────────────────────────────
 * Every transform in the scene is a pure function of `v`. When `v` stops moving
 * the next frame would be pixel-identical to the last, so there is no reason to
 * draw it. The ticker below compares `v` against the value that was last drawn
 * and calls invalidate() only when they differ. Parked at the top of the page
 * the GPU cost of this canvas is zero.
 *
 * ── when the canvas does not mount at all ───────────────────────────────────
 * Reduced motion, no WebGL, or a viewport under 768px all fall through to
 * <ExplodeFallback>, the rendered still of the end state. The first render —
 * server and hydration alike — is ALWAYS the fallback, and the canvas only
 * swaps in from an effect, so there is nothing for React to mismatch on.
 */

import { useEffect, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, invalidate, type RootState } from "@react-three/fiber";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import BowlScene from "./BowlScene";
import ExplodeFallback from "./ExplodeFallback";

/** Below this the hero already has a frame sequence decoding; one GPU scene is enough. */
const MIN_WIDTH = "(min-width: 768px)";

/** Probing costs a throwaway context, so the answer is cached for the page. */
let webglSupport: boolean | null = null;

function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    const ctx =
      probe.getContext("webgl2") ??
      probe.getContext("webgl") ??
      probe.getContext("experimental-webgl");
    // Drop the probe's context immediately — browsers cap live contexts per page.
    const lose = (ctx as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    webglSupport = ctx !== null;
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export default function ExplodedBowl({
  explodeRef,
}: {
  explodeRef: RefObject<{ v: number }>;
}): React.ReactElement {
  const reduced = useReducedMotion();

  // false on the server AND on the hydration render — the fallback is the SSR output.
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MIN_WIDTH);
    const sync = (): void => setWide(mq.matches && detectWebGL());
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const live = wide && !reduced;

  /* ── the invalidate pump ───────────────────────────────────────────────────
     One callback on the page's single rAF (gsap.ticker also drives Lenis), so
     this adds no loop of its own. It requests a frame only when the scroll-owned
     value has actually moved; `frames: 2` covers the case where the change lands
     between R3F's own render and its next flush. */
  useEffect(() => {
    if (!live) return;
    let drawn = Number.NaN;
    const pump = (): void => {
      const v = explodeRef.current?.v ?? 0;
      if (!(Math.abs(v - drawn) < 0.0004)) {
        drawn = v;
        invalidate(undefined, 2);
      }
    };
    gsap.ticker.add(pump);
    return () => {
      gsap.ticker.remove(pump);
    };
  }, [live, explodeRef]);

  if (!live) {
    return (
      <div className="relative h-full w-full" aria-hidden>
        <ExplodeFallback className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" aria-hidden>
      <Canvas
        className="h-full w-full"
        dpr={[1, 2]}
        frameloop="demand"
        gl={{
          powerPreference: "high-performance",
          antialias: false,
          alpha: true,
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 0.15, 3.6], fov: 38, near: 0.1, far: 60 }}
        onCreated={({ gl }: RootState) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearAlpha(0);
        }}
        fallback={<ExplodeFallback className="h-full w-full object-contain" />}
      >
        <BowlScene explodeRef={explodeRef} />
      </Canvas>
    </div>
  );
}

export { ExplodedBowl };

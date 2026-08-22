"use client";

/**
 * The single registration site for GSAP + plugins.
 *
 * Every other file in the app imports gsap / ScrollTrigger / useGSAP FROM HERE,
 * never from the packages directly. Registering in ten section files would work
 * (registerPlugin is idempotent) but scatters config and makes the SSR guard
 * ten people's problem instead of one.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// ESM module bodies evaluate once per graph, so this runs exactly once.
// Guarded for SSR: ScrollTrigger measures the document on init, and useGSAP's
// plugin registration reaches for window.
if (typeof window !== "undefined") {
  // useGSAP registers itself so that gsap.context()/matchMedia created inside the
  // hook are collected and reverted correctly on unmount — which is what stops
  // React 19 StrictMode's double mount from leaving duplicate ScrollTriggers behind.
  gsap.registerPlugin(useGSAP, ScrollTrigger);

  ScrollTrigger.config({
    // A mobile URL-bar collapse changes innerHeight and would otherwise fire a full
    // refresh mid-scroll, which visibly jumps a sticky stage. Ignore vertical-only
    // resizes on touch-only devices.
    ignoreMobileResize: true,
  });
}

export { gsap, ScrollTrigger, useGSAP };

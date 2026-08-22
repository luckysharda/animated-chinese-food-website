"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * The status pill, centre readout and telemetry belong to the HERO, not to the
 * whole page.
 *
 * In the reference, those readouts sit over full-bleed photography — there is
 * nothing underneath them to collide with. Once the hero releases, every
 * section below is typography, and a fixed HUD drawn over a section kicker is
 * just two pieces of text on top of each other. So they fade out with the hero
 * and only the nav and the progress rail persist.
 *
 * Opacity is written straight to the DOM from the ScrollTrigger — this is a
 * scroll-derived value, so it never touches React state.
 */
export default function HeroReadouts({ children }: { children: ReactNode }): React.ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const track = document.getElementById("hero");
      if (!el || !track) return;

      const set = gsap.quickSetter(el, "opacity") as (v: number) => void;
      const trigger = ScrollTrigger.create({
        trigger: track,
        // Fade across the last 8% of the hero track, finishing as it releases.
        start: "bottom bottom+=42%",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const o = 1 - self.progress;
          set(o);
          el.style.visibility = o < 0.02 ? "hidden" : "visible";
        },
      });
      return () => trigger.kill();
    },
    { scope: ref }
  );

  return <div ref={ref}>{children}</div>;
}

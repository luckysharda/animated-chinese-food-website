"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { retainRefreshDiscipline } from "@/hooks/useScrollScrub";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Whole-document scroll progress, 0..1 — for the fixed progress rail and the
 * chapter readout in the chrome.
 *
 * Measured against the scroller's own max scroll rather than a trigger element, so
 * it stays correct no matter what any section does to the document height, and it
 * is re-derived on every ScrollTrigger.refresh().
 *
 * Like every scroll-derived value, this NEVER touches React state — write to the
 * DOM inside the callback (a transform via gsap.quickSetter, el.textContent, a ref).
 * The callback is held in a ref, so an inline arrow will not rebuild the trigger.
 */
export function useDocumentProgress(onUpdate: (p: number) => void): void {
  const cb = useRef(onUpdate);
  useIsoLayoutEffect(() => {
    cb.current = onUpdate;
  }, [onUpdate]);

  useGSAP(
    () => {
      const write = (p: number) => cb.current(p);

      const trigger = ScrollTrigger.create({
        // Numeric start + the "max" keyword: the full scrollable range of the window,
        // with no dependency on any element's measured box.
        start: 0,
        end: "max",
        invalidateOnRefresh: true,
        onUpdate: (self) => write(self.progress),
        onRefresh: (self) => write(self.progress),
      });

      write(trigger.progress);

      const release = retainRefreshDiscipline();
      return () => {
        release();
        trigger.kill();
      };
    },
    { dependencies: [] },
  );
}

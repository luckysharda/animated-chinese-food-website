"use client";

import { useCallback, useRef } from "react";
import { site } from "@/data/content";
import { useDocumentProgress } from "@/hooks/useDocumentProgress";

const SECTION_COUNT = "08";

/**
 * CentreReadout — dead centre, one nav-height down. Three dot-separated
 * groups; the middle one is document progress to three decimals.
 * The value is a function of SCROLL, so it is written with textContent and
 * never touches React state.
 */
export default function CentreReadout(): React.ReactElement {
  const valueRef = useRef<HTMLSpanElement | null>(null);

  const onUpdate = useCallback((p: number) => {
    const el = valueRef.current;
    if (!el) return;
    el.textContent = (p < 0 ? 0 : p > 1 ? 1 : p).toFixed(3);
  }, []);

  useDocumentProgress(onUpdate);

  return (
    <div className="pointer-events-none fixed left-1/2 top-[68px] z-40 hidden -translate-x-1/2 md:block">
      <div className="micro-xs flex items-center gap-2 whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          <span className="text-text-dim!">SEQ</span>
          <span className="tabular-nums text-text-low!">{SECTION_COUNT}</span>
        </span>

        <Dot />

        <span
          ref={valueRef}
          className="tabular-nums text-amber-400! tracking-[0.14em]"
        >
          0.000
        </span>

        <Dot />

        <span className="flex items-center gap-1.5">
          <span className="text-text-dim!">LOC</span>
          <span className="text-text-low!">{site.location}</span>
        </span>
      </div>
    </div>
  );
}

function Dot(): React.ReactElement {
  return (
    <span aria-hidden className="text-text-dim!">
      ·
    </span>
  );
}

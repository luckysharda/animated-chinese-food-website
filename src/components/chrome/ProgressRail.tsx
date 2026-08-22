"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDocumentProgress } from "@/hooks/useDocumentProgress";

const THUMB = 30;

/**
 * ProgressRail — instrument frame, hard against the right edge at ~1.5vw,
 * outboard of the telemetry column. A white pill on a faint track: the rail
 * thumb is deliberately NOT amber.
 * Position is a function of SCROLL, so it is written straight to the node's
 * transform and never through React state.
 */
export default function ProgressRail(): React.ReactElement {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const travelRef = useRef(0);
  const lastRef = useRef(0);

  const paint = useCallback((p: number) => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
    lastRef.current = clamped;
    thumb.style.transform = `translate3d(0, ${clamped * travelRef.current}px, 0)`;
  }, []);

  /* Track height is cached — reading it every frame would be a layout thrash. */
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      travelRef.current = Math.max(0, track.clientHeight - THUMB);
      paint(lastRef.current);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [paint]);

  useDocumentProgress(paint);

  return (
    <div className="pointer-events-none fixed right-[1.5vw] top-1/2 z-40 hidden -translate-y-1/2 sm:block">
      <div ref={trackRef} className="relative h-[34vh] w-[3px] rounded-full bg-line-100/45">
        {[0.25, 0.5, 0.75].map((t) => (
          <i
            key={t}
            aria-hidden
            className="absolute right-[6px] block h-px w-[5px] bg-line-100"
            style={{ top: `${t * 100}%` }}
          />
        ))}
        <div
          ref={thumbRef}
          className="absolute left-0 top-0 w-[3px] rounded-full bg-text-hi"
          style={{
            height: THUMB,
            transform: "translate3d(0,0,0)",
            boxShadow: "0 0 10px -2px rgb(255 255 255 / 0.55)",
          }}
        />
      </div>
    </div>
  );
}

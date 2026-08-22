"use client";

import { useEffect, useRef } from "react";
import { site } from "@/data/content";

const CLOCK_PLACEHOLDER = "--:--:--";
const UNIT_ID = "UMR-0001";

/**
 * Telemetry — instrument frame, right-aligned so the column ends exactly on
 * the 4.8vw inset. Coordinates, a live Tokyo clock and the unit ID.
 * The clock is written from an effect only, so the server and the first
 * client render agree on the placeholder and nothing can mismatch.
 * Every numeric field is tabular or the column jitters once a second.
 */
export default function Telemetry(): React.ReactElement {
  const clockRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const tick = () => {
      const el = clockRef.current;
      if (el) el.textContent = fmt.format(new Date());
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none fixed right-[4.8vw] top-[68px] z-40 hidden select-none sm:block">
      <div className="flex flex-col items-end gap-[5px] border-r border-line-100 pr-2.5">
        <Row label="LAT" value={site.coords.lat} />
        <Row label="LON" value={site.coords.lon} />
        <Row
          label="JST"
          value={
            <span ref={clockRef} suppressHydrationWarning>
              {CLOCK_PLACEHOLDER}
            </span>
          }
          lit
        />
        <Row label="ID" value={UNIT_ID} />
      </div>
    </div>
  );
}

function Row(p: {
  label: string;
  value: React.ReactNode;
  lit?: boolean;
}): React.ReactElement {
  return (
    <div className="micro-xs flex items-baseline justify-end gap-2 leading-none">
      <span className="text-text-dim!">{p.label}</span>
      <span
        className={`min-w-[8.5ch] text-right tabular-nums tracking-[0.12em] ${
          p.lit ? "text-text-hi!" : "text-text-low!"
        }`}
      >
        {p.value}
      </span>
    </div>
  );
}

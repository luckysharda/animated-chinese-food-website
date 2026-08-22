/**
 * HeroIdentity — the RIGHT instrument gutter.
 *
 * This block NEVER changes. Not at any progress, not at any breakpoint of the
 * scrub: no opacity ramp, no parallax, no scale. While the left gutter plays
 * four states and then leaves the frame entirely, this one holds. That
 * asymmetry — one gutter deals, the other refuses to move — is the whole
 * editorial idea of the hero, and it only works if this file is boring.
 *
 * It lives in a 210px column welded to the 4.8vw right inset, so the display
 * face is set at clamp(34px, 3.2vw, 52px) rather than the 7vw a full-width
 * headline would take. Four hard-broken lines, right-aligned, and exactly one
 * amber word in the whole block.
 *
 * No hooks, no refs, no client boundary needed.
 */

import { hero, site } from "@/data/content";
import { Micro } from "@/components/ui/Micro";

const { identity } = hero;

/** A pentagram, points-out, with the first point aimed by `aimDeg`. */
function star(cx: number, cy: number, r: number, aimDeg: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = ((i * 144 + aimDeg) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`);
  }
  return pts.join(" ");
}

/** Aim a small star's first point at the large star at (5,5). */
function aimAtBig(cx: number, cy: number): number {
  return (Math.atan2(5 - cy, 5 - cx) * 180) / Math.PI;
}

const SMALL: Array<[number, number]> = [
  [10, 2],
  [12, 4],
  [12, 7],
  [10, 9],
];

function PlateCN(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 30 20"
      className="block h-full w-full"
      role="img"
      aria-label="China"
      preserveAspectRatio="none"
    >
      <rect width="30" height="20" fill="var(--color-crimson)" />
      <polygon points={star(5, 5, 3, -90)} fill="var(--color-amber-400)" />
      {SMALL.map(([cx, cy]) => (
        <polygon key={`${cx}-${cy}`} points={star(cx, cy, 1, aimAtBig(cx, cy))} fill="var(--color-amber-400)" />
      ))}
    </svg>
  );
}

function PlateJP(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 30 20"
      className="block h-full w-full"
      role="img"
      aria-label="Japan"
      preserveAspectRatio="none"
    >
      <rect width="30" height="20" fill="#ECEFF3" />
      <circle cx="15" cy="10" r="6" fill="#BC002D" />
    </svg>
  );
}

export default function HeroIdentity(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute right-[4.8vw] top-[28%] z-20 flex h-[46%] w-[clamp(140px,14.2vw,210px)] select-none items-stretch gap-2.5 opacity-0 sm:opacity-100">
      {/* the column */}
      <div className="flex min-w-0 flex-1 flex-col items-end justify-between text-right">
        <div className="w-full">
          <Micro xs className="block">
            {identity.kicker}
          </Micro>

          <h1
            aria-label={site.tagline}
            className="mt-3.5 font-display text-[clamp(34px,3.2vw,52px)] leading-[0.95] tracking-[0.005em] text-text-hi"
          >
            {identity.lines.map((line, i) => (
              <span
                key={line}
                className={
                  i === identity.amberLine ? "block text-amber-400" : "block"
                }
                style={
                  i === identity.amberLine
                    ? { textShadow: "0 0 18px rgb(255 197 61 / 0.45)" }
                    : undefined
                }
              >
                {line}
              </span>
            ))}
          </h1>
        </div>

        <div className="w-full">
          {/* two plates, 72×48, with a hard mid-dot between them */}
          <div className="flex items-center justify-end gap-1.5">
            <span className="h-[clamp(31px,3.33vw,48px)] w-[clamp(46px,5vw,72px)] shrink-0 ring-1 ring-inset ring-white/10">
              <PlateCN />
            </span>
            <span className="text-[13px] leading-none text-text-low">·</span>
            <span className="h-[clamp(31px,3.33vw,48px)] w-[clamp(46px,5vw,72px)] shrink-0 ring-1 ring-inset ring-white/10">
              <PlateJP />
            </span>
          </div>

          <p className="mt-3 font-jp text-[13px] leading-none tracking-[0.16em] text-text-mid">
            {identity.caption}
          </p>

          <div className="mt-3.5 font-mono text-[10px] leading-[1.72] tracking-[0.02em] text-text-low">
            {identity.body.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* the rail, reading up the right edge of the frame */}
      <div className="flex shrink-0 items-end">
        <span
          className="micro-xs whitespace-nowrap text-text-dim"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {identity.rail}
        </span>
      </div>
    </div>
  );
}

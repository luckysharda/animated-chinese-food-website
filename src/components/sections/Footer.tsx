/**
 * FOOTER — the last instrument panel.
 *
 * A giant 旨味 watermark at 6% opacity bleeds off the bottom-left corner, three
 * data columns (address / hours / social) sit over it inside the CONTENT frame,
 * and the legal micro line runs along a hairline in the INSTRUMENT frame — flush
 * to the viewport, 12px left inset and 4.8vw right, so it never lines up with the
 * columns above it. Nothing here is centred and nothing is mirrored.
 *
 * No hooks of its own, so no "use client": the only animation is Reveal, which is
 * a client component and brings its own reduced-motion end state.
 */

import { footer, site } from "@/data/content";
import { Micro } from "@/components/ui/Micro";
import { Reveal } from "@/components/ui/Reveal";

/**
 * content.ts carries the LINES; the column headings are structural labels rather
 * than copy, so they live here beside the markup that needs them.
 */
const COLUMNS: ReadonlyArray<{
  label: string;
  lines: readonly string[];
  mark?: boolean;
}> = [
  { label: "所在地 // ADDRESS", lines: footer.address },
  { label: "営業時間 // HOURS", lines: footer.hours },
  { label: "連絡 // SOCIAL", lines: footer.social, mark: true },
];

export default function Footer(): React.ReactElement {
  return (
    <footer
      id="footer"
      className="relative w-full overflow-hidden border-t border-line-100 bg-ink-900"
    >
      {/* 旨味 — texture, not type. Bleeds off the bottom-left, 6% opacity. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[7vw] -left-[3vw] select-none font-jp text-[34vw] font-black leading-[0.72] text-text-hi opacity-[0.06]"
      >
        {footer.watermark}
      </span>

      {/* CONTENT FRAME */}
      <div className="frame-content relative pb-12 pt-20 md:pt-28">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Micro className="block">{site.latin}</Micro>
            <p className="mt-4 font-jp text-[clamp(2.75rem,8vw,5.5rem)] font-black leading-[0.86] tracking-[-0.02em] text-text-hi">
              {site.jp}
            </p>
            <p className="mt-5 font-mincho text-[15px] leading-relaxed text-text-mid">
              {site.tagline}
            </p>
          </Reveal>

          <Reveal delay={0.08} className="md:text-right">
            <Micro xs className="block">
              {`${site.coords.lat} // ${site.coords.lon}`}
            </Micro>
            <Micro xs className="mt-2 block">
              {site.location}
            </Micro>
            <Micro xs className="mt-2 block text-text-mid">
              {site.openLabel}
            </Micro>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-10 border-t border-line-100 pt-10 sm:grid-cols-3 md:mt-20">
          {COLUMNS.map((column, i) => (
            <Reveal key={column.label} delay={0.07 * i}>
              <Micro xs className="block text-text-dim">
                {column.label}
              </Micro>
              <ul className="mt-5 space-y-2">
                {column.lines.map((line) => (
                  <li
                    key={line}
                    className="flex items-baseline gap-2 font-mono text-[13px] leading-relaxed tracking-[0.04em] text-text-mid"
                  >
                    {column.mark ? (
                      <span aria-hidden className="text-[10px] text-text-dim">
                        ↗
                      </span>
                    ) : null}
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>

      {/* INSTRUMENT FRAME — viewport-flush hairline row, never the container. */}
      <div className="relative border-t border-line-100">
        <div className="flex flex-col gap-2 py-5 pl-3 pr-[4.8vw] sm:flex-row sm:items-center sm:justify-between">
          <Micro xs>{footer.legal}</Micro>
          <Micro xs className="shrink-0">
            {site.name}
          </Micro>
        </div>
      </div>
    </footer>
  );
}

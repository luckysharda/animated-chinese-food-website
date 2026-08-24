/**
 * SectionHeader — the signature trilingual lockup.
 *
 *   line 1   micro kicker                         text-text-low
 *   line 2   "// NN."  in .slashes (amber, oblique, ~1.1x) sitting on the SAME
 *            baseline as the large ENGLISH title in the display face
 *   line 3   the Japanese, small, beneath it
 *
 * English leads and the Japanese is the accent, not the other way round: this
 * has to be readable first and atmospheric second. The lockup is still
 * trilingual — kicker, title, native name — only the weighting changed.
 *
 * align='left' (default) hugs the left edge of the content frame — the house
 * position. align='center' exists only for sections 07 and 08.
 *
 * The amber here is the // device and the chapter numeral only; both are on the
 * closed list of things allowed to carry it.
 */

import { Micro } from "./Micro";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function SectionHeader({
  no,
  jp,
  latin,
  kicker,
  align = "left",
  className,
}: {
  /** Chapter numeral, zero-padded: "01" … "08". */
  no: string;
  /** The Japanese title — set small, beneath the English. */
  jp: string;
  /** The large English title. */
  latin: string;
  /** The mono kicker above it. */
  kicker: string;
  align?: "left" | "center";
  className?: string;
}): React.ReactElement {
  const centered = align === "center";

  return (
    <header
      className={cx(
        "flex flex-col",
        centered ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <Micro className="block">{kicker}</Micro>

      <div
        className={cx(
          "mt-3 flex w-full items-baseline gap-[0.22em] text-[clamp(2.25rem,5.6vw,4.5rem)] sm:mt-4",
          centered ? "justify-center" : "justify-start",
        )}
      >
        <span className="slashes shrink-0 text-[1.1em] leading-[0.85]">{`// ${no}.`}</span>
        <h2 className="font-display text-[1em] leading-[0.9] tracking-[-0.01em] text-text-hi uppercase">
          {latin}
        </h2>
      </div>

      <p className="mt-3 font-jp text-[clamp(0.95rem,1.5vw,1.35rem)] font-bold leading-none text-text-low">
        {jp}
      </p>
    </header>
  );
}

export default SectionHeader;

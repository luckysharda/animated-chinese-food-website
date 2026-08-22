/**
 * SectionHeader — the signature trilingual lockup.
 *
 *   line 1   micro kicker                         text-text-low
 *   line 2   "// NN."  in .slashes (amber, oblique, ~1.1x) sitting on the SAME
 *            baseline as the large Japanese title in font-jp font-black
 *   line 3   the small English latin line, in micro
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
  /** The large Japanese title. */
  jp: string;
  /** The small English translation beneath it. */
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
        <h2 className="font-jp text-[1em] font-black leading-[0.92] tracking-[-0.02em] text-text-hi">
          {jp}
        </h2>
      </div>

      <Micro className="mt-3 block">{latin}</Micro>
    </header>
  );
}

export default SectionHeader;

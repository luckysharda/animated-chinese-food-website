/**
 * Numeric — the amber display-face readout.
 *
 * `.numeric` carries the display face, tabular-nums and the glow; `.numeric-unit`
 * carries the small raised unit. Layout stays INLINE (not flex) because the unit
 * is positioned with vertical-align, which flex containers destroy.
 *
 * Pair with useCountUp by passing its ref-bearing span as `value`:
 *     const { ref } = useCountUp(60, { suffix: "" });
 *     <Numeric value={<span ref={ref}>0</span>} unit="H" />
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Numeric({
  value,
  unit,
  className,
}: {
  value: React.ReactNode;
  /** °C, H, S, € … rendered small and raised inside the numeral. */
  unit?: string;
  className?: string;
}): React.ReactElement {
  return (
    <span className={cx("numeric", className)}>
      {value}
      {unit ? <span className="numeric-unit">{unit}</span> : null}
    </span>
  );
}

export default Numeric;

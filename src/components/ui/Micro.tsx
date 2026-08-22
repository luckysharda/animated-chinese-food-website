/**
 * Micro — the mono uppercase letterspaced label.
 * Everything on the site that is DATA rather than prose wears this.
 * Pure presentation: no hooks, so it is usable from server and client trees.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Micro({
  children,
  className,
  xs,
}: {
  children: React.ReactNode;
  className?: string;
  /** The 9px / 0.22em variant, for rails, brackets and instrument chrome. */
  xs?: boolean;
}): React.ReactElement {
  return <span className={cx(xs ? "micro-xs" : "micro", className)}>{children}</span>;
}

export default Micro;

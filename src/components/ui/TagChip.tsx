/**
 * TagChip — a hairline spec chip. Never amber: these are data, not selection.
 * Used for bowl tags, spec pills and any short uppercase qualifier.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function TagChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <span
      className={cx(
        "micro-xs inline-flex items-center whitespace-nowrap",
        "border border-line-100 px-2 py-[5px]",
        "text-text-low transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:border-line-200 hover:text-text-mid",
        className,
      )}
    >
      {children}
    </span>
  );
}

export default TagChip;

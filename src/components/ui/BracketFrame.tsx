/**
 * BracketFrame — L-shaped corner rules drawn as absolutely positioned divs.
 * 28px arms, 2px stroke, border-line-200.
 *
 * corners='all'   → all four corners (default).
 * corners='right' → ONLY the top-right and bottom-right pair. This is the site's
 *                   deliberate asymmetry; the hero passes it explicitly.
 *
 * The marks are decorative and pointer-transparent, so the frame can wrap
 * interactive content without swallowing clicks.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const ARM = "pointer-events-none absolute h-7 w-7 border-line-200";

export function BracketFrame({
  children,
  className,
  corners = "all",
}: {
  children: React.ReactNode;
  className?: string;
  corners?: "all" | "right";
}): React.ReactElement {
  const showLeft = corners === "all";

  return (
    <div className={cx("relative", className)}>
      {showLeft ? (
        <>
          <span aria-hidden className={cx(ARM, "left-0 top-0 border-l-2 border-t-2")} />
          <span aria-hidden className={cx(ARM, "bottom-0 left-0 border-b-2 border-l-2")} />
        </>
      ) : null}
      <span aria-hidden className={cx(ARM, "right-0 top-0 border-r-2 border-t-2")} />
      <span aria-hidden className={cx(ARM, "bottom-0 right-0 border-b-2 border-r-2")} />
      {children}
    </div>
  );
}

export default BracketFrame;

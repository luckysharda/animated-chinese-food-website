/**
 * ExplodeFallback — the static end state of the exploded bowl.
 *
 * This is what ships instead of the WebGL canvas in three situations, and it is
 * deliberately the SAME image in all three so there is one thing to art-direct:
 *   1. the visitor prefers reduced motion,
 *   2. the device/browser has no usable WebGL context,
 *   3. the viewport is below 768px, where a second GPU scene next to the hero
 *      frame sequence is not worth the battery.
 *
 * A plain <img>, on purpose: no layout-shifting wrapper, no loader, no JS. The
 * hero already carries every readable string, so this is decorative and is
 * hidden from assistive tech rather than given invented alt copy.
 */

import { assets } from "@/data/assets";

export default function ExplodeFallback({
  className,
}: {
  className?: string;
}): React.ReactElement {
  // A decorative full-bleed still. next/image's sizing wrapper would fight the
  // hero's own absolutely-positioned stage, and there is nothing to optimise —
  // the file is already the exact asset we want at the exact moment we want it.
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={assets.hero.explodeStill}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      loading="lazy"
      className={className ?? "h-full w-full object-contain"}
    />
  );
}

export { ExplodeFallback };

/**
 * Grain — the fixed film-grain plate that sits over the whole document.
 * Static SVG turbulence — no animation, no hooks, no client cost of its own.
 * Mounted last in Chrome so it lies over the readouts as well as the page.
 */
export default function Grain(): React.ReactElement {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 select-none"
      style={{ opacity: 0.032 }}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="umami-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix in="noise" type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#umami-grain)" />
      </svg>
    </div>
  );
}

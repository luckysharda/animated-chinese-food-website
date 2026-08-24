"use client";

/**
 * // 07 物語 — THE STORY.
 *
 * One of only two deliberately CENTRED sections on the site, and the one place
 * the mincho face is allowed to carry a title instead of the gothic.
 *
 *   CREST    "// 07." amber, over 物語 in font-mincho, over the latin line. Then
 *            the two flag plates — PRC and Japan, both drawn as SVG, never emoji —
 *            with 丼 held between them, then the two caption lines.
 *   GHOSTS   横 and 浜 at ~4% opacity, font-mincho at 40vw, one bleeding off each
 *            side. Their y is a function of SCROLL, so GSAP owns it: the scrub
 *            writes straight to the DOM through quickSetter and never touches
 *            React state. aria-hidden, pointer-events-none.
 *   ERAS     four dated cards in a 2x2 grid split by a 1px vertical spine. The
 *            left pair enters from x:-30, the right pair from x:+30, staggered —
 *            that is REACT-STATE motion (an in-view trigger), so it belongs to
 *            motion, not to GSAP, and the two never touch the same property.
 *
 * Amber in this viewport is the // device and the four era years. Nothing else.
 * Reduced motion ships in this file: the ghosts park at their neutral offset
 * (reducedProgress 0.5 → travel 0) and every card renders as its end state.
 */

import Image from "next/image";
import { useCallback, useRef } from "react";
import { motion } from "motion/react";

import { assets } from "@/data/assets";
import { story } from "@/data/content";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { Reveal } from "@/components/ui/Reveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollScrub } from "@/hooks/useScrollScrub";
import { gsap } from "@/lib/gsap";

/** The house ease and slow duration. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DURATION = 0.9;

/** Peak ghost displacement in px — one glyph rises by it as the other falls. */
const GHOST_TRAVEL = 60;

/** next/image sizing: full bleed on mobile, half the content frame on desktop. */
const ERA_SIZES = "(max-width: 767px) calc(100vw - 40px), (max-width: 1439px) 46vw, 616px";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ═══════════════ the flag plates — CSS/SVG only, never an emoji ═══════════════
   Both are drawn in the official 3:2 construction grid (30 x 20) so the
   proportions are the real ones rather than an approximation. */

/** Points for a five-pointed star: `rot` turns the leading point. */
function starPoints(cx0: number, cy0: number, r: number, rot: number): string {
  const inner = r * 0.382;
  const pts: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = rot + (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const b = a + Math.PI / 5;
    pts.push(`${(cx0 + r * Math.cos(a)).toFixed(3)},${(cy0 + r * Math.sin(a)).toFixed(3)}`);
    pts.push(`${(cx0 + inner * Math.cos(b)).toFixed(3)},${(cy0 + inner * Math.sin(b)).toFixed(3)}`);
  }
  return pts.join(" ");
}

const PRC_BIG = starPoints(5, 5, 3, 0);
/** The four small stars each turn a point toward the centre of the large one. */
const PRC_SMALL = ([
  [10, 2],
  [12, 4],
  [12, 7],
  [10, 9],
] as const).map(([x, y]) => starPoints(x, y, 1, Math.atan2(5 - y, 5 - x) + Math.PI / 2));

/** crimson is spent in exactly two places on this site; this is one of them. */
const PRC_RED = "#E01B24";
const PRC_GOLD = "#FFDE00";
const HINOMARU_FIELD = "#EDF1F5";

function PlateFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="relative aspect-[3/2] w-[clamp(112px,17vw,184px)] overflow-hidden border border-line-100">
      {children}
      {/* the plates sit in a dark room: knock the field back so nothing glares */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 block bg-[radial-gradient(120%_120%_at_50%_20%,transparent_35%,rgb(7_9_12/0.42)_100%)]"
      />
    </div>
  );
}

function PrcPlate(): React.ReactElement {
  return (
    <PlateFrame>
      <svg viewBox="0 0 30 20" aria-hidden className="block h-full w-full">
        <rect width="30" height="20" fill={PRC_RED} />
        <polygon points={PRC_BIG} fill={PRC_GOLD} />
        {PRC_SMALL.map((pts) => (
          <polygon key={pts} points={pts} fill={PRC_GOLD} />
        ))}
      </svg>
    </PlateFrame>
  );
}

function HinomaruPlate(): React.ReactElement {
  return (
    <PlateFrame>
      <svg viewBox="0 0 30 20" aria-hidden className="block h-full w-full">
        <rect width="30" height="20" fill={HINOMARU_FIELD} />
        <circle cx="15" cy="10" r="6" fill={PRC_RED} />
      </svg>
    </PlateFrame>
  );
}

/** One flag with its trilingual caption: micro label → JP name → latin sub. */
function FlagBlock({
  label,
  name,
  sub,
  plate,
}: {
  label: string;
  name: string;
  sub: string;
  plate: React.ReactElement;
}): React.ReactElement {
  return (
    <figure className="flex flex-col items-center gap-4 sm:gap-5">
      <Micro xs className="block text-text-dim!">
        {label}
      </Micro>
      {plate}
      <figcaption className="flex flex-col items-center gap-2">
        <span className="font-display text-[clamp(1.3rem,3.2vw,2.1rem)] uppercase leading-none tracking-[-0.005em] text-text-hi">
          {sub}
        </span>
        <span className="font-jp text-[15px] font-bold leading-none tracking-[0.06em] text-text-low">
          {name}
        </span>
      </figcaption>
    </figure>
  );
}

/* ═══════════════ one era card ═══════════════ */

function EraCard({
  era,
  index,
}: {
  era: (typeof story.eras)[number];
  index: number;
}): React.ReactElement {
  const reduced = useReducedMotion();
  const fromLeft = index % 2 === 0;
  const src = assets.story[index] ?? assets.story[0];
  const no = String(index + 1).padStart(2, "0");

  const className = cx(
    "flex flex-col",
    // clear of the spine: the left pair pulls back from it, the right pair off it
    fromLeft ? "md:pr-[clamp(20px,3vw,44px)]" : "md:pl-[clamp(20px,3vw,44px)]",
  );

  const body = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-900">
        <Image
          src={src}
          alt={`${era.year} — ${era.name} / ${era.jp}`}
          fill
          sizes={ERA_SIZES}
          className="object-cover"
        />
        <span aria-hidden className="scrim pointer-events-none absolute inset-0 block" />
        {/* the caption sits in the bottom-left of its OWN image */}
        <Micro xs className="absolute bottom-3 left-3 text-text-mid!">
          {`${no} / ${era.jp}`}
        </Micro>
      </div>

      <div className="mt-6 flex items-baseline gap-4 border-t border-line-100 pt-5">
        <Numeric className="shrink-0 text-[clamp(28px,3.4vw,44px)] leading-[0.82]" value={era.year} />
        <h3 className="font-display text-[clamp(1rem,1.7vw,1.375rem)] uppercase leading-[1.05] tracking-[0.02em] text-text-hi">
          {era.name}
        </h3>
      </div>

      <span className="mt-3 block font-jp text-[15px] font-bold leading-none tracking-[0.06em] text-text-low">
        {era.jp}
      </span>

      <p className="mt-4 max-w-[46ch] text-[13px] leading-[1.75] text-text-mid">{era.body}</p>
    </>
  );

  if (reduced) return <article className={className}>{body}</article>;

  return (
    <motion.article
      className={className}
      initial={{ opacity: 0, x: fromLeft ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: DURATION, delay: index * 0.08, ease: EASE }}
    >
      {body}
    </motion.article>
  );
}

/* ═══════════════ the section ═══════════════ */

type Setter = (value: number) => void;

export default function Story(): React.ReactElement {
  const trackRef = useRef<HTMLElement>(null);
  const ghostARef = useRef<HTMLSpanElement>(null);
  const ghostBRef = useRef<HTMLSpanElement>(null);

  // quickSetters are cached against the elements they were built for, so a
  // StrictMode remount rebuilds them instead of writing to a detached node.
  const setters = useRef<{ a: HTMLElement; b: HTMLElement; setA: Setter; setB: Setter } | null>(
    null,
  );

  const onScroll = useCallback((p: number) => {
    const a = ghostARef.current;
    const b = ghostBRef.current;
    if (!a || !b) return;

    let s = setters.current;
    if (!s || s.a !== a || s.b !== b) {
      s = {
        a,
        b,
        setA: gsap.quickSetter(a, "y", "px") as Setter,
        setB: gsap.quickSetter(b, "y", "px") as Setter,
      };
      setters.current = s;
    }

    // p 0→1 across the section: one glyph rises through ±60px as the other falls.
    const d = (p - 0.5) * 2 * GHOST_TRAVEL;
    s.setA(-d);
    s.setB(d);
  }, []);

  useScrollScrub(trackRef, onScroll, {
    start: "top bottom",
    end: "bottom top",
    scrub: 0.8,
    // reduced motion writes ONE progress and stops: 0.5 is zero displacement.
    reducedProgress: 0.5,
  });

  const [ghostA, ghostB] = story.ghost;

  return (
    <section
      id="story"
      ref={trackRef}
      className="relative isolate overflow-hidden bg-ink-800 py-[clamp(88px,13vh,168px)]"
    >
      {/* ── GHOST LAYER — scroll-owned, decorative, never read aloud ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 select-none">
        <span
          ref={ghostARef}
          className="absolute -left-[13vw] top-[2vw] block font-mincho text-[40vw] leading-[0.78] text-text-hi opacity-[0.04] will-change-transform"
        >
          {ghostA}
        </span>
        <span
          ref={ghostBRef}
          className="absolute -right-[11vw] bottom-[-6vw] block font-mincho text-[40vw] leading-[0.78] text-text-hi opacity-[0.04] will-change-transform"
        >
          {ghostB}
        </span>
      </div>

      {/* ── INSTRUMENT FRAME — viewport-flush, ignores the container ── */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 right-[4.8vw] top-0 z-10 block h-px bg-line-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 select-none xl:block"
      >
        <span className="micro-xs block rotate-180 text-text-dim! [writing-mode:vertical-rl]">
          {story.latin}
        </span>
      </span>

      <div className="frame-content relative z-10">
        {/* ── THE CREST — the section that is allowed to be centred ── */}
        <Reveal className="flex flex-col items-center text-center">
          <Micro className="block">{story.kicker}</Micro>

          <span className="slashes mt-6 block text-[clamp(1.5rem,3vw,2.25rem)] leading-none">
            {`// ${story.no}.`}
          </span>

          <h2 className="mt-4 font-display text-[clamp(3.25rem,10vw,8rem)] uppercase leading-[0.86] tracking-[-0.01em] text-text-hi">
            {story.latin}
          </h2>

          <p className="mt-5 font-mincho text-[clamp(1.1rem,2.4vw,1.6rem)] font-bold leading-none tracking-[0.08em] text-text-low">
            {story.jp}
          </p>
        </Reveal>

        {/* ── THE TWO FLAGS, 丼 between them ── */}
        <Reveal
          delay={0.08}
          className="mt-[clamp(48px,7vh,88px)] flex items-center justify-center gap-[clamp(18px,4vw,56px)]"
        >
          <FlagBlock
            label={story.flags.cn.label}
            name={story.flags.cn.name}
            sub={story.flags.cn.sub}
            plate={<PrcPlate />}
          />

          <div className="flex shrink-0 flex-col items-center gap-3 pt-6">
            <span aria-hidden className="block h-8 w-px bg-line-100 sm:h-10" />
            <span className="select-none font-mincho text-[clamp(1.75rem,4.4vw,3rem)] font-bold leading-none text-text-mid">
              {story.flags.between}
            </span>
            <span aria-hidden className="block h-8 w-px bg-line-100 sm:h-10" />
          </div>

          <FlagBlock
            label={story.flags.jp.label}
            name={story.flags.jp.name}
            sub={story.flags.jp.sub}
            plate={<HinomaruPlate />}
          />
        </Reveal>

        {/* ── THE TWO CAPTION LINES ── */}
        <Reveal delay={0.16} className="mx-auto mt-[clamp(36px,5vh,64px)] max-w-[62ch] text-center">
          <p className="text-[clamp(14px,1.35vw,17px)] leading-[1.8] text-text-mid">
            {story.caption[0]}
          </p>
          <p className="mt-3 text-[clamp(13px,1.2vw,15px)] leading-[1.8] text-text-low">
            {story.caption[1]}
          </p>
        </Reveal>

        {/* ── THE FOUR ERAS — 2x2 split by a 1px spine ── */}
        <div className="relative mt-[clamp(64px,10vh,128px)] grid grid-cols-1 gap-y-[clamp(48px,7vh,80px)] md:grid-cols-2">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px bg-line-100 md:block"
          />
          {story.eras.map((era, i) => (
            <EraCard key={era.year} era={era} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

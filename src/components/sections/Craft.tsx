"use client";

/**
 * // 06 匠の技 THE CRAFT — the pinned horizontal scroll.
 *
 * This is the ONE place on the site where a real ScrollTrigger pin is correct.
 * Everywhere else a sticky track reserves the distance and the trigger only reads
 * progress; here the row's travel is `row.scrollWidth - stage.clientWidth`, which
 * cannot be expressed as a CSS height and has to be measured after layout. So:
 * pin:true + pinSpacing:true on the section itself, no manual height wrapper, and
 * `end` re-evaluated on every refresh (invalidateOnRefresh) so a resize re-measures
 * both the distance scrolled and the distance travelled.
 *
 * MOBILE (<768px) and ANY WIDTH UNDER REDUCED MOTION get no pin at all: the same
 * markup becomes a native overflow-x carousel with scroll-snap. The two regimes are
 * split with gsap.matchMedia(), so crossing the breakpoint kills the trigger and
 * builds the listener (and vice versa) instead of leaving a stale pin behind.
 *
 * Nothing here touches React state. The ruler fill and the panel readout are both
 * functions of scroll, so they are written straight to the DOM — a quickSetter for
 * the fill, textContent for the numeral, and both are guarded so they only write
 * when the value actually changes.
 */

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { assets } from "@/data/assets";
import { craft } from "@/data/content";
import { LazyVideo } from "@/components/ui/LazyVideo";
import { Micro } from "@/components/ui/Micro";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { retainRefreshDiscipline } from "@/hooks/useScrollScrub";
import { CRAFT_SPAN_MULTIPLIER } from "@/lib/scroll-config";

const PANELS = craft.panels;
const CLIPS = [assets.video.craft01, assets.video.craft02, assets.video.craft03];
const TOTAL = String(PANELS.length).padStart(2, "0");

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const pad = (n: number): string => String(n).padStart(2, "0");

export default function Craft(): React.ReactElement {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const idxRef = useRef<HTMLSpanElement | null>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      const row = rowRef.current;
      if (!section || !stage || !row) return;

      /* Measurements are cached and refreshed on demand: reading clientWidth or
         scrollWidth inside the update would force a layout every frame. */
      let viewW = stage.clientWidth;
      let panelW = viewW;
      let travel = 0;
      let lastIdx = -1;

      const fill = fillRef.current;
      const setFill = fill ? gsap.quickSetter(fill, "scaleX") : null;
      if (fill) gsap.set(fill, { transformOrigin: "left center", scaleX: 0 });

      const measure = (): void => {
        viewW = stage.clientWidth;
        const first = row.firstElementChild as HTMLElement | null;
        panelW = first?.offsetWidth || viewW;
        travel = Math.max(0, row.scrollWidth - viewW);
      };

      /** `offset` = how far the row has travelled left, in px. DOM writes only. */
      const paint = (offset: number): void => {
        setFill?.(travel > 0 ? clamp01(offset / travel) : 0);

        // Whichever panel owns the centre of the stage is the current one.
        const raw = panelW > 0 ? Math.floor((offset + viewW / 2) / panelW) : 0;
        const i = Math.min(PANELS.length - 1, Math.max(0, raw));
        if (i === lastIdx) return;
        lastIdx = i;
        const el = idxRef.current;
        if (el) el.textContent = pad(i + 1);
      };

      /** The row's own translate, read from GSAP's cache rather than the DOM. */
      const travelled = (): number => -Number(gsap.getProperty(row, "x"));

      const release = retainRefreshDiscipline();
      const mm = gsap.matchMedia();

      mm.add(
        {
          pinned: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          carousel: "(max-width: 767.98px), (prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          /* ── desktop: the real pin ───────────────────────────────────────── */
          if (ctx.conditions?.pinned) {
            row.style.willChange = "transform";
            measure();
            paint(0);

            gsap.to(row, {
              // Function-based so invalidateOnRefresh re-measures after a resize.
              x: () => -Math.max(0, row.scrollWidth - stage.clientWidth),
              ease: "none",
              // The tween is the scrubbed value, so the readouts follow the eased
              // position of the row rather than the raw scroll ratio.
              onUpdate: () => paint(travelled()),
              scrollTrigger: {
                trigger: section,
                start: "top top",
                // panels.length × 100vw of scroll, re-read on every refresh.
                end: () =>
                  "+=" + PANELS.length * window.innerWidth * CRAFT_SPAN_MULTIPLIER,
                pin: true,
                pinSpacing: true,
                scrub: 1,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onRefresh: () => {
                  measure();
                  paint(travelled());
                },
              },
            });

            return () => {
              row.style.willChange = "";
              gsap.set(row, { clearProps: "transform" });
            };
          }

          /* ── carousel: no pin, native scroll-snap ────────────────────────── */
          // Forced inline because the desktop breakpoint hides overflow in CSS,
          // and reduced motion lands here at desktop widths too.
          stage.style.overflowX = "auto";
          measure();
          paint(stage.scrollLeft);

          const onScroll = (): void => paint(stage.scrollLeft);
          const onResize = (): void => {
            measure();
            paint(stage.scrollLeft);
          };
          stage.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onResize, { passive: true });

          return () => {
            stage.style.overflowX = "";
            stage.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
          };
        },
      );

      return () => {
        mm.revert();
        release();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section id="craft" ref={sectionRef} className="relative bg-ink-900 py-14 md:h-[100dvh] md:py-0">
      <div className="relative h-[78dvh] min-h-[440px] w-full md:h-full">
        {/* The scroller. GSAP translates the row above 768px; below it, this box
            is the thing the finger drags. */}
        <div
          ref={stageRef}
          className="h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] md:overflow-x-hidden [&::-webkit-scrollbar]:hidden"
        >
          <div ref={rowRef} className="flex h-full w-max">
            {PANELS.map((panel, i) => {
              const clip = CLIPS[i] ?? CLIPS[0];
              return (
                <article
                  key={panel.no}
                  className="relative h-full w-[85vw] shrink-0 snap-start snap-always overflow-hidden md:w-[72vw]"
                >
                  <LazyVideo
                    src={clip.src}
                    poster={clip.poster}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div aria-hidden className="scrim pointer-events-none absolute inset-0" />

                  {/* the hairline between panels */}
                  {i > 0 ? (
                    <span aria-hidden className="absolute inset-y-0 left-0 z-20 w-px bg-line-100" />
                  ) : null}

                  {/* meta hugs the top-right of its own frame */}
                  <div className="absolute right-6 top-6 z-20 md:right-9 md:top-8">
                    <Micro xs className="text-text-mid!">{`${panel.no} / ${TOTAL}`}</Micro>
                  </div>

                  {/* the numeral, bottom-right, display face, outlined not filled —
                      the amber budget in this section belongs to the ruler */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-12 right-5 z-10 font-display text-[clamp(4.5rem,11vw,9rem)] leading-[0.72] tracking-[-0.02em] text-transparent md:bottom-16 md:right-9"
                    style={{ WebkitTextStroke: "1px rgb(255 255 255 / 0.3)" }}
                  >
                    {panel.no}
                  </span>

                  {/* the caption, bottom-left of its own image */}
                  <div className="absolute bottom-0 left-0 z-20 w-full px-6 pb-14 md:px-9 md:pb-20">
                    <Reveal>
                      <h3 className="font-display text-[clamp(1.7rem,3.4vw,2.9rem)] uppercase leading-[0.92] tracking-[-0.01em] text-text-hi">
                        {panel.name}
                      </h3>
                    </Reveal>
                    <Reveal delay={0.07}>
                      <p className="mt-3 font-jp text-[15px] font-bold leading-none tracking-[0.06em] text-text-low">
                        {panel.jp}
                      </p>
                    </Reveal>
                    <Reveal delay={0.14}>
                      <p className="mt-4 max-w-[38ch] text-[13px] leading-[1.65] text-text-mid md:text-[14px]">
                        {panel.body}
                      </p>
                    </Reveal>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ── INSTRUMENT FRAME ─────────────────────────────────────────────────
            Both of these ignore the content container: 12px left inset, 4.8vw
            right inset, hung off the stage rather than the row, so they hold
            still while the panels travel underneath. */}
        <div className="pointer-events-none absolute left-3 top-[92px] z-30 md:top-[124px]">
          <Reveal>
            <SectionHeader no={craft.no} jp={craft.jp} latin={craft.latin} kicker={craft.kicker} />
          </Reveal>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center gap-4 pb-4 pl-3 pr-[4.8vw] md:pb-6">
          <div className="flex items-baseline gap-1.5">
            <span ref={idxRef} className="numeric text-[15px] leading-none">
              01
            </span>
            <Micro xs>{`/ ${TOTAL}`}</Micro>
          </div>

          <div className="relative h-px flex-1 bg-line-100">
            {PANELS.map((panel, i) => (
              <span
                key={panel.no}
                aria-hidden
                className="absolute top-full h-[5px] w-px bg-line-200"
                style={{ left: `${(i / (PANELS.length - 1)) * 100}%` }}
              />
            ))}
            {/* the ruler fill — one of the closed list of amber things.
                Ships at scaleX(0) so there is no full-width flash before hydration. */}
            <span
              ref={fillRef}
              aria-hidden
              className="absolute inset-y-0 left-0 w-full bg-amber-400"
              style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

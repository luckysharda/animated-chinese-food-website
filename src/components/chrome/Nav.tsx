"use client";

import { useEffect, useRef } from "react";
import { nav, site } from "@/data/content";

const NAV_H = 56;

/** "UMAMI // RAMEN" → ["UMAMI", "RAMEN"] so the // can carry the house device. */
const [latinLeft, latinRight] = site.latin.split("//").map((s) => s.trim());

/**
 * Nav — instrument frame, 12px left inset / 4.8vw right inset, 56px tall.
 * Fully transparent over the hero for the first 100vh, then a tint layer
 * fades in. Both the tint and the active-link state are written straight to
 * the DOM: neither is allowed to re-render React on scroll.
 */
export default function Nav(): React.ReactElement {
  const rootRef = useRef<HTMLElement | null>(null);
  const tintRef = useRef<HTMLDivElement | null>(null);

  /* ── tint: transparent over the hero, solid after it ── */
  useEffect(() => {
    const tint = tintRef.current;
    if (!tint) return;
    let solid: boolean | null = null;

    const update = () => {
      const next = window.scrollY > window.innerHeight - NAV_H;
      if (next === solid) return;
      solid = next;
      tint.style.opacity = next ? "1" : "0";
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  /* ── active link: IntersectionObserver on the section ids ── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const links = Array.from(
      root.querySelectorAll<HTMLAnchorElement>("[data-nav-id]"),
    );
    const ratios = new Map<string, number>();

    const paint = () => {
      let best = "";
      let bestRatio = 0;
      ratios.forEach((r, id) => {
        if (r > bestRatio) {
          bestRatio = r;
          best = id;
        }
      });
      for (const link of links) {
        link.dataset.active = String(link.dataset.navId === best && best !== "");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        paint();
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.02, 0.2, 0.6, 1] },
    );

    /* Sections stream in from nine other components; sweep a few times. */
    const observeAll = () => {
      for (const item of nav) {
        const el = document.getElementById(item.href.slice(1));
        if (el) io.observe(el);
      }
    };
    observeAll();
    const timers = [400, 1200, 2600].map((t) => window.setTimeout(observeAll, t));

    return () => {
      timers.forEach(window.clearTimeout);
      io.disconnect();
    };
  }, []);

  return (
    <header
      ref={rootRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-14"
    >
      {/* tint plate — opacity is driven from the scroll listener above */}
      <div
        ref={tintRef}
        aria-hidden
        className="absolute inset-0 border-b border-line-100 bg-ink-900/70 backdrop-blur-md transition-opacity duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ opacity: 0 }}
      />

      {/* ── left mark: instrument inset, 12px ── */}
      <div className="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col leading-none">
        <span className="font-jp text-[15px] font-bold tracking-[0.14em] text-text-hi">
          {site.jp}
        </span>
        <span className="micro-xs mt-[3px] text-text-low">
          {latinLeft} <span className="slashes text-[8px]">{"//"}</span>{" "}
          {latinRight}
        </span>
      </div>

      {/* ── centre: the seven numbered links ── */}
      <nav
        aria-label="Sections"
        className="absolute left-1/2 top-0 hidden h-full -translate-x-1/2 items-center gap-6 lg:flex xl:gap-8"
      >
        {nav.map((item) => (
          <a
            key={item.no}
            href={item.href}
            data-nav-id={item.href.slice(1)}
            data-active="false"
            className="micro pointer-events-auto whitespace-nowrap text-text-low transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-text-hi! data-[active=true]:text-amber-400!"
          >
            <span className="mr-1.5 tabular-nums opacity-55">{item.no}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* ── right: MENU, ending at the 4.8vw inset ── */}
      <a
        href="#lineup"
        className="pointer-events-auto absolute right-[4.8vw] top-1/2 flex -translate-y-1/2 items-center gap-2.5 text-text-mid transition-colors duration-[180ms] hover:text-text-hi"
      >
        <span className="micro text-current!">MENU</span>
        <span aria-hidden className="flex flex-col items-end gap-[3px]">
          <i className="block h-px w-4 bg-line-200" />
          <i className="block h-px w-2.5 bg-line-200" />
        </span>
      </a>
    </header>
  );
}

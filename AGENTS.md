# AGENTS.md

Working agreement for any coding agent in this repository. Tool-agnostic; `CLAUDE.md`
imports this file rather than restating it, so **edit this one** and both stay in step.

UMAMI // 拉麵 is a scroll-choreographed single-page site for a fictional
Chinese-Japanese ramen shop in Yokohama. There is no business behind it, no real menu
and no reservation system. It is a demonstration piece: an argument about how a
scroll-driven page should be built, made in code rather than in a deck. Treat the
discipline below as the product — a change that ships the feature but breaks a rule
here has not landed.

---

## Commands

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # production build (also typechecks)
npm run build:static   # BUILD_TARGET=static -> out/, for Cloudflare Pages
npm run start
npm run lint
npx tsc --noEmit       # fails in seconds where `next build` takes minutes
```

Asset pipelines. Every output is committed, so a fresh clone runs without ffmpeg.
Only run these when you mean to regenerate:

```bash
npm run hero                          # hero scrub sequence <- assets-src/hero-source.mp4
npm run hero -- /path/clip.mp4        # …from any other clip
npm run hero -- clip.mp4 --no-delogo  # …one with no generator watermark
npm run place-images                  # every other slot <- assets-src/photos + crop-manifest.json
npm run assets                        # placeholder imagery (skips slots real photography owns)
```

**Before you claim a change works:** `npx tsc --noEmit && npm run lint && npm run build`.
Anything touching the scrub also needs a look in a browser — none of the above can see
a hero that stutters.

---

## Stack

| | |
|---|---|
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict |
| Styling | Tailwind v4 — tokens and utilities in `src/app/globals.css`, **no config file** |
| Scroll | Lenis 1.3 (owns scroll position) + GSAP 3.15 ScrollTrigger (reads progress) |
| State animation | `motion` 13, imported from `motion/react` |
| 3D | three 0.185 + `@react-three/fiber` 9 + `@react-three/drei` 10 |
| Type | Anton, Noto Sans JP, Shippori Mincho, JetBrains Mono via `next/font/google` |

The route is statically prerendered (`○ Static`). Nothing reads `headers()`,
`cookies()` or `searchParams` — those calls would force it dynamic and break
`build:static`. Keep it that way.

---

## The rules that are not negotiable

These are the reason the repo exists. Each one is enforced by convention, not by a
linter, so it is on you.

1. **No scroll-derived value ever enters React state.** A scrub fires ~60×/s; one
   `setState` in that path takes the whole page down. Scroll values are written
   straight to the DOM — `el.style`, `el.textContent`, a CSS custom property — from
   inside the GSAP callback. The single sanctioned exception in the hero is one
   boolean, flipped once, that mounts the 3D bowl before it is needed.

2. **GSAP owns scroll. `motion` owns state.** A `motion` component must never appear
   under a scrub, and a scrubbed value must never be handed to `motion`. Mixing them
   is what makes scroll sites feel unowned.

3. **Pinning is CSS `sticky` on a track, never `ScrollTrigger`'s `pin`.** The pattern
   is a tall `<section>` (the track) wrapping a `h-[100dvh] sticky top-0` child (the
   stage). The ScrollTrigger only *reads* progress. Adding `pin` double-counts the
   distance the section occupies. `useScrollScrub` exists to enforce this shape.

4. **One clock per section.** Derive progress once per frame into a single mutable
   tick object and hand it to imperative children through refs. Do not let four
   components each subscribe to scroll.

5. **Reduced motion ships in the same file as the animation it disables.** Never
   "later". `useScrollScrub` writes one static progress and builds no trigger at all;
   every component that animates has to answer for what it looks like frozen.

6. **Every string and every asset path comes from a data file.** Copy lives in
   `src/data/content.ts`, paths in `src/data/assets.ts`. Swap imagery by replacing
   files in `/public`, never by editing a component.

7. **Amber is metered.** `--color-amber-400` never exceeds ~1.5% of the pixels in a
   viewport, and the list of things allowed to carry it is closed — the `//` device,
   numerals, selected state, and exactly one CTA per section. `crimson` has exactly
   two uses site-wide. See `DESIGN.md` before introducing colour.

8. **Say what is true.** Comments in this repo carry measurements, not intentions
   ("measured: median luminance 44–95 → 12–45"). If you change the thing a comment
   measures, re-measure it. Captions describe what is actually in the photograph —
   the copy was moved to match the pictures rather than cropping a lookalike, and
   that trade stays.

---

## Layout

```
src/app/          layout.tsx (server, static) · page.tsx (section order) · globals.css (all tokens)
src/components/
  hero/           the 750dvh hero: Hero, HeroCanvas, HeroCaptionDeck, HeroIdentity,
                  HeroInstrumentBar, HeroRuler, config.ts
  hero3d/         the three.js exploded bowl — off by default, see WEBGL_CLIMAX
  chrome/         the fixed instrument layer (nav, rails, telemetry, readouts)
  sections/       // 01 Lineup … // 09 Footer, one file each
  ui/             shared primitives — Micro, Numeric, Reveal, LazyVideo, BracketFrame…
src/data/         content.ts (every string) · assets.ts (every path)
src/hooks/        useScrollScrub, useDocumentProgress, useCountUp, useReducedMotion
src/lib/          gsap.ts (registration) · lenis.tsx (SmoothScroll provider) ·
                  flags.ts (registry) · scroll-config.ts (every speed lever)
scripts/          the three asset pipelines
assets-src/       committed source media — hero-source.mp4, photos/, crop-manifest.json
```

`src/lib/scroll-config.ts` is the single place for "it scrolls too fast". `WHEEL_SPEED`
changes how the page feels under your hand; the `*_TRACK_VH` lengths change how much
scrolling a section's choreography is spread over. Do not reach for either from a
component.

---

## The hero, in detail

It is the most constrained thing here and the easiest to break.

- A **750dvh track** (`HERO_TRACK_VH`) with a 100dvh sticky stage and exactly one
  ScrollTrigger.
- The plate is a **120-frame canvas scrub**, not a `<video>`: driving
  `video.currentTime` from scroll is unreliable in Safari and janky on mobile. Frames
  are preloaded in full before the sequence is allowed to paint, with a real 00–100%
  loader rather than a hidden wait. `HERO_FRAME_COUNT` is 120 and `HeroCanvas` indexes
  1…120 — that number is a contract between `assets.ts`, `HeroCanvas`, `Hero` and
  `scripts/hero-from-video.mjs`.
- Payloads: 120 frames (~10.4MB) desktop, every 4th frame + the last (~2.6MB) under
  768px, exactly one frame under `prefers-reduced-motion`.
- **Two gutters, and a dead middle.** Left 0.8%→21%, right 81%→95.2%. Between them
  there is nothing but the food, ever. Nothing in either gutter translates, scales or
  parallaxes — opacity is the only property that animates for the whole pin.
- **Card changes always pass through zero.** A fast scrub must never cross-dissolve
  two caption cards into a smear.
- The caption deck's blank windows are **tuned to the footage's real cut points**
  (`hero.cuts` in `src/data/content.ts`), so the picture never changes under a card
  that is mid-read. **If you replace the hero footage you must re-measure the cuts and
  re-tune the windows** — `hero.cards[].from/to`, `BLOCK_FADE_FROM`/`BLOCK_FADE_TO` in
  `HeroCaptionDeck.tsx`, and `reducedProgress` in `Hero.tsx`, which has to land inside
  the reprise while the gutter is still up.

---

## Feature flags

`src/lib/flags.ts`. `FLAG_DEFAULTS` is the entire schema — adding a flag is one line
there; the key union, value types, override validation and console helper all derive
from it.

Resolution order: `NEXT_PUBLIC_FLAG_OVERRIDES` (JSON) → `localStorage` → registry
default. Every layer is client-only and gated behind a hydration flag, because the
site is statically prerendered and a flag that changed markup on the first client
render would tear hydration.

- `useFlag()` in render bodies — it goes through `useSyncExternalStore` with a
  `getServerSnapshot` pinned to the default.
- `getFlag()` in GSAP setup, effects and event handlers. **Never in a render body.**
- A flag read from inside a per-frame scrub callback cannot use either; see the live
  binding in `src/components/hero/config.ts` for the sanctioned pattern.

---

## Traps that have already cost time

- **`next/image` serves stale optimizations.** Its cache under `.next/cache/images` is
  keyed by source *URL*, not by file contents, so replacing a file in `/public`
  without changing its path leaves the browser being served the old copy — which looks
  exactly like the script having done nothing. Every asset script clears that cache as
  its last step. If you write a new one, do the same.
- **`npm run assets` can overwrite real photography.** It now reads
  `crop-manifest.json` and skips every slot photography owns, and skips the hero
  whenever a real 120-frame sequence is present. Do not remove those guards.
- **`ScrollTrigger.refresh()` is document-wide.** It must be installed once for the
  page, not once per section — `retainRefreshDiscipline()` in `useScrollScrub.ts`
  ref-counts the shared listeners. Fonts change text metrics, which change document
  height, which changes every measured start/end, so `document.fonts.ready` triggers
  one refresh per load.
- **A bare ScrollTrigger's `self.progress` is unsmoothed.** `scrub` only smooths an
  *attached* animation, which is why `useScrollScrub` scrubs a proxy tween and reports
  the tween's eased value.

---

## Conventions

- TypeScript strict. Components are typed `React.ReactElement`; imperative children
  expose a `{ update(t): void }` handle through `useImperativeHandle`.
- React 19 ref-as-prop (`ref?: React.Ref<T>`), not `forwardRef`.
- Tailwind utilities only; no CSS modules, no styled-components. Shared devices are
  `@utility` blocks in `globals.css` (`micro`, `numeric`, `slashes`, `scrim`…).
- Comments explain **why**, and carry the measurement that justifies the number.
  Match the surrounding density — this codebase is heavily commented on purpose.
- `dvh`, not `vh`, for anything full-height.

## Scope

Do what was asked and finish it, including the parts downstream of the ask — swapping
the hero footage means re-measuring the cuts, not just replacing the file. Do not add
tests, changelogs, formatting passes or dependencies that were not requested. Commit
only when asked; never push to `main`.

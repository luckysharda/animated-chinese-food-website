# UMAMI // 拉麵 — Born From Two Worlds

A scroll-choreographed single-page site for **a fictional Chinese-Japanese ramen shop in
Yokohama**. There is no real business behind it, no real menu and no real reservation
system — it is a **demonstration piece**: an argument about how a scroll-driven page should
be built, made in code rather than in a deck.

The thing it demonstrates is a specific discipline. Scroll-derived values are owned by GSAP
and are written straight to the DOM. State-derived values are owned by `motion` and never
appear under a scrub. Pinning is done with sticky CSS tracks, not `ScrollTrigger`'s `pin`.
Every string and every asset path comes from two data files. Reduced motion ships in the
same file as the animation it disables, never "later".

---

## Stack

| | |
|---|---|
| Framework | Next.js 15.5 (App Router), React 19, TypeScript |
| Styling | Tailwind v4 — tokens and custom utilities in `src/app/globals.css`, no config file |
| Scroll | Lenis 1.3 for smooth scroll, GSAP 3.15 + `@gsap/react` (ScrollTrigger) for scrub |
| State animation | `motion` 13 (imported from `motion/react`) |
| 3D | three 0.185 + `@react-three/fiber` 9 + `@react-three/drei` 10 |
| Type | Anton, Noto Sans JP, Shippori Mincho, JetBrains Mono via `next/font/google` |

Everything the hero's 3D scene draws is lathed, extruded or instanced from primitives at
runtime. There is no `.glb`, no HDRI, no texture fetch.

---

## Running it

```bash
npm install
npm run dev         # http://localhost:3000
```

Every asset is committed, so a fresh clone runs without ffmpeg. Two scripts rebuild
them if you want to:

```bash
npm run hero        # rebuild the hero scrub sequence from assets-src/hero-source.mp4
npm run assets      # regenerate the placeholder imagery for everything else
```

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint
npx tsc --noEmit    # typecheck
```

---

## ASSETS

### The hero is real footage

`assets-src/hero-source.mp4` is a 10s, 24fps clip of a chef building a bowl. It is
exploded into the hero's scrub sequence by `npm run hero`:

```
npm run hero                       # rebuild from assets-src/hero-source.mp4
npm run hero -- /path/to/clip.mp4  # or from any other clip
```

That script does three things worth knowing about:

- **Watermark removal.** The generator that produced the clip stamps a stationary
  four-point sparkle in the lower right. `delogo` interpolates it away from the box
  border, which is invisible against the dark stone behind it. It runs at source
  resolution, before any scaling.
- **A grade.** The footage is lit brighter than this site is. The brief is a cold
  room with a single warm pool on the food, so the grade pulls the midtones down,
  pushes a little blue into the shadows, and leaves the highlights on the bowl
  alone. Measured: median luminance 44–95 → 12–45, with p95 held around 150.
- **120 frames at 1600×900**, JPEG q6 — about 84KB each, 10.3MB for the set. q6 is
  indistinguishable from q4 at 2× zoom on this footage and 22% smaller.

**The cut points are real.** ffmpeg's scene filter puts them at p 0.163 / 0.304 /
0.446 / 0.754, and the caption deck's blank windows are tuned so that every cut
lands while the left gutter is empty. The last cut, at 0.754, is the clip's own
exploded-view shot — chashu, ajitama, nori, a noodle nest and broth droplets
suspended over the bowl. That is the hero's climax, and it is why the three.js
bowl is off by default (see `WEBGL_CLIMAX` in `src/components/hero/config.ts`).

**Payload by environment**, verified in headless Chrome:

| | frames fetched | approx |
|---|---|---|
| desktop | 120 | 10.3MB |
| narrow (<768px) | 31 | ~2.6MB — every 4th frame, plus the final one |
| `prefers-reduced-motion` | 1 | 84KB — the end state, no scrub built |

### Everything else is real photography too

19 source photographs live in `assets-src/photos/` (7.8MB, committed, so the pipeline
runs from a fresh clone). `assets-src/crop-manifest.json` maps each target slot to a
source and a normalized crop rectangle, and `npm run place-images` renders them:

```
npm run place-images   # crop -> delogo -> grade -> resize, and build the video clips
```

Per slot it crops at source resolution, removes the generators' four-point sparkle
watermark with `delogo` when the rectangle contains it, applies a light grade so the
stills sit with the hero footage, and resizes to the slot's exact pixel size. The five
video slots are rendered as slow Ken Burns push-ins from a still, so `// 04` and `// 06`
keep their motion without needing footage.

**The captions describe what is actually in frame.** The photo set contains chashu,
ajitama, nori, scallion and noodles — but no corn, narutomaki, menma or chilli oil, and
no red chilli bowl. Rather than crop a lookalike, the copy moved to match the pictures:
the second lineup bowl is KOTTERI MISO rather than MALA TANTAN, two topping chips became
KAEDAMA and EXTRA BROTH, and two ingredient cells became THE SIMMER and THE STRAIN. The
story cards keep their years and their facts; only the headline nouns changed, because
none of the photographs is actually Rairaiken or the Shin-Yokohama museum.

### Two ways the asset scripts used to destroy work, and no longer can

Both are silent failures — nothing errors, the files simply become wrong.

1. **`npm run assets` overwriting real imagery.** It generates placeholders into the same
   paths. It now reads `crop-manifest.json` and skips every slot photography owns, and
   skips the hero whenever a real 120-frame sequence is present.
2. **`next/image` serving stale optimizations.** Its cache under `.next/cache/images` is
   keyed by source *URL*, not by file contents — so replacing a file in `/public` without
   changing its path leaves the browser being served the old optimized copy, which looks
   exactly like the script having done nothing. Every asset script now clears that cache
   as its last step.

## Scroll speed

Every lever lives in `src/lib/scroll-config.ts`. "It scrolls too fast" is two
different complaints with two different fixes, and they compose:

| Constant | What it changes | Current |
|---|---|---|
| `WHEEL_SPEED` | how far one wheel notch travels. 1 = browser default | `0.7` |
| `SCROLL_LERP` | Lenis glide weight, lower = heavier settle | `0.085` |
| `HERO_TRACK_VH` | scroll the hero's 120 frames are spread across | `750` |
| `SIMMER_TRACK_VH` | scroll `// 04`'s 00H->16H counter is spread across | `480` |
| `CRAFT_SPAN_MULTIPLIER` | sideways travel per panel in `// 06` | `1.6` |

Measured at 1512x900: one 100px wheel notch moves the page 70px; the hero scrubs
across 6.5 viewports at 49px per frame; the simmer across 3.8 viewports at 214px
per hour; the document is 32 viewports tall.

Want it faster again? Raise `WHEEL_SPEED` toward 1 first — that is the one that
changes how the page feels under your hand without touching the choreography.
Shorten the tracks only if a *section* is dragging.

## Scroll architecture

Three rules, and the whole site is an application of them.

### 1. Sticky tracks, not ScrollTrigger pins

A pinned stage is built as a tall **track** with a `sticky` **stage** inside it. The track's
height reserves the scroll distance; CSS holds the stage still. The ScrollTrigger only
**reads** progress — it has no `pin` property, because adding one on top of the sticky child
double-counts the distance.

```tsx
<section ref={track} className="relative h-[500dvh]">        {/* the track */}
  <div className="sticky top-0 h-[100dvh] overflow-hidden">  {/* the stage */}
```

```ts
{ trigger: track, start: "top top", end: "bottom bottom", scrub: 0.6 }   // no pin
```

`src/hooks/useScrollScrub.ts` wraps this. It also fixes a subtlety: a bare ScrollTrigger's
`self.progress` is the raw, unsmoothed scroll ratio — `scrub` only smooths an *attached*
animation — so the hook scrubs a proxy tween and reports the tween's eased value, which is
what makes a sticky stage feel weighted instead of glued to the wheel.

Track lengths as built: hero `500dvh`, `// 04` simmer `300dvh`, `// 07` story scrubs at `0.8`.

**The one exception** is `// 06` The Craft, the horizontal pinned section. Its travel is
`row.scrollWidth - stage.clientWidth`, which cannot be expressed as a CSS height and has to be
measured after layout — so it uses a real `pin: true` + `pinSpacing: true` with
`invalidateOnRefresh`. Under 768px, and at any width under reduced motion, the pin is not built
at all and the same markup becomes a native `overflow-x` carousel with scroll-snap.

### 2. GSAP owns scroll. It never touches React state.

A value that is a function of scroll position is written **straight to the DOM** inside the
ScrollTrigger update — `gsap.quickSetter`, `el.textContent`, a ref. It never calls `setState`.
`setState` in a scrub `onUpdate` re-renders at 60fps and the page falls over.

The hero is the clearest case: progress is derived exactly once per frame into a single mutable
tick object (`frame`, `temp`, `steam`, `chapter`) and handed to four imperative children that
write it to the DOM through ref handles. Across the entire hero scrub there is exactly one
React state change — a boolean, flipped once, that mounts the 3D bowl before it is needed.

### 3. motion owns state. It never appears under a scrub.

Selection, hover, `AnimatePresence`, the form-to-receipt swap — all `motion`, all driven by
React state. `// 02` Build Your Ramen and `// 08` Order contain no GSAP at all. The one
crossover is the running total in the configurator: it is state-derived but has to interpolate
at 60fps, so it uses motion's imperative `animate()` writing into a text node via `textContent`,
and React renders that span exactly once.

### Lenis, and the single frame loop

`src/lib/lenis.tsx` keeps three layers distinct:

1. **Lenis owns the scroll position.** It scrolls the real window — no transformed wrapper — so
   `window.scrollY` stays truthful and ScrollTrigger's normal viewport path is correct. There is
   deliberately no `scrollerProxy`; adding one "for safety" double-reports positions.
2. **`gsap.ticker` owns the frame loop.** Lenis runs with `autoRaf: false` and its `raf` is
   called from the GSAP ticker, so there is exactly one rAF on the page. `lagSmoothing` is off
   for the provider's lifetime — GSAP's lag smoothing skips time after a long frame, which
   desyncs Lenis from every scrub.
3. **ScrollTrigger reads that position**, once per scroll event.

Never call `ScrollTrigger.normalizeScroll(true)` alongside this. GSAP and its plugins are
registered in exactly one place, `src/lib/gsap.ts`, and imported from there by every other file.

`ScrollTrigger.refresh()` re-measures every trigger on the page, so it is installed once for the
document rather than once per section — `retainRefreshDiscipline()` in `useScrollScrub.ts` is
ref-counted and shares one `document.fonts.ready` listener and one debounced resize listener
across all ten sections. Fonts matter here: Anton and the JP faces land well after paint, they
change text metrics, metrics change document height, and height invalidates every start/end
measured before the swap.

### Reduced motion

`useReducedMotion()` is a `useSyncExternalStore` over the media query — SSR-safe, and live, so
toggling the OS setting updates the page without a reload. `prefersReducedMotion()` is the same
answer outside React, for reading at the moment a GSAP animation is built.

The rule is that the reduced-motion path ships **in the same file** as the animation, and renders
the **end state** statically. `useScrollScrub` never builds a trigger under reduced motion: it
writes one static progress and stops. The hero's static progress is `0.62`, not `1`, on purpose —
at `1` the left gutter has faded for the climax and the hero is correctly almost wordless, which
is a fine destination and a useless still. `0.62` is the last progress at which every element is
stating its facts.

---

## Layout

```
src/app/           layout, page, globals.css  — fixed, the token + font boot
src/data/          content.ts (every string), assets.ts (every path) — single sources of truth
src/lib/           gsap.ts (one registration site), lenis.tsx (SmoothScroll provider)
src/hooks/         useScrollScrub, useDocumentProgress, useCountUp, useReducedMotion
src/components/
  chrome/          the fixed instrument layer — nav, status pill, telemetry, progress rail, grain
  hero/            500dvh track, canvas sequence, caption deck, identity block, ruler
  hero3d/          the exploded bowl (dynamic, ssr:false) and its still fallback
  sections/        Lineup 01 · Build 02 · Steam 03 · Simmer 04 · Ingredients 05 ·
                   Craft 06 · Story 07 · Order 08 · Footer
  ui/              Reveal, BracketFrame, LazyVideo, Micro, Numeric, SectionHeader, TagChip
scripts/           gen-assets.mjs
```

Every component that uses hooks, refs, GSAP, Lenis, motion or three carries `"use client"`.
`Footer` deliberately does not — its only animation is `Reveal`, which is a client component and
brings its own reduced-motion end state with it.

See **[DESIGN.md](./DESIGN.md)** for the design system as built: tokens, the amber budget, the
two coordinate systems, and the motion tokens.

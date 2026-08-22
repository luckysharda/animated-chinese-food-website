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
npm run assets      # generate the placeholder imagery — needs ffmpeg on PATH
npm run dev         # http://localhost:3000
```

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint
npx tsc --noEmit    # typecheck
```

`npm run assets` is only needed if `/public` is empty or you want to regenerate it. The
generated files are committed, so a fresh clone runs without ffmpeg.

---

## ASSETS — everything in `/public` is a placeholder

**Every image and video in `/public` is a procedurally generated placeholder.** None of it
is photography. None of it contains a bowl, a noodle, a chef or a room. They are made by
`scripts/gen-assets.mjs`, which shells out to **ffmpeg** and composites, per file:

- a base fill of `#07090C`,
- one bounded warm radial pool (`ember-500` / `amber-500` / `ember-700`) screened in
  **below** the centre — the key light, 2700–3000K, from below-front,
- a smaller, much weaker cool pool near a top corner — the 5600–6500K room ambient,
- film grain, a vignette, and a slight contrast lift with the brightness pulled down.

The result is an abstract low-key light plate: **correct in tone and empty of subject.** It
holds the site's lighting brief — the room is cold, one pool of light is warm, >80% of the
pixels sit under 20% luminance — so the layout, the scrims, the text contrast and the
scrub all read truthfully, while making no attempt to fake a photograph. A placeholder that
looks like a bad photo is worse than one that obviously isn't a photo.

The seeding is deterministic (FNV-1a over the filename), so the script produces byte-stable
output run to run.

### The manifest

`src/data/assets.ts` is the single source of truth for every asset path on the site. No
component hardcodes a path. What it declares:

| Path | Count | Size | What it stands in for |
|---|---|---|---|
| `/hero/sequence/frame_0001.jpg` … `frame_0120.jpg` | 120 | 1600×900 | the hero scrub sequence |
| `/hero/poster.jpg` | 1 | 1600×900 | first-paint poster behind the canvas |
| `/hero/explode-still.jpg` | 1 | 1600×900 | no-WebGL / reduced-motion fallback for the 3D bowl |
| `/bowls/{tonkotsu,mala,shoyu}.jpg` | 3 | 1600×1067 (3:2) | the `// 01` lineup cards |
| `/toppings/*.jpg` | 8 | 400×400 | the `// 02` configurator chips |
| `/ingredients/ing-01.jpg` … `ing-09.jpg` | 9 | 1200×900 | the `// 05` bento |
| `/story/era-01.jpg` … `era-04.jpg` | 4 | 1200×800 | the `// 07` timeline |
| `/video/{simmer-01,simmer-02,craft-01,craft-02,craft-03}.mp4` | 5 | 1280×720, 5s loop | ambient loops |
| `/video/*-poster.jpg` | 5 | 1280×720 | their posters |

### Swapping in real photography

**Option A — keep the names.** Drop real files into `/public` at exactly the paths above and
delete nothing else. Do not run `npm run assets` again or it will overwrite them. Nothing in
`src/` changes.

**Option B — point the manifest somewhere else.** Edit `src/data/assets.ts` — change the
`assets` object's paths, or change the `heroFrame(i)` template to a CDN URL. Every component
reads through it, so one edit moves the whole site. If you host frames remotely, add the host
to `images.remotePatterns` in `next.config.ts`.

**The hero sequence is the one with a hard requirement.** It needs **120 sequential frames,
named `frame_0001.jpg` through `frame_0120.jpg`**, all the same dimensions, in
`/public/hero/sequence/`. `HERO_FRAME_COUNT` and `heroFrame()` in `src/data/assets.ts` define
the count and the zero-padding; change the count there and the canvas follows, but every frame
must exist — the hero preloads the entire sequence before it will paint, so a 404 in the middle
stalls the loader.

What the frames should actually contain, if you are shooting them: this is a **cut sequence,
not one continuous push-in.** Four or more camera setups inside the single scrub, hard cuts on
frame boundaries, the subject moving *within* each setup so it reads as media time advancing
rather than a CSS `scale()` on a still. Progress `0 → 0.75` maps to frames `1 → 120`; from
`0.75` the 3D bowl takes the stage and the plate layer cross-fades out by `0.82`.

Video files want `muted playsinline preload="none"` and a poster — `src/components/ui/LazyVideo.tsx`
already enforces that, so replacing the `.mp4` files is enough.

---

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

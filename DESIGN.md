# DESIGN.md — UMAMI // 拉麵, as built

The design system as it actually exists in the code. Every value below was read out of
`src/app/globals.css`, which is the only place tokens are defined — there is no
`tailwind.config`, because Tailwind v4 takes its theme from `@theme` in CSS.

Where this document differs from the original style guide, the code wins and the difference
is noted.

---

## 1. Color

### Surfaces — near-black with a cold blue bias

| Token | Hex | Use |
|---|---|---|
| `--color-ink-900` / `bg-ink-900` | `#07090C` | page black, hero letterbox, full-bleed stages |
| `--color-ink-800` / `bg-ink-800` | `#0B0F14` | default section background, `html` and `body` |
| `--color-ink-700` / `bg-ink-700` | `#101720` | raised panel |
| `--color-ink-600` / `bg-ink-600` | `#151E2A` | card background |
| `--color-ink-500` / `bg-ink-500` | `#1C2735` | input fill, chip background |
| `--color-line-100` / `border-line-100` | `#2A3543` | 1px hairline borders |
| `--color-line-200` / `border-line-200` | `#3A4757` | hover borders |

### Text

| Token | Hex | Use |
|---|---|---|
| `--color-text-hi` | `#FFFFFF` | headings, live telemetry *values* |
| `--color-text-mid` | `#B7C2CE` | body copy in the content frame |
| `--color-text-low` | `#6B7887` | mono micro-labels, meta, everything in the instrument frame that is not a live value |
| `--color-text-dim` | `#414D5B` | disabled, decorative, vertical edge type |

### Accents

| Token | Hex | Use |
|---|---|---|
| `--color-amber-400` | `#FFC53D` | the `//` device, numerals, selected state, one CTA |
| `--color-amber-500` | `#F5A314` | CTA gradient end, counter glow core |
| `--color-ember-500` | `#FF6B18` | heat glow, simmer, divider light-line |
| `--color-ember-700` | `#C22B0E` | deep ember, behind-bowl backlight, CTA label color |
| `--color-crimson` | `#E01B24` | status dot and the PRC flag plate — **exactly two places on the site** |
| `--color-jade` | `#7FBF6A` | scallion green — photographic / lighting only, never assigned to UI |

`--color-ember-700` and `--color-jade` are **photographic and lighting values**. They may
appear inside an image, a three.js light or a glow. They are never the color of a UI element.
(The one licensed exception is the `// 01` CTA label, where `ember-700` sits on a near-white
bar and reads as warm amber at 10px while clearing 4.5:1.)

---

## 2. THE AMBER BUDGET

> **Amber must never exceed ~1.5% of the pixels in any viewport.**

This is the single rule that keeps the page from looking like every other dark site with an
orange accent. The list of things allowed to carry amber is **closed**:

1. the `//` slash device and zero-padded chapter numerals
2. live numeric readouts (`92°C`, `1.42 G/S`, `16H`, `€31`) and their units
3. the ruler fill and its glowing leading cap
4. the currently-selected control, and **one** primary CTA per section
5. exactly one word in the hero identity block — `TWO` — and the caption under the flag plates
6. the small solid status chip beside the bottom-left instrument pill

**Never amber:** the vertical progress rail thumb (it is **white**, `--color-text-hi` at 90%),
nav links other than the active one, body copy, hairlines, hover borders, icons, section
backgrounds, or any gradient larger than a button.

### The three-band value hierarchy — roughly 8:1 by area, dim to bright

```
white   #FFFFFF   CJK display, the BORN / FROM / TWO / WORLDS lines, live telemetry values
dim     #6B7887   ~40–55% against black — every label, eyebrow, spec-table row label and
                  micro-paragraph inside the instrument frame
amber   #FFC53D   the closed list above, and nothing else
```

The HUD is meant to be **quiet**. The eye is meant to go to the food.

### The glow recipe

Defined once, as utilities — do not hand-roll a second version.

```css
/* @utility numeric  */ text-shadow: 0 0 12px rgb(255 197 61 / 0.55), 0 0 40px rgb(255 107 24 / 0.25);
/* @utility glow-box */ box-shadow: 0 0 0 1px rgb(255 197 61 / 0.6),
                                    0 0 28px -6px rgb(255 197 61 / 0.45),
                                    inset 0 0 40px -20px rgb(255 197 61 / 0.5);
```

---

## 3. Typography

Four faces, loaded in `src/app/layout.tsx` via `next/font/google`, exposed as CSS variables
and mapped to Tailwind font tokens. Anton and JetBrains Mono preload; the two JP faces are
large and deliberately do **not** preload — they swap in after first paint, which is why
`document.fonts.ready` triggers a `ScrollTrigger.refresh()`.

| Tailwind class | Token | Face | Job |
|---|---|---|---|
| `font-display` | `--font-display` | **Anton** 400 | condensed latin caps, all numerals |
| `font-jp` | `--font-jp` | **Noto Sans JP** 700/900 | gothic CJK display — 拉麵, 煮込み |
| `font-mincho` | `--font-mincho` | **Shippori Mincho** 700/800 | brush-feel CJK — 物語, ラインナップ |
| `font-mono` | `--font-mono` | **JetBrains Mono** | every micro-label, price, telemetry, nav, tag chip. Also the `body` default |

### Four registers, and none of them bleeds into another

| Register | Treatment |
|---|---|
| **CJK display** | Noto Sans JP 900, `letter-spacing: 0` (never track CJK), white, `line-height: 1.0` |
| **Condensed latin caps** | Anton, uppercase, `line-height: 0.95`, `letter-spacing: -0.01em` |
| **Amber numeric** | the `numeric` utility — display face, tabular-nums, amber, glow |
| **Micro mono** | 9–11px, `0.18–0.22em` tracking, uppercase, `--color-text-low` |

### Scale (desktop, 1440px)

```
display-xl   clamp(64px, 7vw, 112px)  / 0.86 lh / -0.02em   hero right-side title
display-lg   clamp(40px, 4.2vw, 68px) / 0.90 lh / -0.01em   section titles
display-md   clamp(28px, 2.6vw, 40px) / 1.0  lh             card titles
counter      clamp(56px, 6vw, 96px)   / 0.85 lh             16H / 92°C
body         16px / 1.65 lh / text-mid                      (the body default)
body-sm      14px / 1.6 lh
mono-label   10px / 1.2 lh / 0.18em / uppercase             = .micro
mono-micro    9px / 1.2 lh / 0.22em / uppercase / text-low  = .micro-xs
```

### Signature type devices

- **`// NN.`** — every section header opens with the amber double-slash and a zero-padded
  number, set ~1.1× the words beside it. Numbers are always padded: `// 02`, `No.01`,
  `004 OF 120`.
- **The `//` in the hero lockup opens the second line** — 旨味 on line one, `//拉麵` on line
  two. It is not an inline separator between two words.
- **Trilingual stack, always this order:** mono English kicker → large Japanese → small English
  translation → optional romaji in mono. **Never Japanese under English.**
- **Vertical rotated mono** on the right edge, ~9px, `--color-text-dim`.

---

## 4. Custom utilities

Defined in `globals.css` with `@utility`. Use these rather than re-inventing them — a
second, slightly different glow is how a design system dies.

| Utility | What it is |
|---|---|
| `micro` | 10px mono, `0.18em`, uppercase, `text-low`. Everything that is **data rather than prose** |
| `micro-xs` | 9px mono, `0.22em`, uppercase, `text-low` |
| `numeric` | the amber display-face numeral — Anton, `tabular-nums`, amber-400, glow. **`tabular-nums` is not optional**: without it every tick reflows its neighbours |
| `numeric-unit` | the small raised unit inside a `.numeric` — `0.52em`, `vertical-align: 0.42em`. (The brief called this `.numeric .unit`; as built it is a standalone utility.) |
| `slashes` | the amber `//` device — display face, `skewX(-12deg)`, glow |
| `glow-box` | the selected-state box glow, recipe above |
| `scrim` | `linear-gradient(180deg, rgb(7 9 12 / .75) 0%, transparent 35%, transparent 60%, rgb(7 9 12 / .9) 100%)` — goes on **every** full-bleed image so text stays legible top and bottom |
| `frame-content` | the CONTENT FRAME container — `max-width: 1440px`, `margin-inline: auto`, `padding-inline: clamp(20px, 4vw, 64px)` |

Also global: `::selection` is amber-on-ink, and `:focus-visible` is a 2px amber outline with
3px offset and a 2px radius. Do not remove it.

---

## 5. THE TWO COORDINATE SYSTEMS

Two independent frames of reference exist on the page and they must never be conflated.

```
INSTRUMENT FRAME   viewport-flush. 12px left inset / 4.8vw right inset / 12px top + bottom.
                   --gutter-l: 12px   --gutter-r: 4.8vw
                   Holds: nav, status pill, all telemetry, corner brackets, rulers, rails,
                   and the hero's two gutter blocks.
                   Ignores the container. Ignores the 12-col grid. Never centred.

CONTENT FRAME      .frame-content — max-width 1440px (--container), centred,
                   padding-inline clamp(20px, 4vw, 64px), 12 cols / 24px gap.
                   Holds cards, grids, the configurator, the reservation form.
```

Sizing inside the instrument frame: text blocks are **160–340px wide, never wider**, and they
sit at the extremes — 0.8% / 95.2% horizontally, 28% / 74% vertically. A block on the left is
left-aligned, a block on the right is right-aligned, and **nothing in this frame is ever
centred.**

### Content is pushed to the extremes

Titles hug top-left. Meta hugs top-right, on the same row, right-aligned. Captions sit in the
bottom-left of their own image. **The middle is left for the photography.**

### Forbidden globally — no exceptions outside `// 07` and `// 08`

- centred text blocks
- equal left/right padding on a full-bleed section
- the heading-over-paragraph-over-button stack
- 3-column grids of equal-width cards where the outer two are text
- **alternating background bands.** `ink-700` and `ink-600` are for cards, panels and inputs —
  not for striping sections. Consecutive sections are separated by a 1px hairline and by
  luminance falloff *in the photography*, never by two flat greys.

**The test: if a section reads the same when mirrored left-to-right, it is wrong.**

`// 07` The Story and `// 08` Order are the two licensed exceptions — the story crest is
centred by design, and the reservation lives in one panel.

### Other layout constants

```
section rhythm   padding-block 120px desktop / 72px mobile
full-bleed       hero, // 04 simmer, // 06 craft — 100vw × 100dvh
hairlines        1px --color-line-100. Never a heavy divider.
radius           cards 10px · chips 8px · images 8px · buttons 6px — nothing pill-shaped
```

---

## 6. Motion tokens

```css
--ease-out:   cubic-bezier(0.16, 1, 0.3, 1);    /* "expo out" — the house ease */
--ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
--dur-fast:   180ms;   /* hover, chip select */
--dur-base:   420ms;   /* reveals, crossfades */
--dur-slow:   900ms;   /* section-over-section transitions */
```

**How these reach the markup, as built.** `--ease-out` and `--ease-inout` sit in Tailwind v4's
`--ease-*` namespace, so `ease-out` / `ease-inout` are real utilities. `--dur-*` does **not**
— Tailwind's duration utilities read `--transition-duration-*` — so the tokens are documentary
there, and the components spell the values out:

```
ease-[cubic-bezier(0.16,1,0.3,1)]   duration-[180ms]   duration-[420ms]   duration-[900ms]
```

That is the convention in the codebase; match it rather than introducing a third spelling.

| | |
|---|---|
| stagger | 70–90ms between siblings |
| reveal | `opacity 0→1`, `translateY 28px→0`, optional `clip-path inset(0 0 100% 0) → inset(0)` |
| parallax | image is 115% of its frame; `translateY -7% → +7%` across the frame's scroll span |
| scrub | `0.6` smoothing (`0.8` on `// 07`, `1` on the `// 06` pin). **Never `scrub: false` on the hero.** |
| track length | hero `500dvh` · `// 04` `300dvh` · `// 06` measured at runtime from `scrollWidth` |

Ownership is absolute: a value that is a function of **scroll** is GSAP's and is written
straight to the DOM; a value that is a function of **React state** is motion's and never
appears under a scrub. See the scroll architecture section of [README.md](./README.md).

---

## 7. Imagery

### The plate is cold. Only the food is warm.

The likeliest mistake is lighting the whole frame orange. The **room** is cool — wet black
stone, blue-grey steel, a blue rim on the shoulders, cyan speculars on the counter — and there
is exactly **one** warm pool of light, on the bowl.

```
ambient / room   5600–6500K, blue-grey, 1.5–2 stops under key
key (bowl only)  2700–3000K, small source, below-front, tight falloff
rim              cool, from behind, edges the subject off the background
```

**Low-key is measurable, not a mood:** ≥80% of the pixels in every hero frame sit below 20%
luminance, and the brightest 2% of pixels are all inside the bowl. Blacks are photographic —
vignette, falloff, grain — never a flat fill. If a full-bleed frame contains a large area of
even `#0B0F14`, it is a screenshot of a website, not a film still.

Every full-bleed image gets the `scrim` utility. A 2–4% film grain lies over the whole page
(`src/components/chrome/Grain.tsx`), composited above the readouts as well as the content.

`scripts/gen-assets.mjs` encodes exactly this recipe in ffmpeg — a cold base, one bounded warm
pool below centre, a weak cool pool at a top corner, grain and a vignette — which is why the
placeholders are correct in tone while containing no subject at all. See the ASSETS section of
[README.md](./README.md).

**As-built note:** the brief specified the hero sequence as 1920×1080 WebP q75. The manifest
and the generator ship **JPEG at 1600×900** — `heroFrame()` in `src/data/assets.ts` returns
`.jpg`. If you re-encode to WebP, change that template, not the components.

---

## 8. Components

**Bowl card (`// 01`)** — `ink-600` bg, 1px `line-100`, radius 10. Photo is **3:2 landscape**,
not 4:3. A colored radial glow sits *behind* the card at 25% opacity, keyed to the bowl. The
title row is the name (display-md) with the price as **bare amber numerals** — Anton, glow
recipe, `€16` — right-aligned on the title's own baseline. It is **not** a chip: no fill, no
border, no padding box. Then body copy (body-sm, `text-mid`), 3 tag chips, then the CTA:

```css
/* full-width, radius 6, mono uppercase, 10px, 0.18em */
background: linear-gradient(90deg, #F0E2C6, #FFF6E4);
color: var(--color-ember-700);
```

The CTA is **light** — the brightest surface in the section, not a dark or saturated amber
fill. This is the one place the page inverts, and it is why the button pulls the eye.

**Selectable chip (`// 02`)** — 64px tall, 44px thumbnail, name (EN) over JP subname, price
right-aligned in mono. Default `ink-500` + 1px `line-100`. Selected: amber gradient wash at
22%, 1px `amber-400`, `glow-box`, and a 200ms `scale 1 → 1.02` pop.

**Stat counter (`// 03`)** — display numeral in `amber-400` with the glow recipe, mono label
under it, a 1px vertical divider between cells, 3-line body caption. Counts up once at 70% of
the viewport and never reverses on the way back up.

**Bracketed video panel** — 1px border at the four corners only, 24px arms. Badge bottom-centre
with mono text and a pulsing red dot.

**Progress ruler** — full-width strip at the foot of the hero stage. 1px baseline; minor tick
every 7px, tall tick every 5th. **The tick scale is static** — it never scrolls, slides or
re-scales. The amber fill grows from the far-left edge **linearly, with no ease**: it is an
instrument, and its apparent speed is the user's scroll speed, not a curve. It ends in a 6px
rounded cap with a `0 0 14px` amber bloom.

A **static white circular datum knob** (14px, 6px stem tick) sits at exactly 50% of the strip.
The fill passes *through* it at `p = 0.5` and the knob never moves. It is a datum mark, not a
playhead — do not bind it to progress.

At 100% fill the whole strip reads as one glowing ember line across the viewport. That **is**
the divider light-line between the hero and `// 01`. Do not build a second element.

---

## 9. Accessibility and fallbacks — non-negotiable

- **Reduced motion.** `@media (prefers-reduced-motion: reduce)` in `globals.css` flattens all
  CSS animation and transition to `0.01ms`. Pins and scrubs are killed in **JS**, at the
  component level, by reading `useReducedMotion()` / `prefersReducedMotion()` — and the
  reduced-motion path ships **in the same file** as the animation, rendering the **end state**
  statically. Never "later".
- **Contrast.** All amber-on-dark text clears 4.5:1 (`#FFC53D` on `#0B0F14` ≈ 11:1). Body text
  never goes below `text-mid`; `text-low` is decoration and micro-labels only.
- **Focus.** The amber `:focus-visible` ring is global. Keep it.
- **Mobile (<768px).** No pinned horizontal scroll — `// 06` becomes a swipeable
  `overflow-x: auto` carousel with scroll-snap.
- **Video.** Every video is `muted playsinline preload="none"` with a poster, `loop` for
  ambient loops. Nothing relies on audio.
- **WebGL.** The hero's 3D bowl is a `next/dynamic({ ssr: false })` import with a rendered
  still (`/hero/explode-still.jpg`) as its fallback for no-WebGL and reduced-motion.

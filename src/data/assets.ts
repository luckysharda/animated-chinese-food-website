/**
 * Single source of truth for every asset path on the site.
 * Swap real photography in by replacing files in /public — never by
 * editing component code. Run `npm run assets` to (re)generate placeholders.
 */

export const HERO_FRAME_COUNT = 120;

/** Zero-padded frame path: /hero/sequence/frame_0001.webp … frame_0120.webp */
export const heroFrame = (i: number) =>
  `/hero/sequence/frame_${String(i).padStart(4, "0")}.jpg`;

export const assets = {
  hero: {
    poster: "/hero/poster.jpg",
    /** Rendered still of the exploded bowl — the no-WebGL / reduced-motion fallback. */
    explodeStill: "/hero/explode-still.jpg",
  },
  bowls: {
    tonkotsu: "/bowls/tonkotsu.jpg",
    mala: "/bowls/mala.jpg",
    shoyu: "/bowls/shoyu.jpg",
  },
  toppings: {
    chashu: "/toppings/chashu.jpg",
    ajitama: "/toppings/ajitama.jpg",
    menma: "/toppings/menma.jpg",
    nori: "/toppings/nori.jpg",
    corn: "/toppings/corn.jpg",
    narutomaki: "/toppings/narutomaki.jpg",
    chiliOil: "/toppings/chili-oil.jpg",
    scallion: "/toppings/scallion.jpg",
  },
  ingredients: Array.from({ length: 9 }, (_, i) => `/ingredients/ing-0${i + 1}.jpg`),
  story: Array.from({ length: 4 }, (_, i) => `/story/era-0${i + 1}.jpg`),
  video: {
    simmer01: { src: "/video/simmer-01.mp4", poster: "/video/simmer-01-poster.jpg" },
    simmer02: { src: "/video/simmer-02.mp4", poster: "/video/simmer-02-poster.jpg" },
    craft01: { src: "/video/craft-01.mp4", poster: "/video/craft-01-poster.jpg" },
    craft02: { src: "/video/craft-02.mp4", poster: "/video/craft-02-poster.jpg" },
    craft03: { src: "/video/craft-03.mp4", poster: "/video/craft-03-poster.jpg" },
  },
} as const;

export type BowlKey = keyof typeof assets.bowls;
export type ToppingKey = keyof typeof assets.toppings;

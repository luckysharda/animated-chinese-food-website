/**
 * How fast the site scrolls — every lever, in one file.
 *
 * "It scrolls too fast" is really two separate complaints, and they have
 * different fixes:
 *
 *   1. THE INPUT is too fast — one wheel notch moves the page too far. That is
 *      WHEEL_SPEED. It changes how heavy the page feels under your hand and
 *      does not change the choreography at all.
 *
 *   2. THE CHOREOGRAPHY is too fast — the hero's 120 frames, or the simmer's
 *      sixteen hours, are spent over too little scrolling. That is the TRACK
 *      lengths. A pinned section's animation is stretched across its track, so
 *      a longer track means the same animation takes more scrolling to play,
 *      i.e. it plays slower.
 *
 * Turn WHEEL_SPEED down to make the page feel heavier. Turn the tracks up to
 * make the cinematic sections breathe. They compose: halving one and doubling
 * the other roughly cancels out.
 */

/**
 * Multiplier on wheel delta. 1 is the browser's native speed.
 * Lower = each notch travels less = slower, heavier scrolling.
 * Below about 0.5 it starts to feel like the page is fighting you.
 */
export const WHEEL_SPEED = 0.7;

/**
 * Lenis smoothing, 0..1 — how far toward the target the page moves each frame.
 * Lower = a longer, heavier glide after you stop. This is *weight*, not speed;
 * pushing it too low reads as laggy rather than cinematic.
 */
export const SCROLL_LERP = 0.085;

/**
 * Pinned track lengths, in dvh. Each stage is 100dvh, so the scrub distance is
 * (track − 100): a 750dvh hero scrubs across 650dvh of scrolling.
 */
export const HERO_TRACK_VH = 750; // 120 frames over 650dvh ≈ 5.4dvh per frame
export const SIMMER_TRACK_VH = 480; // 00H → 16H over 380dvh ≈ 24dvh per hour

/**
 * Horizontal travel in `// 06` is driven by (panels × viewport width × this).
 * 1 means one screen of scrolling per panel; higher slows the sideways drift.
 */
export const CRAFT_SPAN_MULTIPLIER = 1.6;

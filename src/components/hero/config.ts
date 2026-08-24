/**
 * Shared hero configuration.
 *
 * This lives in its own module rather than in Hero.tsx because HeroCanvas needs
 * it too, and HeroCanvas already imports the HeroTick type from Hero — pulling a
 * runtime value across that edge as well would make a real import cycle.
 */

/**
 * Hand the climax to the three.js bowl instead of the footage.
 *
 * OFF by default. The hero footage ends on a real exploded-view shot — chashu,
 * ajitama, nori, a noodle nest and broth droplets suspended over the bowl — and
 * a WebGL scene built from lathes and torus knots cannot beat a photograph of
 * the thing itself. The scene, its lighting and its instanced droplets are all
 * still in src/components/hero3d/; flip this to true to cross-fade into them at
 * p 0.72 instead, which is what this hero did before there was footage.
 *
 * Flipping it back on also restores the plate's fade-out over 0.75 → 0.82,
 * which is what clears the stage for the bowl.
 */
export const WEBGL_CLIMAX = false;

/** Where the plate sequence yields the stage — only used when WEBGL_CLIMAX. */
export const HANDOFF_FROM = 0.75;
export const HANDOFF_TO = 0.82;

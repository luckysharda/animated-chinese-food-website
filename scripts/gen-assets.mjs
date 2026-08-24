#!/usr/bin/env node
/**
 * Generates every placeholder asset the site needs, using ffmpeg only.
 *
 * These are deliberately abstract: a cold near-black room with a single warm
 * pool of light, grain and a vignette — the lighting brief from DESIGN.md,
 * with no subject in it. They are correct in tone and wrong in content, which
 * is exactly what a placeholder should be.
 *
 * To use real photography instead: drop files with the same names into
 * /public (see src/data/assets.ts for the manifest) and skip this script.
 *
 * Requires ffmpeg on PATH.  Run: npm run assets
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const PUB = path.join(process.cwd(), "public");

const INK = "0x07090C";
const WARM = ["0xFF6B18", "0xF5A314", "0xC22B0E", "0xFFC53D", "0xE0641B"];
const COOL = ["0x1C3A55", "0x16304A", "0x24506F", "0x12283C"];

/** Deterministic pseudo-random from a string seed — same assets every run. */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/**
 * One low-key plate: base black, a warm pool blended in screen mode, a cooler
 * secondary source, grain, vignette. Warm pool sits below centre — key light
 * from below-front, per the lighting spec.
 */
async function plate(out, w, h, seed, opts = {}) {
  const r = rng(seed);
  const warm = opts.warm ?? WARM[Math.floor(r() * WARM.length)];
  const cool = opts.cool ?? COOL[Math.floor(r() * COOL.length)];

  // Pools are BOUNDED, not full-frame washes: build each gradient at its own
  // radius, pad it into an oversized canvas so it can bleed off-edge, then crop
  // back. A full-frame cool wash screened under a warm pool goes magenta.
  const R = Math.round(Math.min(w, h) * (opts.warmR ?? 0.95));
  const R2 = Math.round(Math.min(w, h) * (opts.coolR ?? 0.55));
  const fx = Math.round(w * (0.36 + r() * 0.28));
  const fy = Math.round(h * (0.52 + r() * 0.2));   // key light sits BELOW centre
  const cx = Math.round(w * (r() < 0.5 ? 0.04 : 0.96));
  const cy = Math.round(h * (0.12 + r() * 0.26));
  const warmA = (opts.warmA ?? 0.82 + r() * 0.1).toFixed(2);
  const coolA = (opts.coolA ?? 0.1 + r() * 0.06).toFixed(2);
  const CW = w + 2 * R, CH = h + 2 * R;
  const CW2 = w + 2 * R2, CH2 = h + 2 * R2;

  await mkdir(path.dirname(out), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=${INK}:s=${w}x${h}`,
    "-f", "lavfi", "-i", `gradients=s=${R}x${R}:c0=${warm}:c1=0x000000:type=radial:x0=${Math.round(R / 2)}:y0=${Math.round(R / 2)}:nb_colors=2:d=1`,
    "-f", "lavfi", "-i", `gradients=s=${R2}x${R2}:c0=${cool}:c1=0x000000:type=radial:x0=${Math.round(R2 / 2)}:y0=${Math.round(R2 / 2)}:nb_colors=2:d=1`,
    "-filter_complex",
      // format=gbrp on every branch is load-bearing: pad's "black" on a planar
      // YUV frame writes raw zeros, which decode to magenta, not black.
      `[0]format=gbrp[base];` +
      `[1]format=gbrp,pad=${CW}:${CH}:${R + fx - Math.round(R / 2)}:${R + fy - Math.round(R / 2)}:black,crop=${w}:${h}:${R}:${R}[warm];` +
      `[2]format=gbrp,pad=${CW2}:${CH2}:${R2 + cx - Math.round(R2 / 2)}:${R2 + cy - Math.round(R2 / 2)}:black,crop=${w}:${h}:${R2}:${R2}[cool];` +
      `[base][cool]blend=all_mode=screen:all_opacity=${coolA}[b1];` +
      `[b1][warm]blend=all_mode=screen:all_opacity=${warmA}[b2];` +
      `[b2]noise=alls=${opts.grain ?? 11}:allf=t+u,` +
      `vignette=PI/${opts.vig ?? 3.4},` +
      `eq=saturation=${opts.sat ?? 1.0}:contrast=${opts.con ?? 1.14}:brightness=${opts.bri ?? -0.06},` +
      `format=yuv420p[v]`,
    "-map", "[v]", "-frames:v", "1", "-update", "1", "-q:v", String(opts.q ?? 4), out,
  ]);
}

/** A short looping clip: the same plate with a slow push-in. */
async function clip(base, out, secs = 5) {
  await mkdir(path.dirname(out), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", base,
    "-t", String(secs), "-r", "25",
    "-vf", `zoompan=z='min(1.18,1+0.18*on/${secs * 25})':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=25,format=yuv420p`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-movflags", "+faststart", "-an", out,
  ]);
}

async function main() {
  const t0 = Date.now();
  console.log("Generating placeholder assets with ffmpeg…\n");

  // ── hero ──
  // The hero sequence comes from REAL FOOTAGE and is built by a different
  // script (npm run hero). Regenerating a procedural push-in over the top of
  // it would silently destroy the real hero, so this script never writes to
  // public/hero once a real sequence is present.
  const heroSeq = path.join(PUB, "hero/sequence");
  let heroFrames = 0;
  try { heroFrames = (await readdir(heroSeq)).filter((f) => f.endsWith(".jpg")).length; } catch {}
  if (heroFrames >= 120) {
    console.log(`  hero           ${heroFrames} real frames present — skipped (run \`npm run hero\` to rebuild)`);
  } else {
    const heroBase = path.join(PUB, "hero/_base.jpg");
    await plate(heroBase, 2000, 1125, "hero-plate", { warm: "0xFF6B18", warmA: 0.72, coolA: 0.26, vig: 3.0, q: 2 });
    await rm(heroSeq, { recursive: true, force: true });
    await mkdir(heroSeq, { recursive: true });
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", heroBase, "-frames:v", "120",
      "-vf", "zoompan=z='1+0.42*on/119':d=1:x='iw/2-(iw/zoom/2)':y='ih/1.85-(ih/zoom/1.85)':s=1600x900:fps=25,noise=alls=6:allf=t,format=yuv420p",
      "-q:v", "5", path.join(heroSeq, "frame_%04d.jpg"),
    ]);
    await plate(path.join(PUB, "hero/poster.jpg"), 1600, 900, "hero-poster", { warm: "0xFF6B18", warmA: 0.7, q: 3 });
    await plate(path.join(PUB, "hero/explode-still.jpg"), 1600, 900, "hero-explode", { warm: "0xFFC53D", warmA: 0.88, coolA: 0.12, vig: 2.6, q: 3 });
    await rm(heroBase, { force: true });
    console.log("  hero/sequence  120 placeholder frames @ 1600x900");
  }

  // ── bowls, toppings, ingredients, story ──
  const jobs = [
    ...["tonkotsu", "mala", "shoyu"].map((k, i) =>
      [`bowls/${k}.jpg`, 1600, 1067, `bowl-${k}`, { warm: ["0xE0641B", "0xC22B0E", "0xF5A314"][i], warmA: 0.68 }]),
    ...["chashu", "ajitama", "menma", "nori", "corn", "narutomaki", "chili-oil", "scallion"].map((k) =>
      [`toppings/${k}.jpg`, 400, 400, `top-${k}`, { warmA: 0.6, vig: 4.0, q: 5 }]),
    ...Array.from({ length: 9 }, (_, i) =>
      [`ingredients/ing-0${i + 1}.jpg`, 1200, 900, `ing-${i}`, { warmA: 0.62 }]),
    ...Array.from({ length: 4 }, (_, i) =>
      [`story/era-0${i + 1}.jpg`, 1200, 800, `era-${i}`, { warm: "0xC22B0E", coolA: 0.34, sat: 0.94 }]),
  ];
  for (const [rel, w, h, seed, opts] of jobs) await plate(path.join(PUB, rel), w, h, seed, opts);
  console.log(`  bowls / toppings / ingredients / story  ${jobs.length} plates`);

  // ── video: five loops + their posters ──
  for (const name of ["simmer-01", "simmer-02", "craft-01", "craft-02", "craft-03"]) {
    const poster = path.join(PUB, `video/${name}-poster.jpg`);
    await plate(poster, 1280, 720, `vid-${name}`, { warmA: 0.66, q: 4 });
    await clip(poster, path.join(PUB, `video/${name}.mp4`), 5);
  }
  console.log("  video  5 clips + posters");

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s → /public`);
}

main().catch((e) => { console.error("\nAsset generation failed:", e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * Builds the hero's scrub sequence from real footage.
 *
 * The hero is a canvas scrub, not a <video>: setting video.currentTime from
 * scroll is unreliable in Safari and janky on mobile, so the footage is
 * exploded into numbered frames that the canvas draws by index.
 *
 * Source: assets-src/hero-source.mp4 (10s, 24fps, 1280x720).
 * Output: public/hero/sequence/frame_0001.jpg … frame_0120.jpg at 1600x900,
 *         plus the poster and the end-state still. Narrow screens do not get a
 *         separate video: HeroCanvas decimates this same sequence to every 4th
 *         frame, which keeps the scrub and drops the payload to about a quarter.
 *
 * Requires ffmpeg on PATH.  Run: npm run hero
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, readdir, stat } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const ROOT = process.cwd();
const SRC = process.argv[2] || path.join(ROOT, "assets-src/hero-source.mp4");
const OUT = path.join(ROOT, "public/hero");
const FRAMES = 120;

/**
 * The generator that produced this footage stamps a four-point sparkle in the
 * lower right. It is stationary, so delogo interpolates it away from the box
 * border — which is invisible here because everything behind it is dark stone.
 * This must run at source resolution, before any scaling.
 */
const DELOGO = "delogo=x=1116:y=556:w=92:h=92";

/**
 * The footage is graded brighter than this site is. The brief is a cold room
 * with one warm pool of light on the food: pull the midtones down, push a
 * little blue into the shadows, leave the highlights on the bowl alone.
 * Measured effect: median luminance 44–95 -> 12–45, p95 held at ~150.
 */
const GRADE = [
  "eq=contrast=1.12:brightness=-0.05:saturation=1.05",
  "colorbalance=bs=0.04:bm=-0.015:rh=0.02",
  "vignette=PI/4.2",
].join(",");

const SCALE = "scale=1600:900:flags=lanczos";

async function main() {
  const t0 = Date.now();
  try {
    await stat(SRC);
  } catch {
    console.error(`No source footage at ${SRC}\nPass a path: npm run hero -- /path/to/clip.mp4`);
    process.exit(1);
  }
  console.log(`Building the hero sequence from ${path.relative(ROOT, SRC)}…\n`);

  // ── the 120-frame scrub sequence ──
  await rm(path.join(OUT, "sequence"), { recursive: true, force: true });
  await mkdir(path.join(OUT, "sequence"), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", SRC,
    // 24fps source sampled at 12 -> exactly 120 frames across the 10s clip
    "-vf", `${DELOGO},fps=12,${GRADE},${SCALE}`,
    // q6 is visually indistinguishable from q4 at 2x zoom on this
    // footage and 22% smaller across 120 frames.
    "-frames:v", String(FRAMES), "-q:v", "6",
    path.join(OUT, "sequence/frame_%04d.jpg"),
  ]);

  const got = (await readdir(path.join(OUT, "sequence"))).filter((f) => f.endsWith(".jpg"));
  if (got.length !== FRAMES) {
    console.error(`Expected ${FRAMES} frames, got ${got.length}. The canvas indexes 1…${FRAMES}; fix the source length or the fps filter.`);
    process.exit(1);
  }
  let bytes = 0;
  for (const f of got) bytes += (await stat(path.join(OUT, "sequence", f))).size;
  console.log(`  sequence      ${got.length} frames @ 1600x900, ${(bytes / 1e6).toFixed(1)}MB total, ${Math.round(bytes / got.length / 1024)}KB each`);

  // ── poster (first frame) and the end state (last frame) ──
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", SRC,
    "-vf", `${DELOGO},${GRADE},${SCALE}`, "-frames:v", "1", "-update", "1", "-q:v", "3",
    path.join(OUT, "poster.jpg")]);
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-sseof", "-0.4", "-i", SRC,
    "-vf", `${DELOGO},${GRADE},${SCALE}`, "-frames:v", "1", "-update", "1", "-q:v", "3",
    path.join(OUT, "explode-still.jpg")]);
  console.log("  poster.jpg    first frame");
  console.log("  explode-still.jpg  last frame — the reduced-motion / no-WebGL end state");
  await clearImageCache();

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

/**
 * next/image caches its optimized variants under .next/cache/images, keyed by the
 * source URL — not by the file's contents. Replacing a file in /public without
 * changing its path therefore leaves the browser being served the OLD optimized
 * copy until that entry expires, which looks exactly like the script having done
 * nothing. Clearing it here is the difference between "the images did not update"
 * and a five-minute hunt.
 */
async function clearImageCache() {
  const dir = path.join(process.cwd(), ".next/cache/images");
  try {
    await rm(dir, { recursive: true, force: true });
    console.log("  cleared .next/cache/images — next/image would otherwise serve stale copies");
  } catch {
    /* no build yet; nothing to clear */
  }
}

main().catch((e) => { console.error("\nHero build failed:", e.message); process.exit(1); });

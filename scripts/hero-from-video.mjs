#!/usr/bin/env node
/**
 * Builds the hero's scrub sequence from real footage.
 *
 * The hero is a canvas scrub, not a <video>: setting video.currentTime from
 * scroll is unreliable in Safari and janky on mobile, so the footage is
 * exploded into numbered frames that the canvas draws by index.
 *
 * Source: assets-src/hero-source.mp4 (8.53s, 30fps, 1920x1080).
 * Output: public/hero/sequence/frame_0001.jpg … frame_0120.jpg at 1600x900,
 *         plus the poster and the end-state still. Narrow screens do not get a
 *         separate video: HeroCanvas decimates this same sequence to every 4th
 *         frame, which keeps the scrub and drops the payload to about a quarter.
 *
 * The frame count is fixed at 120 — HeroCanvas indexes 1…120 and Hero maps the
 * whole pin onto that range — so the SAMPLING RATE is derived from the clip's
 * own duration rather than hardcoded. Swap in a clip of any length and the
 * sequence still comes out at exactly 120 frames spanning the whole thing.
 *
 * Requires ffmpeg and ffprobe on PATH.  Run: npm run hero
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, readdir, stat } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const ROOT = process.cwd();
const args = process.argv.slice(2);
/** An arbitrary clip has no generator watermark; `--no-delogo` skips that filter. */
const NO_DELOGO = args.includes("--no-delogo");
const SRC = args.find((a) => !a.startsWith("--")) || path.join(ROOT, "assets-src/hero-source.mp4");
const OUT = path.join(ROOT, "public/hero");
const FRAMES = 120;

/**
 * The generator that produced this footage stamps a four-point sparkle in the
 * lower right. It is stationary, so delogo interpolates it away from the box
 * border — invisible for the two thirds of the clip that are dark stone behind
 * it, and a soft patch that reads as shallow depth of field over the kitchen
 * counter in the opening seconds. This must run at source resolution, before
 * any scaling.
 *
 * MEASURED, not assumed. The sparkle sits at a fixed FRACTION of the frame —
 * (0.909W, 0.833H) held on both the 1280x720 clip this hero shipped with first
 * and the 1920x1080 one it uses now — so the position is derived from the
 * probed dimensions and survives a re-render at another resolution. The box
 * SIZE is a straight measurement off this clip (the sparkle is ~68x70px at
 * 1920 wide) plus ~8px of margin on each side; a tighter box smears less, so
 * this is deliberately not padded further.
 *
 * To re-measure after swapping in footage from a different generator:
 *   ffmpeg -sseof -0.3 -i clip.mp4 -vf "crop=280:280:1620:780,scale=560:560" \
 *          -frames:v 1 -update 1 wm.jpg
 * and read the sparkle's centre and extent off wm.jpg. If the new clip has no
 * watermark at all, pass --no-delogo instead.
 */
const SPARKLE_CENTRE_X = 0.9094;
const SPARKLE_CENTRE_Y = 0.8333;
const SPARKLE_BOX = 84;

function delogoFilter(width, height) {
  const w = SPARKLE_BOX;
  const h = SPARKLE_BOX;
  // delogo needs the box strictly inside the frame — it reads the border pixels.
  const x = Math.min(Math.max(1, Math.round(SPARKLE_CENTRE_X * width - w / 2)), width - w - 1);
  const y = Math.min(Math.max(1, Math.round(SPARKLE_CENTRE_Y * height - h / 2)), height - h - 1);
  return `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
}

/**
 * The footage is graded brighter than this site is. The brief is a cold room
 * with one warm pool of light on the food: pull the midtones down, push a
 * little blue into the shadows, leave the highlights on the bowl alone.
 * Measured effect: mean luminance 54–100 -> 20–60, p95 held at ~150.
 */
const GRADE = [
  "eq=contrast=1.12:brightness=-0.05:saturation=1.05",
  "colorbalance=bs=0.04:bm=-0.015:rh=0.02",
  "vignette=PI/4.2",
].join(",");

const SCALE = "scale=1600:900:flags=lanczos";

/** width, height and duration of the source, straight from ffprobe. */
async function probe(src) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "default=noprint_wrappers=1:nokey=0", src,
  ]);
  const read = (key) => {
    const m = stdout.match(new RegExp(`^${key}=(.+)$`, "m"));
    return m ? Number(m[1]) : NaN;
  };
  const width = read("width");
  const height = read("height");
  const duration = read("duration");
  if (!width || !height || !duration) {
    throw new Error(`ffprobe could not read width/height/duration from ${src}`);
  }
  return { width, height, duration };
}

async function main() {
  const t0 = Date.now();
  try {
    await stat(SRC);
  } catch {
    console.error(`No source footage at ${SRC}\nPass a path: npm run hero -- /path/to/clip.mp4`);
    process.exit(1);
  }

  const { width, height, duration } = await probe(SRC);
  // FRAMES samples spread across the whole clip: the fps filter emits at
  // 0, D/120, 2D/120 … 119D/120, which is exactly 120 frames for any D.
  const fps = FRAMES / duration;
  const delogo = NO_DELOGO ? null : delogoFilter(width, height);

  console.log(`Building the hero sequence from ${path.relative(ROOT, SRC)}…`);
  console.log(`  source        ${width}x${height}, ${duration.toFixed(2)}s -> sampling at ${fps.toFixed(3)}fps for ${FRAMES} frames`);
  console.log(`  watermark     ${delogo ?? "skipped (--no-delogo)"}\n`);

  const chain = (...steps) => steps.filter(Boolean).join(",");

  // ── the 120-frame scrub sequence ──
  await rm(path.join(OUT, "sequence"), { recursive: true, force: true });
  await mkdir(path.join(OUT, "sequence"), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", SRC,
    "-vf", chain(delogo, `fps=${fps}`, GRADE, SCALE),
    // q6 is visually indistinguishable from q4 at 2x zoom on this
    // footage and 22% smaller across 120 frames.
    "-frames:v", String(FRAMES), "-q:v", "6",
    path.join(OUT, "sequence/frame_%04d.jpg"),
  ]);

  const got = (await readdir(path.join(OUT, "sequence"))).filter((f) => f.endsWith(".jpg"));
  if (got.length !== FRAMES) {
    console.error(`Expected ${FRAMES} frames, got ${got.length}. The canvas indexes 1…${FRAMES}; the derived ${fps.toFixed(3)}fps did not land — check the source's duration metadata.`);
    process.exit(1);
  }
  let bytes = 0;
  for (const f of got) bytes += (await stat(path.join(OUT, "sequence", f))).size;
  console.log(`  sequence      ${got.length} frames @ 1600x900, ${(bytes / 1e6).toFixed(1)}MB total, ${Math.round(bytes / got.length / 1024)}KB each`);

  // ── poster (first frame) and the end state (last frame) ──
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", SRC,
    "-vf", chain(delogo, GRADE, SCALE), "-frames:v", "1", "-update", "1", "-q:v", "3",
    path.join(OUT, "poster.jpg")]);
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-sseof", "-0.4", "-i", SRC,
    "-vf", chain(delogo, GRADE, SCALE), "-frames:v", "1", "-update", "1", "-q:v", "3",
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

#!/usr/bin/env node
/**
 * Places the real photography from /assets-src/photos into /public, using the
 * crops declared in /assets-src/crop-manifest.json and nothing but ffmpeg.
 *
 * Per slot:
 *   1. crop to the manifest's normalised rectangle at SOURCE resolution, snapped
 *      to the target's exact aspect ratio around the rectangle's own centre and
 *      clamped to the frame (the manifest states intent; this enforces geometry)
 *   2. delogo the four-point sparkle watermark, but only when it actually lands
 *      inside the crop. The sparkle is not at a fixed fraction of the frame: it
 *      is a fixed ~240px offset from the bottom-right CORNER, measured across all
 *      19 sources, which is why it drifts from (0.92,0.84) on the landscapes to
 *      (0.86,0.90) on the tall portraits. img_01/02/03 carry no mark at all.
 *   3. scale to the target's exact pixel size with lanczos
 *   4. grade: eq=contrast=1.06:brightness=-0.02:saturation=1.02 + a gentle
 *      vignette. These photos are already low-key — the grade exists to sit them
 *      with the hero footage, not to crush them, so every render is sampled and
 *      its p95 luminance checked against 140-190. A slot that lands outside is
 *      re-rendered with a bounded gamma nudge (0.80-1.35, composed across at most
 *      three passes) — bounded because a macro of a white egg or a black burner
 *      simply has the highlights it has, and forcing it into the band would be the
 *      crushing this grade exists to avoid. Any slot still outside is reported.
 *   5. JPEG q4 for bowls/ingredients/story, q5 for toppings and video posters.
 *
 * The five video slots are Ken Burns push-ins built from a still, exactly as
 * scripts/gen-assets.mjs does it (5s, 25fps, zoompan to 1.18x, 1280x720, libx264
 * crf 26, no audio, +faststart). Two deliberate refinements: the zoompan is fed a
 * 2x still so the push-in does not soften, and it holds the manifest's focal
 * point instead of the frame centre.
 *
 * public/hero/** is REAL FOOTAGE built by `npm run hero` and is never touched
 * here — the manifest contains no hero slot and this script refuses one.
 *
 * Requires ffmpeg on PATH.  Run: npm run place-images
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PUB = path.join(ROOT, "public");
const SRC = path.join(ROOT, "assets-src", "photos");
const MANIFEST = path.join(ROOT, "assets-src", "crop-manifest.json");

// ── grade ────────────────────────────────────────────────────────────────────
const GRADE = "eq=contrast=1.06:brightness=-0.02:saturation=1.02";
const VIGNETTE = "vignette=PI/7";        // gentle; gen-assets uses PI/3.4 on synthetic plates
const P95_MIN = 140, P95_MAX = 190, P95_AIM = 165;
const GAMMA_MIN = 0.80, GAMMA_MAX = 1.35;
const MAX_PASSES = 3;

// ── video ────────────────────────────────────────────────────────────────────
const CLIP_SECS = 5, CLIP_FPS = 25, CLIP_W = 1280, CLIP_H = 720, CLIP_ZOOM = 0.18;

/** Target pixel size + JPEG quality per slot family. */
function targetSpec(target) {
  if (target.startsWith("hero/")) throw new Error(`refusing to write ${target} — public/hero is real footage`);
  if (target.startsWith("bowls/")) return { kind: "still", w: 1600, h: 1067, q: 4 };
  if (target.startsWith("toppings/")) return { kind: "still", w: 400, h: 400, q: 5 };
  if (target.startsWith("ingredients/")) return { kind: "still", w: 1200, h: 900, q: 4 };
  if (target.startsWith("story/")) return { kind: "still", w: 1200, h: 800, q: 4 };
  if (target.startsWith("video/") && target.endsWith(".mp4")) return { kind: "video", w: CLIP_W, h: CLIP_H, q: 5 };
  throw new Error(`unknown target family: ${target}`);
}

async function probe(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file,
  ]);
  const [w, h] = stdout.trim().split("x").map(Number);
  return { w, h };
}

/**
 * Normalised rect -> integer source pixels, snapped to the target aspect ratio
 * around its own centre, then clamped inside the frame.
 */
function resolveCrop(entry, src, ar) {
  const W = src.w, H = src.h;
  let cw = Math.round(entry.w * W);
  let ch = Math.round(entry.h * H);
  let cx = Math.round(entry.x * W);
  let cy = Math.round(entry.y * H);

  // clamp the requested rect into the frame before snapping
  cx = Math.min(Math.max(cx, 0), W - 1);
  cy = Math.min(Math.max(cy, 0), H - 1);
  cw = Math.min(cw, W - cx);
  ch = Math.min(ch, H - cy);

  const before = { cx, cy, cw, ch };

  // snap to the exact target aspect ratio, shrinking the long axis about the centre
  if (cw / ch > ar) {
    const nw = Math.round(ch * ar);
    cx += Math.round((cw - nw) / 2);
    cw = nw;
  } else {
    const nh = Math.round(cw / ar);
    cy += Math.round((ch - nh) / 2);
    ch = nh;
  }

  // a snap can only shrink, but the recentring can push an edge out — pull it back
  cw = Math.min(cw, W);
  ch = Math.min(ch, H);
  cx = Math.min(Math.max(cx, 0), W - cw);
  cy = Math.min(Math.max(cy, 0), H - ch);

  const moved = Math.max(
    Math.abs(before.cx - cx), Math.abs(before.cy - cy),
    Math.abs(before.cw - cw), Math.abs(before.ch - ch),
  );
  return { cx, cy, cw, ch, moved };
}

/**
 * Where the sparkle lands inside this crop, in crop-local pixels — or null when
 * the source is unmarked or the mark falls outside the rectangle.
 */
function delogoBox(wm, sourceId, src, crop) {
  if (wm.unmarkedSources.includes(sourceId)) return null;
  const bw = wm.boxWidth, bh = wm.boxHeight;
  const bx = src.w - wm.offsetFromRight - Math.round(bw / 2);
  const by = src.h - wm.offsetFromBottom - Math.round(bh / 2);

  // intersect with the crop, in crop-local coordinates
  const rx = bx - crop.cx, ry = by - crop.cy;
  if (rx + bw <= 0 || ry + bh <= 0 || rx >= crop.cw || ry >= crop.ch) return null;

  // delogo interpolates from the pixels around its box, so it must stay a pixel
  // inside the frame on every side
  const x = Math.max(1, rx);
  const y = Math.max(1, ry);
  const w = Math.min(rx + bw, crop.cw - 1) - x;
  const h = Math.min(ry + bh, crop.ch - 1) - y;
  if (w < 8 || h < 8) return null;
  return { x, y, w, h };
}

function filterChain({ crop, box, w, h, gamma }) {
  const parts = [`crop=${crop.cw}:${crop.ch}:${crop.cx}:${crop.cy}`];
  if (box) parts.push(`delogo=x=${box.x}:y=${box.y}:w=${box.w}:h=${box.h}`);
  parts.push(`scale=${w}:${h}:flags=lanczos`);
  parts.push(gamma && gamma !== 1 ? `${GRADE}:gamma=${gamma.toFixed(3)}` : GRADE);
  parts.push(VIGNETTE);
  parts.push("format=yuv420p");
  return parts.join(",");
}

async function renderStill(srcFile, out, chain, q) {
  await mkdir(path.dirname(out), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", srcFile,
    "-vf", chain, "-frames:v", "1", "-update", "1", "-q:v", String(q), out,
  ]);
}

/** p95 of luma, sampled from a 320px-wide grayscale decode of the finished file. */
async function p95(file) {
  const { stdout } = await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-i", file,
    "-vf", "scale=320:-2", "-frames:v", "1", "-pix_fmt", "gray",
    "-f", "rawvideo", "-",
  ], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  const hist = new Uint32Array(256);
  for (const v of stdout) hist[v]++;
  const cut = stdout.length * 0.95;
  let acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= cut) return i; }
  return 255;
}

/**
 * Gamma correction that would move a measured p95 toward P95_AIM. Gammas compose
 * by multiplication — pow(pow(x,1/g1),1/g2) === pow(x,1/(g1*g2)) — so successive
 * passes multiply into the running value, which is what keeps the bound honest.
 */
function gammaFor(p) {
  const q = Math.min(Math.max(p, 1), 254) / 255;
  return Math.log(q) / Math.log(P95_AIM / 255);
}
const clampGamma = (g) => Math.min(Math.max(g, GAMMA_MIN), GAMMA_MAX);

async function buildClip(still, out, focus) {
  const frames = CLIP_SECS * CLIP_FPS;
  const [fx, fy] = focus ?? [0.5, 0.5];
  const zoom = `min(${(1 + CLIP_ZOOM).toFixed(2)},1+${CLIP_ZOOM}*on/${frames})`;
  await mkdir(path.dirname(out), { recursive: true });
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", still,
    "-t", String(CLIP_SECS), "-r", String(CLIP_FPS),
    "-vf",
      `zoompan=z='${zoom}':d=1` +
      `:x='(iw-iw/zoom)*${fx}':y='(ih-ih/zoom)*${fy}'` +
      `:s=${CLIP_W}x${CLIP_H}:fps=${CLIP_FPS},format=yuv420p`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "26",
    "-movflags", "+faststart", "-an", out,
  ]);
}

async function main() {
  const t0 = Date.now();
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const wm = manifest.watermark;
  console.log(`Placing ${manifest.entries.length} slots from ${path.relative(ROOT, SRC)}…\n`);

  let stills = 0, clips = 0, delogos = 0, nudges = 0, snapped = 0;
  const flags = [];

  for (const entry of manifest.entries) {
    const spec = targetSpec(entry.target);
    const srcFile = path.join(SRC, `${entry.source}.jpg`);
    const src = await probe(srcFile);
    const ar = spec.w / spec.h;
    const crop = resolveCrop(entry, src, ar);
    const box = delogoBox(wm, entry.source, src, crop);
    if (box) delogos++;
    if (crop.moved > 2) snapped++;

    const isVideo = spec.kind === "video";
    let nudged = false;
    const outStill = isVideo
      ? path.join(PUB, entry.target.replace(/\.mp4$/, "-poster.jpg"))
      : path.join(PUB, entry.target);

    // pass 1 ungraded, then up to two bounded gamma nudges toward the p95 band
    let gamma = 1, p = 0, p0 = 0;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      await renderStill(srcFile, outStill, filterChain({ crop, box, w: spec.w, h: spec.h, gamma }), spec.q);
      p = await p95(outStill);
      if (pass === 0) { p0 = p; nudged = false; }
      if (p >= P95_MIN && p <= P95_MAX) break;
      const next = clampGamma(gamma * gammaFor(p));
      if (Math.abs(next - gamma) < 0.005) break;   // already pinned at a bound
      gamma = next;
      nudged = true;
    }
    if (nudged) nudges++;

    const ok = p >= P95_MIN && p <= P95_MAX;
    if (!ok) flags.push(`${entry.target} p95=${p}`);
    stills++;

    const note = [
      `${entry.source} ${crop.cw}x${crop.ch}+${crop.cx}+${crop.cy}`,
      box ? "delogo" : "no-mark",
      gamma !== 1 ? `gamma ${gamma.toFixed(2)} (p95 ${p0}→${p})` : `p95 ${p}`,
      ok ? "" : "OUT OF RANGE",
    ].filter(Boolean).join("  ");
    console.log(`  ${entry.target.padEnd(28)} ${note}`);

    if (isVideo) {
      // 2x still purely as zoompan input, so a 1.18x push-in stays sharp
      const tmp = path.join(PUB, "video", `.${path.basename(entry.target, ".mp4")}-src.jpg`);
      await renderStill(srcFile, tmp, filterChain({ crop, box, w: CLIP_W * 2, h: CLIP_H * 2, gamma }), 2);
      await buildClip(tmp, path.join(PUB, entry.target), entry.focus);
      await rm(tmp, { force: true });
      clips++;
      const { size } = await stat(path.join(PUB, entry.target));
      console.log(`  ${entry.target.padEnd(28)} clip ${CLIP_SECS}s ${CLIP_W}x${CLIP_H} crf26  ${(size / 1024).toFixed(0)} KB`);
    }
  }

  console.log(
    `\n${stills} stills (${clips} of them video posters) · ${clips} clips · ` +
    `${delogos} delogo'd · ${nudges} gamma nudges · ${snapped} rects snapped to ratio`,
  );
  if (flags.length) console.log(`p95 still outside ${P95_MIN}-${P95_MAX}: ${flags.join(", ")}`);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s → /public`);
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

main().then(clearImageCache).catch((e) => { console.error("\nPlacement failed:", e.message); process.exit(1); });

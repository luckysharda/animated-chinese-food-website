"use client";

/**
 * BowlScene — the contents of the hero's exploded-view canvas.
 *
 * ═══ THE ONE RULE IN THIS FILE ═══════════════════════════════════════════════
 * `explodeRef.current.v` is a function of SCROLL, so it is owned by GSAP and is
 * READ here, never stored. It is not state, not a prop that changes, not a
 * context value. Every transform below is a PURE FUNCTION of that number, which
 * is also what makes `frameloop="demand"` correct: a frame that is not requested
 * is a frame that would have drawn exactly what is already on screen. No
 * `clock.elapsedTime` drift, no spring settling, no hidden per-frame state.
 *
 * Nothing is loaded from the network. Every mesh is lathed / extruded / instanced
 * from primitives, and the "environment" is a 128×64 canvas gradient run through
 * PMREM — so the PBR materials get a real IBL response with zero bytes fetched.
 */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { invalidate, useFrame, useThree } from "@react-three/fiber";

/* ════════════════════════════════════════════════════════════════════════════
   TUNING
   ════════════════════════════════════════════════════════════════════════════ */

/** Instanced broth droplets. Brief asks for 300–500. */
const DROPLETS = 400;

/**
 * How much of the 0→1 explode range one piece's own flight occupies. The rest of
 * the range is spent as its start delay, which is what staggers the launch.
 * `max(delay) + SPAN` must land on 1.0 so the last piece finishes exactly at the
 * end of the scroll, not before it.
 */
const SPAN = 0.66;

/** Bowl origin. The rim ends up a hair above world zero. */
const BOWL_Y = -0.6;

/* ════════════════════════════════════════════════════════════════════════════
   MATH
   ════════════════════════════════════════════════════════════════════════════ */

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Cubic ease-out — the 3D cousin of the house cubic-bezier(0.16,1,0.3,1). */
const outCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * A tiny deterministic LCG. Math.random() would re-scatter the noodle nest and
 * the droplet field on every remount (React 19 StrictMode mounts twice), so the
 * scene would not look the same twice in development.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   THE EIGHT AIRBORNE PIECES
   Two chashu slices, nori, menma, a set of three scallion rings, narutomaki,
   a corn cluster and the noodle nest. No egg — the brief is explicit.
   ════════════════════════════════════════════════════════════════════════════ */

type PieceId =
  | "noodles"
  | "chashuA"
  | "chashuB"
  | "nori"
  | "menma"
  | "narutomaki"
  | "corn"
  | "scallions";

interface Piece {
  id: PieceId;
  /** Nested position at explode = 0. */
  rest: [number, number, number];
  /** Nested rotation at explode = 0, radians. */
  restRot: [number, number, number];
  /** Outward flight vector — normalised at build time. Mostly +Y, some lateral. */
  dir: [number, number, number];
  /** Flight length in world units. */
  dist: number;
  /** The piece's own tumble axis — normalised at build time. */
  axis: [number, number, number];
  /** Total tumble, radians, at full explode. */
  spin: number;
  /** Launch delay, as a fraction of the explode range. */
  delay: number;
  /** Sideways sway at mid-flight, so the paths are arcs and not spokes. */
  drift: number;
}

const PIECES: readonly Piece[] = [
  {
    id: "noodles",
    rest: [0, -0.17, 0],
    restRot: [0, 0.2, 0],
    dir: [0, 1, 0.06],
    dist: 1.15,
    axis: [0.06, 0.99, 0.1],
    spin: 0.9,
    delay: 0.0,
    drift: 0.05,
  },
  {
    id: "nori",
    rest: [-0.07, 0.05, -0.47],
    restRot: [0.62, 0.06, 0.04],
    dir: [-0.12, 0.86, -0.5],
    dist: 1.55,
    axis: [0.88, 0.22, 0.42],
    spin: 3.2,
    delay: 0.04,
    drift: 0.16,
  },
  {
    id: "chashuA",
    rest: [-0.37, -0.07, 0.15],
    restRot: [-0.78, 0.32, 0.34],
    dir: [-0.56, 0.8, 0.24],
    dist: 1.46,
    axis: [0.2, 0.6, 0.77],
    spin: 2.5,
    delay: 0.09,
    drift: 0.14,
  },
  {
    id: "narutomaki",
    rest: [-0.31, -0.04, -0.29],
    restRot: [0.14, 0.42, 0.06],
    dir: [-0.44, 0.86, -0.26],
    dist: 1.5,
    axis: [0.5, 0.32, 0.8],
    spin: -3.5,
    delay: 0.14,
    drift: 0.12,
  },
  {
    id: "chashuB",
    rest: [0.25, -0.06, 0.31],
    restRot: [-1.05, -0.5, -0.28],
    dir: [0.5, 0.84, 0.28],
    dist: 1.36,
    axis: [-0.3, 0.5, 0.81],
    spin: -2.1,
    delay: 0.2,
    drift: 0.13,
  },
  {
    id: "menma",
    rest: [0.45, -0.06, -0.13],
    restRot: [0.1, -0.52, 0.06],
    dir: [0.64, 0.75, -0.22],
    dist: 1.4,
    axis: [0.12, 0.9, 0.42],
    spin: 2.8,
    delay: 0.25,
    drift: 0.18,
  },
  {
    id: "corn",
    rest: [0.33, -0.07, 0.35],
    restRot: [0, 0.6, 0],
    dir: [0.38, 0.9, 0.24],
    dist: 1.3,
    axis: [0.6, 0.7, 0.4],
    spin: 4.1,
    delay: 0.3,
    drift: 0.2,
  },
  {
    id: "scallions",
    rest: [0.03, 0.03, 0.17],
    restRot: [0, 0, 0],
    dir: [-0.06, 0.98, 0.2],
    dist: 1.6,
    axis: [0.35, 0.85, 0.4],
    spin: 3.7,
    delay: 0.34,
    drift: 0.22,
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   GEOMETRY BUILDERS — all primitives, no GLB anywhere on this site.
   ════════════════════════════════════════════════════════════════════════════ */

/**
 * The donburi profile, revolved around Y. Note LatheGeometry requires every
 * point's x to be > 0, so the two centre points sit at 0.001 rather than 0.
 * Order runs up the inside, over the rim lip, down the outside, under the foot
 * ring and back to the centre, which closes the solid.
 */
function makeBowl(): THREE.LatheGeometry {
  const p = (x: number, y: number): THREE.Vector2 => new THREE.Vector2(x, y);
  const profile: THREE.Vector2[] = [
    p(0.001, 0.1),
    p(0.14, 0.086),
    p(0.32, 0.122),
    p(0.52, 0.218),
    p(0.72, 0.358),
    p(0.86, 0.5),
    p(0.945, 0.602),
    p(0.985, 0.635),
    p(1.025, 0.632),
    p(1.005, 0.596),
    p(0.925, 0.478),
    p(0.762, 0.318),
    p(0.552, 0.168),
    p(0.362, 0.072),
    p(0.302, 0.042),
    p(0.3, 0.0),
    p(0.258, 0.0),
    p(0.256, 0.04),
    p(0.2, 0.056),
    p(0.001, 0.062),
  ];
  return new THREE.LatheGeometry(profile, 72);
}

/** A sheet of nori with a gentle curl baked into the vertices. */
function makeNori(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(0.52, 0.6, 10, 12);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 4.2) * 0.036 + Math.cos(y * 2.6) * 0.018);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

interface Strand {
  geo: THREE.TorusGeometry;
  pos: [number, number, number];
  rot: [number, number, number];
}

/** The noodle nest: partial tori, laid flat and jittered, read as loose strands. */
function makeNoodles(): Strand[] {
  const rand = lcg(0x5eed01);
  const out: Strand[] = [];
  for (let i = 0; i < 8; i += 1) {
    const r = 0.19 + rand() * 0.3;
    const arc = 3.1 + rand() * 2.7;
    out.push({
      geo: new THREE.TorusGeometry(r, 0.029, 6, 28, arc),
      pos: [(rand() - 0.5) * 0.32, (rand() - 0.5) * 0.13, (rand() - 0.5) * 0.32],
      rot: [Math.PI / 2 + (rand() - 0.5) * 0.7, rand() * Math.PI * 2, (rand() - 0.5) * 0.55],
    });
  }
  return out;
}

interface Kernel {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
}

/** A loose cluster of corn kernels — one shared sphere, squashed per instance. */
function makeCorn(): Kernel[] {
  const rand = lcg(0xc0f1e);
  const out: Kernel[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + rand() * 0.6;
    const r = 0.03 + rand() * 0.1;
    out.push({
      pos: [Math.cos(a) * r, (rand() - 0.5) * 0.06, Math.sin(a) * r],
      rot: [rand() * 3.14, rand() * 3.14, rand() * 3.14],
      scale: [0.052, 0.04, 0.044],
    });
  }
  return out;
}

/** Three scallion rings, scattered — offsets only, the tumble is the parent's. */
const SCALLIONS: ReadonlyArray<{ pos: [number, number, number]; rot: [number, number, number] }> = [
  { pos: [-0.1, 0.0, 0.06], rot: [1.42, 0.3, 0.12] },
  { pos: [0.09, 0.02, -0.05], rot: [1.2, -0.5, -0.2] },
  { pos: [0.02, -0.01, 0.16], rot: [1.6, 0.9, 0.05] },
];

/* ── canvas textures ─────────────────────────────────────────────────────── */

/** The narutomaki spiral, drawn once into a 256² canvas. */
function makeSpiralTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = "#cf1f27";
  ctx.lineWidth = S * 0.052;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const steps = 280;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = t * 2.6 * Math.PI * 2;
    const r = t * S * 0.4;
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * A near-black equirectangular environment: a cool wash overhead, a warm ember
 * pool low and to the front. It never becomes the background — it exists only so
 * the standard materials have something to reflect.
 */
function makeEnvTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const W = 128;
  const H = 64;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d1826"); // cool zenith
  sky.addColorStop(0.45, "#05070a");
  sky.addColorStop(1, "#0a0603"); // warm-leaning floor
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Warm pool, below the horizon and toward the front of the equirect strip.
  const warm = ctx.createRadialGradient(W * 0.5, H * 0.86, 0, W * 0.5, H * 0.86, W * 0.42);
  warm.addColorStop(0, "#8a3208");
  warm.addColorStop(0.5, "#2a0f03");
  warm.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);

  // Cool counter-pool behind, so the rim light has something to sit in.
  const cool = ctx.createRadialGradient(W * 0.02, H * 0.3, 0, W * 0.02, H * 0.3, W * 0.3);
  cool.addColorStop(0, "#16324f");
  cool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ════════════════════════════════════════════════════════════════════════════
   RESOURCES — built once, disposed once.
   ════════════════════════════════════════════════════════════════════════════ */

interface Resources {
  geo: {
    bowl: THREE.LatheGeometry;
    rim: THREE.TorusGeometry;
    broth: THREE.CircleGeometry;
    chashu: THREE.CylinderGeometry;
    chashuFat: THREE.TorusGeometry;
    nori: THREE.BufferGeometry;
    menma: THREE.BoxGeometry;
    scallion: THREE.TorusGeometry;
    narutoBody: THREE.CylinderGeometry;
    narutoRim: THREE.TorusGeometry;
    narutoFace: THREE.CircleGeometry;
    kernel: THREE.SphereGeometry;
    droplet: THREE.SphereGeometry;
  };
  mat: {
    ceramic: THREE.MeshStandardMaterial;
    glaze: THREE.MeshStandardMaterial;
    broth: THREE.MeshStandardMaterial;
    pork: THREE.MeshStandardMaterial;
    fat: THREE.MeshStandardMaterial;
    nori: THREE.MeshStandardMaterial;
    menma: THREE.MeshStandardMaterial;
    scallion: THREE.MeshStandardMaterial;
    narutoWhite: THREE.MeshStandardMaterial;
    narutoRim: THREE.MeshStandardMaterial;
    narutoFace: THREE.MeshStandardMaterial;
    corn: THREE.MeshStandardMaterial;
    noodle: THREE.MeshStandardMaterial;
    droplet: THREE.MeshStandardMaterial;
  };
  strands: Strand[];
  kernels: Kernel[];
  spiral: THREE.CanvasTexture | null;
  dispose: () => void;
}

function buildResources(): Resources {
  const spiral = makeSpiralTexture();
  const strands = makeNoodles();
  const kernels = makeCorn();

  const geo: Resources["geo"] = {
    bowl: makeBowl(),
    rim: new THREE.TorusGeometry(1.004, 0.022, 8, 72),
    broth: new THREE.CircleGeometry(0.8, 64),
    chashu: new THREE.CylinderGeometry(0.275, 0.275, 0.09, 40),
    chashuFat: new THREE.TorusGeometry(0.272, 0.032, 8, 40),
    nori: makeNori(),
    menma: new THREE.BoxGeometry(0.055, 0.03, 0.4),
    scallion: new THREE.TorusGeometry(0.058, 0.019, 7, 22),
    narutoBody: new THREE.CylinderGeometry(0.2, 0.2, 0.05, 40),
    narutoRim: new THREE.TorusGeometry(0.199, 0.026, 7, 44),
    narutoFace: new THREE.CircleGeometry(0.198, 40),
    kernel: new THREE.SphereGeometry(1, 10, 7),
    droplet: new THREE.SphereGeometry(1, 6, 4),
  };

  const mat: Resources["mat"] = {
    ceramic: new THREE.MeshStandardMaterial({
      color: "#10151c",
      roughness: 0.36,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
    glaze: new THREE.MeshStandardMaterial({ color: "#1d2733", roughness: 0.14, metalness: 0.12 }),
    broth: new THREE.MeshStandardMaterial({ color: "#3b2109", roughness: 0.14, metalness: 0.24 }),
    pork: new THREE.MeshStandardMaterial({ color: "#5e2c1c", roughness: 0.68, metalness: 0 }),
    fat: new THREE.MeshStandardMaterial({ color: "#d8c0a0", roughness: 0.44, metalness: 0 }),
    nori: new THREE.MeshStandardMaterial({
      color: "#0d1712",
      roughness: 0.52,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
    menma: new THREE.MeshStandardMaterial({ color: "#b28a3b", roughness: 0.62 }),
    scallion: new THREE.MeshStandardMaterial({ color: "#5d9c33", roughness: 0.44 }),
    narutoWhite: new THREE.MeshStandardMaterial({ color: "#ede4d8", roughness: 0.5 }),
    narutoRim: new THREE.MeshStandardMaterial({ color: "#d3202a", roughness: 0.44 }),
    narutoFace: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: spiral,
      transparent: true,
      roughness: 0.5,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    corn: new THREE.MeshStandardMaterial({ color: "#e5a92c", roughness: 0.3 }),
    noodle: new THREE.MeshStandardMaterial({ color: "#dcc188", roughness: 0.42 }),
    droplet: new THREE.MeshStandardMaterial({
      color: "#ffb169",
      roughness: 0.12,
      metalness: 0.1,
      emissive: new THREE.Color("#ff6b18"),
      emissiveIntensity: 0,
    }),
  };

  const dispose = (): void => {
    for (const g of Object.values(geo)) g.dispose();
    for (const m of Object.values(mat)) m.dispose();
    for (const s of strands) s.geo.dispose();
    spiral?.dispose();
  };

  return { geo, mat, strands, kernels, spiral, dispose };
}

/* ════════════════════════════════════════════════════════════════════════════
   PARTICLES
   ════════════════════════════════════════════════════════════════════════════ */

interface Droplets {
  origin: Float32Array;
  dir: Float32Array;
  dist: Float32Array;
  delay: Float32Array;
  size: Float32Array;
  spin: Float32Array;
}

function buildDroplets(): Droplets {
  const rand = lcg(0xd80f17);
  const origin = new Float32Array(DROPLETS * 3);
  const dir = new Float32Array(DROPLETS * 3);
  const dist = new Float32Array(DROPLETS);
  const delay = new Float32Array(DROPLETS);
  const size = new Float32Array(DROPLETS);
  const spin = new Float32Array(DROPLETS);

  for (let i = 0; i < DROPLETS; i += 1) {
    // Born on the broth surface, inside the bowl.
    const a = rand() * Math.PI * 2;
    const r = 0.08 + Math.sqrt(rand()) * 0.72;
    origin[i * 3] = Math.cos(a) * r;
    origin[i * 3 + 1] = -0.14 + rand() * 0.1;
    origin[i * 3 + 2] = Math.sin(a) * r;

    // Mostly up, splayed outward — a splash cone, not a sphere.
    const va = rand() * Math.PI * 2;
    const lateral = 0.15 + rand() * 0.85;
    const v = new THREE.Vector3(Math.cos(va) * lateral, 0.7 + rand() * 1.5, Math.sin(va) * lateral).normalize();
    dir[i * 3] = v.x;
    dir[i * 3 + 1] = v.y;
    dir[i * 3 + 2] = v.z;

    dist[i] = 0.75 + rand() * 1.85;
    delay[i] = rand() * 0.5;
    size[i] = 0.006 + rand() * 0.017;
    spin[i] = (rand() - 0.5) * 9;
  }

  return { origin, dir, dist, delay, size, spin };
}

/* ════════════════════════════════════════════════════════════════════════════
   PIECE BODIES
   ════════════════════════════════════════════════════════════════════════════ */

function PieceBody({ id, res }: { id: PieceId; res: Resources }): React.ReactElement {
  const { geo, mat, strands, kernels } = res;

  switch (id) {
    case "noodles":
      return (
        <>
          {strands.map((s, i) => (
            <mesh key={i} geometry={s.geo} material={mat.noodle} position={s.pos} rotation={s.rot} />
          ))}
        </>
      );

    case "chashuA":
    case "chashuB":
      return (
        <>
          <mesh geometry={geo.chashu} material={mat.pork} />
          <mesh geometry={geo.chashuFat} material={mat.fat} rotation={[Math.PI / 2, 0, 0]} />
        </>
      );

    case "nori":
      return <mesh geometry={geo.nori} material={mat.nori} />;

    case "menma":
      return (
        <>
          <mesh geometry={geo.menma} material={mat.menma} position={[-0.05, 0.005, 0.01]} rotation={[0, 0.16, 0.05]} />
          <mesh geometry={geo.menma} material={mat.menma} position={[0.01, -0.008, -0.03]} rotation={[0, -0.1, -0.04]} />
          <mesh geometry={geo.menma} material={mat.menma} position={[0.06, 0.012, 0.04]} rotation={[0, 0.3, 0.08]} />
          <mesh geometry={geo.menma} material={mat.menma} position={[0.0, 0.026, -0.02]} rotation={[0, -0.34, 0.02]} />
        </>
      );

    case "narutomaki":
      return (
        <>
          <mesh geometry={geo.narutoBody} material={mat.narutoWhite} />
          <mesh geometry={geo.narutoRim} material={mat.narutoRim} rotation={[Math.PI / 2, 0, 0]} />
          <mesh
            geometry={geo.narutoFace}
            material={mat.narutoFace}
            position={[0, 0.0262, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={geo.narutoFace}
            material={mat.narutoFace}
            position={[0, -0.0262, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </>
      );

    case "corn":
      return (
        <>
          {kernels.map((k, i) => (
            <mesh key={i} geometry={geo.kernel} material={mat.corn} position={k.pos} rotation={k.rot} scale={k.scale} />
          ))}
        </>
      );

    case "scallions":
      return (
        <>
          {SCALLIONS.map((s, i) => (
            <mesh key={i} geometry={geo.scallion} material={mat.scallion} position={s.pos} rotation={s.rot} />
          ))}
        </>
      );
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   THE SCENE
   ════════════════════════════════════════════════════════════════════════════ */

/** Scratch objects, allocated once — nothing is constructed inside useFrame. */
const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _mtx = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();

export default function BowlScene({
  explodeRef,
}: {
  explodeRef: React.RefObject<{ v: number }>;
}): React.ReactElement {
  const res = useMemo(buildResources, []);
  const drops = useMemo(buildDroplets, []);

  /**
   * GPU resources are built once and freed once — but the free is DEFERRED, and
   * that is not superstition. React 19's StrictMode mounts, unmounts and
   * immediately re-mounts every component in development while KEEPING the
   * useMemo value, so a synchronous dispose in the cleanup would free the exact
   * geometries and materials the second mount is about to draw with (a silently
   * blank canvas in dev, correct in prod — the worst possible failure shape).
   * Scheduling it a task later lets that instant re-mount cancel it; a real
   * unmount has nothing to cancel it and the resources go.
   */
  const pendingDispose = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (pendingDispose.current !== null) {
      clearTimeout(pendingDispose.current);
      pendingDispose.current = null;
    }
    return () => {
      pendingDispose.current = setTimeout(() => {
        pendingDispose.current = null;
        res.dispose();
      }, 0);
    };
  }, [res]);

  /* Per-piece constants, pre-normalised so useFrame does no vector maths setup. */
  const flight = useMemo(
    () =>
      PIECES.map((p) => ({
        dir: new THREE.Vector3(...p.dir).normalize(),
        axis: new THREE.Vector3(...p.axis).normalize(),
        base: new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.restRot)),
        rest: new THREE.Vector3(...p.rest),
      })),
    [],
  );

  const pieceRefs = useRef<Array<THREE.Group | null>>([]);
  const bowlRef = useRef<THREE.Group | null>(null);
  const keyRef = useRef<THREE.SpotLight | null>(null);
  const brothLightRef = useRef<THREE.PointLight | null>(null);
  const dropRef = useRef<THREE.InstancedMesh | null>(null);

  /* ── near-black IBL, generated locally ──────────────────────────────────── */
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const tex = makeEnvTexture();
    if (!tex) return;
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromEquirectangular(tex);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.6;
    tex.dispose();
    pmrem.dispose();
    invalidate();
    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene]);

  /* ── instance buffer set-up ─────────────────────────────────────────────── */
  useEffect(() => {
    const im = dropRef.current;
    if (!im) return;
    // Rewritten every frame, so tell the driver not to treat it as static data.
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  /* ══ the frame ══════════════════════════════════════════════════════════════
     Reads the scroll-owned ref. Writes only to three.js objects. */
  useFrame((state) => {
    const v = clamp01(explodeRef.current?.v ?? 0);
    const ev = smoothstep(v);

    /* Pieces */
    for (let i = 0; i < PIECES.length; i += 1) {
      const g = pieceRefs.current[i];
      if (!g) continue;
      const p = PIECES[i];
      const f = flight[i];

      const t = clamp01((v - p.delay) / SPAN);
      const e = outCubic(t);
      const sway = Math.sin(e * Math.PI) * p.drift;

      g.position.set(
        f.rest.x + f.dir.x * p.dist * e + sway,
        f.rest.y + f.dir.y * p.dist * e,
        f.rest.z + f.dir.z * p.dist * e + sway * 0.6,
      );

      _axis.copy(f.axis);
      g.quaternion.copy(f.base).multiply(_q.setFromAxisAngle(_axis, p.spin * e));
    }

    /* The bowl gives a little as its contents leave. */
    const bowl = bowlRef.current;
    if (bowl) {
      bowl.position.y = BOWL_Y - 0.2 * ev;
      bowl.rotation.y = 0.26 * ev;
    }

    /* The warm key ramps with the explode; the cool rim is constant. */
    // 48 blew the brown pork out to a flat saturated red; 26 keeps the
    // rim-light read without clipping the diffuse.
    if (keyRef.current) keyRef.current.intensity = 8 + 18 * ev;
    if (brothLightRef.current) brothLightRef.current.intensity = 0.4 + 2.6 * ev;
    res.mat.droplet.emissiveIntensity = 0.15 + 1.7 * ev;

    /* Droplets */
    const im = dropRef.current;
    if (im) {
      const gate = clamp01(v / 0.12);
      for (let i = 0; i < DROPLETS; i += 1) {
        const t = clamp01((v - drops.delay[i]) / 0.5);
        const e = outCubic(t);
        const i3 = i * 3;

        _pos.set(
          drops.origin[i3] + drops.dir[i3] * drops.dist[i] * e,
          drops.origin[i3 + 1] + drops.dir[i3 + 1] * drops.dist[i] * e - 0.5 * e * e * 0.55,
          drops.origin[i3 + 2] + drops.dir[i3 + 2] * drops.dist[i] * e,
        );

        // Scale IN with explode, then thin out as the droplet spends itself.
        const s = drops.size[i] * gate * Math.min(1, e * 5) * (1 - 0.45 * e * e);
        _scl.setScalar(s);

        _axis.set(drops.dir[i3 + 1], drops.dir[i3 + 2], drops.dir[i3]).normalize();
        _q.setFromAxisAngle(_axis, drops.spin[i] * e);

        _mtx.compose(_pos, _q, _scl);
        im.setMatrixAt(i, _mtx);
      }
      im.instanceMatrix.needsUpdate = true;
    }

    /* Camera pulls back and rises so the spread stays framed. */
    const cam = state.camera;
    cam.position.set(0, 0.15 + 0.72 * ev, 3.6 + 2.0 * ev);
    cam.lookAt(0, -0.15 + 0.72 * ev, 0);
  });

  return (
    <>
      {/* ── lighting: near-black, one warm key from below-front, one cool rim ── */}
      <ambientLight intensity={0.16} color="#243444" />
      <spotLight
        ref={keyRef}
        // The default target is the world origin, which is exactly where the bowl
        // is — a SpotLight.target that is not in the scene graph never gets its
        // matrixWorld updated, so moving it would be a silent no-op anyway.
        position={[0.25, -1.7, 2.3]}
        angle={0.95}
        penumbra={0.85}
        decay={1.25}
        color="#ff6b18"
        intensity={8}
      />
      <directionalLight position={[-2.6, 2.1, -3.2]} color="#84b4ff" intensity={2.4} />
      <pointLight
        ref={brothLightRef}
        position={[0, -0.12, 0]}
        color="#ff8c3a"
        distance={5}
        decay={2}
        intensity={0.4}
      />

      {/* ── the bowl ─────────────────────────────────────────────────────────── */}
      <group ref={bowlRef} position={[0, BOWL_Y, 0]}>
        <mesh geometry={res.geo.bowl} material={res.mat.ceramic} />
        <mesh geometry={res.geo.rim} material={res.mat.glaze} position={[0, 0.633, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh
          geometry={res.geo.broth}
          material={res.mat.broth}
          position={[0, 0.462, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>

      {/* ── the eight airborne pieces ────────────────────────────────────────── */}
      {PIECES.map((p, i) => (
        <group
          key={p.id}
          ref={(el) => {
            pieceRefs.current[i] = el;
          }}
          position={p.rest}
          rotation={p.restRot}
        >
          <PieceBody id={p.id} res={res} />
        </group>
      ))}

      {/* ── instanced broth droplets ─────────────────────────────────────────── */}
      <instancedMesh
        ref={dropRef}
        args={[res.geo.droplet, res.mat.droplet, DROPLETS]}
        frustumCulled={false}
      />
    </>
  );
}

export { BowlScene };

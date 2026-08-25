import * as React from "react";

/**
 * Feature flags.
 *
 * FLAG_DEFAULTS below is the entire schema. Adding a flag is one line there —
 * the key union, the value types, the override validation and the console
 * helper all read off it, so there is no second list to keep in step.
 *
 * Resolution order, highest wins:
 *
 *   1. NEXT_PUBLIC_FLAG_OVERRIDES   JSON, e.g. {"webgl-climax":true}
 *   2. localStorage                 a developer flipping a flag from the console
 *   4. the registry default
 *
 * ── how this avoids a hydration mismatch ──────────────────────────────────
 * The site is statically prerendered: the HTML is frozen at build time, so a
 * flag that changed markup during the first client render would tear the
 * hydration. Two rules make that impossible.
 *
 *   · Every resolution layer is client-only and gated behind `hydrated`. On the
 *     server `resolve()` returns the registry default, always — which is what
 *     "the default is also the SSR value" means in practice. Even the env
 *     override is not applied server-side, because NEXT_PUBLIC_* values are
 *     inlined into the client bundle at build time while the server reads
 *     process.env live: honouring them in both places is exactly how you get a
 *     build-time/run-time skew that hydration cannot survive.
 *   · useFlag() reads through useSyncExternalStore and passes a
 *     getServerSnapshot that returns that same default. React uses
 *     getServerSnapshot for the hydrating render, so the first client render
 *     reproduces the prerendered markup exactly. React then compares the live
 *     snapshot once the store is subscribed — which happens in a passive effect,
 *     after hydration has committed — and re-renders if the resolved value
 *     differs. The flag flips in a second render pass, never in the first.
 *
 * getFlag() is the imperative escape hatch, for GSAP setup, effects and event
 * handlers. It honours the same gate, but it is not React-aware: never call it
 * from a render body — that is what useFlag() is for.
 *
 * Privacy: flags are read with send_event:false, so resolving them raises no
 * remote event at all, and no flag value is attached to any captured event by
 * this module. Nothing here reads or stores person data.
 */

/* ── the registry ────────────────────────────────────────────────────────── */

/**
 * Every flag, with its default. The default is also the SSR value.
 *
 * Each entry is asserted to its full domain rather than left to infer, because
 * the contract derives `FlagValue<K>` straight from this object: without the
 * assertion `hero-frame-ladder` would type as the literal `"full"` and
 * `overrideFlag("hero-frame-ladder", "light")` would not compile. The assertion
 * is the flag's schema; `as const` keeps the table read-only.
 */
export const FLAG_DEFAULTS = {
  /** hand the hero climax to three.js instead of the footage */
  "webgl-climax": false as boolean,
  /** "full" = 120 frames | "light" = every 4th, even on desktop */
  "hero-frame-ladder": "full" as "full" | "light",
  /** copy on the lineup card CTA */
  "lineup-cta-copy": "add-to-bowl" as "add-to-bowl" | "order-now",
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type FlagValue<K extends FlagKey> = (typeof FLAG_DEFAULTS)[K];

/** The full table with each flag at its own type — the shape every layer contributes. */
type FlagValues = { [K in FlagKey]: FlagValue<K> };
/** Any legal flag value, for the places that have to hold a heterogeneous bag of them. */
type AnyFlagValue = FlagValues[FlagKey];
/** Which layer answered — surfaced by the dev helper so a surprising value is traceable. */
type FlagSource = "env" | "localStorage" | "default";

const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

function isFlagKey(key: string): key is FlagKey {
  return Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, key);
}

function warn(message: string): void {
  if (process.env.NODE_ENV !== "production") console.warn(`[flags] ${message}`);
}

/* ── layers ──────────────────────────────────────────────────────────────── */

const isBrowser = typeof window !== "undefined";
const LS_KEY = "umami:flag-overrides";

/**
 * Read once at module load. Next inlines NEXT_PUBLIC_* into the bundle, so this
 * is a build-time constant and the whole parse folds away when it is unset.
 */
const envOverrides = parseOverrides(
  process.env.NEXT_PUBLIC_FLAG_OVERRIDES,
  "NEXT_PUBLIC_FLAG_OVERRIDES",
);
let localOverrides: Partial<FlagValues> = {};

/**
 * False until the first client render is behind us. Flipped by the first
 * useSyncExternalStore subscription (a passive effect, so hydration has already
 * committed) and, as a backstop for pages where nothing calls useFlag, by a
 * task scheduled at module load. Until then every reader sees the default.
 */
let hydrated = false;

/**
 * Turns untrusted JSON — an env string or a localStorage blob — into a partial
 * flag table, dropping anything that does not belong.
 */
function parseOverrides(raw: string | null | undefined, source: string): Partial<FlagValues> {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    warn(`${source} is not valid JSON — ignoring it.`);
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    warn(`${source} must be a JSON object of flag → value — ignoring it.`);
    return {};
  }

  const out: Record<string, AnyFlagValue> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!isFlagKey(key)) {
      warn(`${source}: "${key}" is not a known flag — ignoring it.`);
      continue;
    }
    // The registry is the only schema there is, so a value is acceptable when
    // its primitive type matches the default's. That keeps "adding a flag is
    // one line" true — no per-flag validator to write.
    if (typeof value !== typeof FLAG_DEFAULTS[key]) {
      warn(`${source}: "${key}" expects a ${typeof FLAG_DEFAULTS[key]} — ignoring ${JSON.stringify(value)}.`);
      continue;
    }
    out[key] = value as AnyFlagValue;
  }
  return out as Partial<FlagValues>;
}

function readLocalOverrides(): Partial<FlagValues> {
  if (!isBrowser) return {};
  try {
    return parseOverrides(window.localStorage.getItem(LS_KEY), `localStorage["${LS_KEY}"]`);
  } catch {
    // Safari private mode throws on the property access itself, not just the
    // call — hence the try around the whole thing.
    return {};
  }
}

function writeLocalOverrides(next: Partial<FlagValues>): void {
  if (!isBrowser) return;
  try {
    if (Object.keys(next).length === 0) window.localStorage.removeItem(LS_KEY);
    else window.localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // No storage (private mode, quota, disabled cookies). The override still
    // applies to this page load; it just will not survive a reload.
  }
}

/* ── the store ───────────────────────────────────────────────────────────── */

const listeners = new Set<() => void>();

function emit(): void {
  // Copy first: a listener is free to unsubscribe while we are notifying.
  for (const listener of [...listeners]) listener();
}

function markHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  emit();
}

function resolve<K extends FlagKey>(key: K): FlagValue<K> {
  if (!isBrowser || !hydrated) return FLAG_DEFAULTS[key];
  // ?? and not ||: `false` is a legitimate resolved value and must not fall
  // through to the next layer.
  const layered = (envOverrides[key] ?? localOverrides[key]) as FlagValue<K> | undefined;
  return layered === undefined ? FLAG_DEFAULTS[key] : layered;
}

function sourceOf(key: FlagKey): FlagSource {
  if (!isBrowser || !hydrated) return "default";
  if (envOverrides[key] !== undefined) return "env";
  if (localOverrides[key] !== undefined) return "localStorage";
  return "default";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // useSyncExternalStore subscribes from a passive effect, so reaching here
  // means React has committed the hydrating render.
  markHydrated();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Render-safe reader. Returns the registry default on the server and for the
 * hydrating render, then the resolved value in a follow-up render. Use this in
 * component bodies.
 */
export function useFlag<K extends FlagKey>(key: K): FlagValue<K> {
  const getSnapshot = React.useCallback(() => resolve(key), [key]);
  const getServerSnapshot = React.useCallback(() => FLAG_DEFAULTS[key], [key]);
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Synchronous read for code outside React — GSAP setup, effects, handlers.
 * Answers with the default until hydration is over. Not React-aware: calling it
 * from a render body is the one way to reintroduce a hydration mismatch, so
 * reach for useFlag() there.
 */
export function getFlag<K extends FlagKey>(key: K): FlagValue<K> {
  return resolve(key);
}

/**
 * Local override, highest priority after the env JSON. Persists to localStorage
 * so it survives a reload, and re-renders every subscriber. Intended for
 * development — `window.__flags.set(...)` is the console-facing wrapper.
 */
export function overrideFlag<K extends FlagKey>(key: K, value: FlagValue<K>): void {
  if (!isBrowser) {
    // Module state on the server is shared between requests; a "local" override
    // there would leak into other people's responses.
    warn(`overrideFlag("${key}") ignored on the server — overrides are client-only.`);
    return;
  }
  if (!isFlagKey(key)) {
    warn(`"${key}" is not a known flag — ignoring the override.`);
    return;
  }
  if (typeof value !== typeof FLAG_DEFAULTS[key]) {
    warn(`"${key}" expects a ${typeof FLAG_DEFAULTS[key]} — ignoring ${JSON.stringify(value)}.`);
    return;
  }
  localOverrides = { ...localOverrides, [key]: value };
  writeLocalOverrides(localOverrides);
  emit();
}

function clearOverrides(key?: FlagKey): void {
  if (key === undefined) {
    localOverrides = {};
  } else {
    const next = { ...localOverrides };
    delete next[key];
    localOverrides = next;
  }
  writeLocalOverrides(localOverrides);
  emit();
}

/* ── dev console helper ──────────────────────────────────────────────────── */

type FlagsConsoleApi = {
  /** console.table-friendly: current value, where it came from, and the default. */
  list(): Record<FlagKey, { value: AnyFlagValue; source: FlagSource; default: AnyFlagValue }>;
  get<K extends FlagKey>(key: K): FlagValue<K>;
  set<K extends FlagKey>(key: K, value: FlagValue<K>): void;
  /** Drop one local override, or all of them when called bare. */
  clear(key?: FlagKey): void;
};

declare global {
  interface Window {
    __flags?: FlagsConsoleApi;
  }
}

if (isBrowser) {
  localOverrides = readLocalOverrides();

  // Imperative readers are not part of the hydration pass, so let getFlag()
  // stop answering with defaults once the current task drains — even on a page
  // where nothing ever calls useFlag(). useFlag is unaffected either way: React
  // uses getServerSnapshot for the hydrating render regardless of this flag.
  window.setTimeout(markHydrated, 0);

  // Stripped from production builds: Next inlines NODE_ENV, so the whole block
  // is dead code the minifier removes.
  if (process.env.NODE_ENV !== "production") {
    window.__flags = {
      list() {
        const rows = {} as Record<FlagKey, { value: AnyFlagValue; source: FlagSource; default: AnyFlagValue }>;
        for (const key of FLAG_KEYS) {
          rows[key] = { value: resolve(key), source: sourceOf(key), default: FLAG_DEFAULTS[key] };
        }
        return rows;
      },
      get: getFlag,
      set: overrideFlag,
      clear: clearOverrides,
    };
  }
}

"use client";

/**
 * // 08 ご注文 らーめん — ORDER YOUR RAMEN.
 *
 * The one place on the site where the visitor is allowed to type. Sections 07 and
 * 08 are the two exceptions to the no-centred-stacks rule, so the header is centred
 * and the whole reservation lives in ONE panel — bg-ink-700, a 1px line-100 border,
 * radius 10, 40px of padding — rather than being spread across the instrument frame.
 * The instrument frame still shows up, but only as the hairline strip pinned to the
 * viewport edges above the header (12px left inset / 4.8vw right).
 *
 * Ownership of motion, per the scroll doctrine:
 *   · nothing here is a function of SCROLL, so there is no GSAP and no ScrollTrigger.
 *   · everything is a function of REACT STATE — selection, validity, the form↔receipt
 *     swap — so motion owns it, and none of it ever appears under a scrub.
 *
 * The calendar is built from Date arithmetic alone; no date library is installed and
 * none is wanted. Dates are carried as local "YYYY-MM-DD" keys, which compare
 * correctly as strings and drop straight into the payload.
 *
 * Hydration: "today" is a client fact — the server's clock and timezone are not the
 * visitor's. The month is therefore resolved in an effect, and the grid renders a
 * same-shape skeleton until then, so the hydration render matches the server exactly.
 *
 * Accessibility is part of the component, not a pass over it:
 *   · the calendar is a real role="grid" with columnheaders, aria-selected cells,
 *     aria-current="date" on today, roving tabindex and arrow/Home/End/PageUp/PageDown
 *     navigation that refuses to walk into the past;
 *   · the time chips are toggle buttons with aria-pressed, and a booked-out slot is
 *     disabled and says so in its accessible name;
 *   · the stepper buttons carry aria-labels and the count is announced politely;
 *   · the CTA is aria-disabled rather than disabled, so it stays focusable and can
 *     announce WHAT IS MISSING — and clicking it sends focus to the first gap.
 *
 * Reduced motion ships in this file: Reveal renders its end state and the form↔receipt
 * swap becomes a straight cut.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type MotionProps } from "motion/react";

import { order, site } from "@/data/content";
import { BracketFrame } from "@/components/ui/BracketFrame";
import { Micro } from "@/components/ui/Micro";
import { Numeric } from "@/components/ui/Numeric";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** The house ease + durations, as motion units. */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DUR = 0.42;

/* ── calendar vocabulary ──────────────────────────────────────────────────────
   content.ts carries the site's COPY; it deliberately does not carry month and
   weekday names, and Intl formatting is locale- and server-dependent (a hydration
   mismatch waiting to happen). These are format labels, not copy. */
const MONTHS = [
  { en: "JANUARY", jp: "一月" },
  { en: "FEBRUARY", jp: "二月" },
  { en: "MARCH", jp: "三月" },
  { en: "APRIL", jp: "四月" },
  { en: "MAY", jp: "五月" },
  { en: "JUNE", jp: "六月" },
  { en: "JULY", jp: "七月" },
  { en: "AUGUST", jp: "八月" },
  { en: "SEPTEMBER", jp: "九月" },
  { en: "OCTOBER", jp: "十月" },
  { en: "NOVEMBER", jp: "十一月" },
  { en: "DECEMBER", jp: "十二月" },
] as const;

const WEEKDAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/* ── the handful of interface words content.ts has no entry for ─────────────── */
const ui = {
  prevMonth: "Previous month",
  nextMonth: "Next month",
  nameLabel: "氏名 // NAME",
  namePlaceholder: "YAMADA TARO",
  emailLabel: "電子郵件 // EMAIL",
  emailPlaceholder: "you@example.com",
  emailError: "ENTER A VALID EMAIL ADDRESS",
  decrease: "Decrease guests",
  increase: "Increase guests",
  guestUnit: "人",
  missing: "REQUIRED",
  ready: "ALL FIELDS COMPLETE",
  receiptTitle: "予約控え",
  receiptLatin: "RESERVATION RECORDED",
  receiptBody: "No payment is taken now. Arrive five minutes early and give the name at the pass.",
  amend: "AMEND RESERVATION",
  fields: { date: "DATE", time: "TIME", name: "NAME", email: "EMAIL", guests: "GUESTS" },
  full: "FULL",
} as const;

const MIN_GUESTS = 1;
const MAX_GUESTS = 6;

/** The two service bands, widened off the `as const` tuples so one map covers both. */
const BANDS: ReadonlyArray<{ label: string; slots: readonly string[] }> = [
  order.lunch,
  order.dinner,
];

/* ── date maths, by hand ─────────────────────────────────────────────────────── */

const pad = (n: number): string => String(n).padStart(2, "0");

/** A local calendar day, as "YYYY-MM-DD". Sorts lexicographically = chronologically. */
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysInMonth(y: number, m: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(y, m + 1, 0).getDate();
}

/** Month arithmetic that clamps the day: 31 Mar − 1 month is 28/29 Feb, not 3 Mar. */
function shiftMonth(d: Date, delta: number): Date {
  const y = d.getFullYear();
  const m = d.getMonth() + delta;
  return new Date(y, m, Math.min(d.getDate(), daysInMonth(y, m)));
}

/** Six-ish rows of seven cells; null is a leading/trailing blank. */
function buildMonth(y: number, m: number): Array<Array<string | null>> {
  const lead = new Date(y, m, 1).getDay();
  const total = daysInMonth(y, m);
  const cells: Array<string | null> = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(`${y}-${pad(m + 1)}-${pad(d)}`);
  // Always six rows: a five-row month would otherwise shrink the panel by 44px
  // mid-interaction, and the grid must also match the pre-mount skeleton exactly.
  while (cells.length < 42) cells.push(null);
  const weeks: Array<Array<string | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** The pre-mount stand-in: identical shape, so the hydration render matches the server. */
const SKELETON: Array<Array<string | null>> = Array.from({ length: 6 }, () =>
  Array.from({ length: 7 }, () => null),
);

/** "2026-08-29" → "SAT 29 AUG 2026" for the receipt, "Saturday, 29 AUGUST 2026" for SRs. */
function longDate(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].en} ${d.getFullYear()}`;
}

function stampDate(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAY_SHORT[d.getDay()]} ${pad(d.getDate())} ${MONTHS[d.getMonth()].en.slice(0, 3)} ${d.getFullYear()}`;
}

/** Deliberately permissive — this is a shape check, not an address validator. */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

interface Reservation {
  date: string;
  time: string;
  name: string;
  email: string;
  guests: number;
}

/* ── the numbered block heading: "01 · SELECT DATE" split into its two registers ── */
function StepHeader({ step, id }: { step: string; id?: string }): React.ReactElement {
  const [no, ...rest] = step.split(" · ");
  return (
    <div id={id} className="flex items-baseline gap-3 border-b border-line-100 pb-3">
      <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-text-hi tabular-nums">
        {no}
      </span>
      <Micro className="text-text-mid">{rest.join(" · ")}</Micro>
    </div>
  );
}

export default function Order(): React.ReactElement {
  const reduced = useReducedMotion();
  const uid = useId();

  /* Today is resolved on the client only — see the hydration note above. */
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const [dateKey, setDateKey] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [guests, setGuests] = useState(2);
  const [attempted, setAttempted] = useState(false);
  const [receipt, setReceipt] = useState<Reservation | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const timesRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  /** Set only by keyboard navigation, so the grid never steals focus on mount. */
  const pullFocus = useRef(false);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setToday(midnight);
    setView({ y: midnight.getFullYear(), m: midnight.getMonth() });
    setFocusKey(keyOf(midnight));
  }, []);

  const todayKey = today ? keyOf(today) : null;
  const weeks = useMemo(
    () => (view ? buildMonth(view.y, view.m) : SKELETON),
    [view],
  );

  const selectable = useCallback(
    (key: string) => todayKey !== null && key >= todayKey,
    [todayKey],
  );

  /** Move the roving cell, following it into another month if that is where it went. */
  const moveFocus = useCallback(
    (next: Date) => {
      const key = keyOf(next);
      if (!selectable(key)) return; // the past is not navigable
      // Nothing moved (a clamped step at the near edge): leave the focus flag alone,
      // or it would fire on some later, unrelated state change and steal focus back.
      if (key === focusKey) return;
      setFocusKey(key);
      setView({ y: next.getFullYear(), m: next.getMonth() });
      pullFocus.current = true;
    },
    [focusKey, selectable],
  );

  useEffect(() => {
    if (!pullFocus.current || !focusKey) return;
    pullFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focusKey}"]`)
      ?.focus();
  }, [focusKey, view]);

  const onDayKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, key: string) => {
      const current = fromKey(key);
      const step: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };

      let next: Date | null = null;
      if (event.key in step) {
        next = new Date(
          current.getFullYear(),
          current.getMonth(),
          current.getDate() + step[event.key],
        );
      } else if (event.key === "Home") {
        next = new Date(
          current.getFullYear(),
          current.getMonth(),
          current.getDate() - current.getDay(),
        );
      } else if (event.key === "End") {
        next = new Date(
          current.getFullYear(),
          current.getMonth(),
          current.getDate() + (6 - current.getDay()),
        );
      } else if (event.key === "PageUp") {
        next = shiftMonth(current, -1);
      } else if (event.key === "PageDown") {
        next = shiftMonth(current, 1);
      } else {
        return;
      }

      event.preventDefault();
      // Home/PageUp can land behind today; clamp rather than refuse outright.
      if (todayKey && keyOf(next) < todayKey) next = fromKey(todayKey);
      moveFocus(next);
    },
    [moveFocus, todayKey],
  );

  /** Step the visible month. Focus stays on the nav button; only the roving cell moves. */
  const stepMonth = useCallback(
    (delta: number) => {
      if (!view || !todayKey) return;
      const y = view.y;
      const m = view.m + delta;
      const first = new Date(y, m, 1);
      const next = { y: first.getFullYear(), m: first.getMonth() };
      if (`${next.y}-${pad(next.m + 1)}-31` < todayKey) return; // entirely in the past
      // The nav button keeps focus — only the roving cell moves.
      pullFocus.current = false;
      setView(next);
      const firstKey = `${next.y}-${pad(next.m + 1)}-01`;
      setFocusKey(firstKey < todayKey ? todayKey : firstKey);
    },
    [todayKey, view],
  );

  const atFirstMonth =
    !view || !today
      ? true
      : view.y === today.getFullYear() && view.m === today.getMonth();

  const fullSlots = useMemo(() => new Set<string>(order.full), []);

  const emailValid = isEmail(email);
  const nameValid = name.trim().length > 0;

  const missing = useMemo(() => {
    const gaps: string[] = [];
    if (!dateKey) gaps.push(ui.fields.date);
    if (!time) gaps.push(ui.fields.time);
    if (!nameValid) gaps.push(ui.fields.name);
    if (!emailValid) gaps.push(ui.fields.email);
    return gaps;
  }, [dateKey, emailValid, nameValid, time]);

  const complete = missing.length === 0;

  const focusFirstGap = useCallback(() => {
    if (!dateKey) {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${focusKey ?? ""}"]`)
        ?.focus();
      return;
    }
    if (!time) {
      timesRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
      return;
    }
    if (!nameValid) {
      nameRef.current?.focus();
      return;
    }
    emailRef.current?.focus();
  }, [dateKey, focusKey, nameValid, time]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAttempted(true);
      setEmailTouched(true);
      if (!complete || !dateKey || !time) {
        focusFirstGap();
        return;
      }
      const payload: Reservation = {
        date: dateKey,
        time,
        name: name.trim(),
        email: email.trim(),
        guests,
      };
      // No network call — this is a demonstration piece. The payload is the deliverable.
      console.log("[UMAMI] reservation", payload);
      setReceipt(payload);
    },
    [complete, dateKey, email, focusFirstGap, guests, name, time],
  );

  const swap: MotionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: DUR, ease: EASE },
      };

  const monthLabel = view
    ? `${view.y} · ${MONTHS[view.m].en} ${MONTHS[view.m].jp}`
    : "————";

  const dateHeadingId = `${uid}-date`;
  const timeHeadingId = `${uid}-time`;
  const guestsHeadingId = `${uid}-guests`;
  const statusId = `${uid}-status`;
  const emailErrorId = `${uid}-email-error`;
  const showEmailError = (emailTouched || attempted) && email.length > 0 && !emailValid;

  const chip =
    "relative flex h-[52px] flex-col items-center justify-center border font-mono text-[12px] tabular-nums tracking-[0.08em] transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

  const field =
    "w-full border border-line-100 bg-ink-500 px-4 py-3 font-mono text-[13px] tracking-[0.04em] text-text-hi placeholder:text-text-dim transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200 focus:border-amber-400";

  return (
    <section id="order" className="relative w-full overflow-hidden bg-ink-800 py-24 md:py-32">
      {/* INSTRUMENT FRAME — viewport-flush, never centred, ignores the container. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-t border-line-100 pl-3 pr-[4.8vw] pt-3"
      >
        <Micro xs>{site.location}</Micro>
        <Micro xs>{site.hours}</Micro>
      </div>

      {/* CONTENT FRAME */}
      <div className="frame-content">
        <Reveal>
          <SectionHeader
            no={order.no}
            jp={order.jp}
            latin={order.latin}
            kicker={order.kicker}
            align="center"
          />
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mx-auto mt-6 max-w-[52ch] text-center text-[15px] leading-relaxed text-text-mid">
            {order.body}
          </p>
        </Reveal>

        {/* THE PANEL — one box, 40px of padding, everything inside it. */}
        <Reveal delay={0.16} className="mx-auto mt-12 w-full max-w-[1040px] md:mt-16">
          <div className="rounded-[10px] border border-line-100 bg-ink-700 p-6 sm:p-8 md:p-10">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-line-100 pb-4">
              <Micro xs>{site.openLabel}</Micro>
              <Micro xs className="shrink-0">
                {site.name}
              </Micro>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {receipt ? (
                /* ── the inline confirmation ─────────────────────────────────── */
                <motion.div key="receipt" {...swap}>
                  <BracketFrame className="px-6 py-10 sm:px-10" corners="all">
                    <div className="flex flex-col items-center text-center">
                      <Micro>{ui.receiptLatin}</Micro>
                      <p className="mt-3 font-display text-[clamp(1.8rem,4.1vw,2.85rem)] uppercase leading-[0.92] text-text-hi">
                        {ui.receiptLatin}
                      </p>
                      <p className="mt-2 font-jp text-[14px] font-bold leading-none tracking-[0.06em] text-text-low">
                        {ui.receiptTitle}
                      </p>

                      <dl className="mt-8 grid w-full max-w-[520px] grid-cols-1 gap-px overflow-hidden border border-line-100 bg-line-100 sm:grid-cols-2">
                        {[
                          [ui.fields.date, stampDate(receipt.date)],
                          [ui.fields.time, receipt.time],
                          [ui.fields.guests, `${receipt.guests} ${ui.guestUnit}`],
                          [ui.fields.name, receipt.name],
                          [ui.fields.email, receipt.email],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-ink-700 px-4 py-4 text-left">
                            <dt>
                              <Micro xs>{label}</Micro>
                            </dt>
                            <dd className="mt-2 break-all font-mono text-[13px] tracking-[0.04em] text-text-hi">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <p className="mt-8 max-w-[46ch] text-[14px] leading-relaxed text-text-mid">
                        {ui.receiptBody}
                      </p>

                      <button
                        type="button"
                        onClick={() => setReceipt(null)}
                        className="micro mt-8 border border-line-100 px-6 py-3 text-text-mid transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200 hover:text-text-hi"
                      >
                        {ui.amend}
                      </button>
                    </div>
                  </BracketFrame>
                </motion.div>
              ) : (
                /* ── the four numbered blocks ────────────────────────────────── */
                <motion.form key="form" {...swap} noValidate onSubmit={onSubmit}>
                  <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
                    {/* 01 SELECT DATE */}
                    <div className="lg:col-span-6">
                      <StepHeader step={order.steps.date} id={dateHeadingId} />

                      <div className="mt-5 flex items-center justify-between gap-4">
                        <span
                          aria-live="polite"
                          className="font-mono text-[12px] tracking-[0.14em] text-text-hi tabular-nums"
                        >
                          {monthLabel}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={ui.prevMonth}
                            disabled={!view || atFirstMonth}
                            onClick={() => stepMonth(-1)}
                            className="flex h-8 w-8 items-center justify-center border border-line-100 text-[14px] leading-none text-text-mid transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200 hover:text-text-hi disabled:cursor-not-allowed disabled:border-line-100 disabled:text-text-dim"
                          >
                            <span aria-hidden>‹</span>
                          </button>
                          <button
                            type="button"
                            aria-label={ui.nextMonth}
                            disabled={!view}
                            onClick={() => stepMonth(1)}
                            className="flex h-8 w-8 items-center justify-center border border-line-100 text-[14px] leading-none text-text-mid transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200 hover:text-text-hi disabled:cursor-not-allowed disabled:text-text-dim"
                          >
                            <span aria-hidden>›</span>
                          </button>
                        </div>
                      </div>

                      <div
                        ref={gridRef}
                        role="grid"
                        aria-labelledby={dateHeadingId}
                        aria-busy={!view}
                        className="mt-4 w-full max-w-[336px]"
                      >
                        <div role="row" className="grid grid-cols-7 gap-1">
                          {WEEKDAY_SHORT.map((short, i) => (
                            <span
                              key={short}
                              role="columnheader"
                              aria-label={WEEKDAY_FULL[i]}
                              className="micro-xs flex h-8 items-center justify-center text-text-dim"
                            >
                              {short}
                            </span>
                          ))}
                        </div>

                        {weeks.map((week, wi) => (
                          <div key={wi} role="row" className="grid grid-cols-7 gap-1">
                            {week.map((key, di) => {
                              if (!key) {
                                return (
                                  <div
                                    key={`${wi}-${di}`}
                                    role="gridcell"
                                    aria-disabled="true"
                                    className="h-10"
                                  />
                                );
                              }
                              const day = fromKey(key);
                              const isSelected = key === dateKey;
                              const isToday = key === todayKey;
                              const canPick = selectable(key);
                              return (
                                <div
                                  key={key}
                                  role="gridcell"
                                  aria-selected={isSelected}
                                  className="h-10"
                                >
                                  <button
                                    type="button"
                                    data-day={key}
                                    disabled={!canPick}
                                    tabIndex={key === focusKey ? 0 : -1}
                                    aria-current={isToday ? "date" : undefined}
                                    aria-label={longDate(key)}
                                    onKeyDown={(e) => onDayKeyDown(e, key)}
                                    onClick={() => {
                                      setDateKey(key);
                                      setFocusKey(key);
                                    }}
                                    className={cx(
                                      "relative flex h-10 w-full items-center justify-center border font-mono text-[13px] tabular-nums transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                                      isSelected
                                        ? "glow-box border-amber-400 text-amber-400"
                                        : canPick
                                          ? "border-transparent text-text-mid hover:border-line-200 hover:text-text-hi"
                                          : "cursor-not-allowed border-transparent text-text-dim",
                                    )}
                                  >
                                    {day.getDate()}
                                    {isToday && !isSelected ? (
                                      <span
                                        aria-hidden
                                        className="absolute bottom-[5px] h-px w-3 bg-line-200"
                                      />
                                    ) : null}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 02 SELECT TIME */}
                    <div className="lg:col-span-6">
                      <StepHeader step={order.steps.time} id={timeHeadingId} />

                      <div ref={timesRef} role="group" aria-labelledby={timeHeadingId}>
                        {BANDS.map((band) => (
                          <div key={band.label} className="mt-5">
                            <Micro xs className="block">
                              {band.label}
                            </Micro>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {band.slots.map((slot) => {
                                const booked = fullSlots.has(slot);
                                const isPicked = slot === time;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    disabled={booked}
                                    aria-pressed={isPicked}
                                    aria-label={booked ? `${slot} — ${ui.full}` : slot}
                                    onClick={() => setTime(slot)}
                                    className={cx(
                                      chip,
                                      isPicked
                                        ? "glow-box border-amber-400 text-amber-400"
                                        : booked
                                          ? "cursor-not-allowed border-line-100 text-text-dim"
                                          : "border-line-100 text-text-mid hover:border-line-200 hover:text-text-hi",
                                    )}
                                  >
                                    <span>{slot}</span>
                                    {booked ? (
                                      <span className="micro-xs mt-[3px] text-text-dim">
                                        {ui.full}
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 03 YOUR DETAILS */}
                    <div className="lg:col-span-7">
                      <StepHeader step={order.steps.details} />

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`${uid}-name`} className="micro mb-2 block">
                            {ui.nameLabel}
                          </label>
                          <input
                            id={`${uid}-name`}
                            ref={nameRef}
                            type="text"
                            name="name"
                            autoComplete="name"
                            required
                            placeholder={ui.namePlaceholder}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            aria-invalid={attempted && !nameValid}
                            className={field}
                          />
                        </div>

                        <div>
                          <label htmlFor={`${uid}-email`} className="micro mb-2 block">
                            {ui.emailLabel}
                          </label>
                          <input
                            id={`${uid}-email`}
                            ref={emailRef}
                            type="email"
                            name="email"
                            autoComplete="email"
                            inputMode="email"
                            required
                            placeholder={ui.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            aria-invalid={showEmailError}
                            aria-describedby={showEmailError ? emailErrorId : undefined}
                            className={field}
                          />
                          <span
                            id={emailErrorId}
                            role={showEmailError ? "alert" : undefined}
                            className={cx(
                              "micro-xs mt-2 block text-crimson",
                              showEmailError ? "visible" : "invisible",
                            )}
                          >
                            {ui.emailError}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 04 GUESTS */}
                    <div className="lg:col-span-5">
                      <StepHeader step={order.steps.guests} id={guestsHeadingId} />

                      <div
                        role="group"
                        aria-labelledby={guestsHeadingId}
                        className="mt-5 inline-flex items-center gap-6 border border-line-100 bg-ink-600 px-5 py-3"
                      >
                        <button
                          type="button"
                          aria-label={ui.decrease}
                          disabled={guests <= MIN_GUESTS}
                          onClick={() => setGuests((g) => Math.max(MIN_GUESTS, g - 1))}
                          className="flex h-9 w-9 items-center justify-center border border-line-100 text-[16px] leading-none text-text-mid transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200 hover:text-text-hi disabled:cursor-not-allowed disabled:text-text-dim"
                        >
                          <span aria-hidden>−</span>
                        </button>

                        <span aria-hidden className="inline-block min-w-[76px] text-center">
                          <Numeric
                            value={guests}
                            unit={ui.guestUnit}
                            className="text-[30px] leading-none"
                          />
                        </span>
                        <span aria-live="polite" className="sr-only">
                          {guests} {guests === 1 ? "guest" : "guests"}
                        </span>

                        <button
                          type="button"
                          aria-label={ui.increase}
                          disabled={guests >= MAX_GUESTS}
                          onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
                          className="flex h-9 w-9 items-center justify-center border border-line-100 text-[16px] leading-none text-text-mid transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-200 hover:text-text-hi disabled:cursor-not-allowed disabled:text-text-dim"
                        >
                          <span aria-hidden>+</span>
                        </button>
                      </div>

                      <Micro xs className="mt-3 block">
                        {`${MIN_GUESTS}–${MAX_GUESTS} ${ui.guestUnit}`}
                      </Micro>
                    </div>
                  </div>

                  {/* THE ONE AMBER CTA */}
                  <div className="mt-10 border-t border-line-100 pt-8">
                    <button
                      type="submit"
                      aria-disabled={!complete}
                      aria-describedby={statusId}
                      className={cx(
                        "flex w-full items-center justify-center gap-3 px-6 py-5 font-mono text-[12px] font-bold uppercase tracking-[0.22em] transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                        complete
                          ? "bg-amber-400 text-ink-900 hover:bg-amber-500"
                          : "cursor-not-allowed border border-line-100 bg-ink-600 text-text-dim",
                      )}
                    >
                      {order.cta}
                    </button>

                    <p
                      id={statusId}
                      aria-live="polite"
                      className="micro-xs mt-4 block text-center"
                    >
                      {complete
                        ? ui.ready
                        : `${ui.missing} // ${missing.join(" · ")}`}
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Every string on the site, in one place.
 * Voice: terse, technical, bilingual. Trilingual stack order is always
 * mono English kicker → large Japanese → small English translation.
 */

export const site = {
  name: "UMAMI // 拉麵",
  jp: "旨味",
  latin: "UMAMI // RAMEN",
  tagline: "Born from two worlds.",
  location: "Yokohama, Japan",
  coords: { lat: "35.4°N", lon: "139.6°E" },
  hours: "11:00–23:00",
  openLabel: "営業中 / OPEN",
} as const;

export const nav = [
  { no: "01", label: "The Bowl", href: "#lineup" },
  { no: "02", label: "The Build", href: "#build" },
  { no: "03", label: "The Steam", href: "#steam" },
  { no: "04", label: "The Simmer", href: "#simmer" },
  { no: "05", label: "The Craft", href: "#ingredients" },
  { no: "06", label: "The Story", href: "#story" },
  { no: "07", label: "Order", href: "#order" },
] as const;

/* ═══════════════ HERO ═══════════════ */

export const hero = {
  identity: {
    kicker: "— A DOSSIER OF ORIGIN",
    lines: ["BORN", "FROM", "TWO", "WORLDS"] as const,
    amberLine: 2, // index of "TWO" — the only amber word
    caption: "拉麵 · ラーメン",
    body: [
      "Born in Yokohama, 1910.",
      "Chinese wheat noodles meet",
      "Japanese craft.",
    ],
    rail: "SPECIMEN 001 // YOKOHAMA // EST 1910",
  },
  /** The caption deck. Note the gaps: the deck passes through blank frames. */
  cards: [
    {
      id: "lockup",
      from: 0.0,
      to: 0.07,
      kicker: "SLOW-SIMMERED // No.01",
      jpLine1: "旨味",
      jpLine2: "拉麵",
      latin: "UMAMI // RAMEN",
      tagline: "Slow-simmered. Bowl by bowl.",
    },
    {
      id: "dossier",
      from: 0.1,
      to: 0.29,
      kicker: "仕様書 // SPECIFICATION",
      jpTitle: "仕様書",
      no: "02",
      jpChapter: "深める",
      latin: "FUKAMERU · THE DEEPENING",
      body: "Sixty hours over a low flame. The bones give up their collagen slowly, and nothing about that can be hurried.",
      tempLabel: "CORE TEMP",
      spec: [
        ["BROTH", "TONKOTSU 60H"],
        ["NOODLE", "#22 STRAIGHT"],
        ["TARE", "SHOYU 3Y"],
        ["FAT", "BACK-FAT 12G"],
        ["SERVE", "92°C"],
        ["BATCH", "004 OF 120"],
        ["ORIGIN", "YOKOHAMA 1910"],
      ],
    },
    {
      id: "steam",
      from: 0.35,
      to: 0.55,
      kicker: "章 // CHAPTER THREE",
      no: "03",
      jpInline: "湯気",
      jpLine2: "の世界",
      latin: "THE WORLD OF STEAM",
      body: "Steam is the first thing you taste. It carries the fat, the aromatics and the heat to you before the spoon does.",
      readoutLabel: "STEAM RATE",
      readoutUnit: "G/S",
    },
    {
      id: "dossier-reprise",
      from: 0.58,
      to: 0.74,
      reprise: "dossier",
    },
  ],
  /** Hard cuts in the plate sequence — media time, not a CSS scale. */
  cuts: [0, 0.08, 0.3, 0.44, 0.62],
  instrument: {
    leftPill: "SCRUB ACTIVE",
    rightGroups: ["TEMP", "STEAM", "CH", "FRAME"],
    cta: "MENU 品書",
  },
} as const;

/* ═══════════════ // 01 LINEUP ═══════════════ */

export const lineup = {
  no: "01",
  jp: "ラインナップ",
  latin: "THE LINEUP",
  kicker: "SIGNATURE // THREE BOWLS",
  bowls: [
    {
      key: "tonkotsu" as const,
      no: "01",
      name: "SHIRO TONKOTSU",
      jp: "白豚骨",
      price: 16,
      glow: "#E8DCC0",
      body: "Pork bone broth clouded to opacity over sixty hours. Chashu, ajitama, thin straight noodles, nori, spring onion. The one that started all of it.",
      tags: ["60H BROTH", "NO.22 NOODLE", "SHOYU TARE"],
    },
    {
      key: "mala" as const,
      no: "02",
      name: "MALA TANTAN",
      jp: "麻辣担々",
      price: 15,
      glow: "#C22B0E",
      body: "Sichuan peppercorn and chilli oil over a sesame base. Minced pork, bone broth, menma, spring onion. Numbing first, hot second, sweet at the end.",
      tags: ["SICHUAN", "SESAME", "LEVEL 3"],
    },
    {
      key: "shoyu" as const,
      no: "03",
      name: "KURO SHOYU",
      jp: "黒醤油",
      price: 17,
      glow: "#2E5C8A",
      body: "Clear chicken and dashi broth, three-year aged shoyu tare, ajitama, menma, nori, wavy noodle. The quietest bowl on the menu and the hardest to make.",
      tags: ["3Y TARE", "DASHI", "WAVY CUT"],
    },
  ],
  cta: "+ ADD TO BOWL",
} as const;

/* ═══════════════ // 02 BUILD ═══════════════ */

export const build = {
  no: "02",
  jp: "組み立て",
  latin: "BUILD YOUR RAMEN",
  kicker: "INTERACTIVE // CUSTOM BOWL",
  step1: "STEP 1 · BROTH SELECTION",
  step2: "STEP 2 · ADD TOPPINGS",
  broths: [
    { key: "tonkotsu" as const, name: "TONKOTSU", jp: "豚骨", base: 16, note: "60H PORK BONE" },
    { key: "mala" as const, name: "MALA", jp: "麻辣", base: 15, note: "SICHUAN CHILLI" },
    { key: "shoyu" as const, name: "SHOYU", jp: "醤油", base: 17, note: "3Y AGED TARE" },
  ],
  toppings: [
    { key: "chashu" as const, name: "CHASHU", jp: "叉焼", price: 3 },
    { key: "ajitama" as const, name: "AJITAMA", jp: "味玉", price: 2 },
    { key: "menma" as const, name: "MENMA", jp: "メンマ", price: 2 },
    { key: "nori" as const, name: "NORI", jp: "海苔", price: 1 },
    { key: "corn" as const, name: "CORN", jp: "コーン", price: 2 },
    { key: "narutomaki" as const, name: "NARUTOMAKI", jp: "鳴門巻", price: 2 },
    { key: "chiliOil" as const, name: "CHILLI OIL", jp: "辣油", price: 1 },
    { key: "scallion" as const, name: "SCALLION", jp: "葱", price: 1 },
  ],
  totalLabel: "TOTAL PRICE",
  cta: "ADD TO ORDER",
} as const;

/* ═══════════════ // 03 STEAM ═══════════════ */

export const steam = {
  no: "03",
  jp: "湯気の世界",
  latin: "THE STEAM",
  kicker: "MEASURED // THE NUMBERS",
  spec: [
    { label: "STOCK VOLUME", value: "180 L", sub: "PER BATCH", sub2: "TWICE DAILY" },
    { label: "BONE LOAD", value: "42 KG", sub: "FEMUR + NECK", sub2: "BLANCHED 20M" },
    { label: "YIELD", value: "60 %", sub: "AFTER REDUCTION", sub2: "120 BOWLS" },
  ],
  liveBadge: "LIVE SIMMER · 92°C",
  stats: [
    { no: "01", value: 16, unit: "H", label: "MINIMUM SIMMER", body: "The broth is held at a rolling boil for sixteen hours before it is judged. Nothing about that can be hurried." },
    { no: "02", value: 70, unit: "°", label: "SERVE TEMP", body: "Below seventy the fat begins to set on the surface and the aroma closes. Every bowl leaves the pass above it." },
    { no: "03", value: 70, unit: "S", label: "NOODLE TIME", body: "Seventy seconds in the basket, no more. The noodle finishes cooking in the bowl on the way to the table." },
    { no: "04", value: 6, unit: "", label: "HANDS ON THE LINE", body: "Six people, four stations, one pass. Everything else about the room is designed around that number." },
  ],
} as const;

/* ═══════════════ // 04 SIMMER ═══════════════ */

export const simmer = {
  no: "04",
  jp: "煮込み",
  latin: "THE SIMMER · 16 HOURS",
  kicker: "PROCESS // No.04 · SIXTEEN HOURS",
  counterLabel: "ELAPSED",
} as const;

/* ═══════════════ // 05 INGREDIENTS ═══════════════ */

export const ingredients = {
  no: "05",
  jp: "手選素材 九種類",
  latin: "HAND-SELECTED · NINE KINDS",
  kicker: "SOURCING // NINE KINDS",
  body: "Nine hand-selected components. Each is sourced from a single producer, and each is refused outright if it arrives below standard — there is no second grade.",
  cells: [
    { no: "01", name: "BONE STOCK", jp: "白湯", note: "FEMUR · 60H" },
    { no: "02", name: "CHASHU", jp: "叉焼", note: "PORK BELLY · ROLLED" },
    { no: "03", name: "NOODLE", jp: "麺", note: "#22 · STRAIGHT" },
    { no: "04", name: "AJITAMA", jp: "味玉", note: "6M30S · SHOYU CURED" },
    { no: "05", name: "SCALLION", jp: "葱", note: "CUT TO ORDER" },
    { no: "06", name: "CORN", jp: "コーン", note: "HOKKAIDO · SEARED" },
    { no: "07", name: "CHILLI OIL", jp: "辣油", note: "SICHUAN · 12 SPICE" },
    { no: "08", name: "MENMA", jp: "メンマ", note: "BAMBOO · FERMENTED" },
    { no: "09", name: "NORI", jp: "海苔", note: "ARIAKE · GRADE A" },
  ],
} as const;

/* ═══════════════ // 06 CRAFT ═══════════════ */

export const craft = {
  no: "06",
  jp: "匠の技",
  latin: "THE CRAFT",
  kicker: "PROCESS // THREE HANDS",
  panels: [
    { no: "01", name: "THE SHAKE", jp: "湯切り", body: "Water is driven out of the noodle in three sharp movements. Any left behind thins the broth in the bowl and the bowl is wrong." },
    { no: "02", name: "THE SEAR", jp: "炙り", body: "The chashu meets an open flame for eleven seconds a side. Fat renders, sugar catches, and the slice goes straight onto the noodle." },
    { no: "03", name: "THE PLATE", jp: "盛り付け", body: "Every component has a fixed position in the bowl. Twenty seconds from pass to table, and the arrangement never varies." },
  ],
} as const;

/* ═══════════════ // 07 STORY ═══════════════ */

export const story = {
  no: "07",
  jp: "物語",
  latin: "THE STORY · 拉麵の歴史",
  kicker: "ORIGIN // EST. 1910",
  flags: {
    cn: { label: "中国 · CHINA", name: "拉麵", sub: "LA MIAN" },
    jp: { label: "日本 · JAPAN", name: "ラーメン", sub: "RAMEN" },
    between: "丼",
  },
  caption: [
    "Born in Yokohama, 1910. Chinese wheat noodles meet Japanese craft.",
    "One dish, two names, and a hundred years of argument about which is right.",
  ],
  ghost: ["横", "浜"],
  eras: [
    { year: "1910", name: "RAIRAIKEN", jp: "来々軒", body: "Twelve Cantonese cooks open a shop in Asakusa. Wheat noodles in a clear salt broth — the first bowl anyone in Japan called Shina soba." },
    { year: "1945", name: "THE BLACK MARKET", jp: "闇市", body: "American wheat floods a hungry country. Street carts push noodles because rice is rationed, and the dish stops being foreign." },
    { year: "1958", name: "INSTANT", jp: "即席", body: "Momofuku Ando fries a noodle block in his shed in Ikeda. Within a decade ramen is the most exported meal Japan has ever made." },
    { year: "1994", name: "THE MUSEUM", jp: "博物館", body: "Yokohama builds a museum to a soup. Regional styles are catalogued like dialects, and the argument finally becomes an archive." },
  ],
} as const;

/* ═══════════════ // 08 ORDER ═══════════════ */

export const order = {
  no: "08",
  jp: "ご注文 らーめん",
  latin: "ORDER YOUR RAMEN",
  kicker: "RESERVE // TABLE OF SIX OR FEWER",
  body: "Open daily from 11:00. Walk-ins welcome for one or two — anything larger, book it.",
  steps: {
    date: "01 · SELECT DATE",
    time: "02 · SELECT TIME",
    details: "03 · YOUR DETAILS",
    guests: "04 · GUESTS",
  },
  lunch: { label: "LUNCH 11:00–14:30", slots: ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30"] },
  dinner: { label: "DINNER 17:00–22:30", slots: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"] },
  full: ["12:30", "19:00", "19:30"],
  cta: "CONFIRM RESERVATION",
} as const;

/* ═══════════════ FOOTER ═══════════════ */

export const footer = {
  address: ["2-14-21 Shinyokohama", "Kohoku-ku, Yokohama", "Kanagawa 222-0033"],
  hours: ["MON–FRI  11:00–23:00", "SAT–SUN  11:00–24:00", "CLOSED 2nd TUESDAY"],
  social: ["INSTAGRAM", "X / TWITTER", "TABELOG"],
  legal: "© 2026 UMAMI // 拉麵 — A FICTIONAL SHOP BUILT AS A DEMONSTRATION PIECE.",
  watermark: "旨味",
} as const;

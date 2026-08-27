/**
 * Every string on the site, in one place.
 * Voice: terse, technical, bilingual. Trilingual stack order is always
 * mono English kicker → large Japanese → small English translation.
 */

export const site = {
  name: "UMAMI // RAMEN",
  jp: "旨味",
  latin: "UMAMI // RAMEN",
  tagline: "Born from two worlds.",
  location: "Yokohama, Japan",
  coords: { lat: "35.4°N", lon: "139.6°E" },
  hours: "11:00–23:00",
  openLabel: "OPEN / 営業中",
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
      to: 0.145,
      kicker: "SLOW-SIMMERED // No.01",
      enLine1: "UMAMI",
      enLine2: "RAMEN",
      jpSmall: "旨味 // 拉麵",
      tagline: "Slow-simmered. Bowl by bowl.",
    },
    {
      id: "dossier",
      from: 0.185,
      to: 0.285,
      kicker: "SPECIFICATION // No.02",
      no: "02",
      enChapter: "THE DEEPENING",
      jpSmall: "仕様書 · 深める · FUKAMERU",
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
      from: 0.325,
      to: 0.428,
      kicker: "CHAPTER THREE // No.03",
      no: "03",
      enLine1: "THE WORLD",
      enLine2: "OF STEAM",
      jpSmall: "湯気の世界 · YUKE NO SEKAI",
      body: "Steam is the first thing you taste. It carries the fat, the aromatics and the heat to you before the spoon does.",
      readoutLabel: "STEAM RATE",
      readoutUnit: "G/S",
    },
    {
      id: "dossier-reprise",
      from: 0.468,
      to: 0.545,
      reprise: "dossier",
    },
  ],
  /**
   * The real cut points in assets-src/hero-source.mp4, detected with ffmpeg's
   * scene filter and confirmed frame by frame, expressed as hero progress.
   * Five setups:
   *   0.000  the chef at the stove, chopsticks in the pot, steam off the water
   *   0.151  the finished bowl overhead on wet stone, a hand dressing it
   *   0.319  the chef presenting the bowl to camera
   *   0.563  the bowl lifts free and the kitchen dissolves to black
   *   0.613  the exploded view — the climax is in the footage
   * Every one of these lands while the caption deck is in a blank window, or —
   * for 0.563 — inside the block fade that empties the gutter for the climax.
   */
  cuts: [0, 0.151, 0.319, 0.563, 0.613],
  instrument: {
    leftPill: "SCRUB ACTIVE",
    rightGroups: ["TEMP", "STEAM", "CH", "FRAME"],
    cta: "MENU",
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
      body: "Pork bone broth held at a rolling boil for sixty hours until it runs pale and silken. Chashu, ajitama, thin straight noodles, nori, spring onion. The one that started all of it.",
      tags: ["60H BROTH", "NO.22 NOODLE", "SHOYU TARE"],
    },
    {
      key: "mala" as const,
      no: "02",
      name: "KOTTERI MISO",
      jp: "濃厚味噌",
      price: 15,
      glow: "#A76B2C",
      body: "Aged soybean paste beaten into pork broth until it is thick enough to hold the noodle. Chashu, ajitama, wavy noodles, spring onion, nori. The loudest bowl on the menu.",
      tags: ["MISO TARE", "NO.16 WAVY", "PORK BASE"],
    },
    {
      key: "shoyu" as const,
      no: "03",
      name: "KURO SHOYU",
      jp: "黒醤油",
      price: 17,
      glow: "#2E5C8A",
      body: "Clear chicken and dashi broth, three-year aged shoyu tare. Chashu, ajitama, menma, nori, straight noodles. The quietest bowl on the menu and the hardest to make.",
      tags: ["3Y TARE", "DASHI", "STRAIGHT CUT"],
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
  step2: "STEP 2 · ADD EXTRAS",
  broths: [
    { key: "tonkotsu" as const, name: "TONKOTSU", jp: "豚骨", base: 16, note: "60H PORK BONE" },
    { key: "mala" as const, name: "MISO", jp: "味噌", base: 15, note: "AGED MISO TARE" },
    { key: "shoyu" as const, name: "SHOYU", jp: "醤油", base: 17, note: "3Y AGED TARE" },
  ],
  toppings: [
    { key: "chashu" as const, name: "CHASHU", jp: "叉焼", price: 3 },
    { key: "ajitama" as const, name: "AJITAMA", jp: "味玉", price: 2 },
    { key: "menma" as const, name: "MENMA", jp: "メンマ", price: 2 },
    { key: "nori" as const, name: "NORI", jp: "海苔", price: 1 },
    { key: "corn" as const, name: "KAEDAMA", jp: "替玉", price: 2 },
    { key: "narutomaki" as const, name: "EXTRA BROTH", jp: "スープ増し", price: 2 },
    { key: "chiliOil" as const, name: "ABURI", jp: "炙り", price: 1 },
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
  latin: "THE SIMMER",
  kicker: "PROCESS // No.04 · SIXTEEN HOURS",
  counterLabel: "ELAPSED",
} as const;

/* ═══════════════ // 05 INGREDIENTS ═══════════════ */

export const ingredients = {
  no: "05",
  jp: "手選素材 九種類",
  latin: "NINE ELEMENTS",
  kicker: "SOURCING // NINE KINDS",
  body: "Seven hand-selected components, and the two operations that decide them. Every ingredient is sourced from a single producer and refused outright if it arrives below standard — there is no second grade.",
  cells: [
    { no: "01", name: "BONE STOCK", jp: "白湯", note: "FEMUR · 60H" },
    { no: "02", name: "CHASHU", jp: "叉焼", note: "PORK BELLY · ROLLED" },
    { no: "03", name: "NOODLE", jp: "麺", note: "#16 · WAVY" },
    { no: "04", name: "AJITAMA", jp: "味玉", note: "6M30S · SHOYU CURED" },
    { no: "05", name: "SCALLION", jp: "葱", note: "CUT TO ORDER" },
    { no: "06", name: "THE SIMMER", jp: "煮込み", note: "16 HOURS · ROLLING" },
    { no: "07", name: "THE STRAIN", jp: "麺上げ", note: "WIRE BASKET · 3 SHAKES" },
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
  latin: "THE STORY",
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
    { year: "1910", name: "THE FIRST SHOP", jp: "最初の店", body: "Rairaiken opens in Asakusa with twelve Cantonese cooks. Wheat noodles in a clear salt broth — the first bowl anyone in Japan called Shina soba." },
    { year: "1945", name: "THE BLACK MARKET", jp: "闇市", body: "American wheat floods a hungry country. Street carts push noodles because rice is rationed, and the dish stops being foreign." },
    { year: "1958", name: "THE COUNTER", jp: "カウンター", body: "Momofuku Ando fries a noodle block in his shed in Ikeda, and within a decade ramen is the most exported meal Japan has ever made. The bowl handed across a counter never moves an inch." },
    { year: "1994", name: "THE MUSEUM ERA", jp: "博物館の時代", body: "Yokohama builds a museum to a soup. Regional styles are catalogued like dialects — and outside, the street carries on arguing in neon." },
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

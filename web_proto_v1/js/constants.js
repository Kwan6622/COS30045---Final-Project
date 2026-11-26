/**
 * constants.js — shared constants for every chart.
 *
 * COLOURS — team palette v2 (docs/sketches/datawerk_palette_v2.png)
 *   - one colour per road user on every chart;
 *   - lightness ladder so road users also differ in greyscale and print;
 *   - car occupants are context: always dashed + directly labelled;
 *   - yellow accent = highlights and annotations only, never a data series.
 * Two themes (light = palette v2 exactly; dark = lighter steps of the same
 * hues on the palette's ink/asphalt) × five colour-vision views. The
 * colour-blind views are SIMULATIONS (Machado, Oliveira & Fernandes, 2009,
 * severity 1.0): applied to the light palette they reproduce the palette
 * image's Deuteranopia / Protanopia / Tritanopia / Achromatopsia columns
 * exactly, so the same function is used for the dark theme and the ramps.
 * Charts never hard-code a colour: they call palette(state.theme, state.cvd).
 *
 * GenAI acknowledgement: drafted with Claude (Anthropic), to be reviewed by the team.
 */

/* ------------------------------------------------------------------ */
/* Base colours per theme ("normal" vision)                           */
/* ------------------------------------------------------------------ */
export const THEMES = {
  light: {
    // palette v2, as published (contrast on #FFFFFF)
    ped: "#BF4632",   // 5.1:1
    cyc: "#1E5664",   // 8.2:1
    moto: "#3F1B58",  // 13.9:1
    car: "#9A9B9D",   // 2.8:1 → dashed + label
    accent: "#F2B705",
    ink: "#1F2328", bg: "#FFFFFF",
    // lighter step of each focus colour (context bars, e.g. ages under 75)
    pedSoft: "#ECA798", cycSoft: "#77C9DD",
    // 5-step map ramps (low → high), palette v2
    rampPed: ["#F7D1C8", "#ECA798", "#D37E6C", "#AC5442", "#703326"],
    rampCyc: ["#BAE3ED", "#77C9DD", "#2BA9C2", "#147F93", "#03515F"],
    // neutral greys, strongest → weakest (non-road-user categories)
    cat: ["#1F2328", "#454545", "#6E6E6E", "#959595", "#B8B8B8", "#E3E3E3"],
    muted: "#6E6E6E",  // reference lines, Australia line, crosshair
    band: "#EDEDED",   // COVID / winter bands
    onStrong: "#FFFFFF", // label colour on cat[0] / cat[1]
  },
  dark: {
    // same hues, lighter steps, on ink/asphalt #1F2328 (contrast in brackets)
    ped: "#D9735C",   // 4.9:1
    cyc: "#4FB8CF",   // 6.8:1
    moto: "#E2D4F0",  // 11.2:1 (ladder flips: motorcyclist lightest on dark)
    car: "#6E6E6E",   // 3.1:1 → dashed + label
    accent: "#F2B705",
    ink: "#F2F2F0", bg: "#1F2328",
    pedSoft: "#8E4A3D", cycSoft: "#1F6E7E",
    rampPed: ["#F7D1C8", "#ECA798", "#D37E6C", "#AC5442", "#703326"],
    rampCyc: ["#BAE3ED", "#77C9DD", "#2BA9C2", "#147F93", "#03515F"],
    cat: ["#F2F2F0", "#C8C8C8", "#9B9B9B", "#7A7A7A", "#5A5A5A", "#3A3F46"],
    muted: "#A3A3A3",
    band: "#2B3038",
    onStrong: "#1F2328",
  },
};

/** Colour-vision views offered in the header select. */
export const CVD_MODES = {
  normal: "Normal colour vision",
  deuteranopia: "Deuteranopia (red–green)",
  protanopia: "Protanopia (red–green)",
  tritanopia: "Tritanopia (blue–yellow)",
  achromatopsia: "Achromatopsia (no colour)",
};

/* Machado et al. (2009) simulation matrices, severity 1.0, linear RGB */
const MACHADO = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };

/** How a colour looks for a given colour-vision type (hex in, hex out). */
export function simulate(hex, mode) {
  if (!mode || mode === "normal") return hex;
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16)));
  let out;
  if (mode === "achromatopsia") {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out = [y, y, y];
  } else {
    const m = MACHADO[mode];
    out = m.map((row) => row[0] * r + row[1] * g + row[2] * b);
  }
  return `#${out.map((v) => Math.round(toSrgb(v) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

const cache = new Map();
/**
 * Every colour a chart needs, for the current theme and colour-vision view.
 * palette(state.theme, state.cvd) → { group: {Pedestrian…}, soft, ramp, cat,
 *   accent, ink, bg, muted, band, onStrong }
 */
export function palette(theme = "light", cvd = "normal") {
  const key = `${theme}|${cvd}`;
  if (cache.has(key)) return cache.get(key);
  const t = THEMES[theme] || THEMES.light;
  const s = (hex) => simulate(hex, cvd);
  const p = {
    group: { "Pedestrian": s(t.ped), "Pedal cyclist": s(t.cyc), "Motorcyclist": s(t.moto), "Car occupant": s(t.car) },
    soft: { "Pedestrian": s(t.pedSoft), "Pedal cyclist": s(t.cycSoft) },
    ramp: { "Pedestrian": t.rampPed.map(s), "Pedal cyclist": t.rampCyc.map(s) },
    cat: t.cat.map(s),
    accent: s(t.accent), ink: t.ink, bg: t.bg, muted: t.muted, band: t.band, onStrong: t.onStrong,
  };
  cache.set(key, p);
  return p;
}

/* ------------------------------------------------------------------ */
/* Groups                                                              */
/* ------------------------------------------------------------------ */
/** Road-user groups in legend order = lightness ladder of the light theme. */
export const GROUPS = ["Motorcyclist", "Pedal cyclist", "Pedestrian", "Car occupant"];
/** The two groups the story is about (thicker lines, bigger dots). */
export const FOCUS = ["Pedestrian", "Pedal cyclist"];
/** Stroke dash per group: car occupants are always dashed (palette rule). */
export const GROUP_DASH = { "Car occupant": "6 4" };

export const SHORT = {
  "Pedestrian": "Pedestrians", "Pedal cyclist": "Cyclists",
  "Motorcyclist": "Motorcyclists", "Car occupant": "Car occupants",
};

export const AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const STATE_NAMES = {
  NSW: "New South Wales", Vic: "Victoria", Qld: "Queensland", WA: "Western Australia",
  SA: "South Australia", Tas: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};
/** Tile-grid layout [col, row]: every state gets equal area. */
export const STATE_TILES = {
  NT: [1, 0], Qld: [2, 0],
  WA: [0, 1], SA: [1, 1], NSW: [2, 1], ACT: [3, 1],
  Vic: [2, 2],
  Tas: [2, 3],
};

/** Comparison years agreed by the team: 2012 (after the Victorian series
 *  break) to 2019 (before COVID). */
export const BASE_YEAR = 2012;
export const END_YEAR = 2019;
/** Days from 1 Jan 2011 to 31 Dec 2021, for "beds filled every day". */
export const DAYS_2011_2021 = 4018;

export const DATA = {
  groupYear: "data/group_year.csv",
  severity: "data/severity.csv",
  counterparty: "data/counterparty.csv",
  season: "data/season.csv",
  age: "data/age.csv",
  stateYear: "data/state_year.csv",
};

/** Initial app state. Charts read it in update(state); only main.js changes it. */
export const INITIAL_STATE = {
  theme: "light",         // "light" | "dark" (saved choice or OS setting, see main.js)
  cvd: "normal",          // key of CVD_MODES
  chapter: "s-start",     // set by Scrollama
  width: 0,               // viewport width, so charts redraw on resize
  wardPlayed: false,      // hero animation runs once
  trendMode: "index",     // "index" (2012 = 100) | "hosp"
  trendFocus: null,       // a group to highlight, set by the Ch1 scrolly steps
  sevMeasure: "los",      // "los" | "died_rate" | "ratio"
  ageGroup: "Pedestrian",
  ageMeasure: "los",      // "los" | "died_rate" | "rate"
  mapGroup: "Pedestrian",
  mapState: "NT",
  role: "driver",         // "driver" | "walk" | "cycle" | "policy"
};

/**
 * main.js — entry point for web_proto_v1.
 *
 * Shared contract (team agreement):
 *   - constants.js : palette (themes × colour-vision views), groups, layout, data paths, INITIAL_STATE
 *   - data.js      : loadData(), computeFacts() and lookup helpers
 *   - every chart  : export function init(el, data)  — build once
 *                    export function update(state)   — redraw from state
 *   - main.js owns the ONE app state. Charts never change it directly: they
 *     emit a "viz:state" event (utils.emit) and main merges the patch.
 *
 * Navigation (Scrollama scrollytelling page):
 *   - scrolling (wheel, ↑/↓, Space…) works as usual; Scrollama turns scroll
 *     position into state.chapter and, in Chapter 1, into the chart's state;
 *   - "stops" = every chapter + every Chapter 1 message. The side arrow
 *     buttons and ← / → move to the previous / next stop, so inside Chapter 1
 *     they step through the messages one at a time;
 *   - the stepper at the top jumps to any chapter.
 * Header: light/dark switch and colour-vision view (simulated palette).
 *
 * GenAI acknowledgement: drafted with Claude (Anthropic), to be reviewed by the team.
 */
/* global scrollama */
import { INITIAL_STATE, CVD_MODES, palette } from "./constants.js";
import { loadData, computeFacts } from "./data.js";
import { debounce } from "./utils.js";
import { renderCites, renderReferences } from "./cite.js";
import * as ward from "./charts/ward.js";
import * as trend from "./charts/trend.js";
import * as severity from "./charts/severity.js";
import * as counterparty from "./charts/counterparty.js";
import * as age from "./charts/age.js";
import * as season from "./charts/season.js";
import * as stateMap from "./charts/stateMap.js";
import * as roles from "./charts/roles.js";

/** Chart module → the element it draws into (data-viz in index.html). */
const CHARTS = [
  [ward, "ward"], [trend, "trend"], [severity, "severity"], [counterparty, "counterparty"],
  [age, "age"], [season, "season"], [stateMap, "stateMap"], [roles, "roles"],
];

const root = document.documentElement;
const state = {
  ...INITIAL_STATE,
  width: window.innerWidth,
  theme: root.dataset.theme === "dark" ? "dark" : "light",
  cvd: root.dataset.cvd in CVD_MODES ? root.dataset.cvd : "normal",
};
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const header = () => document.querySelector(".site-header").offsetHeight;
let chapters = [];
let navButtons = [];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
function setState(patch) {
  Object.assign(state, patch);
  applyLook();
  CHARTS.forEach(([mod]) => mod.update(state));   // each chart skips if nothing it uses changed
  syncControls();
  syncStepper();
}

/** Toggle buttons declare the state key they set: <div data-state-key="sevMeasure"> <button data-value="los"> */
function bindControls() {
  document.querySelectorAll("[data-state-key]").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (btn) setState({ [group.dataset.stateKey]: btn.dataset.value });
    });
  });
  document.addEventListener("viz:state", (e) => setState(e.detail));
}

function syncControls() {
  document.querySelectorAll("[data-state-key]").forEach((group) => {
    group.querySelectorAll("button[data-value]").forEach((b) => {
      const on = String(state[group.dataset.stateKey]) === b.dataset.value;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Theme + colour-vision view                                          */
/* ------------------------------------------------------------------ */
let lastLook = "";
function applyLook() {
  const key = `${state.theme}|${state.cvd}`;
  if (key === lastLook) return;
  lastLook = key;
  root.dataset.theme = state.theme;
  root.dataset.cvd = state.cvd;
  // Road-user colours used by text, legends and swatches come from constants.js
  const P = palette(state.theme, state.cvd);
  root.style.setProperty("--ped", P.group["Pedestrian"]);
  root.style.setProperty("--cyc", P.group["Pedal cyclist"]);
  root.style.setProperty("--moto", P.group["Motorcyclist"]);
  root.style.setProperty("--car", P.group["Car occupant"]);
  root.style.setProperty("--accent", P.accent);

  const dark = state.theme === "dark";
  const btn = document.getElementById("theme-btn");
  btn.querySelector(".icon").textContent = dark ? "☀" : "☾";
  btn.querySelector(".label").textContent = dark ? "Light" : "Dark";
  btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  btn.setAttribute("aria-pressed", dark);
  document.getElementById("cvd-select").value = state.cvd;
  document.getElementById("cvd-note").textContent = state.cvd === "normal" ? ""
    : `Preview: colours as seen with ${CVD_MODES[state.cvd].toLowerCase()} (simulated). The palette is designed to stay readable in this view.`;
  try { localStorage.setItem("theme", state.theme); localStorage.setItem("cvd", state.cvd); } catch { /* storage blocked */ }
}

function bindLook() {
  const sel = document.getElementById("cvd-select");
  sel.innerHTML = Object.entries(CVD_MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  sel.addEventListener("change", () => setState({ cvd: sel.value }));
  document.getElementById("theme-btn").addEventListener("click", () =>
    setState({ theme: state.theme === "dark" ? "light" : "dark" }));
}

/* ------------------------------------------------------------------ */
/* Stepper (chapter names at the top)                                  */
/* ------------------------------------------------------------------ */
function buildStepper() {
  chapters = [...document.querySelectorAll("section.chapter-step")];
  const nav = document.getElementById("stepper");
  nav.innerHTML = chapters.map((s, i) => `
    <li><button type="button" data-i="${i}" title="${s.dataset.label}">
      <span class="dot" aria-hidden="true">${i === 0 ? "★" : i}</span><span class="name">${s.dataset.label}</span>
    </button></li>`).join("");
  navButtons = [...nav.querySelectorAll("button")];
  navButtons.forEach((b) => b.addEventListener("click", () => scrollToY(chapterY(chapters[+b.dataset.i]))));
  document.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => scrollToY(chapterY(document.getElementById(b.dataset.goto)))));
}

let maxReached = 0;
/** Show every chapter name when they fit; otherwise only the current one (numbers for the rest). */
function fitStepper() {
  const nav = document.querySelector(".chapters");
  const head = document.querySelector(".site-header");
  head.classList.remove("is-compact");
  if (nav.scrollWidth > nav.clientWidth + 1) head.classList.add("is-compact");
  document.documentElement.style.setProperty("--head", `${head.offsetHeight}px`);
}

function syncStepper() {
  const i = chapters.findIndex((s) => s.id === state.chapter);
  maxReached = Math.max(maxReached, i);
  navButtons.forEach((b, k) => {
    b.classList.toggle("is-current", k === i);
    b.classList.toggle("is-visited", k !== i && k <= maxReached);
    if (k === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
  });
  const nav = navButtons[0].closest("nav");
  const b = navButtons[i];
  if (b) nav.scrollTo({ left: b.offsetLeft - nav.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2 });
}

/* ------------------------------------------------------------------ */
/* Stops: chapters + Chapter 1 messages (side arrows and ← / →)       */
/* ------------------------------------------------------------------ */
const STEP_OFFSET = 0.55;   // same trigger line as the Chapter 1 Scrollama
let stops = [];

const chapterY = (el) => el.getBoundingClientRect().top + window.scrollY - header() + 1;
/** Scroll position that puts a scrolly message on Scrollama's trigger line. */
const stepY = (el) => {
  const r = el.getBoundingClientRect();
  return r.top + window.scrollY + r.height / 2 - window.innerHeight * STEP_OFFSET;
};

function buildStops() {
  stops = [];
  chapters.forEach((ch) => {
    stops.push({ label: ch.dataset.label, y: () => chapterY(ch) });
    const steps = [...ch.querySelectorAll(".scrolly-step")];
    steps.forEach((st, i) => stops.push({ label: `${ch.dataset.label}: message ${i + 1} of ${steps.length}`, y: () => stepY(st) }));
  });
}

// While a smooth scroll is running, count from where it is going, not from
// where it is now, so pressing → twice moves two stops.
let pendingY = null, pendingTimer;
function scrollToY(y) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  pendingY = Math.max(0, Math.min(max, Math.round(y)));
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => { pendingY = null; syncSideNav(); }, reduceMotion ? 50 : 900);
  window.scrollTo({ top: pendingY, behavior: reduceMotion ? "auto" : "smooth" });
}

function neighbours() {
  const y = pendingY ?? window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  // A stop closer than 40% of a screen to the previous one would be a wasted
  // press (e.g. on desktop message 1 is already active at the chapter start).
  const list = [];
  stops.forEach((s) => {
    const at = Math.max(0, Math.min(max, s.y()));
    if (!list.length || at - list.at(-1).at > window.innerHeight * 0.4) list.push({ ...s, at });
  });
  const next = list.find((s) => s.at > y + 4);
  const prev = [...list].reverse().find((s) => s.at < y - 4);
  return { prev, next };
}

const go = (dir) => { const n = neighbours()[dir]; if (n) scrollToY(n.at); };

function syncSideNav() {
  const { prev, next } = neighbours();
  const p = document.getElementById("prev-btn"), n = document.getElementById("next-btn");
  p.disabled = !prev; n.disabled = !next;
  document.getElementById("prev-where").textContent = prev ? `Previous: ${prev.label}` : "";
  document.getElementById("next-where").textContent = next ? `Next: ${next.label}` : "";
  p.setAttribute("aria-label", prev ? `Previous: ${prev.label}` : "Previous part");
  n.setAttribute("aria-label", next ? `Next: ${next.label}` : "Next part");
}

function setupNav() {
  buildStops();
  document.getElementById("prev-btn").addEventListener("click", () => go("prev"));
  document.getElementById("next-btn").addEventListener("click", () => go("next"));
  // ← / → = previous / next stop. ↑ ↓ PageUp PageDown Space keep scrolling natively.
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    // Inside a chart the arrow keys move between marks (js/a11y.js roving), not between parts
    if (e.target.closest?.(".mark, [data-roving]")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go("next"); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go("prev"); }
  });
  const bar = document.getElementById("progress-bar");
  document.addEventListener("scroll", () => {
    const h = document.documentElement;
    bar.style.width = `${(h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100}%`;
    if (pendingY === null) syncSideNav();
  }, { passive: true });
  syncSideNav();
}

/* ------------------------------------------------------------------ */
/* Scrollama                                                           */
/* ------------------------------------------------------------------ */
function setupScrollama() {
  // 1) Chapters: which chapter is in the middle of the screen
  const chapterScroller = scrollama();
  chapterScroller.setup({ step: "section.chapter-step", offset: 0.4 })
    .onStepEnter(({ element }) => {
      setState({ chapter: element.id, ...(element.id === "s-start" ? { wardPlayed: true } : {}) });
    });

  // 2) Chapter 1 scrollytelling: text steps drive the sticky trend chart
  const trendScroller = scrollama();
  trendScroller.setup({ step: "#s-who .scrolly-step", offset: STEP_OFFSET })
    .onStepEnter(({ element }) => {
      document.querySelectorAll("#s-who .scrolly-step").forEach((s) => s.classList.toggle("is-active", s === element));
      setState(JSON.parse(element.dataset.state));
    });

  window.addEventListener("resize", debounce(() => {
    chapterScroller.resize();
    trendScroller.resize();
    if (window.innerWidth !== state.width) setState({ width: window.innerWidth });
    fitStepper();
    syncSideNav();
  }, 200));
}

/* ------------------------------------------------------------------ */
async function init() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    document.querySelector("#main").insertAdjacentHTML("afterbegin",
      `<p class="wrap" style="color:var(--ped);padding-top:24px">Could not load data (${err.message}). Open the page through a local web server.</p>`);
    console.error(err);
    return;
  }

  const facts = computeFacts(data);
  document.querySelectorAll("[data-fact]").forEach((el) => { el.textContent = facts[el.dataset.fact]; });
  renderCites();
  renderReferences("#references");

  CHARTS.forEach(([mod, name]) => mod.init(document.querySelector(`[data-viz="${name}"]`), data));
  buildStepper();
  fitStepper();
  document.fonts?.ready.then(fitStepper);
  bindControls();
  bindLook();
  setState({});                 // first draw of every chart
  setupScrollama();
  setupNav();

  // Deep link (#s-age) scrolls to that chapter
  const start = chapters.findIndex((s) => `#${s.id}` === location.hash);
  if (start > 0) requestAnimationFrame(() => scrollToY(chapterY(chapters[start])));
}

init();

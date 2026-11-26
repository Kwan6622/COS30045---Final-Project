/**
 * main.js — entry point for web_proto_v1.
 * Loads every CSV once, fills the data-driven sentences, and runs the
 * step-by-step navigation:
 *   - one chapter on screen at a time;
 *   - "Next" button, → or Enter move FORWARD only;
 *   - the stepper at the top lists every chapter; a chapter becomes clickable
 *     once visited, so at the end (Summary) readers can jump back to any part.
 * Charts are drawn when their step is shown (hidden elements have no width).
 *
 * GenAI acknowledgement: drafted with Claude (Anthropic), to be reviewed by the team.
 */
/* global d3 */
import { DATA, BASE_YEAR, END_YEAR } from "./config.js";
import { debounce, fmt, fmt1, pct } from "./utils.js";
import { renderCites, renderReferences } from "./cite.js";
import { Ward } from "./charts/ward.js";
import { TrendChart } from "./charts/trend.js";
import { SeverityChart } from "./charts/severity.js";
import { CounterpartyChart } from "./charts/counterparty.js";
import { AgeChart } from "./charts/age.js";
import { SeasonChart } from "./charts/season.js";
import { StateMap } from "./charts/stateMap.js";
import { RolePicker } from "./charts/roles.js";

async function loadData() {
  const entries = await Promise.all(Object.entries(DATA).map(async ([k, p]) => [k, await d3.csv(p, d3.autoType)]));
  return Object.fromEntries(entries);
}

/** Every number in the prose comes from the data, so text and charts cannot drift apart. */
function fillFacts(data, ward) {
  const sev = (g) => data.severity.find((d) => d.group === g);
  const yr = (g, y) => data.groupYear.find((d) => d.group === g && d.year === y).hosp;
  const cp = (g, c) => data.counterparty.find((d) => d.group === g && d.cp === c).share;
  const old = data.age.find((d) => d.group === "Pedestrian" && d.age === "75+");
  const june = data.season.find((d) => d.group === "Pedestrian" && d.month === 6).index;
  const vru2021 = yr("Pedestrian", 2021) + yr("Pedal cyclist", 2021);
  const ped = sev("Pedestrian"), car = sev("Car occupant"), cyc = sev("Pedal cyclist");
  const change = (g) => d3.format("+.0%")(yr(g, END_YEAR) / yr(g, BASE_YEAR) - 1);

  const facts = {
    beds: fmt(ward.total),
    vru2021: fmt(vru2021),
    every: Math.round((365 * 24 * 60) / vru2021),
    pedChange: change("Pedestrian"),
    cycChange: change("Pedal cyclist"),
    pedLos: fmt1(ped.los), carLos: fmt1(car.los), cycLos: fmt1(cyc.los),
    pedDied: d3.format(".1%")(ped.died_rate), carDied: d3.format(".1%")(car.died_rate),
    pedCar: pct(cp("Pedestrian", "Car, pick-up truck or van")),
    cycFall: pct(cp("Pedal cyclist", "No collision (e.g. fall)")),
    oldLos: fmt1(old.los), oldDied: `1 in ${Math.round(1 / old.died_rate)}`,
    pedJune: d3.format("+.0%")(june - 1),
  };
  document.querySelectorAll("[data-fact]").forEach((el) => { el.textContent = facts[el.dataset.fact]; });
}

/* ------------------------------------------------------------------ */
/* Step navigation                                                     */
/* ------------------------------------------------------------------ */
class Stepper {
  constructor(chartsByStep) {
    this.steps = [...document.querySelectorAll("section.step")];
    this.chartsByStep = chartsByStep;
    this.current = -1;
    this.visited = new Set();
    this.summaryIdx = this.steps.findIndex((s) => s.id === "s-summary");
    this.nav = document.getElementById("stepper");
    this.next = document.getElementById("next-btn");
    this.toSummary = document.getElementById("summary-btn");
    this.hint = document.getElementById("key-hint");
    this.bar = document.getElementById("progress-bar");

    this.nav.innerHTML = this.steps.map((s, i) => `
      <li><button type="button" data-i="${i}" title="${s.dataset.label}" disabled>
        <span class="dot" aria-hidden="true">${i === 0 ? "★" : i}</span><span class="name">${s.dataset.label}</span>
      </button></li>`).join("");
    this.buttons = [...this.nav.querySelectorAll("button")];
    this.buttons.forEach((b) => b.addEventListener("click", () => this.go(+b.dataset.i)));

    this.next.addEventListener("click", () => this.forward());
    this.toSummary.addEventListener("click", () => this.go(this.summaryIdx));
    document.querySelectorAll("[data-goto]").forEach((b) =>
      b.addEventListener("click", () => this.go(this.steps.findIndex((s) => s.id === b.dataset.goto))));

    // Keys move forward only (→ or Enter). Enter on a button keeps its normal meaning.
    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const tag = e.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "ArrowRight" || (e.key === "Enter" && !["BUTTON", "A"].includes(tag) && e.target.getAttribute("role") !== "button")) {
        e.preventDefault();
        this.forward();
      }
    });

    // Deep link (#s-age) opens that step and marks earlier steps as visited
    const start = Math.max(0, this.steps.findIndex((s) => `#${s.id}` === location.hash));
    for (let i = 0; i < start; i++) this.visited.add(i);
    this.go(start, { focus: false });

    // Editing the #hash opens a chapter already visited (never skips ahead)
    window.addEventListener("hashchange", () => {
      const i = this.steps.findIndex((s) => `#${s.id}` === location.hash);
      if (this.visited.has(i)) this.go(i);
    });
  }

  forward() {
    if (this.current < this.steps.length - 1) this.go(this.current + 1);
  }

  go(i, { focus = true } = {}) {
    if (i < 0 || i >= this.steps.length || i === this.current) return;
    this.current = i;
    this.visited.add(i);
    this.steps.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.hidden = k !== i; });
    this.buttons.forEach((b, k) => {
      b.disabled = !this.visited.has(k);
      b.classList.toggle("is-visited", this.visited.has(k) && k !== i);
      b.classList.toggle("is-current", k === i);
      if (k === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    this.centerCurrent();

    const last = i === this.steps.length - 1;
    this.next.textContent = last ? "Back to the start ↺" : `Next: ${this.steps[i + 1].dataset.label} →`;
    this.next.onclick = last ? () => this.go(0) : null;
    this.hint.hidden = last;
    this.toSummary.hidden = !(this.visited.has(this.summaryIdx) && i < this.summaryIdx);
    this.bar.style.width = `${(i / (this.steps.length - 1)) * 100}%`;
    history.replaceState(null, "", `#${this.steps[i].id}`);

    window.scrollTo({ top: 0 });
    this.renderCurrent();
    if (focus) {
      const h = this.steps[i].querySelector("h1, h2");
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    }
  }

  /** Scroll the stepper row (not the page) so the current chapter is in view on narrow screens. */
  centerCurrent() {
    requestAnimationFrame(() => {
      const nav = this.nav.parentElement;
      const b = this.buttons[this.current];
      nav.scrollTo({ left: b.offsetLeft - nav.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2 });
    });
  }

  renderCurrent() {
    (this.chartsByStep[this.steps[this.current].id] || []).forEach((c) => c.render());
    this.centerCurrent();
  }
}

/* ------------------------------------------------------------------ */
function setupTheme(stepper) {
  const root = document.documentElement;
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch { /* storage blocked */ }
    stepper.renderCurrent(); // colours are read from CSS variables at render time
  });
}

async function init() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    document.querySelector("#main").insertAdjacentHTML("afterbegin",
      `<p class="wrap" style="color:var(--accent);padding-top:24px">Could not load data (${err.message}). Open the page through a local web server.</p>`);
    console.error(err);
    return;
  }
  const ward = new Ward("#chart-ward", data.severity);
  fillFacts(data, ward);
  renderCites();
  renderReferences("#references");

  const stepper = new Stepper({
    "s-start": [ward],
    "s-who": [new TrendChart("#chart-trend", data.groupYear)],
    "s-how": [new SeverityChart("#chart-severity", data.severity), new CounterpartyChart("#chart-cp", "#legend-cp", data.counterparty)],
    "s-age": [new AgeChart("#chart-age", "#age-title", data.age)],
    "s-when": [new SeasonChart("#chart-season", data.season),
      new StateMap("#chart-states", "#chart-state-detail", "#state-detail-title", data.stateYear)],
    "s-act": [new RolePicker("#roles", "#role-panel", data)],
  });
  setupTheme(stepper);

  let lastW = window.innerWidth;
  window.addEventListener("resize", debounce(() => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    stepper.renderCurrent();
  }, 200));
}

init();

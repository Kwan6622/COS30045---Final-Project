/**
 * age.js — Ch3: who among pedestrians and cyclists is hurt worst, by age.
 * Vertical bars (ordered categories, zero baseline). The 75+ bar uses the full
 * road-user colour; other ages use a lighter step of the same colour, outlined
 * in the full colour (the light fill alone is under 2:1 against the card).
 * state.ageGroup: "Pedestrian" | "Pedal cyclist"
 * state.ageMeasure: "los" | "died_rate" | "rate" (per 100,000, ABS population;
 * "≈" where BITRE and ABS age bands do not line up).
 *
 * v2 (wireframes 07 + 12): take-away line, <title>/<desc>, one Tab stop that
 * starts on 75+ with ← → between ages, tooltip on focus + announcer, data table.
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 *
 * GenAI acknowledgement: v1 drafted by Quang with Claude; v2 accessibility and
 * take-away changes written with Claude (Anthropic) from wireframe 07
 * ("add take-away line, keyboard focus, announcer and data table to the age
 * bar chart"). Reviewed and tested by Cường; see GENAI_LOG.md.
 */
/* global d3 */
import { AGE_ORDER, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt, fmt1 } from "../utils.js";
import { announce, describeSvg, dataTable, roving, hasFocus, tipPoint } from "../a11y.js";

const MEASURES = {
  los: { label: "Average days in hospital", unit: "days", f: (v) => `${fmt1(v)} d`, words: (v) => `${fmt1(v)} days` },
  died_rate: { label: "Died within 30 days", unit: "", f: d3.format(".1%"), words: d3.format(".1%") },
  rate: { label: "Admissions per 100,000 people per year", unit: "", f: fmt1, words: (v) => `${fmt1(v)} per 100,000` },
};
const exact = (d) => d.exact_pop === true || d.exact_pop === "True";
const approx = (k, d) => (k === "rate" && !exact(d) ? "≈" : "");

let fig, host, title, takeaway, data, last = "", lastView = "";
let focusIdx = AGE_ORDER.indexOf("75+");   // the Tab stop starts on the 75+ bar

export function init(el, d) {
  fig = el;
  host = el.querySelector(".chart");
  title = el.querySelector(".chart-title");
  takeaway = el.querySelector('[data-part="takeaway"]');
  data = d.age;
}

export function update(state) {
  const sig = `${state.width}|${state.ageGroup}|${state.ageMeasure}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  const view = `${state.ageGroup}|${state.ageMeasure}`;
  const chipChanged = lastView !== "" && view !== lastView;
  lastView = view;
  draw(state.ageGroup, state.ageMeasure, palette(state.theme, state.cvd), chipChanged);
}

/** The highest bar of the current view, in words (and the runner-up if it is close). */
function summary(rows, k, group) {
  const m = MEASURES[k];
  const [top, second] = [...rows].sort((a, b) => b[k] - a[k]);
  let s = `Highest: age ${top.age} (${approx(k, top)}${m.words(top[k])})`;
  if (second[k] >= top[k] * 0.95) s += `, with age ${second.age} close behind (${approx(k, second)}${m.words(second[k])})`;
  return `${s}.`;
}

function draw(group, k, P, chipChanged) {
  const m = MEASURES[k];
  const refocus = hasFocus(host);
  const margin = { top: 28, right: 12, bottom: 34, left: 52 };
  const { svg, g, width, height } = createSvg(host, { height: 320, margin });
  const rows = AGE_ORDER.map((a) => data.find((d) => d.group === group && d.age === a));
  const titleText = `${SHORT[group]}: ${m.label.toLowerCase()}, by age group (2011–2021)`;
  const sum = summary(rows, k, group);
  title.textContent = titleText;
  takeaway.textContent = sum;

  const x = d3.scaleBand().domain(AGE_ORDER).range([0, width]).padding(0.25);
  // One scale for both groups, so switching group never rescales silently
  const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d[k])]).nice().range([height, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(k === "died_rate" ? d3.format(".0%") : (v) => v));
  g.append("text").attr("class", "value-label").attr("aria-hidden", "true").attr("x", -margin.left).attr("y", -14).text(m.label);

  const tipRows = (d) => [
    ["Hospital admissions", fmt(d.hosp)], ["Avg days in hospital", fmt1(d.los)],
    ["Died within 30 days", `${d3.format(".1%")(d.died_rate)} (${fmt(d.died)})`],
    [`Per 100,000 / yr${exact(d) ? "" : " ≈"}`, fmt1(d.rate)],
  ];
  const label = (d) => `${SHORT[group]}, age ${d.age}: ${approx(k, d)}${m.words(d[k])}`;

  const t = d3.transition().duration(matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500);
  const bars = g.selectAll(".bar").data(rows).join("rect").attr("class", "bar")
    .attr("x", (d) => x(d.age)).attr("width", x.bandwidth()).attr("rx", 3)
    .attr("fill", (d) => (d.age === "75+" ? P.group[group] : P.soft[group]))
    .attr("stroke", P.group[group]).attr("stroke-width", (d) => (d.age === "75+" ? 0 : 1.5))
    .attr("role", "img").attr("aria-label", label)
    .attr("y", height).attr("height", 0)
    .on("pointermove", (event, d) => showTooltip(event, `${SHORT[group]}, age ${d.age}`, tipRows(d)))
    .on("pointerleave", hideTooltip);
  bars.transition(t).attr("y", (d) => y(d[k])).attr("height", (d) => height - y(d[k]));

  g.selectAll(".val").data(rows).join("text").attr("class", "value-label").attr("aria-hidden", "true")
    .attr("x", (d) => x(d.age) + x.bandwidth() / 2).attr("y", (d) => y(d[k]) - 6).attr("text-anchor", "middle")
    .attr("fill", P.ink).attr("font-weight", (d) => (d.age === "75+" ? 700 : 400))
    .text((d) => `${approx(k, d)}${m.f(d[k])}`);

  // Yellow annotation marker over the bar the chapter is about (dark edge: v2)
  g.append("rect").attr("aria-hidden", "true").attr("x", x("75+")).attr("width", x.bandwidth())
    .attr("y", height + 22).attr("height", 5).attr("rx", 1)
    .attr("fill", P.accent).attr("stroke", P.ink).attr("stroke-width", 0.75);

  // Screen readers: chart name + every value + the conclusion
  describeSvg(svg, titleText,
    `Bar chart. ${rows.map((d) => `Age ${d.age}: ${approx(k, d)}${m.words(d[k])}`).join("; ")}. ${sum}`);

  // Keyboard: one Tab stop, ← → between ages, same tooltip as hover
  roving(bars, {
    index: focusIdx,
    onMove: (i) => { focusIdx = i; },
    onFocus: (d, node) => {
      showTooltip(tipPoint(node), `${SHORT[group]}, age ${d.age}`, tipRows(d));
      announce(label(d));
    },
  });
  if (refocus) bars.nodes()[focusIdx].focus();

  dataTable(fig, `${SHORT[group]} hospitalised after road crashes, by age group, Australia 2011–2021`, [
    { key: "age", label: "Age group" },
    { key: "hosp", label: "Admissions", format: fmt },
    { key: "los", label: "Avg days in hospital", format: fmt1 },
    { key: "died_rate", label: "Died within 30 days", format: d3.format(".1%") },
    { key: "rate", label: "Per 100,000 per year", format: (v, d) => `${exact(d) ? "" : "≈ "}${fmt1(v)}` },
  ], rows);

  // A chip changed what the chart shows: say the new answer out loud
  if (chipChanged) announce(`${titleText}. ${sum}`);
}

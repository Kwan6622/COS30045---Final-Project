/**
 * age.js — Ch3: who among pedestrians and cyclists is hurt worst, by age.
 * Vertical bars (ordered categories, zero baseline). The 75+ bar uses the full
 * road-user colour; other ages use a lighter step of the same colour.
 * state.ageGroup: "Pedestrian" | "Pedal cyclist"
 * state.ageMeasure: "los" | "died_rate" | "rate" (per 100,000, ABS population;
 * "≈" where BITRE and ABS age bands do not line up).
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 */
/* global d3 */
import { AGE_ORDER, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt, fmt1 } from "../utils.js";

const MEASURES = {
  los: { label: "Average days in hospital", f: (v) => `${fmt1(v)} d` },
  died_rate: { label: "Died within 30 days", f: d3.format(".1%") },
  rate: { label: "Admissions per 100,000 people per year", f: fmt1 },
};
const exact = (d) => d.exact_pop === true || d.exact_pop === "True";

let host, title, data, last = "";

export function init(el, d) {
  host = el.querySelector(".chart");
  title = el.querySelector(".chart-title");
  data = d.age;
}

export function update(state) {
  const sig = `${state.width}|${state.ageGroup}|${state.ageMeasure}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  draw(state.ageGroup, state.ageMeasure, palette(state.theme, state.cvd));
}

function draw(group, k, P) {
  const m = MEASURES[k];
  const margin = { top: 28, right: 12, bottom: 34, left: 52 };
  const { g, width, height } = createSvg(host, { height: 320, margin });
  const rows = AGE_ORDER.map((a) => data.find((d) => d.group === group && d.age === a));
  title.textContent = `${SHORT[group]}: ${m.label.toLowerCase()}, by age group (2011–2021)`;

  const x = d3.scaleBand().domain(AGE_ORDER).range([0, width]).padding(0.25);
  // One scale for both groups, so switching group never rescales silently
  const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d[k])]).nice().range([height, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(k === "died_rate" ? d3.format(".0%") : (v) => v));
  g.append("text").attr("class", "value-label").attr("x", -margin.left).attr("y", -14).text(m.label);

  const t = d3.transition().duration(500);
  g.selectAll(".bar").data(rows).join("rect").attr("class", "bar")
    .attr("x", (d) => x(d.age)).attr("width", x.bandwidth()).attr("rx", 3)
    .attr("fill", (d) => (d.age === "75+" ? P.group[group] : P.soft[group]))
    .attr("y", height).attr("height", 0)
    .on("pointermove", (event, d) => showTooltip(event, `${SHORT[group]}, age ${d.age}`, [
      ["Hospital admissions", fmt(d.hosp)], ["Avg days in hospital", fmt1(d.los)],
      ["Died within 30 days", `${d3.format(".1%")(d.died_rate)} (${fmt(d.died)})`],
      [`Per 100,000 / yr${exact(d) ? "" : " ≈"}`, fmt1(d.rate)],
    ]))
    .on("pointerleave", hideTooltip)
    .transition(t).attr("y", (d) => y(d[k])).attr("height", (d) => height - y(d[k]));

  g.selectAll(".val").data(rows).join("text").attr("class", "value-label")
    .attr("x", (d) => x(d.age) + x.bandwidth() / 2).attr("y", (d) => y(d[k]) - 6).attr("text-anchor", "middle")
    .attr("fill", P.ink).attr("font-weight", (d) => (d.age === "75+" ? 700 : 400))
    .text((d) => `${k === "rate" && !exact(d) ? "≈" : ""}${m.f(d[k])}`);

  // Yellow annotation marker over the bar the chapter is about
  g.append("rect").attr("x", x("75+")).attr("width", x.bandwidth()).attr("y", height + 22).attr("height", 4).attr("fill", P.accent);
}

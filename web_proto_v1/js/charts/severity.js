/**
 * severity.js — Ch2a: how badly each road user is hurt.
 * Cleveland dot plot, sorted by state.sevMeasure, zero baseline, reference
 * line at the all-road-user average (computed from every road user, including
 * the small "other" group that is not drawn).
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 */
/* global d3 */
import { GROUPS, FOCUS, GROUP_DASH, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt, fmt1 } from "../utils.js";

const MEASURES = {
  los: { f: (v) => `${fmt1(v)} days` },
  died_rate: { f: d3.format(".1%") },
  ratio: { f: (v) => `${d3.format(".2f")(v)}×` },
};

let host, rows, avg, last = "";

export function init(el, data) {
  host = el.querySelector(".chart");
  const all = data.severity;
  rows = all.filter((d) => GROUPS.includes(d.group)).map((d) => ({ ...d, ratio: d.share_bed / d.share_hosp }));
  const tot = { hosp: d3.sum(all, (d) => d.hosp), bed: d3.sum(all, (d) => d.bed), died: d3.sum(all, (d) => d.died) };
  avg = { los: tot.bed / tot.hosp, died_rate: tot.died / (tot.hosp + tot.died), ratio: 1 };
}

export function update(state) {
  const sig = `${state.width}|${state.sevMeasure}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  draw(state.sevMeasure, palette(state.theme, state.cvd));
}

function draw(k, P) {
  const GROUP_COLOR = P.group;
  const m = MEASURES[k];
  const margin = { top: 18, right: 72, bottom: 34, left: 112 };
  const { g, width, height } = createSvg(host, { height: 250, margin });
  const sorted = [...rows].sort((a, b) => b[k] - a[k]);
  const x = d3.scaleLinear().domain([0, d3.max(sorted, (d) => d[k]) * 1.08]).nice().range([0, width]);
  const y = d3.scaleBand().domain(sorted.map((d) => d.group)).range([0, height]).padding(0.5);

  g.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(k === "died_rate" ? d3.format(".1%") : (v) => v));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat((d) => SHORT[d]).tickSize(0).tickPadding(10));

  const ref = g.append("g").attr("class", "annotation");
  ref.append("line").attr("x1", x(avg[k])).attr("x2", x(avg[k])).attr("y1", -6).attr("y2", height);
  ref.append("text").attr("x", x(avg[k]) + 4).attr("y", -6).text(k === "ratio" ? "fair share (1×)" : `all road users ${m.f(avg[k])}`);

  const t = d3.transition().duration(500);
  const row = g.selectAll(".row").data(sorted, (d) => d.group).join("g").attr("class", "row")
    .attr("transform", (d) => `translate(0,${y(d.group) + y.bandwidth() / 2})`)
    .on("pointermove", (event, d) => showTooltip(event, SHORT[d.group], [
      ["Hospital admissions", fmt(d.hosp)], ["Avg days in hospital", fmt1(d.los)],
      ["Died within 30 days", d3.format(".1%")(d.died_rate)],
      ["Share of admissions", d3.format(".0%")(d.share_hosp)],
      ["Share of hospital days", d3.format(".0%")(d.share_bed)],
    ]))
    .on("pointerleave", hideTooltip);
  row.append("line").attr("x1", 0).attr("x2", 0).attr("stroke", (d) => GROUP_COLOR[d.group]).attr("stroke-width", 2)
    .attr("stroke-dasharray", (d) => GROUP_DASH[d.group] || null)
    .transition(t).attr("x2", (d) => x(d[k]));
  row.append("circle").attr("cx", 0).attr("r", (d) => (FOCUS.includes(d.group) ? 8 : 6)).attr("fill", (d) => GROUP_COLOR[d.group])
    .transition(t).attr("cx", (d) => x(d[k]));
  row.append("text").attr("class", "value-label").attr("dy", "0.35em").attr("x", 0)
    .attr("fill", P.ink).attr("font-weight", (d) => (FOCUS.includes(d.group) ? 700 : 400))
    .text((d) => m.f(d[k])).transition(t).attr("x", (d) => x(d[k]) + 12);
}

/**
 * season.js — Ch4a: when in the year pedestrians and cyclists are hurt.
 * Each month ÷ the average month (1.0 = typical), 2011–2019 so lockdowns do
 * not distort the shape. Winter (Jun–Aug) shaded.
 *
 * v2 (wireframes 08 + 12): the two lines differ by marker shape AND dash, not
 * only colour (pedestrians = circles + solid, cyclists = squares + long dash);
 * peak rings have a dark edge; one Tab stop per chart, ← → move one month at
 * a time and read both groups together; take-away line; data table.
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 *
 * GenAI acknowledgement: v1 drafted by Quang with Claude; v2 changes written
 * with Claude (Anthropic) from wireframe 08 ("add shape + dash encoding,
 * month-by-month keyboard stops, take-away and data table"). Reviewed and
 * tested by Cường; see GENAI_LOG.md.
 */
/* global d3 */
import { MONTHS, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt } from "../utils.js";
import { announce, describeSvg, dataTable, roving, hasFocus, tipPoint } from "../a11y.js";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
/** Redundant encoding: each group has its own marker and dash pattern. */
const STYLE = {
  "Pedestrian": { symbol: d3.symbolCircle, dash: null },
  "Pedal cyclist": { symbol: d3.symbolSquare, dash: "10 5" },
};
const vs = d3.format("+.0%");

let fig, host, takeaway, series, months, last = "";
let focusIdx = 0;

export function init(el, data) {
  fig = el;
  host = el.querySelector(".chart");
  takeaway = el.querySelector('[data-part="takeaway"]');
  series = ["Pedestrian", "Pedal cyclist"].map((grp) => ({
    group: grp, rows: data.season.filter((d) => d.group === grp).sort((a, b) => a.month - b.month),
  }));
  // One row per month with both groups, for the keyboard stops and the table
  months = d3.range(1, 13).map((m) => {
    const ped = series[0].rows.find((d) => d.month === m);
    const cyc = series[1].rows.find((d) => d.month === m);
    return { month: m, ped, cyc, pedIndex: ped.index, pedHosp: ped.hosp, cycIndex: cyc.index, cycHosp: cyc.hosp };
  });
}

export function update(state) {
  const sig = `${state.width}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  draw(palette(state.theme, state.cvd));
}

const peak = (rows) => rows.reduce((a, b) => (b.index > a.index ? b : a));
const low = (rows) => rows.reduce((a, b) => (b.index < a.index ? b : a));

/** Peaks and troughs in words. Two months within 1 point of each other are named together. */
function summary() {
  const [ped, cyc] = series.map((s) => s.rows);
  const pPeak = peak(ped), cPeak = peak(cyc), cLow = low(cyc);
  const pNext = [...ped].sort((a, b) => b.index - a.index)[1];
  const pedWhen = pPeak.index - pNext.index < 0.01
    ? `${MONTH_NAMES[Math.min(pPeak.month, pNext.month) - 1]}–${MONTH_NAMES[Math.max(pPeak.month, pNext.month) - 1]}`
    : MONTH_NAMES[pPeak.month - 1];
  return `Pedestrians peak in ${pedWhen} (${vs(pPeak.index - 1)} vs an average month); `
    + `cyclists peak in ${MONTH_NAMES[cPeak.month - 1]} (${vs(cPeak.index - 1)}) and drop to their lowest in ${MONTH_NAMES[cLow.month - 1]} (${vs(cLow.index - 1)}).`;
}

function draw(P) {
  const GROUP_COLOR = P.group;
  const refocus = hasFocus(host);
  const narrow = host.clientWidth < 520;
  const margin = { top: 22, right: narrow ? 12 : 84, bottom: 30, left: 44 };
  const { svg, g, width, height } = createSvg(host, { height: 300, margin });
  const x = d3.scalePoint().domain(d3.range(1, 13)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0.7, 1.25]).range([height, 0]);
  const sum = summary();
  takeaway.textContent = sum;

  const step = x.step();
  g.append("rect").attr("aria-hidden", "true").attr("x", x(6) - step / 2).attr("width", step * 3).attr("height", height).attr("fill", P.band);
  g.append("text").attr("aria-hidden", "true").attr("class", "value-label").attr("x", x(7)).attr("y", -8).attr("text-anchor", "middle").text("Winter");

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat((m) => (narrow ? MONTHS[m - 1][0] : MONTHS[m - 1])));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v.toFixed(1)}×`));
  g.append("line").attr("aria-hidden", "true").attr("x1", 0).attr("x2", width).attr("y1", y(1)).attr("y2", y(1)).attr("stroke", P.muted);
  g.append("text").attr("aria-hidden", "true").attr("class", "value-label").attr("x", 4).attr("y", y(1) - 5).text("average month");

  // Keyboard / focus layer under the lines: one transparent column per month
  const stops = g.append("g").attr("class", "month-stops").selectAll(".month-stop").data(months).join("g")
    .attr("class", "month-stop").attr("role", "img")
    .attr("aria-label", (d) => `${MONTH_NAMES[d.month - 1]}: pedestrians ${d.pedIndex.toFixed(2)} times an average month, cyclists ${d.cycIndex.toFixed(2)} times`);
  stops.append("rect").attr("x", (d) => x(d.month) - step / 2).attr("width", step).attr("y", 0).attr("height", height).attr("rx", 4);

  const line = d3.line().x((d) => x(d.month)).y((d) => y(d.index)).curve(d3.curveMonotoneX);
  const marker = (type, size = 70) => d3.symbol().type(type).size(size)();
  const lines = g.append("g").attr("aria-hidden", "true");
  series.forEach((s) => {
    const c = GROUP_COLOR[s.group];
    lines.append("path").attr("d", line(s.rows)).attr("fill", "none").attr("stroke", c).attr("stroke-width", 3)
      .attr("stroke-dasharray", STYLE[s.group].dash);
    lines.selectAll(null).data(s.rows).join("path")
      .attr("d", marker(STYLE[s.group].symbol)).attr("transform", (d) => `translate(${x(d.month)},${y(d.index)})`)
      .attr("fill", c).attr("stroke", P.bg).attr("stroke-width", 1.5)
      .on("pointermove", (event, d) => showTooltip(event, `${SHORT[s.group]}, ${MONTHS[d.month - 1]}`, [
        ["Admissions 2011–19", fmt(d.hosp)], ["vs average month", vs(d.index - 1)],
      ]))
      .on("pointerleave", hideTooltip);
    // Direct label with the same marker, so the key does not depend on colour
    // Narrow screens: labels go inside the plot, the cyclist one clear of the March ring
    const lx = narrow ? x(s.group === "Pedestrian" ? 1 : 9) : width + 8;
    const ly = narrow ? y(s.group === "Pedestrian" ? 0.74 : 1.22) : y(s.rows.at(-1).index);
    lines.append("path").attr("d", marker(STYLE[s.group].symbol, 50)).attr("transform", `translate(${lx + 5},${ly})`).attr("fill", c);
    lines.append("text").attr("class", "direct-label").attr("fill", c)
      .attr("x", lx + 14).attr("y", ly).attr("dy", "0.35em").text(SHORT[s.group]);
  });

  // Yellow ring on each group's peak month, with a dark edge (v2)
  series.forEach((s) => {
    const p = peak(s.rows);
    [[11, P.ink, 1], [9, P.accent, 3]].forEach(([r, c, w]) => lines.append("circle")
      .attr("cx", x(p.month)).attr("cy", y(p.index)).attr("r", r).attr("fill", "none").attr("stroke", c).attr("stroke-width", w));
  });

  describeSvg(svg, "Each month compared with an average month, 2011–2019",
    `Line chart of two road users, 1.0 = an average month. Pedestrians: circles, solid line. Cyclists: squares, dashed line. ${sum}`);

  const monthTip = (d) => [
    ["Pedestrians", `${vs(d.pedIndex - 1)} (${fmt(d.pedHosp)})`],
    ["Cyclists", `${vs(d.cycIndex - 1)} (${fmt(d.cycHosp)})`],
  ];
  roving(stops, {
    index: focusIdx,
    onMove: (i) => { focusIdx = i; },
    onFocus: (d, node) => {
      showTooltip(tipPoint(node), `${MONTH_NAMES[d.month - 1]} vs an average month (admissions 2011–19)`, monthTip(d));
      announce(node.getAttribute("aria-label"));
    },
  });
  if (refocus) stops.nodes()[focusIdx].focus();

  dataTable(fig, "Hospital admissions by month compared with an average month, pedestrians and cyclists, 2011–2019", [
    { key: "month", label: "Month", format: (m) => MONTH_NAMES[m - 1] },
    { key: "pedIndex", label: "Pedestrians (× average)", format: (v) => v.toFixed(2) },
    { key: "pedHosp", label: "Pedestrian admissions", format: fmt },
    { key: "cycIndex", label: "Cyclists (× average)", format: (v) => v.toFixed(2) },
    { key: "cycHosp", label: "Cyclist admissions", format: fmt },
  ], months);
}

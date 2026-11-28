/**
 * counterparty.js — Ch2b: what injured pedestrians and cyclists collided with.
 * 100% stacked bars, one per group. Categories are not road users, so they
 * use neutral greys (palette rule: road-user colours mean "who" only); the
 * two categories that carry the story are darkest and labelled directly.
 * Wording: "collided with", never "hit by" — no fault is recorded.
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 */
/* global d3 */
import { SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt, pct } from "../utils.js";

const CATS = ["Car, pick-up truck or van", "Heavy vehicle or bus", "Motorcycle",
  "Fixed object", "No collision (e.g. fall)", "Other"];
// palette greys, strongest → weakest: car/van, no collision, heavy, motorcycle, fixed, other
const ORDER = [0, 2, 3, 4, 1, 5];
const DARK = new Set([CATS[0], CATS[4]]); // white labels on these

let host, legend, groups, color, P, last = "";

export function init(el, data) {
  host = el.querySelector(".chart");
  legend = el.querySelector(".legend");
  groups = ["Pedestrian", "Pedal cyclist"].map((grp) => {
    let x0 = 0;
    return { group: grp, segs: CATS.map((c) => {
      const r = data.counterparty.find((d) => d.group === grp && d.cp === c) || { hosp: 0, share: 0 };
      const s = { cat: c, hosp: r.hosp, share: r.share, x0 }; x0 += r.share; return s;
    }) };
  });
}

export function update(state) {
  const sig = `${state.width}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  P = palette(state.theme, state.cvd);
  color = d3.scaleOrdinal(CATS, ORDER.map((i) => P.cat[i]));
  d3.select(legend).selectAll(".legend-item").data(CATS).join("span").attr("class", "legend-item")
    .html((c) => `<span class="swatch" style="background:${color(c)}"></span>${c}`);
  draw();
}

function draw() {
  const margin = { top: 8, right: 8, bottom: 28, left: 92 };
  const { g, width, height } = createSvg(host, { height: 180, margin });
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleBand().domain(groups.map((d) => d.group)).range([0, height]).padding(0.3);

  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(pct));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat((d) => SHORT[d]).tickSize(0).tickPadding(10));

  const bars = g.selectAll(".cp").data(groups).join("g").attr("transform", (d) => `translate(0,${y(d.group)})`);
  const seg = bars.selectAll("rect").data((d) => d.segs.map((s) => ({ ...s, group: d.group }))).join("rect")
    .attr("x", (d) => x(d.x0)).attr("width", (d) => Math.max(0, x(d.share) - 1)).attr("height", y.bandwidth())
    .attr("fill", (d) => color(d.cat))
    .on("pointermove", (event, d) => {
      seg.attr("opacity", (s) => (s.cat === d.cat ? 1 : 0.25));
      showTooltip(event, `${SHORT[d.group]}: ${d.cat}`, [["Hospital admissions", fmt(d.hosp)], ["Share", d3.format(".1%")(d.share)]]);
    })
    .on("pointerleave", () => { seg.attr("opacity", 1); hideTooltip(); });

  bars.selectAll("text").data((d) => d.segs.filter((s) => s.share > 0.12)).join("text")
    .attr("x", (d) => x(d.x0) + 8).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
    .attr("fill", (d) => (DARK.has(d.cat) ? P.onStrong : P.ink))
    .attr("font-size", 13).attr("font-weight", 700).attr("pointer-events", "none")
    .text((d) => `${pct(d.share)}${x(d.share) > 150 ? ` ${d.cat.split(",")[0].replace(" (e.g. fall)", "")}` : ""}`);
}

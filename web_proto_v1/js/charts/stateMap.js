/**
 * stateMap.js — Ch4b: admissions per 100,000 people by state (BITRE ÷ ABS),
 * as an equal-area tile grid shaded with the palette's 5-step ramp for the
 * selected group, plus a linked line chart of the selected state vs Australia.
 * state.mapGroup: "Pedestrian" | "Pedal cyclist";  state.mapState: "NT", …
 * Clicking (or Enter on) a tile emits { mapState } — main.js owns the state.
 *
 * Interface: init(el, data) + update(state).  el = the .split wrapper with
 * [data-part=map], [data-part=legend], [data-part=detail], [data-part=detail-title].
 */
/* global d3 */
import { STATE_TILES, STATE_NAMES, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, emit, fmt, fmt1 } from "../utils.js";

let root, mapHost, legendHost, detailHost, detailTitle, data, last = "";

export function init(el, d) {
  root = el;
  mapHost = el.querySelector('[data-part="map"]');
  legendHost = el.querySelector('[data-part="legend"]');
  detailHost = el.querySelector('[data-part="detail"]');
  detailTitle = el.querySelector('[data-part="detail-title"]');
  data = d.stateYear;
}

export function update(state) {
  const sig = `${state.width}|${state.mapGroup}|${state.mapState}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  const s = stats(state.mapGroup);
  const P = palette(state.theme, state.cvd);
  drawMap(state, s, P);
  drawDetail(state, s, P);
}

function stats(group) {
  const rows = data.filter((d) => d.road_user === group);
  const byState = d3.rollups(rows, (v) => ({
    hosp: d3.sum(v, (d) => d.hosp), pop: d3.sum(v, (d) => d.total),
    years: v.map((d) => ({ year: d.year, rate: d.rate })).sort((a, b) => a.year - b.year),
  }), (d) => d.state).map(([state, s]) => ({ state, ...s, rate: (s.hosp / s.pop) * 1e5 }));
  const aus = d3.rollups(rows, (v) => (d3.sum(v, (d) => d.hosp) / d3.sum(v, (d) => d.total)) * 1e5, (d) => d.year)
    .map(([year, rate]) => ({ year, rate })).sort((a, b) => a.year - b.year);
  const ausRate = (d3.sum(rows, (d) => d.hosp) / d3.sum(rows, (d) => d.total)) * 1e5;
  return { byState, aus, ausRate };
}

function drawMap(state, { byState, ausRate }, P) {
  const H = 330;
  const { g, width } = createSvg(mapHost, { height: H, margin: { top: 8, right: 8, bottom: 8, left: 8 } });
  const size = Math.min(width / 4, (H - 16) / 4);
  const ox = (width - size * 4) / 2;
  const ramp = P.ramp[state.mapGroup];
  // 5 equal classes from 0 to the highest state: the palette ramp is discrete
  const color = d3.scaleQuantize().domain([0, d3.max(byState, (d) => d.rate)]).range(ramp);
  const ink = (v) => (ramp.indexOf(color(v)) >= 3 ? "#FFFFFF" : "#1F2328");

  const tiles = g.selectAll(".tile").data(byState).join("g").attr("class", "tile")
    .classed("is-selected", (d) => d.state === state.mapState)
    .attr("transform", (d) => `translate(${ox + STATE_TILES[d.state][0] * size},${STATE_TILES[d.state][1] * size})`)
    .attr("tabindex", 0).attr("role", "button")
    .attr("aria-pressed", (d) => d.state === state.mapState)
    .attr("aria-label", (d) => `${STATE_NAMES[d.state]}: ${fmt1(d.rate)} ${SHORT[state.mapGroup].toLowerCase()} admitted per 100,000 people per year`)
    .on("click", (_, d) => emit(root, { mapState: d.state }))
    .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); emit(root, { mapState: d.state }); } })
    .on("pointermove", (event, d) => showTooltip(event, STATE_NAMES[d.state], [
      ["Per 100,000 per year", fmt1(d.rate)], ["Australia", fmt1(ausRate)], ["Admissions 2011–21", fmt(d.hosp)],
    ]))
    .on("pointerleave", hideTooltip);
  tiles.append("rect").attr("class", "bg").attr("x", 3).attr("y", 3).attr("width", size - 6).attr("height", size - 6)
    .attr("rx", 8).attr("fill", (d) => color(d.rate));
  tiles.append("text").attr("x", 10).attr("y", 22).attr("font-weight", 700).attr("font-size", 14).attr("fill", (d) => ink(d.rate)).text((d) => d.state);
  tiles.append("text").attr("x", 10).attr("y", 42).attr("font-size", 13).attr("fill", (d) => ink(d.rate)).text((d) => fmt1(d.rate));

  const [lo, hi] = color.domain();
  const cuts = color.thresholds();
  legendHost.innerHTML = `<span>Per 100,000:</span>${ramp.map((c, i) =>
    `<span class="ramp-step"><span class="swatch" style="background:${c}"></span>${fmt1(i ? cuts[i - 1] : lo)}–${fmt1(i < cuts.length ? cuts[i] : hi)}</span>`).join("")}
    <span>· Australia ${fmt1(ausRate)}</span>`;
}

function drawDetail(state, { byState, aus }, P) {
  const GROUP_COLOR = P.group;
  const s = byState.find((d) => d.state === state.mapState);
  detailTitle.textContent = `${STATE_NAMES[s.state]} vs Australia, ${SHORT[state.mapGroup].toLowerCase()} per 100,000`;
  const margin = { top: 16, right: 70, bottom: 28, left: 40 };
  const { g, width, height } = createSvg(detailHost, { height: 300, margin });
  const x = d3.scaleLinear().domain([2011, 2021]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max([...s.years, ...aus], (d) => d.rate)]).nice().range([height, 0]);
  g.append("rect").attr("x", x(2019.5)).attr("width", x(2021) - x(2019.5)).attr("height", height).attr("fill", P.band);
  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));
  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.rate));
  g.append("path").attr("d", line(aus)).attr("fill", "none").attr("stroke", P.muted).attr("stroke-width", 2).attr("stroke-dasharray", "4 3");
  g.append("path").attr("d", line(s.years)).attr("fill", "none").attr("stroke", GROUP_COLOR[state.mapGroup]).attr("stroke-width", 3);
  g.append("text").attr("class", "direct-label").attr("x", width + 6).attr("y", y(s.years.at(-1).rate)).attr("dy", "0.35em")
    .attr("fill", GROUP_COLOR[state.mapGroup]).text(s.state);
  g.append("text").attr("class", "value-label").attr("x", width + 6).attr("y", y(aus.at(-1).rate)).attr("dy", "1.2em").text("Australia");
}

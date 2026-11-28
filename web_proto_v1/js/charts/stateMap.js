/**
 * stateMap.js — Ch4b: admissions per 100,000 people by state (BITRE ÷ ABS),
 * as an equal-area tile grid shaded with the palette's 5-step ramp for the
 * selected group, plus a linked line chart of the selected state vs Australia.
 * state.mapGroup: "Pedestrian" | "Pedal cyclist";  state.mapState: "NT", …
 * Clicking (or Enter on) a tile emits { mapState } — main.js owns the state.
 *
 * v2 (wireframes 09 + 12): the tiles are ONE Tab stop (← → ↑ ↓ move tile to
 * tile, Enter selects, focus stays on the tile after the redraw); take-away
 * line (highest / lowest); legend classes run from the lowest to the highest
 * state so all five colours are used; the trend has <title>/<desc>, "solid /
 * dashed" in the labels and series-break markers (Vic 2012, NSW 2017);
 * selection changes are announced; ranked data table with an Australia row.
 * Not done yet (next iteration): real state outlines + map → ranking morph (09b).
 *
 * Interface: init(el, data) + update(state).  el = the .split wrapper with
 * [data-part=map], [data-part=legend], [data-part=detail], [data-part=detail-title],
 * [data-part=takeaway].
 *
 * GenAI acknowledgement: v1 drafted by Quang with Claude; v2 changes written
 * with Claude (Anthropic) from wireframe 09 ("one Tab stop for the tiles,
 * take-away, min–max legend, series-break markers, table"). Reviewed and
 * tested by Cường; see GENAI_LOG.md.
 */
/* global d3 */
import { STATE_TILES, STATE_NAMES, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, emit, fmt, fmt1 } from "../utils.js";
import { announce, describeSvg, dataTable, roving, hasFocus, tipPoint } from "../a11y.js";

/** Counting changes that break a state's series (Sources → "About the data"). */
const BREAKS = { Vic: { at: 2011.5, label: "Vic counting change (2012)" }, NSW: { at: 2016.5, label: "NSW counting change (2017)" } };
/** Arrow-key order = reading order of the tile grid (row by row). */
const TILE_ORDER = Object.keys(STATE_TILES).sort((a, b) =>
  STATE_TILES[a][1] - STATE_TILES[b][1] || STATE_TILES[a][0] - STATE_TILES[b][0]);

let root, mapFig, mapHost, legendHost, detailHost, detailTitle, takeaway, data, last = "", lastPick = "";
let focusState = null;

export function init(el, d) {
  root = el;
  mapHost = el.querySelector('[data-part="map"]');
  mapFig = mapHost.closest("figure");
  legendHost = el.querySelector('[data-part="legend"]');
  detailHost = el.querySelector('[data-part="detail"]');
  detailTitle = el.querySelector('[data-part="detail-title"]');
  takeaway = el.querySelector('[data-part="takeaway"]');
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

  // Say what changed when the reader picks another state or road user (not on first load)
  const pick = `${state.mapGroup}|${state.mapState}`;
  if (lastPick && pick !== lastPick) {
    const st = s.byState.find((d) => d.state === state.mapState);
    announce(`${SHORT[state.mapGroup]}, ${STATE_NAMES[st.state]}: ${fmt1(st.rate)} admitted per 100,000 people per year; Australia ${fmt1(s.ausRate)}. ${takeaway.textContent}`);
  }
  lastPick = pick;
}

function stats(group) {
  const rows = data.filter((d) => d.road_user === group);
  const byState = d3.rollups(rows, (v) => ({
    hosp: d3.sum(v, (d) => d.hosp), pop: d3.sum(v, (d) => d.total),
    years: v.map((d) => ({ year: d.year, rate: d.rate })).sort((a, b) => a.year - b.year),
  }), (d) => d.state).map(([state, s]) => ({ state, ...s, rate: (s.hosp / s.pop) * 1e5 }))
    .sort((a, b) => TILE_ORDER.indexOf(a.state) - TILE_ORDER.indexOf(b.state));
  const aus = d3.rollups(rows, (v) => (d3.sum(v, (d) => d.hosp) / d3.sum(v, (d) => d.total)) * 1e5, (d) => d.year)
    .map(([year, rate]) => ({ year, rate })).sort((a, b) => a.year - b.year);
  const ausRate = (d3.sum(rows, (d) => d.hosp) / d3.sum(rows, (d) => d.total)) * 1e5;
  return { byState, aus, ausRate, hosp: d3.sum(rows, (d) => d.hosp) };
}

function drawMap(state, { byState, ausRate, hosp }, P) {
  const refocus = hasFocus(mapHost);
  const H = 330;
  const { svg, g, width } = createSvg(mapHost, { height: H, margin: { top: 8, right: 8, bottom: 8, left: 8 } });
  const size = Math.min(width / 4, (H - 16) / 4);
  const ox = (width - size * 4) / 2;
  const ramp = P.ramp[state.mapGroup];
  // 5 equal classes from the lowest to the highest state, so every colour is used
  const color = d3.scaleQuantize().domain(d3.extent(byState, (d) => d.rate)).range(ramp);
  const ink = (v) => (ramp.indexOf(color(v)) >= 3 ? "#FFFFFF" : "#1F2328");
  const who = SHORT[state.mapGroup].toLowerCase();

  const ranked = [...byState].sort((a, b) => b.rate - a.rate);
  const [hi, lo] = [ranked[0], ranked.at(-1)];
  takeaway.textContent = `Highest for ${who}: ${STATE_NAMES[hi.state]} (${fmt1(hi.rate)} per 100,000); lowest: ${STATE_NAMES[lo.state]} (${fmt1(lo.rate)}). Australia: ${fmt1(ausRate)}.`;

  const tiles = g.selectAll(".tile").data(byState).join("g").attr("class", "tile")
    .classed("is-selected", (d) => d.state === state.mapState)
    .attr("transform", (d) => `translate(${ox + STATE_TILES[d.state][0] * size},${STATE_TILES[d.state][1] * size})`)
    .attr("role", "button")
    .attr("aria-pressed", (d) => d.state === state.mapState)
    .attr("aria-label", (d) => `${STATE_NAMES[d.state]}: ${fmt1(d.rate)} ${who} admitted per 100,000 people per year`)
    .on("click", (_, d) => { focusState = d.state; emit(root, { mapState: d.state }); })
    .on("pointermove", (event, d) => showTooltip(event, STATE_NAMES[d.state], tipRows(d, ausRate)))
    .on("pointerleave", hideTooltip);
  tiles.append("rect").attr("class", "bg").attr("x", 3).attr("y", 3).attr("width", size - 6).attr("height", size - 6)
    .attr("rx", 8).attr("fill", (d) => color(d.rate));
  tiles.append("text").attr("aria-hidden", "true").attr("x", 10).attr("y", 22).attr("font-weight", 700).attr("font-size", 14).attr("fill", (d) => ink(d.rate)).text((d) => d.state);
  tiles.append("text").attr("aria-hidden", "true").attr("x", 10).attr("y", 42).attr("font-size", 13).attr("fill", (d) => ink(d.rate)).text((d) => fmt1(d.rate));

  describeSvg(svg, `Admissions per 100,000 people per year, ${who}, 2011–2021`,
    `Tile map, one square per state, darker = higher. ${takeaway.textContent} Use the arrow keys to move between states and Enter to show a state's trend.`);

  // Keyboard: one Tab stop for all eight tiles
  const start = byState.findIndex((d) => d.state === (focusState || state.mapState));
  roving(tiles, {
    index: start,
    onMove: (i) => { focusState = byState[i].state; },
    onFocus: (d, node) => {
      showTooltip(tipPoint(node), STATE_NAMES[d.state], tipRows(d, ausRate));
      announce(node.getAttribute("aria-label"));
    },
    onSelect: (d) => { focusState = d.state; emit(root, { mapState: d.state }); },
  });
  if (refocus) tiles.nodes()[Math.max(0, start)].focus();

  const [lo0, hi0] = color.domain();
  const cuts = color.thresholds();
  legendHost.innerHTML = `<span>Per 100,000:</span>${ramp.map((c, i) =>
    `<span class="ramp-step"><span class="swatch" style="background:${c}"></span>${fmt1(i ? cuts[i - 1] : lo0)}–${fmt1(i < cuts.length ? cuts[i] : hi0)}</span>`).join("")}
    <span>· Australia ${fmt1(ausRate)}</span>`;

  dataTable(mapFig, `${SHORT[state.mapGroup]} admitted to hospital per 100,000 people per year, by state, 2011–2021 (highest first)`, [
    { key: "name", label: "State or territory" },
    { key: "rate", label: "Per 100,000 per year", format: fmt1 },
    { key: "hosp", label: "Admissions 2011–21", format: fmt },
  ], [
    ...ranked.map((d) => ({ ...d, name: STATE_NAMES[d.state] })),
    { name: "Australia", rate: ausRate, hosp, isTotal: true },
  ]);
}

const tipRows = (d, ausRate) => [
  ["Per 100,000 per year", fmt1(d.rate)], ["Australia", fmt1(ausRate)], ["Admissions 2011–21", fmt(d.hosp)],
];

function drawDetail(state, { byState, aus }, P) {
  const GROUP_COLOR = P.group;
  const s = byState.find((d) => d.state === state.mapState);
  const who = SHORT[state.mapGroup].toLowerCase();
  const titleText = `${STATE_NAMES[s.state]} vs Australia, ${who} per 100,000`;
  detailTitle.textContent = titleText;
  const margin = { top: 16, right: 92, bottom: 28, left: 40 };
  const { svg, g, width, height } = createSvg(detailHost, { height: 300, margin });
  const x = d3.scaleLinear().domain([2011, 2021]).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max([...s.years, ...aus], (d) => d.rate)]).nice().range([height, 0]);
  g.append("rect").attr("aria-hidden", "true").attr("x", x(2019.5)).attr("width", x(2021) - x(2019.5)).attr("height", height).attr("fill", P.band);
  g.append("text").attr("aria-hidden", "true").attr("class", "value-label").attr("x", x(2020.25)).attr("y", -4).attr("text-anchor", "middle").text("COVID");
  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));

  // Series break: the state changed what counts as an admission, so the line is not comparable across it
  const brk = BREAKS[s.state];
  if (brk) {
    const bx = x(brk.at);
    g.append("line").attr("class", "annotation").attr("aria-hidden", "true")
      .attr("x1", bx).attr("x2", bx).attr("y1", 0).attr("y2", height).attr("stroke", P.ink).attr("stroke-dasharray", "2 3");
    g.append("text").attr("aria-hidden", "true").attr("class", "value-label")
      .attr("x", bx + 4).attr("y", 10).text(brk.label);
  }

  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.rate));
  g.append("path").attr("aria-hidden", "true").attr("d", line(aus)).attr("fill", "none").attr("stroke", P.muted).attr("stroke-width", 2).attr("stroke-dasharray", "4 3");
  g.append("path").attr("aria-hidden", "true").attr("d", line(s.years)).attr("fill", "none").attr("stroke", GROUP_COLOR[state.mapGroup]).attr("stroke-width", 3);
  // Keep the two end labels apart when the lines end close together
  let ys = y(s.years.at(-1).rate), ya = y(aus.at(-1).rate);
  if (Math.abs(ys - ya) < 16) { if (ys <= ya) ya = ys + 16; else ys = ya + 16; }
  g.append("text").attr("aria-hidden", "true").attr("class", "direct-label").attr("x", width + 6).attr("y", ys).attr("dy", "0.35em")
    .attr("fill", GROUP_COLOR[state.mapGroup]).text(`${s.state} (solid)`);
  g.append("text").attr("aria-hidden", "true").attr("class", "value-label").attr("x", width + 6).attr("y", ya).attr("dy", "0.35em").text("Australia (dashed)");

  const first = s.years[0], lastY = s.years.at(-1);
  describeSvg(svg, titleText,
    `Line chart, 2011 to 2021. ${STATE_NAMES[s.state]}: ${fmt1(first.rate)} in ${first.year}, ${fmt1(lastY.rate)} in ${lastY.year}; `
    + `average ${fmt1(s.rate)} per 100,000 per year. Australia: ${fmt1(aus[0].rate)} in ${aus[0].year}, ${fmt1(aus.at(-1).rate)} in ${aus.at(-1).year}.`
    + `${brk ? ` ${brk.label}: years before and after are not directly comparable.` : ""}`);
}

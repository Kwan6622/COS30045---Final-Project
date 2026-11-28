/**
 * trend.js — Ch1: hospital admissions per year by road user (scrollytelling).
 * state.trendMode: "index" (2012 = 100, compares growth) | "hosp" (counts).
 * state.trendFocus: a group the current Scrollama step talks about; other
 * lines fade so the eye follows the text.
 * Annotations: COVID years shaded, NSW 2017 counting change marked, and the
 * 2012→2019 change written at the 2019 point with a yellow annotation ring.
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 */
/* global d3 */
import { GROUPS, FOCUS, GROUP_DASH, SHORT, BASE_YEAR, END_YEAR, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt } from "../utils.js";

let host, series, last = "";

export function init(el, data) {
  host = el.querySelector(".chart");
  series = GROUPS.map((g) => {
    const rows = data.groupYear.filter((d) => d.group === g).sort((a, b) => a.year - b.year);
    const base = rows.find((d) => d.year === BASE_YEAR).hosp;
    return { group: g, rows: rows.map((d) => ({ ...d, index: (d.hosp / base) * 100 })) };
  });
}

export function update(state) {
  const sig = `${state.width}|${state.trendMode}|${state.trendFocus}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  draw(state);
}

function draw(state) {
  const P = palette(state.theme, state.cvd);
  const GROUP_COLOR = P.group;
  const key = state.trendMode;
  const focus = state.trendFocus;
  const narrow = host.clientWidth < 560;
  const margin = { top: 24, right: narrow ? 16 : 112, bottom: 30, left: 48 };
  // shorter on phones so the pinned chart and its message card both fit on screen
  const { g, width, height } = createSvg(host, { height: narrow ? 300 : 380, margin });
  const all = series.flatMap((s) => s.rows);

  const x = d3.scaleLinear().domain([2011, 2021]).range([0, width]);
  const y = key === "index"
    ? d3.scaleLinear().domain(d3.extent([60, ...all.map((d) => d.index), 160])).nice().range([height, 0])
    : d3.scaleLinear().domain([0, d3.max(all, (d) => d.hosp)]).nice().range([height, 0]);

  // Context first: COVID band + series break
  g.append("rect").attr("x", x(2019.5)).attr("width", x(2021) - x(2019.5) + 4).attr("height", height).attr("fill", P.band);
  g.append("text").attr("class", "value-label").attr("x", x(2020.25)).attr("y", -8).attr("text-anchor", "middle").text("COVID");
  const brk = g.append("g").attr("class", "annotation");
  brk.append("line").attr("x1", x(2017)).attr("x2", x(2017)).attr("y1", 0).attr("y2", height);
  brk.append("text").attr("x", x(2017) + 4).attr("y", 10).text(narrow ? "NSW rule change" : "NSW counting change (2017)");

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(narrow ? 5 : 11).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(key === "index" ? (d) => d : d3.format("~s")));
  if (key === "index") {
    g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(100)).attr("y2", y(100)).attr("stroke", P.muted);
  }

  const dim = (grp) => (focus && grp !== focus ? 0.18 : 1);
  const line = d3.line().x((d) => x(d.year)).y((d) => y(d[key])).curve(d3.curveMonotoneX);
  const order = [...series].sort((a, b) => FOCUS.includes(a.group) - FOCUS.includes(b.group));
  g.selectAll(".series").data(order).join("path").attr("class", "series")
    .attr("fill", "none").attr("stroke", (s) => GROUP_COLOR[s.group])
    .attr("stroke-width", (s) => (FOCUS.includes(s.group) ? 3 : 2))
    .attr("stroke-dasharray", (s) => GROUP_DASH[s.group] || null)
    .attr("opacity", (s) => dim(s.group))
    .attr("d", (s) => line(s.rows));

  // 2012 → 2019 change at the 2019 point (yellow ring = annotation, not data)
  FOCUS.forEach((grp) => {
    const s = series.find((d) => d.group === grp);
    const a = s.rows.find((d) => d.year === BASE_YEAR);
    const b = s.rows.find((d) => d.year === END_YEAR);
    const o = dim(grp);
    g.append("circle").attr("cx", x(END_YEAR)).attr("cy", y(b[key])).attr("r", 7)
      .attr("fill", "none").attr("stroke", P.accent).attr("stroke-width", 3).attr("opacity", o);
    g.append("circle").attr("cx", x(END_YEAR)).attr("cy", y(b[key])).attr("r", 4).attr("fill", GROUP_COLOR[grp]).attr("opacity", o);
    g.append("text").attr("class", "direct-label").attr("x", x(END_YEAR) - 10).attr("y", y(b[key]) - 12)
      .attr("text-anchor", "end").attr("fill", GROUP_COLOR[grp]).attr("opacity", o)
      .text(`${d3.format("+.0%")(b.hosp / a.hosp - 1)} 2012→19`);
  });

  // Direct labels at the line ends (no legend needed)
  const ends = series.map((s) => ({ group: s.group, y: y(s.rows.at(-1)[key]) }));
  ends.sort((a, b) => a.y - b.y).forEach((d, i, arr) => { if (i && d.y - arr[i - 1].y < 14) d.y = arr[i - 1].y + 14; });
  g.selectAll(".end").data(ends).join("text").attr("class", "direct-label")
    .attr("x", narrow ? width - 2 : width + 8).attr("y", (d) => (narrow ? d.y - 8 : d.y)).attr("dy", "0.35em")
    .attr("text-anchor", narrow ? "end" : "start")
    .attr("fill", (d) => (d.group === "Car occupant" ? P.muted : GROUP_COLOR[d.group]))
    .attr("opacity", (d) => dim(d.group))
    .text((d) => SHORT[d.group]);

  // Crosshair: one hover shows every group for that year
  const hover = g.append("line").attr("y1", 0).attr("y2", height).attr("stroke", P.muted).attr("opacity", 0);
  g.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent")
    .on("pointermove", (event) => {
      const yr = Math.round(x.invert(d3.pointer(event)[0]));
      hover.attr("x1", x(yr)).attr("x2", x(yr)).attr("opacity", 1);
      showTooltip(event, `${yr}${yr >= 2020 ? " (COVID)" : ""}`, GROUPS.map((grp) => {
        const r = series.find((s) => s.group === grp).rows.find((d) => d.year === yr);
        return [SHORT[grp], key === "index" ? `${fmt(r.hosp)} (${Math.round(r.index)})` : fmt(r.hosp)];
      }));
    })
    .on("pointerleave", () => { hover.attr("opacity", 0); hideTooltip(); });
}

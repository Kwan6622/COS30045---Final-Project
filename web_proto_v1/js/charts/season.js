/**
 * season.js — Ch4a: when in the year pedestrians and cyclists are hurt.
 * Each month ÷ the average month (1.0 = typical), 2011–2019 so lockdowns do
 * not distort the shape. Winter (Jun–Aug) shaded.
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 */
/* global d3 */
import { MONTHS, SHORT, palette } from "../constants.js";
import { createSvg, showTooltip, hideTooltip, fmt } from "../utils.js";

let host, series, last = "";

export function init(el, data) {
  host = el.querySelector(".chart");
  series = ["Pedestrian", "Pedal cyclist"].map((grp) => ({
    group: grp, rows: data.season.filter((d) => d.group === grp).sort((a, b) => a.month - b.month),
  }));
}

export function update(state) {
  const sig = `${state.width}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  draw(palette(state.theme, state.cvd));
}

function draw(P) {
  const GROUP_COLOR = P.group;
  const narrow = host.clientWidth < 520;
  const margin = { top: 22, right: narrow ? 12 : 84, bottom: 30, left: 44 };
  const { g, width, height } = createSvg(host, { height: 300, margin });
  const x = d3.scalePoint().domain(d3.range(1, 13)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0.7, 1.25]).range([height, 0]);

  const step = x.step();
  g.append("rect").attr("x", x(6) - step / 2).attr("width", step * 3).attr("height", height).attr("fill", P.band);
  g.append("text").attr("class", "value-label").attr("x", x(7)).attr("y", -8).attr("text-anchor", "middle").text("Winter");

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat((m) => (narrow ? MONTHS[m - 1][0] : MONTHS[m - 1])));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v.toFixed(1)}×`));
  g.append("line").attr("x1", 0).attr("x2", width).attr("y1", y(1)).attr("y2", y(1)).attr("stroke", P.muted);
  g.append("text").attr("class", "value-label").attr("x", 4).attr("y", y(1) - 5).text("average month");

  const line = d3.line().x((d) => x(d.month)).y((d) => y(d.index)).curve(d3.curveMonotoneX);
  series.forEach((s) => {
    const c = GROUP_COLOR[s.group];
    g.append("path").attr("d", line(s.rows)).attr("fill", "none").attr("stroke", c).attr("stroke-width", 3);
    g.selectAll(null).data(s.rows).join("circle").attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.index))
      .attr("r", 4).attr("fill", c).attr("stroke", P.bg).attr("stroke-width", 1.5)
      .on("pointermove", (event, d) => showTooltip(event, `${SHORT[s.group]}, ${MONTHS[d.month - 1]}`, [
        ["Admissions 2011–19", fmt(d.hosp)], ["vs average month", d3.format("+.0%")(d.index - 1)],
      ]))
      .on("pointerleave", hideTooltip);
    g.append("text").attr("class", "direct-label").attr("fill", c)
      .attr("x", narrow ? x(1) : width + 8)
      .attr("y", narrow ? y(s.group === "Pedestrian" ? 0.74 : 1.22) : y(s.rows.at(-1).index))
      .attr("dy", "0.35em").text(SHORT[s.group]);
  });

  // Yellow annotation on each group's peak month
  series.forEach((s) => {
    const p = s.rows.reduce((a, b) => (b.index > a.index ? b : a));
    g.append("circle").attr("cx", x(p.month)).attr("cy", y(p.index)).attr("r", 8)
      .attr("fill", "none").attr("stroke", P.accent).attr("stroke-width", 3);
  });
}

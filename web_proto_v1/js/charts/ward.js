/**
 * ward.js — Opening: "the ward". One bed icon = one hospital bed filled every
 * day by an injured pedestrian or cyclist (bed days 2011–2021 ÷ 4,018 days).
 * Beds fill in one by one the first time the opening is on screen
 * (state.wardPlayed, set by Scrollama), so the size is felt before it is read.
 *
 * Interface: init(el, data) + update(state).  el = the .viz figure.
 */
/* global d3 */
import { SHORT, palette } from "../constants.js";
import { wardBeds } from "../data.js";
import { createSvg, showTooltip, hideTooltip, fmt } from "../utils.js";

let host, legend, beds, last = "", animated = false;

export function init(el, data) {
  host = el.querySelector(".chart");
  legend = el.querySelector(".legend");
  beds = wardBeds(data.severity);
}

export function update(state) {
  const sig = `${state.width}|${state.wardPlayed}|${state.theme}|${state.cvd}`;
  if (sig === last) return;
  last = sig;
  draw(state);
}

function draw(state) {
  const P = palette(state.theme, state.cvd);
  legend.innerHTML = beds.map((b) => `<span class="legend-item"><span class="swatch" style="background:${P.group[b.group]}"></span>${SHORT[b.group]}</span>`).join("");

  const cols = host.clientWidth < 520 ? 12 : 24;
  const icons = beds.flatMap((b) => d3.range(b.n).map(() => b));
  const rows = Math.ceil(icons.length / cols);
  const { g, width } = createSvg(host, { height: 8 + rows * 30, margin: { top: 4, right: 0, bottom: 4, left: 0 } });
  const cell = width / cols;
  const w = Math.min(cell - 4, 34);
  const fill = (d) => P.group[d.group];

  const bed = g.selectAll(".bed").data(icons).join("g")
    .attr("class", `bed${animated ? " is-in" : ""}`)
    .attr("transform", (_, i) => `translate(${(i % cols) * cell},${Math.floor(i / cols) * 30})`)
    .on("pointermove", (event, d) => showTooltip(event, SHORT[d.group], [
      ["Beds filled every day", fmt(d.n)], ["Days in hospital 2011–2021", fmt(d.bedDays)],
    ]))
    .on("pointerleave", hideTooltip);
  // Bed glyph: mattress + headboard + pillow
  bed.append("rect").attr("x", 0).attr("y", 10).attr("width", w).attr("height", 9).attr("rx", 2).attr("fill", fill);
  bed.append("rect").attr("x", 0).attr("y", 4).attr("width", 3).attr("height", 18).attr("rx", 1).attr("fill", fill);
  bed.append("rect").attr("x", 5).attr("y", 6).attr("width", 7).attr("height", 4).attr("rx", 1.5).attr("fill", fill).attr("opacity", 0.6);

  if (state.wardPlayed && !animated) {
    animated = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    bed.each(function (_, i) {
      if (reduce) this.classList.add("is-in");
      else setTimeout(() => this.classList.add("is-in"), i * 18);
    });
  }
}

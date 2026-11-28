/**
 * a11y.js — the accessibility layer shared by every chart (wireframe 12, v2).
 *
 *   announce(text)            one polite live region for the whole page
 *   describeSvg(svg, t, d)    role="group" + aria-roledescription="chart" + <title>/<desc>
 *   dataTable(el, cap, cols, rows)   "Show the data as a table" (<details> + real <table>)
 *   roving(marks, opts)       one Tab stop per chart; arrow keys move between marks
 *   tipPoint(node)            where to put the tooltip when a mark gets keyboard focus
 *
 * Keyboard map (W8 slides 41–49, Chartability):
 *   Tab = one stop per chart · ← → ↑ ↓ = previous / next mark · Home / End =
 *   first / last mark · Enter / Space = select · Esc = hide the tooltip (WCAG 1.4.13).
 *
 * GenAI acknowledgement: written with Claude (Anthropic) from the team's v2
 * wireframes (prompt: "implement the shared accessibility layer of wireframe 12:
 * live-region announcer, data table, roving tabindex"). Reviewed and tested by
 * Cường; see GENAI_LOG.md.
 */
/* global d3 */
import { hideTooltip } from "./utils.js";

/* ---------------- Live region ---------------- */
let live;

/**
 * Read a short message to screen-reader users without moving focus.
 * The text is cleared first and set on the next frame: a live region only
 * speaks when its content changes, so the same message twice would be silent.
 */
export function announce(text) {
  if (!live) {
    live = document.createElement("div");
    live.id = "tooltip-announcer";
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    document.body.append(live);
  }
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = text; });
}

/* ---------------- Chart semantics ---------------- */
let uid = 0;

/**
 * Give a chart's <svg> a name and a description screen readers can reach.
 * role="group" (not role="img") because the marks inside are focusable:
 * role="img" would hide them from assistive technology (W8 slides 35–39).
 */
export function describeSvg(svg, title, desc) {
  const id = `chart-${++uid}`;
  svg.attr("role", "group").attr("aria-roledescription", "chart")
    .attr("aria-labelledby", `${id}-t`).attr("aria-describedby", `${id}-d`);
  svg.insert("desc", ":first-child").attr("id", `${id}-d`).text(desc);
  svg.insert("title", ":first-child").attr("id", `${id}-t`).text(title);
  // Axes and gridlines repeat what the table says; keep them out of the reading order
  svg.selectAll(".axis, .grid").attr("aria-hidden", "true");
}

/* ---------------- Data table ---------------- */
/**
 * The chart's data as a real table under the chart.
 * columns: [{ key, label, format? }] — the first column becomes the row header.
 * The <details> element is kept between redraws (only the <table> is
 * replaced), so a table the reader opened stays open when a chip changes.
 */
export function dataTable(el, caption, columns, rows) {
  let box = el.querySelector(":scope > details.data-table");
  if (!box) {
    box = document.createElement("details");
    box.className = "data-table";
    box.innerHTML = "<summary>Show the data as a table</summary>";
    el.append(box);
  }
  box.querySelector("table")?.remove();

  const table = d3.select(box).append("table");
  table.append("caption").text(caption);
  table.append("thead").append("tr")
    .selectAll("th").data(columns).join("th")
    .attr("scope", "col").text((c) => c.label);

  table.append("tbody").selectAll("tr").data(rows).join("tr")
    .classed("is-total", (r) => !!r.isTotal)
    .each(function (r) {
      columns.forEach((c, i) => {
        d3.select(this).append(i === 0 ? "th" : "td")
          .attr("scope", i === 0 ? "row" : null)
          .text(c.format ? c.format(r[c.key], r) : r[c.key]);
      });
    });
}

/* ---------------- Roving tabindex ---------------- */
/**
 * Make a set of marks ONE stop in the Tab order: only the current mark has
 * tabindex="0", the others "-1", and the arrow keys move between them.
 *
 * opts.index     mark that holds the Tab stop (e.g. the 75+ bar)
 * opts.onMove(i) called when the arrow keys change the current mark, so the
 *                chart can remember it and restore focus after a redraw
 * opts.onFocus(d, node)   show the tooltip / announce
 * opts.onSelect(d, node)  Enter or Space (optional)
 */
export function roving(marks, { index = 0, onMove, onFocus, onSelect } = {}) {
  const nodes = marks.nodes();
  if (!nodes.length) return;
  let current = Math.max(0, Math.min(nodes.length - 1, index));

  marks.attr("tabindex", (_, i) => (i === current ? 0 : -1)).classed("mark", true);

  const moveTo = (i) => {
    current = (i + nodes.length) % nodes.length;
    marks.attr("tabindex", (_, k) => (k === current ? 0 : -1));
    onMove?.(current);
    nodes[current].focus();
  };

  marks
    .on("focus.roving", function (_, d) { onFocus?.(d, this); })
    .on("blur.roving", hideTooltip)
    .on("keydown.roving", function (event, d) {
      const keys = {
        ArrowRight: current + 1, ArrowDown: current + 1,
        ArrowLeft: current - 1, ArrowUp: current - 1,
        Home: 0, End: nodes.length - 1,
      };
      if (event.key in keys) {
        event.preventDefault();
        moveTo(keys[event.key]);
      } else if ((event.key === "Enter" || event.key === " ") && onSelect) {
        event.preventDefault();
        onSelect(d, this);
      } else if (event.key === "Escape") {
        hideTooltip();
      }
    });
}

/** True when keyboard focus is inside this element (checked before a redraw). */
export const hasFocus = (el) => el.contains(document.activeElement);

/** A pointer-like position at the top-right of a mark, for showTooltip(). */
export function tipPoint(node) {
  const r = node.getBoundingClientRect();
  return { clientX: r.right, clientY: r.top };
}

/* Esc hides the tooltip wherever focus is (WCAG 1.4.13 dismissible content). */
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTooltip(); });

/**
 * cite.js — turns <span class="cite" data-ref="key"></span> markers into
 * "(Author, year)" buttons that show the full APA reference in the shared
 * tooltip (hover or keyboard focus), and builds the References list.
 */
import { SOURCES } from "./sources.js";
import { showTooltip, hideTooltip } from "./utils.js";

export function renderCites(root = document) {
  root.querySelectorAll(".cite[data-ref]:not([data-done])").forEach((el) => {
    const s = SOURCES[el.dataset.ref];
    if (!s) { console.warn("Unknown source", el.dataset.ref); return; }
    el.dataset.done = "1";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cite-btn";
    btn.textContent = `(${s.short})`;
    btn.setAttribute("aria-label", `Source: ${s.short}. Full reference in Sources.`);
    const show = (ev) => {
      const r = btn.getBoundingClientRect();
      const e = ev.clientX ? ev : { clientX: r.left, clientY: r.bottom };
      showTooltip(e, s.short, [["", s.apa.replace(/<[^>]+>/g, "")]]);
    };
    btn.addEventListener("pointermove", show);
    btn.addEventListener("focus", show);
    btn.addEventListener("pointerleave", hideTooltip);
    btn.addEventListener("blur", hideTooltip);
    el.replaceChildren(btn);
  });
}

/** Grouped APA list (alphabetical within each group), for the Sources step. */
export function renderReferences(selector) {
  const groups = {};
  Object.values(SOURCES).forEach((s) => { (groups[s.group] ||= []).push(s); });
  document.querySelector(selector).innerHTML = Object.entries(groups).map(([g, list]) => `
    <div class="ref-group"><h3>${g}</h3><ul class="ref-list">
      ${list.sort((a, b) => a.apa.localeCompare(b.apa))
        .map((s) => `<li>${s.apa} <a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></li>`).join("")}
    </ul></div>`).join("");
}

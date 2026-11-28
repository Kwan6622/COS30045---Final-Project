/**
 * roles.js — Ch5: "What can you do?" role picker.
 * The reader picks how they use the road (state.role); the panel repeats the
 * figures from earlier chapters that matter for that role, then lists actions.
 * Safe System order: system and driver actions first, self-protection tips
 * labelled "extra protection" so they do not read as blaming victims.
 * Every action carries a source key from sources.js (checked 24 Nov 2026).
 *
 * v2 (wireframe 10): buttons are type="button" with aria-pressed; actions are
 * sorted System → Driver → Extra protection and the level is shown by border
 * style (solid / outline / dashed), not colour, with the order as a key; the
 * self-protection tips sit under their own "Extra protection" heading so they
 * do not read as blaming the person who was hurt. The panel is aria-live.
 *
 * Interface: init(el, data) + update(state).  el = wrapper with
 * [data-part=buttons] and [data-part=panel]. Clicking a role emits { role }.
 *
 * GenAI acknowledgement: v1 drafted by Quang with Claude; v2 changes written
 * with Claude (Anthropic) from wireframe 10 ("Safe System order with style-coded
 * tags and an Extra protection group"). Reviewed and tested by Cường; see GENAI_LOG.md.
 */
/* global d3 */
import { sev, cpShare, ageRow, seasonIndex, wardBeds } from "../data.js";  // same bed count as the hero
import { fmt1, pct, emit } from "../utils.js";
import { renderCites } from "../cite.js";

let root, buttons, panel, roles, last = "";

export function init(el, data) {
  root = el;
  buttons = el.querySelector('[data-part="buttons"]');
  panel = el.querySelector('[data-part="panel"]');
  roles = buildRoles(data);
  buttons.innerHTML = Object.entries(roles).map(([k, r]) => `
    <button type="button" class="role" data-role="${k}" aria-pressed="false">
      <span class="role-icon" aria-hidden="true">${r.icon}</span>
      <span class="role-name">${r.name}</span><br><span class="role-sub">${r.sub}</span>
    </button>`).join("");
  buttons.querySelectorAll(".role").forEach((b) => b.addEventListener("click", () => emit(root, { role: b.dataset.role })));
}

export function update(state) {
  if (state.role === last) return;
  last = state.role;
  buttons.querySelectorAll(".role").forEach((b) => {
    const on = b.dataset.role === state.role;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", on);
  });
  const r = roles[state.role];
  // Safe System order: change the system and drivers first, self-protection last
  const sorted = [...r.actions].sort((a, b) => LEVELS.indexOf(a[0]) - LEVELS.indexOf(b[0]));
  const main = sorted.filter(([tag]) => tag !== "Extra protection");
  const extra = sorted.filter(([tag]) => tag === "Extra protection");
  panel.innerHTML = `
    <h3>${r.title}</h3>
    <div class="role-stats">${r.stats.map(([v, l]) => `<div class="stat"><div class="value">${v}</div><div class="label">${l}</div></div>`).join("")}</div>
    <p class="action-key"><span>Safe System order:</span>${LEVELS.map((l) => tag(l)).join('<span aria-hidden="true">→</span>')}</p>
    <ul class="actions">${main.map(item).join("")}</ul>
    ${extra.length ? `<h4>Extra protection</h4><p class="hint">On top of safer roads and drivers, not instead of them.</p>
    <ul class="actions">${extra.map(item).join("")}</ul>` : ""}
    <p class="src">Figures: BITRE (2023), road-crash hospital admissions 2011–2021; ABS (2026) population. Full references in <strong>Sources</strong> at the end.</p>`;
  renderCites(panel);
}

const LEVELS = ["System", "Driver", "Extra protection"];
const tag = (level) => `<span class="tag tag-${level.split(" ")[0].toLowerCase()}">${level === "Extra protection" ? "Extra" : level}</span>`;
const item = ([level, text, ref]) => `<li>${tag(level)}${text} <span class="cite" data-ref="${ref}"></span></li>`;

function buildRoles(data) {
  const ped = sev(data, "Pedestrian"), car = sev(data, "Car occupant"), cyc = sev(data, "Pedal cyclist");
  const old = ageRow(data, "Pedestrian", "75+");
  // [tag, action, source key]
  return {
    driver: {
      icon: "🚗", name: "I drive", sub: "car, ute or van",
      title: "When you drive, the people outside your car have no crumple zone",
      stats: [
        [pct(cpShare(data, "Pedestrian", "Car, pick-up truck or van")), "of injured pedestrians collided with a car, pick-up truck or van"],
        [`${fmt1(ped.los)} days`, `average hospital stay for a pedestrian, vs ${fmt1(car.los)} for someone in a car`],
        [`+${pct(seasonIndex(data, "Pedestrian", 6) - 1)}`, "more pedestrian admissions in June than in an average month"],
      ],
      actions: [
        ["System", "Speed limits of 30–40 km/h where many people walk: a pedestrian's risk of death is about 5% at 30 km/h and 50% at 59 km/h.", "hussain"],
        ["Driver", "Slow down near people on foot: the risk of death for a pedestrian rises 4.5 times between 50 and 65 km/h.", "who"],
        ["Driver", "Leave at least 1 m when passing a bike (1.5 m where the limit is over 60 km/h). It is the law in NSW.", "nswPassing"],
      ],
    },
    walk: {
      icon: "🚶", name: "I walk", sub: "or my parents do",
      title: "On foot, your body takes the whole impact",
      stats: [
        [`${fmt1(old.los)} days`, "average hospital stay for a pedestrian aged 75 or over"],
        [`1 in ${Math.round(1 / old.died_rate)}`, "pedestrians aged 75+ admitted to hospital die within 30 days"],
        [pct(ped.share_bed), `of all road-crash hospital days, from ${pct(ped.share_hosp)} of admissions`],
      ],
      actions: [
        ["System", "Footpaths, safe crossing points and traffic calming reduce injuries for people walking.", "who"],
        ["Extra protection", "Cross at traffic lights or pedestrian crossings, cross as few roads as possible, and wear brightly coloured clothing.", "vic65"],
        ["Extra protection", "Older walkers: have sight and hearing checked regularly, and ask a pharmacist how medicines affect you on the road.", "vic65"],
      ],
    },
    cycle: {
      icon: "🚲", name: "I ride", sub: "bike or e-bike",
      title: "Most cyclist injuries happen without another vehicle",
      stats: [
        [pct(cpShare(data, "Pedal cyclist", "No collision (e.g. fall)")), "of injured cyclists had no collision, such as a fall"],
        [pct(cpShare(data, "Pedal cyclist", "Car, pick-up truck or van")), "collided with a car, pick-up truck or van"],
        [`+${pct(seasonIndex(data, "Pedal cyclist", 3) - 1)}`, "more cyclist admissions in March than in an average month"],
      ],
      actions: [
        ["System", "Cycling lanes and traffic calming reduce injuries for people riding.", "who"],
        ["Driver", "Drivers must leave at least 1 m when passing you (1.5 m over 60 km/h) in NSW.", "nswPassing"],
        ["Extra protection", "Wear an approved helmet, keep a working brake, and use a white front and red rear light at night.", "nswBike"],
      ],
    },
    policy: {
      icon: "🏛️", name: "I make decisions", sub: "council, state, federal",
      title: "Where the data says to act first",
      stats: [
        [pct(ped.died_rate), `of pedestrian admissions end in death within 30 days (car occupants ${d3.format(".1%")(car.died_rate)})`],
        [`${d3.sum(wardBeds(data.severity), (d) => d.n)}`, "hospital beds filled every day by injured pedestrians and cyclists"],
        [pct(cpShare(data, "Pedal cyclist", "No collision (e.g. fall)")), "of cyclist injuries involve no other vehicle: a road-design issue"],
      ],
      actions: [
        ["System", "Follow the Safe System approach: design roads, speeds and vehicles so mistakes do not cause death or serious injury. National target: at least 30% fewer serious injuries by 2030.", "nrss"],
        ["System", "Set 30–40 km/h limits in areas with many pedestrians.", "hussain"],
        ["System", "Fund footpaths, cycling lanes and safe crossing points, and use rates per person (Chapter 4) to choose where first.", "who"],
      ],
    },
  };
}

/**
 * roles.js — Ch5: "What can you do?" role picker.
 * The reader picks how they use the road; the panel repeats the figures from
 * earlier chapters that matter for that role, then lists actions.
 * Order follows the Safe System framing agreed by the team: system and driver
 * actions first, self-protection tips for pedestrians/cyclists labelled
 * "extra protection" so they do not read as blaming victims.
 * Every action carries a source key from sources.js (checked 24 Nov 2026).
 */
/* global d3 */
import { fmt1, pct } from "../utils.js";
import { renderCites } from "../cite.js";

export class RolePicker {
  constructor(buttonsSel, panelSel, data) {
    this.buttonsSel = buttonsSel;
    this.panelSel = panelSel;
    const sev = (g) => data.severity.find((d) => d.group === g);
    const cp = (g, c) => data.counterparty.find((d) => d.group === g && d.cp === c).share;
    const age = (g, a) => data.age.find((d) => d.group === g && d.age === a);
    const season = (g, m) => data.season.find((d) => d.group === g && d.month === m).index;
    const ped = sev("Pedestrian"), car = sev("Car occupant"), cyc = sev("Pedal cyclist");
    const old = age("Pedestrian", "75+");

    // [tag, action, source key]
    this.roles = {
      driver: {
        icon: "🚗", name: "I drive", sub: "car, ute or van",
        title: "When you drive, the people outside your car have no crumple zone",
        stats: [
          [pct(cp("Pedestrian", "Car, pick-up truck or van")), "of injured pedestrians collided with a car, pick-up truck or van"],
          [`${fmt1(ped.los)} days`, `average hospital stay for a pedestrian, vs ${fmt1(car.los)} for someone in a car`],
          [`+${pct(season("Pedestrian", 6) - 1)}`, "more pedestrian admissions in June than in an average month"],
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
          [pct(cp("Pedal cyclist", "No collision (e.g. fall)")), "of injured cyclists had no collision, such as a fall"],
          [pct(cp("Pedal cyclist", "Car, pick-up truck or van")), "collided with a car, pick-up truck or van"],
          [`+${pct(season("Pedal cyclist", 3) - 1)}`, "more cyclist admissions in March than in an average month"],
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
          [`${Math.round((ped.bed + cyc.bed) / 4018)}`, "hospital beds filled every day by injured pedestrians and cyclists"],
          [pct(cp("Pedal cyclist", "No collision (e.g. fall)")), "of cyclist injuries involve no other vehicle: a road-design issue"],
        ],
        actions: [
          ["System", "Follow the Safe System approach: design roads, speeds and vehicles so mistakes do not cause death or serious injury. National target: at least 30% fewer serious injuries by 2030.", "nrss"],
          ["System", "Set 30–40 km/h limits in areas with many pedestrians.", "hussain"],
          ["System", "Fund footpaths, cycling lanes and safe crossing points, and use rates per person (Chapter 4) to choose where first.", "who"],
        ],
      },
    };
    this.current = "driver";
  }

  render() {
    const btns = document.querySelector(this.buttonsSel);
    btns.innerHTML = Object.entries(this.roles).map(([k, r]) => `
      <button class="role${k === this.current ? " is-active" : ""}" data-role="${k}" aria-pressed="${k === this.current}">
        <span class="role-icon" aria-hidden="true">${r.icon}</span>
        <span class="role-name">${r.name}</span><br><span class="role-sub">${r.sub}</span>
      </button>`).join("");
    btns.querySelectorAll(".role").forEach((b) => b.addEventListener("click", () => {
      this.current = b.dataset.role; this.render();
      document.querySelector(this.panelSel).focus({ preventScroll: true });
    }));

    const r = this.roles[this.current];
    const panel = document.querySelector(this.panelSel);
    panel.innerHTML = `
      <h3>${r.title}</h3>
      <div class="role-stats">${r.stats.map(([v, l]) => `<div class="stat"><div class="value">${v}</div><div class="label">${l}</div></div>`).join("")}</div>
      <ul class="actions">${r.actions.map(([tag, a, ref]) => `<li><span class="tag">${tag}</span>${a} <span class="cite" data-ref="${ref}"></span></li>`).join("")}</ul>
      <p class="src">Figures: BITRE (2023), road-crash hospital admissions 2011–2021. Full references in <strong>Sources</strong> at the end.</p>`;
    renderCites(panel);
  }
}

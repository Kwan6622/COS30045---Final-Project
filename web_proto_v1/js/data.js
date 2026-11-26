/**
 * data.js — loads the CSVs produced by the pipeline and derives every number
 * used in the text, so prose and charts always come from the same data.
 *
 * GenAI acknowledgement: drafted with Claude (Anthropic), to be reviewed by the team.
 */
/* global d3 */
import { DATA, BASE_YEAR, END_YEAR, DAYS_2011_2021 } from "./constants.js";
import { fmt, fmt1, pct } from "./utils.js";

/** Load every CSV once. d3.autoType turns numeric strings into numbers. */
export async function loadData() {
  const entries = await Promise.all(
    Object.entries(DATA).map(async ([key, path]) => [key, await d3.csv(path, d3.autoType)]),
  );
  return Object.fromEntries(entries);
}

/** Hospital beds filled every day, per focus group (bed days ÷ 4,018 days). */
export function wardBeds(severity) {
  return ["Pedestrian", "Pedal cyclist"].map((group) => {
    const row = severity.find((d) => d.group === group);
    return { group, n: Math.round(row.bed / DAYS_2011_2021), bedDays: row.bed };
  });
}

/** Lookup helpers shared by facts and charts. */
export const sev = (data, g) => data.severity.find((d) => d.group === g);
export const cpShare = (data, g, c) => data.counterparty.find((d) => d.group === g && d.cp === c).share;
export const ageRow = (data, g, a) => data.age.find((d) => d.group === g && d.age === a);
export const seasonIndex = (data, g, m) => data.season.find((d) => d.group === g && d.month === m).index;
const hospIn = (data, g, y) => data.groupYear.find((d) => d.group === g && d.year === y).hosp;

/** Every formatted number that appears in the text, keyed by data-fact name. */
export function computeFacts(data) {
  const ped = sev(data, "Pedestrian"), car = sev(data, "Car occupant"), cyc = sev(data, "Pedal cyclist");
  const old = ageRow(data, "Pedestrian", "75+");
  const vru2021 = hospIn(data, "Pedestrian", 2021) + hospIn(data, "Pedal cyclist", 2021);
  const change = (g) => d3.format("+.0%")(hospIn(data, g, END_YEAR) / hospIn(data, g, BASE_YEAR) - 1);
  const other = data.severity.find((d) => d.group === "Other");

  return {
    beds: fmt(d3.sum(wardBeds(data.severity), (d) => d.n)),
    vru2021: fmt(vru2021),
    every: Math.round((365 * 24 * 60) / vru2021),
    pedChange: change("Pedestrian"),
    cycChange: change("Pedal cyclist"),
    pedLos: fmt1(ped.los), carLos: fmt1(car.los), cycLos: fmt1(cyc.los),
    pedDied: d3.format(".1%")(ped.died_rate), carDied: d3.format(".1%")(car.died_rate),
    pedCar: pct(cpShare(data, "Pedestrian", "Car, pick-up truck or van")),
    cycFall: pct(cpShare(data, "Pedal cyclist", "No collision (e.g. fall)")),
    oldLos: fmt1(old.los), oldDied: `1 in ${Math.round(1 / old.died_rate)}`,
    pedJune: d3.format("+.0%")(seasonIndex(data, "Pedestrian", 6) - 1),
    otherShare: pct(other ? other.share_hosp : 0),
  };
}

/**
 * sources.js — every source cited on the page, in APA 7 style.
 * Inline citations are written as <cite-ref data-ref="who">…</cite-ref> markers
 * in index.html; main.js turns them into "(WHO, 2026)" buttons with a tooltip,
 * and the References step lists everything below.
 *
 * Only sources that a team member has opened and checked belong here.
 * Checked on 24 Nov 2026 (quotes in Design Book notes).
 */
export const SOURCES = {
  // ---------- Data ----------
  bitre: {
    short: "BITRE, 2023", group: "Data",
    apa: "Bureau of Infrastructure and Transport Research Economics. (2023). <em>Hospitalised injury</em> [Data set]. Australian Government.",
    url: "https://www.bitre.gov.au/publications/ongoing/hospitalised-injury",
  },
  abs: {
    short: "ABS, 2026", group: "Data",
    apa: "Australian Bureau of Statistics. (2026). <em>Regional population by age and sex, 2025</em> [Data set]. ABS.",
    url: "https://www.abs.gov.au/",
  },
  // ---------- Evidence for actions ----------
  who: {
    short: "WHO, 2026", group: "Evidence for actions",
    apa: "World Health Organization. (2026, July 20). <em>Road traffic injuries</em> [Fact sheet].",
    url: "https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",
  },
  hussain: {
    short: "Hussain et al., 2019", group: "Evidence for actions",
    apa: "Hussain, Q., Feng, H., Grzebieta, R., Brijs, T., &amp; Olivier, J. (2019). The relationship between impact speed and the probability of pedestrian fatality during a vehicle-pedestrian crash: A systematic review and meta-analysis. <em>Accident Analysis &amp; Prevention, 129</em>, 241–249.",
    url: "https://doi.org/10.1016/j.aap.2019.05.033",
  },
  nrss: {
    short: "NRSS, 2021", group: "Evidence for actions",
    apa: "Australian Government. (2021). <em>National Road Safety Strategy 2021–30</em>. Infrastructure and Transport Ministers.",
    url: "https://www.roadsafety.gov.au/nrss",
  },
  nswPassing: {
    short: "NSW Government, n.d.-a", group: "Evidence for actions",
    apa: "NSW Government. (n.d.-a). <em>Sharing the road with bicycle riders</em>. Retrieved November 24, 2026.",
    url: "https://www.nsw.gov.au/driving-boating-and-transport/roads-safety-and-rules/sharing-road-overtaking-and-merging/sharing-roads-bicycles",
  },
  nswBike: {
    short: "NSW Government, n.d.-b", group: "Evidence for actions",
    apa: "NSW Government. (n.d.-b). <em>Special road rules for bicycle riders</em>. Retrieved November 24, 2026.",
    url: "https://www.nsw.gov.au/driving-boating-and-transport/roads-safety-and-rules/bicycle-safety-and-rules/road-rules-for-bicycle-riders/special-road-rules-for-bicycle-riders",
  },
  vic65: {
    short: "Transport Victoria, n.d.", group: "Evidence for actions",
    apa: "Transport Victoria. (n.d.). <em>Pedestrians over 65</em>. Victoria State Government. Retrieved November 24, 2026.",
    url: "https://transport.vic.gov.au/road-and-active-transport/active-transport/pedestrians-and-walking/pedestrians-over-65",
  },
};

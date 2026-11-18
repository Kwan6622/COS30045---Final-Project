/*
 * main.js — loads all data once, then initialises each chapter's chart(s).
 * GenAI: skeleton generated with Claude on 2026-11-18 (see GENAI_LOG.md).
 *
 * Convention: each chart lives in js/charts/<chapter>-<name>.js and exposes
 *   function drawXxx(selector, data) { ... }
 * Add the <script> tag in index.html, then call it from init() below.
 */

async function loadData() {
  const entries = Object.entries(CONFIG.data);
  const results = await Promise.allSettled(
    entries.map(([, path]) => d3.csv(path, d3.autoType))
  );

  const data = {};
  results.forEach((result, i) => {
    const [key, path] = entries[i];
    if (result.status === "fulfilled") {
      data[key] = result.value;
    } else {
      // Missing files are expected while chapters are being built.
      console.warn(`Could not load ${path}:`, result.reason);
      data[key] = [];
    }
  });
  return data;
}

function showChartMessage(selector, message) {
  d3.select(selector).append("p").attr("class", "chart-message").text(message);
}

async function init() {
  const data = await loadData();

  // Ch1 — Beyond the road toll
  if (typeof drawTrend === "function") drawTrend("#chart-ch1-trend", data.national);
  else showChartMessage("#chart-ch1-trend", "Chart coming soon.");

  // Ch2 — Not just young drivers
  // Ch3 — No one else involved
  // Ch4 — Pedestrians & cyclists
  // Ch5 — Where you live matters
  // TODO: call each chart's draw function here as it is built.
}

document.addEventListener("DOMContentLoaded", init);

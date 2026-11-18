/*
 * config.js — shared constants for every chart.
 * GenAI: skeleton generated with Claude on 2026-11-18 (see GENAI_LOG.md).
 * Colour values are placeholders: the team must choose and test a colour-blind-safe palette
 * and record the contrast checks in Design Book §3.2.
 */

const CONFIG = {
  // Paths to CSVs exported from KNIME (website/data/)
  data: {
    national: "data/national_by_year.csv",
    roadUser: "data/road_user_by_year.csv",
    counterparty: "data/counterparty_by_road_user.csv",
    ageGroup: "data/age_group_rates.csv",
    monthly: "data/monthly_by_road_user.csv",
    lengthOfStay: "data/avg_los_by_road_user.csv",
    states: "data/state_by_year.csv",
    firstNations: "data/first_nations_by_remoteness.csv"
  },

  // Chart layout defaults
  layout: {
    maxWidth: 960,
    aspect: 0.55,
    margin: { top: 24, right: 24, bottom: 40, left: 56 }
  },

  // Placeholder categorical colours (replace after accessibility testing)
  colours: {
    roadUser: {
      "Car driver": "#4e79a7",
      "Car passenger": "#a0cbe8",
      "Motorcyclist": "#f28e2b",
      "Pedal cyclist": "#59a14f",
      "Pedestrian": "#e15759",
      "Other": "#bab0ac"
    },
    highlight: "#e15759",
    muted: "#c7c7c7"
  },

  // Years flagged by BITRE as series breaks (data dictionary, Sep 2023)
  seriesBreaks: [
    { year: 2012, label: "Victoria: ED-only care excluded from 1 July 2012" },
    { year: 2017, label: "NSW: ED-only care excluded from June 2017" }
  ],

  transition: { duration: 600 }
};

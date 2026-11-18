# Hospitalised Road Crash Injuries in Australia — Who Is Really Being Hurt?

COS30045 Data Visualisation · Final Project (Swinburne Vietnam, 2026)

> **Overarching question:** *Who is really being injured on Australian roads, and is it who you think?*
>
> An interactive D3 data story for the Australian general public, built on BITRE hospitalised injury data (2011–2021).

|                               |                                                                       |
| ----------------------------- | --------------------------------------------------------------------- |
| **Team**                | `DataWerk`                                                          |
| **Members**             | Nguyễn Duy Quang (`Kwan6622`) · Hồ Cao Cường (`cuongidol26`) |
| **Live site (Mercury)** | `<add Mercury URL when deployed>`                                   |
| **Task board**          | Trello — COS30045 Final Design Project (team members only)           |

---

## Story structure

| Section | Chapter                                      | Key message                                                | Chart(s)                                                                      |
| ------- | -------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Hero    | —                                           | Hospitalisations, not only deaths                          | Stat tiles                                                                    |
| Ch1     | Beyond the road toll                         | Hospitalised injuries are large and rising                 | Line chart 2011–2021 (series breaks annotated)                               |
| Ch2     | Not just young drivers                       | Older road users growing fastest                           | Slope chart by age group, rate per 100,000                                    |
| Ch3     | No one else involved                         | ~40% involve no other vehicle                              | Stacked bar by counterparty, road-user filter                                 |
| Ch4     | Pedestrians & cyclists pay the highest price | Vulnerable road users: growth + severity + seasonality     | Indexed multi-line · Lollipop (avg. length of stay) · Month × year heatmap |
| Ch5     | Where you live matters                       | Per-capita differences by state, remoteness, First Nations | State tile map (count ↔ rate) · 100% stacked bar with population reference  |
| End     | Conclusion & data limitations                | —                                                         | —                                                                            |

> All figures above are **provisional** until verified in the KNIME workflow (see `docs/decision-log.md`).

---

## Repository structure

```
COS30045---Final-Project/
├── .github/
│   ├── pull_request_template.md   # PR checklist (auto-filled for every PR)
│   └── ISSUE_TEMPLATE/            # optional task / bug templates
├── data/
│   ├── README.md                  # data sources, versions, licences, governance notes
│   ├── raw/
│   │   ├── bitre/                 # 3 BITRE .xlsx files + data dictionary (unchanged originals)
│   │   └── abs/                   # ABS population tables (denominators)
│   └── processed/                 # CSV outputs exported from KNIME
├── knime/
│   ├── README.md                  # workflow naming, export rules, node plan
│   └── exports/                   # <TEAM_NAME>_COS30045_Workflow.knwf (WITH data)
├── website/                       # deployed to Mercury as-is
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── config.js              # shared constants: colours, sizes, chapter ids
│   │   ├── main.js                # data loading + chart initialisation
│   │   ├── charts/                # one file per chart (ch1-line.js, ch3-counterparty.js …)
│   │   └── utils/                 # tooltip, formatters, accessibility helpers
│   ├── data/                      # copies of processed CSVs used by the site
│   └── assets/img/
├── docs/
│   ├── design-book/               # PDF drafts submitted at each stand-up + final
│   ├── standups/week10|11|12/     # slide decks for each stand-up
│   ├── wireframes/  sketches/     # design evidence for Design Book §3
│   ├── usability/                 # test plan, tasks, consent, raw notes, results
│   ├── meeting-notes/             # dated notes (use TEMPLATE.md)
│   ├── decision-log.md            # key design/data decisions and why
│   └── references.md              # APA 7 reference list (verified sources only)
├── scripts/                       # helper scripts (reference only — KNIME is the official pipeline)
├── CONTRIBUTING.md                # branch / commit / PR rules
├── GENAI_LOG.md                   # record of all GenAI use (required by unit)
└── README.md
```

---

## Run locally

```bash
# from the repo root
python3 -m http.server 8000 --directory website
# open http://localhost:8000
```

D3 is loaded from a CDN with a pinned version (see `website/index.html`).

## Deploy to Mercury

Upload the **contents** of `website/` to your COS30045 Mercury web folder, keeping the folder structure. All paths in the site are relative, so no changes are needed.

---

## How we work

- Every piece of work starts as a **Trello card** and is delivered through a **pull request** — no direct pushes to `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).
- The other team member reviews and merges every PR.
- All GenAI use is logged in [GENAI_LOG.md](GENAI_LOG.md) and acknowledged in code comments.

## Data

Primary data: Bureau of Infrastructure and Transport Research Economics (BITRE) — *Hospitalised injury* (September 2023 release). Details, governance notes and supplementary datasets: [data/README.md](data/README.md).

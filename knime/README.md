# KNIME workflow

KNIME is the **official** data-processing pipeline for this project (the Python script in `scripts/` is reference only).

## Submission rules (from the assessment brief)

- File **and** workflow name must include the team name: `<TEAM_NAME>_COS30045_Workflow.knwf`
- The exported file must **contain all data** used in the visualisation, including exported CSVs.
- Annotate every node group (KNIME annotations) — required for top marks in Data Processing & Exploration.
- No ZIP files on Canvas.

## How to keep the data inside the workflow

1. In the KNIME workspace, copy the raw files into the workflow's own `data/` folder.
2. Point every reader/writer at a **workflow-relative path**, e.g. `knime://knime.workflow/data/hospitalisation_injury_publication_sep2023.xlsx`.
3. Export: right-click the workflow → *Export Workflow…* → tick **include data** → save to `knime/exports/`.

## Planned node groups

| # | Group | Main nodes | Output |
|---|---|---|---|
| 1 | Read raw data | Excel Reader ×3 (raw tabs) | 3 tables |
| 2 | Filter & clean | Row Filter (cause = Traffic), Missing Value ("n.p." → missing), String Manipulation, Column Rename | clean tables |
| 3 | Derive | Math Formula (`avg_los = bed_days / cases`), Rule Engine (age bands to match ABS) | derived columns |
| 4 | Aggregate | GroupBy (year; road user; counterparty; age × sex; month × year; state; remoteness × Indigenous status) | chart tables |
| 5 | Join supplementary | Excel/CSV Reader (ABS), Joiner, Math Formula (rate per 100,000) | rate tables |
| 6 | Explore (EDA) | Statistics, Data Explorer, Line Plot, Bar Chart, Box Plot | screenshots for Design Book §2.3 |
| 7 | Validate | Row Filter + GroupBy totals vs BITRE Table 1 | check table |
| 8 | Export | CSV Writer → `data/processed/` and `website/data/` | CSVs |

## Editing rule

Only one person edits the workflow at a time — announce it in chat and on the Trello card. Commit the new export via a PR.

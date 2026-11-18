# Data

## 1. Primary dataset — BITRE Hospitalised Injury (September 2023 release)

Source page: [https://www.bitre.gov.au/publications/ongoing/hospitalised-injury](https://www.bitre.gov.au/publications/ongoing/hospitalised-injury) (released 22 September 2023)

Original files, **unchanged**, in `raw/bitre/`:

| File                                                                 | Size    | Content                                     | Used in         |
| -------------------------------------------------------------------- | ------- | ------------------------------------------- | --------------- |
| `hospitalisation_injury_publication_sep2023.xlsx`                  | 5.5 MB  | National counts 2011–2021 + raw tab        | Ch1–Ch4        |
| `state-and-territory-hospitalisation-injury-publication-2023.xlsx` | 1.69 MB | State/territory counts + raw tab            | Ch5             |
| `First-Nations-hospitalised-injuries-2023.xlsx`                    | 238 KB  | First Nations counts + raw tab              | Ch5             |
| `hospitalised-injury-data-dictionary-september-2023.pdf`           | 389 KB  | Definitions, inclusion rules, series breaks | Design Book §2 |

Download date: `18/11/2026` · Downloaded by: `Quang`

Underlying source: AIHW National Hospital Morbidity Database (NHMD), processed by the BITRE Road Safety Data Hub.

## 2. Supplementary datasets (denominators / reference lines only)

Rule: **the main variable in every chart comes from BITRE.** Supplementary data is only used as a denominator, reference line or context annotation.

| Dataset                                                                                           | Purpose                | File in `raw/abs/` | Licence                           | Status |
| ------------------------------------------------------------------------------------------------- | ---------------------- | -------------------- | --------------------------------- | ------ |
| ABS — population by state/territory (2011–2021)                                                 | Per-100,000 rates, Ch5 | `<file>`           | verify (ABS is usually CC BY 4.0) | to do  |
| ABS — population by age group (2011–2021)                                                       | Rates by age, Ch2      | `<file>`           | verify                            | to do  |
| ABS Census 2021 — Aboriginal and Torres Strait Islander population share (national + remoteness) | Reference line, Ch5    | `<file>`           | verify                            | to do  |

## 3. Data dictionary notes that affect our story

Confirm wording against the PDF before quoting in the Design Book.

| Note                                                                                                                      | Impact                                            | Our handling                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Unit of count is a **separation** (an episode of admitted care), not a person                                       | Wording                                           | Say "hospitalisations / cases", never "people"                                      |
| Headline measure uses the **Traffic** cause category only; raw tab holds all six categories                         | Filtering                                         | KNIME Row Filter on cause = Traffic                                                 |
| **Series breaks:** Victoria excludes ED-only care from 1 July 2012; NSW from June 2017. BITRE shades 2011 and 2017+ | Trends, state comparisons                         | Annotate breaks on line charts; consider 2012 as the baseline; state the limitation |
| **Bed-day counting rules changed from 2015–16** (Z50 / ICD-10-AM 9th edition)                                      | Avg. length of stay "jump" in 2015 is an artefact | Annotate; do not present as a real trend                                            |
| No length-of-stay field                                                                                                   | —                                                | Derived variable: `avg_los = bed_days / cases`                                    |
| Remoteness = **usual residence**, not crash location                                                                | Ch5 wording                                       | "people who live in remote areas"                                                   |
| BITRE rates are crude, using a **single 30 June 2021 population**                                                   | Rates over time invalid                           | Use ABS population for each year when computing trends                              |
| Only the first recorded external cause is used                                                                            | Counterparty interpretation                       | Note as limitation                                                                  |
| "n.p." suppressed cells                                                                                                   | Missing values                                    | Treat as missing, never as 0; document                                              |

## 4. Governance checklist (Design Book §2.1)

- [ ] Collection process (NHMD → BITRE)
- [ ] Data quality: series breaks, coding changes, unknown categories, suppression
- [ ] Privacy: aggregated counts only, small-cell suppression
- [ ] Ethics: First Nations data — respectful framing, Indigenous data sovereignty (CARE principles), avoid deficit/blame narratives
- [ ] Licences for every dataset
- [ ] How each dataset answers the user questions in §1.2

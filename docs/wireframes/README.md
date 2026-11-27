# Wireframes — "Outside the Car"

Every wireframe of the project, in one place (design evidence for Design Book §3).

| Folder | What it is | Open |
|---|---|---|
| `web_proto_v2/` | **Current.** 14 pages: story page desktop + phone, every chart (Chapter 4 = pages 09 + 09b), the accessibility layer, and the separate **References page** (page 13). | `index.html` (gallery: filter, download SVG / PNG 2×, copy SVG), `wireframes.drawio` (editable), `svg/*.svg` |
| `web_proto_v1/` | Archive of the first prototype's 11 wireframes (before the review feedback). | `wireframes.drawio`, `svg/*.svg` |
| `antigravity/` | The team's interaction wireframe made in Antigravity (documents v1; its colours are not palette v2). | `wireframes.html` |

## Rebuild

From the repository root:

```bash
python docs/wireframes/web_proto_v2/build_wireframes.py
python docs/wireframes/web_proto_v1/build_wireframes.py
```

Each script reads its prototype's CSVs (`web_proto_vN/data/`), so the numbers in the sketches match the site.

## What changed in v2 (page by page)

- **01 / 02 Overview:** Sources is no longer a chapter. The header has a **References** link, the story ends with "References and data notes →", and every page ends with the **project footer** (team DataWerk, both members with GitHub, COS30045, 2026, Swinburne (Vietnam), repository and data links).
- **06 Chapter 2 collision bars:** "Heavy vehicle or bus" + "Motorcycle" merged into "Other vehicle"; every segment ≥ 5% labelled; the 1.0% segment has a callout above the bar and a dashed 24 px hover target; tooltip mock with the breakdown; table preview with "↳ of which" rows; a before/after strip showing why (0.8% and 0.2% slivers).
- **09 Chapter 4 map view:** real state outlines drawn from the site's own `states.geojson` with the same equal-area projection; 5 shading classes; ACT inset box + leader line; label rules (Tas beside the island, Vic on one line); Map | Ranking chips; linked trend; focus ring example.
- **09b Chapter 4 ranking + morph (new):** 3-frame storyboard (click WA → shapes fade while state boxes travel to their bar slots → ranking), the full ranking view (Back button, zero baseline, Australia line, selected + focused bar) and the trend that follows the selected bar; notes give the state patches (`mapState`, `mapView`).
- **11 Summary:** closing message, then the link to the References page and "Back to the start".
- **13 References page (new):** `references.html`: same header, theme and footer as the story; APA list, the 7 data limitations, how the figures were made, links back.
- **03–10, 12:** shapes and patterns as a second encoding, keyboard stops, data tables, take-away lines, teaser prompts, "Redraws on" state keys (see `web_proto_v2/README.md`).

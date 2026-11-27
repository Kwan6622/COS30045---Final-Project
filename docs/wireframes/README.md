# Wireframes — "Outside the Car"

Every wireframe of the project, in one place (design evidence for Design Book §3).

| Folder | What it is | Open |
|---|---|---|
| `web_proto_v2/` | **Current.** 13 pages: story page desktop + phone, every chart, the accessibility layer, and the separate **References page** (page 13). | `index.html` (gallery: filter, download SVG / PNG 2×, copy SVG), `wireframes.drawio` (editable), `svg/*.svg` |
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
- **11 Summary:** closing message, then the link to the References page and "Back to the start".
- **13 References page (new):** `references.html`: same header, theme and footer as the story; APA list, the 7 data limitations, how the figures were made, links back.
- **03–10, 12:** shapes and patterns as a second encoding, keyboard stops, data tables, take-away lines, teaser prompts, "Redraws on" state keys (see `web_proto_v2/README.md`).

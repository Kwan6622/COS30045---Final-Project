# web_proto_v1 — "Outside the Car" (VRU story prototype)

Scrollytelling website (D3 v7 + Scrollama 3.2) for the narrowed scope (pedestrians and cyclists, 2011–2021), plus the draft of Design Book §3.

## Structure

| Path | What it is |
|---|---|
| `index.html`, `css/style.css` | One scrolling page: opening, 5 chapters, Summary, Sources. Colours = palette v2 (`docs/sketches/datawerk_palette_v2.png`) |
| `js/constants.js` | Shared constants: palette colours, road-user groups (lightness-ladder order), ramps, layout, data paths, `INITIAL_STATE` |
| `js/data.js` | `loadData()`, `computeFacts()` (every number in the text) and lookup helpers |
| `js/main.js` | Owns the one app `state` + `setState()`, Scrollama setup, keyboard, stepper |
| `js/charts/*.js` | One module per chart, all with the same interface (below) |
| `js/utils.js`, `js/cite.js`, `js/sources.js` | Tooltip/SVG helpers, `emit()`, citations and the APA reference list |
| `data/*.csv` | Six small CSVs produced by `scripts/build_data.py` |
| `scripts/build_data.py` | Prototype data pipeline (reads `data/raw/bitre` and `data/raw/abs`). Final figures must come from the KNIME workflow. |
| `design/design_book_s3.html`, `design/img/` | Draft of Design Book §3.1–3.3 with screenshots |

## Chart interface (everyone codes charts this way)

```js
// js/charts/myChart.js
export function init(el, data) { /* build once: el = the element with data-viz="myChart" */ }
export function update(state) { /* redraw from state; return early if nothing you use changed */ }
```

- `main.js` calls `init` once and `update(state)` after every state change (charts skip redraws by comparing the state keys they use).
- Charts never change state themselves: they call `emit(el, { key: value })` (from `utils.js`), which `main.js` merges into the state.
- Toggle buttons need no JS: `<div data-state-key="sevMeasure"><button data-value="los">…</button></div>`.
- Register a new chart in the `CHARTS` list in `main.js` and add `data-viz="name"` in `index.html`.

## Navigation

- Scroll as usual (wheel, trackpad, ↓/↑, Space). Scrollama sets `state.chapter` (stepper, progress bar, opening animation).
- Chapter 1 is scrollytelling: the chart is sticky and each `.scrolly-step` has `data-state='{"trendMode":"index","trendFocus":"Pedal cyclist"}'`, applied when the step enters.
- The ↑ / ↓ buttons on the right and the → / ← keys move to the next / previous **stop**: every chapter, plus every Chapter 1 message (so in Chapter 1 they go message by message). A chapter with `.scrolly-step`s gets its messages as stops automatically.
- The stepper and the Summary's Revisit buttons jump to any chapter.

## Colours, theme and colour-vision view

- Never hard-code a colour in a chart: use `const P = palette(state.theme, state.cvd)` and `P.group["Pedestrian"]`, `P.ramp[...]`, `P.cat[...]`, `P.accent`, `P.muted`, `P.band`, `P.ink`, `P.bg`. Include `state.theme` and `state.cvd` in your chart's redraw check.
- `THEMES.light` = palette v2 exactly. `THEMES.dark` = lighter steps of the same hues on ink `#1F2328` (not in the palette image yet — team to approve).
- `state.cvd` = `normal | deuteranopia | protanopia | tritanopia | achromatopsia`. `simulate()` (Machado et al., 2009) reproduces the palette image's colour-blind swatches exactly; it is a preview, not a different palette.
- The header has the light/dark switch and the colour-vision select; both are remembered. `?theme=dark` / `?cvd=tritanopia` in the URL override them (for screenshots).

## Run

From the repo root:

```bash
python -m http.server 8001 --directory web_proto_v1
```

Then open http://localhost:8001 (website) and http://localhost:8001/design/design_book_s3.html (Design Book draft).

Rebuild the data:

```bash
python web_proto_v1/scripts/build_data.py
```

## Open issues

- Length of stay: this prototype subtracts died-in-hospital bed days (9.1 days for pedestrians, as in Design Book §1 v2); the KNIME workflow does not (9.2). Agree on one definition.
- References in the §3 draft still need checking; the 6 action sources on the site were checked on 24 Nov 2026.

GenAI: drafted with Claude (Anthropic); record in `GENAI_LOG.md` and review before use.

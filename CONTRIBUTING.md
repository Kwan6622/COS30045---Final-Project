# Contributing — team workflow

Our tutor assesses individual contribution from GitHub history. **Every change goes through a pull request (PR)** so there is a clear record of who did what.

## 1. The loop: Trello card → branch → PR → review → merge

1. Pick (or create) a card on Trello and move it to **Đang làm / In progress**. Assign yourself.
2. Update `main` and create a branch:
   ```bash
   git checkout main
   git pull
   git checkout -b data/knime-national-workflow
   ```
3. Commit small and often (see §3). Push the branch:
   ```bash
   git push -u origin data/knime-national-workflow
   ```
4. Open a PR into `main`. The PR template loads automatically — fill it in and **paste the Trello card link**.
5. Move the Trello card to **Review (PR mở)** and request a review from your teammate.
6. The reviewer reads the change, leaves at least one meaningful comment or approval, then merges with **"Create a merge commit"** (not squash — keeps each commit and its author visible).
7. Move the Trello card to **Xong / Done**. Delete the branch.

**Never push directly to `main`.** The only exception was the initial repository scaffold.

## 2. Branch names

`<type>/<short-description>` — lowercase, hyphens.

| Type | Use for | Example |
|---|---|---|
| `data/` | KNIME, data cleaning, ABS joins | `data/abs-population-join` |
| `feat/` | Website features, charts, interactions | `feat/ch3-counterparty-chart` |
| `docs/` | Design Book drafts, references, notes, slides | `docs/design-book-intro` |
| `fix/` | Bug fixes | `fix/tooltip-mobile-overflow` |
| `test/` | Usability testing materials and results | `test/usability-round-1` |
| `chore/` | Repo setup, config, tidy-ups | `chore/update-gitignore` |
| `prototype/` | Throwaway experiments (never merged as-is) | `prototype/ai-spike` |

## 3. Commit messages

Format: `<type>: <what changed>` in the imperative mood.

```
data: filter raw BITRE table to Traffic cases only
feat: add count/rate toggle to state tile map
docs: draft Design Book section 2.1 data governance
fix: correct average length of stay calculation
```

One logical change per commit. If you used GenAI for the change, add a line to the commit body: `GenAI: <tool> — <what for>` and log it in `GENAI_LOG.md`.

## 4. Review checklist (for the reviewer)

- [ ] I understand what this change does and could explain it at a stand-up.
- [ ] It matches the Trello card and the agreed story/design.
- [ ] Code is commented; GenAI use is acknowledged in comments **and** in `GENAI_LOG.md`.
- [ ] Numbers shown on the site match the KNIME output.
- [ ] No large/temporary files committed by mistake.
- [ ] The site still runs locally without console errors.

## 5. File-specific rules

**KNIME (`knime/exports/*.knwf`)** — binary, cannot be merged.
- Only **one person edits the workflow at a time**. Say so in the team chat and on the Trello card before you start.
- Always export **with data included** and keep the team name in both the file name and the workflow name.
- Overwrite the same file name; Git keeps the history.

**Design Book** — drafted in a shared document (Google Docs / Word online).
- At each stand-up, export a PDF to `docs/design-book/` via a PR: `DesignBook_<TEAM_NAME>_wk10.pdf`, `..._wk11.pdf`, …

**Slides** — save to `docs/standups/weekNN/` via a PR.

**Raw data** — files in `data/raw/` are originals. Never edit them; all transformations happen in KNIME.

## 6. Who owns what (default)

| Area | Lead | Must also understand |
|---|---|---|
| KNIME workflow, EDA, Design Book §2.2–2.3 | Cường | Quang |
| Intro, data governance, references, Design Book §1, §2.1 | Quang | Cường |
| Website/visualisation/interaction design (§3) — Stand-up 2 (wk 11) | Quang | Cường |
| Iteration, usability testing (§4), code review — Stand-up 3 (wk 12) | Cường | Quang |
| D3 code Ch1–Ch2 | Quang | Cường |
| D3 code Ch3–Ch5 | Cường | Quang |

Both members must contribute to **both** design and programming (unit requirement).

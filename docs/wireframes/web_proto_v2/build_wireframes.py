"""
build_wireframes.py — writes the "Outside the Car" v2 wireframes in three
formats from one description, so they always match:

  wireframes.drawio   one page per wireframe; open in diagrams.net (draw.io)
                      and edit every box, line and label
  svg/NN-name.svg     one SVG per wireframe (Design Book, Canva, Figma, PowerPoint)
  index.html          gallery of all SVGs, for a quick look in the browser

Run:  python docs/wireframes/web_proto_v2/build_wireframes.py   (from the repo root)

v2 = v1 wireframes + the review feedback (see README "What changed from v1"):
shapes/patterns as a second encoding, dark-edged yellow, keyboard stops,
data-table toggles, take-away lines, teaser prompts, and a new page (12) for
the accessibility layer of one chart card. Every v2 change on a page is
marked with a "v2" tag in its note. Greyscale on purpose; yellow = the
highlight/annotation colour of palette v2. Numbers are the prototype's, rounded.

GenAI acknowledgement: drafted with Claude (Anthropic), reviewed by the team.
"""
import csv
import os
from xml.sax.saxutils import escape, quoteattr

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "web_proto_v2", "data")   # the prototype's CSVs

INK, G1, G2, G3, G4, G5, PAPER = "#1F2328", "#4A4A4A", "#7A7A7A", "#A8A8A8", "#D4D4D4", "#EFEFEF", "#FFFFFF"
YEL = "#F2B705"
FONT = "Helvetica"
W, H = 1040, 680


class Page:
    def __init__(self, name, title, subtitle=""):
        self.name, self.items = name, []
        self.title, self.subtitle, self.note_items, self.watch = title, subtitle, [], None
        self.text(20, 14, 900, 26, title, fs=20, bold=True, align="left")
        if subtitle:
            self.text(20, 40, 1000, 18, subtitle, fs=12, color=G2, align="left")

    # primitives ---------------------------------------------------------
    def rect(self, x, y, w, h, fill=PAPER, stroke=G3, sw=1, dash=False, r=6, text="", fs=12,
             bold=False, color=INK, align="center", valign="middle", italic=False):
        self.items.append(dict(k="rect", x=x, y=y, w=w, h=h, fill=fill, stroke=stroke, sw=sw, dash=dash,
                               r=r, text=text, fs=fs, bold=bold, color=color, align=align, valign=valign,
                               italic=italic))

    def text(self, x, y, w, h, text, fs=12, bold=False, color=INK, align="center", valign="middle", italic=False):
        self.rect(x, y, w, h, fill="none", stroke="none", text=text, fs=fs, bold=bold, color=color,
                  align=align, valign=valign, italic=italic)

    def line(self, pts, stroke=G2, sw=1.5, dash=None, arrow=False):
        self.items.append(dict(k="line", pts=pts, stroke=stroke, sw=sw, dash=dash, arrow=arrow))

    def circle(self, cx, cy, r, fill=PAPER, stroke=G2, sw=1.5):
        self.items.append(dict(k="circle", cx=cx, cy=cy, r=r, fill=fill, stroke=stroke, sw=sw))

    def poly(self, kind, cx, cy, r, fill):
        """kind = tri | dia (filled triangle / diamond centred on cx, cy)."""
        self.items.append(dict(k=kind, cx=cx, cy=cy, r=r, fill=fill))

    # v2 widgets ---------------------------------------------------------
    def shape(self, kind, cx, cy, r, fill):
        """Road-user marker: circle (ped), square (cyc), tri (moto), dia (car)."""
        if kind == "circle":
            self.circle(cx, cy, r, fill=fill, stroke=fill, sw=1)
        elif kind == "square":
            self.rect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, fill=fill, stroke="none", r=0)
        else:
            self.poly(kind, cx, cy, r * 1.15, fill)

    def ring(self, cx, cy, r):
        """Yellow annotation ring with the v2 dark edge."""
        self.circle(cx, cy, r, fill="none", stroke=INK, sw=5)
        self.circle(cx, cy, r, fill="none", stroke=YEL, sw=3)

    def hatch(self, x, y, w, h, color=INK, step=5):
        """Diagonal stripes inside a box (pattern encoding)."""
        i = 0
        while i < w + h:
            x0, y0 = x + max(0, i - h), y + min(h, i)
            x1, y1 = x + min(w, i), y + max(0, i - w)
            self.line([(x0, y0), (x1, y1)], stroke=color, sw=1.4)
            i += step

    def focus(self, x, y, w, h):
        """Keyboard focus ring (ink outline + yellow halo) on a mark."""
        self.rect(x - 4, y - 4, w + 8, h + 8, fill="none", stroke=YEL, sw=4, r=6)
        self.rect(x - 2, y - 2, w + 4, h + 4, fill="none", stroke=INK, sw=2, r=5)

    def table_toggle(self, x, y, w, label="Show the data as a table"):
        """<details> "Show the data as a table" row under a chart."""
        self.line([(x, y), (x + w, y)], stroke=G4, sw=1)
        self.text(x + 4, y + 4, 300, 20, f"▸ {label}", fs=11, bold=True, align="left")

    def takeaway(self, x, y, w, text):
        self.text(x, y, w, 16, text, fs=11, align="left", color=INK)

    def question(self, x, y, w, text, h=40):
        self.rect(x, y, w, h, fill=G5, stroke="none", r=6, text=f"Try this: {text}", fs=11, align="left")
        self.line([(x + 1, y + 2), (x + 1, y + h - 2)], stroke=YEL, sw=4)

    def badge(self, x, y, n):
        self.circle(x, y, 10, fill=YEL, stroke=INK, sw=1)
        self.text(x - 10, y - 10, 20, 20, str(n), fs=11, bold=True)

    def chip(self, x, y, label, active=False, w=None):
        w = w or 16 + len(label) * 6.6
        self.rect(x, y, w, 26, fill=INK if active else PAPER, stroke=INK if active else G3, r=13,
                  text=label, fs=11, color=PAPER if active else G1)
        return x + w + 8

    def card(self, x, y, w, h, title):
        self.rect(x, y, w, h, stroke=G3, r=10)
        self.text(x + 14, y + 8, w - 28, 22, title, fs=13, bold=True, align="left")

    def notes(self, items, x=730, y=70, w=290, watch=None):
        """Right-hand panel: numbered notes; a note starting 'v2' is new in v2.
        watch = the app-state keys the chart redraws on (shown as a code line)."""
        self.note_items, self.watch = items, watch
        h = 34 + (20 if watch else 0) + sum(16 * (1 + t.count("\n")) + 10 for _, t in items)
        self.rect(x, y, w, h, fill=G5, stroke=G4, r=8)
        self.text(x + 12, y + 8, w - 24, 20, "Notes  (v2 = new in this version)", fs=12, bold=True, align="left")
        cy = y + 38
        if watch:
            self.text(x + 12, cy - 6, w - 24, 16, f"Redraws on: {watch}", fs=9.5, color=G1, align="left", italic=True)
            cy += 20
        for n, t in items:
            lines = 1 + t.count("\n")
            self.badge(x + 22, cy + 8, n)
            self.text(x + 40, cy - 1, w - 50, 16 * lines, t, fs=10.5, align="left", valign="top",
                      color=INK if t.startswith("v2") else G1, bold=False)
            cy += 16 * lines + 10

    def footer(self, x, y, w, h=88, compact=False):
        """Project footer (same on every page): about, team + members, project, links."""
        self.rect(x, y, w, h, fill=G5, stroke=G3, r=6)
        if compact:   # phone: one column of short lines
            lines = ["Outside the Car", "Team DataWerk: Nguyễn Duy Quang (@Kwan6622)", "Hồ Cao Cường (@cuongidol26)",
                     "COS30045 Data Visualisation · 2026 · Swinburne (Vietnam)", "GitHub repository · References · Data: BITRE, ABS"]
            for i, t in enumerate(lines):
                self.text(x + 10, y + 6 + i * 15, w - 20, 14, t, fs=9 if i else 10.5, bold=i == 0, color=INK if i == 0 else G1, align="left")
            return
        cols = [("Outside the Car", ["Interactive data story:", "pedestrians and cyclists", "hospitalised, 2011-2021"]),
                ("TEAM DATAWERK", ["Nguyễn Duy Quang · @Kwan6622", "Hồ Cao Cường · @cuongidol26"]),
                ("PROJECT", ["COS30045 Data Visualisation", "Final design project, 2026", "Swinburne Univ. of Tech. (Vietnam)"]),
                ("LINKS", ["GitHub repository ↗", "References and data notes", "Data: BITRE, ABS"])]
        cw = (w - 20) / 4
        for i, (head, rows) in enumerate(cols):
            cx = x + 10 + i * cw
            self.text(cx, y + 6, cw - 6, 16, head, fs=10 if i == 0 else 9, bold=True, align="left")
            if i == 0:
                self.line([(cx + 72, y + 21), (cx + 98, y + 21)], stroke=YEL, sw=3)
            for k, t in enumerate(rows):
                self.text(cx, y + 24 + k * 14, cw - 6, 14, t, fs=8.5, color=G1, align="left")
        self.line([(x + 10, y + h - 18), (x + w - 10, y + h - 18)], stroke=G4, sw=1)
        self.text(x + 10, y + h - 17, w - 20, 14, "web_proto_v2 (prototype) · D3.js v7 + Scrollama · GenAI use in GENAI_LOG.md",
                  fs=8.5, color=G2, align="left")

    def legend(self, x, y, entries):
        """entries: (label, fill, kind) with kind = None (swatch), 'hatch', or a shape name."""
        for label, fill, kind in entries:
            if kind in ("circle", "square", "tri", "dia"):
                self.shape(kind, x + 6, y + 9, 5, fill)
            else:
                self.rect(x, y + 3, 12, 12, fill=G5 if kind == "hatch" else fill, stroke=fill, r=2)
                if kind == "hatch":
                    self.hatch(x, y + 3, 12, 12, color=fill, step=4)
            self.text(x + 18, y, 8 * len(label), 18, label, fs=11, color=G1, align="left")
            x += 30 + 6.4 * len(label)

    def axes(self, x0, y0, x1, y1, xticks, yticks, ylabel=""):
        for py, lab in yticks:
            self.line([(x0, py), (x1, py)], stroke=G5, sw=1)
            self.text(x0 - 46, py - 9, 40, 18, lab, fs=10, color=G2, align="right")
        self.line([(x0, y1), (x1, y1)], stroke=G3, sw=1)
        for px, lab in xticks:
            self.text(px - 24, y1 + 4, 48, 16, lab, fs=10, color=G2)
        if ylabel:
            self.text(x0 - 46, y0 - 22, 200, 16, ylabel, fs=10, color=G2, align="left")


# ---------------------------------------------------------------------------
# Writers
# ---------------------------------------------------------------------------
def _lines(t):
    return t.split("\n") if t else []


def _poly_pts(it):
    cx, cy, r = it["cx"], it["cy"], it["r"]
    if it["k"] == "tri":
        return [(cx, cy - r), (cx + r * 0.95, cy + r * 0.7), (cx - r * 0.95, cy + r * 0.7)]
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]


def to_svg(p):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
           f'font-family="{FONT}, Arial, sans-serif">',
           f'<title>{escape(p.name)}</title>',
           '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" '
           'orient="auto"><path d="M1 1L9 5L1 9z" fill="#4A4A4A"/></marker></defs>',
           f'<rect width="{W}" height="{H}" fill="{PAPER}"/>']
    for it in p.items:
        if it["k"] == "rect":
            if it["fill"] != "none" or it["stroke"] != "none":
                d = ' stroke-dasharray="5 4"' if it["dash"] else ""
                out.append(f'<rect x="{it["x"]:.1f}" y="{it["y"]:.1f}" width="{it["w"]:.1f}" height="{it["h"]:.1f}" '
                           f'rx="{it["r"]}" fill="{it["fill"]}" stroke="{it["stroke"]}" stroke-width="{it["sw"]}"{d}/>')
            ls = _lines(it["text"])
            if ls:
                fs, lh = it["fs"], it["fs"] * 1.35
                if it["valign"] == "top":
                    by = it["y"] + (6 if it["stroke"] != "none" else 2) + fs
                else:
                    by = it["y"] + (it["h"] - len(ls) * lh) / 2 + fs * 0.98
                anchor = {"left": "start", "center": "middle", "right": "end"}[it["align"]]
                pad = 8 if it["stroke"] != "none" else 2
                tx = {"left": it["x"] + pad, "center": it["x"] + it["w"] / 2, "right": it["x"] + it["w"] - 2}[it["align"]]
                wt = ' font-weight="bold"' if it["bold"] else ""
                st = ' font-style="italic"' if it["italic"] else ""
                spans = "".join(f'<tspan x="{tx:.1f}" y="{by + i * lh:.1f}">{escape(l)}</tspan>' for i, l in enumerate(ls))
                out.append(f'<text font-size="{fs}" fill="{it["color"]}" text-anchor="{anchor}"{wt}{st}>{spans}</text>')
        elif it["k"] == "line":
            pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in it["pts"])
            d = f' stroke-dasharray="{it["dash"]}"' if it["dash"] else ""
            m = ' marker-end="url(#ah)"' if it["arrow"] else ""
            out.append(f'<polyline points="{pts}" fill="none" stroke="{it["stroke"]}" stroke-width="{it["sw"]}" '
                       f'stroke-linejoin="round" stroke-linecap="round"{d}{m}/>')
        elif it["k"] in ("tri", "dia"):
            pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in _poly_pts(it))
            out.append(f'<polygon points="{pts}" fill="{it["fill"]}"/>')
        else:
            out.append(f'<circle cx="{it["cx"]:.1f}" cy="{it["cy"]:.1f}" r="{it["r"]}" fill="{it["fill"]}" '
                       f'stroke="{it["stroke"]}" stroke-width="{it["sw"]}"/>')
    out.append("</svg>")
    return "\n".join(out)


def to_drawio_page(p, idx):
    cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    for i, it in enumerate(p.items):
        cid = f"p{idx}c{i}"
        if it["k"] == "rect":
            html = "<br>".join(escape(l) for l in _lines(it["text"]))
            fstyle = (1 if it["bold"] else 0) + (2 if it["italic"] else 0)
            style = (f"rounded={1 if it['r'] else 0};arcSize={min(50, it['r'] * 100 / max(1, min(it['w'], it['h']))):.0f};"
                     f"absoluteArcSize=0;whiteSpace=wrap;html=1;fillColor={it['fill']};strokeColor={it['stroke']};"
                     f"strokeWidth={it['sw']};dashed={1 if it['dash'] else 0};fontFamily={FONT};fontSize={it['fs']};"
                     f"fontColor={it['color']};fontStyle={fstyle};align={it['align']};verticalAlign={it['valign']};"
                     f"spacing={2 if it['stroke'] == 'none' else 6};")
            if it["fill"] == "none" and it["stroke"] == "none":
                style = "text;" + style
            cells.append(f'<mxCell id="{cid}" value={quoteattr(html)} style="{style}" vertex="1" parent="1">'
                         f'<mxGeometry x="{it["x"]:.1f}" y="{it["y"]:.1f}" width="{it["w"]:.1f}" height="{it["h"]:.1f}" as="geometry"/></mxCell>')
        elif it["k"] == "line":
            pts = it["pts"]
            dash = f"dashed=1;dashPattern={it['dash']};" if it["dash"] else "dashed=0;"
            style = (f"endArrow={'block' if it['arrow'] else 'none'};endFill=1;html=1;rounded=0;"
                     f"strokeColor={it['stroke']};strokeWidth={it['sw']};{dash}")
            mids = "".join(f'<mxPoint x="{x:.1f}" y="{y:.1f}"/>' for x, y in pts[1:-1])
            arr = f'<Array as="points">{mids}</Array>' if mids else ""
            cells.append(f'<mxCell id="{cid}" value="" style="{style}" edge="1" parent="1">'
                         f'<mxGeometry relative="1" as="geometry">'
                         f'<mxPoint x="{pts[0][0]:.1f}" y="{pts[0][1]:.1f}" as="sourcePoint"/>'
                         f'<mxPoint x="{pts[-1][0]:.1f}" y="{pts[-1][1]:.1f}" as="targetPoint"/>{arr}'
                         f'</mxGeometry></mxCell>')
        elif it["k"] in ("tri", "dia"):
            r = it["r"]
            shape = "triangle;direction=north;" if it["k"] == "tri" else "rhombus;"
            cells.append(f'<mxCell id="{cid}" value="" style="{shape}whiteSpace=wrap;html=1;fillColor={it["fill"]};strokeColor=none;" vertex="1" parent="1">'
                         f'<mxGeometry x="{it["cx"] - r:.1f}" y="{it["cy"] - r:.1f}" width="{2 * r:.1f}" height="{2 * r:.1f}" as="geometry"/></mxCell>')
        else:
            r = it["r"]
            style = (f"ellipse;whiteSpace=wrap;html=1;fillColor={it['fill']};strokeColor={it['stroke']};"
                     f"strokeWidth={it['sw']};")
            cells.append(f'<mxCell id="{cid}" value="" style="{style}" vertex="1" parent="1">'
                         f'<mxGeometry x="{it["cx"] - r:.1f}" y="{it["cy"] - r:.1f}" width="{2 * r}" height="{2 * r}" as="geometry"/></mxCell>')
    return (f'<diagram name={quoteattr(p.name)} id="wf{idx}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" '
            f'guides="1" tooltips="1" connect="0" arrows="0" fold="1" page="1" pageScale="1" pageWidth="{W}" '
            f'pageHeight="{H}" math="0" shadow="0"><root>{"".join(cells)}</root></mxGraphModel></diagram>')


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
def scale(v, d0, d1, r0, r1):
    return r0 + (v - d0) / (d1 - d0) * (r1 - r0)


NAMES = {"Pedal cyclist": "Cyclists", "Pedestrian": "Pedestrians", "Motorcyclist": "Motorcyclists", "Car occupant": "Car occupants"}
SHAPE = {"Pedestrian": "circle", "Pedal cyclist": "square", "Motorcyclist": "tri", "Car occupant": "dia"}
# greyscale stand-ins: dark = pedestrians, mid = cyclists, light = context
TONE = {"Pedestrian": INK, "Pedal cyclist": G2, "Motorcyclist": G3, "Car occupant": G3}


def overview_desktop():
    p = Page("01 Overview - desktop", "Overview: the story page (desktop, 900 px and wider) + link to the References page",
             "Header on top, side arrows on the right; every chapter = message + chart (+ data table) + insight/action; project footer at the end.")
    x, w = 20, 680
    # header: brand | stepper (Start + 6 chapters) | References link | theme | colour vision
    p.rect(x, 70, w, 44, fill=G5, stroke=G3, r=6)
    p.text(x + 10, 76, 150, 32, "Outside the Car", fs=16, bold=True, align="left")
    p.line([(x + 98, 103), (x + 132, 103)], stroke=YEL, sw=4)
    p.rect(x + 165, 78, 280, 28, stroke=G3, r=14, text="★  1 Who  2 How badly  3 Age  4  5  6 Summary", fs=10.5, color=G1)
    p.rect(x + 452, 80, 84, 24, fill=PAPER, stroke=INK, sw=1.5, r=12, text="References ↗", fs=10.5, bold=True)
    p.rect(x + 542, 80, 50, 24, r=12, text="Dark", fs=10.5)
    p.rect(x + 598, 80, 76, 24, r=12, text="Vision ▾", fs=10.5)
    p.line([(x, 118), (x + 260, 118)], stroke=YEL, sw=3)
    p.badge(x + 160, 74, 1); p.badge(x + 494, 74, 8); p.badge(x + 596, 74, 2)
    secs = [("Start - title, lede, WHO IT IS FOR, bed pictogram + table, insight + action", 62),
            ("Ch1 Who - sticky line chart | 5 message cards; table under the scrolly", 78),
            ("Ch2 How badly - teaser prompt, chips, dot plot + table, stacked bars + table", 48),
            ("Ch3 Age - teaser prompt, chips, take-away line, bar chart + table", 40),
            ("Ch4 When & where - month chart + table; tile map | detail, take-away, table", 48),
            ("Ch5 What you can do - role buttons -> action panel", 34),
            ("Summary - 5 cards + Revisit; closing message", 48)]
    ys, y = [], 126
    for lab, h in secs:
        p.rect(x + 10, y, w - 70, h, stroke=G3, dash=True, r=6, text=lab, fs=10.5, color=G1, align="left", valign="top")
        ys.append(y)
        y += h + 6
    p.text(x + 20, ys[0] + 24, 400, 14, "It is for everyone who uses Australian roads …", fs=10, italic=True, color=INK, align="left")
    p.badge(x + 430, ys[0] + 31, 4)
    p.rect(x + 20, ys[1] + 22, 360, 48, fill=G5, stroke=G3, r=4, text="chart stays pinned", fs=10, color=G2)
    p.rect(x + 390, ys[1] + 22, 220, 21, stroke=YEL, sw=2, r=4, text="active message", fs=10)
    p.rect(x + 390, ys[1] + 49, 220, 21, stroke=G4, r=4, text="next message", fs=10, color=G2)
    p.badge(x + 620, ys[1] + 28, 3)
    for k in (0, 2, 3, 4):
        p.text(x + 400, ys[k] + (40 if k == 0 else 22), 200, 14, "▸ Show the data as a table", fs=9.5, bold=True, align="left")
    p.badge(x + 600, ys[2] + 29, 5)
    # end of the story: the link to the separate References page
    sy = ys[6]
    p.rect(x + 20, sy + 22, 178, 20, fill=PAPER, stroke=INK, sw=1.5, r=10, text="References and data notes →", fs=9.5, bold=True)
    p.rect(x + 206, sy + 22, 120, 20, stroke=G3, r=10, text="Back to the start ↑", fs=9.5)
    p.line([(x + 109, sy + 44), (x + 109, sy + 52)], stroke=INK, sw=1.5)
    p.badge(x + 338, sy + 32, 8)
    # side arrows
    p.rect(x + w - 46, 300, 38, 80, r=19, stroke=G3)
    p.circle(x + w - 27, 322, 13, stroke=G3); p.text(x + w - 40, 312, 26, 20, "↑", fs=13)
    p.circle(x + w - 27, 358, 13, stroke=INK); p.text(x + w - 40, 348, 26, 20, "↓", fs=13)
    p.badge(x + w - 50, 390, 6)
    # footer
    p.footer(x, 546, w, h=88)
    p.badge(x + w - 8, 548, 9)
    p.rect(x, 640, w, 30, fill=PAPER, stroke=INK, dash=True, r=6,
           text="hidden: #tooltip-announcer (aria-live=polite) reads tooltips on keyboard focus and chart updates", fs=10, color=G1)
    p.badge(x + 8, 640, 7)
    p.notes([(1, "Stepper: Start + 6 chapters, click\nto jump; yellow bar = progress"),
             (2, "Light/dark + colour-vision preview\n(remembered on both pages)"),
             (3, "Ch1: chart pinned, each message\nchanges what the chart shows"),
             (4, "v2 audience line: the reader is\nthe main character (W3.1)"),
             (5, "v2 every chart: \"Show the data as\na table\" (<details>, real <table>)"),
             (6, "Arrows: next / previous part; ← →\nonly when nothing is focused"),
             (7, "v2 live region for screen readers\n(W8 slide 45)"),
             (8, "v2 Sources is no longer a chapter:\nReferences = separate page (page 13),\nlinked from header, Summary, footer"),
             (9, "v2 footer: team, members (GitHub),\nunit, project, repository, data")], y=70)
    # one app state: controls and charts emit, main.js merges, every chart redraws if its keys changed
    p.rect(730, 532, 290, 138, fill=PAPER, stroke=G3, r=8)
    p.text(742, 536, 270, 18, "State bus (main.js)", fs=11, bold=True, align="left")
    flow = ["chip / tile / role / scroll step", "emit({ key: value })", "setState(patch) - one state", "chart.update(state) x 8"]
    for k, t in enumerate(flow):
        yy = 558 + k * 28
        p.rect(756, yy, 238, 20, fill=G5 if k % 2 else PAPER, stroke=INK if k == 2 else G3, r=5, text=t, fs=9.5)
        if k:
            p.line([(875, yy - 8), (875, yy - 1)], stroke=G1, sw=1.5, arrow=True)
    return p


def overview_phone():
    p = Page("02 Overview - phone", "Overview: phone (760 px and narrower)",
             "Same order as desktop; one column; header on two rows; arrow buttons bottom-right; footer stacks into one column.")
    x, y, w, h = 120, 70, 300, 600
    p.rect(x, y, w, h, stroke=INK, sw=2, r=26)
    p.rect(x + 12, y + 16, w - 24, 62, fill=G5, stroke=G3, r=8)
    p.text(x + 22, y + 20, 200, 22, "Outside the Car", fs=15, bold=True, align="left")
    p.rect(x + 20, y + 46, 112, 24, r=12, text="★ 1 2 3 4 5 6", fs=10)
    p.rect(x + 138, y + 46, 70, 24, fill=PAPER, stroke=INK, sw=1.5, r=12, text="References", fs=9.5, bold=True)
    p.rect(x + 214, y + 46, 26, 24, r=12, text="☾", fs=11)
    p.rect(x + 246, y + 46, 40, 24, r=12, text="▾", fs=10)
    p.badge(x + 290, y + 22, 1)
    p.rect(x + 12, y + 88, w - 24, 150, fill=G5, stroke=G3, r=8, text="pinned chart\n(300 px tall on phones)", fs=11, color=G2)
    p.badge(x + 290, y + 96, 2)
    p.rect(x + 12, y + 246, w - 24, 64, stroke=YEL, sw=2, r=8,
           text="active message card\n(others hidden so they never cover the chart)", fs=10)
    p.badge(x + 290, y + 252, 3)
    p.rect(x + 12, y + 318, w - 24, 64, stroke=G3, r=8, text="chart card (full width)", fs=11, color=G1, valign="top")
    p.table_toggle(x + 20, y + 354, w - 40)
    p.badge(x + 290, y + 362, 4)
    p.rect(x + 12, y + 390, w - 24, 44, stroke=G3, dash=True, r=8,
           text="Summary: cards 1 column\n[References and data notes →]", fs=10, color=G1)
    p.badge(x + 290, y + 398, 5)
    p.footer(x + 12, y + 442, w - 24, h=86, compact=True)
    p.badge(x + 290, y + 450, 6)
    p.rect(x + w - 104, y + h - 62, 88, 46, r=23, stroke=G3)
    p.circle(x + w - 82, y + h - 39, 16, stroke=G3); p.text(x + w - 92, y + h - 49, 20, 20, "↑", fs=13)
    p.circle(x + w - 38, y + h - 39, 16, stroke=INK); p.text(x + w - 48, y + h - 49, 20, 20, "↓", fs=13)
    p.badge(x + w - 108, y + h - 64, 7)
    p.notes([(1, "Title on row 1; chapters, v2\nReferences link, theme, vision on row 2"),
             (2, "Chapter 1 chart pinned under the\nheader, shorter so the card fits"),
             (3, "Message card sits low, above the\narrow buttons"),
             (4, "v2 table toggle under every chart;\nwide tables scroll inside the card"),
             (5, "v2 the story ends with a link to the\nseparate References page"),
             (6, "v2 footer in one column: team,\nmembers, unit, GitHub, data"),
             (7, "Arrow buttons bottom-right\n(40 px targets); footer keeps space\nfor them at the bottom")], x=480, y=70)
    return p


def ward():
    p = Page("03 Opening - bed pictogram", "Opening: \"Every day, 120 hospital beds…\" - unit pictogram",
             "One icon = one hospital bed filled every day, 2011-2021 (bed days ÷ 4,018 days). v2: cyclist beds striped, 2 keyboard stops, table.")
    p.card(20, 70, 690, 360, "One icon = one hospital bed filled every day (average, 2011-2021)")
    p.legend(34, 100, [("Pedestrians (solid)", INK, None), ("Cyclists (striped)", G2, "hatch")])
    with open(os.path.join(DATA, "severity.csv"), newline="", encoding="utf-8") as f:
        bed = {r["group"]: float(r["bed"]) for r in csv.DictReader(f)}
    n_ped, n_cyc = round(bed["Pedestrian"] / 4018), round(bed["Pedal cyclist"] / 4018)
    for i in range(n_ped + n_cyc):
        cx, cy = 40 + (i % 20) * 32, 132 + (i // 20) * 34
        if i < n_ped:
            p.rect(cx, cy + 8, 24, 8, fill=INK, stroke="none", r=1)
        else:
            p.rect(cx, cy + 8, 24, 8, fill=G5, stroke=G2, sw=1, r=1)
            p.hatch(cx, cy + 8, 24, 8, color=G2, step=4)
        p.rect(cx, cy, 5, 16, fill=INK if i < n_ped else G2, stroke="none", r=1)
    p.badge(28, 132, 1)
    # focus on the cyclist group (one stop)
    p.focus(36, 128 + 3 * 34, 640, 3 * 34 - 4)
    p.badge(684, 236 + 6, 2)
    p.rect(420, 250, 190, 50, fill=PAPER, stroke=G2, r=6, text=f"Cyclists\n{n_cyc} beds every day · 221,868 days", fs=10)
    p.text(34, 342, 660, 18, "Days in hospital from road-crash admissions ÷ 4,018 days. Source: (BITRE, 2023).", fs=10, color=G2, align="left")
    p.table_toggle(34, 368, 660)
    p.badge(28, 380, 3)
    p.rect(20, 450, 340, 90, stroke=G3, r=8, text="WHAT IT MEANS\none sentence + one key number", fs=11, color=G1)
    p.rect(370, 450, 340, 90, fill=G5, stroke=G3, r=8, text="WHAT IS BEING DONE\nofficial target or action + citation", fs=11, color=G1)
    p.notes([(1, "Icons fill in one by one the first\ntime the opening is on screen\n(instant with reduced motion)"),
             (2, "v2 Tab = one stop per road user\n(not 120 icons); focus dims the other\ngroup, tooltip + announcer"),
             (3, "v2 table: road user, beds per day,\ndays in hospital"),
             (4, "v2 cyclists striped, pedestrians\nsolid: readable without colour"),
             (5, "<desc>: 120 beds, 65 pedestrians,\n55 cyclists, and why (longer stays)")],
            watch="width, wardPlayed, theme, cvd")
    return p


TREND = {"Pedal cyclist": [96, 100, 111, 118, 120, 123, 126, 124, 130, 148, 146],
         "Pedestrian": [103, 100, 99, 96, 99, 103, 102, 100, 102, 79, 87],
         "Motorcyclist": [98, 100, 104, 108, 108, 111, 113, 112, 115, 112, 115],
         "Car occupant": [101, 100, 101, 100, 108, 116, 117, 120, 117, 105, 113]}


def trend():
    p = Page("04 Ch1 Who - trend line chart", "Chapter 1 \"Who\": scrollytelling line chart",
             "Admissions per year by road user, 2011-2021; default = change since 2012 (2012 = 100). v2: shapes per road user, year-by-year keyboard stops.")
    p.card(20, 70, 470, 440, "Hospital admissions after road crashes, by road user")
    x0, x1, y0, y1 = 70, 380, 120, 400
    X = lambda i: scale(i, 0, 10, x0, x1)
    Y = lambda v: scale(v, 60, 160, y1, y0)
    p.rect(X(8.5), y0, X(10) - X(8.5), y1 - y0, fill=G5, stroke="none", r=0)
    p.text(X(8.5), y0 - 16, X(10) - X(8.5), 14, "COVID", fs=10, color=G2)
    p.axes(x0, y0, x1, y1, [(X(i), str(2011 + i)) for i in range(0, 11, 2)],
           [(Y(v), str(v)) for v in range(60, 161, 20)])
    p.line([(x0, Y(100)), (x1, Y(100))], stroke=G2, sw=1)
    p.line([(X(6), y0), (X(6), y1)], stroke=G2, sw=1, dash="2 3")
    p.text(X(6) + 4, y0 + 2, 120, 14, "NSW counting change", fs=10, color=G2, align="left")
    # keyboard focus on one year column (2016)
    p.rect(X(5) - 12, y0, 24, y1 - y0, fill="none", stroke=INK, sw=1.5, dash=True, r=0)
    p.line([(X(5), y0), (X(5), y1)], stroke=G2, sw=1)
    p.badge(X(5), y0 + 18, 5)
    widths = {"Pedal cyclist": 2.5, "Pedestrian": 2.5, "Motorcyclist": 1.5, "Car occupant": 1.5}
    for g, vals in TREND.items():
        c = TONE[g]
        p.line([(X(i), Y(v)) for i, v in enumerate(vals)], stroke=c, sw=widths[g], dash="6 4" if g == "Car occupant" else None)
        for i, v in enumerate(vals):
            p.shape(SHAPE[g], X(i), Y(v), 3.2 if g in ("Pedal cyclist", "Pedestrian") else 2.6, c)
        off = {"Motorcyclist": -7, "Car occupant": 7}.get(g, 0)
        p.shape(SHAPE[g], x1 + 12, Y(vals[-1]) + off, 4, c)
        p.text(x1 + 20, Y(vals[-1]) - 8 + off, 90, 16, NAMES[g], fs=10, bold=True, align="left")
    for g, lab, dy in (("Pedal cyclist", "+30% 2012-19", -22), ("Pedestrian", "+2% 2012-19", -22)):
        v = TREND[g][8]
        p.ring(X(8), Y(v), 7)
        p.text(X(8) - 110, Y(v) + dy, 100, 16, lab, fs=10, bold=True, align="right")
    p.chip(34, 430, "Change since 2012", True); p.chip(160, 430, "Number of admissions")
    p.text(34, 462, 440, 16, "Other road users (4%) not shown. Source: (BITRE, 2023).", fs=10, color=G2, align="left")
    p.badge(X(8) + 16, Y(130), 1); p.badge(30, 443, 2); p.badge(x1 + 4, Y(146) - 18, 3)
    p.text(510, 70, 200, 18, "Message cards scroll past", fs=11, bold=True, color=G1, align="left")
    msgs = [("1  How to read + key (● ■ ▲ ◆)", "{trendMode: index, trendFocus: null}"),
            ("2  Cyclists +30% (others fade)", "{trendMode: index, trendFocus: cyclist}"),
            ("3  Pedestrians +2%", "{trendMode: index, trendFocus: pedestrian}"),
            ("4  COVID band, NSW change", "{trendMode: index, trendFocus: null}"),
            ("5  Count view: cars most", "{trendMode: hosp, trendFocus: null}")]
    yy = 96
    for i, (m, patch) in enumerate(msgs):
        p.rect(510, yy, 200, 50, stroke=YEL if i == 1 else G4, sw=3 if i == 1 else 1, r=6)
        p.text(516, yy + 4, 190, 18, m, fs=10, bold=i == 1, color=INK if i == 1 else G1, align="left")
        p.text(516, yy + 26, 190, 16, patch, fs=8.5, italic=True, color=G2, align="left")
        yy += 58
    p.badge(712, 121, 4)
    p.rect(20, 520, 690, 30, stroke=G3, r=8)
    p.table_toggle(28, 524, 600, "Show the Chapter 1 chart data as a table   (below the scrolly, so it is never pinned)")
    p.badge(16, 536, 6)
    p.notes([(1, "v2 yellow rings with dark edge\n(passes 2:1 on white); labels give\nthe 2012->19 change"),
             (2, "Chips: index (growth) or counts;\nv2 announced to screen readers"),
             (3, "Direct labels with v2 shapes:\n● ped ■ cyc ▲ moto ◆ car (dashed)"),
             (4, "Each card sets trendMode /\ntrendFocus; other lines fade to 18%"),
             (5, "v2 Tab, then ← → = one year at a\ntime: crosshair + tooltip for all\nroad users (same as mouse hover)"),
             (6, "v2 table: year x road user, follows\nthe chosen scale")], x=730, y=70,
            watch="trendMode, trendFocus, width, theme, cvd")
    return p


def severity():
    p = Page("05 Ch2 How badly - dot plot", "Chapter 2 \"How badly\": Cleveland dot plot",
             "One marker per road user, sorted by the chosen measure; dotted line = all road users. v2: shapes, teaser prompt, row focus, table.")
    p.question(20, 66, 690, "Switch to Died within 30 days: pedestrians stay on top, at 3.6 times the rate for people in cars.\nWhich group drops to the bottom?")
    p.badge(16, 66, 1)
    x = p.chip(20, 114, "Days in hospital", True); x = p.chip(x, 114, "Died within 30 days")
    p.chip(x, 114, "Share of beds vs share of patients")
    p.card(20, 150, 690, 330, "How badly each road user is hurt, 2011-2021")
    x0, x1 = 150, 650
    X = lambda v: scale(v, 0, 10, x0, x1)
    rows = [("Pedestrian", 9.1, 9), ("Motorcyclist", 5.4, 6), ("Car occupant", 4.7, 6), ("Pedal cyclist", 2.9, 9)]
    ys = [215, 270, 325, 380]
    p.axes(x0, 200, x1, 410, [(X(v), str(v)) for v in range(0, 11, 2)], [])
    for (g, v, r), y in zip(rows, ys):
        c = TONE[g]
        p.text(40, y - 9, 104, 18, NAMES[g], fs=11, align="right", color=G1)
        p.line([(x0, y), (X(v), y)], stroke=c, sw=2, dash="6 4" if g == "Car occupant" else None)
        p.shape(SHAPE[g], X(v), y, r * 0.8, c)
        p.text(X(v) + 12, y - 9, 70, 18, f"{v} days", fs=11, bold=r == 9, align="left")
    p.focus(32, 270 - 16, 670, 32)
    p.badge(690, 270, 3)
    p.line([(X(4.9), 190), (X(4.9), 410)], stroke=G2, sw=1, dash="2 3")
    p.text(X(4.9) + 4, 180, 160, 14, "all road users 4.9 days", fs=10, color=G2, align="left")
    p.badge(X(4.9) - 12, 190, 2)
    p.text(34, 430, 660, 16, "Days in hospital leave out patients who died within 30 days. Source: (BITRE, 2023).", fs=10, color=G2, align="left")
    p.table_toggle(34, 452, 660)
    p.badge(28, 464, 4)
    p.rect(20, 496, 690, 40, stroke=G3, dash=True, r=8, text="then: 100% stacked bars - what they collided with (next page)", fs=11, color=G2)
    p.notes([(1, "v2 the prompt gives half the answer,\nso readers who never click still get\nthe point (explanatory first, W3.1)"),
             (2, "Reference line = all road users,\nincluding the small \"other\" group"),
             (3, "v2 one Tab stop, ↑ ↓ between rows;\nthe whole row is the focus target"),
             (4, "v2 table: all 3 measures + shares\nfor every road user"),
             (5, "v2 same marker shapes as Ch1\n(consistency, W7.1)"),
             (6, "Chip change re-sorts (animated);\nv2 new <desc> is announced")], y=150,
            watch="sevMeasure, width, theme, cvd")
    return p


def counterparty():
    p = Page("06 Ch2 How badly - stacked bars", "Chapter 2 \"How badly\": what they collided with",
             "100% stacked bars, one per group; categories are not road users, so greys. v2: the two story categories also carry a pattern.")
    rows = {}
    with open(os.path.join(DATA, "counterparty.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.setdefault(r["group"], {})[r["cp"]] = float(r["share"])
    cats = ["Car, pick-up truck or van", "Heavy vehicle or bus", "Motorcycle",
            "Fixed object", "No collision (e.g. fall)", "Other"]
    shades = {cats[0]: INK, cats[4]: G1, cats[1]: G2, cats[2]: G3, cats[3]: G4, cats[5]: G5}
    pattern = {cats[0]: "dots", cats[4]: "stripes"}
    p.card(20, 70, 690, 320, "What injured pedestrians and cyclists collided with, 2011-2021")
    x0, x1 = 130, 680
    for gi, (g, lab) in enumerate((("Pedestrian", "Pedestrians"), ("Pedal cyclist", "Cyclists"))):
        y = 120 + gi * 80
        p.text(30, y + 6, 94, 24, lab, fs=12, bold=True, align="right")
        x = x0
        for c in cats:
            v = rows.get(g, {}).get(c, 0)
            if not v:
                continue
            w = v * (x1 - x0)
            s = shades[c]
            p.rect(x, y, w, 36, fill=s, stroke=PAPER, sw=1, r=0)
            if pattern.get(c) == "stripes":
                p.hatch(x + 1, y + 1, w - 2, 34, color=G3, step=7)
            elif pattern.get(c) == "dots":
                for dx in range(6, int(w) - 2, 9):
                    for dy in (8, 18, 28):
                        p.circle(x + dx, y + dy, 1, fill=G2, stroke=G2, sw=0.5)
            if v >= 0.08:
                p.rect(x + 4, y + 9, 70, 18, fill=s, stroke="none", r=3, text=f"{v:.0%}", fs=11, bold=True,
                       color=PAPER if s in (INK, G1, G2) else INK)
            x += w
    # focus on the cyclists' car/van segment, + same category highlighted in the other bar
    p.focus(x0, 200, rows["Pedal cyclist"][cats[0]] * (x1 - x0), 36)
    p.badge(x0 + 10, 252, 3)
    p.badge(x0 + 6, 116, 1)
    lx, ly = 40, 286
    for c in cats:
        p.rect(lx, ly + 3, 12, 12, fill=shades[c], stroke=G3, r=2)
        if pattern.get(c) == "stripes":
            p.hatch(lx, ly + 3, 12, 12, color=G3, step=4)
        p.text(lx + 16, ly, 170, 18, c + (" (dotted)" if c == cats[0] else " (striped)" if c == cats[4] else ""), fs=10, color=G1, align="left")
        lx += 220
        if lx > 600:
            lx, ly = 40, ly + 22
    p.badge(30, 286, 2)
    p.table_toggle(34, 352, 660)
    p.badge(28, 364, 4)
    p.rect(20, 404, 690, 100, stroke=G3, r=8, text="WHAT IT MEANS  |  WHAT CAN BE DONE\n(insight + official action, with citations)", fs=11, color=G1)
    p.notes([(1, "Percentages inside segments that\nare wide enough"),
             (2, "Legend in reading order; wording\n\"collided with\", never \"hit by\".\nv2 legend names the patterns"),
             (3, "v2 Tab, then ← →: every segment;\nthe same category stays bright in\nboth bars (like mouse hover)"),
             (4, "v2 table: category x road user,\nshare and number"),
             (5, "v2 dots / stripes on the two story\ncategories: not lightness alone")],
            watch="width, theme, cvd (static data)")
    return p


AGES = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
AGE_LOS = [4.1, 4.6, 6.2, 7.3, 10.3, 13.4, 15.8]


def age():
    p = Page("07 Ch3 Age - bar chart", "Chapter 3 \"Age\": bar chart by age group",
             "Road-user chips, then measure chips. 75+ in full colour + yellow marker. v2: teaser prompt, take-away line, outlined light bars, table.")
    p.question(20, 64, 690, "Switch to Cyclists and Per 100,000 people: the highest rate is not older people but age 8-16.", h=28)
    p.badge(16, 64, 1)
    x = p.chip(20, 100, "Pedestrians", True); p.chip(x, 100, "Cyclists")
    x = p.chip(20, 132, "Days in hospital", True); x = p.chip(x, 132, "Died within 30 days"); p.chip(x, 132, "Per 100,000 people")
    p.card(20, 168, 690, 400, "Pedestrians: average days in hospital, by age group (2011-2021)")
    p.takeaway(34, 194, 600, "Highest: age 75+ (15.8 days).")
    p.badge(250, 202, 2)
    x0, x1, y0, y1 = 80, 690, 240, 490
    Y = lambda v: scale(v, 0, 16, y1, y0)
    p.axes(x0, y0, x1, y1, [], [(Y(v), str(v)) for v in (0, 5, 10, 15)], "Average days in hospital")
    bw, gap = 66, 20
    for i, (a, v) in enumerate(zip(AGES, AGE_LOS)):
        bx = x0 + 18 + i * (bw + gap)
        last = i == len(AGES) - 1
        p.rect(bx, Y(v), bw, y1 - Y(v), fill=INK if last else G5, stroke=INK, sw=1.5, r=2)
        p.text(bx - 6, Y(v) - 18, bw + 12, 16, f"{v} d", fs=10, bold=last)
        p.text(bx - 6, y1 + 4, bw + 12, 16, a, fs=10, color=G1)
        if last:
            p.rect(bx, y1 + 22, bw, 5, fill=YEL, stroke=INK, sw=1, r=0)
            p.focus(bx, Y(v), bw, y1 - Y(v))
            p.badge(bx - 14, Y(v) + 10, 3)
    p.text(34, 520, 660, 16, "Per 100,000 uses ABS population; \"≈\" = estimate where age bands differ. (ABS, 2026)", fs=10, color=G2, align="left")
    p.table_toggle(34, 540, 660)
    p.badge(28, 552, 4)
    p.notes([(1, "v2 prompt names the surprise\n(cyclists aged 8-16) so it is not\nhidden behind two clicks"),
             (2, "v2 take-away line: the highest bar\nof the current view, in words"),
             (3, "v2 Tab starts on 75+, ← → between\nages; tooltip + announcer"),
             (4, "v2 table for the selected road user\n(all 3 measures)"),
             (5, "v2 light bars outlined in the full\ncolour (light fill alone < 2:1);\nyellow marker has a dark edge"),
             (6, "One y-scale for both road users:\nswitching never rescales silently")], y=168,
            watch="ageGroup, ageMeasure, width, theme, cvd")
    return p


SEASON = {"Pedal cyclist": [1.11, 1.09, 1.20, 1.06, 0.98, 0.80, 0.77, 0.82, 0.91, 1.13, 1.08, 1.07],
          "Pedestrian": [0.79, 0.87, 1.03, 1.00, 1.15, 1.15, 1.13, 1.09, 0.94, 0.99, 0.93, 0.93]}


def season():
    p = Page("08 Ch4 When - month line chart", "Chapter 4 \"When & where\" (a): month of the year",
             "Each month ÷ the average month (1.0 = typical), 2011-2019. v2: circles + solid (ped), squares + long dash (cyc), month stops, table.")
    p.card(20, 70, 690, 410, "Each month compared with an average month, 2011-2019")
    x0, x1, y0, y1 = 80, 590, 130, 400
    X = lambda i: scale(i, 0, 11, x0, x1)
    Y = lambda v: scale(v, 0.7, 1.25, y1, y0)
    p.rect(X(4.5), y0, X(7.5) - X(4.5), y1 - y0, fill=G5, stroke="none", r=0)
    p.text(X(4.5), y0 - 16, X(7.5) - X(4.5), 14, "Winter", fs=10, color=G2)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    p.axes(x0, y0, x1, y1, [(X(i), m) for i, m in enumerate(months)],
           [(Y(v), f"{v:.1f}x") for v in (0.7, 0.8, 0.9, 1.0, 1.1, 1.2)])
    p.line([(x0, Y(1)), (x1, Y(1))], stroke=G2, sw=1)
    p.text(x0 + 4, Y(1) - 16, 100, 14, "average month", fs=10, color=G2, align="left")
    # focus on September
    p.rect(X(8) - 18, y0, 36, y1 - y0, fill="none", stroke=INK, sw=1.5, dash=True, r=0)
    p.badge(X(8), y0 + 16, 3)
    for g, dash in (("Pedal cyclist", "9 4"), ("Pedestrian", None)):
        vals, c = SEASON[g], TONE[g]
        p.line([(X(i), Y(v)) for i, v in enumerate(vals)], stroke=c, sw=2.5, dash=dash)
        for i, v in enumerate(vals):
            p.shape(SHAPE[g], X(i), Y(v), 4, c)
        p.shape(SHAPE[g], x1 + 14, Y(vals[-1]) + (6 if g == "Pedestrian" else -6), 4.5, c)
        p.text(x1 + 22, Y(vals[-1]) - 8 + (6 if g == "Pedestrian" else -6), 90, 16, NAMES[g], fs=11, bold=True, align="left")
        k = vals.index(max(vals))
        p.ring(X(k), Y(vals[k]), 9)
    p.badge(X(2) + 18, Y(1.2) - 14, 1); p.badge(X(6), y0 + 30, 2)
    p.text(34, 425, 660, 16, "2020-21 left out (COVID). The data records the month, not the time of day.", fs=10, color=G2, align="left")
    p.table_toggle(34, 448, 660)
    p.badge(28, 460, 4)
    p.notes([(1, "Yellow rings (v2 dark edge): each\ngroup's peak month (cyclists March,\npedestrians May, June about equal)"),
             (2, "Winter shaded: pedestrians stay\nhigh, cyclists drop"),
             (3, "v2 Tab, then ← →: one month at a\ntime, both groups read together"),
             (4, "v2 table: month x road user,\nindex and admissions"),
             (5, "v2 two lines differ by shape AND\ndash, not only colour (W8 s.26)"),
             (6, "v2 text fix: v1 said the peak is June;\nthe data peak is May (+14.9% vs\n+14.7%): text now says May-June")],
            watch="width, theme, cvd (static data)")
    return p


def state_map():
    p = Page("09 Ch4 Where - tile map + detail", "Chapter 4 \"When & where\" (b): states, linked views",
             "Equal-area tile map per 100,000 people (5-step ramp); Enter / click on a state updates the line chart. v2: teaser, take-away, keyboard, table.")
    p.question(20, 64, 690, "For pedestrians the Northern Territory is highest. Switch to Cyclists: a different territory leads.", h=28)
    p.badge(16, 64, 1)
    x = p.chip(20, 100, "Pedestrians", True); p.chip(x, 100, "Cyclists")
    p.card(20, 136, 340, 390, "Admissions per 100,000 people per year")
    # real pedestrian rates -> 5 equal classes from 0 to the max (23.5)
    rates = {"NT": 23.5, "Qld": 8.8, "WA": 8.3, "SA": 9.2, "NSW": 11.5, "ACT": 6.3, "Vic": 11.7, "Tas": 8.4}
    pos = {"NT": (1, 0), "Qld": (2, 0), "WA": (0, 1), "SA": (1, 1), "NSW": (2, 1), "ACT": (3, 1), "Vic": (2, 2), "Tas": (2, 3)}
    ramp = [G5, G4, G3, G2, INK]
    for s, (c, r) in pos.items():
        k = min(4, int(rates[s] / (23.5 / 5)))
        tx, ty = 50 + c * 72, 176 + r * 72
        p.rect(tx, ty, 66, 66, fill=ramp[k], stroke=INK if s == "Vic" else PAPER, sw=3 if s == "Vic" else 2, r=6,
               text=f"{s}\n{rates[s]}", fs=11, bold=True, color=PAPER if k >= 3 else INK)
    p.focus(50 + 2 * 72, 176 + 2 * 72, 66, 66)
    p.badge(50 + 2 * 72 + 76, 176 + 2 * 72 + 8, 2)
    for i, s in enumerate(ramp):
        p.rect(40 + i * 60, 478, 56, 14, fill=s, stroke=G3, r=0)
        p.text(36 + i * 60, 494, 64, 14, ["0-4.7", "4.7-9.4", "9.4-14.1", "14.1-18.8", "18.8-23.5"][i], fs=9, color=G2)
    p.card(370, 136, 340, 390, "Victoria vs Australia, pedestrians per 100,000")
    p.line([(50 + 2 * 72 + 72, 176 + 2 * 72 + 33), (300, 176 + 2 * 72 + 33), (300, 330), (372, 330)], stroke=INK, sw=1.5, arrow=True)
    p.text(296, 312, 80, 14, "emit mapState", fs=9, italic=True, color=G1, align="left")
    x0, x1, y0, y1 = 410, 680, 190, 470
    X = lambda i: scale(i, 0, 10, x0, x1)
    p.rect(X(8.5), y0, X(10) - X(8.5), y1 - y0, fill=G5, stroke="none", r=0)
    p.axes(x0, y0, x1, y1, [(X(i), str(2011 + i)) for i in range(0, 11, 5)], [(y0 + k * 70, "") for k in range(5)])
    vic = [13.3, 11.9, 11.7, 10.9, 11.6, 13.0, 12.5, 12.9, 12.5, 8.4, 10.4]   # data/state_year.csv
    au = [12.1, 11.5, 11.2, 10.6, 10.6, 11.1, 10.7, 10.3, 10.4, 8.0, 8.9]
    Yv = lambda v: scale(v, 0, 16, y1, y0)
    p.line([(X(i), Yv(v)) for i, v in enumerate(vic)], stroke=INK, sw=2.5)
    p.line([(X(i), Yv(v)) for i, v in enumerate(au)], stroke=G3, sw=2, dash="6 4")
    p.text(X(10) - 90, Yv(vic[-1]) - 34, 90, 14, "Vic (solid)", fs=10, bold=True, align="right")
    p.text(X(0), Yv(au[0]) + 6, 120, 14, "Australia (dashed)", fs=10, color=G1, align="left")
    p.badge(x1 - 6, y0 - 6, 4)
    p.takeaway(30, 536, 680, "Highest for pedestrians: Northern Territory (23.5 per 100,000); lowest: ACT (6.3).")
    p.badge(16, 544, 3)
    p.table_toggle(30, 560, 680)
    p.badge(16, 572, 5)
    p.text(30, 590, 680, 16, "Sources: BITRE admissions ÷ ABS population. Values = prototype pedestrian rates, 2011-2021.", fs=10, color=G2, align="left")
    p.notes([(1, "v2 prompt answers the first half\n(NT) and teases the second"),
             (2, "Tiles = one Tab stop; v2 ← → move\nbetween tiles, Enter selects (focus\nstays on the tile after the redraw)"),
             (3, "v2 take-away line names the\nhighest and lowest state"),
             (4, "Linked line chart: selected state\n(solid) vs Australia (dashed);\nv2 role=img + <title>/<desc>"),
             (5, "v2 table: every state, highest\nfirst, plus Australia"),
             (6, "Change of state or road user is\nannounced (v2 live region)")], y=136,
            watch="mapGroup, mapState, width, theme, cvd")
    return p


def roles():
    p = Page("10 Ch5 What you can do - role picker", "Chapter 5 \"What you can do\": role picker + action panel",
             "The reader picks how they use the road; the panel repeats the relevant numbers and lists sourced actions.")
    for i, (n, s) in enumerate((("I drive", "car, ute or van"), ("I walk", "or my parents do"),
                                ("I ride", "bike or e-bike"), ("I make decisions", "council, state, federal"))):
        p.rect(20 + i * 174, 70, 164, 60, stroke=INK if i == 0 else G3, sw=2 if i == 0 else 1, r=10,
               text=f"{n}\n{s}", fs=11, bold=i == 0)
        if i == 0:
            p.line([(30, 136), (174, 136)], stroke=YEL, sw=4)
    p.badge(16, 70, 1)
    p.rect(20, 150, 690, 380, stroke=G3, r=10)
    p.text(36, 160, 660, 24, "When you drive, the people outside your car have no crumple zone", fs=14, bold=True, align="left")
    for i, t in enumerate(("88% of injured\npedestrians collided\nwith a car or van", "Pedestrians stay\n9.1 days in hospital\n(car occupants 4.7)", "+15% pedestrian\nadmissions in June\nvs an average month")):
        p.rect(36 + i * 220, 196, 206, 64, fill=G5, stroke="none", r=8, text=t, fs=11)
    p.badge(36, 196, 2)
    p.text(36, 272, 640, 18, "Safe System order:  [SYSTEM] solid  →  [DRIVER] outline  →  [EXTRA] dashed", fs=10.5, color=G1, align="left")
    p.badge(30, 281, 6)
    for i, tag in enumerate(("SYSTEM", "DRIVER", "DRIVER")):
        solid = tag == "SYSTEM"
        p.rect(52, 300 + i * 30, 56, 16, fill=INK if solid else PAPER, stroke=INK, sw=1.5, r=3, text=tag, fs=9, bold=True,
               color=PAPER if solid else INK)
        p.rect(116, 301 + i * 30, 416, 14, fill=G5, stroke="none", r=3)
        p.rect(540, 299 + i * 30, 120, 16, stroke=G3, r=8, text="(Source, year)", fs=9, color=G2)
    p.badge(676, 306, 3)
    p.text(36, 396, 300, 18, "Extra protection", fs=12, bold=True, align="left", color=G1)
    for i in range(2):
        p.rect(52, 423 + i * 30, 56, 16, fill=PAPER, stroke=G2, sw=1.5, dash=True, r=3, text="EXTRA", fs=9, bold=True, color=G1)
        p.rect(116, 424 + i * 30, 416, 14, fill=G5, stroke="none", r=3)
    p.badge(30, 396, 4)
    p.line([(92, 134), (92, 148)], stroke=INK, sw=1.5, arrow=True)
    p.notes([(1, "Four role buttons: type=button,\naria-pressed; choice kept in state"),
             (2, "Numbers from earlier chapters\nthat matter for this role"),
             (3, "Actions in Safe System order\n(system and drivers first), each\nwith an APA citation. v2 tags 12 px"),
             (4, "Self-protection tips labelled\n\"extra protection\" so they don't\nread as victim-blaming"),
             (5, "Panel is aria-live=polite: the new\nrole's content is read out"),
             (6, "v2 action level shown by style, not\ncolour: solid / outline / dashed,\nwith the order as a key")],
            watch="role")
    return p


def summary():
    p = Page("11 Summary - revisit cards", "Summary: one finding and one action per chapter, then the way out",
             "Five cards; Revisit jumps back to that chapter. The story ends with the message and a link to the References page.")
    for i, (t, a) in enumerate((("1 · Who", "Cyclists +30%"), ("2 · How badly", "Pedestrians 9.1 days"),
                                ("3 · Age", "1 in 18 (75+ die)"), ("4 · When & where", "May-June, NT highest"),
                                ("5 · You", "120 beds every day"))):
        cx, cy = 20 + (i % 3) * 232, 76 + (i // 3) * 196
        p.rect(cx, cy, 222, 184, stroke=G3, r=10)
        p.line([(cx + 2, cy + 1), (cx + 220, cy + 1)], stroke=YEL, sw=4)
        p.text(cx + 12, cy + 10, 200, 16, t, fs=11, bold=True, color=G1, align="left")
        p.text(cx + 12, cy + 34, 200, 20, a, fs=13, bold=True, align="left")
        p.rect(cx + 12, cy + 64, 198, 10, fill=G5, stroke="none", r=3)
        p.rect(cx + 12, cy + 82, 160, 10, fill=G5, stroke="none", r=3)
        p.text(cx + 12, cy + 100, 200, 16, "→ Action:", fs=10, bold=True, color=G1, align="left")
        p.rect(cx + 12, cy + 120, 190, 10, fill=G5, stroke="none", r=3)
        p.rect(cx + 12, cy + 144, 130, 28, stroke=INK, r=14, text=f"Revisit chapter {i + 1}", fs=10)
    p.badge(30, 226, 1)
    p.badge(498, 286, 2)
    # closing message + exits
    p.line([(20, 474), (20, 508)], stroke=YEL, sw=5)
    p.text(32, 474, 600, 34, "Outside the car, your body is the only crumple zone,\nso the road has to protect it.", fs=13, bold=True, align="left")
    p.rect(20, 522, 210, 30, fill=PAPER, stroke=INK, sw=1.5, r=15, text="References and data notes →", fs=11, bold=True)
    p.rect(240, 522, 150, 30, stroke=G3, r=15, text="Back to the start ↑", fs=11)
    p.badge(400, 537, 3)
    p.line([(125, 554), (125, 590)], stroke=INK, sw=1.5, arrow=True)
    p.text(132, 570, 300, 16, "opens references.html (page 13)", fs=10, italic=True, color=G1, align="left")
    p.rect(20, 596, 690, 70, fill=G5, stroke=G3, r=6, text="project footer (page 13 shows it in full)", fs=11, color=G1)
    p.badge(30, 596, 4)
    p.notes([(1, "Revisit = smooth scroll to the\nchapter start (instant with\nreduced motion); type=button"),
             (2, "v2 card 4 says May-June (data\npeak), not June"),
             (3, "v2 Sources is no longer a chapter:\nthe story ends with a link to the\nseparate References page"),
             (4, "v2 footer with team, members, unit,\nproject, GitHub and data links"),
             (5, "Cards wrap to 1 column on phones")])
    return p


def references_page():
    p = Page("13 References page - references page", "References page (references.html): a separate page, not a chapter",
             "Reached from the header link, the end of the Summary and the footer. Same header style, theme and footer as the story.")
    x, w = 20, 690
    p.rect(x, 66, w, 604, stroke=INK, sw=1.5, r=8)
    # header
    p.rect(x, 66, w, 40, fill=G5, stroke=G3, r=8)
    p.text(x + 12, 70, 150, 32, "Outside the Car", fs=15, bold=True, align="left")
    p.line([(x + 96, 96), (x + 128, 96)], stroke=YEL, sw=4)
    p.rect(x + 300, 74, 130, 24, stroke=G3, r=12, text="← Back to the story", fs=10.5)
    p.rect(x + 438, 74, 84, 24, fill=INK, stroke=INK, r=12, text="References", fs=10.5, color=PAPER, bold=True)
    p.rect(x + 610, 74, 66, 24, r=12, text="☾ Dark", fs=10.5)
    p.badge(x + 296, 72, 1)
    # title block
    p.text(x + 24, 116, 300, 14, "— REFERENCES", fs=9.5, bold=True, color=G1, align="left")
    p.text(x + 24, 132, 500, 28, "References and data notes", fs=20, bold=True, align="left")
    p.text(x + 24, 162, 560, 16, "Every source cited in the story, in APA 7 style, and what the data can and cannot tell us.", fs=10.5, color=G1, align="left")
    p.text(x + 24, 182, 560, 16, "References · About the data · How the figures were made", fs=10, bold=True, align="left")
    p.badge(x + 360, 190, 2)
    # references
    p.line([(x + 24, 204), (x + w - 24, 204)], stroke=G4, sw=1)
    p.text(x + 24, 208, 200, 18, "References", fs=13, bold=True, align="left")
    p.text(x + 24, 228, 200, 14, "Data", fs=10.5, bold=True, align="left")
    for i in range(2):
        p.rect(x + 24, 246 + i * 18, 560 - i * 60, 9, fill=G5, stroke="none", r=2)
        p.rect(x + 590 - i * 60, 246 + i * 18, 70, 9, fill=PAPER, stroke=G3, r=2)
    p.text(x + 24, 284, 200, 14, "Evidence for actions", fs=10.5, bold=True, align="left")
    for i in range(6):
        p.rect(x + 24, 302 + i * 16, 520 - (i % 3) * 50, 8, fill=G5, stroke="none", r=2)
        p.rect(x + 552 - (i % 3) * 50, 302 + i * 16, 80, 8, fill=PAPER, stroke=G3, r=2)
    p.badge(x + 670, 246, 3)
    # about the data
    p.line([(x + 24, 406), (x + w - 24, 406)], stroke=G4, sw=1)
    p.text(x + 24, 410, 200, 18, "About the data", fs=13, bold=True, align="left")
    for i, t in enumerate(("An admission is not a person.", "No fault.", "Counting changes (Vic 2012, NSW 2017).",
                           "COVID (2020-21).", "No exposure data.", "Who is missing.", "Scope: First Nations data left out.")):
        p.text(x + 30 + (i // 4) * 320, 432 + (i % 4) * 16, 300, 14, f"•  {t}", fs=9.5, color=G1, align="left")
    p.badge(x + 670, 432, 4)
    # method
    p.line([(x + 24, 500), (x + w - 24, 500)], stroke=G4, sw=1)
    p.text(x + 24, 504, 300, 18, "How the figures were made", fs=13, bold=True, align="left")
    p.rect(x + 24, 526, 600, 8, fill=G5, stroke="none", r=2)
    p.rect(x + 24, 540, 420, 8, fill=G5, stroke="none", r=2)
    p.rect(x + 24, 554, 140, 18, stroke=INK, r=9, text="← Back to the story", fs=9)
    p.rect(x + 170, 554, 120, 18, stroke=G3, r=9, text="Top of this page ↑", fs=9)
    p.badge(x + 300, 563, 5)
    # footer
    p.footer(x + 8, 580, w - 16, h=84)
    p.badge(x + w - 12, 582, 6)
    p.notes([(1, "Same header as the story; nav links:\nBack to the story / References\n(aria-current=page); theme shared"),
             (2, "One <h1>; \"On this page\" links to\nthe 3 sections (skip link too)"),
             (3, "APA 7 list built from sources.js,\ngrouped (Data / Evidence for actions),\nfull URLs; in-text (Author, year)\nbuttons in the story point here"),
             (4, "The 7 data limitations, moved here\nfrom the old Sources chapter"),
             (5, "Clear way back: to the story or to\nthe top of this page"),
             (6, "Same project footer as the story:\nteam DataWerk, both members with\nGitHub, COS30045, 2026, Swinburne\n(Vietnam), repository, data links")])
    return p


def a11y_layer():
    p = Page("12 Accessibility layer - one chart card", "v2: the accessibility layer of one chart card (same on every chart)",
             "What a mouse user, a keyboard user and a screen-reader user each get. Lectures: W8 slides 7-49, Chartability, W7.1.")
    # anatomy of the card (left)
    p.rect(20, 70, 470, 560, stroke=G3, r=10)
    p.text(34, 78, 440, 20, "Pedestrians: average days in hospital, by age group", fs=13, bold=True, align="left")
    p.badge(480, 86, 1)
    p.takeaway(34, 102, 440, "Highest: age 75+ (15.8 days).")
    p.badge(250, 110, 2)
    p.rect(34, 126, 440, 32, fill=G5, stroke=G4, r=6, text='chips: role="group" aria-label="Measure" · button type="button" aria-pressed', fs=10, color=G1)
    p.badge(480, 142, 3)
    p.rect(34, 168, 440, 250, stroke=INK, sw=1.5, dash=True, r=4)
    p.text(40, 172, 430, 16, '<svg role="group" aria-roledescription="chart" aria-labelledby aria-describedby>', fs=9.5, color=G1, align="left")
    p.text(40, 188, 430, 16, "  <title> chart title   <desc> numbers + conclusion   axes aria-hidden", fs=9.5, color=G1, align="left")
    p.badge(480, 176, 4)
    for i, v in enumerate((4, 5, 6, 7, 10, 13, 16)):
        bx = 70 + i * 56
        hh = v * 12
        p.rect(bx, 400 - hh, 40, hh, fill=INK if i == 6 else G5, stroke=INK, sw=1.5, r=2)
    p.focus(70 + 6 * 56, 400 - 192, 40, 192)
    p.rect(250, 214, 150, 56, fill=PAPER, stroke=G2, r=6, text="Pedestrians, age 75+\nAdmissions 3,656\nAvg days 15.8", fs=10)
    p.line([(400, 250), (404 + 0, 250)], stroke=G2)
    p.badge(462, 214, 5)
    p.table_toggle(34, 430, 440)
    p.rect(34, 456, 440, 112, stroke=G3, r=4)
    p.text(42, 460, 420, 14, "caption: Pedestrians hospitalised after road crashes, by age group", fs=9.5, color=G1, align="left")
    for r_ in range(5):
        p.line([(42, 492 + r_ * 16), (466, 492 + r_ * 16)], stroke=G4, sw=1)
        for c_ in range(4):
            p.rect(46 + c_ * 104, 478 + r_ * 16, 70 if c_ else 50, 8, fill=G4 if r_ == 0 else G5, stroke="none", r=2)
    p.badge(480, 470, 6)
    p.rect(34, 580, 440, 36, fill=PAPER, stroke=INK, dash=True, r=6,
           text='#tooltip-announcer  class="sr-only"  aria-live="polite"', fs=10, color=G1)
    p.badge(480, 598, 7)
    # keyboard map (right)
    p.rect(510, 70, 510, 244, fill=G5, stroke=G4, r=8)
    p.text(522, 78, 480, 20, "Keyboard map", fs=13, bold=True, align="left")
    keys = [("Tab", "next control, then ONE stop per chart (roving tabindex)"),
            ("← → ↑ ↓", "next / previous mark, year, month, row or tile"),
            ("Home / End", "first / last mark of the chart"),
            ("Enter / Space", "select (map tiles, chips, role buttons, table toggle)"),
            ("Esc", "hide the tooltip (WCAG 1.4.13)"),
            ("← → on the page", "next / previous part, ONLY when nothing is focused"),
            ("↓ ↑ Space PgDn", "scroll as usual (never overridden)")]
    for i, (k, t) in enumerate(keys):
        yy = 102 + i * 29
        p.rect(522, yy, 118, 24, fill=PAPER, stroke=G3, r=5, text=k, fs=10.5, bold=True)
        p.text(648, yy + 2, 366, 20, t, fs=10.5, color=G1, align="left")
    p.notes([(1, "Visible title (figcaption), changes with the chips"),
             (2, "Take-away: the answer in words, no click needed"),
             (3, "Chips: aria-pressed; the chart's new <desc> is announced"),
             (4, "W8 s.35-39: <title> + <desc>; role=group because the marks are\nfocusable (role=img would hide them from screen readers)"),
             (5, "W8 s.41-49: focus = same tooltip as hover + announcer"),
             (6, "Chartability \"no table\": <details> with a real <table>, th scope"),
             (7, "One polite live region for the whole page")], x=510, y=326, w=510)
    return p


def gallery(pages, files, svgs):
    """Wireframe studio: filter tabs, per-page SVG / PNG 2x export and copy,
    and each page's notes as real text under the drawing (readable, searchable)."""
    import json
    tabs = "".join(f'<button type="button" class="tab" data-f="{i}" aria-pressed="false">{escape(p.name.split(" - ")[0])}</button>'
                   for i, p in enumerate(pages))
    cards = []
    for i, (p, f, svg) in enumerate(zip(pages, files, svgs)):
        v2cls = ' class="v2"'
        notes = "".join(f"<li{v2cls if t.startswith('v2') else ''}><b>{n}</b> {escape(t.replace(chr(10), ' '))}</li>"
                        for n, t in p.note_items)
        watch = f'<p class="watch">Redraws on: <code>{escape(p.watch)}</code></p>' if p.watch else ""
        inline = svg.replace('id="ah"', f'id="ah{i}"').replace("url(#ah)", f"url(#ah{i})").replace("<svg ", f'<svg role="img" aria-labelledby="wt{i}" ', 1).replace("<title>", f'<title id="wt{i}">', 1)
        cards.append(f"""<section class="card" data-i="{i}" aria-labelledby="h{i}">
<div class="head"><div><h2 id="h{i}">{escape(p.title)}</h2><p class="sub">{escape(p.subtitle)}</p></div>
<div class="btns"><button type="button" data-act="copy" data-i="{i}">Copy SVG</button>
<button type="button" data-act="svg" data-i="{i}">Download SVG</button>
<button type="button" data-act="png" data-i="{i}" class="primary">Download PNG 2x</button></div></div>
<div class="wf">{inline}</div>{watch}<ol class="notes">{notes}</ol></section>""")
    names = json.dumps(files)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Outside the Car - wireframes v2</title>
<style>
body{{margin:0;font:15px/1.5 Inter,system-ui,sans-serif;color:#1F2328;background:#F6F6F4}}
header{{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #DCDCDC;padding:10px 24px}}
header h1{{font:700 18px Georgia,serif;margin:0 0 6px}} header p{{margin:0 0 8px;font-size:13px;color:#454545}}
.tabs{{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}}
button{{font:inherit;font-size:13px;border:1px solid #BDBDBD;background:#fff;color:#1F2328;border-radius:999px;padding:4px 12px;cursor:pointer;white-space:nowrap}}
button:hover{{border-color:#1F2328}} button[aria-pressed="true"],button.primary{{background:#1F2328;color:#fff;border-color:#1F2328}}
button:focus-visible{{outline:3px solid #1F2328;outline-offset:2px;box-shadow:0 0 0 6px #F2B705}}
main{{max-width:1120px;margin:0 auto;padding:20px 24px}}
.card{{background:#fff;border:1px solid #DCDCDC;border-radius:12px;padding:14px;margin-bottom:24px}}
.head{{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-bottom:10px}}
h2{{font-size:16px;margin:0}} .sub{{margin:2px 0 0;font-size:13px;color:#454545}} .btns{{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start}}
.wf svg{{width:100%;height:auto;display:block;border:1px solid #EDEDED;border-radius:8px}}
.watch{{font-size:13px;margin:10px 0 0}} code{{background:#F0F0F0;padding:1px 5px;border-radius:4px}}
.notes{{list-style:none;padding:0;margin:10px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:6px}}
.notes li{{font-size:13px;color:#454545;background:#F6F6F4;border-radius:8px;padding:6px 10px}}
.notes li b{{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#F2B705;border:1px solid #1F2328;color:#1F2328;font-size:11px;margin-right:6px}}
.notes li.v2{{color:#1F2328;border-left:4px solid #F2B705}}
#toast{{position:fixed;right:16px;bottom:16px;background:#1F2328;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .2s}}
#toast.on{{opacity:1}}
</style></head>
<body><header><h1>Outside the Car - wireframes (web_proto_v2)</h1>
<p>Generated by <code>build_wireframes.py</code>; editable copy in <code>wireframes.drawio</code>. Notes marked v2 (yellow edge) are new in this version. SVG/PNG drop straight into Canva, Figma or the Design Book.</p>
<div class="tabs" role="group" aria-label="Show wireframe"><button type="button" class="tab" data-f="all" aria-pressed="true">All ({len(pages)})</button>{tabs}</div></header>
<main>{"".join(cards)}</main><div id="toast" role="status" aria-live="polite"></div>
<script>
const FILES = {names};
const toast = (m) => {{ const t = document.getElementById("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2200); }};
const svgText = (i) => '<?xml version="1.0" encoding="UTF-8"?>\\n' + new XMLSerializer().serializeToString(document.querySelector(`.card[data-i="${{i}}"] svg`));
const save = (blob, name) => {{ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }};
function png(i) {{
  const svg = document.querySelector(`.card[data-i="${{i}}"] svg`), vb = svg.viewBox.baseVal, k = 2;
  const img = new Image(), url = URL.createObjectURL(new Blob([svgText(i)], {{ type: "image/svg+xml" }}));
  img.onload = () => {{ const c = document.createElement("canvas"); c.width = vb.width * k; c.height = vb.height * k;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); c.toBlob((b) => {{ save(b, FILES[i].replace(".svg", "@2x.png")); toast("PNG saved: " + FILES[i].replace(".svg", "@2x.png")); }}); }};
  img.src = url;
}}
document.addEventListener("click", async (e) => {{
  const b = e.target.closest("button"); if (!b) return;
  if (b.classList.contains("tab")) {{
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-pressed", t === b));
    document.querySelectorAll(".card").forEach((c) => {{ c.hidden = b.dataset.f !== "all" && c.dataset.i !== b.dataset.f; }});
    return;
  }}
  const i = b.dataset.i;
  if (b.dataset.act === "svg") {{ save(new Blob([svgText(i)], {{ type: "image/svg+xml" }}), FILES[i]); toast("SVG saved: " + FILES[i]); }}
  if (b.dataset.act === "png") png(i);
  if (b.dataset.act === "copy") {{ try {{ await navigator.clipboard.writeText(svgText(i)); toast("SVG copied: paste into Figma or Canva"); }} catch {{ toast("Clipboard blocked: use Download SVG"); }} }}
}});
</script></body></html>"""


def main():
    pages = [overview_desktop(), overview_phone(), ward(), trend(), severity(), counterparty(),
             age(), season(), state_map(), roles(), summary(), a11y_layer(), references_page()]
    svg_dir = os.path.join(HERE, "svg")
    os.makedirs(svg_dir, exist_ok=True)
    for f in os.listdir(svg_dir):
        if f.endswith(".svg"):
            os.remove(os.path.join(svg_dir, f))
    files, svgs = [], []
    for p in pages:
        fn = p.name.split(" ")[0] + "-" + p.name.split(" - ")[-1].lower().replace(" ", "-").replace("+", "and") + ".svg"
        files.append(fn)
        svgs.append(to_svg(p))
        with open(os.path.join(svg_dir, fn), "w", encoding="utf-8") as f:
            f.write(svgs[-1])
    with open(os.path.join(HERE, "wireframes.drawio"), "w", encoding="utf-8") as f:
        f.write('<mxfile host="build_wireframes.py" type="device">'
                + "".join(to_drawio_page(p, i) for i, p in enumerate(pages)) + "</mxfile>")
    with open(os.path.join(HERE, "index.html"), "w", encoding="utf-8") as f:
        f.write(gallery(pages, files, svgs))
    print(f"{len(pages)} pages -> wireframes.drawio + svg/ + index.html")


if __name__ == "__main__":
    main()

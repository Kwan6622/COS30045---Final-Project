"""
build_wireframes.py — writes the "Outside the Car" wireframes in two formats
from one description, so they always match:

  wireframes.drawio   one page per wireframe; open in diagrams.net (draw.io)
                      and edit every box, line and label
  svg/NN-name.svg     one SVG per wireframe; upload to Canva (or Figma,
                      PowerPoint, draw.io: File > Import) or put in the Design Book

Run:  python docs/wireframes/web_proto_v1/build_wireframes.py   (from the repo root)
Numbers in the sketches are the prototype's values, rounded; wireframes are
greyscale on purpose, yellow = the highlight/annotation colour of palette v2.

GenAI acknowledgement: drafted with Claude (Anthropic), reviewed by the team.
"""
import csv
import os
from xml.sax.saxutils import escape, quoteattr

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "web_proto_v1", "data")   # the prototype's CSVs

# Wireframe greys (dark = pedestrian-like, light = cyclist-like) + palette yellow
INK, G1, G2, G3, G4, G5, PAPER = "#1F2328", "#4A4A4A", "#7A7A7A", "#A8A8A8", "#D4D4D4", "#EFEFEF", "#FFFFFF"
YEL = "#F2B705"
FONT = "Helvetica"
W, H = 1040, 680          # page size


class Page:
    def __init__(self, name, title, subtitle=""):
        self.name, self.items = name, []
        self.text(20, 14, 900, 26, title, fs=20, bold=True, align="left")
        if subtitle:
            self.text(20, 40, 900, 18, subtitle, fs=12, color=G2, align="left")

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

    # widgets -----------------------------------------------------------
    def badge(self, x, y, n):
        """Numbered yellow marker that points to a note."""
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

    def notes(self, items, x=730, y=70, w=290):
        """Right-hand panel: numbered notes on encoding and interaction."""
        h = 34 + sum(18 * (1 + t.count("\n")) + 10 for _, t in items)
        self.rect(x, y, w, h, fill=G5, stroke=G4, r=8)
        self.text(x + 12, y + 8, w - 24, 20, "Notes", fs=13, bold=True, align="left")
        cy = y + 38
        for n, t in items:
            lines = 1 + t.count("\n")
            self.badge(x + 22, cy + 8, n)
            self.text(x + 40, cy - 1, w - 50, 18 * lines, t, fs=11, align="left", valign="top", color=G1)
            cy += 18 * lines + 10

    def legend(self, x, y, entries):
        for label, fill, dash in entries:
            if dash is None:
                self.rect(x, y + 3, 12, 12, fill=fill, stroke="none", r=2)
            else:
                self.line([(x, y + 9), (x + 18, y + 9)], stroke=fill, sw=2.5, dash=dash or None)
            self.text(x + 22, y, 8 * len(label), 18, label, fs=11, color=G1, align="left")
            x += 34 + 6.4 * len(label)

    def axes(self, x0, y0, x1, y1, xticks, yticks, ylabel=""):
        """xticks/yticks: [(position, label)]; draws gridlines + labels."""
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
            style = (f"rounded={1 if it['r'] else 0};arcSize={min(50, it['r'] * 100 / max(1, min(it['w'], it['h'])) ):.0f};"
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
            dash = f"dashed=1;dashPattern={it['dash'].replace(' ', ' ')};" if it["dash"] else "dashed=0;"
            style = (f"endArrow={'block' if it['arrow'] else 'none'};endFill=1;html=1;rounded=0;"
                     f"strokeColor={it['stroke']};strokeWidth={it['sw']};{dash}")
            mids = "".join(f'<mxPoint x="{x:.1f}" y="{y:.1f}"/>' for x, y in pts[1:-1])
            arr = f'<Array as="points">{mids}</Array>' if mids else ""
            cells.append(f'<mxCell id="{cid}" value="" style="{style}" edge="1" parent="1">'
                         f'<mxGeometry relative="1" as="geometry">'
                         f'<mxPoint x="{pts[0][0]:.1f}" y="{pts[0][1]:.1f}" as="sourcePoint"/>'
                         f'<mxPoint x="{pts[-1][0]:.1f}" y="{pts[-1][1]:.1f}" as="targetPoint"/>{arr}'
                         f'</mxGeometry></mxCell>')
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


def overview_desktop():
    p = Page("01 Overview - desktop", "Overview: one scrolling page (desktop, 900 px and wider)",
             "Header stays on top; the side arrows stay on the right; every chapter = message + chart + insight/action.")
    x, w = 20, 680
    # header
    p.rect(x, 70, w, 44, fill=G5, stroke=G3, r=6)
    p.text(x + 10, 76, 150, 32, "Outside the Car", fs=16, bold=True, align="left")
    p.line([(x + 98, 103), (x + 132, 103)], stroke=YEL, sw=4)
    p.rect(x + 175, 78, 300, 28, stroke=G3, r=14, text="Start  1 Who  2 How badly  3 …  7 Sources", fs=11, color=G1)
    p.rect(x + 490, 80, 60, 24, r=12, text="Dark", fs=11)
    p.rect(x + 558, 80, 112, 24, r=12, text="Colour vision ▾", fs=11)
    p.line([(x, 118), (x + 260, 118)], stroke=YEL, sw=3)
    p.badge(x + 170, 74, 1); p.badge(x + 488, 76, 2); p.badge(x + 262, 118, 3)
    # sections
    y = 128
    secs = [("Start - title, lede, bed pictogram, insight + action", 70),
            ("Ch1 Who - sticky line chart | 5 message cards (scrollytelling)", 80),
            ("Ch2 How badly - chips, dot plot, 100% stacked bars, insight", 56),
            ("Ch3 Age - chips, bar chart by age, insight", 48),
            ("Ch4 When & where - month line chart; tile map | state detail", 62),
            ("Ch5 What you can do - role buttons -> action panel", 48),
            ("Summary - 5 cards: finding + action + Revisit", 40),
            ("Sources - APA references, limitations", 30)]
    for lab, h in secs:
        p.rect(x + 10, y, w - 70, h, stroke=G3, dash=True, r=6, text=lab, fs=11, color=G1, align="left", valign="top")
        y += h + 8
    # ch1 detail
    p.rect(x + 20, 230, 360, 50, fill=G5, stroke=G3, r=4, text="chart stays pinned", fs=10, color=G2)
    p.rect(x + 390, 230, 230, 22, stroke=YEL, sw=2, r=4, text="active message", fs=10)
    p.rect(x + 390, 258, 230, 22, stroke=G4, r=4, text="next message", fs=10, color=G2)
    p.badge(x + 630, 236, 4)
    # side nav
    p.rect(x + w - 46, 330, 38, 80, r=19, stroke=G3)
    p.circle(x + w - 27, 352, 13, stroke=G3); p.text(x + w - 40, 342, 26, 20, "↑", fs=13)
    p.circle(x + w - 27, 388, 13, stroke=INK); p.text(x + w - 40, 378, 26, 20, "↓", fs=13)
    p.badge(x + w - 50, 330, 5)
    p.notes([(1, "Stepper in its own frame: click a\nchapter name to jump there"),
             (2, "Light/dark switch + colour-vision\npreview (remembered)"),
             (3, "Yellow progress bar = how far\nthrough the story"),
             (4, "Ch1: chart pinned, each message\nchanges what the chart shows"),
             (5, "Arrow buttons / ← → keys: next or\nprevious part (each Ch1 message,\nthen each chapter)")], y=70)
    return p


def overview_phone():
    p = Page("02 Overview - phone", "Overview: phone (760 px and narrower)",
             "Same order as desktop; one column; header on two rows; arrow buttons move to the bottom-right corner.")
    x, y, w, h = 120, 70, 300, 590
    p.rect(x, y, w, h, stroke=INK, sw=2, r=26)
    p.rect(x + 12, y + 16, w - 24, 62, fill=G5, stroke=G3, r=8)
    p.text(x + 22, y + 20, 200, 22, "Outside the Car", fs=15, bold=True, align="left")
    p.rect(x + 20, y + 46, 160, 24, r=12, text="★ 1 Who 2 3 4", fs=10)
    p.rect(x + 186, y + 46, 30, 24, r=12, text="☾", fs=11)
    p.rect(x + 222, y + 46, 60, 24, r=12, text="CVD ▾", fs=10)
    p.badge(x + 290, y + 22, 1)
    p.rect(x + 12, y + 88, w - 24, 200, fill=G5, stroke=G3, r=8, text="pinned chart\n(300 px tall on phones)", fs=11, color=G2)
    p.badge(x + 290, y + 96, 2)
    p.rect(x + 12, y + 300, w - 24, 90, stroke=YEL, sw=2, r=8,
           text="active message card\n(others hidden so they never\ncover the chart)", fs=11)
    p.badge(x + 290, y + 306, 3)
    p.rect(x + 12, y + 402, w - 24, 50, stroke=G3, dash=True, r=8, text="charts and insight boxes stack", fs=11, color=G1)
    p.rect(x + 12, y + 462, w - 24, 50, stroke=G3, dash=True, r=8, text="tile map above state detail", fs=11, color=G1)
    p.rect(x + w - 104, y + h - 62, 88, 46, r=23, stroke=G3)
    p.circle(x + w - 82, y + h - 39, 16, stroke=G3); p.text(x + w - 92, y + h - 49, 20, 20, "↑", fs=13)
    p.circle(x + w - 38, y + h - 39, 16, stroke=INK); p.text(x + w - 48, y + h - 49, 20, 20, "↓", fs=13)
    p.badge(x + w - 108, y + h - 64, 4)
    p.notes([(1, "Title on row 1; chapters + theme +\ncolour-vision on row 2"),
             (2, "Chapter 1 chart pinned under the\nheader, shorter so the card fits"),
             (3, "Message card sits low, above the\narrow buttons"),
             (4, "Arrow buttons bottom-right\n(40 px targets)")], x=480, y=70)
    return p


def ward():
    p = Page("03 Opening - bed pictogram", "Opening: \"Every day, 120 hospital beds…\" - unit pictogram",
             "One icon = one hospital bed filled every day, 2011-2021 (bed days ÷ 4,018 days). Greyscale wireframe: dark = pedestrians, light = cyclists.")
    p.card(20, 70, 690, 330, "One icon = one hospital bed filled every day (average, 2011-2021)")
    p.legend(34, 100, [("Pedestrians", G1, None), ("Cyclists", G3, None)])
    with open(os.path.join(DATA, "severity.csv"), newline="", encoding="utf-8") as f:
        bed = {r["group"]: float(r["bed"]) for r in csv.DictReader(f)}
    n_ped, n_cyc = round(bed["Pedestrian"] / 4018), round(bed["Pedal cyclist"] / 4018)
    n = n_ped + n_cyc
    for i in range(n):
        cx, cy = 40 + (i % 20) * 32, 132 + (i // 20) * 34
        fill = G1 if i < n_ped else G3
        p.rect(cx, cy + 8, 24, 8, fill=fill, stroke="none", r=1)
        p.rect(cx, cy, 5, 16, fill=fill, stroke="none", r=1)
    p.badge(28, 132, 1)
    p.rect(330, 196, 150, 50, fill=PAPER, stroke=G2, r=6, text=f"Pedestrians\n{n_ped} beds every day", fs=11)
    p.badge(484, 196, 2)
    p.text(34, 345, 660, 18, "Days in hospital from road-crash admissions ÷ 4,018 days. Source: (BITRE, 2023).", fs=10, color=G2, align="left")
    p.rect(20, 420, 340, 110, stroke=G3, r=8, text="WHAT IT MEANS\none sentence + one key number", fs=11, color=G1)
    p.rect(370, 420, 340, 110, fill=G5, stroke=G3, r=8, text="WHAT IS BEING DONE\nofficial target or action + citation", fs=11, color=G1)
    p.badge(28, 420, 3)
    p.notes([(1, "Icons fill in one by one the first\ntime the opening is on screen\n(instant with reduced motion)"),
             (2, "Hover / focus an icon: tooltip with\ngroup, beds per day, bed days"),
             (3, "Insight + action boxes repeat in\nevery chapter")])
    return p


TREND = {"Pedal cyclist": [96, 100, 111, 118, 120, 123, 126, 124, 130, 148, 146],
         "Pedestrian": [103, 100, 99, 96, 99, 103, 102, 100, 102, 79, 87],
         "Motorcyclist": [98, 100, 104, 108, 108, 111, 113, 112, 115, 112, 115],
         "Car occupant": [101, 100, 101, 100, 108, 116, 117, 120, 117, 105, 113]}


def trend():
    p = Page("04 Ch1 Who - trend line chart", "Chapter 1 \"Who\": scrollytelling line chart",
             "Hospital admissions per year by road user, 2011-2021. Default view: change since 2012 (2012 = 100).")
    p.card(20, 70, 470, 420, "Hospital admissions after road crashes, by road user")
    x0, x1, y0, y1 = 70, 390, 120, 400
    X = lambda i: scale(i, 0, 10, x0, x1)
    Y = lambda v: scale(v, 60, 160, y1, y0)
    p.rect(X(8.5), y0, X(10) - X(8.5), y1 - y0, fill=G5, stroke="none", r=0)
    p.text(X(8.5), y0 - 16, X(10) - X(8.5), 14, "COVID", fs=10, color=G2)
    p.axes(x0, y0, x1, y1, [(X(i), str(2011 + i)) for i in range(0, 11, 2)],
           [(Y(v), str(v)) for v in range(60, 161, 20)])
    p.line([(x0, Y(100)), (x1, Y(100))], stroke=G2, sw=1)
    p.line([(X(6), y0), (X(6), y1)], stroke=G2, sw=1, dash="2 3")
    p.text(X(6) + 4, y0 + 2, 120, 14, "NSW counting change", fs=10, color=G2, align="left")
    styles = {"Pedal cyclist": (G2, None, 2.5), "Pedestrian": (INK, None, 2.5),
              "Motorcyclist": (G3, None, 1.5), "Car occupant": (G3, "6 4", 1.5)}
    names = {"Pedal cyclist": "Cyclists", "Pedestrian": "Pedestrians", "Motorcyclist": "Motorcyclists", "Car occupant": "Car occupants"}
    for g, vals in TREND.items():
        c, d, sw = styles[g]
        p.line([(X(i), Y(v)) for i, v in enumerate(vals)], stroke=c, sw=sw, dash=d)
        off = {"Motorcyclist": -7, "Car occupant": 7}.get(g, 0)
        p.text(x1 + 6, Y(vals[-1]) - 8 + off, 90, 16, names[g], fs=10, bold=True, align="left")
    for g, lab, dy in (("Pedal cyclist", "+30% 2012-19", -22), ("Pedestrian", "+2% 2012-19", -22)):
        v = TREND[g][8]
        p.circle(X(8), Y(v), 6, fill="none", stroke=YEL, sw=3)
        p.text(X(8) - 110, Y(v) + dy, 100, 16, lab, fs=10, bold=True, align="right")
    p.chip(34, 430, "Change since 2012", True); p.chip(160, 430, "Number of admissions")
    p.text(34, 462, 440, 16, "Other road users (4%) not shown. Source: (BITRE, 2023).", fs=10, color=G2, align="left")
    p.badge(X(8) + 14, Y(130), 1); p.badge(30, 443, 2); p.badge(x1 + 2, Y(146) - 18, 3)
    # message column
    p.text(510, 70, 200, 18, "Message cards scroll past", fs=11, bold=True, color=G1, align="left")
    msgs = ["1  How to read: 2012 = 100", "2  Cyclists +30% (others fade)", "3  Pedestrians +2%",
            "4  Count view: pedestrians more", "5  COVID dip, then back up"]
    for i, m in enumerate(msgs):
        p.rect(510, 96 + i * 62, 200, 50, stroke=YEL if i == 1 else G4, sw=3 if i == 1 else 1, r=6,
               text=m, fs=10, color=INK if i == 1 else G2, align="left")
    p.badge(712, 121, 4)
    p.notes([(1, "Yellow rings + labels: the 2012->19\nchange the text talks about"),
             (2, "Chips: index (growth) or counts"),
             (3, "Direct labels, no legend; car\noccupants dashed grey"),
             (4, "Each card sets trendMode /\ntrendFocus; other lines fade to\n18 % so the eye follows the text"),
             (5, "Hover: tooltip with year and value\nfor every road user")], x=730, y=96)
    return p


def severity():
    p = Page("05 Ch2 How badly - dot plot", "Chapter 2 \"How badly\": Cleveland dot plot",
             "One dot per road user, sorted by the chosen measure; dotted line = average for all road users.")
    x = p.chip(20, 70, "Days in hospital", True); x = p.chip(x, 70, "Died within 30 days")
    p.chip(x, 70, "Share of beds vs share of patients")
    p.badge(16, 70, 1)
    p.card(20, 110, 690, 330, "How badly each road user is hurt, 2011-2021")
    x0, x1 = 150, 650
    X = lambda v: scale(v, 0, 10, x0, x1)
    rows = [("Pedestrians", 9.1, INK, None, 9), ("Motorcyclists", 5.4, G3, None, 6),
            ("Car occupants", 4.7, G3, "6 4", 6), ("Cyclists", 2.9, G2, None, 9)]
    ys = [175, 230, 285, 340]
    p.axes(x0, 160, x1, 370, [(X(v), str(v)) for v in range(0, 11, 2)], [])
    for (lab, v, c, d, r), y in zip(rows, ys):
        p.text(40, y - 9, 104, 18, lab, fs=11, align="right", color=G1)
        p.line([(x0, y), (X(v), y)], stroke=c, sw=2, dash=d)
        p.circle(X(v), y, r, fill=c, stroke=c)
        p.text(X(v) + 12, y - 9, 70, 18, f"{v} days", fs=11, bold=r == 9, align="left")
    p.line([(X(4.9), 150), (X(4.9), 370)], stroke=G2, sw=1, dash="2 3")
    p.text(X(4.9) + 4, 140, 160, 14, "all road users 4.9 days", fs=10, color=G2, align="left")
    p.badge(X(4.9) - 12, 150, 2); p.badge(X(9.1) + 80, 175, 3)
    p.text(34, 400, 660, 16, "Days in hospital leave out patients who died within 30 days. Source: (BITRE, 2023).", fs=10, color=G2, align="left")
    p.rect(20, 460, 690, 60, stroke=G3, dash=True, r=8, text="then: 100% stacked bars - what they collided with (next page)", fs=11, color=G2)
    p.notes([(1, "Measure chips re-sort the rows\n(animated; instant with reduced\nmotion)"),
             (2, "Reference line = all road users,\nincluding the small \"other\" group"),
             (3, "Pedestrians and cyclists: bigger\ndots and bold values"),
             (4, "Hover: tooltip with all three\nmeasures for that road user")])
    return p


def counterparty():
    p = Page("06 Ch2 How badly - stacked bars", "Chapter 2 \"How badly\": what they collided with",
             "100% stacked bars, one per group. Categories are not road users, so they use greys; the two that carry the story are darkest and labelled.")
    rows = {}
    with open(os.path.join(DATA, "counterparty.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.setdefault(r["group"], {})[r["cp"]] = float(r["share"])
    cats = ["Car, pick-up truck or van", "No collision (e.g. fall)", "Fixed object",
            "Heavy vehicle or bus", "Motorcycle", "Other"]
    shades = [INK, G1, G2, G3, G4, G5]
    p.card(20, 70, 690, 300, "What injured pedestrians and cyclists collided with, 2011-2021")
    x0, x1 = 130, 680
    for gi, (g, lab) in enumerate((("Pedestrian", "Pedestrians"), ("Pedal cyclist", "Cyclists"))):
        y = 120 + gi * 80
        p.text(30, y + 6, 94, 24, lab, fs=12, bold=True, align="right")
        x = x0
        for c, s in zip(cats, shades):
            v = rows.get(g, {}).get(c, 0)
            if not v:
                continue
            w = v * (x1 - x0)
            p.rect(x, y, w, 36, fill=s, stroke=PAPER, sw=1, r=0,
                   text=f"{v:.0%}" if v >= 0.08 else "", fs=11, bold=True, color=PAPER if s in (INK, G1, G2) else INK)
            x += w
    p.badge(x0 + 6, 116, 1)
    lx, ly = 40, 290
    for c, s in zip(cats, shades):
        p.rect(lx, ly + 3, 12, 12, fill=s, stroke=G3, r=2)
        p.text(lx + 16, ly, 170, 18, c, fs=10, color=G1, align="left")
        lx += 220
        if lx > 600:
            lx, ly = 40, ly + 22
    p.badge(30, 290, 2)
    p.rect(20, 390, 690, 110, stroke=G3, r=8, text="WHAT IT MEANS  |  WHAT CAN BE DONE\n(insight + official action, with citations)", fs=11, color=G1)
    p.notes([(1, "Percentages written inside the\nsegments that are wide enough"),
             (2, "Legend in reading order; wording\n\"collided with\", never \"hit by\""),
             (3, "Hover a segment: category,\nshare and number of admissions")])
    return p


AGES = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
AGE_LOS = [4.1, 4.6, 6.2, 7.3, 10.3, 13.4, 15.8]


def age():
    p = Page("07 Ch3 Age - bar chart", "Chapter 3 \"Age\": bar chart by age group",
             "Two chip rows: road user, then measure. The 75+ bar is the full colour and underlined in yellow; other ages use a lighter step.")
    x = p.chip(20, 70, "Pedestrians", True); p.chip(x, 70, "Cyclists")
    x = p.chip(20, 104, "Days in hospital", True); x = p.chip(x, 104, "Died within 30 days"); p.chip(x, 104, "Per 100,000 people")
    p.badge(16, 70, 1)
    p.card(20, 144, 690, 380, "Pedestrians: average days in hospital, by age group (2011-2021)")
    x0, x1, y0, y1 = 80, 690, 200, 470
    Y = lambda v: scale(v, 0, 16, y1, y0)
    p.axes(x0, y0, x1, y1, [], [(Y(v), str(v)) for v in (0, 5, 10, 15)], "Average days in hospital")
    bw, gap = 66, 20
    for i, (a, v) in enumerate(zip(AGES, AGE_LOS)):
        bx = x0 + 18 + i * (bw + gap)
        last = i == len(AGES) - 1
        p.rect(bx, Y(v), bw, y1 - Y(v), fill=INK if last else G3, stroke="none", r=0)
        p.text(bx - 6, Y(v) - 18, bw + 12, 16, f"{v} d", fs=10, bold=last)
        p.text(bx - 6, y1 + 4, bw + 12, 16, a, fs=10, color=G1)
        if last:
            p.line([(bx, y1 + 24), (bx + bw, y1 + 24)], stroke=YEL, sw=4)
            p.badge(bx + bw + 12, Y(v) + 10, 2)
    p.text(34, 500, 660, 16, "Per 100,000 uses ABS population; \"≈\" = estimate where age bands differ. (ABS, 2026)", fs=10, color=G2, align="left")
    p.notes([(1, "Road-user chips and measure\nchips combine (2 x 3 views)"),
             (2, "75+ highlighted: full colour +\nyellow underline; others lighter"),
             (3, "Value labels on every bar;\n\"≈\" marks estimates"),
             (4, "Hover: age group, value, and\nnumber of admissions")])
    return p


SEASON = {"Pedal cyclist": [1.11, 1.09, 1.20, 1.06, 0.98, 0.80, 0.77, 0.82, 0.91, 1.13, 1.08, 1.07],
          "Pedestrian": [0.79, 0.87, 1.03, 1.00, 1.15, 1.15, 1.13, 1.09, 0.94, 1.00, 0.93, 0.93]}


def season():
    p = Page("08 Ch4 When - month line chart", "Chapter 4 \"When & where\" (a): month of the year",
             "Each month ÷ the average month (1.0 = typical), 2011-2019 so COVID lockdowns do not distort the shape.")
    p.card(20, 70, 690, 380, "Each month compared with an average month, 2011-2019")
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
    for g, c, lab in (("Pedal cyclist", G2, "Cyclists"), ("Pedestrian", INK, "Pedestrians")):
        vals = SEASON[g]
        p.line([(X(i), Y(v)) for i, v in enumerate(vals)], stroke=c, sw=2.5)
        for i, v in enumerate(vals):
            p.circle(X(i), Y(v), 3, fill=c, stroke=c, sw=1)
        p.text(x1 + 8, Y(vals[-1]) - 8, 90, 16, lab, fs=11, bold=True, align="left")
        k = vals.index(max(vals))
        p.circle(X(k), Y(vals[k]), 8, fill="none", stroke=YEL, sw=3)
    p.badge(X(2) + 16, Y(1.2) - 14, 1); p.badge(X(6), y0 + 14, 2)
    p.text(34, 425, 660, 16, "2020-21 left out (COVID). The data records the month, not the time of day.", fs=10, color=G2, align="left")
    p.notes([(1, "Yellow rings: each group's worst\nmonth (cyclists March, pedestrians\nMay-June)"),
             (2, "Winter shaded: pedestrians up,\ncyclists down"),
             (3, "Direct labels; points on every\nmonth for hover targets"),
             (4, "Hover: month, index and average\nadmissions that month")])
    return p


def state_map():
    p = Page("09 Ch4 Where - tile map + detail", "Chapter 4 \"When & where\" (b): states, linked views",
             "Equal-area tile map shaded per 100,000 people (5-step ramp); clicking a state updates the line chart beside it.")
    x = p.chip(20, 70, "Pedestrians", True); p.chip(x, 70, "Cyclists")
    p.badge(16, 70, 1)
    p.card(20, 110, 340, 420, "Admissions per 100,000 people per year")
    tiles = {"NT": (1, 0, 4), "Qld": (2, 0, 2), "WA": (0, 1, 2), "SA": (1, 1, 1), "NSW": (2, 1, 2),
             "ACT": (3, 1, 0), "Vic": (2, 2, 1), "Tas": (2, 3, 0)}
    ramp = [G5, G4, G3, G2, INK]
    for s, (c, r, k) in tiles.items():
        tx, ty = 50 + c * 72, 160 + r * 72
        p.rect(tx, ty, 66, 66, fill=ramp[k], stroke=YEL if s == "NT" else PAPER, sw=4 if s == "NT" else 2, r=4,
               text=s, fs=12, bold=True, color=PAPER if k >= 3 else INK)
    p.badge(118, 156, 2)
    for i, s in enumerate(ramp):
        p.rect(40 + i * 60, 470, 56, 14, fill=s, stroke=G3, r=0)
        p.text(36 + i * 60, 486, 64, 14, ["low", "", "", "", "high"][i] or f"class {i + 1}", fs=9, color=G2)
    p.badge(30, 470, 3)
    p.card(370, 110, 340, 420, "NT vs Australia, pedestrians per 100,000")
    x0, x1, y0, y1 = 410, 690, 170, 460
    X = lambda i: scale(i, 0, 10, x0, x1)
    p.axes(x0, y0, x1, y1, [(X(i), str(2011 + i)) for i in range(0, 11, 5)], [(y0 + k * 72, "") for k in range(5)])
    nt = [38, 42, 40, 36, 44, 41, 39, 43, 37, 33, 35]
    au = [20, 20, 19, 19, 20, 20, 20, 19, 19, 15, 17]
    Yv = lambda v: scale(v, 0, 50, y1, y0)
    p.line([(X(i), Yv(v)) for i, v in enumerate(nt)], stroke=INK, sw=2.5)
    p.line([(X(i), Yv(v)) for i, v in enumerate(au)], stroke=G3, sw=2, dash="6 4")
    p.text(X(10) - 70, Yv(nt[-1]) - 22, 70, 14, "NT", fs=11, bold=True, align="right")
    p.text(X(0), Yv(au[0]) - 20, 90, 14, "Australia", fs=11, color=G1, align="left")
    p.badge(x1 - 6, y0 - 6, 4)
    p.text(30, 545, 680, 16, "Sketch values. Source: BITRE admissions ÷ ABS population.", fs=10, color=G2, align="left")
    p.notes([(1, "Road-user chips switch the ramp\nand the detail chart together"),
             (2, "Click or Enter on a tile selects the\nstate (yellow outline); tiles are\nkeyboard focusable"),
             (3, "Legend shows the 5 class limits\n(rates per 100,000)"),
             (4, "Linked line chart: selected state\n(solid) vs Australia (dashed)"),
             (5, "Hover a tile: state, rate,\nadmissions")])
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
    for i, t in enumerate(("Pedestrians stay\n9.1 days in hospital", "88% of injured\npedestrians collided\nwith a car or van", "Cyclist injuries\nup 30% 2012-19")):
        p.rect(36 + i * 220, 196, 206, 64, fill=G5, stroke="none", r=8, text=t, fs=11)
    p.badge(36, 196, 2)
    p.text(36, 276, 300, 18, "What you can do", fs=12, bold=True, align="left")
    for i in range(3):
        p.line([(46, 308 + i * 30), (52, 308 + i * 30)], stroke=INK, sw=4)
        p.rect(62, 300 + i * 30, 470, 14, fill=G5, stroke="none", r=3)
        p.rect(540, 299 + i * 30, 120, 16, stroke=G3, r=8, text="(Source, year)", fs=9, color=G2)
    p.badge(676, 306, 3)
    p.text(36, 396, 300, 18, "Extra protection", fs=12, bold=True, align="left", color=G1)
    for i in range(2):
        p.rect(62, 424 + i * 30, 470, 14, fill=G5, stroke="none", r=3)
    p.badge(30, 396, 4)
    p.notes([(1, "Four role buttons (aria-pressed);\nchoice also kept in app state"),
             (2, "Numbers from earlier chapters\nthat matter for this role"),
             (3, "Actions in Safe System order\n(system and drivers first), each\nwith an APA citation"),
             (4, "Self-protection tips labelled\n\"extra protection\" so they don't\nread as victim-blaming")])
    return p


def summary():
    p = Page("11 Summary - revisit cards", "Summary: one finding and one action per chapter",
             "Five cards; Revisit jumps back to that chapter (same as the stepper).")
    for i, (t, a) in enumerate((("1 · Who", "Cyclist injuries +30%"), ("2 · How badly", "Pedestrians 9.1 days"),
                                ("3 · Age", "75+ stay 15.8 days"), ("4 · When & where", "Winter, NT highest"),
                                ("5 · What you can do", "Act by role"))):
        cx, cy = 20 + (i % 3) * 232, 76 + (i // 3) * 200
        p.rect(cx, cy, 222, 186, stroke=G3, r=10)
        p.text(cx + 12, cy + 10, 200, 16, t, fs=11, bold=True, color=G1, align="left")
        p.text(cx + 12, cy + 34, 200, 20, a, fs=13, bold=True, align="left")
        p.rect(cx + 12, cy + 64, 198, 10, fill=G5, stroke="none", r=3)
        p.rect(cx + 12, cy + 82, 160, 10, fill=G5, stroke="none", r=3)
        p.text(cx + 12, cy + 100, 200, 16, "Action:", fs=10, bold=True, color=G1, align="left")
        p.rect(cx + 12, cy + 120, 190, 10, fill=G5, stroke="none", r=3)
        p.rect(cx + 12, cy + 146, 130, 28, stroke=INK, r=14, text=f"Revisit chapter {i + 1}", fs=10)
    p.badge(30, 230, 1)
    p.notes([(1, "Revisit = smooth scroll to the\nchapter start (instant with\nreduced motion)"),
             (2, "Cards wrap to 1 column on phones"),
             (3, "Sources section follows: full APA\nlist + data limitations")])
    return p


def main():
    pages = [overview_desktop(), overview_phone(), ward(), trend(), severity(), counterparty(),
             age(), season(), state_map(), roles(), summary()]
    os.makedirs(os.path.join(HERE, "svg"), exist_ok=True)
    for p in pages:
        fn = p.name.split(" ")[0] + "-" + p.name.split(" - ")[-1].lower().replace(" ", "-").replace("+", "and") + ".svg"
        with open(os.path.join(HERE, "svg", fn), "w", encoding="utf-8") as f:
            f.write(to_svg(p))
    with open(os.path.join(HERE, "wireframes.drawio"), "w", encoding="utf-8") as f:
        f.write('<mxfile host="build_wireframes.py" type="device">'
                + "".join(to_drawio_page(p, i) for i, p in enumerate(pages)) + "</mxfile>")
    print(f"{len(pages)} pages -> wireframes.drawio + svg/")


if __name__ == "__main__":
    main()

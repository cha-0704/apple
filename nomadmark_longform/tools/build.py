"""script.json(+ timings.json) → HyperFrames 컴포지션(index.html) 생성.

  python tools/build.py projects/compound_interest --style infographic
  python tools/build.py projects/compound_interest --style collage --speed 1.2

<project>/<style>/timings.json 이 있으면(= tts_supertonic.py 실행 후) 실제 음성 길이로 싱크,
없으면 글자 수로 길이를 추정해 무음 미리보기용으로 만든다.
"""
import argparse, html, json, pathlib, random, re, zlib

ROOT = pathlib.Path(__file__).resolve().parent
W, H = 1920, 1080
LINE_GAP, SCENE_GAP, LEAD = 0.25, 0.70, 0.35
CHARS_PER_SEC = 6.0  # speed 1.0 기준 한국어 낭독 추정치(공백 제외)

esc = html.escape


# ---------------------------------------------------------------- timing
def estimate_timings(spec, speed):
    t, lines = 0.0, []
    for si, sc in enumerate(spec["scenes"]):
        if si:
            t += SCENE_GAP
        for li, text in enumerate(sc["lines"]):
            if li:
                t += LINE_GAP
            dur = len(re.sub(r"\s", "", text)) / (CHARS_PER_SEC * speed) + 0.3
            lines.append({"scene": si, "line": li, "start": round(t, 3), "end": round(t + dur, 3)})
            t += dur
        t += sc.get("pad_after", 0)
    return {"total": round(t + 1.5, 3), "lines": lines, "estimated": True}


class Clock:
    def __init__(self, spec, timings):
        self.total = timings["total"]
        self.by = {(l["scene"], l["line"]): l for l in timings["lines"]}
        n = len(spec["scenes"])
        self.scene_start = [max(0.0, self.by[(i, 0)]["start"] - LEAD) if i else 0.0 for i in range(n)]
        self.scene_end = self.scene_start[1:] + [self.total]

    def at(self, si, li):
        return self.by[(si, li)]["start"]

    def end(self, si, li):
        return self.by[(si, li)]["end"]


# ---------------------------------------------------------------- pieces
def d(t):
    return f"animation-delay:{t:.3f}s"


def rng(*key):
    return random.Random(zlib.crc32("|".join(map(str, key)).encode()))


def roll(text, t0, cls=""):
    """숫자 자리마다 0~9 띠가 굴러가 멈추는 카운터(순수 CSS, 프레임 단위로 seek 가능)."""
    out, k = [], 0
    for ch in text:
        if ch.isdigit():
            n = int(ch)
            strip = "".join(f"<b>{i % 10}</b>" for i in range(20))
            out.append(f'<span class="dg"><span class="strip" style="--d:{n + 10};{d(t0 + k * 0.07)}">{strip}</span></span>')
            k += 1
        else:
            out.append(f'<span class="sym">{esc(ch)}</span>')
    return f'<span class="roll {cls}">{"".join(out)}</span>'


def ransom(text, t0, seed):
    """콜라주용: 글자마다 다른 종이조각에 붙은 '협박편지' 타이포."""
    r, out = rng(seed), []
    for i, ch in enumerate(text):
        if ch == " ":
            out.append('<span class="sp"></span>')
            continue
        c = r.choice(["c1", "c2", "c3", "c4", "c5"])
        out.append(f'<span class="rl {c}" style="--r:{r.uniform(-9, 9):.1f}deg;{d(t0 + i * 0.06)}">{esc(ch)}</span>')
    return f'<span class="ransom">{"".join(out)}</span>'


def curve_svg(t_draw, t_hl, t_lab):
    x = lambda yr: 110 + yr / 30 * 1180
    y = lambda v: 560 - v / 18 * 500
    comp = " ".join(f"{'M' if i == 0 else 'L'}{x(i):.1f},{y(1.1 ** i):.1f}" for i in range(31))
    simp = f"M{x(0):.1f},{y(1):.1f} L{x(30):.1f},{y(4):.1f}"
    grid = "".join(f'<line class="gl" x1="110" x2="1290" y1="{y(v):.1f}" y2="{y(v):.1f}"/><text class="ax" x="96" y="{y(v) + 8:.1f}" text-anchor="end">{v}억</text>' for v in (0, 5, 10, 15))
    xt = "".join(f'<text class="ax" x="{x(v):.1f}" y="600" text-anchor="middle">{v}년</text>' for v in (0, 10, 20, 30))
    return f'''<svg class="curve" viewBox="0 0 1340 620" width="1340" height="620">
  {grid}{xt}
  <rect class="hlzone" x="{x(20):.1f}" y="40" width="{x(30) - x(20):.1f}" height="520" style="{d(t_hl)}"/>
  <path class="ln simple" pathLength="1" d="{simp}" style="{d(t_draw)}"/>
  <path class="ln comp" pathLength="1" d="{comp}" style="{d(t_draw + 0.4)}"/>
  <g class="lab" style="{d(t_lab)}"><text class="lb comp" x="{x(30) - 10:.1f}" y="{y(17.45) - 18:.1f}" text-anchor="end">복리 17.4억</text>
  <text class="lb simple" x="{x(30) - 10:.1f}" y="{y(4) - 18:.1f}" text-anchor="end">단리 4억</text></g>
</svg>'''


def element(el, si, ei, clk, style):
    at = lambda li: clk.at(si, li)
    k, t = el["k"], at(el["at"]) if "at" in el else 0
    r = rng(style, si, ei)
    tilt = f"--tilt:{r.uniform(-3, 3):.1f}deg;" if style == "collage" else ""

    if k == "kicker":
        return f'<div class="el kicker a-up" style="{tilt}{d(t)}">{esc(el["text"])}</div>'
    if k == "note":
        return f'<div class="el note a-up" style="{tilt}{d(t)}">{esc(el["text"])}</div>'
    if k == "source":
        return f'<div class="el source a-fade" style="{d(t)}">{esc(el["text"])}</div>'
    if k == "headline":
        return f'<div class="el headline a-pop" style="{tilt}{d(t)}">{esc(el["text"])}</div>'
    if k == "stamp":
        return f'<div class="el stamp a-stamp" style="--rot:{r.uniform(-14, -6):.1f}deg;{d(t)}">{esc(el["text"])}</div>'
    if k == "num":
        big = ransom(el["text"], t, f"{si}{ei}") if style == "collage" else roll(el["text"], t)
        tone = el.get("tone", "hot")
        return (f'<div class="el num tone-{tone}" style="{tilt}"><div class="big a-pop" style="{d(t)}">{big}'
                f'<span class="unit">{esc(el.get("unit", ""))}</span></div>'
                f'<div class="lbl a-up" style="{d(t + 0.6)}">{esc(el["label"])}</div></div>')
    if k == "compare":
        cards = []
        for j, it in enumerate(el["items"]):
            ta, tr = at(it["at"]), at(it.get("reveal", it["at"])) + (0.3 if "reveal" not in it else 0)
            rr = rng(style, si, ei, j)
            q = f'<span class="qmark a-out" style="{d(tr)}">?</span>' if "reveal" in it else ""
            cards.append(
                f'<div class="card tone-{it.get("tone", "dim")} a-pop" style="--tilt:{rr.uniform(-4, 4) if style == "collage" else 0:.1f}deg;{d(ta)}">'
                f'<div class="clabel">{esc(it["label"])}</div>'
                f'<div class="cval">{q}<span class="a-fade" style="{d(tr)}">{roll(it["value"], tr)}<span class="unit">{esc(it.get("unit", ""))}</span></span></div>'
                f'<div class="csub">{esc(it.get("sub", ""))}</div></div>')
        return f'<div class="el compare">{"".join(cards)}</div>'
    if k == "list":
        rows, seen = [], {}
        for it in el["items"]:
            n = seen[it["at"]] = seen.get(it["at"], -1) + 1
            rows.append(f'<li class="a-left" style="{d(at(it["at"]) + n * 0.35)}">{esc(it["text"])}</li>')
        return f'<ul class="el list">{"".join(rows)}</ul>'
    if k == "bars":
        rows = []
        for it in el["items"]:
            tb = at(it["at"])
            pct = max(4, it["value"] / el["max"] * 100)
            rows.append(
                f'<div class="bar tone-{it.get("tone", "dim")}"><div class="blabel a-fade" style="{d(tb)}">{esc(it["label"])}</div>'
                f'<div class="btrack"><div class="bfill a-grow" style="width:{pct:.1f}%;{d(tb)}"></div></div>'
                f'<div class="bval a-fade" style="{d(tb + 0.8)}">{esc(it["display"])}</div></div>')
        return f'<div class="el bars" style="{tilt}">{"".join(rows)}</div>'
    if k == "formula":
        txt = esc(el["text"])
        if el.get("hl"):
            txt = txt.replace(esc(el["hl"]), f'<span class="hl a-hl" style="{d(at(el["hl_at"]))}">{esc(el["hl"])}</span>')
        return f'<div class="el formula a-pop" style="{tilt}{d(t)}">{txt}</div>'
    if k == "quiz":
        opts = "".join(f'<span class="opt a-pop" style="{d(t + 0.5 + j * 0.3)}">{esc(o)}</span>' for j, o in enumerate(el["options"]))
        tc = clk.end(si, el["countdown_at"]) + 0.1
        cd = "".join(f'<span class="cd a-blink" style="{d(tc + j)}">{3 - j}</span>' for j in range(3))
        return (f'<div class="el quiz" style="{tilt}"><div class="qq a-up" style="{d(t)}">{esc(el["q"])}</div>'
                f'<div class="opts">{opts}</div><div class="cdwrap">{cd}</div></div>')
    if k == "curve":
        return f'<div class="el chart" style="{tilt}">{curve_svg(at(el["at"]), at(el["hl"]), at(el["label_at"]))}</div>'
    raise ValueError(k)


def decor(style, si):
    """콜라주: 장면마다 다른 위치에 테이프·하프톤·종이조각 배경 장식."""
    if style != "collage":
        return ""
    r, bits = rng("decor", si), []
    for i in range(5):
        kind = r.choice(["tape", "dots", "scrap", "scrap2", "circle"])
        x, y = r.choice([r.uniform(-4, 14), r.uniform(80, 96)]), r.uniform(-4, 92)
        bits.append(f'<i class="dc {kind}" style="left:{x:.0f}%;top:{y:.0f}%;--r:{r.uniform(-40, 40):.0f}deg"></i>')
    return "".join(bits)


# ---------------------------------------------------------------- page
def build(proj, style, speed, voice):
    spec = json.loads((proj / "script.json").read_text(encoding="utf-8"))
    out = proj / style
    out.mkdir(parents=True, exist_ok=True)
    tpath = out / "timings.json"
    timings = json.loads(tpath.read_text(encoding="utf-8")) if tpath.exists() else estimate_timings(spec, speed)
    clk = Clock(spec, timings)
    has_audio = (out / "audio" / "narration.wav").exists()

    scenes, caps = [], []
    for si, sc in enumerate(spec["scenes"]):
        s, e = clk.scene_start[si], clk.scene_end[si]
        els = "".join(element(el, si, ei, clk, style) for ei, el in enumerate(sc["visual"]))
        scenes.append(
            f'<section class="clip scene" id="s{si:02d}" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="1"'
            f' style="animation-delay:{s:.3f}s,{max(s, e - 0.45):.3f}s">'
            f'{decor(style, si)}<div class="chap">{esc(sc["chapter"])}</div><div class="stage">{els}</div></section>')
        for li, text in enumerate(sc["lines"]):
            cs = clk.at(si, li)
            ce = clk.at(si, li + 1) if li + 1 < len(sc["lines"]) else clk.end(si, li) + 0.2
            caps.append(f'<div class="clip cap" data-start="{cs:.3f}" data-duration="{ce - cs:.3f}" data-track-index="2"><span>{esc(text)}</span></div>')

    css = (ROOT / "themes" / "base.css").read_text() + (ROOT / "themes" / f"{style}.css").read_text()
    audio = (f'<audio class="clip" id="narr" data-start="0" data-duration="{clk.total:.3f}" data-track-index="3" '
             f'data-volume="1" src="audio/narration.wav" preload="auto"></audio>') if has_audio else ""
    runtime = (ROOT / "themes" / "runtime.js").read_text().replace("__TOTAL__", f"{clk.total:.3f}")
    page = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width={W}, height={H}">
<title>{esc(spec["title"])} · {style}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Black+Han+Sans&family=Gaegu:wght@700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<style>{css}</style></head>
<body class="{style}">
<div id="main" data-composition-id="main" data-start="0" data-duration="{clk.total:.3f}" data-width="{W}" data-height="{H}">
<div class="bg"></div>
<div class="brand">{esc(spec["channel"])}</div>
{"".join(scenes)}
{"".join(caps)}
<div class="progress"><i style="animation-duration:{clk.total:.3f}s"></i></div>
{audio}
</div>
<script>{runtime}</script>
</body></html>'''
    (out / "index.html").write_text(page, encoding="utf-8")
    meta = {"style": style, "voice": voice, "speed": speed, "total": clk.total,
            "estimated": bool(timings.get("estimated")), "audio": has_audio}
    (out / "build.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{out/'index.html'}  {clk.total/60:.1f}분  {'(길이 추정치, 무음)' if meta['estimated'] else '(실제 음성 싱크)'}")


def script_md(proj):
    spec = json.loads((proj / "script.json").read_text(encoding="utf-8"))
    lines = [f"# {spec['title']}", "", "## 시청 유지 장치", *[f"- {x}" for x in spec["retention_devices"]], ""]
    for si, sc in enumerate(spec["scenes"]):
        lines += [f"## {si + 1:02d}. [{sc['chapter']}] {sc['id']}", ""]
        lines += [f"> {t}" for t in sc["lines"]] + [""]
        shows = [e.get("text") or e.get("q") or e["k"] for e in sc["visual"]]
        lines += ["화면: " + " / ".join(shows), ""]
    (proj / "script.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--style", choices=["infographic", "collage"], required=True)
    ap.add_argument("--speed", type=float, default=1.05)
    ap.add_argument("--voice", default="ko_F1")
    a = ap.parse_args()
    p = pathlib.Path(a.project)
    script_md(p)
    build(p, a.style, a.speed, a.voice)

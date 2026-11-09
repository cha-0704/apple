# -*- coding: utf-8 -*-
"""
auto_shorts.py  —  LM Studio 대본 → VOICEVOX 음성 → 상단 자막(.ass) → FFmpeg 합성
실행:  python auto_shorts.py
필요:  pip install requests   /   LM Studio 서버(1234) + VOICEVOX(50021) 켜두기 / ffmpeg 설치
"""
import os, re, sys, wave, shutil, subprocess
import requests

# ============ ✏️ 여기만 바꾸면 됩니다 ============
TOPIC      = "인간 심리에 관한 45초 일본어 숏츠 대본"
SPEAKER    = 3            # 3 = ずんだもん(ノーマル)
SPEED      = 1.3          # 숏츠용 1.3배속
FONT       = "Noto Sans JP"   # 없으면 "Meiryo" 또는 "Yu Gothic"
FONT_SIZE  = 80
MARGIN_TOP = 180          # 화면 위에서 180px 아래 (상단 UI 피하기)
BG_VIDEO   = "input.mp4"  # 배경 영상(없으면 검은 화면으로 자동 생성)
# ================================================

LM_URL = "http://localhost:1234/v1/chat/completions"
VV_URL = "http://localhost:50021"
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)  # 모든 파일을 이 스크립트 폴더에 저장
JP = re.compile("[\\u3040-\\u30ff\\u4e00-\\u9fff]")  # 히라가나·가타카나·한자
KO = re.compile("[\\uac00-\\ud7a3]")                   # 한글


def get_script():
    print("1️⃣  LM Studio 대본 작성 중...")
    payload = {
        "model": "local-model",
        "temperature": 0.8,
        "messages": [
            {"role": "system", "content":
                "あなたは日本語ショート動画の脚本家です。"
                "日本語の台詞だけを出力してください。説明・番号・記号・韓国語は禁止。"
                "1行に1文。文の中は助詞の区切りで「/」を入れ、区切り1つは7文字以内。"},
            {"role": "user", "content": TOPIC + "를 써줘. 12~16줄."},
        ],
    }
    r = requests.post(LM_URL, json=payload, timeout=300)
    if not r.ok:
        sys.exit(f"❌ LM Studio 오류 {r.status_code}: 모델이 로드됐는지 확인하세요.\n{r.text[:300]}")
    text = r.json()["choices"][0]["message"]["content"]
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)  # 추론형 모델 대비

    lines = []
    for ln in text.splitlines():
        ln = re.sub(r"[*_#`{}\\]", "", ln)                 # 마크다운·자막 명령 기호 제거
        ln = ln.replace("／", "/")                           # 전각 슬래시 → 반각
        ln = re.sub(r"^\s*(?:\d+\s*[.)．、:：]|[-•>])\s*", "", ln)  # 목록 번호(1. 2) - •)만 제거
        ln = ln.strip().strip("「」\"' ")
        if ln and JP.search(ln) and not KO.search(ln):  # 한국어 섞인 줄 제외
            lines.append(ln)
    if not lines:
        sys.exit("❌ 일본어 대본을 못 받았어요. LM Studio에 모델이 로드됐는지 확인하세요.\n" + text)
    print("▶ 대본:\n  " + "\n  ".join(lines))
    return lines


def tts(line, path):
    spoken = line.replace("/", "")            # '/'는 읽지 않게 제거
    q = requests.post(f"{VV_URL}/audio_query",
                      params={"text": spoken, "speaker": SPEAKER}, timeout=60)
    q.raise_for_status()
    q = q.json()
    q["speedScale"] = SPEED
    s = requests.post(f"{VV_URL}/synthesis",
                      params={"speaker": SPEAKER}, json=q, timeout=120)
    s.raise_for_status()
    with open(path, "wb") as f:
        f.write(s.content)


def make_voice(lines):
    print("\n2️⃣  VOICEVOX 음성 변환 중...")
    os.makedirs("parts", exist_ok=True)
    gap = 0.15                         # 문장 사이 쉬는 시간(초)
    timings, t, params, frames = [], 0.0, None, []
    for i, ln in enumerate(lines):
        p = f"parts/{i:02d}.wav"
        tts(ln, p)
        with wave.open(p, "rb") as w:
            params = params or w.getparams()
            data = w.readframes(w.getnframes())
            dur = w.getnframes() / w.getframerate()
        frames.append(data)
        frames.append(b"\x00" * int(params.framerate * gap) * params.sampwidth * params.nchannels)
        timings.append((t, t + dur, ln))
        t += dur + gap
        print(f"  ✔ {i+1}/{len(lines)}  {dur:.1f}초  {ln}")
    with wave.open("voice.wav", "wb") as out:
        out.setparams(params)
        out.writeframes(b"".join(frames))
    print(f"▶ voice.wav 저장 완료 (총 {t:.1f}초)")
    return timings, t


def ts(sec):
    cs = int(round(sec * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def make_ass(timings):
    print("\n3️⃣  상단 자막(sub.ass) 생성 중...")
    events = []
    for start, end, ln in timings:
        chunks = [c for c in ln.split("/") if c.strip()] or [ln]
        total = sum(len(c) for c in chunks)
        cur = start
        for c in chunks:                       # '/' 조각마다 글자 수 비율로 시간 배분
            d = (end - start) * len(c) / total
            events.append(f"Dialogue: 0,{ts(cur)},{ts(cur + d)},TopSub,,0,0,0,,{c.strip()}")
            cur += d
    ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TopSub,{FONT},{FONT_SIZE},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,6,2,8,60,60,{MARGIN_TOP},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"
    with open("sub.ass", "w", encoding="utf-8") as f:
        f.write(ass)
    print(f"▶ sub.ass 저장 완료 (자막 {len(events)}개)")


def make_video(total):
    print("\n4️⃣  FFmpeg 영상 합성 중...")
    if not shutil.which("ffmpeg"):
        print("⚠️ ffmpeg가 없어서 영상 합성은 건너뜀 (voice.wav / sub.ass 는 완성됨)")
        return
    if os.path.exists(BG_VIDEO):
        src = ["-stream_loop", "-1", "-i", BG_VIDEO]
    else:
        print(f"  ({BG_VIDEO} 없음 → 검은 배경 사용)")
        src = ["-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30"]
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-stats", *src, "-i", "voice.wav",
           "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,ass=sub.ass",
           "-map", "0:v", "-map", "1:a", "-t", f"{total:.2f}",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
           "output.mp4"]
    subprocess.run(cmd, check=True)
    print("▶ output.mp4 완성! 🎉")


if __name__ == "__main__":
    try:
        lines = get_script()
        timings, total = make_voice(lines)
        make_ass(timings)
        make_video(total)
        print("\n✅ 끝! 폴더:", HERE)
    except requests.exceptions.ConnectionError as e:
        port = "1234(LM Studio)" if "1234" in str(e) else "50021(VOICEVOX)"
        sys.exit(f"❌ {port} 서버에 연결 못 함 → 해당 프로그램을 켜두었는지 확인하세요.")

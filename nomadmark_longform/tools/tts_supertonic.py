"""Supertonic(로컬 TTS)으로 대본을 문장 단위로 읽어 narration.wav + timings.json 생성.

사용법:
  pip install supertonic
  python tools/tts_supertonic.py projects/compound_interest --voice ko_F1 --out infographic
  python tools/tts_supertonic.py projects/compound_interest --voice ko_M1 --speed 1.2 --out collage

결과:
  <project>/<out>/audio/narration.wav   전체 내레이션
  <project>/<out>/timings.json          문장별 시작/끝 시간 (build.py가 자막·애니메이션 싱크에 사용)
"""
import argparse, inspect, json, pathlib, tempfile, wave

LINE_GAP = 0.25   # 문장 사이 쉼(초)
SCENE_GAP = 0.70  # 장면 사이 쉼(초)


def voice_name(v: str) -> str:
    # "ko_F1" 처럼 언어 접두어를 붙여 불러도 되게. Supertonic 보이스 이름은 F1~F5, M1~M5
    return v.split("_")[-1].upper()


def synth_kwargs(fn, speed, steps):
    params = inspect.signature(fn).parameters
    kw = {"lang": "ko"}
    if "speed" in params:
        kw["speed"] = speed
    if "total_steps" in params and steps:
        kw["total_steps"] = steps
    return kw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--voice", default="ko_F1")
    ap.add_argument("--speed", type=float, default=1.05)
    ap.add_argument("--steps", type=int, default=0, help="품질 스텝(높을수록 품질↑ 속도↓). 0이면 기본값")
    ap.add_argument("--out", required=True, help="결과 폴더 이름 (예: infographic, collage)")
    a = ap.parse_args()

    from supertonic import TTS  # 첫 실행 시 Hugging Face에서 모델 자동 다운로드

    proj = pathlib.Path(a.project)
    spec = json.loads((proj / "script.json").read_text(encoding="utf-8"))
    out = proj / a.out
    (out / "audio").mkdir(parents=True, exist_ok=True)

    tts = TTS(auto_download=True)
    style = tts.get_voice_style(voice_name=voice_name(a.voice))
    kw = synth_kwargs(tts.synthesize, a.speed, a.steps)

    timings, frames, rate, t = [], [], None, 0.0
    with tempfile.TemporaryDirectory() as tmp:
        for si, scene in enumerate(spec["scenes"]):
            if si:
                t += SCENE_GAP
                frames.append(("gap", SCENE_GAP))
            for li, text in enumerate(scene["lines"]):
                if li:
                    t += LINE_GAP
                    frames.append(("gap", LINE_GAP))
                wav, _ = tts.synthesize(text, voice_style=style, **kw)
                path = pathlib.Path(tmp) / f"{si:02d}_{li:02d}.wav"
                tts.save_audio(wav, str(path))
                with wave.open(str(path)) as w:
                    rate = rate or w.getframerate()
                    params = w.getparams()
                    pcm = w.readframes(w.getnframes())
                    dur = w.getnframes() / w.getframerate()
                frames.append(("pcm", pcm))
                timings.append({"scene": si, "line": li, "start": round(t, 3), "end": round(t + dur, 3)})
                print(f"[{si:02d}.{li:02d}] {dur:5.2f}s  {text[:40]}")
                t += dur
            pad = scene.get("pad_after", 0)
            if pad:
                t += pad
                frames.append(("gap", pad))

        with wave.open(str(out / "audio" / "narration.wav"), "wb") as w:
            w.setparams(params)
            silence = lambda sec: b"\x00" * (int(sec * rate) * params.sampwidth * params.nchannels)
            for kind, v in frames:
                w.writeframes(silence(v) if kind == "gap" else v)

    meta = {"voice": a.voice, "speed": a.speed, "total": round(t + 1.5, 3), "lines": timings}
    (out / "timings.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"완료: {t/60:.1f}분 → {out/'audio'/'narration.wav'}")


if __name__ == "__main__":
    main()

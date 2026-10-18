"""Supertonic 한국어 보이스 10종(F1~F5, M1~M5) 테스트 음성 생성.

  pip install supertonic
  python tools/tts_test.py            → samples/ko_F1.wav ... samples/ko_M5.wav
  python tools/tts_test.py F1 M1      → 원하는 보이스만
"""
import pathlib, sys, time

TEXT = ("안녕하세요, 노마드마크입니다. 종이 한 장을 마흔두 번 접으면 달까지 닿습니다. "
        "오늘은 복리의 진짜 무서움을 숫자로 보여드릴게요.")
VOICES = sys.argv[1:] or [f"{g}{i}" for g in "FM" for i in range(1, 6)]

import numpy as np
from supertonic import TTS  # 첫 실행 시 모델 자동 다운로드

out = pathlib.Path(__file__).resolve().parent.parent / "samples"
out.mkdir(exist_ok=True)
tts = TTS(auto_download=True)
for v in VOICES:
    v = v.split("_")[-1].upper()
    t0 = time.time()
    wav, dur = tts.synthesize(TEXT, voice_style=tts.get_voice_style(voice_name=v), lang="ko")
    tts.save_audio(wav, str(out / f"ko_{v}.wav"))
    print(f"ko_{v}: 음성 {float(np.ravel(dur)[0]):.1f}s / 생성 {time.time() - t0:.1f}s")
print("완료 →", out)

# 로컬 쇼츠 파이프라인 (LM Studio → VOICEVOX → 상단 자막 → MP4)

## 처음 1번만
```bash
pip install requests
```
+ ffmpeg 설치 (Windows: `winget install ffmpeg`)

## 매번
1. **LM Studio** 실행 → 모델 로드 → 왼쪽 `</>` 탭 → **Start Server** (포트 1234)
2. **VOICEVOX** 실행만 해두기 (포트 50021 자동)
3. 이 폴더에서:
```bash
python auto_shorts.py
```

## 결과물 (같은 폴더)
| 파일 | 내용 |
|---|---|
| `voice.wav` | ずんだもん 1.3배속 음성 |
| `sub.ass` | 상단 고정 자막 (음성 타이밍 맞춤) |
| `output.mp4` | 최종 1080×1920 숏츠 |

배경 영상을 쓰려면 같은 폴더에 `input.mp4` 를 넣으세요 (없으면 검은 배경).
주제·캐릭터·속도·폰트는 `auto_shorts.py` 맨 위 **✏️ 설정 칸**에서 바꿉니다.

# NOMADMARK 롱폼 공장 🎬

편집 프로그램 없이 **대본 JSON 1개 → 음성(Supertonic) → HTML 영상(HyperFrames 규격) → MP4**까지 자동으로 만드는 롱폼 제작 키트.

```
projects/<주제>/script.json        ← 대본 + 장면별 화면 지시 (여기만 고치면 됨)
        │
        ├─ tools/tts_supertonic.py  → <스타일>/audio/narration.wav + timings.json (문장별 시간)
        ├─ tools/build.py           → <스타일>/index.html  (HyperFrames 컴포지션, 자막·애니메이션 싱크)
        └─ tools/render.cjs         → output/*.mp4 (또는 HyperFrames CLI로 렌더)
```

## 폴더

| 경로 | 내용 |
|---|---|
| `projects/compound_interest/script.json` | 복리 편 대본(15장면) + 화면 지시 |
| `projects/compound_interest/script.md` | 사람이 읽기 쉬운 대본 (build.py가 자동 생성) |
| `projects/compound_interest/infographic/` | 인포그래픽 버전 (목소리 ko_F1, 속도 1.05) |
| `projects/compound_interest/collage/` | 콜라주 버전 (목소리 ko_M1, 속도 1.2 = 조금 빠르게) |
| `tools/themes/` | 공통 CSS, 인포그래픽/콜라주 테마, 재생·seek 런타임 |
| `docs/tts_recommendation.md` | 무료 상업용 한국어 TTS 비교 |
| `docs/topics.md` | 지식·정보 롱폼 주제 후보 |
| `WORKLOG.md` | 작업 내용 정리 |

## 내 컴퓨터에서 처음 한 번 설치

```bash
pip install supertonic          # 한국어 TTS (첫 실행 때 모델 약 145MB 자동 다운로드)
npm install                     # 로컬 렌더러용 playwright
npx playwright install chromium
# ffmpeg 필요: Windows는 `winget install ffmpeg`, Mac은 `brew install ffmpeg`
```

## 만들기

```bash
npm run voice:test      # samples/ko_F1.wav ~ ko_M5.wav: 목소리 10종 들어보기
npm run infographic     # 음성(ko_F1) → 빌드 → output/compound_interest_infographic_F1.mp4
npm run collage         # 음성(ko_M1, 1.2배) → 빌드 → output/compound_interest_collage_M1.mp4
```

- 미리보기: `projects/compound_interest/infographic/index.html`을 브라우저로 열고 화면 클릭(스페이스바로 일시정지)
- 음성 없이 빌드하면 글자 수로 길이를 추정한 **무음 미리보기**가 되고, TTS를 돌린 뒤 다시 빌드하면 실제 음성에 맞춰 자막과 애니메이션이 싱크됩니다.

## HyperFrames로 렌더하기 (선택)

`index.html`은 HyperFrames 컴포지션 규격을 따릅니다. 루트에 `data-composition-id`가 있고, 장면·자막·오디오는 `class="clip"` + `data-start`/`data-duration`/`data-track-index`,
타임라인은 일시정지된 GSAP 타임라인 `window.__timelines.main`으로 등록돼 있어요.

```bash
cd projects/compound_interest/infographic
npx hyperframes preview      # 미리보기 스튜디오
npx hyperframes render       # MP4 렌더 (옵션은 npx hyperframes --help)
```

> ⚠️ 작업한 클라우드 환경에서 HyperFrames CLI 다운로드가 막혀서, 실제 검증은 동일 원리의 로컬 렌더러(`tools/render.cjs`)로 했습니다.
> HyperFrames CLI에서 문제가 생기면 `npm run render:*`(Playwright + ffmpeg)로 렌더하면 결과가 같습니다.

## 새 주제 만들기

1. `projects/compound_interest`를 복사해서 `projects/<새주제>`로 만들기
2. `script.json`의 `lines`(내레이션)와 `visual`(화면 요소)만 수정
   - 화면 요소 종류: `kicker` `num` `note` `stamp` `compare` `bars` `list` `formula` `quiz` `curve` `headline` `source`
   - `at`은 몇 번째 문장(0부터)이 시작될 때 등장할지
3. `python tools/tts_supertonic.py projects/<새주제> --voice ko_F1 --out infographic` → `build.py` → `render.cjs`

# 작업 정리 — 클로드로 편집 프로그램 없이 롱폼 영상 만들기

> 작업 폴더: `nomadmark_longform/` · 작업일: 2026-10-18 · 담당: 뮤즈

## 한눈에 보기

| # | 요청 | 결과 | 상태 |
|---|---|---|---|
| 1 | nomadmark_longform에 HyperFrames 인포그래픽 롱폼 세팅 | 대본 JSON → HTML 컴포지션 → MP4 파이프라인 구축 | ✅ (HyperFrames CLI 자체는 클라우드에서 설치가 막혀 내 PC에서 실행 필요) |
| 2 | 무료 상업용 한국어 TTS 추천 | `docs/tts_recommendation.md`, 1순위 Supertonic 3 | ✅ |
| 3 | Supertonic 한국어 테스트 음성 | `tools/tts_test.py` (10개 보이스 샘플 생성기) | ⚠️ 스크립트만 완료. 클라우드에서 모델 다운로드가 막힘 → 내 PC에서 `npm run voice:test` |
| 4 | 지식·정보 롱폼 주제 | `docs/topics.md`, 15개 키워드 + 시리즈 묶음 | ✅ |
| 5 | 복리 대본(후킹 + 끝까지 보게 하는 장치) | `projects/compound_interest/script.md` (15장면) | ✅ |
| 6 | 대본을 클릭해도 안 보임 | 앱에서 열리는 작업 폴더 안에 `script.md`로 저장하고 파일로 직접 전달 | ✅ |
| 7 | ko_F1, 인포그래픽 롱폼 | `projects/compound_interest/infographic/` + 무음 미리보기 MP4 | ✅ 화면 완성 / 🔊 음성은 내 PC에서 생성 |
| 8 | ko_M1 조금 빠르게(1.2배), 콜라주 롱폼 | `projects/compound_interest/collage/` + 무음 미리보기 MP4 | ✅ 화면 완성 / 🔊 음성은 내 PC에서 생성 |
| 9 | 작업 내용 MD 정리 | 이 문서 | ✅ |

## 1. 제작 파이프라인 (편집 프로그램 0개)

```
script.json ──▶ tts_supertonic.py ──▶ narration.wav + timings.json
     │                                        │
     └──────────────▶ build.py ◀──────────────┘
                         │
                         ▼
                 index.html (HyperFrames 컴포지션)
                         │
          ┌──────────────┴──────────────┐
   npx hyperframes render        node tools/render.cjs
          └──────────────┬──────────────┘
                         ▼
                   output/*.mp4
```

- **대본 = 데이터**: 문장(`lines`)과 화면 요소(`visual`, 등장 시점 `at`)를 JSON 한 파일에서 관리
- **싱크 자동화**: TTS가 문장별 시작/끝 시간을 기록하고, 빌더가 자막과 애니메이션을 그 시간에 맞춤
- **같은 대본, 다른 스타일**: `--style infographic` / `--style collage`로 테마만 교체
- **결정적 렌더**: 모든 애니메이션이 CSS라서 프레임 단위로 정확히 seek됨 → 렌더할 때마다 결과가 같음
- **HyperFrames 호환**: `data-composition-id`, `class="clip"` + `data-start/duration/track-index`, `window.__timelines.main`(일시정지 GSAP 타임라인) 등록

## 2. TTS 결론
- **Supertonic 3**: 코드 MIT + 모델 OpenRAIL-M(상업 이용 가능), 약 145MB, CPU로 실시간보다 빠름, 한국어 보이스 F1~F5 / M1~M5
- Edge-TTS, XTTS-v2, Fish Speech는 수익화 채널에 비추천(라이선스 문제)

## 5. 복리 대본 — 끝까지 보게 만드는 장치
1. **0~15초 후킹**: 종이 0.1mm를 42번 접으면 약 44만 km(지구→달 38.4만 km 돌파)
2. **오픈 루프**: "영상 맨 마지막에 복리를 내 편으로 만드는 단 한 줄의 공식"
3. **로드맵 + 상단 진행바**: 시청자가 지금 어디쯤인지 늘 보임
4. **연못 수련 퍼즐**: "절반 찬 날은?" → 15일째가 아니라 29일째
5. **퀴즈 + 3초 카운트다운**: 정답은 다음 장면에서 공개
6. **복선 회수**: 72의 법칙이 '빚' 파트에서 다시 등장
7. **반전 챕터**: 복리가 나를 공격하는 경우(빚 · 물가 · 수수료)
8. **약속 이행 + CTA**: 공식 공개 → 실천 3단계 → "저장해 두고 1년 뒤 다시 보기" + 다음 편 예고

검증한 수치(전부 직접 계산):

| 내용 | 값 |
|---|---|
| 0.1mm × 2⁴² | 439,805 km |
| 1억 · 10% · 30년 | 단리 4억 / 복리 17.45억 |
| 1.01³⁶⁵ / 0.99³⁶⁵ | 37.78 / 0.026 |
| 72의 법칙 7% | 72÷7 ≈ 10.3년 (정확한 값 10.24년) |
| A: 월 30만 원 × 10년(25~35세) 후 방치 | 65세에 4.24억 (넣은 돈 3,600만 원) |
| B: 월 30만 원 × 30년(35~65세) | 65세에 3.68억 (넣은 돈 1.08억) |
| 빚 1,000만 원 · 연 20% · 5년 | 2,488만 원 |
| 물가 3% · 24년 뒤 현금 가치 | 49% |
| 1억 · 7% · 30년, 수수료 0.1% vs 1% | 7.40억 vs 5.74억 (차이 1.66억) |
| 버핏 재산 | 845억 달러 중 815억 달러가 65세 이후 (모건 하우절 『돈의 심리학』) |

## 7~8. 두 가지 버전

| | 인포그래픽 | 콜라주 |
|---|---|---|
| 목소리 | ko_F1 · 속도 1.05(기본) | ko_M1 · 속도 1.2(조금 빠르게) |
| 룩 | 다크 네이비 그리드, 민트/앰버 네온, 숫자 롤링 카운터, 선 그래프 드로잉 | 크라프트지, 마스킹테이프, 하프톤, 협박편지 타이포, 고무 도장 |
| 폴더 | `projects/compound_interest/infographic/` | `projects/compound_interest/collage/` |
| 미리보기 | `output/compound_interest_infographic_F1_preview.mp4` | `output/compound_interest_collage_M1_preview.mp4` |

## 정직하게 남기는 한계
- 작업한 클라우드 환경은 Hugging Face · GitHub 접속이 막혀 있어서 **Supertonic 모델을 받을 수 없었고**, 그래서 이번 MP4는 **무음 + 자막** 미리보기입니다. 길이도 글자 수 기준 추정치예요.
- 내 PC에서 `npm run infographic` / `npm run collage`를 실행하면 실제 음성으로 다시 싱크된 최종본이 나옵니다.
- HyperFrames CLI는 클라우드에서 설치가 막혀 실행 검증을 못 했고, 같은 원리의 로컬 렌더러로 검증했습니다.
- 미리보기 폰트는 클라우드 기본 폰트(WenQuanYi)로 나왔고, 내 PC에서는 Noto Sans KR · Black Han Sans · Gaegu(구글 폰트)가 적용됩니다.

## 다음 할 일
- [ ] 내 PC에서 `npm run voice:test` → F1/M1 말고 더 마음에 드는 보이스가 있는지 듣기
- [ ] `npm run infographic`, `npm run collage`로 음성 포함 최종본 렌더
- [ ] 썸네일: "42번 접으면 / 달에 닿는다"
- [ ] 다음 편: 사회초년생 첫 1,000만 원 모으기 (대본 끝에서 예고함)

---
name: shorts-factory
description: '신비한 기계사전(피지컬 AI)'과 '일상 속 물리 단면' 채널용 영상 제작 패키지(대본, 장면별 이미지·모션 프롬프트, 썸네일 문구)를 만든다. 사용자가 "쇼츠 만들어", "대본 뽑아", "주제 추천", "배치 생성"이라고 하거나 영상 주제를 던지면 사용한다.
---

# 쇼츠 공장 (Shorts Factory)

## Goal (목표)
주제 하나를 받아서 3D 단면 스타일 영상의 **훅, 제목 5개, 썸네일 문구 3세트, 장면별 대본·이미지 프롬프트·모션 프롬프트, 설명란, 해시태그, 사실 확인 목록**을 만든다.

## Instructions (지침)
1. **채널과 포맷 확인**
   - 채널: `machine`(🤖 신비한 기계사전, 피지컬 AI) 또는 `physics`(⚛️ 일상 속 물리 단면). 말이 없으면 주제를 보고 고른다.
   - 포맷: `shorts`(40초, 9:16) 또는 `long`(8~10분, 16:9). 기본은 `shorts`.
   - 채널 콘셉트·스타일 문구는 `src/channels.js`, 규칙과 출력 형식은 `src/prompts.js`의 `buildScriptPrompt`를 그대로 따른다.

2. **여러 주제를 한 번에 만들 때** (스크립트 실행)
   - 주제를 `topics.txt`에 한 줄씩 적는다.
   - **Command**: `GEMINI_API_KEY=$GEMINI_API_KEY npm run batch -- topics.txt --channel machine --format shorts`
   - 결과는 `output/`에 `.md`와 `.json`으로 저장된다. 실패한 주제가 있으면 메시지를 그대로 보고한다.

3. **화면에서 쓸 때**
   - `npm install` 후 `npm run dev`로 웹앱을 띄우고, ⚙️ API 설정에 Gemini 키를 넣는다.

## Constraints (제약사항)
- 모든 이미지·모션 프롬프트는 **영어**, 내레이션·썸네일 문구는 **한국어**.
- 확실하지 않은 숫자나 사실은 단정하지 말고 **사실 확인 목록**에 넣는다. 출처나 통계를 지어내지 않는다.
- API 키를 코드나 커밋에 절대 넣지 않는다.

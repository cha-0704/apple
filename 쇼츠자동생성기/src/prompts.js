// 브라우저 앱과 배치 스크립트가 함께 쓰는 프롬프트 · 응답 스키마 · 마크다운 변환
import { CHANNELS, FORMATS } from './channels.js';

const S = (description) => ({ type: 'STRING', description });

export const SCRIPT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hook: S('첫 3초에 말할 훅 한 문장'),
    titles: { type: 'ARRAY', items: S('유튜브 제목 후보'), description: '제목 후보 5개' },
    thumbnails: {
      type: 'ARRAY',
      description: '썸네일 문구 3세트',
      items: {
        type: 'OBJECT',
        properties: {
          main: S('큰 글씨 1줄, 8자 이내, 숫자나 반전'),
          sub: S('작은 글씨 1줄, 10자 이내'),
          highlight: S('빨간 X, 하늘색 원 등 강조 요소와 위치'),
          imagePrompt: S('썸네일 배경용 영어 이미지 프롬프트'),
        },
        required: ['main', 'sub', 'highlight', 'imagePrompt'],
      },
    },
    scenes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          time: S('구간, 예: 0-3s 또는 0:00-0:40'),
          narration: S('한국어 내레이션'),
          caption: S('화면에 크게 띄울 한글 키워드, 6자 이내'),
          imagePrompt: S('영어 이미지 프롬프트, 스타일 문구 포함'),
          motionPrompt: S('Veo/Kling용 영어 카메라·애니메이션 지시'),
          sfx: S('효과음/BGM 메모'),
        },
        required: ['time', 'narration', 'caption', 'imagePrompt', 'motionPrompt', 'sfx'],
      },
    },
    description: S('유튜브 설명란 3~5줄'),
    hashtags: { type: 'ARRAY', items: S('# 포함 해시태그') },
    factCheck: {
      type: 'ARRAY',
      items: S('업로드 전에 사람이 직접 확인해야 할 사실·숫자'),
    },
  },
  required: ['hook', 'titles', 'thumbnails', 'scenes', 'description', 'hashtags', 'factCheck'],
};

export const TOPICS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topics: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          topic: S('영상 주제 한 줄'),
          why: S('왜 지금 클릭할지 한 줄'),
        },
        required: ['topic', 'why'],
      },
    },
  },
  required: ['topics'],
};

export function buildScriptPrompt({ channelId, formatId, topic, notes = '' }) {
  const ch = CHANNELS[channelId];
  const fm = FORMATS[formatId];
  return `너는 구독자 1,000만 명의 과학·기술 유튜브 PD이자 작가다.
아래 채널 콘셉트에 맞춰 영상 1편의 제작 패키지를 만든다.

[채널] ${ch.name} — ${ch.tagline}
[콘셉트] ${ch.angle}
[타깃] ${ch.audience}
[톤] ${ch.tone}
[포맷] ${fm.label}, 화면비 ${fm.aspect}. ${fm.guide}
[주제] ${topic}
${notes ? `[추가 요청] ${notes}\n` : ''}
[규칙]
1. 성공 공식: "궁금한 사물·뉴스 → 3D 단면으로 속을 보여 줌 → 원리 → 반전". 시청자가 소리 없이 봐도 이해되게 장면을 설계한다.
2. 제목은 [숫자/돈/크기] + [반전/의문] 구조. 낚시성 거짓 금지.
3. 썸네일 main은 8자 이내, sub는 10자 이내. 3D 단면 이미지 위에 노란·흰 굵은 글씨로 올라간다고 가정한다.
4. 모든 imagePrompt는 영어로 쓰고, 끝에 다음 스타일 문구를 그대로 붙인다: "${ch.visualStyle}, aspect ratio ${fm.aspect}".
5. motionPrompt는 영어로, 카메라 무빙(slow dolly-in, orbit, cutaway reveal 등)과 무엇이 움직이는지 구체적으로 쓴다.
6. 확실하지 않은 숫자·사실은 단정하지 말고 factCheck 목록에 넣는다. 지어낸 출처·통계 금지.
7. 반복 생산형 콘텐츠로 보이지 않도록, 이 주제만의 고유한 관점이나 비유를 최소 하나 넣는다.
8. 해시태그 5~8개, 마지막 장면은 다음 편 예고나 질문으로 끝낸다.`;
}

export function buildTopicsPrompt({ channelId, count = 10, seed = '' }) {
  const ch = CHANNELS[channelId];
  return `너는 유튜브 트렌드 분석가다. 아래 채널에서 조회수가 잘 나올 영상 주제 ${count}개를 제안해라.

[채널] ${ch.name} — ${ch.tagline}
[콘셉트] ${ch.angle}
[타깃] ${ch.audience}
[예시 주제] ${ch.sampleTopics.join(' / ')}
${seed ? `[이번에 파고들 키워드] ${seed}\n` : ''}
[규칙]
- 3D 단면으로 "속을 열어 보여 줄 수 있는" 주제만.
- 숫자, 반전, 오해 깨기, 최신 뉴스 중 하나 이상을 포함.
- 예시 주제와 겹치지 않게. 서로 다른 사물·기술을 고루 섞기.
- 주제는 한 줄, 30자 이내.`;
}

export function toMarkdown(result, meta) {
  const ch = CHANNELS[meta.channelId];
  const fm = FORMATS[meta.formatId];
  const lines = [
    `# ${meta.topic}`,
    '',
    `- 채널: ${ch.emoji} ${ch.name}`,
    `- 포맷: ${fm.label}`,
    `- 생성: ${meta.createdAt}`,
    '',
    '## 훅',
    result.hook,
    '',
    '## 제목 후보',
    ...result.titles.map((t, i) => `${i + 1}. ${t}`),
    '',
    '## 썸네일',
    ...result.thumbnails.flatMap((t, i) => [
      `### 안 ${i + 1}: ${t.main} / ${t.sub}`,
      `- 강조: ${t.highlight}`,
      `- 배경 프롬프트: \`${t.imagePrompt}\``,
    ]),
    '',
    '## 대본',
    ...result.scenes.flatMap((s, i) => [
      `### 장면 ${i + 1} (${s.time}) — ${s.caption}`,
      `- 내레이션: ${s.narration}`,
      `- 이미지: \`${s.imagePrompt}\``,
      `- 모션: \`${s.motionPrompt}\``,
      `- 사운드: ${s.sfx}`,
    ]),
    '',
    '## 설명란',
    result.description,
    '',
    result.hashtags.join(' '),
    '',
    '## ✅ 업로드 전 사실 확인',
    ...result.factCheck.map((f) => `- [ ] ${f}`),
    '',
  ];
  return lines.join('\n');
}

// 채널 프리셋: 차대표가 고른 2번(피지컬 AI)과 3번(일상 속 물리) 니치
export const CHANNELS = {
  machine: {
    id: 'machine',
    emoji: '🤖',
    name: '신비한 기계사전',
    tagline: '피지컬 AI · 로봇 · 자동화의 속을 열어 본다',
    audience: '기술 트렌드에 관심 있는 10~50대, 로봇·AI 뉴스를 보는 사람',
    tone: '차분하지만 긴장감 있는 다큐 내레이션, 숫자와 반전으로 몰입',
    angle:
      '휴머노이드 로봇, 테슬라 옵티머스, 피규어, 보스턴다이내믹스, 공장 자동화, 자율주행, 드론, 로봇 손·관절·액추에이터·센서처럼 피지컬 AI의 내부 구조와 작동 원리를 3D 단면으로 보여 준다. 최신 뉴스(출시·투자·사고·논란)를 훅으로 쓰고 공학 원리로 이유를 설명한다.',
    visualStyle:
      'isometric 3D cutaway illustration of a robot or machine, clean clay render, soft studio lighting, pastel color palette with one accent color (cyan), miniature diorama style, transparent shell revealing internal motors, gears, wires and sensors, no text, no people faces',
    sampleTopics: [
      '테슬라 옵티머스 손가락은 왜 22개 관절일까',
      '휴머노이드 로봇이 넘어지지 않는 진짜 이유',
      '로봇청소기가 집 지도를 그리는 방법',
      '물류창고 로봇 1,000대가 서로 안 부딪히는 원리',
      '로봇 손이 계란을 깨지 않고 잡는 센서',
    ],
  },
  physics: {
    id: 'physics',
    emoji: '⚛️',
    name: '일상 속 물리 단면',
    tagline: '매일 쓰는 물건 속에서 일어나는 물리를 잘라 본다',
    audience: '호기심 많은 전 연령, 학생과 부모, 과학 교양을 좋아하는 사람',
    tone: '친절하고 신기한 발견을 전하는 톤, "사실은…"으로 뒤집는 반전',
    angle:
      '전자레인지, 냉장고, 엘리베이터, 반도체, 스마트폰 배터리, 인덕션, 비행기 날개, 보온병처럼 일상 사물 안에서 일어나는 물리·화학 현상을 3D 단면과 입자 애니메이션으로 보여 준다. 오해를 깨는 반전과 숫자로 훅을 만든다.',
    visualStyle:
      'isometric 3D cross-section of an everyday object, clean clay render, soft studio lighting, pastel colors, miniature diorama style, glowing particles and arrows visualizing physics (heat, electrons, airflow, waves), no text, no people faces',
    sampleTopics: [
      '전자레인지는 왜 가운데가 덜 데워질까',
      '보온병이 12시간 따뜻한 진공의 비밀',
      '스마트폰 배터리 안에서 리튬이 하는 일',
      '반도체 2나노는 원자 몇 개 크기일까',
      '엘리베이터 줄이 끊어져도 안 떨어지는 이유',
    ],
  },
};

export const FORMATS = {
  shorts: {
    id: 'shorts',
    label: '쇼츠 (40초)',
    aspect: '9:16',
    guide:
      '총 35~45초, 장면 6~8개. 0~3초 훅, 사건/질문, 3D 단면으로 원리 설명, 반전, 다음 편 예고로 끝낸다. 내레이션 한 장면당 1~2문장.',
  },
  long: {
    id: 'long',
    label: '롱폼 (8~10분)',
    aspect: '16:9',
    guide:
      '총 8~10분, 장면 12~16개(챕터 단위). 첫 30초 안에 핵심 질문과 손해/이득을 제시하고, 중간마다 작은 반전을 넣어 이탈을 막는다. 각 장면 내레이션은 3~6문장.',
  },
};

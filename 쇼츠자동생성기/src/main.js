import { CHANNELS, FORMATS } from './channels.js';
import { SCRIPT_SCHEMA, TOPICS_SCHEMA, buildScriptPrompt, buildTopicsPrompt, toMarkdown } from './prompts.js';
import { DEFAULT_MODEL, generateJSON } from './gemini.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 저장 실패해도 앱은 계속 동작 */
    }
  },
};

const state = {
  channelId: store.get('channelId', 'machine'),
  formatId: store.get('formatId', 'shorts'),
  history: store.get('history', []),
  current: null,
};

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function setStatus(msg, isError = false) {
  $('status').textContent = msg;
  $('status').classList.toggle('error', isError);
}

function apiConfig() {
  return {
    apiKey: $('apiKey').value.trim() || import.meta.env.VITE_GEMINI_API_KEY || '',
    model: $('model').value.trim() || DEFAULT_MODEL,
  };
}

// ---------- 입력 영역 ----------
function renderChannels() {
  $('channels').innerHTML = Object.values(CHANNELS)
    .map(
      (ch) => `
      <button type="button" class="channel ${ch.id === state.channelId ? 'active' : ''}" data-id="${ch.id}">
        <span class="emoji">${ch.emoji}</span>
        <b>${esc(ch.name)}</b>
        <small>${esc(ch.tagline)}</small>
      </button>`
    )
    .join('');
  renderChips(CHANNELS[state.channelId].sampleTopics.map((topic) => ({ topic })));
}

function renderFormats() {
  $('formats').innerHTML = Object.values(FORMATS)
    .map(
      (f) =>
        `<button type="button" class="${f.id === state.formatId ? 'active' : ''}" data-id="${f.id}">${esc(f.label)}</button>`
    )
    .join('');
}

function renderChips(items) {
  $('topicChips').innerHTML = items
    .map(
      (t) =>
        `<button type="button" class="chip" data-topic="${esc(t.topic)}" title="${esc(t.why || '')}">${esc(t.topic)}</button>`
    )
    .join('');
}

// ---------- 결과 영역 ----------
function copyBtn(text, label = '복사') {
  return `<button type="button" class="copy" data-copy="${esc(text)}">${label}</button>`;
}

function renderResult(entry) {
  const { result: r, meta } = entry;
  const allImagePrompts = r.scenes.map((s, i) => `[${i + 1}] ${s.imagePrompt}`).join('\n\n');
  const allMotion = r.scenes.map((s, i) => `[${i + 1}] ${s.motionPrompt}`).join('\n\n');
  const narration = r.scenes.map((s) => s.narration).join('\n');

  $('output').innerHTML = `
    <div class="card result-head">
      <div>
        <small>${CHANNELS[meta.channelId].emoji} ${esc(CHANNELS[meta.channelId].name)} · ${esc(FORMATS[meta.formatId].label)}</small>
        <h2>${esc(meta.topic)}</h2>
        <p class="hook">🎣 ${esc(r.hook)}</p>
      </div>
      <div class="actions">
        <button type="button" id="dlMd" class="ghost">⬇️ .md</button>
        <button type="button" id="dlJson" class="ghost">⬇️ .json</button>
      </div>
    </div>

    <div class="card">
      <h3>🎬 제목 후보</h3>
      <ol class="titles">${r.titles.map((t) => `<li><span>${esc(t)}</span>${copyBtn(t)}</li>`).join('')}</ol>
    </div>

    <div class="card">
      <h3>🖼️ 썸네일 문구</h3>
      <div class="thumbs">
        ${r.thumbnails
          .map(
            (t) => `
          <div class="thumb">
            <div class="thumb-preview"><b>${esc(t.main)}</b><span>${esc(t.sub)}</span></div>
            <p class="meta">강조: ${esc(t.highlight)}</p>
            <code>${esc(t.imagePrompt)}</code>
            ${copyBtn(t.imagePrompt, '배경 프롬프트 복사')}
          </div>`
          )
          .join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <h3>📜 대본 · 장면별 프롬프트</h3>
        <div class="actions">
          ${copyBtn(narration, '내레이션 전체')}
          ${copyBtn(allImagePrompts, '이미지 전체')}
          ${copyBtn(allMotion, '모션 전체')}
        </div>
      </div>
      ${r.scenes
        .map(
          (s, i) => `
        <article class="scene">
          <header><span class="no">${i + 1}</span><b>${esc(s.caption)}</b><small>${esc(s.time)}</small></header>
          <p class="narr">${esc(s.narration)}</p>
          <div class="prompt"><label>이미지</label><code>${esc(s.imagePrompt)}</code>${copyBtn(s.imagePrompt)}</div>
          <div class="prompt"><label>모션</label><code>${esc(s.motionPrompt)}</code>${copyBtn(s.motionPrompt)}</div>
          <p class="meta">🔊 ${esc(s.sfx)}</p>
        </article>`
        )
        .join('')}
    </div>

    <div class="card">
      <div class="card-title"><h3>📝 설명란 · 해시태그</h3>${copyBtn(`${r.description}\n\n${r.hashtags.join(' ')}`)}</div>
      <p class="desc">${esc(r.description)}</p>
      <p class="tags">${r.hashtags.map(esc).join(' ')}</p>
    </div>

    <div class="card warn">
      <h3>✅ 업로드 전 사실 확인</h3>
      <ul>${r.factCheck.map((f) => `<li><label><input type="checkbox" /> ${esc(f)}</label></li>`).join('')}</ul>
      <p class="hint">AI가 만든 숫자·사실은 틀릴 수 있어요. 기사나 공식 자료로 꼭 확인하세요.</p>
    </div>`;

  const slug = meta.topic.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
  $('dlMd').onclick = () => download(`${slug}.md`, toMarkdown(r, meta), 'text/markdown');
  $('dlJson').onclick = () => download(`${slug}.json`, JSON.stringify(entry, null, 2), 'application/json');
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function renderHistory() {
  $('historyList').innerHTML =
    state.history
      .map(
        (h, i) =>
          `<li><button type="button" data-idx="${i}">${CHANNELS[h.meta.channelId].emoji} ${esc(h.meta.topic)}</button><small>${esc(h.meta.createdAt)}</small></li>`
      )
      .join('') || '<li class="hint">아직 기록이 없어요.</li>';
}

// ---------- 액션 ----------
async function suggestTopics() {
  const btn = $('suggestBtn');
  btn.disabled = true;
  setStatus('💡 주제를 뽑는 중…');
  try {
    const { topics } = await generateJSON({
      ...apiConfig(),
      prompt: buildTopicsPrompt({ channelId: state.channelId, seed: $('topic').value.trim() }),
      schema: TOPICS_SCHEMA,
      temperature: 1.1,
    });
    renderChips(topics);
    setStatus(`💡 ${topics.length}개 추천 완료. 칩을 누르면 주제로 들어가요.`);
  } catch (e) {
    setStatus(e.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function generate() {
  const topic = $('topic').value.trim();
  if (!topic) {
    setStatus('주제를 입력하거나 추천 칩을 눌러 주세요.', true);
    $('topic').focus();
    return;
  }
  const btn = $('generateBtn');
  btn.disabled = true;
  setStatus('🏭 대본 · 프롬프트 · 썸네일을 만드는 중… (20~60초)');
  const meta = {
    channelId: state.channelId,
    formatId: state.formatId,
    topic,
    notes: $('notes').value.trim(),
    createdAt: new Date().toLocaleString('ko-KR'),
  };
  try {
    const result = await generateJSON({
      ...apiConfig(),
      prompt: buildScriptPrompt(meta),
      schema: SCRIPT_SCHEMA,
    });
    const entry = { meta, result };
    state.history = [entry, ...state.history].slice(0, 30);
    store.set('history', state.history);
    renderHistory();
    renderResult(entry);
    setStatus('✅ 완료! 오른쪽에서 복사하거나 다운로드하세요.');
  } catch (e) {
    setStatus(e.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ---------- 이벤트 ----------
function init() {
  $('apiKey').value = store.get('apiKey', '');
  $('model').value = store.get('model', DEFAULT_MODEL);
  if (!$('apiKey').value && !import.meta.env.VITE_GEMINI_API_KEY) $('settings').hidden = false;

  renderChannels();
  renderFormats();
  renderHistory();

  $('settingsToggle').onclick = () => ($('settings').hidden = !$('settings').hidden);
  $('apiKey').onchange = () => store.set('apiKey', $('apiKey').value.trim());
  $('model').onchange = () => store.set('model', $('model').value.trim());

  $('channels').onclick = (e) => {
    const b = e.target.closest('.channel');
    if (!b) return;
    state.channelId = b.dataset.id;
    store.set('channelId', state.channelId);
    renderChannels();
  };
  $('formats').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.formatId = b.dataset.id;
    store.set('formatId', state.formatId);
    renderFormats();
  };
  $('topicChips').onclick = (e) => {
    const b = e.target.closest('.chip');
    if (b) $('topic').value = b.dataset.topic;
  };
  $('topic').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing) generate();
  };
  $('suggestBtn').onclick = suggestTopics;
  $('generateBtn').onclick = generate;

  $('historyList').onclick = (e) => {
    const b = e.target.closest('button[data-idx]');
    if (b) renderResult(state.history[Number(b.dataset.idx)]);
  };
  $('output').onclick = async (e) => {
    const b = e.target.closest('.copy');
    if (!b || b.dataset.busy) return;
    b.dataset.busy = '1';
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      const label = b.textContent;
      b.textContent = '✔ 복사됨';
      setTimeout(() => {
        b.textContent = label;
        delete b.dataset.busy;
      }, 1200);
    } catch {
      delete b.dataset.busy;
      setStatus('클립보드 복사에 실패했어요. 직접 선택해서 복사해 주세요.', true);
    }
  };
}

init();

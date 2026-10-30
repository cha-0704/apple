#!/usr/bin/env node
// 주제 목록 파일 → 주제마다 제작 패키지(.md + .json)를 output/ 폴더에 한 번에 생성
// 사용법: GEMINI_API_KEY=... npm run batch -- topics.txt --channel machine --format shorts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CHANNELS, FORMATS } from '../src/channels.js';
import { SCRIPT_SCHEMA, buildScriptPrompt, toMarkdown } from '../src/prompts.js';
import { DEFAULT_MODEL, generateJSON } from '../src/gemini.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const channelId = opt('channel', 'machine');
const formatId = opt('format', 'shorts');
const model = opt('model', process.env.GEMINI_MODEL || DEFAULT_MODEL);
const outDir = opt('out', 'output');
const apiKey = process.env.GEMINI_API_KEY;

if (!file || !CHANNELS[channelId] || !FORMATS[formatId] || !apiKey) {
  console.log(`사용법: GEMINI_API_KEY=키 npm run batch -- <주제파일.txt> [--channel ${Object.keys(CHANNELS).join('|')}] [--format ${Object.keys(FORMATS).join('|')}] [--model 모델명] [--out 폴더]`);
  if (!apiKey) console.log('⚠️  GEMINI_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const topics = (await readFile(file, 'utf8'))
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

await mkdir(outDir, { recursive: true });
console.log(`🏭 ${CHANNELS[channelId].name} · ${FORMATS[formatId].label} · ${topics.length}개 주제`);

let ok = 0;
for (const [i, topic] of topics.entries()) {
  const meta = { channelId, formatId, topic, createdAt: new Date().toLocaleString('ko-KR') };
  const slug = `${String(i + 1).padStart(2, '0')}_${topic.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40)}`;
  process.stdout.write(`[${i + 1}/${topics.length}] ${topic} … `);
  try {
    const result = await generateJSON({ apiKey, model, prompt: buildScriptPrompt(meta), schema: SCRIPT_SCHEMA });
    await writeFile(`${outDir}/${slug}.md`, toMarkdown(result, meta));
    await writeFile(`${outDir}/${slug}.json`, JSON.stringify({ meta, result }, null, 2));
    ok++;
    console.log('✅');
  } catch (e) {
    console.log(`❌ ${e.message}`);
  }
}
console.log(`완료: ${ok}/${topics.length} → ${outDir}/`);

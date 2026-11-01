/**
 * ソウル美容ノート 自動下書きシステム
 *
 * 流れ（1時間ごとに自動実行）:
 *   1. シートから未処理のキーワードを1つ選び、Claude の Message Batches API に送る（1日1件）
 *   2. バッチが終わったら結果を受け取り、Blogger に「下書き」として保存する
 *   3. 下書きができたらメールで知らせる
 *
 * 公開は自動ではしません。必ず Blogger で内容を確認してから公開してください。
 *
 * スクリプト プロパティ（プロジェクトの設定 → スクリプト プロパティ）:
 *   ANTHROPIC_API_KEY  Claude API キー（必須）
 *   BLOG_ID            ソウル美容ノートのブログ ID（必須）
 *   NOTIFY_EMAIL       通知先メール（任意。空ならスクリプト所有者）
 */

const MODEL = 'claude-opus-5-5';
const EFFORT = 'medium';
const MAX_TOKENS = 16000;
const SHEET_NAME = 'keywords';
const POSTS_PER_DAY = 1;
// 1 バッチ = 1 記事なので固定 ID。行番号に依存させない（シートを並べ替えても結果を取れるように）
const CUSTOM_ID = 'post';

// 拒否（refusal）時にサーバー側で別モデルに切り替える設定。
// バッチ作成が fallbacks のせいで失敗した場合は自動で外して再送する。
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const COL = { KEYWORD: 1, MEMO: 2, STATUS: 3, BATCH_ID: 4, POST_URL: 5, UPDATED: 6 };
const HEADERS = ['キーワード / テーマ', 'メモ（事実・体験）', '状態', 'バッチID', '下書きURL', '更新日時'];

const SYSTEM_PROMPT = [
  'あなたは日本語ブログ「ソウル美容ノート」（https://kbeauty.freeherway.com）の執筆アシスタントです。',
  '運営者はソウル在住の韓国人「ソニ」です。読者は韓国旅行や韓国コスメに興味のある日本人です。',
  '',
  '書き方のルール:',
  '- 自然で親しみやすい日本語（です・ます調）。ソニの一人称で書く。',
  '- 冒頭は「안녕하세요！ソウル在住のソニです。」で始める。',
  '- お店・地名・商品名には韓国語を併記する。例: オリーブヤング（올리브영）、聖水（ソンス／성수）。',
  '- 可能なら最後に「お店でそのまま使える韓国語」コーナーを入れる。',
  '- 本文は 2,000〜3,000 字程度。h2 見出しを 4〜6 個。表や箇条書きで読みやすく。',
  '',
  '正確さのルール（必ず守る）:',
  '- メモに書かれていない統計・金額・ランキング・日付を作らない。数字が必要な箇所は',
  '  <span style="color:#d00">【要確認：○○のデータ】</span> と書いて空けておく。',
  '- ソニの実体験を作らない。体験談が合う箇所には',
  '  <p style="color:#d00">【要編集：ソニの体験を一言】</p> と書いて空けておく。',
  '- 医療・皮膚科の施術は一般的な説明にとどめ、効果を断定しない。必要なら「施術はクリニックで相談を」と添える。',
  '- 特定のクリニックや商品を宣伝・推薦しない。アフィリエイトリンクは入れない。',
  '',
  'HTML のルール:',
  '- 使ってよいタグ: h2, h3, p, b, ul, ol, li, table, tr, th, td, hr, span。',
  '- table には border="1" cellpadding="8" style="border-collapse: collapse;" を付ける。',
  '- h1、script、style タグ、画像タグ、外部リンクは入れない。',
  '- 写真を入れると良い位置に <p style="color:#888">【写真：何の写真か】</p> を 2〜3 か所入れる。',
].join('\n');

const POST_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '検索されやすい日本語タイトル（32字前後）' },
    slug: { type: 'string', description: 'パーマリンク用の英語スラッグ（小文字・数字・ハイフンのみ）' },
    labels: { type: 'array', items: { type: 'string' }, description: '日本語ラベル 3〜5 個' },
    search_description: { type: 'string', description: '検索結果に出る説明文（120字以内）' },
    html: { type: 'string', description: '記事本文の HTML' },
  },
  required: ['title', 'slug', 'labels', 'search_description', 'html'],
  additionalProperties: false,
};

/** 最初に一度だけ実行: シートの見出しと 1 時間ごとのトリガーを作る */
function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'hourlyJob')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('hourlyJob').timeBased().everyHours(1).create();

  checkConfig_();
  Logger.log('セットアップ完了。A 列にキーワードを入れてください。');
}

/** トリガーから 1 時間ごとに呼ばれる本体 */
function hourlyJob() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) return;
  try {
    checkConfig_();
    collectFinishedBatches_();
    submitTodaysBatch_();
  } finally {
    lock.releaseLock();
  }
}

/** テスト用: 待たずに今すぐ 1 件送る（1 日の上限は無視） */
function runNow() {
  checkConfig_();
  collectFinishedBatches_();
  submitTodaysBatch_(true);
}

function collectFinishedBatches_() {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.STATUS - 1] !== 'QUEUED') continue;
    const rowNum = i + 1;
    const batchId = rows[i][COL.BATCH_ID - 1];
    try {
      const batch = claudeRequest_('get', '/v1/messages/batches/' + batchId);
      if (batch.processing_status !== 'ended') continue;

      const result = fetchBatchResult_(batch.results_url);
      const post = parsePost_(result);
      const url = createBloggerDraft_(post);
      setRow_(sheet, rowNum, 'DRAFTED', batchId, url);
      notify_(rows[i][COL.KEYWORD - 1], post, url);
    } catch (e) {
      if (/fallback/i.test(String(e.message))) {
        // バッチ内で fallbacks が使えなかった: 以後は外して、この行をすぐに再送する
        // （1 日の枠はこの行がすでに使っているので、翌日まで待たせない）
        PropertiesService.getScriptProperties().setProperty('NO_FALLBACK', 'true');
        try {
          const memo = String(rows[i][COL.MEMO - 1] || '').trim();
          const retry = createBatch_(buildParams_(String(rows[i][COL.KEYWORD - 1]).trim(), memo));
          setRow_(sheet, rowNum, 'QUEUED', retry.id, '');
        } catch (retryError) {
          setRow_(sheet, rowNum, 'ERROR', batchId, String(retryError.message || retryError).slice(0, 300));
          notifyError_(rows[i][COL.KEYWORD - 1], retryError);
        }
        continue;
      }
      setRow_(sheet, rowNum, 'ERROR', batchId, String(e.message || e).slice(0, 300));
      notifyError_(rows[i][COL.KEYWORD - 1], e);
    }
  }
}

function submitTodaysBatch_(force) {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  const sentToday = props.getProperty('SENT_DATE') === today ? Number(props.getProperty('SENT_COUNT') || 0) : 0;
  if (!force && sentToday >= POSTS_PER_DAY) return;

  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const keyword = String(rows[i][COL.KEYWORD - 1] || '').trim();
    if (!keyword || rows[i][COL.STATUS - 1]) continue;

    const rowNum = i + 1;
    const memo = String(rows[i][COL.MEMO - 1] || '').trim();
    const batch = createBatch_(buildParams_(keyword, memo));
    setRow_(sheet, rowNum, 'QUEUED', batch.id, '');
    props.setProperties({ SENT_DATE: today, SENT_COUNT: String(sentToday + 1) });
    return;
  }
}

function buildParams_(keyword, memo) {
  const userText = [
    '次のテーマでブログ記事を 1 本書いてください。',
    '',
    'テーマ: ' + keyword,
    memo ? '\nソニのメモ（事実・体験。ここに書かれた数字や体験だけは使ってよい）:\n' + memo : '\nメモ: なし（数字や体験は【要確認】【要編集】で空けておく）',
  ].join('\n');

  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: POST_SCHEMA } },
    messages: [{ role: 'user', content: userText }],
  };
}

function createBatch_(params) {
  const customId = CUSTOM_ID;
  if (PropertiesService.getScriptProperties().getProperty('NO_FALLBACK')) {
    return claudeRequest_('post', '/v1/messages/batches', { requests: [{ custom_id: customId, params: params }] });
  }
  const body = { requests: [{ custom_id: customId, params: Object.assign({ fallbacks: 'default' }, params) }] };
  try {
    return claudeRequest_('post', '/v1/messages/batches', body, FALLBACK_BETA);
  } catch (e) {
    if (!/fallback/i.test(String(e.message))) throw e;
    // fallbacks がバッチで使えない場合は外して再送する
    PropertiesService.getScriptProperties().setProperty('NO_FALLBACK', 'true');
    return claudeRequest_('post', '/v1/messages/batches', { requests: [{ custom_id: customId, params: params }] });
  }
}

function fetchBatchResult_(resultsUrl) {
  const res = UrlFetchApp.fetch(resultsUrl, { headers: claudeHeaders_(), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('結果の取得に失敗: ' + res.getContentText().slice(0, 200));
  const line = res.getContentText().split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l))
    .find(r => r.custom_id === CUSTOM_ID);
  if (!line) throw new Error('バッチ結果が見つかりません');
  if (line.result.type !== 'succeeded') throw new Error('生成失敗: ' + JSON.stringify(line.result).slice(0, 200));
  return line.result.message;
}

function parsePost_(message) {
  if (message.stop_reason === 'refusal') throw new Error('Claude がこのテーマの執筆を断りました。テーマを変えてください。');
  if (message.stop_reason === 'max_tokens') throw new Error('出力が長すぎて途中で切れました。MAX_TOKENS を増やしてください。');
  const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const post = JSON.parse(text);
  post.slug = String(post.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  return post;
}

function createBloggerDraft_(post) {
  const blogId = PropertiesService.getScriptProperties().getProperty('BLOG_ID');
  const res = UrlFetchApp.fetch(
    'https://www.googleapis.com/blogger/v3/blogs/' + blogId + '/posts?isDraft=true',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ title: post.title, content: post.html, labels: post.labels }),
      muteHttpExceptions: true,
    }
  );
  if (res.getResponseCode() !== 200) throw new Error('Blogger への保存に失敗: ' + res.getContentText().slice(0, 300));
  return 'https://www.blogger.com/blog/post/edit/' + blogId + '/' + JSON.parse(res.getContentText()).id;
}

function claudeRequest_(method, path, body, beta) {
  const headers = claudeHeaders_();
  if (beta) headers['anthropic-beta'] = beta;
  const options = { method: method, headers: headers, muteHttpExceptions: true };
  if (body) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
  }
  const res = UrlFetchApp.fetch('https://api.anthropic.com' + path, options);
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Claude API エラー ' + code + ': ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText());
}

function claudeHeaders_() {
  return {
    'x-api-key': PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY'),
    'anthropic-version': '2023-06-01',
  };
}

function notify_(keyword, post, url) {
  const todo = (post.html.match(/【要(確認|編集)/g) || []).length;
  const body = [
    '新しい下書きができました。内容を確認してから公開してください。',
    '',
    'テーマ: ' + keyword,
    'タイトル: ' + post.title,
    '下書き: ' + url,
    '',
    '■ 公開前にやること',
    '1. 赤字の【要確認】【要編集】を直す（残り ' + todo + ' か所）',
    '2. 【写真】の位置に写真を入れる',
    '3. 右側の設定で入力:',
    '   - カスタム パーマリンク: ' + post.slug,
    '   - 検索向けの説明: ' + post.search_description,
    '4. 内容を読んで問題なければ「公開」',
  ].join('\n');
  MailApp.sendEmail(notifyEmail_(), '[ソウル美容ノート] 下書き完成: ' + post.title, body);
}

function notifyError_(keyword, e) {
  MailApp.sendEmail(notifyEmail_(), '[ソウル美容ノート] 下書きの作成に失敗', 'テーマ: ' + keyword + '\n\n' + (e.message || e));
}

function notifyEmail_() {
  return PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
}

function setRow_(sheet, rowNum, status, batchId, url) {
  sheet.getRange(rowNum, COL.STATUS, 1, 4).setValues([[status, batchId, url, new Date()]]);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function checkConfig_() {
  const props = PropertiesService.getScriptProperties();
  ['ANTHROPIC_API_KEY', 'BLOG_ID'].forEach(key => {
    if (!props.getProperty(key)) throw new Error('スクリプト プロパティ ' + key + ' が設定されていません。');
  });
}

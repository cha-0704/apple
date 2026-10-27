// Gemini API(REST) 호출 — 브라우저와 Node 18+ 양쪽에서 동작
export const DEFAULT_MODEL = 'gemini-2.5-flash';

export async function generateJSON({ apiKey, model = DEFAULT_MODEL, prompt, schema, temperature = 0.9 }) {
  if (!apiKey) throw new Error('Gemini API 키가 필요합니다. (AI Studio → Get API key)');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini 요청 실패 (HTTP ${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || '알 수 없음';
    throw new Error(`응답이 비어 있습니다. (사유: ${reason})`);
  }
  return JSON.parse(text);
}

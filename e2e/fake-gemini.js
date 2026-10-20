// A stand-in for the Gemini API, so the browser tests exercise the real SDK
// call path without a key or any cost. The backend is started with
// GEMINI_BASE_URL pointing here.
//   POST /v1beta/models/<model>:generateContent – answers like the real API
//                                                 (mode: ok | refusal | rate_limit)
//   POST /__mode        – { mode } switch behaviour
//   GET  /__requests    – every generateContent request received so far
import http from 'node:http';
import { FAKE_GEMINI_PORT } from './test-db.js';

let mode = 'ok';
const requests = [];

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function fakeSummary(body) {
  const text = (body.contents ?? []).flatMap((c) => c.parts ?? []).map((p) => p.text ?? '').join('\n');
  const count = (text.match(/^Q\d+ \(/gm) ?? []).length;
  const numbers = Array.from({ length: count }, (_, i) => i + 1);
  return {
    overview: `Fake overview of ${count} questions.`,
    themes: [{ title: 'Fake theme', description: 'Every question, grouped by the fake API.', question_numbers: numbers }],
    confusions: ['Fake confusion'],
    suggested_followups: ['Fake follow-up'],
  };
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/__requests') return send(res, 200, requests);
    if (req.method === 'POST' && url.pathname === '/__mode') {
      mode = JSON.parse(raw || '{}').mode ?? 'ok';
      return send(res, 200, { mode });
    }
    const match = url.pathname.match(/^\/v1beta\/models\/([^/:]+):generateContent$/);
    if (req.method === 'POST' && match) {
      const body = JSON.parse(raw || '{}');
      const model = decodeURIComponent(match[1]);
      requests.push({ model, body, headers: { apiKey: req.headers['x-goog-api-key'] ?? null } });
      if (mode === 'rate_limit') {
        return send(res, 429, { error: { code: 429, message: 'Fake rate limit', status: 'RESOURCE_EXHAUSTED' } });
      }
      const base = { modelVersion: model, usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 } };
      if (mode === 'refusal') {
        return send(res, 200, { ...base, candidates: [{ finishReason: 'SAFETY', index: 0 }] });
      }
      return send(res, 200, {
        ...base,
        candidates: [{
          content: { role: 'model', parts: [{ text: JSON.stringify(fakeSummary(body)) }] },
          finishReason: 'STOP', index: 0,
        }],
      });
    }
    send(res, 404, { error: { code: 404, message: `No fake for ${req.method} ${url.pathname}`, status: 'NOT_FOUND' } });
  });
});

server.listen(FAKE_GEMINI_PORT, () => console.log(`fake Gemini API on ${FAKE_GEMINI_PORT}`));

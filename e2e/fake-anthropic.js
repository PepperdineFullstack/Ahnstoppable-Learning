// A stand-in for the Claude Messages API, so the browser tests exercise the
// real SDK call path without a key or any cost. The backend is started with
// ANTHROPIC_BASE_URL pointing here.
//   POST /v1/messages   – answers like the real API (mode: ok | refusal | rate_limit)
//   POST /__mode        – { mode } switch behaviour
//   GET  /__requests    – every /v1/messages request body received so far
import http from 'node:http';
import { FAKE_ANTHROPIC_PORT } from './test-db.js';

let mode = 'ok';
const requests = [];

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function fakeSummary(body) {
  const text = String(body.messages?.[0]?.content ?? '');
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
    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      const body = JSON.parse(raw || '{}');
      requests.push({ body, headers: { beta: req.headers['anthropic-beta'] ?? null } });
      if (mode === 'rate_limit') {
        return send(res, 429, { type: 'error', error: { type: 'rate_limit_error', message: 'Fake rate limit' } },
          { 'x-should-retry': 'false' });
      }
      const base = {
        id: `msg_fake_${requests.length}`, type: 'message', role: 'assistant', model: body.model,
        stop_sequence: null, usage: { input_tokens: 100, output_tokens: 50 },
      };
      if (mode === 'refusal') {
        return send(res, 200, { ...base, content: [], stop_reason: 'refusal',
          stop_details: { type: 'refusal', category: null, explanation: 'Fake refusal' } });
      }
      return send(res, 200, { ...base, content: [{ type: 'text', text: JSON.stringify(fakeSummary(body)) }],
        stop_reason: 'end_turn', stop_details: null });
    }
    send(res, 404, { type: 'error', error: { type: 'not_found_error', message: `No fake for ${req.method} ${url.pathname}` } });
  });
});

server.listen(FAKE_ANTHROPIC_PORT, () => console.log(`fake Anthropic API on ${FAKE_ANTHROPIC_PORT}`));

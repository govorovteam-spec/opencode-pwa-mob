import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, 'public');

const PORT = process.env.PORT || 3000;
const OC_URL = (process.env.OPENCODE_URL || 'http://127.0.0.1:8888').replace(/\/$/, '');
const OC_PW = process.env.OPENCODE_PASSWORD || '';
const WEB_USER = process.env.WEB_USER || 'admin';
const WEB_PW = process.env.WEB_PASSWORD || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || '';

const OC_AUTH = 'Basic ' + Buffer.from('opencode:' + OC_PW).toString('base64');

async function oc(method, path, body) {
  const r = await fetch(OC_URL + path, {
    method,
    headers: { 'Authorization': OC_AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, text: await r.text() };
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

function webAuth(req) {
  if (!WEB_PW) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const [u, p] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
  return u === WEB_USER && p === WEB_PW;
}
function requireAuth(req, res) {
  if (webAuth(req)) return true;
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="opencode-mob-web"' });
  res.end('Authentication required');
  return false;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/healthz') return json(res, 200, { ok: true });

  if (!requireAuth(req, res)) return;

  try {
    // --- static ---
    if (req.method === 'GET' && !p.startsWith('/api/')) {
      const file = p === '/' ? 'index.html' : p.replace(/^\//, '');
      const fsPath = join(PUBLIC, file);
      if (!fsPath.startsWith(PUBLIC) || !existsSync(fsPath)) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[extname(fsPath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      return res.end(readFileSync(fsPath));
    }

    // --- API ---
    if (p === '/api/sessions' && req.method === 'GET') {
      const r = await oc('GET', '/api/session?limit=60&order=desc');
      let sessions = [];
      try { sessions = (JSON.parse(r.text).data || []).map(x => ({ id: x.id, title: x.title || x.id, updated: (x.time && x.time.updated) || (x.time && x.time.created) || 0 })); } catch {}
      return json(res, 200, { ok: true, sessions });
    }
    if (p === '/api/models' && req.method === 'GET') {
      const r = await oc('GET', '/api/model');
      let list = []; try { list = JSON.parse(r.text).data || []; } catch {}
      return json(res, 200, { ok: true, defaultModel: DEFAULT_MODEL, models: list.map(m => ({ providerID: m.providerID, id: m.id, name: m.name || m.id })) });
    }
    if (p === '/api/send' && req.method === 'POST') {
      const b = await body(req);
      let sid = String(b.session || '');
      if (!sid) {
        const c = await oc('POST', '/api/session', { title: 'Chat' });
        try { sid = JSON.parse(c.text).data.id; } catch {}
        if (!sid) return json(res, 500, { ok: false, error: 'session create failed' });
      }
      if (b.model && b.model.providerID && b.model.id) {
        try { await oc('POST', `/api/session/${sid}/model`, { model: { providerID: b.model.providerID, id: b.model.id } }); } catch {}
      }
      const text = String(b.text || '').slice(0, 8000);
      await oc('POST', `/api/session/${sid}/prompt`, { prompt: { text } });
      return json(res, 200, { ok: true, session: sid });
    }
    if (p === '/api/messages' && req.method === 'GET') {
      const sid = url.searchParams.get('session') || '';
      const r = await oc('GET', `/api/session/${sid}/message`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(r.text);
    }
    if (p === '/api/model' && req.method === 'POST') {
      const b = await body(req);
      if (!b.session || !b.providerID || !b.id) return json(res, 400, { ok: false, error: 'session+providerID+id required' });
      const r = await oc('POST', `/api/session/${b.session}/model`, { model: { providerID: b.providerID, id: b.id } });
      return json(res, 200, { ok: r.status < 300 });
    }
    if (p === '/api/stop' && req.method === 'POST') {
      const b = await body(req);
      if (!b.session) return json(res, 400, { ok: false, error: 'session required' });
      const r = await oc('POST', `/api/session/${b.session}/interrupt`);
      return json(res, 200, { ok: r.status < 300, status: r.status });
    }
    if (p === '/api/menu' && req.method === 'GET') {
      const sk = await oc('GET', '/api/skill?directory=/');
      const cm = await oc('GET', '/api/command?directory=/');
      let skills = [], commands = [];
      try { skills = (JSON.parse(sk.text).data || []).map(x => ({ name: x.name, description: String(x.description || '').replace(/\s+/g, ' ').slice(0, 140) })); } catch {}
      try { commands = (JSON.parse(cm.text).data || []).map(x => ({ name: x.name, description: String(x.description || '').replace(/\s+/g, ' ').slice(0, 140) })); } catch {}
      return json(res, 200, { ok: true, commands, skills });
    }
    if (p === '/api/stream' && req.method === 'GET') {
      const sid = url.searchParams.get('session') || '';
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      const ac = new AbortController();
      req.on('close', () => ac.abort());
      try {
        const r = await fetch(`${OC_URL}/api/session/${sid}/event`, { headers: { 'Authorization': OC_AUTH, 'Accept': 'text/event-stream' }, signal: ac.signal });
        const reader = r.body.getReader();
        while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
      } catch {}
      return res.end();
    }

    json(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
});

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`opencode-mob-web on :${PORT} -> ${OC_URL}`);
  if (!WEB_PW) console.log('WARNING: WEB_PASSWORD is empty вЂ” the UI is unprotected');
});


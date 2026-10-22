const crypto = require('node:crypto');

const SESSION_SECONDS = 60 * 60 * 8;
const attempts = new Map();

function send(res, status, value, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  Object.entries(headers).forEach(([key, val]) => res.setHeader(key, val));
  res.end(JSON.stringify(value));
}

function cookieValue(req, name) {
  return (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function publicOnly(value) {
  if (Array.isArray(value)) return value.filter((item) => !item || item.published !== false).map(publicOnly);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'draft').map(([key, item]) => [key, publicOnly(item)]));
}

function sessionExpiry(req) {
  const secret = process.env.SESSION_SECRET;
  const raw = cookieValue(req, 'portfolio_admin');
  if (!secret || !raw) return 0;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return 0;
  try { const exp = JSON.parse(Buffer.from(payload, 'base64url').toString()).exp; return Number.isFinite(exp) ? exp : 0; } catch { return 0; }
}
function validSession(req) { return sessionExpiry(req) > Date.now(); }

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 7_000_000) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function readFile(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let overflow = false;
    req.on('data', chunk => { size += chunk.length; if (size > limit) { overflow = true; chunks.length = 0; return; } if (!overflow) chunks.push(chunk); });
    req.on('end', () => overflow ? reject(new Error('Files must be 4 MB or smaller.')) : resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function supabase(path, options = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Storage is not configured. Add Supabase environment variables.');
  const authHeaders = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) authHeaders.Authorization = `Bearer ${key}`;
  const response = await fetch(`${base.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: { ...authHeaders, ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}

module.exports = async function handler(req, res) {
  const route = (req.query.path || []).join('/');
  if (req.method === 'GET' && route === 'content') {
    try {
      const rows = await supabase('portfolio_content?key=eq.main&select=published');
      return send(res, 200, publicOnly(rows?.[0]?.published || {}), { 'Cache-Control': 'no-store' });
    } catch (error) { return send(res, 503, { error: error.message }); }
  }
  if (req.method === 'POST' && route === 'login') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const now = Date.now();
    const state = attempts.get(ip) || { count: 0, until: 0 };
    if (state.until > now) return send(res, 429, { error: 'Too many attempts. Try again later.' }, { 'Retry-After': String(Math.ceil((state.until - now) / 1000)) });
    try {
      const { password } = await parseBody(req);
      const stored = process.env.ADMIN_PASSWORD_HASH;
      if (!stored || !process.env.SESSION_SECRET) return send(res, 503, { error: 'Admin access is not configured.' });
      const [salt, expected] = stored.split(':');
      const actual = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
      if (!expected || !safeEqual(actual, expected)) {
        state.count += 1;
        if (state.count >= 5) { state.until = now + 15 * 60 * 1000; state.count = 0; }
        attempts.set(ip, state);
        return send(res, 401, { error: 'Incorrect password.' });
      }
      attempts.delete(ip);
      const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_SECONDS * 1000 })).toString('base64url');
      const token = `${payload}.${sign(payload, process.env.SESSION_SECRET)}`;
      return send(res, 200, { ok: true, expiresAt: now + SESSION_SECONDS * 1000 }, { 'Set-Cookie': `portfolio_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}` });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && route === 'logout') return send(res, 200, { ok: true }, { 'Set-Cookie': 'portfolio_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
  if (!validSession(req)) return send(res, 401, { error: 'Authentication required.' });
  if (req.method === 'GET' && route === 'admin/content') {
    try { const rows = await supabase('portfolio_content?key=eq.main&select=draft,published,updated_at'); return send(res, 200, { ...(rows?.[0] || { draft: {}, published: {}, updated_at: null }), sessionExpiresAt: sessionExpiry(req) }, { 'Cache-Control': 'no-store' }); }
    catch (error) { return send(res, 503, { error: error.message }); }
  }
  if (req.method === 'PUT' && route === 'admin/content') {
    try {
      const body = await parseBody(req);
      if (!body.content || typeof body.content !== 'object' || JSON.stringify(body.content).length > 1_000_000) return send(res, 400, { error: 'Content must be a JSON object under 1 MB.' });
      const contact = body.content.contact || {};
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email))) return send(res, 400, { error: 'Enter a valid contact email address.' });
      for (const field of ['github', 'linkedin']) {
        if (!contact[field]) continue;
        try { const url = new URL(contact[field]); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
        catch { return send(res, 400, { error: `Enter a valid ${field} URL.` }); }
      }
      const rows = await supabase('portfolio_content?key=eq.main&select=published');
      const previous = rows?.[0]?.published || {};
      const update = { key: 'main', draft: body.content, updated_at: new Date().toISOString() };
      if (body.publish === true) update.published = body.content;
      else if (!rows?.length) update.published = previous;
      await supabase('portfolio_content?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(update) });
      return send(res, 200, { ok: true });
    } catch (error) { return send(res, 503, { error: error.message }); }
  }
  if (req.method === 'POST' && route === 'admin/upload') {
    try {
      const type = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
      if (!allowed.has(type)) return send(res, 400, { error: 'Upload a JPG, PNG, WebP, GIF, or PDF up to 4 MB.' });
      const bytes = await readFile(req, 4 * 1024 * 1024);
      if (!bytes.length) return send(res, 400, { error: 'The selected file is empty.' });
      const signatures = {
        'image/jpeg': bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
        'image/png': bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        'image/webp': bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
        'image/gif': ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)),
        'application/pdf': bytes.toString('ascii', 0, 5) === '%PDF-',
      };
      if (!signatures[type]) return send(res, 400, { error: 'File contents do not match the selected type.' });
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' })[type];
      const key = `portfolio/${crypto.randomUUID()}.${ext}`;
      const base = process.env.SUPABASE_URL;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-assets';
      const storageKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      const storageHeaders = { apikey: storageKey, 'Content-Type': type, 'x-upsert': 'false' };
      if (!storageKey.startsWith('sb_')) storageHeaders.Authorization = `Bearer ${storageKey}`;
      const uploaded = await fetch(`${base.replace(/\/$/, '')}/storage/v1/object/${bucket}/${key}`, { method: 'POST', headers: storageHeaders, body: bytes });
      if (!uploaded.ok) throw new Error(`File storage failed (${uploaded.status})`);
      let name = '';
      try { name = decodeURIComponent(String(req.headers['x-file-name'] || '')); } catch { name = ''; }
      return send(res, 200, { url: `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${key}`, name: name.slice(0, 160) });
    } catch (error) { return send(res, 503, { error: error.message }); }
  }
  return send(res, 404, { error: 'Not found.' });
};

module.exports.config = { api: { bodyParser: false } };

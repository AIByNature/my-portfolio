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

function validSession(req) {
  const secret = process.env.SESSION_SECRET;
  const raw = cookieValue(req, 'portfolio_admin');
  if (!secret || !raw) return false;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 7_000_000) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

async function supabase(path, options = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Storage is not configured. Add Supabase environment variables.');
  const response = await fetch(`${base.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}

module.exports = async function handler(req, res) {
  const route = (req.query.path || []).join('/');
  if (req.method === 'GET' && route === 'content') {
    try {
      const rows = await supabase('portfolio_content?key=eq.main&select=published');
      return send(res, 200, publicOnly(rows?.[0]?.published || {}));
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
      return send(res, 200, { ok: true }, { 'Set-Cookie': `portfolio_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}` });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  if (req.method === 'POST' && route === 'logout') return send(res, 200, { ok: true }, { 'Set-Cookie': 'portfolio_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
  if (!validSession(req)) return send(res, 401, { error: 'Authentication required.' });
  if (req.method === 'GET' && route === 'admin/content') {
    try { const rows = await supabase('portfolio_content?key=eq.main&select=draft,published'); return send(res, 200, rows?.[0] || { draft: {}, published: {} }); }
    catch (error) { return send(res, 503, { error: error.message }); }
  }
  if (req.method === 'PUT' && route === 'admin/content') {
    try {
      const body = await parseBody(req);
      if (!body.content || typeof body.content !== 'object' || JSON.stringify(body.content).length > 1_000_000) return send(res, 400, { error: 'Content must be a JSON object under 1 MB.' });
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
      const { name, type, data } = await parseBody(req);
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
      if (!allowed.has(type) || typeof data !== 'string' || data.length > 5_500_000) return send(res, 400, { error: 'Upload a JPG, PNG, WebP, GIF, or PDF up to 4 MB.' });
      const bytes = Buffer.from(data, 'base64');
      if (bytes.length > 4 * 1024 * 1024) return send(res, 400, { error: 'Files must be 4 MB or smaller.' });
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
      const uploaded = await fetch(`${base.replace(/\/$/, '')}/storage/v1/object/${bucket}/${key}`, { method: 'POST', headers: { apikey: storageKey, Authorization: `Bearer ${storageKey}`, 'Content-Type': type, 'x-upsert': 'false' }, body: bytes });
      if (!uploaded.ok) throw new Error(`File storage failed (${uploaded.status})`);
      return send(res, 200, { url: `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${key}`, name: String(name || '').slice(0, 160) });
    } catch (error) { return send(res, 503, { error: error.message }); }
  }
  return send(res, 404, { error: 'Not found.' });
};

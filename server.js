// Laufkarte Softwareeinführung – kleiner Server ohne Abhängigkeiten
// Liefert die Oberfläche aus und speichert die Vorgänge gemeinsam in einer JSON-Datei.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '8080', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'vorgaenge.json');
const FB_FILE = path.join(DATA_DIR, 'feedback.json');
const CFG_FILE = path.join(DATA_DIR, 'config.json'); // Einstellungen (Bezeichnungen, Mailadressen); liegen nur im Daten-Volume
const PUBLIC_DIR = path.join(__dirname, 'public');
// Optionaler Passwortschutz (HTTP Basic Auth); leer = kein Schutz
const AUTH_USER = process.env.BASIC_AUTH_USER || '';
const AUTH_PASS = process.env.BASIC_AUTH_PASS || '';
const MAX_BODY = 512 * 1024; // max. 512 KB je Vorgang

fs.mkdirSync(DATA_DIR, { recursive: true });

// Vorgänge im Speicher halten, bei jeder Änderung atomar auf die Platte schreiben
let items = {};
try { items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { items = {}; }
let feedback = {};
try { feedback = JSON.parse(fs.readFileSync(FB_FILE, 'utf8')); } catch (e) { feedback = {}; }
let config = null; // null = Standardwerte der Oberfläche
try { config = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch (e) { config = null; }
let rev = Date.now();

function persist(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
  rev = Date.now();
}

// Zeitkonstanter Vergleich für Zugangsdaten
function safeEqual(a, b) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
// Zugangslink: /?key=<Passwort> setzt ein Cookie, danach ist keine Passwortabfrage mehr nötig
const COOKIE_VAL = AUTH_USER ? crypto.createHash('sha256').update(AUTH_USER + ':' + AUTH_PASS).digest('hex') : '';
function hasCookie(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)lk=([a-f0-9]{64})/);
  return !!m && safeEqual(m[1], COOKIE_VAL);
}
function authorized(req) {
  if (!AUTH_USER) return true;
  if (hasCookie(req)) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const [u, ...p] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
  return safeEqual(u, AUTH_USER) && safeEqual(p.join(':'), AUTH_PASS);
}

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('zu groß')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const ID_RE = /^[a-z0-9]{4,32}$/;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Gesundheitsprüfung für Docker (ohne Anmeldung, gibt keine Daten preis)
  if (url.pathname === '/healthz') return send(res, 200, { ok: true });

  // Zugangslink einlösen: Cookie setzen und ohne Schlüssel in der Adresse weiterleiten
  const key = url.searchParams.get('key');
  if (AUTH_USER && key !== null && req.method === 'GET') {
    if (!safeEqual(key, AUTH_PASS)) return send(res, 403, 'Zugangslink ungültig', 'text/plain; charset=utf-8');
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.writeHead(302, { 'Set-Cookie': `lk=${COOKIE_VAL}; Path=/; Max-Age=7776000; HttpOnly; SameSite=Lax${secure}`, 'Location': '/', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    return res.end();
  }
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Laufkarte", charset="UTF-8"' });
    return res.end('Anmeldung erforderlich');
  }

  // API: Liste aller Vorgänge
  if (url.pathname === '/api/vorgaenge' && req.method === 'GET') {
    return send(res, 200, { rev, items, feedback, config });
  }
  // API: Einstellungen speichern
  if (url.pathname === '/api/config') {
    if (req.method !== 'PUT') return send(res, 405, { error: 'Methode nicht erlaubt' });
    try {
      const doc = JSON.parse(await readBody(req));
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return send(res, 400, { error: 'ungültige Einstellungen' });
      config = doc; persist(CFG_FILE, config);
      return send(res, 200, { ok: true, rev });
    } catch (e) { return send(res, 400, { error: 'ungültige Daten' }); }
  }
  // API: einzelnen Vorgang speichern oder löschen
  const m = url.pathname.match(/^\/api\/(vorgaenge|feedback)\/([^/]+)$/);
  if (m) {
    const isFb = m[1] === 'feedback', col = isFb ? feedback : items, file = isFb ? FB_FILE : DATA_FILE;
    const id = m[2];
    if (!ID_RE.test(id)) return send(res, 400, { error: 'ungültige ID' });
    if (req.method === 'PUT') {
      try {
        const doc = JSON.parse(await readBody(req));
        if (!doc || typeof doc !== 'object' || Array.isArray(doc) || doc.id !== id) return send(res, 400, { error: 'ungültiger Vorgang' });
        col[id] = doc; persist(file, col);
        return send(res, 200, { ok: true, rev });
      } catch (e) { return send(res, 400, { error: 'ungültige Daten' }); }
    }
    if (req.method === 'DELETE') {
      delete col[id]; persist(file, col);
      return send(res, 200, { ok: true, rev });
    }
    return send(res, 405, { error: 'Methode nicht erlaubt' });
  }

  // Oberfläche ausliefern
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, 'index.html')), 'text/html; charset=utf-8');
  }
  send(res, 404, { error: 'nicht gefunden' });
});

server.listen(PORT, () => console.log(`Laufkarte läuft auf Port ${PORT}, Daten in ${DATA_FILE}${AUTH_USER ? ', Passwortschutz aktiv' : ''}`));

/* İHA Müfredat Sistemi — internetsiz eşitleme (aynı modem / Wi‑Fi ağı) — ana süreç tarafı.
   - Her bilgisayar kendi ağında küçük bir sunucu açar (TCP 47811…47815) ve UDP 47812 üzerinden kendini duyurur.
   - Yalnız aynı "ağ eşitleme kodunu" bilen cihazlar birbirini görür ve konuşabilir: her istek kodla imzalanır (HMAC-SHA256),
     5 dakikadan eski ya da imzası tutmayan istek reddedilir. Kod ağda hiçbir zaman açık gönderilmez.
   - Kayıtların birleştirilmesini arayüz yapar (çakışmasız birleştirme, ui/js/merge.js); bu dosya yalnız taşıyıcıdır. */
const http = require('http');
const dgram = require('dgram');
const crypto = require('crypto');
const os = require('os');

const TCP_PORTS = [47811, 47813, 47814, 47815, 47816];
const UDP_PORT = 47812;
const MAX_BODY = 80 * 1024 * 1024;

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const hmac = (key, s) => crypto.createHmac('sha256', String(key)).update(String(s)).digest('hex');
const tag = (code) => sha('iha-lan|' + code).slice(0, 16); // kodun kendisi değil, özetinin bir kısmı duyurulur

function addrs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address, netmask: a.netmask });
  }
  return out;
}
function broadcasts() {
  const s = new Set(['255.255.255.255']);
  for (const a of addrs()) {
    try {
      const ip = a.address.split('.').map(Number); const m = a.netmask.split('.').map(Number);
      s.add(ip.map((x, i) => (x & m[i]) | (~m[i] & 255)).join('.'));
    } catch (e) {}
  }
  return [...s];
}

function createLan({ onRequest, log }) {
  const L = { server: null, udp: null, port: 0, cfg: null, peers: new Map() };

  function sign(method, pth, body) {
    const ts = Date.now();
    return { ts, sig: hmac(L.cfg.code, method + '\n' + pth + '\n' + ts + '\n' + sha(body || '')) };
  }
  function verify(req, body) {
    const ts = +req.headers['x-iha-ts'] || 0;
    if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;
    const want = hmac(L.cfg.code, req.method + '\n' + req.url + '\n' + ts + '\n' + sha(body || ''));
    const got = String(req.headers['x-iha-sig'] || '');
    return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  }
  const info = () => ({ app: 'iha-mufredat', id: L.cfg.id, name: L.cfg.name, port: L.port, tag: tag(L.cfg.code), v: L.cfg.version || '' });

  function startServer() {
    return new Promise((resolve, reject) => {
      let i = 0;
      const tryNext = () => {
        if (i >= TCP_PORTS.length) return reject(new Error('port'));
        const port = TCP_PORTS[i++];
        const srv = http.createServer((req, res) => {
          const chunks = []; let size = 0; let dead = false;
          req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { dead = true; res.writeHead(413).end(); req.destroy(); } else chunks.push(c); });
          req.on('end', async () => {
            if (dead) return;
            const body = Buffer.concat(chunks).toString('utf8');
            if (!L.cfg || !verify(req, body)) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"auth"}'); return; }
            try {
              if (req.method === 'GET' && req.url === '/iha/info') { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(info())); return; }
              if (req.method === 'POST' && req.url === '/iha/sync') {
                const out = await onRequest(body, req.socket.remoteAddress);
                res.writeHead(200, { 'content-type': 'application/json' }).end(out);
                return;
              }
              res.writeHead(404).end();
            } catch (e) { log && log('lan istek: ' + e.message); res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: String(e.message || e) })); }
          });
        });
        srv.on('error', () => tryNext());
        srv.listen(port, '0.0.0.0', () => { L.server = srv; L.port = port; resolve(port); });
      };
      tryNext();
    });
  }
  function startUdp() {
    return new Promise((resolve) => {
      const u = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      u.on('error', (e) => { log && log('lan udp: ' + e.message); try { u.close(); } catch (er) {} L.udp = null; resolve(false); });
      u.on('message', (msg, rinfo) => {
        let j; try { j = JSON.parse(msg.toString('utf8')); } catch (e) { return; }
        if (!L.cfg || !j || j.app !== 'iha-mufredat' || j.tag !== tag(L.cfg.code) || j.id === L.cfg.id) return;
        if (j.q) { const r = Buffer.from(JSON.stringify(info())); u.send(r, 0, r.length, rinfo.port, rinfo.address); }
        if (j.port) L.peers.set(j.id, { id: j.id, name: j.name, host: rinfo.address, port: j.port, v: j.v, seen: Date.now() });
      });
      u.bind(UDP_PORT, () => { try { u.setBroadcast(true); } catch (e) {} L.udp = u; resolve(true); });
    });
  }

  L.start = async (cfg) => {
    L.stop();
    L.cfg = Object.assign({}, cfg);
    if (!L.cfg.code || String(L.cfg.code).length < 6) throw new Error('kod');
    await startServer();
    await startUdp();
    return L.status();
  };
  L.stop = () => {
    try { L.server && L.server.close(); } catch (e) {}
    try { L.udp && L.udp.close(); } catch (e) {}
    L.server = null; L.udp = null; L.port = 0; L.peers.clear();
  };
  L.status = () => ({ on: !!L.server, port: L.port, udp: !!L.udp, addrs: addrs().map((a) => a.address), id: L.cfg && L.cfg.id, name: L.cfg && L.cfg.name });
  L.discover = (ms) => new Promise((resolve) => {
    if (!L.cfg) return resolve([]);
    const q = Buffer.from(JSON.stringify({ app: 'iha-mufredat', q: 1, id: L.cfg.id, tag: tag(L.cfg.code), name: L.cfg.name, port: L.port, v: L.cfg.version || '' }));
    const sock = L.udp || dgram.createSocket('udp4');
    const own = !L.udp;
    const send = () => { for (const b of broadcasts()) { try { sock.send(q, 0, q.length, UDP_PORT, b); } catch (e) {} } };
    const go = () => {
      try { sock.setBroadcast(true); } catch (e) {}
      if (own) sock.on('message', (msg, rinfo) => { try { const j = JSON.parse(msg.toString('utf8')); if (j.app === 'iha-mufredat' && j.tag === tag(L.cfg.code) && j.id !== L.cfg.id && j.port) L.peers.set(j.id, { id: j.id, name: j.name, host: rinfo.address, port: j.port, v: j.v, seen: Date.now() }); } catch (e) {} });
      send(); setTimeout(send, 400); setTimeout(send, 1200);
      setTimeout(() => { if (own) { try { sock.close(); } catch (e) {} } const now = Date.now(); resolve([...L.peers.values()].filter((p) => now - p.seen < 60000)); }, ms || 2500);
    };
    if (own) sock.bind(0, go); else go();
  });
  L.call = (host, port, method, pth, body) => new Promise((resolve, reject) => {
    if (!L.cfg) return reject(new Error('kapali'));
    const s = sign(method, pth, body || '');
    const buf = Buffer.from(body || '', 'utf8');
    const req = http.request({ host, port, method, path: pth, timeout: 120000, headers: { 'content-type': 'application/json', 'content-length': buf.length, 'x-iha-ts': s.ts, 'x-iha-sig': s.sig } }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c));
      res.on('end', () => { const txt = Buffer.concat(chunks).toString('utf8'); if (res.statusCode === 401) reject(new Error('auth')); else if (res.statusCode !== 200) reject(new Error('HTTP ' + res.statusCode + ' ' + txt.slice(0, 200))); else resolve(txt); });
    });
    req.on('timeout', () => { req.destroy(new Error('zaman aşımı')); });
    req.on('error', reject);
    req.end(buf);
  });
  return L;
}

module.exports = { createLan };

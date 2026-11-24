/* İHA Müfredat Sistemi — masaüstü ana süreç (Electron) — kabuk 3
   - 3: pencere düğmeleri (küçült / tam ekran ⇄ pencere / kapat), internetsiz ağ eşitlemesi (lan.js),
     günlük yedeklerden geri dönüş, hata günlüğü, çekirdeğin uygulama içinden güncellenmesi (boot.js korumalı).
   - Her açılışta tam ekran başlar; F11 ya da üst çubuktaki düğme ile pencere görünümüne geçilir.
   - Veriler %APPDATA%\IHAMufredatSistemi klasöründe tutulur; yamalar yalnız program dosyalarını değiştirir, bu klasöre dokunmaz.
   - Her gün otomatik yedek alınır (son 30 gün). */
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, net, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

const VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf8')).version; } catch (e) { return '1.0'; } })();
const TITLE_BASE = 'İHA Müfredat Sistemi';
app.setName('IHA Mufredat Sistemi');
app.setPath('userData', path.join(app.getPath('appData'), 'IHAMufredatSistemi'));
const DATA_DIR = app.getPath('userData');
const DB_FILE = path.join(DATA_DIR, 'veri', 'db.json');
const BK_DIR = path.join(DATA_DIR, 'yedekler');
const UI_DIR = path.join(__dirname, 'ui');
const SHELL_VERSION = 3; // uygulama içi güncelleme (OTA) arayüzü
const KABUK_VER = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'kabuk-durum.json'), 'utf8')).version || '3'; } catch (e) { return '3'; } })();
const LOG_FILE = path.join(DATA_DIR, 'hatalar.log');
function logErr(text) { try { ensureDir(DATA_DIR); if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 300000) fs.renameSync(LOG_FILE, LOG_FILE + '.1'); fs.appendFileSync(LOG_FILE, new Date().toISOString() + ' ' + String(text).slice(0, 4000) + '\n'); } catch (e) {} }
process.on('uncaughtException', (e) => { logErr('ana: ' + (e && e.stack || e)); });

/* ---------- Uygulama içi güncelleme (OTA) ----------
   Yeni arayüz paketleri %APPDATA%\IHAMufredatSistemi\ota\<sürüm>\ klasörüne yazılır.
   Yeni sürüm ilk açılışta "açıldı" onayı vermezse bir sonraki açılışta önceki sürüme dönülür. */
const OTA_DIR = path.join(DATA_DIR, 'ota');
const OTA_STATE = path.join(OTA_DIR, 'state.json');
const vnum = (v) => { const [a, b] = String(v || '0').split('.').map((x) => parseInt(x, 10) || 0); return a * 1000 + b; };
const readState = () => { try { return JSON.parse(fs.readFileSync(OTA_STATE, 'utf8')); } catch (e) { return {}; } };
const writeState = (st) => { ensureDir(OTA_DIR); fs.writeFileSync(OTA_STATE, JSON.stringify(st, null, 1)); };
const otaOk = (v) => v && fs.existsSync(path.join(OTA_DIR, v, 'index.html'));
function resolveUi() {
  const st = readState();
  for (let guard = 0; guard < 3; guard++) {
    if (!(otaOk(st.current) && vnum(st.current) > vnum(VERSION))) return { dir: UI_DIR, version: VERSION };
    if (st.pending) {
      if ((st.tries || 0) >= 1) { st.bad = st.current; st.current = st.previous && st.previous !== st.bad ? st.previous : null; st.previous = null; st.pending = false; st.tries = 0; writeState(st); continue; }
      st.tries = (st.tries || 0) + 1; writeState(st);
    }
    return { dir: path.join(OTA_DIR, st.current), version: st.current };
  }
  return { dir: UI_DIR, version: VERSION };
}
let ACTIVE = { dir: UI_DIR, version: VERSION };
/* Kısayol adlarını ve "Programlar" listesindeki adı etkin sürüme göre günceller (yalnız Windows) */
function syncVersionNames(ver) {
  if (process.platform !== 'win32') return;
  const base = 'İHA Müfredat Sistemi';
  const dirs = [app.getPath('desktop'), path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', base)];
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(d)) {
        if (f.startsWith(base + ' v') && f.endsWith('.lnk') && f !== base + ' v' + ver + '.lnk') { try { fs.renameSync(path.join(d, f), path.join(d, base + ' v' + ver + '.lnk')); } catch (e) {} }
      }
    } catch (e) {}
  }
  try {
    const { execFile } = require('child_process');
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\IHAMufredatSistemi';
    execFile('reg', ['add', key, '/v', 'DisplayName', '/d', base + ' v' + ver, '/f'], () => {});
    execFile('reg', ['add', key, '/v', 'DisplayVersion', '/d', ver, '/f'], () => {});
    execFile('reg', ['add', 'HKCU\\Software\\IHAMufredatSistemi', '/v', 'Version', '/d', ver, '/f'], () => {});
  } catch (e) {}
}

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

if (!app.requestSingleInstanceLock()) { app.quit(); }
let win = null;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function writeSafe(file, text) { ensureDir(path.dirname(file)); const tmp = file + '.tmp'; fs.writeFileSync(tmp, text, 'utf8'); if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + '.bak'); } catch (e) {} } fs.renameSync(tmp, file); }
function dailyBackup(json) {
  try {
    ensureDir(BK_DIR);
    const day = new Date().toISOString().slice(0, 10);
    const f = path.join(BK_DIR, 'yedek_' + day + '.json');
    if (!fs.existsSync(f)) {
      fs.writeFileSync(f, json, 'utf8');
      const all = fs.readdirSync(BK_DIR).filter((x) => /^yedek_.*\.json$/.test(x)).sort();
      while (all.length > 30) fs.unlinkSync(path.join(BK_DIR, all.shift()));
    }
  } catch (e) { console.error(e); }
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function createWindow() {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1400, wa.width), height: Math.min(900, wa.height), minWidth: 900, minHeight: 600,
    fullscreen: true, show: false, backgroundColor: '#061327', title: TITLE_BASE + ' v' + ACTIVE.version,
    icon: path.join(__dirname, 'icon.ico'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.on('page-title-updated', (e) => { e.preventDefault(); });
  win.once('ready-to-show', () => { win.setFullScreen(true); win.show(); });
  win.loadURL('app://mufredat/index.html');
  const sendFs = () => { if (win && !win.isDestroyed()) win.webContents.send('fs-changed', win.isFullScreen()); };
  let sizing = false;
  win.on('enter-full-screen', sendFs);
  const sendWs = () => { if (win && !win.isDestroyed()) win.webContents.send('win-state', { fs: win.isFullScreen(), max: win.isMaximized(), min: win.isMinimized() }); };
  ['maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => win.on(ev, () => setTimeout(sendWs, 60)));
  win.webContents.on('render-process-gone', (e, d) => logErr('arayüz çöktü: ' + JSON.stringify(d)));
  win.on('leave-full-screen', () => {
    sendFs();
    if (sizing) return; sizing = true;
    setTimeout(() => { try { const d = screen.getDisplayMatching(win.getBounds()).workArea; const w = Math.min(1400, d.width - 40), h = Math.min(900, d.height - 40); win.setBounds({ x: d.x + Math.round((d.width - w) / 2), y: d.y + Math.round((d.height - h) / 2), width: w, height: h }); } catch (e) {} sizing = false; }, 150);
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'F12' && input.control && input.shift) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || !p) p = '/index.html';
    const root = ACTIVE.dir;
    let file = path.normalize(path.join(root, p));
    if (file.startsWith(root) && !fs.existsSync(file) && root !== UI_DIR) file = path.normalize(path.join(UI_DIR, p)); // eksik dosya: kurulu pakete düş
    if (!(file.startsWith(root) || file.startsWith(UI_DIR)) || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  });

  ipcMain.handle('db:save', (e, json) => { writeSafe(DB_FILE, json); dailyBackup(json); return true; });
  ipcMain.handle('db:load', () => { for (const f of [DB_FILE, DB_FILE + '.bak']) { try { if (fs.existsSync(f)) { const s = fs.readFileSync(f, 'utf8'); JSON.parse(s); return s; } } catch (e) {} } return null; });
  ipcMain.handle('win:toggleFs', () => { const v = !win.isFullScreen(); win.setFullScreen(v); return v; });
  ipcMain.handle('win:isFs', () => win.isFullScreen());
  // ---- kabuk 3: pencere düğmeleri ----
  ipcMain.handle('win:min', () => { if (win.isFullScreen()) { win.once('leave-full-screen', () => setTimeout(() => win.minimize(), 250)); win.setFullScreen(false); } else win.minimize(); return true; });
  ipcMain.handle('win:max', () => { if (win.isFullScreen()) win.setFullScreen(false); else if (win.isMaximized()) win.unmaximize(); else win.maximize(); return true; });
  ipcMain.handle('win:state', () => ({ fs: win.isFullScreen(), max: win.isMaximized(), min: win.isMinimized() }));
  // ---- kabuk 3: yedeklerden geri dönüş ----
  const BK_RX = /^[\w.-]+\.json$/;
  ipcMain.handle('backup:list', () => { ensureDir(BK_DIR); return fs.readdirSync(BK_DIR).filter((f) => BK_RX.test(f)).map((f) => { const st = fs.statSync(path.join(BK_DIR, f)); return { name: f, size: st.size, mtime: st.mtimeMs }; }).sort((a, b) => b.mtime - a.mtime); });
  ipcMain.handle('backup:read', (e, name) => { if (!BK_RX.test(name)) throw new Error('ad'); return fs.readFileSync(path.join(BK_DIR, name), 'utf8'); });
  ipcMain.handle('backup:snapshot', (e, json, why) => { ensureDir(BK_DIR); const n = 'once_' + String(why || 'geri').replace(/[^\w-]+/g, '') + '_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'; fs.writeFileSync(path.join(BK_DIR, n), json, 'utf8'); return n; });
  // ---- kabuk 3: hata günlüğü ve bilgi ----
  ipcMain.handle('log:error', (e, text) => { logErr('arayüz: ' + text); return true; });
  ipcMain.handle('log:read', () => { try { return fs.readFileSync(LOG_FILE, 'utf8').slice(-20000); } catch (e) { return ''; } });
  ipcMain.handle('app:info', () => ({ shell: SHELL_VERSION, kabuk: KABUK_VER, electron: process.versions.electron, chrome: process.versions.chrome, os: os.type() + ' ' + os.release(), arch: process.arch, dataDir: DATA_DIR, host: os.hostname() }));
  ipcMain.handle('data:open', () => { shell.openPath(DATA_DIR); return true; });
  // ---- kabuk 3: çekirdeğin kendi kendini güncellemesi (boot.js geri dönüş korumalı) ----
  const KABUK_FILES = ['main.js', 'preload.js', 'lan.js'];
  const KSTATE = path.join(__dirname, 'kabuk-durum.json');
  ipcMain.handle('kabuk:apply', (e, ver, files, hash) => {
    if (!/^[\d.]+$/.test(String(ver))) throw new Error('surum');
    const names = Object.keys(files || {}).filter((f) => KABUK_FILES.includes(f));
    if (!names.includes('main.js')) throw new Error('paket eksik');
    for (const f of names) { const tmp = path.join(__dirname, f + '.new'); fs.writeFileSync(tmp, Buffer.from(files[f], 'base64')); }
    for (const f of names) { const cur = path.join(__dirname, f); if (fs.existsSync(cur)) fs.copyFileSync(cur, cur + '.prev'); }
    for (const f of names) fs.renameSync(path.join(__dirname, f + '.new'), path.join(__dirname, f));
    fs.writeFileSync(KSTATE, JSON.stringify({ version: String(ver), hash: String(hash || ''), files: names, pending: true, tries: 0, at: new Date().toISOString() }, null, 1));
    return true;
  });
  ipcMain.handle('kabuk:ok', () => { try { const st = JSON.parse(fs.readFileSync(KSTATE, 'utf8')); if (st.pending) { st.pending = false; st.tries = 0; fs.writeFileSync(KSTATE, JSON.stringify(st, null, 1)); } return st; } catch (e) { return {}; } });
  ipcMain.handle('kabuk:state', () => { try { return JSON.parse(fs.readFileSync(KSTATE, 'utf8')); } catch (e) { return {}; } });
  // ---- kabuk 3: internetsiz ağ eşitlemesi ----
  let LAN = null; const lanWait = new Map(); let lanSeq = 0;
  const lan = () => { if (!LAN) LAN = require('./lan.js').createLan({ log: logErr, onRequest: (body, from) => new Promise((res, rej) => { const id = ++lanSeq; const tm = setTimeout(() => { lanWait.delete(id); rej(new Error('zaman aşımı')); }, 90000); lanWait.set(id, { res, rej, tm }); win.webContents.send('lan:req', id, body, from); }) }); return LAN; };
  ipcMain.handle('lan:res', (e, id, text, err) => { const w = lanWait.get(id); if (!w) return false; clearTimeout(w.tm); lanWait.delete(id); if (err) w.rej(new Error(err)); else w.res(text); return true; });
  ipcMain.handle('lan:start', (e, cfg) => lan().start(cfg));
  ipcMain.handle('lan:stop', () => { if (LAN) LAN.stop(); return true; });
  ipcMain.handle('lan:status', () => (LAN ? LAN.status() : { on: false }));
  ipcMain.handle('lan:discover', (e, ms) => lan().discover(ms));
  ipcMain.handle('lan:call', (e, host, port, method, pth, body) => lan().call(host, port, method, pth, body));
  ipcMain.handle('file:save', async (e, name, b64) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name) });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, Buffer.from(b64, 'base64'));
    shell.showItemInFolder(r.filePath);
    return r.filePath;
  });
  ipcMain.handle('file:open', async (e, name, b64) => {
    const dir = path.join(os.tmpdir(), 'IHAMufredat'); ensureDir(dir);
    const f = path.join(dir, name.replace(/[\\/:*?"<>|]+/g, '_'));
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    const err = await shell.openPath(f); return err || true;
  });
  ipcMain.handle('url:open', (e, url) => { if (/^https?:/i.test(url)) shell.openExternal(url); return true; });
  ipcMain.handle('http:get', async (e, url) => { const r = await net.fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
  ipcMain.handle('backup:open', () => { ensureDir(BK_DIR); shell.openPath(BK_DIR); return true; });
  ipcMain.handle('app:quit', () => app.quit());
  // ---- OTA ----
  ipcMain.handle('ota:info', () => ({ shell: SHELL_VERSION, bundled: VERSION, active: ACTIVE.version, state: readState() }));
  ipcMain.handle('ota:write', (e, ver, rel, b64) => {
    if (!/^\d+\.\d+$/.test(ver)) throw new Error('surum');
    const dir = path.join(OTA_DIR, ver + '.tmp');
    const f = path.normalize(path.join(dir, rel));
    if (!f.startsWith(dir) || rel.includes('..')) throw new Error('yol');
    ensureDir(path.dirname(f)); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return true;
  });
  ipcMain.handle('ota:begin', (e, ver) => { const dir = path.join(OTA_DIR, ver + '.tmp'); fs.rmSync(dir, { recursive: true, force: true }); ensureDir(dir); return true; });
  ipcMain.handle('ota:commit', (e, ver) => {
    const tmp = path.join(OTA_DIR, ver + '.tmp'), dir = path.join(OTA_DIR, ver);
    if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('paket eksik');
    fs.rmSync(dir, { recursive: true, force: true }); fs.renameSync(tmp, dir);
    const st = readState(); st.previous = ACTIVE.version !== VERSION ? ACTIVE.version : null; st.current = ver; st.pending = true; st.tries = 0; st.bad = null; writeState(st);
    return true;
  });
  ipcMain.handle('ota:bootOk', () => {
    const st = readState();
    if (st.pending && st.current === ACTIVE.version) { st.pending = false; st.tries = 0; writeState(st); }
    // eski paketleri temizle (etkin ve bir önceki kalır)
    try { for (const d of fs.readdirSync(OTA_DIR)) { if (d === 'state.json') continue; if (d !== st.current && d !== st.previous) fs.rmSync(path.join(OTA_DIR, d), { recursive: true, force: true }); } } catch (e) {}
    syncVersionNames(ACTIVE.version);
    // kabuk 3: arayüz açıldıysa yeni çekirdek de sağlam demektir (boot.js geri dönüşü iptal)
    try { const kf = path.join(__dirname, 'kabuk-durum.json'); const ks = JSON.parse(fs.readFileSync(kf, 'utf8')); if (ks.pending) { ks.pending = false; ks.tries = 0; fs.writeFileSync(kf, JSON.stringify(ks, null, 1)); } } catch (e) {}
    return true;
  });
  ipcMain.handle('ota:restart', () => { app.relaunch(); app.exit(0); });

  const renderHidden = async (html, landscape) => {
    const tmp = path.join(os.tmpdir(), 'iha_print_' + Date.now() + '.html');
    fs.writeFileSync(tmp, html, 'utf8');
    const w = new BrowserWindow({ show: false, webPreferences: { offscreen: false } });
    await w.loadURL(pathToFileURL(tmp).href);
    await new Promise((r) => setTimeout(r, 400));
    return { w, tmp };
  };
  ipcMain.handle('print:html', async (e, html, o) => {
    const { w, tmp } = await renderHidden(html, o && o.landscape);
    return new Promise((res) => {
      w.webContents.print({ printBackground: true, landscape: !!(o && o.landscape) }, (ok, reason) => { try { w.destroy(); fs.unlinkSync(tmp); } catch (er) {} res(ok ? true : reason); });
    });
  });
  ipcMain.handle('print:pdf', async (e, html, name, o) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return null;
    const { w, tmp } = await renderHidden(html);
    const data = await w.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, landscape: !!(o && o.landscape), pageSize: 'A4' });
    fs.writeFileSync(r.filePath, data);
    try { w.destroy(); fs.unlinkSync(tmp); } catch (er) {}
    shell.openPath(r.filePath);
    return r.filePath;
  });

  ACTIVE = resolveUi();
  createWindow();
});
app.on('window-all-closed', () => app.quit());

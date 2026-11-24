/* İHA Müfredat Sistemi — masaüstü ana süreç (Electron) — kabuk 4 (3.4.0+, NSIS kurulumu, ortak çekirdek)
   - Ortak çekirdek (cekirdek/electron/fc-electron-main.js): her açılışta tam ekran, çerçevesiz pencere, sağ üstte
     Küçült · Orta · Tam ekran · Kapat, GitHub Releases güncellemesi (win-app: app.asar yama/tam dosya; win-setup: NSIS),
     ana süreç hataları → çökme raporu.
   - Arayüz app://mufredat/ kökeninden sunulur (localStorage / IndexedDB bu kökene bağlı: DEĞİŞMEZ). Arayüz paketin
     içindeki ui/ klasöründen gelir; eski kabuğun %APPDATA%\IHAMufredatSistemi\ota\ paketleri artık kullanılmaz.
   - Veriler %APPDATA%\IHAMufredatSistemi klasöründe (veri\db.json, yedekler\, hatalar.log) — kabuk 2/3 ile aynı yer.
     Yazma atomiktir (.tmp → yeniden adlandırma, önceki .bak). Her gün otomatik yedek (son 30 gün).
   - İnternetsiz ağ eşitlemesi (lan.js), yazdırma / PDF, dosya kaydet / aç, yedekten geri dönüş: window.desktop (preload.js). */
const { app, BrowserWindow, protocol, ipcMain, dialog, shell, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const fc = require('../cekirdek/electron/fc-electron-main');
const PKG = require('../package.json');
const VERSION = PKG.version;
const SMOKE = !!process.env.IHA_SMOKE;
const TITLE_BASE = 'İHA Müfredat Sistemi';
app.setName('IHA Mufredat Sistemi');
app.setPath('userData', process.env.IHA_VERI || path.join(app.getPath('appData'), 'IHAMufredatSistemi'));
const DATA_DIR = app.getPath('userData');
const DB_FILE = path.join(DATA_DIR, 'veri', 'db.json');
const BK_DIR = path.join(DATA_DIR, 'yedekler');
const UI_DIR = path.join(__dirname, '..', 'ui');
const SHELL_VERSION = 4;
const LOG_FILE = path.join(DATA_DIR, 'hatalar.log');
function logErr(text) { try { ensureDir(DATA_DIR); if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 300000) fs.renameSync(LOG_FILE, LOG_FILE + '.1'); fs.appendFileSync(LOG_FILE, new Date().toISOString() + ' ' + String(text).slice(0, 4000) + '\n'); } catch (e) {} }
process.on('uncaughtException', (e) => { logErr('ana: ' + (e && e.stack || e)); });

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

const gotLock = SMOKE || app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let win = null;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function writeSafe(file, text) { ensureDir(path.dirname(file)); const tmp = file + '.tmp'; const fd = fs.openSync(tmp, 'w'); try { fs.writeSync(fd, text, null, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + '.bak'); } catch (e) {} } fs.renameSync(tmp, file); }
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

/* Eski ayrı kurulumu temizle (≤3.3, kabuk 2/3): %LOCALAPPDATA%\Programs\IHA Mufredat Sistemi (resources\app\main.js ile tanınır).
   Yeni kurulum electron-builder'ın klasörüne (iha-mufredat-sistemi) gider; eski klasör, "İHA Müfredat Sistemi vX.Y" kısayolları ve
   eski "Programlar" kaydı kalırsa kullanıcı yanlışlıkla eski programı açar. Yalnız program dosyaları silinir;
   kayıtlar %APPDATA%\IHAMufredatSistemi'de, ona DOKUNULMAZ. */
function eskiKurulumuTemizle() {
  if (process.platform !== 'win32' || !app.isPackaged || SMOKE) return;
  try {
    const benim = path.dirname(process.execPath).toLowerCase();
    const yerel = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const eski = path.join(yerel, 'Programs', 'IHA Mufredat Sistemi');
    const eskiVar = eski.toLowerCase() !== benim && fs.existsSync(path.join(eski, 'resources', 'app', 'main.js'));
    if (eskiVar) {
      try { fs.rmSync(eski, { recursive: true, force: true, maxRetries: 3 }); logErr('eski kurulum kaldırıldı: ' + eski); } catch (e) { logErr('eski kurulum kaldırılamadı: ' + e.message); }
      try { require('child_process').execFile('reg', ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\IHAMufredatSistemi', '/f'], () => {}); } catch (e) {}
    }
    const kisa = /^İHA Müfredat Sistemi v[\d.]+\.lnk$/i;
    const sm = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    for (const d of [app.getPath('desktop'), sm, path.join(sm, 'İHA Müfredat Sistemi')]) {
      try { for (const f of fs.readdirSync(d)) if (kisa.test(f)) fs.rmSync(path.join(d, f), { force: true }); } catch (e) {}
    }
  } catch (e) { logErr('eski kurulum temizliği: ' + (e && e.message)); }
}

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow(fc.windowOptions({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, backgroundColor: '#061327', title: TITLE_BASE + ' v' + VERSION,
    icon: path.join(__dirname, 'icon.ico'),
    // sandbox:false → preload ortak çekirdeğin fc-preload.js'ini require edebilir (contextIsolation açık kalır)
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, spellcheck: false },
  }));
  fc.install(win, { channel: 'win-app' });
  win.on('page-title-updated', (e) => { e.preventDefault(); });
  win.loadURL('app://mufredat/index.html');
  const sendFs = () => { if (win && !win.isDestroyed()) win.webContents.send('fs-changed', win.isFullScreen()); };
  const sendWs = () => { if (win && !win.isDestroyed()) win.webContents.send('win-state', { fs: win.isFullScreen(), max: win.isMaximized(), min: win.isMinimized() }); };
  ['maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => win.on(ev, () => { sendFs(); setTimeout(sendWs, 60); }));
  win.webContents.on('render-process-gone', (e, d) => logErr('arayüz çöktü: ' + JSON.stringify(d)));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'F12' && input.control && input.shift) win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  if (SMOKE) smoke();
}

/* Electron açılış testi (test/electron-smoke.test.js, IHA_SMOKE=1): pencere, çekirdek, üst çubuk, ayarlar sırası */
function smoke() {
  const out = (o) => process.stdout.write('IHA_SMOKE ' + JSON.stringify(o) + '\n');
  const consoleErrors = [];
  win.webContents.on('console-message', (e, level, message) => { if (level >= 3) consoleErrors.push(String(message).slice(0, 300)); });
  const fail = setTimeout(() => { out({ ok: false, error: 'timeout' }); app.exit(2); }, 60000);
  win.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const r = await win.webContents.executeJavaScript(`({
          fc: !!(window.FC && FC.updater && FC.topbar), host: window.FC && FC.host.kind, desktop: !!window.desktop,
          version: window.APP_VERSION, scheme: document.documentElement.dataset.scheme,
          schemes: FC.look.schemes(), kabuk: !!window.Kabuk,
          topbar: !!document.querySelector('.topbar .topbar-actions'), winBtns: document.querySelectorAll('.topbar .win-controls button').length,
          sync: !!document.querySelector('.topbar .sync-act'), lan: !!document.querySelector('.topbar .lan-act'), update: !!document.querySelector('.topbar .update-act'),
          nav: document.querySelectorAll('.sidebar .nav').length, main: !!document.querySelector('#main .ph, #main .card'),
          title: document.title, errors: (window.__ihaErrors || []).slice(0, 5)
        })`);
        r.fullscreen = win.isFullScreen();
        r.errors = r.errors.concat(consoleErrors.filter((m) => !/net::|Failed to load resource|ERR_|Firebase|firestore/i.test(m)));
        r.settings = await win.webContents.executeJavaScript(`(UI.go('settings'), new Promise((res) => setTimeout(() => {
          res([...document.querySelectorAll('#main .settings-grid > *')].map((c) => c.getAttribute('data-fc-card') || c.id || c.className));
        }, 900)))`);
        clearTimeout(fail);
        out(Object.assign({ ok: r.fc && r.host === 'electron' && r.topbar && r.nav > 0 && !r.errors.length }, r));
        app.exit(0);
      } catch (e) { out({ ok: false, error: String((e && e.message) || e) }); app.exit(3); }
    }, 3500);
  });
}

app.whenReady().then(() => {
  if (!gotLock) return;
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || !p) p = '/index.html';
    const root = UI_DIR;
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  });

  ipcMain.handle('db:save', (e, json) => { writeSafe(DB_FILE, json); dailyBackup(json); return true; });
  ipcMain.handle('db:load', () => { for (const f of [DB_FILE, DB_FILE + '.bak']) { try { if (fs.existsSync(f)) { const s = fs.readFileSync(f, 'utf8'); JSON.parse(s); return s; } } catch (e) {} } return null; });
  // ---- pencere: eski arayüz köprüsü (desktop.toggleFullscreen / minimize …) → ortak çekirdek davranışı ----
  ipcMain.handle('win:toggleFs', () => { const v = !win.isFullScreen(); win.setFullScreen(v); return v; });
  ipcMain.handle('win:isFs', () => win.isFullScreen());
  ipcMain.handle('win:min', () => { win.minimize(); return true; });
  ipcMain.handle('win:max', () => { win.setFullScreen(!win.isFullScreen()); return true; });
  ipcMain.handle('win:state', () => ({ fs: win.isFullScreen(), max: win.isMaximized(), min: win.isMinimized() }));
  // ---- yedeklerden geri dönüş ----
  const BK_RX = /^[\w.-]+\.json$/;
  ipcMain.handle('backup:list', () => { ensureDir(BK_DIR); return fs.readdirSync(BK_DIR).filter((f) => BK_RX.test(f)).map((f) => { const st = fs.statSync(path.join(BK_DIR, f)); return { name: f, size: st.size, mtime: st.mtimeMs }; }).sort((a, b) => b.mtime - a.mtime); });
  ipcMain.handle('backup:read', (e, name) => { if (!BK_RX.test(name)) throw new Error('ad'); return fs.readFileSync(path.join(BK_DIR, name), 'utf8'); });
  ipcMain.handle('backup:snapshot', (e, json, why) => { ensureDir(BK_DIR); const n = 'once_' + String(why || 'geri').replace(/[^\w-]+/g, '') + '_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'; fs.writeFileSync(path.join(BK_DIR, n), json, 'utf8'); return n; });
  // ---- kabuk 3: hata günlüğü ve bilgi ----
  ipcMain.handle('log:error', (e, text) => { logErr('arayüz: ' + text); return true; });
  ipcMain.handle('log:read', () => { try { return fs.readFileSync(LOG_FILE, 'utf8').slice(-20000); } catch (e) { return ''; } });
  ipcMain.handle('app:info', () => ({ shell: SHELL_VERSION, kabuk: String(SHELL_VERSION), version: VERSION, electron: process.versions.electron, chrome: process.versions.chrome, os: os.type() + ' ' + os.release(), arch: process.arch, dataDir: DATA_DIR, host: os.hostname() }));
  ipcMain.handle('data:open', () => { shell.openPath(DATA_DIR); return true; });
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

  createWindow();
  setTimeout(eskiKurulumuTemizle, 15000);
});
app.on('window-all-closed', () => app.quit());

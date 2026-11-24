// Node testleri (bağımlılıksız): sürüm, paketleme, gömülü ortak çekirdek, güncelleme planı, ESKİ KANAL köprüsü (3.3'ün
// güncelleyicisi birebir çalıştırılır), eşitleme kuralı (hiçbir veri kalıcı silinmez), dosya bütünlüğü.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(R('package.json'));

test('tek semver sürüm; ad, ürün adı ve veri klasörü değişmedi', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  const ctx = { window: {} }; vm.runInNewContext(R('ui/js/version.js'), ctx);
  assert.strictEqual(ctx.window.APP_VERSION, pkg.version);
  const cl = { window: {} }; vm.runInNewContext(R('ui/js/changelog.js'), cl);
  assert.strictEqual(cl.window.CHANGELOG[0].v, pkg.version, 'changelog.js en üstte yeni sürüm');
  const notes = JSON.parse(R('release-notes.json'));
  for (const l of ['tr', 'en', 'ar']) assert.ok(notes[l].length > 80, 'not: ' + l);
  assert.strictEqual(pkg.name, 'iha-mufredat-sistemi');
  assert.strictEqual(pkg.productName, 'IHA Mufredat Sistemi');
  assert.strictEqual(pkg.build.productName, 'IHA Mufredat Sistemi');
  const main = R('kabuk/main.js');
  assert.match(main, /app\.setName\('IHA Mufredat Sistemi'\)/);
  assert.match(main, /path\.join\(app\.getPath\('appData'\), 'IHAMufredatSistemi'\)/, 'veri klasörü %APPDATA%\\IHAMufredatSistemi');
  assert.match(main, /app:\/\/mufredat\/index\.html/, 'köken app://mufredat (localStorage/IndexedDB)');
  assert.match(main, /scheme: 'app'/);
  assert.match(main, /fsyncSync/, 'atomik yazma');
});

test('paketleme: NSIS kullanıcı başına, tek tık, tr/en/ar, kendi simgesi; eski resources\\app temizliği', () => {
  const b = pkg.build;
  assert.strictEqual(pkg.main, 'kabuk/main.js');
  assert.strictEqual(b.asar, true);
  assert.deepStrictEqual(b.win.target.map((t) => t.target), ['nsis']);
  assert.strictEqual(b.nsis.oneClick, true);
  assert.strictEqual(b.nsis.perMachine, false);
  assert.deepStrictEqual(b.nsis.installerLanguages, ['tr_TR', 'en_US', 'ar_SA']);
  assert.strictEqual(b.nsis.deleteAppDataOnUninstall, false);
  assert.match(b.nsis.artifactName, /Setup/);
  assert.notStrictEqual(b.win.signAndEditExecutable, false);
  const ico = fs.readFileSync(path.join(ROOT, b.win.icon));
  assert.strictEqual(ico.readUInt16LE(2), 1, '.ico');
  const nsh = R(b.nsis.include);
  assert.match(nsh, /!macro customInstall/);
  assert.match(nsh, /RMDir \/r "\$INSTDIR\\resources\\app"/, 'eski açık klasör kaldırılır (Electron önce resources\\app\'i yükler)');
  const kod = nsh.replace(/;.*$/gm, '');
  assert.ok(!/(?<!LOCAL)APPDATA|IHAMufredatSistemi\\\\veri/.test(kod), 'kurulum eki kullanıcı verisine dokunmaz');
  // ≤3.3'ün ayrı program klasörü (yalnız program dosyaları) kaldırılabilir; başka bir LOCALAPPDATA yoluna dokunulmaz
  assert.ok((kod.match(/\$LOCALAPPDATA[^"]*/g) || []).every((x) => x.startsWith('$LOCALAPPDATA\\Programs\\IHA Mufredat Sistemi')), 'yalnız eski program klasörü');
  for (const f of b.files) if (!/\*/.test(f)) assert.ok(fs.existsSync(path.join(ROOT, f)), 'paket dosyası: ' + f);
});

test('gömülü ortak çekirdek: sürüm kaydı, modüller, güncelleme planı (yama / tam / kurulum)', () => {
  for (const f of ['cekirdek/VERSION', 'ui/cekirdek/VERSION']) assert.match(R(f), /^ortak-cekirdek [0-9a-f]{40}\n/);
  assert.strictEqual(R('cekirdek/VERSION'), R('ui/cekirdek/VERSION'));
  delete globalThis.FC;
  require('../ui/cekirdek/fc-core.js');
  const FC = globalThis.FC;
  for (const m of ['updater', 'topbar', 'settings', 'contact', 'crash', 'look', 'onboarding', 'whatsnew', 'announcements', 'progress', 'host', 'usage', 'lanMerge', 'agent']) assert.ok(FC[m], 'FC.' + m);
  const H = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const man = { schema: 1, app: 'iha-mufredat', version: '3.5.0', minVersion: '3.4.0', assets: {
    'win-app': { file: 'IhaMufredat-3.5.0-win-app.asar', size: 100, sha256: H('a'), patches: { '3.4.0': { file: 'IhaMufredat-win-app.patch-from-3.4.0.bin', size: 10, sha256: H('b') } } },
    'win-setup': { file: 'IhaMufredat-3.5.0-win-setup.exe', size: 200, sha256: H('c') } } };
  const o = { repo: 'iha-mufredat-kaynak', app: 'iha-mufredat', version: '3.4.0', channel: 'win-app', setupChannel: 'win-setup' };
  const p = FC.updater.plan(man, o);
  assert.strictEqual(p.mode, 'patch');
  assert.match(p.url, /iha-mufredat-kaynak\/releases\/download\/v3\.5\.0\/IhaMufredat-win-app\.patch-from-3\.4\.0\.bin$/);
  const old = FC.updater.plan(Object.assign({}, man, { minVersion: '3.5.0' }), o);
  assert.strictEqual(old.channel, 'win-setup', 'minVersion altı → kurulum');
  assert.strictEqual(FC.updater.plan(man, Object.assign({}, o, { version: '3.5.0' })), null);
  // kaynak: Asistan Agent artık çekirdekte; bağımsız kopyalar ve eski güncelleyici yok
  for (const f of ['ui/js/fc-agent.js', 'ui/js/agent-baslat.js', 'ui/js/updater.js', 'ui/js/kabukgec.js', 'ui/js/iletisim.js', 'kabuk/boot.js']) assert.ok(!fs.existsSync(path.join(ROOT, f)), 'kaldırıldı: ' + f);
  const html = R('ui/index.html');
  for (const s of ['cekirdek/css/tokens.css', 'cekirdek/css/core.css', 'css/fc-uyum.css', 'cekirdek/fc-core.js', 'js/kabuk.js']) assert.ok(html.includes(s), 'index.html: ' + s);
  assert.ok(html.indexOf('cekirdek/fc-core.js') < html.indexOf('js/kabuk.js') && html.indexOf('js/kabuk.js') < html.indexOf('js/sync.js'));
  for (const f of fs.readdirSync(path.join(ROOT, 'ui/js'))) { const s = R('ui/js/' + f); assert.ok(!/AIza[0-9A-Za-z_-]{30}/.test(s) || f === 'fbconfig.js', 'gömülü anahtar yok: ' + f); }
});

test('ESKİ KANAL KÖPRÜSÜ: 3.3 güncelleyicisi (birebir) köprü paketini "daha yeni" görür, doğrular ve kurar', async () => {
  const K = require('../araclar/eski-kanal.js');
  const b = K.build();
  assert.strictEqual(b.ver, pkg.version.split('.').slice(0, 2).join('.'));
  assert.ok(K.vnum(b.ver) > K.vnum('3.3'), 'eski karşılaştırma (a*1000+b): ' + b.ver + ' > 3.3');
  assert.strictEqual(K.oldInstallCheck(b.latest, b.g64, '3.3'), 'ok');
  // 3.3'ün ui/js/updater.js'i (test/fixtures) sahte fetch + ota köprüsüyle
  const written = {}; const calls = [];
  const sandbox = {
    console, setTimeout, clearTimeout, atob, btoa, TextDecoder, Uint8Array, Blob, Response, DecompressionStream, crypto: globalThis.crypto, Date, JSON, Math, Promise, String, Object, Array, Set,
    fetch: async (url) => {
      calls.push(url);
      if (/latest\.json/.test(url)) return new Response(JSON.stringify(b.latest), { status: 200 });
      if (url.endsWith(b.name)) return new Response(b.g64, { status: 200 });
      return new Response('', { status: 404 });
    },
    t: (k) => k, Store: { local: {}, saveLocal() {}, persistNow() {} },
    Platform: { version: '3.3', httpGet: async () => null, ota: {
      info: async () => ({ shell: 3 }), bootOk: async () => true,
      begin: async (v) => { calls.push('begin ' + v); }, write: async (v, rel, b64s) => { assert.match(v, /^\d+\.\d+$/); written[rel] = b64s; }, commit: async (v) => { calls.push('commit ' + v); } } },
  };
  sandbox.window = sandbox;
  sandbox.window.FB_YAYIN = { projectId: 'x', apiKey: 'x' };
  sandbox.window.UPD_GH = { owner: 'departures-mil', repo: 'iha-mufredat-guncelleme', branch: 'main' };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'fixtures/eski-updater-3.3.js'), 'utf8'), sandbox);
  const U = sandbox.window.Updater;
  U.info = { shell: 3, state: {} };
  await U.check(true);
  assert.strictEqual(U.state, 'available', 'eski güncelleyici: ' + U.state + ' ' + U.error);
  assert.ok(calls[0].startsWith('https://raw.githubusercontent.com/departures-mil/iha-mufredat-guncelleme/main/latest.json'));
  await U.install();
  assert.strictEqual(U.state, 'ready');
  assert.ok(calls.includes('commit ' + b.ver));
  assert.ok(written['index.html'] && written['js/kabuk.js'] && written['cekirdek/fc-core.js'] && written['cekirdek/fonts/inter-latin-400-normal.woff2'], 'arayüz + çekirdek pakette');
  assert.ok(!Object.keys(written).some((k) => k.startsWith('vendor/')), 'vendor kurulu kabuktan gelir');
  // kanal deposundaki latest.json: ya henüz 3.3 (köprü yayınlanmadı) ya da köprü
  const kanal = path.join(ROOT, '..', 'iha-mufredat-guncelleme', 'latest.json');
  if (fs.existsSync(kanal)) { const l = JSON.parse(fs.readFileSync(kanal, 'utf8')); assert.ok(/^\d+\.\d+$/.test(l.version)); }
});

test('köprü betiği: kurulum SHA-256 ile doğrulanır, yalnız GitHub adresi', () => {
  const src = R('ui/js/kabuk.js');
  assert.match(src, /releases\/latest\/download\/latest\.json/);
  assert.match(src, /Get-FileHash -Algorithm SHA256/);
  assert.match(src, /\/\^\[0-9a-f\]\{64\}\$\//, 'sha256 biçimi denetlenir');
  assert.match(src, /ota\.bootOk/, 'eski kabukta açılış onayı');
});

test('eşitleme kuralı: öbür cihazda silinen liste öğesi arşive yazılır ve geri alınır; kayıtlar yumuşak silinir', () => {
  const db = { students: { s1: { id: 's1', name: 'A', log: [{ id: 'l1', n: 1 }, { id: 'l2', n: 2 }], updatedAt: 1 } } };
  const ctx = { window: {}, Store: { db, touch() {}, backupSnapshot() {} }, console, JSON, Object, Array, Map, Set, Math, Date, Promise, String, setTimeout, clearTimeout };
  ctx.window = ctx;
  vm.runInNewContext(R('ui/js/merge.js'), ctx);
  const M = ctx.Merge;
  const base = { id: 's1', name: 'A', log: [{ id: 'l1', n: 1 }, { id: 'l2', n: 2 }], updatedAt: 1 };
  const local = JSON.parse(JSON.stringify(base));
  const remote = { id: 's1', name: 'A', log: [{ id: 'l1', n: 1 }], updatedAt: 5 };   // öbür cihaz l2'yi sildi
  const logged = [];
  M.logConflicts = undefined;   // (iç fonksiyon) — setRec'in yazdığı kayıtları IndexedDB yerine yakala:
  ctx.indexedDB = { open() { const r = {}; setTimeout(() => { r.result = { objectStoreNames: { contains: () => true }, transaction: () => { const t = {}; const st = { add: (x) => { logged.push(x); }, put() {}, openCursor() { const c = {}; setTimeout(() => { c.result = null; c.onsuccess && c.onsuccess(); }); return c; }, delete() {} }; t.objectStore = () => st; setTimeout(() => t.oncomplete && t.oncomplete()); return t; } }; r.onsuccess && r.onsuccess(); }); return r; } };
  // öbür cihazın kaydı uygulanır (yerel değişmemiş: eski kodda l2 sessizce kayboluyordu)
  M.setRec('student:s1', remote);
  return new Promise((res) => setTimeout(res, 60)).then(() => {
    assert.strictEqual(db.students.s1.log.length, 1);
    const arch = logged.find((c) => c.removed);
    assert.ok(arch, 'silinen öğe arşiv kaydında');
    assert.strictEqual(arch.src, 'arsiv');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(arch.lost)), { id: 'l2', n: 2 });
    assert.strictEqual(M.restoreConflict(arch), true);
    assert.deepStrictEqual(db.students.s1.log.map((x) => x.id), ['l1', 'l2'], 'geri alındı');
  // iki tarafta değişen alan: yeni kalır, eski çakışma kaydına
  const c = M.record({ id: 's1', name: 'A', updatedAt: 1 }, { id: 's1', name: 'B', updatedAt: 3 }, { id: 's1', name: 'C', updatedAt: 9 });
  assert.strictEqual(c.merged.name, 'C'); assert.strictEqual(c.conflicts[0].lost, 'B');
  // öğrenci / plan silme yumuşak (deleted:true) — Store.deleteStudent kaydı silmez
  assert.match(R('ui/js/store.js'), /deleteStudent\(id\) \{ const s = this\.db\.students\[id\]; if \(!s\) return; s\.deleted = true;/);
  assert.match(R('ui/js/kabuk.js'), /fcArchiveTitle/);
  // sync.js uzak belge silmez
  assert.ok(!/deleteDoc|\.delete\(/.test(R('ui/js/sync.js')), 'bulut eşitlemesi belge silmez');
  });
});

test('çeviriler: kabuk.js metinleri tr/en/ar tam', () => {
  const src = R('ui/js/kabuk.js');
  const ctx = {}; const m = /var TXT = (\{[\s\S]*?\n  \});/.exec(src); assert.ok(m);
  const TXT = vm.runInNewContext('(' + m[1] + ')', ctx);
  const keys = Object.keys(TXT.tr);
  for (const l of ['en', 'ar']) assert.deepStrictEqual(Object.keys(TXT[l]).sort(), keys.slice().sort(), l);
});

test('3.4.1: yönetici e-postası düz metin değil; özet karşılaştırması çalışır', () => {
  const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
  const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'js', 'fbconfig.js'), 'utf8');
  assert.ok(!/qa\d+@gmail\.com/.test(src));
  const ctx = { window: {}, TextEncoder };
  vm.runInNewContext(src, ctx);
  ctx.window.FB_ADMIN_SHA256 = crypto.createHash('sha256').update('yonetici@example.com').digest('hex');
  assert.strictEqual(ctx.window.fbYoneticiMi('  Yonetici@Example.com '), true);
  assert.strictEqual(ctx.window.fbYoneticiMi('baska@example.com'), false);
});

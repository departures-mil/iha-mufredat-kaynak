// Electron açılış testleri (gerçek ana süreç + preload + arayüz; Linux'ta xvfb-run). Electron ikilisi yoksa atlanır.
//  1) Yeni kabuk (kabuk/main.js, IHA_SMOKE=1): çekirdek, tam ekran, üst çubuk, 4 pencere düğmesi, ayarlar sırası.
//  2) ESKİ KÖPRÜ: 3.3'ün (kabuk 3) ve 2.8'in (kabuk 2, ≤2.7 kurulumlarla aynı) ana süreci (test/fixtures/eski-kabuk-*, birebir) + eski kanaldaki köprü paketi (araclar/eski-kanal.js)
//     ota\3.4 klasöründe → yeni arayüz eski kabukta hatasız açılır, "Yeni kurulum gerekli" penceresi çıkar, "açıldı" onayı verilir.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');

let electron = null;
try { electron = require('electron'); } catch (e) { }
const needX = process.platform === 'linux' && !process.env.DISPLAY;
const hasXvfb = !needX || spawnSync('sh', ['-c', 'command -v xvfb-run'], { encoding: 'utf8' }).status === 0;
const skip = !electron || typeof electron !== 'string' || !fs.existsSync(electron) ? 'electron yok' : !hasXvfb ? 'xvfb-run yok' : false;
function run(args, env, marker) {
  const cmd = needX ? 'xvfb-run' : electron;
  const full = needX ? ['-a', '-s', '-screen 0 1600x1000x24', electron].concat(args) : args;
  const r = spawnSync(cmd, full, { encoding: 'utf8', timeout: 110000, env: Object.assign({}, process.env, { ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }, env) });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith(marker + ' '));
  assert.ok(line, 'çıktı yok: ' + (r.stdout || '') + String(r.stderr || '').slice(-3000));
  return JSON.parse(line.slice(marker.length + 1));
}

test('Electron: yeni kabuk açılır, çekirdek başlar, tam ekran, ayarlar sırası', { skip, timeout: 130000 }, () => {
  const veri = fs.mkdtempSync(path.join(os.tmpdir(), 'iha-smoke-'));
  const o = run([ROOT, '--no-sandbox', '--disable-gpu'], { IHA_SMOKE: '1', IHA_VERI: veri }, 'IHA_SMOKE');
  console.log(o);
  assert.deepStrictEqual(o.errors, []);
  assert.strictEqual(o.fc, true);
  assert.strictEqual(o.host, 'electron', 'fcHost tanındı');
  assert.strictEqual(o.desktop, true);
  assert.strictEqual(o.version, require('../package.json').version);
  assert.strictEqual(o.kabuk, true);
  assert.strictEqual(o.topbar, true);
  assert.strictEqual(o.winBtns, 4, 'Küçült · Orta · Tam ekran · Kapat');
  assert.ok(o.sync && o.lan && o.update, 'Eşitle · Wi-Fi · Güncelle');
  assert.ok(o.schemes[0] === 'falcon' && o.schemes.includes('klasik'));
  assert.strictEqual(o.scheme, 'falcon');
  assert.strictEqual(o.fullscreen, true, 'her açılışta tam ekran');
  assert.ok(o.nav >= 8);
  const s = o.settings;
  assert.strictEqual(s[0], 'look', 'Görünüm ilk');
  assert.strictEqual(s[s.length - 1], 'contact', 'Admin ile iletişim EN SON');
  assert.strictEqual(s[s.length - 2], 'about');
  for (const k of ['sync', 'lan', 'cakisma', 'arsiv', 'agent', 'usage', 'crash']) assert.ok(s.includes(k), 'ayarlar: ' + k);
  // veri klasörü kabuk 2/3 ile aynı düzende
  assert.ok(fs.existsSync(path.join(veri, 'veri', 'db.json')) || fs.existsSync(path.join(veri, 'Local Storage')), 'veri yazıldı');
  assert.strictEqual(o.ok, true);
});

for (const [FXN, BOOT] of [['eski-kabuk-3.3', 'boot.js'], ['eski-kabuk-2.8', 'main.js']]) test('ESKİ KÖPRÜ: ' + FXN + ' kabuğu köprü paketini açar → "Yeni kurulum gerekli", açılış onayı', { skip, timeout: 130000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iha-eski-'));
  const app = path.join(tmp, 'app'), cfg = path.join(tmp, 'config');
  fs.mkdirSync(app, { recursive: true });
  const FX = path.join(__dirname, 'fixtures', FXN);
  for (const f of fs.readdirSync(FX)) fs.copyFileSync(path.join(FX, f), path.join(app, f));
  fs.cpSync(path.join(ROOT, 'ui', 'vendor'), path.join(app, 'ui', 'vendor'), { recursive: true });   // kurulu eski ui\ (vendor kabukla gelir)
  fs.writeFileSync(path.join(app, 'ui', 'index.html'), '<!doctype html><title>eski 3.3</title>');
  // eski güncelleyicinin yazdığı gibi: ota\<sürüm>\ + state.json (pending)
  const b = require('../araclar/eski-kanal.js').build();
  const ota = path.join(cfg, 'IHAMufredatSistemi', 'ota'), bundle = JSON.parse(zlib.gunzipSync(b.gz));
  for (const [k, v] of Object.entries(bundle.files)) { const f = path.join(ota, b.ver, k); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(v, 'base64')); }
  fs.writeFileSync(path.join(ota, 'state.json'), JSON.stringify({ current: b.ver, previous: null, pending: true, tries: 0 }));
  // eski ana süreci değiştirmeden ölçüm: küçük bir başlatıcı boot.js'i yükler, arayüz açılınca durumu yazar
  const pj = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8')); pj.main = 'olcum.js'; fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify(pj));
  fs.writeFileSync(path.join(app, 'olcum.js'), `const { app } = require('electron');
app.on('web-contents-created', (e, wc) => { wc.once('did-finish-load', () => setTimeout(async () => {
  let r; try { r = await wc.executeJavaScript("({ v: window.APP_VERSION, fcHost: !!window.fcHost, legacy: !!(window.Kabuk && Kabuk.legacy), bridge: !!document.querySelector('.iha-bridge'), topbar: !!document.querySelector('.topbar .topbar-actions'), winBtns: document.querySelectorAll('.topbar .win-controls button').length, errors: (window.__ihaErrors || []).slice(0, 5), cmd: Kabuk.bridgeCmd('https://github.com/x/y.exe', 'ab'.repeat(32), 'IhaMufredat-9.9.9-win-setup.exe') })"); }
  catch (er) { r = { error: String(er && er.message || er) }; }
  process.stdout.write('IHA_ESKI ' + JSON.stringify(r) + '\\n'); setTimeout(() => app.exit(0), 300);
}, 6000)); });
require('./${BOOT}');
`);
  const o = run([app, '--no-sandbox', '--disable-gpu'], { XDG_CONFIG_HOME: cfg, HOME: tmp }, 'IHA_ESKI');
  console.log(Object.assign({}, o, { cmd: o.cmd && o.cmd.length }));
  assert.ok(!o.error, o.error);
  assert.deepStrictEqual(o.errors, []);
  assert.strictEqual(o.v, require('../package.json').version);
  assert.strictEqual(o.fcHost, false);
  assert.strictEqual(o.legacy, true);
  assert.strictEqual(o.bridge, true, '"Yeni kurulum gerekli" penceresi');
  assert.strictEqual(o.topbar, true);
  assert.strictEqual(o.winBtns, 4, 'eski kabukta da pencere düğmeleri (eski köprüyle)');
  assert.match(o.cmd, /Get-FileHash -Algorithm SHA256/);
  assert.match(o.cmd, /abababab/);
  const st = JSON.parse(fs.readFileSync(path.join(ota, 'state.json'), 'utf8'));
  assert.strictEqual(st.pending, false, 'açılış onayı (bootOk) verildi: eski kabuk önceki arayüze dönmez');
});

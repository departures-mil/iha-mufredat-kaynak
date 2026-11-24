#!/usr/bin/env node
// ESKİ GÜNCELLEME KANALI KÖPRÜSÜ — ≤3.3 kurulumları (kabuk 2/3, resources\app klasörü) için departures-mil/iha-mufredat-guncelleme.
//
// Eski güncelleyici (3.3 ui/js/updater.js, git geçmişinde) ne yapar:
//   raw.githubusercontent.com/departures-mil/iha-mufredat-guncelleme/main/latest.json okur; vnum(version) = a*1000+b (yalnız ilk iki
//   parça) kurulu sürümden büyükse ve minShell ≤ kabuk ise paketler/iha_X_Y.b64'ü indirir. Dosya = base64(gzip(JSON
//   {format:'ihu-bundle', version, files:{yol: base64}})); YALNIZ gzip baytlarının SHA-256'sı denetlenir (imza YOK). Paket
//   %APPDATA%\IHAMufredatSistemi\ota\<version>\ klasörüne yazılır (ota:write sürüm biçimi /^\d+\.\d+$/), program yeniden
//   açılınca arayüz oradan, eksik dosyalar kurulu ui\ klasöründen (vendor\) gelir. Ana süreç (main.js) DEĞİŞMEZ.
// Köprü: yeni arayüzün kendisi (vendor hariç, cekirdek dahil) "3.4" adıyla konur. Eski kabukta açılınca kabuk.js "Yeni kurulum
//   gerekli" penceresini gösterir ve NSIS kurulumunu GitHub sürümünden indirip doğrulayarak kurar (bkz. ui/js/kabuk.js).
//
//   node araclar/eski-kanal.js --yayinla [../iha-mufredat-guncelleme]   (YALNIZ GitHub Release yayınlandıktan SONRA; sonra kanal deposunda commit + push)
//   node araclar/eski-kanal.js --check                                   (paket üretimi + eski güncelleyici kuralları; npm test)
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const UI = path.join(ROOT, 'ui');
const vnum = (v) => { const [a, b] = String(v || '0').split('.').map((x) => parseInt(x, 10) || 0); return a * 1000 + b; };   // eski karşılaştırma

function files() {
  const out = {};
  (function walk(d) {
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f), rel = path.relative(UI, p).split(path.sep).join('/');
      if (fs.statSync(p).isDirectory()) { if (rel !== 'vendor') walk(p); } else out[rel] = fs.readFileSync(p).toString('base64');
    }
  })(UI);
  return out;
}
function build() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-notes.json'), 'utf8'));
  const ver = pkg.version.split('.').slice(0, 2).join('.');            // 3.4.0 → "3.4" (eski ota:write yalnız X.Y kabul eder)
  const raw = Buffer.from(JSON.stringify({ format: 'ihu-bundle', version: ver, files: files() }));
  const gz = zlib.gzipSync(raw, { level: 9 });
  const g64 = gz.toString('base64');
  const sha = crypto.createHash('sha256').update(gz).digest('hex');
  const name = 'paketler/iha_' + ver.replace(/\./g, '_') + '.b64';
  const link = 'https://github.com/departures-mil/iha-mufredat-kaynak/releases/latest';
  const pre = { tr: 'Yeni kurulum programı: bu güncellemeden sonra program "Yeni kurulum gerekli" der ve kurulumu tek tuşla indirir (' + link + '). Kayıtlar korunur.\n', en: 'New installer: after this update the program offers the new installation with one click (' + link + '). Records are kept.\n', ar: 'برنامج تثبيت جديد: بعد هذا التحديث يعرض البرنامج التثبيت الجديد بنقرة واحدة (' + link + '). السجلات محفوظة.\n' };
  const latest = { version: ver, file: name, sha256: sha, size: raw.length, gzlen: g64.length, date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), minShell: 2,
    notes_tr: pre.tr + notes.tr, notes_en: pre.en + notes.en, notes_ar: pre.ar + notes.ar, setup: link };
  return { ver, name, g64, gz, raw, latest };
}
/** Eski güncelleyicinin (3.3) install() adımları birebir: sha256(gz) → gunzip → JSON → sürüm/index.html denetimi */
function oldInstallCheck(latestJson, b64text, installed) {
  const m = latestJson;
  if (!(vnum(m.version) > vnum(installed))) return 'yeni değil';
  if ((m.minShell || 2) > 2) return 'minShell';
  const bytes = Buffer.from(b64text.trim(), 'base64');
  if (m.sha256 && crypto.createHash('sha256').update(bytes).digest('hex') !== m.sha256) return 'sha256';
  const bundle = JSON.parse(zlib.gunzipSync(bytes).toString('utf8'));
  if (bundle.version !== m.version || !bundle.files || !bundle.files['index.html']) return 'paket';
  if (!/^\d+\.\d+$/.test(m.version)) return 'ota:write sürüm biçimi';
  return 'ok';
}
module.exports = { build, oldInstallCheck, vnum };
if (require.main === module) {
  const a = process.argv[2];
  const b = build();
  if (a === '--check') {
    const r = oldInstallCheck(b.latest, b.g64, '3.3');
    if (r !== 'ok') { console.error('köprü paketi eski güncelleyicide kurulmaz: ' + r); process.exit(1); }
    console.log('köprü paketi tutarlı (' + b.ver + ', ' + (b.g64.length / 1048576).toFixed(2) + ' MB)'); process.exit(0);
  }
  if (a !== '--yayinla') { console.log('kullanım: node araclar/eski-kanal.js --yayinla [kanal-klasörü] | --check'); process.exit(0); }
  const kanal = path.resolve(process.argv[3] || path.join(ROOT, '..', 'iha-mufredat-guncelleme'));
  fs.mkdirSync(path.join(kanal, 'paketler'), { recursive: true });
  for (const f of fs.readdirSync(path.join(kanal, 'paketler'))) if (f.endsWith('.b64')) fs.rmSync(path.join(kanal, 'paketler', f));
  fs.writeFileSync(path.join(kanal, b.name), b.g64);
  fs.writeFileSync(path.join(kanal, 'latest.json'), JSON.stringify(b.latest, null, 1));
  // ≤2.7 kurulumlar Firebase yedek kanalını okur: yönetici 3.3 programı bu dosyayı yayın klasöründe görünce yükler (isteğe bağlı)
  fs.mkdirSync(path.join(ROOT, 'cikti'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'cikti', 'paket.ihu'), JSON.stringify({ format: 'ihu1', version: b.ver, gz: b.g64, sha256: crypto.createHash('sha256').update(b.gz).digest('hex'), size: b.raw.length, date: b.latest.date, minShell: 2, notes: { tr: b.latest.notes_tr, en: b.latest.notes_en, ar: b.latest.notes_ar } }));
  console.log('eski kanal → ' + b.ver + ' (' + kanal + ')');
}

#!/usr/bin/env node
// Tek sürüm kaynağı: package.json "version" (semver X.Y.Z). Notlar: ui/js/changelog.js CHANGELOG dizisinin EN ÜSTÜNDEKİ kayıt.
//   node araclar/surum.js            → ui/js/version.js + release-notes.json'u package.json'dan yeniden yazar
//   node araclar/surum.js 3.5.0      → package.json sürümünü 3.5.0 yapar, sonra yazar (önce changelog.js'e { v: '3.5.0', … } ekleyin)
//   node araclar/surum.js --check    → dosyalar güncel değilse hata (npm test)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'package.json'), VJS = path.join(ROOT, 'ui', 'js', 'version.js'), NOTES = path.join(ROOT, 'release-notes.json');
const SEMVER = /^\d+\.\d+\.\d+$/;
function changelog() { const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'ui', 'js', 'changelog.js'), 'utf8'), ctx); return ctx.window.CHANGELOG; }
function render() {
  const v = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;
  if (!SEMVER.test(v)) throw new Error('package.json version X.Y.Z olmalı: ' + v);
  const top = changelog()[0];
  if (!top || top.v !== v) throw new Error('changelog.js en üstte { v: \'' + v + '\' } kaydı olmalı');
  const notes = {}; for (const l of ['tr', 'en', 'ar']) { if (!Array.isArray(top[l]) || !top[l].length) throw new Error('changelog ' + l + ' eksik'); notes[l] = top[l].map((x) => '• ' + x).join('\n'); }
  return { vjs: "/* OTOMATİK: node araclar/surum.js (kaynak: package.json). Elle düzenlemeyin. */\nwindow.APP_VERSION='" + v + "';\n", notes: JSON.stringify(notes, null, 1) + '\n' };
}
module.exports = { render };
if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--check') {
    const r = render();
    const ok = fs.existsSync(VJS) && fs.readFileSync(VJS, 'utf8') === r.vjs && fs.existsSync(NOTES) && fs.readFileSync(NOTES, 'utf8') === r.notes;
    if (!ok) { console.error('ui/js/version.js / release-notes.json güncel değil: node araclar/surum.js'); process.exit(1); }
    console.log('sürüm dosyaları güncel'); process.exit(0);
  }
  if (arg) {
    if (!SEMVER.test(arg)) { console.error('Sürüm X.Y.Z olmalı'); process.exit(1); }
    for (const f of [PKG, path.join(ROOT, 'package-lock.json')]) { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); j.version = arg; if (j.packages && j.packages['']) j.packages[''].version = arg; fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n'); } catch (e) { } }
  }
  const r = render(); fs.writeFileSync(VJS, r.vjs); fs.writeFileSync(NOTES, r.notes);
  console.log('Sürüm ' + JSON.parse(fs.readFileSync(PKG, 'utf8')).version + ' → ui/js/version.js, release-notes.json');
}

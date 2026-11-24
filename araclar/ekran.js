#!/usr/bin/env node
// Arayüz ekran görüntüleri — gerçek Electron uygulaması (Playwright _electron): node araclar/ekran.js <çıktı-klasörü>
//   PLAYWRIGHT_CORE=/opt/npm-tools/node_modules/playwright-core xvfb-run -a -s "-screen 0 1600x1000x24" node araclar/ekran.js ekran
// ONLY=ad1,ad2 ile yalnız seçilenler. ESKI=1: arayüzü eski kabuk (3.3 ana süreci) gibi window.fcHost olmadan açar (köprü penceresi).
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const OUT = path.resolve(process.argv[2] || 'ekran');
const ROOT = path.join(__dirname, '..');
fs.mkdirSync(OUT, { recursive: true });
const shots = [
  { name: 'tr-falcon-dark', lang: 'tr', theme: 'dark', scheme: 'falcon' },
  { name: 'ar-falcon-light', lang: 'ar', theme: 'light', scheme: 'falcon' },
  { name: 'tr-klasik', lang: 'tr', theme: 'dark', scheme: 'klasik' },
  { name: 'tr-klasik-light', lang: 'tr', theme: 'light', scheme: 'klasik' },
  { name: 'tr-falcon-dark-ayarlar', lang: 'tr', theme: 'dark', scheme: 'falcon', open: 'settings' },
  { name: 'ar-falcon-light-ayarlar', lang: 'ar', theme: 'light', scheme: 'falcon', open: 'settings' },
  { name: 'en-falcon-dark-ogrenciler', lang: 'en', theme: 'dark', scheme: 'falcon', open: 'students' },
  { name: 'tr-falcon-dark-ilk-acilis', lang: 'tr', theme: 'dark', scheme: 'falcon', open: 'onboarding' }
];
(async () => {
  const errors = [];
  for (const s of shots.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x.name))) {
    const veri = fs.mkdtempSync(path.join(os.tmpdir(), 'iha-ekran-'));
    const launch = () => pw._electron.launch({ executablePath: require(path.join(ROOT, 'node_modules', 'electron')), args: [ROOT, '--no-sandbox', '--disable-gpu'], env: Object.assign({}, process.env, { IHA_VERI: veri, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }) });
    // 1. açılış: tercihler yazılır (sayfa yenilemek programı kapatır: platform.js beforeunload → quit), 2. açılış: görüntü
    let app = await launch(), page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    await page.evaluate(({ s }) => {
      const set = (k, v) => localStorage.setItem('fc.' + k, JSON.stringify(v));
      set('lang', s.lang); set('theme', s.theme); set('scheme', s.scheme); set('whatsnew.seen', window.APP_VERSION);
      if (s.open !== 'onboarding') set('onboarding.done', true); else localStorage.removeItem('fc.onboarding.done');
      Store.local.lang = s.lang; if (s.open !== 'onboarding') Store.local.seenVer = window.APP_VERSION; Store.saveLocal();
    }, { s });
    await page.waitForTimeout(300);
    await app.close().catch(() => {});
    app = await launch(); page = await app.firstWindow();
    page.on('pageerror', (e) => errors.push(s.name + ': ' + e.message));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    if (s.open === 'settings' || s.open === 'students') { await page.evaluate((p) => UI.go(p), s.open); await page.waitForTimeout(900); }
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    if (s.open === 'settings') {
      await page.evaluate(() => { const m = document.getElementById('main'); m.scrollTop = m.scrollHeight; });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, s.name + '-son.png') });
    }
    await app.close();
    console.log('✓', s.name);
  }
  if (errors.length) { console.error('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; }
})();

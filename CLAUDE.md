# İHA Müfredat Sistemi

Eğitim müfredatı / öğrenci takibi / ders planı masaüstü programı. Electron (`kabuk/main.js`, `kabuk/preload.js`, `kabuk/lan.js`),
arayüz `ui/` düz JS (sırayla `ui/index.html`'den yüklenir). Türkçe kaynak; arayüz 5 dil kipi (tr, en, ar, tr-ar, en-ar), Arapça RTL.

## Ortak çekirdek (3.4.0'dan beri)
- Gömülü kopya: `cekirdek/electron/` (fc-electron-main, fc-preload, fcd1) + `ui/cekirdek/` (fc-core.js, css, yazı tipleri); commit `cekirdek/VERSION`.
  ortak-cekirdek deposunu buradan değiştirme.
- Yapıştırıcı `ui/js/kabuk.js`: üst çubuk (Duyurular · ✦ · Eşitle · Wi‑Fi · Güncelle · tema · uygulamanın 5 kipli dil seçicisi | Küçült · Orta ·
  Tam ekran · Kapat), `klasik` şema (3.3 renkleri), dil köprüsü (UI.setLang ↔ FC.i18n), ayarlar (`FC.settings.build`: Görünüm · uygulama
  kartları · Arşiv · Asistan Agent · Kullanım Limitleri · Hata raporu · Hakkında · **Admin ile iletişim EN SON**), `Kullanim.*` → `FC.usage`
  uyarlayıcısı, ilk açılış rehberi (Firebase → `Store.local.sync.config`, AI → Danışman ayarı), neler yeni (`changelog.js`), güncelleme, eski kabuk köprüsü.
- Renkler `ui/css/style.css` değişkenleri → çekirdek tokenları; uyum/üzerine yazmalar `ui/css/fc-uyum.css`.

## Kurallar (kullanıcı)
- Sürüm semver X.Y.Z, etiket `vX.Y.Z`. Önce `ui/js/changelog.js` EN ÜSTÜNE yeni kayıt, sonra `node araclar/surum.js X.Y.Z`
  (`ui/js/version.js`, `release-notes.json`). `npm test` tutarlılığı denetler.
- Güncelleme yalnız GitHub Releases (`latest.json` + FCD1, CI `.github/workflows/release.yml` → ortak `reusable-release.yml`).
  Kanallar `win-app` (app.asar), `win-setup` (`IhaMufredat-X.Y.Z-win-setup.exe`). Yayın main'de workflow_dispatch:
  `gh api -X POST repos/departures-mil/iha-mufredat-kaynak/actions/workflows/release.yml/dispatches -f ref=main`.
- Kullanıcı verisi asla kaybolmaz: `productName` (IHA Mufredat Sistemi), `name`, veri klasörü `%APPDATA%\IHAMufredatSistemi`,
  arayüz kökeni `app://mufredat` (localStorage, IndexedDB `iha-esitleme`) DEĞİŞMEZ. Yazma atomik (`writeSafe`).
- Eşitleme: kullanıcının kendi Firebase'i + aynı ağda Wi‑Fi (HMAC imzalı, `lan.js` + `agesitle.js`); ikisi de `merge.js` üç yönlü birleştirme.
  Hiçbir veri kalıcı silinmez: öğrenci/plan silme yumuşak (`deleted:true`, Ayarlar → Arşiv'den geri al), öbür cihazda silinen liste öğesi
  `Merge.setRec` ile çakışma kayıtlarına `removed:true` (geri alınabilir), iki tarafta değişen alanda kaybeden çakışma kaydına.
- AI: kullanıcının kendi anahtarı (Gemini/OpenAI/Claude/Groq/OpenRouter/Ollama) + çevrimdışı danışman; sahibin anahtarı gömülmez.
- ESKİ KANAL KÖPRÜSÜ: ≤3.3 kurulumlar (kabuk 2/3, `resources\app` klasörü) `departures-mil/iha-mufredat-guncelleme` raw `latest.json`'u okur
  (imza YOK, yalnız SHA-256). Release'ten SONRA: `node araclar/eski-kanal.js --yayinla ../iha-mufredat-guncelleme` → orada commit + push.
  Köprü paketi yeni arayüzdür ("X.Y" adıyla); eski kabukta "Yeni kurulum gerekli" der, Kur → betik kurulumu indirir, SHA-256 doğrular,
  çalıştırır; kurulum eski `resources\app`'i kaldırır (`build/kurulum.nsh`). Köprü yalnız bir kez gerekir (yeni sürümlerde tekrar gerekmez).
- İmza anahtarları/şifreler depoya girmez. Kullanıcıya exe gönderme.

## Test
- `npm test`: `test/app.test.js` (sürüm, paket, çekirdek, 3.3 güncelleyicisiyle köprü, eşitleme kuralı) + `test/electron-smoke.test.js`
  (gerçek Electron, xvfb: yeni kabuk `IHA_SMOKE=1` + 3.3 ana süreci `test/fixtures/eski-kabuk-3.3` içinde köprü). `IHA_VERI=<klasör>` veri yerini değiştirir.
- Ekran görüntüleri: `PLAYWRIGHT_CORE=/opt/npm-tools/node_modules/playwright-core xvfb-run -a -s "-screen 0 1600x1000x24" node araclar/ekran.js <klasör>`.

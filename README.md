# İHA Müfredat Sistemi — kaynak

Windows masaüstü programı (Electron). Kayıtlar kullanıcının bilgisayarında (`%APPDATA%\IHAMufredatSistemi`) ve
Firebase'de (`mufredat-bc0ad`) durur; **kayıtlar bu depoda bulunmaz**.

- `kabuk/` — kurulu programın `resources\app` kabuğu (main.js, preload.js; kabuk sürümü 2).
- `ui/` — arayüz (uygulama içi güncellemeyle değişen kısım). `ui/vendor/` kabukla gelir, pakete girmez.
- Güncelleme kanalı: `departures-mil/iha-mufredat-guncelleme` (latest.json + paketler/iha_X_Y.b64). 2.8'den itibaren
  program önce GitHub'a, sonra Firebase'e bakar; hangisi yeniyse onu kurar.

## Yeni sürüm
1. `ui/` içinde değişikliği yap.
2. `python3 araclar/yayinla.py 2.9 "tr notu" "en note" "ar ملاحظة" --kanal ../iha-mufredat-guncelleme`
3. İki depoda: `git add -A && git commit -m "İHA 2.9" && git push`
4. `cikti/paket.ihu` yayın klasörüne (`Downloads\IHA-Yayin`) konursa yönetici oturumundaki program Firebase yedek kanalına da yükler.

## 3.0 (2026-11-22)
- 2.9'daki admin duyuruları (yalnız pakette vardı) kaynağa alındı.
- Ayarlar > Kullanım Limitleri (`ui/js/kullanim.js` = duyurular/istemci/kullanim.js); SDK sayımı `sync.js` içinde.
- Programla gelen ortak Firebase projesi kaldırıldı (`FB_CONFIG = {}`); eski projede (`FB_YAYIN`) yalnız yönetici kalır.
  Kullanıcılar güncellemeye yalnız GitHub'dan bakar; Firebase yedek kanalını yalnız yönetici oturumu okur.

## 3.1 (2026-11-22)
- Çekirdek 3 (`kabuk/`): `boot.js` açılış koruyucusu (yeni çekirdek açılmazsa `.prev`'e döner), `lan.js` internetsiz eşitleme
  (TCP 47811…, UDP 47812, HMAC imzalı), pencere düğmeleri (win:min / win:max), yedekten geri dönüş (backup:*), hata günlüğü,
  `kabuk:apply` ile uygulama içinden çekirdek güncellemesi. `package.json` → `main: boot.js`.
- `araclar/kabuk_paket.py`: çekirdek dosyalarını `ui/js/kabuk-paket.js` içine gömer (yayinla.py kendisi çağırır).
  Çekirdek 2 kurulumlar `kabukgec.js` ile tek seferlik geçiş betiğiyle (cmd + PowerShell) 3'e geçer; çekirdek 3'te doğrudan IPC.
- `merge.js`: üç yönlü birleştirme; `sync.js` (bulut) ve `agesitle.js` (ağ) bunu kullanır. Ortak atalar ve çakışma kayıtları IndexedDB `iha-esitleme`.
- `pencere.js` (sağ üst pencere düğmeleri), `pro.js` (açılış ekranı, yenilikler, hata raporu, kısayollar, yedekten geri yükleme, hakkında), `i18n-pro.js`, `changelog.js`.

## 3.2 (2026-11-23)
- Yapay zeka danışmanı: `ui/js/danisman.js` + `ui/css/danisman.css`. Sol menüde «Danışman» sayfası, Ayarlar'da «Yapay zeka danışmanı» kartı.
  Sağlayıcılar (kullanıcının kendi anahtarı, akışlı): Gemini, OpenAI, Claude, Groq, OpenRouter; Ollama (bilgisayarda, internetsiz).
  Bağlam: müfredat anahattı + ilgili modüller, yardım bölümleri, sözlük, kurum/puanlama ayarları, adı geçen/seçilen öğrencinin raporu.
  İnternet ya da anahtar yoksa yerleşik çevrimdışı danışman. Kullanım `kullanim.js` ile sayılır (`index.html`: `ai:true`). Çekirdek değişmedi.

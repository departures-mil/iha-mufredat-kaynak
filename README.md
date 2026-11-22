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

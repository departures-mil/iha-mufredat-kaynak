# İHA Müfredat Sistemi — kaynak

Windows masaüstü programı (Electron, kurulumlu). Kayıtlar kullanıcının bilgisayarında (`%APPDATA%\IHAMufredatSistemi`) ve
kullanıcının KENDİ Firebase hesabında durur; **kayıtlar bu depoda bulunmaz**.

- `kabuk/` — ana süreç (`main.js`, `preload.js`, internetsiz ağ eşitlemesi `lan.js`, simge).
- `ui/` — arayüz (düz JS). `ui/cekirdek/` + `cekirdek/` = ortak çekirdek kopyası (commit `cekirdek/VERSION`), yapıştırıcı `ui/js/kabuk.js`,
  uyum CSS'i `ui/css/fc-uyum.css`.
- Güncelleme: **yalnız GitHub Releases** (bu depo): `latest.json` + FCD1 yama; kanallar `win-app` (app.asar) ve `win-setup` (NSIS).
- Eski kanal (`departures-mil/iha-mufredat-guncelleme`, raw latest.json + paketler/*.b64) yalnız ≤3.3 kurulumların köprüsüdür.

## Yeni sürüm
1. `ui/js/changelog.js` en üstüne `{ v: 'X.Y.Z', tr: [...], en: [...], ar: [...] }`, sonra `node araclar/surum.js X.Y.Z`.
2. `npm test` (Electron testleri için Linux'ta xvfb).
3. main'e birleştir → `gh api -X POST repos/departures-mil/iha-mufredat-kaynak/actions/workflows/release.yml/dispatches -f ref=main`.

## 3.4.0 (2026-11-24) — ortak çekirdek
NSIS kurulum (kullanıcı başına, tek tık, tr/en/ar), her açılışta tam ekran, sağ üst Eşitle · Wi‑Fi · Güncelle · tema · dil | Küçült · Orta ·
Tam ekran · Kapat, Falcon şeması + şema seçici (eski görünüm `klasik`), açık tema, yazı boyutu, ilk açılış rehberi, neler yeni, Admin ile
iletişim (çekirdek gelen kutusu, Ayarlar'ın EN SONUNDA), çökme raporu, Kullanım Limitleri, Asistan Agent (çekirdek `FC.agent`), Arşiv.
Eşitleme kuralı: öbür cihazda silinen liste öğeleri `Çakışma kayıtları`na (arşiv) yazılır, silinen öğrenci/plan Arşiv kartından geri alınır.
Eski kabuk 2/3 kurulumları eski kanaldan 3.4 köprü paketini alır ve "Yeni kurulum gerekli" penceresiyle kuruluma geçer.

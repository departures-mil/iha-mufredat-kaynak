/* 2.9: Programla gelen ortak Firebase projesi KALDIRILDI — her kurum kendi ücretsiz Firebase hesabını kullanır
   (yöneticinin günlük sınırı başkalarınca harcanmasın). FB_CONFIG boştur; kullanıcı kendi firebaseConfig'ini yapıştırır.
   FB_YAYIN yalnızca yöneticinin yedek güncelleme kanalı ve eski ortak projeden geçiş içindir. */
window.FB_CONFIG = {};
window.FB_REHBER = 'https://github.com/departures-mil/duyurular/blob/main/firebase-kurulum.md';
window.FB_YAYIN = {
  apiKey: 'AIzaSyDRLeBB2OC95Wg4LxpMfr4szGSKiLdhpRM',
  authDomain: 'mufredat-bc0ad.firebaseapp.com',
  projectId: 'mufredat-bc0ad',
  storageBucket: 'mufredat-bc0ad.firebasestorage.app',
  messagingSenderId: '190936103930',
  appId: '1:190936103930:web:6ab3bfedb61ecc7aee4243',
};
/* 3.4.1: yönetici e-postası depoda düz metin tutulmaz; yalnız SHA-256 özeti (küçük harf, boşluksuz) karşılaştırılır */
window.FB_ADMIN_SHA256 = 'b1acd212aa26e8d1a66302ca74cf125228fea1e0cf805377ddcaabb5278722c1';
window.fbSha256Hex = function sha256Hex(str) {           // eşzamanlı, küçük SHA-256 (UTF-8)
  const K = [], H = [];
  const isP = n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const frac = x => ((x - Math.floor(x)) * 0x100000000) | 0;
  for (let n = 2, c = 0; c < 64; n++) if (isP(n)) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c++] = frac(Math.pow(n, 1 / 3)); }
  const b = Array.from(new TextEncoder().encode(str)), bitLen = b.length * 8;
  b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (bitLen >>> (i * 8)) & 0xff);
  const w = new Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    [a, bb, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
};
window.fbYoneticiMi = function (email) { return window.fbSha256Hex(String(email || '').trim().toLowerCase()) === window.FB_ADMIN_SHA256; };
/* Kabuk sürümü: masaüstü/Android kabuğunun desteklediği güncelleme arayüzü */
window.MIN_SHELL_FOR_THIS_BUNDLE = 2;

/* v2.8: güncellemeler GitHub'dan (Firebase yedek kanal) */
window.UPD_GH = { owner: 'departures-mil', repo: 'iha-mufredat-guncelleme', branch: 'main' };

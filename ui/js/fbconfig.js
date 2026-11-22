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
window.FB_ADMIN_EMAIL = 'yonetici@example.invalid';
/* Kabuk sürümü: masaüstü/Android kabuğunun desteklediği güncelleme arayüzü */
window.MIN_SHELL_FOR_THIS_BUNDLE = 2;

/* v2.8: güncellemeler GitHub'dan (Firebase yedek kanal) */
window.UPD_GH = { owner: 'departures-mil', repo: 'iha-mufredat-guncelleme', branch: 'main' };

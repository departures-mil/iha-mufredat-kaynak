/* İHA Müfredat Sistemi — açılış koruyucusu (kabuk 3 ve sonrası). Bu dosya güncellemelerle değişmez.
   Çekirdek (main.js, preload.js, lan.js) uygulama içinden güncellendiğinde eski dosyalar ".prev" olarak saklanır ve
   durum "bekliyor" olur. Yeni çekirdek iki açılışta da arayüzden "açıldı" onayı alamazsa ya da hiç yüklenemezse
   önceki çekirdeğe otomatik dönülür. Kayıtlar (%APPDATA%\IHAMufredatSistemi) bu işlemden etkilenmez. */
const fs = require('fs');
const path = require('path');
const D = __dirname;
const ST = path.join(D, 'kabuk-durum.json');
const FILES = ['main.js', 'preload.js', 'lan.js'];
const rd = () => { try { return JSON.parse(fs.readFileSync(ST, 'utf8')); } catch (e) { return {}; } };
const wr = (s) => { try { fs.writeFileSync(ST, JSON.stringify(s, null, 1)); } catch (e) {} };
function rollback(why) {
  const st = rd();
  let n = 0;
  for (const f of st.files || FILES) {
    const prev = path.join(D, f + '.prev');
    try { if (fs.existsSync(prev)) { fs.copyFileSync(prev, path.join(D, f)); n++; } } catch (e) {}
  }
  st.pending = false; st.tries = 0; st.rolledBack = st.version || '?'; st.why = why; st.at = new Date().toISOString();
  wr(st);
  return n > 0;
}
const st = rd();
if (st.pending) {
  if ((st.tries || 0) >= 2) rollback('acilmadi');
  else { st.tries = (st.tries || 0) + 1; wr(st); }
}
try {
  require('./main.js');
} catch (e) {
  console.error(e);
  if (rollback('yuklenemedi: ' + (e && e.message))) require('./main.js');
  else throw e;
}

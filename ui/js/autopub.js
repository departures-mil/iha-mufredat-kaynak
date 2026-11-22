/* v2.4: Otomatik yayın — yönetici hesabıyla açık masaüstü uygulaması, yayın klasörüne bırakılan yeni paketi
   (paket.ihu) kendisi Firebase'e yükler. Böylece güncellemeler için kimsenin dosya seçmesi ya da şifre yazması gerekmez.
   Yalnız: masaüstü + yönetici oturumu + geçerli paket + yayındakinden yeni sürüm. */
(function () {
  const DEF_DIR = 'C:/Users/abdlm/Documents/IHA_Yayin';
  const FILE = 'paket.ihu';
  let busy = false, timer = null;
  const st = { s: 'idle', v: '', t: 0, err: '' };
  const isAdmin = () => !!(window.Sync && Sync.user && (Sync.user.email || '').toLowerCase() === String(window.FB_ADMIN_EMAIL || '').toLowerCase());
  const supported = () => !!(window.desktop && window.desktop.httpGet);
  const dir = () => (Store.local.autoPubDir != null ? Store.local.autoPubDir : DEF_DIR);
  const fileUrl = (d) => 'file:///' + encodeURI(String(d).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '') + '/' + FILE);
  const set = (s, extra) => { Object.assign(st, { s, t: Date.now() }, extra || {}); const b = document.getElementById('apSt'); if (b) b.innerHTML = statusHtml(); };

  async function tick(manual) {
    if (busy || !supported()) return;
    if (!isAdmin()) { if (manual) set('noadmin'); return; }
    const d = dir(); if (!d) { set('off'); return; }
    busy = true;
    try {
      let text;
      try { text = await desktop.httpGet(fileUrl(d)); } catch (e) { set('nofile'); return; }
      let pkg; try { pkg = JSON.parse(text); } catch (e) { set('bad'); return; }
      if (!pkg || pkg.format !== 'ihu1' || !pkg.version || !pkg.gz) { set('bad'); return; }
      const latest = await Updater.getDoc('guncellemeler/latest');
      if (latest && Updater.vnum(latest.version) >= Updater.vnum(pkg.version)) { set('same', { v: latest.version }); return; }
      set('publishing', { v: pkg.version });
      const token = await Sync.user.getIdToken(true);
      await Updater.publishWithToken(text, token, Sync.user.email, () => {});
      Store.local.autoPubLast = { v: pkg.version, t: Date.now() }; Store.saveLocal();
      set('done', { v: pkg.version });
      UI.toast(t('apDone', { v: pkg.version }));
      setTimeout(() => Updater.check(false), 1500);
    } catch (e) { console.error('autopub', e); set('error', { err: e.message || String(e) }); }
    finally { busy = false; }
  }
  function start() { if (timer) clearInterval(timer); setTimeout(() => tick(false), 9000); timer = setInterval(() => tick(false), 60000); }

  function statusHtml() {
    const L = Store.local.autoPubLast;
    const m = { idle: 'apIdle', noadmin: 'apNoAdmin', off: 'apOff', nofile: 'apNoFile', bad: 'apBad', same: 'apSame', publishing: 'apPublishing', done: 'apDoneSt', error: 'apErr' }[st.s] || 'apIdle';
    return `${esc(t(m, { v: st.v }))}${st.s === 'error' ? ` <small class="err">${esc(st.err)}</small>` : ''}${L ? `<br><small class="muted">${t('apLast')}: v${esc(L.v)} · ${new Date(L.t).toLocaleString()}</small>` : ''}`;
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* Ayarlar → Güncellemeler kartındaki bölüm (yalnız masaüstü yönetici) */
  function cardHtml() {
    if (!supported() || !isAdmin()) return '';
    return `<details class="adv" open><summary>${t('apTitle')}</summary><p class="muted sm">${t('apHelp')}</p>
      <div class="row"><label class="fl grow"><span>${t('apDir')}</span><input id="apDir" dir="ltr" value="${esc(dir())}"></label><button class="btn sm" id="apNow">${t('apCheckNow')}</button></div>
      <p id="apSt" class="sm">${statusHtml()}</p></details>`;
  }
  function wire(m) {
    const i = m.querySelector('#apDir'); if (!i) return;
    i.onchange = () => { Store.local.autoPubDir = i.value.trim(); Store.saveLocal(); tick(true); };
    m.querySelector('#apNow').onclick = () => tick(true);
  }
  window.AutoPub = { tick, start, cardHtml, wire, status: st };
  start();
})();

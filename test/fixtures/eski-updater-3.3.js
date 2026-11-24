/* Uygulama içi güncelleme (OTA)
   v2.8: birincil kanal GitHub (window.UPD_GH: latest.json + paketler/iha_X_Y.b64); Firestore yedek kanal olarak kalır.
   İki kanal da okunur, hangisinde daha yeni sürüm varsa o kullanılır.
   Firestore kanalı:
   guncellemeler/latest                      : son sürüm bilgisi (herkes okuyabilir)
   guncellemeler/surum_X_Y/parcalar/{i}      : sıkıştırılmış arayüz paketinin parçaları
   Yalnız yönetici hesabı (FB_ADMIN_EMAIL) yazabilir. */
(function () {
  const C = window.FB_YAYIN;   // 2.9: yöneticinin yayın projesi (kullanıcılar buradan okumaz)
  const BASE = 'https://firestore.googleapis.com/v1/projects/' + C.projectId + '/databases/(default)/documents/';
  const CHUNK = 700000;
  const vnum = (v) => { const [a, b] = String(v || '0').split('.').map((x) => parseInt(x, 10) || 0); return a * 1000 + b; };
  const val = (f) => (f == null ? null : 'stringValue' in f ? f.stringValue : 'integerValue' in f ? +f.integerValue : 'booleanValue' in f ? f.booleanValue : 'doubleValue' in f ? f.doubleValue : null);
  const b64ToBytes = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
  async function getDoc(path) {
    const r = await fetch(BASE + path + '?key=' + C.apiKey, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); const o = {};
    for (const k in j.fields || {}) o[k] = val(j.fields[k]);
    return o;
  }
  async function gunzipText(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  const GH = window.UPD_GH || null;
  const ghRaw = (f) => 'https://raw.githubusercontent.com/' + GH.owner + '/' + GH.repo + '/' + (GH.branch || 'main') + '/' + f;
  async function getText(url) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) return await r.text(); if (r.status === 404) return null; } catch (e) {}
    return Platform.httpGet(url);
  }
  async function ghLatest() {
    if (!GH || !GH.owner) return null;
    const txt = await getText(ghRaw('latest.json') + '?t=' + Date.now());
    if (!txt) return null;
    const m = JSON.parse(txt); m.src = 'gh'; return m;
  }
  async function fbLatest() { const m = await getDoc('guncellemeler/latest'); if (m) m.src = 'fb'; return m; }
  async function latest() {
    // 2.9: kullanıcılar yalnız GitHub'a bakar; Firebase yedek kanalı yalnız yönetici oturumunda okunur (yöneticinin kotası)
    const yon = window.Sync && Sync.user && (Sync.user.email || '').toLowerCase() === String(window.FB_ADMIN_EMAIL || '').toLowerCase();
    const res = await Promise.allSettled(yon ? [ghLatest(), fbLatest()] : [ghLatest()]);
    const ok = res.filter((r) => r.status === 'fulfilled' && r.value && r.value.version).map((r) => r.value);
    if (!ok.length) { const er = res.find((r) => r.status === 'rejected'); throw er ? er.reason : new Error('kanal'); }
    ok.sort((a, b) => vnum(b.version) - vnum(a.version) || (a.src === 'gh' ? -1 : 1));
    return ok[0];
  }
  // GitHub paketini akışla indirir: yüzde + indirilen / toplam MB + hız
  async function ghDownload(m, onp) {
    const url = ghRaw(m.file || ('paketler/iha_' + m.version.replace(/\./g, '_') + '.b64'));
    const t0 = Date.now();
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
      const total = +m.gzlen || +r.headers.get('Content-Length') || 0;
      const rd = r.body.getReader(); const chunks = []; let done = 0;
      for (;;) { const x = await rd.read(); if (x.done) break; chunks.push(x.value); done += x.value.length; onp(done, Math.max(total, done), done / Math.max(0.2, (Date.now() - t0) / 1000)); }
      const all = new Uint8Array(done); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
      return new TextDecoder().decode(all).trim();
    } catch (e) {
      const txt = await Platform.httpGet(url); if (!txt) throw new Error('paket indirilemedi');
      onp(txt.length, txt.length, 0); return txt.trim();
    }
  }

  const U = {
    state: 'idle', latest: null, error: '', progress: 0, info: null, listeners: new Set(),
    on(fn) { this.listeners.add(fn); },
    set(state, extra) { this.state = state; Object.assign(this, extra || {}); this.listeners.forEach((f) => { try { f(this); } catch (e) {} }); },
    supported() { return !!Platform.ota; },
    vnum,
    async init() {
      if (!this.supported()) return;
      try { this.info = await Platform.ota.info(); } catch (e) {}
      try { await Platform.ota.bootOk(); } catch (e) {}
      setTimeout(() => this.check(false), 4000);
      this.schedule();
    },
    /* v2.5: güncellemeler yalnız uygulama açılışında denetlenir (periyodik denetim kaldırıldı); bildirim ayarı korunur */
    cfg() { return Object.assign({ notify: true }, Store.local.upd || {}); },
    schedule() {},
    notify(m) {
      const c = this.cfg(); if (!c.notify || !m || !m.version) return;
      // v2.6: güncelleme kurulana dek her açılışta bir kez bildirilir (oturum başına bir kez)
      if (this._notifiedThisRun === m.version) return;
      this._notifiedThisRun = m.version;
      const msg = t('updNotify', { v: m.version });
      try { if (window.UI && UI.toast) UI.toast('⬇ ' + msg); } catch (e) {}
      try { if (window.Notification && Notification.permission !== 'denied') { const n = new Notification(t('appName'), { body: msg + (m['notes_' + (window.UI ? UI.lang() : 'tr')] ? '\n' + String(m['notes_' + UI.lang()]).split('\n')[0] : '') }); n.onclick = () => { try { window.focus(); UI.go('settings'); } catch (e) {} }; } } catch (e) {}
    },
    getDoc,
    shell() { return (this.info && this.info.shell) || 0; },
    async check(manual) {
      if (this.state === 'downloading' || this.state === 'ready') return;
      if (this._busy) return; this._busy = true;
      if (manual) this.set('checking', { error: '' }); // arka plan denetimleri ekranı titretmesin
      try {
        const m = await latest();
        Store.local.lastUpdateCheck = Date.now(); Store.saveLocal();
        const avail = m && m.version && vnum(m.version) > vnum(Platform.version);
        const bad = this.info && this.info.state && this.info.state.bad;
        if (avail && bad && bad === m.version) this.set('error', { latest: m, error: t('updateBad', { v: m.version }) });
        else if (avail && (m.minShell || 2) > this.shell()) this.set('shellOld', { latest: m });
        else { const was = this.state; if (!manual && was === (avail ? 'available' : 'uptodate') && this.latest && m && this.latest.version === m.version) this.latest = m; else this.set(avail ? 'available' : 'uptodate', { latest: m }); if (avail) this.notify(m); }
      } catch (e) { if (manual) this.set('error', { error: e.message || String(e) }); else console.warn('update check', e.message); }
      finally { this._busy = false; }
    },
    async install() {
      const m = this.latest; if (!m) return;
      if (!this.supported()) throw new Error('shell');
      // v2.7: indirme sırasında indirilen / toplam MB, kalan ve hız da izlenir
      const total0 = +m.gzlen || m.chunks * CHUNK;
      const t0 = Date.now();
      this.set('downloading', { progress: 0, dl: { done: 0, total: total0, speed: 0 } });
      try {
        const id = 'surum_' + m.version.replace(/\./g, '_');
        const parts = []; let done = 0;
        if (m.src === 'gh') {
          parts.push(await ghDownload(m, (d, tot, sp) => this.set('downloading', { progress: Math.round((d / Math.max(tot, 1)) * 90), dl: { done: d, total: tot, speed: sp } })));
        } else for (let i = 0; i < m.chunks; i++) {
          const d = await getDoc('guncellemeler/' + id + '/parcalar/' + i);
          if (!d || !d.d) throw new Error('parça ' + i);
          parts.push(d.d); done += d.d.length;
          const total = i === m.chunks - 1 ? done : Math.max(total0, done);
          const sec = Math.max(0.2, (Date.now() - t0) / 1000);
          this.set('downloading', { progress: Math.round((done / total) * 90), dl: { done, total, speed: done / sec } });
        }
        const bytes = b64ToBytes(parts.join(''));
        if (m.sha256) { const h = hex(await crypto.subtle.digest('SHA-256', bytes)); if (h !== m.sha256) throw new Error('doğrulama (sha256)'); }
        const bundle = JSON.parse(await gunzipText(bytes));
        if (bundle.version !== m.version || !bundle.files || !bundle.files['index.html']) throw new Error('paket');
        await Platform.ota.begin(m.version);
        const names = Object.keys(bundle.files);
        for (let i = 0; i < names.length; i++) {
          await Platform.ota.write(m.version, names[i], bundle.files[names[i]]);
          if (i % 3 === 0) this.set('downloading', { progress: 90 + Math.round(((i + 1) / names.length) * 10) });
        }
        await Platform.ota.commit(m.version);
        Store.persistNow();
        this.set('ready', { progress: 100 });
      } catch (e) { console.error(e); this.set('error', { error: e.message || String(e) }); throw e; }
    },
    restart() { Store.persistNow(); setTimeout(() => Platform.ota.restart(), 300); },

    /* Yönetici: .ihu güncelleme dosyasını Firebase'e yayınlar */
    async publish(text, email, password, onProgress) {
      let pkg; try { pkg = JSON.parse(text); } catch (e) { throw new Error(t('ihuInvalid')); }
      if (pkg.format !== 'ihu1' || !pkg.version || !pkg.gz) throw new Error(t('ihuInvalid'));
      const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + C.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
      const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || 'auth');
      return this.publishWithToken(text, j.idToken, email, onProgress);
    },
    /* v2.4: oturum açık yönetici uygulaması (otomatik yayın) şifre sormadan yayınlar */
    async publishWithToken(text, token, email, onProgress) {
      let pkg; try { pkg = JSON.parse(text); } catch (e) { throw new Error(t('ihuInvalid')); }
      if (pkg.format !== 'ihu1' || !pkg.version || !pkg.gz) throw new Error(t('ihuInvalid'));
      // paket bütünlüğü: sha256(gz) beyanla aynı olmalı
      if (pkg.sha256) { const h = hex(await crypto.subtle.digest('SHA-256', b64ToBytes(pkg.gz))); if (h !== pkg.sha256) throw new Error(t('ihuInvalid') + ' (sha256)'); }
      const put = async (path, fields) => {
        const x = await fetch(BASE + path + '?key=' + C.apiKey, { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
        if (!x.ok) { let msg = 'HTTP ' + x.status; try { msg += ' ' + (await x.json()).error.message; } catch (e) {} throw new Error(msg); }
      };
      const S = (v) => ({ stringValue: String(v == null ? '' : v) });
      const id = 'surum_' + pkg.version.replace(/\./g, '_');
      const n = Math.ceil(pkg.gz.length / CHUNK);
      for (let i = 0; i < n; i++) { await put('guncellemeler/' + id + '/parcalar/' + i, { d: S(pkg.gz.slice(i * CHUNK, (i + 1) * CHUNK)) }); onProgress && onProgress(Math.round(((i + 1) / (n + 1)) * 100)); }
      const notes = pkg.notes || {};
      const meta = { version: S(pkg.version), chunks: { integerValue: String(n) }, gzlen: { integerValue: String(pkg.gz.length) }, sha256: S(pkg.sha256), size: { integerValue: String(pkg.size || 0) }, date: S(pkg.date || new Date().toISOString()), minShell: { integerValue: String(pkg.minShell || 2) }, notes_tr: S(notes.tr), notes_en: S(notes.en), notes_ar: S(notes.ar), publishedBy: S(email) };
      await put('guncellemeler/' + id, meta);
      await put('guncellemeler/latest', meta);
      onProgress && onProgress(100);
      return pkg.version;
    },
  };
  window.Updater = U;
})();

/* v3.1: İnternetsiz eşitleme — aynı modem / Wi‑Fi ağındaki bilgisayarlar arasında (normal eşitlemenin ikinci seçeneği).
   Kayıtlar çevrimiçi eşitlemedeki gibi üç yönlü birleştirilir (merge.js): hiçbir kayıt silinmez, üst üste yazılmaz;
   iki tarafta aynı alan değiştiyse yenisi kalır, öbürü "Çakışma kayıtları"na düşer. Her cihaz çifti için ortak ata ayrı tutulur.
   Taşıma çekirdek 3'tedir (kabuk/lan.js): istekler ortak "ağ eşitleme kodu" ile imzalanır, kod ağda açık gitmez. */
(function () {
  const A = { state: 'off', msg: '', peers: [], busy: false, last: 0, listeners: new Set() };
  const cfg = () => { Store.local.lan = Object.assign({ on: false, code: '', name: '', peers: {}, auto: true }, Store.local.lan || {}); return Store.local.lan; };
  const ok = () => !!(Platform.lan && Platform.kind === 'desktop');
  const emit = () => A.listeners.forEach((f) => { try { f(); } catch (e) {} });
  const myId = () => Store.local.deviceId;
  const genCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint8Array(8)); return [...r].map((x) => c[x % c.length]).join(''); };

  async function start() {
    if (!ok()) return;
    Platform.lan.onRequest(handle);
    const c = cfg();
    if (c.on && c.code) { try { await enable(true); } catch (e) { console.warn('lan', e); } }
    setInterval(() => { if (cfg().on && cfg().auto && !A.busy) syncAll(true); }, 3 * 60 * 1000);
    let dt = null;
    Store.on((w) => { if (!cfg().on || !cfg().auto || w === 'lan') return; clearTimeout(dt); dt = setTimeout(() => syncAll(true), 30000); });
  }
  async function enable(silent) {
    const c = cfg();
    if (!c.code || c.code.length < 6) throw new Error(t('lanCodeShort'));
    let name = c.name; if (!name) { try { name = (await Platform.appInfo()).host; } catch (e) { name = 'PC'; } c.name = name; }
    const st = await Platform.lan.start({ code: c.code, id: myId(), name, version: Platform.version });
    c.on = true; Store.saveLocal(); A.state = 'on'; A.status = st; emit();
    if (!silent) UI.toast(t('lanOnToast'));
    setTimeout(() => syncAll(true), 1500);
    return st;
  }
  async function disable() { const c = cfg(); c.on = false; Store.saveLocal(); try { await Platform.lan.stop(); } catch (e) {} A.state = 'off'; A.status = null; emit(); }

  function snapshotParts() { const out = {}; for (const k of Merge.allKeys()) { const r = Merge.getRec(k); if (r) out[k] = r; } return out; }
  const markCloud = (keys) => { if (window.Sync && keys.length) keys.forEach((k) => Sync.markDirty(k)); };

  /* Sunucu tarafı: öbür bilgisayarın kayıtlarını kendi kayıtlarımızla birleştirir, birleşmiş hâli geri yollar */
  async function handle(body) {
    await Merge.loadAll();
    const q = JSON.parse(body); const peer = String(q.from || ''); if (!peer) throw new Error('kimlik');
    const ns = 'lan:' + peer; const out = {}; const changed = [];
    const keys = new Set([...Merge.allKeys(), ...Object.keys(q.parts || {})]);
    for (const key of keys) {
      const L = Merge.getRec(key); const R = (q.parts || {})[key];
      let res = L;
      if (!R) res = L;
      else if (!L) { res = R; Merge.setRec(key, R); changed.push(key); }
      else if (!Merge.eq(L, R)) {
        const base = Merge.getBase(ns, key);
        if (base) {
          const lc = !Merge.eq(L, base), rc = !Merge.eq(R, base);
          if (lc && rc) { const m = Merge.record(base, L, R); res = m.merged; Merge.logConflicts(key, res, m.conflicts, 'ag'); }
          else res = rc ? R : L;
        } else {
          const rNew = (R.updatedAt || 0) > (L.updatedAt || 0); res = rNew ? R : L;
          if ((L.updatedAt || 0) > 0 && (R.updatedAt || 0) > 0) Merge.logConflicts(key, L, [{ path: [], kept: rNew ? (q.name || 'ag') : 'yerel', lost: rNew ? L : R }], 'ag');
        }
        if (res !== L) { Merge.setRec(key, res); changed.push(key); }
      }
      if (res) { out[key] = res; Merge.setBase(ns, key, res); }
    }
    if (changed.length) { Store.persistNow(); Store.emit('lan'); markCloud(changed); }
    rememberPeer({ id: peer, name: q.name });
    A.last = Date.now(); Store.local.lanLast = A.last; Store.saveLocal(); emit();
    return JSON.stringify({ from: myId(), name: cfg().name, parts: out });
  }

  /* İstemci tarafı: kayıtlarımızı öbür bilgisayara yollar, birleşmiş hâli alır */
  async function syncWith(p) {
    await Merge.loadAll();
    const sent = snapshotParts();
    const txt = await Platform.lan.call(p.host, p.port, 'POST', '/iha/sync', JSON.stringify({ from: myId(), name: cfg().name, v: Platform.version, parts: sent }));
    const res = JSON.parse(txt); const peer = String(res.from || p.id || ''); const ns = 'lan:' + peer;
    const changed = [];
    for (const [key, M] of Object.entries(res.parts || {})) {
      const now = Merge.getRec(key); let fin = M;
      if (now && sent[key] && !Merge.eq(now, sent[key])) fin = Merge.record(sent[key], now, M).merged; // yollarken burada da değişti
      if (!now || !Merge.eq(now, fin)) { Merge.setRec(key, fin); changed.push(key); }
      Merge.setBase(ns, key, M);
    }
    if (changed.length) { Store.persistNow(); Store.emit('lan'); markCloud(changed); }
    rememberPeer({ id: peer, name: res.name || p.name, host: p.host, port: p.port });
    return changed.length;
  }
  function rememberPeer(p) {
    const c = cfg(); const o = c.peers[p.id] || {};
    c.peers[p.id] = Object.assign(o, { id: p.id, name: p.name || o.name, host: p.host || o.host, port: p.port || o.port, last: Date.now() });
    Store.saveLocal();
  }
  async function discover() {
    if (!ok() || !cfg().on) return [];
    const found = await Platform.lan.discover(2500);
    const c = cfg(); const map = new Map(found.map((p) => [p.id, p]));
    for (const p of Object.values(c.peers)) if (!map.has(p.id) && p.manual && p.host) map.set(p.id, p);
    A.peers = [...map.values()]; emit(); return A.peers;
  }
  async function syncAll(quiet) {
    if (!ok() || !cfg().on || A.busy) return;
    A.busy = true; A.state = 'busy'; emit();
    let n = 0, okc = 0, err = '';
    try {
      const peers = await discover();
      for (const p of peers) { try { n += await syncWith(p); okc++; } catch (e) { err = e.message === 'auth' ? t('lanAuth') : e.message; console.warn('lan', p, e); } }
      A.last = Date.now(); Store.local.lanLast = A.last; Store.saveLocal();
      if (!quiet) UI.toast(peers.length ? (okc ? t('lanDone', { p: okc, n }) : t('lanErr') + ': ' + err) : t('lanNone'), okc || !peers.length ? '' : 'err');
    } catch (e) { if (!quiet) UI.toast(t('lanErr') + ': ' + e.message, 'err'); }
    A.busy = false; A.state = cfg().on ? 'on' : 'off'; emit();
    return n;
  }
  async function addManual(addr) {
    const m = String(addr || '').trim().match(/^([\w.-]+)(?::(\d+))?$/); if (!m) throw new Error(t('lanBadAddr'));
    const p = { id: 'el-' + m[1], host: m[1], port: +(m[2] || 47811), name: m[1], manual: true };
    await syncWith(p);
    const c = cfg(); for (const [k, v] of Object.entries(c.peers)) if (v.host === p.host && k !== p.id) v.manual = true; Store.saveLocal();
  }

  /* ---------- Ayarlar kartı ---------- */
  function cardHtml() {
    const { icon, esc } = UI; const c = cfg();
    if (!ok()) return `<div class="card" id="lan"><h3>${icon('link')} ${t('lanTitle')}</h3><p class="muted">${t(Platform.kind === 'desktop' ? 'lanNeedShell' : 'lanDesktopOnly')}</p></div>`;
    const st = A.status;
    const last = Store.local.lanLast ? new Date(Store.local.lanLast).toLocaleString() : '—';
    return `<div class="card" id="lan"><h3>${icon('link')} ${t('lanTitle')}</h3><p class="muted">${t('lanHelp')}</p>
      <div class="grid3"><label class="fl"><span>${t('lanCode')}</span><input id="lanCode" dir="ltr" value="${esc(c.code)}" placeholder="ABCD2345" autocomplete="off"></label>
      <label class="fl"><span>${t('lanName')}</span><input id="lanName" value="${esc(c.name)}"></label>
      <div class="fl"><span>&nbsp;</span><button class="btn ghost sm" id="lanGen">${icon('bolt')} ${t('lanGen')}</button></div></div>
      <div class="row"><label class="chk"><input type="checkbox" id="lanOn" ${c.on ? 'checked' : ''}> ${t('lanOn')}</label><label class="chk"><input type="checkbox" id="lanAuto" ${c.auto ? 'checked' : ''}> ${t('lanAuto')}</label></div>
      ${c.on && st ? `<p class="ok sm">${icon('check')} ${t('lanStatus', { a: (st.addrs || []).join(', ') || '—', p: st.port })}</p>` : ''}
      <div class="row"><button class="btn pri" id="lanSync" ${c.on ? '' : 'disabled'}>${icon('sync')} ${A.busy ? t('syncBusyBtn') : t('lanSyncNow')}</button><span class="muted sm">${t('lastSync')}: ${last}</span></div>
      ${A.peers.length ? `<ul class="lanpeers">${A.peers.map((p) => `<li>${icon('link')} <b>${esc(p.name || p.host)}</b> <span class="muted sm" dir="ltr">${esc(p.host)}:${p.port}</span></li>`).join('')}</ul>` : ''}
      <details class="adv"><summary>${t('lanManual')}</summary><div class="row"><input id="lanAddr" dir="ltr" placeholder="192.168.1.20" class="grow"><button class="btn sm" id="lanAdd">${icon('sync')} ${t('lanManualBtn')}</button></div></details>
      <p class="muted sm">${t('lanFirewall')}</p></div>`;
  }
  function wire(m) {
    if (!ok()) return;
    const $ = (s) => m.querySelector(s); if (!$('#lanCode')) return;
    const save = () => { const c = cfg(); c.code = $('#lanCode').value.trim().toUpperCase(); c.name = $('#lanName').value.trim(); Store.saveLocal(); };
    $('#lanCode').onchange = async () => { save(); if (cfg().on) { try { await enable(true); } catch (e) { UI.toast(e.message, 'err'); } } };
    $('#lanName').onchange = save;
    $('#lanGen').onclick = () => { $('#lanCode').value = genCode(); save(); UI.toast(t('lanGenToast')); if (cfg().on) enable(true).catch(() => {}); };
    $('#lanAuto').onchange = (e) => { cfg().auto = e.target.checked; Store.saveLocal(); };
    $('#lanOn').onchange = async (e) => { save(); try { if (e.target.checked) await enable(); else await disable(); } catch (er) { e.target.checked = false; UI.toast(er.message, 'err'); } refresh(m); };
    $('#lanSync').onclick = async () => { await syncAll(false); refresh(m); };
    $('#lanAdd').onclick = async () => { try { await addManual($('#lanAddr').value); UI.toast(t('lanDone', { p: 1, n: '' })); } catch (e) { UI.toast(t('lanErr') + ': ' + (e.message === 'auth' ? t('lanAuth') : e.message), 'err'); } refresh(m); };
  }
  function refresh(m) { const old = m.querySelector('#lan'); if (!old) return; const w = document.createElement('div'); w.innerHTML = cardHtml(); const nu = w.firstElementChild; old.replaceWith(nu); wire(m); UI.biScan && UI.biScan(nu); }
  A.onChange = (f) => A.listeners.add(f);
  Object.assign(A, { start, enable, disable, syncAll, syncWith, discover, addManual, cardHtml, wire, refresh, handle, cfg, available: ok });
  window.Lan = A;
})();

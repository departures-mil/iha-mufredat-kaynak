/* v3.1: Profesyonel dokunuşlar
   - Açılış ekranı (index.html) program hazır olunca yumuşakça kapanır.
   - Güncellemeden sonra ilk açılışta "Yenilikler" penceresi (TR/EN/AR).
   - Hata raporu: beklenmeyen hatalar hata günlüğüne yazılır; ayar açıksa yöneticiye kısa rapor gider
     (yalnız hata metni, sürüm ve işletim sistemi — hiçbir kayıt gönderilmez). Günde en çok 5 rapor.
   - Klavye kısayolları (Ctrl+F ara, Ctrl+N yeni öğrenci, Ctrl+S kaydet, Ctrl+P yazdır, F1 yardım, F5 eşitle, Ctrl+, ayarlar).
   - Ayarlar: yedekten geri yükleme listesi, çakışma kayıtları, ayrıntılı "Hakkında". */
(function () {
  const { $, $$, esc, icon, modal, toast, confirmDlg } = UI;
  const L = () => UI.lang();

  /* ---------- açılış ekranı ---------- */
  function hideSplash() { const s = document.getElementById('splash'); if (!s) return; s.classList.add('gone'); setTimeout(() => s.remove(), 600); }

  /* ---------- yenilikler ---------- */
  function whatsNew(force) {
    const seen = Store.local.seenVer; const v = Platform.version;
    if (!force && seen === v) return;
    Store.local.seenVer = v; Store.saveLocal();
    if (!force && !seen) return; // ilk kurulum: gösterme
    const CL = window.CHANGELOG || []; const e = CL.find((x) => x.v === v) || CL[0]; if (!e) return;
    const list = (e[L()] || e.tr || []).map((x) => `<li>${esc(x)}</li>`).join('');
    modal(icon('bolt') + ' ' + t('wnTitle', { v: e.v }), `<ul class="wnl">${list}</ul><p class="muted sm">${t('dataSafe')}</p>`, { cls: 'small' });
  }

  /* ---------- hata raporu ---------- */
  const errSeen = new Set();
  function report(kind, msg, stack) {
    const text = (kind + ': ' + String(msg || '')).slice(0, 600);
    if (!msg || errSeen.has(text) || /ResizeObserver|Script error\.?$/i.test(text)) return;
    errSeen.add(text);
    try { Platform.logError && Platform.logError(text + (stack ? '\n' + String(stack).slice(0, 1500) : '')); } catch (e) {}
    const q = Store.local; if (!q) return;
    q.errLog = (q.errLog || []).slice(-29); q.errLog.push({ t: Date.now(), m: text }); Store.saveLocal();
    if (q.errReport === false || !window.Contact || !Contact.autoReport) return;
    const day = new Date().toISOString().slice(0, 10); q.errDay = q.errDay && q.errDay.d === day ? q.errDay : { d: day, n: 0 };
    if (q.errDay.n >= 5) return; q.errDay.n++; Store.saveLocal();
    Contact.autoReport(text + (stack ? '\n\n' + String(stack).slice(0, 1200) : ''));
  }
  window.addEventListener('error', (e) => report('hata', e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r && (r.code === 'permission-denied' || /network|offline|Failed to fetch/i.test(r.message || ''))) return; report('söz', (r && r.message) || r, r && r.stack); });

  /* ---------- kısayollar ---------- */
  const KEYS = [['Ctrl+F', 'kbSearch'], ['Ctrl+N', 'kbNew'], ['Ctrl+S', 'kbSave'], ['Ctrl+P', 'kbPrint'], ['F5', 'kbSync'], ['F1', 'kbHelp'], ['Ctrl+,', 'kbSettings'], ['F11', 'kbFull'], ['Esc', 'kbEsc']];
  document.addEventListener('keydown', (e) => {
    const c = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if (c && k === 'f') { e.preventDefault(); if (window.GSearch) GSearch.focus(); }
    else if (c && k === 's') { e.preventDefault(); Store.persistNow(); toast(t('kbSaved')); }
    else if (c && k === 'n' && !UI.modals.length) { e.preventDefault(); if (UI.editStudent) UI.editStudent(); }
    else if (c && k === 'p' && !UI.modals.length) { e.preventDefault(); UI.go('print'); }
    else if (c && e.key === ',') { e.preventDefault(); UI.go('settings'); }
    else if (e.key === 'F1') { e.preventDefault(); UI.go('help'); }
    else if (e.key === 'F5' && !typing) { e.preventDefault(); const b = document.getElementById('syncChip'); if (b) b.click(); }
  });
  function shortcutsCard() { return `<div class="card" id="kisayol"><h3>${icon('bolt')} ${t('kbTitle')}</h3><div class="kbgrid">${KEYS.map(([k, n]) => `<kbd dir="ltr">${k}</kbd><span>${t(n)}</span>`).join('')}</div></div>`; }
  UI.afterRender.push(() => { if (UI.R.page === 'help') { const m = $('#main'); if (m && !$('#kisayol', m)) { m.insertAdjacentHTML('beforeend', shortcutsCard()); UI.biScan(m); } } });

  /* ---------- yedekten geri yükleme ---------- */
  Store.backupSnapshot = async (why) => { try { if (Platform.backups) return await Platform.backups.snapshot(JSON.stringify(Store.db), why || 'geri'); } catch (e) { console.warn(e); } return null; };
  const fmtKB = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  async function restoreModal() {
    let list = []; try { list = await Platform.backups.list(); } catch (e) { toast(e.message, 'err'); return; }
    if (!list.length) { toast(t('bkNone')); return; }
    const mm = modal(icon('archive') + ' ' + t('bkRestore'), `<p class="muted">${t('bkRestoreHelp')}</p><div class="bklist">${list.slice(0, 60).map((b) => `<button class="bkrow" data-bk="${esc(b.name)}"><b>${esc(new Date(b.mtime).toLocaleString())}</b><span class="muted sm" dir="ltr">${esc(b.name)}</span><span class="muted sm">${fmtKB(b.size)}</span></button>`).join('')}</div>`, { wide: true });
    $$('[data-bk]', mm.el).forEach((b) => (b.onclick = async () => {
      const name = b.dataset.bk; let db;
      try { db = JSON.parse(await Platform.backups.read(name)); } catch (e) { toast(t('bkBad'), 'err'); return; }
      const n = Object.values(db.students || {}).filter((s) => !s.deleted).length;
      if (!(await confirmDlg(t('bkConfirm', { d: new Date(list.find((x) => x.name === name).mtime).toLocaleString(), n })))) return;
      await Store.backupSnapshot('geri_yukleme');
      Store.replaceDb(db); mm.close(); toast(t('bkDone')); UI.go('dashboard');
    }));
  }

  /* ---------- çakışma kayıtları ---------- */
  const prev = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s == null ? '—' : s.length > 90 ? s.slice(0, 90) + '…' : s; };
  const pathTxt = (p) => (!p || !p.length ? t('cfWhole') : p.map((x) => (String(x)[0] === '#' ? '•' : x)).join(' › '));
  function conflictCardHtml() { return `<div class="card" id="cakisma"><h3>${icon('flag')} ${t('cfTitle')}</h3><p class="muted sm">${t('cfHelp')}</p><div id="cfList" class="muted sm">…</div></div>`; }
  async function fillConflicts(m) {
    const box = $('#cfList', m); if (!box || !window.Merge) return;
    const all = await Merge.conflicts();
    if (!all.length) { box.innerHTML = `<span class="ok">${icon('check')} ${t('cfNone')}</span>`; return; }
    box.className = '';
    box.innerHTML = `<ul class="cfl">${all.slice(0, 60).map((c) => `<li data-cf="${c.id}"><div><b>${esc(c.name || c.key)}</b> <span class="muted sm">${esc(new Date(c.t).toLocaleString())} · ${t(c.src === 'ag' ? 'cfSrcLan' : 'cfSrcCloud')}</span></div><div class="sm">${esc(pathTxt(c.path))}</div><div class="sm"><span class="muted">${t('cfKept')}:</span> <code>${esc(prev(c.kept))}</code></div><div class="sm"><span class="muted">${t('cfLost')}:</span> <code>${esc(prev(c.lost))}</code></div><div class="row"><button class="btn sm" data-cfa="use">${icon('up')} ${t('cfUse')}</button><button class="btn ghost sm" data-cfa="del">${icon('x')} ${t('cfDismiss')}</button></div></li>`).join('')}</ul><button class="btn ghost sm" id="cfClear">${icon('trash')} ${t('cfClear')}</button>`;
    $$('[data-cf]', box).forEach((li) => {
      const c = all.find((x) => String(x.id) === li.dataset.cf);
      li.querySelector('[data-cfa="use"]').onclick = async () => { if (Merge.restoreConflict(c)) { await Merge.removeConflict(c.id); toast(t('cfRestored')); } else toast(t('cfCant'), 'err'); fillConflicts(m); };
      li.querySelector('[data-cfa="del"]').onclick = async () => { await Merge.removeConflict(c.id); fillConflicts(m); };
    });
    $('#cfClear', box).onclick = async () => { await Merge.clearConflicts(); fillConflicts(m); };
    UI.biScan(box);
  }

  /* ---------- hakkında ---------- */
  function aboutHtml() {
    return `<div class="card" id="hakkinda"><h3>${icon('plane')} ${t('about')}</h3><div class="about">
      <div class="logo big">${document.querySelector('.brand .logo') ? document.querySelector('.brand .logo').innerHTML : ''}</div>
      <div><p><b>${t('appName')}</b></p><p>${t('version')} <b>v${esc(Platform.version)}</b> · ${esc(Platform.kind)}</p><p class="muted sm" id="abInfo"></p></div></div>
      <p class="muted sm">${t('privacyNote')}</p>
      ${window.KabukGec ? KabukGec.cardHtml() : ''}
      <div class="row"><button class="btn sm" id="abNew">${icon('bolt')} ${t('wnShow')}</button>${Platform.openDataFolder ? `<button class="btn ghost sm" id="abData">${icon('archive')} ${t('openDataFolder')}</button>` : ''}${Platform.readLog ? `<button class="btn ghost sm" id="abLog">${icon('file')} ${t('errLogShow')}</button>` : ''}</div>
      <label class="chk"><input type="checkbox" id="errRep" ${Store.local.errReport === false ? '' : 'checked'}> ${t('errReportOpt')}</label></div>`;
  }
  function wire(m) {
    const ab = $('#abNew', m); if (ab) ab.onclick = () => whatsNew(true);
    const ad = $('#abData', m); if (ad) ad.onclick = () => Platform.openDataFolder();
    const al = $('#abLog', m); if (al) al.onclick = async () => { const s = await Platform.readLog(); modal(t('errLogShow'), `<pre class="logpre" dir="ltr">${esc(s || t('errLogEmpty'))}</pre>`, { wide: true }); };
    const er = $('#errRep', m); if (er) er.onchange = () => { Store.local.errReport = er.checked; Store.saveLocal(); };
    const br = $('#bkRestore', m); if (br) br.onclick = restoreModal;
    if (window.KabukGec) KabukGec.wire(m);
    const inf = $('#abInfo', m); if (inf && Platform.appInfo) Platform.appInfo().then((i) => { inf.textContent = t('abInfo', { k: i.shell, e: i.electron, o: i.os }); }).catch(() => {});
    fillConflicts(m);
    if (window.Lan) Lan.wire(m);
  }
  function backupExtraHtml() { return Platform.backups ? `<button class="btn" id="bkRestore">${icon('archive')} ${t('bkRestore')}</button>` : ''; }
  if (window.Merge) Merge.onLog(() => { if (UI.R.page === 'settings') { const m = $('#main'); if (m) fillConflicts(m); } });

  function start() {
    hideSplash();
    setTimeout(() => whatsNew(false), 1200);
  }
  window.Pro = { start, whatsNew, report, restoreModal, conflictCardHtml, aboutHtml, backupExtraHtml, wire, hideSplash };
})();

/* İHA Müfredat Sistemi — ortak çekirdek yapıştırıcısı (ui/cekirdek/fc-core.js; commit ui/cekirdek/VERSION).
   Burada: sağ üst sıra ([Duyurular · ✦] Eşitle · Wi-Fi · Güncelle · Tema · Dil | Küçült · Orta · Tam ekran · Kapat),
   "klasik" renk şeması (3.3'e kadarki havacılık renkleri), dil köprüsü (uygulamanın 5 dil kipi ↔ çekirdek tr/en/ar),
   ayarlar düzeni (FC.settings: Görünüm · uygulama kartları · Arşiv · Asistan Agent · Kullanım Limitleri · Hata raporu ·
   Hakkında · Admin ile iletişim EN SON), Kullanım sayacı uyarlayıcısı (eski Kullanim.* çağrıları → FC.usage),
   ilk açılış rehberi (Firebase + AI adımları), "neler yeni" (changelog.js), güncelleme (FC.updater, GitHub Releases)
   ve ESKİ KABUK KÖPRÜSÜ:
   - Kabuk 2/3 (≤3.3, resources\app klasörü, eski raw kanal): bu arayüz eski kanaldan (iha-mufredat-guncelleme) ota\3.4
     klasörüne iner ve eski ana süreçte açılır (window.desktop var, window.fcHost yok). Burada "Yeni kurulum gerekli"
     penceresi çıkar; "Kur" düğmesi küçük bir betikle kurulum programını GitHub sürümünden indirir, SHA-256'sını
     latest.json ile doğrular, program kapanınca çalıştırır. Kurulum aynı klasöre yazar, eski resources\app klasörünü
     kaldırır (build/kurulum.nsh). Kayıtlar (%APPDATA%\IHAMufredatSistemi, app://mufredat kökeni) olduğu gibi kalır. */
(function () {
  'use strict';
  var OWNER = 'departures-mil', REPO = 'iha-mufredat-kaynak', APP = 'iha-mufredat', PREFIX = 'IhaMufredat';
  var VER = String(window.APP_VERSION || '0.0.0');
  var ui = FC.ui;
  var LEGACY = !window.fcHost && !!window.desktop;   // eski kabuk (2/3) içinde mi?
  window.__ihaErrors = [];
  window.addEventListener('error', function (e) { if (e && e.message && !/ResizeObserver/.test(e.message)) window.__ihaErrors.push(String(e.message)); });
  var L = function () { return (window.UI && UI.lang && UI.lang()) || 'tr'; };
  var tt = function (k, p) { return window.t ? window.t(k, p) : k; };

  /* ---------- metinler (uygulama sözlüğüne eklenir) ---------- */
  var TXT = {
    tr: {
      fcArchiveTitle: 'Arşiv (silinen kayıtlar)', fcArchiveHelp: 'Silinen öğrenciler ve ders programları kalıcı olarak silinmez; burada durur ve geri alınabilir. Başka cihazda silinenler de eşitlemeyle buraya gelir.',
      fcArchiveNone: 'Arşivde kayıt yok.', fcArchiveSrc: 'öbür cihazda silindi (arşiv)', fcArchiveRestore: 'Geri al', fcArchiveRestored: 'Kayıt geri alındı.', fcArchiveStudent: 'Öğrenci', fcArchivePlan: 'Ders programı',
      fcDiagTitle: 'Veri klasörü ve hata günlüğü',
      fcBridgeTitle: 'Yeni kurulum gerekli', fcBridgeBody: 'İHA Müfredat Sistemi {v} yeni bir kurulum programıyla gelir: tam ekran açılış, tek tuşla güncelleme (yalnızca değişen kısımlar indirilir), yeni görünüm ve renk şemaları. Bu sürümü bir kez kurun; sonraki güncellemeler program içinden kendiliğinden gelir.',
      fcBridgeSafe: 'Kayıtlarınız korunur: öğrenciler, müfredat, planlar, yedekler ve ayarlar aynı yerde kalır; yeni sürüm onları kendiliğinden açar.',
      fcBridgeHow: '"Kur" düğmesi kurulum dosyasını GitHub\'dan indirir, doğrular ve program kapanınca çalıştırır. Kurulum birkaç saniye sürer ve programı yeniden açar.',
      fcBridgeInstall: 'Kur', fcBridgeLater: 'Daha sonra', fcBridgePage: 'Sürümler sayfası', fcBridgeGoing: 'Kurulum indiriliyor; program birazdan kapanıp yeniden açılacak…',
      fcFbSaved: 'Firebase yapılandırması kaydedildi. Ayarlar › Eşitleme\'de e-posta ve şifrenizle bağlanın.'
    },
    en: {
      fcArchiveTitle: 'Archive (deleted records)', fcArchiveHelp: 'Deleted students and lesson plans are never removed permanently; they stay here and can be restored. Records deleted on another device also arrive here through sync.',
      fcArchiveNone: 'The archive is empty.', fcArchiveSrc: 'deleted on another device (archive)', fcArchiveRestore: 'Restore', fcArchiveRestored: 'Record restored.', fcArchiveStudent: 'Student', fcArchivePlan: 'Lesson plan',
      fcDiagTitle: 'Data folder and error log',
      fcBridgeTitle: 'New installation required', fcBridgeBody: 'UAV Curriculum System {v} comes with a new installer: full-screen start, one-click updates (only changed parts are downloaded), a new look and colour schemes. Install this version once; later updates arrive by themselves inside the program.',
      fcBridgeSafe: 'Your records are kept: students, curriculum, plans, backups and settings stay where they are; the new version opens them automatically.',
      fcBridgeHow: '"Install" downloads the installer from GitHub, verifies it and runs it when the program closes. Installation takes a few seconds and reopens the program.',
      fcBridgeInstall: 'Install', fcBridgeLater: 'Later', fcBridgePage: 'Releases page', fcBridgeGoing: 'Downloading the installer; the program will close and reopen shortly…',
      fcFbSaved: 'Firebase configuration saved. Connect with your e-mail and password in Settings › Sync.'
    },
    ar: {
      fcArchiveTitle: 'الأرشيف (السجلات المحذوفة)', fcArchiveHelp: 'لا يُحذف الطلاب وخطط الدروس المحذوفة نهائياً؛ تبقى هنا ويمكن استعادتها. والسجلات المحذوفة على جهاز آخر تصل إلى هنا أيضاً عبر المزامنة.',
      fcArchiveNone: 'الأرشيف فارغ.', fcArchiveSrc: 'حُذف على جهاز آخر (أرشيف)', fcArchiveRestore: 'استعادة', fcArchiveRestored: 'تمت استعادة السجل.', fcArchiveStudent: 'طالب', fcArchivePlan: 'خطة درس',
      fcDiagTitle: 'مجلد البيانات وسجل الأخطاء',
      fcBridgeTitle: 'يلزم تثبيت جديد', fcBridgeBody: 'يأتي نظام منهج الطائرات المسيّرة {v} مع برنامج تثبيت جديد: فتح بملء الشاشة، وتحديث بنقرة واحدة (تُنزَّل الأجزاء المتغيرة فقط)، ومظهر جديد وأنظمة ألوان. ثبّت هذا الإصدار مرة واحدة؛ وستصل التحديثات اللاحقة تلقائياً داخل البرنامج.',
      fcBridgeSafe: 'سجلاتك محفوظة: الطلاب والمنهج والخطط والنسخ الاحتياطية والإعدادات تبقى في مكانها، ويفتحها الإصدار الجديد تلقائياً.',
      fcBridgeHow: 'يقوم زر «تثبيت» بتنزيل برنامج التثبيت من GitHub والتحقق منه وتشغيله عند إغلاق البرنامج. يستغرق التثبيت بضع ثوانٍ ثم يُعاد فتح البرنامج.',
      fcBridgeInstall: 'تثبيت', fcBridgeLater: 'لاحقاً', fcBridgePage: 'صفحة الإصدارات', fcBridgeGoing: 'جارٍ تنزيل برنامج التثبيت؛ سيُغلق البرنامج ويُعاد فتحه بعد قليل…',
      fcFbSaved: 'تم حفظ إعدادات Firebase. اتصل ببريدك الإلكتروني وكلمة المرور من الإعدادات › المزامنة.'
    }
  };
  if (window.I18N) Object.keys(TXT).forEach(function (l) { I18N[l] = Object.assign(I18N[l] || {}, TXT[l]); });

  /* ---------- "klasik" şema: 3.3'e kadarki havacılık renkleri (style.css :root) ---------- */
  FC.look.registerScheme('klasik', {
    label: { tr: 'Klasik (eski görünüm)', en: 'Classic (previous look)', ar: 'الكلاسيكي (المظهر السابق)' },
    dark: {
      '--bg': '#061327', '--bg-grid': '#78b4ff09', '--panel': '#0c203ec7', '--panel-solid': '#0c203e', '--panel-hover': '#122e56b8',
      '--border': '#82beff2e', '--border-strong': '#82beff52', '--border-w': '1px', '--text': '#e8f1fb', '--muted': '#93aac4', '--label': '#a9bfd6',
      '--nav-text': '#a9bfd6', '--nav-title': '#7f97b2', '--accent': '#4fc3f7', '--accent-2': '#2196f3', '--on-accent': '#04121f',
      '--primary-1': '#2196f3', '--primary-2': '#1565c0', '--active-1': '#2196f359', '--active-2': '#2196f314', '--active-line': '#ffa726',
      '--accent-soft': '#4fc3f714', '--accent-line': '#4fc3f759', '--focus': '#4fc3f7', '--focus-w': '2px', '--focus-ring': '#4fc3f72e',
      '--danger': '#ef5350', '--warn': '#ffca28', '--ok': '#66bb6a', '--ok-text': '#a5d6a7', '--danger-text': '#ff8a80', '--warn-text': '#ffd54f',
      '--ok-soft': '#66bb6a26', '--ok-line': '#66bb6a66', '--danger-soft': '#ef53502e', '--danger-line': '#ef535099', '--warn-soft': '#ffca281f', '--warn-line': '#ffca2866',
      '--sidebar-bg': '#061328bd', '--topbar-bg': '#051022d1', '--modal-bg': '#0e2446', '--modal-border': '#82beff52', '--backdrop': '#0208149e',
      '--toast-bg': '#163a66', '--toast-text': '#e8f1fb', '--toast-line': '#82beff52', '--toast-err-bg': '#5a1b1b', '--toast-err-text': '#ffd7d6', '--toast-err-line': '#ef5350',
      '--badge-text': '#a9bfd6', '--badge-bg': '#ffffff1a', '--badge-line': '#82beff52', '--on-badge': '#ffffff',
      '--bar-track': '#ffffff14', '--scroll-thumb': '#82beff40', '--glow-1': '#4fc3f740', '--glow-2': '#ffa7261a',
      '--shadow-pop': '0 10px 30px #00000059', '--shadow-modal': '0 20px 60px #00000099', '--shadow-toast': '0 10px 30px #00000059'
    },
    light: {
      '--bg': '#eaf2fb', '--bg-grid': '#1565c00a', '--panel': '#ffffffe6', '--panel-solid': '#ffffff', '--panel-hover': '#f1f6fc',
      '--border': '#1565c024', '--border-strong': '#1565c052', '--border-w': '1px', '--text': '#0b1e3b', '--muted': '#4d6582', '--label': '#2c4566',
      '--nav-text': '#2c4566', '--nav-title': '#4d6582', '--accent': '#0d6fbf', '--accent-2': '#1565c0', '--on-accent': '#ffffff',
      '--primary-1': '#1976d2', '--primary-2': '#1565c0', '--active-1': '#1976d22e', '--active-2': '#1976d20f', '--active-line': '#ef8f00',
      '--accent-soft': '#0d6fbf14', '--accent-line': '#0d6fbf59', '--focus': '#0d6fbf', '--focus-w': '2px', '--focus-ring': '#0d6fbf24',
      '--danger': '#c62828', '--warn': '#b26a00', '--ok': '#2e7d32', '--ok-text': '#1b5e20', '--danger-text': '#b71c1c', '--warn-text': '#8a5100',
      '--ok-soft': '#2e7d321a', '--ok-line': '#2e7d3259', '--danger-soft': '#c628281a', '--danger-line': '#c6282859', '--warn-soft': '#b26a001a', '--warn-line': '#b26a0059',
      '--sidebar-bg': '#dde9f6e6', '--topbar-bg': '#f3f8fde6', '--modal-bg': '#ffffff', '--modal-border': '#1565c040', '--backdrop': '#0b1e3b59',
      '--toast-bg': '#0b1e3b', '--toast-text': '#ffffff', '--toast-line': '#0b1e3b', '--toast-err-bg': '#c62828', '--toast-err-text': '#ffffff', '--toast-err-line': '#c62828',
      '--badge-text': '#2c4566', '--badge-bg': '#1565c014', '--badge-line': '#1565c040', '--on-badge': '#ffffff',
      '--bar-track': '#1565c014', '--scroll-thumb': '#1565c040', '--glow-1': '#0000', '--glow-2': '#0000',
      '--shadow-pop': '0 6px 20px #0b1e3b1f', '--shadow-modal': '0 20px 60px #0b1e3b33', '--shadow-toast': '0 6px 20px #0b1e3b26'
    }
  });

  /* ---------- Kullanım sayacı: eski Kullanim.* çağrıları (sync.js, danisman.js) → FC.usage ---------- */
  var KIND = { okuma: 'firebase.read', yazma: 'firebase.write', silme: 'firebase.delete' };
  window.Kullanim = {
    say: function (tur, n) { if (KIND[tur]) FC.usage.count(KIND[tur], n == null ? 1 : n); },
    ekle: function (o) { o = o || {}; Object.keys(KIND).forEach(function (k) { if (o[k]) FC.usage.count(KIND[k], o[k]); }); },
    kotaDoldu: function (tur) { if (tur === 'bulut') FC.usage.count('firebase.full'); else { try { FC.usage.count('ai.' + (window.Danisman ? Danisman.ayar().saglayici : 'gemini') + '.full'); } catch (e) { } } },
    ozet: function () { var p = 'gemini'; try { p = Danisman.ayar().saglayici; } catch (e) { } return { bugun: { aiDoldu: FC.usage.get('ai.' + p + '.full') > 0 } }; },
    kart: function () { return FC.usage.card(usageOpts()); }
  };
  FC.usage.wrapFetch();   // AI sağlayıcılarına (fetch) yapılan çağrılar kendiliğinden sayılır
  function projectId() { try { var s = Store.local.sync; return s && s.config ? s.config.projectId || '' : ''; } catch (e) { return ''; } }
  function usageOpts() { return { firebase: true, ai: true, project: projectId }; }

  /* ---------- dil köprüsü: uygulama 5 kip (tr, en, ar, tr-ar, en-ar) ↔ çekirdek tr/en/ar ---------- */
  var bridging = false;
  function langChanged(mode) {
    var l = String(mode || 'tr').split('-')[0];
    if (FC.i18n.lang() !== l) { bridging = true; try { FC.i18n.set(l); } finally { bridging = false; } }
  }
  FC.i18n.onChange(function (l) {
    if (bridging || !window.UI || !window.Store || !Store.local) return;
    if (UI.lang() !== l) UI.setLang(l);
  });

  /* ---------- üst çubuk: bir kez kurulur, uygulama başlığı her yeniden çizildiğinde yerine takılır ---------- */
  var tb = null;
  function syncState() {
    var s = window.Sync ? Sync.state : 'off';
    return s === 'on' ? 'idle' : s === 'busy' || s === 'connecting' ? 'syncing' : s === 'error' ? 'error' : s === 'offline' ? 'offline' : 'off';
  }
  function lanState() { return window.Lan && Lan.state === 'on' ? (Lan.busy ? 'busy' : 'on') : 'off'; }
  function refresh() { if (tb) { tb.setSync(syncState(), window.Sync && Sync.dirty ? Sync.dirty.size : 0); tb.setLan(lanState()); } }
  function topbar(header) {
    if (!header) return;
    if (!tb) {
      tb = FC.topbar.mount(null, {
        before: [FC.announcements.button()], lang: false,
        sync: { state: syncState(), onClick: function () { UI.syncClick(); } },
        lan: { state: lanState(), onClick: function () { UI.go('settings', { anchor: 'lan' }); } }
      });
      if (window.Sync) Sync.onState(refresh);
      if (window.Lan && Lan.listeners) Lan.listeners.add(refresh);
      if (LEGACY) legacyTopbar();
    }
    header.appendChild(tb.el);
    // uygulamanın dil seçicisi (5 kip, iki dilli görünüm dahil) çekirdek dil düğmesinin yerinde: Tema'dan sonra, pencere düğmelerinden önce
    var ls = header.querySelector('.langsel'), sep = tb.el.querySelector('.topbar-sep');
    var old = tb.el.querySelector('.langsel'); if (old && old !== ls) old.remove();
    if (ls) tb.el.insertBefore(ls, sep && sep.parentNode === tb.el ? sep : null);
    refresh();
  }
  /* Eski kabukta pencere düğmeleri eski köprüyle çalışır (çekirdek onu tarayıcı sanar) */
  function legacyTopbar() { }
  if (LEGACY) {
    var d = window.desktop, h = FC.host;
    // Kabuk 2 (≤2.8 kurulumlar) küçült/orta IPC'si yok: tam ekrandan çıkınca pencere ortalanır ve Windows çerçevesi (gerçek küçült) görünür.
    // Bu yüzden dört düğme de her kabukta görünür (kullanıcı isteği: sağ üstte Küçült · Orta · Tam ekran · Kapat).
    h.can.minimize = true; h.can.fullscreen = true; h.can.close = true; h.can.half = true;
    var outOfFs = function () { return d.isFullscreen().then(function (v) { return v ? d.toggleFullscreen() : false; }); };
    h.window.minimize = function () { return d.minimize ? d.minimize() : outOfFs(); };
    h.window.half = function () { return d.toggleMaximize ? d.toggleMaximize() : outOfFs(); };
    h.window.toggleFullscreen = function () { return d.toggleFullscreen(); };
    h.window.close = function () { try { Store.persistNow(); } catch (e) { } setTimeout(function () { d.quit(); }, 150); return Promise.resolve(); };
    h.window.state = function () { return d.isFullscreen().then(function (v) { return { fullscreen: !!v }; }); };
    h.window.onState = function (cb) { d.onFullscreen(function (v) { cb({ fullscreen: !!v }); }); return function () { }; };
    h.openExternal = function (u) { return d.openUrl(u); };
    // Güncelle düğmesi eski kabukta kurulum köprüsünü açar
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.topbar .update-act'); if (b) { e.preventDefault(); e.stopPropagation(); bridge(); } }, true);
  }

  /* ---------- ayarlar ---------- */
  var OB = {
    store: false,
    onFirebase: function (cfg) { if (!cfg || !window.Store) return; Store.local.sync.config = cfg; Store.saveLocal(); UI.toast(tt('fcFbSaved')); },
    onAi: function (v) {
      if (!v || !v.key || !window.Danisman) return;
      var a = Danisman.ayar(); a.saglayici = Danisman.SAGLAYICI[v.provider] ? v.provider : 'gemini'; a.anahtar = v.key; a.model = '';
      try { localStorage.setItem('iha_danisman_ayar_v1', JSON.stringify(a)); } catch (e) { }
    }
  };
  function esc(s) { return UI.esc(s); }
  function archiveCard() {
    var c = document.createElement('div'); c.className = 'card'; c.id = 'arsiv';
    var st = Object.values(Store.db.students || {}).filter(function (s) { return s && s.deleted; });
    var pl = Object.values((Store.db.plans || {}).list || {}).filter(function (p) { return p && p.deleted; });
    var rows = st.map(function (s) { return '<li><span><b>' + esc(s.name || s.id) + '</b> <span class="muted sm">' + esc(tt('fcArchiveStudent')) + '</span></span><button class="btn sm" data-arsiv="s:' + esc(s.id) + '">' + esc(tt('fcArchiveRestore')) + '</button></li>'; })
      .concat(pl.map(function (p) { return '<li><span><b>' + esc(UI.tx(p.title) || p.name || p.id) + '</b> <span class="muted sm">' + esc(tt('fcArchivePlan')) + '</span></span><button class="btn sm" data-arsiv="p:' + esc(p.id) + '">' + esc(tt('fcArchiveRestore')) + '</button></li>'; }));
    c.innerHTML = '<h3>' + UI.icon('archive') + ' ' + esc(tt('fcArchiveTitle')) + '</h3><p class="muted sm">' + esc(tt('fcArchiveHelp')) + '</p>' +
      (rows.length ? '<ul class="arsivl">' + rows.join('') + '</ul>' : '<p class="ok sm">' + esc(tt('fcArchiveNone')) + '</p>');
    Array.prototype.forEach.call(c.querySelectorAll('[data-arsiv]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.arsiv, id = k.slice(2);
        if (k[0] === 's') { var s = Store.db.students[id]; if (s) { s.deleted = false; s.archived = true; s.updatedAt = Date.now(); Store.touch('student:' + id); } }
        else { var p = Store.db.plans.list[id]; if (p) { p.deleted = false; p.updatedAt = Date.now(); Store.touch('plans'); } }
        UI.toast(tt('fcArchiveRestored'));
      };
    });
    return c;
  }
  function settings(m) {
    var head = m.querySelector('.ph');
    var cards = Array.prototype.filter.call(m.children, function (c) { return c !== head; });
    var conflictIdx = cards.findIndex(function (c) { return c.id === 'cakisma'; });
    cards.splice(conflictIdx >= 0 ? conflictIdx + 1 : cards.length, 0, archiveCard());
    if (window.FCYZ && FCYZ.available()) { // çevrimdışı yapay zekâ kartı (OCR + çeviri paketleri)
      var yz = document.createElement('div'); yz.className = 'card'; yz.id = 'yerelZeka';
      yz.innerHTML = '<h3>' + UI.icon('cloud') + ' ' + esc(FCYZ.title({ lang: document.documentElement.lang })) + '</h3>';
      yz.appendChild(FCYZ.card({ lang: document.documentElement.lang, packs: ['llm', 'mt'] }));
      cards.splice(cards.indexOf(cards.find(function (c) { return c.id === 'arsiv'; })), 0, yz);
    }
    var g = FC.settings.build(m, { cards: cards, usage: usageOpts(), about: { version: VER }, onboarding: OB });
    g.el.classList.add('iha-settings');
    return g;
  }

  /* ---------- neler yeni: changelog.js ---------- */
  function notes(v) {
    var CL = window.CHANGELOG || [], e = null;
    CL.forEach(function (x) { if (!e && (x.v === v || x.v + '.0' === v)) e = x; });
    if (!e) return null;
    var o = {}; ['tr', 'en', 'ar'].forEach(function (l) { o[l] = (e[l] || e.tr || []).join('\n'); });
    return o;
  }

  /* ---------- güncelleme ---------- */
  var shownFor = null;
  function availableDialog(p) {
    if (!p || shownFor === p.version || LEGACY) return;
    if (document.querySelector('.modal-backdrop, .modal-wrap')) return setTimeout(function () { availableDialog(p); }, 900);
    shownFor = p.version;
    var body = ui.el('div');
    var txt = FC.i18n.pick(p.notes);
    if (txt) body.appendChild(ui.el('pre.notes', { text: txt, dir: 'auto', style: 'white-space:pre-wrap;font-family:inherit' }));
    if (p.size) body.appendChild(ui.el('p.muted.small', { text: FC.progress.mb(p.size) + (p.mode === 'patch' ? ' · ' + FC.t('fc.update.patchMode') : '') }));
    ui.modal({ title: FC.t('fc.update.avail', { v: p.version }), icon: 'download', body: body, buttons: [
      { label: FC.t('fc.cancel'), cls: 'ghost' }, 'spacer',
      { label: FC.t('fc.update'), icon: 'download', cls: 'primary', onClick: function () { try { Store.persistNow(); } catch (e) { } FC.updater.run().catch(function () { }); } }
    ] });
  }
  function startUpdater() {
    if (LEGACY) return;
    FC.updater.start({ repo: REPO, owner: OWNER, app: APP, version: VER, channel: 'win-app', setupChannel: 'win-setup', intervalHours: 500, firstDelayMs: 3000 });
    FC.updater.subscribe(function (st) { if (st.status === 'available' && st.plan) availableDialog(st.plan); });
  }

  /* ---------- eski kabuk köprüsü ---------- */
  function setupName() { return PREFIX + '-' + VER + '-win-setup.exe'; }
  function setupUrl() { return 'https://github.com/' + OWNER + '/' + REPO + '/releases/download/v' + VER + '/' + setupName(); }
  function releasesUrl() { return 'https://github.com/' + OWNER + '/' + REPO + '/releases/latest'; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  /** Eski kabuğun desktop.openFile'ı ile çalıştırılan betik: indir → SHA-256 → program kapanınca kurulumu aç */
  function bridgeCmd(url, sha, name) {
    var ps = [
      "$ErrorActionPreference='Stop'",
      "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12",
      "$dir=Join-Path $env:TEMP 'IHAMufredat'; New-Item -ItemType Directory -Force -Path $dir | Out-Null",
      "$log=Join-Path $dir 'kurulum.log'; function L($m){ try { Add-Content -LiteralPath $log -Value ((Get-Date -Format s)+' '+$m) } catch {} }",
      "$f=Join-Path $dir '" + name + "'",
      "try {",
      "  Write-Host 'IHA Mufredat Sistemi: kurulum indiriliyor / downloading installer...'",
      "  $ProgressPreference='SilentlyContinue'",
      "  Invoke-WebRequest -UseBasicParsing -Uri '" + url + "' -OutFile $f",
      "  $h=(Get-FileHash -Algorithm SHA256 -LiteralPath $f).Hash.ToLower()",
      "  if ($h -ne '" + sha + "') { throw ('SHA-256 uyusmuyor: ' + $h) }",
      "  for ($i = 0; $i -lt 120; $i++) { if (-not (Get-Process -Name 'IHA Mufredat Sistemi' -ErrorAction SilentlyContinue)) { break }; Start-Sleep -Milliseconds 250 }",
      "  Get-Process -Name 'IHA Mufredat Sistemi' -ErrorAction SilentlyContinue | Stop-Process -Force",
      "  Start-Sleep -Milliseconds 800",
      "  L 'kurulum aciliyor'; Start-Process -FilePath $f",
      "} catch {",
      "  L ('HATA ' + $_); Write-Host ('HATA: ' + $_); Start-Process '" + releasesUrl() + "'; Start-Sleep -Seconds 8",
      "}"
    ].join('\r\n');
    return ['@echo off', 'title IHA Mufredat Sistemi - yeni kurulum', 'echo IHA Mufredat Sistemi yeni surume geciyor, lutfen bekleyin...',
      "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$s=[IO.File]::ReadAllText('%~f0'); $i=$s.IndexOf('#'+'PS1#'); & ([scriptblock]::Create($s.Substring($i+5)))\"",
      'exit /b 0', '#PS1#', ps, ''].join('\r\n');
  }
  async function legacyInstall() {
    var d = window.desktop;
    var man = JSON.parse(await d.httpGet('https://github.com/' + OWNER + '/' + REPO + '/releases/latest/download/latest.json'));
    var a = man && man.assets && man.assets['win-setup'];
    if (!a || !/^[0-9a-f]{64}$/.test(a.sha256 || '') || !/^[\w.-]+\.exe$/.test(a.file || '')) throw new Error('latest.json');
    var url = 'https://github.com/' + OWNER + '/' + REPO + '/releases/download/v' + man.version + '/' + a.file;
    try { Store.persistNow(); } catch (e) { }
    var r = await d.openFile('IHA_yeni_kurulum.cmd', b64(bridgeCmd(url, a.sha256, a.file)));
    if (r !== true) throw new Error(String(r));
    setTimeout(function () { try { d.quit(); } catch (e) { } }, 1500);
  }
  function bridge() {
    if (document.querySelector('.iha-bridge')) return;
    var body = ui.el('div.iha-bridge');
    body.appendChild(ui.el('p', { text: tt('fcBridgeBody', { v: VER }) }));
    body.appendChild(ui.el('div.notice.ok', null, [ui.el('span', { html: ui.icon('check') }), ui.el('span', { text: tt('fcBridgeSafe') })]));
    body.appendChild(ui.el('p.muted', { text: tt('fcBridgeHow'), style: 'margin-top:12px' }));
    var m = ui.modal({ title: tt('fcBridgeTitle'), icon: 'download', body: body, buttons: [
      { label: tt('fcBridgeLater'), cls: 'ghost' }, 'spacer',
      { label: tt('fcBridgePage'), onClick: function () { window.desktop.openUrl(releasesUrl()); return false; } },
      { label: tt('fcBridgeInstall'), icon: 'download', cls: 'primary', onClick: function () {
        UI.toast(tt('fcBridgeGoing'));
        legacyInstall().catch(function (e) { console.error(e); window.desktop.openUrl(setupUrl()); });
      } }
    ] });
    return m;
  }

  /* ---------- başlangıç ---------- */
  function init() {
    var loc = Store.local || {};
    try {   // 3.3'ten geçiş: "neler yeni", ilk açılış rehberi
      if (FC.storage.get('whatsnew.seen', null) == null && loc.seenVer) FC.storage.set('whatsnew.seen', String(loc.seenVer));
      var used = loc.seenVer || (loc.sync && loc.sync.enabled) || Object.keys((Store.db && Store.db.students) || {}).length;
      if (FC.storage.get('onboarding.done', null) == null && used) FC.storage.set('onboarding.done', true);
      if (FC.storage.get('lang', null) == null) FC.storage.set('lang', String(loc.lang || 'tr').split('-')[0]);
    } catch (e) { }
    langChanged(loc.lang || 'tr');
    FC.init({
      app: APP, repo: REPO, version: VER, update: false, whatsnew: false, onboarding: false, announcements: true,
      agent: { ai: function () { try { var c = Danisman.ayar(); return c.anahtar && /^(gemini|openai|anthropic|groq)$/.test(c.saglayici) ? { provider: c.saglayici, key: c.anahtar, model: c.model || undefined } : null; } catch (e) { return null; } } }
    });
    startUpdater();
    if (LEGACY) document.documentElement.classList.add('iha-legacy-shell');
    // eski kabuk: "açıldı" onayı verilmezse eski ana süreç bir sonraki açılışta önceki arayüze döner (ota state.pending)
    if (LEGACY && window.desktop.ota && window.desktop.ota.bootOk) { try { window.desktop.ota.bootOk(); } catch (e) { } }
  }
  function started() {
    if (LEGACY) { setTimeout(bridge, 1200); return; }
    var wn = FC.whatsnew.start({ version: VER, notes: notes });
    if (!wn) setTimeout(function () { FC.onboarding.maybeStart(OB); }, 800);
  }

  window.Kabuk = { init: init, started: started, topbar: topbar, refresh: refresh, langChanged: langChanged, settings: settings, archiveCard: archiveCard,
    bridge: bridge, bridgeCmd: bridgeCmd, setupUrl: setupUrl, notes: notes, OB: OB, get legacy() { return LEGACY; } };
})();

/* v3.1: Sağ üst köşede masaüstü pencere düğmeleri — küçült · tam ekran ⇄ pencere · kapat.
   Arapçada da fiziksel olarak sağ üstte durur. Eski çekirdekte (2) küçültme yoktur: önce pencere kipine geçilir,
   çekirdek 3 geçişinden sonra doğrudan küçülür. */
(function () {
  const SV = { min: 'M6 19h12v2H6z', full: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z', win: 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z', x: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' };
  const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${SV[n]}"/></svg>`;
  let fsNow = true;

  function upd(el) {
    const b = el.querySelector('[data-w="max"]'); if (!b) return;
    b.innerHTML = ic(fsNow ? 'win' : 'full'); b.title = fsNow ? t('windowed') : t('fullscreen');
  }
  function mount(el) {
    if (!el) return;
    if (Platform.kind !== 'desktop') { el.remove(); return; }
    el.innerHTML = `<button class="wb" data-w="min" title="${t('winMin')}">${ic('min')}</button><button class="wb" data-w="max">${ic('win')}</button><button class="wb wx" data-w="close" title="${t('winClose')}">${ic('x')}</button>`;
    el.querySelector('[data-w="min"]').onclick = async () => {
      if (Platform.minimize) { Platform.minimize(); return; }
      if (await Platform.isFullscreen()) { fsNow = await Platform.toggleFullscreen(); upd(el); }
      UI.toast(t('winMinOld'));
    };
    el.querySelector('[data-w="max"]').onclick = async () => { fsNow = await Platform.toggleFullscreen(); upd(el); };
    el.querySelector('[data-w="close"]').onclick = () => { try { Store.persistNow(); } catch (e) {} setTimeout(() => Platform.quit(), 150); };
    Platform.isFullscreen().then((v) => { fsNow = !!v; upd(el); }).catch(() => {});
    if (!mount.hooked) { mount.hooked = true; Platform.onFullscreen((v) => { fsNow = !!v; const w = document.getElementById('winctl'); if (w) upd(w); }); }
    upd(el);
  }
  window.WinCtl = { mount };
})();

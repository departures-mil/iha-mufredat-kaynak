/* v3.1: Program çekirdeğinin (kabuk) uygulama içinden güncellenmesi.
   - Çekirdek 3 ve sonrası: yeni çekirdek dosyaları doğrudan yazılır (eskiler .prev olarak saklanır), program yeniden açılır.
     Yeni çekirdek açılamazsa boot.js kendiliğinden eskisine döner.
   - Çekirdek 2 (eski kurulum): tek seferlik geçiş. Küçük bir geçiş betiği programın kapanmasını bekler, çekirdeği yedekleyip
     yenisini koyar ve programı yeniden açar. Bir sorun olursa yedekten geri yükler. Kayıtlara dokunulmaz.
   Kullanıcıdan hiçbir şey istenmez: açılıştan kısa süre sonra bilgilendirme çıkar ve geri sayımla kendiliğinden yapılır. */
(function () {
  const K = window.KABUK_PAKET;
  const d = window.desktop;
  const KG = { state: 'none', need: false, shell: 0, info: null };
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

  function bridgeCmd() {
    const payload = b64(JSON.stringify({ version: K.version, hash: K.hash, files: K.files }));
    const ps = [
      "$ErrorActionPreference='Stop'",
      "$P='" + payload + "'",
      "$name='IHA Mufredat Sistemi'",
      "$dir=Join-Path $env:TEMP 'IHAMufredat'; New-Item -ItemType Directory -Force -Path $dir | Out-Null",
      "$log=Join-Path $dir 'cekirdek3.log'",
      "function L($m){ try { Add-Content -LiteralPath $log -Value ((Get-Date -Format s)+' '+$m) } catch {} }",
      "$exe=$null; $app=$null; $bk=$null",
      "try {",
      "  $p = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path -like '*IHA*' -and (Test-Path -LiteralPath (Join-Path (Split-Path $_.Path) 'resources\\app\\main.js')) } | Select-Object -First 1",
      "  if ($p) { $exe = $p.Path; $name = $p.ProcessName } else { $exe = Join-Path $env:LOCALAPPDATA ('Programs\\' + $name + '\\' + $name + '.exe') }",
      "  if (-not (Test-Path -LiteralPath $exe)) { $c = Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'Programs') -Recurse -Depth 1 -Filter '*.exe' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike 'Uninstall*' -and (Test-Path -LiteralPath (Join-Path $_.DirectoryName 'resources\\app\\ui\\js\\store.js')) } | Select-Object -First 1; if ($c) { $exe = $c.FullName; $name = $c.BaseName } }",
      "  $app = Join-Path (Split-Path $exe) 'resources\\app'",
      "  if (-not (Test-Path -LiteralPath (Join-Path $app 'main.js'))) { throw ('program klasoru bulunamadi: ' + $app) }",
      "  for ($i = 0; $i -lt 80; $i++) { if (-not (Get-Process -Name $name -ErrorAction SilentlyContinue)) { break }; Start-Sleep -Milliseconds 250 }",
      "  Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force",
      "  Start-Sleep -Milliseconds 700",
      "  $bk = Join-Path $app '_cekirdek2_yedek'; New-Item -ItemType Directory -Force -Path $bk | Out-Null",
      "  foreach ($f in 'main.js','preload.js','package.json') { $src = Join-Path $app $f; if (Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $bk $f) -Force; Copy-Item -LiteralPath $src -Destination ($src + '.prev') -Force } }",
      "  $J = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($P)) | ConvertFrom-Json",
      "  foreach ($pr in $J.files.PSObject.Properties) { [IO.File]::WriteAllBytes((Join-Path $app ($pr.Name + '.new')), [Convert]::FromBase64String($pr.Value)) }",
      "  foreach ($pr in $J.files.PSObject.Properties) { Move-Item -LiteralPath (Join-Path $app ($pr.Name + '.new')) -Destination (Join-Path $app $pr.Name) -Force }",
      "  $st = '{\"version\":\"' + $J.version + '\",\"hash\":\"' + $J.hash + '\",\"files\":[\"main.js\",\"preload.js\",\"lan.js\"],\"pending\":true,\"tries\":0,\"from\":\"cekirdek2\"}'",
      "  [IO.File]::WriteAllText((Join-Path $app 'kabuk-durum.json'), $st)",
      "  L ('tamam ' + $app)",
      "} catch {",
      "  L ('HATA ' + $_)",
      "  try { if ($bk -and $app) { foreach ($f in 'main.js','preload.js','package.json') { $b = Join-Path $bk $f; if (Test-Path -LiteralPath $b) { Copy-Item -LiteralPath $b -Destination (Join-Path $app $f) -Force } } } } catch { L ('geri alma ' + $_) }",
      "}",
      "if ($exe -and (Test-Path -LiteralPath $exe)) { Start-Process -FilePath $exe }",
    ].join('\r\n');
    const cmd = [
      '@echo off',
      'title IHA Mufredat Sistemi - cekirdek guncellemesi',
      'echo IHA Mufredat Sistemi guncelleniyor, lutfen bekleyin...',
      "start \"\" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -Command \"$s=[IO.File]::ReadAllText('%~f0'); $i=$s.IndexOf('#'+'PS1#'); & ([scriptblock]::Create($s.Substring($i+5)))\"",
      'exit /b 0',
      '#PS1#',
      ps,
      '',
    ].join('\r\n');
    return cmd;
  }

  async function check() {
    if (!K || Platform.kind !== 'desktop' || !Platform.ota) return;
    try { KG.info = await Platform.ota.info(); } catch (e) { return; }
    KG.shell = KG.info.shell || 2;
    if (KG.shell >= 3 && d.kabuk) {
      let st = {}; try { st = await d.kabuk.ok(); } catch (e) {}
      KG.kstate = st;
      if (st.rolledBack && st.rolledBack === K.version) { KG.state = 'rolledBack'; return; }
      KG.need = (st.hash || '') !== K.hash;
    } else KG.need = KG.shell < 3;
    if (!KG.need) { KG.state = 'ok'; return; }
    const tr = Store.local.kabukTry || {};
    if (tr.v === K.version && (tr.n || 0) >= 2) { KG.state = 'failed'; return; } // iki denemede olmadı: elle düğmeye kalır
    KG.state = 'ready';
    setTimeout(() => prompt(true), 6000);
  }

  async function apply() {
    Store.local.kabukTry = { v: K.version, n: ((Store.local.kabukTry || {}).v === K.version ? (Store.local.kabukTry.n || 0) : 0) + 1, t: Date.now() };
    Store.saveLocal(); Store.persistNow();
    await new Promise((r) => setTimeout(r, 700));
    if (KG.shell >= 3 && d.kabuk) {
      const f = {}; ['main.js', 'preload.js', 'lan.js'].forEach((n) => (f[n] = K.files[n]));
      await d.kabuk.apply(K.version, f, K.hash);
      Platform.ota.restart();
      return;
    }
    const r = await d.openFile('IHA_cekirdek_' + K.version.replace(/\./g, '_') + '.cmd', b64(bridgeCmd()));
    if (r !== true) throw new Error(String(r));
    setTimeout(() => { try { d.quit(); } catch (e) {} }, 1200);
  }

  function prompt(auto) {
    const { modal, toast, icon } = UI;
    if (document.getElementById('kgBox')) return;
    let n = 15;
    const mm = modal(icon('bolt') + ' ' + t('kgTitle'), `<div id="kgBox"><p>${t('kgBody')}</p><ul class="kgl"><li>${t('kgF1')}</li><li>${t('kgF2')}</li><li>${t('kgF3')}</li></ul><p class="muted sm">${t('kgSafe')}</p>${auto ? `<p class="kgcd"><b id="kgN">${n}</b> ${t('kgCount')}</p>` : ''}</div>`,
      { okText: t('kgNow'), cls: 'small', onOk: async () => { clearInterval(tm); try { await apply(); } catch (e) { console.error(e); toast(t('kgErr') + ': ' + e.message, 'err'); return false; } toast(t('kgGoing')); }, onClose: () => clearInterval(tm) });
    const tm = auto ? setInterval(() => { n--; const el = document.getElementById('kgN'); if (el) el.textContent = n; if (n <= 0) { clearInterval(tm); const ok = mm.el.querySelector('.mok'); if (ok) ok.click(); } }, 1000) : null;
  }

  function cardHtml() {
    if (!K || Platform.kind !== 'desktop') return '';
    const s = KG.state;
    const st = s === 'ok' ? `<span class="ok">${t('kgOk', { v: KG.shell })}</span>` : s === 'rolledBack' ? `<span class="err">${t('kgRolled')}</span>` : s === 'failed' ? `<span class="err">${t('kgFailed')}</span>` : s === 'ready' ? `<b>${t('kgReady')}</b>` : '';
    return `<p class="muted sm">${t('kgLabel')}: ${KG.shell || '—'} ${st}</p>${s !== 'ok' && KG.need ? `<button class="btn sm" id="kgBtn">${UI.icon('bolt')} ${t('kgNow')}</button>` : ''}`;
  }
  function wire(m) { const b = m.querySelector('#kgBtn'); if (b) b.onclick = () => prompt(false); }

  Object.assign(KG, { check, apply, prompt, cardHtml, wire, bridgeCmd });
  window.KabukGec = KG;
})();

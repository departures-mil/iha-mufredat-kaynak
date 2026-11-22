/* v3.1: Çakışmasız eşitleme — üç yönlü birleştirme (ortak ata + bu cihaz + öbür cihaz)
   Eskiden aynı kayıt iki cihazda değişirse "son yazan kazanır" kuralıyla biri sessizce kayboluyordu.
   Şimdi her kaydın en son eşitlenmiş hâli (ortak ata) bu cihazda saklanır; iki taraftaki değişiklikler alan alan birleştirilir:
   - yalnız bir tarafta değişen alan → o değişiklik alınır,
   - iki tarafta aynı alan farklı değiştiyse → daha yeni kayıt kazanır, öbür değer "Çakışma kayıtları"na yazılır (tek tıkla geri alınabilir),
   - bir tarafta silinen, öbür tarafta değiştirilen öğe → veri kaybolmasın diye korunur.
   Listeler (uçuş günlüğü, günlük, seviyeler, modüller…) öğe kimliğine (id) göre, kimliksizler içeriğe göre birleştirilir.
   Ortak atalar ve çakışma kayıtları IndexedDB'de durur (eşitlenmez, kayıtlar dosyasına karışmaz). */
(function () {
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return v === undefined ? 'null' : JSON.stringify(v);
  }
  const eq = (a, b) => a === b || stable(a) === stable(b);
  const strip = (o) => { if (!isObj(o)) return o; const c = Object.assign({}, o); delete c.updatedAt; return c; };
  const ekey = (el) => (isObj(el) && el.id != null ? 'id:' + el.id : 'v:' + stable(el));

  function merge3(base, mine, theirs, ctx, path) {
    if (eq(mine, theirs)) return mine;
    if (eq(base, mine)) return theirs;
    if (eq(base, theirs)) return mine;
    if (isObj(mine) && isObj(theirs)) {
      const out = {}; const b = isObj(base) ? base : {};
      const keys = new Set([...Object.keys(mine), ...Object.keys(theirs)]);
      for (const k of keys) {
        if (k === 'updatedAt' && path.length === 0) continue;
        const r = merge3(b[k], mine[k], theirs[k], ctx, path.concat(k));
        if (r !== undefined) out[k] = r;
      }
      return out;
    }
    if (Array.isArray(mine) && Array.isArray(theirs)) return mergeArr(Array.isArray(base) ? base : [], mine, theirs, ctx, path);
    // yaprak çakışması
    if (mine === undefined) return theirs; // bir tarafta silinmiş, öbüründe değişmiş: veri korunur
    if (theirs === undefined) return mine;
    const keep = ctx.mineNewer ? mine : theirs; const lost = ctx.mineNewer ? theirs : mine;
    ctx.conflicts.push({ path, kept: keep, lost });
    return keep;
  }
  function mergeArr(base, mine, theirs, ctx, path) {
    const B = new Map(base.map((e) => [ekey(e), e])); const M = new Map(mine.map((e) => [ekey(e), e])); const T = new Map(theirs.map((e) => [ekey(e), e]));
    const out = []; const seen = new Set();
    const take = (k) => {
      if (seen.has(k)) return; seen.add(k);
      const inB = B.has(k), inM = M.has(k), inT = T.has(k);
      if (inM && inT) { const r = merge3(B.get(k), M.get(k), T.get(k), ctx, path.concat('#' + k)); if (r !== undefined) out.push(r); }
      else if (inM) { if (!inB || !eq(B.get(k), M.get(k))) out.push(M.get(k)); }   // öbür tarafta silinmiş ve burada değişmemişse silinir
      else if (inT) { if (!inB || !eq(B.get(k), T.get(k))) out.push(T.get(k)); }
    };
    // sıra: bu cihazın sırası, öbür taraftaki yeni öğeler kendi komşularının yanına
    mine.forEach((e) => take(ekey(e)));
    theirs.forEach((e, i) => { const k = ekey(e); if (seen.has(k)) return; const before = out.length; take(k); if (out.length > before && i > 0) { const prevK = ekey(theirs[i - 1]); const at = out.findIndex((x) => ekey(x) === prevK); if (at >= 0 && at < out.length - 2) out.splice(at + 1, 0, out.pop()); } });
    return out;
  }

  /* Bir kaydı birleştirir. Dönen kayıt her iki taraftan da yenidir (updatedAt), böylece iki yana da yazılır. */
  function record(base, local, remote) {
    const ctx = { conflicts: [], mineNewer: (local.updatedAt || 0) >= (remote.updatedAt || 0) };
    const out = merge3(strip(base), strip(local), strip(remote), ctx, []);
    out.updatedAt = Math.max(Date.now(), (local.updatedAt || 0) + 1, (remote.updatedAt || 0) + 1);
    return { merged: out, conflicts: ctx.conflicts };
  }

  /* ---------- kayıt erişimi (Store.touch anahtarlarıyla aynı) ---------- */
  function getRec(key) {
    const d = Store.db;
    if (key.startsWith('student:')) return d.students[key.slice(8)];
    if (key === 'plans') return d.plans; if (key === 'config') return d.config; if (key === 'curriculum') return d.curriculum;
    if (key.startsWith('curriculum_')) return (d.curricula || {})[key.slice(11)];
    return undefined;
  }
  function setRec(key, obj) {
    const d = Store.db;
    if (key.startsWith('student:')) { d.students[key.slice(8)] = obj; return; }
    if (key === 'plans') { obj.list = obj.list || {}; d.plans = obj; return; }
    if (key === 'config') { d.config = obj; return; } if (key === 'curriculum') { d.curriculum = obj; return; }
    if (key.startsWith('curriculum_')) { d.curricula = d.curricula || {}; d.curricula[key.slice(11)] = obj; }
  }
  function allKeys() {
    const d = Store.db; return ['curriculum', 'config', 'plans'].concat(Object.keys(d.curricula || {}).map((p) => 'curriculum_' + p), Object.keys(d.students || {}).map((id) => 'student:' + id));
  }
  function label(key, rec) {
    if (key.startsWith('student:')) return (rec && rec.name) || key.slice(8);
    return key;
  }

  /* ---------- ortak atalar + çakışma kayıtları (IndexedDB) ---------- */
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('idb'));
      const r = indexedDB.open('iha-esitleme', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('base')) d.createObjectStore('base'); if (!d.objectStoreNames.contains('log')) d.createObjectStore('log', { autoIncrement: true }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = async (store, mode, fn) => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); let out; Promise.resolve(fn(s)).then((v) => (out = v)); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const bases = new Map(); // "ns|anahtar" → JSON metni (bellekte de tutulur: anlık erişim)
  let loaded = null;
  function loadAll() {
    if (loaded) return loaded;
    loaded = tx('base', 'readonly', (s) => new Promise((res) => { const c = s.openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { bases.set(cur.key, cur.value); cur.continue(); } else res(); }; c.onerror = () => res(); })).catch((e) => console.warn('merge base', e));
    return loaded;
  }
  function getBase(ns, key) { const v = bases.get(ns + '|' + key); if (!v) return null; try { return JSON.parse(v); } catch (e) { return null; } }
  let pend = new Map(); let ptimer = null;
  function setBase(ns, key, obj) {
    const k = ns + '|' + key; const v = typeof obj === 'string' ? obj : JSON.stringify(obj);
    bases.set(k, v); pend.set(k, v);
    clearTimeout(ptimer); ptimer = setTimeout(flush, 400);
  }
  function flush() { const p = pend; pend = new Map(); if (!p.size) return; tx('base', 'readwrite', (s) => { p.forEach((v, k) => s.put(v, k)); }).catch((e) => console.warn('merge base yaz', e)); }

  const listeners = new Set();
  async function logConflicts(key, rec, list, src) {
    if (!list.length) return;
    const t = Date.now();
    try { await tx('log', 'readwrite', (s) => { list.slice(0, 50).forEach((c) => s.add({ t, key, name: label(key, rec), src, path: c.path, kept: c.kept, lost: c.lost })); }); } catch (e) { console.warn(e); }
    try { const all = await conflicts(); if (all.length > 300) await tx('log', 'readwrite', (s) => all.slice(300).forEach((x) => s.delete(x.id))); } catch (e) {}
    listeners.forEach((f) => { try { f(); } catch (e) {} });
  }
  async function conflicts() {
    try { return await tx('log', 'readonly', (s) => new Promise((res) => { const out = []; const c = s.openCursor(null, 'prev'); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(Object.assign({ id: cur.key }, cur.value)); cur.continue(); } else res(out); }; c.onerror = () => res(out); })); } catch (e) { return []; }
  }
  async function clearConflicts() { try { await tx('log', 'readwrite', (s) => s.clear()); } catch (e) {} listeners.forEach((f) => f()); }
  async function removeConflict(id) { try { await tx('log', 'readwrite', (s) => s.delete(id)); } catch (e) {} listeners.forEach((f) => f()); }

  /* Çakışma kaydındaki kaybedilen değeri kayda geri yazar */
  function restoreConflict(c) {
    const P = c.path || [];
    if (!P.length) { if (!isObj(c.lost)) return false; Store.backupSnapshot && Store.backupSnapshot('cakisma'); setRec(c.key, JSON.parse(JSON.stringify(c.lost))); Store.touch(c.key); return true; } // bütün kayıt
    const rec = getRec(c.key); if (!rec) return false;
    let o = rec;
    for (let i = 0; i < P.length - 1; i++) {
      const seg = P[i];
      if (seg[0] === '#' && Array.isArray(o)) { const k = seg.slice(1); const nx = o.find((e) => ekey(e) === k); if (!nx) return false; o = nx; }
      else { if (o[seg] == null || typeof o[seg] !== 'object') o[seg] = {}; o = o[seg]; }
    }
    const last = P[P.length - 1]; if (last == null || last[0] === '#') return false;
    o[last] = c.lost;
    Store.touch(c.key);
    return true;
  }

  window.Merge = { merge3, record, stable, eq, getRec, setRec, allKeys, loadAll, getBase, setBase, logConflicts, conflicts, clearConflicts, removeConflict, restoreConflict, onLog: (f) => listeners.add(f), flush };
})();

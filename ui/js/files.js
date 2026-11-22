/* Konu kaynakları: belgeler (dosya) ve video/web linkleri
   - Bilgi (ad, tür, boyut, link) müfredat içinde node.res dizisinde tutulur → müfredatla birlikte eşitlenir.
   - Dosya içeriği cihazda IndexedDB'de saklanır; Firebase açıksa Firestore'a parçalar hâlinde yüklenir ve diğer cihaz açarken indirir. */
(function () {
  const DBN = 'iha_mufredat_files', ST = 'files';
  const CHUNK = 600 * 1024, MAX = 25 * 1024 * 1024;
  const open = () => new Promise((res, rej) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(ST, mode); const req = fn(t.objectStore(ST)); t.oncomplete = () => res(req && 'result' in req ? req.result : undefined); t.onerror = () => rej(t.error); }); };
  const b64 = async (blob) => { const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

  const F = {
    MAX,
    async putBlob(id, blob, name, mime) { await tx('readwrite', (st) => st.put({ id, blob, name, mime })); },
    async getLocal(id) { try { return await tx('readonly', (st) => st.get(id)); } catch (e) { return null; } },
    async removeLocal(id) { try { await tx('readwrite', (st) => st.delete(id)); } catch (e) {} },

    /* Firestore'a yükle (senkron açıksa) */
    async upload(id, blob, meta) {
      if (!window.Sync || !Sync.fs || !Sync.user) return false;
      const data = await b64(blob); const n = Math.ceil(data.length / (CHUNK * 4 / 3)) || 1; const size = Math.ceil(data.length / n);
      for (let i = 0; i < n; i++) await FB.setDoc(Sync.ref('files', id, 'chunks', String(i)), { d: data.slice(i * size, (i + 1) * size) });
      await FB.setDoc(Sync.ref('files', id), { name: meta.name, mime: meta.mime || '', size: blob.size, chunks: n, updatedAt: Date.now() });
      return true;
    },
    async download(id) {
      if (!window.Sync || !Sync.fs || !Sync.user) return null;
      const m = await FB.getDoc(Sync.ref('files', id)); if (!m.exists()) return null;
      const meta = m.data(); let s = '';
      for (let i = 0; i < meta.chunks; i++) { const c = await FB.getDoc(Sync.ref('files', id, 'chunks', String(i))); s += c.data().d; }
      const blob = new Blob([unb64(s)], { type: meta.mime || 'application/octet-stream' });
      await this.putBlob(id, blob, meta.name, meta.mime);
      return { blob, name: meta.name, mime: meta.mime };
    },
    async get(id) { const l = await this.getLocal(id); if (l) return l; return this.download(id); },
    /* Bekleyen (yüklenmemiş) dosyaları gönder */
    async pushPending() {
      if (!window.Sync || !Sync.fs || !Sync.user) return;
      const pend = Store.local.pendingFiles || [];
      for (const id of [...pend]) { const l = await this.getLocal(id); if (l) { try { await this.upload(id, l.blob, l); } catch (e) { console.error(e); continue; } } Store.local.pendingFiles = (Store.local.pendingFiles || []).filter((x) => x !== id); Store.saveLocal(); }
    },

    /* node: seviye, modül ya da madde nesnesi */
    async addFiles(node, fileList) {
      node.res = node.res || [];
      const added = [];
      for (const f of fileList) {
        if (f.size > MAX) { toast(f.name + ': > 25 MB', 'err'); continue; }
        const id = Store.uid('f');
        await this.putBlob(id, f, f.name, f.type);
        node.res.push({ id, kind: 'file', name: f.name, mime: f.type || '', size: f.size, addedAt: Date.now() });
        added.push(id);
      }
      Store.touch('curriculum');
      if (added.length) { Store.local.pendingFiles = (Store.local.pendingFiles || []).concat(added); Store.saveLocal(); this.pushPending(); }
    },
    addLink(node, title, url) {
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      node.res = node.res || [];
      node.res.push({ id: Store.uid('k'), kind: 'link', name: title || url, url, addedAt: Date.now() });
      Store.touch('curriculum');
    },
    remove(node, id) {
      node.res = (node.res || []).filter((r) => r.id !== id);
      Store.touch('curriculum'); this.removeLocal(id);
      if (window.Sync && Sync.fs && Sync.user) { FB.setDoc(Sync.ref('files', id), { deleted: true, updatedAt: Date.now() }).catch(() => {}); }
    },
    videoThumb(url) { const m = String(url).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m ? 'https://i.ytimg.com/vi/' + m[1] + '/mqdefault.jpg' : ''; },
    isVideo(url) { return /youtu\.?be|vimeo|dailymotion|video|\.mp4/i.test(url); },
    async openLink(url) { if (Platform.openUrl) return Platform.openUrl(url); window.open(url, '_blank'); },
    async openFile(res) {
      const f = await this.get(res.id);
      if (!f) { toast(t('fileMissing'), 'err'); return; }
      if (Platform.openFile) return Platform.openFile(res.name, await b64(f.blob), res.mime || f.mime || '');
      const a = document.createElement('a'); a.href = URL.createObjectURL(f.blob); a.target = '_blank'; a.download = res.name; a.click();
    },
    async saveFileAs(res) { const f = await this.get(res.id); if (!f) { toast(t('fileMissing'), 'err'); return; } await Platform.saveFile(res.name, f.blob, res.mime); toast(t('fileSaved')); },
    count(node) { return (node.res || []).length; },
  };
  window.Files = F;
})();

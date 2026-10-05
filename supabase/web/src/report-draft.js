// Account-scoped device drafts. Photos live in IndexedDB, never localStorage.
export class ReportDraftStore {
  constructor(scope) {
    this.key = scope ? `mangrooves.report-draft.v1:${scope}` : null;
    this.photo = null; this.photoKey = null; this.pending = Promise.resolve();
  }
  async database() {
    if (!globalThis.indexedDB) throw new Error('Photo draft storage is unavailable in this browser.');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('mangrooves-report-drafts', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async photoRecord(key, photo, remove = false) {
    if (photo) {
      const bytes = typeof photo.arrayBuffer === 'function' ? await photo.arrayBuffer() : await new Promise((resolve, reject) => {
        const reader = new window.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(photo);
      });
      photo = {bytes, type: photo.type};
    }
    const db = await this.database();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('photos', photo || remove ? 'readwrite' : 'readonly');
        const store = tx.objectStore('photos');
        const request = remove ? store.delete(key) : photo ? store.put(photo, key) : store.get(key);
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not save the photo draft.'));
      });
    } finally { db.close(); }
  }
  async load() {
    if (!this.key) return null;
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.version !== 1 || !value.fields || !value.observations) throw new Error('This saved draft could not be read.');
    this.photoKey = value.photoKey;
    let missingPhoto = false;
    if (this.photoKey) {
      try {
        const photo = await this.photoRecord(this.photoKey);
        if (photo) this.photo = new File([photo.bytes], value.photoName || 'field.jpg', {type: photo.type});
        else missingPhoto = true;
      } catch { missingPhoto = true; }
    }
    return {...value, photo: this.photo, missingPhoto};
  }
  save(draft) {
    if (!this.key) return Promise.resolve();
    if (draft.photo && draft.photo !== this.photo) {
      const oldKey = this.photoKey;
      this.photo = draft.photo; this.photoKey = `${this.key}:${crypto.randomUUID()}`;
      const key = this.photoKey, photo = this.photo;
      this.pending = this.pending.catch(() => {}).then(async () => {
        try { await this.photoRecord(key, photo); }
        catch (error) { if (this.photoKey === key) this.photo = null; throw error; }
        if (oldKey) await this.photoRecord(oldKey, null, true).catch(() => {});
      });
    }
    window.localStorage.setItem(this.key, JSON.stringify({version: 1, fields: draft.fields,
      observations: draft.observations, step: draft.step, followup: draft.followup,
      checklistVersions: draft.checklistVersions, photoKey: this.photoKey,
      photoName: draft.photo?.name, savedAt: Date.now()}));
    return this.pending;
  }
  async clear() {
    if (!this.key) return;
    window.localStorage.removeItem(this.key);
    await this.pending.catch(() => {});
    if (this.photoKey) await this.photoRecord(this.photoKey, null, true).catch(() => {});
    this.photo = null; this.photoKey = null;
  }
}

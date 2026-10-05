import { AppError } from './domain.js';

export class Store {
  constructor(db) { this.db = db; }
  ref(collection, id) { return this.db.collection(collection).doc(String(id)); }
  async get(collection, id) { const snap = await this.ref(collection, id).get(); return snap.exists ? snap.data() : null; }
  async rows(collection, filters = []) {
    let query = this.db.collection(collection);
    for (const [field, op, value] of filters) query = query.where(field, op, value);
    // Paginate reads instead of silently truncating analytics/history.
    const result = [];
    let cursor;
    do {
      const snapshot = await (cursor ? query.startAfter(cursor) : query).limit(500).get();
      result.push(...snapshot.docs.map(d => d.data()));
      cursor = snapshot.size === 500 ? snapshot.docs.at(-1) : null;
    } while (cursor);
    return result;
  }
  async transactionRows(tx, collection, filters = []) {
    let query = this.db.collection(collection);
    for (const [field, op, value] of filters) query = query.where(field, op, value);
    const rows = []; let cursor;
    do {
      const snapshot = await tx.get((cursor ? query.startAfter(cursor) : query).limit(500));
      rows.push(...snapshot.docs.map(d => d.data()));
      cursor = snapshot.size === 500 ? snapshot.docs.at(-1) : null;
    } while (cursor);
    return rows;
  }
  async ids(count = 1) {
    return this.db.runTransaction(async tx => {
      const ref = this.ref('meta', 'sequence'), snap = await tx.get(ref);
      const first = Math.max(1000, snap.data()?.next ?? 1000);
      if (!Number.isSafeInteger(first + count)) throw new AppError('Identifier limit reached.', 503);
      tx.set(ref, {next: first + count});
      return Array.from({length: count}, (_, i) => first + i);
    });
  }
}

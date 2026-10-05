// A small adapter for the existing transaction-oriented service contract.
// PostgreSQL performs the atomic revision check and commit; this is NOT a
// sequence of independent REST writes masquerading as a transaction.
class Snapshot {
  constructor(ref, record) { this.ref=ref; this.id=ref.id; this.exists=!!record; this.record=record; }
  data() { return this.record ? structuredClone(this.record.data) : undefined; }
}
class Reference {
  constructor(db, collection, id) { this.db=db; this.collection=collection; this.id=String(id); }
  async get() { return this.db.read(this); }
  async set(data, options) { return this.db.batch().set(this,data,options).commit(); }
  async update(data) { return this.db.batch().update(this,data).commit(); }
  async delete() { return this.db.batch().delete(this).commit(); }
}
class Query {
  constructor(db, collection, filter={}, after='', size=500) { Object.assign(this,{db,collection,filter,after,size}); }
  doc(id) { return new Reference(this.db,this.collection,id); }
  where(field,op,value) {
    if(op!=='==' || !/^[a-z_]+$/.test(field)) throw new Error('Unsupported query');
    return new Query(this.db,this.collection,{...this.filter,[field]:value},this.after,this.size);
  }
  limit(size) { return new Query(this.db,this.collection,this.filter,this.after,size); }
  startAfter(snap) { return new Query(this.db,this.collection,this.filter,snap.id,this.size); }
  get() { return this.db.read(this); }
}
class Transaction {
  constructor(db) { this.db=db; this.expected=new Map(); this.writes=[]; }
  async get(ref) { return this.db.read(ref,this); }
  expect(collection,id,revision) {
    const key=JSON.stringify([collection,id]);
    if(this.expected.has(key) && this.expected.get(key).revision!==revision) throw Object.assign(new Error('Read changed'),{code:'40001'});
    this.expected.set(key,{collection,id,revision});
  }
  write(ref,data,mode) { this.writes.push({collection:ref.collection,id:ref.id,data,mode}); return this; }
  set(ref,data,options) { return this.write(ref,data,options?.merge?'merge':'set'); }
  update(ref,data) { return this.write(ref,data,'update'); }
  create(ref,data) { return this.write(ref,data,'create'); }
  delete(ref) { return this.write(ref,{},'delete'); }
  async commit() { await this.db.rpc('app_commit',{p_expected:[...this.expected.values()],p_writes:this.writes}); }
}
export class Database {
  constructor(client) { this.client=client; }
  async rpc(name,args) { const {data,error}=await this.client.rpc(name,args); if(error) throw error; return data; }
  collection(name) { return new Query(this,name); }
  batch() { return new Transaction(this); }
  async read(ref,tx) {
    const query=ref instanceof Query;
    const result=await this.rpc('app_read',{p_collection:ref.collection,p_id:query?null:ref.id,
      p_filter:query?ref.filter:{},p_after:query?ref.after:'',p_limit:query?ref.size:1});
    if(!query) {
      const record=result.documents[0]; tx?.expect(ref.collection,ref.id,record?.revision??0);
      return new Snapshot(ref,record);
    }
    tx?.expect(ref.collection,null,result.revision);
    const docs=result.documents.map(r=>new Snapshot(new Reference(this,ref.collection,r.document_id),r));
    return {docs,size:docs.length,empty:!docs.length};
  }
  async runTransaction(callback) {
    for(let attempt=0;attempt<8;attempt++) {
      try { const tx=new Transaction(this); const result=await callback(tx); await tx.commit(); return result; }
      catch(error) { if(error.code!=='40001'||attempt===7) throw error; await new Promise(r=>setTimeout(r,10*(attempt+1))); }
    }
  }
}

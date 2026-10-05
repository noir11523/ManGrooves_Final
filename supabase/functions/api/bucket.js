import { Readable } from 'node:stream';
export async function objectExists(storage,path) {
  const {data,error}=await storage.exists(path);
  // The SDK returns an error alongside data:false for a missing object's HEAD.
  const status=Number(error?.status??error?.originalError?.status);
  if(error&&!(data===false&&[400,404].includes(status))) throw error;
  return data===true;
}
export class Bucket {
  constructor(client) { this.storage=client.storage.from('mangrooves'); }
  file(path) {
    const storage=this.storage;
    return {
      async save(bytes,{contentType}={}) {
        const {error}=await storage.upload(path,bytes,{contentType,upsert:false,cacheControl:'0'}); if(error) throw error;
      },
      async delete() { const {error}=await storage.remove([path]); if(error) throw error; },
      async download() { const {data,error}=await storage.download(path); if(error) throw error; return Buffer.from(await data.arrayBuffer()); },
      async exists() { return [await objectExists(storage,path)]; },
      createReadStream() { return Readable.from((async function*(){const {data,error}=await storage.download(path); if(error) throw error; yield Buffer.from(await data.arrayBuffer());})()); }
    };
  }
}

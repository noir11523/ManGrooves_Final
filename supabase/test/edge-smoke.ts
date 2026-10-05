// Runtime smoke check using the same Deno/npm imports as the deployed function.
import {Buffer} from 'node:buffer';
import {createApi} from '../functions/api/core/api.js';
import {cleanImage} from '../functions/api/core/images.js';
Object.assign(globalThis,{Buffer});
Deno.test('Deno HTTP runtime: routing, CORS, authentication, PDF and raster uploads',async()=>{
  Deno.env.set('WEB_ORIGINS','https://example.test');
  const user={id:1,uid:'admin',role:'system_admin',status:'active',email:'admin@example.test'};
  const records={users:[user],barangays:[{id:1,name:'Test'}]};
  const db={collection(name){const rows=records[name]??[];const query={where(){return query;},limit(){return query;},startAfter(){return query;},
    async get(){return {docs:rows.map(r=>({data:()=>r})),size:rows.length};},
    doc(id){const value=rows.find(r=>r.uid===id||String(r.id)===id);return {async get(){return {exists:!!value,data:()=>value};}};}};return query;}};
  const auth={async verifyIdToken(token){if(token!=='valid')throw new Error('Invalid');return {uid:'admin',email:user.email};}};
  const app=createApi({db,auth,bucket:{},projectId:'test'}),server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}/functions/v1/api`;
    let response=await fetch(`${base}/configuration.php`);let body=await response.json();
    if(body.backend!=='supabase'||body.barangays.length!==1)throw new Error('Configuration routing failed');
    response=await fetch(`${base}/me.php`);await response.text();if(response.status!==401)throw new Error('Missing auth allowed');
    response=await fetch(`${base}/me.php`,{headers:{Authorization:'Bearer valid',Origin:'https://example.test'}});body=await response.json();
    if(body.user.id!==1||response.headers.get('access-control-allow-origin')!=='https://example.test')throw new Error('Session/CORS failed');
    response=await fetch(`${base}/export-analytics.php`,{headers:{Authorization:'Bearer valid'}});
    if(!Buffer.from(await response.arrayBuffer()).subarray(0,4).equals(Buffer.from('%PDF')))throw new Error('PDF failed');
    for(const ext of ['jpg','png','webp']) {const image=await Deno.readFile(new URL(`fixtures/photo.${ext}`,import.meta.url));if(cleanImage(Buffer.from(image)).extension!==ext)throw new Error('Image failed');}
  } finally {await new Promise(resolve=>server.close(resolve));}
});

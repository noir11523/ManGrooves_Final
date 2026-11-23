// The only remote operations are reads. The migration runs in ephemeral local PostgreSQL.
import {readFile} from 'node:fs/promises';
import {databaseFixture} from '../test/database-fixture.js';
import {backupSource} from './backup-source.js';

const {client}=await backupSource(process.argv[2]), {pg}=await databaseFixture({relational:false});
try {
  const {data:collections,error}=await client.from('app_collections').select('name,revision').order('name');
  if(error)throw Error('Could not read the source collection revisions.');
  let count=0,profiles=0,authAccounts=0;
  const profileKeys=new Set();
  for(const {name,revision} of collections){
    let after='';
    for(;;){
      const page=await client.rpc('app_read',{p_collection:name,p_after:after,p_limit:500});
      if(page.error||page.data.revision!==revision)throw Error('Source changed or read failed. Repeat the rehearsal.');
      const records=page.data.documents;
      for(const row of records){
        await pg.query('insert into public.app_documents(collection,document_id,data,revision) values($1,$2,$3,$4)',
          [name,row.document_id,JSON.stringify(row.data),row.revision]);
        if(name==='users')profileKeys.add(row.document_id);
      }
      count+=records.length;
      if(records.length<500)break;
      after=records.at(-1).document_id;
    }
    await pg.query('update public.app_collections set revision=$2 where name=$1',[name,revision]);
  }
  const last=await client.from('app_collections').select('name,revision').order('name');
  if(last.error||JSON.stringify(last.data)!==JSON.stringify(collections))throw Error('Source changed. Repeat the rehearsal.');
  for(let page=1;;page++){
    const {data,error}=await client.auth.admin.listUsers({page,perPage:200});
    if(error)throw Error('Auth inventory failed.');
    for(const account of data.users){
      await pg.query('insert into auth.users(id) values($1)',[account.id]);
      authAccounts++;
      if(profileKeys.has(account.id))profiles++;
    }
    if(data.users.length<200)break;
  }
  const sql=await readFile(new URL('../migrations/202611220001_relational_storage.sql',import.meta.url),'utf8');
  try {await pg.exec(sql);}
  catch(error){throw Error('Local rehearsal failed ('+error.code+'): '+error.message);}
  const links=await pg.query('select count(*)::int as n from mangrooves.users p join mangrooves.actors a using(id) where a.auth_user_id::text=p.document_id');
  if(links.rows[0].n!==profiles)throw Error('Auth profile links differ after the local migration.');
  console.log('Verified '+count+' application records and their revisions in local PostgreSQL.');
  console.log(authAccounts+' Auth accounts visible in the source; '+profiles+' match a profile by UID ('+profileKeys.size+' profiles).');
} finally {await pg.close();}

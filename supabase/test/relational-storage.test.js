import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {databaseFixture} from './database-fixture.js';

test('migration preserves historical links and Auth IDs; rollback keeps subsequent writes and deletes', async () => {
  const {pg, db} = await databaseFixture({relational:false});
  const script = path => readFile(new URL(path, import.meta.url), 'utf8');
  const records = () => pg.query('select * from public.app_documents order by collection,document_id').then(r => r.rows);
  try {
    const uid = '00000000-0000-0000-0000-000000000011';
    await pg.query('insert into auth.users(id) values($1)', [uid]);
    await db.collection('users').doc(uid).set({id:8, role:'guardian', status:'active'});
    await db.collection('clusters').doc('11').set({id:11, latest_report_id:99});
    const report = db.collection('reports').doc('4');
    await report.set({id:4, cluster_id:11, user_id:8, extra_photo_paths:['b','a'],
      observation_snapshots:[{points:0, label:null}], submitted_at:'2026-08-30T10:00:00Z'});
    const before = await records();
    await pg.exec(await script('../migrations/202611220001_relational_storage.sql'));
    assert.deepEqual(await records(), before);
    assert.equal((await pg.query('select auth_user_id from mangrooves.actors where id=8')).rows[0].auth_user_id, uid);
    assert.equal((await pg.query('select latest_report_id from mangrooves.clusters')).rows[0].latest_report_id, null);
    assert.equal((await pg.query('select original_value from mangrooves.legacy_missing_references')).rows[0].original_value, 99);
    await assert.rejects(report.update({cluster_id:333}), err => err.code === '23503');
    await report.update({status:'verified'});
    await db.collection('meta').doc('new').set({field:'retained'});
    await pg.query('delete from auth.users where id=$1', [uid]);
    assert.equal((await db.collection('users').doc(uid).get()).exists, false);
    const current = await records();
    await pg.exec(await script('../manual-migrations/rollback-relational.sql'));
    assert.deepEqual(await records(), current);
    assert.equal((await db.collection('meta').doc('new').get()).data().field, 'retained');
    assert.equal((await db.rpc('app_public_summary',{})).verified_reports, 1);
    await report.update({status:'pending'});
    assert.equal((await report.get()).data().status, 'pending');
    const archived = await pg.query('select * from mangrooves_archive.app_documents order by collection,document_id');
    assert.deepEqual(archived.rows, before);
  } finally {await pg.close();}
});

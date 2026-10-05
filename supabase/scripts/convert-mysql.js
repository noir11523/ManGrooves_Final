import {createHash} from 'node:crypto';
import {convertSnapshot as convertLegacy} from '../functions/api/core/migration.js';
// Supabase Auth requires UUID identities. Numeric application IDs are retained.
export function legacyUid(id) {
  const hex=createHash('sha256').update(`mangrooves:legacy-user:${id}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export function convertSnapshot(snapshot) {
  const value=convertLegacy(snapshot);
  for(const user of value.documents.users) user.uid=legacyUid(user.id);
  for(const report of value.documents.reports) report.uid=legacyUid(report.user_id);
  value.authUsers=value.authUsers.map((u,i)=>({...u,uid:legacyUid(snapshot.tables.users[i].id)}));
  return value;
}

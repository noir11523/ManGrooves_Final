import {gzipSync,gunzipSync} from 'node:zlib';
import {Buffer} from 'node:buffer';

export const encodeReferenceData=value=>({encoding:'gzip-base64',data:gzipSync(JSON.stringify(value),{level:9}).toString('base64')});
export const decodeReferenceData=value=>value?.encoding==='gzip-base64'
  ?JSON.parse(gunzipSync(Buffer.from(value.data,'base64')).toString('utf8')):value;

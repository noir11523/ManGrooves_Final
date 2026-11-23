import {execFileSync} from 'node:child_process';
import {createDecipheriv,createHash} from 'node:crypto';

// The encryption key is wrapped by Windows for the current user on this machine.
export function protectKey(operation, bytes) {
  if (!['Protect','Unprotect'].includes(operation)) throw Error('Invalid key operation.');
  const script = `Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::${operation}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))`;
  return Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],
    {input:bytes.toString('base64'),windowsHide:true,encoding:'utf8'}),'base64');
}
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function unpack(key, packed) {
  const decipher = createDecipheriv('aes-256-gcm',key,packed.subarray(0,12));
  decipher.setAuthTag(packed.subarray(12,28));
  return Buffer.concat([decipher.update(packed.subarray(28)),decipher.final()]);
}

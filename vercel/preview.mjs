import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const config=JSON.parse(await readFile(new URL('../supabase/client-config.json',import.meta.url),'utf8'));
const keyFile=new URL('.local-key',import.meta.url);
let key;try{key=await readFile(keyFile,'utf8');}catch{key=randomBytes(32).toString('base64');await writeFile(keyFile,key,{mode:0o600});}
const php=process.env.PHP_BINARY??(process.platform==='win32'?'C:\\xampp\\php\\php.exe':'php');
const port=Number(process.env.PORT??8086);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use a port from 1024 to 65535.');
const child=spawn(php,['-S',`127.0.0.1:${port}`,'-t',fileURLToPath(new URL('dist/',import.meta.url)),fileURLToPath(new URL('serve.php',import.meta.url))],{stdio:'inherit',windowsHide:true,env:{...process.env,SUPABASE_URL:config.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:config.SUPABASE_PUBLISHABLE_KEY,APP_KEY:key}});
console.log(`Open http://127.0.0.1:${port} . This uses the same website and Supabase data as Vercel. MySQL and Apache are not needed.`);
child.on('error',error=>{console.error(`Could not start PHP: ${error.message}`);process.exitCode=1;});
child.on('exit',code=>process.exit(code??1));

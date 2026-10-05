import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url), out = new URL('web/dist/', root);
await mkdir(out, {recursive: true});
await build({entryPoints: [fileURLToPath(new URL('web/src/app.js', root))], bundle: true,
  outfile: fileURLToPath(new URL('app.js', out)), minify: true, sourcemap: false,
  define: {__FIREBASE_EMULATOR__: String(process.argv.includes('--emulator'))},
  loader: {'.png': 'file', '.svg': 'file'}, assetNames: 'assets/[name]-[hash]'});
await cp(new URL('web/index.html', root), new URL('index.html', out));
await cp(new URL('../public/assets/img/', root), new URL('assets/img/', out), {recursive: true,
  filter: path => !path.replaceAll('\\', '/').includes('/img/checklist')});
console.log(`Web built in firebase/web/dist (${process.argv.includes('--emulator') ? 'local emulators ONLY' : 'Firebase Hosting configuration'}).`);

// Render the existing website's vector mark for Android; no external artwork.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(root, 'mobile/flutter_app/android/app/src/main/res');
const svg = await readFile(path.join(root, 'public/assets/img/badges/app-icon.svg'), 'utf8');
const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
if (paths.length !== 3) throw new Error('Check the brand SVG paths before generating icons.');
const output = async (name, text) => {
  const file = path.join(res, name);
  await mkdir(path.dirname(file), {recursive: true});
  await writeFile(file, text.replace(/[ \t]+$/gm, ''));
};
const stroke = (d, color, width) => `<path android:pathData="${d}" android:strokeColor="${color}" android:strokeWidth="${width}" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="@android:color/transparent"/>`;
const vector = (monochrome = false) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated from public/assets/img/badges/app-icon.svg. Keep the mark inside Android's adaptive safe area. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512">
  <group android:scaleX="0.666667" android:scaleY="0.666667" android:translateX="85.3333" android:translateY="85.3333">
    ${monochrome ? '' : `<path android:pathData="M92,242a164,164 0,1 0,328 0a164,164 0,1 0,-328 0" android:fillColor="#F4F7F6" android:fillAlpha="0.1"/><path android:pathData="${paths[0]}" android:fillColor="#F4F7F6" android:fillAlpha="0.18"/>`}
    ${stroke(paths[1], '#F4F7F6', 24)}
    ${stroke(paths[2], monochrome ? '#F4F7F6' : '#E6D5B8', 18)}
  </group>
</vector>
`;
await output('drawable/ic_launcher_foreground.xml', vector());
await output('drawable/ic_launcher_monochrome.xml', vector(true));
await output('values/launcher_colors.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="launcher_background">#2D5A27</color></resources>\n');
for (const version of [26, 33]) {
  await output(`mipmap-anydpi-v${version}/ic_launcher.xml`, `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/launcher_background"/>
  <foreground android:drawable="@drawable/ic_launcher_foreground"/>
  ${version === 33 ? '<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>' : ''}
</adaptive-icon>
`);
}

const port = 9448;
const profile = path.join(root, 'tmp', `android-icon-${Date.now()}`);
await mkdir(profile, {recursive: true});
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--remote-debugging-address=127.0.0.1',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], {windowsHide: true, stdio: 'ignore'});
let socket;
try {
  let pages;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (pages.length) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!pages?.length) throw new Error('Chrome icon renderer did not start.');
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {socket.onopen = resolve; socket.onerror = reject;});
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task.reject(message.error); else task.resolve(message.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, {resolve, reject}); socket.send(JSON.stringify({id, method, params}));
  });
  await call('Page.enable');
  // Square, fully painted background also supports launchers that apply their own mask.
  const html = `<html><style>html,body{margin:0;width:100%;height:100%;background:#2D5A27}svg{display:block;width:100%;height:100%}</style>${svg}</html>`;
  await call('Page.navigate', {url: 'data:text/html;base64,' + Buffer.from(html).toString('base64')});
  for (const [density, size] of Object.entries({mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192})) {
    await call('Emulation.setDeviceMetricsOverride', {width:size, height:size, deviceScaleFactor:1, mobile:false});
    await call('Runtime.evaluate', {expression:'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))', awaitPromise:true});
    const {data} = await call('Page.captureScreenshot', {format:'png', clip:{x:0,y:0,width:size,height:size,scale:1}});
    await output(`mipmap-${density}/ic_launcher.png`, Buffer.from(data, 'base64'));
    console.log(`Generated ${density}: ${size} x ${size}`);
  }
} finally {
  socket?.close(); browser.kill();
}
console.log('Generated legacy, adaptive and themed ManGROOVES launcher icons.');

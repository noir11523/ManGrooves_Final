// Browser regression for Leaflet labels. JSDOM cannot measure CSS shrink-to-fit.
// Run: node vercel/test/map-layout.mjs (CHROME_PATH may override Chrome's location).
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import postcss from 'postcss';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.join(root,'tmp/map-layout');await mkdir(out,{recursive:true});
const name='MJ Angel Store Pardo, Natalio Bacalso Avenue, Poblacion Pardo, Cebu City, Central Visayas, Philippines';
const site={id:7,name,cluster_code:'MGC-7',barangay_id:1,barangay_name:'Inayawan',city_municipality:'Cebu City',species_id:1,latest_health:'Stressed',latitude:10.28,longitude:123.88,verified_count:1};
await build({stdin:{resolveDir:path.join(root,'supabase/web/src'),contents:`
import './observations.css';import './style.css';import './polish.css';import './layout.css';
import L from 'leaflet';import {map} from './ui.js';import {reportMapPage} from './report-map.js';import {exploreSites} from './explore-page.js';
window.L=L;const original=L.map;L.map=(...args)=>(window.canvas=original(...args));
L.TileLayer.prototype.createTile=function(coords,done){const tile=document.createElement('img');setTimeout(()=>done(null,tile),0);return tile;};
const site=${JSON.stringify(site)},node=document.querySelector('#page');let dispose=()=>{};
window.show=async mode=>{dispose();node.innerHTML='';node.parentElement.className=mode==='legacy'?'':'cloud-panel';if(mode==='report')dispose=reportMapPage(node);else if(mode==='explore')dispose=await exploreSites(node,{}, {role:'system_admin'});else if(mode==='legacy'){node.innerHTML='<div style="height:390px" data-cluster-map data-clusters-url="/clusters"></div>';await import('/maps.js?run='+Date.now());await new Promise(r=>setTimeout(r,60));dispose=()=>window.canvas.remove();}else{node.innerHTML='<div id="map" class="map"></div>';const canvas=map(document.querySelector('#map'),[site]);dispose=()=>canvas.remove();}};
window.pin=()=>Object.values(window.canvas._layers).find(x=>x instanceof L.CircleMarker);
await window.show('shared');
`},bundle:true,format:'esm',outfile:path.join(out,'fixture.js'),loader:{'.png':'file'},plugins:[{name:'api-fixture',setup(b){
  b.onResolve({filter:/client\.js$/},()=>({path:'client',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`const site=${JSON.stringify(site)};export const apiUrl=p=>p;export const friendly=e=>e.message;export const api=async path=>path==='explore.php'?{clusters:[site],species:[{id:1,scientific_name:'Avicennia marina'}]}:{items:[{...site,name:undefined,report_code:'Report #7',cluster_name:site.name,status:'pending',suggested_health:'Stressed'}],total:1,pages:1};`}));
}}]});
const css=await readFile(path.join(out,'fixture.css'),'utf8');
const tree=postcss.parse(css);tree.walkRules(rule=>{if(rule.parent.type==='atrule'&&/keyframes$/i.test(rule.parent.name))return;rule.selectors=rule.selectors.map(s=>s.includes(':root')?s.replaceAll(':root','.cloud-panel'):s==='body'?'.cloud-panel':'.cloud-panel '+s);});
await writeFile(path.join(out,'scoped.css'),tree.toString());
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://local'),file=url.pathname.slice(1);
  if(file==='clusters'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,clusters:[site]}));return;}
  if(!file){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/leaflet.css"><link rel="stylesheet" href="/${url.searchParams.has('standalone')?'fixture':'scoped'}.css"><body><main style="max-width:1000px;margin:20px auto;padding:0 16px"><div class="cloud-panel"><div id="page"></div><div id="toast" hidden></div></div></main><script type="module" src="/fixture.js"></script></body></html>`);return;}
  if(!/^[\w.-]+$/.test(file))throw Error('Invalid path');
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png');
  const sources={'app.css':'public/assets/css/app.css','maps.js':'public/assets/js/maps.js','leaflet.css':'supabase/node_modules/leaflet/dist/leaflet.css'};
  res.end(await readFile(sources[file]?path.join(root,sources[file]):path.join(out,file)));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${out}/chrome-${Date.now()}`,'--no-first-run','--disable-extensions','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let socket;
try{
  let pages;for(let i=0;i<100;i++){try{pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();if(pages.length)break;}catch{}await delay(100);}
  assert.ok(pages?.length,'Chrome did not start');socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});let id=0;const pending=new Map(),errors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(Error('CDP timed out: '+method)),30000);pending.set(key,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const shot=async name=>writeFile(path.join(out,name+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await call('Page.enable');await call('Runtime.enable');const results=[];
  for(const scope of ['embedded','standalone']){
    await call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/${scope==='standalone'?'?standalone':''}`});
    for(let i=0;i<100;i++){if(await evaluate('!!window.pin?.()'))break;await delay(100);}
    for(const width of [320,390,768,1280]){
      await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      for(const mode of ['shared','explore','report',...(scope==='embedded'?['legacy']:[])]){
        await evaluate(`window.show('${mode}')`);await delay(80);
        await evaluate(`window.canvas.getContainer().scrollIntoView({block:'center'});window.pin().fire('mouseover');void 0;`);await delay(50);
        const size=await evaluate(`(()=>{const tip=document.querySelector('.leaflet-tooltip'),r=tip.getBoundingClientRect();return {width:r.width,height:r.height,text:tip.textContent,scrollWidth:tip.scrollWidth,clientWidth:tip.clientWidth,pageWidth:document.documentElement.scrollWidth};})()`);
        await shot(`${scope}-${mode}-${width}-hover`);
        assert.ok(size.width>=160,`Tooltip collapsed: ${JSON.stringify({scope,mode,width,...size})}`);
        assert.ok(size.height<240,`Tooltip too tall: ${JSON.stringify(size)}`);
        assert.ok(size.scrollWidth<=size.clientWidth+1,'Tooltip text overflow');assert.ok(size.pageWidth<=width+1,'Page overflow');
        await evaluate(`window.pin().fire('mouseout');window.pin().getElement().focus()`);
        assert.ok(await evaluate(`!!document.querySelector('.leaflet-tooltip')`),'Focus summary missing');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await delay(300);
        assert.ok(await evaluate(`!!document.querySelector('.leaflet-popup a')`),'Keyboard details missing');
        await shot(`${scope}-${mode}-${width}-popup`);
        const popup=await evaluate(`(()=>{const p=document.querySelector('.leaflet-popup'),r=p.getBoundingClientRect(),c=p.querySelector('.leaflet-popup-content');return {width:r.width,contentWidth:c.clientWidth,overflow:c.scrollWidth>c.clientWidth+1,text:c.textContent};})()`);
        assert.ok(popup.contentWidth>=120&&!popup.overflow,JSON.stringify(popup));
        assert.ok(popup.text.includes(name),'Full site name missing from details');
        await evaluate(`window.canvas.closePopup();window.pin().fire('click');void 0;`);
        assert.ok(await evaluate(`!!document.querySelector('.leaflet-popup')`),'Click details missing');
        // A long label must also remain inside the map near every edge.
        for(const corner of ['top-left','top-right','bottom-left','bottom-right']){
          await evaluate(`(()=>{const p=window.pin(),m=window.canvas,s=m.getSize();m.closePopup();p.closeTooltip();p.setLatLng(m.containerPointToLatLng([${corner.endsWith('left')?'22':'s.x-22'},${corner.startsWith('top')?'22':'s.y-22'}]));p.openTooltip();})()`);
          const contained=await evaluate(`(()=>{const t=document.querySelector('.leaflet-tooltip').getBoundingClientRect(),m=window.canvas.getContainer().getBoundingClientRect();return {left:t.left-m.left,top:t.top-m.top,right:m.right-t.right,bottom:m.bottom-t.bottom};})()`);
          assert.ok(Object.values(contained).every(v=>v>=0),JSON.stringify({scope,mode,width,corner,contained}));
        }
        results.push({scope,mode,viewport:width,tooltipWidth:size.width,tooltipHeight:size.height,popupWidth:popup.width});
      }
    }
  }
  assert.deepEqual(errors,[]);await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(`Passed ${results.length} map layouts: readable hover, keyboard and click details, long names, no overflow or browser exceptions.`);await call('Browser.close');
}finally{socket?.close();chrome.kill();await new Promise(r=>server.close(r));}

import {api, friendly} from './client.js';
import {esc, field, select, pill, map, mapMarkers, mapPoint} from './ui.js';

// Filter submitted reports without changing their recorded coordinates.
export function reportMapPage(node, query = {}) {
  node.innerHTML = `<section class="report-map-page">
    <div class="card map-search-card">
      <form id="map-filters" class="map-report-filters"><div class="row">${field('q','Find submitted reports',query.q??'','search','maxlength="200" placeholder="Site, barangay, species or report number"')}${select('status','Review status',[['','All reports'],['verified','Verified'],['pending','Pending'],['rejected','Rejected']],query.status)}${select('health','Condition',[['','All conditions'],...['Healthy','Stressed','At Risk','Unknown'].map(value=>[value,value])],query.health)}</div><div class="actions"><button type="submit">Apply filters</button><button type="button" class="outline" id="reset-map-filters">Reset filters</button></div></form>
    </div>
    <div id="map-report-error" class="notice" role="alert" hidden><span></span> <button type="button" class="outline">Try again</button></div>
    <div class="map-toolbar"><p id="map-count" class="muted" role="status">Loading reports...</p></div>
    <div id="report-map" class="map large report-map-canvas" aria-label="Report locations"></div>
    <div id="map-tile-error" class="notice" role="status" hidden>Some map tiles could not load. <button type="button" class="outline">Reload map</button></div>
    <div class="legend"><span style="--c:#3f7f43">Healthy</span><span style="--c:#cf961d">Stressed</span><span style="--c:#c6513c">At Risk</span><span style="--c:#788778">Unknown</span></div>
    <p class="muted">Hover over a pin for a summary. Tap or click for details. Colors show condition; pending and rejected reports show the system suggestion.</p>
    <p id="map-empty" class="muted"></p>
    <details class="map-results"><summary id="map-results-label">Report list</summary><div id="map-report-list" class="list"></div><button type="button" class="outline" id="more-map-reports" hidden>Show more reports</button></details>
  </section>`;
  const root=node.firstElementChild, $=selector=>root.querySelector(selector);
  let disposed=false, generation=0, rows=[], markers=[], bounds=[], following=true, moving=false,listLimit=20;
  const alive=()=>!disposed && root.isConnected;
  const canvas=map($('#report-map'),[],{onTileError:()=>{if(alive())$('#map-tile-error').hidden=false;}});
  const move=action=>{moving=true;try{action();}finally{moving=false;}};
  canvas.on('dragstart zoomstart',()=>{if(!moving)following=false;});
  const fit=()=>{if(bounds.length)move(()=>canvas.fitBounds(bounds,{padding:[30,30],maxZoom:16}));};
  const drawList=()=>{
    $('#map-results-label').textContent=`Report list (${rows.length})`;
    $('#map-report-list').innerHTML=rows.slice(0,listLimit).map(r=>`<article class="report-row"><div><strong>${esc(r.report_code)}</strong><p>${esc(r.cluster_name||r.sitio_name||r.barangay_name||'Location not named')}</p><small>${esc(r.display_health||r.final_health||r.suggested_health||'Unknown')} · ${esc(String(r.submitted_at??'').slice(0,10))}</small>${pill(r.status)}</div><div class="actions">${mapPoint(r)?`<button type="button" class="outline" data-pin="${Number(r.id)}">Show pin</button>`:''}<a class="button outline" href="#report/${Number(r.id)}">View report</a></div></article>`).join('');
    $('#more-map-reports').hidden=rows.length<=listLimit;
  };
  const draw=loading=>{
    markers.forEach(marker=>marker.remove());
    ({markers,bounds}=mapMarkers(canvas,rows,{fit:false}));
    $('#map-count').textContent=loading?`Loading reports... ${rows.length} loaded`:`${bounds.length} ${bounds.length===1?'pin':'pins'} · ${rows.length} ${rows.length===1?'report':'reports'}`;
    const missing=rows.length-bounds.length;
    drawList();
    $('#map-empty').textContent=loading?'':!rows.length?'No reports match these filters.':missing?`${missing} ${missing===1?'report has':'reports have'} no map location.`:'';
  };
  async function load() {
    const version=++generation, filters={q:$('[name=q]').value.trim(),status:$('[name=status]').value,health:$('[name=health]').value};
    rows=[];listLimit=20;$('#map-report-error').hidden=true;draw(true);
    const seen=new Set();
    try {
      let page=1,pages=1;
      do {
        const data=await api('reports.php',{query:{...filters,page}});
        if(!alive()||version!==generation)return;
        for(const item of data.items??[])if(!seen.has(item.id)){seen.add(item.id);rows.push(item);}
        pages=Math.max(1,Number(data.pages)||1);page++;draw(page<=pages);
      } while(page<=pages);
      if(following)fit();
    } catch(error) {
      if(!alive()||version!==generation)return;
      draw(false);$('#map-report-error span').textContent=`Could not load ${rows.length?'all ':''}reports. ${friendly(error)}`;
      $('#map-report-error').hidden=false;
      $('#map-empty').textContent=rows.length?'The map shows only the reports loaded so far.':'';
    }
  }
  const changeFilters=()=>{
    const url=new URL(window.location.href);
    for(const key of ['q','status','health']){
      const value=$(`[name=${key}]`).value;
      if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
    }
    if(url.hash.startsWith('#report-map')){url.hash=`report-map${url.search}`;url.search='';}
    window.history.replaceState(window.history.state,'',url);
    load();
  };
  $('[name=status]').onchange=changeFilters;$('[name=health]').onchange=changeFilters;
  $('#map-filters').onsubmit=event=>{event.preventDefault();following=true;changeFilters();};
  $('#reset-map-filters').onclick=()=>{for(const key of ['q','status','health'])$(`[name=${key}]`).value='';following=true;changeFilters();};
  $('#more-map-reports').onclick=()=>{listLimit+=20;drawList();};
  $('#map-report-list').onclick=event=>{const button=event.target.closest('[data-pin]');if(!button)return;const index=rows.filter(mapPoint).findIndex(r=>String(r.id)===button.dataset.pin);if(index<0)return;following=false;move(()=>canvas.setView(markers[index].getLatLng(),17));markers[index].openPopup();$('#report-map').scrollIntoView({block:'center',behavior:'smooth'});};
  $('#map-report-error button').onclick=load;
  $('#map-tile-error button').onclick=()=>{$('#map-tile-error').hidden=true;canvas.eachLayer(layer=>layer.redraw?.());};
  load();
  return ()=>{disposed=true;generation++;canvas.remove();};
}

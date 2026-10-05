import L from 'leaflet';
import {api, friendly} from './client.js';
import {esc, select, map, mapMarkers, mapPoint} from './ui.js';

// Address search is independent of report filters: finding a landmark does not
// hide reports or change any submitted coordinates.
export function reportMapPage(node, query = {}) {
  node.innerHTML = `<section class="report-map-page">
    <div class="card map-search-card">
      <label class="field" for="map-place"><span>Find a location</span></label>
      <div class="map-search-input"><input id="map-place" type="text" maxlength="150" autocomplete="off" placeholder="Address or landmark" aria-describedby="map-search-hint"><button type="button" id="clear-map-place" class="outline" hidden>Clear location</button></div>
      <small id="map-search-hint">Choose a place to see it on the map.</small>
      <div id="map-places" class="list" role="region" aria-label="Suggested locations"></div>
      <p id="map-search-status" class="muted" role="status"></p>
      <div class="row map-report-filters">${select('status','Status',[['','All reports'],['verified','Verified'],['pending','Pending'],['rejected','Rejected']],query.status)}${select('health','Health',[['','All health'],...['Healthy','Stressed','At Risk','Unknown'].map(value=>[value,value])],query.health)}</div>
    </div>
    <div id="map-report-error" class="notice" role="alert" hidden><span></span> <button type="button" class="outline">Try again</button></div>
    <p id="map-count" class="muted" role="status">Loading reports...</p>
    <div id="report-map" class="map large report-map-canvas" aria-label="Report locations"></div>
    <div id="map-tile-error" class="notice" role="status" hidden>Some map tiles could not load. <button type="button" class="outline">Reload map</button></div>
    <div class="legend"><span style="--c:#3f7f43">Healthy</span><span style="--c:#cf961d">Stressed</span><span style="--c:#c6513c">At Risk</span><span style="--c:#788778">Unknown</span></div>
    <p class="muted">Tap a report pin to view its details. A blue pin marks your search.</p>
    <p id="map-empty" class="muted"></p>
  </section>`;
  const root=node.firstElementChild, $=selector=>root.querySelector(selector);
  let disposed=false, generation=0, searchVersion=0, timer, rows=[], markers=[], bounds=[], selected=null, following=true, moving=false;
  const alive=()=>!disposed && root.isConnected;
  const canvas=map($('#report-map'),[],{onTileError:()=>{if(alive())$('#map-tile-error').hidden=false;}});
  const move=action=>{moving=true;try{action();}finally{moving=false;}};
  canvas.on('dragstart zoomstart',()=>{if(!moving)following=false;});
  const fit=()=>{if(bounds.length)move(()=>canvas.fitBounds(bounds,{padding:[30,30],maxZoom:16}));};
  const clearSelection=()=>{selected?.remove();selected=null;$('#clear-map-place').hidden=!$('#map-place').value;};
  const draw=loading=>{
    markers.forEach(marker=>marker.remove());
    ({markers,bounds}=mapMarkers(canvas,rows,{fit:false}));
    $('#map-count').textContent=loading?`Loading reports... ${rows.length} loaded`:`${bounds.length} pins · ${rows.length} reports`;
    const missing=rows.length-bounds.length;
    $('#map-empty').textContent=loading?'':!rows.length?'No reports match these filters. You can still search for a place.':missing?`${missing} ${missing===1?'report has':'reports have'} no map location.`:'';
  };
  async function load() {
    const version=++generation, filters={status:$('[name=status]').value,health:$('[name=health]').value};
    rows=[];$('#map-report-error').hidden=true;draw(true);
    const seen=new Set();
    try {
      let page=1,pages=1;
      do {
        const data=await api('reports.php',{query:{...filters,page}});
        if(!alive()||version!==generation)return;
        for(const item of data.items??[])if(!seen.has(item.id)){seen.add(item.id);rows.push(item);}
        pages=Math.max(1,Number(data.pages)||1);page++;draw(page<=pages);
      } while(page<=pages);
      if(!selected && following)fit();
    } catch(error) {
      if(!alive()||version!==generation)return;
      draw(false);$('#map-report-error span').textContent=`Could not load ${rows.length?'all ':''}reports. ${friendly(error)}`;
      $('#map-report-error').hidden=false;
      $('#map-empty').textContent=rows.length?'The map shows only the reports loaded so far.':'';
    }
  }
  function localPlaces(term) {
    return rows.filter(item=>[item.sitio_name,item.cluster_name,item.barangay_name,item.report_code].some(value=>String(value??'').toLowerCase().includes(term.toLowerCase())))
      .filter(mapPoint).map(item=>({label:item.sitio_name||item.cluster_name||item.barangay_name||item.report_code,latitude:mapPoint(item)[0],longitude:mapPoint(item)[1]}));
  }
  function showPlaces(places) {
    const seen=new Set();
    const unique=places.filter(place=>{
      if(!mapPoint(place)||!String(place.label??'').trim())return false;
      const key=JSON.stringify([place.label,...mapPoint(place)]);
      if(seen.has(key))return false;seen.add(key);return true;
    }).slice(0,8);
    $('#map-places').innerHTML=unique.map((place,i)=>`<button type="button" class="report-row place-result" data-index="${i}">${esc(place.label)}</button>`).join('');
    $('#map-places').onclick=event=>{
      const button=event.target.closest('[data-index]');if(!button)return;
      const place=unique[Number(button.dataset.index)];
      searchVersion++;clearTimeout(timer);clearSelection();following=false;
      $('#map-place').value=place.label;$('#clear-map-place').hidden=false;
      selected=L.marker(mapPoint(place),{title:'Selected location',alt:'Selected location',icon:L.divIcon({className:'search-map-pin',html:'<span aria-hidden="true">●</span>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(canvas);
      const label=document.createElement('span');label.textContent=place.label;selected.bindPopup(label);
      move(()=>canvas.setView(mapPoint(place),16));
      $('#map-places').innerHTML='';$('#map-search-status').textContent=`Selected: ${place.label}`;
      $('#map-place').blur();$('#report-map').scrollIntoView({block:'center',behavior:'smooth'});
    };
    return unique.length;
  }
  function search(immediate=false) {
    clearTimeout(timer);const version=++searchVersion,term=$('#map-place').value.trim().slice(0,150);
    clearSelection();$('#map-places').innerHTML='';$('#map-search-status').textContent='';
    if(term.length<3){if(term)$('#map-search-status').textContent='Type at least 3 letters.';else {following=true;fit();}return;}
    const local=localPlaces(term);showPlaces(local);
    timer=setTimeout(async()=>{
      if(!alive())return;
      $('#map-search-status').textContent='Finding places...';
      try {
        const data=await api('places.php',{query:{q:term}});
        if(!alive()||version!==searchVersion)return;
        const count=showPlaces([...local,...(data.places??[])]);
        $('#map-search-status').textContent=count?'Choose a location below.':'No places found. Try another address or landmark.';
      } catch(error) {
        if(!alive()||version!==searchVersion)return;
        $('#map-search-status').textContent=local.length?'Address search is unavailable. You can choose a report location below.':'Search is unavailable. Try again in a moment.';
      }
    },immediate?0:700);
  }
  $('#map-place').oninput=()=>search();
  $('#map-place').onkeydown=event=>{
    if(event.key==='Enter'){event.preventDefault();search(true);}
    if(event.key==='ArrowDown'){$('#map-places button')?.focus();event.preventDefault();}
    if(event.key==='Escape'){searchVersion++;clearTimeout(timer);$('#map-places').innerHTML='';$('#map-search-status').textContent='';}
  };
  $('#clear-map-place').onclick=()=>{$('#map-place').value='';search();$('#map-place').focus();};
  const changeFilters=()=>{
    const url=new URL(window.location.href);
    for(const key of ['status','health']){
      const value=$(`[name=${key}]`).value;
      if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state,'',url);
    load();
  };
  $('[name=status]').onchange=changeFilters;$('[name=health]').onchange=changeFilters;
  $('#map-report-error button').onclick=load;
  $('#map-tile-error button').onclick=()=>{$('#map-tile-error').hidden=true;canvas.eachLayer(layer=>layer.redraw?.());};
  load();
  return ()=>{disposed=true;generation++;searchVersion++;clearTimeout(timer);canvas.remove();};
}

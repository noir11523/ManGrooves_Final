import L from 'leaflet';
import {api,friendly} from './client.js';
import {esc,field,select,toast,confirm,map} from './ui.js';
import {editor} from './admin-lists.js';
import {listFilters,bindListFilters,filterLocalList,matchesSearch} from './list-filters.js';

export const catalogTabs=selected=>`<nav class="catalog-tabs" aria-label="Species and Sites"><a class="button ${selected==='species'?'':'outline'}" href="#species" ${selected==='species'?'aria-current="page"':''}>Species</a><a class="button ${selected==='sites'?'':'outline'}" href="#species?tab=sites" ${selected==='sites'?'aria-current="page"':''}>Sites</a></nav>`;
export async function sitesPage(node,query,refresh,head) {
  node.siteCleanup?.();
  query=Object.fromEntries(Object.entries(query).filter(([key])=>key!=='tab'));
  const {sites,barangays}=await api('sites.php');if(!node.isConnected)return;
  node.innerHTML=`${head('Species and Sites','Manage species and the places your community monitors.')}${catalogTabs('sites')}${listFilters(query,[['active','Status',[['','All statuses'],['1','Active'],['0','Archived']]]],'Site, location, or barangay')}<div class="actions"><button type="button" id="add-site">Add site</button></div><section class="report-table-card"><div class="table-wrap"><table class="report-table admin-table"><thead><tr><th>Site</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead><tbody>${sites.map(s=>`<tr data-id="${s.id}"><td data-label="Site"><strong>${esc(s.name)}</strong><small>${esc(s.barangay_name)}</small><small>Added by ${esc(s.created_by_name||'Administrator')} · ${s.visibility==='personal'?'Personal site — awaiting approval':'Shared site'}</small></td><td data-label="Location">${esc(s.sitio_name||s.name)}<small>${Number(s.center_lat).toFixed(5)}, ${Number(s.center_lng).toFixed(5)} · ${s.radius_meters} m area</small></td><td data-label="Status">${Number(s.active)===0?'Archived':'Active'}</td><td data-label="Actions"><div class="actions">${s.visibility==='personal'?`<button type="button" class="approve-site" data-id="${s.id}">Approve for everyone</button>`:''}<button type="button" class="outline delete-site" data-id="${s.id}">Delete</button><button type="button" class="outline edit-site" data-id="${s.id}">Edit</button><button type="button" class="outline archive-site" data-id="${s.id}">${Number(s.active)===0?'Restore':'Archive'}</button></div></td></tr>`).join('')}</tbody></table></div></section><p class="empty filter-empty" hidden>No sites match.</p><dialog id="admin-editor" class="admin-editor" aria-label="Site editor"></dialog>`;
  const rows=[...node.querySelectorAll('tbody tr')].map(row=>[row,sites.find(s=>s.id===Number(row.dataset.id))]);
  const apply=()=>filterLocalList(node,query,rows,(s,q)=>matchesSearch([s.name,s.sitio_name,s.barangay_name],q)&&(!q.active||(Number(s.active)!==0?1:0)===Number(q.active)));
  bindListFilters(node,query,apply);apply();let canvas=null,searchTimer,request=0;
  const cleanup=()=>{request++;clearTimeout(searchTimer);canvas?.remove();canvas=null;};
  node.siteCleanup=cleanup;
  const edit=site=>{
    cleanup();
    const dialog=editor(node,site.id?'Edit site':'Add site',`<div class="row">${field('name','Site name',site.name??'','text','required maxlength="120"')}${select('barangay_id','Barangay',[['','Choose barangay'],...barangays.map(b=>[b.id,b.name])],site.barangay_id??'','required')}${field('sitio_name','Location name',site.sitio_name??site.name??'','text','required maxlength="120"')}${field('radius_meters','Site radius (meters)',site.radius_meters??100,'number','required min="25" max="5000" step="1"')}</div><label class="field"><span>Find the site on the map</span><input id="site-search" type="search" placeholder="Address or landmark" autocomplete="off"></label><div id="site-results" class="list" role="status"></div><p id="site-pin-status" role="status">Search or tap the map to set the site location.</p><div id="site-map" class="map"></div><details><summary>Coordinates</summary><div class="row">${field('center_lat','Latitude',site.center_lat??'','number','step="any" min="-90" max="90" required readonly')}${field('center_lng','Longitude',site.center_lng??'','number','step="any" min="-180" max="180" required readonly')}</div></details>`,async values=>{
      if(values.center_lat===''||values.center_lng==='')throw new Error('Choose the site location on the map.');
      const result=await api('sites.php',{body:{...values,id:site.id,active:site.active??1,version:site.version??''}});cleanup();toast(result.message);await refresh();
    });
    dialog.addEventListener('close',cleanup,{once:true});let marker=null;
    const pin=(lat,lng,label)=>{
      if(!marker){marker=L.marker([lat,lng],{draggable:true,icon:L.divIcon({html:'<span style="display:block;background:#245b2b;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 1px 5px #0008"></span>',className:'',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(canvas);marker.on('dragend',()=>{const p=marker.getLatLng();void selectPin(p.lat,p.lng);});}else marker.setLatLng([lat,lng]);
      dialog.querySelector('[name=center_lat]').value=Number(lat).toFixed(7);dialog.querySelector('[name=center_lng]').value=Number(lng).toFixed(7);
      if(label)dialog.querySelector('[name=sitio_name]').value=label.slice(0,120);
      dialog.querySelector('#site-pin-status').textContent='Site pin selected. Check the location before saving.';
    };
    const selectPin=async(lat,lng)=>{
      const fallback=`Pinned location (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`;
      pin(lat,lng,fallback);
      try {
        const {places}=await api('places.php',{query:{latitude:lat,longitude:lng}});
        const name=dialog.querySelector('[name=sitio_name]');
        if(dialog.open&&name.value===fallback&&places?.[0]?.label)name.value=places[0].label.slice(0,120);
      }catch{/* Coordinates stay usable when no street name is available. */}
    };
    const mapElement=dialog.querySelector('#site-map');
    canvas=map(mapElement,[],{onClick:event=>void selectPin(event.latlng.lat,event.latlng.lng)});
    mapElement.tabIndex=0;mapElement.setAttribute('aria-label','Site map. Use arrow keys to move and Enter to place a pin.');
    mapElement.onkeydown=event=>{if(event.key==='Enter'&&event.target===mapElement){event.preventDefault();const p=canvas.getCenter();void selectPin(p.lat,p.lng);}};
    if(site.center_lat!=null){pin(site.center_lat,site.center_lng);canvas.setView([site.center_lat,site.center_lng],17);}
    dialog.querySelector('[name=barangay_id]').onchange=event=>{
      const b=barangays.find(b=>String(b.id)===event.target.value);if(b)canvas.setView([b.center_lat,b.center_lng],14);
    };
    dialog.querySelector('#site-search').oninput=event=>{
      clearTimeout(searchTimer);const generation=++request,q=event.target.value.trim(),target=dialog.querySelector('#site-results');target.replaceChildren();if(q.length<3)return;
      searchTimer=setTimeout(async()=>{try{
        const {places}=await api('places.php',{query:{q}});if(generation!==request||!dialog.open)return;
        target.innerHTML=places.length?places.map((p,i)=>`<button type="button" class="outline" data-index="${i}">${esc(p.label)}</button>`).join(''):'No places found. Tap the map instead.';
        target.querySelectorAll('button').forEach(button=>button.onclick=()=>{const p=places[Number(button.dataset.index)];request++;pin(p.latitude,p.longitude,p.label);canvas.setView([p.latitude,p.longitude],17);target.replaceChildren();});
      }catch(error){if(generation===request&&dialog.open)target.textContent=friendly(error);}},500);
    };
  };
  node.querySelector('#add-site').onclick=()=>edit({});
  node.querySelectorAll('.edit-site').forEach(button=>button.onclick=()=>edit(sites.find(s=>s.id===Number(button.dataset.id))));
  node.querySelectorAll('.archive-site').forEach(button=>button.onclick=async()=>{
    const site=sites.find(s=>s.id===Number(button.dataset.id)),active=Number(site.active)!==0;
    if(!await confirm(`${active?'Archive':'Restore'} site?`,active?'This removes it from new report choices. Existing reports are kept.':'This site becomes available for new reports.'))return;
    button.disabled=true;try{await api('sites.php',{body:{...site,active:active?0:1}});await refresh();}catch(error){toast(friendly(error));}finally{button.disabled=false;}
  });
  for(const action of ['approve','delete']) node.querySelectorAll(`.${action}-site`).forEach(button=>button.onclick=async()=>{
    const site=sites.find(s=>s.id===Number(button.dataset.id));
    if(!await confirm(action==='approve'?'Share this site?':'Delete this site?',action==='approve'?'This adds the site to everyone’s available sites in this barangay.':'It will disappear from site choices. Existing reports will be kept.'))return;
    button.disabled=true;try{const result=await api('sites.php',{body:{...site,action}});toast(result.message);await refresh();}catch(error){toast(friendly(error));}finally{button.disabled=false;}
  });
  return ()=>node.siteCleanup?.();
}

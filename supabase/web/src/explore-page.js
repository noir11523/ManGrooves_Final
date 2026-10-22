import {api} from './client.js';
import {esc,field,select,pill,map,mapMarkers,mapPoint} from './ui.js';

export function filterExploreSites(sites,species,filters={}) {
  const catalog=new Map(species.map(s=>[String(s.id),s]));
  const q=String(filters.q??'').trim().toLowerCase();
  return sites.filter(site=>{
    const s=catalog.get(String(site.species_id))??{};
    return (!filters.species_id||String(site.species_id)===String(filters.species_id))&&(!filters.health||site.latest_health===filters.health)&&(!filters.barangay_id||String(site.barangay_id)===String(filters.barangay_id))&&(!q||[site.name,site.barangay_name,site.city_municipality,s.local_name,s.common_name,s.scientific_name].join(' ').toLowerCase().includes(q));
  });
}

export async function exploreSites(node,query={},viewer=null) {
  const data=await api('explore.php',{anonymous:true});if(!node.isConnected)return ()=>{};
  const sites=data.clusters??[],catalog=data.species??[];
  const places=[...new Map(sites.map(s=>[s.barangay_id,[s.barangay_name,s.city_municipality].filter(Boolean).join(', ')])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const canTimeline=site=>viewer&&(viewer.role!=='guardian'||Number(site.barangay_id)===Number(viewer.barangay_id));
  const timelineLink=site=>!viewer?'#login':canTimeline(site)?`#cluster/${site.id}`:null;
  node.innerHTML=`<section class="explore-page"><header class="page-head"><div><h1>Explore mangrove sites</h1><p class="muted">Shared sites with verified reports. Find a species, place or health result.</p></div></header>
    <form id="explore-filters" class="card"><div class="row">${field('q','Search sites or species',query.q??'','search','placeholder="Site, barangay or mangrove name" maxlength="200"')}${select('species_id','Species',[['','All species'],...catalog.map(s=>[s.id,s.scientific_name])],query.species_id)}${select('barangay_id','Location',[['','All locations'],...places],query.barangay_id)}${select('health','Health status',[['','All health'],...['Healthy','Stressed','At Risk','Unknown'].map(h=>[h,h])],query.health)}</div><div class="actions"><button type="submit">Apply filters</button><button type="button" class="outline" id="explore-reset">Reset filters</button></div></form>
    <div class="map-toolbar"><p id="explore-count" role="status"></p></div><div id="explore-map" class="map large report-map-canvas" aria-label="Shared mangrove sites"></div><div class="legend">${['Healthy','Stressed','At Risk','Unknown'].map((h,i)=>`<span style="--c:${['#3f7f43','#cf961d','#c6513c','#788778'][i]}">${h}</span>`).join('')}</div><p class="muted">Hover for a summary, or tap a pin for site details. Timelines follow your account’s access.</p><div id="explore-sites" class="explore-results"></div>
    </section>`;
  const $=s=>node.querySelector(s),canvas=map($('#explore-map'),[]);let markers=[],current=[];
  const fit=()=>{const points=current.map(mapPoint).filter(Boolean);if(points.length)canvas.fitBounds(points,{padding:[30,30],maxZoom:16});};
  const draw=()=>{
    const filters=Object.fromEntries(new FormData($('#explore-filters')));current=filterExploreSites(sites,catalog,filters);markers.forEach(m=>m.remove());markers=[];
    for(const item of current){const species=catalog.find(s=>Number(s.id)===Number(item.species_id));const result=mapMarkers(canvas,[{...item,...(species?{scientific_name:species.scientific_name,local_name:species.local_name,common_name:species.common_name}:{})}],{fit:false,canOpenTimeline:!!canTimeline(item)});markers.push(...result.markers);if(viewer&&!canTimeline(item)){const link=result.markers[0]?.getPopup()?.getContent()?.querySelector('a');if(link){link.replaceWith(document.createTextNode('Timeline is outside your barangay.'));}}}
    $('#explore-count').textContent=`${current.length} shared ${current.length===1?'site':'sites'} · Verified reports only`;
    $('#explore-sites').innerHTML=current.length?`<h2>Matching sites</h2><div class="list">${current.map(c=>`<article class="report-row"><div><h3>${esc(c.name)}</h3><p>${esc([c.barangay_name,c.city_municipality].filter(Boolean).join(', '))}</p>${pill(c.latest_health)}<small>${c.verified_count} verified visits</small></div><div class="actions">${mapPoint(c)?`<button type="button" class="outline" data-site="${c.id}">Show pin</button>`:''}${timelineLink(c)?`<a class="button outline" href="${timelineLink(c)}">${viewer?'View timeline':'Sign in for timeline'}</a>`:'<small>Outside your barangay</small>'}</div></article>`).join('')}</div>`:'<div class="empty"><h2>No matching verified sites</h2><p>Try another species, location or health result. Newly added sites appear here after a report is verified and the site is shared.</p></div>';
    fit();
  };
  $('#explore-filters').onsubmit=e=>{e.preventDefault();draw();};
  $('#explore-filters').onchange=e=>{if(e.target.tagName==='SELECT')draw();};
  $('#explore-reset').onclick=()=>{for(const element of $('#explore-filters').elements)if(element.name)element.value='';draw();};
  node.onclick=e=>{const site=e.target.closest('[data-site]');if(site){const index=current.filter(mapPoint).findIndex(c=>String(c.id)===site.dataset.site);if(index>=0){canvas.setView(markers[index].getLatLng(),17);markers[index].openPopup();$('#explore-map').scrollIntoView({block:'center',behavior:'smooth'});}}};
  draw();return ()=>{node.onclick=null;canvas.remove();};
}

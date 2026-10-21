import Chart from 'chart.js/auto';
import {api} from './client.js';
import {esc,pill} from './ui.js';

export async function mangroveTimeline(node,id,query,heading,back) {
  const {cluster,timeline}=await api('cluster.php',{query:{id}});
  if(!node.isConnected)return ()=>{};
  const ordered=[...timeline].sort((a,b)=>a.submitted_at.localeCompare(b.submitted_at)||a.id-b.id);
  const counts=ordered.filter(r=>r.observed_alive_count!=null),latest=ordered.at(-1),lastCount=counts.at(-1);
  const date=r=>String(r.submitted_at).slice(0,10);
  const delta=r=>{const i=counts.findIndex(c=>c.id===r.id);if(i<=0)return 'First recorded count';const d=r.observed_alive_count-counts[i-1].observed_alive_count;return `${d>0?'+':''}${d} since previous count`;};
  node.innerHTML=`${heading('Mangrove timeline',cluster.name)}<p class="muted">Health history and mangrove counts from verified field visits, together in one timeline.</p>
    <nav class="timeline-shortcuts" aria-label="Timeline sections"><button type="button" class="outline" data-section="health-history">Health history</button><button type="button" class="outline" data-section="mangrove-counts">Mangrove counts</button><button type="button" class="outline" data-section="verified-visits">Verified visits</button></nav>
    <div class="timeline-summary"><article class="card"><small>Latest health</small><strong>${latest?pill(latest.health):'Awaiting a verified visit'}</strong>${latest?`<small>${esc(date(latest))}</small>`:''}</article><article class="card"><small>Latest living-mangrove count</small><strong>${lastCount?esc(lastCount.observed_alive_count):'Not recorded'}</strong>${lastCount?`<small>${esc(date(lastCount))} · ${esc(delta(lastCount))}</small>`:''}</article><article class="card"><small>Verified visits</small><strong>${ordered.length}</strong><small>${counts.length} with a recorded count</small></article></div>

    <div class="timeline-charts"><section class="card timeline-section" id="health-history" tabindex="-1"><h2>Health history</h2><p>Health confirmed during each visit.</p>${ordered.length?`<div class="chart"><canvas id="health-chart" role="img" aria-label="Health at each verified visit. Exact results are listed under Verified visits."></canvas></div>${ordered.length===1?'<p class="muted">First verified visit. More visits will show changes over time.</p>':''}`:'<p class="empty">No verified health results yet. Reports appear here after staff review.</p>'}</section>
    <section class="card timeline-section" id="mangrove-counts" tabindex="-1"><h2>Mangrove counts</h2><p>Living mangroves counted at each verified visit.</p>${counts.length?'<div class="chart"><canvas id="count-chart" role="img" aria-label="Living-mangrove counts by visit. Exact counts are listed under Verified visits."></canvas></div>':'<div class="empty"><strong>No counts recorded yet</strong><p>A verified report needs a living-mangrove count to appear here. “Unable to count” remains blank, never zero.</p></div>'}<p class="muted">This is the count history previously called Growth timeline. Counts do not measure tree height; compare visits covering the same area.</p></section></div>
    <section class="timeline-section" id="verified-visits" tabindex="-1"><h2>Verified visits</h2><p class="muted">Newest first. Each visit shows its health and any recorded count.</p><div class="timeline">${[...ordered].reverse().map(r=>`<article class="card visit"><small>${esc(date(r))} · ${esc(r.report_code)}</small><h3>${pill(r.health)}</h3><p>${esc(r.species_name??'Species not confirmed')}</p>${r.observed_alive_count!=null?`<p><strong>${esc(r.observed_alive_count)} living mangroves</strong><br><small>${esc(delta(r))}</small></p>`:'<p>Count not recorded</p>'}${r.expert_feedback?`<p>${esc(r.expert_feedback)}</p>`:''}${r.can_view_details?`<a href="#report/${r.id}">View report</a>`:'<small>Community observation</small>'}</article>`).join('')||'<p class="empty">No verified visits yet.</p>'}</div></section>`;
  back();
  const jump=id=>{const section=node.querySelector(`#${id}`);section.focus({preventScroll:true});section.scrollIntoView({block:'start',behavior:'smooth'});};
  node.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>jump(button.dataset.section));
  const charts=[],levels={'At Risk':0,Stressed:1,Healthy:2};
  for(const [selector,points,growth] of [['#health-chart',ordered,false],['#count-chart',counts,true]]){
    if(!points.length)continue;
    charts.push(new Chart(node.querySelector(selector),{type:'line',data:{labels:points.map(date),datasets:[{label:growth?'Living mangroves':'Health',data:points.map(r=>growth?r.observed_alive_count:levels[r.health]??null),borderColor:'#35713d',backgroundColor:'#35713d',pointRadius:6,pointHoverRadius:8,tension:0,stepped:!growth,spanGaps:false}]},options:{maintainAspectRatio:false,layout:{padding:12},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>growth?c.parsed.y+' living mangroves':['At Risk','Stressed','Healthy'][c.parsed.y]}}},scales:{x:{offset:true},y:growth?{beginAtZero:true,ticks:{precision:0}}:{min:-.25,max:2.25,afterBuildTicks:axis=>{axis.ticks=[0,1,2].map(value=>({value}));},ticks:{callback:v=>['At Risk','Stressed','Healthy'][v]??''}}}}}));
  }
  if(['growth','counts'].includes(query.tab))requestAnimationFrame(()=>{if(node.isConnected)jump('mangrove-counts');});
  return ()=>charts.forEach(c=>c.destroy());
}

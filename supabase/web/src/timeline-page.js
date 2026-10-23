import Chart from 'chart.js/auto';
import {api} from './client.js';
import {esc,pill} from './ui.js';

export async function mangroveTimeline(node,id,query,heading,back) {
  const {cluster,timeline}=await api('cluster.php',{query:{id}});
  if(!node.isConnected)return ()=>{};
  const ordered=[...timeline].sort((a,b)=>a.submitted_at.localeCompare(b.submitted_at)||a.id-b.id);
  const counts=ordered.filter(r=>r.observed_alive_count!=null);
  const date=r=>String(r.submitted_at).slice(0,10);
  const countLabel=n=>`${n} living mangrove${Number(n)===1?'':'s'}`;
  node.innerHTML=`${heading('Mangrove timeline',cluster.name)}
    <div class="timeline-charts"><section class="card timeline-section" id="health-history" tabindex="-1"><h2>Health history</h2>${ordered.length?'<div class="chart"><canvas id="health-chart" role="img" aria-label="Health by verified visit. Results are listed in Visit history."></canvas></div>':'<p class="empty">No verified visits yet.</p>'}</section>
    <section class="card timeline-section" id="mangrove-counts" tabindex="-1"><h2>Growth Timeline</h2><p class="muted chart-unit">Living mangroves</p>${counts.length?'<div class="chart"><canvas id="count-chart" role="img" aria-label="Living mangroves by verified visit. Counts are listed in Visit history."></canvas></div>':'<p class="empty">No counts recorded yet.</p>'}</section></div>
    <section class="timeline-section" id="verified-visits" tabindex="-1"><h2>Visit history <small>(${ordered.length})</small></h2><div class="timeline">${[...ordered].reverse().map(r=>`<article class="card visit"><div class="visit-heading"><small>${esc(date(r))} · ${esc(r.report_code)}</small>${pill(r.health)}</div>${r.species_name?`<p>${esc(r.species_name)}</p>`:''}<p>${r.observed_alive_count!=null?`<strong>${esc(countLabel(r.observed_alive_count))}</strong>`:'Count not recorded'}</p>${r.expert_feedback?`<p>${esc(r.expert_feedback)}</p>`:''}${r.can_view_details?`<a href="#report/${r.id}">View report</a>`:''}</article>`).join('')||'<p class="empty">No verified visits yet.</p>'}</div></section>`;
  back();
  const jump=id=>{const section=node.querySelector(`#${id}`);section.focus({preventScroll:true});section.scrollIntoView({block:'start',behavior:'smooth'});};
  const charts=[],levels={'At Risk':0,Stressed:1,Healthy:2};
  for(const [selector,points,growth] of [['#health-chart',ordered,false],['#count-chart',counts,true]]){
    if(!points.length)continue;
    charts.push(new Chart(node.querySelector(selector),{type:'line',data:{labels:points.map(date),datasets:[{label:growth?'Living mangroves':'Health',data:points.map(r=>growth?r.observed_alive_count:levels[r.health]??null),borderColor:'#35713d',backgroundColor:'#35713d',pointRadius:6,pointHoverRadius:8,tension:0,stepped:!growth,spanGaps:false}]},options:{maintainAspectRatio:false,layout:{padding:12},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>growth?countLabel(c.parsed.y):['At Risk','Stressed','Healthy'][c.parsed.y]}}},scales:{x:{offset:true},y:growth?{beginAtZero:true,ticks:{precision:0}}:{min:-.25,max:2.25,afterBuildTicks:axis=>{axis.ticks=[0,1,2].map(value=>({value}));},ticks:{callback:v=>['At Risk','Stressed','Healthy'][v]??''}}}}}));
  }
  if(['growth','counts'].includes(query.tab))requestAnimationFrame(()=>{if(node.isConnected)jump('mangrove-counts');});
  return ()=>charts.forEach(c=>c.destroy());
}

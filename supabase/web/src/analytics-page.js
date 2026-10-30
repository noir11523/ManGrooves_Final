import Chart from 'chart.js/auto';
import {api,friendly} from './client.js';
import {esc,field,select,pill,map,download,toast,formValues,showError} from './ui.js';
const colors={'Healthy':'#3f7f43','Stressed':'#cf961d','At Risk':'#c6513c','Unknown':'#788778'};

export async function monitoringAnalytics(node,query={},title,back) {
  const {analytics:a}=await api('analytics.php',{query});
  if(!node.isConnected)return ()=>{};
  const options=a.options??{clusters:[],species:[]},filters=a.filters,progress=a.progress??{},sites=a.clusters??[],priority=a.priority_areas??[];
  const health=a.latest_health??{},total=Object.values(health).reduce((sum,n)=>sum+n,0);
  const counts=Object.entries(health).map(([name,n])=>`<li><span class="health-dot" style="background:${colors[name]}"></span>${esc(name)} <strong>${n}</strong> <span>${total?(n/total*100).toFixed(1):'0'}%</span></li>`).join('');
  const trend=a.growth??[],hasTrend=trend.some(m=>m.verified_reports>0);
  const selection=[filters.date_from+' – '+filters.date_to,options.clusters.find(c=>String(c.id)===String(filters.cluster_id))?.name,options.species.find(s=>String(s.id)===String(filters.species_id))?.name,filters.health].filter(Boolean).join(' · ');
  const action=c=>c.latest_health==='Unknown'?'Confirm health':c.priority==='High'?'Inspect site':c.needs_follow_up?'Follow up':'Schedule a visit';
  node.innerHTML=`${title(a.scope==='personal'?'My analytics':'Analytics')}
    <div class="analytics-tools"><a class="button outline" href="#clusters">Mangrove timeline</a>${a.capabilities.can_export_pdf?'<button type="button" id="analytics-pdf" class="outline">Export PDF</button>':''}</div>
    <details class="analytics-filter-panel"><summary>Filters <small>${esc(selection)}</small></summary>
    <form class="filters analytics-filters" id="analytics-filters" role="search">
      ${field('date_from','From',filters.date_from,'date','required')}${field('date_to','To',filters.date_to,'date','required')}
      ${select('cluster_id','Site',[['','All sites'],...options.clusters.map(c=>[c.id,c.name])],filters.cluster_id)}
      ${select('species_id','Species',[['','All species'],...options.species.map(s=>[s.id,s.name])],filters.species_id)}
      ${select('health','Latest health',[['','All conditions'],...Object.keys(colors).map(h=>[h,h])],filters.health)}
      <div class="actions"><button>Apply</button><a class="button outline" href="#analytics">Reset</a></div><p class="error" role="alert"></p>
    </form></details>
    <div class="stats analytics-overview"><article class="stat"><strong>${a.verification.verified}</strong><span>Total Verified Reports</span></article><article class="stat"><strong>${sites.length}</strong><span>Sites</span></article><a class="stat" href="#priority-areas" data-section="priority-areas"><strong>${priority.length}</strong><span>Needs Attention</span></a></div>
    <div class="row analytics-charts"><section class="card"><h2>Site health</h2><p class="muted chart-unit">Latest verified visit</p>${total?'<div class="chart"><canvas id="site-health-chart" role="img" aria-label="Latest site health; exact figures follow."></canvas></div>':'<p class="empty">No verified sites yet.</p>'}<ul class="analytics-legend">${counts}</ul></section>
    <section class="card"><h2>Monthly observations</h2><p class="muted chart-unit">Verified reports</p>${hasTrend?'<div class="chart"><canvas id="health-trend-chart" role="img" aria-label="Monthly health observations; exact figures are available in Chart data."></canvas></div>':'<p class="empty">No verified visits in this period.</p>'}</section></div>
    <details class="card analytics-data"><summary>Chart data</summary><div class="table-wrap"><table><thead><tr><th>Month</th><th>Healthy</th><th>Stressed</th><th>At Risk</th><th>Unknown</th><th>Visits</th></tr></thead><tbody>${trend.map(m=>`<tr><td>${esc(m.month_label)}</td>${Object.keys(colors).map(h=>`<td>${m.health?.[h]??'—'}</td>`).join('')}<td>${m.verified_reports||'No visits'}</td></tr>`).join('')}</tbody></table></div><p><a href="#reports?${new URLSearchParams({status:'verified',analytics_scope:'1',...Object.fromEntries(Object.entries(filters).filter(([,v])=>v))})}">View reports</a></p></details>
    <section class="card analytics-followups"><h2>Follow-ups</h2><div class="monitoring-progress"><p><strong>${progress.followup_reports??0}</strong> verified</p><p><strong>${progress.awaiting_followup??0}</strong> awaiting a visit</p></div><p class="muted">Improved: ${progress.improved??0} · Unchanged: ${progress.unchanged??0} · Declined: ${progress.declined??0}</p></section>
    <section class="card analytics-map"><h2>Site map</h2>${a.map.length?'<div id="analytics-map" class="map"></div>':'<p class="empty">No mapped sites.</p>'}<div class="legend">${Object.entries(colors).map(([h,c])=>`<span style="--c:${c}">${esc(h)}</span>`).join('')}</div></section>
    <section class="card" id="priority-areas" tabindex="-1"><h2>Needs Attention</h2>${priority.length?`<div class="table-wrap"><table class="priority-table"><thead><tr><th>Site</th><th>Health</th><th>Next step</th></tr></thead><tbody>${priority.map(c=>`<tr><td data-label="Site"><strong>${esc(c.name)}</strong><small>${esc(c.last_monitoring_date)}</small><a href="#cluster/${c.id}">Timeline</a></td><td data-label="Health">${pill(c.latest_health)}<small>${esc(c.priority==='Insufficient data'?'Needs review':c.priority+' priority')}</small>${['Improved','Unchanged','Declined'].includes(c.trend)?`<small>${esc(c.trend)}</small>`:''}</td><td data-label="Next step"><strong>${esc(action(c))}</strong><p><a href="#report/${c.report_id}">${esc(c.report_code)}</a></p></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">No sites need attention.</p>'}</section>`;
  back();
  node.querySelector('[data-section]').onclick=e=>{e.preventDefault();const section=node.querySelector('#priority-areas');section.scrollIntoView({behavior:'smooth',block:'start'});section.focus({preventScroll:true});};
  node.querySelector('#analytics-filters').onsubmit=e=>{e.preventDefault();const values=formValues(e.target);if(values.date_from>values.date_to){showError(e.target.querySelector('.error'),'Start date must be on or before end date.');return;}location.hash=`analytics?${new URLSearchParams(Object.fromEntries(Object.entries(values).filter(([,v])=>v)))}`;};
  node.querySelector('#analytics-pdf')?.addEventListener('click',async e=>{e.target.disabled=true;try{await download('export-analytics.php','ManGROOVES-monitoring-report.pdf',Object.fromEntries(Object.entries(filters).filter(([,v])=>v)));}catch(error){toast(friendly(error));}finally{e.target.disabled=false;}});
  const charts=[];
  if(total)charts.push(new Chart(node.querySelector('#site-health-chart'),{type:'doughnut',data:{labels:Object.keys(health),datasets:[{data:Object.values(health),backgroundColor:Object.keys(health).map(h=>colors[h])}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw} sites (${(ctx.raw/total*100).toFixed(1)}%)`}}}}}));
  if(hasTrend)charts.push(new Chart(node.querySelector('#health-trend-chart'),{type:'bar',data:{labels:trend.map(m=>m.month_label),datasets:Object.entries(colors).map(([h,c])=>({label:h,data:trend.map(m=>m.health?.[h]??null),backgroundColor:c}))},options:{maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{precision:0},title:{display:true,text:'Verified visits'}}}}}));
  const canvas=a.map.length?map(node.querySelector('#analytics-map'),a.map):null;
  return ()=>{charts.forEach(c=>c.destroy());canvas?.remove();};
}

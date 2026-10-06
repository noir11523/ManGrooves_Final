import './style.css';
import './polish.css';
import {bindMenu} from './navigation.js';
import {expertApplicationsPage,certificateSettingsPage,certificateQr} from './account-admin.js';
import {registrationPage,recoveryPage,signInPage} from './auth-pages.js';
import Chart from 'chart.js/auto';
import { initialize, api, login, logout, changePassword, friendly } from './client.js';
import { $, $$, esc, pill, displayLabel, reportStatus, field, select, formValues, errorBox, showError, toast, confirm, pager, reportRows, reportTable, map, privatePhoto, download } from './ui.js';
import { reportWizard, reportDraft } from './report-form.js';
import {reportMapPage} from './report-map.js';
import { checklistPage, adminPage } from './admin.js';
import {listFilters,bindListFilters,listRoute} from './list-filters.js';

let viewer = null, ready = false, cleanup = () => {}, cleanupMenu = () => {}, previousHash = location.hash, navigating = false;
const roleLabel = {guardian: 'Coastal Guardian', expert: 'Expert', system_admin: 'Administrator'};
const legend = '<div class="legend"><span style="--c:#3f7f43">Healthy</span><span style="--c:#cf961d">Stressed</span><span style="--c:#c6513c">At Risk</span><span style="--c:#788778">Unknown</span></div>';
function set(node, html) { if (!node.isConnected) throw new DOMException('Navigation changed', 'AbortError'); node.innerHTML = html; }
function title(name, subtitle = '') { return `<div class="page-head"><div><h1>${esc(name)}</h1>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}</div><button class="outline" id="back">← Back</button></div>`; }
function back() { $('#back')?.addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = 'dashboard'; }); }
function authLayout(html) { $('#app').innerHTML = `<header class="public-header"><a class="brand" href="#home">♣ ManGROOVES</a><a href="#home">← Home</a></header><main class="auth card">${html}</main>`; }
function bind(form, action) {
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = event.submitter ?? form.querySelector('button[type=submit]');
    if (button?.disabled) return;
    if (button) button.disabled = true;
    const error = form.querySelector('.error'); if (error) error.textContent = '';
    try { await action(formValues(form)); } catch (e) { if (error) showError(error, friendly(e)); else toast(friendly(e)); }
    finally { if (button) button.disabled = false; }
  });
}
function landing() {
  $('#app').innerHTML = `<header class="public-header"><a class="brand" href="#home">♣ ManGROOVES</a><nav><a href="#about">About</a><a href="#how">How it works</a><a href="#explore">Explore</a></nav></header>
    <main><section class="hero"><p class="eyebrow">Coastal care, together</p><h1>Small observations.<br>Healthier mangroves.</h1><p>Record what you see, learn from local experts, and follow the health of your coastal community.</p><div class="actions"><a class="button" href="#register">Become a guardian</a><a class="button outline" href="#login">Sign in</a></div></section>
    <section class="features" id="about-section"><article class="card"><h2>Coastal protection</h2><p>Mangrove roots slow waves and help keep soil in place.</p></article><article class="card"><h2>Shelter for wildlife</h2><p>Mangrove roots shelter fish, crabs, birds, and other wildlife.</p></article><article class="card"><h2>Climate protection</h2><p>Mangroves store carbon and help communities adapt to change.</p></article><article class="card"><h2>Community care</h2><p>Repeat visits help us see how each site changes over time.</p></article></section><section class="hero" id="how-section"><h2>How it works</h2><p>1. Take a field photo, place your map pin, and answer the checklist.</p><p>2. Review the suggested health and species before submitting.</p><p>3. Healthy reports are verified automatically. Experts review the others. Return to the site to track its changes.</p><a class="button outline" href="#explore">Explore the cluster map</a></section></main><footer><a href="#privacy">Privacy notice</a> · ManGROOVES</footer>`;
}
async function explorePage() {
  authLayout('<h1>Explore mangrove sites</h1><p class="muted">Explore sites with verified reports.</p><div id="explore-map" class="map large"></div>');
  const node = $('.auth'); node.style.maxWidth = '1100px';
  const data = await api('explore.php', {anonymous: true});
  if (!node.isConnected) return;
  const canvas = map($('#explore-map'), data.clusters); cleanup = () => canvas.remove();
  node.insertAdjacentHTML('beforeend', `${legend}<p class="muted">Sign in to view the health history available to your account.</p><a class="button" href="#login">Sign in</a>`);
}
async function loginPage() {
  return signInPage(authLayout);
}
async function registerPage(){return registrationPage(authLayout);}
function shell(route) {
  const admin = viewer.role === 'system_admin', staff = viewer.role !== 'guardian';
  const links = [['dashboard', 'Dashboard'], ['reports', staff ? 'Reports' : 'My reports'], ...(viewer.role!=='system_admin' ? [['submit','Submit Report'],['badges','Badges']]:[]), ...(staff?[['verification','Review reports'],['history','Review history']]:[]),
    ['label', 'Clusters'], ['analytics', 'Analytics'], ['clusters', 'Health history'], ['growth', 'Growth timeline'],
    ...(admin ? [['label', 'Administration'], ['checklist', 'Health checklist'], ['users', 'Users'], ['expert-applications','Expert applications'], ['certificate-settings','Certificate signer'], ['species', 'Species'], ['badge-settings', 'Badge settings'], ['audit', 'Audit logs']] : []),
    ['label', 'Account'], ['profile', 'Profile settings']];
  $('#app').innerHTML = `<a class="skip-link" href="#content">Skip to content</a><div class="shell"><aside class="sidebar" id="site-menu" aria-label="Main menu"><button class="menu-close outline" aria-label="Close menu">Close menu ×</button><a class="brand" href="#dashboard">♣ ManGROOVES</a><nav aria-label="Main navigation">${links.map(([key, label]) => key === 'label' ? `<span class="nav-label">${label}</span>` : `<a class="${route === key ? 'active' : ''}" href="#${key}" ${route === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav></aside><button class="menu-backdrop" hidden tabindex="-1" aria-label="Close menu"></button><div class="shell-main"><header class="topbar"><div><button class="mobile-menu outline" aria-label="Open menu" aria-controls="site-menu" aria-expanded="false">☰ Menu</button></div><div class="user"><a class="icon-button" href="#notifications" aria-label="Notifications"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></a><span class="avatar">${esc(viewer.first_name?.[0] ?? viewer.full_name[0])}</span><div class="user-name"><strong>${esc(viewer.full_name)}</strong><small>${esc(roleLabel[viewer.role])}</small></div><button class="outline" id="signout">Sign out</button></div></header><main class="workspace" id="content" tabindex="-1"><p class="loading">Loading…</p></main></div></div>`;
  cleanupMenu = bindMenu($('.shell'));
  $('.skip-link').onclick = event => { event.preventDefault(); $('#content').focus(); };
  $('#signout').onclick = async () => { if (await confirm('Sign out?', 'You can sign in again to continue your saved draft on this device.')) { await reportDraft.flush(); reportDraft.reset(); await logout(); } };
  return $('#content');
}
async function dashboardPage(node) {
  const data = await api('dashboard.php'), s = data.stats;
  set(node, `<p class="eyebrow">Your coastal workspace</p><h1>Hi, ${esc(viewer.first_name || viewer.full_name.split(' ')[0])}!</h1><p class="muted">Your latest mangrove updates.</p><div class="stats">${[
    ['Total reports', s.total_reports, 'reports'], ['Verified', s.verified_reports, 'reports?status=verified'], ['Pending', s.pending_reports, 'reports?status=pending'],
    ['Rejected', s.rejected_reports, 'reports?status=rejected'], ['Needs attention', s.needs_attention, 'reports?needs_attention=1'], ['Clusters', s.map_clusters, 'clusters']
  ].map(([label, value, path]) => `<a class="stat" href="#${path}"><strong>${value ?? 0}</strong><span>${label} →</span></a>`).join('')}</div>
    ${data.reminders.length ? `<section class="card"><h2>Follow-ups due</h2>${data.reminders.map(r => `<p><a href="#submit?parent=${r.id}&cluster=${r.cluster_id}">${esc(r.cluster_name ?? r.report_code)}</a> · ${esc(r.next_followup_date)}</p>`).join('')}</section>` : ''}
    <h2>Latest reports</h2>${reportRows(data.latest_reports)}<h2>Cluster health map</h2>${legend}<div id="map" class="map"></div><p class="muted">Select a cluster to see its visits.</p>`);
  const canvas = map($('#map'), data.clusters); cleanup = () => canvas.remove();
}
async function reportsPage(node, query, verification = false) {
  const data = await api(verification ? 'verification.php' : 'reports.php', {query});
  const filter = query.needs_attention === '1' ? 'attention' : query.status ?? '';
  const base = verification ? 'verification' : 'reports', guardian = viewer.role === 'guardian';
  const current = verification ? query.verified_attention === '1' ? 'verified_attention' : query.status || 'pending' : filter;
  const filtered = Boolean(filter || query.health || query.q || query.date_from || query.date_to || query.verified_attention);
  const route = values => `#${base}${Object.keys(values).length ? `?${new URLSearchParams(values)}` : ''}`;
  const cardQuery = key => {
    const values={...query};for(const field of ['page','status','needs_attention','verified_attention'])delete values[field];
    if(key==='verified_attention')values.verified_attention='1';else values.status=key;
    return route(values);
  };
  const summary = data.summary ?? {};
  const cards = verification ? `<div class="verification-stats" aria-label="Filter verification reports">${[['pending','Pending'],['verified_attention','Verified needing attention'],['verified','Verified'],['rejected','Rejected']].map(([key,label])=>`<a class="stat ${current===key?'selected':''}" href="${esc(cardQuery(key))}" ${current===key?'aria-current="true"':''}><span>${label}</span><strong>${summary[key]??0}</strong></a>`).join('')}</div><p class="muted verification-help">${current==='verified_attention'?'Verified reports with stressed, at-risk or unknown health.':current==='pending'?'Review pending reports below. Your own submissions are excluded.':'View completed reports below. Your own submissions are excluded.'}</p>` : '';
  const reset = verification ? route({...(query.verified_attention==='1'?{verified_attention:'1'}:{status:query.status||'pending'})}) : route(query.cluster_id?{cluster_id:query.cluster_id}:{});
  set(node, `${title(verification ? 'Verification queue' : guardian ? 'My reports' : 'Reports', verification ? 'Review community observations and follow up on site health.' : guardian ? 'Your submitted observations and their review status.' : 'Community reports available to your account.')}
    ${cards}<form id="filters" class="filters list-filters report-filters" role="search">
    ${field('q','Search',query.q??'','search',`maxlength="200" placeholder="${guardian?'Report number, site or species':'Report number, name, site or species'}"`)}
    ${!verification?select('status_filter','Status',[['','All reports'],['verified','Verified'],['pending','Pending'],['attention','Needs attention'],['rejected','Rejected']],filter):''}
    ${select('health','Health',[['','All health'],...['Healthy','Stressed','At Risk','Unknown'].map(v=>[v,v])],query.health)}
    ${field('date_from','From',query.date_from??'','date')}${field('date_to','To',query.date_to??'','date')}
    <div class="actions"><button type="submit">Filter</button><a class="button outline" href="${esc(reset)}">Reset</a></div><p class="error" role="alert"></p></form>
    <div class="report-results"><p class="result-count" role="status">${data.total??data.items.length} report${(data.total??data.items.length)===1?'':'s'}</p><p class="muted">${verification&&current==='pending'?'Oldest pending reports appear first.':'Newest reports appear first.'}</p></div>
    ${data.items.length?reportTable(data.items,{guardian,verification}):`<p class="empty">${filtered?'No reports match. Try another search or reset the filters.':verification?'No reports waiting for review.':'No reports here yet.'}</p>`}${pager(data,base,Object.fromEntries(Object.entries(query).filter(([key])=>key!=='page')))}`);
  back();$('#filters').addEventListener('submit',event=>{
    event.preventDefault();const values=formValues(event.target),selected=values.status_filter;delete values.status_filter;
    if(values.date_from&&values.date_to&&values.date_from>values.date_to){showError(event.target.querySelector('.error'),'From must be on or before To.');return;}
    if(verification){if(query.verified_attention==='1')values.verified_attention='1';else values.status=query.status||'pending';}
    else if(selected==='attention')values.needs_attention='1';else if(selected)values.status=selected;
    if(query.cluster_id)values.cluster_id=query.cluster_id;
    location.hash=route(Object.fromEntries(Object.entries(values).filter(([,value])=>value))).slice(1);
  });
}
async function reportPage(node, id) {
  const data = await api('report.php', {query: {id}}), r = data.report, staff = viewer.role !== 'guardian', canReview = staff && r.user_id !== viewer.id;
  const rows = {'Location': r.cluster_name ?? r.sitio_name, 'Barangay': r.barangay_name, 'Coordinates': `${r.latitude}, ${r.longitude}`, 'Living mangroves': r.observed_alive_count,
    'Health score': r.health_score == null ? 'Needs expert review' : `${r.health_score} / ${r.health_max_score}`, 'Species': r.final_species_name ?? r.suggested_species_name ?? 'Unassigned', 'Submitted': r.submitted_at};
  set(node, `${title(r.report_code)}<div class="actions">${pill(reportStatus(r))}${pill(r.final_health ?? r.suggested_health)}${r.status === 'verified' && r.expert_id == null ? '<small>Verified automatically</small>' : ''}</div><div class="row" style="margin-top:20px"><section class="card"><img id="report-photo" class="preview-photo" alt="Field photo"><p>${esc(r.guardian_remarks ?? '')}</p></section><section class="card"><dl class="summary">${Object.entries(rows).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v ?? '—')}</dd>`).join('')}</dl>${r.cluster_id ? `<p><a href="#cluster/${r.cluster_id}">Health history</a> · <a href="#cluster/${r.cluster_id}?tab=growth">Growth timeline</a></p>` : ''}</section></div>
    <section class="card" style="margin-top:20px"><h2>Checklist answers</h2>${r.observations.map(c => `<p><strong>${esc(c.name)}</strong><br>${c.options.map(o => `${esc(o.label)}${c.score_group === 'health' ? ` (${o.points == null ? 'Not scored' : `${o.points}/2`})` : ''}`).join(', ')}</p>`).join('')}</section>
    ${r.expert_feedback ? `<section class="card"><h2>Expert feedback</h2><p>${esc(r.expert_feedback)}</p></section>` : ''}
    ${canReview && r.status === 'pending' ? '<section class="card" style="margin-top:20px" id="review-area"><p>Loading review choices…</p></section>' : ''}
    ${staff ? `<section class="card" style="margin-top:20px"><h2>Review history</h2>${r.verification_history.length ? r.verification_history.map(v => `<p><strong>${esc(displayLabel(v.action))} · ${esc(v.verifier_name)}</strong><br>${esc(v.previous_health ?? 'Unknown')} → ${esc(v.new_health ?? 'Unconfirmed')}<br><small>${esc(v.created_at)}</small>${v.comment ? `<br>${esc(v.comment)}` : ''}</p>`).join('') : '<p>No reviews yet.</p>'}</section>` : ''}`);
  back(); if (r.photo_url) privatePhoto($('#report-photo'), r.photo_url);
  if (!canReview || r.status !== 'pending') return;
  const catalog = await api('species.php');
  if (!node.isConnected) return;
  $('#review-area').innerHTML = `<h2>Review this report</h2><p>Check the photo and answers, then choose your decision.</p><form id="review">${errorBox}${select('action', 'Decision', [['confirm', 'Confirm suggestions'], ['correct', 'Correct health or species'], ['reject', 'Reject with feedback']], r.suggested_health === 'Unknown' ? 'correct' : 'confirm')}<div id="corrections" class="row">${select('final_health', 'Final health', ['Healthy', 'Stressed', 'At Risk'].map(v => [v, v]), r.suggested_health)}${select('final_species_id', 'Final species', [['', 'Unassigned'], ...catalog.species.map(s => [s.id, s.scientific_name])], r.suggested_species_id)}${select('rarity_level', 'Rarity', ['Unassigned', 'Common', 'Vulnerable', 'Rare'].map(v => [v, v]), r.rarity_level)}</div><p class="muted">Saving this review removes the Needs attention tag.</p><label class="field"><span>Feedback</span><textarea name="expert_feedback" maxlength="5000"></textarea></label><button type="submit">Save review</button></form>`;
  const update = () => { $('#corrections').hidden = $('#review [name=action]').value !== 'correct'; $('#review textarea').required = $('#review [name=action]').value === 'reject'; }; update(); $('#review [name=action]').onchange = update;
  bind($('#review'), async values => {
    if (!(await confirm('Save this review?', 'Your decision and feedback will be saved.'))) return;
    await api('review.php', {body: {...values, report_id: Number(id)}}); toast('Review saved.'); await reportPage(node, id);
  });
}
async function analyticsPage(node, query) {
  const {analytics: a} = await api('analytics.php', {query}), v = a.verification;
  set(node, `${title('Analytics', a.scope === 'personal' ? 'Your reports only.' : 'Reports from all users.')}
    <form id="dates" class="filters">${field('date_from', 'From', a.filters.date_from, 'date')}${field('date_to', 'To', a.filters.date_to, 'date')}<button>Apply</button>${a.capabilities.can_export_pdf ? '<button type="button" id="pdf" class="outline">Generate PDF</button>' : ''}</form>
    <div class="stats">${[['Total reports', v.total], ['Verified', v.verified], ['Pending', v.pending], ['Rejected', v.rejected], ['Needs attention', a.high_risk_total], ...(a.capabilities.can_view_survival ? [['Current survival', a.overall_survival == null ? '—' : `${a.overall_survival}%`]] : [])].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div>
    <div class="row"><section class="card"><h2>Verified health</h2><div class="chart"><canvas id="health-chart"></canvas></div></section><section class="card"><h2>${a.capabilities.can_view_survival ? 'Monthly survival' : 'Verified reports by month'}</h2><div class="chart"><canvas id="growth-chart"></canvas></div></section></div><h2>Reports needing review</h2>${a.high_risk.length ? `<div class="list">${a.high_risk.map(r => `<a class="report-row" href="#report/${r.id}"><strong>${esc(r.cluster_name ?? r.report_code)}</strong>${pill(r.final_health)}</a>`).join('')}</div>` : '<p class="empty">No reports waiting for review in this period.</p>'}`);
  back(); $('#dates').onsubmit = event => { event.preventDefault(); location.hash = `analytics?${new URLSearchParams(formValues(event.target))}`; };
  $('#pdf')?.addEventListener('click', async event => { event.target.disabled = true; try { await download('export-analytics.php', 'ManGROOVES-analytics.pdf', query); } catch (e) { toast(friendly(e)); } finally { event.target.disabled = false; } });
  const charts = [new Chart($('#health-chart'), {type: 'doughnut', data: {labels: Object.keys(a.health), datasets: [{data: Object.values(a.health), backgroundColor: ['#5b9461', '#dfb146', '#c96950']}]}, options: {maintainAspectRatio: false}}),
    new Chart($('#growth-chart'), {type: 'line', data: {labels: a.growth.map(p => p.month_label), datasets: [{label: a.capabilities.can_view_survival ? 'Survival (%)' : 'Verified reports', data: a.growth.map(p => p[a.capabilities.can_view_survival ? 'survival_rate' : 'verified_reports']), borderColor: '#35713d', tension: 0}]}, options: {maintainAspectRatio: false, scales: {y: {beginAtZero: true, ...(a.capabilities.can_view_survival ? {max: 100} : {})}}}})];
  cleanup = () => charts.forEach(c => c.destroy());
}
async function clustersPage(node, growth = false, query = {}) {
  const {clusters} = await api('clusters.php', {query});
  set(node, `${title(growth ? 'Growth timeline' : 'Health history', 'Select a cluster to see its visits.')}<div id="map" class="map large"></div>${legend}<h2>Clusters</h2>${clusters.length ? `<div class="list">${clusters.map(c => `<a class="report-row" href="#cluster/${c.id}?tab=${growth ? 'growth' : 'health'}"><div><strong>${esc(c.name)}</strong><small>${c.verified_count} verified visits · ${esc(c.barangay_name)}</small></div>${pill(c.latest_health)}</a>`).join('')}</div>` : '<p class="empty">Clusters appear after reports are verified.</p>'}`);
  node.querySelector('.page-head').insertAdjacentHTML('afterend',listFilters(query,[['health','Health',[['','All health'],...['Healthy','Stressed','At Risk','Unknown'].map(v=>[v,v])]]],'Cluster name, code, or barangay'));
  bindListFilters(node,query,q=>listRoute(growth?'growth':'clusters',q),clusters.length);
  if (!clusters.length && (query.q || query.health)) node.querySelector('.empty').textContent='No clusters match. Try another search or clear the filters.';
  back(); const canvas = map($('#map'), clusters, {timelineMode:growth?'growth':'health'}); cleanup = () => canvas.remove();
}
async function timelinePage(node,id,query){
  const {cluster,timeline}=await api('cluster.php',{query:{id}}),growth=query.tab==='growth';
  const ordered=[...timeline].sort((a,b)=>a.submitted_at.localeCompare(b.submitted_at)||a.id-b.id);
  const counts=ordered.filter(r=>r.observed_alive_count!=null),entries=growth?counts:[...ordered].reverse();
  const label=growth?'Growth timeline':'Health history';
  set(node,`${title(label,cluster.name)}<p class="muted">${growth?'Living mangroves counted per visit. A different survey area can change the count; this is not tree height.':'Verified health results at this site, newest first.'}</p>${entries.length?'<section class="card"><div class="chart"><canvas id="visit-chart"></canvas></div></section>':''}<div class="timeline" style="margin-top:24px">${entries.map((r,i)=>`<article class="card visit"><small>${esc(r.submitted_at.slice(0,10))} · Report #${r.id}</small><h2>${growth?esc(r.observed_alive_count)+' living mangroves':esc(r.health)}</h2>${growth?`<p>${i?(r.observed_alive_count-counts[i-1].observed_alive_count>=0?'+':'')+(r.observed_alive_count-counts[i-1].observed_alive_count)+' since last visit':'First count'}</p>`:'<p>'+esc(r.species_name??'Species not confirmed')+'</p>'}${r.can_view_details?`<a href="#report/${r.id}">View report</a>`:'<small>Community report</small>'}</article>`).join('')||'<p class="empty">No verified visits yet.</p>'}</div>`);back();
  if(!entries.length)return;
  const healthValues={'At Risk':0,Stressed:1,Healthy:2},points=growth?counts:ordered;
  const chart=new Chart($('#visit-chart'),{type:'line',data:{labels:points.map(r=>r.submitted_at.slice(0,10)),datasets:[{label:growth?'Living mangroves':'Health',data:points.map(r=>growth?r.observed_alive_count:healthValues[r.health]??null),borderColor:'#35713d',pointRadius:5,tension:0,stepped:!growth,spanGaps:false}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>growth?c.parsed.y+' living mangroves':['At Risk','Stressed','Healthy'][c.parsed.y]}}},scales:{y:growth?{beginAtZero:true,ticks:{precision:0}}:{min:0,max:2,ticks:{stepSize:1,callback:v=>['At Risk','Stressed','Healthy'][v]}}}}});cleanup=()=>chart.destroy();
}
async function notificationsPage(node, query) {
  const data = await api('notifications.php', {query});
  set(node, `${title('Notifications', `${data.unread} unread`)}<button id="mark-all" class="outline" ${data.unread ? '' : 'hidden'}>Mark all read</button><div class="list" style="margin-top:20px">${data.notifications.map(n => `<button class="report-row notification" data-id="${n.id}" data-report="${n.report_id ?? ''}"><div><strong>${n.read_at ? '' : '● '}${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(n.created_at.slice(0, 10))}</small></div></button>`).join('') || '<p class="empty">Report activity and reminders will appear here.</p>'}</div>${pager(data, 'notifications')}`); back();
  $('#mark-all').onclick = async () => { try { await api('notifications.php', {body: {action: 'mark_all'}}); await notificationsPage(node, query); } catch (e) { toast(friendly(e)); } };
  $$('.notification').forEach(n => n.onclick = async () => { try { await api('notifications.php', {body: {action: 'mark_read', id: Number(n.dataset.id)}}); if (n.dataset.report) location.hash = `report/${n.dataset.report}`; else await notificationsPage(node, query); } catch (e) { toast(friendly(e)); } });
}
async function profilePage(node) {
  const {user, barangays} = await api('profile.php');
  set(node, `${title('Profile settings')}<div class="row"><section class="card"><h2>Your details</h2><form id="profile">${errorBox}${field('first_name', 'First name', user.first_name, 'text', 'required maxlength="80"')}${field('last_name', 'Last name', user.last_name, 'text', 'required maxlength="80"')}${field('email', 'Email', user.email, 'email', 'readonly')}<small>Your email stays the same.</small>${field('phone', 'Phone (optional)', user.phone ?? '', 'tel')}${select('barangay_id', 'Barangay', [['', 'Choose your barangay'], ...barangays.map(b => [b.id, b.name])], user.barangay_id, viewer.role === 'guardian' ? 'required' : '')}<button type="submit">Save profile</button></form></section><section class="card"><h2>Change password</h2><p class="muted">Use 8–25 characters.</p><form id="password">${errorBox}${field('current', 'Current password', '', 'password', 'required autocomplete="current-password"')}${field('next', 'New password', '', 'password', 'required minlength="8" maxlength="25" autocomplete="new-password"')}${field('confirmation', 'Confirm new password', '', 'password', 'required minlength="8" maxlength="25" autocomplete="new-password"')}<button type="submit">Change password</button></form></section></div>`); back();
  bind($('#profile'), async values => { const result = await api('profile.php', {body: values}); viewer = result.user; toast('Profile updated.'); });
  bind($('#password'), async values => { if (await confirm('Change password?', 'You will be signed out on all devices.')) { await changePassword(values.current, values.next, values.confirmation); toast('Password changed. Sign in again.'); } });
}
async function badgesPage(node) {
  const {badges} = await api('badges.php');
  set(node, `${title('Your badges', 'Every verified observation helps.')}<div class="row">${badges.map(b => `<article class="card"><h2>${esc(b.badge_name)}</h2><p>${esc(b.description)}</p><div class="growth-bar"><span style="width:${b.progress_percent}%"></span></div><small>${b.current_value} / ${b.target_value}</small>${b.earned ? `<p>${pill('Earned')}</p><button class="outline certificate" data-id="${b.id}">Download certificate</button> <button class="outline certificate-qr" data-id="${b.id}">Show QR</button>` : ''}</article>`).join('')}</div>`); back();
  $$('.certificate-qr').forEach(button=>button.onclick=()=>certificateQr(button));
  $$('.certificate').forEach(b => b.onclick = async () => { try { await download('certificate.php', 'ManGROOVES-certificate.pdf', {badge_id: b.dataset.id}); } catch (e) { toast(friendly(e)); } });
}
async function historyPage(node, query) {
  const data = await api('validation-history.php', {query});
  set(node, `${title('Review history', 'Past health and species reviews.')}<div class="list">${data.items.map(v => `<a class="report-row" href="#report/${v.report_id}"><div><strong>${esc(v.report_code)} · ${esc(displayLabel(v.action))}</strong><p>${esc(v.verifier_name ?? v.reviewer ?? 'Automatic check')} · ${esc(v.created_at)}</p><small>${esc(v.previous_health ?? 'Unknown')} → ${esc(v.new_health ?? v.health ?? 'Unconfirmed')}</small></div>${pill(v.new_status ?? v.status)}</a>`).join('') || '<p class="empty">No reviews yet.</p>'}</div>${pager(data, 'history')}`); back();
  node.querySelector('.list').insertAdjacentHTML('beforebegin',listFilters(query,[['action','Decision',[['','All decisions'],['confirm','Confirmed'],['correct','Corrected'],['reject','Rejected'],['auto_verify','Automatic verification']]]],'Report number or reviewer'));
  node.querySelector('.pagination')?.remove();node.insertAdjacentHTML('beforeend',pager(data,'history',query));
  bindListFilters(node,query,q=>listRoute('history',q),data.total);
  if (!data.items.length && (query.q || query.action)) node.querySelector('.empty').textContent='No reviews match. Try another search or clear the filters.';
}
function privacyPage() {
  $('#app').innerHTML = `<header class="public-header"><a class="brand" href="#home">♣ ManGROOVES</a><a class="button outline" href="#home">Back to home</a></header><main class="privacy card"><h1>Privacy notice</h1><p>ManGROOVES records your name, email, barangay, optional phone number, and field reports. Reports include a photo, location, checklist answers, and visit notes.</p><p>Your information is stored using Supabase. Guardians see their own private reports. Authorized experts and administrators can review reports and manage the monitoring program. Verified cluster summaries help the community follow site health.</p><p>Device location is requested automatically when you open the location step. If unavailable, GeoJS may use your public IP address to show an approximate area. Approximate areas are never saved as exact report pins. You can search or place a pin yourself. Personal photo metadata is removed before new photos are stored.</p><p>Your password is handled by Supabase Auth. Your email address cannot be changed through this app. Ask the program administrator about access, corrections, or account removal.</p><p>Expert applicants enter a work or professional ID code for admin review. Only administrators can view the code. Older ID photos remain private. Field reports should only contain mangrove photos. Address searches are sent to Photon; do not enter private home details. Certificate QR links allow anyone with the link to download the certificate for 10 minutes.</p></main>`;
}
async function route() {
  cleanup(); cleanupMenu(); cleanup = () => {}; cleanupMenu = () => {};
  const [raw, search = ''] = location.hash.slice(1).split('?'), [name, id] = (raw || 'home').split('/'), query = Object.fromEntries(new URLSearchParams(search));
  if (name === 'privacy') { privacyPage(); return; }
  if (!ready) return;
  if (!viewer) {
    if (name === 'register') return registerPage();
    if (name === 'forgot-password') return recoveryPage(authLayout);
    if (name === 'login') return loginPage();
    if (name === 'explore') return explorePage();
    if (['home', 'about', 'how'].includes(name)) { landing(); $(`#${name}-section`)?.scrollIntoView({behavior: 'smooth'}); return; }
    location.hash = 'login'; return;
  }
  if (['home', 'login', 'register'].includes(name)) { location.hash = 'dashboard'; return; }
  const staff = viewer.role !== 'guardian';
  if ((['submit', 'badges'].includes(name) && viewer.role==='system_admin') || (['verification', 'history'].includes(name) && !staff)
    || (['users','expert-applications','certificate-settings', 'species', 'badge-settings', 'audit', 'checklist'].includes(name) && viewer.role !== 'system_admin')) {
    location.hash = 'dashboard'; return;
  }
  const node = shell(name);
  try {
    switch (name) {
      case 'dashboard': return await dashboardPage(node);
      case 'reports': return await reportsPage(node, query);
      case 'verification': return await reportsPage(node, query, true);
      case 'report': return await reportPage(node, id);
      case 'analytics': return await analyticsPage(node, query);
      case 'clusters': return await clustersPage(node,false,query);
      case 'growth': return await clustersPage(node,true,query);
      case 'cluster': return await timelinePage(node, id, query);
      case 'history': return await historyPage(node, query);
      case 'notifications': return await notificationsPage(node, query);
      case 'profile': return await profilePage(node);
      case 'badges': return await badgesPage(node);
      case 'submit': cleanup = await reportWizard(node, query, viewer); return;
      case 'checklist': return await checklistPage(node);
      case 'expert-applications':return await expertApplicationsPage(node,query);
      case 'certificate-settings':return await certificateSettingsPage(node);
      case 'users': case 'species': case 'badge-settings': case 'audit': return await adminPage(node, name, query);
      default: set(node, '<h1>Page not found</h1><a href="#dashboard">Back to dashboard</a>');
    }
  } catch (error) {
    if (error.name === 'AbortError' || !node.isConnected) return;
    set(node, `<h1>Could not load this page</h1><p class="error">${esc(friendly(error))}</p><div class="actions"><button id="retry">Try again</button><a class="button outline" href="#dashboard">Back to home</a></div>`); $('#retry').onclick = route;
  }
}
if (document.getElementById('app')) window.addEventListener('hashchange', async () => {
  if (navigating) return;
  if (reportDraft.dirty && !location.hash.startsWith('#submit')) {
    navigating = true;
    await reportDraft.flush();
    navigating = false;
  }
  previousHash = location.hash;
  route().catch(error => toast(friendly(error)));
});
async function restoreAccount(account) {
  cleanup(); viewer = null;
  try { if (account) viewer = (await api('me.php')).user; }
  catch (error) {
    if ([401,403].includes(error.status)) { toast(friendly(error)); await logout(); return; }
    ready = false;
    authLayout(`<h1>Could not connect</h1><p>${esc(friendly(error))}</p><div class="actions"><button id="restore-retry">Try again</button><button class="outline" id="restore-logout">Sign in with another account</button></div>`);
    $('#restore-retry').onclick = () => restoreAccount(account);
    $('#restore-logout').onclick = logout;
    return;
  }
  ready = true;
  route().catch(error => toast(friendly(error)));
}
if (document.getElementById('app')) initialize(restoreAccount).catch(error => {
  landing(); const message = document.createElement('p'); message.className = 'notice'; message.textContent = friendly(error); $('.hero').prepend(message);
});

// The PHP host owns authentication, navigation, and the shared page layout.
// Reuse the same tested forms and charts as the cloud site inside that layout.
export async function renderEmbedded(name, node, query, user) {
  cleanup(); cleanup = () => {};
  viewer = user;
  const layout = html => { node.innerHTML = `<section class="auth card">${html}</section>`; };
  switch (name) {
    case 'register': return registrationPage(layout);
    case 'forgot-password': return recoveryPage(layout);
    case 'login': return signInPage(layout);
    case 'explore': {
      set(node, `${title('Explore mangrove sites')}<p>Find mangrove species and sites with verified reports.</p><form id="species-search" class="filters">${field('q','Search species','','search','placeholder="Common or scientific name"')}<button>Search</button><button class="outline" type="button" id="all-sites">Show all sites</button></form><div id="explore-map" class="map large"></div>${legend}<h2>Species</h2><div id="species-results" class="row"></div>`); back();
      const data = await api('explore.php', {anonymous:true}); let canvas=map($('#explore-map'),data.clusters);
      const showMap=items=>{canvas.remove();canvas=map($('#explore-map'),items);};
      const results=search=>{const q=search.trim().toLowerCase();$('#species-results').innerHTML=(data.species??[]).filter(s=>[s.scientific_name,s.common_name,s.local_name].some(v=>String(v??'').toLowerCase().includes(q))).map(s=>`<article class="card"><h3><em>${esc(s.scientific_name)}</em></h3><p>${esc(s.common_name)}${s.local_name?` · ${esc(s.local_name)}`:''}</p><p class="muted">${esc(s.family??'')} ${s.iucn_code?`· ${esc(s.iucn_code)}`:''}</p><button class="outline" data-show-species="${Number(s.id)}">Show on map</button></article>`).join('')||'<p class="empty">No species match your search.</p>';};results('');
      $('#species-search').onsubmit=event=>{event.preventDefault();results(formValues(event.target).q);};
      $('#all-sites').onclick=()=>showMap(data.clusters);
      $('#species-results').onclick=event=>{const button=event.target.closest('[data-show-species]');if(!button)return;const clusters=data.clusters.filter(c=>Number(c.species_id)===Number(button.dataset.showSpecies));showMap(clusters);if(!clusters.length)toast('No verified sites for this species yet.');$('#explore-map').scrollIntoView({block:'center',behavior:'smooth'});};
      cleanup=()=>canvas.remove();return;
    }
    case 'report-map': {
      set(node, `${title('Report map')}<div id="report-map-content"></div>`); back();
      cleanup=reportMapPage($('#report-map-content'),query);return;
    }
    case 'reports': return reportsPage(node,query);
    case 'verification': return reportsPage(node,query,true);
    case 'report': return reportPage(node,query.id);
    case 'analytics': return analyticsPage(node,query);
    case 'clusters': return clustersPage(node,false,query);
    case 'growth': return clustersPage(node,true,query);
    case 'cluster': return timelinePage(node,query.id,query);
    case 'history': return historyPage(node,query);
    case 'notifications': return notificationsPage(node,query);
    case 'profile': return profilePage(node);
    case 'badges': return badgesPage(node);
    case 'submit': cleanup=await reportWizard(node,query,viewer);return;
    case 'checklist': return checklistPage(node);
    case 'expert-applications': return expertApplicationsPage(node,query);
    case 'certificate-settings': return certificateSettingsPage(node);
    case 'users': case 'species': case 'badge-settings': case 'audit': return adminPage(node,name,query);
    default: throw new Error('Page not found.');
  }
}

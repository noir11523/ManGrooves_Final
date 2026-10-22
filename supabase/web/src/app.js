import {mangroveTimeline} from './timeline-page.js';
import {exploreSites} from './explore-page.js';
import {residentialAddressFields,formattedAddress,bindBarangayPicker,contactFields} from './address-fields.js';
import './observations.css';
import './style.css';
import './polish.css';
import './layout.css';
import {bindMenu,renderNavigation} from './navigation.js';
import {expertApplicationsPage,certificateSettingsPage} from './account-admin.js';
import {registrationPage,recoveryPage,signInPage,passwordField,bindPasswordToggles} from './auth-pages.js';
import {monitoringAnalytics} from './analytics-page.js';
import { initialize, api, login, logout, changePassword, friendly } from './client.js';
import { $, $$, esc, pill, speciesNames, displayLabel, reportStatus, field, select, formValues, errorBox, showError, toast, confirm, pager, reportRows, reportTable, map, privatePhoto, download, asset } from './ui.js';
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
    <section class="features" id="about-section"><article class="card"><h2>Coastal protection</h2><p>Mangrove roots slow waves and help keep soil in place.</p></article><article class="card"><h2>Shelter for wildlife</h2><p>Mangrove roots shelter fish, crabs, birds, and other wildlife.</p></article><article class="card"><h2>Climate protection</h2><p>Mangroves store carbon and help communities adapt to change.</p></article><article class="card"><h2>Community care</h2><p>Repeat visits help us see how each site changes over time.</p></article></section><section class="hero" id="how-section"><h2>How it works</h2><p>1. Take a field photo, place your map pin, and answer the checklist.</p><p>2. Review the suggested health and species before submitting.</p><p>3. Experts review every submitted observation. Return to the site to track its changes.</p><a class="button outline" href="#explore">Explore the cluster map</a></section></main><footer><a href="#privacy">Privacy notice</a> · ManGROOVES</footer>`;
}
async function explorePage() {
  authLayout('<p>Loading sites…</p>');const node=$('.auth');node.style.maxWidth='1100px';cleanup=await exploreSites(node,{},viewer);
}
async function loginPage() {
  return signInPage(authLayout);
}
async function registerPage(){return registrationPage(authLayout);}
function shell(route) {
  $('#app').innerHTML = `<a class="skip-link" href="#content">Skip to content</a><div class="shell"><aside class="sidebar" id="site-menu" aria-label="Main menu"><button class="menu-close outline" aria-label="Close menu">Close menu ×</button><a class="brand" href="#dashboard">♣ ManGROOVES</a><nav aria-label="Main navigation">${renderNavigation(viewer.role,route)}</nav></aside><button class="menu-backdrop" hidden tabindex="-1" aria-label="Close menu"></button><div class="shell-main"><header class="topbar"><div><button class="mobile-menu outline" aria-label="Open menu" aria-controls="site-menu" aria-expanded="false">☰ Menu</button></div><div class="user"><a class="icon-button" href="#notifications" aria-label="Notifications"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></a><a class="avatar" href="#profile" aria-label="Profile settings">${esc(viewer.first_name?.[0] ?? viewer.full_name[0])}</a><div class="user-name"><strong>${esc(viewer.full_name)}</strong><small>${esc(roleLabel[viewer.role])}</small></div><button class="outline" id="signout">Sign out</button></div></header><main class="workspace" id="content" tabindex="-1"><p class="loading">Loading…</p></main></div></div>`;
  cleanupMenu = bindMenu($('.shell'));
  $('.skip-link').onclick = event => { event.preventDefault(); $('#content').focus(); };
  $('#signout').onclick = async () => { if (await confirm('Sign out?', 'You can sign in again to continue your saved draft on this device.')) { await reportDraft.flush(); reportDraft.reset(); await logout(); } };
  return $('#content');
}
async function dashboardPage(node) {
  const data = await api('dashboard.php'), s = data.stats;
  set(node, `<h1>Dashboard</h1><p class="muted">Monitor mangrove reports, site conditions, and system activity.</p><div class="stats">${[
    ['Verified reports', s.total_reports, 'reports?status=verified'], ['Pending', s.pending_reports, viewer.role==='guardian'?'reports?status=pending':'reports?status=pending'],
    ['Rejected', s.rejected_reports, 'reports?status=rejected'], ['Needs attention', s.needs_attention, 'reports?needs_attention=1'], ['Monitored clusters', s.map_clusters, 'clusters']
  ].map(([label, value, path]) => `<a class="stat" href="#${path}"><strong>${value ?? 0}</strong><span>${label} →</span></a>`).join('')}</div>
    ${data.reminders.length ? `<section class="card"><h2>Follow-up requests</h2>${data.reminders.map(r => `<p><a href="#submit?parent=${r.id}&cluster=${r.cluster_id}">${esc(r.cluster_name ?? r.report_code)}</a> · ${esc(r.follow_up_note||'Awaiting follow-up')}</p>`).join('')}</section>` : ''}
    <h2>Latest reports</h2>${reportRows(data.latest_reports)}<h2>Mangrove site map</h2>${legend}<div id="map" class="map"></div><p class="muted">Tap or click a pin to view site details and its timeline.</p>`);
  const canvas = map($('#map'), data.clusters); cleanup = () => canvas.remove();
}
async function reportsPage(node, query, verification = false) {
  if(verification)query={...query,status:query.verified_attention==='1'?'':query.status||'pending',...(query.verified_attention==='1'?{needs_attention:'1'}:{})};
  if(viewer.role!=='guardian'&&query.view==='reviews')return historyPage(node,query);
  const guardian=viewer.role==='guardian',data=await api('reports.php',{query});
  const filter=query.needs_attention==='1'?'attention':query.status||'';
  set(node,`${title(guardian?'My reports':'All reports',guardian?'Your submitted observations and review status.':'Browse observations, review pending reports, and view earlier decisions.')}
    ${query.analytics_scope==='1'?'<p class="notice">These reports support the selected analytics, including earlier visits at matching sites. Apply filters below to start a new report search.</p>':''}
    ${!guardian?historyTabs(false):''}<form id="filters" class="filters list-filters report-filters" role="search">
    ${field('q','Search',query.q??'','search','maxlength="200" placeholder="Report number, site or species"')}
    ${select('status_filter','Review status',[['','All reports'],['pending','Pending'],['verified','Verified'],['attention','Needs attention'],['rejected','Rejected']],filter)}
    ${select('health','Mangrove condition',[['','All conditions'],...['Healthy','Stressed','At Risk','Unknown'].map(v=>[v,v])],query.health)}
    ${field('date_from','From',query.date_from??'','date')}${field('date_to','To',query.date_to??'','date')}
    <div class="actions"><button type="submit">Apply filters</button><a class="button outline" href="#reports">Reset</a></div>${errorBox}</form>
    <p class="result-count" role="status">${data.total??data.items.length} reports</p>
    ${data.items.length?reportTable(data.items,{guardian}):'<p class="empty">No reports match these filters.</p>'}${pager(data,'reports',Object.fromEntries(Object.entries(query).filter(([key])=>key!=='page')))}`);
  back();$('#filters').onsubmit=event=>{event.preventDefault();const values=formValues(event.target),selected=values.status_filter;delete values.status_filter;
    if(values.date_from&&values.date_to&&values.date_from>values.date_to){showError(event.target.querySelector('.error'),'From must be on or before To.');return;}
    if(selected==='attention')values.needs_attention='1';else if(selected)values.status=selected;
    if(query.cluster_id)values.cluster_id=query.cluster_id;
    listRoute('reports',Object.fromEntries(Object.entries(values).filter(([,v])=>v)));
  };
}
async function reportPage(node, id, reviewMode = false) {
  const data = await api('report.php', {query: {id}}), r = data.report, staff = viewer.role !== 'guardian', canReview = staff && r.user_id !== viewer.id;
  const rows = {...(staff?{'Submitted by':r.guardian_name}:{}),'Location': r.cluster_name ?? r.sitio_name, 'Barangay': r.barangay_name, 'Coordinates': `${r.latitude}, ${r.longitude}`, 'Living mangroves': r.observed_alive_count ?? 'Unable to count',
    'Health score': r.health_score == null ? 'Needs expert review' : `${r.health_score} / ${r.health_max_score}`, 'Submitted': r.submitted_at};
  set(node, `${title(r.report_code)}<div class="actions">${pill(reportStatus(r))}${pill(r.final_health ?? r.suggested_health)}${r.status === 'verified' && r.expert_id == null ? '<small>Legacy verification</small>' : ''}</div><div class="row" style="margin-top:20px"><section class="card"><img id="report-photo" class="preview-photo" alt="Field photo"><figcaption>Site overview</figcaption>${r.closeup_photo_url?'<img id="report-closeup" class="preview-photo" alt="Close-up"><figcaption>Close-up</figcaption>':''}<p>${esc(r.guardian_remarks ?? '')}</p></section><section class="card"><dl class="summary">${Object.entries(rows).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v ?? '—')}</dd>`).join('')}<dt>Species name</dt><dd>${speciesNames(r)}</dd></dl>${r.cluster_id ? `<p><a href="#cluster/${r.cluster_id}">Mangrove timeline</a></p>` : ''}</section></div>
    <section class="card report-checklist" style="margin-top:20px"><h2>Observations</h2><div class="answer-grid">${r.observations.map(c => `<article class="checklist-answer"><h3>${esc(c.name)}</h3><ul>${c.options.map(o => `<li><span>${esc(o.label)}</span>${c.score_group === 'health' ? `<small class="answer-score">${o.points == null ? 'Not scored' : `${o.points} / 2`}</small>` : ''}</li>`).join('')}</ul></article>`).join('')}</div></section>
    ${r.expert_feedback && !(canReview && ['pending','verified'].includes(r.status)) ? `<section class="card"><h2>Feedback</h2><p>${esc(r.expert_feedback)}</p></section>` : ''}
    ${canReview && ['pending','verified'].includes(r.status) ? '<section class="card" style="margin-top:20px" id="review-area"><p>Loading review choices…</p></section>' : ''}
    ${staff ? `<section class="card" style="margin-top:20px"><h2>Review activity</h2>${r.verification_history.length ? r.verification_history.map(v => `<p><strong>${esc(displayLabel(v.action))} · ${esc(v.verifier_name)}</strong><br>${esc(v.previous_health ?? 'Unknown')} → ${esc(v.new_health ?? 'Unconfirmed')}<br><small>${esc(v.created_at)}</small>${v.comment ? `<br>${esc(v.comment)}` : ''}</p>`).join('') : '<p>No reviews yet.</p>'}</section>` : ''}`);
  back(); $('#report-photo').closest('.row').classList.add('report-overview'); if (r.photo_url) privatePhoto($('#report-photo'), r.photo_url);if(r.closeup_photo_url)privatePhoto($('#report-closeup'),r.closeup_photo_url);
  for (const [index,path] of (r.extra_photo_urls??[]).entries()) {
    const img=document.createElement('img');img.className='preview-photo';img.alt=`Additional photo ${index+1}`;$('#report-photo').parentElement.append(img);privatePhoto(img,path);
  }
  if(r.needs_follow_up || r.follow_up_state) node.insertAdjacentHTML('beforeend',`<section class="card follow-up-card"><h2>${esc(r.follow_up_state||'Follow-up needed')}</h2><p>${esc(r.expert_feedback?'See Feedback for instructions for your next visit.':'Please add a new observation from your next visit.')}</p>${r.can_follow_up?`<a class="button" href="#submit?parent=${r.id}&cluster=${r.cluster_id}">Submit follow-up</a>`:''}</section>`);
  if((r.observation_history??[]).length>1) node.insertAdjacentHTML('beforeend',`<section class="card"><h2>Observation history</h2><div class="list">${r.observation_history.map(v=>`<a class="report-row" href="#report/${v.id}"><div><strong>${esc(v.report_code)} · ${esc(v.visit_label)}</strong><small>${esc(v.submitted_at)} · ${esc(v.health)}</small>${v.follow_up_state?`<small>${esc(v.follow_up_state)}</small>`:''}</div>${pill(v.status)}</a>`).join('')}</div></section>`);
  if (!canReview || !['pending','verified'].includes(r.status)) return;
  const followUpFields=`<label class="check"><input type="checkbox" name="needs_follow_up" value="1" ${r.needs_follow_up?'checked':''}><span>Request another observation</span></label>`;
  const feedbackField=`<label class="field"><span>Feedback</span><textarea name="expert_feedback" maxlength="5000" placeholder="Add your findings and any instructions for the next visit.">${esc(r.expert_feedback??'')}</textarea>${r.status==='pending'?'<small>Required when rejecting a report.</small>':''}</label>`;
  if(r.status==='verified') {
    $('#review-area').innerHTML=`<h2>Feedback and follow-up</h2><form id="review">${errorBox}${followUpFields}${feedbackField}<button>Save changes</button></form>`;
    bind($('#review'),async values=>{await api('review.php',{body:{...values,needs_follow_up:values.needs_follow_up??'0',report_id:Number(id),action:'followup'}});toast('Feedback and follow-up saved.');await reportPage(node,id,true);});return;
  }
  const catalog = await api('species.php');
  if (!node.isConnected) return;
  $('#review-area').innerHTML = `<h2>Review this report</h2><p>Check the photo and answers, then choose your decision.</p><form id="review">${errorBox}${select('action', 'Decision', [['confirm', 'Confirm system suggestion'], ['correct', 'Correction'], ['reject', 'Reject with feedback']], 'confirm')}<div id="corrections" class="row">${select('final_health', 'Corrected health', ['Healthy', 'Stressed', 'At Risk', 'Unknown'].map(v => [v, v]), r.suggested_health)}${select('final_species_id', 'Corrected species', [['', 'Unassigned'], ...catalog.species.map(s => [s.id, [s.local_name,s.common_name,s.scientific_name].filter(Boolean).join(' · ')])], r.suggested_species_id)}${select('rarity_level', 'Rarity', ['Unassigned', 'Common', 'Vulnerable', 'Rare'].map(v => [v, v]), r.rarity_level)}</div>${followUpFields}${feedbackField}<button type="submit">Save review</button></form>`;
  const update = () => { const action=$('#review [name=action]').value; $('#corrections').hidden=action!=='correct'; $('#corrections').querySelectorAll('select').forEach(input=>input.disabled=action!=='correct'); $('#review [name=expert_feedback]').required=action==='reject'; $('#review [name=needs_follow_up]').disabled=action==='reject'; $('#review [name=needs_follow_up]').closest('label').hidden=action==='reject'; $('#review button[type=submit]').textContent=action==='confirm'?'Confirm system suggestion':action==='correct'?'Save correction':'Reject report'; }; update(); $('#review [name=action]').onchange = update;
  bind($('#review'), async values => {
    if (!(await confirm('Save this review?', 'Your decision and feedback will be saved.'))) return;
    await api('review.php', {body: {...values, report_id: Number(id)}}); toast('Review saved.'); await reportPage(node, id, true);
  });
}
async function analyticsPage(node,query) { cleanup=await monitoringAnalytics(node,query,title,back); }
async function clustersPage(node, growth = false, query = {}) {
  const {clusters} = await api('clusters.php', {query});
  set(node, `${title('Mangrove timeline', 'Select a site to open Health history, Mangrove counts and verified visits.')}<div id="map" class="map large"></div>${legend}<h2>Clusters</h2>${clusters.length ? `<div class="list">${clusters.map(c => `<a class="report-row" href="#cluster/${c.id}?tab=${growth ? 'growth' : 'health'}"><div><strong>${esc(c.name)}</strong><small>${c.verified_count} verified visits · ${esc(c.barangay_name)}</small></div>${pill(c.latest_health)}</a>`).join('')}</div>` : '<p class="empty">Clusters appear after reports are verified.</p>'}`);
  node.querySelector('.page-head').insertAdjacentHTML('afterend',listFilters(query,[['health','Health',[['','All health'],...['Healthy','Stressed','At Risk','Unknown'].map(v=>[v,v])]]],'Cluster name, code, or barangay'));
  bindListFilters(node,query,q=>listRoute(growth?'growth':'clusters',q),clusters.length);
  if (!clusters.length && (query.q || query.health)) node.querySelector('.empty').textContent='No clusters match. Try another search or clear the filters.';
  back(); const canvas = map($('#map'), clusters, {timelineMode:growth?'growth':'health'}); cleanup = () => canvas.remove();
}
async function timelinePage(node,id,query){cleanup=await mangroveTimeline(node,id,query,title,back);}
async function notificationsPage(node, query) {
  const data = await api('notifications.php', {query});
  set(node, `${title('Notifications', `${data.unread} unread`)}<button id="mark-all" class="outline" ${data.unread ? '' : 'hidden'}>Mark all read</button><div class="list" style="margin-top:20px">${data.notifications.map(n => `<button class="report-row notification" data-id="${n.id}" data-report="${n.report_id ?? ''}"><div><strong>${n.read_at ? '' : '● '}${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(n.created_at.slice(0, 10))}</small></div></button>`).join('') || '<p class="empty">Report activity and reminders will appear here.</p>'}</div>${pager(data, 'notifications')}`); back();
  $('#mark-all').onclick = async () => { try { await api('notifications.php', {body: {action: 'mark_all'}}); await notificationsPage(node, query); } catch (e) { toast(friendly(e)); } };
  $$('.notification').forEach(n => n.onclick = async () => { try { await api('notifications.php', {body: {action: 'mark_read', id: Number(n.dataset.id)}}); if (n.dataset.report) location.hash = `report/${n.dataset.report}`; else await notificationsPage(node, query); } catch (e) { toast(friendly(e)); } });
}
async function profilePage(node) {
  const {user, barangays} = await api('profile.php');
  set(node, `${title('Profile settings')}<div class="row profile-layout"><section class="card"><h2>Your details</h2><form id="profile">${errorBox}${field('first_name', 'First name', user.first_name, 'text', 'required maxlength="80"')}${field('last_name', 'Last name', user.last_name, 'text', 'required maxlength="80"')}${field('email', 'Email', user.email, 'email', 'readonly')}<small>Your email stays the same.</small>${residentialAddressFields(barangays,user)}${contactFields(user)}<button type="submit">Save profile</button></form></section><section class="card"><h2>Change password</h2><p class="muted">Use 8–25 characters.</p><form id="password">${errorBox}${passwordField('current','Current password',{prefix:'security',current:true})}${passwordField('next','New password',{prefix:'security'})}${passwordField('confirmation','Confirm new password',{prefix:'security'})}<button type="submit">Change password</button></form></section></div>`); back();
  bindPasswordToggles($('#password'));
  bindBarangayPicker($('#profile'),barangays);
  bind($('#profile'), async values => { const result = await api('profile.php', {body: values}); viewer = result.user; toast('Profile updated.'); });
  bind($('#password'), async values => { if(values.next!==values.confirmation)throw new Error('The new passwords do not match.');if(values.next===values.current)throw new Error('Choose a different new password.');if (await confirm('Change password?', 'You will be signed out on all devices.')) { await changePassword(values.current, values.next, values.confirmation); toast('Password changed. Sign in again.'); } });
}
async function badgesPage(node) {
  const {badges} = await api('badges.php');
  set(node, `${title('Your badges', 'Earn recognition through verified observations.')}<div class="badge-gallery">${badges.map(b => `<article class="card badge-card ${b.earned?'earned':'in-progress'}"><img class="badge-emblem" src="${esc(asset(b.image_path||'img/badges/first-report.svg'))}" alt="${esc(b.badge_name)} badge" width="104" height="104"><div><p class="eyebrow">${b.earned?'Earned':'In progress'}</p><h2>${esc(b.badge_name)}</h2><p>${esc(b.description)}</p><div class="growth-bar" role="progressbar" aria-label="${esc(b.badge_name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0,Math.min(100,Number(b.progress_percent)||0))}"><span style="width:${Math.max(0,Math.min(100,Number(b.progress_percent)||0))}%"></span></div><p class="muted">${b.earned?'Achievement unlocked':`${b.current_value} / ${b.target_value}`}</p>${b.earned ? `<button class="outline certificate" data-id="${b.id}">Download certificate</button><small>The verification QR is inside your certificate.</small>` : ''}</div></article>`).join('')||'<p class="empty">No badge milestones are available yet.</p>'}</div>`); back();
  $$('.certificate').forEach(b => b.onclick = async () => { try { await download('certificate.php', 'ManGROOVES-certificate.pdf', {badge_id: b.dataset.id}); } catch (e) { toast(friendly(e)); } });
}
function historyTabs(reviews){return `<nav class="actions" aria-label="Reports and monitoring views" style="margin-bottom:20px"><a class="button ${reviews?'outline':''}" href="#reports" ${!reviews?'aria-current="page"':''}>Reports</a><a class="button ${reviews?'':'outline'}" href="#reports?view=reviews" ${reviews?'aria-current="page"':''}>Review activity</a></nav>`;}
async function historyPage(node, query) {
  const data = await api('validation-history.php', {query});
  set(node, `${title('All reports', 'Reports and their review decisions.')}${historyTabs(true)}<div class="list">${data.items.map(v => `<a class="report-row" href="#report/${v.report_id}"><div><strong>${esc(v.report_code)} · ${esc(displayLabel(v.action))}</strong><p>${esc(v.verifier_name ?? v.reviewer ?? 'Automatic check')} · ${esc(v.created_at)}</p><small>${esc(v.previous_health ?? 'Unknown')} → ${esc(v.new_health ?? v.health ?? 'Unconfirmed')}</small></div>${pill(v.new_status ?? v.status)}</a>`).join('') || '<p class="empty">No reviews yet.</p>'}</div>${pager(data, 'reports', {...query,view:'reviews'})}`); back();
  node.querySelector('.list').insertAdjacentHTML('beforebegin',listFilters(query,[['action','Decision',[['','All decisions'],['confirm','Confirmed'],['correct','Corrected'],['reject','Rejected']]]],'Report number or reviewer'));
  node.querySelector('.pagination')?.remove();node.insertAdjacentHTML('beforeend',pager(data,'reports',{...query,view:'reviews'}));
  bindListFilters(node,query,q=>listRoute('reports',{...q,view:'reviews'}),data.total);
  if (!data.items.length && (query.q || query.action)) node.querySelector('.empty').textContent='No reviews match. Try another search or clear the filters.';
}
function privacyPage() {
  $('#app').innerHTML = `<header class="public-header"><a class="brand" href="#home">♣ ManGROOVES</a><a class="button outline" href="#home">Back to home</a></header><main class="privacy card"><h1>Privacy notice</h1><p>ManGROOVES records your name, email, barangay, city or municipality, address, mobile number, and field reports. Reports include a photo, location, checklist answers, and visit notes.</p><p>Your information is stored using Supabase. Guardians see their own private reports. Authorized experts and administrators can review reports and manage the monitoring program. Verified cluster summaries help the community follow site health.</p><p>Device location is requested automatically when you open the location step. On desktop, if unavailable, GeoJS may use your public IP address to show an approximate area. Approximate areas are never saved as exact report pins. You can search or place a pin yourself. Personal photo metadata is removed before new photos are stored.</p><p>Your password is handled by Supabase Auth. Your email address cannot be changed through this app. Ask the program administrator about access, corrections, or account removal.</p><p>Expert applicants upload a work or professional ID photo for admin review. ID photos and legacy ID codes are private and only accessible to administrators. Field reports should only contain mangrove photos. Address searches are sent to Photon; do not enter private home details. The QR inside each certificate opens a public verification page showing the recipient, badge, and award date. It does not reveal contact details or private reports.</p></main>`;
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
    || (name==='species' && !['expert','system_admin'].includes(viewer.role))
    || (['users','expert-applications','certificate-settings', 'badge-settings', 'audit', 'checklist'].includes(name) && viewer.role !== 'system_admin')) {
    location.hash = 'dashboard'; return;
  }
  const node = shell(name);
  try {
    switch (name) {
      case 'dashboard': return await dashboardPage(node);
      case 'reports': return await reportsPage(node, query);
      case 'explore': cleanup=await exploreSites(node,query,viewer);return;
      case 'report-map': set(node,`${title('Report map')}<div id="report-map-content"></div>`);back();cleanup=reportMapPage($('#report-map-content'),query);return;
      case 'verification': return await reportsPage(node, query, true);
      case 'report': return await reportPage(node, id, query.review === '1');
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
      case 'users': case 'species': case 'badge-settings': case 'audit': cleanup=(await adminPage(node, name, query))??(()=>{});return;
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
    case 'explore': cleanup=await exploreSites(node,query,viewer);return;
    case 'report-map': {
      set(node, `${title('Report map')}<div id="report-map-content"></div>`); back();
      cleanup=reportMapPage($('#report-map-content'),query);return;
    }
    case 'reports': return reportsPage(node,query);
    case 'verification': return reportsPage(node,query,true);
    case 'report': return reportPage(node,query.id,query.review==='1');
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
    case 'users': case 'species': case 'badge-settings': case 'audit': cleanup=(await adminPage(node,name,query))??(()=>{});return;
    default: throw new Error('Page not found.');
  }
}

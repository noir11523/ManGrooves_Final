import './style.css';
import Chart from 'chart.js/auto';
import { initialize, api, login, logout, changePassword, friendly } from './client.js';
import { $, $$, esc, pill, field, select, formValues, errorBox, showError, toast, confirm, pager, reportRows, map, privatePhoto, download } from './ui.js';
import { reportWizard, reportDraft } from './report-form.js';
import { checklistPage, adminPage } from './admin.js';

let viewer = null, ready = false, cleanup = () => {}, previousHash = location.hash, navigating = false;
const roleLabel = {guardian: 'Coastal Guardian', expert: 'System Expert', system_admin: 'System Administrator'};
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
    <section class="features" id="about-section"><article class="card"><h2>Coastal protection</h2><p>Dense roots slow waves, hold sediment, and reduce shoreline erosion.</p></article><article class="card"><h2>Living nurseries</h2><p>Mangrove roots shelter fish, crabs, birds, and other wildlife.</p></article><article class="card"><h2>Climate resilience</h2><p>Mangroves store carbon and help communities adapt to change.</p></article><article class="card"><h2>Community evidence</h2><p>Repeat visits help us see how each site changes over time.</p></article></section><section class="hero" id="how-section"><h2>How it works</h2><p>1. Take a field photo, place your map pin, and answer the checklist.</p><p>2. Review the suggested health and species before submitting.</p><p>3. Healthy reports are verified automatically. Experts review the others. Return to the site to track its changes.</p><a class="button outline" href="#explore">Explore the cluster map</a></section></main><footer><a href="#privacy">Privacy notice</a> · ManGROOVES</footer>`;
}
async function explorePage() {
  authLayout('<h1>Explore mangrove sites</h1><p class="muted">Verified cluster summaries from the monitoring community.</p><div id="explore-map" class="map large"></div>');
  const node = $('.auth'); node.style.maxWidth = '1100px';
  const data = await api('explore.php', {anonymous: true});
  if (!node.isConnected) return;
  const canvas = map($('#explore-map'), data.clusters); cleanup = () => canvas.remove();
  node.insertAdjacentHTML('beforeend', `${legend}<p class="muted">Sign in to view the health history available to your account.</p><a class="button" href="#login">Sign in</a>`);
}
async function loginPage() {
  authLayout(`<p class="eyebrow">Welcome back</p><h1>Sign in</h1><form id="login">${errorBox}${field('email', 'Email', '', 'email', 'required autocomplete="username"')}${field('password', 'Password', '', 'password', 'required autocomplete="current-password"')}<button type="submit">Sign in</button></form><p>New here? <a href="#register">Create guardian account</a></p>`);
  bind($('#login'), async values => { await login(values.email, values.password); });
}
async function registerPage() {
  authLayout('<p class="loading">Loading registration…</p>'); const area = $('.auth');
  const config = await api('configuration.php', {anonymous: true});
  set(area, `<p class="eyebrow">Join your coastal community</p><h1>Become a guardian</h1><form id="register">${errorBox}<div class="row">${field('first_name', 'First name', '', 'text', 'required maxlength="80" autocomplete="given-name"')}${field('last_name', 'Last name', '', 'text', 'required maxlength="80" autocomplete="family-name"')}</div>${field('email', 'Email', '', 'email', 'required autocomplete="email"')}${field('phone', 'Phone (optional)', '', 'tel', 'maxlength="30"')}${select('barangay_id', 'Barangay', [['', 'Choose your barangay'], ...config.barangays.map(b => [b.id, b.name])], '', 'required')}${field('password', 'Password', '', 'password', 'required minlength="8" maxlength="25" autocomplete="new-password"')}<p class="muted">Use 8–25 characters.</p>${field('password_confirmation', 'Confirm password', '', 'password', 'required minlength="8" maxlength="25" autocomplete="new-password"')}<label class="check"><input name="privacy_consent" type="checkbox" value="1" required><span>I agree to the <a href="#privacy" target="_blank" rel="noopener">privacy notice</a>.</span></label><div class="actions"><button type="submit">Create account</button><a href="#login">Sign in</a></div></form>`);
  bind($('#register'), async values => {
    if (values.password !== values.password_confirmation) throw new Error('The passwords do not match.');
    await api('register.php', {body: values, anonymous: true});
    try { await login(values.email, values.password); }
    catch { toast('Account created. Sign in to continue.'); location.hash = 'login'; }
  });
}
function shell(route) {
  const admin = viewer.role === 'system_admin', staff = viewer.role !== 'guardian';
  const links = [['dashboard', 'Dashboard'], ['reports', staff ? 'Reports' : 'My reports'], ...(!staff ? [['submit', 'Submit a report'], ['badges', 'Badges']] : [['verification', 'Verification'], ['history', 'Validation history']]),
    ['label', 'Clusters'], ['analytics', 'Analytics'], ['clusters', 'Health history'], ['growth', 'Growth timeline'],
    ...(admin ? [['label', 'Administration'], ['checklist', 'Health checklist'], ['users', 'Users'], ['species', 'Species'], ['badge-settings', 'Badge settings'], ['audit', 'Audit logs']] : []),
    ['label', 'Account'], ['notifications', 'Notifications'], ['profile', 'Profile settings']];
  $('#app').innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#dashboard">♣ ManGROOVES</a><nav>${links.map(([key, label]) => key === 'label' ? `<span class="nav-label">${label}</span>` : `<a class="${route === key ? 'active' : ''}" href="#${key}">${label}</a>`).join('')}</nav></aside><div><header class="topbar"><div><button class="mobile-menu outline" aria-label="Open menu">☰</button><span class="eyebrow">${esc(roleLabel[viewer.role])}</span></div><div class="user"><a href="#notifications" aria-label="Notifications">♧</a><span class="avatar">${esc(viewer.first_name?.[0] ?? viewer.full_name[0])}</span><div class="user-name"><strong>${esc(viewer.full_name)}</strong><small>${esc(roleLabel[viewer.role])}</small></div><button class="outline" id="signout">Sign out</button></div></header><main class="workspace" id="content"><p class="loading">Loading…</p></main></div></div>`;
  $('.mobile-menu').onclick = () => $('.shell').classList.toggle('menu-open');
  $('#signout').onclick = async () => { if (await confirm('Sign out?', 'You can sign in again anytime.')) { reportDraft.dirty = false; await logout(); } };
  return $('#content');
}
async function dashboardPage(node) {
  const data = await api('dashboard.php'), s = data.stats;
  set(node, `<p class="eyebrow">Your coastal workspace</p><h1>Hello, ${esc(viewer.first_name ?? viewer.full_name.split(' ')[0])}</h1><p class="muted">Here is the latest from your mangrove monitoring work.</p><div class="stats">${[
    ['Total reports', s.total_reports, 'reports'], ['Verified', s.verified_reports, 'reports?status=verified'], ['Pending', s.pending_reports, 'reports?status=pending'],
    ['Rejected', s.rejected_reports, 'reports?status=rejected'], ['Needs attention', s.needs_attention, 'reports?needs_attention=1'], ['Clusters', s.map_clusters, 'clusters']
  ].map(([label, value, path]) => `<a class="stat" href="#${path}"><strong>${value ?? 0}</strong><span>${label} →</span></a>`).join('')}</div>
    ${data.reminders.length ? `<section class="card"><h2>Follow-ups due</h2>${data.reminders.map(r => `<p><a href="#submit?parent=${r.id}&cluster=${r.cluster_id}">${esc(r.cluster_name ?? r.report_code)}</a> · ${esc(r.next_followup_date)}</p>`).join('')}</section>` : ''}
    <h2>Latest reports</h2>${reportRows(data.latest_reports)}<h2>Cluster health map</h2>${legend}<div id="map" class="map"></div><p class="muted">Point to a cluster or tap it to open its timeline.</p>`);
  const canvas = map($('#map'), data.clusters); cleanup = () => canvas.remove();
}
async function reportsPage(node, query, verification = false) {
  const data = await api(verification ? 'verification.php' : 'reports.php', {query});
  set(node, `${title(verification ? 'Verification' : viewer.role === 'guardian' ? 'My reports' : 'Reports', verification ? 'Review health and species suggestions.' : '')}
    ${!verification ? `<form id="filters" class="filters">${select('status', 'Status', [['', 'All reports'], ['verified', 'Verified'], ['pending', 'Pending'], ['rejected', 'Rejected']], query.status)}${select('health', 'Health', [['', 'All health'], ...['Healthy', 'Stressed', 'At Risk', 'Unknown'].map(v => [v, v])], query.health)}${field('q', 'Search', query.q ?? '', 'search')}<button>Apply</button></form>` : ''}
    ${reportRows(data.items)}${pager(data, verification ? 'verification' : 'reports', {...query, page: undefined})}`);
  back(); $('#filters')?.addEventListener('submit', event => { event.preventDefault(); location.hash = `reports?${new URLSearchParams(formValues(event.target))}`; });
}
async function reportPage(node, id) {
  const data = await api('report.php', {query: {id}}), r = data.report, staff = viewer.role !== 'guardian';
  const rows = {'Location': r.cluster_name ?? r.sitio_name, 'Barangay': r.barangay_name, 'Coordinates': `${r.latitude}, ${r.longitude}`, 'Living mangroves': r.observed_alive_count,
    'System health score': r.health_score == null ? 'Needs expert review' : `${r.health_score} / ${r.health_max_score}`, 'Species': r.final_species_name ?? r.suggested_species_name ?? 'Unassigned', 'Submitted': r.submitted_at};
  set(node, `${title(r.report_code)}<div class="actions">${pill(r.status)}${pill(r.final_health ?? r.suggested_health)}${r.status === 'verified' && r.expert_id == null ? '<small>Verified automatically</small>' : ''}</div><div class="row" style="margin-top:20px"><section class="card"><img id="report-photo" class="preview-photo" alt="Field photo"><p>${esc(r.guardian_remarks ?? '')}</p></section><section class="card"><dl class="summary">${Object.entries(rows).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v ?? '—')}</dd>`).join('')}</dl>${r.cluster_id ? `<p><a href="#cluster/${r.cluster_id}">View health history and growth timeline →</a></p>` : ''}</section></div>
    <section class="card" style="margin-top:20px"><h2>Checklist answers</h2>${r.observations.map(c => `<p><strong>${esc(c.name)}</strong><br>${c.options.map(o => `${esc(o.label)}${c.score_group === 'health' ? ` (${o.points ?? 'Not scored'}/2)` : ''}`).join(', ')}</p>`).join('')}</section>
    ${r.expert_feedback ? `<section class="card"><h2>Expert feedback</h2><p>${esc(r.expert_feedback)}</p></section>` : ''}
    ${staff && r.status === 'pending' ? '<section class="card" style="margin-top:20px" id="review-area"><p>Loading review choices…</p></section>' : ''}
    ${staff ? `<section class="card" style="margin-top:20px"><h2>Validation history</h2>${r.verification_history.length ? r.verification_history.map(v => `<p><strong>${esc(v.action)} · ${esc(v.verifier_name)}</strong><br>${esc(v.previous_health ?? 'Unknown')} → ${esc(v.new_health ?? 'Unconfirmed')}<br><small>${esc(v.created_at)}</small>${v.comment ? `<br>${esc(v.comment)}` : ''}</p>`).join('') : '<p>No reviews yet.</p>'}</section>` : ''}`);
  back(); if (r.photo_url) privatePhoto($('#report-photo'), r.photo_url);
  if (!staff || r.status !== 'pending') return;
  const catalog = await api('species.php');
  if (!node.isConnected) return;
  $('#review-area').innerHTML = `<h2>Review this report</h2><p>Confirm the suggestion, correct it, or explain why it needs revision.</p><form id="review">${errorBox}${select('action', 'Decision', [['confirm', 'Confirm suggestions'], ['correct', 'Correct health or species'], ['reject', 'Reject with feedback']], r.suggested_health === 'Unknown' ? 'correct' : 'confirm')}<div id="corrections" class="row">${select('final_health', 'Final health', ['Healthy', 'Stressed', 'At Risk'].map(v => [v, v]), r.suggested_health)}${select('final_species_id', 'Final species', [['', 'Unassigned'], ...catalog.species.map(s => [s.id, s.scientific_name])], r.suggested_species_id)}${select('rarity_level', 'Rarity', ['Unassigned', 'Common', 'Vulnerable', 'Rare'].map(v => [v, v]), r.rarity_level)}</div><label class="check"><input type="checkbox" name="needs_attention" value="1" ${r.needs_attention ? 'checked' : ''}>Needs attention</label><label class="field"><span>Feedback</span><textarea name="expert_feedback" maxlength="5000"></textarea></label><button type="submit">Save review</button></form>`;
  const update = () => { $('#corrections').hidden = $('#review [name=action]').value !== 'correct'; $('#review textarea').required = $('#review [name=action]').value === 'reject'; }; update(); $('#review [name=action]').onchange = update;
  bind($('#review'), async values => {
    if (!(await confirm('Save this review?', 'This confirms your decision and sends feedback to the guardian.'))) return;
    await api('review.php', {body: {...values, report_id: Number(id)}}); toast('Review saved.'); await reportPage(node, id);
  });
}
async function analyticsPage(node, query) {
  const {analytics: a} = await api('analytics.php', {query}), v = a.verification;
  set(node, `${title('Analytics', a.scope === 'personal' ? 'Your reports and verified observations.' : 'Monitoring results across all users.')}
    <form id="dates" class="filters">${field('date_from', 'From', a.filters.date_from, 'date')}${field('date_to', 'To', a.filters.date_to, 'date')}<button>Apply</button>${a.capabilities.can_export_pdf ? '<button type="button" id="pdf" class="outline">Generate PDF</button>' : ''}</form>
    <div class="stats">${[['Total reports', v.total], ['Verified', v.verified], ['Pending', v.pending], ['Rejected', v.rejected], ['Needs attention', a.high_risk_total], ...(a.capabilities.can_view_survival ? [['Current survival', a.overall_survival == null ? '—' : `${a.overall_survival}%`]] : [])].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div>
    <div class="row"><section class="card"><h2>Verified health</h2><div class="chart"><canvas id="health-chart"></canvas></div></section><section class="card"><h2>${a.capabilities.can_view_survival ? 'Monthly survival' : 'Verified reports by month'}</h2><div class="chart"><canvas id="growth-chart"></canvas></div></section></div><h2>Sites needing attention</h2>${a.high_risk.length ? `<div class="list">${a.high_risk.map(r => `<a class="report-row" href="#report/${r.id}"><strong>${esc(r.cluster_name ?? r.report_code)}</strong>${pill(r.final_health)}</a>`).join('')}</div>` : '<p class="empty">No verified high-risk sites in this period.</p>'}`);
  back(); $('#dates').onsubmit = event => { event.preventDefault(); location.hash = `analytics?${new URLSearchParams(formValues(event.target))}`; };
  $('#pdf')?.addEventListener('click', async event => { event.target.disabled = true; try { await download('export-analytics.php', 'ManGROOVES-analytics.pdf', query); } catch (e) { toast(friendly(e)); } finally { event.target.disabled = false; } });
  const charts = [new Chart($('#health-chart'), {type: 'doughnut', data: {labels: Object.keys(a.health), datasets: [{data: Object.values(a.health), backgroundColor: ['#5b9461', '#dfb146', '#c96950']}]}, options: {maintainAspectRatio: false}}),
    new Chart($('#growth-chart'), {type: 'line', data: {labels: a.growth.map(p => p.month_label), datasets: [{label: a.capabilities.can_view_survival ? 'Survival (%)' : 'Verified reports', data: a.growth.map(p => p[a.capabilities.can_view_survival ? 'survival_rate' : 'verified_reports']), borderColor: '#35713d', tension: 0}]}, options: {maintainAspectRatio: false, scales: {y: {beginAtZero: true, ...(a.capabilities.can_view_survival ? {max: 100} : {})}}}})];
  cleanup = () => charts.forEach(c => c.destroy());
}
async function clustersPage(node, growth = false) {
  const {clusters} = await api('clusters.php');
  set(node, `${title(growth ? 'Growth timeline' : 'Health history', 'Point to a cluster or tap it to open its timeline.')}<div id="map" class="map large"></div>${legend}<h2>Clusters</h2>${clusters.length ? `<div class="list">${clusters.map(c => `<a class="report-row" href="#cluster/${c.id}?tab=${growth ? 'growth' : 'health'}"><div><strong>${esc(c.name)}</strong><small>${c.verified_count} verified visits · ${esc(c.barangay_name)}</small></div>${pill(c.latest_health)}</a>`).join('')}</div>` : '<p class="empty">Clusters appear after reports are verified.</p>'}`);
  back(); const canvas = map($('#map'), clusters); cleanup = () => canvas.remove();
}
async function timelinePage(node, id, query) {
  const {cluster, timeline} = await api('cluster.php', {query: {id}}), growth = query.tab === 'growth';
  const entries = growth ? timeline.filter(r => r.observed_alive_count != null) : [...timeline].reverse();
  const max = Math.max(1, ...entries.map(r => r.observed_alive_count ?? 0));
  set(node, `${title(cluster.name, `${timeline.length} verified visits`)}<div class="actions"><a class="button ${growth ? 'outline' : ''}" href="#cluster/${id}?tab=health">Health history</a><a class="button ${growth ? '' : 'outline'}" href="#cluster/${id}?tab=growth">Growth timeline</a></div><p class="muted">${growth ? 'Counts from each visit. Changes may reflect a different area counted.' : 'Newest visits first. Open a report for its full details.'}</p><div class="timeline">${entries.map((r, i) => `<article class="card visit"><small>${esc(r.submitted_at.slice(0, 10))}</small><h2>${esc(r.observed_alive_count ?? 'Not counted')} living mangroves</h2>${pill(r.health)}${growth ? `<div class="growth-bar"><span style="width:${r.observed_alive_count / max * 100}%"></span></div><small>${i ? `${r.observed_alive_count - entries[i - 1].observed_alive_count >= 0 ? '+' : ''}${r.observed_alive_count - entries[i - 1].observed_alive_count} since last visit` : 'First count'}</small>` : `<p>${esc(r.species_name ?? 'Species unassigned')}</p>`}${r.parent_report_id ? '<p class="muted">Follow-up visit</p>' : ''}${r.can_view_details ? `<p><a href="#report/${r.id}">View ${esc(r.report_code)} →</a></p>` : '<p class="muted">Community observation</p>'}</article>`).join('') || '<p class="empty">No verified visits yet.</p>'}</div>`); back();
}
async function notificationsPage(node, query) {
  const data = await api('notifications.php', {query});
  set(node, `${title('Notifications', `${data.unread} unread`)}<button id="mark-all" class="outline">Mark all read</button><div class="list" style="margin-top:20px">${data.notifications.map(n => `<button class="report-row notification" data-id="${n.id}" data-report="${n.report_id ?? ''}"><div><strong>${n.read_at ? '' : '● '}${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(n.created_at.slice(0, 10))}</small></div></button>`).join('') || '<p class="empty">Report activity and reminders will appear here.</p>'}</div>${pager(data, 'notifications')}`); back();
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
  set(node, `${title('Your badges', 'Every verified observation helps.')}<div class="row">${badges.map(b => `<article class="card"><h2>${esc(b.badge_name)}</h2><p>${esc(b.description)}</p><div class="growth-bar"><span style="width:${b.progress_percent}%"></span></div><small>${b.current_value} / ${b.target_value}</small>${b.earned ? `<p>${pill('Earned')}</p><button class="outline certificate" data-id="${b.id}">Download certificate</button>` : ''}</article>`).join('')}</div>`); back();
  $$('.certificate').forEach(b => b.onclick = async () => { try { await download('certificate.php', 'ManGROOVES-certificate.pdf', {badge_id: b.dataset.id}); } catch (e) { toast(friendly(e)); } });
}
async function historyPage(node, query) {
  const data = await api('validation-history.php', {query});
  set(node, `${title('Validation history', 'Health and species decisions, including automatic verification.')}<div class="list">${data.items.map(v => `<a class="report-row" href="#report/${v.report_id}"><div><strong>${esc(v.report_code)} · ${esc(v.action)}</strong><p>${esc(v.reviewer)} · ${esc(v.created_at)}</p><small>${esc(v.previous_health ?? 'Unknown')} → ${esc(v.health ?? 'Unconfirmed')}</small></div>${pill(v.status)}</a>`).join('') || '<p class="empty">No validations yet.</p>'}</div>${pager(data, 'history')}`); back();
}
function privacyPage() {
  $('#app').innerHTML = `<header class="public-header"><a class="brand" href="#home">♣ ManGROOVES</a><button class="outline" onclick="history.back()">← Back</button></header><main class="privacy card"><h1>Privacy notice</h1><p>ManGROOVES records your name, email, barangay, optional phone number, and field reports. Reports include a photo, location, checklist answers, and visit notes.</p><p>Your information is stored using Google Firebase. Guardians see their own private reports. Authorized experts and administrators can review reports and manage the monitoring program. Verified cluster summaries help the community follow site health.</p><p>Location is requested when you choose to use GPS. You can also place a pin yourself. Photo metadata is removed before new photos are stored.</p><p>Your password is handled by Firebase Authentication. Your email address cannot be changed through this app. Ask the program administrator about access, corrections, or account removal.</p><p>Do not upload photos of people or personal documents. Only submit evidence needed for mangrove monitoring.</p></main>`;
}
async function route() {
  cleanup(); cleanup = () => {};
  const [raw, search = ''] = location.hash.slice(1).split('?'), [name, id] = (raw || 'home').split('/'), query = Object.fromEntries(new URLSearchParams(search));
  if (name === 'privacy') { privacyPage(); return; }
  if (!ready) return;
  if (!viewer) {
    if (name === 'register') return registerPage();
    if (name === 'login') return loginPage();
    if (name === 'explore') return explorePage();
    if (['home', 'about', 'how'].includes(name)) { landing(); $(`#${name}-section`)?.scrollIntoView({behavior: 'smooth'}); return; }
    location.hash = 'login'; return;
  }
  if (['home', 'login', 'register'].includes(name)) { location.hash = 'dashboard'; return; }
  const staff = viewer.role !== 'guardian';
  if ((['submit', 'badges'].includes(name) && staff) || (['verification', 'history'].includes(name) && !staff)
    || (['users', 'species', 'badge-settings', 'audit', 'checklist'].includes(name) && viewer.role !== 'system_admin')) {
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
      case 'clusters': return await clustersPage(node);
      case 'growth': return await clustersPage(node, true);
      case 'cluster': return await timelinePage(node, id, query);
      case 'history': return await historyPage(node, query);
      case 'notifications': return await notificationsPage(node, query);
      case 'profile': return await profilePage(node);
      case 'badges': return await badgesPage(node);
      case 'submit': cleanup = await reportWizard(node, query); return;
      case 'checklist': return await checklistPage(node);
      case 'users': case 'species': case 'badge-settings': case 'audit': return await adminPage(node, name, query);
      default: set(node, '<h1>Page not found</h1><a href="#dashboard">Back to dashboard</a>');
    }
  } catch (error) {
    if (error.name === 'AbortError' || !node.isConnected) return;
    set(node, `<h1>Could not load this page</h1><p class="error">${esc(friendly(error))}</p><button id="retry">Try again</button>`); $('#retry').onclick = route;
  }
}
window.addEventListener('hashchange', async () => {
  if (navigating) return;
  if (reportDraft.dirty && !location.hash.startsWith('#submit')) {
    navigating = true;
    const discard = await confirm('Leave this report?', 'Your unsent changes will be discarded.');
    navigating = false;
    if (!discard) { history.replaceState(null, '', previousHash || '#submit'); return; }
    reportDraft.reset();
  }
  previousHash = location.hash;
  route().catch(error => toast(friendly(error)));
});
window.addEventListener('beforeunload', event => { if (reportDraft.dirty) { event.preventDefault(); event.returnValue = ''; } });
initialize(async account => {
  cleanup(); viewer = null;
  try { if (account) viewer = (await api('me.php')).user; }
  catch (error) { toast(friendly(error)); await logout(); return; }
  ready = true;
  route().catch(error => toast(friendly(error)));
}).catch(error => {
  landing(); const message = document.createElement('p'); message.className = 'notice'; message.textContent = friendly(error); $('.hero').prepend(message);
});

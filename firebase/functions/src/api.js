import express from 'express';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'node:crypto';
import { Service } from './service.js';
import { AppError, integer, now, paginate, password, publicUser, requireRole, ROLES, text, wireDates } from './domain.js';
import { displayHealth, newest, reportList } from './analytics.js';
import { readInput, sendImage } from './uploads.js';

export function createApi({db, auth, bucket, projectId}) {
  const service = new Service(db, auth, bucket), app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Authorization, Origin'});
    const origin = req.get('origin');
    const permitted = [`https://${projectId}.web.app`, `https://${projectId}.firebaseapp.com`, ...(process.env.WEB_ORIGINS ?? '').split(',').filter(Boolean)];
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) permitted.push('http://127.0.0.1:5002', 'http://localhost:5002');
    if (origin && permitted.includes(origin)) {
      res.set({'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'});
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(express.json({limit: '512kb'}));
  app.use((req, res, next) => {
    if (req.is('application/json') && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
      return next(new AppError('Invalid form data.'));
    }
    next();
  });
  const path = req => req.path.replace(/^\/mobile-api/, '').replace(/^\//, '');
  const send = (res, data = {}, status = 200) => res.status(status).json(wireDates({ok: true, ...data}));
  app.use(async (req, res, next) => {
    try {
      const route = path(req);
      const migration = await service.get('meta', 'migration');
      if (migration?.status === 'running') throw new AppError('Data migration is in progress. Please try again shortly.', 503);
      if (route === 'configuration.php' && req.method === 'GET') {
        return send(res, {api_id: 'org.mangrooves.mobile-api', api_version: 2, backend: 'firebase', project_id: projectId,
          app_name: 'ManGROOVES', barangays: await service.rows('barangays'), upload_max_mb: 5, max_gps_accuracy_meters: 100});
      }
      if (route === 'explore.php' && req.method === 'GET') {
        const clusters = (await service.rows('clusters')).filter(c => c.verified_count > 0).map(c => ({id: c.id, name: c.name,
          latitude: c.center_lat, longitude: c.center_lng, latest_health: c.latest_health, barangay_name: c.barangay_name, verified_count: c.verified_count}));
        return send(res, {clusters});
      }
      if (route === 'checklist-photo.php' && req.method === 'GET') {
        const imagePath = String(req.query.path ?? '');
        if (!/^checklist\/[\w-]+\.(jpg|png|webp)$/.test(imagePath)) throw new AppError('Photo not found.', 404);
        return await sendImage(bucket, imagePath, res);
      }
      if (route === 'register.php' && req.method === 'POST') return send(res, await service.register(req.body ?? {}, req.ip), 201);
      const authorization = req.get('authorization') ?? '';
      if (!authorization.startsWith('Bearer ')) throw new AppError('Sign in to continue.', 401);
      let claims;
      try { claims = await auth.verifyIdToken(authorization.slice(7), true); }
      catch { throw new AppError('Your session expired. Sign in again.', 401); }
      const user = await service.user(claims.uid);
      if (claims.email?.toLowerCase() !== user.email.toLowerCase()) throw new AppError('Your account email does not match. Contact the administrator.', 403);
      req.viewer = user; req.claims = claims;
      next();
    } catch (error) { next(error); }
  });
  app.use(async (req, res, next) => {
    try {
      const route = path(req), user = req.viewer, get = req.method === 'GET', post = req.method === 'POST';
      const only = method => { if (req.method !== method) throw new AppError('Method not allowed.', 405); };
      if (!get && !post) throw new AppError('Method not allowed.', 405);
      switch (route) {
        case 'me.php': only('GET'); return send(res, {user: publicUser(user)});
        case 'logout.php': only('POST'); return send(res, {message: 'Signed out.'});
        case 'dashboard.php': only('GET'); return send(res, await service.dashboard(user));
        case 'profile.php': return send(res, await service.profile(user, post ? req.body ?? {} : null));
        case 'report-form.php': only('GET'); return send(res, await service.form(user));
        case 'report-preview.php': only('POST'); return send(res, await service.preview(user, req.body ?? {}));
        case 'submit-report.php': {
          only('POST'); requireRole(user, 'guardian');
          await service.limited(`submit:${user.uid}`, 30);
          const {input, files} = await readInput(req);
          const result = await service.submit(user, input, files.photo);
          return send(res, {report: result.result ?? result, message: result.message ?? 'Report already received.'}, 201);
        }
        case 'reports.php': only('GET'); return send(res, reportList(await service.reports(user), req.query));
        case 'report.php': only('GET'); return send(res, {report: await service.detail(user, integer(req.query.id, 'report'))});
        case 'photo.php': {
          only('GET'); const id = integer(req.query.id, 'report'), report = await service.get('reports', id);
          if (!report || (user.role === 'guardian' && report.user_id !== user.id)) throw new AppError('Photo not found.', 404);
          return await sendImage(bucket, report.photo_path, res);
        }
        case 'previous-reports.php': {
          only('GET'); requireRole(user, 'guardian'); const clusterId = integer(req.query.cluster_id, 'cluster');
          const rows = await service.reports(user);
          const reports = rows.filter(r => r.cluster_id === clusterId && r.status === 'verified' && !r.active_child_id)
            .sort(newest).slice(0, 30).map(r => ({id: r.id, report_code: r.report_code, submitted_at: r.submitted_at, health: displayHealth(r), next_followup_date: r.next_followup_date}));
          return send(res, {reports});
        }
        case 'clusters.php': {
          only('GET'); const q = String(req.query.q ?? '').toLowerCase();
          return send(res, {clusters: (await service.clusters(user)).filter(c => (!req.query.health || c.latest_health === req.query.health)
            && (!q || `${c.name} ${c.barangay_name} ${c.cluster_code}`.toLowerCase().includes(q)))});
        }
        case 'cluster.php': {
          only('GET'); const id = integer(req.query.id, 'cluster'), cluster = await service.get('clusters', id);
          if (!cluster || (user.role === 'guardian' && cluster.barangay_id !== user.barangay_id)) throw new AppError('Cluster not found.', 404);
          const timeline = (await service.rows('reports', [['cluster_id', '==', id]])).filter(r => r.status === 'verified')
            .sort((a, b) => -newest(a, b)).map(r => {
              const canView = user.role !== 'guardian' || r.user_id === user.id;
              return {id: r.id, report_code: r.report_code, submitted_at: r.submitted_at, health: r.final_health,
                observed_alive_count: r.observed_alive_count, species_name: r.final_species_name, parent_report_id: r.parent_report_id,
                expert_feedback: canView ? r.expert_feedback : null, can_view_details: canView,
                photo_url: canView && r.photo_path ? `photo.php?id=${r.id}` : null};
            });
          return send(res, {cluster, timeline});
        }
        case 'verification.php': {
          only('GET'); requireRole(user, 'expert', 'system_admin'); const rows = await service.reports(user);
          return send(res, {...reportList(rows, {...req.query, status: 'pending'}), summary: {
            pending: rows.filter(r => r.status === 'pending').length, verified: rows.filter(r => r.status === 'verified').length,
            rejected: rows.filter(r => r.status === 'rejected').length, verified_attention: rows.filter(r => r.status === 'verified' && r.needs_attention === 1).length}, species: await service.species()});
        }
        case 'review.php': only('POST'); return send(res, {result: await service.review(user, req.body ?? {}), message: 'Review saved.'});
        case 'validation-history.php': only('GET'); requireRole(user, 'expert', 'system_admin'); return send(res, paginate((await service.rows('verification_logs')).sort(newest), req.query.page));
        case 'checklist.php': {
          requireRole(user, 'system_admin');
          if (get) return send(res, {criteria: await service.criteria()});
          const {input, files} = await readInput(req); return send(res, await service.saveChecklist(user, input, files));
        }
        case 'analytics.php': only('GET'); return send(res, {analytics: await service.analytics(user, req.query)});
        case 'export-analytics.php': {
          only('GET'); requireRole(user, 'system_admin'); const analytics = await service.analytics(user, req.query);
          res.set({'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="ManGROOVES-analytics.pdf"'});
          const pdf = new PDFDocument({margin: 45}); pdf.pipe(res);
          pdf.fontSize(22).text('ManGROOVES monitoring report');
          pdf.moveDown().fontSize(11).text(`${analytics.filters.date_from} to ${analytics.filters.date_to}`);
          pdf.text(`Generated ${now()}`);
          pdf.moveDown();
          for (const [key, value] of Object.entries(analytics.verification)) pdf.text(`${key.replaceAll('_', ' ')}: ${value}`);
          pdf.moveDown().text(`Current survival: ${analytics.overall_survival === null ? 'No baseline available' : `${analytics.overall_survival}%`}`);
          pdf.text('Survival uses the latest verified count per site. Counts may cover different areas.');
          pdf.moveDown().fontSize(15).text('Verified health');
          for (const [key, value] of Object.entries(analytics.health)) pdf.fontSize(11).text(`${key}: ${value}`);
          pdf.moveDown().fontSize(15).text('Sites needing attention');
          if (!analytics.high_risk.length) pdf.fontSize(11).text('None in this period.');
          for (const r of analytics.high_risk) pdf.fontSize(11).text(`${r.report_code} - ${r.cluster_name ?? 'Unassigned'} - ${r.final_health}`);
          pdf.end(); return;
        }
        case 'badges.php': only('GET'); return send(res, await service.badges(user));
        case 'certificate.php': {
          only('GET'); requireRole(user, 'guardian', 'system_admin'); const userId = user.role === 'guardian' ? user.id : integer(req.query.user_id, 'guardian');
          const id = integer(req.query.badge_id, 'badge'), award = await service.get('user_badges', `${userId}_${id}`), badge = await service.get('badges', id);
          if (!award || !badge) throw new AppError('Certificate not available.', 404);
          const owner = (await service.rows('users', [['id', '==', userId]]))[0];
          res.set({'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="ManGROOVES-certificate.pdf"'});
          const pdf = new PDFDocument({layout: 'landscape', margin: 60}); pdf.pipe(res);
          pdf.moveDown(3).fontSize(32).text('Certificate of Recognition', {align: 'center'});
          pdf.moveDown().fontSize(15).text('ManGROOVES recognizes', {align: 'center'});
          pdf.moveDown().fontSize(26).text(owner?.full_name ?? 'Coastal Guardian', {align: 'center'});
          pdf.moveDown().fontSize(18).text(award.badge_name_snapshot ?? badge.badge_name, {align: 'center'});
          pdf.moveDown().fontSize(12).text(award.description_snapshot ?? badge.description, {align: 'center'});
          pdf.moveDown(2).text(`${award.earned_at}\n${award.certificate_code}`, {align: 'center'}); pdf.end(); return;
        }
        case 'notifications.php': {
          await syncNotifications(service, user);
          let notifications = await service.rows('notifications', [['user_id', '==', user.id]]);
          if (post) {
            const input = req.body ?? {};
            if (!['mark_all', 'mark_read'].includes(input.action)) throw new AppError('Choose a notification action.');
            const id = input.action === 'mark_read' ? integer(input.id, 'notification') : null;
            const selected = notifications.filter(n => !n.read_at && (id === null || n.id === id));
            for (let start = 0; start < selected.length; start += 400) {
              const batch = db.batch(); for (const n of selected.slice(start, start + 400)) batch.update(service.ref('notifications', n.id), {read_at: now()}); await batch.commit();
            }
            notifications = await service.rows('notifications', [['user_id', '==', user.id]]);
          }
          const result = paginate(notifications.sort(newest), req.query.page);
          return send(res, {...result, notifications: result.items, unread: notifications.filter(n => !n.read_at).length});
        }
        case 'account-security.php': {
          only('POST'); const input = req.body ?? {};
          if (input.action !== 'password') throw new AppError('Choose a valid account action.');
          if (!req.claims.auth_time || Date.now() / 1000 - req.claims.auth_time > 300) throw new AppError('Confirm your current password again.', 401);
          const pass = password(input.new_password);
          if (pass !== input.new_password_confirmation) throw new AppError('The new passwords do not match.');
          await auth.updateUser(user.uid, {password: pass}); await auth.revokeRefreshTokens(user.uid);
          const batch = db.batch(); service.audit(batch, user, 'account.password_changed', 'user', user.id); await batch.commit();
          return send(res, {message: 'Password changed. Sign in again.'});
        }
        case 'users.php': {
          requireRole(user, 'system_admin');
          if (get) return send(res, paginate((await service.rows('users')).map(u => ({...publicUser(u), status: u.status})), req.query.page));
          const input = req.body ?? {}, id = integer(input.id, 'user');
          if (id === user.id) throw new AppError('Ask another administrator to change your access.');
          if (!ROLES.includes(input.role) || !['active', 'inactive'].includes(input.status)) throw new AppError('Choose a valid role and account status.');
          const target = (await service.rows('users', [['id', '==', id]]))[0];
          if (!target) throw new AppError('Account not found.', 404);
          await db.runTransaction(async tx => {
            const actor = await tx.get(service.ref('users', user.uid)); requireRole(actor.data(), 'system_admin');
            await tx.get(service.ref('users', target.uid));
            tx.update(service.ref('users', target.uid), {role: input.role, status: input.status});
            service.audit(tx, user, 'admin.access_updated', 'user', id, {role: input.role, status: input.status});
          });
          // Imported inactive accounts are disabled in Firebase Auth too.
          // Keep both services in sync when an administrator restores access.
          await auth.updateUser(target.uid, {disabled: input.status !== 'active'});
          await auth.revokeRefreshTokens(target.uid);
          return send(res, {message: 'Account access updated.'});
        }
        case 'species.php': {
          if (get) return send(res, {species: user.role === 'system_admin' ? await service.rows('species') : await service.species()});
          requireRole(user, 'system_admin'); const input = req.body ?? {}, id = input.id ? integer(input.id, 'species') : (await service.ids())[0];
          const fields = ['scientific_name', 'common_name', 'local_name', 'family', 'iucn_code', 'iucn_label', 'population_trend', 'root_type', 'leaf_shape', 'bark_texture'];
          const data = Object.fromEntries(fields.map(k => [k, text(input[k] ?? '', k.replaceAll('_', ' '), 255, ['scientific_name', 'common_name', 'root_type', 'leaf_shape', 'bark_texture'].includes(k))]));
          data.id = id; data.active = input.active === 0 ? 0 : 1;
          const batch = db.batch(); batch.set(service.ref('species', id), data, {merge: true}); service.audit(batch, user, 'admin.species_updated', 'species', id); await batch.commit();
          return send(res, {message: 'Species saved.', species: data});
        }
        case 'badge-settings.php': {
          requireRole(user, 'system_admin');
          if (get) return send(res, {badges: await service.rows('badges')});
          const input = req.body ?? {}, id = input.id ? integer(input.id, 'badge') : (await service.ids())[0];
          if (!['verified_reports', 'verified_followups', 'distinct_species', 'uncorrected_reports', 'steward_days'].includes(input.metric)) throw new AppError('Choose a badge metric.');
          const current = input.id ? await service.get('badges', id) : null;
          if (input.id && !current) throw new AppError('Badge not found.', 404);
          const badge = {id, code: current?.code ?? `badge_${id}`, badge_name: text(input.badge_name, 'a badge name', 120), description: text(input.description, 'a badge description', 1000),
            metric: input.metric, target_value: integer(input.target_value, 'target', 1, 1000000), active: input.active === 0 ? 0 : 1, image_path: current?.image_path ?? 'img/badges/first-report.svg'};
          const batch = db.batch(); batch.set(service.ref('badges', id), badge, {merge: true}); service.audit(batch, user, 'admin.badge_updated', 'badge', id); await batch.commit();
          return send(res, {message: 'Badge saved.'});
        }
        case 'audit.php': only('GET'); requireRole(user, 'system_admin'); return send(res, paginate((await service.rows('audit_logs')).sort(newest), req.query.page));
        default: throw new AppError('Page not found.', 404);
      }
    } catch (error) { next(error); }
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof AppError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    // Never log submitted credentials, photos, bearer tokens, or raw bodies.
    if (status === 500) console.error('API failure', {route: path(req), code: error.code ?? error.name, message: error.message});
    res.status(status).json({ok: false, message: error instanceof AppError ? error.message : status === 413 ? 'The upload is too large.' : status === 400 ? 'Invalid form data.' : 'Could not complete the request. Try again.'});
  });
  return app;
}

async function syncNotifications(service, user) {
  const dashboard = await service.dashboard(user);
  const candidates = user.role === 'guardian' ? dashboard.reminders.map(r => ({key: `followup_${r.id}`, report_id: r.id, title: 'Follow-up due', message: `Visit ${r.cluster_name ?? r.report_code} again.`}))
    : (await service.reports(user)).filter(r => r.status === 'pending').map(r => ({key: `review_${r.id}`, report_id: r.id, title: 'Report ready for review', message: `${r.report_code} needs a health and species check.`}));
  for (const candidate of candidates) {
    const claim = service.ref('notification_keys', `${user.id}_${candidate.key}`);
    if ((await claim.get()).exists) continue;
    const [id] = await service.ids();
    await service.db.runTransaction(async tx => {
      if ((await tx.get(claim)).exists) return;
      tx.create(claim, {id});
      service.notification(tx, id, user.id, candidate.key, candidate.title, candidate.message, candidate.report_id);
    });
  }
}

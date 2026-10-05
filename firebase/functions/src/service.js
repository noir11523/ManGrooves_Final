import { createHash, randomUUID } from 'node:crypto';
import { Store } from './store.js';
import { AppError, HEALTH_VALUES, classify, integer, matchSpecies, now, password, publicUser, requireRole, text, updateCriterion, validateLocation, distanceMeters, manilaDate } from './domain.js';
import { analyticsForUser, badgeMetrics, dashboardStats, displayHealth, newest, reportList } from './analytics.js';
import { saveImage } from './uploads.js';

export class Service extends Store {
  constructor(db, auth, bucket) { super(db); this.auth = auth; this.bucket = bucket; }
  async user(uid) {
    const user = await this.get('users', uid);
    if (!user || user.status !== 'active') throw new AppError('Your account is unavailable. Contact the administrator.', 403);
    return user;
  }
  async limited(key, max) {
    const hash = createHash('sha256').update(key).digest('hex'), ref = this.ref('rate_limits', hash);
    await this.db.runTransaction(async tx => {
      const snap = await tx.get(ref), current = snap.data(), expired = !current || current.expires_at < Date.now();
      if (!expired && current.count >= max) throw new AppError('Too many attempts. Try again in an hour.', 429);
      tx.set(ref, {count: expired ? 1 : current.count + 1, expires_at: expired ? Date.now() + 3600000 : current.expires_at});
    });
  }
  async register(input, ip) {
    await this.limited(`register:${ip}`, 10);
    const first_name = text(input.first_name, 'your first name', 80), last_name = text(input.last_name, 'your last name', 80);
    const email = text(input.email, 'your email', 190).toLowerCase(), pass = password(input.password);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.');
    if (input.password_confirmation !== pass) throw new AppError('The passwords do not match.');
    if (![true, 1, '1'].includes(input.privacy_consent)) throw new AppError('Read and accept the privacy notice.');
    const barangay_id = integer(input.barangay_id, 'barangay'), barangay = await this.get('barangays', barangay_id);
    if (!barangay) throw new AppError('Choose an available barangay.');
    const phone = text(input.phone ?? '', 'your phone number', 30, false);
    if (phone && !/^[0-9+() .-]{7,30}$/.test(phone)) throw new AppError('Enter a valid phone number or leave it blank.');
    const [id] = await this.ids();
    let account;
    try { account = await this.auth.createUser({email, password: pass, displayName: `${first_name} ${last_name}`}); }
    catch (error) { if (error.code === 'auth/email-already-exists') throw new AppError('An account already uses this email. Sign in instead.'); throw error; }
    const user = {id, uid: account.uid, first_name, last_name, full_name: `${first_name} ${last_name}`, email, phone: phone || null,
      role: 'guardian', status: 'active', barangay_id, barangay_name: barangay.name, created_at: now(), privacy_consent_at: now()};
    try {
      const batch = this.db.batch();
      batch.create(this.ref('users', account.uid), user);
      batch.create(this.ref('audit_logs', randomUUID()), {user_id: id, action: 'account.registered', entity_type: 'user', entity_id: id, created_at: now()});
      await batch.commit();
    } catch (error) {
      // Account creation and Firestore are separate systems: only remove the
      // account we just created, never an existing Firebase user.
      await this.auth.deleteUser(account.uid).catch(() => {});
      throw error;
    }
    return {user: publicUser(user), message: 'Account created. Sign in to continue.'};
  }
  async criteria() {
    return (await this.rows('criteria')).filter(c => c.active !== 0).sort((a, b) => a.display_order - b.display_order);
  }
  async species() { return (await this.rows('species')).filter(s => s.active !== 0); }
  async reports(user) { return this.rows('reports', user.role === 'guardian' ? [['user_id', '==', user.id]] : []); }
  async clusters(user) {
    return (await this.rows('clusters', user.role === 'guardian' ? [['barangay_id', '==', user.barangay_id ?? -1]] : []))
      .map(c => ({...c, latitude: c.center_lat, longitude: c.center_lng}));
  }
  async form(user) {
    requireRole(user, 'guardian');
    const [criteria, clusters, species, barangay] = await Promise.all([this.criteria(), this.clusters(user), this.species(), this.get('barangays', user.barangay_id)]);
    return {criteria, clusters, species, location: {barangay, max_distance_meters: 5000, max_gps_accuracy_meters: 100},
      traits: Object.fromEntries(['root_type', 'leaf_shape', 'bark_texture'].map(k => [k, [...new Set(species.map(s => s[k]).filter(Boolean))].sort()]))};
  }
  async preview(user, input) {
    requireRole(user, 'guardian');
    const criteria = await this.criteria();
    if (!input.checklist_versions || criteria.some(c => input.checklist_versions[c.id] !== c.version)) {
      throw new AppError('The checklist changed. Reopen this form to see the latest choices.', 409);
    }
    return {classification: classify(criteria, input.observations), species: matchSpecies(await this.species(), input),
      checklist_versions: Object.fromEntries(criteria.map(c => [c.id, c.version]))};
  }
  async dashboard(user) {
    const [rows, clusters] = await Promise.all([this.reports(user), this.clusters(user)]);
    const children = new Set(rows.filter(r => r.status !== 'rejected').map(r => r.parent_report_id));
    const reminders = user.role === 'guardian' ? rows.filter(r => r.status === 'verified' && r.next_followup_date && !children.has(r.id)
      && r.next_followup_date <= manilaDate(Date.now() + 7 * 86400000))
      .map(r => ({id: r.id, report_code: r.report_code, cluster_id: r.cluster_id, cluster_name: r.cluster_name,
        next_followup_date: r.next_followup_date, due_state: r.next_followup_date < manilaDate() ? 'overdue' : 'due_soon'})) : [];
    return {user: publicUser(user), stats: dashboardStats(rows, clusters), latest_reports: reportList(rows).items.slice(0, 6), reminders, clusters};
  }
  async analytics(user, query = {}) { return analyticsForUser(user, await this.reports(user), await this.clusters(user), query); }
  async detail(user, id) {
    const report = await this.get('reports', id);
    if (!report || (user.role === 'guardian' && report.user_id !== user.id)) throw new AppError('Report not found.', 404);
    const {photo_path, photo_sha256, submission_digest, uid, ...visible} = report;
    const groups = new Map();
    for (const o of report.observation_snapshots ?? []) {
      if (!groups.has(o.criteria_code)) groups.set(o.criteria_code, {code: o.criteria_code, name: o.criteria_name, score_group: o.score_group, options: []});
      groups.get(o.criteria_code).options.push({label: o.option_label, points: o.option_code === 'unknown' ? null : o.points});
    }
    delete visible.observation_snapshots;
    return {...visible, observations: [...groups.values()], photo_url: photo_path ? `photo.php?id=${id}` : null,
      verification_history: (await this.rows('verification_logs', [['report_id', '==', id]])).sort((a, b) => a.created_at.localeCompare(b.created_at))};
  }
  async profile(user, input) {
    if (input) {
      if (input.email !== undefined && input.email !== user.email) throw new AppError('Your email address cannot be changed.');
      const first_name = text(input.first_name, 'your first name', 80), last_name = text(input.last_name, 'your last name', 80);
      const barangay_id = input.barangay_id ? integer(input.barangay_id, 'barangay') : null;
      const barangay = barangay_id ? await this.get('barangays', barangay_id) : null;
      if ((barangay_id && !barangay) || (!barangay && user.role === 'guardian')) throw new AppError('Choose an available barangay.');
      const phone = text(input.phone ?? '', 'your phone number', 30, false);
      if (phone && !/^[0-9+() .-]{7,30}$/.test(phone)) throw new AppError('Enter a valid phone number or leave it blank.');
      const update = {first_name, last_name, full_name: `${first_name} ${last_name}`, phone: phone || null, barangay_id, barangay_name: barangay?.name ?? null};
      await this.db.runTransaction(async tx => {
        const ref = this.ref('users', user.uid), snap = await tx.get(ref);
        if (snap.data()?.status !== 'active') throw new AppError('Please sign in again.', 401);
        tx.update(ref, update);
        this.audit(tx, user, 'account.profile_updated', 'user', user.id);
      });
      user = {...user, ...update};
    }
    return {user: publicUser(user), barangays: await this.rows('barangays'), message: input ? 'Profile updated.' : null};
  }
  audit(tx, user, action, entity_type, entity_id, details = {}) {
    tx.create(this.ref('audit_logs', randomUUID()), {user_id: user.id, actor_name: user.full_name, action, entity_type, entity_id, details, created_at: now()});
  }
  notification(tx, id, user_id, type, title, message, report_id = null) {
    tx.create(this.ref('notifications', id), {id, user_id, type, title, message, report_id,
      link: report_id ? `reports.php?id=${report_id}` : 'notifications.php', created_at: now(), read_at: null});
  }
  async saveChecklist(user, input, files) {
    requireRole(user, 'system_admin');
    const id = integer(input.id, 'checklist'), current = await this.get('criteria', id);
    if (!current) throw new AppError('Checklist not found.', 404);
    const ids = await this.ids(31);
    const updated = updateCriterion(current, input, () => ids.shift());
    const created = [];
    try {
      if (files.guide_image) {
        const upload = await saveImage(this.bucket, files.guide_image, 'checklist'); created.push(upload.path);
        updated.guide_image = `../mobile-api/checklist-photo.php?path=${encodeURIComponent(upload.path)}`;
      }
      for (const option of updated.options) {
        if (files[`option_image_${option.upload_id}`]) {
          const upload = await saveImage(this.bucket, files[`option_image_${option.upload_id}`], 'checklist'); created.push(upload.path);
          option.image_path = `../mobile-api/checklist-photo.php?path=${encodeURIComponent(upload.path)}`;
        }
        delete option.upload_id;
      }
      await this.db.runTransaction(async tx => {
        const ref = this.ref('criteria', id), fresh = await tx.get(ref), actor = await tx.get(this.ref('users', user.uid));
        requireRole(actor.data(), 'system_admin');
        if (fresh.data()?.version !== current.version) throw new AppError('This checklist changed. Reload before saving.', 409);
        tx.set(ref, updated);
        this.audit(tx, user, 'admin.checklist_updated', 'criteria', id, {before: current, after: updated});
      });
    } catch (error) { await Promise.all(created.map(path => this.bucket.file(path).delete().catch(() => {}))); throw error; }
    return {criteria: await this.criteria(), message: 'Checklist saved. New reports use these settings.'};
  }
  async submit(user, input, photo) {
    requireRole(user, 'guardian');
    if (String(input.field_confirmation) !== '1') throw new AppError('Confirm the photo, location, and observations are from this visit.');
    const [criteria, catalog, barangay] = await Promise.all([this.criteria(), this.species(), this.get('barangays', user.barangay_id)]);
    if (!input.checklist_versions || criteria.some(c => input.checklist_versions[c.id] !== c.version)) {
      throw new AppError('The checklist changed. Review your answers again before submitting.', 409);
    }
    const classification = classify(criteria, input.observations), matching = matchSpecies(catalog, input);
    const location = validateLocation(input, barangay);
    const requestedCluster = input.cluster_id ? integer(input.cluster_id, 'cluster') : null;
    const parentId = input.parent_report_id ? integer(input.parent_report_id, 'follow-up report') : null;
    const count = integer(input.observed_alive_count, 'living mangrove count', 0, 1000000);
    if (!requestedCluster && !parentId && !count) throw new AppError('A new site needs at least one living mangrove.');
    const fields = {sitio_name: text(input.sitio_name ?? '', 'the location name', 120),
      guardian_remarks: text(input.guardian_remarks ?? '', 'remarks', 5000, false),
      root_type: text(input.root_type, 'the root type', 190), leaf_shape: text(input.leaf_shape, 'the leaf shape', 190),
      bark_texture: text(input.bark_texture, 'the bark texture', 255)};
    if (!Buffer.isBuffer(photo)) throw new AppError('Add a photo from this visit.');
    const hash = createHash('sha256').update(photo).digest('hex');
    const digest = createHash('sha256').update(JSON.stringify({fields, location, requestedCluster, parentId, count, observations: classification.observations})).digest('hex');
    const claimRef = this.ref('photo_claims', `${user.id}_${hash}`);
    const existing = await claimRef.get();
    if (existing.exists) return this.repeatedSubmission(existing.data(), digest);
    const upload = await saveImage(this.bucket, photo, `reports/${user.id}`);
    const ids = await this.ids(4), [id, clusterId, noticeId] = ids;
    let stored = false;
    try {
      const result = await this.db.runTransaction(async tx => {
        const actor = await tx.get(this.ref('users', user.uid)); requireRole(actor.data(), 'guardian');
        if (actor.data().barangay_id !== user.barangay_id) throw new AppError('Your barangay changed. Reload the report form.', 409);
        const claim = await tx.get(claimRef);
        if (claim.exists) return this.repeatedSubmission(claim.data(), digest);
        // Serialize cluster selection and creation so simultaneous submissions
        // at the same location cannot create duplicate clusters.
        const lockRef = this.ref('meta', 'clusters'), lock = await tx.get(lockRef);
        const clusterDocs = await tx.get(this.db.collection('clusters').where('barangay_id', '==', user.barangay_id));
        const clusters = clusterDocs.docs.map(d => d.data());
        const parentRef = parentId ? this.ref('reports', parentId) : null;
        const parent = parentRef ? (await tx.get(parentRef)).data() : null;
        if (parentId && (!parent || parent.user_id !== user.id || parent.status !== 'verified' || !parent.cluster_id || parent.active_child_id)) throw new AppError('This follow-up is no longer available.');
        const selected = requestedCluster ?? parent?.cluster_id;
        if (parent && selected !== parent.cluster_id) throw new AppError('Use the same cluster as the previous report.');
        let cluster = selected ? clusters.find(c => c.id === selected) : null;
        if (selected && !cluster) throw new AppError('Choose a cluster in your barangay.');
        if (cluster) validateLocation(input, barangay, cluster);
        // Lock in the version used for scoring; admin edits require a fresh preview.
        for (const c of criteria) {
          const fresh = await tx.get(this.ref('criteria', c.id));
          if (fresh.data()?.version !== c.version) throw new AppError('The checklist changed. Review your answers again.', 409);
        }
        const verified = classification.status === 'Healthy';
        if (verified && !cluster) cluster = clusters.filter(c => distanceMeters(location.latitude, location.longitude, c.center_lat, c.center_lng) <= c.radius_meters)
          .sort((a, b) => distanceMeters(location.latitude, location.longitude, a.center_lat, a.center_lng) - distanceMeters(location.latitude, location.longitude, b.center_lat, b.center_lng))[0] ?? null;
        const time = now(), best = matching.best;
        if (verified && !cluster) cluster = {id: clusterId, cluster_code: `MGC-${clusterId}`, name: `${barangay.name} ${clusterId}`, barangay_id: user.barangay_id,
          barangay_name: barangay.name, center_lat: location.latitude, center_lng: location.longitude, radius_meters: 75, sitio_name: fields.sitio_name,
          initial_seedlings: count, verified_count: 0, latest_health: 'Unknown', rarity_level: 'Unassigned', created_at: time};
        const report = {id, report_code: `MGR-${manilaDate(time).replaceAll('-', '')}-${id}`, user_id: user.id, uid: user.uid,
          guardian_name: user.full_name, barangay_id: user.barangay_id, barangay_name: barangay.name, ...fields, ...location,
          cluster_id: cluster?.id ?? null, cluster_name: cluster?.name ?? null, parent_report_id: parentId, active_child_id: null,
          observed_alive_count: count, health_score: classification.health_score, health_max_score: 6, context_score: classification.context_score,
          environmental_score: classification.environmental_score, suggested_health: classification.status, final_health: verified ? 'Healthy' : null,
          suggested_species_id: best?.id ?? null, suggested_species_name: best?.scientific_name ?? null, species_confidence: best?.confidence ?? null,
          final_species_id: verified ? best?.id ?? null : null, final_species_name: verified ? best?.scientific_name ?? null : null,
          rarity_level: cluster?.rarity_level ?? 'Unassigned', status: verified ? 'verified' : 'pending', needs_attention: verified ? 0 : classification.status === 'At Risk' ? 1 : 0,
          photo_path: upload.path, photo_sha256: hash, submission_digest: digest, observation_snapshots: classification.observations,
          expert_id: null, expert_feedback: null, submitted_at: time, verified_at: verified ? time : null,
          next_followup_date: verified ? manilaDate(Date.now() + 30 * 86400000) : null};
        tx.create(this.ref('reports', id), report);
        tx.create(claimRef, {report_id: id, digest, report_code: report.report_code, status: report.status, cluster_id: report.cluster_id});
        tx.set(lockRef, {version: (lock.data()?.version ?? 0) + 1});
        if (parentRef) tx.update(parentRef, {active_child_id: id});
        if (verified) {
          tx.set(this.ref('clusters', cluster.id), {...cluster, verified_count: cluster.verified_count + 1,
            latest_health: report.final_health, latest_report_at: time, latest_report_id: id, observed_alive_count: count,
            species_id: report.final_species_id, scientific_name: report.final_species_name});
          this.logReview(tx, report, null, 'auto_verify', null);
        }
        this.notification(tx, noticeId, user.id, verified ? 'report_verified' : 'report_submitted', verified ? 'Report verified' : 'Report submitted',
          verified ? 'Your healthy report was verified automatically.' : 'An expert will review your report.', id);
        this.audit(tx, user, 'report.submitted', 'report', id, {status: report.status});
        return {report_id: id, report_code: report.report_code, status: report.status, cluster_id: report.cluster_id, new_badges: [], created: true};
      });
      stored = !!result.created;
      if (!stored) await this.bucket.file(upload.path).delete().catch(() => {});
      delete result.created;
      return {result, message: result.status === 'verified' ? 'Healthy report verified.' : 'Report submitted for review.'};
    } catch (error) { if (!stored) await this.bucket.file(upload.path).delete().catch(() => {}); throw error; }
  }
  repeatedSubmission(claim, digest) {
    if (claim.digest !== digest) throw new AppError('This photo was already submitted. Use a new photo for a new visit.', 409);
    return {report_id: claim.report_id, report_code: claim.report_code, status: claim.status, cluster_id: claim.cluster_id, new_badges: []};
  }
  logReview(tx, report, reviewer, action, previous) {
    tx.create(this.ref('verification_logs', randomUUID()), {report_id: report.id, report_code: report.report_code,
      verifier_id: reviewer?.id ?? null, verifier_name: reviewer?.full_name ?? 'Automatic verification', reviewer: reviewer?.full_name ?? 'Automatic verification',
      action, previous_status: previous?.status ?? 'pending', new_status: report.status, status: report.status,
      previous_health: previous?.final_health ?? previous?.suggested_health ?? report.suggested_health, new_health: report.final_health, health: report.final_health,
      previous_species_id: previous?.final_species_id ?? previous?.suggested_species_id ?? null, new_species_id: report.final_species_id,
      previous_species_name: previous?.final_species_name ?? previous?.suggested_species_name ?? null, new_species_name: report.final_species_name,
      comment: report.expert_feedback, created_at: now()});
  }
  async review(user, input) {
    requireRole(user, 'expert', 'system_admin');
    const id = integer(input.report_id, 'report'), action = input.action;
    if (!['confirm', 'correct', 'reject'].includes(action)) throw new AppError('Choose Confirm, Correct, or Reject.');
    const comment = text(input.expert_feedback ?? input.comment ?? '', 'feedback', 5000, action === 'reject');
    const catalog = await this.species(), [clusterId, noticeId] = await this.ids(2);
    return this.db.runTransaction(async tx => {
      const actor = await tx.get(this.ref('users', user.uid)); requireRole(actor.data(), 'expert', 'system_admin');
      const ref = this.ref('reports', id), snapshot = await tx.get(ref), previous = snapshot.data();
      if (!previous) throw new AppError('Report not found.', 404);
      if (previous.status !== 'pending') throw new AppError('This report was already reviewed. Refresh the queue.', 409);
      if (previous.user_id === user.id) throw new AppError('Ask another expert to review your own report.', 403);
      const lockRef = this.ref('meta', 'clusters'), lock = await tx.get(lockRef);
      const clusterDocs = await tx.get(this.db.collection('clusters').where('barangay_id', '==', previous.barangay_id));
      const clusters = clusterDocs.docs.map(d => d.data());
      const parentRef = previous.parent_report_id ? this.ref('reports', previous.parent_report_id) : null;
      if (parentRef) await tx.get(parentRef);
      const health = action === 'correct' ? input.final_health : previous.suggested_health;
      if (action !== 'reject' && !HEALTH_VALUES.includes(health)) throw new AppError('Choose a final health result for this report.');
      const speciesId = action === 'correct' ? (input.final_species_id ? integer(input.final_species_id, 'species') : null) : previous.suggested_species_id;
      const species = catalog.find(s => s.id === speciesId);
      if (action !== 'reject' && speciesId && !species) throw new AppError('Choose an available species.');
      const rarity = action === 'correct' ? input.rarity_level || previous.rarity_level : previous.rarity_level;
      if (!['Common', 'Vulnerable', 'Rare', 'Unassigned'].includes(rarity)) throw new AppError('Choose a valid rarity level.');
      let cluster = clusters.find(c => c.id === previous.cluster_id);
      if (action !== 'reject' && !cluster) cluster = clusters.filter(c => distanceMeters(previous.latitude, previous.longitude, c.center_lat, c.center_lng) <= c.radius_meters)
        .sort((a, b) => distanceMeters(previous.latitude, previous.longitude, a.center_lat, a.center_lng) - distanceMeters(previous.latitude, previous.longitude, b.center_lat, b.center_lng))[0];
      if (action !== 'reject' && !cluster) cluster = {id: clusterId, cluster_code: `MGC-${clusterId}`, name: `${previous.barangay_name} ${clusterId}`,
        barangay_id: previous.barangay_id, barangay_name: previous.barangay_name, center_lat: previous.latitude, center_lng: previous.longitude,
        sitio_name: previous.sitio_name, radius_meters: 75, initial_seedlings: previous.observed_alive_count, verified_count: 0,
        latest_report_at: '', latest_health: 'Unknown', created_at: now()};
      const report = {...previous, status: action === 'reject' ? 'rejected' : 'verified', final_health: action === 'reject' ? null : health,
        final_species_id: action === 'reject' ? null : speciesId, final_species_name: action === 'reject' ? null : species?.scientific_name ?? null,
        cluster_id: action === 'reject' ? previous.cluster_id : cluster.id, cluster_name: action === 'reject' ? previous.cluster_name : cluster.name,
        rarity_level: rarity, needs_attention: action !== 'reject' && String(input.needs_attention) === '1' ? 1 : 0,
        expert_id: user.id, expert_feedback: comment || null, verified_at: now(), corrected: action === 'correct',
        next_followup_date: action === 'reject' ? null : manilaDate(Date.now() + 30 * 86400000)};
      tx.set(ref, report);
      tx.set(lockRef, {version: (lock.data()?.version ?? 0) + 1});
      if (action === 'reject' && parentRef) tx.update(parentRef, {active_child_id: null});
      if (action !== 'reject') {
        const latest = previous.submitted_at >= (cluster.latest_report_at ?? '');
        tx.set(this.ref('clusters', cluster.id), {...cluster, verified_count: cluster.verified_count + 1,
          ...(latest ? {latest_health: report.final_health, latest_report_at: report.submitted_at, latest_report_id: report.id,
            observed_alive_count: report.observed_alive_count, species_id: speciesId, scientific_name: species?.scientific_name ?? null, rarity_level: rarity} : {})});
      }
      this.logReview(tx, report, user, action, previous);
      this.notification(tx, noticeId, report.user_id, `report_${report.status}`, action === 'reject' ? 'Report needs revision' : 'Report verified',
        comment || `Your report ${report.report_code} was verified.`, id);
      this.audit(tx, user, `report.${action}`, 'report', id, {previous_status: 'pending', status: report.status});
      return {report_id: id, user_id: report.user_id, status: report.status, cluster_id: report.cluster_id, new_badges: []};
    });
  }
  async badges(user) {
    requireRole(user, 'guardian');
    const metrics = badgeMetrics(await this.reports(user)), badges = await this.rows('badges');
    const results = [], existing = await this.rows('user_badges', [['user_id', '==', user.id]]);
    for (const badge of badges.filter(b => b.active !== 0 || existing.some(a => a.badge_id === b.id))) {
      const ref = this.ref('user_badges', `${user.id}_${badge.id}`), value = metrics[badge.metric] ?? 0;
      let award = (await ref.get()).data();
      if (!award && value >= badge.target_value) {
        award = {user_id: user.id, badge_id: badge.id, earned_at: now(), certificate_code: `MG-${randomUUID()}`,
          badge_name_snapshot: badge.badge_name, description_snapshot: badge.description, metric_snapshot: badge.metric,
          target_value_snapshot: badge.target_value, image_path_snapshot: badge.image_path ?? null};
        const [noticeId] = await this.ids();
        await this.db.runTransaction(async tx => {
          const previous = await tx.get(ref);
          if (previous.exists) { award = previous.data(); return; }
          tx.create(ref, award);
          this.notification(tx, noticeId, user.id, 'badge_earned', `Badge earned: ${badge.badge_name}`, badge.description);
        });
      }
      results.push({...badge, current_value: value, progress_percent: Math.min(100, Math.round(value / badge.target_value * 100)), earned: !!award, ...award,
        ...(award ? {badge_name: award.badge_name_snapshot ?? badge.badge_name, description: award.description_snapshot ?? badge.description,
          target_value: award.target_value_snapshot ?? badge.target_value, image_path: award.image_path_snapshot ?? badge.image_path} : {})});
    }
    return {metrics, badges: results};
  }
}

import {isNamedSite} from './site-access.js';
import {traitCatalog,selectedCustomTraits} from './trait-catalog.js';
import {photoError, reportPhotoHashes} from './report-photos.js';
import {withPhotoCredits, photoCredits} from './reference-photos.js';
import {followUpAvailable, followUpState, observationHistory} from './follow-up.js';
import {usableSite,visibleSite} from './site-access.js';
import { createHash, randomUUID } from 'node:crypto';
import { Store } from './store.js';
import { AppError, HEALTH_VALUES, classify, integer, matchSpecies, now, password, publicUser, requireRole, text, updateCriterion, validateLocation, distanceMeters, manilaDate } from './domain.js';
import { analyticsForUser, badgeMetrics, reportLabel, verifiedNeedsAttention, dashboardStats, displayHealth, newest, reportList } from './analytics.js';
import { saveImage } from './uploads.js';
import {startRegistration} from './registration.js';
import {profileDetails} from './profile-fields.js';
import {philippineBarangays,publicBarangay} from './barangays.js';
import {reviewFeedback} from './review-feedback.js';
import {queueNotification,followUpKey} from './notifications.js';
import {reportBarangay,withReportGeography,withinPhilippineSearchBounds} from './report-geography.js';

export class Service extends Store {
  constructor(db, auth, bucket, mailer = null) { super(db); this.auth = auth; this.bucket = bucket; this.mailer = mailer; }
  async rows(collection,filters=[]) {
    if(['reports','clusters'].includes(collection)) {
      const [rows,barangays]=await Promise.all([super.rows(collection,filters.filter(([key])=>key!=='barangay_id')),this.rows('barangays')]);
      return rows.map(row=>withReportGeography(row,barangays,collection==='clusters')).filter(row=>filters.filter(([key])=>key==='barangay_id').every(([key,op,value])=>op==='=='&&row[key]===value));
    }
    if(collection!=='barangays')return super.rows(collection,filters);
    const rows=philippineBarangays(await super.rows('barangays'));
    return rows.filter(row=>filters.every(([key,op,value])=>op==='=='&&row[key]===value));
  }
  async findBarangay(latitude,longitude,rows=null) {
    const local=reportBarangay(latitude,longitude,rows??undefined);
    if(local)return local;
    const latitudeValue=Number(latitude),longitudeValue=Number(longitude);
    if(!withinPhilippineSearchBounds(latitudeValue,longitudeValue))return null;
    if(typeof this.db.rpc!=='function')return null;
    let code;
    try {code=await this.db.rpc('app_barangay_code_at',{p_latitude:latitudeValue,p_longitude:longitudeValue});}
    catch(error) {
      // Older deployments still support the bundled Cebu boundaries. Missing
      // national lookup data must never assign the account's home barangay.
      if(['PGRST202','42883'].includes(error?.code))return null;
      throw new AppError('Location lookup is unavailable. Please try again.',503);
    }
    if(!code)return null;
    const directory=rows??await this.rows('barangays');
    return directory.find(row=>row.psgc_code===String(code))??null;
  }
  async get(collection,id) {
    if(collection==='barangays')return (await this.rows('barangays')).find(b=>String(b.id)===String(id))??null;
    if(['reports','clusters'].includes(collection))return withReportGeography(await super.get(collection,id),await this.rows('barangays'),collection==='clusters');
    return super.get(collection,id);
  }
  async user(uid) {
    const user = await this.get('users', uid);
    if(user?.status==='pending_approval') throw new AppError('Your expert application is waiting for admin approval.',403);
    if(user?.status==='rejected') {
      const application = await this.get('expert_applications', uid);
      const reason = application?.note?.trim();
      throw new AppError(`Your expert application was declined.${reason ? ` Reason: ${reason}` : ' Please contact the administrator for the reason.'}`,403);
    }
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
  async register(input,ip) { return startRegistration(this,input,ip); }
  async criteria() {
    return (await this.rows('criteria')).filter(c => c.active !== 0).sort((a, b) => a.display_order - b.display_order).map(withPhotoCredits);
  }
  async species() { return (await this.rows('species')).filter(s => !s.deleted_at && Number(s.active) !== 0); }
  // Staff use one durable sequence; guardians keep their personal sequence.
  async ensureStaffNumbers() {
    if (await this.get('meta','staff_report_sequence')) return;
    await this.db.runTransaction(async tx => {
      const ref=this.ref('meta','staff_report_sequence');
      if ((await tx.get(ref)).exists) return;
      const rows=(await this.transactionRows(tx,'reports')).sort((a,b)=>-newest(a,b));
      let last=0;
      for(const report of rows) tx.update(this.ref('reports',report.id),{staff_report_number:++last});
      tx.set(ref,{last_number:last});
    });
  }
  async reportViews(user, rows) {
    const [catalog,traitNames]=await Promise.all([this.rows('species'),this.get('meta','trait_catalog')]);
    rows=rows.map(r=>{const s=catalog.find(s=>s.id===(r.final_species_id??r.suggested_species_id))??catalog.find(s=>s.scientific_name===(r.final_species_name??r.suggested_species_name));const display=Object.fromEntries(['root_type','leaf_shape','bark_texture'].map(key=>['display_'+key,traitNames?.[key]?.find(c=>c.value===r[key])?.label??r[key]]));return {...r,...display,...(s?{species_local_name:s.local_name,species_common_name:s.common_name}:{})};});
    if(user.role==='guardian') return rows;
    return rows.map(r=>({...r,display_report_number:r.staff_report_number??r.id}));
  }
  async reports(user) {
    if(user.role!=='guardian') await this.ensureStaffNumbers();
    return this.reportViews(user,await this.rows('reports', user.role === 'guardian' ? [['user_id', '==', user.id]] : []));
  }
  async clusters(user) {
    const sites=await this.rows('clusters');
    return sites.filter(c => !c.location_pending && visibleSite(c,user))
      .map(c => ({...c, latitude: c.center_lat, longitude: c.center_lng}));
  }
  async form(user) {
    requireRole(user, 'guardian', 'expert');
    const [criteria, clusters, catalog, barangay, images] = await Promise.all([this.criteria(), this.clusters(user), this.rows('species'), this.get('barangays', user.barangay_id), this.get('meta','trait_images')]);
    const species=catalog.filter(s=>!s.deleted_at && Number(s.active)!==0);
    return {criteria, photo_credits:photoCredits, trait_images:images??{}, clusters:clusters.filter(c=>usableSite(c,user)&&Number(c.verified_count)>0&&isNamedSite(c)&&isNamedSite({name:c.sitio_name||c.name})&&reportBarangay(c.center_lat,c.center_lng)?.province==='Cebu'), species, location: {barangay, max_distance_meters:null, scope:'Cebu', max_gps_accuracy_meters: 100},
      ...await traitCatalog(this,{criteria,species:catalog.filter(s=>!s.deleted_at)})};
  }
  async preview(user, input) {
    requireRole(user, 'guardian', 'expert');
    const criteria = await this.criteria();
    if (!input.checklist_versions || criteria.some(c => input.checklist_versions[c.id] !== c.version)) {
      throw new AppError('The checklist changed. Reopen this form to see the latest choices.', 409);
    }
    const species=await this.species(),traits=await traitCatalog(this,{criteria,species});
    selectedCustomTraits(traits,input);
    return {classification: classify(criteria, input.observations), species: matchSpecies(species, input),
      checklist_versions: Object.fromEntries(criteria.map(c => [c.id, c.version]))};
  }
  async dashboard(user) {
    const [rows, clusters] = await Promise.all([this.reports(user), this.clusters(user)]);
    const children = new Set(rows.filter(r => r.status !== 'rejected').map(r => r.parent_report_id));
    const reminders = user.role === 'guardian' ? rows.filter(r => followUpAvailable(r) && !children.has(r.id))
      .map(r => ({id: r.id, report_code: reportLabel(r), cluster_id: r.cluster_id, cluster_name: r.cluster_name,
        expert_feedback:reviewFeedback(r), follow_up_note:reviewFeedback(r), due_state:'requested'})) : [];
    return {user: publicUser(user), stats: {...dashboardStats(rows, clusters), pending_review_reports: rows.filter(r=>r.status==='pending'&&r.user_id!==user.id).length}, latest_reports: reportList(rows).items.slice(0, 6), reminders, clusters:clusters.filter(c=>Number(c.verified_count)>0)};
  }
  async analytics(user, query = {}, reportRows = null) {
    const [rows,clusters]=await Promise.all([reportRows??this.reports(user),this.clusters(user)]);
    return analyticsForUser(user,rows,clusters.filter(c=>Number(c.verified_count)>0),query);
  }
  async detail(user, id) {
    if(user.role!=='guardian') await this.ensureStaffNumbers();
    let report = await this.get('reports', id);
    if (!report || (user.role === 'guardian' && report.user_id !== user.id)) throw new AppError('Report not found.', 404);
    [report]=await this.reportViews(user,[report]);
    const {photo_path, closeup_photo_path, extra_photo_paths, photo_sha256, photo_hashes, submission_digest, submission_token, uid, ...visible} = report;
    const groups = new Map();
    for (const o of report.observation_snapshots ?? []) {
      if (!groups.has(o.criteria_code)) groups.set(o.criteria_code, {code: o.criteria_code, name: o.criteria_name, score_group: o.score_group, options: []});
      groups.get(o.criteria_code).options.push({label: o.option_label, points: o.option_code === 'unknown' ? null : o.points});
    }
    delete visible.observation_snapshots;
    const speciesId=report.final_species_id??report.suggested_species_id;
    const species=speciesId?await this.get('species',speciesId):null;
    return {...visible, expert_feedback:reviewFeedback(report)||null, follow_up_note:null, species_local_name:species?.local_name??report.species_local_name, species_common_name:species?.common_name??report.species_common_name,
      can_follow_up:report.user_id===user.id && followUpAvailable(report), follow_up_state:followUpState(report),
      observation_history:observationHistory(report,await this.reportViews(user,await this.rows('reports',[['user_id','==',report.user_id]]))),
      extra_photo_urls:(extra_photo_paths??[]).map((_,index)=>`photo.php?id=${id}&view=extra&index=${index}`), closeup_photo_url:closeup_photo_path ? `photo.php?id=${id}&view=closeup` : null, report_code:reportLabel(report), needs_attention:verifiedNeedsAttention(report)?1:0, observations: [...groups.values()], photo_url: photo_path ? `photo.php?id=${id}` : null,
      verification_history: (await this.rows('verification_logs', [['report_id', '==', id]])).sort((a, b) => a.created_at.localeCompare(b.created_at))};
  }
  async profile(user, input) {
    if (input) {
      if (input.email !== undefined && input.email !== user.email) throw new AppError('Your email address cannot be changed.');
      const first_name = text(input.first_name, 'your first name', 80), last_name = text(input.last_name, 'your last name', 80);
      const update = {first_name, last_name, full_name: `${first_name} ${last_name}`, ...await profileDetails(this,input)};
      await this.db.runTransaction(async tx => {
        const ref = this.ref('users', user.uid), snap = await tx.get(ref);
        if (snap.data()?.status !== 'active') throw new AppError('Please sign in again.', 401);
        tx.update(ref, update);
        this.audit(tx, user, 'account.profile_updated', 'user', user.id);
      });
      user = {...user, ...update};
    }
    return {user: publicUser(user), barangays: (await this.rows('barangays')).map(publicBarangay), message: input ? 'Profile updated.' : null};
  }
  audit(tx, user, action, entity_type, entity_id, details = {}) {
    tx.create(this.ref('audit_logs', randomUUID()), {user_id: user.id, actor_name: user.full_name, action, entity_type, entity_id, details, created_at: now()});
  }
  notification(tx, id, user_id, type, title, message, report_id = null, extra = {}) {
    tx.create(this.ref('notifications', id), {id, user_id, type, title, message, report_id,
      link: report_id ? `reports.php?id=${report_id}` : type==='badge_earned'?'badges.php':extra.application_uid?`admin/expert-applications.php?uid=${encodeURIComponent(extra.application_uid)}`:'notifications.php',
      ...extra,created_at: now(), read_at: null});
  }
  async saveChecklist(user, input, files = {}) {
    requireRole(user, 'system_admin');
    const creating=input.action==='create';
    if(creating && !['single','multiple'].includes(input.selection_mode))throw new AppError('Choose an answer type.');
    if(creating && !Array.isArray(input.options))throw new AppError('Add choices before saving.');
    const id = creating ? (await this.ids())[0] : integer(input.id, 'checklist');
    const current = creating ? {id,code:`custom_${randomUUID().replaceAll('-','')}`,version:'new',active:1,display_order:999,selection_mode:input.selection_mode,score_group:'context',options:[],custom:true} : await this.get('criteria', id);
    if (!current) throw new AppError('Checklist not found.', 404);
    const ids = await this.ids(31);
    const updated = updateCriterion(current, creating ? {...input,version:'new'} : input, () => ids.shift());
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
        if(creating) {
          const all=await this.transactionRows(tx,'criteria');
          if(all.filter(c=>c.active!==0).length>=40)throw new AppError('Use up to 40 categories.');
          if(all.some(c=>c.active!==0&&c.name.toLowerCase()===updated.name.toLowerCase()))throw new AppError('This category name already exists.');
          updated.display_order=Math.max(0,...all.map(c=>Number(c.display_order)||0))+1;
        } else if (fresh.data()?.version !== current.version) throw new AppError('This checklist changed. Reload before saving.', 409);
        tx.set(ref, updated);
        this.audit(tx, user, 'admin.checklist_updated', 'criteria', id, {before: current, after: updated});
      });
    } catch (error) { await Promise.all(created.map(path => this.bucket.file(path).delete().catch(() => {}))); throw error; }
    return {criteria: await this.criteria(), message: 'Checklist saved. New reports use these settings.'};
  }
  async submit(user, input, photo, closeupPhoto = null, extraPhotos = []) {
    requireRole(user, 'guardian', 'expert');
    if (String(input.field_confirmation) !== '1') throw new AppError('Confirm the photo, location, and observations are from this visit.');
    const [criteria, catalog, barangays] = await Promise.all([this.criteria(), this.species(), this.rows('barangays')]);
    if (!input.checklist_versions || criteria.some(c => input.checklist_versions[c.id] !== c.version)) {
      throw new AppError('The checklist changed. Review your answers again before submitting.', 409);
    }
    const traits=await traitCatalog(this,{criteria,species:catalog}),custom=selectedCustomTraits(traits,input);
    const classification = classify(criteria, input.observations), matching = matchSpecies(catalog, input);
    const barangay=await this.findBarangay(input.latitude,input.longitude,barangays);
    if(!barangay || barangay.province!=='Cebu')throw new AppError('Place the pin inside a Cebu barangay.');
    const location = validateLocation(input, barangay);
    if (!isNamedSite({name:input.sitio_name}) || (input.address_state && input.address_state !== 'ready')) {
      throw new AppError('Choose an address before continuing.');
    }
    const requestedCluster = input.cluster_id ? integer(input.cluster_id, 'cluster') : null;
    const parentId = input.parent_report_id ? integer(input.parent_report_id, 'follow-up report') : null;
    const countUnknown = input.count_unknown === true || String(input.count_unknown) === '1';
    const count = countUnknown ? null : integer(input.observed_alive_count, 'living mangrove count', 0, 1000000);
    if (!countUnknown && !requestedCluster && !parentId && count === 0) throw new AppError('A new site needs at least one living mangrove.');
    const fields = {sitio_name: text(input.sitio_name ?? '', 'the location name', 120),
      guardian_remarks: text(input.guardian_remarks ?? '', 'remarks', 5000, false),
      root_type: text(input.root_type, 'the root type', 190), leaf_shape: text(input.leaf_shape, 'the leaf shape', 190),
      bark_texture: text(input.bark_texture, 'the bark texture', 255),...custom,
      trait_observations:Object.entries(custom).map(([key,value])=>({key,value,name:traits.trait_categories[key].name,label:traits.trait_labels[key][value]}))};
    if (!Buffer.isBuffer(photo)) throw new AppError('Add a photo from this visit.');
    if (input.photo_views === '2' && !Buffer.isBuffer(closeupPhoto)) throw new AppError('Add both a site overview and a close-up photo.');
    if (!Array.isArray(extraPhotos) || extraPhotos.length > 4 || extraPhotos.some(p=>!Buffer.isBuffer(p))) throw new AppError('Add up to four additional photos.');
    const photos = [photo,closeupPhoto,...extraPhotos].filter(Boolean);
    if (photos.reduce((n,p)=>n+p.length,0)>12*1024*1024) throw new AppError('Keep all photos together under 12 MB.');
    const hashes=reportPhotoHashes(photos);
    const submissionToken=text(input.submission_token??'', 'submission reference', 100, false);
    const closeupHash=closeupPhoto ? createHash('sha256').update(closeupPhoto).digest('hex') : null;
    const hash = createHash('sha256').update(photo).digest('hex');
    const digest = createHash('sha256').update(JSON.stringify({fields, location, requestedCluster, parentId, count, observations: classification.observations, ...(closeupHash ? {closeupHash} : {}), ...(extraPhotos.length ? {extraHashes:hashes.slice(closeupPhoto?2:1)} : {})})).digest('hex');
    const claimRef = this.ref('photo_claims', `${user.id}_${hash}`);
    const existing = await claimRef.get();
    if (existing.exists) return this.repeatedSubmission(existing.data(), digest, submissionToken);
    await this.ensureStaffNumbers();
    const upload = await saveImage(this.bucket, photo, `reports/${user.id}`);
    let closeupUpload; const extraUploads=[];
    try { if(closeupPhoto) closeupUpload=await saveImage(this.bucket,closeupPhoto,`reports/${user.id}`);
      for(const photo of extraPhotos) extraUploads.push(await saveImage(this.bucket,photo,`reports/${user.id}`)); }
    catch(error){await Promise.all([upload.path,closeupUpload?.path,...extraUploads.map(p=>p.path)].filter(Boolean).map(path=>this.bucket.file(path).delete().catch(()=>{})));throw error;}
    const ids = await this.ids(4), [id, clusterId, noticeId] = ids;
    let stored = false;
    try {
      const result = await this.db.runTransaction(async tx => {
        const actor = await tx.get(this.ref('users', user.uid)); requireRole(actor.data(), 'guardian', 'expert');
        if (actor.data().barangay_id !== user.barangay_id) throw new AppError('Your barangay changed. Reload the report form.', 409);
        const claim = await tx.get(claimRef);
        if (claim.exists) return this.repeatedSubmission(claim.data(), digest, submissionToken);
        const imageClaims=[];
        for(const [index,hash] of hashes.entries()) {
          const ref=this.ref('photo_claims',`image_${hash}`);
          if((await tx.get(ref)).exists) throw photoError('photo_already_submitted',[index]);
          imageClaims.push(ref);
        }
        for(const [index,bytes] of photos.entries()) {
          const rawHash=createHash('sha256').update(bytes).digest('hex');
          if((await this.transactionRows(tx,'reports',[['photo_sha256','==',rawHash]])).length) throw photoError('photo_already_submitted',[index]);
        }
        // Serialize cluster selection and creation so simultaneous submissions
        // at the same location cannot create duplicate clusters.
        const lockRef = this.ref('meta', 'clusters'), lock = await tx.get(lockRef);
        const clusters = (await this.transactionRows(tx, 'clusters')).map(c=>withReportGeography(c,barangays,true));
        const parentRef = parentId ? this.ref('reports', parentId) : null;
        const parent = parentRef ? (await tx.get(parentRef)).data() : null;
        if (parentId && (!parent || parent.user_id !== user.id || !followUpAvailable(parent))) throw new AppError('This follow-up is no longer available.');
        const selected = requestedCluster ?? parent?.cluster_id;
        if (parent && selected !== parent.cluster_id) throw new AppError('Use the same cluster as the previous report.');
        let cluster = selected ? clusters.find(c => c.id === selected) : null;
        if (selected && (!cluster || !usableSite(cluster,user) || !(Number(cluster.verified_count)>0))) throw new AppError('Choose a verified site or select New site.');
        if (cluster) { validateLocation(input, barangay, cluster); fields.sitio_name=cluster.sitio_name||cluster.name; }
        // Lock in the version used for scoring; admin edits require a fresh preview.
        for (const c of criteria) {
          const fresh = await tx.get(this.ref('criteria', c.id));
          if (fresh.data()?.version !== c.version) throw new AppError('The checklist changed. Review your answers again.', 409);
        }
        if(Object.keys(custom).length){const choices=(await tx.get(this.ref('meta','trait_catalog'))).data();for(const [key,value] of Object.entries(custom))if(!choices?.[key]?.some(c=>!c.deleted_at&&c.value===value))throw new AppError('A trait changed. Reopen the checklist.',409);}
        // Every observation requires an independent staff review.
        const time = now(), best = matching.best;
        if (!cluster) cluster = {id: clusterId, cluster_code: `MGC-${clusterId}`, name: fields.sitio_name, visibility:'personal', created_by:user.id, created_by_name:user.full_name, active:1, barangay_id: barangay.id,
          barangay_name: barangay.name, city_municipality:barangay.city_municipality, center_lat: location.latitude, center_lng: location.longitude, radius_meters: 75, sitio_name: fields.sitio_name,
          initial_seedlings: count, verified_count: 0, latest_health: 'Unknown', rarity_level: 'Unassigned', created_at: time};
        const sequenceRef=this.ref('meta',`report_sequence_${user.id}`), sequence=(await tx.get(sequenceRef)).data();
        const history=sequence ? [] : await this.transactionRows(tx,'reports',[['user_id','==',user.id]]);
        const report_number=(sequence?.last_number ?? Math.max(history.length,...history.map(r=>Number(r.report_number)||0)))+1;
        const staffSequenceRef=this.ref('meta','staff_report_sequence'),staffSequence=(await tx.get(staffSequenceRef)).data();
        const staff_report_number=(staffSequence?.last_number??0)+1;
        tx.set(staffSequenceRef,{last_number:staff_report_number});
        tx.set(sequenceRef,{last_number:report_number});
        const report = {id, report_number, staff_report_number, report_code: `Report #${report_number}`, user_id: user.id, uid: user.uid,
          guardian_name: user.full_name, barangay_id: barangay.id, barangay_name: barangay.name, city_municipality:barangay.city_municipality, ...fields, ...location,
          cluster_id: cluster?.id ?? null, cluster_name: cluster?.name ?? null, parent_report_id: parentId, active_child_id: null,
          observed_alive_count: count, count_unknown:countUnknown, needs_follow_up:false, follow_up_note:null, health_score: classification.health_score, health_max_score: 6, context_score: classification.context_score,
          environmental_score: classification.environmental_score, suggested_health: classification.status, final_health: null,
          species_local_name:best?.local_name??null, species_common_name:best?.common_name??null, suggested_species_id: best?.id ?? null, suggested_species_name: best?.scientific_name ?? null, species_confidence: best?.confidence ?? null,
          final_species_id: null, final_species_name: null,
          rarity_level: cluster?.rarity_level ?? 'Unassigned', status: 'pending', needs_attention: 0,
          photo_path: upload.path, closeup_photo_path:closeupUpload?.path??null, extra_photo_paths:extraUploads.map(p=>p.path), photo_hashes:hashes, photo_sha256: hash, submission_token:submissionToken||null, submission_digest: digest, observation_snapshots: classification.observations,
          expert_id: null, expert_feedback: null, submitted_at: time, verified_at: null,
          next_followup_date: null};
        tx.create(this.ref('reports', id), report);
        for(const ref of imageClaims) tx.create(ref,{report_id:id});
        tx.create(claimRef, {report_id: id, digest, submission_token:submissionToken||null, report_code: report.report_code, status: report.status, cluster_id: report.cluster_id});
        tx.set(lockRef, {version: (lock.data()?.version ?? 0) + 1});
        if (parentRef) tx.update(parentRef, {active_child_id: id});
        if(cluster.id===clusterId) tx.set(this.ref('clusters',cluster.id),cluster);
        this.notification(tx, noticeId, user.id, 'report_submitted', 'Report submitted', 'An expert will review your report.', id);
        this.audit(tx, user, 'report.submitted', 'report', id, {status: report.status});
        return {report_id: id, report_code: report.report_code, status: report.status, cluster_id: report.cluster_id, new_badges: [], created: true};
      });
      stored = !!result.created;
      if (!stored) await Promise.all([upload.path,closeupUpload?.path,...extraUploads.map(p=>p.path)].filter(Boolean).map(path=>this.bucket.file(path).delete().catch(()=>{})));
      delete result.created;
      return {result, message: 'Report submitted for review.'};
    } catch (error) { if (!stored) await Promise.all([upload.path,closeupUpload?.path,...extraUploads.map(p=>p.path)].filter(Boolean).map(path=>this.bucket.file(path).delete().catch(()=>{}))); throw error; }
  }
  repeatedSubmission(claim, digest, token = '') {
    if (claim.digest !== digest || (token && token !== claim.submission_token)) throw photoError('photo_already_submitted',[0]);
    return {report_id: claim.report_id, report_code: claim.report_code ?? `Report #${claim.report_id}`, status: claim.status, cluster_id: claim.cluster_id, new_badges: []};
  }
  logReview(tx, report, reviewer, action, previous) {
    tx.create(this.ref('verification_logs', randomUUID()), {report_id: report.id, report_number: report.report_number ?? null, report_code: report.report_code,
      verifier_id: reviewer?.id ?? null, verifier_name: reviewer?.full_name ?? 'Former reviewer', reviewer: reviewer?.full_name ?? 'Former reviewer',
      action, previous_status: previous?.status ?? 'pending', new_status: report.status, status: report.status,
      previous_health: previous?.final_health ?? previous?.suggested_health ?? report.suggested_health, new_health: report.final_health, health: report.final_health,
      previous_species_id: previous?.final_species_id ?? previous?.suggested_species_id ?? null, new_species_id: report.final_species_id,
      previous_species_name: previous?.final_species_name ?? previous?.suggested_species_name ?? null, new_species_name: report.final_species_name,
      comment: report.expert_feedback, needs_follow_up:!!report.needs_follow_up, follow_up_note:report.follow_up_note??null, created_at: now()});
  }
  async review(user, input) {
    requireRole(user, 'expert', 'system_admin');
    const id = integer(input.report_id, 'report'), action = input.action;
    if (action === 'followup') return this.updateFollowUp(user,input);
    if (!['confirm', 'correct', 'reject'].includes(action)) throw new AppError('Choose Confirm, Correct, or Reject.');
    const needsFollowUp = input.needs_follow_up === true || String(input.needs_follow_up)==='1';
    const comment = text(reviewFeedback({...input,expert_feedback:input.expert_feedback??input.comment}), 'feedback', 5000, action === 'reject');
    const catalog = await this.species(), [clusterId, noticeId] = await this.ids(2);
    return this.db.runTransaction(async tx => {
      const actor = await tx.get(this.ref('users', user.uid)); requireRole(actor.data(), 'expert', 'system_admin');
      const ref = this.ref('reports', id), snapshot = await tx.get(ref), previous = snapshot.data();
      if (!previous) throw new AppError('Report not found.', 404);
      if (previous.status !== 'pending') throw new AppError('This report was already reviewed. Refresh the queue.', 409);
      if (previous.user_id === user.id) throw new AppError('Ask another expert to review your own report.', 403);
      const lockRef = this.ref('meta', 'clusters'), lock = await tx.get(lockRef);
      const clusters = await this.transactionRows(tx, 'clusters', [['barangay_id', '==', previous.barangay_id]]);
      const parentRef = previous.parent_report_id ? this.ref('reports', previous.parent_report_id) : null;
      if (parentRef) await tx.get(parentRef);
      const health = action === 'correct' ? input.final_health : previous.suggested_health ?? 'Unknown';
      if(action==='confirm' && health==='Unknown')throw new AppError('Choose Correction to review an Unknown condition.');
      if (action !== 'reject' && ![...HEALTH_VALUES,'Unknown'].includes(health)) throw new AppError('Choose a condition result for this correction.');
      const speciesId = action === 'correct' ? (input.final_species_id ? integer(input.final_species_id, 'species') : null) : previous.suggested_species_id;
      const species = catalog.find(s => s.id === speciesId);
      if (action !== 'reject' && speciesId && !species) throw new AppError('Choose an available species.');
      const rarity = (action === 'correct' ? input.rarity_level || previous.rarity_level : previous.rarity_level) || 'Unassigned';
      if (!['Common', 'Vulnerable', 'Rare', 'Unassigned'].includes(rarity)) throw new AppError('Choose a valid rarity level.');
      let cluster = clusters.find(c => c.id === previous.cluster_id);
      if (action !== 'reject' && !cluster) cluster = {id: clusterId, cluster_code: `MGC-${clusterId}`, name: previous.sitio_name, visibility:'personal',created_by:previous.user_id,created_by_name:previous.guardian_name,active:1,
        barangay_id: previous.barangay_id, barangay_name: previous.barangay_name, center_lat: previous.latitude, center_lng: previous.longitude,
        sitio_name: previous.sitio_name, radius_meters: 75, initial_seedlings: previous.observed_alive_count, verified_count: 0,
        latest_report_at: '', latest_health: 'Unknown', created_at: now()};
      // A later resolved report can name a previously unresolved cluster.
      if(action!=='reject' && (!isNamedSite(cluster)||!isNamedSite({name:cluster.sitio_name||cluster.name})) && isNamedSite({name:previous.sitio_name})) {
        cluster={...cluster,name:previous.sitio_name,sitio_name:previous.sitio_name};
      }
      const report = {...previous, status: action === 'reject' ? 'rejected' : 'verified', final_health: action === 'reject' ? null : health,
        final_species_id: action === 'reject' ? null : speciesId, final_species_name: action === 'reject' ? null : species?.scientific_name ?? null,
        cluster_id: action === 'reject' ? previous.cluster_id : cluster.id, cluster_name: action === 'reject' ? previous.cluster_name : cluster.name,
        rarity_level: rarity, needs_attention: action !== 'reject' && ['Stressed','At Risk','Unknown'].includes(health) ? 1 : 0,
        species_local_name:action==='reject'?null:species?.local_name??null, species_common_name:action==='reject'?null:species?.common_name??null,
        needs_follow_up:action!=='reject'&&needsFollowUp, follow_up_note:null,
        follow_up_requested_at:action!=='reject'&&needsFollowUp?now():null,
        expert_id: user.id, expert_feedback: comment || null, verified_at: now(), corrected: action === 'correct',
        next_followup_date: null};
      tx.set(ref, report);
      tx.set(lockRef, {version: (lock.data()?.version ?? 0) + 1});
      if (action === 'reject' && parentRef) tx.update(parentRef, {active_child_id: null});
      if (action !== 'reject') {
        const latest = previous.submitted_at >= (cluster.latest_report_at ?? '');
        const namedSite=isNamedSite(cluster)&&isNamedSite({name:cluster.sitio_name||cluster.name});
        const publishSite = namedSite && cluster.visibility === 'personal' && !cluster.deleted_at && Number(cluster.active) !== 0;
        tx.set(this.ref('clusters', cluster.id), {...cluster, verified_count: (cluster.verified_count ?? 0) + 1, version:randomUUID(), updated_at:now(),
          ...(publishSite ? {visibility:'shared', approved_by:user.id, approved_by_name:user.full_name, approved_at:now()} : {}),
          ...(latest ? {latest_health: report.final_health, latest_report_at: report.submitted_at, latest_report_id: report.id,
            observed_alive_count: report.observed_alive_count, species_id: speciesId, scientific_name: species?.scientific_name ?? null, rarity_level: rarity} : {})});
        if (publishSite) this.audit(tx,user,'site.approve','cluster',cluster.id,{name:cluster.name,report_id:id,source:'report_verification'});
      }
      this.logReview(tx, report, user, action, previous);
      const owner=(await this.transactionRows(tx,'users',[['id','==',report.user_id]])).find(u=>u.status==='active');
      if(owner){
        this.notification(tx, noticeId, report.user_id, `report_${report.status}`, action === 'reject' ? 'Report declined' : needsFollowUp?'Report verified · Follow-up requested':action==='correct'?'Report verified with corrections':'Report verified',
          comment || (action==='reject'?'Your report was declined.':`Your ${report.report_code} was verified.`), id);
        if(report.needs_follow_up){const claim=this.ref('notification_keys',`${owner.id}_${followUpKey(report)}`);await tx.get(claim);tx.set(claim,{id:noticeId});}
      }
      this.audit(tx, user, `report.${action}`, 'report', id, {previous_status: 'pending', status: report.status});
      return {report_id: id, user_id: report.user_id, status: report.status, cluster_id: report.cluster_id, new_badges: []};
    });
  }
  async updateFollowUp(user,input) {
    requireRole(user,'expert','system_admin');
    const id=integer(input.report_id,'report');
    const needed=input.needs_follow_up===true||String(input.needs_follow_up)==='1';
    const [noticeId]=await this.ids();
    return this.db.runTransaction(async tx=>{
      requireRole((await tx.get(this.ref('users',user.uid))).data(),'expert','system_admin');
      const ref=this.ref('reports',id), report=(await tx.get(ref)).data();
      if(!report) throw new AppError('Report not found.',404);
      if(report.user_id===user.id) throw new AppError('Ask another expert to review your own report.',403);
      if(report.status!=='verified') throw new AppError('Verify this observation before requesting a follow-up.',409);
      const feedback = text(Object.hasOwn(input,'expert_feedback') ? input.expert_feedback : Object.hasOwn(input,'follow_up_note') ? reviewFeedback({...report,follow_up_note:input.follow_up_note}) : reviewFeedback(report), 'feedback',5000,false);
      const changedRequest=needed!==!!report.needs_follow_up,changedFeedback=feedback!==reviewFeedback(report);
      const requested=needed&&!report.needs_follow_up?now():report.follow_up_requested_at??null;
      const update={needs_follow_up:needed, expert_feedback:feedback||null, follow_up_note:null,follow_up_requested_at:requested};
      tx.update(ref,update);
      const owner=(await this.transactionRows(tx,'users',[['id','==',report.user_id]])).find(u=>u.status==='active');
      if(owner&&(changedRequest||changedFeedback)){
        if(needed&&changedRequest)await queueNotification(this,tx,noticeId,owner.id,followUpKey({...report,...update}),'followup_requested','Follow-up requested',feedback||'Please submit another observation for this site.',id);
        else this.notification(tx,noticeId,owner.id,changedRequest?'followup_cancelled':'feedback_updated',changedRequest?'Follow-up no longer needed':'Feedback updated',feedback||(changedRequest?'You no longer need to submit this follow-up.':'Your report has new feedback.'),id);
      }
      this.audit(tx,user,'report.follow_up_updated','report',id,{before:{needs_follow_up:!!report.needs_follow_up,expert_feedback:report.expert_feedback??null,follow_up_note:report.follow_up_note??null},after:update});
      return {report_id:id,...update};
    });
  }
  async badges(user) {
    requireRole(user, 'guardian', 'expert');
    const metrics = badgeMetrics(await this.rows('reports', [['user_id', '==', user.id]])), badges = await this.rows('badges');
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

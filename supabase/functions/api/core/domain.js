import { randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
export const HEALTH_CODES = ['leaf_color', 'pests', 'roots'];
export const SPECIAL_CODES = ['unknown', 'none_of_the_above', 'all_of_the_above'];
export const ROLES = ['guardian', 'expert', 'system_admin'];
export const HEALTH_VALUES = ['Healthy', 'Stressed', 'At Risk'];
export const now = () => new Date().toISOString();
export const manilaDate = (date = new Date()) => new Date(new Date(date).getTime() + 8 * 3600000).toISOString().slice(0, 10);
// Preserve the existing web/mobile API's local-time format while the cloud database
// keeps unambiguous UTC instants. Existing Flutter timelines split on spaces.
export function wireDates(value, key = '') {
  if (Array.isArray(value)) return value.map(item => wireDates(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, wireDates(v, k)]));
  if (key.endsWith('_at') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)) {
    return new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
  }
  return value;
}
export function requireRole(user, ...roles) {
  if (!user || user.status !== 'active' || !roles.includes(user.role)) throw new AppError('You do not have access to this action.', 403);
}
export function integer(value, label, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (!/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new AppError(`Enter a valid ${label}.`);
  }
  return Number(value);
}
export function text(value, label, max = 255, required = true) {
  if (typeof value !== 'string' || value.includes('\0') || [...value.trim()].length > max || (required && !value.trim())) {
    throw new AppError(`Enter ${label} (${max} characters or fewer).`);
  }
  return value.trim();
}
export function password(value) {
  if (typeof value !== 'string' || [...value].length < 8 || [...value].length > 25 || value.includes('\0') || Buffer.byteLength(value) > 72) {
    throw new AppError('Use 8 to 25 characters for your password.');
  }
  return value;
}
export function publicUser(user) {
  return Object.fromEntries(['id', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'role', 'barangay_id', 'barangay_name'].map(k => [k, user[k] ?? null]));
}
export function classify(criteria, selections) {
  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) throw new AppError('Choose your checklist answers.');
  if (HEALTH_CODES.some(code => !criteria.some(c => c.code === code))) throw new AppError('The health checklist needs an administrator check.', 503);
  let health = 0, context = 0, environment = 0, unknown = false;
  const observations = [], breakdown = [], selectedCodes = {};
  for (const criterion of criteria) {
    const {code, options} = criterion;
    const raw = selections[code] ?? [];
    const ids = [...new Set((Array.isArray(raw) ? raw : [raw]).map(id => integer(id, 'checklist answer')))];
    if (criterion.selection_mode === 'single' && ids.length !== 1) throw new AppError(`Choose one answer for ${criterion.name}.`);
    selectedCodes[code] = [];
    for (const id of ids) {
      const option = options.find(o => o.id === id && o.active !== 0);
      if (!option) throw new AppError(`An answer for ${criterion.name} changed. Reload the checklist.`);
      const isHealth = HEALTH_CODES.includes(code);
      let points = option.points;
      if (SPECIAL_CODES.includes(option.code)) {
        if (ids.length !== 1 || (option.code === 'none_of_the_above' && criterion.selection_mode !== 'multiple')) throw new AppError(`Choose ${option.label} on its own.`);
        points = 0;
        if (option.code === 'unknown') unknown = true;
        if (option.code === 'all_of_the_above') {
          const included = options.filter(o => o.active !== 0 && !SPECIAL_CODES.includes(o.code));
          if (!included.length) throw new AppError('This checklist needs an administrator check.', 503);
          points = isHealth ? Math.min(...included.map(o => o.points)) : included.reduce((sum, o) => sum + o.points, 0);
          selectedCodes[code].push(...included.map(o => o.code));
        }
      } else selectedCodes[code].push(option.code);
      if (isHealth) {
        if (criterion.selection_mode !== 'single' || points < 0 || points > 2) throw new AppError('Health scoring needs an administrator check.', 503);
        health += points;
        breakdown.push({name: criterion.name, answer: option.label, points: option.code === 'unknown' ? null : points, max_points: 2});
      } else if (criterion.score_group === 'environment') environment += points;
      else context += points;
      observations.push({criteria_id: criterion.id, criteria_code: code, criteria_name: criterion.name,
        criteria_order: criterion.display_order, selection_mode: criterion.selection_mode, score_group: criterion.score_group,
        option_id: id, option_code: option.code, option_label: option.label, option_order: option.display_order, points});
    }
  }
  if (selectedCodes.negative_signs?.includes('no_animals') && selectedCodes.bio_indicators?.length) throw new AppError('Choose either animal sightings or No Animals at All.');
  return {status: unknown ? 'Unknown' : health === 6 ? 'Healthy' : health >= 3 ? 'Stressed' : 'At Risk',
    health_score: unknown ? null : health, health_max_score: 6, context_score: context, environmental_score: environment,
    needs_review: unknown, message: unknown ? 'An expert will check the uncertain answers.' : null,
    breakdown, observations, guide: '6 Healthy · 3–5 Stressed · 0–2 At Risk'};
}

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function validateLocation(input, barangay, cluster = null) {
  const coordinate = (value, limit, name) => {
    if (value == null || typeof value === 'boolean' || String(value).trim() === '' || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit) throw new AppError(`Choose a valid ${name}.`);
    return Number(value);
  };
  const latitude = coordinate(input.latitude, 90, 'latitude'), longitude = coordinate(input.longitude, 180, 'longitude');
  if (!barangay || distanceMeters(latitude, longitude, barangay.center_lat, barangay.center_lng) > 5000) throw new AppError('This pin is too far from your barangay. Check the location.');
  if (!['gps', 'manual'].includes(input.location_source)) throw new AppError('Use GPS or place the pin on the map.');
  let accuracy = null;
  if (input.location_source === 'gps') {
    if (input.location_accuracy == null || input.location_accuracy === '' || !Number.isFinite(Number(input.location_accuracy))) throw new AppError('Capture GPS accuracy again.');
    accuracy = Number(input.location_accuracy);
    if (accuracy < 0 || accuracy > 100) throw new AppError('Wait for a clearer GPS signal or place the pin manually.');
  }
  if (cluster && distanceMeters(latitude, longitude, cluster.center_lat, cluster.center_lng) > Math.max(10, cluster.radius_meters) + (accuracy ?? 0)) throw new AppError('The pin is outside the selected cluster. Check the location.');
  return {latitude, longitude, location_source: input.location_source, location_accuracy: accuracy};
}

export function normalizeTrait(value) {
  const stop = new Set(['a', 'an', 'and', 'or', 'the', 'to', 'with', 'like', 'of', 'n', 'na']);
  return [...new Set(String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t && !stop.has(t)))].sort().join(' ');
}
// Same recursive longest-common-substring count as PHP similar_text.
function similarCharacters(a, b) {
  let best = 0, ai = 0, bi = 0;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    let n = 0;
    while (a[i + n] && a[i + n] === b[j + n]) n++;
    if (n > best) { best = n; ai = i; bi = j; }
  }
  return best ? best + similarCharacters(a.slice(0, ai), b.slice(0, bi)) + similarCharacters(a.slice(ai + best), b.slice(bi + best)) : 0;
}
export function matchSpecies(catalog, traits) {
  const keys = ['root_type', 'leaf_shape', 'bark_texture'];
  const ranked = catalog.filter(s => s.active !== 0).map(species => {
    const trait_scores = Object.fromEntries(keys.map(key => {
      const a = normalizeTrait(traits[key]), b = normalizeTrait(species[key]);
      if (!a || !b) return [key, 0];
      if (a === b) return [key, 100];
      const left = a.split(' '), right = b.split(' '), union = new Set([...left, ...right]);
      const jaccard = left.filter(t => right.includes(t)).length / union.size;
      const characters = 2 * similarCharacters(a, b) / (a.length + b.length);
      return [key, Math.round(Math.max(a.includes(b) || b.includes(a) ? .9 : 0, jaccard * .7 + characters * .3) * 10000) / 100];
    }));
    return {...species, trait_scores, confidence: Math.round(Object.values(trait_scores).reduce((a, b) => a + b, 0) / 3 * 100) / 100};
  }).sort((a, b) => b.confidence - a.confidence || a.scientific_name.localeCompare(b.scientific_name));
  const best = keys.every(k => String(traits[k] ?? '').trim()) && ranked[0]?.confidence >= 45 && ranked[0]?.confidence !== ranked[1]?.confidence ? ranked[0] : null;
  return {best, ranked: ranked.slice(0, 5)};
}

export function updateCriterion(current, input, nextOptionId) {
  if (String(input.version) !== String(current.version)) throw new AppError('This checklist changed. Reload before saving.', 409);
  const name = text(input.name, 'a checklist name', 120), question_text = text(input.question_text, 'a short question');
  if (!Array.isArray(input.options) || input.options.length > 60) throw new AppError('Use up to 30 choices.');
  const seen = new Set(), codes = new Set(), options = [], archived = [...(current.archived_options ?? [])];
  for (const submitted of input.options) {
    const id = integer(submitted.id, 'choice ID', -1000000);
    if (!id || seen.has(id)) throw new AppError('Duplicate or invalid choice.');
    seen.add(id);
    const existing = current.options.find(o => o.id === id);
    if (id > 0 && !existing) throw new AppError('A choice changed. Reload the checklist.');
    if ([true, 1, '1'].includes(submitted.delete)) { if (existing) archived.push(existing); continue; }
    const kind = submitted.kind ?? 'standard';
    if (!existing && !['standard', ...SPECIAL_CODES].includes(kind)) throw new AppError('Choose a valid answer type.');
    const code = existing?.code ?? (kind === 'standard' ? `custom_${randomUUID().replaceAll('-', '')}` : kind);
    if (codes.has(code) || (code === 'none_of_the_above' && current.selection_mode !== 'multiple')) throw new AppError('This automatic answer is unavailable or already added.');
    codes.add(code);
    const special = SPECIAL_CODES.includes(code), health = HEALTH_CODES.includes(current.code);
    const points = integer(submitted.points, 'score', health ? 0 : -2, 2);
    if (special && points !== 0) throw new AppError('Automatic choices keep their scoring rule.');
    const restored = archived.find(o => o.code === code);
    options.push({id: existing?.id ?? restored?.id ?? nextOptionId(), code, label: text(submitted.label, 'a choice label', 190), points,
      image_path: submitted.remove_image ? null : existing?.image_path ?? null,
      display_order: existing?.display_order ?? options.length + 1, upload_id: id});
  }
  if (current.options.some(o => !seen.has(o.id))) throw new AppError('A choice is missing. Reload the complete checklist.');
  const normal = options.filter(o => !SPECIAL_CODES.includes(o.code));
  if (!normal.length || options.length > 30) throw new AppError('Keep at least one regular choice and at most 30 choices.');
  if (HEALTH_CODES.includes(current.code) && (!normal.some(o => o.points === 0) || !normal.some(o => o.points === 2))) throw new AppError('Keep a 0-point and a 2-point choice in each health check.');
  return {...current, name, question_text, options, archived_options: archived.filter(o => !codes.has(o.code)),
    guide_image: input.remove_guide ? null : current.guide_image, version: randomUUID()};
}

export function paginate(items, requested = 1, pageSize = 20) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requested) || 1)));
  return {items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pages};
}

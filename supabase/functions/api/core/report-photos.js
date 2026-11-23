import {createHash} from 'node:crypto';
import {AppError, requireRole, text} from './domain.js';
import {cleanImage} from './images.js';
import {validatePhotoQuality} from './photo-quality.js';

export function photoError(code, indices = []) {
  const message = code === 'photo_duplicate'
    ? 'Photo already added. Choose another.'
    : 'Photo already used. Choose a new one.';
  return Object.assign(new AppError(message, code === 'photo_duplicate' ? 422 : 409), {code, photo_indices: indices});
}

// Both preflight and final submission use the same metadata-free fingerprints.
export function reportPhotoHashes(photos, candidate = null) {
  if (!Array.isArray(photos) || !photos.length || photos.length > 10) throw new AppError('Choose 1 to 10 photos.');
  if(photos.some(p=>!Buffer.isBuffer(p)))throw Object.assign(new AppError('Could not read this photo. Please choose another.'),{code:'photo_unclear'});
  if (photos.reduce((sum,p) => sum + p.length, 0) > 12 * 1024 * 1024) throw new AppError('Keep all photos together under 12 MB.');
  // Sequential decoding bounds memory. Both preflight and final submission call
  // this before any report image, database row, or photo claim is written.
  if (candidate !== null && (!Number.isInteger(candidate) || candidate < 0 || candidate >= photos.length)) throw new AppError('Choose this photo again.');
  const hashes = photos.map((photo,index) => {
    if (candidate === null || index === candidate) validatePhotoQuality(photo,index);
    try { return createHash('sha256').update(cleanImage(photo).bytes).digest('hex'); }
    catch (error) {
      // A damaged photo in a restored draft must never reject its replacement.
      if (candidate !== null && index !== candidate) return null;
      throw error;
    }
  });
  const duplicates = candidate === null
    ? hashes.flatMap((hash,i) => hashes.indexOf(hash) < i ? [i] : [])
    : hashes.some((hash,i) => i !== candidate && hash === hashes[candidate]) ? [candidate] : [];
  if (duplicates.length) throw photoError('photo_duplicate', duplicates);
  return hashes;
}

export async function checkReportPhotos(service, user, photos, token = '', candidate = null) {
  requireRole(user, 'guardian', 'expert');
  const submissionToken = text(token, 'submission reference', 100, false);
  const hashes = reportPhotoHashes(photos,candidate), conflicts = [];
  // Read only: choosing a file never reserves it, creates a report, or sends an alert.
  for (let i = 0; i < photos.length; i++) {
    if (candidate !== null && candidate !== i) continue;
    const claim = await service.get('photo_claims', `image_${hashes[i]}`);
    const raw = createHash('sha256').update(photos[i]).digest('hex');
    const reports = claim ? [await service.get('reports', claim.report_id)] : await service.rows('reports', [['photo_sha256','==',raw]]);
    const sameAttempt = report => report?.user_id === user.id && submissionToken && report.submission_token === submissionToken;
    if ((claim && !reports[0]) || reports.some(report => !sameAttempt(report))) conflicts.push(i);
  }
  if (conflicts.length) throw photoError('photo_already_submitted', conflicts);
  return {message: 'Photos checked.'};
}

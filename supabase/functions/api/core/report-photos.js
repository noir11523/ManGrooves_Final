import {createHash} from 'node:crypto';
import {AppError, requireRole, text} from './domain.js';
import {cleanImage} from './images.js';

export function photoError(code, indices = []) {
  const message = code === 'photo_duplicate'
    ? 'Photo already added. Choose another.'
    : 'Photo already used. Choose a new one.';
  return Object.assign(new AppError(message, code === 'photo_duplicate' ? 422 : 409), {code, photo_indices: indices});
}

// Both preflight and final submission use the same metadata-free fingerprints.
export function reportPhotoHashes(photos) {
  if (!Array.isArray(photos) || !photos.length || photos.length > 6) throw new AppError('Choose 1 to 6 photos.');
  if (photos.some(p => !Buffer.isBuffer(p) || !p.length || p.length > 5 * 1024 * 1024)) throw new AppError('Use photos under 5 MB each.');
  if (photos.reduce((sum,p) => sum + p.length, 0) > 12 * 1024 * 1024) throw new AppError('Keep all photos together under 12 MB.');
  const images=photos.map(p=>{try{return cleanImage(p);}catch{throw new AppError('Choose a valid JPG, PNG, or WebP photo.');}});
  const hashes=images.map(image=>createHash('sha256').update(image.bytes).digest('hex'));
  const duplicates = hashes.flatMap((hash,i) => hashes.indexOf(hash) < i ? [i] : []);
  if (duplicates.length) throw photoError('photo_duplicate', duplicates);
  const small=images.flatMap((image,i)=>Math.min(image.width,image.height)<240?[i]:[]);
  if(small.length)throw Object.assign(new AppError('Photo is too small. Use a clearer photo.'),{code:'photo_unclear',photo_indices:small});
  return hashes;
}

export async function checkReportPhotos(service, user, photos, token = '') {
  requireRole(user, 'guardian', 'expert');
  const submissionToken = text(token, 'submission reference', 100, false);
  const hashes = reportPhotoHashes(photos), conflicts = [];
  // Read only: choosing a file never reserves it, creates a report, or sends an alert.
  for (let i = 0; i < photos.length; i++) {
    const claim = await service.get('photo_claims', `image_${hashes[i]}`);
    const raw = createHash('sha256').update(photos[i]).digest('hex');
    const reports = claim ? [await service.get('reports', claim.report_id)] : await service.rows('reports', [['photo_sha256','==',raw]]);
    const sameAttempt = report => report?.user_id === user.id && submissionToken && report.submission_token === submissionToken;
    if ((claim && !reports[0]) || reports.some(report => !sameAttempt(report))) conflicts.push(i);
  }
  if (conflicts.length) throw photoError('photo_already_submitted', conflicts);
  return {message: 'Photos checked.'};
}

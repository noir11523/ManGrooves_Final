import Busboy from 'busboy';
import { cleanImage } from './images.js';
import { createHash, randomUUID } from 'node:crypto';
import { AppError } from './domain.js';

export async function readInput(req) {
  if (!req.is('multipart/form-data')) return {input: req.body ?? {}, files: {}};
  return new Promise((resolve, reject) => {
    const fields = {}, files = {}, pending = [];
    let failed = false, totalBytes = 0;
    const fail = () => { failed = true; };
    const parser = Busboy({headers: req.headers, limits: {files: 31, fields: 150, fileSize: 5 * 1024 * 1024, fieldSize: 256 * 1024}});
    parser.on('file', (name, stream) => {
      if (Object.hasOwn(files, name)) fail();
      const chunks = [];
      files[name] = null;
      pending.push(new Promise((done, error) => {
        stream.on('limit', fail);
        stream.on('data', chunk => {
          totalBytes += chunk.length;
          if (totalBytes > 8 * 1024 * 1024) fail();
          if (!failed) chunks.push(chunk);
        });
        stream.on('end', () => { files[name] = Buffer.concat(chunks); done(); });
        stream.on('error', error);
      }));
    });
    parser.on('field', (name, value, info) => { if (info.valueTruncated || Object.hasOwn(fields, name)) fail(); fields[name] = value; });
    parser.on('filesLimit', fail).on('fieldsLimit', fail).on('partsLimit', fail).on('error', reject);
    parser.on('close', async () => {
      try {
        await Promise.all(pending);
        if (totalBytes > 8 * 1024 * 1024) throw new AppError('Keep each save under 8 MB. Save photos in smaller batches.');
        if (failed) throw new AppError('Use photos under 5 MB and no more than 30 choice photos.');
        const input = fields.payload ? JSON.parse(fields.payload) : {...fields};
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Invalid form data.');
        for (const [key, value] of Object.entries(fields)) {
          const match = key.match(/^observations\[([a-z0-9_]+)\]\[\d+\]$/);
          if (match) { input.observations ??= {}; (input.observations[match[1]] ??= []).push(value); delete input[key]; }
        }
        resolve({input, files});
      } catch (error) { reject(error instanceof SyntaxError ? new AppError('Invalid form data.') : error); }
    });
    if (req.rawBody) parser.end(req.rawBody); else req.pipe(parser);
  });
}

export async function saveImage(bucket, bytes, folder) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new AppError('Choose a photo under 5 MB.');
  let image;
  try {
    image = cleanImage(bytes);
  } catch { throw new AppError('Choose a valid JPG, PNG, or WebP photo.'); }
  const path = `${folder}/${randomUUID()}.${image.extension}`;
  await bucket.file(path).save(image.bytes, {resumable: false, contentType: image.contentType, metadata: {cacheControl: 'private, no-store'}});
  return {path, sha256: createHash('sha256').update(bytes).digest('hex')};
}

export async function sendImage(bucket, path, res) {
  if (typeof path !== 'string' || !/^(reports|checklist|expert_ids|signatures)\/[a-zA-Z0-9/_-]+\.(jpg|png|webp)$/.test(path)) throw new AppError('Photo not found.', 404);
  const file = bucket.file(path);
  if (!(await file.exists())[0]) throw new AppError('Photo not found.', 404);
  res.set('Content-Type', path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  res.set('Cache-Control', 'private, no-store');
  file.createReadStream().on('error', () => { if (!res.headersSent) res.status(404).end(); else res.destroy(); }).pipe(res);
}

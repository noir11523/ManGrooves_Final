import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../functions/api/core/photo-quality-config.json',import.meta.url),new URL('../../mobile/flutter_app/assets/config/photo_quality.json',import.meta.url));
console.log('Android photo upload safety limits synchronized. Rebuild the web, API and APK after changing limits.');

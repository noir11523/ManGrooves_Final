import {esc} from './ui.js';
export function photoCredit(credit) {
  if(!credit)return '';
  const link=(url,label)=>/^https:\/\//.test(url??'') ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
  return `<small class="photo-credit">${credit.kind==='generated'?'AI illustration':`Photo: ${link(credit.source,credit.author)}`} · ${link(credit.license_url,credit.license)}${credit.changes?` · ${esc(credit.changes)}`:''}${credit.note?`<br>${esc(credit.note)}`:''}</small>`;
}

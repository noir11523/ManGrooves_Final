import {writeFile} from 'node:fs/promises';
import catalog from '../functions/api/data/observation-photos.json' with {type:'json'};
const e=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const labels=path=>[...new Set(['choices','traits'].flatMap(section=>Object.entries(catalog[section]).flatMap(([group,values])=>Object.entries(values).filter(([,p])=>p===path).map(([value])=>catalog.labels?.[group]?.[value]??value))))];
const entries=catalog.photos.map(p=>`<article><img src="${e(p.path)}" alt="${e(labels(p.path).join(' / '))}" loading="lazy"><div><h2>${e(labels(p.path).join(' / '))}</h2><p>${e(p.author)} · ${p.license_url?`<a href="${e(p.license_url)}">${e(p.license)}</a>`:e(p.license)}</p><p><a href="${e(p.source)}">Original photo</a></p><p>${e(p.changes)}</p>${p.note?`<p>${e(p.note)}</p>`:''}</div></article>`);
const page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo credits — ManGROOVES</title><style>body{font:16px/1.6 system-ui;margin:24px auto;padding:0 18px;max-width:900px;color:#23372a;background:#fafbf8}article{display:flex;gap:20px;border-top:1px solid #d0d9cd;padding:20px 0}img{width:150px;height:150px;object-fit:contain}h2{font-size:18px}a{color:#2a592c}@media(max-width:500px){article{display:block}img{width:100%}}</style><h1>Photo credits</h1><p>Reference pictures illustrate visible features. Original rights, watermarks and research annotations are retained.</p>'+entries.join('')+'</html>';
await writeFile(new URL('../../public/assets/observation-photo-credits.html',import.meta.url),page);
const drive=catalog.photos.filter(p=>p.source_folder).length;
const table=['| Category | Choice / trait value | Photo |','| --- | --- | --- |'];
for(const section of ['choices','traits'])for(const [group,values] of Object.entries(catalog[section]))for(const [value,path] of Object.entries(values))table.push(`| ${group} | ${catalog.labels?.[group]?.[value]??value} | [${path.split('/').at(-1)}](../public/assets/${path}) |`);
let docs=`# Observation choice photographs

Catalog version ${catalog.version} contains **${catalog.photos.length} real photographs**, including **${drive} Drive photographs/details**. No active mapping uses an AI image or collage. Choice labels remain visible; source and processing details stay in the separate [credits resource](../public/assets/observation-photo-credits.html), with no inline credit beneath a choice.

## Review of label matches

The [shared Drive folder](${catalog.drive_folder}) was checked on 7 November 2026: 9 folders, 63 files, including 56 photographs. All 56 source photos were visually reviewed. Fourteen selected originals were freshly downloaded and matched the cached originals byte for byte. Duplicate source files were not treated as independent confirmation of species identity.

- Replaced the complete uprooted-tree example with a photographic example of superficial root damage (Hendy & Cragg, Figure 2A). It illustrates **some damage**, not measurable looseness.
- Replaced the dead whole-tree example with an actual deteriorated root photographed with wood-borer tunnels (Hendy & Cragg, Figure 1B).
- Restored the visibly chewed Lumnitzera leaf example for damaged leaves. Normal Rhizophora cork warts are not presented as disease or insect damage.
- Replaced the distant leaf canopy used for dark dots with an actual Rhizophora mucronata leaf-underside photograph (Ngernsaengsaruay et al., Figure 9F).
- Separated intact bark and flaking bark. Clearer Drive bark details show texture; a licensed fissured-bark fallback shows the deep-cracks example at its original resolution.
- Used a whole Nypa palm for the bark-not-applicable choice. Added the existing localized leaf-shape value \`Oval nga dahon (Elliptic)\` to the image mappings so that choice has a photo.
- The two pencil-root values and the two prop/stilt-root values describe equivalent visible structures; sharing a suitable photo is intentional. No species definitions or saved answers were merged.
- The Drive file named \`looping_roots_01.jpg\` shows basal supports, not clear loops; a licensed real knee-root example remains a **shape illustration**, not proof of Lumnitzera identity.

The reviewed pictures show visible examples, not a diagnosis. A photograph cannot establish root firmness, brittleness, absence of pests, or overall condition. Bark fissures and tiny leaf cork warts may be natural features. Expert review remains required. Not Sure and the combination/absence choices stay text-only; they have no single corresponding photograph. Existing administrator uploads are preserved by the installer.

## Sources supporting the replacements

- [Hendy & Cragg (2017), Hydrobiologia, DOI:10.1007/s10750-017-3106-6](https://link.springer.com/article/10.1007/s10750-017-3106-6), Figures 1B and 2A; CC BY 4.0. The article identifies superficial experimental damage and necrotic/dead tissue associated with root-borer tunnels.
- [Ngernsaengsaruay et al. (2024), PeerJ 12:e17460](https://peerj.com/articles/17460/) ([open full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC11216214/)), Figure 9F, photograph by Chatchai Ngernsaengsaruay; CC BY 4.0. The figure documents natural cork warts on the underside of R. mucronata leaves.
- [Homer Edward Price, black-mangrove bark](https://commons.wikimedia.org/wiki/File:Black-mangrove-bark_(13746385495).gif); CC BY 2.0. This is a texture example of Avicennia germinans, not a species match for every tree with fissured bark.
- [University of Florida, Lumnitzera racemosa](https://plant-directory.ifas.ufl.edu/plant-directory/lumnitzera-racemosa/) describes occasionally looping lateral roots. The shape illustration does not replace a botanical identification.

## Installation and safety

The manifest is \`supabase/functions/api/data/observation-photos.json\`. Preview with \`node supabase/scripts/install-observation-photos.js --project YOUR_PROJECT_REF\` using the operator key locally; add \`--apply\` to install. It verifies JPEG checksums, backs up the current references under ignored \`tmp/reference-photo-backups\`, uploads versioned assets, and changes only eligible default image paths and checklist revision tokens. English seeded labels and original bilingual labels are accepted; administrator-edited labels and custom uploads remain protected. Revision tokens are UUIDs, avoiding invalid numeric conversions of edited checklist versions. Empty legacy tokens are repaired. Scores, option IDs, labels, species definitions and report history remain unchanged. Reinstallation is idempotent.

Web, mobile web and Flutter obtain current image paths from the same API; Android resolves packaged paths through the public \`mangrooves-reference\` Storage bucket. Refresh/reopen the form to retrieve the updates; an APK rebuild is not required for reference-data changes. Keep legacy assets available for old references. Regenerate this document and the attribution resource with \`node supabase/scripts/document-observation-photos.js\`.

## Active image mappings

${table.join('\n')}

## Per-photo sources
`;
for(const p of catalog.photos)docs+=`\n### ${p.path.split('/').at(-1)}\n\n- Source: [original](${p.source})\n- Credit: ${p.author}\n- License: ${p.license}${p.license_url?` ([details](${p.license_url}))`:''}\n- Changes: ${p.changes}\n${p.note?`- Note: ${p.note}\n`:''}`;
await writeFile(new URL('../../docs/OBSERVATION_PHOTOS.md',import.meta.url),docs);
console.log(`Documented ${catalog.photos.length} photos and ${table.length-2} image mappings.`);

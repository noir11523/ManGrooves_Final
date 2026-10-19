// Credits are keyed by immutable asset path. Replacing an admin photo cannot
// accidentally retain the attribution of the previous photograph.
import catalog from '../data/observation-photos.json' with {type:'json'};

export const photoCredits = Object.fromEntries(catalog.photos.map(photo => [photo.path, {
  kind: photo.kind ?? 'photograph',
  author: photo.author,
  source: photo.source,
  license: photo.license,
  license_url: photo.license_url,
  note: photo.note,
  changes: photo.changes,
}]));

export function withPhotoCredits(criterion) {
  return {...criterion, options: criterion.options.map(option => ({...option,
    image_credit: photoCredits[option.image_path] ?? null,
  }))};
}

// Fill only missing photos. Admin uploads and edits always take precedence.
export function planReferencePhotos(criteria, traitImages, species) {
  const updates=[];
  for(const criterion of criteria) {
    let changed=false;
    const options=criterion.options.map(option=>{
      const path=catalog.choices[criterion.code]?.[option.code];
      const expected=catalog.labels?.[criterion.code]?.[option.code];
      if(!path || option.image_path || (expected && option.label!==expected)) return option;
      changed=true;return {...option,image_path:path};
    });
    if(changed)updates.push({...criterion,options,version:Number(criterion.version||1)+1});
  }
  const images=structuredClone(traitImages??{});
  for(const [key,values] of Object.entries(catalog.traits)) {
    const active=new Set(species.map(s=>s[key]));
    for(const [value,path] of Object.entries(values))if(active.has(value) && !images[key]?.[value]){
      images[key]??={};images[key][value]=path;
    }
  }
  return {criteria:updates,trait_images:images};
}

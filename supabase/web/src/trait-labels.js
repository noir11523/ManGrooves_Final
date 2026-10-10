export const traitHeadings = {root_type:'Klase sa Gamot (Root Type)',leaf_shape:'Porma sa Dahon (Leaf Shape)',bark_texture:'Hitsura sa Panit sa Punoan (Bark Texture)'};
export const traitLabels = {
  'Creeping rhizomes':'Gamot nga nagkamang sa yuta',
  'Looping (older trees)':'Gamot nga nagkurba sama sa arko',
  'Pneumatophores (pencil-like projections)':'Gamot nga nagtindog sama sa lapis',
  'Pneumatophores (pencil-like)':'Gamot nga murag gagmayng lapis',
  'Prop roots':'Gamot nga nagsanga ug nagsuporta sa punoan',
  'Prop roots (stilt roots)':'Gamot nga murag mga tiil nga nagsuporta sa punoan',
  'Elliptic':'Oval nga dahon',
  'Elliptic (waxy, leaves point upward)':'Oval, sinaw ug nag-atubang pataas',
  'Elliptic (with dark dots)':'Oval nga naay itom nga tuldok',
  'Lanceolate (leaflets)':'Taas ug nipis nga dahon',
  'Obovate':'Mas lapad sa tumoy kaysa sa ubos',
  'N/A (palm)':'Dili applicable (palma)',
  'Rough, fibrous, brown with deep fissures':'Gaspang, naay lanot, brown ug lawom nga liki',
  'Rough, grayish to brown':'Gaspang, abohon hangtod brown',
  'Slightly rough, brown':'Medyo gaspang ug brown',
  'Smooth with thin flakes, greenish brown':'Hapsay, nipis nga napaksit, berde-brown',
};
export function traitImage(key,value) {
  const v=value.toLowerCase();
  if(key==='root_type')return v.includes('pneumat')?'pencil-roots':v.includes('loop')?'loop-roots':v.includes('rhizome')?'rhizomes':'prop-roots';
  if(key==='leaf_shape')return v.includes('lanceolate')?'lanceolate':v.includes('obovate')?'obovate':v.includes('dots')?'elliptic-dots':v.includes('upward')?'elliptic-upward':'elliptic';
  return v.includes('palm')?'palm-bark':v.includes('smooth')?'smooth-bark':v.includes('fissures')?'fissured-bark':'rough-bark';
}

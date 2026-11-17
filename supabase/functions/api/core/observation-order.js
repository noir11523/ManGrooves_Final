// Current configured order, with stable historical fallback for removed definitions.
export function orderedObservations(report, catalog, criteria) {
  const groups=new Map();
  for(const o of report.observation_snapshots??[]) {
    if(!groups.has(o.criteria_code))groups.set(o.criteria_code,{code:o.criteria_code,name:o.criteria_name,score_group:['leaf_color','pests','roots'].includes(o.criteria_code)?'health':'context',options:[]});
    groups.get(o.criteria_code).options.push({id:o.option_id,label:o.option_label,points:o.option_code==='unknown'?null:o.points,order:o.option_order});
  }
  for(const c of criteria)if(groups.has(c.code)) {
    const rank=new Map(c.options.map((o,i)=>[o.id,i]));
    groups.get(c.code).options.sort((a,b)=>(rank.get(a.id)??10000+(a.order??0))-(rank.get(b.id)??10000+(b.order??0)));
  }
  for(const key of Object.keys(catalog.trait_categories??{})) {
    const saved=(report.trait_observations??[]).find(o=>o.key===key||o.code===key);
    const value=saved?.label??report['display_'+key]??report[key];
    if(value)groups.set(key,{code:key,name:saved?.name??catalog.trait_categories[key].name,score_group:'trait',options:[{label:value}]});
  }
  for(const saved of report.trait_observations??[]) {const key=saved.key??saved.code;if(key&&!groups.has(key))groups.set(key,{code:key,name:saved.name,score_group:'trait',options:[{label:saved.label}]});}
  const order=[...new Set([...(catalog.category_order??[]),...groups.keys()])];
  return order.filter(key=>groups.has(key)).map(key=>groups.get(key));
}

// A display placeholder is never a report address or a saved site name.
export function namedAddress(value) {
  const name=String(value??'').trim();
  return Boolean(name) && !/^(?:pinned location|device location|loading|finding (?:location|address|the address)|coordinates|address unavailable)\b/i.test(name) && !/^[-\d., ()]+$/.test(name);
}
export const addressPoint = fields => `${Number(fields.latitude).toFixed(7)},${Number(fields.longitude).toFixed(7)}`;
export const addressReady = fields => fields.address_state==='ready' && namedAddress(fields.sitio_name)
  && fields.address_point===addressPoint(fields) && fields.address_name===fields.sitio_name;
export function resolvedAddress(fields) {
  Object.assign(fields,{address_state:'ready',address_point:addressPoint(fields),address_name:fields.sitio_name});
}

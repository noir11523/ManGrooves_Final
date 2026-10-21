import {esc,field} from './ui.js';

export const barangayName=b=>[b.name,b.city_municipality].filter(Boolean).join(' — ');
export function barangayPicker(rows,value='',{required=true,id='profile-barangay'}={}) {
  const selected=rows.find(b=>String(b.id)===String(value));
  return `<label class="field barangay-picker"><span>Barangay</span><input type="search" data-barangay-search list="${id}-options" value="${esc(selected?barangayName(selected):'')}" ${required?'required':''} autocomplete="off" placeholder="Type a barangay or city/municipality" aria-describedby="${id}-help"><input type="hidden" name="barangay_id" value="${esc(selected?.id??'')}"><datalist id="${id}-options">${rows.map(b=>`<option value="${esc(barangayName(b))}"></option>`).join('')}</datalist><small id="${id}-help">Choose from Cebu's barangays. The city or municipality distinguishes places with the same name.</small></label>`;
}
export function bindBarangayPicker(root,rows) {
  const search=root.querySelector('[data-barangay-search]'),value=root.querySelector('[name=barangay_id]');
  if(!search||!value)return;
  const update=()=>{
    const typed=search.value.trim().toLocaleLowerCase();
    const found=rows.find(b=>barangayName(b).toLocaleLowerCase()===typed);
    value.value=found?.id??'';
    search.setCustomValidity(found||!typed&&!search.required?'':'Choose a barangay and city/municipality from the list.');
  };
  search.addEventListener('input',update);search.addEventListener('change',update);
  update();
}
export function contactFields(user={}) {
  return `${field('address_line','House no., street or sitio',user.address_line??'','text','required maxlength="200" autocomplete="street-address" placeholder="For example: 12 Riverside Street, Sitio Kalubihan"')}${field('phone','Mobile number',user.phone??'','tel','required maxlength="30" autocomplete="tel" placeholder="09171234567"')}<small>Use your Philippine mobile number. City/municipality and province come from your selected barangay.</small>`;
}

import {esc,field,select} from './ui.js';

export const barangayName=b=>[b.name,b.city_municipality].filter(Boolean).join(' — ');
export function barangayPicker(rows,value='',{required=true,id='profile-barangay'}={}) {
  const selected=rows.find(b=>String(b.id)===String(value));
  return `<label class="field barangay-picker"><span>Barangay</span><input type="search" data-barangay-search list="${id}-options" value="${esc(selected?barangayName(selected):'')}" ${required?'required':''} autocomplete="off" placeholder="Type a barangay or city/municipality" aria-describedby="${id}-help"><input type="hidden" name="barangay_id" value="${esc(selected?.id??'')}"><datalist id="${id}-options">${rows.map(b=>`<option value="${esc(barangayName(b))}"></option>`).join('')}</datalist><small id="${id}-help">Choose from Cebu's barangays. The city or municipality distinguishes places with the same name.</small></label>`;
}
export function bindBarangayPicker(root,rows) {
  const search=root.querySelector('[data-barangay-search]'),value=root.querySelector('[name=barangay_id]');
  if(!search||!value)return;
  const city=root.querySelector('[data-address-city]');
  const eligible=()=>city?rows.filter(b=>(b.city_municipality||'Cebu City')===city.value):rows;
  const update=()=>{
    const typed=search.value.trim().toLocaleLowerCase();
    const found=eligible().find(b=>barangayName(b).toLocaleLowerCase()===typed);
    value.value=found?.id??'';
    search.setCustomValidity(found||!typed&&!search.required?'':'Choose a barangay and city/municipality from the list.');
  };
  search.addEventListener('input',update);search.addEventListener('change',update);
  if(city){
    const refresh=()=>{root.querySelector(`#${search.getAttribute('list')}`).innerHTML=eligible().map(b=>`<option value="${esc(barangayName(b))}"></option>`).join('');search.disabled=!city.value;};
    city.addEventListener('change',()=>{search.value='';value.value='';refresh();update();});refresh();
  }
  update();
}
export function contactFields(user={}) {
  return field('phone','Mobile number',user.phone??'','tel','required maxlength="30" autocomplete="tel" placeholder="09171234567"');
}
export function formattedAddress(user={}) {
  return [...(user.house_unit||user.street_sitio?[user.house_unit,user.street_sitio]:[user.address_line]),user.barangay_name,user.city_municipality,[user.province,user.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
export function residentialAddressFields(rows,user={},id='profile-barangay') {
  const selected=rows.find(b=>String(b.id)===String(user.barangay_id));
  const city=selected?.city_municipality|| (selected?'Cebu City':'');
  const cities=[...new Set(rows.map(b=>b.city_municipality||'Cebu City'))].sort();
  return `<fieldset class="residential-address"><legend>Residential address</legend>${user.address_line&&user.address_version!==2?`<p class="muted">Previously saved: ${esc(user.address_line)}. Add the parts below if you know them; the original is kept.</p>`:''}
    ${field('house_unit','House no. / unit / building (optional)',user.house_unit??'','text','maxlength="120" autocomplete="address-line1" placeholder="For example: Unit 3B"')}
    ${field('street_sitio','Street / purok / sitio (optional)',user.street_sitio??'','text','maxlength="200" autocomplete="address-line2" placeholder="For example: Purok 3"')}
    <div class="row">${select('city_municipality','City / municipality',[['','Choose a city or municipality'],...cities.map(c=>[c,c])],city,'required data-address-city')}${barangayPicker(rows,user.barangay_id,{id})}</div>
    <div class="row">${field('province_display','Province','Cebu','text','readonly aria-readonly="true"')}${field('zip_code','ZIP code (optional)',user.zip_code??'','text','inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="postal-code" placeholder="4 digits"')}</div></fieldset>`;
}

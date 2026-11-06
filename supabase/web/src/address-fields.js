import {esc,field,select} from './ui.js';

export const barangayName=b=>[b.name,b.city_municipality,b.province].filter(Boolean).join(', ');
export function barangayPicker(rows,value='',{required=true,id='profile-barangay'}={}) {
  const selected=rows.find(b=>String(b.id)===String(value));
  return select('barangay_id','Barangay',[['','Choose a barangay'],...(selected?[[selected.id,selected.name]]:[])],selected?.id??'',`${required?'required':''} id="${id}" data-address-barangay`);
}
export function bindBarangayPicker(root,rows) {
  const value=root.querySelector('[data-address-barangay]');
  if(!value)return;
  const province=root.querySelector('[data-address-province]');
  const city=root.querySelector('[data-address-city]');
  const provinceOf=b=>b.province||'Cebu';
  const cityOf=b=>b.city_municipality||'Cebu City';
  const eligible=()=>rows.filter(b=>(!province||provinceOf(b)===province.value)&&(!city||cityOf(b)===city.value));
  const update=()=>{
    const found=eligible().some(b=>String(b.id)===value.value);
    value.setCustomValidity(found||!value.value&&!value.required?'':'Choose your barangay.');
  };
  value.addEventListener('change',update);
  const refreshCities=()=>{
    if(!province||!city)return;
    const selected=city.value;
    const cities=[...new Set(rows.filter(b=>provinceOf(b)===province.value).map(cityOf))].sort((a,b)=>a.localeCompare(b));
    city.innerHTML=`<option value="">Choose a city or municipality</option>${cities.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}`;
    city.value=cities.includes(selected)?selected:'';
  };
  const refresh=()=>{
    const selected=value.value;
    const options=eligible().sort((a,b)=>a.name.localeCompare(b.name));
    value.innerHTML=`<option value="">${city&&!city.value?'Choose a city first':'Choose a barangay'}</option>${options.map(b=>`<option value="${b.id}">${esc(city?b.name:barangayName(b))}</option>`).join('')}`;
    value.value=options.some(b=>String(b.id)===selected)?selected:'';
    value.disabled=Boolean(city&&!city.value);
  };
  province?.addEventListener('change',()=>{if(city)city.value='';value.value='';refreshCities();refresh();update();});
  if(city){
    city.addEventListener('change',()=>{value.value='';refresh();update();});
    refreshCities();
  }
  refresh();
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
  const province=selected?.province||user.province||'Cebu';
  const provinces=[...new Set(rows.map(b=>b.province||'Cebu').filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const cities=[...new Set(rows.filter(b=>(b.province||'Cebu')===province).map(b=>b.city_municipality||'Cebu City'))].sort((a,b)=>a.localeCompare(b));
  const city=selected?.city_municipality|| (selected?'Cebu City':'');
  return `<fieldset class="residential-address"><legend>Residential address</legend>${user.address_line&&user.address_version!==2?`<p class="muted">Previously saved: ${esc(user.address_line)}. Add the parts below if you know them; the original is kept.</p>`:''}
    ${field('house_unit','House no. / unit / building (optional)',user.house_unit??'','text','maxlength="120" autocomplete="address-line1" placeholder="For example: Unit 3B"')}
    ${field('street_sitio','Street / purok / sitio (optional)',user.street_sitio??'','text','maxlength="200" autocomplete="address-line2" placeholder="For example: Purok 3"')}
    <div class="row">${select('province','Province / region',[['','Choose a province or region'],...provinces.map(p=>[p,p])],province,'required data-address-province')}${select('city_municipality','City / municipality',[['','Choose a city or municipality'],...cities.map(c=>[c,c])],city,'required data-address-city')}${barangayPicker(rows,user.barangay_id,{id})}</div>
    <div class="row">${field('zip_code','ZIP code (optional)',user.zip_code??'','text','inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="postal-code" placeholder="4 digits"')}</div></fieldset>`;
}

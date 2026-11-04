import {AppError,integer,text} from './domain.js';

export function mobileNumber(value) {
  const raw=text(value??'','your mobile number',30).replace(/[\s().-]/g,'');
  const normalized=raw.startsWith('09')?'+63'+raw.slice(1):raw.startsWith('639')?'+'+raw:raw;
  if(!/^\+639\d{9}$/.test(normalized))throw new AppError('Enter a Philippine mobile number, such as 09171234567 or +639171234567.');
  return normalized;
}
export function barangayLabel(row) {
  return [row.name,row.city_municipality,row.province].filter(Boolean).join(', ');
}
export async function profileDetails(service,input) {
  const barangay_id=integer(input.barangay_id,'barangay');
  const barangay=await service.get('barangays',barangay_id);
  if(!barangay || (barangay.country_code!=='PH'&&barangay.province!=='Cebu'))throw new AppError('Choose a barangay in the Philippines.');
  const city=barangay.city_municipality;
  if(input.city_municipality && input.city_municipality!==city)throw new AppError('Choose a barangay belonging to the selected city or municipality.');
  if(input.city_psgc && input.city_psgc!==barangay.city_psgc)throw new AppError('Choose a barangay belonging to the selected city or municipality.');
  if(input.province && input.province!==barangay.province)throw new AppError('Choose a barangay belonging to the selected province or region.');
  if(input.province_psgc && input.province_psgc!==barangay.province_psgc)throw new AppError('Choose a barangay belonging to the selected province or region.');
  const zip=text(input.zip_code??'','ZIP code',4,false);
  if(zip && !/^\d{4}$/.test(zip))throw new AppError('Enter a four-digit ZIP code or leave it blank.');
  const structured=Object.hasOwn(input,'house_unit')||Object.hasOwn(input,'street_sitio');
  return {phone:mobileNumber(input.phone),
    ...(structured?{house_unit:text(input.house_unit??'','house, unit or building',120,false)||null,street_sitio:text(input.street_sitio??'','street, purok or sitio',200,false)||null,address_version:2}:{}),
    ...(Object.hasOwn(input,'address_line')?{address_line:text(input.address_line??'','previous address',200,false)||null}:{}),
    ...(Object.hasOwn(input,'zip_code')?{zip_code:zip||null}:{}),
    barangay_id,barangay_name:barangay.name,city_municipality:city,city_psgc:barangay.city_psgc??null,
    province:barangay.province??barangay.region??null,province_psgc:barangay.province_psgc??null,
    region:barangay.region??null,region_psgc:barangay.region_psgc??null,barangay_psgc:barangay.psgc_code??null};
}

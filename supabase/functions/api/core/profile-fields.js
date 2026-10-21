import {AppError,integer,text} from './domain.js';

export function mobileNumber(value) {
  const raw=text(value??'','your mobile number',30).replace(/[\s().-]/g,'');
  const normalized=raw.startsWith('09')?'+63'+raw.slice(1):raw.startsWith('639')?'+'+raw:raw;
  if(!/^\+639\d{9}$/.test(normalized))throw new AppError('Enter a Philippine mobile number, such as 09171234567 or +639171234567.');
  return normalized;
}
export function barangayLabel(row) {
  return [row.name,row.city_municipality].filter(Boolean).join(' — ');
}
export async function profileDetails(service,input) {
  const barangay_id=integer(input.barangay_id,'barangay');
  const barangay=await service.get('barangays',barangay_id);
  if(!barangay || barangay.province && barangay.province!=='Cebu')throw new AppError('Choose a barangay from the Cebu list.');
  return {phone:mobileNumber(input.phone),address_line:text(input.address_line??'','your street, sitio, or address',200),
    barangay_id,barangay_name:barangay.name,city_municipality:barangay.city_municipality??'Cebu City',province:'Cebu',barangay_psgc:barangay.psgc_code??null};
}

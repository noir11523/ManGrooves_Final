import {createHash,randomBytes} from 'node:crypto';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import QRCode from 'qrcode';
import {AppError,integer,text,now,requireRole,manilaDate} from './domain.js';
import {saveImage} from './uploads.js';

export async function certificateSettings(service,user,input,files={}) {
  requireRole(user,'system_admin');
  const ref=service.ref('meta','certificate_settings'),old=(await ref.get()).data()??{};
  if(!input)return {settings:{signer_name:old.signer_name??'',signer_title:old.signer_title??'',has_signature:!!old.signature_path}};
  const value={signer_name:text(input.signer_name,'the signer name',100),signer_title:text(input.signer_title,'the signer title',100),signature_path:old.signature_path??null,updated_at:now()};
  let upload;
  try {
    if(files.signature){
      upload=await saveImage(service.bucket,files.signature,'signatures');
      if(upload.path.endsWith('.webp'))throw new AppError('Use a PNG or JPG signature image.');
      value.signature_path=upload.path;
    }
    if(input.remove_signature===true||input.remove_signature==='1')value.signature_path=null;
    await service.db.runTransaction(async tx=>{
      requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin');
      await tx.get(ref);tx.set(ref,value);service.audit(tx,user,'certificate.signer_updated','settings','certificate');
    });
    // Old issued PDFs may use the previous signature. Do not delete it here.
    return {message:'Certificate signer saved.'};
  } catch(error){if(upload)await service.bucket.file(upload.path).delete().catch(()=>{});throw error;}
}
async function certificateData(service,userId,badgeId) {
  const award=await service.get('user_badges',`${userId}_${badgeId}`),badge=await service.get('badges',badgeId);
  if(!award||!badge)throw new AppError('Certificate not available.',404);
  const owner=(await service.rows('users',[['id','==',userId]]))[0],settings=await service.get('meta','certificate_settings');
  if(!settings?.signer_name||!settings?.signer_title)throw new AppError('The administrator needs to add the certificate signer first.',409);
  return {award,badge,owner,settings};
}
const safe=value=>String(value??'').replace(/[\u2010-\u2015]/g,'-').replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
export async function certificatePdf(service,data) {
  const {award,badge,owner,settings}=data;
  const doc=await PDFDocument.create(),page=doc.addPage([842,595]);
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const green=rgb(.14,.32,.18),muted=rgb(.32,.38,.33);
  page.drawRectangle({x:25,y:25,width:792,height:545,borderColor:green,borderWidth:2});
  page.drawRectangle({x:33,y:33,width:776,height:529,borderColor:rgb(.79,.70,.47),borderWidth:1});
  const centered=(value,y,size=16,font=regular,color=green)=>{
    const label=safe(value);while(font.widthOfTextAtSize(label,size)>700&&size>9)size--;
    page.drawText(label,{x:(842-font.widthOfTextAtSize(label,size))/2,y,size,font,color});
  };
  centered('ManGROOVES',510,22,bold);
  centered('CERTIFICATE OF RECOGNITION',452,28,bold);
  centered('Presented to',411,14,regular,muted);
  centered(owner?.full_name??'Coastal Guardian',366,30,bold);
  centered(`For earning ${award.badge_name_snapshot??badge.badge_name}`,325,18);
  // Wrap long descriptions without adding a second certificate page.
  const words=safe(award.description_snapshot??badge.description).split(/\s+/),lines=[];let line='';
  for(const word of words){if(regular.widthOfTextAtSize(`${line} ${word}`,12)>650){lines.push(line);line='';}line+=`${line?' ':''}${word}`;}if(line)lines.push(line);
  lines.slice(0,4).forEach((label,i)=>centered(label,293-i*17,12,regular,muted));
  if(settings.signature_path){
    const bytes=await service.bucket.file(settings.signature_path).download();
    const image=settings.signature_path.endsWith('.png')?await doc.embedPng(bytes):await doc.embedJpg(bytes);
    const dimensions=image.scaleToFit(180,55);page.drawImage(image,{x:(842-dimensions.width)/2,y:145,width:dimensions.width,height:dimensions.height});
  }else centered('Signed by',163,12,regular,muted);
  page.drawLine({start:{x:281,y:139},end:{x:561,y:139},thickness:.7,color:muted});
  centered(settings.signer_name,118,15,bold);centered(settings.signer_title,98,12);
  centered(`Awarded ${manilaDate(award.earned_at)} | ${award.certificate_code}`,58,9,regular,muted);
  // QR belongs only in the app/website. The downloaded PDF is always QR-free.
  return Buffer.from(await doc.save());
}
export async function getCertificate(service,user,query) {
  requireRole(user,'guardian','expert','system_admin');
  const userId=user.role==='system_admin'&&query.user_id?integer(query.user_id,'user'):user.id;
  return certificateData(service,userId,integer(query.badge_id,'badge'));
}
export async function shareCertificate(service,user,input,base) {
  await service.limited(`certificate-link:${user.uid}`,20);
  const data=await getCertificate(service,user,input);
  const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex'),expires=Date.now()+10*60000;
  await service.ref('certificate_links',hash).set({user_id:data.owner.id,badge_id:data.badge.id,expires_at:expires});
  const url=`${base}/certificate-download.php?token=${token}`,qr=QRCode.create(url,{errorCorrectionLevel:'M'});
  return {url,expires_at:new Date(expires).toISOString(),qr:{size:qr.modules.size,data:Array.from(qr.modules.data)}};
}
export async function sharedCertificate(service,token) {
  if(typeof token!=='string'||!/^[\w-]{43}$/.test(token))throw new AppError('This download link is invalid or expired.',404);
  const hash=createHash('sha256').update(token).digest('hex'),link=await service.get('certificate_links',hash);
  if(!link||link.expires_at<Date.now())throw new AppError('This link expired. Open the app to create a new QR code.',410);
  return certificateData(service,link.user_id,link.badge_id);
}

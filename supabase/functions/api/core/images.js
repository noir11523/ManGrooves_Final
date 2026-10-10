// Raster container validation and metadata removal without native Sharp/libvips.
// Avoids decoding huge bitmaps in the memory/CPU-limited Edge runtime.
// Photos remain capped at 5 MB; clients should resize before uploading.
function dimensions(w,h) { if(w<100||h<100||w>12000||h>12000||w*h>50000000) throw new Error('Photo dimensions'); }
function orientation(data) {
  try {
    if(data.subarray(0,6).toString('binary')!=='Exif\0\0') return 1;
    const t=data.subarray(6), le=t.toString('ascii',0,2)==='II';
    const u16=o=>le?t.readUInt16LE(o):t.readUInt16BE(o), u32=o=>le?t.readUInt32LE(o):t.readUInt32BE(o);
    const start=u32(4), count=u16(start);
    for(let i=0;i<count&&i<100;i++) { const off=start+2+i*12; if(u16(off)===0x112) return u16(off+8); }
  } catch { /* Drop malformed metadata. */ }
  return 1;
}
function jpeg(bytes) {
  const chunks=[bytes.subarray(0,2)]; let offset=2,width=0,height=0,scan=false,ended=false,rotate=1;
  while(offset<bytes.length) {
    if(bytes[offset]!==0xff) throw new Error('JPG marker');
    let markerAt=offset; while(bytes[offset]===0xff) offset++;
    const marker=bytes[offset++];
    if(marker===0xd9) { chunks.push(Buffer.from([0xff,0xd9])); ended=true; break; }
    if(marker===0xd8||marker===0||offset+2>bytes.length) throw new Error('JPG segment');
    const size=bytes.readUInt16BE(offset), end=offset+size;
    if(size<2||end>bytes.length) throw new Error('JPG length');
    if([0xc0,0xc1,0xc2].includes(marker)) { height=bytes.readUInt16BE(offset+3); width=bytes.readUInt16BE(offset+5); }
    if(marker===0xe1) rotate=orientation(bytes.subarray(offset+2,end));
    // Strip APP1..APP15 (EXIF/XMP/GPS/etc.) and comments. Normalize JFIF
    // print-density metadata so it cannot turn the same photo into a new hash.
    if(!(marker>=0xe1&&marker<=0xef)&&marker!==0xfe) {
      const chunk=Buffer.from(bytes.subarray(markerAt,end));
      if(marker===0xe0&&size>=16&&bytes.toString('ascii',offset+2,offset+7)==='JFIF\0') {
        chunk[11]=0;
        chunk.writeUInt16BE(1,12);
        chunk.writeUInt16BE(1,14);
      }
      chunks.push(chunk);
    }
    offset=end;
    if(marker===0xda) {
      scan=true; const begin=offset;
      while(offset<bytes.length) {
        if(bytes[offset]!==0xff) { offset++; continue; }
        const next=bytes[offset+1];
        if(next===0||next>=0xd0&&next<=0xd7) { offset+=2; continue; }
        break;
      }
      chunks.push(bytes.subarray(begin,offset));
    }
  }
  if(!scan||!ended) throw new Error('Incomplete JPG'); dimensions(width,height);
  if(rotate>=2&&rotate<=8) {
    // Keep ONLY orientation. No GPS, timestamps, device ID or thumbnail.
    const exif=Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000100000000000000','hex');
    exif.writeUInt16LE(rotate,28); chunks.splice(1,0,exif);
  }
  return {bytes:Buffer.concat(chunks),extension:'jpg',contentType:'image/jpeg'};
}
function crc32(bytes) { let crc=0xffffffff; for(const b of bytes) { crc^=b; for(let k=0;k<8;k++) crc=crc>>>1^(crc&1?0xedb88320:0); } return (crc^0xffffffff)>>>0; }
function png(bytes) {
  const chunks=[bytes.subarray(0,8)]; let offset=8,header=false,image=false,ended=false;
  while(offset+12<=bytes.length) {
    const size=bytes.readUInt32BE(offset), end=offset+12+size;
    if(end>bytes.length) throw new Error('PNG length');
    const type=bytes.toString('ascii',offset+4,offset+8);
    if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4)) throw new Error('PNG checksum');
    if(!header&&type!=='IHDR') throw new Error('PNG header');
    if(type==='IHDR') { if(header||size!==13) throw new Error('PNG header'); header=true; dimensions(bytes.readUInt32BE(offset+8),bytes.readUInt32BE(offset+12)); }
    if(type==='IDAT') image=true;
    if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type)) chunks.push(bytes.subarray(offset,end));
    if(type==='IEND') { ended=true; break; }
    offset=end;
  }
  if(!header||!image||!ended) throw new Error('Incomplete PNG');
  return {bytes:Buffer.concat(chunks),extension:'png',contentType:'image/png'};
}
function webp(bytes) {
  if(bytes.readUInt32LE(4)+8!==bytes.length) throw new Error('WebP length');
  let offset=12,width=0,height=0,image=false; const chunks=[];
  while(offset+8<=bytes.length) {
    const type=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),end=offset+8+size+(size%2);
    if(end>bytes.length) throw new Error('WebP chunk');
    const chunk=Buffer.from(bytes.subarray(offset,end)),data=chunk.subarray(8,8+size);
    if(type==='VP8X') {
      if(size!==10||data[0]&2) throw new Error('Animated WebP is unsupported');
      data[0]&=~(0x20|0x08|0x04); // Remove metadata flags along with those chunks.
      width=1+data.readUIntLE(4,3);height=1+data.readUIntLE(7,3);
    } else if(type==='VP8 ') { if(data[3]!==0x9d||data[4]!==1||data[5]!==0x2a) throw new Error('WebP header'); width=data.readUInt16LE(6)&0x3fff;height=data.readUInt16LE(8)&0x3fff;image=true; }
    else if(type==='VP8L') { if(data[0]!==0x2f) throw new Error('WebP header'); const bits=data.readUInt32LE(1);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;image=true; }
    if(['VP8X','VP8 ','VP8L','ALPH'].includes(type)) chunks.push(chunk);
    offset=end;
  }
  if(!image||offset!==bytes.length) throw new Error('Incomplete WebP'); dimensions(width,height);
  const content=Buffer.concat(chunks),head=Buffer.from('RIFF0000WEBP');head.writeUInt32LE(content.length+4,4);
  return {bytes:Buffer.concat([head,content]),extension:'webp',contentType:'image/webp'};
}
export function cleanImage(bytes) {
  if(bytes[0]===0xff&&bytes[1]===0xd8) return jpeg(bytes);
  if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) return png(bytes);
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP') return webp(bytes);
  throw new Error('Use JPG, PNG or WebP');
}

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// Small PDF layout helper: no native binaries or runtime font file reads.
export default class Document {
  constructor({layout,margin=45}={}) { this.width=layout==='landscape'?842:595; this.height=layout==='landscape'?595:842; this.margin=margin; this.size=11; this.lines=[]; }
  pipe(response) { this.response=response; return this; }
  fontSize(size) { this.size=size; return this; }
  text(text,options={}) { this.lines.push({text:String(text),size:this.size,align:options.align}); return this; }
  moveDown(count=1) { this.lines.push({gap:this.size*1.4*count}); return this; }
  async end() {
    const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica);
    let page=doc.addPage([this.width,this.height]), y=this.height-this.margin;
    for(const entry of this.lines) {
      if(entry.gap) { y-=entry.gap; continue; }
      // Standard PDF font supports Latin-1; retain accented names where possible.
      const text=entry.text.replace(/[\u2010-\u2015]/g,'-').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'?');
      const available=this.width-this.margin*2;
      for(const paragraph of text.split('\n')) {
        let line=''; const lines=[];
        for(const word of paragraph.split(/\s+/)) {
          if(line && font.widthOfTextAtSize(`${line} ${word}`,entry.size)>available) { lines.push(line); line=''; }
          // Split long unbroken input so user-entered labels cannot run off-page.
          for(const char of `${line?' ':''}${word}`) {
            if(line && font.widthOfTextAtSize(line+char,entry.size)>available) { lines.push(line); line=''; }
            line+=char;
          }
        }
        lines.push(line);
        for(const value of lines) {
          if(y-entry.size<this.margin) { page=doc.addPage([this.width,this.height]); y=this.height-this.margin; }
          y-=entry.size*1.4;
          const x=entry.align==='center'?(this.width-font.widthOfTextAtSize(value,entry.size))/2:this.margin;
          page.drawText(value,{x,y,font,size:entry.size,color:rgb(.15,.25,.12)});
        }
      }
    }
    this.response.end(Buffer.from(await doc.save()));
  }
}

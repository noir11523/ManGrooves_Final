import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// Small PDF layout helper: no native binaries or runtime font file reads.
export default class Document {
  constructor({layout,margin=45}={}) { this.width=layout==='landscape'?842:595; this.height=layout==='landscape'?595:842; this.margin=margin; this.size=11; this.lines=[]; }
  pipe(response) { this.response=response; return this; }
  fontSize(size) { this.size=size; return this; }
  text(text,options={}) { this.lines.push({text:String(text),size:this.size,align:options.align}); return this; }
  table(headers,rows) { this.lines.push({headers,rows,size:this.size}); return this; }
  moveDown(count=1) { this.lines.push({gap:this.size*1.4*count}); return this; }
  async end() {
    const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
    let page=doc.addPage([this.width,this.height]), y=this.height-this.margin;
    const clean=value=>String(value).replace(/[\u2010-\u2015]/g,'-').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'?');
    const nextPage=()=>{page=doc.addPage([this.width,this.height]);y=this.height-this.margin;};
    for(const entry of this.lines) {
      if(entry.gap) { y-=entry.gap; continue; }
      if(entry.headers) {
        const width=(this.width-this.margin*2)/entry.headers.length;
        const size=Math.min(entry.size,9),lineHeight=size*1.4,padding=7;
        const cellLines=value=>{
          const lines=[];let line='';
          for(const char of clean(value)) {
            if(char==='\n'||(line&&bold.widthOfTextAtSize(line+char,size)>width-padding*2)){lines.push(line);line='';}
            if(char!=='\n')line+=char;
          }
          lines.push(line);return lines;
        };
        const drawRow=(cells,header=false)=>{
          const lines=cells.map(cellLines),height=Math.max(...lines.map(v=>v.length))*lineHeight+padding*2;
          if(y-height<this.margin){nextPage();if(!header)drawRow(entry.headers,true);}
          if(header)page.drawRectangle({x:this.margin,y:y-height,width:this.width-this.margin*2,height,color:rgb(.9,.94,.89)});
          for(let i=0;i<lines.length;i++)for(let j=0;j<lines[i].length;j++)page.drawText(lines[i][j],{x:this.margin+i*width+padding,y:y-padding-size-j*lineHeight,font:header?bold:font,size,color:rgb(.15,.25,.12)});
          y-=height;
          page.drawLine({start:{x:this.margin,y},end:{x:this.width-this.margin,y},thickness:.5,color:rgb(.78,.82,.76)});
        };
        if(y< this.margin+90)nextPage();
        drawRow(entry.headers,true);for(const row of entry.rows)drawRow(row);
        y-=8;continue;
      }
      // Standard PDF font supports Latin-1; retain accented names where possible.
      const text=clean(entry.text);
      const textFont=entry.size>=15?bold:font;
      const available=this.width-this.margin*2;
      if(entry.size>=15&&y-this.margin<80)nextPage();
      for(const paragraph of text.split('\n')) {
        let line=''; const lines=[];
        for(const word of paragraph.split(/\s+/)) {
          if(line && textFont.widthOfTextAtSize(`${line} ${word}`,entry.size)>available) { lines.push(line); line=''; }
          // Split long unbroken input so user-entered labels cannot run off-page.
          for(const char of `${line?' ':''}${word}`) {
            if(line && textFont.widthOfTextAtSize(line+char,entry.size)>available) { lines.push(line); line=''; }
            line+=char;
          }
        }
        lines.push(line);
        for(const value of lines) {
          if(y-entry.size*1.4<this.margin)nextPage();
          y-=entry.size*1.4;
          const x=entry.align==='center'?(this.width-textFont.widthOfTextAtSize(value,entry.size))/2:this.margin;
          page.drawText(value,{x,y,font:textFont,size:entry.size,color:rgb(.15,.25,.12)});
        }
      }
    }
    const pages=doc.getPages();
    for(let i=0;i<pages.length;i++)pages[i].drawText(`ManGROOVES | Page ${i+1} of ${pages.length}`,{x:this.margin,y:20,font,size:9,color:rgb(.35,.4,.35)});
    doc.setTitle('ManGROOVES monitoring report');doc.setCreator('ManGROOVES');
    this.response.end(Buffer.from(await doc.save()));
  }
}

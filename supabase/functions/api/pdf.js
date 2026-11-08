import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';

const ink=rgb(.16,.22,.17),green=rgb(.18,.36,.19),muted=rgb(.39,.44,.39),border=rgb(.81,.85,.80),pale=rgb(.94,.97,.92);
const conditionColors={Healthy:rgb(.247,.498,.263),Stressed:rgb(.812,.588,.114),'At Risk':rgb(.776,.318,.235),Unknown:rgb(.471,.529,.471)};
const clean=value=>String(value??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2022/g,' / ').replace(/[^\x20-\x7e\xa0-\xff\n]/g,'?');

// Shared A4 layout. Tables repeat their headers and split oversized rows safely.
export default class Document {
  constructor({layout,margin=44}={}) { this.width=layout==='landscape'?842:595;this.height=layout==='landscape'?595:842;this.margin=margin;this.size=10;this.lines=[]; }
  pipe(response) { this.response=response;return this; }
  fontSize(size) { this.size=size;return this; }
  text(text,options={}) { this.lines.push({kind:'text',text:String(text),size:this.size,...options});return this; }
  table(headers,rows,options={}) { this.lines.push({kind:'table',headers,rows,size:this.size,...options});return this; }
  moveDown(count=1) { this.lines.push({kind:'gap',gap:this.size*1.4*count});return this; }
  header(title,lines=[]) { this.lines.push({kind:'header',title,lines});return this; }
  section(text) { this.lines.push({kind:'section',text});return this; }
  note(text) { this.lines.push({kind:'text',text,size:8.5,muted:true});return this; }
  metrics(items) { this.lines.push({kind:'metrics',items});return this; }
  conditionBar(counts) { this.lines.push({kind:'conditions',counts});return this; }
  async end() {
    const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
    const left=this.margin,available=this.width-left*2,bottom=this.margin;
    let page,y;
    const nextPage=()=>{
      const continuation=doc.getPageCount()>0;
      page=doc.addPage([this.width,this.height]);y=this.height-this.margin;
      if(continuation){page.drawText('ManGROOVES / Monitoring report',{x:left,y:y-10,font:bold,size:10,color:green});y-=27;}
    };
    const ensure=height=>{if(y-height<bottom)nextPage();};
    const wrap=(value,face,size,width)=>{
      const result=[];
      for(const paragraph of clean(value).split('\n')){
        let line='';
        for(const word of paragraph.split(/\s+/)){
          if(line&&face.widthOfTextAtSize(line+' '+word,size)>width){result.push(line);line='';}
          for(const char of (line?' ':'')+word){
            if(line&&face.widthOfTextAtSize(line+char,size)>width){result.push(line);line='';}
            line+=char;
          }
        }
        result.push(line);
      }
      return result;
    };
    const text=(value,{size=10,face=font,color=ink,align}={})=>{
      for(const line of wrap(value,face,size,available)){
        ensure(size*1.4);y-=size*1.4;
        page.drawText(line,{x:align==='center'?(this.width-face.widthOfTextAtSize(line,size))/2:left,y,font:face,size,color});
      }
    };
    nextPage();
    for(const entry of this.lines){
      if(entry.kind==='gap'){y-=entry.gap;continue;}
      if(entry.kind==='header'){
        text('ManGROOVES',{size:23,face:bold,color:green});
        text(entry.title,{size:15,face:bold});y-=7;
        for(const line of entry.lines)text(line,{size:9,color:muted});
        y-=11;page.drawLine({start:{x:left,y},end:{x:this.width-left,y},thickness:1.5,color:green});y-=15;continue;
      }
      if(entry.kind==='section'){
        ensure(70);y-=10;text(entry.text,{size:12,face:bold,color:green});y-=6;continue;
      }
      if(entry.kind==='metrics'){
        const gap=10,width=(available-gap*(entry.items.length-1))/entry.items.length,height=56;
        ensure(height+8);
        entry.items.forEach(([label,value],i)=>{
          const x=left+i*(width+gap);
          page.drawRectangle({x,y:y-height,width,height,color:pale,borderColor:border,borderWidth:.6});
          page.drawText(clean(value),{x:x+10,y:y-27,font:bold,size:22,color:green});
          wrap(label,font,8.5,width-20).forEach((line,j)=>page.drawText(line,{x:x+10,y:y-43-j*11,font,size:8.5,color:ink}));
        });y-=height+5;continue;
      }
      if(entry.kind==='conditions'){
        ensure(70);const total=Object.values(entry.counts).reduce((n,v)=>n+v,0);let x=left;
        if(total){for(const [name,count] of Object.entries(entry.counts)){const width=available*count/total;if(width)page.drawRectangle({x,y:y-15,width,height:15,color:conditionColors[name]??muted});x+=width;}y-=24;}
        else{text('No verified sites in this period.',{size:9,color:muted});y-=4;}
        const legendTop=y;
        for(const [index,[name,count]] of Object.entries(entry.counts).entries()){
          const column=left+(index%2)*(available/2+5),baseline=legendTop-16*(Math.floor(index/2)+1);
          page.drawRectangle({x:column,y:baseline+1,width:7,height:7,color:conditionColors[name]??muted});
          page.drawText(clean(name),{x:column+14,y:baseline,font,size:9,color:ink});
          const label=`${count} site${count===1?'':'s'}   ${total?(count/total*100).toFixed(1):'0.0'}%`;
          page.drawText(label,{x:column+available/2-12-font.widthOfTextAtSize(label,9),y:baseline,font,size:9,color:ink});
        }y-=32;continue;
      }
      if(entry.kind==='table'){
        const weights=entry.widths??entry.headers.map(()=>1),sum=weights.reduce((n,v)=>n+v,0),widths=weights.map(v=>available*v/sum);
        const size=Math.min(entry.size,8.5),lineHeight=size*1.4,padding=5;
        const cells=(values,header=false)=>values.map((v,i)=>wrap(v,header?bold:font,size,widths[i]-padding*2));
        const header=cells(entry.headers,true),headerHeight=Math.max(...header.map(v=>v.length))*lineHeight+padding*2;
        const draw=(lines,height,isHeader=false,stripe=false)=>{
          if(isHeader||stripe)page.drawRectangle({x:left,y:y-height,width:available,height,color:isHeader?pale:rgb(.975,.982,.97)});
          let x=left;
          for(let i=0;i<lines.length;i++){
            for(let j=0;j<lines[i].length;j++)page.drawText(lines[i][j],{x:x+padding,y:y-padding-size-j*lineHeight,font:isHeader?bold:font,size,color:ink});
            x+=widths[i];
          }
          y-=height;page.drawLine({start:{x:left,y},end:{x:this.width-left,y},thickness:.5,color:border});
        };
        ensure(headerHeight+lineHeight+padding*2);draw(header,headerHeight,true);
        for(const [index,row] of entry.rows.entries()){
          const lines=cells(row),length=Math.max(...lines.map(v=>v.length));let offset=0;
          while(offset<length){
            let count=Math.floor((y-bottom-padding*2)/lineHeight);
            // Keep normal rows together; only genuinely oversized rows split.
            const remaining=length-offset;
            if(count<1||(offset===0&&remaining>count&&remaining*lineHeight+padding*2<=this.height-this.margin*2-27-headerHeight)){
              nextPage();draw(header,headerHeight,true);count=Math.floor((y-bottom-padding*2)/lineHeight);
            }
            const take=Math.min(remaining,count),height=take*lineHeight+padding*2;
            draw(lines.map(v=>v.slice(offset,offset+take)),height,false,index%2===1);offset+=take;
          }
        }y-=6;continue;
      }
      if(entry.size>=15)ensure(80);
      text(entry.text,{size:entry.size,face:entry.bold||entry.size>=15?bold:font,color:entry.muted?muted:ink,align:entry.align});
    }
    const pages=doc.getPages();
    for(let i=0;i<pages.length;i++){
      const footer=`ManGROOVES  |  Page ${i+1} of ${pages.length}`;
      pages[i].drawLine({start:{x:left,y:32},end:{x:this.width-left,y:32},thickness:.5,color:border});
      pages[i].drawText(footer,{x:left,y:20,font,size:8,color:muted});
    }
    doc.setTitle('ManGROOVES monitoring report');doc.setAuthor('ManGROOVES');doc.setCreator('ManGROOVES');
    this.response.end(Buffer.from(await doc.save()));
  }
}

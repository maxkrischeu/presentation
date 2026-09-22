// Local export worker. Input arrives on stdin, never interpolated into shell code.
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');
const {landscape,width,height,fit}=require('./pdf-layout.cjs');
(async()=>{
 let text='';for await(const part of process.stdin)text+=part;
 const {url,destination,kind,snapshot,options}=JSON.parse(text);
 if(kind==='chalkboard') {
  if(!snapshot.modules.drawing.drawings.boards.length)throw Error('No non-empty chalkboards to export.');
  const pdf=await PDFDocument.create();
  for(const board of snapshot.modules.drawing.drawings.boards){const png=await pdf.embedPng(board.png);pdf.addPage([width,height]).drawImage(png,fit(png.width,png.height));}
  await fs.writeFile(destination,await pdf.save());return;
 }
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  if(options.content==='current')await page.addInitScript(data=>{window.__presentationSession=data;},snapshot);
  await page.goto(url+'?print-pdf',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.Reveal?.isReady()&&document.querySelector('.pdf-page'));
  await page.evaluate(async({snapshot,options})=>{
   await Presentation.ready;
   if(!options.images)document.querySelectorAll('.presentation-asset-layer').forEach(el=>el.remove());
   if(options.drawings&&(snapshot.modules.drawing.visibility.notes||options.hidden)) {
    // Latest recorded fragment for each slide is the final annotation state.
    const notes=new Map();for(const note of snapshot.modules.drawing.drawings.notes){if(!notes.has(note.slide)||notes.get(note.slide).fragment<=note.fragment)notes.set(note.slide,note);}
    for(const note of notes.values()){
     const slide=document.getElementById(note.slide);if(!slide)continue;
     const image=document.createElement('img');image.src=note.png;image.className='presentation-export-notes';
     Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',maxWidth:'none',maxHeight:'none',margin:'0',zIndex:'30',pointerEvents:'none'});slide.append(image);
    }
   }
   if(options.boards) {
    // Insert complete print pages at the source slide, before Chromium paginates.
    const tails=new Map();
    const boards=[...snapshot.modules.drawing.drawings.boards].sort((a,b)=>a.fragment-b.fragment||a.board-b.board);
    for(const board of boards){
     const slide=document.getElementById(board.slide);
     const source=slide?.closest('.pdf-page');
     if(!source||getComputedStyle(source).display==='none')continue;
     const sheet=document.createElement('div');sheet.className='pdf-page presentation-export-board';
     sheet.style.width=source.style.width;sheet.style.height=source.style.height;
     const image=document.createElement('img');image.src=board.png;
     Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'contain',maxWidth:'none',maxHeight:'none',margin:'0'});
     sheet.append(image);(tails.get(source)||source).after(sheet);tails.set(source,sheet);
    }
   }
   await document.fonts.ready;await Promise.all(Array.from(document.images,image=>image.decode().catch(()=>{})));
  },{snapshot,options});
  await fs.writeFile(destination,await (await landscape(await page.pdf({printBackground:true,preferCSSPageSize:true}),await page.title())).save());
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

/* OOXML drawing adapter: saved chart data -> Chart.js, text shapes -> safe DOM. */
(function(scope){
 const all=(node,name)=>[...(node?.getElementsByTagNameNS('*',name)||[])],one=(node,name)=>all(node,name)[0],children=(n,name)=>[...(n?.children||[])].filter(x=>x.localName===name),child=(n,name)=>children(n,name)[0];
 const value=(n,name)=>one(n,name)?.getAttribute('val'),text=n=>n?.textContent||'';
 const parse=xml=>{if(!xml||/<!DOCTYPE|<!ENTITY/i.test(xml))return null;const d=new DOMParser().parseFromString(xml,'application/xml');return one(d,'parsererror')?null:d;};
 const path=(base,target)=>{if(!target||/^[\w+.-]+:|^\/\//.test(target))return null;const bits=(target.startsWith('/')?target.slice(1):base.slice(0,base.lastIndexOf('/')+1)+target).split('/'),out=[];for(const b of bits){if(b==='..')out.pop();else if(b!=='.'&&b)out.push(b);}return out.join('/');};
 const relPath=p=>p.slice(0,p.lastIndexOf('/')+1)+'_rels/'+p.slice(p.lastIndexOf('/')+1)+'.rels';
 function relationships(parts,p){return Object.fromEntries(all(parse(parts[relPath(p)]),'Relationship').filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>[r.getAttribute('Id'),path(p,r.getAttribute('Target'))]));}
 const rid=node=>node?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
 function color(node,palette,fallback){const fill=child(node,'solidFill');if(!fill)return fallback;const rgb=one(fill,'srgbClr')?.getAttribute('val');if(/^[\da-f]{6}$/i.test(rgb||''))return '#'+rgb;const theme=value(fill,'schemeClr'),names=['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6'];const hex=palette[names.indexOf(theme)];return /^[\da-f]{6}$/i.test(hex||'')?'#'+hex:fallback;}
 function marker(anchor,name){const n=child(anchor,name);return n?{c:+text(child(n,'col')),r:+text(child(n,'row')),x:+text(child(n,'colOff'))/9525,y:+text(child(n,'rowOff'))/9525}:null;}
 function geometry(anchor,model){
  const b=model.bounds,sum=(items,count)=>items.slice(0,Math.max(0,count)).reduce((a,v)=>a+v,0);
  const coord=m=>({x:44+sum(model.widths,m.c-b.c1+1)+m.x,y:25+sum(model.heights,m.r-b.r1+1)+m.y});
  const from=marker(anchor,'from'),to=marker(anchor,'to');let start,end;
  if(from){if(from.c<b.c1-1||from.r<b.r1-1||from.c>=b.c2||from.r>=b.r2)return null;start=coord(from);if(to)end=coord(to);}
  else{if(b.c1!==1||b.r1!==1)return null;const pos=child(anchor,'pos');start={x:44+(+pos?.getAttribute('x')||0)/9525,y:25+(+pos?.getAttribute('y')||0)/9525};}
  const ext=child(anchor,'ext');const w=end?end.x-start.x:+ext?.getAttribute('cx')/9525,h=end?end.y-start.y:+ext?.getAttribute('cy')/9525;
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return null;return {...start,w,h};
 }
 function seriesValues(node,refs){
  if(!node)return [];const formula=text(one(node,'f'));if(formula in refs)return refs[formula];
  const cache=one(node,'numCache')||one(node,'strCache')||one(node,'numLit')||one(node,'strLit');if(!cache)return [];
  const result=Array(Math.min(5000,+value(cache,'ptCount')||0)).fill(null);for(const p of children(cache,'pt')){const i=+p.getAttribute('idx');if(i>=0&&i<5000)result[i]=text(child(p,'v'));}return result;
 }
 function chartConfig(xml,refs,palette,language){
  const doc=parse(xml),plot=one(doc,'plotArea');if(!plot)return null;
  const plots=[...plot.children].filter(n=>n.localName.endsWith('Chart'));
  // Do not misrepresent 3D/combined/secondary-axis charts as a simple series.
  const map={barChart:'bar',lineChart:'line',pieChart:'pie',doughnutChart:'doughnut',scatterChart:'scatter',areaChart:'line'};
  if(plots.length!==1||!map[plots[0].localName]||children(plot,'valAx').length>(plots[0].localName==='scatterChart'?2:1))return null;
  const kind=plots[0],type=map[kind.localName],horizontal=value(kind,'barDir')==='bar',grouping=value(kind,'grouping');
  if(grouping==='percentStacked'||(kind.localName==='areaChart'&&grouping==='stacked'))return null;
  const sets=[],colors=['#4472C4','#ED7D31','#A5A5A5','#FFC000','#5B9BD5','#70AD47'];let labels=[];
  for(const [i,ser] of children(kind,'ser').entries()){
   const cat=seriesValues(child(ser,'cat'),refs),ys=seriesValues(child(ser,'val')||child(ser,'yVal'),refs),xs=seriesValues(child(ser,'xVal'),refs);
   if(!labels.length)labels=cat.map(v=>v===null?'':String(v));const tx=child(ser,'tx');
   const label=seriesValues(tx,refs)[0]??text(child(tx,'v'));
   const numeric=v=>v===null||v===''||v===undefined?null:Number.isFinite(+v)?+v:null;
   const data=type==='scatter'?ys.map((v,j)=>({x:numeric(xs[j]),y:numeric(v)})):ys.map(numeric);
   const line=child(child(ser,'spPr'),'ln');const fill=color(child(ser,'spPr'),palette,colors[i%colors.length]);
   const backgrounds=(type==='pie'||type==='doughnut')?data.map((_,j)=>{const point=children(ser,'dPt').find(p=>+value(p,'idx')===j);return color(child(point,'spPr'),palette,colors[j%colors.length]);}):fill;
   const scatterStyle=value(kind,'scatterStyle')||'';
   sets.push({label:label||`${i+1}`,data,backgroundColor:backgrounds,borderColor:color(line,palette,fill),borderWidth:type==='bar'?0:2,pointRadius:type==='scatter'?3:type==='line'?2:0,tension:0,spanGaps:false,fill:kind.localName==='areaChart',showLine:type==='scatter'?/line|smooth/i.test(scatterStyle):undefined});
  }
  if(!sets.length)return null;
  const title=all(child(one(doc,'chart'),'title'),'t').map(n=>text(n)).join(' '),legend=one(doc,'legend'),legendPos=value(legend,'legendPos');
  const options={responsive:true,maintainAspectRatio:false,animation:false,devicePixelRatio:Math.min(devicePixelRatio||1,2),locale:language||'en',plugins:{title:{display:!!title,text:title},legend:{display:!!legend,position:({l:'left',r:'right',t:'top',b:'bottom'})[legendPos]||'bottom'}}};
  if(type!=='pie'&&type!=='doughnut'){
   options.indexAxis=horizontal?'y':'x';options.scales={x:{stacked:grouping==='stacked'},y:{stacked:grouping==='stacked'}};
   for(const axis of [...children(plot,'catAx'),...children(plot,'valAx')]){const key=['b','t'].includes(value(axis,'axPos'))?'x':'y',target=options.scales[key],scaling=child(axis,'scaling');const min=value(scaling,'min'),max=value(scaling,'max');if(min!==undefined&&min!==null&&Number.isFinite(+min))target.min=+min;if(max!==undefined&&max!==null&&Number.isFinite(+max))target.max=+max;if(value(scaling,'orientation')==='maxMin')target.reverse=true;if(value(scaling,'logBase'))target.type='logarithmic';const at=all(child(axis,'title'),'t').map(n=>text(n)).join(' ');if(at)target.title={display:true,text:at};}
   if(type==='bar')options.scales[horizontal?'x':'y'].beginAtZero=true;
  }else if(type==='doughnut')options.cutout=(+value(kind,'holeSize')||50)+'%';
  return {type,data:{labels,datasets:sets},options};
 }
 function shape(sp,palette){
  const pr=child(sp,'spPr'),geom=value(pr,'prstGeom')||one(pr,'prstGeom')?.getAttribute('prst')||'rect';
  if(!['rect','roundRect','ellipse'].includes(geom))return null;
  const box=document.createElement('div');box.className='sheet-text-shape';const body=child(sp,'txBody'),bodyPr=child(body,'bodyPr');
  box.style.background=child(pr,'noFill')?'transparent':color(pr,palette,'transparent');
  const ln=child(pr,'ln');if(ln&&!child(ln,'noFill'))box.style.border=`${Math.max(1,(+ln.getAttribute('w')||9525)/9525)}px solid ${color(ln,palette,'#333')}`;
  if(geom==='roundRect')box.style.borderRadius='12px';if(geom==='ellipse')box.style.borderRadius='50%';
  box.style.padding=['tIns','rIns','bIns','lIns'].map(k=>(+(bodyPr?.getAttribute(k)??91440)/9525)+'px').join(' ');
  const rotation=+one(pr,'xfrm')?.getAttribute('rot')/60000;if(rotation)box.style.transform=`rotate(${rotation}deg)`;
  box.style.justifyContent=({ctr:'center',b:'flex-end'})[bodyPr?.getAttribute('anchor')]||'flex-start';
  for(const p of children(body,'p')){const para=document.createElement('p'),pp=child(p,'pPr');para.style.textAlign=({l:'left',ctr:'center',r:'right',just:'justify'})[pp?.getAttribute('algn')]||'left';
   for(const r of p.children){if(r.localName==='br'){para.append(document.createElement('br'));continue;}if(!['r','fld'].includes(r.localName))continue;const span=document.createElement('span'),rp=child(r,'rPr')||child(pp,'defRPr');span.textContent=text(child(r,'t'));span.style.fontSize=(+(rp?.getAttribute('sz')||1100)/100*4/3)+'px';span.style.fontWeight=rp?.getAttribute('b')==='1'?'bold':'normal';span.style.fontStyle=rp?.getAttribute('i')==='1'?'italic':'normal';span.style.color=color(rp,palette,'#000');para.append(span);}
   if(!para.childNodes.length)para.append(document.createElement('br'));box.append(para);
  }return box;
 }
 function create(bundle){
  const parts=bundle?.parts||{},refs=bundle?.references||{},wb=parse(parts['xl/workbook.xml']),rels=relationships(parts,'xl/workbook.xml');let active=[];
  function clear(){for(const chart of active)chart.destroy();active=[];}
  function render(surface,model,language){clear();const sheet=all(wb,'sheet').find(s=>s.getAttribute('name')===model.name),sheetPath=rels[rid(sheet)];if(!sheetPath)return;
   const sheetXML=parse(parts[sheetPath]),sheetRels=relationships(parts,sheetPath),drawingPath=sheetRels[rid(one(sheetXML,'drawing'))];if(!drawingPath)return;
   const drawing=parse(parts[drawingPath]),drawingRels=relationships(parts,drawingPath);
   for(const anchor of drawing?.documentElement.children||[]){const g=geometry(anchor,model);if(!g)continue;let box;
    const chartRef=one(anchor,'chart');if(chartRef){const config=chartConfig(parts[drawingRels[rid(chartRef)]],refs,model.colors||[],language);if(!config)continue;box=document.createElement('div');box.className='sheet-chart';box.dataset.chartType=config.type;const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',config.options.plugins.title.text||'Chart');box.append(canvas);Object.assign(box.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});surface.append(box);try{active.push(new Chart(canvas,config));}catch(e){box.remove();console.warn('Spreadsheet chart could not be displayed',e);}continue;}
    const sp=child(anchor,'sp');if(sp)box=shape(sp,model.colors||[]);if(!box)continue;Object.assign(box.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px',zIndex:'1'});surface.append(box);
   }
  }
  return {render,clear};
 }
 scope.SpreadsheetDrawings={create,chartConfig};
})(self);

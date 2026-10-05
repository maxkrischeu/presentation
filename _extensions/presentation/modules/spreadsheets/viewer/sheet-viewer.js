(async()=>{
 const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
 const messages=await (await fetch('messages.json')).json(),t=k=>(messages[params.get('lang')]||messages.en)[k]||k;
 document.documentElement.lang=params.get('lang')||'en';
 document.querySelectorAll('[data-text]').forEach(e=>e.textContent=t(e.dataset.text));
 document.querySelectorAll('[aria-label]').forEach(e=>e.setAttribute('aria-label',t(e.getAttribute('aria-label'))));
 const status=$('status'),viewport=$('viewport'),surface=$('sheet');status.textContent=t('Loading');
 const worker=new Worker('sheet-worker.js'),pending=new Map();let next=0,sequence=0,current='',model,scale=1,selected=null,imageURLs=[];
 function request(data,transfer=[]){return new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{worker.terminate();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Timeout'));}pending.clear();},30000);pending.set(id,{resolve,reject,timer});worker.postMessage({...data,id},transfer);});}
 worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;clearTimeout(p.timer);pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data);};
 worker.onerror=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Worker failed'));}pending.clear();};
 const col=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
 let themes=['FFFFFF','000000','EEECE1','1F497D','4F81BD','C0504D','9BBB59','8064A2','4BACC6','F79646'];
 function color(value,fallback){let hex=value?.argb?.slice(-6)||themes[value?.theme];if(!hex||!/^[A-Fa-f0-9]{6}$/.test(hex))return fallback;if(value.tint){hex=hex.match(/../g).map(x=>{const n=parseInt(x,16),v=value.tint<0?n*(1+value.tint):n+(255-n)*value.tint;return Math.round(v).toString(16).padStart(2,'0');}).join('');}return '#'+hex;}
 function style(td,cell){
  const s=cell.style||{},font=s.font||{},a=s.alignment||{},inner=td.firstChild;
  td.style.color=color(font.color,'#000');td.style.fontSize=(font.size||11)*4/3+'px';
  if(font.name)td.style.fontFamily=JSON.stringify(font.name)+', Arial, sans-serif';
  td.style.fontWeight=font.bold?'bold':'normal';td.style.fontStyle=font.italic?'italic':'normal';
  if(font.underline||font.strike)td.style.textDecoration=[font.underline?'underline':'',font.strike?'line-through':''].join(' ');
  if(s.fill?.type==='pattern'&&s.fill.pattern==='solid')td.style.background=color(s.fill.fgColor,'#fff');
  td.style.textAlign=['left','center','right','justify'].includes(a.horizontal)?a.horizontal:cell.numeric?'right':'left';
  td.style.verticalAlign=a.vertical==='middle'?'middle':a.vertical||'bottom';
  if(a.wrapText){inner.style.whiteSpace='pre-wrap';inner.style.overflowWrap='anywhere';}
  if(a.indent)inner.style.paddingLeft=(4+a.indent*10)+'px';
  for(const edge of ['top','right','bottom','left']){const b=s.border?.[edge];if(!b?.style)continue;const width=b.style==='thick'?3:b.style==='medium'||b.style==='double'?2:1;td.style['border'+edge[0].toUpperCase()+edge.slice(1)]=`${width}px ${b.style==='double'?'double':/dash/i.test(b.style)?'dashed':b.style==='dotted'?'dotted':'solid'} ${color(b.color,'#202938')}`;}
 }
 function zoom(value){scale=Math.max(.25,Math.min(3,value));surface.style.zoom=scale;$('zoom').textContent=Math.round(scale*100)+'%';viewport.dataset.zoom=scale;}
 function fit(){if(model)zoom((viewport.clientWidth-16)/(44+model.widths.reduce((a,b)=>a+b,0)));}
 let drawingView=SpreadsheetDrawings.create({});
 const displayFormula=f=>SpreadsheetFormulas.localize(f,params.get('lang')||'en');
 function select(td){selected?.classList.remove('selected');selected=td;td.classList.add('selected');$('address').textContent=td.dataset.address;$('value').textContent=td._cell.formula?'='+displayFormula(td._cell.formula):td._cell.text;}
 function render(data){
  model=data;if(data.colors?.some(Boolean))themes=data.colors;selected=null;imageURLs.forEach(URL.revokeObjectURL);imageURLs=[];drawingView.clear();surface.replaceChildren();$('address').textContent='—';$('value').textContent='';
  const table=document.createElement('table'),cg=document.createElement('colgroup'),thead=document.createElement('thead'),tr=document.createElement('tr'),body=document.createElement('tbody');
  const widths=[44,...data.widths];for(const w of widths){const c=document.createElement('col');c.style.width=w+'px';if(!w)c.style.visibility='collapse';cg.append(c);}table.style.width=widths.reduce((a,b)=>a+b,0)+'px';
  tr.append(document.createElement('th'));data.widths.forEach((w,i)=>{const th=document.createElement('th');th.textContent=col(data.bounds.c1+i);th.scope='col';if(!w)th.style.display='none';tr.append(th);});thead.append(tr);table.append(cg,thead,body);
  const covered=new Set(),spans=new Map();
  for(const m of data.merges){const r1=Math.max(m.r1,data.bounds.r1),r2=Math.min(m.r2,data.bounds.r2),c1=Math.max(m.c1,data.bounds.c1),c2=Math.min(m.c2,data.bounds.c2);if(r2<r1||c2<c1)continue;spans.set(`${r1}:${c1}`,{rows:r2-r1+1,cols:c2-c1+1});for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)covered.add(`${r}:${c}`);}
  data.rows.forEach((cells,i)=>{const r=data.bounds.r1+i,row=document.createElement('tr');row.style.height=data.heights[i]+'px';if(!data.heights[i])row.style.display='none';const th=document.createElement('th');th.textContent=r;th.scope='row';row.append(th);
   cells.forEach((cell,j)=>{const c=data.bounds.c1+j;if(covered.has(`${r}:${c}`))return;const td=document.createElement('td'),inner=document.createElement('div');inner.className='cell';inner.textContent=cell.text;td.append(inner);td.dataset.address=cell.master||cell.address;td._cell=cell;td.title=cell.formula?'='+displayFormula(cell.formula):cell.text;const span=spans.get(`${r}:${c}`);if(span){td.rowSpan=span.rows;td.colSpan=span.cols;}if(!data.widths[j])td.style.display='none';style(td,cell);
    if(!span&&!cell.numeric&&cell.text&&!cell.style?.alignment?.wrapText&&(!cell.style?.alignment?.horizontal||cell.style.alignment.horizontal==='left')){let width=data.widths[j],end=j+1;while(end<cells.length&&!cells[end].text&&!cells[end].master&&!cells[end].style?.fill?.fgColor){width+=data.widths[end++];}if(end>j+1){td.style.overflow='visible';inner.style.position='absolute';inner.style.bottom='0';inner.style.width=width+'px';inner.style.height='auto';inner.style.pointerEvents='none';}}
    row.append(td);});body.append(row);
  });surface.append(table);
  // Image positions use the same column/row dimensions as the table, including hidden cells.
  const offset=(values,n,start)=>{let result=0;for(let i=0;i<Math.floor(n)-start+1;i++)result+=values[i]||0;return result+(n-Math.floor(n))*(values[Math.floor(n)-start+1]||0);};
  for(const picture of data.images){const x=44+offset(data.widths,picture.tl.col,data.bounds.c1),y=25+offset(data.heights,picture.tl.row,data.bounds.r1);if(picture.tl.col<data.bounds.c1-1||picture.tl.row<data.bounds.r1-1||picture.tl.col>=data.bounds.c2||picture.tl.row>=data.bounds.r2)continue;
   const img=document.createElement('img');img.alt='';let bytes=picture.bytes;if(!bytes&&picture.base64)bytes=Uint8Array.from(atob(picture.base64.split(',').pop()),c=>c.charCodeAt(0));if(!bytes)continue;img.src=URL.createObjectURL(new Blob([bytes],{type:'image/'+picture.extension}));imageURLs.push(img.src);
   Object.assign(img.style,{left:x+'px',top:y+'px',width:(picture.ext?.width||(44+offset(data.widths,picture.br.col,data.bounds.c1)-x))+'px',height:(picture.ext?.height||(25+offset(data.heights,picture.br.row,data.bounds.r1)-y))+'px'});surface.append(img);
  }
  drawingView.render(surface,data,params.get('lang'));
  $('range').value=data.range;status.textContent=[data.limited?t('Limit'):'',data.missing?t('Missing'):''].filter(Boolean).join(' ');viewport.dataset.ready='true';viewport.scrollTop=viewport.scrollLeft=0;
 }
 async function show(sheet,range){const token=++sequence;viewport.setAttribute('aria-busy','true');try{const data=await request({type:'sheet',sheet,range});if(token!==sequence)return;current=sheet;render(data.model);parent.postMessage({type:'presentation-spreadsheet-state',sheet,range:data.model.range},location.origin);document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.textContent===sheet)));}catch(e){if(token===sequence)status.textContent=t(e.message==='Invalid range'?'RangeError':'Error');}finally{if(token===sequence)viewport.removeAttribute('aria-busy');}}
 surface.addEventListener('click',e=>{const td=e.target.closest('td');if(td)select(td);});
 viewport.addEventListener('keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();zoom(e.key==='0'?1:scale+(e.key==='-'?-.1:.1));}if(e.key==='Escape'){selected?.classList.remove('selected');selected=null;$('address').textContent='—';$('value').textContent='';}});
 viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(scale*Math.exp(-e.deltaY*.005));}},{passive:false});
 let gestureScale=1;viewport.addEventListener('gesturestart',e=>{e.preventDefault();gestureScale=scale;});viewport.addEventListener('gesturechange',e=>{e.preventDefault();zoom(gestureScale*e.scale);});
 $('minus').onclick=()=>zoom(scale-.1);$('plus').onclick=()=>zoom(scale+.1);$('fit').onclick=fit;
 $('range-form').onsubmit=e=>{e.preventDefault();show(current,$('range').value);};
 addEventListener('pagehide',()=>{worker.terminate();drawingView.clear();imageURLs.forEach(URL.revokeObjectURL);});
 try{
  const url=new URL(params.get('file'));if(!['http:','https:','file:','blob:'].includes(url.protocol))throw Error('URL');
  const response=await fetch(url);if(!response.ok)throw Error('HTTP');if(+response.headers.get('content-length')>25*1024*1024)throw Error('Size');
  const bytes=await response.arrayBuffer();if(bytes.byteLength>25*1024*1024)throw Error('Size');
  const {sheets,drawings}=await request({type:'load',bytes},[bytes]);drawingView=SpreadsheetDrawings.create(drawings);
  for(const name of sheets){const button=document.createElement('button');button.textContent=name;button.setAttribute('role','tab');button.onclick=()=>show(name,'');$('tabs').append(button);}$('tabs').setAttribute('role','tablist');
  const initial=params.get('sheet')||sheets[0];if(!sheets.includes(initial)){status.textContent=t('SheetError');current=sheets[0];return;}
  await show(initial,params.get('range')||'');zoom(1);
 }catch(error){status.textContent=t(error.message==='No visible sheets'?error.message:'Error');viewport.dataset.error='true';}
})();

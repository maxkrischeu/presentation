/* Read-only projection of ExcelJS cells. No formulas or links are executed. */
(function(scope){
  const column=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  function address(text){const m=/^\$?([A-Z]{1,3})\$?([1-9]\d{0,6})$/i.exec(text);if(!m)throw Error('Invalid range');let c=0;for(const x of m[1].toUpperCase())c=c*26+x.charCodeAt(0)-64;const r=+m[2];if(c>16384||r>1048576)throw Error('Invalid range');return {r,c};}
  function bounds(value,ws){
    if(value){const parts=value.trim().split(':');if(parts.length>2)throw Error('Invalid range');const a=address(parts[0]),b=address(parts[1]||parts[0]);if(b.r<a.r||b.c<a.c)throw Error('Invalid range');return {r1:a.r,c1:a.c,r2:b.r,c2:b.c};}
    return {r1:1,c1:1,r2:50,c2:26};
  }
  function text(cell,date1904){
    let v=cell.value;const formula=cell.formula||'';
    if(formula)v=cell.result;
    if(v===undefined||v===null)return {text:formula?'—':'',missing:!!formula,formula};
    if(v instanceof Date){if(!Number.isFinite(v.getTime()))return {text:cell.text||'',formula};v=(v.getTime()-Date.UTC(1899,11,30))/86400000-(date1904?1462:0);}
    if(typeof v==='object'){if(v.richText)v=v.richText.map(x=>x.text).join('');else if(v.error)v=v.error;else v=v.text??'';}
    let formatted=String(v);
    if(typeof v==='number')try{formatted=SSF.format(cell.numFmt||'General',v,{date1904});}catch{/* Keep original value for unsupported formats. */}
    if(typeof v==='boolean')formatted=v?'TRUE':'FALSE';
    return {text:formatted,formula,numeric:typeof v==='number',raw:String(v)};
  }
  function read(workbook,name,requested){
    const ws=workbook.getWorksheet(name);if(!ws||ws.state!=='visible')throw Error('Unknown sheet');
    const b=bounds(requested,ws),limited=b.r2-b.r1>=400||b.c2-b.c1>=50;
    b.r2=Math.min(b.r2,b.r1+399);b.c2=Math.min(b.c2,b.c1+49);
    const widths=[],heights=[],rows=[];
    for(let c=b.c1;c<=b.c2;c++){const col=ws.getColumn(c);widths.push(col.hidden?0:Math.min(1000,Math.max(20,(col.width||ws.properties.defaultColWidth||8.43)*7+5)));}
    let missing=false;
    for(let r=b.r1;r<=b.r2;r++){
      const row=ws.getRow(r);heights.push(row.hidden?0:Math.max(18,(row.height||ws.properties.defaultRowHeight||15)*4/3));
      const cells=[];
      for(let c=b.c1;c<=b.c2;c++){
        const cell=row.getCell(c),content=text(cell,workbook.properties.date1904);missing ||= content.missing;
        cells.push({address:cell.address,...content,style:cell.style,master:cell.isMerged?cell.master.address:null});
      }rows.push(cells);
    }
    const merges=(ws.model.merges||[]).map(m=>bounds(m,ws));
    const images=ws.getImages().flatMap(entry=>{
      const img=workbook.getImage(entry.imageId);if(!img||!['png','jpeg','jpg','gif'].includes(img.extension))return [];
      const p=entry.range;return [{bytes:img.buffer,base64:img.base64,extension:img.extension,tl:{col:p.tl.col,row:p.tl.row},br:p.br?{col:p.br.col,row:p.br.row}:null,ext:p.ext}];
    });
    const theme=workbook.model.themes?.theme1||'';
    const colors=['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6'].map(k=>{const part=theme.match(new RegExp('<a:'+k+'>([\\s\\S]*?)</a:'+k+'>'))?.[1]||'';return part.match(/(?:lastClr|val)="([A-Fa-f0-9]{6})"/)?.[1];});
    return {colors,name,bounds:b,widths,heights,rows,merges,images,limited,missing,conditional:!!ws.conditionalFormattings?.length,range:`${column(b.c1)}${b.r1}:${column(b.c2)}${b.r2}`};
  }
  scope.SpreadsheetModel={column,address,bounds,read};
})(typeof self==='object'?self:globalThis);

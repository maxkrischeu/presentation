/* Read selected OOXML parts only. External relationships are never fetched. */
(function(scope){
 function extract(bytes){
  let size=0;
  const files=fflate.unzipSync(new Uint8Array(bytes),{filter:file=>{
   const use=/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/(?:sheet\d+\.xml|_rels\/sheet\d+\.xml\.rels)|drawings\/(?:drawing\d+\.xml|_rels\/drawing\d+\.xml\.rels)|charts\/chart\d+\.xml)$/.test(file.name);
   if(use){size+=file.originalSize;if(file.originalSize>8*1024*1024||size>32*1024*1024)throw Error('Drawing XML exceeds size limit');}return use;
  }});
  return Object.fromEntries(Object.entries(files).map(([name,raw])=>[name,fflate.strFromU8(raw)]));
 }
 const unescape=s=>s.replace(/&(?:amp|lt|gt|quot|apos);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[x]);
 function references(parts,workbook){
  const result={};
  for(const [path,xml] of Object.entries(parts))if(path.startsWith('xl/charts/'))for(const match of xml.matchAll(/<(?:[\w]+:)?f\b[^>]*>([^<]*)<\/(?:[\w]+:)?f>/g)){
   const ref=unescape(match[1]);if(ref in result)continue;
   const m=/^(?:'((?:[^']|'')+)'|([^!]+))!(\$?[A-Z]+\$?\d+)(?::(\$?[A-Z]+\$?\d+))?$/i.exec(ref);if(!m)continue;
   const name=(m[1]||m[2]).replace(/''/g,"'");if(name.includes('['))continue;const sheet=workbook.getWorksheet(name);if(!sheet)continue;
   try{const b=SpreadsheetModel.bounds(m[3]+':'+(m[4]||m[3]),sheet);if((b.r2-b.r1+1)*(b.c2-b.c1+1)>5000)continue;const values=[];
    for(let r=b.r1;r<=b.r2;r++)for(let c=b.c1;c<=b.c2;c++){const cell=sheet.getCell(r,c),v=cell.formula?cell.result:cell.value;values.push(typeof v==='number'||typeof v==='string'?v:v?.richText?v.richText.map(x=>x.text).join(''):null);}result[ref]=values;
   }catch{/* Unsupported reference uses the chart's own saved cache. */}
  }return result;
 }
 scope.SpreadsheetDrawingPackage={extract,references};
})(self);

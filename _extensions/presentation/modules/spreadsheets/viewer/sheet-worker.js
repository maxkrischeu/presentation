importScripts('exceljs.min.js','ssf.js','model.js','fflate.js','drawing-package.js');
let workbook;
onmessage=async({data})=>{
  try{
    if(data.type==='load'){
      workbook=new ExcelJS.Workbook();await workbook.xlsx.load(data.bytes);
      const sheets=workbook.worksheets.filter(ws=>ws.state==='visible').map(ws=>ws.name);
      if(!sheets.length)throw Error('No visible sheets');
      const parts=SpreadsheetDrawingPackage.extract(data.bytes);
      postMessage({id:data.id,sheets,drawings:{parts,references:SpreadsheetDrawingPackage.references(parts,workbook)}});
    }else postMessage({id:data.id,model:SpreadsheetModel.read(workbook,data.sheet,data.range)});
  }catch(error){postMessage({id:data.id,error:error.message});}
};

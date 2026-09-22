// Shared A4 landscape page geometry for build-time and session exports.
const {PDFDocument}=require('pdf-lib');
const width=297/25.4*72,height=210/25.4*72,margin=10/25.4*72;
function fit(w,h){const scale=Math.min((width-2*margin)/w,(height-2*margin)/h);return{x:(width-w*scale)/2,y:(height-h*scale)/2,width:w*scale,height:h*scale};}
async function landscape(source,title){
 const result=await PDFDocument.create(),input=await PDFDocument.load(source);
 const slides=await result.embedPdf(input,input.getPageIndices());
 for(const slide of slides)result.addPage([width,height]).drawPage(slide,fit(slide.width,slide.height));
 if(title)result.setTitle(title);
 return result;
}
module.exports={width,height,fit,landscape};

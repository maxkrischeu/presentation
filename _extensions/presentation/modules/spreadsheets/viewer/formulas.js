/* Formula display only. Tokens are never evaluated or written back to XLSX. */
(function(scope){
 const names={SUM:'SUMME',SUMIF:'SUMMEWENN',SUMIFS:'SUMMEWENNS',SUMPRODUCT:'SUMMENPRODUKT',AVERAGE:'MITTELWERT',AVERAGEIF:'MITTELWERTWENN',AVERAGEIFS:'MITTELWERTWENNS',COUNT:'ANZAHL',COUNTA:'ANZAHL2',COUNTBLANK:'ANZAHLLEEREZELLEN',COUNTIF:'ZÄHLENWENN',COUNTIFS:'ZÄHLENWENNS',IF:'WENN',IFS:'WENNS',IFERROR:'WENNFEHLER',IFNA:'WENNNV',AND:'UND',OR:'ODER',NOT:'NICHT',XOR:'XODER',TRUE:'WAHR',FALSE:'FALSCH',ROUND:'RUNDEN',ROUNDUP:'AUFRUNDEN',ROUNDDOWN:'ABRUNDEN',INT:'GANZZAHL',TRUNC:'KÜRZEN',MOD:'REST',POWER:'POTENZ',SQRT:'WURZEL',PRODUCT:'PRODUKT',QUOTIENT:'QUOTIENT',ABS:'ABS',MIN:'MIN',MAX:'MAX',MEDIAN:'MEDIAN',LARGE:'KGRÖSSTE',SMALL:'KKLEINSTE',RANK:'RANG', 'RANK.EQ':'RANG.GLEICH','RANK.AVG':'RANG.MITTELW',SUBTOTAL:'TEILERGEBNIS',AGGREGATE:'AGGREGAT',RAND:'ZUFALLSZAHL',RANDBETWEEN:'ZUFALLSBEREICH',PI:'PI',SIN:'SIN',COS:'COS',TAN:'TAN',LOG:'LOG',LN:'LN',EXP:'EXP',SIGN:'VORZEICHEN',VLOOKUP:'SVERWEIS',HLOOKUP:'WVERWEIS',XLOOKUP:'XVERWEIS',LOOKUP:'VERWEIS',INDEX:'INDEX',MATCH:'VERGLEICH',XMATCH:'XVERGLEICH',OFFSET:'BEREICH.VERSCHIEBEN',INDIRECT:'INDIREKT',ADDRESS:'ADRESSE',ROW:'ZEILE',ROWS:'ZEILEN',COLUMN:'SPALTE',COLUMNS:'SPALTEN',TRANSPOSE:'MTRANS',FILTER:'FILTER',SORT:'SORTIEREN',SORTBY:'SORTIERENNACH',UNIQUE:'EINDEUTIG',SEQUENCE:'SEQUENZ',CONCATENATE:'VERKETTEN',CONCAT:'TEXTKETTE',TEXTJOIN:'TEXTVERKETTEN',LEFT:'LINKS',RIGHT:'RECHTS',MID:'TEIL',LEN:'LÄNGE',TRIM:'GLÄTTEN',CLEAN:'SÄUBERN',UPPER:'GROSS',LOWER:'KLEIN',PROPER:'GROSS2',FIND:'FINDEN',SEARCH:'SUCHEN',SUBSTITUTE:'WECHSELN',REPLACE:'ERSETZEN',REPT:'WIEDERHOLEN',TEXT:'TEXT',VALUE:'WERT',NUMBERVALUE:'ZAHLENWERT',EXACT:'IDENTISCH',CHAR:'ZEICHEN',CODE:'CODE',TODAY:'HEUTE',NOW:'JETZT',DATE:'DATUM',DATEVALUE:'DATWERT',DAY:'TAG',MONTH:'MONAT',YEAR:'JAHR',TIME:'ZEIT',TIMEVALUE:'ZEITWERT',HOUR:'STUNDE',MINUTE:'MINUTE',SECOND:'SEKUNDE',WEEKDAY:'WOCHENTAG',WEEKNUM:'KALENDERWOCHE',ISOWEEKNUM:'ISOKALENDERWOCHE',EDATE:'EDATUM',EOMONTH:'MONATSENDE',NETWORKDAYS:'NETTOARBEITSTAGE',WORKDAY:'ARBEITSTAG',ISBLANK:'ISTLEER',ISNUMBER:'ISTZAHL',ISTEXT:'ISTTEXT',ISERROR:'ISTFEHLER',ISERR:'ISTFEHL',ISNA:'ISTNV',ISLOGICAL:'ISTLOG',ISFORMULA:'ISTFORMEL',FORMULATEXT:'FORMELTEXT',HYPERLINK:'HYPERLINK',CHOOSE:'WAHL',SWITCH:'ERSTERWERT',LET:'LET',LAMBDA:'LAMBDA',STDEV:'STABW', 'STDEV.S':'STABW.S','STDEV.P':'STABW.N',VAR:'VARIANZ','VAR.S':'VAR.S','VAR.P':'VAR.P'};
 const errors={'#REF!':'#BEZUG!','#VALUE!':'#WERT!','#NUM!':'#ZAHL!','#N/A':'#NV','#NAME?':'#NAME?','#DIV/0!':'#DIV/0!','#NULL!':'#NULL!'};
 function localize(formula,language='en'){
  if(!/^de(?:-|$)/i.test(language))return formula;
  let out='',i=0,arrays=0;
  while(i<formula.length){
   const ch=formula[i];
   if(ch==='"'||ch==="'"){const quote=ch,start=i++;while(i<formula.length){if(formula[i++]===quote){if(formula[i]===quote){i++;continue;}break;}}out+=formula.slice(start,i);continue;}
   if(ch==='['){const start=i++;let depth=1;while(i<formula.length&&depth){if(formula[i]==="'"){i+=2;continue;}if(formula[i]==='[')depth++;if(formula[i]===']')depth--;i++;}out+=formula.slice(start,i);continue;}
   if(ch==='#'){const token=Object.keys(errors).find(k=>formula.slice(i,i+k.length).toUpperCase()===k);if(token){out+=errors[token];i+=token.length;continue;}}
   const number=formula.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?/i);
   if(number){out+=number[0].replace('.',',');i+=number[0].length;continue;}
   const token=formula.slice(i).match(/^[\p{L}_\\][\p{L}\p{N}_.\\]*/u);
   if(token){const raw=token[0],name=raw.replace(/^(?:_xlfn\.|_xlws\.)+/i,'').toUpperCase(),rest=formula.slice(i+raw.length);out+=/^\s*\(/.test(rest)&&names[name]?names[name]:/^(TRUE|FALSE)$/i.test(raw)&&!/^\s*[!\[]/.test(rest)?names[name]:raw;i+=raw.length;continue;}
   if(ch==='{')arrays++;if(ch==='}')arrays=Math.max(0,arrays-1);
   out+=ch===','?(arrays?'\\':';'):ch;i++;
  }return out;
 }
 scope.SpreadsheetFormulas={localize};
 if(typeof module==='object')module.exports=scope.SpreadsheetFormulas;
})(typeof self==='object'?self:globalThis);

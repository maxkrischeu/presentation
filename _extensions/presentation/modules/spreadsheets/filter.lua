local media = dofile(pandoc.path.join({pandoc.path.directory(PANDOC_SCRIPT_FILE), '../media/options.lua'}))
function Meta()
  quarto.doc.addHtmlDependency({name='presentation-spreadsheets',version='1.0.0',scripts={'loader.js'},resources={
    'viewer/sheet-viewer.html','viewer/sheet-viewer.js','viewer/sheet-viewer.css',
    'viewer/sheet-worker.js','viewer/model.js','viewer/messages.json',
    'viewer/formulas.js','viewer/drawings.js','viewer/drawing-package.js',
    'viewer/vendor/fflate.js','viewer/vendor/chart.umd.js',
    'viewer/vendor/LICENSE-fflate','viewer/vendor/LICENSE-chartjs',
    'viewer/vendor/exceljs.min.js','viewer/vendor/ssf.js',
    'viewer/vendor/LICENSE-exceljs','viewer/vendor/LICENSE-ssf'
  }})
end
function Div(el)
  if not el.classes:includes('document') or not (el.attributes.src or ''):lower():gsub('[?#].*$',''):match('%.xlsx$') then return end
  if el.attributes.position=='free' then return end -- owned by media positioning
  local attrs=media.read(el)
  for _,key in ipairs({'sheet','range'}) do if el.attributes[key] then attrs['data-'..key]=el.attributes[key] end end
  return pandoc.Plain({pandoc.Link(el.attributes.title or '',el.attributes.src,'',pandoc.Attr(el.identifier,{'spreadsheet-preview'},attrs))})
end

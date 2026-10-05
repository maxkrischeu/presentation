-- Register native PPTX finalization with the existing project lifecycle.
function Pandoc(doc)
  local root=assert(quarto.project.directory,'presentation-pptx requires _quarto.yml with project: type: presentation')
  root=pandoc.system.with_working_directory(root,pandoc.system.get_working_directory)
  assert(doc.meta['document-hooks']==true, 'presentation-pptx requires project: type: presentation in _quarto.yml')
  local cfg=doc.meta.presentation or {}
  local function text(v) return v and v~=false and pandoc.utils.stringify(v) or '' end
  local function author(v)
    if not v then return '' end
    if pandoc.utils.type(v)=='List' then local a={};for _,x in ipairs(v) do a[#a+1]=author(x) end;return table.concat(a,', ') end
    return text(type(v)=='table' and (v.name or v) or v)
  end
  local data={teacher=cfg.teacher==nil and author(doc.meta.author) or text(cfg.teacher),
    institution=text(cfg.institution),subject=text(cfg.subject),class=text(cfg.class),
    header=text(cfg['header-text'] or doc.meta.subtitle),logo=text(cfg.logo),
    label=text(cfg['logo-text']),date=text(doc.meta.date),numbers=cfg['slide-number']==true,
    inputDir=pandoc.system.get_working_directory()}
  if data.label=='date' then data.label=data.date end
  if data.logo~='' then
    local mime,bytes=pandoc.mediabag.fetch(data.logo)
    data.logoMime=mime;data.logoData=quarto.base64.encode(bytes)
    local ok,size=pcall(pandoc.image.size,bytes);if ok then data.logoRatio=size.width/size.height end
  end
  local base=pandoc.path.directory(PANDOC_SCRIPT_FILE)
  local layout=dofile(pandoc.path.join({base,'layout.lua'}))
  data.plans=layout.prepare(doc,PANDOC_WRITER_OPTIONS.reference_doc or pandoc.path.join({base,'reference.pptx'}))
  local normalize=dofile(base..'/paths.lua')
  local output=quarto.doc.project_output_file()
  if pandoc.path.is_absolute(output) then output=pandoc.path.make_relative(output,root,true) end
  local outdir=quarto.project.output_directory or root
  if pandoc.path.is_relative(outdir) then outdir=pandoc.path.join({root,outdir}) end
  output=normalize(pandoc.path.join({outdir,output}))
  local dir=pandoc.path.join({root,'.quarto','presentation','powerpoint'})
  pandoc.system.make_directory(dir,true)
  local function write(path,bytes) local f=assert(io.open(path,'wb'));assert(f:write(bytes));f:close() end
  write(pandoc.path.join({dir,pandoc.utils.sha1(output)..'.json'}),quarto.json.encode(data))
  write(pandoc.path.join({dir,'finalize.lua'}),'POWERPOINT_EXTENSION='..string.format('%q',base)..'\ndofile(POWERPOINT_EXTENSION.."/finalize.lua")\n')
  local extension=pandoc.path.normalize(pandoc.path.join({base,'../..'}))
  pandoc.pipe(quarto.config.cli_path(),{'run',pandoc.path.join({extension,'server/bootstrap.ts'}),root},'')
  local hooks=pandoc.path.join({root,'.quarto','render-hooks'});pandoc.system.make_directory(hooks,true)
  write(pandoc.path.join({hooks,'powerpoint.json'}),quarto.json.encode({script='.quarto/presentation/powerpoint/finalize.lua'}))
  return doc
end

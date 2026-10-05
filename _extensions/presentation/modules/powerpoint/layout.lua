-- Build native fragments with Pandoc, then place their editable shapes explicitly.
local M={}
local function has(b,c) return b.classes and b.classes:includes(c) end
local function str(x) return pandoc.utils.stringify(x) end
local function image_of(b)
 local im; pandoc.walk_block(b,{Image=function(x) im=im or x end});return im
end
function M.prepare(doc,reference)
 local plans={};local title=doc.meta.title and str(doc.meta.title)~=''
 if title then plans[1]={parts={}} end
 local root=pandoc.Blocks({});local header,blocks=nil,pandoc.Blocks({})
 local function fragment(bs,rect)
  -- Only native content reaches this boundary. No HTML or screenshots.
  local opts=pandoc.WriterOptions({reference_doc=reference,slide_level=2})
  local bytes=pandoc.write(pandoc.Pandoc({pandoc.Header(2,''),table.unpack(bs)},{}),'pptx',opts)
  return {bytes=quarto.base64.encode(bytes),rect=rect}
 end
 local function estimate(b,width)
  local im=image_of(b)
  if im and (b.t=='Para' or b.t=='Plain' or b.t=='Figure') then return 1.8 end
  local display=false;pandoc.walk_block(b,{Math=function(m) if m.mathtype=='DisplayMath' then display=true end end})
  if display then return .9 end
  local lines=0
  local function count(p)
   lines=lines+math.max(1,math.ceil(utf8.len(str(p))/(math.max(1,width)*8)))
  end
  pandoc.walk_block(b,{Para=count,Plain=count,CodeBlock=function(c)
   local _,n=c.text:gsub('\n','');lines=lines+n+1
  end})
  lines=math.max(1,lines)
  if b.t=='Table' then return .34*lines+.25 end
  if b.t=='BlockQuote' then return .43*lines+.25 end
  return .34*lines+.1
 end
 local function flush()
  if not header and #blocks==0 then return end
  local plan={parts={}};local notes=pandoc.Blocks({})
  local render
  render=function(bs,x,y,w,h)
   local items={}
   local add
   add=function(b)
    if has(b,'notes') then notes:insert(b)
    elseif b.t=='Div' and not has(b,'columns') then
     for _,inner in ipairs(b.content) do add(inner) end
    elseif b.t=='Figure' then
     for _,inner in ipairs(b.content) do add(inner) end
     for _,caption in ipairs(b.caption.long or {}) do add(caption) end
    elseif b.t=='Para' or b.t=='Plain' then
     local pics={}
     local words=pandoc.walk_block(b,{Image=function(im) pics[#pics+1]=im;return {} end})
     if str(words):match('%S') then items[#items+1]=words end
     for _,im in ipairs(pics) do items[#items+1]=pandoc.Para({im}) end
    else items[#items+1]=b end
   end
   for _,b in ipairs(bs) do add(b) end
   local weights,total={},0
   for i,b in ipairs(items) do weights[i]=has(b,'columns') and 2.2 or estimate(b,w);total=total+weights[i] end
   local factor=math.min(1,h/math.max(total,.1));local top=y
   if factor<.7 then quarto.log.warning('PowerPoint: dense slide '..(header and str(header.content) or '')..'. Please review text size in the exported file.') end
   for i,b in ipairs(items) do
    local height=weights[i]*factor
    if has(b,'columns') then
     local cols={};for _,c in ipairs(b.content) do if has(c,'column') then cols[#cols+1]=c end end
     local left=x;local sum=0
     for _,c in ipairs(cols) do sum=sum+(tonumber(((c.attributes.width or ''):gsub('%%',''))) or 100/#cols) end
     for _,c in ipairs(cols) do
      local cw=w*(tonumber(((c.attributes.width or ''):gsub('%%',''))) or 100/#cols)/sum
      render(c.content,left,top,cw-.14,height);left=left+cw
     end
    else
     local im=image_of(b)
     local standalone=im and (b.t=='Para' or b.t=='Plain' or b.t=='Figure')
     if standalone then
      -- Captions stay editable, in the picture's description rather than a second shape.
      local alt=str(im.caption);im.caption=pandoc.Inlines({})
      if im.title=='' then im.title=alt end
      b=pandoc.Para({im})
     end
     if not has(b,'notes') then local part=fragment({b},{x=x,y=top,w=w,h=height-.04});part.fontScale=factor;part.code=b.t=='CodeBlock';plan.parts[#plan.parts+1]=part else notes:insert(b) end
    end
    top=top+height
   end
  end
  local centered=header and has(header,'quote-slide')
  if centered then
   local h=0;for _,b in ipairs(blocks) do if not has(b,'notes') then h=h+estimate(b,8.5) end end
   h=math.min(3.4,math.max(1.2,h));render(blocks,.75,(5.625-h)/2,8.5,h);plan.quote=true
  else render(blocks,.38,1.48,9.24,3.6) end
  plans[#plans+1]=plan
  if header then header.level=2;root:insert(header) else root:insert(pandoc.Header(2,'')) end
  root:extend(notes)
  -- A non-empty paragraph keeps Pandoc's blank/title layout deterministic.
  root:insert(pandoc.Para({pandoc.Str('PRESENTATION_CONTENT_PLACEHOLDER')}))
  blocks=pandoc.Blocks({})
 end
 for _,b in ipairs(doc.blocks) do
  if (b.t=='Header' and b.level<=2) or b.t=='HorizontalRule' then flush();header=b.t=='HorizontalRule' and pandoc.Header(2,'') or b
  else blocks:insert(b) end
 end
 flush();doc.blocks=root;return plans
end
return M

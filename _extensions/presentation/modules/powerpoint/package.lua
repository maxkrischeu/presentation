-- Native DrawingML additions, using only Pandoc's ZIP and Lua runtime.
local base=POWERPOINT_EXTENSION or pandoc.path.directory(PANDOC_SCRIPT_FILE)
package.path=base..'/vendor/?.lua;'..package.path
local XML=require 'slaxdom'
local function attr(n,key)
  for _,a in ipairs(n.attr or {}) do if a.name==key then return a.value end end
end
local function set(n,key,value,prefix)
  for _,a in ipairs(n.attr or {}) do if a.name==key then a.value=tostring(value);return end end
  n.attr=n.attr or {};n.attr[#n.attr+1]={type='attribute',name=key,value=tostring(value),nsPrefix=prefix}
end
local function walk(n,f) f(n);for _,c in ipairs(n.kids or {}) do walk(c,f) end end
local function find(n,name) local result;walk(n,function(c) if not result and c.name==name and c.type=='element' then result=c end end);return result end
local function escape(s) return tostring(s or ''):gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;'):gsub('"','&quot;') end
local namespaces='xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
local function node(s) return XML:dom('<root '..namespaces..'>'..s..'</root>').root.el[1] end
local function text(n) local s={};walk(n,function(c)if c.name=='t' then for _,t in ipairs(c.kids or {}) do if t.type=='text' then s[#s+1]=t.value end end end end);return table.concat(s) end
local function xfrm(x,y,w,h) return '<a:xfrm><a:off x="'..x..'" y="'..y..'"/><a:ext cx="'..w..'" cy="'..h..'"/></a:xfrm>' end
local function decode(value)
 local alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
 local bits=value:gsub('=',''):gsub('.',function(c)local n=assert(alphabet:find(c,1,true))-1;local s='';for k=5,0,-1 do s=s..(math.floor(n/2^k)%2) end;return s end)
 local decoded={};for i=1,#bits-7,8 do decoded[#decoded+1]=string.char(tonumber(bits:sub(i,i+7),2)) end
 return table.concat(decoded)
end
local compose=dofile(base..'/compose.lua')
return function(bytes,cfg)
 local archive=pandoc.zip.Archive(bytes);local files={}
 for _,e in ipairs(archive.entries) do files[e.path]=e:contents() end
 local types=XML:dom(files['[Content_Types].xml'])
 local function mime(ext,kind)
  for _,c in ipairs(types.root.kids) do if attr(c,'Extension')==ext then return end end
  types.root.kids[#types.root.kids+1]=XML:dom('<Default xmlns="http://schemas.openxmlformats.org/package/2006/content-types" Extension="'..ext..'" ContentType="'..kind..'"/>').root
 end
 local slides={};for path in pairs(files) do local n=path:match('^ppt/slides/slide(%d+)%.xml$');if n then slides[#slides+1]=tonumber(n) end end;table.sort(slides)
 assert(#slides==#cfg.plans, 'PowerPoint: unexpected slide count; refusing to place content on the wrong slide.')
 local presentation=XML:dom(files['ppt/presentation.xml']);local size=find(presentation,'sldSz')
 local W,H=tonumber(attr(size,'cx')),tonumber(attr(size,'cy'))
 local sx,sy=W/9144000,H/5143500
 local function scale(n,s) return math.floor(n*s+0.5) end
 local function tx(x,y,w,h) return xfrm(scale(x,sx),scale(y,sy),scale(w,sx),scale(h,sy)) end
 local logoExt
 if cfg.logoData then
  logoExt=({['image/svg+xml']='svg',['image/png']='png',['image/jpeg']='jpg',['image/gif']='gif'})[cfg.logoMime]
  assert(logoExt,'PowerPoint: unsupported logo format '..tostring(cfg.logoMime))
  files['ppt/media/presentation-logo.'..logoExt]=decode(cfg.logoData);mime(logoExt,cfg.logoMime)
 end
 for _,number in ipairs(slides) do
  local path='ppt/slides/slide'..number..'.xml';local doc=XML:dom(files[path]);local tree=find(doc,'spTree')
  local relpath='ppt/slides/_rels/slide'..number..'.xml.rels'
  local rels=XML:dom(files[relpath]);local rid=1000
  local function relation(kind,target)
   local id
   repeat rid=rid+1;id='rIdPresentation'..rid;local taken=false
    for _,r in ipairs(rels.root.kids) do if attr(r,'Id')==id then taken=true end end
    if not taken then break end
   until false
   rels.root.kids[#rels.root.kids+1]=XML:dom('<Relationship xmlns="http://schemas.openxmlformats.org/package/2006/relationships" Id="'..id..'" Type="'..kind..'" Target="'..escape(target)..'"/>').root
   return id
  end
  local id=0;walk(tree,function(n)if n.name=='cNvPr' then id=math.max(id,tonumber(attr(n,'id')) or 0) end end)
  local function shape(name,body)id=id+1;return node('<p:sp><p:nvSpPr><p:cNvPr id="'..id..'" name="'..name..'"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'..body..'</p:sp>') end
  local function textbox(name,value,x,y,w,h,align)
   if value=='' then return end
   tree.kids[#tree.kids+1]=shape(name,'<p:spPr>'..tx(x,y,w,h)..'<a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="none" anchor="ctr" lIns="0" rIns="0" tIns="0" bIns="0"/><a:lstStyle/><a:p><a:pPr algn="'..(align or 'l')..'"/><a:r><a:rPr sz="1100"><a:solidFill><a:srgbClr val="5E6878"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>'..escape(value)..'</a:t></a:r></a:p></p:txBody>')
  end
  -- Remove previously added frame objects if finalization runs again.
  local keep={};for _,n in ipairs(tree.kids) do local pr=find(n,'cNvPr');if (not pr or not (attr(pr,'name') or ''):match('^Presentation ')) and not (n.name=='sp' and not pr) and not text(n):find('PRESENTATION_CONTENT_PLACEHOLDER',1,true) then keep[#keep+1]=n end end;tree.kids=keep
  compose(files,tree,rels,cfg.plans and cfg.plans[number],number,XML,node,find,walk,attr,set,decode,mime,relation,W,H)
  local left=350000
  if logoExt then
   id=id+1;local rel=relation('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image','../media/presentation-logo.'..logoExt)
   tree.kids[#tree.kids+1]=node('<p:pic><p:nvPicPr><p:cNvPr id="'..id..'" name="Presentation Logo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="'..rel..'"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>'..tx(left,110000,math.floor(300000*math.min(1,cfg.logoRatio or 1)),math.floor(300000/math.max(1,cfg.logoRatio or 1)))..'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>');left=720000
  end
  textbox('Presentation Header Left',cfg.label,left,110000,2200000,300000)
  textbox('Presentation Header Center',cfg.header..(cfg.numbers and ((cfg.header~='' and ' · ' or '')..number..' / '..#slides) or ''),3150000,110000,2844000,300000,'ctr')
  textbox('Presentation Header Right',cfg.subject..(cfg.class~='' and ((cfg.subject~='' and ' · ' or '')..cfg.class) or ''),6200000,110000,2594000,300000,'r')
  textbox('Presentation Teacher',cfg.teacher~='' and (cfg.teacher:sub(1,1)=='@' and cfg.teacher or '@ '..cfg.teacher) or '',350000,4760000,3200000,260000)
  textbox('Presentation Institution',cfg.institution,5700000,4760000,3094000,260000,'r')
  for i,color in ipairs({'3873B8','14ABD5','7CB142','FFCC00','F59F00','E20010'}) do
   tree.kids[#tree.kids+1]=shape('Presentation Header Line '..i,'<p:spPr>'..tx(350000+(i-1)*1407333,485000,1407333,18000)..'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="'..color..'"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>')
  end
  tree.kids[#tree.kids+1]=shape('Presentation Footer Line','<p:spPr>'..tx(350000,4690000,8444000,7000)..'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="B9B9B9"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>')
  local layers={}
  walk(tree,function(n)
   if n.name=='tbl' and text(n):find('PRESENTATION_TASK_HEADER',1,true) then
    local row=0
    for _,tr in ipairs(n.kids) do if tr.name=='tr' then row=row+1
     walk(tr,function(c)
      if c.type=='text' then c.value=c.value:gsub('PRESENTATION_TASK_HEADER ','') end
      if c.name=='tc' then
       local props=find(c,'tcPr')
       if not props then props=node('<a:tcPr/>');c.kids[#c.kids+1]=props end
       local kept={};for _,v in ipairs(props.kids) do if v.name~='solidFill' and v.name~='lnL' then kept[#kept+1]=v end end;props.kids=kept
       props.kids[#props.kids+1]=node('<a:lnL w="25400"><a:solidFill><a:srgbClr val="F59F00"/></a:solidFill></a:lnL>')
       props.kids[#props.kids+1]=node('<a:solidFill><a:srgbClr val="'..(row==1 and 'FFF4E5' or 'FFFFFF')..'"/></a:solidFill>')
       walk(c,function(r)
        if r.name=='r' then
         local rp=find(r,'rPr');if not rp then rp=node('<a:rPr/>');table.insert(r.kids,1,rp) end
         local kept={};for _,v in ipairs(rp.kids) do if v.name~='solidFill' then kept[#kept+1]=v end end;rp.kids=kept
         table.insert(rp.kids,1,node('<a:solidFill><a:srgbClr val="'..(row==1 and '253481' or '172033')..'"/></a:solidFill>'))
        end
       end)
      end
     end)
    end end
   elseif n.name=='pic' then
    local pr=find(n,'cNvPr');local desc=attr(pr,'descr') or '';local title=attr(pr,'title') or ''
    local marker=title:find('PRESENTATION_',1,true) and title or desc
    if marker:match('^PRESENTATION_PLACEMENT ') then
     local values={};for k,v in marker:gmatch('([%a]+)=([^;]+)') do values[k]=tonumber((v:gsub('%%',''))) end
     layers[n]={level=values.layer or 1,order=#layers+1};layers[#layers+1]=n
     local xf=find(n,'xfrm');local off=find(xf,'off');local ext=find(xf,'ext')
     local mediaX,mediaY,mediaW,mediaH=.38*914400,1*914400,9.24*914400,4.08*914400
     local w=values.width and mediaW*values.width/100 or tonumber(attr(ext,'cx'));local h=values.height and mediaH*values.height/100 or tonumber(attr(ext,'cy'))
     if values.width and not values.height then h=h*w/tonumber(attr(ext,'cx')) end
     set(off,'x',math.floor(values.x and mediaX+mediaW*values.x/100 or (W-w)/2));set(off,'y',math.floor(values.y and mediaY+mediaH*values.y/100 or (H-h)/2))
     set(ext,'cx',math.floor(w));set(ext,'cy',math.floor(h));if values.rotation then set(xf,'rot',values.rotation*60000) end
     if values.transparency then local blip=find(n,'blip');blip.kids[#blip.kids+1]=node('<a:alphaModFix amt="'..math.floor((100-values.transparency)*1000)..'"/>') end
     set(pr,'title','');set(pr,'descr',desc:gsub('PRESENTATION_PLACEMENT .*',''))
    elseif marker:match('^PRESENTATION_VIDEO ') then
     local src=assert(marker:match('^PRESENTATION_VIDEO (.-) PRESENTATION_END'),'Invalid video marker');local full=pandoc.path.is_absolute(src) and src or pandoc.path.join({cfg.inputDir,src})
     local f=assert(io.open(full,'rb'),'PowerPoint: video missing: '..src);local video=f:read('a');f:close()
     local ext=src:lower():match('%.([a-z0-9]+)$');assert(ext=='mp4' or ext=='m4v' or ext=='webm','Unsupported video: '..src)
     local target='../media/presentation-video-'..number..'-'..attr(pr,'id')..'.'..ext
     files['ppt/'..target:gsub('^%.%./','')]=video;mime(ext,ext=='webm' and 'video/webm' or 'video/mp4')
     local videoRel=relation('http://schemas.openxmlformats.org/officeDocument/2006/relationships/video',target)
     local mediaRel=relation('http://schemas.microsoft.com/office/2007/relationships/media',target)
     local nv=find(n,'nvPr');nv.kids[#nv.kids+1]=node('<a:videoFile r:link="'..videoRel..'"/>')
     nv.kids[#nv.kids+1]=node('<p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}"><p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="'..mediaRel..'"/></p:ext></p:extLst>')
     pr.kids[#pr.kids+1]=node('<a:hlinkClick r:id="" action="ppaction://media"/>')
     set(pr,'title','');set(pr,'descr','Video')
    end
   end
  end)
  -- Retain the relative stacking order of saved free media. Layer zero is
  -- behind slide content; the frame stays above every content object.
  if #layers>0 then
   table.sort(layers,function(a,b) local x,y=layers[a],layers[b];return x.level==y.level and x.order<y.order or x.level<y.level end)
   local group,body,frame={},{},{}
   for _,n in ipairs(tree.kids) do
    local pr=find(n,'cNvPr');local name=pr and attr(pr,'name') or ''
    if not layers[n] then
     local target=(n.name=='nvGrpSpPr' or n.name=='grpSpPr') and group or
       (name:match('^Presentation ') and not name:match('^Presentation Part ')) and frame or body
     target[#target+1]=n
    end
   end
   local arranged={}
   local function append(items) for _,n in ipairs(items) do arranged[#arranged+1]=n end end
   append(group);for _,n in ipairs(layers) do if layers[n].level==0 then arranged[#arranged+1]=n end end
   append(body);for _,n in ipairs(layers) do if layers[n].level~=0 then arranged[#arranged+1]=n end end
   append(frame);tree.kids=arranged
  end
  local unique=0;walk(tree,function(n) if n.name=='cNvPr' then unique=unique+1;set(n,'id',unique) end end)
  -- Native video controls require a timing target as well as media relations.
  -- Build this after assigning final shape IDs (ECMA-376 CT_TLMediaNodeVideo).
  local videoIds={}
  walk(tree,function(n) if n.name=='pic' and find(n,'videoFile') then videoIds[#videoIds+1]=attr(find(n,'cNvPr'),'id') end end)
  if #videoIds>0 then
   local timing=node('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst/></p:cTn></p:par></p:tnLst></p:timing>')
   local children=find(timing,'childTnLst')
   for i,shapeId in ipairs(videoIds) do
    children.kids[#children.kids+1]=node('<p:video><p:cMediaNode vol="100000"><p:cTn id="'..(i+1)..'" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="'..shapeId..'"/></p:tgtEl></p:cMediaNode></p:video>')
   end
   local children={};local inserted=false
   for _,c in ipairs(doc.root.kids) do
    if c.name=='extLst' and not inserted then children[#children+1]=timing;inserted=true end
    if c.name~='timing' then children[#children+1]=c end
   end
   if not inserted then children[#children+1]=timing end
   doc.root.kids=children
  end
  files[path]=XML:xml(doc);files[relpath]=XML:xml(rels)
 end
 files['[Content_Types].xml']=XML:xml(types)
 local entries={};local names={};for name in pairs(files) do names[#names+1]=name end;table.sort(names)
 for _,name in ipairs(names) do entries[#entries+1]=pandoc.zip.Entry(name,files[name]) end
 return pandoc.zip.Archive(entries):bytestring()
end

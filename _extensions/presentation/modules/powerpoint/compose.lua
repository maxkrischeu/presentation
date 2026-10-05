-- Import editable Pandoc-generated components, remapping package relationships.
return function(files,tree,rels,plan,number,XML,node,find,walk,attr,set,decode,mime,relation,W,H)
 if not plan then return end
 local EMU=914400
 for index,part in ipairs(plan.parts) do
  local fragment={};for _,e in ipairs(pandoc.zip.Archive(decode(part.bytes)).entries) do fragment[e.path]=e:contents() end
  assert(not fragment['ppt/slides/slide2.xml'], 'PowerPoint: a component needs more than one slide. Split the source slide into smaller sections.')
  local path='ppt/slides/slide1.xml'
  local doc=XML:dom(assert(fragment[path]));local source=find(doc,'spTree')
  local contentTypes=XML:dom(fragment['[Content_Types].xml'])
  for _,t in ipairs(contentTypes.root.kids) do if t.name=='Default' then mime(attr(t,'Extension'),attr(t,'ContentType')) end end
  local map={};local references=XML:dom(fragment['ppt/slides/_rels/slide1.xml.rels'])
  for _,r in ipairs(references.root.kids) do if r.name=='Relationship' then
   local target=attr(r,'Target');local kind=attr(r,'Type')
   if not kind:match('/slideLayout$') and not kind:match('/notesSlide$') then
    local dest=target
    if attr(r,'TargetMode')~='External' then
     local segments={}
     for segment in ('ppt/slides/'..target):gmatch('[^/]+') do
      if segment=='..' then table.remove(segments) elseif segment~='.' then segments[#segments+1]=segment end
     end
     local absolute=table.concat(segments,'/')
     local bytes=fragment[absolute]
     assert(bytes,'PowerPoint: missing fragment resource '..absolute)
     local extension=absolute:match('%.([^./]+)$') or 'bin'
     dest='../media/presentation-'..pandoc.utils.sha1(bytes)..'.'..extension
     files['ppt/media/'..dest:match('([^/]+)$')]=bytes
    end
    local id=relation(kind,dest)
    if attr(r,'TargetMode')=='External' then
     for _,rr in ipairs(rels.root.kids) do if attr(rr,'Id')==id then set(rr,'TargetMode','External') end end
    end
    map[attr(r,'Id')]=id
   end
  end end
  local rect=part.rect
  local imported=0
  for _,container in ipairs(source.kids) do
   local shape=container.name=='AlternateContent' and (find(container,'sp') or find(container,'pic') or find(container,'graphicFrame')) or container
   if shape and (shape.name=='sp' or shape.name=='pic' or shape.name=='graphicFrame') then
    -- Fragment math and SVG markup may introduce additional namespaces.
    for _,a in ipairs(doc.root.attr or {}) do
     if a.nsPrefix=='xmlns' then
      shape.attr=shape.attr or {};shape.attr[#shape.attr+1]=a
     end
    end
    local ph=find(shape,'ph');local kind=ph and attr(ph,'type')
    if kind~='title' and kind~='ctrTitle' then
     walk(shape,function(n)
      for _,a in ipairs(n.attr or {}) do
       if a.nsPrefix=='r' and map[a.value] then a.value=map[a.value] end
      end
     end)
     local nv=find(shape,'cNvPr');if nv then set(nv,'name','Presentation Part '..index) end
     local x,y,w,h=rect.x*EMU,rect.y*EMU,rect.w*EMU,rect.h*EMU
     local xf=find(shape,'xfrm')
     if shape.name=='pic' and xf then
      local ext=find(xf,'ext');local ow,oh=tonumber(attr(ext,'cx')),tonumber(attr(ext,'cy'))
      local ratio=math.min(w/ow,h/oh);local nw,nh=ow*ratio,oh*ratio
      x=x+(w-nw)/2;y=y+(h-nh)/2;w=nw;h=nh
     end
     if not xf then
      local props=find(shape,'spPr');xf=node('<a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm>');table.insert(props.kids,1,xf)
     end
     set(find(xf,'off'),'x',math.floor(x));set(find(xf,'off'),'y',math.floor(y));set(find(xf,'ext'),'cx',math.floor(w));set(find(xf,'ext'),'cy',math.floor(h))
     if shape.name=='graphicFrame' then
      local tbl=find(shape,'tbl');if tbl then
       local grid=find(tbl,'tblGrid');local total=0
       for _,c in ipairs(grid.kids) do if c.name=='gridCol' then total=total+(tonumber(attr(c,'w')) or 0) end end
       for _,c in ipairs(grid.kids) do if c.name=='gridCol' then set(c,'w',math.floor(tonumber(attr(c,'w'))/total*w)) end end
       local rows,total={},0
       for _,tr in ipairs(tbl.kids) do if tr.name=='tr' then
        local count=1
        for _,tc in ipairs(tr.kids) do if tc.name=='tc' then
         local paragraphs=0;walk(tc,function(n) if n.name=='p' then paragraphs=paragraphs+1 end end)
         count=math.max(count,paragraphs)
        end end
        rows[#rows+1]={node=tr,weight=count};total=total+count
       end end
       for _,row in ipairs(rows) do set(row.node,'h',math.floor(h*row.weight/total)) end

      end
     else
      local body=find(shape,'bodyPr')
      if body then
       set(body,'wrap','square');set(body,'lIns','0');set(body,'rIns','0');set(body,'tIns','0');set(body,'bIns','0')
       local kept={};for _,c in ipairs(body.kids) do if c.name~='spAutoFit' and c.name~='noAutofit' and c.name~='normAutofit' then kept[#kept+1]=c end end;body.kids=kept
       body.kids[#body.kids+1]=node('<a:normAutofit/>')
      end
      if plan.quote then
       walk(shape,function(n)
        if n.name=='pPr' then set(n,'algn','ctr');set(n,'marL',0) end
        if n.name=='rPr' and n.nsPrefix=='a' then set(n,'sz','2400') end
       end)
      end
     end
     -- Do not retain duplicate placeholder identities from component slides.
     local nvpr=find(shape,'nvPr')
     if nvpr then local kept={};for _,c in ipairs(nvpr.kids) do if c.name~='ph' then kept[#kept+1]=c end end;nvpr.kids=kept end
     local font=(plan.quote and 24 or part.code and 16 or shape.name=='graphicFrame' and 18 or 20)*(part.fontScale or 1)
     walk(shape,function(n)
      if n.name=='rPr' and n.nsPrefix=='a' then
       if not attr(n,'sz') then set(n,'sz',math.floor(font*100)) end
       if not find(n,'latin') then n.kids[#n.kids+1]=node('<a:latin typeface="'..(part.code and 'Courier New' or 'Arial')..'"/>') end
      elseif n.name=='pPr' then
       local kept={};for _,c in ipairs(n.kids) do if c.name~='spcBef' and c.name~='spcAft' and c.name~='lnSpc' then kept[#kept+1]=c end end;n.kids=kept
       table.insert(n.kids,1,node('<a:spcAft><a:spcPts val="300"/></a:spcAft>'))
       table.insert(n.kids,1,node('<a:lnSpc><a:spcPct val="100000"/></a:lnSpc>'))
       if not find(n,'buNone') and not find(n,'buAutoNum') and not find(n,'buChar') then n.kids[#n.kids+1]=node('<a:buChar char="•"/>') end
       if not find(n,'buNone') then
        local level=tonumber(attr(n,'lvl')) or 0
        set(n,'marL',math.floor((.2+level*.25)*EMU));set(n,'indent',-math.floor(.17*EMU))
       end
      end
     end)
     tree.kids[#tree.kids+1]=container;imported=imported+1
    end
   end
  end
  assert(imported>0, 'PowerPoint: content block '..index..' on slide '..number..' could not be represented as an editable object.')
 end
end

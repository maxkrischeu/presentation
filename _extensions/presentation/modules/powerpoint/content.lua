-- Keep semantics native until Pandoc's PowerPoint writer has finished.
local function has(el,c) return el.classes and el.classes:includes(c) end
local function str(v) return v and v~=false and pandoc.utils.stringify(v) or '' end
local function warn(s) quarto.log.warning('PowerPoint: '..s) end
local de=false
local function para(s) return pandoc.Para({pandoc.Str(s)}) end
local function content(doc)
  local cfg=doc.meta.presentation or {}
  de=str(cfg.lang or doc.meta.lang):match('^de')~=nil
  local assets={}
  for _,item in ipairs((cfg.media or {}).items or cfg.assets or {}) do
    if item.id and item.src then assets[str(item.id)]=str(item.src) end
  end
  local answers,solutions={},{}
  local function convert(blocks)
    return pandoc.Pandoc(blocks):walk({
      RawBlock=function(el)
        if el.format=='html' then
          warn('HTML content is converted to text; embedded widgets require a link.')
          return pandoc.read(el.text,'html').blocks
        end
      end,
      RawInline=function(el)
        if el.format=='html' then return pandoc.utils.blocks_to_inlines(pandoc.read(el.text,'html').blocks) end
      end,
      Span=function(el)
        if has(el,'answer') then
          answers[#answers+1]=str(el.content);solutions[#solutions+1]=str(el.content)
          return pandoc.Str('________')
        elseif has(el,'correct') then
          solutions[#solutions+1]=str(el.content);return el.content
        end
      end,
      Div=function(el)
        if has(el,'notes') then return el end
        if has(el,'presentation-assets') then return {} end
        if has(el,'quote') then
          local first,last
          for _,b in ipairs(el.content) do if b.t=='Para' or b.t=='Plain' then first=first or b;last=b end end
          if first then
            first.content:insert(1,pandoc.Str(de and '„' or '“'));last.content:insert(pandoc.Str('”'))
            if de then last.content[#last.content]=pandoc.Str('“') end
          end
          for _,b in ipairs(el.content) do if b.t=='Para' or b.t=='Plain' then b.content=pandoc.Inlines({pandoc.Emph(b.content)}) end end
          if str(el.attributes.author)~='' then el.content:insert(para('— '..el.attributes.author)) end
          return pandoc.BlockQuote(el.content)
        end
        if has(el,'task') then
          local a=el.attributes
          local icons={pencil='✎',pen='✎',computer='⌨',book='▤',pair='●●',group='●●●',discussion='…',none=''}
          local time=a.time or '';if time:match('^%s*%d+%s*$') then time=time:match('%d+')..' min' end
          local heading=(a.title or (de and 'Aufgabe' or 'Task'))
          local label=heading..((icons[a.icon or 'none'] or '')~='' and ('  '..icons[a.icon]) or '')..(time~='' and ('  ·  '..time) or '')
          local media,body=pandoc.Blocks({}),pandoc.Blocks({})
          for _,b in ipairs(el.content) do
            local image=false
            pandoc.walk_block(b,{Image=function() image=true end})
            if image then media:insert(b) else body:insert(b) end
          end
          local table=pandoc.utils.from_simple_table(pandoc.SimpleTable({}, {pandoc.AlignLeft}, {1},
            {{pandoc.Plain({pandoc.Str('PRESENTATION_TASK_HEADER '),pandoc.Strong({pandoc.Str(label)})})}}, {{body}}))
          local out=pandoc.Blocks({table});out:extend(media);return out
        end
        if has(el,'image') or has(el,'placed-image') then
          local a=el.attributes;local src=a.src or assets[a.asset or ''] or (a.asset or ''):match('^file:(.*)')
          if not src or src=='' then error('PowerPoint: cannot resolve image '..(a.asset or '')) end
          local attrs={}
          if a.width then attrs.width=a.width end
          if a.height and a.height~='fill' then attrs.height=a.height end
          local title=''
          if a.position=='free' or has(el,'placed-image') then
            local p={};for _,k in ipairs({'x','y','width','height','rotation','transparency','layer'}) do p[#p+1]=k..'='..(a[k] or '') end
            title='PRESENTATION_PLACEMENT '..table.concat(p,';')
          end
          return pandoc.Para({pandoc.Image(a.alt or '',src,title,pandoc.Attr('',{},attrs))})
        end
        if has(el,'video') or has(el,'embed') or has(el,'document') then
          local a=el.attributes;local src=assert(a.src,'Media requires src')
          if has(el,'video') and not src:match('^https?://') then
            -- A marker picture is replaced by an embedded native video after writing.
            local path=pandoc.path.join({pandoc.path.directory(PANDOC_SCRIPT_FILE),'video.svg'})
            local f=assert(io.open(path,'rb'));local bytes=f:read('a');f:close()
            local marker='presentation-video.svg';pandoc.mediabag.insert(marker,'image/svg+xml',bytes)
            return pandoc.Para({pandoc.Image(a.title or 'Video',marker,'PRESENTATION_VIDEO '..src..' PRESENTATION_END')})
          end
          warn((a.title or src)..': exported as a clickable link.')
          return pandoc.Para({pandoc.Link(a.title or src,src)})
        end
        return el
      end,
      BulletList=function(el)
        local images=false
        for _,item in ipairs(el.content) do
          for _,b in ipairs(item) do pandoc.walk_block(b,{Image=function() images=true end}) end
        end
        if not images then return end
        local columns={}
        for index,item in ipairs(el.content) do
          local blocks=pandoc.Blocks({para(tostring(index)..'.')})
          for _,b in ipairs(item) do
            local pics={}
            b=pandoc.walk_block(b,{Image=function(im) pics[#pics+1]=im;return {} end})
            if b.t~='Figure' and str(b)~='' then blocks:insert(b) end
            for _,im in ipairs(pics) do blocks:insert(pandoc.Para({im})) end
          end
          columns[#columns+1]=pandoc.Div(blocks,pandoc.Attr('',{'column'},{width=tostring(100/#el.content)..'%'}))
        end
        return pandoc.Div(columns,pandoc.Attr('',{'columns'}))
      end,
      CodeBlock=function(el)
        if has(el,'image-layout') or has(el,'presentation-image-layout') then
          error('PowerPoint: migrate legacy image-layout blocks to .image position="free" before exporting.')
        end
      end
    }).blocks
  end
  local out,pending=pandoc.Blocks({}),pandoc.Blocks({})
  local header
  local function flush()
    answers,solutions={},{}
    -- Prepared library items are declarations, not visible slide pictures.
    pandoc.Pandoc(pending):walk({Div=function(d)
      if has(d,'presentation-assets') then d:walk({Image=function(im) assets[im.identifier~='' and im.identifier or im.src]=im.src end}) end
    end})
    local converted=convert(pending)
    if header then
      out:insert(header)
      if has(header,'quiz-intro') and header.attributes.subtitle then out:insert(para(header.attributes.subtitle)) end
      if has(header,'quiz-results') then out:insert(para(de and 'Ergebnisse gemeinsam besprechen.' or 'Discuss the results together.')) end
    end
    if #answers>0 then
      table.sort(answers);converted:insert(para((de and 'Auswahl: ' or 'Choices: ')..table.concat(answers,' · ')))
    end
    out:extend(converted)
    if #solutions>0 then out:insert(pandoc.Div({para((de and 'Lösung: ' or 'Answer: ')..table.concat(solutions,'; '))},pandoc.Attr('',{'notes'}))) end
    pending=pandoc.Blocks({})
  end
  for _,b in ipairs(doc.blocks) do
    if (b.t=='Header' and b.level<=2) or b.t=='HorizontalRule' then flush();header=b
    else pending:insert(b) end
  end
  flush();doc.blocks=out;return doc
end
return {{Pandoc=content}}

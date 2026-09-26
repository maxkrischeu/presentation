local media = dofile(pandoc.path.join({pandoc.path.directory(PANDOC_SCRIPT_FILE), '../media/options.lua'}))
-- Asset declarations become embedded inert templates, never visible slide content.
local function esc(s)
  return s:gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;'):gsub('"','&quot;')
end
local resources = {}
local folders = {'assets'}
local function image(src, id, label)
  local pathname = src:lower():gsub('[?#].*$', '')
  local video = pathname:match('%.mp4$') or pathname:match('%.webm$') or pathname:match('%.m4v$')
  if src:match('^%a+://') and not src:match('^https?://') then error('Unsupported media URL: '..src) end
  if not src:match('^https?://') then resources[src] = true end
  -- Inert catalog entries retain paths; bytes are fetched only by the player
  -- or a visible library preview, not embedded in every presentation.
  return '<img data-media-source="'..esc(src)..'" data-asset-id="'..esc(id)..'" data-media-kind="'..(video and 'video' or 'image')..'" alt="'..esc(label)..'" src="'..esc(src)..'">'

end
local global = ''
local lesson = ''
local declared = {}
local layouts = {}
local native_layouts = {}
local free_declared = {}
local heading_count = 0
local current_slide = "title-slide"
function Header(header)
  heading_count = heading_count + 1
  if header.level <= 2 then current_slide = header.identifier end
  header.attributes['data-presentation-source-index'] = tostring(heading_count)
  return header
end
local function placement(entry)
  local item = {asset=pandoc.utils.stringify(entry.asset or '')}
  if item.asset == '' then error('image-layout: asset is required.') end
  for key, value in pairs(entry) do
    if key ~= 'asset' then
      if not ({x=true,y=true,width=true,height=true,layer=true,rotation=true,transparency=true})[key] then error('Unknown image-layout field: '..key) end
      item[key] = tonumber(pandoc.utils.stringify(value))
      if not item[key] or item[key] ~= item[key] or math.abs(item[key]) == math.huge then error('image-layout: '..key..' must be a finite number.') end
    end
  end
  if item.transparency and (item.transparency < 0 or item.transparency > 100) then error('image-layout: transparency must be between 0 and 100.') end
  if item.layer and (item.layer < 0 or item.layer % 1 ~= 0) then error('image-layout: layer must be a non-negative integer.') end
  if item.width and (item.width <= 0 or item.width > 100) then error('image-layout: width must be between 0 and 100.') end
  if item.height and (item.height <= 0 or item.height > 100) then error('image-layout: height must be between 0 and 100.') end
  return item
end
function CodeBlock(block)
  if block.classes:includes('image-layout') then
    if layouts[current_slide] then error('Duplicate image layout: '..current_slide) end
    local yaml = '---\nimages:\n'..block.text:gsub('([^\n]+)', '  %1')..'\n---\n'
    local entries = pandoc.read(yaml, 'markdown').meta.images or {}
    local images = {}
    for _, entry in ipairs(entries) do
      local item = placement(entry)
      images[#images+1] = item
    end
    layouts[current_slide] = {format='friendly', images=images}
    return {}
  end
  if not block.classes:includes('presentation-image-layout') then return nil end
  local data = quarto.json.decode(block.text)
  if data.version ~= 1 or not data.slide or not data.images then error('Invalid presentation-image-layout block.') end
  if layouts[data.slide] then error('Duplicate image layout: '..data.slide) end
  layouts[data.slide] = data.images
  return {}
end
local function PlacedImage(div)
  local kind = div.classes:includes('image') and 'image' or div.classes:includes('video') and 'video' or nil
  if kind then
    if div.attributes.position and div.attributes.position ~= 'free' then error('Media position must be free or omitted.') end
    if div.attributes.position == 'free' then
      local a=div.attributes
      media.read(div)
      if not a.src or a.src=='' then error('Free media requires src.') end
      if kind=='video' and not a.src:lower():gsub('[?#].*$',''):match('%.mp4$') and not a.src:lower():gsub('[?#].*$',''):match('%.webm$') and not a.src:lower():gsub('[?#].*$',''):match('%.m4v$') then error('Free video requires a direct MP4, WebM or M4V file.') end
      local id='file:'..a.src
      if not free_declared[a.src] then
        global=global..image(a.src,id,a.title or a.alt or a.src)
        free_declared[a.src]=true
        declared[pandoc.path.normalize(a.src)]=true
      end
      local attrs={asset=id}
      for _,key in ipairs({'x','y','width','height','layer','rotation','transparency'}) do
        if a[key] then
          local value=a[key]
          if key=='x' or key=='y' or key=='width' or key=='height' then
            value=value:match('^([%d.+-]+)%%$')
            if not value then error('Free media '..key..' requires a percentage.') end
          end
          attrs[key]=value
        end
      end
      div.attributes=attrs
      div.classes:insert('placed-image')
    else
      local attrs=media.read(div)
      local src=div.attributes.src
      local content
      if kind=='image' then
        -- No paragraph wrapper: the image fills the shared sizing box.
        content=pandoc.RawBlock('html','<img src="'..esc(src)..'" alt="'..esc(div.attributes.alt or '')..'">')
      else
        local youtube=src:match('youtu%.be/([%w_-]+)') or src:match('youtube%.com/watch%?v=([%w_-]+)') or src:match('youtube%.com/embed/([%w_-]+)')
        local vimeo=src:match('vimeo%.com/(%d+)')
        if youtube or vimeo then
          local url=youtube and ('https://www.youtube-nocookie.com/embed/'..youtube) or ('https://player.vimeo.com/video/'..vimeo)
          content=pandoc.RawBlock('html','<iframe data-src="'..url..'" title="'..esc(div.attributes.title or 'Video')..'" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>')
        else
          content=pandoc.RawBlock('html','<video controls playsinline preload="metadata" src="'..esc(src)..'" aria-label="'..esc(div.attributes.title or 'Video')..'"></video>')
        end
      end
      if not src:match('^https?://') then resources[src]=true end
      local classes={'presentation-media-box','presentation-inline-media'}
      for _,class in ipairs(div.classes) do if class~='image' and class~='video' then classes[#classes+1]=class end end
      return pandoc.Div({content},pandoc.Attr(div.identifier,classes,attrs))
    end
  end
  if not div.classes:includes('placed-image') then return nil end
  if #div.content > 0 then error('placed-image blocks must be empty; use attributes for placement.') end
  local layout = layouts[current_slide]
  if layout and not native_layouts[current_slide] then error('Do not mix legacy layouts and placed-image blocks on one slide.') end
  layout = layout or {format='friendly', images={}}
  layout.images[#layout.images+1] = placement(div.attributes)
  layouts[current_slide] = layout
  native_layouts[current_slide] = true
  -- Quarto generates the title outside the document body. Leaving a body
  -- anchor here would create an empty slide before the first heading.
  if current_slide == 'title-slide' then return {} end
  -- Keep the source position as a reveal anchor; the editable image itself
  -- lives in its independently positioned foreground/background layer.
  return pandoc.RawBlock('html', '<span hidden data-presentation-image-step="'..#layout.images..'"></span>')
end
function Meta(meta)
  local config=meta.presentation or {}
  local mediaConfig=config.media or {}
  if type(mediaConfig)~='table' then error('presentation.media must contain folders and/or items.') end
  for key,_ in pairs(mediaConfig) do
    if key~='folders' and key~='items' then error('Unknown presentation.media option: '..key) end
  end
  if mediaConfig.folders~=nil then
    if pandoc.utils.type(mediaConfig.folders)~='List' then error('presentation.media.folders must be a list.') end
    folders={}
    for _,folder in ipairs(mediaConfig.folders) do folders[#folders+1]=pandoc.utils.stringify(folder) end
  end
  local assets = mediaConfig.items or config.assets or {}
  if pandoc.utils.type(assets)~='List' and next(assets)~=nil then error('presentation.media.items must be a list.') end
  local seen = {}
  for _, asset in ipairs(assets) do
    if not asset.src then error('Each presentation.assets entry requires src.') end
    local src = pandoc.utils.stringify(asset.src)
    declared[pandoc.path.normalize(src)] = true
    local id = pandoc.utils.stringify(asset.id or asset.src)
    if seen[id] then error('Duplicate global asset id: '..id) end
    seen[id] = true
    global = global..image(src, id, pandoc.utils.stringify(asset.label or asset.id or asset.src))
  end
end
function Div(div)
  if not div.classes:includes('presentation-assets') then return nil end
  local images, seen = {}, {}
  div:walk({Image=function(img)
    local id = img.identifier ~= '' and img.identifier or img.src
    if seen[id] then error('Duplicate slide asset id: '..id) end
    seen[id] = true
    local label = pandoc.utils.stringify(img.caption)
    images[#images+1] = image(img.src, id, label ~= '' and label or id)
  end})
  return pandoc.RawBlock('html', '<template class="presentation-assets-source" data-scope="slide">'..table.concat(images)..'</template>')
end
function Pandoc(doc)
  local input = quarto.doc.input_file
  local input_dir = pandoc.path.directory(pandoc.path.normalize(pandoc.path.is_absolute(input) and input or pandoc.path.join({pandoc.system.get_working_directory(), input})))
  local root = quarto.project.directory or os.getenv('QUARTO_PROJECT_DIR')
  -- Single-file preview may omit both project context values. Resolve the
  -- nearest Quarto project from the source, never from the configured assets.
  if not root then
    local candidate = input_dir
    while candidate and candidate ~= '' do
      for _, name in ipairs({'_quarto.yml', '_quarto.yaml'}) do
        local file = io.open(pandoc.path.join({candidate, name}), 'rb')
        if file then file:close(); root = candidate; break end
      end
      if root then break end
      local parent = pandoc.path.directory(candidate)
      if parent == candidate then break end
      candidate = parent
    end
  end
  root = root or input_dir
  -- Quarto rebases existing project paths relative to nested input files.
  -- Store canonical project-relative folders for both render and live refresh.
  for i,folder in ipairs(folders) do
    if folder:match('^%.%./') then
      folders[i]=pandoc.path.make_relative(pandoc.path.normalize(pandoc.path.join({input_dir,folder})),root)
    end
  end
  local scanner = pandoc.path.join({pandoc.path.directory(PANDOC_SCRIPT_FILE), 'assets.py'})
  local discovered = quarto.json.decode(pandoc.pipe('python3', {scanner, root, input, #folders==0 and '[]' or quarto.json.encode(folders)}, ''))
  for _, asset in ipairs(discovered) do
    if not declared[pandoc.path.normalize(asset.src)] then
      local markup = image(asset.src, asset.id, asset.label)
      if asset.scope == 'lesson' then lesson = lesson..markup else global = global..markup end
    end
  end
  local file = assert(io.open(input, 'rb'))
  local bytes = file:read('*a'); file:close()
  local source = {file=input, revision=pandoc.utils.sha1(bytes), headings=heading_count, mediaFolders=#folders>0 and folders or nil, mediaFoldersEmpty=#folders==0}
  doc.blocks:insert(pandoc.RawBlock('html', '<template id="presentation-source-layout">'..esc(quarto.json.encode(source))..'</template>'))
  doc.blocks:insert(pandoc.RawBlock('html', '<template id="presentation-prepared-layout">'..esc(next(layouts) and quarto.json.encode(layouts) or '{}')..'</template>'))
  doc.blocks:insert(pandoc.RawBlock('html', '<template class="presentation-assets-source" data-scope="global">'..global..'</template>'))
  doc.blocks:insert(pandoc.RawBlock('html', '<template class="presentation-assets-source" data-scope="lesson">'..lesson..'</template>'))
  local links = pandoc.Inlines({})
  for src, _ in pairs(resources) do links:insert(pandoc.Link('', src)) end
  doc.blocks:insert(pandoc.Div({pandoc.Plain(links)}, pandoc.Attr('', {'presentation-media-resources'}, {hidden='hidden'})))
  return doc
end

-- Process headers and layouts in document order, not grouped by AST node type.
return {{Meta=Meta, Div=Div}, {traverse='topdown', Header=Header, CodeBlock=CodeBlock, Div=PlacedImage}, {Pandoc=Pandoc}}

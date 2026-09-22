-- Asset declarations become embedded inert templates, never visible slide content.
local function esc(s)
  return s:gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;'):gsub('"','&quot;')
end
local function image(src, id, label)
  if src:match('^%a+://') then error('Presentation assets require local paths: '..src) end
  local ok, mime, bytes = pcall(pandoc.mediabag.fetch, src)
  local supported = {['image/png']=true,['image/jpeg']=true,['image/svg+xml']=true,
    ['image/webp']=true,['image/gif']=true,['image/avif']=true}
  if not ok or not bytes or not supported[mime] then error('Unsupported or missing Presentation image: '..src) end
  return '<img data-asset-id="'..esc(id)..'" alt="'..esc(label)..'" src="data:'..mime..';base64,'..quarto.base64.encode(bytes)..'">'
end
local global = ''
local lesson = ''
local declared = {}
local layouts = {}
local native_layouts = {}
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
  if not div.classes:includes('placed-image') then return nil end
  if #div.content > 0 then error('placed-image blocks must be empty; use attributes for placement.') end
  local layout = layouts[current_slide]
  if layout and not native_layouts[current_slide] then error('Do not mix legacy layouts and placed-image blocks on one slide.') end
  layout = layout or {format='friendly', images={}}
  layout.images[#layout.images+1] = placement(div.attributes)
  layouts[current_slide] = layout
  native_layouts[current_slide] = true
  return {}
end
function Meta(meta)
  local assets = (meta.presentation or {}).assets or (meta['presentation-defaults'] or {}).assets or {}
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
  local root = quarto.project.directory or os.getenv('QUARTO_PROJECT_DIR') or pandoc.system.get_working_directory()
  local scanner = pandoc.path.join({pandoc.path.directory(PANDOC_SCRIPT_FILE), 'assets.py'})
  local discovered = quarto.json.decode(pandoc.pipe('python3', {scanner, root, input}, ''))
  for _, asset in ipairs(discovered) do
    if not declared[pandoc.path.normalize(asset.src)] then
      local markup = image(asset.src, asset.id, asset.label)
      if asset.scope == 'lesson' then lesson = lesson..markup else global = global..markup end
    end
  end
  local file = assert(io.open(input, 'rb'))
  local bytes = file:read('*a'); file:close()
  local source = {file=input, revision=pandoc.utils.sha1(bytes), headings=heading_count}
  doc.blocks:insert(pandoc.RawBlock('html', '<template id="presentation-source-layout">'..esc(quarto.json.encode(source))..'</template>'))
  doc.blocks:insert(pandoc.RawBlock('html', '<template id="presentation-prepared-layout">'..esc(next(layouts) and quarto.json.encode(layouts) or '{}')..'</template>'))
  doc.blocks:insert(pandoc.RawBlock('html', '<template class="presentation-assets-source" data-scope="global">'..global..'</template>'))
  doc.blocks:insert(pandoc.RawBlock('html', '<template class="presentation-assets-source" data-scope="lesson">'..lesson..'</template>'))
  return doc
end

-- Process headers and layouts in document order, not grouped by AST node type.
return {{Meta=Meta, Div=Div}, {traverse='topdown', Header=Header, CodeBlock=CodeBlock, Div=PlacedImage}, {Pandoc=Pandoc}}

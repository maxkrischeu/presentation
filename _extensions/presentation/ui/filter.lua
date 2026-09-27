-- Metadata is resolved once during rendering. No text is scraped from slides.
local function escape(value)
  return value:gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;')
    :gsub('"', '&quot;'):gsub("'", '&#39;')
end
local frame_html
function Meta(meta)
  local config = {}
  for key, value in pairs(meta.presentation or {}) do config[key] = value end
  local allowed = {logo=true, ['logo-text']=true, ['header-text']=true, ['slide-number']=true,
    subject=true, class=true, teacher=true, ['teacher-url']=true, institution=true, ['institution-url']=true, dock=true, ['dock-items']=true, fragments=true, ['auto-fragments']=true, ['fragment-effect']=true, assets=true, media=true, laser=true, lang=true}
  for key, _ in pairs(config) do
    if not allowed[key] then error('Unbekannte presentation-Einstellung: ' .. key) end
  end
  if config.teacher == nil and meta.author ~= nil then
    local function author_name(author)
      if type(author) == 'table' and author.name then
        local name = author.name
        if type(name) == 'table' and name.literal then return pandoc.utils.stringify(name.literal) end
        return pandoc.utils.stringify(name)
      end
      return pandoc.utils.stringify(author)
    end
    if pandoc.utils.type(meta.author) == 'List' then
      local names = {}
      for _, author in ipairs(meta.author) do
        local name = author_name(author)
        if name ~= '' then table.insert(names, name) end
      end
      config.teacher = table.concat(names, ', ')
    else config.teacher = author_name(meta.author) end
  end
  if config['header-text'] == nil then config['header-text'] = meta.subtitle end
  local function text(key)
    local value = config[key]
    if key == 'logo-text' and pandoc.utils.stringify(value or '') == 'date' then
      value = meta.date
      if value == nil then error('presentation.logo-text: date benötigt date im Dokument, z. B. date: today.') end
    end
    if value == nil or value == false then return '' end
    return escape(pandoc.utils.stringify(value))
  end
  local teacher = text('teacher'):match('^%s*(.-)%s*$')
  local institution = text('institution'):match('^%s*(.-)%s*$')
  local function linked_label(label, key)
    local url = text(key):match('^%s*(.-)%s*$')
    if url == '' then return label end
    if not url:lower():match('^https?://[^/%s?#]+') or url:find('%s') then
      error('presentation.' .. key .. ' muss eine vollständige http://- oder https://-Adresse sein.')
    end
    if label == '' then return '' end
    return '<a href="' .. url .. '" target="_blank" rel="noopener noreferrer">' .. label .. '</a>'
  end
  if teacher ~= '' and teacher:sub(1, 1) ~= '@' then teacher = '@ ' .. teacher end
  teacher = linked_label(teacher, 'teacher-url')
  institution = linked_label(institution, 'institution-url')
  local dock = config.dock
  local dock_items = config['dock-items']
  if type(dock)=='table' then
    for key,_ in pairs(dock) do
      if key~='enabled' and key~='items' then error('Unknown presentation.dock option: '..key) end
    end
    dock_items = dock.items or dock_items
    dock = dock.enabled
  end
  if dock ~= nil and type(dock) ~= 'boolean' then error('presentation.dock.enabled must be true or false.') end
  local dock_json = ''
  if dock_items ~= nil then
    if pandoc.utils.type(dock_items) ~= 'List' then
      error('presentation.dock.items muss eine Liste von Befehlsnamen sein.')
    end
    local values, seen = {}, {}
    for _, item in ipairs(dock_items) do
      local name = pandoc.utils.stringify(item)
      if not name:match('^[a-z][a-zA-Z0-9-]*$') or seen[name] then
        error('Ungültiger oder doppelter dock-items-Eintrag: ' .. name)
      end
      seen[name] = true
      table.insert(values, '"' .. name .. '"')
    end
    dock_json = '[' .. table.concat(values, ',') .. ']'
  end
  local slide_number = config['slide-number']
  if slide_number ~= nil and type(slide_number) ~= 'boolean' then
    error('presentation.slide-number muss true oder false sein.')
  end
  local subject, class = text('subject'), text('class')
  local course = subject .. ((subject ~= '' and class ~= '') and ' · ' or '') .. class
  local logo = text('logo')
  if logo ~= '' then
    local path = pandoc.utils.stringify(config.logo)
    local ok, mime, data = pcall(pandoc.mediabag.fetch, path)
    -- Custom metadata paths are not always rebased for nested lesson files.
    -- Try the shared project asset when there is no document-local logo.
    if (not ok or not data) and not pandoc.path.is_absolute(path) and quarto.project.directory then
      ok, mime, data = pcall(pandoc.mediabag.fetch, pandoc.path.join({quarto.project.directory, path}))
    end
    if not ok or not data then error('Logo kann nicht gelesen werden: ' .. path) end
    logo = 'data:' .. mime .. ';base64,' .. quarto.base64.encode(data)
  end
  local image = logo ~= '' and ('<img class="presentation-logo" src="' .. logo .. '" alt="Logo">') or ''
  local html = string.format([[<template id="presentation-frame-template" data-dock="%s" data-dock-items="%s" data-slide-number="%s" data-date-in-header="%s">
<header class="presentation-header" aria-label="Kopfzeile">
  <div class="presentation-header-left">%s<span class="presentation-label">%s</span></div>
  <div class="presentation-header-center presentation-label">%s</div>
  <div class="presentation-header-right presentation-label">%s</div>
  <div class="presentation-progress" aria-hidden="true"><div class="presentation-progress-fill"></div></div>
</header>
<footer class="presentation-footer" aria-label="Fußzeile">
  <div class="presentation-label">%s</div><div></div>
  <div class="presentation-footer-right presentation-label">%s</div>
</footer>
</template>]], tostring(dock ~= false), escape(dock_json), tostring(slide_number == true), tostring(pandoc.utils.stringify(config['logo-text'] or '') == 'date'), image, text('logo-text'), text('header-text'), course, teacher, institution)
  local language = pandoc.utils.stringify(config.lang or meta.lang or 'en'):lower():match('^([a-z]+)')
  if config.lang and language ~= 'de' and language ~= 'en' then error('presentation.lang: de oder en verwenden.') end
  frame_html = html:gsub('id="presentation%-frame%-template"', 'id="presentation-frame-template" data-language="' .. (language == 'de' and 'de' or 'en') .. '"')
  return meta
end
function Pandoc(doc)
  doc.blocks:insert(pandoc.RawBlock('html', frame_html))
  return doc
end

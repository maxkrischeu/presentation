-- Task headers are presentation furniture; only the body receives auto steps.
local icons = {
  pencil = '<path d="m4 16-1 5 5-1L20 8l-4-4Z M14 6l4 4"/>',
  computer = '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  pair = '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m1-7a5 5 0 0 1 7 4v3"/>',
  group = '<circle cx="12" cy="6" r="3"/><circle cx="4" cy="9" r="2"/><circle cx="20" cy="9" r="2"/><path d="M6 22v-4a6 6 0 0 1 12 0v4M1 21v-5a3 3 0 0 1 4-3m14 0a3 3 0 0 1 4 3v5"/>',
}
icons.pen = icons.pencil -- Compatibility with existing documents.
icons.book = '<path d="M12 5v16M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"/>'
icons.discussion = '<path d="M21 11a8 8 0 0 1-8 8H8l-5 3v-7a8 8 0 1 1 18-4Z"/><path d="M7 10h10M7 14h6"/>'
local function escape(value)
  return value:gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;'):gsub('"','&quot;')
end
local language = 'en'
function Meta(meta)
  language = pandoc.utils.stringify((meta.presentation or {}).lang or meta.lang or 'en'):lower():match('^de') and 'de' or 'en'
end
local labels = {
  de={pencil='Schriftliche Aufgabe',pen='Schriftliche Aufgabe',book='Leseaufgabe',discussion='Austausch',computer='Aufgabe am Computer',pair='Partnerarbeit',group='Gruppenarbeit'},
  en={pencil='Written task',pen='Written task',book='Reading task',discussion='Discussion',computer='Computer task',pair='Partner work',group='Group work'},
}
local function task(el)
  if not el.classes:includes('task') then return end
  if el.attributes.height == 'fill' then
    el.classes:insert('presentation-task-fill')
    el.attributes.height = nil
  end
  local icon = el.attributes.icon or 'none'
  if not icons[icon] and icon ~= 'none' then error('task: icon must be pencil, computer, book, group, discussion, pair, pen or none.') end
  local title, time = el.attributes.title or '', el.attributes.time or ''
  if time:match('^%s*%d+%s*$') then time = time:match('%d+') .. ' min' end
  local header = '<div class="presentation-task-header">'
  if icons[icon] then
    header = header .. '<svg class="presentation-task-icon" viewBox="0 0 24 24" role="img" aria-label="'..labels[language][icon]..'">'..icons[icon]..'</svg>'
  end
  if title ~= '' then header = header .. '<span class="presentation-task-title">'..escape(title)..'</span>' end
  if time ~= '' then header = header .. '<span class="presentation-task-time">'..escape(time)..'</span>' end
  header = header .. '</div>'
  local blocks = pandoc.Blocks({})
  if icons[icon] or title ~= '' or time ~= '' then blocks:insert(pandoc.RawBlock('html',header)) end
  blocks:insert(pandoc.Div(el.content,pandoc.Attr('',{'presentation-task-body'})))
  el.content = blocks
  el.classes:insert('presentation-task')
  el.attributes.title=nil; el.attributes.time=nil; el.attributes.icon=nil
  return el
end
return {{Meta=Meta},{Div=task}}

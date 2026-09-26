local media = dofile(pandoc.path.join({pandoc.path.directory(PANDOC_SCRIPT_FILE), '../media/options.lua'}))
function Div(el)
  if not el.classes:includes('embed') then return end
  local src = el.attributes.src
  if not src or src == '' then error('.embed benötigt src.') end
  if src:match('^%a[%w+.-]*:') and not src:match('^https?://') then error('.embed: nur lokale Pfade und HTTP(S) erlaubt.') end
  if src:match('^//') then error('.embed: bitte eine vollständige HTTPS-Adresse verwenden.') end
  local title = el.attributes.title or src:match('([^/]+)$') or 'HTML'
  local attrs=media.read(el)
  attrs['data-embed-title']=title
  return pandoc.Div({pandoc.Plain({pandoc.Link(title,src,'',pandoc.Attr('',{'presentation-embed-link'}))})},pandoc.Attr(el.identifier,{'presentation-embed','presentation-media-box'},attrs))
end

local delay = 1
function Meta(meta)
  local config=(meta.presentation or {}).laser or {}
  if type(config)~='table' then error('presentation.laser must contain fade-delay.') end
  for key,_ in pairs(config) do
    if key~='fade-delay' then error('Unknown presentation.laser option: '..key) end
  end
  if config['fade-delay']~=nil then
    delay=tonumber(pandoc.utils.stringify(config['fade-delay']))
    if not delay or delay~=delay or delay==math.huge or delay<0 then error('presentation.laser.fade-delay must be a non-negative number of seconds.') end
  end
end
function Pandoc(doc)
  doc.blocks:insert(pandoc.RawBlock('html','<template id="presentation-laser-settings" data-fade-delay="'..tostring(delay)..'"></template>'))
  return doc
end

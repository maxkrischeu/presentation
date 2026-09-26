-- Shared author-facing dimensions for media blocks.
local M = {}
function M.escape(s) return s:gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;'):gsub('"','&quot;') end
function M.read(el)
  local a=el.attributes
  if not a.src or a.src=='' then error('Media blocks require src.') end
  if a.src:match('^//') or (a.src:match('^%a[%w+.-]*:') and not a.src:match('^https?://')) then error('Media src requires a local path or HTTP(S) URL.') end
  if #el.content>0 then error('Media blocks must be empty; use attributes.') end
  local align=a.align or 'center'
  if align~='left' and align~='center' and align~='right' then error('Media align must be left, center or right.') end
  local result={['data-media-align']=align}
  if a.fragments then result.fragments=a.fragments end
  for _,key in ipairs({'width','height'}) do
    local v=a[key]
    if v then
      if key=='height' and v=='fill' then result['data-media-height']='fill'
      else
        local n,u=v:match('^(%d+%.?%d*)([%a%%]+)$')
        if not n or tonumber(n)<=0 or (u~='px' and u~='%') then error('Media '..key..' requires a positive px or % value (height also accepts fill).') end
        result['data-media-'..key]=v
      end
    end
  end
  return result
end
return M

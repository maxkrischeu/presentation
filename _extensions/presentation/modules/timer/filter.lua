local function timer(el)
  if not el.classes:includes('timer') then return end
  if #el.content > 0 then error('timer: Den Div-Block innen leer lassen.') end
  local minutes = tonumber(el.attributes.minutes or '10')
  if not minutes or minutes <= 0 or minutes > 180 or minutes ~= minutes then
    error('timer: minutes muss größer als 0 und höchstens 180 sein.')
  end
  local direction = el.attributes.direction or 'up'
  if direction ~= 'up' and direction ~= 'down' then error('timer: direction muss up oder down sein.') end
  local autostart = el.attributes.autostart or 'false'
  if autostart ~= 'true' and autostart ~= 'false' then error('timer: autostart muss true oder false sein.') end
  el.classes:insert('presentation-timer')
  el.attributes['data-timer-seconds'] = tostring(math.max(1, math.floor(minutes * 60 + 0.5)))
  el.attributes['data-timer-direction'] = direction
  el.attributes['data-timer-autostart'] = autostart
  el.attributes.minutes = nil; el.attributes.direction = nil; el.attributes.autostart = nil
  el.content = pandoc.Blocks({pandoc.RawBlock('html', [[
<div class="presentation-timer-status" role="status"></div>
<div class="presentation-timer-display" role="timer" aria-live="off"><span class="presentation-timer-value">0:00</span></div>
<div class="presentation-timer-target"></div>
<progress class="presentation-timer-progress" value="0" max="1"></progress>
<div class="presentation-timer-controls" data-presentation-navigation="local" data-presentation-keyboard="local">
<button type="button" class="presentation-timer-toggle"></button>
<button type="button" class="presentation-timer-reset"></button>
</div>]])})
  return el
end
return {{Div=timer}}

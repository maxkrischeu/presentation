/* Short two/three-finger taps. Normal one-finger drawing remains immediate. */
Presentation.factories.drawingGestures = function ({active, begin, cancel, undo}) {
  let gesture = null;
  const withinSurface = target => target.closest?.('#notescanvas canvas, #chalkboard canvas');
  const stop = event => {event.preventDefault();event.stopImmediatePropagation();};
  const inspect = event => {
    for (const touch of event.touches) {
      if (!gesture.origins.has(touch.identifier)) gesture.origins.set(touch.identifier,{x:touch.clientX,y:touch.clientY});
      const start=gesture.origins.get(touch.identifier);
      if(Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>12)gesture.moved=true;
    }
  };
  document.addEventListener('touchstart',event=>{
    if(!gesture){
      if(!active() || !withinSurface(event.target))return;
      gesture={start:performance.now(),snapshot:begin(),origins:new Map(),count:0,moved:false,multi:false};
    }
    inspect(event);
    gesture.count=Math.max(gesture.count,event.touches.length);
    if(!gesture.multi && event.touches.length>=2 && !gesture.moved && performance.now()-gesture.start<=180){
      gesture.multi=true;cancel(gesture.snapshot);
    }
    if(gesture.multi)stop(event);
  },{capture:true,passive:false});
  document.addEventListener('touchmove',event=>{
    if(!gesture)return;
    inspect(event);
    if(gesture.multi)stop(event);
  },{capture:true,passive:false});
  document.addEventListener('touchend',event=>{
    if(!gesture)return;
    if(gesture.multi)stop(event);
    if(event.touches.length)return;
    const completed=gesture;gesture=null;
    if(completed.multi && !completed.moved && performance.now()-completed.start<400 && active()){
      if(completed.count===2)undo(false);
      if(completed.count===3)undo(true);
    }
  },{capture:true,passive:false});
  document.addEventListener('touchcancel',event=>{
    if(gesture?.multi)stop(event);
    gesture=null;
  },{capture:true,passive:false});
  // Prevent the lasso and compatibility mouse stream from acting on a multi-tap.
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','mousedown','mouseup','click'])
    document.addEventListener(type,event=>{if(gesture?.multi)stop(event);}, {capture:true,passive:false});
  window.addEventListener('blur',()=>{gesture=null;});
  return {reset(){gesture=null;}};
};

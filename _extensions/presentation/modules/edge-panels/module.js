/* Panels own their DOM and side; this module only handles the shared gesture. */
Presentation.register({
  id: "edge-panels",
  requires: ["frame"],
  interactiveOnly: true,
  setup({deck, invoke, changed}) {
    let gesture=null, suppressClickUntil=0;
    const allowed=()=>Presentation.modes?.current()==="standard" && !document.querySelector("dialog[open]");
    function finish(cancel=false) {
      const g=gesture;gesture=null;
      if(!g?.dragging) return;
      const commit=!cancel && g.distance>=Math.min(90,g.width*0.28);
      if(g.opening ? !commit : commit) g.panel.close();
      g.element.style.transition=g.transition;
      g.element.style.transform=g.transform;
      suppressClickUntil=Date.now()+350;
      changed();
    }
    function candidate(touch,target) {
      if(!allowed() || target.closest?.('input,textarea,select,video,audio,[contenteditable="true"]')) return null;
      for(const panel of Presentation.panels.values()) {
        const edge=panel.edge,element=edge?.element();if(!element)continue;
        const viewport=edge.viewport(),bounds=element.getBoundingClientRect(),open=panel.isOpen();
        if(!open && target.closest?.('button,a'))continue;
        if(touch.clientY<viewport.top || touch.clientY>viewport.bottom)continue;
        const side=edge.side,boundary=open?(side==='left'?bounds.right:bounds.left):
          (side==='left'?viewport.left:viewport.right);
        if(Math.abs(touch.clientX-boundary)>28)continue;
        return {panel,edge,element,opening:!open,x:touch.clientX,y:touch.clientY,
          id:touch.identifier,distance:0,dragging:false,
          direction:(side==='left'?1:-1)*(open?-1:1)};
      }
      return null;
    }
    // Pointer events precede touchstart. Reserve the edge before a backdrop's
    // pointerdown handler dismisses the panel beneath this gesture.
    window.addEventListener("pointerdown",event=>{
      if(event.pointerType==='touch' && candidate(event,event.target)) event.stopImmediatePropagation();
    },true);
    window.addEventListener("touchstart",event=>{
      if(gesture)finish(true);
      if(event.touches.length!==1)return;
      gesture=candidate(event.touches[0],event.target);
      if(gesture)event.stopImmediatePropagation();
    },{capture:true,passive:false});
    window.addEventListener("touchmove",event=>{
      const g=gesture;if(!g) return;
      if(event.touches.length!==1 || !allowed()) {finish(true);return;}
      const touch=Array.from(event.touches).find(t=>t.identifier===g.id);if(!touch)return;
      const dx=touch.clientX-g.x,dy=touch.clientY-g.y,inward=dx*g.direction;
      if(!g.dragging) {
        if(Math.abs(dy)>10 && Math.abs(dy)>Math.abs(dx)) {gesture=null;return;}
        if(inward < -10) {gesture=null;return;}
        event.stopImmediatePropagation();
        if(inward<8 || Math.abs(dx)<Math.abs(dy)*1.3)return;
        if(g.opening) invoke(g.edge.command);
        if(!g.panel.isOpen()) {gesture=null;return;}
        g.dragging=true;g.width=g.element.getBoundingClientRect().width;
        g.transition=g.element.style.transition;g.transform=g.element.style.transform;
        g.element.style.transition='none';
      }
      event.preventDefault();event.stopImmediatePropagation();
      g.distance=Math.max(0,Math.min(g.width,inward));
      const hidden=g.opening?g.width-g.distance:g.distance;
      g.element.style.transform=`translateX(${(g.edge.side==='left'?-1:1)*hidden}px)`;
    },{capture:true,passive:false});
    window.addEventListener("touchend",event=>{
      if(!gesture)return;
      if(gesture.dragging)event.preventDefault();
      event.stopImmediatePropagation();
      if(!gesture.dragging && !gesture.opening) {
        const bounds=gesture.element.getBoundingClientRect();
        if(gesture.x<bounds.left || gesture.x>bounds.right) {
          event.preventDefault();suppressClickUntil=Date.now()+350;
          gesture.panel.close();changed();
        }
      }
      finish();
    },{capture:true,passive:false});
    window.addEventListener("touchcancel",()=>finish(true),{capture:true});
    window.addEventListener("blur",()=>finish(true));
    window.addEventListener("resize",()=>finish(true));
    window.addEventListener("click",event=>{
      if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    deck.on("slidechanged",()=>finish(true));
    Presentation.subscribe(()=>{if(gesture && !allowed())finish(true);});
    return {};
  },
});

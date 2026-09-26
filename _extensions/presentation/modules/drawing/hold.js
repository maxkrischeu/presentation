/* A held stroke is a reversible preview until the pointer is lifted. */
Presentation.createDrawingHold = function ({onShape, onResume}) {
  let timer, points=[], anchor, scale=1, active=false, snapped=false;
  const clear=()=>clearTimeout(timer);
  function schedule() {
    clear();
    timer=setTimeout(()=>{
      if(!active || snapped) return;
      const shape=Presentation.drawingShapes.recognize(points,scale);
      if(shape) snapped=onShape(shape)!==false;
    },650);
  }
  return {
    start(x,y,newScale) {
      clear();active=true;snapped=false;scale=newScale;
      points=[{x,y}];anchor={x,y};
    },
    move(x,y) {
      if(!active) return true;
      const point={x,y}, moved=Math.hypot(x-anchor.x,y-anchor.y)*scale>9;
      if(snapped && !moved) return false;
      if(snapped) {onResume();snapped=false;}
      if(Math.hypot(x-points.at(-1).x,y-points.at(-1).y)*scale>=0.75) points.push(point);
      if(points.length>2048) points=points.filter((_,i)=>i%2===0 || i===points.length-1);
      if(moved) {anchor=point;schedule();}
      return true;
    },
    stop() {clear();active=false;const result=snapped;snapped=false;return result;},
  };
};

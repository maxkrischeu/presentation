/* Geometry shared by selection, its visible outline and pointer hit testing. */
(function (root) {
  const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const onSegment = (p, a, b) => Math.abs(cross(a,b,p)) < 1e-7 &&
    p.x >= Math.min(a.x,b.x)-1e-7 && p.x <= Math.max(a.x,b.x)+1e-7 &&
    p.y >= Math.min(a.y,b.y)-1e-7 && p.y <= Math.max(a.y,b.y)+1e-7;
  function inside(p, polygon) {
    let hit = false;
    for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const a=polygon[i],b=polygon[j];
      if(onSegment(p,a,b)) return true;
      if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
    }
    return hit;
  }
  function intersects(a,b,c,d) {
    return (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) ||
      onSegment(a,c,d)||onSegment(b,c,d)||onSegment(c,a,b)||onSegment(d,a,b);
  }
  function touches(e, polygon) {
    const a={x:e.x1,y:e.y1},b={x:e.x2,y:e.y2};
    return inside(a,polygon)||inside(b,polygon)||polygon.some((c,i)=>intersects(a,b,c,polygon[(i+1)%polygon.length]));
  }
  function hull(points) {
    const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y);
    if(sorted.length<2)return sorted;
    const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p);}return out;};
    return half(sorted).slice(0,-1).concat(half(sorted.reverse()).slice(0,-1));
  }
  function outline(points, padding=8) {
    return hull(hull(points).flatMap(p=>Array.from({length:12},(_,i)=>({
      x:p.x+padding*Math.cos(i*Math.PI/6),y:p.y+padding*Math.sin(i*Math.PI/6)
    }))));
  }
  const api={inside,touches,outline};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.Presentation.lassoGeometry=api;
})(globalThis);

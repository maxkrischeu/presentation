/* Geometry only: inputs and output paths use the existing drawing coordinates. */
(function (root) {
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function segmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy) / (dx*dx+dy*dy || 1)));
    return Math.hypot(p.x-a.x-t*dx, p.y-a.y-t*dy);
  }
  function simplify(points, tolerance) {
    let farthest = 0, index = 0;
    for (let i=1; i<points.length-1; i++) {
      const d = segmentDistance(points[i], points[0], points.at(-1));
      if (d>farthest) { farthest=d; index=i; }
    }
    if (farthest<=tolerance) return [points[0], points.at(-1)];
    return [...simplify(points.slice(0,index+1),tolerance).slice(0,-1),
      ...simplify(points.slice(index),tolerance)];
  }
  function resample(points, count) {
    const lengths=[0];
    for (let i=1;i<points.length;i++) lengths.push(lengths.at(-1)+distance(points[i-1],points[i]));
    const total=lengths.at(-1), result=[];
    let j=1;
    for (let i=0;i<count;i++) {
      const target=total*i/(count-1);
      while (j<points.length-1 && lengths[j]<target) j++;
      const t=(target-lengths[j-1])/(lengths[j]-lengths[j-1] || 1);
      result.push({x:points[j-1].x+t*(points[j].x-points[j-1].x),
        y:points[j-1].y+t*(points[j].y-points[j-1].y)});
    }
    return {points:result,length:total};
  }
  function recognize(input, scale=1) {
    if (input.length<3) return null;
    const {points,length}=resample(input,96);
    const first=points[0], last=points.at(-1), chord=distance(first,last);
    if (chord*scale>=30 && chord/length>0.86 &&
        points.every(p=>segmentDistance(p,first,last)<Math.max(5/scale,chord*0.12)))
      return {kind:'line',points:[first,last]};
    const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
    const width=Math.max(...xs)-Math.min(...xs), height=Math.max(...ys)-Math.min(...ys);
    const diagonal=Math.hypot(width,height);
    // Small handwriting, open contours and retraced scribbles remain freehand.
    if (Math.min(width,height)*scale<26 || chord>diagonal*0.32 || length>diagonal*3.9) return null;
    const loop=[...points.slice(0,-1),first];
    const center={x:(Math.min(...xs)+Math.max(...xs))/2,
      y:(Math.min(...ys)+Math.max(...ys))/2};
    const radii=loop.slice(0,-1).map(p=>distance(p,center));
    const radius=radii.reduce((a,b)=>a+b,0)/radii.length;
    const radialError=Math.sqrt(radii.reduce((s,r)=>s+(r-radius)**2,0)/radii.length)/radius;
    let circle=null;
    if (Math.max(width,height)/Math.min(width,height)<1.5 && radialError<0.14 &&
        Math.abs(length/(2*Math.PI*radius)-1)<0.25) {
      const count=Math.max(40,Math.ceil(Math.PI*Math.sqrt(radius*scale/0.5)));
      const angle=Math.atan2(first.y-center.y,first.x-center.x);
      const path=Array.from({length:count},(_,i)=>({x:center.x+radius*Math.cos(angle+i*2*Math.PI/count),
        y:center.y+radius*Math.sin(angle+i*2*Math.PI/count)}));
      circle={kind:'circle',points:[...path,path[0]]};
    }
    // Split the closed path before simplifying, so the starting point needn't
    // be a corner. Remove that artificial corner again when it is collinear.
    let split=1;
    for (let i=2;i<loop.length-1;i++) if(distance(first,loop[i])>distance(first,loop[split])) split=i;
    let vertices=[...simplify(loop.slice(0,split+1),diagonal*0.065).slice(0,-1),
      ...simplify(loop.slice(split),diagonal*0.065).slice(0,-1)];
    let changed=true;
    while(changed && vertices.length>3) {
      changed=false;
      for(let i=0;i<vertices.length;i++) {
        if(segmentDistance(vertices[i],vertices[(i+vertices.length-1)%vertices.length],
          vertices[(i+1)%vertices.length])<diagonal*0.065) {
          vertices.splice(i,1);changed=true;break;
        }
      }
    }
    if (![3,4].includes(vertices.length)) return circle;
    let sign=0, area=0, perimeter=0;
    for(let i=0;i<vertices.length;i++) {
      const a=vertices[i],b=vertices[(i+1)%vertices.length],c=vertices[(i+2)%vertices.length];
      const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
      if(Math.abs(cross)<diagonal*diagonal*0.025 || (sign && Math.sign(cross)!==sign)) return null;
      sign=Math.sign(cross);area+=a.x*b.y-b.x*a.y;perimeter+=distance(a,b);
    }
    if(Math.abs(area)/2<width*height*0.3 || length/perimeter>1.3) return null;
    const error=points.map(p=>Math.min(...vertices.map((a,i)=>segmentDistance(p,a,vertices[(i+1)%vertices.length]))));
    if(Math.max(...error)>diagonal*0.12 || Math.sqrt(error.reduce((s,e)=>s+e*e,0)/error.length)>diagonal*0.055) return circle;
    if(vertices.length===4) {
      // Rectangular gestures become true rectangles, including rotated ones.
      const angles=vertices.map((b,i)=>{
        const a=vertices[(i+3)%4],c=vertices[(i+1)%4];
        return Math.abs(((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y))/(distance(a,b)*distance(c,b)));
      });
      if(angles.every(c=>c<0.4)) {
        const a=vertices[0],b=vertices[1],d=distance(a,b), ux=(b.x-a.x)/d,uy=(b.y-a.y)/d;
        const along=vertices.map(p=>p.x*ux+p.y*uy), across=vertices.map(p=>-p.x*uy+p.y*ux);
        const lo=Math.min(...along),hi=Math.max(...along),bottom=Math.min(...across),top=Math.max(...across);
        vertices=[[lo,bottom],[hi,bottom],[hi,top],[lo,top]].map(([x,y])=>({x:x*ux-y*uy,y:x*uy+y*ux}));
      }
    }
    return {kind:vertices.length===3?'triangle':'quadrilateral',points:[...vertices,vertices[0]]};
  }
  const api={recognize};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.Presentation.drawingShapes=api;
})(globalThis);

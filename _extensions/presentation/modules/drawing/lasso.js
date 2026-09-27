/* Pointer interaction is separate from the engine's recorded stroke storage. */
Presentation.factories.drawingLasso = function (plugin, changed) {
  let active = false, selection = null, gesture = null;
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.classList.add("presentation-drawing-lasso");
  overlay.setAttribute("aria-hidden", "true");
  document.body.append(overlay);
  overlay.innerHTML = '<path/><path class="presentation-lasso-selection"/>';
  const path = overlay.querySelector("path"), box = overlay.querySelector(".presentation-lasso-selection");
  const surfaces = [...document.querySelectorAll("#notescanvas canvas, #chalkboard canvas")];
  let contour = [], lastPointer = null;
  const hit = (x, y) => contour.length > 2 && Presentation.lassoGeometry.inside({x,y}, contour);
  function cursor() {
    const grabbing = !!gesture?.moving;
    const grab = active && !gesture && lastPointer && hit(lastPointer.x,lastPointer.y);
    surfaces.forEach(canvas => {
      canvas.classList.toggle("presentation-lasso-grab", !!grab);
      canvas.classList.toggle("presentation-lasso-grabbing", grabbing);
    });
  }
  function paint() {
    contour = selection ? plugin.lassoOutline(selection) : [];
    box.style.display = contour.length ? "" : "none";
    box.setAttribute("d", contour.map((p,i)=>`${i ? "L" : "M"}${p.x},${p.y}`).join(" ") + (contour.length ? " Z" : ""));
    cursor();
  }
  function cancel() {
    if (gesture?.moving) plugin.lassoRestore(gesture.before);
    gesture = null;
    selection = null;
    path.setAttribute("d", "");
    paint();
  }
  function set(value) {
    cancel();
    active = value;
    overlay.style.display = value ? "block" : "none";
    surfaces.forEach(canvas => canvas.classList.toggle("presentation-lasso-active", value));
    changed();
  }
  for (const canvas of surfaces) {
    // Suppress the engine's compatibility mouse/touch stream only for this tool.
    for (const name of ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend", "dblclick"])
      canvas.addEventListener(name, event => {
        if (!active) return;
        event.preventDefault(); event.stopImmediatePropagation();
      }, { capture: true, passive: false });
    canvas.addEventListener("pointerdown", event => {
      if (!active || !event.isPrimary || event.button !== 0 || gesture) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const point = plugin.lassoPoint(event.clientX, event.clientY);
      lastPointer = {x:event.clientX,y:event.clientY};
      const moving = selection && hit(event.clientX,event.clientY);
      if (!moving) selection = null;
      gesture = { pointer: event.pointerId, start: point, points: [point], moving, before: plugin.lassoSnapshot(), dx: 0, dy: 0 };
      canvas.setPointerCapture(event.pointerId);
      paint();
    }, true);
    canvas.addEventListener("pointermove", event => {
      if (!active) return;
      lastPointer = {x:event.clientX,y:event.clientY};
      cursor();
      if (!gesture || gesture.pointer !== event.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const point = plugin.lassoPoint(event.clientX, event.clientY);
      if (gesture.moving) {
        gesture.dx = point.x - gesture.start.x; gesture.dy = point.y - gesture.start.y;
        selection = plugin.lassoMove(gesture.before, selection.ids, gesture.dx, gesture.dy);
        paint();
      } else {
        gesture.points.push(point);
        path.setAttribute("d", gesture.points.map((p, i) => {
          const q = plugin.lassoScreen(p); return `${i ? "L" : "M"}${q.x},${q.y}`;
        }).join(" ") + " Z");
      }
    }, true);
    canvas.addEventListener("pointerup", event => {
      if (!active || !gesture || gesture.pointer !== event.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (gesture.moving) plugin.lassoCommit(gesture.before, gesture.dx || gesture.dy);
      else selection = plugin.lassoSelect(gesture.points);
      gesture = null;
      path.setAttribute("d", "");
      paint(); changed();
    }, true);
    canvas.addEventListener("pointerleave", () => { lastPointer = null; cursor(); });
    for (const name of ["pointercancel", "lostpointercapture"]) canvas.addEventListener(name, () => { if (gesture) cancel(); });
  }
  window.addEventListener("blur", cancel);
  window.addEventListener("resize", cancel);
  return { set, active: () => active, clear: cancel, undo(redo) { cancel(); plugin.lassoUndo(redo); changed(); } };
};

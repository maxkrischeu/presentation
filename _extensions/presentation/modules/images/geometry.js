/* Shared image geometry, in fractions of the reserved content rectangle.
   Rotation is clockwise about the unrotated rectangle's center. */
Presentation.imageGeometry = {
  angle(degrees) {
    return ((((degrees + 180) % 360) + 360) % 360) - 180;
  },
  snap(degrees, fineGrid = false) {
    if (fineGrid) return Math.round(degrees / 15) * 15;
    const nearest = Math.round(degrees / 45) * 45;
    return Math.abs(degrees - nearest) <= 4 ? nearest : degrees;
  },
  extents(item, ratio) {
    const a = (item.rotation * Math.PI) / 180,
      c = Math.abs(Math.cos(a)),
      s = Math.abs(Math.sin(a));
    return {
      w: item.w * c + (item.h / ratio) * s,
      h: item.w * ratio * s + item.h * c,
    };
  },
  align(item, others, ratio, tolerance, center = {x: .5, y: .5}) {
    const bounds = (value) => {
      const size = this.extents(value, ratio);
      const x = value.x + value.w / 2, y = value.y + value.h / 2;
      return {x: [x - size.w / 2, x, x + size.w / 2],
              y: [y - size.h / 2, y, y + size.h / 2]};
    };
    const anchors = bounds(item), guides = {};
    const targets = {x: [0, center.x, 1], y: [0, center.y, 1]};
    for (const other of others) {
      const box = bounds(other);
      targets.x.push(...box.x); targets.y.push(...box.y);
    }
    const result = {...item};
    for (const axis of ['x', 'y']) {
      let best = tolerance[axis], delta = 0;
      for (const target of targets[axis]) for (const anchor of anchors[axis]) {
        const distance = target - anchor;
        if (Math.abs(distance) < best) {
          // Never snap a rotated bounding box outside the content area.
          if (anchors[axis][0] + distance < -1e-9 || anchors[axis][2] + distance > 1 + 1e-9) continue;
          best = Math.abs(distance); delta = distance; guides[axis] = target;
        }
      }
      result[axis] += delta;
    }
    return {item: result, guides};
  },
  fit(item, ratio) {
    let cx = item.x + item.w / 2,
      cy = item.y + item.h / 2;
    const ext = this.extents(item, ratio),
      factor = Math.min(1, 1 / item.w, 1 / item.h, 1 / ext.w, 1 / ext.h);
    item.w *= factor;
    item.h *= factor;
    const box = this.extents(item, ratio);
    cx = Math.max(box.w / 2, Math.min(1 - box.w / 2, cx));
    cy = Math.max(box.h / 2, Math.min(1 - box.h / 2, cy));
    item.x = cx - item.w / 2;
    item.y = cy - item.h / 2;
    return item;
  },
  rotate(old, rotation, ratio) {
    const cx = old.x + old.w / 2,
      cy = old.y + old.h / 2;
    const item = { ...old, rotation },
      box = this.extents(item, ratio);
    // Keep the pivot fixed. Near an edge, shrink only as much as needed instead
    // of translating the image away from the pointer's rotation center.
    const factor = Math.min(
      1,
      (2 * Math.min(cx, 1 - cx)) / box.w,
      (2 * Math.min(cy, 1 - cy)) / box.h,
    );
    item.w *= factor;
    item.h *= factor;
    item.x = cx - item.w / 2;
    item.y = cy - item.h / 2;
    return item;
  },
  resize(old, dx, dy, ratio) {
    const a = (old.rotation * Math.PI) / 180;
    // Pointer motion projected onto the rotated local diagonal; keep center fixed.
    const lx = dx * Math.cos(a) + (dy / ratio) * Math.sin(a);
    const ly = -dx * ratio * Math.sin(a) + dy * Math.cos(a);
    const factor = Math.max(
      0.05,
      1 + (2 * (lx * old.w + ly * old.h)) / (old.w ** 2 + old.h ** 2),
    );
    const item = { ...old, w: old.w * factor, h: old.h * factor };
    item.x = old.x + (old.w - item.w) / 2;
    item.y = old.y + (old.h - item.h) / 2;
    return this.fit(item, ratio);
  },
};

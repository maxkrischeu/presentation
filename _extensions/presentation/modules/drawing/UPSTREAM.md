Source: Quarto 1.10.18 bundled RevealChalkboard 2.3.3, Asvin Goel, MIT (original license header retained).

engine.js preserves the native plugin API and resource URLs. Changes: isolated scope, exact stroke IDs per drawing gesture, selectable pixel/stroke eraser, deletion from the native event storage and immediate redraw of the active board. Legacy imports without stroke IDs use contiguous-segment grouping.

Lasso editing uses the same stroke IDs, preserves pixel erasures as translated per-segment clipping masks, and participates in per-surface transactional undo/redo. Playback and export share the mask-aware stroke renderer. Pointer selection UI is isolated in lasso.js.

Drawing, erasing, clearing and lasso movement share bounded per-slide/per-board histories. Dock buttons and keyboard shortcuts invoke undo/redo.

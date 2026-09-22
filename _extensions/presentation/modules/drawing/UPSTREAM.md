Source: Quarto 1.10.18 bundled RevealChalkboard 2.3.3, Asvin Goel, MIT (original license header retained).

engine.js preserves the native plugin API and resource URLs. Changes: isolated scope, exact stroke IDs per drawing gesture, selectable pixel/stroke eraser, deletion from the native event storage and immediate redraw of the active board. Legacy imports without stroke IDs use contiguous-segment grouping.

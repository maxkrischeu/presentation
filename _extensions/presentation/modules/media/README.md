# Shared media layout

`options.lua` validates common `src`, `width`, `height` and `align` attributes for
images, documents and HTML. Their own filters continue to own rendering and source
editing. Dimensions use px or %, with `height="fill"` for the remaining slide area.
`layout.js` exposes `apply(box, dataset)` and `layout()`; documents and embed declare
this runtime dependency explicitly. Existing native Quarto media remain supported.

`position="free"` belongs to the images module: positions and dimensions are
percentages of its placement area, and source.py writes image/video divs. Inline
media are not converted into editable placements by saving unrelated images.

# Shared media layout

`options.lua` validates common `src`, `width`, `height` and `align` attributes for
images, documents and HTML. Their own filters continue to own rendering and source
editing. Dimensions use px or %, with `height="fill"` for the remaining slide area.
`layout.js` exposes `apply(box, dataset)` and `layout()`; documents and embed declare
this runtime dependency explicitly. Existing native Quarto media remain supported.

For inline native videos, `height="fill"` fits the player itself to the remaining
height and available width using the video's intrinsic aspect ratio. Native
controls therefore stay inside the visible picture. Metadata loading and slide
resizing recalculate the fit; an explicit width acts as an upper bound.

`position="free"` belongs to the images module: positions and dimensions are
percentages of its placement area, and source.py writes image/video divs. Inline
media are not converted into editable placements by saving unrelated images.

Native videos on the current slide receive an automatically decoded poster frame.
Explicit posters are preserved. Preview decoding does not play or seek the player.
Remote videos require CORS permission for frame extraction; local videos need no extra tools.

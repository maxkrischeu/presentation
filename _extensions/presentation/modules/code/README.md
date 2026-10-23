# Code viewports

Ordinary Quarto `pre > code` blocks fit into the framed slide's remaining
content area. The frame dependency provides slide padding; no private header,
footer or feature DOM is accessed. Authored smaller maximum heights remain
effective. Following normal-flow content is reserved as well.

The versioned module snapshot stores each slide/block's viewport metrics and
both scroll offsets. Current-state PDF/ZIP exports restore that viewport through
the common session contract. Prepared exports measure the initial viewport once
Reveal has arranged the print pages. `preparePrint` finishes this measurement
before the PDF worker prints. Print CSS pins typography, padding and viewport
dimensions and clips overflow; source content is never expanded into extra pages.

Native browser printing retains the code viewport while leaving Reveal's
existing handout layout in place. The presentation PDF export remains the
matching slide-layout output. Integration coverage: `tests/code-print-check.cjs`.

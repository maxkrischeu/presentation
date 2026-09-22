Source: https://github.com/r-wasm/quarto-drop
Revision: d3b3cb320bdd894639409889bf18792f90e3a6d6

Local adaptations: Presentation adapter initializes lazily, owns keyboard and constrains viewport. Bundled micropip package installation callback corrected.

Panel CSS selectors scoped to .drop to avoid affecting Reveal menu panels.

Removed startup plt.show(): no empty Figure 1 before the first user plot.

Presentation output adapter initializes /output and refreshes file previews after console execution (editor and terminal). Rendering is isolated in output.js.

Editor and terminal default to an equal 50/50 split.

- Terminal startup clears and homes the cursor to row 1 (`ESC[H`), rather than
  row 2; removes the temporary `q`. Editor/terminal first-line spacing is aligned
  by the integration stylesheet.

# Python-Konsole

`drop-runtime.js` ist das übernommene kompilierte Quarto-Drop-Bundle. `adapter.js` kapselt Start, Layout und Werkzeugleiste. `output.js` behandelt Dateien und Rich Output im Browser.

`module.js` registriert den Python-Modus. Die WebAssembly-Laufzeit startet erst beim ersten Öffnen. Kernelzustände werden nicht in Sitzungs-Exporte aufgenommen.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

## Python-Folie

```markdown
## Python ausprobieren {.python}
```

Beim Betreten dieser Folie öffnet sich die vorhandene Python-Arbeitsumgebung
automatisch und fokussiert den Code-Editor. Der erste Start lädt wie bisher
Pyodide samt Paketen aus dem Internet; danach bleibt die Laufzeit bereit.
Beim Verlassen schließt sich die automatisch geöffnete Umgebung. Auch direkte
Links auf eine Python-Folie funktionieren. Die Übersicht bleibt zugänglich.

Auf Python-Folien bietet die Werkzeugleiste zusätzlich Vor-/Zurück-Pfeile zum
Folienwechsel. „Beenden“ schließt die Umgebung auch auf dieser Folie; erst beim
erneuten Betreten öffnet sie sich wieder. `T` funktioniert weiterhin manuell.
Es gibt eine gemeinsame Umgebung: Code, Variablen und Ausgaben bleiben beim
Folienwechsel erhalten; eine weitere Python-Folie setzt den Editor nicht zurück.

Zusätzlicher Folientext ist bei geschlossener Umgebung und im statischen Export
sichtbar. Die Python-Oberfläche überdeckt die Folie beim Arbeiten. Normale
Codeblöcke sind keine automatisch geladenen oder ausgeführten Startprogramme.
Automatische Einblendungen entfallen auf `.python`-Folien, damit im Hintergrund
keine unsichtbaren Zwischenschritte die Navigation aufhalten.

## Technische Verträge

`open()` öffnet idempotent; `toggleDrop()` bleibt für den manuellen Aufruf.
`focusEditor()` wartet bei Bedarf auf CodeMirror und verwirft ausstehenden Fokus
beim Schließen. `setSlideMode()` steuert die zusätzlichen Navigationsknöpfe.
Das Python-Modul aktiviert seinen Modus über `Presentation.modes.activate`,
sodass vorherige Modi sauber enden. Im Druck wird das interaktive Modul ausgelassen.

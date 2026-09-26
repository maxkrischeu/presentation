# Zeichnungen und Tafel

`engine.js` ist der angepasste Chalkboard-Renderer mit Strichidentitäten und Objektradierer. `drawing.js` kapselt den Zugriff auf Canvas-Zustand und Folienvorschauen. `toolbar.js` besitzt ausschließlich die Zeichenwerkzeuge.

Das Modul registriert die Modi `draw` und `board`, Farb-/Radierer-Panels, Werkzeugleiste, `snapshot()` und `reset()`. Export-Aufrufe gehen über registrierte Befehle.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

Die sichtbaren Zeichenflächen verwenden die Display-Pixeldichte (begrenzt auf
3-fach bzw. etwa 16 Millionen Pixel pro Fläche). Zeichenkoordinaten bleiben
CSS-Pixel; beim Größenwechsel werden gespeicherte Striche neu gezeichnet.
Auf Touchgeräten sind die direkten Zeichenwerkzeuge 44 px breit und höchstens
44 px hoch; ihre Höhe bleibt auf die bestehende Fußzeile begrenzt.

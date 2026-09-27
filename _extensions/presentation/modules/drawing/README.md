# Zeichnungen und Tafel

`engine.js` ist der angepasste Chalkboard-Renderer mit Strichidentitäten und Objektradierer. `drawing.js` kapselt den Zugriff auf Canvas-Zustand und Folienvorschauen. `toolbar.js` besitzt ausschließlich die Zeichenwerkzeuge.

Das Modul registriert die Modi `draw` und `board`, Farb-/Radierer-Panels, Werkzeugleiste, `snapshot()` und `reset()`. Export-Aufrufe gehen über registrierte Befehle.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

Die sichtbaren Zeichenflächen verwenden die Display-Pixeldichte (begrenzt auf
3-fach bzw. etwa 16 Millionen Pixel pro Fläche). Zeichenkoordinaten bleiben
CSS-Pixel; beim Größenwechsel werden gespeicherte Striche neu gezeichnet.
Auf Touchgeräten sind die direkten Zeichenwerkzeuge 44 px breit und höchstens
44 px hoch; ihre Höhe bleibt auf die bestehende Fußzeile begrenzt.

Neue Striche dämpfen kleine Bewegungsunruhe und verwenden quadratische Mittelpunktkurven.
Sie werden mit höchstens 0,25 CSS-Pixel Näherungsfehler in das bestehende
Segmentformat überführt; Replay, Export und Objektradierer bleiben kompatibel.
Beim Absetzen wird der letzte Endpunkt ergänzt. Bestehende Striche bleiben erhalten.
Folienvorschauen werden nach dem Strich gebündelt aktualisiert, nicht mehrfach
für die zusammengehörigen Pointer-, Touch- und Mausereignisse.

## Zeichnen und halten

Am Ende einer Linie, eines Dreiecks, Vierecks oder Kreises den Stift/Finger bzw.
die gedrückte Maustaste etwa 0,65 Sekunden ruhig halten. Eindeutige Formen werden
begradigt; annähernd rechtwinklige Vierecke werden zu Rechtecken, auch gedreht.
Loslassen übernimmt die Form. Weiterzeichnen stellt den ursprünglichen Strich
wieder her. Kleine Zeichen und unklare Konturen bleiben Freihand.

`shapes.js` enthält die reine Geometrieerkennung, `hold.js` verwaltet Wartezeit,
Bewegungstoleranz und Abbruch. Die Engine ersetzt nur den aktuellen Strich und
behält seine Identität für Objektradierer, Replay und Export. Modus-/Folienwechsel,
Fokusverlust und abgebrochene Touchgesten beenden ausstehende Erkennungen.

Die Haltegeste toleriert bis zu 9 CSS-Pixel Bewegung beim Stillhalten.
Erkennung toleriert leicht gekrümmte Linien, Lücken am Formschluss und
unregelmäßige Seiten; sehr kleine Zeichen, offene Bögen und mehrfach
nachgezogene Kritzeleien bleiben Freihand.

## Lasso-Auswahl

Im Zeichen- und Tafelmodus wählt das Lasso im Dock berührte oder teilweise eingeschlossene Stiftstriche vollständig aus. Innerhalb des gestrichelten Kontur ziehen, um die Gruppe zu verschieben; außerhalb tippen, um sie abzuwählen. Stift oder Radierer beenden das Lasso. Zwei-Finger-Tippen oder Cmd/Strg+Z macht eine Zeichenaktion rückgängig; Drei-Finger-Tippen oder Cmd/Strg+Umschalt+Z wiederholt sie. Die gemeinsame Historie umfasst Stiftstriche, Radiervorgänge, Lasso-Verschiebungen und Leeren. Sie hält bis zu 50 Schritte pro Zeichenfläche/Tafelseite während der geöffneten Sitzung vor. Neue Aktionen verwerfen deren Wiederholschritte. Seitliches Wischen und lange Berührungen gelten nicht als Tippen. Bei Sidecar hängt die Verfügbarkeit davon ab, welche Gesten macOS an den Browser weitergibt.

Die Engine erhält Strich-IDs und speichert mitbewegte Radiermasken an den Segmenten (`cuts`). Wiedergabe und PDF-/Sitzungsexport verwenden denselben maskierten Renderer. Die Pointer-Auswahl liegt separat in `lasso.js`; Auswahlrahmen werden nicht gespeichert oder exportiert.

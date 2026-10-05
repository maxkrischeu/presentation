# Excel-Dateien besprechen

Der lokale, schreibgeschützte Betrachter öffnet `.xlsx` ohne Excel-Installation
oder externen Dienst. Zum Bearbeiten die Originaldatei herunterladen und in
Excel öffnen. Die Extension verändert die Arbeitsmappe nicht.

```markdown
::: {.document src="assets/Arbeitsmappe.xlsx" title="Unsere Arbeitsmappe" sheet="Tabelle1" range="A1:H25" height="fill"}
:::
```

`sheet` und `range` sind optional. Ohne diese Angaben erscheint das erste
sichtbare Blatt mit dem Bereich `A1:Z50` bei 100 % Zoom. Größere Inhalte
können über das Bereichsfeld aufgerufen werden. `width`, `height` und `align`
entsprechen den anderen Medien. Ein Bereich verwendet A1-Schreibweise.

- Tabellenblätter wechseln, Bereich eingeben, scrollen und zoomen.
- Eine Zelle anklicken: Zelladresse und Formel bzw. Wert erscheinen oben.
- „Tabelle vergrößern“ öffnet die Ansicht innerhalb der Präsentation, auch im
  Vollbild. „Tabelle schließen“ führt zur Folie zurück.
- XLSX-Dateien in den Medienordnern erscheinen in der Medienbibliothek. Sie
  lassen sich wie andere Medien platzieren und in die QMD speichern.
  Frei platzierte Tabellen beginnen mit dem ersten Blatt; für ein festes
  Startblatt/einen Startbereich die obige Einbindung verwenden.

## Darstellung und Grenzen

Übernommen werden Zellwerte, gespeicherte Formelergebnisse, Zahlenformate,
Schriften, Farben, Rahmen, verbundene Zellen, Spaltenbreiten, Zeilenhöhen und
gewöhnliche eingebettete PNG-/JPEG-/GIF-Bilder. Versteckte Blätter, Zeilen und
Spalten bleiben verborgen. Formeln werden nicht ausgeführt. Bei deutscher
Präsentationssprache erscheinen häufige Funktionsnamen deutsch (z. B. `SUMME`,
`WENN`, `SVERWEIS`) mit Semikolon und Dezimalkomma. Nicht unterstützte
Funktionsnamen bleiben in der XLSX-Schreibweise; Zeichenketten und Blattnamen
bleiben unverändert. Fehlende gespeicherte Ergebnisse werden als „—“ mit
Hinweis angezeigt; zuerst in Excel berechnen und speichern.

Unterstützt werden einfache Säulen-, Balken-, Linien-, Flächen-, Kreis-, Ring-
und Punktdiagramme sowie rechteckige, abgerundete und elliptische Textfelder.
Diagramme verwenden gespeicherte Zellwerte bzw. Diagrammdaten. Farben, Titel
und Achsen werden soweit unterstützt übernommen; das Layout kann abweichen.
Objekte werden angezeigt, wenn ihr Anker im ausgewählten Bereich liegt.

Kombinations-, 3D- und Sekundärachsendiagramme, prozentuale Stapelungen,
gestapelte Flächen sowie SmartArt, gruppierte Formen, Makros, bedingte
Formatierungen, Filterbedienung und Excel-Sonderlayouts werden nicht
vollständig nachgebildet. Dafür gibt es keinen dauerhaften Hinweis im Betrachter. Auch Schriftmetriken und Zahlen-/Datumsdarstellung können
von der lokalen Excel-Version abweichen. Verknüpfungen in Zellen und Bildern
werden nicht ausgeführt. Die Originaldatei bleibt maßgeblich.

Dateien bis 25 MB; pro Ansicht höchstens 400 Zeilen und 50 Spalten. Größere
Bereiche werden mit Hinweis begrenzt und können über das Bereichsfeld erkundet
werden. Das Einlesen geschieht in einem Worker mit Zeitlimit, damit die
Folienbedienung ansprechbar bleibt.

Für zuverlässiges Laden `quarto preview` oder einen Webserver verwenden. Beim
Öffnen einer HTML direkt über `file://` kann der Browser den Dateizugriff sperren.
PowerPoint exportiert die Arbeitsmappe als Dateilink; die XLSX mitgeben.

## Entwicklung

Die XLSX-Bibliotheken werden als lokale Ressourcen ausgeliefert und erst beim
Öffnen einer Tabelle geladen. Quarto/Deno sind weiterhin die einzigen nötigen
Laufzeiten. `model.js` projiziert ExcelJS-Daten in ein begrenztes Ansichtsmodell;
`sheet-worker.js` hält die Arbeitsmappe getrennt vom UI. Der Betrachter setzt
Zelltexte nur mit `textContent`, ohne fremdes HTML auszuführen.

`node tests/spreadsheet-check.cjs` prüft eine frische Installation in einem
Namensordner, verschachtelte Quellen/Ausgaben, Formeln, Formate, Zusammenführungen,
Bereichsauswahl, Dialog, Medienbibliothek und Quellspeicherung. Mit
`TEST_BROWSER=webkit` läuft derselbe Test in WebKit.

# Bearbeitbare PowerPoint-Ausgabe

Im Presentation-Projekt (`project: type: presentation`) lässt sich dieselbe QMD
zusätzlich als PowerPoint rendern:

```sh
quarto render praesentation.qmd --to presentation-pptx
```

Die `.pptx` entsteht neben der QMD. Ein vorhandenes `project.output-dir` gilt
auch für PowerPoint. Interne Renderdaten bleiben im gemeinsamen
`.quarto/presentation/powerpoint` des Projekts. Eine laufende Vorschau ist nicht
erforderlich. Zum Erzeugen genügt Quarto ab 1.10 mit dieser Extension.

## Inhalt und Gestaltung

| Inhalt | PowerPoint-Ausgabe |
|---|---|
| Überschriften, Absätze, Listen, Code | Bearbeitbare Textfelder |
| Mathematik | Native Office-Formeln |
| Markdown-Tabellen | Bearbeitbare Tabellen |
| `.task` | Gestaltete Tabellen mit Titel, optionalem Icon und Zeit |
| `.quote` | Formatierter Text mit Autor; `.quote-slide` zentriert den Inhalt |
| Bilder und GIFs | Separate Bildobjekte; Originaldateien werden eingebettet |
| `.image position="free"` / `.placed-image` | Gespeicherte Position, Größe, Drehung, Transparenz und Ebenen |
| Quizfragen | Frage und alle Antworten; Lösungen in den Referentennotizen |
| Quiz-Lücken | Lücken und eine Begriffsliste; Lösung in den Notizen |
| `.notes` | Referentennotizen |
| Lokale Videos | Eingebettete Medienobjekte mit einem Play-Vorschaubild |
| Online-Video, PDF, HTML-Element | Anklickbarer Link mit Hinweis beim Rendern |

Die Vorlage übernimmt `author` beziehungsweise `presentation.teacher`,
`logo`, `logo-text`, `header-text`, `slide-number`, `subject`, `class` und
`institution`. Ohne `header-text` steht der Untertitel in der Kopfzeilenmitte.

Die PowerPoint-Gestaltung folgt eigenen Layoutregeln: 16:9, zentrierte Titel,
gemeinsame Kopf-/Fußzeile, proportionale Bilder und native Spalten/Tabellen.
Abstände und Zeilenumbrüche können von der Browserfassung abweichen.
Sehr volle Folien erhalten beim Rendern einen Hinweis zur Prüfung der Textgröße.

## Grenzen der ersten Version

- Exportiert wird der **gespeicherte QMD-Inhalt**. Änderungen aus der
  Medienpositionierung deshalb vorher ins Quarto-Dokument speichern.
- Einblendungen werden vollständig sichtbar; Quizbewertung, Browserwerkzeuge,
  eigene Zeichnungen und Tafelseiten werden nicht übertragen.
- HTML-/CSS-Sonderlayouts und animierte Hervorhebungen werden nicht nachgebaut.
  Freie Medienpositionen verwenden den Inhaltsbereich der PowerPoint-Vorlage.
- Bibliotheksmedien erscheinen erst auf einer Folie, wenn sie dort platziert
  wurden. Die Bibliothek selbst wird nicht exportiert.
- Verlinkte lokale PDFs oder HTML-Dateien müssen zusammen mit der PowerPoint
  weitergegeben werden. Videos/Bilder sind dagegen in der PPTX enthalten.
- Videowiedergabe hängt von PowerPoint und dem Codec ab. MP4 mit H.264/AAC ist
  der bevorzugte Austauschweg; es erfolgt keine automatische Umwandlung.
- Ältere `image-layout`-/`presentation-image-layout`-Blöcke müssen vor dem
  Export in die aktuelle `.image position="free"`-Schreibweise überführt werden.
  Der Export meldet das ausdrücklich, statt die Medien still wegzulassen.

Nach Änderungen in PowerPoint bleibt die QMD unverändert. Erneutes Rendern
ersetzt die erzeugte PPTX; eine bearbeitete Kopie deshalb separat speichern.

## Aufbau für die Entwicklung

`content.lua` übersetzt unsere semantischen Bausteine vor Quartos Filtern.
`layout.lua` lässt Pandoc einzelne Inhalte als native PowerPoint-Komponenten
erzeugen und reserviert ihre Bereiche. Das vermeidet die Begrenzung des
Standardwriters auf wenige Bild-/Tabellenplatzhalter pro Folie.

`config.lua` registriert einen Finalisierungsschritt über den vorhandenen
Projekt-Hook. `compose.lua` importiert die nativen Objekte und ihre Beziehungen;
`package.lua` ergänzt Rahmen, Medien und gespeicherte Platzierungen. Die
Finalisierung prüft die Folienanzahl und schreibt die Ausgabe atomar.

Alle Laufzeitschritte verwenden Quartos mitgeliefertes Lua/Pandoc und den
bestehenden Quarto-Hook. `build_reference.py` erzeugt die mitgelieferte
`reference.pptx` aus Pandocs Standardreferenz und ist ausschließlich ein
Entwicklungswerkzeug. Es wird nicht ausgeliefert. Die XML-Bibliothek SLAXML
liegt mit ihrer MIT-Lizenz unter `vendor`.

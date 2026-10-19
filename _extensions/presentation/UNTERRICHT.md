# Unterricht mit Presentation erstellen

Dieser Leitfaden richtet sich an Menschen und KI-Agents, die Unterrichtsstunden
mit der installierten Quarto-Extension **Presentation** planen und schreiben.
Die Beispiele zeigen die öffentliche QMD-Syntax. Dafür muss die Extension
nicht verändert werden.

## Arbeitsauftrag und Grenzen für Agents

- Lies zuerst die Projektregeln und `_quarto.yml`, dann die betroffene Stunde
  und bei Bedarf die vorherige Stunde. Übernimm Sprache, Dateinamen und
  bestehende Vereinbarungen des Projekts. Deutsche Texte verwenden Umlaute.
- Bearbeite Unterrichtsinhalte in `.qmd` und zugehörige Dateien in `assets/`
  oder `material/`. Erhalte manuelle Änderungen und vorhandene Materialien.
- Dateien unter `_extensions/` sind installierte Software. Ändere dort weder
  Filter, Skripte, Styles, Referenzvorlagen noch generierte Dateien, um eine
  Unterrichtsstunde zu erstellen. Das gilt ebenso für Bibliotheken in
  `<name>_files/`. Auch eigene Skripte oder CSS als Ersatz für vorhandene
  Bausteine sind normalerweise nicht erforderlich.
- Verwende die dokumentierten Bausteine. Erfinde keine Klassen oder Optionen.
  Falls etwas fehlt, beschreibe die Grenze und verwende eine vorhandene
  Alternative. Änderungen an der Extension benötigen einen ausdrücklichen
  Entwicklungsauftrag.
- Ändere gemeinsame Projekteinstellungen nur, wenn die Aufgabe das erfordert.
  Angaben für eine einzelne Stunde gehören in deren QMD-Kopf.
- Erzeuge nur die beauftragten Materialien. Lösungen und Hinweise gehören bei
  Präsentationen in `.notes`, sofern sie nicht sichtbar besprochen werden sollen.

## 1. Projekt und Dateien

Ein Fachprojekt kann mehrere Stunden enthalten. Die Extension liegt einmal im
Projekt, direkt unter `_extensions/presentation/` oder nach GitHub-Installation
unter `_extensions/<anbieter>/presentation/`. Dieser Leitfaden liegt jeweils
in diesem Extension-Ordner.

```text
Fachprojekt/
  _quarto.yml
  _extensions/
  assets/                         # gemeinsame Medien, z. B. Logo
  Unterrichtsstunden/
    14_RGB-Modell/
      praesentation.qmd
      arbeitsblatt.qmd             # optional, braucht Worksheet
      assets/                     # Medien dieser Stunde
      material/                   # fertige Arbeitsmaterialien/Originaldateien
```

Eine Präsentations-QMD entspricht üblicherweise einer Stunde. Dateinamen sind
frei wählbar. Bestehende Nummerierung und Ordnerstruktur fortführen; gemeinsame
Dateien verlinken, statt sie für jede Stunde zu duplizieren.

Quarto erzeugt standardmäßig die HTML neben der QMD und Ressourcen unter
`<name>_files/`. Die DOCX entsteht ebenfalls neben ihrer QMD. Interne Hilfsdateien
liegen unter `.quarto/`. Diese Ausgaben nicht von Hand bearbeiten oder verschieben.
Vorhandene ausdrückliche `output-dir`-Einstellungen des Projekts beachten.

Für ein bestehendes Projekt reicht gewöhnlich dieser Dokumentkopf:

```yaml
---
title: "Wahlpflicht Informatik"
subtitle: "Das RGB-Modell"
format: presentation-revealjs
---
```

`format` ausdrücklich angeben, wenn im Projekt Präsentationen und Arbeitsblätter
nebeneinander stehen. Gemeinsame Angaben wie `author`, Logo, Fach, Klasse,
Schule und Einblendungsvorgaben erbt die QMD aus `_quarto.yml`. Kein Datum
hinzufügen, wenn keines gewünscht ist; `date: today` setzt das aktuelle Datum.
Ohne ausdrücklich gesetztes `presentation.header-text` wird `subtitle` für
die Mitte der Kopfzeile verwendet.
Die Mitte nutzt freien Platz zwischen den Seitenfeldern. Bei Platzmangel wird
nur der Thementext gekürzt; eine aktivierte Foliennummer bleibt vollständig sichtbar.

## 2. Folien und Lehrkraftnotizen

`##` beginnt eine Inhaltsfolie. `#` ist für Kapitel-/Abschnittsfolien vorgesehen.
Verwende diese Überschriften mit Rauten (ATX), keine mit `===` oder `---`
unterstrichenen Überschriften. Attribute stehen an derselben Zeile.

```markdown
## Was ist ein Pixel?

- Ein Pixel ist ein einzelner Bildpunkt einer Rastergrafik.
- Viele Bildpunkte bilden zusammen ein Bild.

::: {.notes}
Musterlösung, Quellenhinweis und Hinweise für das Unterrichtsgespräch.
Diese Notizen erscheinen in der Referentenansicht, nicht auf der Folie.
:::
```

Für handschriftliche Lösungen eine normale Folie mit der Frage und ausreichend
freiem Platz anlegen. `.quiz-question` erzeugt dagegen ein interaktives Quiz
mit vorbereiteten Antworten.

### Einblendungen

Bei `presentation.fragments: auto` erscheinen Inhalte schrittweise. Für Medien,
Arbeitsphasen oder eine sofort vollständig sichtbare Folie:

```markdown
## Arbeitsphase {fragments="off"}

Dieser Inhalt ist sofort sichtbar.

[Dieser Hinweis erscheint erst beim Weiterklicken.]{.fragment}
```

`fragments="together"` an einem Block blendet dessen Inhalt gemeinsam ein.
`fragments="off"` am Block schaltet dessen automatische Einblendungen aus.
Quizfolien steuern ihre Einblendungen selbst; dort keine zusätzlichen
`.fragment`-Klassen auf Antworten oder Inline-Code setzen.

### Zwei Spalten

```markdown
:::: {.columns}
::: {.column width="55%"}
Beobachtet, welche Farben gemeinsam Weiß ergeben.
:::
::: {.column width="45%"}
![Farbmischung](assets/rgb.png){width="90%"}
:::
::::
```

Bei verschachtelten Containern außen mehr Doppelpunkte als innen verwenden
und jeden Block schließen. Pro Folie überschaubare Inhalte und gut lesbare
Medien einplanen; bei Platzmangel auf mehrere Folien verteilen.

## 3. Aufgaben, Merksätze und Zitate

### Aufgabenbox

```markdown
## Aufgabenstellung {fragments="off"}

::: {.task title="Farbmischungen untersuchen" icon="pair" time="5"}
1. Öffnet das Arbeitsmaterial.
2. Untersucht drei Farbmischungen.
3. Notiert eure Beobachtungen.
:::
```

`title`, `icon` und `time` sind optional. Titel links, Icon mittig, Zeit rechts.
Eine Zahl wie `time="5"` wird zu „5 min“; das ist kein laufender Timer.
Zeitangaben nur setzen, wenn sie gewünscht sind.

Icons: `pencil`, `computer`, `book`, `discussion`, `pair`, `group`, `none`.
Die letzte Aufgabenbox kann mit `height="fill"` bis zum unteren Inhaltsrand
reichen und Platz zum Zeichnen oder für ein frei platziertes Bild bieten.
`fragments="together"` zeigt die gesamte Box gemeinsam.

### Merksatz

```markdown
::: {.statement}
Die Anzahl der Bildpunkte ist Breite × Höhe.
:::
```

### Zitat

```markdown
## {.quote-slide fragments="off"}

::: {.quote author="Paul Halmos"}
The only way to learn mathematics is to do mathematics.
:::
```

Anführungszeichen und Autorenzeile werden automatisch gesetzt. `.quote-slide`
ist für eine eigene Zitatfolie gedacht; `.quote` kann auch auf einer normalen
Folie stehen. Zitate und Zuschreibungen anhand einer Quelle prüfen.

## 4. Interaktives Quiz

Ein Quiz besteht aus getrennten Folien für Einstieg, Fragen und Ergebnis.
Die Klasse steht an der `##`-Überschrift, nicht an einem `:::`-Container.
Fragen werden automatisch nummeriert. Richtige Antworten werden mit `.correct`
markiert; beim Lückentext werden die einzusetzenden Begriffe mit `.answer` markiert.

### Startfolie

```markdown
## QuizTime {.quiz-intro subtitle="Wiederholung zu Rastergrafiken"}
```

`subtitle` ist optional; `subtitle="false"` blendet den Untertitel aus.

### Eine richtige Antwort

```markdown
## Wofür steht PBM? {.quiz-question}

- Pixel Binary Model
- [Portable Bitmap]{.correct}
- Portable Byte Map
- Picture Bit Matrix
```

Ohne `type` gilt `single`. Genau eine Antwort als richtig markieren.
Die Frage kann auch als Absatz unter einer kürzeren Folienüberschrift stehen.

### Mehrere richtige Antworten

```markdown
## Welche Aussagen stimmen? {.quiz-question type="multiple" columns="2"}

- [Rastergrafiken bestehen aus Bildpunkten.]{.correct}
- Heranzoomen erzeugt zusätzliche Bildinformationen.
- [Für die Bildpunktanzahl benötigt man Breite und Höhe.]{.correct}
- Jedes Bild ist quadratisch.
```

`columns="2"` ist optional und ordnet Antworten zweispaltig an;
`columns="1"` bleibt einspaltig. Sinnvolle, eindeutig falsche Distraktoren
verwenden. Bei Mehrfachauswahl alle richtigen Antworten markieren.

### Bilder als Antworten

```markdown
## Welches Raster passt zum Code? {.quiz-question answers="images"}

- ![Raster A](assets/raster-a.svg)
- [![Raster B](assets/raster-b.svg)]{.correct}
- ![Raster C](assets/raster-c.svg)
- ![Raster D](assets/raster-d.svg)
```

Jeder Listeneintrag ist eine Bildantwort. Alle Bilddateien müssen existieren;
Raster am besten als scharfe SVGs mit gleichen Zellgrößen erstellen. Alt-Texte
benennen die Varianten, ohne unbeabsichtigt die Lösung zu verraten.
`answers="images"` lässt sich mit `type="multiple"` kombinieren.

### Fragebild oberhalb der Antworten

```markdown
## Wie viele Pixel hat dieses Bild? {.quiz-question layout="image" columns="2"}

::: {.image src="assets/raster.svg" position="free" x="35%" y="22%" width="30%" alt="Raster mit acht Spalten und fünf Zeilen"}
:::

- 13
- 85
- [40]{.correct}
- 26
```

`layout="image"` rückt Antworten nach unten. Das Fragebild muss selbst
eingebunden und passend platziert werden; die Option erzeugt kein Bild.
Die Einblendungen folgen der Reihenfolge der Blöcke in der QMD: Steht Text vor
dem Bild, erscheint er zuerst; steht das Bild zuerst, wird es zuerst eingeblendet.
Weitere Absätze, Bilder und Antworten folgen an ihrer jeweiligen Quellposition.
Das gilt für Auswahlfragen mit und ohne Bildlayout, auch für frei platzierte
`.image`-Blöcke. Zusätzliche `.fragment`-Klassen sind nicht nötig. Zusammengehörige
Inhalte in einem gemeinsamen Container werden als Block eingeblendet.
Folgezeilen einer Textantwort beginnen unter dem Antworttext.

### Lückentext / Begriffe zuordnen

```markdown
## Ergänze die Grundfarben {.quiz-question type="cloze"}

RGB steht für [Rot]{.answer}, [Grün]{.answer} und [Blau]{.answer}.
```

Die markierten Begriffe werden zu einsetzbaren Antworten. Dafür heißt der Typ
`cloze`, nicht `clozure`. `.answer` gehört hier zum Quiz und ist kein digitales
Word-Eingabefeld.

### Ergebnisfolie

```markdown
## Unser Ergebnis {.quiz-results show="total"}
```

| Option | Anzeige |
| --- | --- |
| `show="total"` | Nur Gesamtpunktzahl |
| `show="questions"` | Nur Fragenübersicht |
| `show="both"` oder ohne `show` | Gesamtpunktzahl und Fragenübersicht |

Neue Inhalte verwenden diese öffentliche Schreibweise, keine internen
`data-quiz-*`-Attribute oder älteren Zusatzklassen.

### Farbkarten zum Hochhalten

Für vorbereitete grüne, gelbe, rote und blaue Antwortkarten im Projekt-YAML
oder im YAML-Kopf einer einzelnen Präsentation aktivieren:

```yaml
quiz:
  cards: true
```

Bei Auswahlfragen mit bis zu vier Antworten steht dann eine kleine Karte ganz
rechts innerhalb jedes Antwortfelds, vertikal mittig. Die Zuordnung folgt der
sichtbaren Reihenfolge: **1 Grün, 2 Gelb, 3 Rot, 4 Blau**. Sie ist unabhängig
von der richtigen Antwort und bleibt beim Prüfen oder Wiederholen erhalten.
Das gilt auch für Bildantworten und Mehrfachauswahl. Lückentexte und Fragen
mit mehr als vier Antwortmöglichkeiten zeigen keine Kartensymbole.

Ohne Angabe oder mit `cards: false` sind die Symbole aus. Eine einzelne QMD
kann damit eine Projektvorgabe überschreiben. An den Fragen selbst ist nichts
zu ändern; es werden keine zusätzlichen Antwortklicks oder Einblendungen erzeugt.

## 5. Bilder, Videos, Dokumente und interaktive Inhalte

Medienpfade in der QMD sind relativ zur QMD, z. B. `assets/bild.svg` oder
`../../assets/bild.svg`. Existierende Dateien zuerst ansehen und verwenden.
Gemeinsame Medien und stundenbezogene `assets/` erscheinen in der Medienbibliothek;
zusätzliche Ordner lassen sich mit `presentation.media.folders` konfigurieren.

Alle folgenden Medienblöcke bleiben **innen leer**: Einstellungen wie `src`,
`title` und Größe stehen in den Attributen.

### Bild und GIF

```markdown
::: {.image src="assets/raster.svg" alt="Schwarz-Weiß-Raster" width="55%" align="center"}
:::
```

Dasselbe geht mit PNG, JPG oder GIF. Alternativ funktioniert normales Markdown:
`![Beschreibung](assets/bild.png){width="400"}`.

### Frei platzierte Medien

```markdown
::: {.image src="assets/raster.svg" position="free" x="55%" y="35%" width="30%" alt="Raster"}
:::
```

Prozentwerte beziehen sich hier auf den Positionierungsbereich der Folie.
Optional sind `rotation`, `layer` und `transparency`. Zum manuellen Platzieren
gibt es den Modus **Medien positionieren**; Hilfslinien unterstützen die Ausrichtung.
Neue Platzierungen aus der Browseroberfläche werden erst durch **Im
Quarto-Dokument speichern** dauerhaft in die QMD geschrieben.

### Video

```markdown
::: {.video src="assets/rgb.mp4" title="Das RGB-Modell" width="70%"}
:::
```

`src` darf auch eine YouTube-/Vimeo-Adresse oder ein direkter HTTP(S)-Videolink
sein. Online-Inhalte brauchen Internet. Beobachtungsauftrag und Video können
in zwei Spalten nebeneinander stehen.

### PDF und Excel-Arbeitsmappe

```markdown
::: {.document src="material/arbeitsblatt.pdf" title="Arbeitsblatt" height="fill"}
:::

::: {.document src="material/Excel-Grundlagen.xlsx" title="Unsere Arbeitsmappe" sheet="Tabelle1" range="A1:H25" height="fill"}
:::
```

Die XLSX-Ansicht dient dem Zeigen und Besprechen. `sheet` und `range` sind
optional: Standard sind das erste sichtbare Blatt und `A1:Z50`. Gespeicherte
Formelergebnisse werden angezeigt, Formeln nicht neu berechnet. Häufige
Formeln erscheinen auf Deutsch; einfache Diagramme werden unterstützt.
Zum tatsächlichen Bearbeiten die Originaldatei in Excel öffnen. Details und
Grenzen: [Tabellenbetrachter](modules/spreadsheets/README.md).

Andere Arbeitsdateien als normale Links bereitstellen:
`[Arbeitsmaterial öffnen](material/datei.docx)`.

### HTML-Ressource

```markdown
::: {.embed src="assets/experiment.html" title="Interaktives Experiment" height="fill"}
:::
```

Geeignet für vorhandene HTML-Übungen und Simulationen. Ihr eigener Zustand
wird nicht automatisch in der QMD oder im Sitzungsexport gesichert.

### Gemeinsame Medienoptionen

`width` und `height` verwenden positive Werte mit `%` oder `px`, etwa `"60%"`
oder `"400px"`. `height="fill"` nutzt den verbleibenden Platz.
`align="left|center|right"` richtet den Block aus, Standard ist `center`.
Bilder und Videos behalten ihr Seitenverhältnis. Für eine Video-/Dokumentfolie
ist `fragments="off"` häufig sinnvoll.

## 6. Weitere vorhandene Möglichkeiten

- **Zeichnen/Canvas und Tafel:** Freihand, Formenerkennung, Lasso, Radierer,
  Rückgängig und Wiederholen. Freiraum auf normalen Folien oder in Aufgabenboxen
  einplanen; keine zusätzliche Canvas-Implementierung nötig.
- **Medienbibliothek:** gemeinsame, stundenbezogene und für eine Folie
  vorbereitete Medien. Einfügen per Auswahl, Ziehen oder Zwischenablage.
- **Präsentationswerkzeuge:** Laserpointer, Lupe, Suche, Textauswahl,
  Folienübersicht, Vollbild und Referentenansicht. Die Tastaturhilfe zeigt
  die aktuellen Kürzel. Häufig: `C` Zeichnen, `B` Tafel, `V` Positionieren,
  `R` Referentenansicht und `Enter` zum Verlassen einer Auswahl/eines Modus.
- **Python-Konsole:** über `T`; Python läuft mit Pyodide im Browser und benötigt
  beim ersten Öffnen Internet. Normale Python-Codeblöcke auf Folien werden
  dadurch nicht automatisch ausgeführt.
- **Animierte Hervorhebungen:** z. B.
  `[wichtiger Begriff]{.rn-fragment rn-type=underline rn-color="#3873b8"}`.
  Weitere Arten: `circle` und `highlight`.

## 7. Word-Arbeitsblätter – nur mit separater Worksheet-Extension

Presentation und Worksheet sind eigenständig. Presentation allein erzeugt
keine Word-Arbeitsblätter. Prüfe, ob Worksheet im Projekt installiert ist,
und lies deren mitgelieferte Anleitung. Vorhandene Projektregeln haben Vorrang.

Im gemeinsamen Presentation-Projekt wählt die Arbeitsblatt-QMD ausdrücklich
das Word-Format. Präsentationsklassen wie `.quiz-question` dort nicht verwenden.

```markdown
---
title: "Rastergrafiken untersuchen"
format: worksheet-docx
---

:::: {.task title="Bildpunkte zählen" ae="I"}
Ein Bild ist 8 Pixel breit und 5 Pixel hoch.

Es hat [Antwort eingeben]{.answer-field #anzahl} Bildpunkte.

::: {.answer-field #begruendung label="Begründung"}
Erkläre deinen Rechenweg.
:::
::::

::: {.answer-image #screenshot}
Screenshot hier einfügen
:::
```

Worksheet nummeriert Aufgaben automatisch; `title` und `ae="I|II|III"` sind
optional. `.answer-field` ist ein digitales Textfeld, `.answer-image` ein Feld
für eingefügte Bilder/Screenshots. IDs müssen im Dokument eindeutig sein.
`worksheet.protected: true` gibt nur die vorgesehenen Antwortbereiche frei.

Für Papier statt digitaler Antwortfelder:

```markdown
::: {.answer lines="4"}
Deine Begründung
:::
```

Diese `.answer` erzeugt Schreiblinien im Word-Dokument und hat eine andere
Bedeutung als `[Begriff]{.answer}` im Präsentationsquiz.

## 8. Vorschau, Exporte und Abschlussprüfung

Im Projektordner, Pfade mit Leerzeichen immer in Anführungszeichen:

```sh
quarto preview "Unterrichtsstunden/14_RGB-Modell/praesentation.qmd"
quarto render "Unterrichtsstunden/14_RGB-Modell/arbeitsblatt.qmd" --to worksheet-docx
quarto render "Unterrichtsstunden/14_RGB-Modell/praesentation.qmd" --to presentation-pptx
```

Die letzten beiden Befehle nur ausführen, wenn diese Ausgaben gewünscht sind.
Die PowerPoint-Ausgabe erhält bearbeitbare Inhalte, aber keine interaktiven
Quiz- oder Präsentationsmodi; das Layout kann abweichen. Umfang und Grenzen:
[PowerPoint](modules/powerpoint/README.md).

Die laufende Quarto-Vorschau unterstützt Quellspeicherung und PDF-/ZIP-Exporte
über **Extras**. Eine direkt geöffnete HTML kann diese lokalen Dienste nicht
bereitstellen. Zum Weitergeben als Webpräsentation den ZIP-Export verwenden.
Nach einem Extension-Update betroffene Präsentationen neu rendern und die
Browserseite neu laden, damit auch erzeugte Ressourcen aktualisiert werden.

Vor der Übergabe einer Stunde:

1. QMD rendern; Warnungen zu offenen `:::`-Blöcken und fehlenden Dateien beheben.
2. Folien visuell auf Überlappungen, Lesbarkeit und Platz für Antworten prüfen.
3. Quizfragen durchklicken: richtige Antworten, Distraktoren, Einblendungen,
   Bilder und gewünschte Ergebnisanzeige prüfen.
4. Medienpfade und Links testen; Online-Abhängigkeiten nennen. Arbeitsmaterialien
   mit passenden Dateibezeichnungen verlinken.
5. Musterlösungen und Quellen in Notes prüfen. Exporte nur als tatsächlich
   getestet bezeichnen, wenn sie überprüft wurden.

Weitere Optionen: [ausführliche Anleitung](README.md). Die Beispielpräsentation
`template.qmd` in einem mit `quarto use template` erzeugten Projekt zeigt weitere
kopierbare Bausteine. Dieser Leitfaden beschreibt die installierte Version;
bei widersprüchlichen älteren Beispielen die hier genannten öffentlichen
Attribute und die modulbezogene Dokumentation verwenden.

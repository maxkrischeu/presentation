# Presentation – V2

**PowerPoint:** `quarto render praesentation.qmd --to presentation-pptx`
erzeugt im Presentation-Projekt eine zusätzliche bearbeitbare PPTX.
[Umfang, Gestaltung und Grenzen](modules/powerpoint/README.md).

Eine Quarto-Format- und Projekterweiterung für interaktive Reveal.js-Präsentationen. Alle benötigten Erweiterungsdateien befinden sich in diesem Ordner. Eigene Inhalte, Bilder und Projektkonfiguration bleiben außerhalb.

## Verwendung

Bestehendes Fachprojekt (im Projektordner ausführen):

```sh
quarto add maxkrischeu/presentation
```

Ein neues Projekt einschließlich Startdatei:

```sh
quarto use template maxkrischeu/presentation
```

**Derzeit ist das Repository privat.** Quarto 1.10 übernimmt beim Download von
Extensions keine GitHub-Anmeldung. Deshalb zunächst über GitHub CLI herunterladen:

```sh
gh repo clone maxkrischeu/presentation /pfad/zur/presentation-extension
```

Danach im Fachprojekt `quarto add /pfad/zur/presentation-extension` ausführen.
Für ein neues Projekt entsprechend `quarto use template /pfad/zur/presentation-extension`.
Alternativ kann das Release-Paket `presentation-template.zip` heruntergeladen und
an beide Quarto-Befehle übergeben werden. Die oben gezeigten GitHub-Kurzbefehle
sind für einen späteren öffentlichen Zugang vorbereitet.

Bei `quarto add` einmalig in der bestehenden `_quarto.yml` aktivieren; die Vorlage
enthält diese Einstellung bereits:

```yaml
project:
  type: presentation
```

```yaml
# Kopf einer .qmd-Datei
---
title: Meine Präsentation
lang: de # oder en
date: today
presentation:
  logo-text: date
  header-text: Mein Thema
  slide-number: true
---
```

Voraussetzung: Quarto ab 1.10. Python, Node und npm müssen nicht zusätzlich
installiert werden. Vorschau, Speichern und Exporte verwenden Quartos Laufzeit.
Beim ersten Folien-PDF- oder ZIP-Export wird ein vorhandener Chrome/Edge bzw.
Quartos Headless-Browser verwendet. Fehlt er, installiert Quarto ihn automatisch;
dafür wird einmalig Internet benötigt. Weitere Exporte verwenden ihn erneut.
Tafel-PDFs benötigen keinen Browser. Normales Rendern und Preview laden keinen
PDF-Browser herunter. Auf Linux können Systembibliotheken für Chromium nötig sein.

Quarto erzeugt die HTML neben der QMD und die Ressourcen im zugehörigen
`<name>_files`-Ordner.

Die internen Hilfsdateien entstehen gebündelt unter `.quarto/presentation/`.
Sie werden automatisch erzeugt und müssen nicht mitkopiert werden.

Danach funktionieren die normalen Quarto-Befehle:

```sh
quarto preview meine-praesentation.qmd
quarto render meine-praesentation.qmd
```

`quarto preview` stellt auch „In Quelle speichern“ und PDF-/ZIP-Sitzungsexporte bereit. Eine statisch gehostete HTML-Präsentation funktioniert ebenfalls; Schreiben in lokale QMD-Dateien und serverseitige Sitzungsexporte brauchen die lokale Vorschau. Python-Pakete werden bei Bedarf aus dem Internet geladen.

## Institution und Website

Ohne `institution` bleibt die Fußzeile rechts leer. Der Name ist frei wählbar.
Mit der optionalen `institution-url` wird er zu einem Link, der in einem neuen
Tab öffnet:

```yaml
presentation:
  institution: "Meine Schule"
  institution-url: "https://example.org"
```

Die URL muss mit `https://` oder `http://` beginnen. Ohne URL erscheint nur Text;
eine URL ohne Institutionsnamen erzeugt keinen sichtbaren Link.
Beide Felder können ausdrücklich unter `presentation` in `_quarto.yml`
als Projektvorgabe gesetzt werden. `institution: ""` im Dokument entfernt eine
solche Vorgabe wieder. Die mitgelieferte Projektkonfiguration setzt keine Institution.

Der Lehrername kann auf dieselbe Weise optional verlinkt werden:

```yaml
presentation:
  teacher: "Hr. Krischeu"
  teacher-url: "https://example.org/profil"
```

Das automatische `@ ` vor dem Namen bleibt erhalten. Ohne `teacher-url` erscheint
normaler Text; ohne Namen bleibt das Feld leer. Die URL unterstützt HTTP/HTTPS
und öffnet in einem neuen Tab. Auch `teacher-url` kann als Projektvorgabe gesetzt
und im Dokument mit `false` oder `""` entfernt werden.

## Entwicklung

Die lesbaren Quelldateien liegen in `core/`, `ui/`, `modules/` und `server/`. `runtime/`, `presentation.css` und `_extension.yml` werden deterministisch erzeugt; dort nicht direkt ändern.

```sh
python3 _extensions/presentation/core/build.py
python3 _extensions/presentation/core/build.py --check
```

Die Entwicklungswerkzeuge gehören nur zum Quellprojekt und sind nicht im installierbaren Paket enthalten. Vor dem Rendern nach Quelländerungen den Build ausführen. Die Vorschau baut die Extension nicht selbst. Nach Änderungen an Servercode, Modulmanifesten, Filterlisten oder Pluginregistrierungen den Build ausdrücklich **vor** dem nächsten Quarto-Aufruf starten und eine laufende Vorschau neu starten, da Quarto die Extension-Konfiguration früh einliest.

Jedes Modul besitzt ein `module.json` und registriert bei Bedarf seine öffentlichen Browser-Verträge in `module.js`. Fremdcode liegt beim zuständigen Modul; Herkunft, Änderungen und Lizenzen werden dort dokumentiert. V2 ist eine Entwicklungsfassung, keine veröffentlichte Extension.

## Vorschau und PDF

Rendern und Vorschau erzeugen standardmäßig nur die HTML-Präsentation. PDFs
werden über Extras ausdrücklich exportiert. Für einen PDF-Export des gerenderten
Grundstands im Terminal:

```sh
quarto run _extensions/presentation/modules/exports/render.ts meine-praesentation.html
```

Die Vorschau lädt erst nach erfolgreichem Renderabschluss neu. Erfolgreiche
HTTP-Abrufe werden nicht protokolliert; `PRESENTATION_DEBUG=1` aktiviert sie bei
Bedarf. `quarto preview meine-praesentation.qmd --quiet` blendet außerdem Quartos
ausführliche Render-Metadaten aus. Fehlermeldungen bleiben relevant.

## Ein Projekt pro Fach

Die Extension liegt einmal unter `_extensions/presentation` (ZIP) bzw.
`_extensions/maxkrischeu/presentation` (GitHub) im Fachprojekt.
Die Vorschau-Hooks unterstützen beide Installationsformen.
Ohne `output-dir` entstehen HTML und Ressourcen neben der jeweiligen QMD.
Ein ausdrücklich gesetztes `project.output-dir` (z. B. `_output`) bleibt möglich.
Gemeinsame Angaben gehören in `_quarto.yml`; einzelne Stunden dürfen sie
im YAML ihrer QMD überschreiben.

```text
Fach/
  _quarto.yml
  _extensions/presentation/
  assets/                    # gemeinsame Bilder
  05_Stunde/
    praesentation.qmd
    praesentation.html       # generiert
    praesentation_files/     # generiert
    assets/                  # Bilder dieser Stunde
```

PNG, JPG, SVG, WebP, GIF und AVIF in diesen assets-Ordnern werden einschließlich
Unterordnern automatisch in die Bildbibliothek aufgenommen. Dateinamen dienen
als Beschriftung; ausdrückliche YAML-Bilddefinitionen haben Vorrang.
Die Bibliothek hat die Bereiche Gemeinsam, Diese Stunde und Diese Folie.
Wenn QMD und Fachprojekt im selben Ordner liegen, gibt es nur einen assets-Pool.
Neue Dateien erscheinen beim Rendern oder beim erneuten Öffnen der Bibliothek
in einer lokalen Vorschau.

Mit Cmd/Ctrl+V lassen sich Bilder aus der Zwischenablage einfügen. Bilddateien
können aus dem Dateimanager auf die Folie gezogen werden. Beides funktioniert
im Standard- und Bildverschiebemodus, nicht beim Schreiben in Textfeldern.
Dafür `quarto preview` verwenden: Das Bild wird als PNG im assets-Ordner neben
der QMD gespeichert (maximal 12 MB pro Eingabedatei und gespeicherter PNG,
32 Megapixel). Eindeutige Namen verhindern Überschreiben.
Die Zwischenablage wird nur bei aktivem Einfügen gelesen.

Die Bilddatei ist sofort gespeichert; „Im Quarto-Dokument speichern“ übernimmt
die Platzierung. Beim Umbenennen oder Verschieben von Bildern müssen gespeicherte
Referenzen angepasst werden. Separat gespeicherte HTML-Dateien bieten weiterhin
die eingebettete Bibliothek, aber keinen Schreibzugriff auf lokale assets.

### Dock selbst zusammenstellen

Ohne Angabe bleibt das Standarddock erhalten. Eine Liste unter `presentation`
legt die sichtbaren Schaltflächen und ihre Reihenfolge fest:

```yaml
presentation:
  dock:
    enabled: true
    items: [prev, next, overview, draw, board, more]
```

Verfügbar sind `prev`, `next`, `overview`, `draw` (Zeichnen), `board` (Tafel),
`assets` (Bildbibliothek), `position` (Bilder verschieben), `python`, `laser`,
`magnifier` (Lupe), `fullscreen`, `speaker`, `help`, `search`, `blackout` und
`more` (Menü). Die Icons stammen aus den jeweiligen Modulen.
Die Suche öffnet sich mit **S**, die Referentenansicht mit **R**.

Ein langes Dock scrollt horizontal mit Trackpad, Touch oder Mausrad; per Tab
bleiben alle Schaltflächen erreichbar. In Arbeitsmodi erscheint weiterhin die
zugehörige Werkzeugleiste. `dock.enabled: false` blendet das Standarddock aus;
`dock.items: []` lässt es leer. Die Liste kann auch in `presentation`
als Projektvorgabe stehen und pro Präsentation ersetzt werden.

### Automatische Einblendungen

```yaml
presentation:
  fragments: auto
  fragment-effect: fade
```

`fragments: auto` ist Standard, `off` deaktiviert nur die Automatik. Manuelle
`.fragment`-Angaben bleiben aktiv. `fragment-effect` erlaubt `fade` oder `fade-up`.

Folien und Blöcke überschreiben die geerbte Einstellung mit
`fragments="auto"`, `fragments="off"` oder `fragments="together"`:

```markdown
## Schrittweise {fragments="auto"}

Dieser Absatz erscheint per Klick.

::: {.task title="Aufgabe" time="10" fragments="together"}
Diese gesamte Box erscheint mit einem Klick.

Auch dieser Absatz ist sofort mit dabei.
:::

## Ohne Automatik {fragments="off"}

Dieser Text ist sichtbar. [Dieser Teil kommt später.]{.fragment}
```

Bei `auto` erhält jeder Absatz und jeder Listenpunkt einschließlich Unterpunkten
einen eigenen Schritt. Sätze innerhalb desselben Absatzes bleiben zusammen.
Boxen zeigen zuerst Rahmen und Kopfzeile, danach den Inhalt. Medien erhalten
jeweils einen Schritt. Spalten folgen der QMD-Reihenfolge (links vor rechts).
Die Folienüberschrift bleibt sichtbar; Titel-, Abschnitts- und Quizfolien behalten
ihre eigene Logik. Bei `together` an einer Folie erscheint der gesamte Inhalt
unter der Überschrift mit einem Klick.

Ein Absatz mit expliziten Fragmenten erhält keinen zusätzlichen automatischen
Schritt. `.incremental` und `.nonincremental` bleiben ebenfalls wirksam.
Für eine vollständig manuelle Reihenfolge `fragments="off"` an der Folie und
`[Text]{.fragment fragment-index="1"}` usw. verwenden. Explizite Fragmente
bleiben auch innerhalb von `together` erhalten.

Ein untergeordneter Block kann die Einstellung erneut überschreiben. Ein
`off`-Block innerhalb einer noch unsichtbaren Elternbox wird jedoch erst mit
dieser sichtbar. Sprecher-Notes erhalten keine automatischen Schritte.

Übersicht und PDF zeigen alle Inhalte. Frei platzierte Medien folgen ihrer
Quellposition; beim Bearbeiten bleiben sie sichtbar. Neu eingefügte Medien
bekommen ihren Einblendungsschritt nach Speichern und Rendern.
Die älteren Angaben `auto-fragments`, `.no-auto-fragments` und `.fragment-group`
bleiben unterstützt; neue Angaben haben Vorrang.

### Aufgabenboxen

Mit `height="fill"` reicht die Box von ihrer normalen Position bis zum unteren Inhaltsrand oberhalb der Fußzeile. Beispiel: `::: {.task title="Aufgabenstellung" icon="computer" height="fill"}`. Für die letzte Box einer Folie gedacht; ohne diese Option richtet sich die Höhe nach dem Inhalt.

```markdown
::: {.task title="Am Computer" time="5" icon="computer"}
Bearbeitet die Aufgabe.
:::
```

Titel, Icon und Zeit sind optional. Der Titel steht links, das Icon fest in
der Mitte und die Zeit rechts. Ohne alle drei Angaben entfällt die Kopfzeile.
`time="15"` zeigt automatisch „15 min“. Freitext bleibt unverändert.
`time` ist eine Beschriftung, kein Countdown (z. B. `"15 min"`
oder `"bis 10:30 Uhr"`). Icons: `pencil`, `computer`, `book`, `group`,
`discussion`. `pen` (Alias für `pencil`), `pair` und `none` bleiben unterstützt.
Die Box erscheint
vor ihrem Inhalt; `fragments="together"` zeigt beides gemeinsam, `fragments="off"`
schaltet automatische Schritte für die Box aus. Farben können lokal mit den
CSS-Variablen `--task-accent` und `--task-background` angepasst werden.

### Sprache der Oberfläche

`presentation.lang: de` oder `en` legt die Sprache der Bedienelemente fest,
unabhängig von Quartos Dokumentsprache. Fehlt diese Option, gilt `lang` aus
dem Projekt oder Dokument. Ohne beide Angaben ist Englisch der Standard.

```yaml
lang: de
presentation:
  lang: en
```

`presentation.teacher` übernimmt ohne eigene Angabe den Dokumentautor (`author`),
bei mehreren Autoren deren Namen mit Kommas. `teacher: ""` oder `teacher: false`
blendet die Angabe ausdrücklich aus. `teacher-url` verlinkt auch den übernommenen Namen.

### Medienbibliothek

Bilder, animierte GIFs und lokale MP4-/WebM-/M4V-Dateien aus `assets` stehen
in der Medienbibliothek zur Verfügung. Der Katalog enthält Dateiverweise;
ungenutzte Medien werden nicht in die HTML-Datei eingebettet. Vorschauen laden
beim Öffnen/Scrollen der Bibliothek. GIF-Vorschauen ruhen bis zum Hover.
Videos lassen sich wie Bilder platzieren; außerhalb des Bearbeitungsmodus
erscheinen Wiedergabesteuerungen. Folienwechsel pausieren die Wiedergabe.
Rotation und Transparenz sind für Videos im Dock ausgeblendet.

Direkte HTTP(S)-Videodateien können über `presentation.media.items` registriert
werden (`src: https://example.org/film.mp4`, mit eigener `id` und `label`).
Für YouTube/Vimeo weiterhin Quartos natives `{{< video URL >}}` verwenden.
Clipboard-/Dateiimport erhält GIFs und MP4/WebM unverändert (maximal 12 MB);
andere importierte Bilder werden zu PNG normalisiert. Dateien in `assets`
sind nicht auf diese Importgröße beschränkt.

ZIP-Sitzungsexporte enthalten nur verwendete Bibliotheksmedien und direkt
im Dokument eingebundene Ressourcen. Online-Medien bleiben Links und benötigen
Internet. Normale HTML-Ausgaben benötigen weiterhin ihre zugehörigen Dateien;
zum Weitergeben den Präsentationsexport verwenden.

### Ausrichtung beim Positionieren

Beim Verschieben von Bildern und Videos erscheinen Hilfslinien an der
Folienmitte, den Inhaltsrändern sowie Kanten und Mittelpunkten anderer Medien.
Innerhalb von sechs Bildschirm-Pixeln rastet das Objekt ein. Mit gedrückter
Alt-Taste lässt es sich frei verschieben. Gedrehte Objekte verwenden ihre
äußeren Begrenzungen. Die Linien verschwinden beim Loslassen und werden
nicht gespeichert oder exportiert. Ihre Farbe lässt sich über
`--presentation-alignment-color` anpassen.

### Bilder als Quizantworten

`answers="images"` zeigt die Antworten als nummerierte Bildkarten in zwei Spalten.
Auswahl, Prüfen, Punkte und Einblendschritte entsprechen normalen Quizfragen.
Bilder werden unverzerrt eingepasst; Alternativtexte bleiben für Screenreader erhalten.

```markdown
## Welches Raster passt? {.quiz-question answers="images"}

- ![Raster 1](assets/raster-1.svg)
- [![Raster 2](assets/raster-2.svg)]{.correct}
- ![Raster 3](assets/raster-3.svg)
- ![Raster 4](assets/raster-4.svg)
```

Die Kartenhöhe kann an der Folie über `style="--quiz-image-answer-height: 140px;"` angepasst werden.

### Quiz-Schreibweise

Fragen verwenden `.quiz-question`. Optionen: `type="single|multiple|cloze"`,
`answers="text|images"`, `columns="1|2"`, `layout="standard|image"`.
Die durch `|` getrennten Angaben sind Alternativen, kein gemeinsamer Wert.
Ohne Angaben gilt Einfachauswahl mit Textantworten in einer Spalte;
Bildantworten stehen standardmäßig in zwei Spalten. `columns` überschreibt dies.
Bei Lückentexten werden die Begriffe weiterhin mit `[Begriff]{.answer}` markiert;
Layoutoptionen für Antwortlisten sind dafür nicht vorgesehen.

```markdown
## QuizTime! {.quiz-intro subtitle="Unsere Wiederholung"}
## Welche passen? {.quiz-question type="multiple" answers="images" columns="2"}
## Ergebnis {.quiz-results show="total"}
```

Beim Quizstart ergibt ein weggelassenes `subtitle` automatisch Fragenzahl und
Punkte; `subtitle="false"` blendet den Untertitel aus. Ergebnisse unterstützen
`show="total"`, `show="questions"` und `show="both"` (Standard).
Die bisherigen Zusatzklassen und `data-quiz-*`-Attribute bleiben kompatibel;
explizite neue Optionen haben Vorrang. `.correct` und `.answer` bleiben unverändert.

### Einheitliche Medienblöcke

```markdown
::: {.image src="assets/raster.svg" alt="Schwarz-weißes Raster" width="60%"}
:::

::: {.video src="assets/rgb.mp4" width="70%"}
:::

::: {.document src="material/arbeitsblatt.pdf" height="fill"}
:::

::: {.embed src="assets/raster.html" height="fill"}
:::
```

Alle Blöcke verwenden `src` für einen lokalen Pfad relativ zum QMD oder eine
HTTP(S)-Adresse. `width` und `height` nehmen positive Werte mit `%` oder `px` an.
Prozentuale Breiten beziehen sich auf den umgebenden Inhaltsbereich (auch eine
Spalte), prozentuale Höhen auf die Folienhöhe. `height="fill"` nutzt den übrigen
Platz bis zum unteren Inhaltsrand. Bilder und Videos behalten ihr Seitenverhältnis;
eine feste Box wird nicht durch Beschneiden ausgefüllt.
`align="left|center|right"` richtet den Block aus, Standard ist `center`.
Ohne Breite wird der verfügbare Platz genutzt. Ohne Höhe passen sich Bilder und
Videos dem Seitenverhältnis an; Dokumente und HTML nutzen den verbleibenden Platz.

`title` benennt Dokumente, HTML und Videos; bei Dokumenten/HTML gilt sonst der
Dateiname. Bilder erhalten über `alt` ihre Bildbeschreibung. `.document` unterstützt
PDFs und XLSX-Arbeitsmappen. Für andere Dateien normale Downloadlinks verwenden. `.video`
unterstützt lokale/direct HTTP(S)-Videodateien sowie YouTube-/Vimeo-Links.
Online-Inhalte benötigen eine Verbindung und die Freigabe des Anbieters.

Freie Bilder, Videodateien und XLSX-Arbeitsmappen verwenden denselben Block mit `position="free"`:

```markdown
::: {.image src="assets/raster.svg" position="free" x="35%" y="40%" width="30%"}
:::
```

Hier beziehen sich `x`, `y`, `width` und `height` in Prozent auf den
Positionierungsbereich der Folie. Der Editor schreibt diese Werte beim Speichern;
`layer`, `rotation` und `transparency` bleiben wie bisher verfügbar. Freie
YouTube-/Vimeo-Player und frei verschiebbare PDF-Fenster sind nicht enthalten.

XLSX-Dateien lassen sich mit `sheet="Tabelle1"` und `range="A1:H25"` auf ein
Startblatt und einen Bereich begrenzen (ohne `position="free"`). Der
[Tabellenbetrachter](modules/spreadsheets/README.md) bietet Blattwechsel, Zoom,
deutsche Formelanzeige und eine vergrößerte Ansicht. Ohne Bereichsangabe wird
`A1:Z50` angezeigt. Werte sind schreibgeschützt; einfache Diagramme und Textfelder
werden unterstützt. Grenzen sind in der Dokumentation des Betrachters beschrieben.
Normale Markdown-Bilder, Quartos Video-Shortcode, `.pdf-preview` und vorhandene
`.placed-image`-Blöcke funktionieren weiterhin.

### Projektvorgaben und Standardwerte

```yaml
project:
  type: presentation

lang: de
author: "Hr. Krischeu"
date: today

presentation:
  subject: "Informatik"
  class: "Klasse 7"
  institution: "Meine Schule"

  logo: assets/logo.svg
  logo-text: date
  slide-number: true

  fragments: auto
  fragment-effect: fade

  dock:
    enabled: true
    items: [prev, next, overview, draw, more]

  media:
    folders: [assets]
```

| Einstellung | Ohne eigene Angabe |
|---|---|
| `teacher` | Übernimmt `author`; ohne Autor leer |
| `lang` unter `presentation` | Übernimmt Quartos `lang`, sonst Englisch |
| `header-text` | Übernimmt `subtitle`; ohne Untertitel bleibt der Text leer. Ein eigener Text überschreibt den Standard, `false` blendet ihn aus |
| `logo`, `logo-text` | Kein Logo bzw. kein Text; `logo-text: date` übernimmt `date` |
| `subject`, `class`, `institution` | Leer |
| `teacher-url`, `institution-url` | Kein Link |
| `slide-number` | Aus |
| `fragments`, `fragment-effect` | `auto`, `fade` |
| `dock.enabled` | `true` |
| `dock.items` | Standarddock; `[]` zeigt keine Standardwerkzeuge |
| `media.folders` | `[assets]` |
| `media.items` | Keine zusätzlich registrierten Medien |

`media.folders` bezeichnet Ordner relativ zum Projekt. Der lokale `assets`-Ordner
neben einer QMD in einem Unterordner kommt automatisch hinzu. Doppelte Ordner
werden nur einmal erfasst; `folders: []` deaktiviert die gemeinsame Sammlung.
Die Bibliothek berücksichtigt Bilder, GIFs und MP4/WebM/M4V, nicht PDF-Dokumente.

Zusätzliche Medien lassen sich als Liste unter `presentation.media.items`
registrieren, mit `src`, optional `id` und `label`. `src` kann eine HTTP(S)-URL
oder ein Dateipfad sein; Projektangaben werden durch Quarto für Unterordner
angepasst, Angaben im QMD sind relativ zu dessen Ordner.

Die bisherigen Angaben `dock: true/false`, `dock-items` und `assets` bleiben
kompatibel. Neue `dock.items` bzw. `media.items` haben Vorrang. Für eine einzelne
Stunde genügen normalerweise `title` und optional `subtitle` im YAML-Kopf.

### Verblassen des Laserpointers

```yaml
presentation:
  laser:
    fade-delay: 3
```

`fade-delay` gibt die Wartezeit nach dem Loslassen in Sekunden an (Standard: `1`).
Danach verblassen die Striche weich über 1,5 Sekunden. `0` startet das Verblassen
sofort; Dezimalwerte wie `0.5` sind möglich. Neue Striche starten die gemeinsame
Wartezeit für alle sichtbaren Striche erneut. Die Einstellung gilt für Laserspuren,
nicht für den Punkt unter dem Mauszeiger.

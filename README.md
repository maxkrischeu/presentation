# Presentation – V2

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

Voraussetzungen: Quarto ab 1.10 und Python ab 3.10. Für PDF-/ZIP-Exporte
zusätzlich Node.js ab 20 mit npm. Beim ersten Export werden die festgelegten
Node-Abhängigkeiten und Chromium automatisch heruntergeladen; dafür ist eine
Internetverbindung nötig. Spätere Exporte verwenden die installierten Komponenten.
Normales Rendern und die Vorschau starten diese Downloads nicht.

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
Beide Felder können ausdrücklich unter `presentation-defaults` in `_quarto.yml`
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

Die Vorschau baut die Laufzeit beim Rendern automatisch neu. Nach Änderungen an Servercode, Modulmanifesten, Filterlisten oder Pluginregistrierungen den Build ausdrücklich **vor** dem nächsten Quarto-Aufruf starten und eine laufende Vorschau neu starten, da Quarto die Extension-Konfiguration früh einliest.

Jedes Modul besitzt ein `module.json` und registriert bei Bedarf seine öffentlichen Browser-Verträge in `module.js`. Fremdcode liegt beim zuständigen Modul; Herkunft, Änderungen und Lizenzen werden dort dokumentiert. V2 ist eine Entwicklungsfassung, keine veröffentlichte Extension.

## Vorschau und PDF

Rendern und Vorschau erzeugen standardmäßig nur die HTML-Präsentation. PDFs
werden über Extras ausdrücklich exportiert. Für einen PDF-Export des gerenderten
Grundstands im Terminal:

```sh
node _extensions/presentation/modules/exports/render.cjs meine-praesentation.html
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

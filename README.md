# Presentation

Eine Quarto-Erweiterung für interaktive Präsentationen mit Aufgabenboxen, Quiz,
Zeichenfläche, Tafel und Medienbibliothek. Platzierte Medien lassen sich ins
Quarto-Dokument zurückschreiben; PDF und ZIP exportieren den aktuellen Stand.

## Installation

Voraussetzung ist **Quarto ab 1.10**. Python, Node und npm müssen nicht separat
installiert werden.

Nach Veröffentlichung dieses Repositorys startet ein neues Projekt mit:

```sh
quarto use template maxkrischeu/presentation
```

Für ein vorhandenes Projekt:

```sh
quarto add maxkrischeu/presentation
```

Ergänze dort in `_quarto.yml`:

```yaml
project:
  type: presentation
```

Das Startertemplate enthält diese Einstellung und die Extension bereits.
Ein zusätzliches `quarto add` ist dabei nicht nötig. Bei bestehenden Website-
oder Book-Projekten den Projekttyp nicht ohne Prüfung ersetzen.

**Aktuell ist dieses Repository privat.** Verwende bis zur Veröffentlichung
einen lokal heruntergeladenen Repository-Ordner oder das bereitgestellte ZIP
anstelle von `maxkrischeu/presentation` in den beiden Befehlen.

## Das Starterprojekt

Dieses Starterprojekt enthält eine kleine Präsentation mit Text und Bild,
einer Aufgabenbox und einem Quiz. Ersetze die Beispiele durch deine eigenen Inhalte.

## Starten

Du benötigst **Quarto ab Version 1.10**. Starte im Projektordner:

```sh
quarto preview
```

Die Präsentation öffnet sich im Browser. Bearbeite die `.qmd`-Datei in deinem
Editor und speichere sie: Quarto aktualisiert die Vorschau automatisch.
Mit `Strg+C` im Terminal beendest du die Vorschau.

Quarto benennt `template.qmd` beim Erstellen des Projekts um. Du kannst die
Datei danach selbst umbenennen. Bei mehreren Präsentationen wählst du eine aus:

```sh
quarto preview "meine-praesentation.qmd"
```

## Was liegt wo?

| Datei oder Ordner | Inhalt |
| --- | --- |
| `_quarto.yml` | Gemeinsame Einstellungen für dieses Projekt |
| `.qmd`-Datei | Titel, Folien und Notizen deiner Präsentation |
| `assets/` | Eigene Bilder, GIFs und Videos; ein Beispielbild ist enthalten |
| `_extensions/` | Die installierte Presentation-Erweiterung |

Beim Rendern entstehen die HTML-Präsentation und ihr Begleitordner `<name>_files`.
Behalte beide zusammen. `.quarto/` enthält automatisch erzeugte Arbeitsdateien.

## Anpassen

Ändere `title` und `subtitle` im Kopf deiner QMD. Dort kannst du auch
`author: "Dein Name"` ergänzen; er dient ohne eigene `teacher`-Angabe zugleich
als Lehrkraftname in der Fußzeile.

In `_quarto.yml` stehen die Einstellungen für alle Präsentationen:

- `lang: de`: deutsche Oberfläche; mit `en` wechselst du zu Englisch.
- `date: today`: Datum des jeweiligen Render-Tages.
- `presentation.fragments: auto`: Inhalte erscheinen schrittweise;
  mit `"off"` deaktivierst du die automatischen Einblendungen.
- `presentation.media.folders: [assets]`: Medien dieses Ordners sind in der
  Medienbibliothek verfügbar.

Eine neue Folie beginnt mit `## Überschrift`. Beispiel für eine Aufgabenbox:

```markdown
::: {.task title="Ausprobieren" time="5" icon="computer"}
Bearbeitet die Aufgabe am Computer.
:::
```

`time="5"` wird als „5 min“ angezeigt. Für das Icon kannst du beispielsweise
`computer` oder `discussion` verwenden.

Eine einfache Quizfrage:

```markdown
## Wie viele Tage hat eine Woche? {.quiz-question}

- Fünf
- [Sieben]{.correct}
- Acht
```

Markiere die richtige Antwort mit `{.correct}`. Mit `columns="2"` an der
Frage erhältst du zwei Antwortspalten. Die Start- und Ergebnisfolie findest du
im enthaltenen Beispiel. Alle Schreibweisen stehen in der ausführlichen
`README.md` im installierten `presentation`-Ordner unter `_extensions/`.

## Beim Präsentieren

- **Pfeil rechts:** nächster Inhalt oder nächste Folie.
- **C:** auf der Folie zeichnen.
- **B:** Tafel öffnen.
- **Enter:** Auswahl bzw. aktiven Modus verlassen.
- **?:** Tastaturhilfe anzeigen.

Über das Dock erreichst du weitere Werkzeuge und die Medienbibliothek.
„Im Quarto-Dokument speichern“ übernimmt platzierte Medien in deine QMD.
Nutze dafür die laufende Vorschau. Änderungen am Text schreibst du im Editor.

## Exportieren

In der laufenden Vorschau bietet das Menü Folien-PDF, Tafel-PDF und einen
Präsentationsexport als ZIP an. Das ZIP enthält HTML, benötigte lokale Ressourcen,
den Sitzungsstand und ein PDF. Entpacke es vor dem Öffnen vollständig.

Python, Node und npm musst du nicht installieren. Für Folien-PDF und ZIP
verwendet die Extension einen von Quarto erkannten Browser. Fehlt er, richtet
Quarto ihn beim ersten Export automatisch ein; dafür ist Internet nötig.
Unter Linux können zusätzliche Chromium-Systembibliotheken erforderlich sein.
Externe Inhalte benötigen gegebenenfalls weiterhin Internet.

## Stand der Erprobung

Installation, Vorschau, Speichern und PDF-/ZIP-Export wurden auf macOS mit
absichtlich gesperrtem Python, Node und npm für die Extension getestet.
Windows, Linux und die Browser-Erstinstallation auf einem frischen Rechner
sind noch nicht vollständig praktisch geprüft. Die Erweiterung wird weiterentwickelt.

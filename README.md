# Presentation

Interaktive Quarto-Präsentationen mit Quiz, Aufgabenboxen, Tafel und Medienbibliothek.
Benötigt **Quarto ab 1.10**.

## Neues Projekt

```sh
quarto use template maxkrischeu/presentation
```

Anschließend im erstellten Projektordner starten:

```sh
quarto preview
```

Die `.qmd`-Datei bearbeiten und speichern – die Vorschau aktualisiert sich automatisch.

## Vorhandenes Projekt

```sh
quarto add maxkrischeu/presentation
```

In `_quarto.yml` aktivieren:

```yaml
project:
  type: presentation
```

Dann die gewünschte Präsentation starten:

```sh
quarto preview meine-praesentation.qmd
```

## Anpassen

- **`.qmd`**: Titel und Inhalte ändern; `## Überschrift` beginnt eine Folie.
- **`_quarto.yml`**: gemeinsame Einstellungen und Platzhalter für Name, Fach, Schule und Logo.
- **`assets/`**: eigene Bilder, GIFs und Videos ablegen.

Das Template führt mit kleinen Beispielen durch Einblendungen, Aufgabenboxen,
Quiztypen, Bilder, GIFs, Videos, PDF, HTML und die Präsentationswerkzeuge.
Eigene Beispiele liegen in `assets/`; das Online-Video und die Python-Konsole
benötigen Internet. Weitere Optionen stehen in der
[ausführlichen Anleitung](_extensions/presentation/README.md).

## Präsentieren

**→** Weiter · **C** Zeichnen · **B** Tafel · **Enter** Modus verlassen · **?** Tastaturhilfe

Medienbibliothek, Speichern ins Quarto-Dokument und PDF-/ZIP-Export erreichst du
über das Dock und Menü der laufenden Vorschau.

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
- **`_quarto.yml`**: gemeinsame Einstellungen, beispielsweise `lang: de` oder `lang: en`.
- **`assets/`**: eigene Bilder, GIFs und Videos ablegen.

Das Template zeigt Aufgabenboxen und Quizfragen. Weitere Optionen stehen in der
[ausführlichen Anleitung](_extensions/presentation/README.md).

## Präsentieren

**→** Weiter · **C** Zeichnen · **B** Tafel · **Enter** Modus verlassen · **?** Tastaturhilfe

Medienbibliothek, Speichern ins Quarto-Dokument und PDF-/ZIP-Export erreichst du
über das Dock und Menü der laufenden Vorschau.

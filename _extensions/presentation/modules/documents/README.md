# Dokumentvorschau

Ein alleinstehender Markdown-Link mit `.pdf-preview` wird zur PDF.js-Vorschau:

```markdown
## Arbeitsblatt

[](material/arbeitsblatt.pdf){.pdf-preview}
```

Ohne Linktext erscheint automatisch der Dateiname einschließlich `.pdf`.
Leerzeichen und Umlaute in URL-kodierten Dateinamen werden lesbar dargestellt;
URL-Parameter und Seitenanker gehören nicht zum Namen.
Ein eigener Anzeigename steht wie gewohnt in den eckigen Klammern:

```markdown
[Übungen zu Binärzahlen](material/arbeitsblatt.pdf){.pdf-preview}
```

Standardmäßig nutzt das Fenster den restlichen Platz unter der Überschrift.
Optional: `{.pdf-preview height="480px"}`. Höhe umfasst Vorschau und Linkleiste.
Lokale PDFs als Projektressource mitliefern (z. B. `resources: [material/*.pdf]`
in `_quarto.yml`). Externe Server müssen Einbettung erlauben.

PDF.js 6.3.289 wird lokal mitgeliefert, inklusive Worker, Schrift- und CMap-Ressourcen.
Der Viewer liegt in einem separaten iframe, damit Scrollen und Zoom keine
Foliengesten auslösen. Er hat keine schwebende Werkzeugleiste. Trackpad-Pinch
(Safari GestureEvent bzw. Chromium Ctrl+Wheel), Zwei-Finger-Pinch und die
Tasten + / - / 0 im fokussierten Viewer steuern den Zoom (50–500 %).
Nur sichtbare und angrenzende Seiten werden gerendert; Canvas-Auflösung ist
auf 8 Millionen Pixel pro Seite begrenzt. Textauswahl und PDF-Formularbearbeitung
sind in dieser schlanken Vorschau nicht enthalten.

Separat öffnen verwendet weiterhin die native Browseranzeige. Download bleibt
erreichbar, auch wenn PDF.js das Dokument nicht laden kann. Externe PDFs
benötigen CORS-Freigabe; lokale Projektdateien sind der empfohlene Weg.
Beim Folien-PDF-Export bleibt die Linkleiste erhalten; PDF-Seiten werden nicht
automatisch in den Export übernommen.

`Presentation.get('documents').createPreview({url, title, height})` liefert
auch außerhalb der Folien verwendbare Vorschau-Elemente. Bei `lazy: true` wird
statt `src` zunächst `data-src` gesetzt; der Aufrufer aktiviert die Vorschau.
Bei Quarto-Markdown übernimmt das Modul Aktivierung und Größenberechnung.

`viewer/` enthält die PDF.js-Bibliothek sowie unsere drei Viewer-Dateien;
`filter.lua` liefert diese als Quarto-HTML-Abhängigkeit aus. Beim Aktualisieren
der Bibliothek Version, Lizenz und Ressourcenliste gemeinsam aktualisieren.

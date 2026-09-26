"""Session exports: constrained local resources, one snapshot, no source mutations."""
import html
import runpy
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit, quote
import zipfile


ensure_runtime = runpy.run_path(str(Path(__file__).with_name('setup.py')))['ensure_runtime']


def validate_snapshot(data):
    if data.get('kind') not in ('slides', 'chalkboard', 'presentation'):
        raise ValueError('Unknown export type.')
    snapshot = data.get('snapshot', {})
    if not isinstance(snapshot, dict):
        raise ValueError('Invalid session snapshot.')
    if not isinstance(snapshot.get('modules'), dict):
        raise ValueError('Invalid session modules.')
    if snapshot.get('version') != 2 or not isinstance(snapshot.get('modules', {}).get('images', {}).get('slides'), dict):
        raise ValueError('Invalid session snapshot.')
    for name in ('notes', 'boards'):
        pages = snapshot.get('modules', {}).get('drawing', {}).get('drawings', {}).get(name)
        if not isinstance(pages, list) or len(pages) > 2000:
            raise ValueError('Invalid drawing pages.')
        for page in pages:
            if not isinstance(page.get('png'), str) or not page['png'].startswith('data:image/png;base64,'):
                raise ValueError('Invalid drawing image.')
    return snapshot


def package(output, page, snapshot, destination, pdf):
    """Keep relative paths intact, including lazy-loaded plugin resources."""
    output = output.resolve()
    document = page.read_text()
    document = re.sub(r'<div\b[^>]*class="presentation-media-resources"[^>]*>.*?</div>', '', document, flags=re.S)
    used = {item['asset'] for items in snapshot['modules']['images']['slides'].values() for item in items}
    def prune_catalog(match):
        opening, content, closing = match.groups()
        scope_match = re.search(r'data-scope=["\']([^"\']+)', opening)
        scope = scope_match[1] if scope_match else ''
        def keep_image(image):
            identifier = re.search(r'data-asset-id=["\']([^"\']+)', image[0])
            if not identifier: return ''
            identifier = html.unescape(identifier[1])
            return image[0] if any(asset == scope + ':' + identifier or (scope == 'slide' and asset.endswith(':' + identifier)) for asset in used) else ''
        return opening + re.sub(r'<img\b[^>]*>', keep_image, content) + closing
    document = re.sub(r'(<template\b[^>]*class=["\']presentation-assets-source["\'][^>]*>)(.*?)(</template>)', prune_catalog, document, flags=re.S)
    document = re.sub(r'(<template id="presentation-prepared-layout">).*?(</template>)', r'\g<1>{}\2', document, flags=re.S)
    # Session imports may not yet exist in the rendered catalog.
    for entry in snapshot['modules']['images'].get('assets', []):
        if entry.get('id') not in used: continue
        scope, identifier = entry['id'].split(':', 1)
        src = str(entry.get('src', ''))
        parsed = urlsplit(src)
        if parsed.scheme not in ('', 'http', 'https', 'data'): raise ValueError('Invalid media URL.')
        if parsed.scheme == 'data' and not src.startswith(('data:image/', 'data:video/')): raise ValueError('Invalid media data.')
        attrs = {'data-asset-id': identifier, 'data-media-kind': entry.get('kind', 'image'), 'src': src, 'alt': entry.get('label', '')}
        tag = '<img ' + ' '.join(key + '="' + html.escape(str(value), quote=True) + '"' for key, value in attrs.items()) + '>'
        # Put authoritative session entries first; the catalog ignores duplicates.
        catalog = '<template class="presentation-assets-source" data-scope="' + html.escape(scope, quote=True) + '">' + tag + '</template>'
        if scope in ('global', 'lesson'):
            document = document.replace('<body', catalog + '<body', 1)
        else:
            document = re.sub(r'(<section\b[^>]*id="' + re.escape(scope) + r'"[^>]*>)', lambda match: match[0] + catalog.replace('data-scope="' + html.escape(scope, quote=True) + '"', 'data-scope="slide"'), document, count=1)
    files = {page.resolve()}
    for directory in (page.parent / (page.stem + '_files') / 'libs',):
        if directory.is_dir():
            files.update(p.resolve() for p in directory.rglob('*') if p.is_file() and p.resolve().is_relative_to(output))
    # Follow local HTML/CSS resource references outside the conventional folders.
    pending = list(files)
    while pending:
        file = pending.pop()
        if file.suffix not in ('.html', '.css'): continue
        text = document if file == page.resolve() else file.read_text(errors='replace')
        refs = re.findall(r'(?:src|href|poster)=["\']([^"\']+)', text) + re.findall(r'url\(["\']?([^\)"\']+)', text)
        for ref in refs:
            url = urlsplit(html.unescape(ref))
            if url.scheme or url.netloc or not url.path: continue
            path = ((output if url.path.startswith('/') else file.parent) / unquote(url.path).lstrip('/')).resolve()
            if path.is_relative_to(output) and path.is_file() and path not in files:
                files.add(path); pending.append(path)
    document = re.sub(r'(<template id="presentation-source-layout">).*?(</template>)', r'\g<1>{}\2', document, flags=re.S)
    payload = json.dumps(snapshot, ensure_ascii=True).replace('<', '\\u003c')
    document = re.sub(r'(<head[^>]*>)', lambda match: match[0] + '<script>window.__presentationSession=' + payload + ';</script>', document, count=1, flags=re.I)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(files):
            name = file.relative_to(output).as_posix()
            if file == page:
                archive.writestr(name, document)
            else:
                archive.write(file, name)
        archive.write(pdf, page.relative_to(output).with_suffix('.pdf').as_posix())
        archive.writestr('session.json', json.dumps(snapshot, ensure_ascii=False, indent=2))
        archive.writestr('README.txt', 'Presentation snapshot\n\nExtract the entire ZIP. Start a local HTTP server in this folder:\n  python3 -m http.server 8000\nThen open http://localhost:8000/' + page.relative_to(output).as_posix() + '\n\nImages, slide drawings, chalkboards and quiz answers/scores are included.\nThe PDF contains the current slide state with visible drawings and non-empty chalkboard pages after their source slides. Quiz results are excluded.\nPython kernels and other running processes are not serializable; Python starts a new session.\nPython packages and externally linked content still require internet access.\nThe source QMD is not modified or included.\nAdvanced session exports and Save to Source require the original project preview server.\n')


def export_session(root, page, data, port, output=None):
    output = Path(output or root / '_output').resolve()
    snapshot = validate_snapshot(data)
    kind = data['kind']
    ensure_runtime()
    options = data.get('options', {})
    if kind == 'presentation':
        options = dict(content='current', images=True, drawings=True, hidden=False, boards=True)
    with tempfile.TemporaryDirectory(prefix='presentation-export-') as directory:
        pdf = Path(directory) / 'export.pdf'
        request = dict(url=f'http://127.0.0.1:{port}/'+quote(page.relative_to(output).as_posix()), destination=str(pdf), kind='slides' if kind == 'presentation' else kind, snapshot=snapshot, options=options)
        result = subprocess.run(['node', str(Path(__file__).with_name('worker.cjs'))], input=json.dumps(request), text=True, capture_output=True, cwd=root, timeout=120)
        if result.returncode:
            raise ValueError(result.stderr.strip()[-1000:] or 'Export failed.')
        if kind == 'presentation':
            archive = Path(directory) / 'presentation.zip'
            package(output, page, snapshot, archive, pdf)
            return archive.read_bytes(), 'application/zip'
        return pdf.read_bytes(), 'application/pdf'


REQUEST_LIMIT = 64000000

def handle(root, output, page, data, port):
    match = re.search(r'<template id="presentation-source-layout">(.*?)</template>', page.read_text(), re.S)
    if not match:
        raise ValueError('Render this presentation before exporting.')
    revision = json.loads(html.unescape(match[1])).get('revision')
    if data.get('snapshot', {}).get('modules', {}).get('images', {}).get('revision') != revision:
        raise ValueError('The presentation was rendered again. Reload it before exporting.')
    return export_session(root, page, data, port, output)

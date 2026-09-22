"""Local asset discovery and clipboard/file import; paths are project constrained."""
import base64
import hashlib
import html
import json
import mimetypes
import re
from pathlib import Path
import sys

REQUEST_LIMIT = 18 * 1024 * 1024
EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.avif'}

def scan(root, source, embed=False):
    root, source = Path(root).resolve(), Path(source).resolve()
    folders = [('global', root / 'assets')]
    if source.parent != root:
        folders.append(('lesson', source.parent / 'assets'))
    result = []
    import os
    for scope, folder in folders:
        if not folder.is_dir(): continue
        for path in sorted(folder.rglob('*')):
            if path.suffix.lower() not in EXTENSIONS or not path.is_file(): continue
            if any(part.startswith('.') for part in path.relative_to(folder).parts): continue
            if not path.resolve().is_relative_to(root): continue
            relative = Path(os.path.relpath(path, source.parent)).as_posix()
            entry = dict(scope=scope, id='file:' + relative, src=relative,
                         label=re.sub(r'[-_]+', ' ', path.stem))
            if embed:
                if path.stat().st_size > 12 * 1024 * 1024: continue
                mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
                entry['data'] = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()
            result.append(entry)
    return result

def resolve_source(root, output, page):
    match = re.search(r'<template id="presentation-source-layout">(.*?)</template>', page.read_text(), re.S)
    if not match: raise ValueError('No editable source document.')
    source = Path(json.loads(html.unescape(match[1]))['file'])
    if not source.is_absolute(): source = root / page.relative_to(output).parent / source
    source = source.resolve()
    if not source.is_relative_to(root) or source.suffix != '.qmd' or not source.is_file():
        raise ValueError('Source is outside this project.')
    return source

def handle(root, output, page, data, port):
    source = resolve_source(root, output, page)
    if data.get('action') == 'list':
        return {'assets': scan(root, source, True)}
    if data.get('action') != 'import': raise ValueError('Unknown asset operation.')
    # Browser normalizes imported images to PNG before upload; no executable SVG.
    raw = base64.b64decode(data.get('bytes', ''), validate=True)
    if not raw.startswith(b'\x89PNG\r\n\x1a\n') or len(raw) > 12 * 1024 * 1024:
        raise ValueError('Expected a PNG image up to 12 MB.')
    folder = source.parent / 'assets'
    if not folder.resolve().is_relative_to(root): raise ValueError('Invalid assets folder.')
    folder.mkdir(exist_ok=True)
    name = re.sub(r'[^\w-]+', '-', Path(str(data.get('name', 'image'))).stem).strip('-')[:60] or 'image'
    target = folder / (name + '-' + hashlib.sha256(raw).hexdigest()[:12] + '.png')
    if not target.resolve().is_relative_to(root): raise ValueError('Invalid image path.')
    if target.exists():
        if target.read_bytes() != raw: raise ValueError('Image name collision.')
    else:
        with target.open('xb') as file: file.write(raw)
    asset = next(item for item in scan(root, source, True) if item['src'] == 'assets/' + target.name)
    return {'asset': asset}

if __name__ == '__main__':
    print(json.dumps(scan(sys.argv[1], sys.argv[2]), ensure_ascii=False))

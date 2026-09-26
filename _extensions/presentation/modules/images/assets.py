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
EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.avif', '.mp4', '.webm', '.m4v'}

def scan(root, source, embed=False, folders=None):
    root, source = Path(root).resolve(), Path(source).resolve()
    configured = ['assets'] if folders is None else folders
    if not isinstance(configured, list) or any(not isinstance(folder, str) or not folder for folder in configured):
        raise ValueError('Media folders must be a list of project-relative paths.')
    locations = []
    for folder in configured:
        path = (root / folder).resolve()
        if Path(folder).is_absolute() or not path.is_relative_to(root):
            raise ValueError('Media folders must stay inside the project.')
        locations.append(('global', path))
    if source.parent != root:
        locations.append(('lesson', source.parent / 'assets'))
    result = []
    import os
    seen = set()
    for scope, folder in locations:
        if not folder.is_dir(): continue
        for path in sorted(folder.rglob('*')):
            if path.resolve() in seen: continue
            if path.suffix.lower() not in EXTENSIONS or not path.is_file(): continue
            if any(part.startswith('.') for part in path.relative_to(folder).parts): continue
            if not path.resolve().is_relative_to(root): continue
            seen.add(path.resolve())
            relative = Path(os.path.relpath(path, source.parent)).as_posix()
            entry = dict(scope=scope, id='file:' + relative, src=relative,
                         label=re.sub(r'[-_]+', ' ', path.stem), kind='video' if path.suffix.lower() in {'.mp4', '.webm', '.m4v'} else 'image')
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
        match = re.search(r'<template id="presentation-source-layout">(.*?)</template>', page.read_text(), re.S)
        metadata = json.loads(html.unescape(match[1])) if match else {}
        entries = scan(root, source, folders=[] if metadata.get('mediaFoldersEmpty') else metadata.get('mediaFolders'))
        # New files must also be reachable when Quarto uses an output directory.
        import shutil
        for entry in entries:
            original = (source.parent / entry['src']).resolve()
            destination = (page.parent / entry['src']).resolve()
            if not destination.is_relative_to(output.resolve()): continue
            if original != destination:
                destination.parent.mkdir(parents=True, exist_ok=True)
                if not destination.exists() or original.stat().st_mtime_ns > destination.stat().st_mtime_ns:
                    shutil.copy2(original, destination)
        return {'assets': entries}
    if data.get('action') != 'import': raise ValueError('Unknown asset operation.')
    # Preserve GIF/video bytes; other imported images arrive as PNG. Reject executable SVG.
    raw = base64.b64decode(data.get('bytes', ''), validate=True)
    extension = ('.png' if raw.startswith(b'\x89PNG\r\n\x1a\n') else
                 '.gif' if raw.startswith((b'GIF87a', b'GIF89a')) else
                 '.mp4' if len(raw) > 12 and raw[4:8] == b'ftyp' else
                 '.webm' if raw.startswith(b'\x1a\x45\xdf\xa3') else None)
    if extension is None or len(raw) > 12 * 1024 * 1024:
        raise ValueError('Expected PNG, GIF, MP4 or WebM up to 12 MB.')
    folder = source.parent / 'assets'
    if not folder.resolve().is_relative_to(root): raise ValueError('Invalid assets folder.')
    folder.mkdir(exist_ok=True)
    name = re.sub(r'[^\w-]+', '-', Path(str(data.get('name', 'image'))).stem).strip('-')[:60] or 'image'
    target = folder / (name + '-' + hashlib.sha256(raw).hexdigest()[:12] + extension)
    if not target.resolve().is_relative_to(root): raise ValueError('Invalid image path.')
    if target.exists():
        if target.read_bytes() != raw: raise ValueError('Image name collision.')
    else:
        with target.open('xb') as file: file.write(raw)
    asset = next(item for item in scan(root, source, True) if item['src'] == 'assets/' + target.name)
    return {'asset': asset}

if __name__ == '__main__':
    print(json.dumps(scan(sys.argv[1], sys.argv[2], folders=json.loads(sys.argv[3]) if len(sys.argv)>3 else None), ensure_ascii=False))

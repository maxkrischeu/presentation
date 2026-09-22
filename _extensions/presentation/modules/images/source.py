"""Narrow, conflict-checked QMD image-layout writer used by the local preview."""
import html
import hashlib
import json
import math
import re
import secrets
import shlex
import threading
from pathlib import Path

LOCK = threading.Lock()
LAYOUT = re.compile(r'^```\{\.(presentation-image-layout|image-layout)\}\r?\n(.*?)^```[ \t]*\r?$', re.M | re.S)


def revision(data):
    return hashlib.sha1(data).hexdigest()


def headings(text):
    """Locate top-level ATX headings; never match code, front matter or comments."""
    result, offset, fence, yaml, comment = [], 0, None, False, False
    for n, line in enumerate(text.splitlines(keepends=True)):
        stripped = line.strip()
        if n == 0 and stripped == '---':
            yaml = True
        elif yaml:
            if stripped in ('---', '...'):
                yaml = False
        elif comment:
            if '-->' in line:
                comment = False
        elif '<!--' in line:
            comment = '-->' not in line
        elif fence:
            if re.match(r'^ {0,3}' + re.escape(fence[0]) + '{' + str(fence[1]) + r',}\s*$', line):
                fence = None
        else:
            f = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
            if f:
                fence = (f[1][0], len(f[1]))
            elif re.match(r'^#{1,6}\s+\S', line):
                result.append((offset, offset + len(line), line))
        offset += len(line)
    return result



def layout_blocks(text):
    """Only managed fences, never a layout example nested in a larger code fence."""
    offset, fence, start, managed, yaml, comment = 0, None, 0, False, False, False
    placed = None
    for n, line in enumerate(text.splitlines(keepends=True)):
        stripped = line.strip()
        if n == 0 and stripped == '---':
            yaml = True
        elif yaml:
            if stripped in ('---', '...'):
                yaml = False
        elif fence:
            if re.match(r'^ {0,3}' + re.escape(fence[0]) + '{' + str(fence[1]) + r',}\s*$', line):
                if managed:
                    match = LAYOUT.match(text, start, offset+len(line))
                    if not match:
                        raise ValueError('Use a standard ```{.image-layout} fence for source editing.')
                    yield (match[1], match.start(), match.end(), match[2])
                fence = None
        elif placed is not None:
            if re.fullmatch(r' {0,3}:{3,}[ \t]*', line.rstrip('\r\n')):
                yield ('placed-image', placed, offset + len(line.rstrip('\r\n')), '')
                placed = None
            elif stripped:
                raise ValueError('placed-image blocks must be empty for source editing.')
        elif comment:
            if '-->' in line:
                comment = False
        elif '<!--' in line:
            comment = '-->' not in line
        else:
            div = re.fullmatch(r' {0,3}:{3,}[ \t]*\{([^\n]*)\}[ \t]*', line.rstrip('\r\n'))
            if div:
                try:
                    attributes = shlex.split(div[1])
                except ValueError:
                    attributes = []
                if '.placed-image' in attributes:
                    placed = offset
            opening = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)', line)
            if opening:
                fence = (opening[1][0], len(opening[1]))
                start = offset
                managed = bool(re.search(r'\.(?:presentation-image-layout|image-layout)(?:[ }]|$)', opening[2]))
        offset += len(line)
    if placed is not None:
        raise ValueError('Unclosed placed-image block.')
    if fence and managed:
        raise ValueError('Unclosed image-layout block.')


def clean_items(items, slide):
    if not isinstance(items, list) or len(items) > 2000:
        raise ValueError('Invalid image list.')
    clean = []
    for item in items:
        asset = item.get('asset', '')
        if not isinstance(asset, str) or not (asset.startswith(('global:', 'lesson:')) or asset.startswith(slide + ':')):
            raise ValueError('Invalid image reference.')
        nums = {k: item.get(k) for k in ('x', 'y', 'w', 'h')}
        if any(type(v) not in (int, float) or not math.isfinite(v) for v in nums.values()):
            raise ValueError('Invalid image coordinates.')
        if not (0 < nums['w'] <= 1 and 0 < nums['h'] <= 1 and -1 <= nums['x'] <= 1 and -1 <= nums['y'] <= 1):
            raise ValueError('Images must remain inside the content area.')
        layer, rotation = item.get('layer', 1), item.get('rotation', 0)
        if type(layer) is not int or not 0 <= layer <= 1000000:
            raise ValueError('Invalid image layer.')
        if type(rotation) not in (int, float) or not math.isfinite(rotation):
            raise ValueError('Invalid image rotation.')
        transparency = item.get('transparency', 0)
        if type(transparency) not in (int, float) or not math.isfinite(transparency) or not 0 <= transparency <= 100:
            raise ValueError('Invalid image transparency.')
        reference = item.get('reference', asset.split(':', 1)[1])
        if reference not in (asset, asset.split(':', 1)[1]):
            raise ValueError('Invalid source reference.')
        clean.append(dict(asset=asset, reference=reference, transparency=transparency, layer=layer, rotation=(rotation+180)%360-180, **nums))
        if 'height' in item:
            clean[-1]['height'] = nums['h']*100
    return clean


def save_layout(path, expected, index, slide, items, count):
    with LOCK:
        raw = path.read_bytes()
        if revision(raw) != expected:
            raise ValueError('Source changed since rendering. Render and reload before saving.')
        text = raw.decode('utf-8')
        lines = headings(text)
        if len(lines) != count:
            raise ValueError('This heading syntax cannot be mapped safely. Use ATX headings (# / ##) and render again.')
        if not isinstance(slide, str) or not re.fullmatch(r'[\w:.-]+', slide):
            raise ValueError('Invalid slide ID.')
        clean = clean_items(items, slide)
        new_id = slide
        newline = '\r\n' if '\r\n' in text else '\n'
        if index == 0:
            if slide != 'title-slide':
                raise ValueError('Only the title slide can use source index zero.')
            insertion = lines[0][0] if lines else len(text)
        else:
            if type(index) is not int or not 1 <= index <= len(lines):
                raise ValueError('Source heading not found.')
            start, end, line = lines[index-1]
            attr = re.search(r'\{([^{}]*)\}\s*$', line.rstrip())
            explicit = re.search(r'(?:^|\s)#([^\s}]+)', attr[1]) if attr else None
            if explicit:
                if explicit[1] != slide:
                    raise ValueError('Slide ID no longer matches the source.')
            else:
                new_id = 'slide-' + secrets.token_hex(5)
                if attr:
                    updated = line[:attr.start()+1] + '#' + new_id + ' ' + line[attr.start()+1:]
                else:
                    # Remove optional closing ATX markers before appending attributes.
                    updated = re.sub(r'\s+#+\s*$', '', line.rstrip()) + ' {#' + new_id + '}' + newline
                text = text[:start] + updated + text[end:]
                end = start + len(updated)
            insertion = end
        for item in clean:
            if item['asset'].startswith(slide + ':'):
                item['asset'] = new_id + item['asset'][len(slide):]
                if item['reference'].startswith(slide + ':'):
                    item['reference'] = new_id + item['reference'][len(slide):]
        def number(value):
            return f'{value:.2f}'.rstrip('0').rstrip('.') or '0'
        entries = []
        for item in clean:
            reference = item['reference']
            # HTML entities survive Pandoc attribute parsing, including quotes,
            # ampersands and newlines in asset IDs, without creating extra blocks.
            def attribute(key, value):
                escaped = html.escape(str(value), quote=True).replace('\n', '&#10;').replace('\r', '&#13;')
                return key + '="' + escaped + '"'
            entry = [attribute('asset', reference), attribute('x', number(item['x']*100)), attribute('y', number(item['y']*100))]
            if abs(item['w']-.25) > .000001:
                entry.append(attribute('width', number(item['w']*100)))
            if 'height' in item:
                entry.append(attribute('height', number(item['height'])))
            if item['layer'] != 1:
                entry.append(attribute('layer', item['layer']))
            if abs(item['rotation']) > .005:
                entry.append(attribute('rotation', number(item['rotation'])))
            if item['transparency'] != 0:
                entry.append(attribute('transparency', number(item['transparency'])))
            entries.append('::: {.placed-image ' + ' '.join(entry) + '}' + newline + ':::')
        block = (newline + newline).join(entries)
        # The friendly block belongs to its surrounding slide. Legacy JSON retains
        # its explicit target until this save migrates it to that slide's section.
        mapped = headings(text)
        lower = mapped[index-1][1] if index else 0
        upper = next((start for start, _, line in mapped[index:] if re.match(r'^#{1,2}\s',line)),len(text)) if index else (mapped[0][0] if mapped else len(text))
        matches = []
        for kind, start, end, payload in layout_blocks(text):
            if kind == 'presentation-image-layout':
                if json.loads(payload).get('slide') == slide:
                    matches.append((kind, start, end))
            elif lower <= start < upper:
                matches.append((kind, start, end))
        legacy = [m for m in matches if m[0] != 'placed-image']
        if len(legacy) > 1 or (legacy and len(matches) > 1):
            raise ValueError('Duplicate image layout blocks for this slide.')
        # Replace each native block in place, preserving text between images.
        # Extra new images are appended at the last existing placement.
        if matches:
            remaining = list(entries)
            replacements = []
            for kind, start, end in matches:
                if kind == 'placed-image':
                    value = remaining.pop(0) if remaining else ''
                    if (kind, start, end) == matches[-1] and remaining:
                        value += newline + newline + (newline + newline).join(remaining)
                    replacements.append((start, end, value))
                elif lower <= start < upper:
                    replacements.append((start, end, block))
                else:
                    replacements.append((start, end, ''))
                    replacements.append((insertion, insertion, newline + block + newline))
            for start, end, value in sorted(replacements, reverse=True):
                text = text[:start] + value + text[end:]
        elif block:
            text = text[:insertion] + newline + block + newline + text[insertion:]
        # Keep an exact recoverable copy; replace atomically after conflict validation.
        path.with_suffix(path.suffix + '.layout-backup').write_bytes(raw)
        temporary = path.with_name('.' + path.name + '.layout-tmp')
        try:
            temporary.write_bytes(text.encode('utf-8'))
            if path.read_bytes() != raw:
                raise ValueError('Source changed while saving. Nothing was overwritten.')
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
        return dict(revision=revision(text.encode('utf-8')), slide=new_id, images=clean)


def handle(root, output, page, data, port):
    """Resolve a rendered source reference before the atomic layout update."""
    import html
    match = re.search(r'<template id="presentation-source-layout">(.*?)</template>', page.read_text(), re.S)
    if not match:
        raise ValueError('Render this presentation before saving to source.')
    source = json.loads(html.unescape(match[1]))
    path = Path(source['file'])
    if not path.is_absolute():
        path = root / page.relative_to(output).parent / path
    path = path.resolve()
    if not path.is_relative_to(root) or path.suffix != '.qmd' or (output != root and path.is_relative_to(output)):
        raise ValueError('Source is outside this project.')
    return save_layout(path, data['revision'], data['index'], data['slide'], data['images'], source['headings'])

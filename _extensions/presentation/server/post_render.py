"""Publish successful render completion; PDF export is explicitly requested."""
from pathlib import Path
import json
import os
import uuid
import hashlib
import subprocess
import sys

output = Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', Path.cwd())).resolve()
# Finish a changed input before publishing a live-reload revision. This is
# sequential: the outer Quarto job is waiting in its post-render hook.
try:
    inputs = json.loads((output / '.presentation-inputs.json').read_text())
except (OSError, ValueError):
    inputs = {}
changed = [name for name, digest in inputs.items()
           if Path(name).is_file() and hashlib.sha256(Path(name).read_bytes()).hexdigest() != digest]
if changed:
    attempt = int(os.environ.get('PRESENTATION_RENDER_RETRY', '0'))
    if attempt >= 3:
        raise SystemExit('Presentation: source kept changing during rendering. Please save again after editing.')
    print('Presentation: applying changes made during rendering.', flush=True)
    env = dict(os.environ, PRESENTATION_RENDER_RETRY=str(attempt + 1))
    for name in changed:
        result = subprocess.run(['quarto', 'render', name, '--quiet'], env=env)
        if result.returncode:
            sys.exit(result.returncode)
    # The nested completed render published its revision already.
    sys.exit(0)

list_file = os.environ.get('QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES')
files = (Path(list_file).read_text() if list_file else os.environ.get('QUARTO_PROJECT_OUTPUT_FILES', '')).splitlines()
marker = output / '.presentation-render.json'
try:
    revisions = json.loads(marker.read_text())
except (OSError, ValueError):
    revisions = {}
for name in files:
    page = Path(name).resolve()
    if page.suffix == '.html' and page.is_relative_to(output) and page.is_file():
        revisions[page.relative_to(output).as_posix()] = uuid.uuid4().hex
output.mkdir(parents=True, exist_ok=True)
temporary = marker.with_suffix('.tmp')
temporary.write_text(json.dumps(revisions))
temporary.replace(marker)

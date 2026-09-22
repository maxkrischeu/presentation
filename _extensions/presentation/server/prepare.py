"""Create the preview entry point inside Quarto's actual output directory."""
import os
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parents[1] / 'core/build.py'), run_name='__main__')

root = Path(os.environ.get('QUARTO_PROJECT_DIR', Path.cwd())).resolve()
output = Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', root)).resolve()
output.mkdir(parents=True, exist_ok=True)
service = Path(__file__).with_name('preview.py').resolve()
launcher = 'import os, runpy\n'
for key, value in [('QUARTO_PROJECT_DIR', root), ('PRESENTATION_OUTPUT_DIR', output)]:
    launcher += f'os.environ[{key!r}] = {str(value)!r}\n'
launcher += f'runpy.run_path({str(service)!r}, run_name="__main__")\n'
(output / '.presentation-preview.py').write_text(launcher)

# Quarto can consume a source change during rendering but record its *new* hash
# as already rendered. Preserve the input revision to detect that lost update.
import hashlib
import json
input_list = os.environ.get('QUARTO_USE_FILE_FOR_PROJECT_INPUT_FILES')
inputs = (Path(input_list).read_text() if input_list else os.environ.get('QUARTO_PROJECT_INPUT_FILES', '')).splitlines()
revisions = {}
for name in inputs:
    path = Path(name).resolve()
    if path.is_relative_to(root) and path.is_file():
        revisions[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
(output / '.presentation-inputs.json').write_text(json.dumps(revisions))

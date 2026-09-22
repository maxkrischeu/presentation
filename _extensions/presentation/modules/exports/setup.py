"""Install locked export dependencies on first use, never during rendering."""
from pathlib import Path
import shutil
import subprocess
import threading

_LOCK = threading.Lock()
_EXTENSION = Path(__file__).resolve().parents[2]
_PROBE = """
const fs = require('node:fs');
if (Number(process.versions.node.split('.')[0]) < 20) process.exit(2);
const expected = require('./package.json').dependencies;
for (const [name, version] of Object.entries(expected)) {
  if (require(name + '/package.json').version !== version) process.exit(1);
}
if (!fs.existsSync(require('playwright').chromium.executablePath())) process.exit(1);
"""


def ensure_runtime():
    with _LOCK:
        if not shutil.which('node'):
            raise ValueError('PDF export requires Node.js 20 or newer. Install Node.js and restart quarto preview.')
        probe = subprocess.run(['node', '-e', _PROBE], cwd=_EXTENSION, capture_output=True, timeout=30)
        if probe.returncode == 0:
            return
        if probe.returncode == 2:
            raise ValueError('PDF export requires Node.js 20 or newer. Update Node.js and restart quarto preview.')
        if not shutil.which('npm'):
            raise ValueError('PDF export requires npm. Install Node.js with npm and restart quarto preview.')
        print('Presentation: preparing PDF export (first use). Downloading dependencies and Chromium…', flush=True)
        for command in ([shutil.which('npm'), 'ci', '--ignore-scripts', '--no-audit', '--no-fund'],
                        [shutil.which('node'), 'node_modules/playwright/cli.js', 'install', 'chromium']):
            try:
                result = subprocess.run(command, cwd=_EXTENSION, capture_output=True, text=True, timeout=600)
            except subprocess.TimeoutExpired as exc:
                raise ValueError('Export setup timed out. Check your internet connection and try exporting again.') from exc
            if result.returncode:
                raise ValueError('Export setup failed. Check your internet connection and try again.\n' + result.stderr[-1200:])
        print('Presentation: PDF export is ready.', flush=True)

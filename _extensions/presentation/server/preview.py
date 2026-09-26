"""Local Quarto preview transport for module-owned services."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs, quote
import argparse
import os
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import html
import hashlib
import json
import re
import secrets
from services import services
import subprocess
import threading

MUTATION_LOCK = threading.Lock()

ROOT = Path(os.environ.get('QUARTO_PROJECT_DIR', Path.cwd())).resolve()
OUTPUT = Path(os.environ.get('PRESENTATION_OUTPUT_DIR', ROOT)).resolve()
TOKEN = secrets.token_urlsafe(32)

def page_revision(page):
    """Only publish completed renders, never intermediate HTML/assets."""
    try:
        revisions = json.loads((OUTPUT / '.presentation-render.json').read_text())
        revision = revisions.get(page.relative_to(OUTPUT).as_posix())
        if revision:
            return revision
    except (OSError, ValueError):
        pass
    # Compatibility for output produced before completion markers existed.
    content = page.read_bytes()
    digest = hashlib.sha256(content)
    output = OUTPUT
    for ref in re.findall(r'(?:src|href)=["\']([^"\']+)', content.decode(errors='replace')):
        url = urlsplit(html.unescape(ref))
        if url.scheme or url.netloc or not url.path:
            continue
        resource = ((output if url.path.startswith('/') else page.parent) / unquote(url.path).lstrip('/')).resolve()
        if resource.is_relative_to(output) and resource.is_file():
            stat = resource.stat()
            digest.update(f'{resource}:{stat.st_mtime_ns}:{stat.st_size}'.encode())
    return digest.hexdigest()

class Handler(SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            # Browsers cancel downloads when navigating, reloading or seeking.
            # The connection is gone; do not attempt to send an error response.
            self.close_connection = True

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def local_request(self):
        host = self.headers.get('Host', '')
        allowed = {f'{name}:{self.server.server_port}' for name in ('127.0.0.1', 'localhost')}
        return host in allowed and self.headers.get('Origin', 'http://' + host) == 'http://' + host

    def do_GET(self):
        url = urlsplit(self.path)
        output = OUTPUT
        if url.path == '/favicon.ico' and not (output / 'favicon.ico').is_file():
            self.send_response(204)
            self.end_headers()
            return
        if url.path == '/__presentation/revision':
            page = (output / unquote(parse_qs(url.query).get('page', [''])[0]).lstrip('/')).resolve()
            if not page.is_relative_to(output) or page.suffix != '.html' or not page.is_file():
                return self.respond(404, {'error': 'Unknown presentation.'})
            return self.respond(200, {'revision': page_revision(page)})
        if url.path == '/':
            try:
                registered = json.loads((output / '.presentation-render.json').read_text())
                pages = [(output / name).resolve() for name in registered]
                pages = [p for p in pages if p.is_relative_to(output) and p.is_file()]
            except (OSError, ValueError):
                pages = [p for p in output.rglob('*.html') if '_files' not in p.relative_to(output).as_posix() and '_extensions' not in p.parts]
            if pages:
                page = max(pages, key=lambda p: p.stat().st_mtime_ns)
                self.send_response(302)
                self.send_header('Location', '/' + quote(page.relative_to(output).as_posix()))
                self.end_headers()
                return
        if self.path == '/__presentation/source':
            if not self.local_request():
                return self.respond(403, {'error': 'Local preview only.'})
            return self.respond(200, {'token': TOKEN, 'liveReload': self.server.live_reload})
        page = (output / unquote(url.path).lstrip('/')).resolve()
        relative = page.relative_to(output) if page.is_relative_to(output) else None
        if relative is None or any(part.startswith('.') or part == 'node_modules' for part in relative.parts) or page.suffix in ('.qmd', '.py', '.yml', '.yaml', '.toml'):
            return self.respond(403, {'error': 'Source files are not served.'})
        if self.server.live_reload and page.is_relative_to(output) and page.suffix == '.html' and page.is_file():
            document = page.read_text()
            revision = page_revision(page)
            script = '''<script>
(() => {
  if (new URLSearchParams(location.search).has('print-pdf')) return;
  const revision = REVISION;
  async function check() {
    try {
      const response = await fetch('/__presentation/revision?page=' + encodeURIComponent(location.pathname), {cache:'no-store'});
      if (response.ok && (await response.json()).revision !== revision) { location.reload(); return; }
    } catch (_) {}
    setTimeout(check, 1000);
  }
  setTimeout(check, 1000);
})();
</script>'''.replace('REVISION', json.dumps(revision))
            body = document.replace('</body>', script + '</body>').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, format, *args):
        # Successful asset loads and polling are normal, not useful diagnostics.
        if os.environ.get('PRESENTATION_DEBUG') == '1' or (len(args) > 1 and str(args[1]).isdigit() and int(args[1]) >= 400):
            super().log_message(format, *args)

    def do_POST(self):
        if self.path not in services or not self.local_request() or self.headers.get('X-Presentation-Token') != TOKEN:
            return self.respond(403, {'error': 'Local preview only.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= services[self.path]['limit']:
                raise ValueError('Invalid request size.')
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Expected a request object.')
            output = OUTPUT
            page = (output / unquote(urlsplit(data['page']).path).lstrip('/')).resolve()
            if not page.is_relative_to(output) or page.suffix != '.html':
                raise ValueError('Invalid preview document.')
            handler = services[urlsplit(self.path).path]['handle']
            if not MUTATION_LOCK.acquire(blocking=False):
                return self.respond(409, {'error': 'Another operation is running. Please try again shortly.'})
            try:
                result = handler(ROOT, OUTPUT, page, data, self.server.server_port)
            finally:
                MUTATION_LOCK.release()
            if isinstance(result, tuple):
                body, mime = result
                self.send_response(200)
                self.send_header('Content-Type', mime)
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            return self.respond(200, result)
        except (ValueError, KeyError, OSError, TypeError, subprocess.TimeoutExpired) as error:
            return self.respond(409, {'error': str(error)})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--live-reload', action='store_true')
    args = parser.parse_args()
    handler = partial(Handler, directory=str(OUTPUT))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    server.live_reload = args.live_reload
    print(f'Presentation preview ready: http://127.0.0.1:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

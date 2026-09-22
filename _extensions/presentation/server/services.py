"""Discover module-owned HTTP handlers. Only declared files inside a module load."""
import importlib.util
import json
from pathlib import Path

services = {}
root = Path(__file__).resolve().parents[1]
for manifest in sorted((root / 'modules').glob('*/module.json')):
    module = json.loads(manifest.read_text())
    for name, relative in module.get('server', {}).items():
        path = (manifest.parent / relative).resolve()
        if not path.is_relative_to(manifest.parent.resolve()) or not path.is_file():
            raise ValueError(f'Invalid module service: {path}')
        spec = importlib.util.spec_from_file_location(f"presentation_{module['id']}_{name}", path)
        implementation = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(implementation)
        endpoint = '/__presentation/' + name
        if endpoint in services:
            raise ValueError(f'Duplicate endpoint: {endpoint}')
        services[endpoint] = {'handle': implementation.handle, 'limit': getattr(implementation, 'REQUEST_LIMIT', 1000000)}

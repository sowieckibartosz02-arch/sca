"""Validate application modules and the complete pinned local library graph."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess

root=Path(__file__).resolve().parents[1]
node=shutil.which('node')
assert node, 'Node.js is required only for this development check'
count=0
for folder in ['01-realistic-pbr','02-painterly']:
    base=root/folder
    html=(base/'index.html').read_text()
    ids=set(re.findall(r'\bid="([^"]+)"',html))
    importmap=json.loads(re.search(r'<script type="importmap">(.*?)</script>',html,re.S).group(1))['imports']
    assert importmap['three']=='./vendor/three/build/three.module.js'
    assert importmap['three/addons/']=='./vendor/three/examples/jsm/'
    for path in (base/'src').glob('*.js'):
        subprocess.run([node,'--check',str(path)],check=True)
        source=path.read_text()
        for imported in re.findall(r"(?:from\s+|import\s*)['\"]([^'\"]+)['\"]",source):
            if imported.startswith('.'):
                resolved=path.parent/imported
            elif imported=='three':
                resolved=base/importmap['three']
            elif imported.startswith('three/addons/'):
                resolved=base/importmap['three/addons/']/imported.removeprefix('three/addons/')
            else:
                raise AssertionError((path,imported))
            assert resolved.is_file(), (path,imported)
        for dom_id in re.findall(r"\$\('([^']+)'\)|getElementById\('([^']+)'\)",source):
            assert next(filter(None,dom_id)) in ids, (path,dom_id)
        assert not re.search(r'\bTODO\b|rest of code here',source)
        count+=1
    vendor=base/'vendor/three'
    manifest=json.loads((vendor/'manifest.json').read_text())
    assert manifest['version']=='0.170.0' and manifest['integrity'].startswith('sha512-')
    for name,digest in manifest['files'].items():
        assert hashlib.sha256((vendor/name).read_bytes()).hexdigest()==digest,(folder,name)
    for url in re.findall(r'(?:src|href)="([^\"]+)"',html):
        if not url.startswith(('https:','data:','#')):
            assert (base/url).is_file(),url
    assert len((base/'ENGINE_API.md').read_text().splitlines())<=120
print(f'PASS: {count} application modules; imports, DOM, HTML assets, API limits, local importmaps and vendored SHA-256 manifests')

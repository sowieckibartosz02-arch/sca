"""Check local imports, HTML references, DOM bindings, syntax and API line limits."""
from pathlib import Path
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
    for path in base.rglob('*.js'):
        subprocess.run([node,'--check',str(path)],check=True)
        source=path.read_text()
        for imported in re.findall(r"(?:from\s+|import\s*)['\"]([^'\"]+)['\"]",source):
            if imported.startswith('.'):
                assert (path.parent/imported).is_file(), (path,imported)
            else:
                assert imported=='three' or imported.startswith('three/addons/'), imported
        for dom_id in re.findall(r"\$\('([^']+)'\)|getElementById\('([^']+)'\)",source):
            assert next(filter(None,dom_id)) in ids, (path,dom_id)
        assert not re.search(r'\bTODO\b|rest of code here',source)
        count+=1
    for url in re.findall(r'(?:src|href)="([^\"]+)"',html):
        if not url.startswith(('https:','data:','#')):
            assert (base/url).is_file(),url
    assert len((base/'ENGINE_API.md').read_text().splitlines())<=120
    assert 'three@0.170.0' in html and 'type="importmap"' in html
print(f'PASS: {count} JS modules; local imports, DOM references, HTML assets, API limits and pinned importmaps')

"""Package a standalone release, excluding repository metadata and older archives."""
from pathlib import Path
import hashlib
import shutil
import zipfile

ROOT=Path(__file__).resolve().parents[1]
RELEASES=ROOT/'releases'
RELEASES.mkdir(exist_ok=True)
DESTINATION=RELEASES/'afterimage-phase-1-v2.zip'
with zipfile.ZipFile(DESTINATION,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for path in sorted(ROOT.rglob('*')):
        relative=path.relative_to(ROOT)
        if not path.is_file() or any(part in {'.git','releases','__pycache__'} for part in relative.parts):continue
        if path.suffix in {'.log','.pyc'}:continue
        if 'artifacts' in relative.parts and path.suffix!='.json':continue
        archive.write(path,Path('afterimage-phase-1-v2')/relative)
with zipfile.ZipFile(DESTINATION) as archive:
    assert archive.testzip() is None
    files=set(archive.namelist())
    for folder in ['01-realistic-pbr','02-painterly']:
        for filename in ['index.html','src/bootstrap.js','src/main.js','src/decor.js','vendor/three/build/three.module.js','vendor/three/LICENSE','vendor/three/manifest.json']:
            assert f'afterimage-phase-1-v2/{folder}/{filename}' in files
shutil.copyfile(DESTINATION,RELEASES/'afterimage-phase-1.zip')
(RELEASES/'afterimage-phase-1-v2.sha256').write_text(hashlib.sha256(DESTINATION.read_bytes()).hexdigest()+'  '+DESTINATION.name+'\n')
print(f'{DESTINATION.name}: {DESTINATION.stat().st_size} bytes; ZIP CRC and required local modules passed')

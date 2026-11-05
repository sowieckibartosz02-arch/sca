"""Package the pinned official Three.js module graph without npm or a build.

This optional maintenance script verifies the npm registry's SHA-512 integrity
before copying dependencies. The games themselves never contact the registry.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import posixpath
from pathlib import Path
import re
import tarfile
import urllib.request

VERSION = "0.170.0"
ROOT = Path(__file__).resolve().parents[1]
ENGINES = ("01-realistic-pbr", "02-painterly")


def request(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def dependencies(source: str):
    # The official graph uses static relative imports plus the bare `three` name.
    source = re.sub(r"/\*[\s\S]*?\*/", "", source)
    pattern = r"(?m)^\s*(?:import\s+(?:[^;]*?\s+from\s+)?|export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s*)['\"]([^'\"]+)['\"]"
    return re.findall(pattern, source)


def main():
    registry_url = f"https://registry.npmjs.org/three/{VERSION}"
    metadata = json.loads(request(registry_url))
    dist = metadata["dist"]
    algorithm, encoded_digest = dist["integrity"].split("-", 1)
    if algorithm != "sha512":
        raise RuntimeError("Unexpected registry integrity algorithm")
    package = request(dist["tarball"])
    if hashlib.sha512(package).digest() != base64.b64decode(encoded_digest):
        raise RuntimeError("Three.js package integrity verification failed")
    with tarfile.open(fileobj=io.BytesIO(package), mode="r:gz") as archive:
        official = {
            member.name.removeprefix("package/"): archive.extractfile(member).read()
            for member in archive.getmembers()
            if member.isfile() and member.name.startswith("package/")
        }
    for engine in ENGINES:
        selected = set()
        pending = ["build/three.module.js"]
        for file in (ROOT / engine / "src").glob("*.js"):
            for name in dependencies(file.read_text()):
                if name.startswith("three/addons/"):
                    pending.append(name.replace("three/addons/", "examples/jsm/", 1))
        while pending:
            name = pending.pop()
            if name in selected:
                continue
            if name not in official:
                raise RuntimeError(f"Missing official module: {name}")
            selected.add(name)
            for imported in dependencies(official[name].decode()):
                if imported == "three":
                    pending.append("build/three.module.js")
                elif imported.startswith("."):
                    resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), imported))
                    if resolved.startswith("../"):
                        raise RuntimeError("Dependency escaped package root")
                    pending.append(resolved)
                else:
                    raise RuntimeError(f"Unexpected dependency: {imported}")
        output = ROOT / engine / "vendor" / "three"
        for name in sorted(selected | {"LICENSE"}):
            file = output / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(official[name])
        manifest = {
            "package": "three", "version": VERSION,
            "source": registry_url, "tarball": dist["tarball"],
            "integrity": dist["integrity"],
            "cdn_equivalent": f"https://cdn.jsdelivr.net/npm/three@{VERSION}/",
            "files": {name: hashlib.sha256(official[name]).hexdigest() for name in sorted(selected | {"LICENSE"})},
        }
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"{engine}: {len(selected)} official modules, verified SHA-512 package")


if __name__ == "__main__":
    main()

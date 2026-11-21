"""Build release assets from the reviewed Git commit."""
import hashlib
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parent.parent


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=root)


commit = git("rev-parse", "HEAD").decode().strip()
templates = {ext: git("show", f"{commit}:next-rules.{ext}") for ext in ("yaml", "js")}
match = re.match(rb"# Next-Rules (\d+\.\d+(?:\.\d+)?) ", templates["yaml"])
if not match:
    raise ValueError("Invalid release version in the committed YAML")
version = match[1].decode()
if not templates["js"].startswith(f"// Next-Rules {version} ".encode()):
    raise ValueError("The committed YAML and JS have different versions")
for folder in ("v2", "rules"):
    for extension, contents in templates.items():
        if git("show", f"{commit}:{folder}/next-rules.{extension}") != contents:
            raise ValueError(f"Compatibility entry differs: {folder}/next-rules.{extension}")

destination = root / ".cache/release"
destination.mkdir(parents=True, exist_ok=True)
release_name = "Next-Rules-" + version
archive = destination / (release_name + ".zip")
archive.write_bytes(git("archive", "--format=zip", "-9", "--prefix=" + release_name + "/", commit))
assets = [archive]
for extension, contents in templates.items():
    file = destination / ("next-rules-" + version + "." + extension)
    file.write_bytes(contents)
    assets.append(file)
checksums = "".join(hashlib.sha256(file.read_bytes()).hexdigest() + "  " + file.name + "\n" for file in assets)
(destination / "SHA256SUMS.txt").write_text(checksums, encoding="utf-8", newline="\n")
print(checksums, end="")

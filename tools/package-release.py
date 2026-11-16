"""Build a deterministic public release package from the reviewed source files."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
version = subprocess.check_output(["node", "-p", "require('./tools/v2-policy.cjs').version"], cwd=root, text=True).strip()
if not version or any(c not in "0123456789." for c in version):
    raise ValueError("Invalid release version")
destination = root / ".cache/release"
destination.mkdir(parents=True, exist_ok=True)
files = {root / "README.md", root / ".gitattributes", root / ".gitignore"}
for folder in ("v2", "tools", "test", "rules/ai", "rules/media", "rules/licenses"):
    files.update(file for file in (root / folder).rglob("*")
                 if file.is_file() and "__pycache__" not in file.parts and file.suffix != ".pyc")
files.update({root / "rules/sources.json", root / "rules/NOTICE.md"})
archive = destination / ("Next-Rules-" + version + ".zip")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as stream:
    for file in sorted(files):
        relative = file.relative_to(root).as_posix()
        info = zipfile.ZipInfo("Next-Rules-" + version + "/" + relative, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        stream.writestr(info, file.read_bytes())
assets = [archive]
for extension in ("yaml", "js"):
    file = destination / ("next-rules-" + version + "." + extension)
    shutil.copyfile(root / "v2" / ("next-rules." + extension), file)
    assets.append(file)
checksums = "".join(hashlib.sha256(file.read_bytes()).hexdigest() + "  " + file.name + "\n" for file in assets)
(destination / "SHA256SUMS.txt").write_text(checksums, encoding="utf-8", newline="\n")
print(checksums, end="")

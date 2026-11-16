"""Check the vendored merge implementation against the official pinned source."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
url = "https://raw.githubusercontent.com/MHSanaei/3x-ui/v3.11.0/internal/sub/clash_service.go"
with urlopen(Request(url, headers={"User-Agent": "Next-Rules-regression"}), timeout=30) as response:
    source = response.read().decode("utf-8")
fixture = (root / "test/panel-merge.go").read_text(encoding="utf-8")
marker = "type remoteClashKeyClass int"
tail = fixture[fixture.index(marker):].strip()
if tail not in source:
    raise ValueError("Panel merge fixture no longer matches the pinned official implementation")
print(json.dumps({"upstream": url, "fixture_sha256": hashlib.sha256(tail.encode()).hexdigest(), "verified": True}))

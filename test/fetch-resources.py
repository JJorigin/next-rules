"""Fetch public test resources; verify GitHub's release digests before extraction."""
import hashlib
import io
import ipaddress
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / ".cache/resources"
DEST.mkdir(parents=True, exist_ok=True)


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected:
            old, new = urlsplit(req.full_url), urlsplit(newurl)
            if new.scheme != "https" or (old.scheme, old.hostname, old.port or 443) != (new.scheme, new.hostname, new.port or 443):
                redirected.remove_header("Authorization")
        return redirected


opener = build_opener(SafeRedirect())


def fetch(url):
    headers = {"User-Agent": "Next-Rules-regression/2.1"}
    token = os.environ.get("NEXT_RULES_GITHUB_TOKEN")
    if token and urlsplit(url).hostname == "api.github.com":
        headers["Authorization"] = "Bearer " + token
    with opener.open(Request(url, headers=headers), timeout=90) as response:
        return response.read()


def release(repo, tag):
    return json.loads(fetch("https://api.github.com/repos/" + repo + "/releases/tags/" + tag))


def download(asset, destination):
    digest = asset.get("digest", "").removeprefix("sha256:")
    if len(digest) != 64:
        raise ValueError("A release asset lacks a SHA-256 digest")
    data = destination.read_bytes() if destination.exists() else b""
    if hashlib.sha256(data).hexdigest() != digest:
        data = fetch(asset["browser_download_url"])
        if hashlib.sha256(data).hexdigest() != digest:
            raise ValueError("Release asset checksum mismatch")
        destination.write_bytes(data)
    return data, digest


manifest = {"files": {}, "cores": {}}
for version in ("1.19.33", "1.19.34"):
    assets = release("MetaCubeX/mihomo", "v" + version)["assets"]
    asset = next(a for a in assets if a["name"] == "mihomo-windows-amd64-compatible-v" + version + ".zip")
    data, digest = download(asset, DEST / asset["name"])
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = [n for n in archive.namelist() if n.endswith(".exe")]
        if len(members) != 1:
            raise ValueError("Unexpected Mihomo archive")
        binary = archive.read(members[0])
    output = "mihomo-" + version + ".exe"
    (DEST / output).write_bytes(binary)
    manifest["cores"][version] = {"file": output, "sha256": hashlib.sha256(binary).hexdigest(), "archive_sha256": digest, "url": asset["browser_download_url"]}

assets = release("chen08209/FlClash", "v0.9.3")["assets"]
asset = next(a for a in assets if a["name"] == "FlClash-0.9.3-windows-amd64.zip")
data, digest = download(asset, DEST / asset["name"])
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    members = [n for n in archive.namelist() if n.endswith("/FlClashCore.exe") or n == "FlClashCore.exe"]
    if len(members) != 1:
        raise ValueError("Unexpected FlClash archive")
    binary = archive.read(members[0])
(DEST / "FlClashCore.exe").write_bytes(binary)
manifest["cores"]["flclash"] = {"file": "FlClashCore.exe", "sha256": hashlib.sha256(binary).hexdigest(), "archive_sha256": digest, "url": asset["browser_download_url"]}

# Live official classification data is validated on every run; the manifest records exact inputs.
data_release = release("MetaCubeX/meta-rules-dat", "latest")
for name, output in {"geosite.dat": "geosite.dat", "geoip.dat": "geoip.dat", "GeoLite2-ASN.mmdb": "ASN.mmdb", "country.mmdb": "Country.mmdb", "geoip.metadb": "geoip.metadb"}.items():
    asset = next(a for a in data_release["assets"] if a["name"] == name)
    _, digest = download(asset, DEST / output)
    manifest["files"][output] = {"sha256": digest, "url": asset["browser_download_url"]}

head = json.loads(fetch("https://api.github.com/repos/MetaCubeX/meta-rules-dat/commits/meta"))["sha"]
url = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/" + head + "/geo/geoip/telegram.mrs"
data = fetch(url)
if not data.startswith(b"\x28\xb5\x2f\xfd") or len(data) < 32:
    raise ValueError("Invalid Telegram MRS header")
(DEST / "telegram.mrs").write_bytes(data)
manifest["files"]["telegram.mrs"] = {"sha256": hashlib.sha256(data).hexdigest(), "url": url}
url = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/" + head + "/geo/geoip/netflix.list"
data = fetch(url)
networks = []
for row in data.decode("utf-8-sig").splitlines():
    if row.strip().startswith(("#", "//")):
        continue
    for item in row.split(","):
        if ":" in item:
            networks.append(ipaddress.ip_network(item.strip(), strict=False))
ipv6 = next(network for network in networks if network.version == 6)
fixture = {"ipv6": str(ipv6.network_address), "source": url, "source_sha256": hashlib.sha256(data).hexdigest()}
encoded = (json.dumps(fixture, indent=2) + "\n").encode()
(DEST / "netflix-fixture.json").write_bytes(encoded)
manifest["files"]["netflix-fixture.json"] = {"sha256": hashlib.sha256(encoded).hexdigest(), "url": url}
(DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"verified": True, "cores": list(manifest["cores"]), "data": list(manifest["files"])}))

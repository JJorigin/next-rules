"""Synchronize complete upstream data and reproducible, type-only domain views."""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
import ipaddress
import json
from pathlib import Path
import tempfile
from urllib.parse import quote
from urllib.request import Request, urlopen

import yaml


ROOT = Path(__file__).resolve().parent.parent
AI_URL = "https://raw.githubusercontent.com/VPSDance/ai-proxy-rules/main/rules/clash/global.yaml"
AI_IP_URL = "https://ruleset.skk.moe/Clash/ip/ai.txt"
VOICE_URL = "https://openai.com/chatgpt-voice.json"
CRYPTO_URL = "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/crypto.yaml"
OWN_RAW = "https://raw.githubusercontent.com/JJorigin/next-rules/main/"
DOMAIN_TYPES = {"DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-REGEX", "DOMAIN-KEYWORD", "GEOSITE"}
NETWORK_TYPES = {"IP-CIDR", "IP-CIDR6", "IP-ASN"}
AI_TYPES = DOMAIN_TYPES | NETWORK_TYPES | {
    "PROCESS-NAME", "PROCESS-NAME-WILDCARD", "PROCESS-NAME-REGEX",
    "PROCESS-PATH", "PROCESS-PATH-WILDCARD", "PROCESS-PATH-REGEX",
}
MAX_BYTES = 4 * 1024 * 1024


class UniqueLoader(yaml.SafeLoader):
    """Reject duplicate mapping keys instead of silently discarding data."""


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError("Duplicate YAML key: " + str(key))
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def fetch(url: str) -> bytes:
    if not url.startswith("https://"):
        raise ValueError("Upstream requests must use HTTPS")
    request = Request(url, headers={"User-Agent": "Next-Rules-source-sync/2.1"})
    with urlopen(request, timeout=25) as response:
        if response.status != 200 or not response.url.startswith("https://"):
            raise ValueError("Invalid upstream response")
        data = response.read(MAX_BYTES + 1)
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Empty or oversized upstream file")
    return data


def parse_rows(data: bytes, format: str, allowed: set[str]) -> list[str]:
    text = data.decode("utf-8-sig")
    if format == "yaml":
        document = yaml.load(text, Loader=UniqueLoader)
        if not isinstance(document, dict) or set(document) != {"payload"}:
            raise ValueError("Expected exactly one payload mapping")
        rows = document["payload"]
    else:
        rows = [line.strip() for line in text.splitlines()
                if line.strip() and not line.lstrip().startswith(("#", "//"))]
    if not isinstance(rows, list) or not rows:
        raise ValueError("An upstream rule list must not be empty")
    for row in rows:
        if not isinstance(row, str) or "\n" in row or "\r" in row:
            raise ValueError("Every rule must be a single-line string")
        kind, separator, value = row.partition(",")
        if not separator or kind not in allowed or not value.strip():
            raise ValueError("Unsupported upstream rule type: " + kind)
        if kind in {"IP-CIDR", "IP-CIDR6"}:
            ipaddress.ip_network(value.split(",")[0], strict=False)
        if kind == "IP-ASN" and not value.split(",")[0].isdigit():
            raise ValueError("Invalid ASN rule")
    return rows


def render_yaml(rows: list[str], title: str, source: str) -> bytes:
    # One JSON-quoted scalar per line is valid YAML and preserves regex escapes.
    lines = ["# " + title, "# 来源：" + source]
    if rows:
        lines += ["payload:", *["  - " + json.dumps(row, ensure_ascii=False) for row in rows]]
    else:
        lines += ["payload: []"]
    return ("\n".join(lines) + "\n").encode("utf-8")


def voice_networks(value: object) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    result = []

    def walk(item: object) -> None:
        if isinstance(item, dict):
            for key, child in item.items():
                if key in {"ipv4Prefix", "ipv6Prefix"}:
                    result.append(ipaddress.ip_network(child, strict=False))
                else:
                    walk(child)
        elif isinstance(item, list):
            for child in item:
                walk(child)

    walk(value)
    if not result:
        raise ValueError("Official voice data contains no addresses")
    return result


def validate_voice(voice: bytes, rows: list[str]) -> int:
    official = voice_networks(json.loads(voice))
    networks = [ipaddress.ip_network(row.split(",")[1], strict=False)
                for row in rows if row.startswith(("IP-CIDR,", "IP-CIDR6,"))]
    merged = []
    for version in (4, 6):
        merged.extend(ipaddress.collapse_addresses(net for net in networks if net.version == version))
    if any(not any(net.version == part.version and net.subnet_of(part) for part in merged)
           for net in official):
        raise ValueError("Maintained AI IP data does not cover the current official voice list")
    return len(official)


def build(raw: dict[str, bytes], source_info: dict[str, dict]) -> dict[str, bytes]:
    catalog = json.loads((ROOT / "v2/data/media-platforms.json").read_text(encoding="utf-8"))
    ai_rows = parse_rows(raw["ai"], "yaml", AI_TYPES)
    exact = [row for row in ai_rows if row.split(",", 1)[0] in {"DOMAIN", "DOMAIN-SUFFIX"}]
    regex = [row for row in ai_rows if row.startswith("DOMAIN-REGEX,")]
    deferred = [row for row in ai_rows if row not in exact and row not in regex]
    if not exact or Counter(exact + regex + deferred) != Counter(ai_rows):
        raise ValueError("AI type partition is incomplete")
    # Broad keywords, networks and processes stay intact in the complete source.
    ai_ip = parse_rows(raw["ai-ip"], "text", NETWORK_TYPES | {"DOMAIN"})
    official_count = validate_voice(raw["voice"], ai_ip)
    crypto = parse_rows(raw["crypto"], "yaml", DOMAIN_TYPES)
    outputs = {
        "rules/ai/upstream-global.yaml": raw["ai"],
        "rules/ai/domains-exact.yaml": render_yaml(exact, "AI 服务域名", AI_URL),
        "rules/ai/domains-regex.yaml": render_yaml(regex, "AI 服务域名匹配", AI_URL),
        "test/fixtures/ai-ip.txt": raw["ai-ip"],
        "test/fixtures/openai-voice.json": raw["voice"],
        "test/fixtures/providers/crypto.yaml": raw["crypto"],
    }
    cache = {
        "ai": {"url": AI_URL, "behavior": "classical", "format": "yaml", "payload": ai_rows},
        "ai-domain": {"url": OWN_RAW + "rules/ai/domains-exact.yaml", "behavior": "classical", "format": "yaml", "payload": exact},
        "ai-regex": {"url": OWN_RAW + "rules/ai/domains-regex.yaml", "behavior": "classical", "format": "yaml", "payload": regex},
        "ai-ip": {"url": AI_IP_URL, "behavior": "classical", "format": "text", "payload": ai_ip},
        "crypto": {"url": CRYPTO_URL, "behavior": "classical", "format": "yaml", "payload": crypto},
    }
    counts = {"ai_total": len(ai_rows), "ai_exact": len(exact), "ai_regex": len(regex),
              "ai_deferred": len(deferred), "voice_official": official_count,
              "ai_ip": len(ai_ip)}
    for section in ("global", "apac"):
        for item in catalog[section]:
            if "url" not in item:
                continue
            key = "media-" + item["id"]
            rows = parse_rows(raw[key], item.get("format", "yaml"), AI_TYPES)
            domains = [row for row in rows if row.split(",", 1)[0] in DOMAIN_TYPES]
            if not domains:
                raise ValueError("No domain rules for " + key)
            snapshot = "test/fixtures/providers/" + key + (".txt" if item.get("format") == "text" else ".yaml")
            outputs[snapshot] = raw[key]
            generated = "rules/media/" + item["id"] + "-domains.yaml"
            outputs[generated] = render_yaml(domains, item["name"] + " 域名", item["url"])
            cache[key] = {"url": item["url"], "behavior": "classical", "format": item.get("format", "yaml"), "payload": rows}
            cache[key + "-domain"] = {"url": OWN_RAW + generated, "behavior": "classical", "format": "yaml", "payload": domains}
    outputs["v2/data/source-cache.json"] = json_bytes({"schema": 1, "counts": counts, "providers": cache})
    outputs["rules/sources.json"] = json_bytes({"schema": 1, "sources": source_info, "counts": counts})
    return outputs


def acquire() -> tuple[dict[str, bytes], dict[str, dict]]:
    previous = json.loads((ROOT / "rules/sources.json").read_text(encoding="utf-8")) if (ROOT / "rules/sources.json").exists() else {"sources": {}}
    catalog = json.loads((ROOT / "v2/data/media-platforms.json").read_text(encoding="utf-8"))
    # Pin the AI download to one commit so metadata and source cannot race.
    head = json.loads(fetch("https://api.github.com/repos/VPSDance/ai-proxy-rules/commits/main"))["sha"]
    urls = {"ai": AI_URL.replace("/main/", "/" + quote(head, safe="") + "/"), "ai-ip": AI_IP_URL, "voice": VOICE_URL, "crypto": CRYPTO_URL}
    for items in catalog.values():
        for item in items:
            if "url" in item:
                urls["media-" + item["id"]] = item["url"]
    with ThreadPoolExecutor(max_workers=6) as pool:
        data = dict(zip(urls, pool.map(fetch, urls.values())))
    info = {}
    for key, contents in data.items():
        record = {"url": AI_URL if key == "ai" else urls[key], "sha256": sha(contents)}
        old = previous["sources"].get(key)
        if key == "ai":
            record["commit"] = old["commit"] if old and old["sha256"] == record["sha256"] else head
        info[key] = record
    return data, info


def from_checkout() -> tuple[dict[str, bytes], dict[str, dict]]:
    info = json.loads((ROOT / "rules/sources.json").read_text(encoding="utf-8"))["sources"]
    data = {"ai": (ROOT / "rules/ai/upstream-global.yaml").read_bytes(),
            "ai-ip": (ROOT / "test/fixtures/ai-ip.txt").read_bytes(),
            "voice": (ROOT / "test/fixtures/openai-voice.json").read_bytes(),
            "crypto": (ROOT / "test/fixtures/providers/crypto.yaml").read_bytes()}
    for key in info:
        if key.startswith("media-"):
            prefix = ROOT / ("test/fixtures/providers/" + key)
            paths = [Path(str(prefix) + suffix) for suffix in (".yaml", ".txt")]
            data[key] = next(file for file in paths if file.exists()).read_bytes()
    for key, contents in data.items():
        if sha(contents) != info[key]["sha256"]:
            raise ValueError("Source digest mismatch: " + key)
    return data, info


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true")
    args = parser.parse_args()
    raw, info = acquire() if args.fetch else from_checkout()
    outputs = build(raw, info)  # Validate every input before changing any file.
    previous_cache = ROOT / "v2/data/source-cache.json"
    if args.fetch and previous_cache.exists():
        previous = json.loads(previous_cache.read_text(encoding="utf-8"))["providers"]
        current = json.loads(outputs["v2/data/source-cache.json"])["providers"]
        for key, item in previous.items():
            if key in current and len(current[key]["payload"]) < len(item["payload"]) * 0.7:
                raise ValueError("Large rule deletion needs manual review: " + key)
    changed = []
    for name, contents in outputs.items():
        file = ROOT / name
        if file.exists() and file.read_bytes() == contents:
            continue
        if not args.fetch:
            raise ValueError("Generated source is out of sync: " + name)
        file.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=file.parent, delete=False) as stream:
            stream.write(contents)
            temporary = Path(stream.name)
        temporary.replace(file)
        changed.append(name)
    print(json.dumps({"verified": True, "changed": changed,
                      "counts": json.loads(outputs["v2/data/source-cache.json"])["counts"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()

"""Synchronize upstream sources and reproducible routing views."""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import tempfile
from urllib.parse import quote, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

import yaml


ROOT = Path(__file__).resolve().parent.parent
AI_URL = "https://raw.githubusercontent.com/VPSDance/ai-proxy-rules/main/rules/clash/global.yaml"
VOICE_URL = "https://openai.com/chatgpt-voice.json"
CRYPTO_URL = "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/crypto.yaml"
CRYPTO_FILE = "rules/crypto.yaml"
OWN_RAW = "https://raw.githubusercontent.com/JJorigin/next-rules/main/"
DOMAIN_TYPES = {"DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-REGEX", "DOMAIN-KEYWORD", "GEOSITE"}
NETWORK_TYPES = {"IP-CIDR", "IP-CIDR6", "IP-ASN"}
SHARED_AI_HOSTS = {
    "api.cloudflare.com",
    "api.statsig.com",
    "auth0.com",
    "aws.dev",
    "awsapps.com",
    "awsstatic.com",
    "byteoversea.com",
    "challenges.cloudflare.com",
    "client-telemetry.us-east-1.amazonaws.com",
    "cloudflare.com",
    "cognito-identity.us-east-1.amazonaws.com",
    "console.aws.a2z.com",
    "events.statsigapi.net",
    "featuregates.org",
    "in.appcenter.ms",
    "intercom.io",
    "intercomcdn.com",
    "lf3-static.bytednsdoc.com",
    "odc.officeapps.live.com",
    "self.events.data.microsoft.com",
    "sso.amazonaws.com",
    "statsigapi.net",
    "storage.googleapis.com",
    "stripe.com",
}
SHARED_AI_SUFFIXES = ("msn.com", "msn.cn", "cloudflareinsights.com", "datadoghq.com", "datadoghq.eu", "sentry.io")
# Datadog also serves browser telemetry from separate region-specific domains.
DATADOG_BROWSER = re.compile(r"(?:^|\.)browser-intake(?:-[a-z0-9]+)?-datadoghq\.(?:com|eu)$")
# Retain the Anthropic and OpenAI allocations carried by the upstream list.
# A hosting company's ASN or an unverified address on its network is not an AI service.
DEDICATED_AI_NETWORKS = {
    ("IP-ASN", "399358"),
    ("IP-ASN", "401518"),
    ("IP-CIDR", "160.79.104.0/21"),
    ("IP-CIDR6", "2607:6bc0::/32"),
    ("IP-CIDR", "199.47.142.0/23"),
    ("IP-CIDR6", "2604:f20::/32"),
}
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


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected:
            old, new = urlsplit(req.full_url), urlsplit(newurl)
            if new.scheme != "https" or (old.scheme, old.hostname, old.port or 443) != (new.scheme, new.hostname, new.port or 443):
                redirected.remove_header("Authorization")
        return redirected


opener = build_opener(SafeRedirect())


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def fetch(url: str) -> bytes:
    if not url.startswith("https://"):
        raise ValueError("Upstream requests must use HTTPS")
    headers = {"User-Agent": "Next-Rules-source-sync"}
    token = os.environ.get("NEXT_RULES_GITHUB_TOKEN")
    if token and urlsplit(url).hostname == "api.github.com":
        headers["Authorization"] = "Bearer " + token
    request = Request(url, headers=headers)
    with opener.open(request, timeout=25) as response:
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


def voice_prefixes(data: bytes) -> list[str]:
    document = json.loads(data)
    rows = document.get("prefixes") if isinstance(document, dict) else None
    if not isinstance(rows, list) or not rows:
        raise ValueError("Official voice data contains no prefixes")
    prefixes = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid official voice prefix")
        keys = {"ipv4Prefix", "ipv6Prefix"} & row.keys()
        if len(keys) != 1:
            raise ValueError("Each official voice entry must specify one address family")
        key = keys.pop()
        if not isinstance(row[key], str):
            raise ValueError("Official voice prefixes must be strings")
        network = ipaddress.ip_network(row[key])
        if network.version != (4 if key == "ipv4Prefix" else 6) or not network.is_global or network.is_multicast or network.is_reserved:
            raise ValueError("Invalid official voice address family or scope")
        prefixes.append(str(network))
    return list(dict.fromkeys(prefixes))


def is_ai_routing_rule(row: str) -> bool:
    kind, _, value = row.partition(",")
    value = value.split(",", 1)[0].lower().rstrip(".")
    if kind in NETWORK_TYPES:
        return (kind, value) in DEDICATED_AI_NETWORKS
    if kind == "DOMAIN-KEYWORD":
        return False
    if kind in {"DOMAIN", "DOMAIN-SUFFIX"}:
        return value not in SHARED_AI_HOSTS and not DATADOG_BROWSER.search(value) and not any(
            value == suffix or value.endswith("." + suffix) for suffix in SHARED_AI_SUFFIXES
        )
    return True


def build(raw: dict[str, bytes], source_info: dict[str, dict]) -> dict[str, bytes]:
    catalog = json.loads((ROOT / "v2/data/media-platforms.json").read_text(encoding="utf-8"))
    ai_rows = parse_rows(raw["ai"], "yaml", AI_TYPES)
    active = [row for row in ai_rows if is_ai_routing_rule(row)]
    excluded = [row for row in ai_rows if not is_ai_routing_rule(row)]
    exact = [row for row in active if row.startswith(("DOMAIN,", "DOMAIN-SUFFIX,"))]
    regex = [row for row in active if row.startswith("DOMAIN-REGEX,")]
    deferred = [row for row in active if not row.startswith(("DOMAIN,", "DOMAIN-SUFFIX,", "DOMAIN-REGEX,"))]
    if not exact or Counter(exact + regex + deferred + excluded) != Counter(ai_rows):
        raise ValueError("AI type partition is incomplete")
    voice = voice_prefixes(raw["voice"])
    crypto = parse_rows(raw["crypto"], "yaml", DOMAIN_TYPES)
    ai_context_url = OWN_RAW + "rules/ai/context.yaml"
    ai_domain_url = OWN_RAW + "rules/ai/domains-exact.yaml"
    outputs = {
        "rules/ai/upstream-global.yaml": raw["ai"],
        "rules/ai/domains-exact.yaml": render_yaml(exact, "AI 服务域名", AI_URL),
        "rules/ai/domains-regex.yaml": render_yaml(regex, "AI 服务域名匹配", AI_URL),
        "rules/ai/context.yaml": render_yaml(deferred, "AI 服务补充条件", AI_URL),
        "rules/ai/voice-ip.yaml": render_yaml(voice, "ChatGPT 语音 IP", VOICE_URL),
        "test/fixtures/openai-voice.json": raw["voice"],
        CRYPTO_FILE: raw["crypto"],
    }
    cache = {
        # URL and local path migrations keep old AI views out of the current cache.
        "ai-context": {"url": ai_context_url + "?v=2.4", "legacyUrl": ai_context_url,
                       "behavior": "classical", "format": "yaml", "payload": deferred},
        "ai-domain": {"url": ai_domain_url + "?v=2.5", "legacyUrl": ai_domain_url,
                      "behavior": "classical", "format": "yaml", "payload": exact},
        "ai-regex": {"url": OWN_RAW + "rules/ai/domains-regex.yaml", "behavior": "classical", "format": "yaml", "payload": regex},
        "ai-voice": {"url": OWN_RAW + "rules/ai/voice-ip.yaml", "behavior": "ipcidr", "format": "yaml", "payload": voice},
        "crypto": {"url": OWN_RAW + CRYPTO_FILE, "legacyUrl": CRYPTO_URL,
                   "behavior": "classical", "format": "yaml", "payload": crypto},
    }
    counts = {"ai_total": len(ai_rows), "ai_exact": len(exact), "ai_regex": len(regex),
              "ai_deferred": len(deferred), "ai_excluded": len(excluded), "voice_official": len(voice)}
    for section in ("global", "apac"):
        for item in catalog[section]:
            if "url" not in item:
                continue
            key = "media-" + item["id"]
            format = item.get("format", "yaml")
            rows = parse_rows(raw[key], format, AI_TYPES)
            domains = [row for row in rows if row.split(",", 1)[0] in DOMAIN_TYPES]
            if not domains:
                raise ValueError("No domain rules for " + key)
            snapshot = "rules/media/upstream/" + item["id"] + (".txt" if format == "text" else ".yaml")
            outputs[snapshot] = raw[key]
            generated = "rules/media/" + item["id"] + "-domains.yaml"
            outputs[generated] = render_yaml(domains, item["name"] + " 域名", item["url"])
            cache[key] = {"url": OWN_RAW + snapshot, "legacyUrl": item["url"],
                          "behavior": "classical", "format": format, "payload": rows}
            cache[key + "-domain"] = {"url": OWN_RAW + generated, "behavior": "classical", "format": "yaml", "payload": domains}
    outputs["v2/data/source-cache.json"] = json_bytes({
        "schema": 2, "upstream_ai": {"url": AI_URL, "payload": ai_rows, "excluded": excluded},
        "counts": counts, "providers": cache,
    })
    outputs["rules/sources.json"] = json_bytes({"schema": 1, "sources": source_info, "counts": counts})
    return outputs


def acquire() -> tuple[dict[str, bytes], dict[str, dict]]:
    previous = json.loads((ROOT / "rules/sources.json").read_text(encoding="utf-8")) if (ROOT / "rules/sources.json").exists() else {"sources": {}}
    catalog = json.loads((ROOT / "v2/data/media-platforms.json").read_text(encoding="utf-8"))
    # Pin the AI download to one commit so metadata and source cannot race.
    head = json.loads(fetch("https://api.github.com/repos/VPSDance/ai-proxy-rules/commits/main"))["sha"]
    urls = {"ai": AI_URL.replace("/main/", "/" + quote(head, safe="") + "/"), "voice": VOICE_URL, "crypto": CRYPTO_URL}
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
            "voice": (ROOT / "test/fixtures/openai-voice.json").read_bytes(),
            "crypto": (ROOT / CRYPTO_FILE).read_bytes()}
    for key in info:
        if key.startswith("media-"):
            prefix = ROOT / ("rules/media/upstream/" + key.removeprefix("media-"))
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

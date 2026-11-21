"""Check failure boundaries in the data synchronizer without network access."""
import importlib.util
import json
from collections import Counter
from pathlib import Path
import unittest
from urllib.request import Request

spec = importlib.util.spec_from_file_location("source_sync", Path(__file__).resolve().parent.parent / "tools/sync-rules.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class SourceValidation(unittest.TestCase):
    def test_authentication_is_not_forwarded_to_another_origin(self):
        request = Request("https://api.github.com/original", headers={"Authorization": "Bearer fixture-value"})
        redirect = sync.SafeRedirect()
        for destination in ["http://api.github.com/other", "https://api.github.com:444/other", "https://example.com/other"]:
            with self.subTest(destination=destination):
                changed = redirect.redirect_request(request, None, 302, "Found", {}, destination)
                self.assertIsNone(changed.get_header("Authorization"))
        same = redirect.redirect_request(request, None, 302, "Found", {}, "https://api.github.com/renamed")
        self.assertEqual(same.get_header("Authorization"), "Bearer fixture-value")

    def test_duplicate_key_cannot_silently_replace_rules(self):
        with self.assertRaises(ValueError):
            sync.parse_rows(b"payload: [DOMAIN,one.example]\npayload: []\n", "yaml", sync.AI_TYPES)

    def test_empty_or_unsupported_upstream_is_rejected(self):
        for data in [b"payload: []\n", b"<html>unavailable</html>", b"payload:\n  - MATCH,DIRECT\n"]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                sync.parse_rows(data, "yaml", sync.AI_TYPES)

    def test_bad_address_is_rejected(self):
        with self.assertRaises(ValueError):
            sync.parse_rows(b"IP-CIDR,not-an-address/32", "text", sync.NETWORK_TYPES)

    def test_voice_keeps_official_prefixes_without_expansion(self):
        official = b'{"prefixes":[{"ipv4Prefix":"9.9.9.9/32"},{"ipv6Prefix":"2606:4700:4700::1111/128"}]}'
        self.assertEqual(sync.voice_prefixes(official), ["9.9.9.9/32", "2606:4700:4700::1111/128"])
        for invalid in [
            b'{"prefixes":[]}',
            b'{"prefixes":[{"ipv6Prefix":"9.9.9.9/32"}]}',
            b'{"prefixes":[{"ipv4Prefix":151587081}]}',
            b'{"prefixes":[{"ipv4Prefix":"192.168.1.0/24"}]}',
            b'{"prefixes":[{"ipv4Prefix":"224.0.0.0/4"}]}',
            b'{"prefixes":[{"ipv4Prefix":"9.9.9.9/32","ipv6Prefix":"2606:4700:4700::1111/128"}]}',
        ]:
            with self.subTest(data=invalid), self.assertRaises(ValueError):
                sync.voice_prefixes(invalid)

    def test_ai_views_preserve_source_and_exclude_shared_services(self):
        raw, metadata = sync.from_checkout()
        generated = sync.build(raw, metadata)
        cache = json.loads(generated['v2/data/source-cache.json'])
        complete = sync.parse_rows(raw['ai'], 'yaml', sync.AI_TYPES)
        rows = [row for name in ['ai-domain','ai-regex','ai-context'] for row in cache['providers'][name]['payload']]
        excluded = cache['upstream_ai']['excluded']
        self.assertEqual(Counter(rows + excluded), Counter(complete))
        self.assertFalse(set(rows) & set(excluded))
        self.assertEqual(generated['rules/ai/upstream-global.yaml'], raw['ai'])
        self.assertTrue(all(not row.startswith(('DOMAIN,','DOMAIN-SUFFIX,','DOMAIN-REGEX,')) for row in cache['providers']['ai-context']['payload']))
        self.assertNotIn('ai', cache['providers'])
        self.assertEqual(cache['providers']['ai-voice']['payload'], sync.voice_prefixes(raw['voice']))

    def test_shared_domains_and_networks_stay_out_of_ai_routes(self):
        for row in [
            "DOMAIN,assets.msn.com", "DOMAIN-SUFFIX,msn.com",
            "DOMAIN,storage.googleapis.com", "DOMAIN,challenges.cloudflare.com",
            "DOMAIN,logs.datadoghq.com", "DOMAIN-KEYWORD,openai", "IP-ASN,14061,no-resolve",
            "DOMAIN,browser-intake-us5-datadoghq.com", "DOMAIN,rum.browser-intake-datadoghq.eu",
            "DOMAIN,odc.officeapps.live.com", "DOMAIN-SUFFIX,byteoversea.com",
            "DOMAIN-SUFFIX,awsapps.com", "DOMAIN,cognito-identity.us-east-1.amazonaws.com",
            "DOMAIN-SUFFIX,auth0.com", "DOMAIN-SUFFIX,stripe.com", "DOMAIN,events.statsigapi.net",
        ]:
            with self.subTest(row=row):
                self.assertFalse(sync.is_ai_routing_rule(row))
        for row in [
            "DOMAIN-SUFFIX,chatgpt.com", "DOMAIN,copilot.microsoft.com",
            "DOMAIN-SUFFIX,ai.cloudflare.com", "IP-ASN,399358,no-resolve", "PROCESS-NAME,Claude.exe",
            "DOMAIN,codewhisperer.us-east-1.amazonaws.com", "DOMAIN,auth0.openai.com",
        ]:
            with self.subTest(row=row):
                self.assertTrue(sync.is_ai_routing_rule(row))


if __name__ == "__main__":
    unittest.main()

"""Check failure boundaries in the data synchronizer without network access."""
import importlib.util
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

    def test_voice_coverage_requires_every_official_prefix(self):
        official = b'{"prefixes":[{"ipv4Prefix":"192.0.2.1/32"},{"ipv6Prefix":"2001:db8::1/128"}]}'
        self.assertEqual(sync.validate_voice(official, ["IP-CIDR,192.0.2.0/24", "IP-CIDR6,2001:db8::/32"]), 2)
        with self.assertRaises(ValueError):
            sync.validate_voice(official, ["IP-CIDR,192.0.2.0/24"])


if __name__ == "__main__":
    unittest.main()

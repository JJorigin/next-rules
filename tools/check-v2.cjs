
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const net = require("node:net");
const policy = require("./v2-policy.cjs");

const script = fs.readFileSync(path.join(__dirname, "../v2/next-rules.js"), "utf8");
const ctx = vm.createContext({});
vm.runInContext(script, ctx);
const normalize = (value) => JSON.parse(JSON.stringify(value));
const remote = normalize(ctx.remoteFragment());
const groups = (config) => Object.fromEntries(config["proxy-groups"].map((g) => [g.name, g]));
const group = policy.group;
const proxies = [
  { name: "[海外] Verified", type: "socks5", server: "127.0.0.1", port: 1 },
  { name: "Unverified", type: "socks5", server: "127.0.0.1", port: 1 },
  { name: "[海外] Direct alias", type: "direct" }
];
const base = {
  proxies,
  dns: { enable: false },
  tun: { enable: false, "strict-route": true },
  ipv6: true, hosts: { "example.test": "127.0.0.1" }, mode: "rule"
};
const local = normalize(ctx.main(normalize(base)));
assert.deepEqual(remote.rules, local.rules);
assert.deepEqual(remote["rule-providers"], local["rule-providers"]);
assert.deepEqual(Object.keys(remote).sort(), ["proxy-groups", "rule-providers", "rules"]);
for (const key of Object.keys(base)) assert.deepEqual(local[key], base[key], key + " must survive");

for (const config of [remote, local]) {
  const map = groups(config);
  for (const [key, name] of Object.entries(group)) {
    const entry = map[name];
    if (key === "ads") continue;
    assert.equal(entry["empty-fallback"], "REJECT", name);
    if (key === "auto" || key === "default") {
      assert.ok(!entry.proxies?.includes("DIRECT"), name);
      assert.ok(entry["exclude-type"].split("|").includes("Direct"), name);
    } else {
      assert.deepEqual(entry.proxies.slice(0, 2), [group.auto, "DIRECT"], name);
      assert.equal(entry["default-selected"], group.auto, name);
    }
  }
}
assert.deepEqual(groups(local)[group.ai].proxies.slice(2), ["[海外] Verified"]);
assert.deepEqual(groups(normalize(ctx.main({})))[group.auto].proxies, ["REJECT"]);
assert.deepEqual(normalize(ctx.main(normalize(local))), local, "script idempotence");

const retained = {
  type: "file", behavior: "ipcidr", format: "mrs",
  path: "C:/mock/providers/NEXT-RULES-V2-TELEGRAM-IP.MRS"
};
const conflict = normalize(ctx.main({
  proxies: [...proxies, { ...proxies[0], name: group.ai }],
  "rule-providers": { legacy: retained, "next-rules-v2-ai": { type: "inline", behavior: "domain", payload: ["fixture.invalid"] } },
  "sub-rules": { legacy: ["RULE-SET,legacy,DIRECT"] }
}));
assert.deepEqual(conflict["rule-providers"].legacy, retained);
assert.equal(conflict["rule-providers"]["next-rules-v2-telegram-ip-2"].path, "./providers/next-rules-v2-telegram-ip-2.mrs");
assert.ok(conflict.rules.includes("RULE-SET,next-rules-v2-ai-2," + group.ai + " · Next-Rules"));
assert.ok(conflict.rules.includes("AND,((NETWORK,UDP),(RULE-SET,next-rules-v2-ai-2)),REJECT"));
assert.ok(conflict.rules.includes("AND,((NETWORK,UDP),(RULE-SET,next-rules-v2-telegram-ip-2,no-resolve)),REJECT"));
assert.deepEqual(conflict["sub-rules"], { legacy: ["RULE-SET,legacy,DIRECT"] });

const rules = remote.rules;
const direct = rules.indexOf("GEOSITE,CN,DIRECT");
const resolvedIp = rules.indexOf("GEOIP,CN,DIRECT,no-resolve");
const aiIndex = rules.indexOf("RULE-SET,next-rules-v2-ai," + group.ai);
const processIndex = rules.indexOf("RULE-SET,next-rules-v2-ai-process," + group.ai);
assert.ok(direct >= 0 && direct < aiIndex && aiIndex < resolvedIp && resolvedIp < processIndex);
assert.ok(direct < rules.indexOf("RULE-SET,next-rules-v2-software," + group.software));
assert.ok(rules.includes("GEOSITE,youtube," + group.google));
assert.ok(rules.includes("GEOSITE,google," + group.google));
assert.ok(rules.includes("GEOSITE,apple," + group.apple));
assert.deepEqual(rules.slice(-3), ["NETWORK,UDP," + group.default, "NETWORK,UDP,REJECT", "MATCH," + group.default]);

const ai = remote["rule-providers"]["next-rules-v2-ai"].payload;
for (const host of ["openai.com", "chatgpt.com", "claude.ai", "gemini.google.com", "cursor.com", "copilot.microsoft.com"]) {
  assert.ok(ai.includes("DOMAIN-SUFFIX," + host));
}
for (const host of ["storage.googleapis.com", "api.cloudflare.com", "stripe.com", "sentry.io", "auth0.com", "doubao.com", "deepseek.com"]) {
  assert.ok(!ai.some((rule) => rule.split(",")[1] === host), host);
}
assert.ok(ai.every((rule) => /^(DOMAIN(-SUFFIX)?|IP-CIDR6?),/.test(rule)));
const voice = remote["rule-providers"]["next-rules-v2-ai-voice"].payload;
assert.ok(voice.length && voice.every((value) => {
  const [address, mask] = value.split("/");
  return (net.isIP(address) === 4 && mask === "32") || (net.isIP(address) === 6 && mask === "128");
}));
assert.ok(rules.includes("AND,((NETWORK,UDP),(DST-PORT,3478),(RULE-SET,next-rules-v2-ai-voice,no-resolve))," + group.ai));

console.log("Next-Rules 2.0 policy checks passed.");

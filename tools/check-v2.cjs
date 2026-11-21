
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
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
  dns: {
    enable: true,
    "enhanced-mode": "redir-host",
    ipv6: false,
    nameserver: ["https://dns.example.test/dns-query"],
    fallback: ["https://backup.example.test/dns-query"],
    "nameserver-policy": { "+.corp.example.test": ["system"] },
    "proxy-server-nameserver": ["https://nodes.example.test/dns-query"],
    "direct-nameserver": ["system"]
  },
  tun: { enable: false, "strict-route": true },
  ipv6: true, hosts: { "example.test": "127.0.0.1" }, mode: "rule"
};
const local = normalize(ctx.main(normalize(base)));
assert.deepEqual(remote.rules, local.rules);
assert.deepEqual(remote["rule-providers"], local["rule-providers"]);
assert.deepEqual(Object.keys(remote).sort(), ["proxy-groups", "rule-providers", "rules"]);
for (const key of Object.keys(base)) assert.deepEqual(local[key], base[key], key + " must survive");
assert.ok(!Object.hasOwn(normalize(ctx.main({})), "dns"), "the local script leaves absent DNS absent");

for (const config of [remote, local]) {
  const map = groups(config);
  for (const [key, name] of Object.entries(group)) {
    const entry = map[name];
    if (key === "ads") continue;
    assert.equal(entry["empty-fallback"], "REJECT", name);
    if (key === "auto" || key === "default") {
      assert.ok(!entry.proxies?.includes("DIRECT"), name);
      assert.ok(entry["exclude-type"].split("|").includes("Direct"), name);
    } else if (key === "youtube") {
      assert.deepEqual(entry.proxies.slice(0, 3), [group.google, group.auto, "DIRECT"], name);
      assert.equal(entry["default-selected"], group.google, name);
    } else {
      assert.deepEqual(entry.proxies.slice(0, 2), [group.auto, "DIRECT"], name);
      assert.equal(entry["default-selected"], group.auto, name);
    }
  }
}
assert.deepEqual(groups(local)[group.ai].proxies.slice(2), proxies.map((node) => node.name), "ordinary node names and manual direct aliases survive");
assert.ok(!groups(remote)[group.ai].filter, "remote subscriptions do not require a name marker");
assert.deepEqual(groups(normalize(ctx.main({})))[group.auto].proxies, ["REJECT"]);
assert.deepEqual(normalize(ctx.main(normalize(local))), local, "script idempotence");

const retained = {
  type: "file", behavior: "ipcidr", format: "mrs",
  path: "C:/mock/providers/NEXT-RULES-V2-TELEGRAM-IP.MRS"
};
const conflict = normalize(ctx.main({
  proxies: [...proxies, { ...proxies[0], name: group.ai }],
  "rule-providers": { legacy: retained, "next-rules-v2-ai-context": { type: "inline", behavior: "domain", payload: ["fixture.invalid"] } },
  "sub-rules": { legacy: ["RULE-SET,legacy,DIRECT"] }
}));
assert.deepEqual(conflict["rule-providers"].legacy, retained);
assert.equal(conflict["rule-providers"]["next-rules-v2-telegram-ip-2"].path, "./providers/next-rules-v2-telegram-ip-2.mrs");
assert.ok(conflict.rules.includes("RULE-SET,next-rules-v2-ai-context-2," + group.ai + " · Next-Rules"));
assert.ok(conflict.rules.includes("AND,((NETWORK,UDP),(RULE-SET,next-rules-v2-ai-context-2)),REJECT"));
assert.ok(conflict.rules.includes("AND,((NETWORK,UDP),(RULE-SET,next-rules-v2-telegram-ip-2,no-resolve)),REJECT"));
assert.deepEqual(conflict["sub-rules"], { legacy: ["RULE-SET,legacy,DIRECT"] });

const rules = remote.rules;
const direct = rules.indexOf("GEOSITE,CN,DIRECT");
const resolvedIp = rules.indexOf("GEOIP,CN,DIRECT,no-resolve");
const aiIndex = rules.indexOf("RULE-SET,next-rules-v2-ai-context," + group.ai);
const domesticIp = rules.indexOf("GEOIP,CN,DIRECT");
const domainIndex = rules.indexOf("RULE-SET,next-rules-v2-ai-domain," + group.ai);
assert.equal(resolvedIp, -1, "unclassified domestic domains must resolve before process fallback");
assert.ok(domainIndex >= 0 && domainIndex < direct && direct < domesticIp && domesticIp < aiIndex);
assert.ok(rules.indexOf("GEOSITE,category-ads-all," + group.ads) < direct, "ads precede generic domestic direct rules");
assert.ok(direct < rules.indexOf("RULE-SET,next-rules-v2-software," + group.software));
const youtubeIndex = rules.indexOf("GEOSITE,youtube," + group.youtube);
const googleIndex = rules.indexOf("GEOSITE,google," + group.google);
assert.ok(youtubeIndex >= 0 && youtubeIndex < googleIndex, "YouTube must precede the broader Google category");
assert.ok(rules.includes("GEOSITE,google," + group.google));
assert.ok(rules.includes("GEOSITE,apple," + group.apple));
for (const category of ["hbo", "primevideo", "spotify", "twitch", "apple-tvplus"]) {
  const condition = "GEOSITE," + category;
  assert.ok(rules.includes(condition + "," + group.media), category + " belongs to the media selector");
  assert.ok(rules.includes("AND,((NETWORK,UDP),(" + condition + ")),REJECT"), category + " UDP guard");
}
const media = require("../v2/data/media-platforms.json");
const mediaCategories = [...media.global, ...media.apac].filter((item) => item.geosite).map((item) => item.geosite);
const mediaProviderIds = [...media.global, ...media.apac].filter((item) => item.id).map((item) => item.id);
assert.equal(new Set(mediaCategories).size, mediaCategories.length, "each service category has one media owner");
assert.equal(new Set(mediaProviderIds).size, mediaProviderIds.length, "supplementary provider ids are unique");
for (const [section, owner] of [["global", group.media], ["apac", group.mediaAsia]]) {
  for (const item of media[section]) {
    if (item.geosite) assert.ok(rules.includes("GEOSITE," + item.geosite + "," + owner), item.name);
    else {
      const provider = remote["rule-providers"]["next-rules-v2-media-" + item.id];
      assert.equal(provider.type, "http", item.name);
      const extension = item.format === "text" ? "txt" : "yaml";
      assert.equal(provider.url, "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/upstream/" + item.id + "." + extension, item.name);
      assert.equal(provider.interval, 86400, item.name);
      assert.ok(rules.some((rule) => rule.includes("RULE-SET,next-rules-v2-media-" + item.id) && rule.endsWith("," + owner)), item.name);
    }
  }
}
const disneyIndex = rules.indexOf("GEOSITE,disney," + group.media);
assert.ok(rules.indexOf("GEOSITE,hotstar," + group.mediaAsia) < disneyIndex);
assert.ok(rules.indexOf("RULE-SET,next-rules-v2-media-hulujp-domain," + group.mediaAsia) < disneyIndex);
for (const condition of ["GEOSITE,youtube", "GEOSITE,google", "GEOSITE,apple-tvplus", "GEOSITE,hbo", "GEOSITE,viu"]) {
  assert.ok(rules.findIndex((row) => row.startsWith(condition + ",")) < domesticIp, condition + " must precede generic IP direct");
}
for (const category of ["bilibili@!cn", "iqiyi@!cn", "niconico"]) {
  const index = rules.indexOf("GEOSITE," + category + "," + group.mediaAsia);
  assert.ok(index >= 0 && index < direct, "explicit international editions precede a broader domestic brand classification");
}
assert.ok(!rules.includes("GEOSITE,bilibili," + group.mediaAsia));
assert.ok(!rules.includes("GEOSITE,iqiyi," + group.mediaAsia));
assert.ok(!rules.some((rule) => /tiktok|category-entertainment|GEOSITE,(naver|coupang|dmm),/i.test(rule)), "unrequested broad classifications are absent");
assert.ok(rules.indexOf("GEOSITE,apple-tvplus," + group.media) < rules.indexOf("GEOSITE,apple," + group.apple));

const legacyName = "🔍 谷歌服务(含油管) [自选]";
const migrated = normalize(ctx.main({
  proxies,
  "proxy-groups": [
    { name: legacyName, type: "select", proxies: ["DIRECT"] },
    { name: legacyName + " · Next-Rules 2", type: "select", proxies: ["DIRECT"] }
  ]
}));
assert.ok(!migrated["proxy-groups"].some((entry) => entry.name.startsWith(legacyName)), "unused combined selectors are removed");
const oldMedia = normalize(ctx.main({proxies, "proxy-groups": [{name: "🎬 流媒体 [自选]", type: "select", proxies: ["DIRECT"]}]}));
assert.ok(!groups(oldMedia)["🎬 流媒体 [自选]"], "the obsolete single media selector is removed");
const dependent = normalize(ctx.main({
  proxies,
  dns: { nameserver: ["https://example.test/dns-query#" + encodeURIComponent(legacyName)] },
  "proxy-groups": [{ name: legacyName, type: "select", proxies: ["DIRECT"] }]
}));
assert.deepEqual(groups(dependent)[legacyName].proxies, ["DIRECT"], "the original DNS exit selector is kept");
const renamed = normalize(ctx.main({
  proxies: [...proxies, { ...proxies[0], name: group.google }, { ...proxies[0], name: group.youtube }]
}));
const renamedYoutube = groups(renamed)[group.youtube + " · Next-Rules"];
assert.equal(renamedYoutube["default-selected"], group.google + " · Next-Rules");
assert.equal(renamedYoutube.proxies[0], group.google + " · Next-Rules", "the follow reference uses the allocated group name");
const supplementaryConflict = normalize(ctx.main({
  proxies,
  "rule-providers": {"next-rules-v2-media-linetv": {type: "inline", behavior: "classical", payload: ["DOMAIN,legacy.example"]}}
}));
assert.ok(supplementaryConflict.rules.includes(
  "AND,((RULE-SET,next-rules-v2-media-linetv-2),(NOT,((DOMAIN-SUFFIX,line-cdn.net))),(NOT,((DOMAIN-SUFFIX,line-scdn.net))))," + group.mediaAsia
), "nested media rules retain the renamed provider and shared-CDN exclusions");
assert.deepEqual(rules.slice(-3), ["NETWORK,UDP," + group.default, "NETWORK,UDP,REJECT", "MATCH," + group.default]);

const sourceCache = require("../v2/data/source-cache.json");
const aiProvider = remote["rule-providers"]["next-rules-v2-ai-context"];
const ai = sourceCache.upstream_ai.payload;
assert.equal(aiProvider.type, "http");
assert.equal(aiProvider.url, "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/ai/context.yaml?v=2.4");
assert.equal(sourceCache.upstream_ai.url, "https://raw.githubusercontent.com/VPSDance/ai-proxy-rules/main/rules/clash/global.yaml");
assert.ok(!Object.hasOwn(aiProvider, "payload"), "the AI list is fetched remotely instead of embedded in the template");
for (const host of ["openai.com", "chatgpt.com", "claude.ai", "gemini.google.com", "cursor.com", "copilot.microsoft.com"]) {
  assert.ok(ai.includes("DOMAIN-SUFFIX," + host));
}
const excluded = new Set(sourceCache.upstream_ai.excluded);
const activeAi = ai.filter(row => !excluded.has(row));
assert.deepEqual(sourceCache.providers["ai-domain"].payload, activeAi.filter((row) => /^(DOMAIN|DOMAIN-SUFFIX),/.test(row)));
assert.deepEqual(sourceCache.providers["ai-regex"].payload, activeAi.filter((row) => row.startsWith("DOMAIN-REGEX,")));
assert.deepEqual(sourceCache.providers["ai-context"].payload, activeAi.filter(row => !/^(DOMAIN|DOMAIN-SUFFIX|DOMAIN-REGEX),/.test(row)));
for (const row of ["DOMAIN,assets.msn.com", "DOMAIN,api.msn.com", "DOMAIN,api.cloudflare.com", "IP-ASN,14061,no-resolve"]) {
  assert.ok(excluded.has(row) || !ai.includes(row), "shared service is excluded from dedicated AI routes: " + row);
}
assert.ok(!remote["rule-providers"]["next-rules-v2-ai"], "the independently updated complete provider is retired");
assert.ok(rules.indexOf("GEOSITE,category-ai-!cn," + group.ai) > domesticIp);
for(const tag of ['openai','anthropic','google-gemini','cursor','github-copilot','perplexity','poe','windsurf','elevenlabs']){
  assert.ok(rules.indexOf('GEOSITE,'+tag+','+group.ai) > domainIndex && rules.indexOf('GEOSITE,'+tag+','+group.ai) < direct);
}
const googleIpIndex = rules.indexOf("GEOIP,google," + group.google + ",no-resolve");
const aiMicrosoft = rules.indexOf("AND,((GEOSITE,category-ai-!cn),(GEOSITE,microsoft))," + group.ai);
assert.ok(direct < aiMicrosoft && aiMicrosoft < rules.indexOf("GEOSITE,microsoft," + group.microsoft));
const voiceMatcher = "AND,((NETWORK,UDP),(DST-PORT,3478),(RULE-SET,next-rules-v2-ai-voice,no-resolve))";
const voiceRule = voiceMatcher + "," + group.ai;
assert.ok(googleIpIndex > rules.indexOf(voiceRule) && googleIpIndex < domesticIp);
assert.ok(rules.includes("AND,((NETWORK,UDP),(GEOIP,google,no-resolve)),REJECT"));
assert.ok(!remote["rule-providers"]["next-rules-v2-ai-process"], "process rules come from the complete maintained source");
const voice = remote["rule-providers"]["next-rules-v2-ai-voice"];
assert.equal(voice.type, "http");
assert.equal(voice.behavior, "ipcidr");
assert.equal(voice.url, "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/ai/voice-ip.yaml");
assert.deepEqual(rules.filter(rule => rule.includes("next-rules-v2-ai-voice")), [voiceRule, voiceMatcher + ",REJECT"]);
assert.ok(!remote["rule-providers"]["next-rules-v2-ai-ip"], "the unscoped list is retired");
for (const [name, provider] of Object.entries(remote["rule-providers"])) {
  if (provider.type !== "http") continue;
  assert.equal(provider.proxy, group.default, name + " download uses the explicit proxy");
  assert.equal(provider.interval, 86400);
  assert.ok(!Object.hasOwn(provider, "payload"), name + " must not embed domain or IP snapshots");
  assert.ok(!Object.hasOwn(provider, "legacyUrl"), name + " must not expose internal metadata to Mihomo");
}
const resolutionIndex = rules.indexOf("GEOIP,private,DIRECT");
for (const condition of [voiceRule, "RULE-SET,next-rules-v2-telegram-ip," + group.telegram + ",no-resolve", "GEOIP,netflix," + group.media + ",no-resolve"]) {
  assert.ok(resolutionIndex >= 0 && resolutionIndex < rules.indexOf(condition) && rules.indexOf(condition) < domesticIp, "resolve before dedicated IP matching: " + condition);
}
// Updating a profile from the published seeded form must remove its old HTTP payload.
const outdated = normalize(local);
outdated["rule-providers"]["next-rules-v2-ai-context"].payload = ["DOMAIN,old.example"];
assert.deepEqual(normalize(ctx.main(outdated)), local);
const staleCacheProfile = normalize(local);
for (const [id, item] of Object.entries(sourceCache.providers)) {
  if (!item.legacyUrl) continue;
  const name = "next-rules-v2-" + id;
  const previous = staleCacheProfile["rule-providers"][name];
  previous.url = item.legacyUrl;
  previous.path = "./providers/" + name + "." + item.format;
  assert.notEqual(remote["rule-providers"][name].path, previous.path);
}
assert.deepEqual(normalize(ctx.main(normalize(staleCacheProfile))), local, "upgrading replaces the old URLs and their cache paths");
const previousDns = {"nameserver-policy": {"rule-set:next-rules-v2-ai-domain": ["system"]}};
const staleWithDns = normalize(ctx.main({...normalize(staleCacheProfile), dns: previousDns}));
assert.deepEqual(staleWithDns.dns, previousDns);
assert.deepEqual(staleWithDns["rule-providers"]["next-rules-v2-ai-domain"], staleCacheProfile["rule-providers"]["next-rules-v2-ai-domain"]);
assert.ok(staleWithDns.rules.includes("RULE-SET,next-rules-v2-ai-domain-2," + group.ai));
assert.deepEqual(normalize(ctx.main(normalize(staleWithDns))), staleWithDns);
const downloadConflict = normalize(ctx.main({
  proxies: [...proxies, {...proxies[0], name: group.default}]
}));
const allocatedDefault = group.default + " · Next-Rules";
for (const provider of Object.values(downloadConflict["rule-providers"])) {
  if (provider.type === "http") assert.equal(provider.proxy, allocatedDefault);
}
const externalDns = {"nameserver-policy": {"rule-set:next-rules-v2-ai-domain": ["system"]}};
const externalProvider = {type: "inline", behavior: "classical", payload: ["DOMAIN,custom-ai.invalid"]};
const dnsProviderConflict = normalize(ctx.main({
  proxies, dns: externalDns, "rule-providers": {"next-rules-v2-ai-domain": externalProvider}
}));
assert.deepEqual(dnsProviderConflict.dns, externalDns);
assert.deepEqual(dnsProviderConflict["rule-providers"]["next-rules-v2-ai-domain"], externalProvider);
assert.ok(dnsProviderConflict.rules.includes("RULE-SET,next-rules-v2-ai-domain-2," + group.ai));
assert.deepEqual(normalize(ctx.main(normalize(dnsProviderConflict))), dnsProviderConflict);
assert.deepEqual(normalize(ctx.main(normalize(downloadConflict))), downloadConflict, "download proxy remapping is idempotent");
const preservedDownload = normalize(ctx.main({
  proxies,
  "proxy-groups": [{name: group.default, type: "select", proxies: [proxies[0].name]}],
  "rule-providers": {original: {type: "http", behavior: "domain", format: "text", url: "https://example.test/list", path: "./original.txt", proxy: group.default}}
}));
assert.equal(groups(preservedDownload)[group.default].proxies[0], proxies[0].name, "original download dependencies are retained");
assert.equal(preservedDownload["rule-providers"].original.proxy, group.default);
assert.equal(preservedDownload["rule-providers"]["next-rules-v2-ai-context"].proxy, allocatedDefault);

const previous = normalize(local);
delete previous['rule-providers']['next-rules-v2-ai-context'];
previous['rule-providers']['next-rules-v2-ai'] = {
  type:'http',behavior:'classical',format:'yaml',interval:86400,
  url:'https://raw.githubusercontent.com/VPSDance/ai-proxy-rules/main/rules/clash/global.yaml',
  path:'./providers/next-rules-v2-ai.yaml',proxy:group.default
};
previous['rule-providers']['next-rules-v2-ai-ip'] = {
  type:'http',behavior:'classical',format:'text',interval:86400,
  url:'https://ruleset.skk.moe/Clash/ip/ai.txt',
  path:'./providers/next-rules-v2-ai-ip.text',proxy:group.default
};
const upgraded = normalize(ctx.main(normalize(previous)));
assert.ok(!upgraded['rule-providers']['next-rules-v2-ai'], 'unused old source provider is removed');
assert.ok(!upgraded['rule-providers']['next-rules-v2-ai-ip'], 'unused unscoped IP source is removed');
const oldIpDns = {'fake-ip-filter-mode':'rule','fake-ip-filter':['RULE-SET,next-rules-v2-ai-ip,fake-ip','MATCH,real-ip']};
const retainedOldIp = normalize(ctx.main({...normalize(previous),dns:oldIpDns}));
assert.deepEqual(retainedOldIp.dns, oldIpDns);
assert.deepEqual(retainedOldIp['rule-providers']['next-rules-v2-ai-ip'], previous['rule-providers']['next-rules-v2-ai-ip']);
assert.equal(upgraded['proxy-groups'].filter(item=>item.name.startsWith(group.default)).length,1,'upgrade does not accumulate default selectors');
assert.ok(upgraded['rule-providers']['next-rules-v2-ai-context']);
for(const dependencies of [
  {dns:{'fake-ip-filter-mode':'rule','fake-ip-filter':['RULE-SET,next-rules-v2-ai,fake-ip','MATCH,real-ip']}},
  {'sub-rules':{custom:['AND,((RULE-SET,next-rules-v2-ai)),DIRECT']}},
  {'sub-rules':{custom:['RULE-SET, next-rules-v2-ai, DIRECT']}}
]){
  const preserved=normalize(ctx.main({...normalize(previous),...dependencies}));
  assert.deepEqual(preserved['rule-providers']['next-rules-v2-ai'],previous['rule-providers']['next-rules-v2-ai'],'external dependencies keep the old provider');
  for(const [key,value]of Object.entries(dependencies)) {
    if(key === 'dns') for(const [field,setting] of Object.entries(value)) assert.deepEqual(preserved.dns[field],setting);
    else assert.deepEqual(preserved[key],value);
  }
  assert.deepEqual(normalize(ctx.main(normalize(preserved))),preserved,'upgrade with dependencies remains idempotent');
}
const customized = normalize(previous);
customized['rule-providers']['next-rules-v2-ai'].header = {'User-Agent':['custom-client']};
assert.deepEqual(normalize(ctx.main(customized))['rule-providers']['next-rules-v2-ai'],customized['rule-providers']['next-rules-v2-ai'],'user-customized providers are not retired');
const archived=JSON.parse(fs.readFileSync(path.join(__dirname,'../old/manifest.json'),'utf8'));
for(const entry of archived.files){
  const data=fs.readFileSync(path.join(__dirname,'..',entry.path));
  assert.equal(require('node:crypto').createHash('sha256').update(data).digest('hex'),entry.sha256,entry.path);
}

console.log("Next-Rules policy checks passed.");

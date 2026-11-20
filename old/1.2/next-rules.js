// ============================================================
// Next-Rules 1.2
// Clash Verge Rev 订阅扩展脚本
//
// 本脚本只负责策略组、规则集和分流顺序。
// DNS、TUN、IPv6、Sniffer、Hosts、端口和运行模式继续由原订阅或客户端负责。
// ============================================================

const NEXT_RULES_VERSION = "1.2";

// 过滤以说明标签开头的订阅信息；线路名称中的“流量”或 Bandwidth 等字样正常保留。
const METADATA_FILTER = "(?i)(?:^|[|｜])[^A-Za-z0-9\\u3400-\\u9FFF]*(?:官网(?:地址|网址)?|官方(?:网站|网址|频道|群组|交流群)?|流量(?:剩余|已用|总量|重置)?|剩余(?:流量)?|可用流量|已用流量|总流量|到期(?:时间|日期)?|过期(?:时间|日期)?|有效期|套餐(?:信息|名称|到期)?|订阅(?:信息|地址|链接|更新)?|(?:下次)?重置(?:时间|日期)?|traffic|remaining(?:[ _-]+traffic)?|expire[sd]?|expiry|quota|bandwidth|subscription|reset|official(?:[ _-]+(?:website|site|channel))?|website)(?=$|[\\s:：=|｜0-9-])";
const METADATA_RE = new RegExp(METADATA_FILTER.replace(/^\(\?i\)/, ""), "i");

// 脚本会统一生成以下策略组；更新订阅时会替换同名旧组。
const OWNED_GROUPS = new Set([
  "♻️ 自动选择 [系统]",
  "🛑 广告拦截 [系统]",
  "🖥️ 软件分流 [自选]",
  "🤖 AI服务 [自选]",
  "🔍 谷歌服务(含油管) [自选]",
  "💰 币圈专用 [自选]",
  "🎬 流媒体 [自选]",
  "🍎 苹果服务 [自选]",
  "💬 电报专用 [自选]",
  "Ⓜ️ 微软服务 [自选]",
  "🚀 默认代理 [自选]"
]);

const LEGACY_GROUPS = new Set([
  "直连(DIRECT)",
  "禁止广告(REJECT)",
  "🌐 全部节点 [系统]",
  "🌍 其他地区 [系统]",
  "🇺🇸 美国节点 [系统]",
  "🇲🇾 马来西亚节点 [系统]",
  "🇭🇰 香港节点 [系统]",
  "🇯🇵 日本节点 [系统]",
  "🇸🇬 新加坡节点 [系统]",
  "🇩🇪 德国节点 [系统]",
  "🛡️ 故障转移 [系统]",
  "⚖️ 负载均衡 [系统]",
  "🛰️ next-rules 规则下载 [系统]"
]);

// 未被其他配置引用的旧版策略组会在更新时清理，不会重新生成。

// 未被原订阅子规则引用的旧版规则集会在更新时清理。
const LEGACY_PROVIDER_NAMES = [
  "next-ads",
  "next-ai",
  "next-youtube",
  "next-crypto",
  "next-disney",
  "next-apple",
  "next-google",
  "next-software"
];

const unique = (items) => [...new Set(items.filter(Boolean))];

function sourceFor(nodes, providerNames, keepDirect = false) {
  const source = {};
  if (nodes.length) source.proxies = nodes;
  if (providerNames.length) {
    source.use = providerNames;
    // 使用节点提供者的订阅也保留提供者节点，供自动选择和场景组使用。
    source["include-all-proxies"] = true;
    // 组级过滤同时作用于显式节点；场景组须保留 DIRECT（直连）。
    // 默认代理与自动选择只列出代理节点，并排除订阅说明。
    if (!keepDirect) source["exclude-type"] = "Direct";
    source["exclude-filter"] = keepDirect ? METADATA_FILTER : `${METADATA_FILTER}|^DIRECT$`;
  }
  return source;
}

function withSceneSource(nodes, providerNames, extraProxies) {
  const source = sourceFor(nodes, providerNames, true);
  source.proxies = unique([...extraProxies, ...(source.proxies || [])]);
  return source;
}

function ownedGroupBase(name) {
  if (typeof name !== "string") return null;
  for (const base of OWNED_GROUPS) {
    const alias = base + " · Next-Rules";
    if (name === base || name === alias) return base;
    if (name.startsWith(alias + " ") && /^(?:[2-9]|[1-9][0-9]+)$/.test(name.slice(alias.length + 1))) return base;
  }
  return null;
}

const managedGroupName = (name) => ownedGroupBase(name) !== null || LEGACY_GROUPS.has(name);

function retainSubscriptionGroups(config, providers) {
  const existing = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const managed = new Map(existing
    .filter((group) => group && managedGroupName(group.name))
    .map((group) => [group.name, group]));
  const managedNames = [...managed.keys()].sort((a, b) => b.length - a.length);
  const required = new Set();
  const visited = new WeakSet();

  // 原订阅的链式节点、DNS 出口或其他策略组依赖的已有组保持原样。
  const inspect = (value) => {
    if (typeof value === "string") {
      let decoded = value;
      try { decoded = decodeURIComponent(value); } catch (_) { /* 非 URL 编码字符串按原文检查。 */ }
      for (const text of [value, decoded]) {
        let remaining = text;
        // 优先识别完整长名称，避免把带后缀的组误认为另一个同名前缀组。
        for (const name of managedNames) {
          if (remaining.includes(name)) {
            required.add(name);
            remaining = remaining.split(name).join("\0");
          }
        }
      }
    } else if (value && typeof value === "object" && !visited.has(value)) {
      visited.add(value);
      for (const child of Object.values(value)) inspect(child);
    }
  };

  inspect(existing.filter((group) => group && !managedGroupName(group.name)));
  for (const [key, value] of Object.entries(config)) {
    if (!["proxy-groups", "rules", "rule-providers"].includes(key)) inspect(value);
  }
  inspect(providers);
  // 多级依赖一并保留，避免更新后出现找不到策略组或链式连接循环的错误。
  for (const name of required) inspect(managed.get(name));

  return existing.filter((group) => (
    group && (!managedGroupName(group.name) || required.has(group.name))
  ));
}

function allocateGroupNames(config, retainedGroups) {
  const rawNodes = Array.isArray(config.proxies) ? config.proxies : [];
  const occupied = new Set([
    ...rawNodes.filter(Boolean).map((proxy) => proxy.name),
    ...Object.keys(config["proxy-providers"] || {}),
    ...retainedGroups.map((group) => group.name)
  ]);
  const names = new Map();
  // 原节点和提供者不改名；仅在重名时为新策略组添加项目后缀。
  for (const base of OWNED_GROUPS) {
    let name = base;
    let suffix = 1;
    while (occupied.has(name)) {
      name = base + " · Next-Rules" + (suffix === 1 ? "" : " " + suffix);
      suffix += 1;
    }
    occupied.add(name);
    names.set(base, name);
  }
  return names;
}

function main(config) {
  if (!config || typeof config !== "object") return config;

  const inlineNodes = Array.isArray(config.proxies)
    ? config.proxies
        .filter((proxy) => (
          proxy &&
          String(proxy.type || "").toLowerCase() !== "direct" &&
          String(proxy.name || "").toUpperCase() !== "DIRECT"
        ))
        .map((proxy) => proxy.name)
        .filter((name) => typeof name === "string" && name.length)
        .filter((name) => !METADATA_RE.test(name))
    : [];

  const providerNames = config["proxy-providers"] && typeof config["proxy-providers"] === "object"
    ? Object.keys(config["proxy-providers"])
    : [];

  if (!inlineNodes.length && !providerNames.length) return config;

  const providers = { ...(config["rule-providers"] || {}) };
  // 子规则继续使用的旧规则集须保留，避免原订阅中的子规则失效。
  const subRulesText = JSON.stringify(config["sub-rules"] || {});
  for (const legacyName of LEGACY_PROVIDER_NAMES) {
    if (!subRulesText.includes(legacyName)) delete providers[legacyName];
  }

  const provider = (name, url) => {
    providers[name] = {
      type: "http",
      behavior: "classical",
      format: "yaml",
      url,
      path: `./providers/${name}.yaml`,
      interval: 86400
    };
  };

  provider("next-rules-ads", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/ads.yaml");
  provider("next-rules-ai", "https://cdn.jsdelivr.net/gh/VPSDance/ai-proxy-rules@main/rules/clash/global.yaml");
  provider("next-rules-youtube", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/youtube.yaml");
  provider("next-rules-crypto", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/crypto.yaml");
  provider("next-rules-disney", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/disney.yaml");
  provider("next-rules-apple", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/apple.yaml");
  provider("next-rules-google", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/google.yaml");
  provider("next-rules-software", "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/software.yaml");

  const retainedGroups = retainSubscriptionGroups(config, providers);
  const groupNames = allocateGroupNames(config, retainedGroups);
  const groups = [];
  const addGroup = (group) => groups.push({
    ...group,
    name: groupNames.get(group.name) || group.name
  });

  const autoGroup = groupNames.get("♻️ 自动选择 [系统]");
  const defaultGroup = groupNames.get("🚀 默认代理 [自选]");

  // 默认代理组不含 DIRECT，未命中规则的流量默认使用代理。
  const defaultSource = sourceFor(inlineNodes, providerNames);
  addGroup({
    name: defaultGroup,
    type: "select",
    ...defaultSource,
    proxies: unique([autoGroup, ...(defaultSource.proxies || [])])
  });

  // 各场景可独立选择自动选择、DIRECT（直连）或当前订阅中的节点。
  const sceneSource = () => withSceneSource(
    inlineNodes,
    providerNames,
    [autoGroup, "DIRECT"]
  );
  const sceneGroup = (name) => addGroup({
    name,
    type: "select",
    ...sceneSource()
  });

  sceneGroup("🤖 AI服务 [自选]");
  sceneGroup("🔍 谷歌服务(含油管) [自选]");
  sceneGroup("🎬 流媒体 [自选]");
  sceneGroup("💬 电报专用 [自选]");
  sceneGroup("Ⓜ️ 微软服务 [自选]");
  sceneGroup("🍎 苹果服务 [自选]");
  sceneGroup("💰 币圈专用 [自选]");

  addGroup({
    name: "🖥️ 软件分流 [自选]",
    type: "select",
    ...withSceneSource(inlineNodes, providerNames, [autoGroup, "DIRECT"])
  });

  addGroup({
    name: autoGroup,
    type: "url-test",
    ...sourceFor(inlineNodes, providerNames),
    url: "https://cp.cloudflare.com/generate_204",
    interval: 300,
    tolerance: 50,
    lazy: true
  });

  addGroup({
    name: "🛑 广告拦截 [系统]",
    type: "select",
    proxies: ["REJECT", "DIRECT"]
  });

  // Next-Rules 自有组排在前面，原订阅中未被接管的策略组继续保留在后面。
  groups.push(...retainedGroups);

  config["proxy-groups"] = groups;
  config["rule-providers"] = providers;

  // 软件进程优先进入软件分流；命中直连规则且未命中特定规则的普通流量直连。
  config.rules = [
    "RULE-SET,next-rules-software,🖥️ 软件分流 [自选]",
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "RULE-SET,next-rules-ads,🛑 广告拦截 [系统]",
    "RULE-SET,next-rules-ai,🤖 AI服务 [自选]",
    "RULE-SET,next-rules-youtube,🔍 谷歌服务(含油管) [自选]",
    "RULE-SET,next-rules-google,🔍 谷歌服务(含油管) [自选]",
    "RULE-SET,next-rules-crypto,💰 币圈专用 [自选]",
    "RULE-SET,next-rules-disney,🎬 流媒体 [自选]",
    "GEOSITE,netflix,🎬 流媒体 [自选]",
    "RULE-SET,next-rules-apple,🍎 苹果服务 [自选]",
    "GEOSITE,telegram,💬 电报专用 [自选]",
    "GEOSITE,microsoft,Ⓜ️ 微软服务 [自选]",
    "GEOSITE,CN,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,🚀 默认代理 [自选]"
  ].map((rule) => {
    const parts = rule.split(",");
    const target = parts[0] === "MATCH" ? 1 : 2;
    if (groupNames.has(parts[target])) parts[target] = groupNames.get(parts[target]);
    return parts.join(",");
  });

  return config;
}



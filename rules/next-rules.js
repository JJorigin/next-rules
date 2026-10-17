// ============================================================
// Next-Rules 1.1
// Clash Verge Rev 订阅扩展脚本
//
// 本脚本只负责策略组、规则集和分流顺序。
// DNS、TUN、IPv6、Sniffer、Hosts、端口和运行模式继续由原订阅或客户端负责。
// ============================================================

const NEXT_RULES_VERSION = "1.1";

// 订阅信息节点不应进入代理策略组。
const METADATA_RE = /官网|官方|流量|剩余|到期|过期|套餐|订阅|重置|traffic|remaining|expire|expiry|expires|quota|bandwidth|subscription|reset|official|website/i;
const METADATA_FILTER = "(?i)官网|官方|流量|剩余|到期|过期|套餐|订阅|重置|traffic|remaining|expire|expiry|expires|quota|bandwidth|subscription|reset|official|website";

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

// 旧版策略组只用于更新订阅时清理，不会在新配置中生成。

// 旧版规则集名称只用于更新订阅时清理，不会继续使用。
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

function sourceFor(nodes, providerNames, excludeFilter) {
  const source = {};
  if (nodes.length) source.proxies = nodes;
  if (providerNames.length) {
    source.use = providerNames;
    // 使用节点提供者的订阅也保留提供者节点，供自动选择和场景组使用。
    source["include-all-proxies"] = true;
    source["exclude-type"] = "Direct";
    // 提供者中可能包含订阅说明或 DIRECT 条目，这些不会作为代理节点显示。
    if (excludeFilter) source["exclude-filter"] = `${excludeFilter}|^DIRECT$`;
  }
  return source;
}

function withSceneSource(nodes, providerNames, extraProxies) {
  const source = sourceFor(nodes, providerNames, METADATA_FILTER);
  source.proxies = unique([...extraProxies, ...(source.proxies || [])]);
  return source;
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

  const existingGroups = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const retainedGroups = existingGroups.filter((group) => (
    !(group && (OWNED_GROUPS.has(group.name) || LEGACY_GROUPS.has(group.name)))
  ));
  const groups = [];
  const addGroup = (group) => groups.push(group);

  const autoGroup = "♻️ 自动选择 [系统]";
  const defaultGroup = "🚀 默认代理 [自选]";

  // 默认代理组不含 DIRECT，未命中规则的流量默认使用代理。
  const defaultSource = sourceFor(inlineNodes, providerNames, METADATA_FILTER);
  addGroup({
    name: defaultGroup,
    type: "select",
    ...defaultSource,
    proxies: unique([autoGroup, ...(defaultSource.proxies || [])])
  });

  // 业务场景组直接承载当前订阅中的所有可用代理节点。
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
    ...sourceFor(inlineNodes, providerNames, METADATA_FILTER),
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

  const providers = Object.assign({}, config["rule-providers"] || {});
  for (const legacyName of LEGACY_PROVIDER_NAMES) delete providers[legacyName];

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
  ];

  return config;
}



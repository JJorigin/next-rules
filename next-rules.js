// ============================================================
// Next-Rules 1.0
// Clash Verge Rev 订阅扩展脚本
//
// 本脚本只负责策略组、规则集和分流顺序。
// DNS、TUN、IPv6、Sniffer、Hosts、端口和运行模式继续由原订阅或客户端负责。
// ============================================================

const NEXT_RULES_VERSION = "1.0";

// ---------- 节点识别与过滤 ----------
const METADATA_RE = /官网|官方|流量|剩余|到期|过期|套餐|订阅|重置|traffic|remaining|expire|expiry|expires|quota|bandwidth|subscription|reset|official|website/i;
const METADATA_FILTER = "(?i)官网|官方|流量|剩余|到期|过期|套餐|订阅|重置|traffic|remaining|expire|expiry|expires|quota|bandwidth|subscription|reset|official|website";

// ---------- 地区节点识别顺序 ----------
const REGION_DEFS = [
  {
    name: "🇺🇸 美国节点 [系统]",
    re: /美国|美利坚|United States|America|Los Angeles|San Jose|Seattle|Dallas|New York|San Francisco|🇺🇸|(?:^|[^A-Za-z])US(?:[^A-Za-z]|$)|(?:^|[^A-Za-z])USA(?:[^A-Za-z]|$)/i,
    filter: "(?i)🇺🇸|美国|美利坚|United[ -]?States|America|Los[ -]?Angeles|San[ -]?Jose|Seattle|Dallas|New[ -]?York|San[ -]?Francisco|\\bUS\\b|\\bUSA\\b"
  },
  {
    name: "🇲🇾 马来西亚节点 [系统]",
    re: /马来西亚|馬來西亞|Malaysia|Kuala Lumpur|🇲🇾|(?:^|[^A-Za-z])MY(?:[^A-Za-z]|$)|(?:^|[^A-Za-z])MYS(?:[^A-Za-z]|$)/i,
    filter: "(?i)🇲🇾|马来西亚|馬來西亞|Malaysia|Kuala[ -]?Lumpur|\\bMY\\b|\\bMYS\\b"
  },
  {
    name: "🇭🇰 香港节点 [系统]",
    re: /香港|Hong Kong|Hong-Kong|🇭🇰|(?:^|[^A-Za-z])HK(?:[^A-Za-z]|$)|(?:^|[^A-Za-z])HKG(?:[^A-Za-z]|$)/i,
    filter: "(?i)🇭🇰|香港|Hong[ -]?Kong|\\bHK\\b|\\bHKG\\b"
  },
  {
    name: "🇯🇵 日本节点 [系统]",
    re: /日本|Japan|Tokyo|Osaka|🇯🇵|(?:^|[^A-Za-z])JP(?:[^A-Za-z]|$)|(?:^|[^A-Za-z])JPN(?:[^A-Za-z]|$)/i,
    filter: "(?i)🇯🇵|日本|Japan|Tokyo|Osaka|\\bJP\\b|\\bJPN\\b"
  },
  {
    name: "🇸🇬 新加坡节点 [系统]",
    re: /新加坡|新国|Singapore|🇸🇬|(?:^|[^A-Za-z])SG(?:[^A-Za-z]|$)|(?:^|[^A-Za-z])SGP(?:[^A-Za-z]|$)/i,
    filter: "(?i)🇸🇬|新加坡|新国|Singapore|\\bSG\\b|\\bSGP\\b"
  },
  {
    name: "🇩🇪 德国节点 [系统]",
    re: /德国|德國|Germany|Frankfurt|Berlin|🇩🇪|(?:^|[^A-Za-z])DE(?:[^A-Za-z]|$)|(?:^|[^A-Za-z])DEU(?:[^A-Za-z]|$)/i,
    filter: "(?i)🇩🇪|德国|德國|Germany|Frankfurt|Berlin|\\bDE\\b|\\bDEU\\b"
  }
];

// ---------- 当前脚本生成的策略组 ----------
// 该集合只用于更新订阅时清理同名旧组，不会因为列在这里就自动生成组。
const OWNED_GROUPS = new Set([
  "直连(DIRECT)",
  "禁止广告(REJECT)",
  "🌐 全部节点 [系统]",
  "♻️ 自动选择 [系统]",
  "🌍 其他地区 [系统]",
  "🛑 广告拦截 [系统]",
  "🇺🇸 美国节点 [系统]",
  "🇲🇾 马来西亚节点 [系统]",
  "🇭🇰 香港节点 [系统]",
  "🇯🇵 日本节点 [系统]",
  "🇸🇬 新加坡节点 [系统]",
  "🇩🇪 德国节点 [系统]",
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

// ---------- 旧版遗留的策略组 ----------
// 只用于迁移时清理，不会生成这些组。
const LEGACY_GROUPS = new Set([
  "🛡️ 故障转移 [系统]",
  "⚖️ 负载均衡 [系统]",
  "🛰️ next-rules 规则下载 [系统]"
]);

// 旧版使用的简写规则提供者名称。
// 更新旧订阅时清理这些名称，避免旧配置残留；本脚本不会再生成它们。
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

// ---------- 节点来源合并 ----------
function sourceFor(nodes, providerNames, excludeFilter) {
  const source = {};
  if (nodes.length) source.proxies = nodes;
  if (providerNames.length) {
    source.use = providerNames;
    // 提供者订阅可能包含订阅信息节点或 DIRECT 条目。
    // 提供者路径使用与内嵌节点相同的订阅信息过滤，并显式排除 DIRECT，
    // 避免把直连条目当作代理节点加入策略组。
    if (excludeFilter) source["exclude-filter"] = `${excludeFilter}|^DIRECT$`;
  }
  return source;
}

function main(config) {
  if (!config || typeof config !== "object") return config;

  // ---------- 读取订阅节点 ----------
  const inlineNodes = Array.isArray(config.proxies)
    ? config.proxies
        .filter((proxy) => proxy && String(proxy.type || "").toLowerCase() !== "direct" && String(proxy.name || "").toUpperCase() !== "DIRECT")
        .map((proxy) => proxy.name)
        .filter((name) => typeof name === "string" && name.length)
        .filter((name) => !METADATA_RE.test(name))
    : [];

  const providerNames = config["proxy-providers"] && typeof config["proxy-providers"] === "object"
    ? Object.keys(config["proxy-providers"])
    : [];

  if (!inlineNodes.length && !providerNames.length) return config;

  // ---------- 清理本脚本管理的旧策略组 ----------
  const existingGroups = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const groups = existingGroups.filter((group) => (
    !(group && (OWNED_GROUPS.has(group.name) || LEGACY_GROUPS.has(group.name)))
  ));
  const addGroup = (group) => groups.push(group);

  const regionPlans = REGION_DEFS.map((region) => ({
    ...region,
    members: inlineNodes.filter((node) => region.re.test(node))
  }));
  const availableRegions = regionPlans
    .filter((region) => region.members.length || providerNames.length)
    .map((region) => region.name);

  const otherInlineNodes = inlineNodes.filter((node) => !REGION_DEFS.some((region) => region.re.test(node)));
  const regionFilter = REGION_DEFS.map((region) => region.filter.replace(/^\(\?i\)/, "")).join("|");
  const otherFilter = `(?i)^(?!.*(?:${regionFilter})).*`;
  const allExcludeFilter = METADATA_FILTER;

  const allNodes = inlineNodes;
  const allGroup = "🌐 全部节点 [系统]";
  const autoGroup = "♻️ 自动选择 [系统]";
  const otherGroup = "🌍 其他地区 [系统]";
  const directGroup = "直连(DIRECT)";
  const rejectGroup = "禁止广告(REJECT)";

  // ============================================================
  // 用户策略组
  // 按 Perfect-Rules 原有结构置于最前。
  // ============================================================
  const sceneCandidates = unique([
    autoGroup,
    ...availableRegions,
    otherGroup,
    allGroup,
    directGroup
  ]);

  const sceneGroup = (name) => addGroup({
    name,
    type: "select",
    proxies: sceneCandidates
  });

  sceneGroup("🚀 默认代理 [自选]");
  sceneGroup("🤖 AI服务 [自选]");
  sceneGroup("🔍 谷歌服务(含油管) [自选]");
  sceneGroup("🎬 流媒体 [自选]");
  sceneGroup("💬 电报专用 [自选]");
  sceneGroup("Ⓜ️ 微软服务 [自选]");
  sceneGroup("🍎 苹果服务 [自选]");
  sceneGroup("💰 币圈专用 [自选]");
  sceneGroup("🖥️ 软件分流 [自选]");

  // 内部别名组：分流规则显示中文，底层仍使用 Mihomo 内置 DIRECT/REJECT。
  addGroup({name: directGroup, type: "select", hidden: true, proxies: ["DIRECT"]});
  addGroup({name: rejectGroup, type: "select", hidden: true, proxies: ["REJECT"]});

  // ============================================================
  // 系统组
  // 排在地区节点组、其他地区组和广告拦截组之前。
  // ============================================================
  addGroup({
    name: allGroup,
    type: "select",
    ...sourceFor(allNodes, providerNames, allExcludeFilter)
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

  // ============================================================
  // 地区节点组
  // 顺序：美国、马来西亚、香港、日本、新加坡、德国。
  // ============================================================
  for (const region of regionPlans) {
    if (!region.members.length && !providerNames.length) continue;
    const group = {
      name: region.name,
      type: "url-test",
      ...sourceFor(region.members, providerNames, METADATA_FILTER),
      url: "https://cp.cloudflare.com/generate_204",
      interval: 300,
      tolerance: 50,
      lazy: true
    };
    if (providerNames.length) group.filter = region.filter;
    addGroup(group);
  }

  // ============================================================
  // 其他地区组
  // 未命中指定地区筛选的节点进入这里；全部节点组保留所有有效节点。
  // ============================================================
  if (otherInlineNodes.length || providerNames.length) {
    const group = {
      name: otherGroup,
      type: "select",
      ...sourceFor(otherInlineNodes, providerNames, METADATA_FILTER)
    };
    if (providerNames.length) group.filter = otherFilter;
    addGroup(group);
  }

  // ============================================================
  // 广告拦截组
  // 位于其他地区组之后。
  // ============================================================
  addGroup({
    name: "🛑 广告拦截 [系统]",
    type: "select",
    proxies: [rejectGroup, directGroup]
  });

  // ============================================================
  // 规则提供者（Rule Providers）
  // 外部规则由 Mihomo 按 interval 定期更新。
  // ============================================================
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
  // ============================================================
  // 分流规则（Rules）
  // 顺序遵循“专用规则优先，CN 直连靠后，默认代理兜底”。
  // ============================================================
  config.rules = [
    // 软件进程优先
    "RULE-SET,next-rules-software,🖥️ 软件分流 [自选]",
    // 私有地址 / 局域网
    "GEOSITE,private,直连(DIRECT)",
    "GEOIP,private,直连(DIRECT),no-resolve",
    // 广告
    "RULE-SET,next-rules-ads,🛑 广告拦截 [系统]",
    // AI：必须在中国大陆直连规则之前
    "RULE-SET,next-rules-ai,🤖 AI服务 [自选]",
    // Google 与 YouTube 合并
    "RULE-SET,next-rules-youtube,🔍 谷歌服务(含油管) [自选]",
    "RULE-SET,next-rules-google,🔍 谷歌服务(含油管) [自选]",
    // 币圈
    "RULE-SET,next-rules-crypto,💰 币圈专用 [自选]",
    // 流媒体
    "RULE-SET,next-rules-disney,🎬 流媒体 [自选]",
    "GEOSITE,netflix,🎬 流媒体 [自选]",
    // Apple
    "RULE-SET,next-rules-apple,🍎 苹果服务 [自选]",
    // 电报 / 微软
    "GEOSITE,telegram,💬 电报专用 [自选]",
    "GEOSITE,microsoft,Ⓜ️ 微软服务 [自选]",
    // 中国大陆
    "GEOSITE,CN,直连(DIRECT)",
    "GEOIP,CN,直连(DIRECT),no-resolve",
    // 其他流量
    "MATCH,🚀 默认代理 [自选]"
  ];

  return config;
}

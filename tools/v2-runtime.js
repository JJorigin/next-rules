// Next-Rules 2.1 · Clash Verge Rev 订阅扩展脚本
// 用于订阅的扩展脚本；DNS、TUN 和 IPv6 沿用原订阅及客户端设置。

const POLICY = /* GENERATED POLICY */ null;
const OWNED_GROUPS = new Set(Object.values(POLICY.group));
const unique = (items) => [...new Set(items.filter(Boolean))];
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const BLOCKED_TYPES = "Pass|Compatible|Dns|Reject|RejectDrop";
const BLOCKED_NODE_TYPES = new Set(BLOCKED_TYPES.toLowerCase().split("|"));

const METADATA_FILTER = "(?i)(?:^|[|｜]|\\[海外\\])[^A-Za-z0-9\\u3400-\\u9FFF]*(?:官网(?:地址|网址)?|官方(?:网站|网址|频道|群组|交流群)?|流量(?:剩余|已用|总量|重置)?|剩余(?:流量)?|可用流量|已用流量|总流量|到期(?:时间|日期)?|过期(?:时间|日期)?|有效期|套餐(?:信息|名称|到期)?|订阅(?:信息|地址|链接|更新)?|(?:下次)?重置(?:时间|日期)?|traffic|remaining(?:[ _-]+traffic)?|expire[sd]?|expiry|quota|bandwidth|subscription|reset|official(?:[ _-]+(?:website|site|channel))?|website)(?=$|[\\s:：=|｜0-9-])";
const METADATA_RE = new RegExp(METADATA_FILTER.replace(/^\(\?i\)/, ""), "i");

const LEGACY_GROUPS = new Set([
  "🔍 谷歌服务(含油管) [自选]",
  "🎬 流媒体 [自选]",
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

function ownedGroupBase(name) {
  if (typeof name !== "string") return null;
  for (const base of [...OWNED_GROUPS, ...LEGACY_GROUPS]) {
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
  inspect(Object.fromEntries(Object.entries(providers).filter(([name, definition]) => !isOwnedProvider(name, definition))));
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
    ...Object.keys(asRecord(config["proxy-providers"])),
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

function cachePathKey(path) {
  if (typeof path !== "string") return "";
  const parts = [];
  for (const part of path.replace(/\\/g, "/").toLowerCase().split("/")) {
    if (!part || part === ".") continue;
    if (part === ".." && parts.length && parts[parts.length - 1] !== "..") parts.pop();
    else parts.push(part === ".." ? part : part.replace(/[. ]+$/, ""));
  }
  return parts.join("/");
}

function sameProvider(existing, expected) {
  if (!existing) return false;
  // HTTP 备用内容随构建更新；相同来源仍复用同一缓存文件。
  const keys = (item) => Object.keys(item).filter((key) => !(item.type === "http" && key === "payload"));
  return keys(existing).length === keys(expected).length &&
    keys(expected).every((key) => {
      const value = expected[key];
      if (key === "proxy" && ownedGroupBase(value) && ownedGroupBase(existing[key])) {
        return ownedGroupBase(value) === ownedGroupBase(existing[key]);
      }
      if (!Array.isArray(value)) return existing[key] === value;
      const actual = existing[key];
      return Array.isArray(actual) && actual.length === value.length &&
        value.every((item, index) => item === actual[index]);
    });
}

function isOwnedProvider(name, definition) {
  return Object.entries(POLICY.providers).some(([base, source]) =>
    (name === base || (name.startsWith(base + "-") && /^(?:[2-9]|[1-9][0-9]+)$/.test(name.slice(base.length + 1)))) &&
    sameProvider(definition, providerDefinition(name, source))
  );
}

function ruleProviderRegistry(config, groupNames) {
  const providers = { ...(asRecord(config["rule-providers"])) };
  const occupiedNames = new Map(Object.keys(providers).map((name) => [name.toLowerCase(), name]));
  const paths = [
    ...Object.entries(providers).map(([name, provider]) => [name, cachePathKey(provider && provider.path)]),
    ...Object.values(asRecord(config["proxy-providers"])).map((provider) => [null, cachePathKey(provider && provider.path)])
  ];
  const names = new Map();

  // 原订阅可在 DNS、子规则等位置引用这些规则集。发生冲突时只更改新规则集的名称和缓存路径。
  const add = (base, definition) => {
    for (let suffix = 1; ; suffix += 1) {
      const name = suffix === 1 ? base : base + "-" + suffix;
      const desired = providerDefinition(name, definition, groupNames);
      const occupied = occupiedNames.get(name);
      if (occupied && (occupied !== name || !sameProvider(providers[occupied], desired))) continue;
      const cachePath = cachePathKey(desired.path);
      // 本地脚本无法得知内核工作目录，绝对路径使用相同后缀时也保留原缓存。
      if (cachePath && paths.some(([owner, used]) =>
        owner !== name && (used === cachePath || used.endsWith("/" + cachePath))
      )) continue;
      if (!occupied) {
        occupiedNames.set(name, name);
        if (cachePath) paths.push([name, cachePath]);
      }
      providers[name] = desired;
      names.set(base, name);
      return;
    }
  };
  return { providers, names, add };
}

function providerDefinition(name, definition, groupNames = new Map()) {
  if (definition.type === "http") {
    return { ...definition, proxy: groupNames.get(definition.proxy) || definition.proxy, path: "./providers/" + name + "." + definition.format };
  }
  return { ...definition, payload: [...definition.payload] };
}

function buildGroups(groupNames, inlineNodes, providerNames = []) {
  const g = POLICY.group;
  const nameOf = (name) => groupNames.get(name) || name;
  const auto = nameOf(g.auto);
  const source = {
    "exclude-filter": METADATA_FILTER
  };
  // 远程入口从面板订阅读取节点。本地入口筛选内嵌节点，并沿用原来的节点提供者。
  if (inlineNodes === undefined) source["include-all"] = true;
  if (providerNames.length) source.use = providerNames;

  function selector(base, manualDirect, preferred = auto) {
    return {
      name: nameOf(base),
      type: "select",
      "default-selected": preferred,
      "empty-fallback": "REJECT",
      ...source,
      "exclude-type": manualDirect ? BLOCKED_TYPES : "Direct|" + BLOCKED_TYPES,
      proxies: unique([preferred, auto, ...(manualDirect ? ["DIRECT"] : []), ...(inlineNodes || [])])
    };
  }

  const autoGroup = {
    name: auto,
    type: "url-test",
    "empty-fallback": "REJECT",
    ...source,
    "exclude-type": "Direct|" + BLOCKED_TYPES,
    url: "https://cp.cloudflare.com/generate_204",
    interval: 300,
    tolerance: 50,
    lazy: true
  };
  if (inlineNodes !== undefined && (inlineNodes.length || !providerNames.length)) {
    autoGroup.proxies = inlineNodes.length ? inlineNodes : ["REJECT"];
  }

  return [
    selector(g.default, false),
    ...[g.ai, g.google, g.youtube, g.media, g.mediaAsia, g.telegram, g.microsoft, g.apple, g.crypto, g.software]
      .map((base) => selector(base, true, base === g.youtube ? nameOf(g.google) : auto)),
    autoGroup,
    { name: nameOf(g.ads), type: "select", proxies: ["REJECT", "DIRECT"] }
  ];
}

function renderRules(providerNames, groupNames) {
  function tokens(condition) {
    const fields = condition.split(",");
    if (fields[0] === "RULE-SET") fields[1] = providerNames.get(fields[1]) || fields[1];
    return fields;
  }

  function and(conditions, target) {
    return "AND,(" + conditions.map((condition) => "(" + tokens(condition).join(",") + ")").join(",") + ")," + target;
  }

  const result = [];
  for (const [condition, base, guard] of POLICY.routes) {
    const target = groupNames.get(base) || base;
    if (Array.isArray(condition)) {
      result.push(and(condition, target));
    } else {
      const fields = tokens(condition);
      fields.splice(Math.min(fields.length, 2), 0, target);
      result.push(fields.join(","));
    }
    // 节点不支持 UDP 时内核会继续匹配，因此在同一条件下拒绝该请求。
    if (guard) result.push(and(unique(["NETWORK,UDP", ...[].concat(condition)]), "REJECT"));
  }
  return result;
}

function remoteFragment() {
  const groupNames = new Map();
  const providers = Object.fromEntries(Object.entries(POLICY.providers).map(([name, definition]) => [
    name, providerDefinition(name, definition)
  ]));
  return {
    "rule-providers": providers,
    "proxy-groups": buildGroups(groupNames),
    rules: renderRules(new Map(), groupNames)
  };
}

function main(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  const inlineNodes = Array.isArray(config.proxies)
    ? config.proxies.filter((node) => (
      node && typeof node.name === "string" &&
      !METADATA_RE.test(node.name) &&
      !BLOCKED_NODE_TYPES.has(String(node.type || "").toLowerCase())
    )).map((node) => node.name)
    : [];
  const providerNames = Object.keys(asRecord(config["proxy-providers"]));
  const retained = retainSubscriptionGroups(config, asRecord(config["rule-providers"]));
  const groupNames = allocateGroupNames(config, retained);
  const { providers, names: ruleProviderNames, add } = ruleProviderRegistry(config, groupNames);
  for (const [name, definition] of Object.entries(POLICY.providers)) add(name, definition);

  config["proxy-groups"] = [...buildGroups(groupNames, inlineNodes, providerNames), ...retained];
  config["rule-providers"] = providers;
  config.rules = renderRules(ruleProviderNames, groupNames);
  return config;
}

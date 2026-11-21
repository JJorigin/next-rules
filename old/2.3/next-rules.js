// Next-Rules 2.3 · Clash Verge Rev 订阅扩展脚本
// 解析按代理、直连与节点域名分开；TUN 和 IPv6 开关由客户端管理。

const POLICY = {
  "version": "2.3",
  "group": {
    "auto": "♻️ 自动选择 [系统]",
    "default": "🚀 默认代理 [自选]",
    "ai": "🤖 AI服务 [自选]",
    "google": "🔍 谷歌服务 [自选]",
    "youtube": "📺 YouTube [自选]",
    "media": "🎬 全球流媒体 [自选]",
    "mediaAsia": "🌏 亚太流媒体 [自选]",
    "telegram": "💬 电报专用 [自选]",
    "microsoft": "Ⓜ️ 微软服务 [自选]",
    "apple": "🍎 苹果服务 [自选]",
    "crypto": "💰 币圈专用 [自选]",
    "software": "🖥️ 软件分流 [自选]",
    "ads": "🛑 广告拦截 [系统]"
  },
  "providers": {
    "next-rules-v2-ai-context": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/ai/context.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-ai-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/ai/domains-exact.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-ai-regex": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/ai/domains-regex.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-ai-ip": {
      "type": "http",
      "behavior": "classical",
      "format": "text",
      "url": "https://ruleset.skk.moe/Clash/ip/ai.txt",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-crypto": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/crypto.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-channel4": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/All4/All4.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-channel4-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/channel4-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-itv": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/ITV/ITV.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-itv-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/itv-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-fubo": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/FuboTV/FuboTV.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-fubo-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/fubo-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-crunchyroll": {
      "type": "http",
      "behavior": "classical",
      "format": "text",
      "url": "https://raw.githubusercontent.com/liandu2024/clash/main/list/Crunchyroll.list",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-crunchyroll-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/crunchyroll-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-linetv": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/LineTV/LineTV.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-linetv-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/linetv-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-friday": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/friDay/friDay.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-friday-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/friday-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-hulujp": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/HuluJP/HuluJP.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-media-hulujp-domain": {
      "type": "http",
      "behavior": "classical",
      "format": "yaml",
      "url": "https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/media/hulujp-domains.yaml",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]"
    },
    "next-rules-v2-software": {
      "type": "inline",
      "behavior": "classical",
      "payload": [
        "PROCESS-NAME-WILDCARD,*Discord*",
        "PROCESS-NAME-WILDCARD,*Steam*",
        "PROCESS-NAME-WILDCARD,*EpicGames*",
        "PROCESS-NAME-WILDCARD,*WhatsApp*"
      ]
    },
    "next-rules-v2-telegram-ip": {
      "type": "http",
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs",
      "interval": 86400,
      "proxy": "🚀 默认代理 [自选]",
      "path-in-bundle": "geo/geoip/telegram.mrs"
    }
  },
  "routes": [
    [
      "GEOSITE,private",
      "DIRECT"
    ],
    [
      "GEOIP,private,no-resolve",
      "DIRECT"
    ],
    [
      "GEOSITE,category-ads-all",
      "🛑 广告拦截 [系统]"
    ],
    [
      "RULE-SET,next-rules-v2-ai-domain",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,openai",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,anthropic",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,google-gemini",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,cursor",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,github-copilot",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,perplexity",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,poe",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,windsurf",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,elevenlabs",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,niconico",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,bilibili@!cn",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,iqiyi@!cn",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,apple-cn",
      "DIRECT"
    ],
    [
      "GEOSITE,microsoft@cn",
      "DIRECT"
    ],
    [
      "GEOSITE,steam@cn",
      "DIRECT"
    ],
    [
      "GEOSITE,CN",
      "DIRECT"
    ],
    [
      "RULE-SET,next-rules-v2-ai-regex",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "GEOSITE,youtube",
      "📺 YouTube [自选]",
      true
    ],
    [
      "GEOSITE,google",
      "🔍 谷歌服务 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-crypto",
      "💰 币圈专用 [自选]",
      true
    ],
    [
      "GEOSITE,mytvsuper",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,now",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,viu",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,rthk",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,bahamut",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,litv",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,hamivideo",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,catchplay",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,kkbox",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      [
        "RULE-SET,next-rules-v2-media-linetv-domain",
        "NOT,((DOMAIN-SUFFIX,line-cdn.net))",
        "NOT,((DOMAIN-SUFFIX,line-scdn.net))"
      ],
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      [
        "RULE-SET,next-rules-v2-media-friday-domain",
        "NOT,((DOMAIN-SUFFIX,fetnet.net))"
      ],
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,abema",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,tver",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,unext",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,nhk",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,radiko",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-hulujp-domain",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,hotstar",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,netflix",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,disney",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,hbo",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,primevideo",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,apple-tvplus",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,spotify",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,twitch",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,cbs",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,nbcuniversal",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,discoveryplus",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,bbc",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,amc",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,pbs",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,formula1",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,dazn",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,mubi",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,vimeo",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,dailymotion",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,plutotv",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,tubi",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,plex",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,sling",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,roku",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,deezer",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,soundcloud",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,tidal",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-channel4-domain",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-itv-domain",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-fubo-domain",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-crunchyroll-domain",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOSITE,apple",
      "🍎 苹果服务 [自选]",
      true
    ],
    [
      "GEOSITE,telegram",
      "💬 电报专用 [自选]",
      true
    ],
    [
      "GEOSITE,microsoft",
      "Ⓜ️ 微软服务 [自选]",
      true
    ],
    [
      "GEOIP,private",
      "DIRECT"
    ],
    [
      "RULE-SET,next-rules-v2-ai-ip,no-resolve",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-telegram-ip,no-resolve",
      "💬 电报专用 [自选]",
      true
    ],
    [
      "GEOIP,telegram,no-resolve",
      "💬 电报专用 [自选]",
      true
    ],
    [
      "GEOIP,netflix,no-resolve",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "GEOIP,google,no-resolve",
      "🔍 谷歌服务 [自选]",
      true
    ],
    [
      "GEOIP,CN",
      "DIRECT"
    ],
    [
      "GEOSITE,category-ai-!cn",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-ai-context",
      "🤖 AI服务 [自选]",
      true
    ],
    [
      [
        "RULE-SET,next-rules-v2-media-linetv",
        "NOT,((DOMAIN-SUFFIX,line-cdn.net))",
        "NOT,((DOMAIN-SUFFIX,line-scdn.net))"
      ],
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      [
        "RULE-SET,next-rules-v2-media-friday",
        "NOT,((DOMAIN-SUFFIX,fetnet.net))"
      ],
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-hulujp",
      "🌏 亚太流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-channel4",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-itv",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-fubo",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-media-crunchyroll",
      "🎬 全球流媒体 [自选]",
      true
    ],
    [
      "RULE-SET,next-rules-v2-software",
      "🖥️ 软件分流 [自选]",
      true
    ],
    [
      "NETWORK,UDP",
      "🚀 默认代理 [自选]"
    ],
    [
      "NETWORK,UDP",
      "REJECT"
    ],
    [
      "MATCH",
      "🚀 默认代理 [自选]"
    ]
  ],
  "dns": {
    "proxy": [
      "https://1.1.1.1/dns-query",
      "https://8.8.8.8/dns-query"
    ],
    "direct": [
      "https://dns.alidns.com/dns-query#DIRECT",
      "https://doh.pub/dns-query#DIRECT"
    ],
    "bootstrap": [
      "223.5.5.5",
      "119.29.29.29"
    ],
    "domainRuleCount": 75
  }
};
const OWNED_GROUPS = new Set(Object.values(POLICY.group));
const unique = (items) => [...new Set(items.filter(Boolean))];
const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const BLOCKED_TYPES = "Pass|Compatible|Dns|Reject|RejectDrop";
const BLOCKED_NODE_TYPES = new Set(BLOCKED_TYPES.toLowerCase().split("|"));

const METADATA_FILTER = "(?i)(?:^|[|｜]|\\[海外\\])[^A-Za-z0-9\\u3400-\\u9FFF]*(?:官网(?:地址|网址)?|官方(?:网站|网址|频道|群组|交流群)|流量(?:剩余|已用|总量|重置)?|剩余(?:流量)?|可用流量|已用流量|总流量|到期(?:时间|日期)?|过期(?:时间|日期)?|有效期|套餐(?:信息|名称|到期)?|订阅(?:信息|地址|链接|更新)?|(?:下次)?重置(?:时间|日期)?|traffic|remaining(?:[ _-]+traffic)?|expire[sd]?|expiry|quota|bandwidth|subscription|reset|official[ _-]+(?:website|site|channel)|website)(?=$|[\\s:：=|｜0-9-])";
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
  // 相同来源复用缓存，更新脚本时一并去除旧版本的内置副本。
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

function retiredAiProvider(name, definition) {
  return /^next-rules-v2-ai(?:-(?:[2-9]|[1-9][0-9]+))?$/.test(name) &&
    definition && definition.type === "http" && definition.behavior === "classical" &&
    definition.format === "yaml" && definition.interval === 86400 &&
    Object.keys(definition).every(key => ["type", "behavior", "format", "interval", "url", "path", "proxy", "payload"].includes(key)) &&
    definition.url === "https://raw.githubusercontent.com/VPSDance/ai-proxy-rules/main/rules/clash/global.yaml" &&
    definition.path === "./providers/" + name + ".yaml" &&
    ownedGroupBase(definition.proxy) === POLICY.group.default;
}

function dropUnusedRetiredProviders(config) {
  const providers = asRecord(config["rule-providers"]);
  const names = Object.keys(providers).filter(name => retiredAiProvider(name, providers[name]));
  if (!names.length) return;
  const used = new Set(), visited = new WeakSet();
  const inspect = value => {
    if (typeof value === "string") {
      let decoded = value;
      try { decoded = decodeURIComponent(value); } catch (_) { /* 保留原文。 */ }
      for (const name of names) {
        const matcher = new RegExp("RULE-SET\\s*,\\s*" + name + "(?=\\s*[,)]|\\s*$)|rule-set:\\s*" + name + "(?=[,\\s#]|$)", "i");
        if ([value, decoded].some(text => matcher.test(text))) used.add(name);
      }
    } else if (value && typeof value === "object" && !visited.has(value)) {
      visited.add(value);
      for (const [key, child] of Object.entries(value)) { inspect(key); inspect(child); }
    }
  };
  for (const [key, value] of Object.entries(config)) {
    if (!["rules", "proxy-groups", "rule-providers"].includes(key)) inspect(value);
  }
  for (const [name, definition] of Object.entries(providers)) if (!names.includes(name)) inspect(definition);
  // 原订阅仍有引用时保留；移除没有外部依赖的旧下载项。
  config["rule-providers"] = Object.fromEntries(Object.entries(providers).filter(([name]) => !names.includes(name) || used.has(name)));
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
      return name;
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

function ruleTokens(condition, providerNames) {
  const fields = condition.split(",");
  if (fields[0] === "RULE-SET") fields[1] = providerNames.get(fields[1]) || fields[1];
  return fields;
}

function matcher(conditions, providerNames) {
  return "AND,(" + conditions.map(condition => "(" + ruleTokens(condition, providerNames).join(",") + ")").join(",") + ")";
}

function renderRules(providerNames, groupNames) {

  const result = [];
  for (const [condition, base, guard] of POLICY.routes) {
    const target = groupNames.get(base) || base;
    if (Array.isArray(condition)) {
      result.push(matcher(condition, providerNames) + "," + target);
    } else {
      const fields = ruleTokens(condition, providerNames);
      fields.splice(Math.min(fields.length, 2), 0, target);
      result.push(fields.join(","));
    }
    // 节点不支持 UDP 时内核会继续匹配，因此在同一条件下拒绝该请求。
    if (guard) result.push(matcher(unique(["NETWORK,UDP", ...[].concat(condition)]), providerNames) + ",REJECT");
  }
  return result;
}

function baseDNS(previous = {}) {
  // 保留监听、Fake-IP 和兼容性设置；替换会改变查询出口的上游及策略。
  const kept = {};
  for (const key of ["listen", "cache-algorithm", "cache-max-size", "ipv6", "ipv6-timeout", "use-hosts", "use-system-hosts",
    "enhanced-mode", "fake-ip-range", "fake-ip-range6", "fake-ip-filter-mode", "fake-ip-filter", "fake-ip-ttl"]) {
    if (Object.prototype.hasOwnProperty.call(previous, key)) kept[key] = previous[key];
  }
  const privatePrevious = asRecord(previous["nameserver-policy"])["geosite:private"];
  const privateServers = typeof privatePrevious === "string" && privatePrevious
    ? [privatePrevious] : Array.isArray(privatePrevious) && privatePrevious.length && privatePrevious.every(item => typeof item === "string" && item)
      ? [...privatePrevious] : ["system"];
  return {
    enable: true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-range6": "fdfe:dcba:9876::1/64",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": ["+.lan", "+.local", "+.arpa", "time.*.com", "ntp.*.com", "+.pool.ntp.org",
      "+.market.xiaomi.com", "localhost.ptlogin2.qq.com", "*.msftncsi.com", "www.msftconnecttest.com"],
    ipv6: true,
    ...kept,
    "prefer-h3": false,
    "respect-rules": false,
    "default-nameserver": [...POLICY.dns.bootstrap],
    "proxy-server-nameserver": [...POLICY.dns.direct],
    "proxy-server-nameserver-policy": {},
    "direct-nameserver": [...POLICY.dns.direct],
    // 仅局域网分类使用本地解析；公共域名不加入系统 DNS 例外。
    "direct-nameserver-follow-policy": true,
    "nameserver-policy": {"geosite:private": privateServers},
    fallback: []
  };
}

function routedDNS(base, groupNames, registry) {
  const serversFor = target => target === "DIRECT" ? [...POLICY.dns.direct]
    : POLICY.dns.proxy.map(url => url + "#" + encodeURIComponent(groupNames.get(target) || target));
  const nameserverPolicy = {...base["nameserver-policy"]};
  const sections = [];
  // 只用能在解析前判断的业务条件。局域网优先用本地解析，广告仍由业务规则处理。
  for (const [condition, target] of POLICY.routes.slice(0, POLICY.dns.domainRuleCount)) {
    if (condition === "GEOSITE,private" || condition === "GEOIP,private,no-resolve") continue;
    const resolver = target === POLICY.group.ads ? POLICY.group.default : target;
    const last = sections[sections.length - 1];
    if (last && last.target === resolver) last.conditions.push(condition);
    else sections.push({target: resolver, conditions: [condition]});
  }
  for (const [index, {target, conditions}] of sections.entries()) {
    // 3X-UI 可重排映射键名，用编号保留原来的优先级。
    const id = "next-rules-v2-dns-" + String(index).padStart(2, "0");
    const payload = conditions.map(condition => {
      if (Array.isArray(condition)) return matcher(condition, registry.names);
      // 内置规则集支持逻辑条件内引用其他规则集。
      return condition.startsWith("RULE-SET,") ? matcher([condition], registry.names) : condition;
    });
    const name = registry.add(id, {type: "inline", behavior: "classical", payload});
    nameserverPolicy["rule-set:" + name] = serversFor(target);
  }
  return {...base, nameserver: serversFor(POLICY.group.default), "nameserver-policy": nameserverPolicy};
}

function remoteFragment() {
  const groupNames = new Map();
  const registry = ruleProviderRegistry({}, groupNames);
  for (const [name, definition] of Object.entries(POLICY.providers)) registry.add(name, definition);
  return {
    dns: routedDNS(baseDNS(), groupNames, registry),
    "rule-providers": registry.providers,
    "proxy-groups": buildGroups(groupNames),
    rules: renderRules(new Map(), groupNames)
  };
}

function main(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  // 旧解析出口已被替换，不把旧 DNS 引用误认为仍需保留的策略组依赖。
  const dnsBase = baseDNS(asRecord(config.dns));
  config.dns = dnsBase;
  dropUnusedRetiredProviders(config);
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
  const registry = ruleProviderRegistry(config, groupNames);
  for (const [name, definition] of Object.entries(POLICY.providers)) registry.add(name, definition);

  config["proxy-groups"] = [...buildGroups(groupNames, inlineNodes, providerNames), ...retained];
  config.dns = routedDNS(dnsBase, groupNames, registry);
  config["rule-providers"] = registry.providers;
  config.rules = renderRules(registry.names, groupNames);
  return config;
}

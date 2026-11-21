const group = {
  auto: "♻️ 自动选择 [系统]",
  default: "🚀 默认代理 [自选]",
  ai: "🤖 AI服务 [自选]",
  google: "🔍 谷歌服务 [自选]",
  youtube: "📺 YouTube [自选]",
  media: "🎬 全球流媒体 [自选]",
  mediaAsia: "🌏 亚太流媒体 [自选]",
  telegram: "💬 电报专用 [自选]",
  microsoft: "Ⓜ️ 微软服务 [自选]",
  apple: "🍎 苹果服务 [自选]",
  crypto: "💰 币圈专用 [自选]",
  software: "🖥️ 软件分流 [自选]",
  ads: "🛑 广告拦截 [系统]"
};

const prefix = "next-rules-v2-";
const aiCategories = ["openai", "anthropic", "google-gemini", "cursor", "github-copilot", "perplexity", "poe", "windsurf", "elevenlabs"];
const cache = require("../v2/data/source-cache.json");
const media = require("../v2/data/media-platforms.json");
// 主配置只保留远程引用；清单保存在独立规则文件与测试样本中。
const http = (source) => ({
  type: "http", behavior: source.behavior, format: source.format, url: source.url,
  interval: 86400, proxy: group.default,
  ...(source.legacyUrl ? {legacyUrl: source.legacyUrl} : {}),
  ...(source["path-in-bundle"] ? {"path-in-bundle": source["path-in-bundle"]} : {})
});
const providers = Object.fromEntries(Object.entries(cache.providers)
  .filter(([, item]) => item.payload.length)
  .map(([id, item]) => [prefix + id, http(item)]));
providers[prefix + "software"] = {
  type: "inline", behavior: "classical",
  payload: ["Discord", "Steam", "EpicGames", "WhatsApp"].map((name) => "PROCESS-NAME-WILDCARD,*" + name + "*")
};
providers[prefix + "telegram-ip"] = http({
  behavior: "ipcidr", format: "mrs",
  url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs",
  "path-in-bundle": "geo/geoip/telegram.mrs"
});

// 即使上游以后增加了 IP 条件，分流也只使用已知的目标地址。
const use = (id) => "RULE-SET," + prefix + id + ",no-resolve";
function mediaRoutes(items, target, full = false) {
  return items.flatMap((item) => {
    const condition = item.geosite ? "GEOSITE," + item.geosite : use("media-" + item.id + (full ? "" : "-domain"));
    const conditions = [condition, ...(item.excludeSuffixes || []).map((domain) => "NOT,((DOMAIN-SUFFIX," + domain + "))")];
    return [[conditions.length === 1 ? condition : conditions, target, true]];
  });
}

// 域名明确归类后先选对应服务，再判断普通地址，最后处理软件进程兜底。
const routes = [
  ["GEOSITE,private", "DIRECT"],
  ["GEOIP,private,no-resolve", "DIRECT"],
  ["GEOSITE,category-ads-all", group.ads],
  // AI 专用域名从上游同步，共用基础设施沿用常规规则。
  [use("ai-domain"), group.ai, true],
  // 常用海外 AI 品牌由服务分类库补充识别，不展开为域名清单。
  ...aiCategories
    .map(category => ["GEOSITE," + category, group.ai, true]),
  ...mediaRoutes(media.apac.filter((item) => item.beforeCN), group.mediaAsia),
  ["GEOSITE,apple-cn", "DIRECT"],
  ["GEOSITE,microsoft@cn", "DIRECT"],
  ["GEOSITE,steam@cn", "DIRECT"],
  ["GEOSITE,CN", "DIRECT"],
  ...(providers[prefix + "ai-regex"] ? [[use("ai-regex"), group.ai, true]] : []),
  ["GEOSITE,youtube", group.youtube, true],
  ["GEOSITE,google", group.google, true],
  [use("crypto"), group.crypto, true],
  ["GEOSITE,category-cryptocurrency", group.crypto, true],
  // 专用地区服务先于总分类；Apple TV+ 先于通用苹果服务。
  ...mediaRoutes(media.apac.filter((item) => !item.beforeCN), group.mediaAsia),
  ...mediaRoutes(media.global, group.media),
  ["GEOSITE,apple", group.apple, true],
  ["GEOSITE,telegram", group.telegram, true],
  // 两类都命中的海外 AI 服务优先于微软通用流量。
  [["GEOSITE,category-ai-!cn", "GEOSITE,microsoft"], group.ai, true],
  ["GEOSITE,microsoft", group.microsoft, true],
  // 已知的专用服务地址优先于普通国内地址；这里不为分流发起 DNS 查询。
  [["NETWORK,UDP", "DST-PORT,3478", use("ai-voice")], group.ai, true],
  [use("telegram-ip"), group.telegram, true],
  ["GEOIP,telegram,no-resolve", group.telegram, true],
  ...media.global.filter(item => item.geoip).map(item => ["GEOIP," + item.geoip + ",no-resolve", group.media, true]),
  ["GEOIP,google,no-resolve", group.google, true],
  ["GEOIP,CN,no-resolve", "DIRECT"],
  // 通用 AI 分类只补充未识别的境外目标。
  ["GEOSITE,category-ai-!cn", group.ai, true],
  // 专用地址和进程由自动任务同步，已识别的国内目标已经先行直连。
  [use("ai-context"), group.ai, true],
  ...mediaRoutes(media.apac.filter((item) => item.url), group.mediaAsia, true),
  ...mediaRoutes(media.global.filter((item) => item.url), group.media, true),
  [use("software"), group.software, true],
  ["NETWORK,UDP", group.default],
  ["NETWORK,UDP", "REJECT"],
  ["MATCH", group.default]
];

module.exports = { version: "2.5", group, providers, routes };


const fs = require("node:fs");
const path = require("node:path");

const group = {
  auto: "♻️ 自动选择 [系统]",
  default: "🚀 默认代理 [自选]",
  ai: "🤖 AI服务 [自选]",
  google: "🔍 谷歌服务(含油管) [自选]",
  media: "🎬 流媒体 [自选]",
  telegram: "💬 电报专用 [自选]",
  microsoft: "Ⓜ️ 微软服务 [自选]",
  apple: "🍎 苹果服务 [自选]",
  crypto: "💰 币圈专用 [自选]",
  software: "🖥️ 软件分流 [自选]",
  ads: "🛑 广告拦截 [系统]"
};

const ai = fs.readFileSync(path.join(__dirname, "../v2/data/ai-domains.txt"), "utf8")
  .split(/\r?\n/).filter((line) => line && !line.startsWith("#"));

const providerPrefix = "next-rules-v2-";
const perfect = "https://cdn.jsdelivr.net/gh/n0de-sudo/Perfect-Rules@main/Clash/rules/";
const telegram = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs";
const http = (url, behavior = "classical", format = "yaml") => ({
  type: "http", behavior, format, url, interval: 86400
});
const inline = (payload, behavior = "classical") => ({ type: "inline", behavior, payload });

const voice = JSON.parse(fs.readFileSync(path.join(__dirname, "../v2/data/openai-voice.json"), "utf8"));

const providers = {
  [providerPrefix + "ai"]: inline(ai),
  [providerPrefix + "ai-voice"]: inline(voice.prefixes, "ipcidr"),
  [providerPrefix + "ai-process"]: inline([
    "Claude", "Claude.exe", "ChatGPT", "ChatGPT.exe", "Codex", "Codex.exe",
    "Cursor", "Cursor.exe", "Antigravity", "Antigravity.exe", "Windsurf", "Windsurf.exe",
    "Augment", "Augment.exe", "cowork-svc.exe"
  ].map((name) => "PROCESS-NAME," + name)),
  [providerPrefix + "software"]: inline([
    "Discord", "Steam", "EpicGames", "WhatsApp"
  ].map((name) => "PROCESS-NAME-WILDCARD,*" + name + "*")),
  [providerPrefix + "ads"]: http(perfect + "ads.yaml"),
  [providerPrefix + "disney"]: http(perfect + "disney.yaml"),
  [providerPrefix + "crypto"]: http(perfect + "crypto.yaml"),
  [providerPrefix + "telegram-ip"]: {
    ...http(telegram, "ipcidr", "mrs"),
    "path-in-bundle": "geo/geoip/telegram.mrs"
  }
};

// 条件、目标、UDP 保护。两种入口从同一张表生成，顺序即优先级。
const use = (id) => "RULE-SET," + providerPrefix + id;
const routes = [
  ["GEOSITE,private", "DIRECT"],
  ["GEOIP,private,no-resolve", "DIRECT"],
  // 明确的项目例外。域名未被当作官方 AI 服务背书。
  ["DOMAIN-SUFFIX,anthropic.com.cn", group.ai, true],
  ["GEOSITE,apple-cn", "DIRECT"],
  ["GEOSITE,microsoft@cn", "DIRECT"],
  ["GEOSITE,steam@cn", "DIRECT"],
  ["GEOSITE,CN", "DIRECT"],
  [use("ai"), group.ai, true],
  ["GEOIP,CN,no-resolve", "DIRECT"],
  [["NETWORK,UDP", "DST-PORT,3478", use("ai-voice") + ",no-resolve"], group.ai, true],
  [use("ads"), group.ads],
  ["GEOSITE,youtube", group.google, true],
  ["GEOSITE,google", group.google, true],
  [use("crypto"), group.crypto, true],
  [use("disney"), group.media, true],
  ["GEOSITE,netflix", group.media, true],
  ["GEOIP,netflix,no-resolve", group.media, true],
  ["GEOSITE,apple", group.apple, true],
  ["GEOSITE,telegram", group.telegram, true],
  [use("telegram-ip") + ",no-resolve", group.telegram, true],
  // 远程网段尚未加载时，客户端 GeoIP 仍可识别已有的 Telegram 网段。
  ["GEOIP,telegram,no-resolve", group.telegram, true],
  ["GEOSITE,microsoft", group.microsoft, true],
  [use("ai-process"), group.ai, true],
  [use("software"), group.software, true],
  ["NETWORK,UDP", group.default],
  ["NETWORK,UDP", "REJECT"],
  ["MATCH", group.default]
];

module.exports = { version: "2.0", group, providers, routes };

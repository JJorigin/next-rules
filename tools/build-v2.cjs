
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const policy = require("./v2-policy.cjs");
const media = require("../v2/data/media-platforms.json");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(path.join(__dirname, "v2-runtime.js"), "utf8");
const script = template.replace("/* GENERATED POLICY */ null", () => JSON.stringify(policy, null, 2));
assert.notEqual(script, template, "missing policy marker");

const sandbox = vm.createContext({});
vm.runInContext(script, sandbox, { filename: "next-rules.js" });
const fragment = vm.runInContext("remoteFragment()", sandbox);

const yamlScalar = JSON.stringify;
function fields(record, indentation) {
  return Object.entries(record).map(([key, value]) => {
    const label = indentation + (/^[\w-]+$/.test(key) ? key : yamlScalar(key)) + ":";
    if (key === "payload") {
      return label + "\n" + value.map((item) => indentation + "  - " + yamlScalar(item)).join("\n");
    }
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length) {
      return label + "\n" + fields(value, indentation + "  ");
    }
    return label + " " + yamlScalar(value);
  }).join("\n");
}
const yaml = [
  "# Next-Rules " + policy.version + " · 3X-UI 远程路由",
  "# 在面板中启用路由并填写此文件地址，客户端使用面板生成的完整订阅。",
  "# 面板须允许远程 DNS 配置；TUN 和 IPv6 开关由客户端管理。",
  "dns:",
  fields(fragment.dns, "  "),
  "",
  "rule-providers:",
  ...Object.entries(fragment["rule-providers"]).map(([name, item]) => "  " + name + ":\n" + fields(item, "    ")),
  "",
  "proxy-groups:",
  ...fragment["proxy-groups"].map(({ name, ...item }) => "  - name: " + yamlScalar(name) + "\n" + fields(item, "    ")),
  "",
  "rules:",
  ...fragment.rules.map((rule) => "  - " + yamlScalar(rule)),
  ""
].join("\n");

const mediaGuide = [
  "# 流媒体平台",
  "",
  "全球流媒体和亚太流媒体可以分别选择自动选择、具体节点或 DIRECT（直连）。一个组内的服务共用该组当前的选择；观看不同地区限定的内容时，需要选择相应地区可用的线路。",
  "",
  "YouTube 使用独立策略组，默认跟随 Google。TikTok 沿用常规规则，不设置专用分流。",
  "",
  "Netflix、Disney+、HBO / Max 等跨地区平台归入全球流媒体；Hulu 日本站等独立地区服务归入亚太流媒体。",
  "",
  "以下为当前配置明确接入的平台。服务的账号登录、支付及共享依赖可能由其他规则处理。",
  "",
  "## 全球流媒体",
  "",
  ...media.global.map((item) => "- " + item.name),
  "",
  "## 亚太流媒体",
  "",
  "| 地区 | 平台 |",
  "| --- | --- |",
  ...media.apac.map((item) => "| " + item.region + " | " + item.name + " |"),
  "",
  "客户端的服务分类数据库和外部规则集更新后，具体收录的地址也会随之变化。",
  ""
].join("\n");

for (const [file, expected] of [
  ["next-rules.yaml", yaml], ["next-rules.js", script], ["MEDIA.md", mediaGuide],
  ["v2/next-rules.yaml", yaml], ["v2/next-rules.js", script], ["v2/MEDIA.md", mediaGuide],
  ["rules/next-rules.yaml", yaml], ["rules/next-rules.js", script]
]) {
  const destination = path.join(root, file);
  if (process.argv.includes("--check")) {
    assert.equal(fs.readFileSync(destination, "utf8").replace(/\r\n/g, "\n"), expected, file + " is out of sync");
  } else {
    fs.writeFileSync(destination, expected);
  }
}

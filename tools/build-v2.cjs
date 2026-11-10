
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const policy = require("./v2-policy.cjs");

const root = path.resolve(__dirname, "..");
const template = fs.readFileSync(path.join(__dirname, "v2-runtime.js"), "utf8");
const script = template.replace("/* GENERATED POLICY */ null", () => JSON.stringify(policy, null, 2));
assert.notEqual(script, template, "missing policy marker");

const sandbox = vm.createContext({});
vm.runInContext(script, sandbox, { filename: "next-rules.js" });
const fragment = vm.runInContext("remoteFragment()", sandbox);

const yamlScalar = JSON.stringify;
function fields(record, indentation) {
  return Object.entries(record).map(([key, value]) => (
    key === "payload"
      ? indentation + key + ":\n" + value.map((item) => indentation + "  - " + yamlScalar(item)).join("\n")
      : indentation + key + ": " + yamlScalar(value)
  )).join("\n");
}
const yaml = [
  "# Next-Rules " + policy.version + " · 3X-UI 远程路由",
  "# 由 node tools/build-v2.cjs 生成。发布说明和迁移步骤见 README。",
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

for (const [file, expected] of [["v2/next-rules.yaml", yaml], ["v2/next-rules.js", script]]) {
  const destination = path.join(root, file);
  if (process.argv.includes("--check")) {
    assert.equal(fs.readFileSync(destination, "utf8").replace(/\r\n/g, "\n"), expected, file + " is out of sync");
  } else {
    fs.writeFileSync(destination, expected);
  }
}

# 维护与验收

用户使用方法见仓库根目录 README。本文件供维护者检查生成、更新和测试过程。

## 生成与同步

需要 Node.js、Python 及 `tools/requirements-sync.txt` 中的依赖。

```sh
python -m pip install -r tools/requirements-sync.txt
python tools/sync-rules.py --fetch
node tools/build-v2.cjs
python tools/sync-rules.py
node tools/build-v2.cjs --check
node tools/check-v2.cjs
python test/check-yaml.py
```

`sync-rules.py` 完整保存上游 AI 原文。分流视图按匹配类型拆分，并排除公共 CDN、认证挑战、通用遥测、宽泛关键词和共享云网络。原始条目、使用的条目及排除记录可以逐一核对。流媒体补充来源也生成域名视图。来源摘要记录于 `rules/sources.json`。

主入口为根目录 `next-rules.yaml`、`next-rules.js` 与 `MEDIA.md`。`v2/` 入口及 `rules/next-rules.*` 是同内容的兼容入口，由同一生成器更新。历史发布入口按原始 Git 对象归档在 `old/`，摘要见 `old/manifest.json`。

HTTP 提供者输出远程引用、24 小时更新和代理下载设置。`v2/data/source-cache.json` 供生成独立规则文件及测试使用。Telegram 使用 MRS 远程网段，并以客户端的 Telegram GeoIP 分类补充。ChatGPT 语音 IP 直接由官方 JSON 生成，纯地址匹配限定为 UDP 3478。已知 ChatGPT 域名继续由域名规则匹配，包括 TCP 连接。

首次下载失败且没有有效缓存时，对应 HTTP 规则集为空。常用海外 AI 品牌有原生分类备用识别，通用 AI 分类安排在普通国内 IP 直连之后；这些备用分类不能代替完整来源。仅存在于外部来源的专用例外，在来源为空时可能落入普通分类，DNS 与业务流量都不能承诺仍走专用出口。来源类型分层消除了同一精确域名前后重复匹配的更新差异，但多个 HTTP 来源仍不是事务式更新。纯远程模板不会因某个提供者为空而自动停流；部署验收必须确认所需规则集已加载且数量非零。已有有效缓存时，下载失败仍可使用缓存。备用副本不能在后续构建中重新写入主配置。

升级本地脚本时，旧 AI 规则集仍受原订阅引用的会保留。新的域名和补充条件使用独立缓存路径，避免 Mihomo 在刷新后仍读取含旧条目的缓存。

同步任务每 6 小时检查一次。空文件、重复 YAML 键、不支持的类型、无效或非公开的语音地址、单个规则集超过 30% 的删减，都会中止同步。所有输入校验完成后才生成文件。真实内核回归通过后才提交，失败时需要维护者检查工作流。

另设每日完整验证，使用当时的官方分类数据库复验，避免来源清单未改变时漏掉数据库更新带来的分类变化。定时任务的实际运行时间以 GitHub Actions 调度为准。

## DNS 出口

远程 YAML 只提供分流，客户端本地脚本保留传入的 DNS 设置及其引用的规则集、策略组。Mihomo 用订阅或客户端提供的解析器处理域名。晚解析后仍检查局域网地址、专用地址和国内 IP。

验收需分别验证分流与客户端 DNS。已发布 2.3 的 DNS 方案和对照数据见 [2.3 审计记录](AUDIT-2.3.md)。

## 业务匹配顺序

DNS 应答会影响需要 IP 判断的未收录域名，规则匹配以客户端实际获得的地址为准。

1. 局域网、广告、AI 明确域名、常用海外品牌备用分类及需要优先识别的国际版服务。
2. 国内服务域名直连。
3. AI 正则域名、YouTube、Google、币圈、亚太和全球流媒体及其他服务分类。
4. 未归类域名先解析并检查局域网地址，再匹配语音 UDP 端口与 Telegram、Netflix、Google 专用网段，最后判断普通国内 IP 直连。
5. 通用海外 AI 分类、主清单的补充条件、媒体来源剩余条件、软件进程兜底和默认代理。

Google 与 YouTube 共享基础设施。可识别 YouTube 域名时使用 YouTube 组；仅识别 Google 地址且没有更精确分类时，使用 Google 组。IP 兜底不等于能够从共享 IP 还原具体业务。

不能把所有专用网段设为 `no-resolve` 后，又让域名直到普通国内 IP 规则才解析；规则不会因为后面才得到 IP 自动重跑一遍。新顺序在明确服务域名之后解析未归类目标，再依次检查局域网、专用网段和普通国内地址。明确的服务域名优先级不代表共享基础设施全部属于某项服务。

代理目标不支持 UDP 时，Mihomo 会继续匹配下一条规则。因此每条专用代理规则后都有同条件 UDP 拒绝规则，避免落到其他出口。手动 DIRECT 保留在场景组中；默认代理、自动选择和空候选不会自动转为直连。

## 真实内核回归

在 Windows 下安装 Go、Node.js、Python 后运行：

```sh
python test/check-panel-source.py
go build -o .cache/panel-merge.exe ./test/panel-merge.go
python test/fetch-resources.py
node test/regression.cjs 1.19.33
node test/regression.cjs 1.19.34
node test/regression.cjs flclash
node test/ip-resolution.cjs 1.19.33
node test/ip-resolution.cjs 1.19.34
node test/ip-resolution.cjs flclash
node test/ip-resolution.cjs 1.19.33 --metadb
node test/ip-resolution.cjs 1.19.34 --metadb
node test/ip-resolution.cjs flclash --metadb
node test/ip-resolution.cjs 1.19.33 --ipv6
node test/ip-resolution.cjs 1.19.34 --ipv6
node test/ip-resolution.cjs flclash --ipv6
node test/ip-resolution.cjs 1.19.33 --metadb --ipv6
node test/ip-resolution.cjs 1.19.34 --metadb --ipv6
node test/ip-resolution.cjs flclash --metadb --ipv6
node test/http-update.cjs 1.19.33
node test/http-update.cjs 1.19.34
```

测试资源来自官方发行资产，下载后核对 SHA-256。分类数据库使用测试当时的官方版本，精确摘要写入 `.cache/resources/manifest.json`；内核固定版本。3X-UI 的合并实现与 v3.11.0 官方源码逐段比较。测试读取实际生成的 YAML，并与 JS 输出比较。

全部节点与观察出口均为回环模拟，分流测试的 DIRECT 目标改为单独的模拟出口。测试进程关闭 TUN，不修改系统代理和用户配置。未知域名使用本地控制的 DNS 响应，已知 IP 配合域名嗅探分别验证。测试还使用改名后的独立 Node 程序，实际触发 Cursor、Steam 的进程条件。

YAML 与 3X-UI 合并测试核对远程规则不改写订阅的 DNS。脚本回归使用原来提供的回环 DNS 验证域名识别，覆盖备用解析器、自定义策略及其组名引用。专用语音规则测试包含 UDP 3478、其他 UDP 端口和普通 TCP 的对照。

覆盖节点名称、元数据过滤、手动 DIRECT 候选、节点提供者、空列表、两种入口、国内域名与 IP、IPv6 目标、专用服务、YouTube 跟随及独立选择、UDP 保护、首次下载失败和 HTTP 缓存更新。另对 GeoIP.dat、MMDB、客户端默认 MetaDB 验证已知 IP 和域名晚解析路径。结果写入 `.cache/*results*.json` 与 `.cache/ip-resolution-*.json`。

这些检查验证规则选择及内核处理，不等于验证每个网站的登录、地区解锁或播放。实际装机还需检查客户端的 TUN、严格路由、DNS 和公网出口。分流规则不会承诺全面阻止浏览器 WebRTC 暴露直连出口。

HTTP 返回错误和 YAML 解析失败时，内核保留旧缓存；格式正确但内容不完整的远程文件可能被内核接受。构建和同步校验会拦截已知异常，不能代替上游维护和故障监测。

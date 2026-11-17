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

`sync-rules.py` 完整保存上游 AI 原文，并按类型生成精确域名和正则域名视图。关键词、进程和网络条件仍保留在完整上游中。流媒体的补充来源也生成域名视图，以免上游的进程条件提前接管普通目标。来源摘要记录于 `rules/sources.json`。

HTTP 提供者只输出远程引用、24 小时更新和代理下载设置，主 YAML / JS 不嵌入服务域名或 IP 清单。`v2/data/source-cache.json` 仅供维护时生成独立规则文件及测试使用。Telegram 使用 MRS 远程网段，并以客户端的 Telegram GeoIP 分类作为下载失败时的补充。

首次下载失败且没有有效缓存时，对应 HTTP 规则集为空，内核仍可能继续匹配后面的规则。纯远程模板不能据此承诺自动停流；部署验收必须确认所需规则集已加载且数量非零。已有有效缓存时，下载失败仍可使用缓存。备用副本不能在后续构建中重新写入主配置。

同步任务每 6 小时检查一次。空文件、重复 YAML 键、不支持的类型、地址错误、单个规则集超过 30% 的删减、官方语音地址未被维护清单覆盖，都会中止同步。所有输入校验完成后才生成文件；真实内核回归通过后才提交。失败时不会推送数据更新，需要维护者检查失败的工作流。

另设每日完整验证，使用当时的官方分类数据库复验，避免来源清单未改变时漏掉数据库更新带来的分类变化。定时任务的实际运行时间以 GitHub Actions 调度为准。

## 匹配顺序

1. 局域网、广告、AI 明确域名及需要优先识别的国际版服务。
2. 国内服务域名直连。
3. AI 正则域名、YouTube、Google、币圈、亚太和全球流媒体及其他服务分类。
4. 未归类域名先解析并检查局域网地址，再匹配 AI / Telegram / Netflix 等专用网段，最后判断普通国内 IP 直连。
5. 完整 AI 上游和媒体来源中的剩余条件、软件进程兜底、默认代理。

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

全部节点与观察出口均为回环模拟，DIRECT 规则的目标在测试配置中改为单独的模拟出口。测试进程关闭 TUN，不修改系统代理和用户配置。未知域名使用本地控制的 DNS 响应，已知 IP 配合域名嗅探分别验证。测试还使用改名后的独立 Node 程序，实际触发 Cursor、Steam 的进程条件。

覆盖节点名称、元数据过滤、手动 DIRECT 候选、节点提供者、空列表、两种入口、国内域名与 IP、IPv6 目标、专用服务、YouTube 跟随及独立选择、UDP 保护、首次下载失败和 HTTP 缓存更新。另对 GeoIP.dat、MMDB、客户端默认 MetaDB 验证已知 IP 和域名晚解析路径。结果写入 `.cache/*results*.json` 与 `.cache/ip-resolution-*.json`。

这些检查验证规则选择及内核处理，不等于验证每个网站的登录、地区解锁或播放。实际装机还需检查客户端的 TUN、严格路由、DNS 和公网出口。分流规则不会承诺全面阻止浏览器 WebRTC 暴露直连出口。

HTTP 返回错误和 YAML 解析失败时，内核保留旧缓存；格式正确但内容不完整的远程文件可能被内核接受。构建和同步校验会拦截已知异常，不能代替上游维护和故障监测。

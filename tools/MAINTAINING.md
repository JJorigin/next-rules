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

`sync-rules.py` 完整保存上游 AI 原文，再按类型生成精确域名、正则域名和补充条件三个视图。三者按计数合并必须等于完整来源；不人工增删主清单。完整原文用于维护与校验，运行时不再用另一套完整混合清单重复匹配精确域名。流媒体补充来源也生成域名视图。来源摘要记录于 `rules/sources.json`。

2.3 主入口为根目录 `next-rules.yaml`、`next-rules.js` 与 `MEDIA.md`。`v2/` 入口及 `rules/next-rules.*` 是同内容的兼容入口，由同一生成器更新。历史发布入口按原始 Git 对象归档在 `old/`，摘要见 `old/manifest.json`；定时同步不会修改归档。

HTTP 提供者只输出远程引用、24 小时更新和代理下载设置，主 YAML / JS 不嵌入服务域名或 IP 清单。`v2/data/source-cache.json` 仅供维护时生成独立规则文件及测试使用。Telegram 使用 MRS 远程网段，并以客户端的 Telegram GeoIP 分类作为下载失败时的补充。

首次下载失败且没有有效缓存时，对应 HTTP 规则集为空。常用海外 AI 品牌有原生分类备用识别，通用 AI 分类安排在普通国内 IP 直连之后；这些备用分类不能代替完整来源。仅存在于外部来源的专用例外，在来源为空时可能落入普通分类，DNS 与业务流量都不能承诺仍走专用出口。来源类型分层消除了同一精确域名前后重复匹配的更新差异，但多个 HTTP 来源仍不是事务式更新。纯远程模板不会因某个提供者为空而自动停流；部署验收必须确认所需规则集已加载且数量非零。已有有效缓存时，下载失败仍可使用缓存。备用副本不能在后续构建中重新写入主配置。

从 2.1 本地脚本升级时，未被 DNS、子规则等位置引用的旧混合 AI 提供者会移除；新补充条件使用独立名称和路径，不复用旧完整清单缓存。有外部依赖的原提供者和策略组保留。

同步任务每 6 小时检查一次。空文件、重复 YAML 键、不支持的类型、地址错误、单个规则集超过 30% 的删减、官方语音地址未被维护清单覆盖，都会中止同步。所有输入校验完成后才生成文件；真实内核回归通过后才提交。失败时不会推送数据更新，需要维护者检查失败的工作流。

另设每日完整验证，使用当时的官方分类数据库复验，避免来源清单未改变时漏掉数据库更新带来的分类变化。定时任务的实际运行时间以 GitHub Actions 调度为准。

## DNS 出口

2.2 的 IP 判断会触发客户端向默认上游查询域名。2.3 配套设置 DNS。详细对照见 [2.3 审计记录](AUDIT-2.3.md)。

- 普通国内域名使用直连 DoH。能在查询前确定场景的目标通过对应组查询，例如 AI 精确域名、YouTube、Google 账号、全球流媒体和亚太流媒体。
- 未分类域名通过默认代理访问海外 DoH，失败不回退到直连 DNS。解析出国内地址后，业务流量仍由国内 IP 规则直连。
- 代理节点的域名使用独立的直连解析，DNS 服务域名用独立引导解析，避免代理连接循环。
- 仅局域网分类使用系统解析，并允许 DIRECT 解析遵守此例外，保留局域网 TCP / UDP。局域网自定义解析可通过原订阅的 `geosite:private` 策略保留。
- DNS 匹配器从 IP 判断前的业务条件生成，复用 GeoSite、现有远程规则集及共享 CDN 排除项。编号保证 3X-UI 重排映射键名后保留优先顺序。DNS 查询匹配不到国内或场景时，通过默认代理解析。广告拦截由业务规则处理。
- 3X-UI 必须开启 `Use DNS from remote rules`；客户端 DNS 覆写会改变最终结果，部署前须取消冲突覆写。TUN、严格路由、IPv6 开关仍由客户端管理。

不把外部名单未识别的任意域名承诺为零额外解析；解析地理位置可能改变 CDN 结果。增加其他直连来源前须检查与已有海外类别的交叉，不整表叠加全球 CDN 或“国内可访问”服务清单。

## 业务匹配顺序

2.3 与 2.2 使用同样的 178 条业务规则和 13 个策略组。DNS 上游的应答和位置可能影响需要 IP 判断的未收录域名。

1. 局域网、广告、AI 明确域名、常用海外品牌备用分类及需要优先识别的国际版服务。
2. 国内服务域名直连。
3. AI 正则域名、YouTube、Google、币圈、亚太和全球流媒体及其他服务分类。
4. 未归类域名先解析并检查局域网地址，再匹配 AI / Telegram / Netflix / Google 专用网段，最后判断普通国内 IP 直连。
5. 通用海外 AI 分类、主清单的补充条件、媒体来源剩余条件、软件进程兜底和默认代理。

Google 与 YouTube 共享基础设施。可识别 YouTube 域名时使用 YouTube 组；仅识别 Google 地址且没有更精确分类时，使用 Google 组。IP 兜底不等于能够从共享 IP 还原具体业务。

不能把所有专用网段设为 `no-resolve` 后，又让域名直到普通国内 IP 规则才解析；规则不会因为后面才得到 IP 自动重跑一遍。新顺序在明确服务域名之后解析未归类目标，再依次检查局域网、专用网段和普通国内地址。明确的服务域名优先级不代表共享基础设施全部属于某项服务。

代理目标不支持 UDP 时，Mihomo 会继续匹配下一条规则。因此每条专用代理规则后都有同条件 UDP 拒绝规则，避免落到其他出口。手动 DIRECT 保留在场景组中；默认代理、自动选择和空候选不会自动转为直连。

## 真实内核回归

在 Windows 下安装 Go、Node.js、Python 后运行：

```sh
python test/check-panel-source.py
go build -o .cache/panel-merge.exe ./test/panel-merge.go
go build -o .cache/dns-cert.exe ./test/dns-cert.go
python test/fetch-resources.py
node test/regression.cjs 1.19.33
node test/regression.cjs 1.19.34
node test/regression.cjs flclash
node test/dns-routing.cjs 1.19.33
node test/dns-routing.cjs 1.19.34
node test/dns-routing.cjs flclash
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

`dns-routing.cjs` 另行使用真实内核、临时可信证书的 HTTPS DNS 服务器及可记录出口的 SOCKS 转发器验证生产 DNS 策略。TLS 验证没有关闭；测试覆盖 IPv4 / IPv6、Fake-IP / real-IP、预解析、国内域名零代理解析、AI 与国际服务例外、组名冲突、局域网实际 DIRECT TCP / UDP、手动 DIRECT、默认代理故障及冷启动边界。系统解析在测试中替换为独立的回环解析服务，不读取用户实际 DNS。结果写入 `.cache/dns-routing-*.json`。

覆盖节点名称、元数据过滤、手动 DIRECT 候选、节点提供者、空列表、两种入口、国内域名与 IP、IPv6 目标、专用服务、YouTube 跟随及独立选择、UDP 保护、首次下载失败和 HTTP 缓存更新。另对 GeoIP.dat、MMDB、客户端默认 MetaDB 验证已知 IP 和域名晚解析路径。结果写入 `.cache/*results*.json` 与 `.cache/ip-resolution-*.json`。

这些检查验证规则选择及内核处理，不等于验证每个网站的登录、地区解锁或播放。实际装机还需检查客户端的 TUN、严格路由、DNS 和公网出口。分流规则不会承诺全面阻止浏览器 WebRTC 暴露直连出口。

HTTP 返回错误和 YAML 解析失败时，内核保留旧缓存；格式正确但内容不完整的远程文件可能被内核接受。构建和同步校验会拦截已知异常，不能代替上游维护和故障监测。

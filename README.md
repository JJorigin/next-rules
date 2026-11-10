# Next-Rules · 未来分流

面向 3X-UI 面板和 Mihomo 客户端的分流规则，由 **JJorigin** 维护。支持 **3X-UI 远程下发**到 Clash Verge Rev 和 FlClash Windows，也支持 **Clash Verge Rev 本地扩展脚本**。

**当前版本：2.0**。国内目标优先直连，海外服务分别选择代理线路。每个海外场景组保留手动 `DIRECT`。

## 从 1.3 升级

1. 先挑一台样机。在当前线路上验证实际出口，将确认可用的海外节点在订阅源中改名，在名称里加上 **`[海外]`**，例如 `[海外] 东京 01`。使用半角方括号。只有确认属于海外代理的真实节点才加这个标记。
2. 按下方接入方式切到 **2.0 地址或脚本**，使用**规则模式**。在自动选择和各场景组中核对候选节点。自动选择没有可用候选时会拒绝连接，国内流量仍按直连规则处理。
3. 验证国内网站与应用确实直连，并检查海外各组的实际出口。使用 AI 前，核对该组及其登录依赖所用的组。如果客户端记住了旧版手动选择的 `DIRECT`，请在需要代理的组重新选择代理。
4. 样机的网页、应用、IPv6 和语音等实际使用场景验证通过后，再按同样设置批量部署。

已有 1.3 用户可继续使用原来的 `main/rules/next-rules.yaml` 和 `main/rules/next-rules.js` 地址。2.0 使用独立的 `main/v2/` 路径。需要将装机版本固定为 2.0 时，使用 [v2.0 发布页](https://github.com/JJorigin/next-rules/releases/tag/v2.0) 的文件，或将下面地址中的 `main` 换成 `v2.0`。

## 接入

### 3X-UI 远程下发

1. 打开面板的 **订阅设置 → Clash / Mihomo**，启用路由。
2. 在 **全局路由规则** 粘贴以下地址之一并保存。

   ```text
   https://raw.githubusercontent.com/JJorigin/next-rules/main/v2/next-rules.yaml
   https://cdn.jsdelivr.net/gh/JJorigin/next-rules@main/v2/next-rules.yaml
   ```

3. 在 Clash Verge Rev 或 FlClash Windows 导入面板生成的 **Mihomo 完整订阅**，刷新并切换为规则模式。远程路由地址填在面板，客户端使用面板生成的订阅地址。

### Clash Verge Rev 本地扩展

导入节点订阅后，在该订阅的 **订阅扩展脚本**中复制并保存 [2.0 JS](https://raw.githubusercontent.com/JJorigin/next-rules/main/v2/next-rules.js)，然后刷新订阅。一个订阅选一种接入方式。已经使用面板远程下发时，请勿再叠加同一套本地脚本。

## 出口选择与匹配顺序

| 策略组 | 可选出口 |
| --- | --- |
| 默认代理 | 自动选择、已标记的海外代理节点 |
| AI、Google/YouTube、Apple、流媒体、Telegram、Microsoft、币圈、软件分流 | 自动选择、已标记的海外代理节点、手动 `DIRECT` |
| 广告拦截 | `REJECT`、`DIRECT` |

自动选择从标记过的真实代理节点中测速。标记是管理员对线路出口的确认。请核对节点的实际出口，尤其是线路、订阅源或出口 IP 变更后。手动选择 `DIRECT` 会让该组走本机出口，适合确需直连的特殊场景。AI 组手动选择 `DIRECT` 时，服务也会看到本机公网出口。默认代理和自动选择不提供 `DIRECT`，节点失效时不自动转直连。节点不支持 UDP 时，对应场景会拒绝该请求。

局域网和明确的国内目标优先直连。Apple 地区服务、Microsoft 地区服务、Steam 的国内下载分类用各自的 GeoSite 子集识别。Google 与 YouTube 共用一组。普通国内域名和已知国内 IP 不被进程兜底抢先匹配。广告匹配在国内直连之后，因此已命中直连的广告域名会按直连走。最后仍未分类的请求走默认代理。

AI 以审核过的专用域名、明确的租户地址和厂商专用网段为主。共享云网段、宽泛关键词和通用遥测不作为 AI 分流条件。ChatGPT 语音的官方地址只在 **UDP 3478** 匹配，其他请求按目标分流。识别到 AI 客户端进程时，进程规则可以为仍未分类的连接补充匹配。软件和 AI 的进程补充规则需要客户端能识别进程，未开启时域名和 IP 规则仍可用。新服务的专用域名或依赖发生变化时，可根据连接记录更新范围。

## 批量安装与更新

- Telegram 的独立网段由 Mihomo 每 **86400 秒**检查上游更新。尚未下载规则时，可用客户端已有的 Telegram GeoIP 分类补充匹配。Netflix 的纯 IP 连接使用客户端 GeoIP。Google、YouTube 和 Apple 直接使用客户端 GeoSite。这些内置分类跟随客户端的 GeoIP 或 GeoSite 数据库更新。
- [v2.0 发布附件](https://github.com/JJorigin/next-rules/releases/tag/v2.0)有可选的 `BundleMRS.7z`。首装网络不稳定时，可以预放到 **Mihomo 内核的工作目录**，首次加载会提取用 Telegram 公布的网段编译的初始缓存。面板仅下发配置，压缩包由装机流程放置。若目录里已有同名包，请先保留原包，并在部署时合并所需文件。附件的 SHA-256 可在发布页核对。
- 3X-UI 用户在 2.0 地址启用后，更新客户端订阅即可获取同一路径的改动。手动使用 JS 的用户要重新复制脚本。独立规则集在客户端单独更新，内置的审核名单和语音地址快照随版本发布。

## DNS、IPv6 与浏览器

Next-Rules 的接入文件只配置路由、策略组和规则集。DNS、TUN、IPv6 和运行模式由原订阅与客户端管理。

Windows 样机建议在客户端启用 **TUN**、**自动设置路由**和**严格路由**。启用后，应在真实网络上测试 IPv4、IPv6 和 DNS。对需要隐藏本机公网 IP 的 AI 浏览器场景，使用单独的浏览器配置或隔离环境，限制 WebRTC 的非代理 UDP，并用实际测试确认。受管理的 Chrome 可按 AI 站点配置 `WebRtcIPHandlingUrl` 的 `disable_non_proxied_udp`。[Chromium 策略说明](https://chromium.googlesource.com/chromium/src/components/policy/+/c2d823006122fdaf9947de020737c04391a3ada5/resources/templates/policy_definitions/WebRtc/WebRtcIPHandlingUrl.yaml)将 AI、登录服务及必要依赖的出口一并检查；域名命中日志和节点测速只能证明其中一部分。账号、设备和浏览器提供的其他地区信息由相应服务与客户端处理。

测试配置以 **Mihomo 1.19.33（Clash Verge Rev）和 FlClash Windows 0.9.3** 为基准。2.0 使用完整 GeoSite / GeoIP 的分类与内核空组拒绝功能。自定义数据库需要提供这些分类。离线包功能从 Mihomo 1.19.27 起提供。

## 数据来源与鸣谢

- [MetaCubeX / Mihomo](https://github.com/MetaCubeX/mihomo) 与 [MetaCubeX 规则数据库](https://github.com/MetaCubeX/meta-rules-dat)提供分类、规则集格式与离线包机制。
- [VPSDance AI Proxy Rules](https://github.com/VPSDance/ai-proxy-rules)提供 AI 名单审核的上游。使用的版本和原文件校验值见 [AI 数据说明](v2/data/ai-domains.txt)，许可证见 [VPSDance-LICENSE](v2/data/VPSDance-LICENSE)。
- [OpenAI 网络配置](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)与 [Claude Code 网络配置](https://code.claude.com/docs/en/network-config)用于核对服务端点。
- [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules)、[Hrules](https://github.com/hcloudlab/Hrules)与 [Custom OpenClash Rules](https://github.com/Aethersailor/Custom_OpenClash_Rules)提供策略组织、手动出口与地区例外的参考。

如遇分流问题，欢迎提交 [Issue](https://github.com/JJorigin/next-rules/issues)。请提供客户端版本、命中的规则和策略组，提交前删除订阅链接、节点地址、账户信息和出口 IP。

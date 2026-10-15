# Next-Rules · 未来分流

面向 Mihomo 内核的分流规则项目，由 **JJorigin** 设计维护。

**Next-Rules** 只负责分流：把不同类型的网络请求交给对应的策略组和节点。节点订阅、DNS、TUN、端口和客户端运行设置继续由 3X-UI、原始订阅或客户端负责。

**当前版本：1.0**

> **推荐方式：** 如果你使用自建 3X-UI 面板，优先选择 **3X-UI 全局路由规则 → Mihomo** 自动下发；如果你已经有其他机场或节点订阅，再选择 **Clash Verge Rev** 手工叠加。

## 选择接入方式

| 客户端 / 接入方式                | 状态    | 适合场景                                     |
| ------------------------- | ----- | ---------------------------------------- |
| **3X-UI 全局路由规则 → Mihomo** | ✅ 推荐  | 使用自建 3X-UI 面板，向 Mihomo 内核客户端下发路由规则       |
| **Clash Verge Rev**       | ✅ 推荐  | 已有机场或节点订阅，希望在本地叠加 `Next-Rules` 分流规则 |

自建 3X-UI 面板推荐通过订阅功能自动下发。理论上，使用 Mihomo 内核并支持相应订阅配置的客户端都可以接入；由于不同客户端的版本和扩展能力存在差异，目前优先推荐 **Clash Verge Rev**。

## 文件与地址（使用方法）

### 3X-UI 全局路由规则 → Mihomo

打开 3X-UI 的 **订阅设置 → Clash / Mihomo**，先打开 **启用路由**，再在 **全局路由规则** 中填写下面两个地址中的任意一个：

**GitHub Raw：**

```text
https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/next-rules.yaml
```

**jsDelivr 加速：**

```text
https://cdn.jsdelivr.net/gh/JJorigin/next-rules@main/rules/next-rules.yaml
```

上述地址**二选一**填写。填写完成后保存 3X-UI 设置，并更新客户端订阅。

3X-UI 会将远程路由规则合并到生成的 Mihomo / Clash 订阅中，节点仍由你的 3X-UI 面板提供。

### Clash Verge Rev

适用于已经导入机场、Mihomo 或自建节点订阅，希望在本地叠加 **Next-Rules** 的场景。

1. 在 Clash Verge Rev 中导入并确认节点订阅可以正常使用。
2. 打开该订阅的 **订阅扩展脚本**编辑入口。
3. 点击下面的链接，打开并复制完整脚本：

   [打开 / 复制 JS](https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/next-rules.js)
4. 将脚本粘贴到编辑器中，保存并重新更新订阅。
5. 回到代理组页面，检查策略组和节点是否正常出现。

同一个订阅只使用一种接入方式。已经通过 3X-UI 下发 `next-rules.yaml` 时，不要再对同一个订阅叠加 `next-rules.js`。

## Next-Rules 解决什么问题

**Next-Rules** 会根据请求类型自动进行分流，覆盖国内网站、海外服务、AI 服务、流媒体、软件服务、广告和局域网等常见场景。

你只需要在策略组中选择合适的节点或地区，规则会按照优先级匹配；没有命中特定规则的流量，会交给默认策略组处理。

AI 服务规则使用 [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules) 的 Global Clash 规则，并优先于中国大陆直连规则匹配。

## DNS 与分流

DNS 和代理路由是两个不同的部分：

- **DNS** 决定域名通过什么路径解析；
- **分流规则** 决定请求最终进入直连、代理或具体策略组。

**Next-Rules** 提供路由规则，不接管客户端的 DNS 基线。

### 3X-UI 远程路由

远程 YAML 只负责分流策略和规则集，不修改 DNS、TUN、IPv6、端口等客户端运行设置。这些设置继续由 3X-UI 生成的基础订阅和客户端负责。

### Clash Verge Rev 扩展脚本

扩展脚本只修改策略组、规则提供者和分流规则，保留原订阅以及 Clash Verge 的 DNS、TUN、IPv6、Sniffer、Hosts、端口和运行模式设置。

如果出现“节点可以测速但网站打不开”或 DNS 检测异常，请按以下顺序检查：

```text
域名解析 → 规则命中 → 策略组 → 最终节点 → 实际出口
```

DNS 检测应在客户端启用订阅并开始运行后进行，结果以实际解析请求和最终出口为准。

## 规则更新

外部规则由 Mihomo 的规则提供者下载并缓存到本地，并按照发布文件中设置的更新间隔由客户端自动更新。GitHub 或 jsDelivr 不会主动向客户端推送更新。

当 **Next-Rules** 更新后，不需要更换订阅地址：

- **3X-UI 用户**更新客户端订阅即可重新读取最新内容；
- **Clash Verge Rev 用户**保存扩展脚本后重新更新订阅即可；
- 外部规则集按照各自的更新间隔独立更新。

**Next-Rules 会持续维护。** 如果发现规则存在问题，欢迎提交 [Issue](https://github.com/JJorigin/next-rules/issues)。

## 节点与地区组说明

Clash Verge 的 JS 脚本可以读取当前订阅中已经展开的节点，只创建实际存在节点的地区组。当订阅中缺少某个预设地区的节点时，JS 版本不会创建该地区的空策略组；例如没有日本节点时不创建日本组，没有德国节点时也不创建德国组。

3X-UI 的远程 YAML 是静态路由片段，可以筛选组内节点，但不能根据节点数量动态删除已经定义的策略组。因此，远程模式下某些没有匹配节点的地区组可能仍然存在，只是没有可用成员。

如果原始订阅使用的是 `proxy-providers`，而不是已经展开的 `proxies`，Clash Verge 脚本也无法在运行时预先读取提供者中的全部节点名称；这时地区组会保留筛选器，具体成员以提供者下载完成后的结果为准。

## 兼容性与边界

**Next-Rules** 理论上适配 Mihomo 内核客户端。由于不同客户端对订阅扩展、远程路由合并和策略组字段的支持存在差异，目前推荐使用 Clash Verge Rev。

**Next-Rules** 不提供代理节点，也不会改变节点的协议、线路、出口 IP 或网络质量。它负责规则识别、策略组组织和出口选择，不能保证第三方服务的账号、认证、地区资格或风控结果。

## 规则来源与鸣谢

本项目参考了以下开源项目和官方文档：

- [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules)：参考 Clash / Mihomo 策略组层级、地区节点组织方式和部分规则提供者结构。
- [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules)：提供 AI 服务 Global Clash 规则集。
- [MetaCubeX/mihomo 文档](https://wiki.metacubex.one/)：用于核对 Mihomo 的策略组、规则提供者和 DNS 配置语义。
- [Clash Verge Rev 文档](https://www.clashverge.dev/guide/extend.html)：用于核对订阅扩展脚本和配置合并优先级。

感谢上述项目的维护者和贡献者。

## 支持项目

如果 **Next-Rules** 对你有帮助，欢迎在 [GitHub 项目主页](https://github.com/JJorigin/next-rules) 点 Star，也欢迎提交 [Issue](https://github.com/JJorigin/next-rules/issues) 帮助改进规则。

## 免责声明

**Next-Rules** 仅用于网络技术研究、学习和配置交流。

请遵守所在地法律法规，以及相关软件、网络服务和平台的使用规则。使用本项目产生的任何结果和风险由使用者自行承担。

## 作者

**JJorigin**

项目名称：**Next-Rules（未来分流）**

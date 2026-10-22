# Next-Rules · 未来分流

面向 3X-UI 面板用户与 Mihomo 内核客户端的分流规则，支持远程下发与本地扩展，由 **JJorigin** 设计维护。

**Next-Rules** 只负责分流：把不同类型的网络请求交给对应的策略组和节点。节点订阅、DNS、TUN、端口和客户端运行设置继续由 3X-UI、原始订阅或客户端负责。

**当前版本：1.2**

> **推荐方式：** 如果你使用自建 3X-UI 面板，优先选择 **3X-UI 全局路由规则 → Mihomo** 自动下发；如果你已经有机场或节点订阅，再选择 **Clash Verge Rev** 手工叠加。

## 选择接入方式

| 客户端 / 接入方式                | 状态   | 适合场景                                |
| ------------------------- | ---- | ----------------------------------- |
| **3X-UI 全局路由规则 → Mihomo** | ✅ 推荐   | 使用自建 3X-UI 面板，向 Clash Verge Rev、FlClash 等 Mihomo 内核客户端下发路由规则 |
| **Clash Verge Rev**       | ✅ 推荐   | 已有机场或节点订阅，希望在本地叠加 `Next-Rules` 分流规则 |

自建 3X-UI 面板推荐通过订阅功能自动下发，可使用 **Clash Verge Rev** 或 **FlClash Windows**。其他使用 Mihomo 内核并支持相应订阅配置的客户端理论上也可接入，具体以客户端支持情况为准。

## 文件与地址（使用方法）

### 3X-UI 全局路由规则 → Mihomo

打开 3X-UI 面板的 **订阅设置 → Clash / Mihomo**，先打开 **启用路由**，再在 **全局路由规则** 中填写下面两个地址中的任意一个：

**GitHub Raw：**

```text
https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/next-rules.yaml
```

**jsDelivr 加速：**

```text
https://cdn.jsdelivr.net/gh/JJorigin/next-rules@main/rules/next-rules.yaml
```

上述地址**二选一**填写完成后，保存 3X-UI 设置，并更新客户端订阅。

首次设置或规则更新后，如果暂未出现 Next-Rules 策略组，请稍后再次更新客户端订阅。

3X-UI 会将远程路由规则合并到生成的 Mihomo / Clash 订阅中，节点仍由你的 3X-UI 面板提供。在 **Clash Verge Rev** 或 **FlClash Windows** 中导入面板提供的 Mihomo 订阅地址，并使用**规则模式**。

上面的 YAML 地址填写在 **3X-UI 面板**中；客户端导入的是面板生成的**节点订阅地址**。

### Clash Verge Rev

适用于已有机场或节点订阅，希望在本地叠加 **Next-Rules** 分流规则的场景。

1. 在 Clash Verge Rev 中导入并确认节点订阅可以正常使用。
2. 打开该订阅的 **订阅扩展脚本**编辑入口。
3. 点击下面的链接，打开并复制完整脚本：

   [打开 / 复制 JS](https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/next-rules.js)
4. 将脚本粘贴到编辑器中，保存并重新更新订阅。
5. 使用**规则模式**，回到代理组页面，检查策略组和节点是否正常出现。

同一个订阅只使用一种接入方式。已经通过 3X-UI 下发 `next-rules.yaml` 时，不要再对同一个订阅叠加 `next-rules.js`。

## Next-Rules 解决什么问题

**Next-Rules** 会根据请求类型自动进行分流，覆盖常见网络服务、AI 服务、流媒体、软件服务、广告和局域网等场景。

你可以为不同场景分别选择节点。例如，AI 服务使用一条线路，Google/YouTube 使用另一条线路，流媒体再使用其他线路。规则会自动识别请求并交给对应场景组，实现**按服务分流、分别选择出口**。

### 节点选择方式

| 策略组 | 可选出口 | 用途 |
| --- | --- | --- |
| `🚀 默认代理 [自选]` | 自动选择、订阅节点 | 处理未命中前面规则的请求，即“漏网之鱼” |
| AI、Google/YouTube、流媒体等场景组 | 自动选择、`DIRECT`、订阅节点 | 为不同服务分别选择出口 |
| `🛑 广告拦截 [系统]` | `REJECT`、`DIRECT` | 默认拦截广告，也可手动放行 |

**`DIRECT` 表示直连，流量不经过代理节点；`REJECT` 表示拒绝连接。** 选择具体节点时，对应场景固定使用该节点；选择自动选择时，则交给客户端测速选路。

`♻️ 自动选择 [系统]` 通过健康检查地址测试节点是否可用以及响应延迟，优先选择可用且延迟较低的节点。对于直接写入订阅的节点，检查间隔为 **300 秒**，切换容差为 **50 毫秒**，以减少小幅延迟波动引起的频繁切换；启用按需测速，未被使用时跳过定时检测。测速延迟不等于下载速度，也不代表某个服务一定可用。

规则从上到下匹配，命中后使用对应策略。软件进程规则优先，其次按私有地址、广告和各类服务规则处理，再由直连规则及默认代理兜底。未命中特定软件或服务规则、且命中直连规则的域名和 IP 使用直连；其余请求交给 `🚀 默认代理 [自选]`。

### 软件进程分流

软件进程分流需要客户端能够识别发起连接的进程。**FlClash Windows** 默认关闭此功能；需要按软件分流时，请打开 **工具 → 常规 → 连接 → 查找进程**。未开启时，域名和 IP 规则仍会正常匹配。

开启进程识别后，匹配 Steam、WhatsApp、Discord、Epic 等软件进程的请求会优先交给 `🖥️ 软件分流 [自选]`，包括这些进程访问原本可直连的目标。需要让匹配软件直连时，可在软件分流组中选择 `DIRECT`。

## DNS 与分流

DNS 和代理路由是两个不同的部分：

- **DNS** 决定域名通过什么路径解析；
- **分流规则** 决定请求最终进入直连、代理或具体策略组。

**Next-Rules** 提供路由规则，不接管客户端的 DNS 基线。

### Windows 客户端设置

推荐在客户端手动开启 **TUN（虚拟网卡模式）**和**严格路由**：

- **Clash Verge Rev：** 在 **设置**中打开**虚拟网卡模式**，点击旁边的齿轮，开启**严格路由**并保存。
- **FlClash Windows：** 打开虚拟网卡，再进入 **工具 → 进阶配置 → 网络 → 虚拟网卡 → 添加覆写项 → 严格路由**，添加该覆写项后，将开关设为开启。

这些开关由客户端管理，导入 Next-Rules 不会自动开启。不同版本的设置入口可能略有差异。开启后请在实际使用的浏览器和网络环境中重新检测 DNS；严格路由用于减少请求绕过 TUN 的情况，检测结果仍以实际解析路径和出口为准。

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

外部规则由 Mihomo 的规则提供者下载并缓存到本地，并按照发布文件中设置的更新间隔由客户端自动更新。当前 Next-Rules 规则提供者的更新间隔为 **86400 秒（24 小时）**。GitHub 或 jsDelivr 不会主动向客户端推送更新。

当 **Next-Rules** 更新后，不需要更换订阅地址：

- **3X-UI 用户**继续使用原地址，并更新客户端订阅；
- **Clash Verge Rev 本地脚本用户**重新打开 [脚本链接](https://raw.githubusercontent.com/JJorigin/next-rules/main/rules/next-rules.js)，复制最新内容替换原脚本，保存后更新订阅。只更新订阅不会自动替换已粘贴的脚本；
- 外部规则集按照各自的更新间隔独立更新。

**Next-Rules 会持续维护。** 如果发现规则存在问题，欢迎提交 [Issue](https://github.com/JJorigin/next-rules/issues)。

## 兼容性与边界

**Next-Rules** 提供 **Clash Verge Rev / FlClash Windows 的 3X-UI 远程订阅接入**，以及 **Clash Verge Rev 的本地扩展脚本接入**。FlClash Windows 的设置说明以 **v0.9.1** 为基准；本项目不提供 FlClash 的 JS 脚本导入方式。

其他 Mihomo 客户端的兼容性取决于其订阅处理与配置支持。请使用规则模式；另外添加的规则或脚本可能改变原有分流结果。

远程下发时，节点名称应与本项目的策略组名称区分，避免同名冲突。本地脚本遇到重名时，会为新策略组添加项目后缀，保留原节点名称。

**Next-Rules** 不提供代理节点，也不会改变节点的协议、线路、出口 IP 或网络质量。它负责规则识别、策略组组织和出口选择，不能保证第三方服务的账号、认证、地区资格或风控结果。

如果订阅通过 `proxy-providers` 提供节点，健康检查由节点提供者执行，其原有的检测周期和按需设置可能影响实际测速行为。

## 规则来源与鸣谢

本项目参考了以下开源项目和官方文档：

- [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules)：参考其规则提供者组织、规则顺序和场景策略组设计。
- [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules)：提供 AI 服务 Global Clash 规则集。
- [MetaCubeX/mihomo 文档](https://wiki.metacubex.one/)：用于核对 Mihomo 的策略组、规则提供者和 DNS 配置语义。
- [Clash Verge Rev 文档](https://www.clashverge.dev/guide/extend.html)：用于核对订阅扩展脚本和配置合并优先级。
- [FlClash](https://github.com/chen08209/FlClash)：用于核对 Windows 客户端的订阅处理和设置入口。

感谢上述项目的维护者和贡献者。

## 支持项目

如果 **Next-Rules** 对你有帮助，欢迎在 [GitHub 项目主页](https://github.com/JJorigin/next-rules) 点 Star，也欢迎提交 [Issue](https://github.com/JJorigin/next-rules/issues) 帮助改进规则。

## 免责声明

**Next-Rules** 仅用于网络技术研究、学习和配置交流。

请遵守所在地法律法规，以及相关软件、网络服务和平台的使用规则。使用本项目产生的任何结果和风险由使用者自行承担。

## 作者

**JJorigin**

项目名称：**Next-Rules（未来分流）**


# Next-Rules · 未来分流

Next-Rules 帮你给 AI、Google / YouTube、流媒体等服务分别选线路。节点由你自己的订阅提供。

**当前版本 2.0**

## 选择接入方式

| 客户端 / 接入方式 | 状&#8288;态 | 适合场景 |
| --- | :---: | --- |
| **3X-UI 全局路由规则 → Mihomo** | ✅ | 有自己的 3X-UI 面板，使用 Clash Verge Rev 或 FlClash Windows |
| **Clash Verge Rev** | ✅ | 已有机场或节点订阅，想在本地叠加分流规则 |

## 文件与地址（使用方法）

接入前，给**已确认使用海外出口**的代理节点在名称里加上 `[海外]`，例如 `[海外] 节点 A`。请用半角方括号。使用 3X-UI 时可在面板改名。使用其他订阅时，请确认客户端收到的节点名称带有这个标记。

### 3X-UI 全局路由规则 → Mihomo

1. 进入面板的 **订阅设置 → Clash / Mihomo**，打开 **启用路由**。
2. 将以下任意一个地址填入 **全局路由规则**，然后保存。

   **GitHub Raw**

   ```text
   https://raw.githubusercontent.com/JJorigin/next-rules/main/v2/next-rules.yaml
   ```

   **jsDelivr 加速**

   ```text
   https://cdn.jsdelivr.net/gh/JJorigin/next-rules@main/v2/next-rules.yaml
   ```

3. 在 Clash Verge Rev 或 FlClash Windows 中导入面板生成的 **Mihomo 完整订阅地址**。已导入的订阅直接刷新即可。最后切换到**规则模式**。

### Clash Verge Rev

1. 导入你的节点订阅。右键该订阅，选择 **扩展脚本**。
2. 复制完整脚本，粘贴到编辑器并保存。 [打开 / 复制脚本](https://raw.githubusercontent.com/JJorigin/next-rules/main/v2/next-rules.js)
3. 刷新订阅，切换到**规则模式**。

同一个订阅选一种接入方式即可。

## Next-Rules 解决什么问题

访问服务时，客户端会按规则找到对应的策略组，并使用你为该组选定的线路。比如，在 **AI服务**组选择节点 A，在 **谷歌服务(含油管)**组选择节点 B，匹配到的请求就会分别走 A 和 B。

规则会优先识别局域网和常见国内站点，匹配到的流量直接连接。客户端能识别软件进程时，部分未归类的连接会交给**软件分流**。仍未匹配的请求交给**默认代理**。

### 节点选择方式

| 策略组 | 可选出口 |
| --- | --- |
| `🚀 默认代理 [自选]` | 自动选择、带 `[海外]` 的代理节点 |
| AI、Google / YouTube、流媒体等场景组 | 自动选择、带 `[海外]` 的代理节点、手动 `DIRECT` |
| `🛑 广告拦截 [系统]` | `REJECT`（默认拦截）、`DIRECT`（放行） |

- **自动选择**会测速，优先使用可用且延迟较低的节点。也可以为某个场景手动选定节点。
- **`DIRECT` 是直连**，该组会使用本机网络。AI 服务需要走代理时，请在 AI 组选择代理节点或自动选择。
- **代理组里找不到节点**时，先检查节点名称里的 `[海外]` 标记，再刷新订阅。没有符合条件的节点时，默认代理和自动选择会拒绝连接。

## DNS 与分流

DNS、TUN（虚拟网卡模式）和 IPv6 由原订阅和客户端管理。Windows 用户可在客户端手动开启 **TUN** 和**严格路由**。

- 在 **Clash Verge Rev** 的**设置**中开启**虚拟网卡模式**。点旁边的齿轮，开启**自动设置全局路由**和**严格路由**。有 **DNS 模式**选项时保持 **Auto**。
- 在 **FlClash Windows** 开启虚拟网卡，进入 **工具 → 进阶配置 → 网络 → 虚拟网卡 → 添加覆写项**，添加并开启**严格路由**。

如果网站连不上，可在客户端的**连接**页面查看它命中了哪条规则、用了哪个节点。批量安装前，先在一台设备上用常用网站确认直连和代理出口，并检查 DNS。需要确认浏览器的 WebRTC 出口时，请在浏览器里单独测试。

## 规则更新

- 使用 **3X-UI** 时，保留上面的规则地址，在客户端更新订阅。
- 使用 **Clash Verge Rev 本地脚本**时，从上面的链接重新复制脚本，替换并保存后刷新订阅。
- 客户端运行时每 **24 小时**检查一次外部规则集。需要固定使用 **2.0** 时，可下载发布文件。 [2.0 发布页](https://github.com/JJorigin/next-rules/releases/tag/v2.0)

## 兼容性与边界

已使用 Clash Verge Rev 自带的 Mihomo 1.19.33 和 FlClash Windows 0.9.3 的内核验证分流。其他客户端能否使用，取决于它的 Mihomo 内核和订阅支持。

## 规则来源与鸣谢

- 服务分类和地址数据参考了规则库及服务商公开资料。 [MetaCubeX 规则库](https://github.com/MetaCubeX/meta-rules-dat)
- AI 名单参考了开源规则和服务商公布的地址。 [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules) · [OpenAI 网络说明](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)
- 分流设计参考了以下项目。 [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules) · [Hrules](https://github.com/hcloudlab/Hrules) · [Custom OpenClash Rules](https://github.com/Aethersailor/Custom_OpenClash_Rules)

## 支持项目

欢迎给项目点 Star。遇到分流问题时，可以带上客户端版本、命中的规则和策略组提交反馈。请先隐去订阅地址、节点信息和 IP。 [提交 Issue](https://github.com/JJorigin/next-rules/issues)

## 免责声明

本项目仅用于网络技术研究、学习和配置交流。请遵守所在地法律法规及所用服务的条款，使用风险由使用者自行承担。

## 作者

**JJorigin**

# Next-Rules · 未来分流

Next-Rules 帮你给 AI、Google、YouTube 和流媒体等服务分别选线路。节点由你自己的订阅提供。

**当前主版本 2.3**

## 选择接入方式

| 接入方式 | 适合场景 |
| --- | --- |
| **3X-UI 远程下发** | 自建 3X-UI 面板，使用 Clash Verge Rev 或 FlClash Windows |
| **Clash Verge Rev 本地脚本** | 已有节点订阅，想在客户端加上分流规则 |

## 文件与地址（使用方法）

### 3X-UI 全局路由规则 → Mihomo

1. 在 **订阅设置 → Clash / Mihomo** 中开启 **启用路由**。
2. 将以下任意一个地址填入 **全局路由规则**，然后保存。

   **GitHub Raw**

   ```text
   https://raw.githubusercontent.com/JJorigin/next-rules/main/next-rules.yaml
   ```

   **jsDelivr 加速**

   ```text
   https://cdn.jsdelivr.net/gh/JJorigin/next-rules@main/next-rules.yaml
   ```

3. 在 Clash Verge Rev 或 FlClash Windows 中导入面板生成的 **Mihomo 完整订阅地址**。已导入的订阅直接刷新即可。最后切换到**规则模式**。

### Clash Verge Rev

1. 导入你的节点订阅。右键该订阅，选择 **扩展脚本**。
2. 复制完整脚本，粘贴到编辑器并保存。 [打开 / 复制脚本](https://raw.githubusercontent.com/JJorigin/next-rules/main/next-rules.js)
3. 刷新订阅，切换到**规则模式**。

同一个订阅选一种接入方式即可。

## 流量怎么分

打开客户端的**规则模式**。命中场景组的请求走该组选择的线路，识别为普通国内或局域网的请求直连。软件组处理部分尚未归类的连接，最后剩下的请求走默认代理。

| 策略组 | 处理的流量 |
| --- | --- |
| 🚀 **默认代理** | 其他规则未匹配的请求 |
| 🤖 **AI服务** | ChatGPT（含语音相关连接）、Claude、Gemini、Cursor、Copilot、Perplexity 等已收录的 AI 服务 |
| 🔍 **谷歌服务** | Google 搜索、Gmail、Google 账号登录等，专用服务按各自的组分流 |
| 📺 **YouTube** | YouTube 页面和视频流等已识别的请求。默认跟随谷歌服务组，可以单独选线路 |
| 🎬 **全球流媒体** | Netflix、Disney+、HBO / Max、Prime Video、Apple TV+、Spotify、Twitch 等 |
| 🌏 **亚太流媒体** | myTV SUPER、Now TV、Viu、动画疯、LiTV、Hami Video、ABEMA、TVer 及其他已收录的亚太平台 |
| 💬 **电报专用** | Telegram 服务的域名和已收录的 IP 连接 |
| Ⓜ️ **微软服务** | Outlook、OneDrive 等已收录的微软服务。Copilot 等已识别的 AI 请求走 AI 组 |
| 🍎 **苹果服务** | App Store、iCloud 等已收录的苹果服务。Apple TV+ 的专用流量走全球流媒体组 |
| 💰 **币圈专用** | Binance 等已收录的加密货币服务 |
| 🖥️ **软件分流** | Steam、Discord、Epic Games、WhatsApp 的部分连接。客户端须能识别进程，已识别的普通国内目标仍直连 |
| ♻️ **自动选择** | 自动为使用该选项的组选择可用节点 |
| 🛑 **广告拦截** | 已收录的广告请求。默认 `REJECT`（拦截），可选 `DIRECT`（放行并直连） |

例如，在 AI 组选一条线路，在 YouTube 组另选一条，两个服务就会各走各的节点。YouTube 使用 Google 账号登录时，识别到的 Google 登录请求走谷歌服务组。TikTok 沿用常规分流。 [完整流媒体平台清单](MEDIA.md)

### 怎么选节点

- **自动选择**按节点到测试地址的连通性和延迟选线，使用期间约每 5 分钟复测。需要固定线路时，在对应组直接选订阅节点。
- **`DIRECT` 是直连**。AI、Google、流媒体等场景组可手动选择。希望该组使用代理时，选具体节点或自动选择。
- **默认代理**可以选择自动选择或订阅节点。代理组缺少节点时，请检查订阅里是否有有效节点，再刷新订阅。

FlClash Windows 如需按软件进程分流，请在客户端开启**查找进程**。未开启时，仍按域名和 IP 规则分流。

## DNS 与分流

DNS 由客户端的 Mihomo 按你的订阅或客户端设置处理。未收录的域名可能先查询真实地址，以判断是否该走国内直连。更新远程规则后，请刷新客户端的完整订阅。

Windows 用户请手动开启 **TUN（虚拟网卡）**和**严格路由**。

- 在 **Clash Verge Rev** 的**设置**中开启**虚拟网卡模式**。点旁边的齿轮，开启**自动设置全局路由**和**严格路由**。有 **DNS 模式**选项时保持 **Auto**。
- 在 **FlClash Windows** 开启虚拟网卡，进入 **工具 → 进阶配置 → 网络 → 虚拟网卡 → 添加覆写项**，添加并开启**严格路由**。

批量安装前，先在一台设备上确认国内服务直连、YouTube 播放、常用网站图片和 DNS 检测结果。WebRTC 的直连出口由浏览器设置管理。

## 规则更新

- **3X-UI** 保留上面的规则地址，在客户端刷新完整订阅。**本地脚本**需从上面的链接重新复制，替换后保存。
- 更新客户端及服务分类数据库。客户端运行时每 **24 小时**检查外部规则集。**首次使用时，请先确认规则集已加载成功，再使用需要指定出口的服务。**
- 需要固定使用 **2.3** 时，可下载发布文件。 [2.3 发布页](https://github.com/JJorigin/next-rules/releases/tag/v2.3)
- 旧版文件已归档到 [old](old/)，不再维护。原有规则地址仍可用于获取当前主版本。

## 兼容性与边界

使用 Mihomo 1.19.33、1.19.34 和 FlClash Windows 0.9.4 的内核验证。公网 DNS 出口以你设备的测试结果为准。其他客户端能否使用，取决于它的 Mihomo 内核和订阅支持。

## 规则来源与鸣谢

- 服务分类和地址数据参考了规则库及服务商公开资料。 [MetaCubeX 规则库](https://github.com/MetaCubeX/meta-rules-dat)
- AI 服务参考 VPSDance 的分类。ChatGPT 语音地址从 OpenAI 的官方清单定期更新。 [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules) · [OpenAI 网络说明](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)
- 分流设计参考了以下项目。 [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules) · [Hrules](https://github.com/hcloudlab/Hrules) · [Custom OpenClash Rules](https://github.com/Aethersailor/Custom_OpenClash_Rules)
- 部分流媒体规则引用或参考了以下项目。 [blackmatrix7](https://github.com/blackmatrix7/ios_rule_script) · [liandu2024](https://github.com/liandu2024/clash) · [Sukka](https://github.com/SukkaW/Surge)

规则数据的来源和许可见[来源说明](rules/NOTICE.md)。

## 支持项目

欢迎给项目点 Star。遇到分流问题时，可以带上客户端版本、命中的规则和策略组提交反馈。请先隐去订阅地址、节点信息和 IP。 [提交 Issue](https://github.com/JJorigin/next-rules/issues)

## 免责声明

本项目仅用于网络技术研究、学习和配置交流。请遵守所在地法律法规及所用服务的条款，使用风险由使用者自行承担。

## 作者

**JJorigin**

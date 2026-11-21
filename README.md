# Next-Rules · 未来分流

Next-Rules 让常用国内网站直连，并为 AI、YouTube、Telegram 和流媒体等服务分别选择线路。节点由你自己的订阅提供。

## 安装

同一个订阅选下面一种方式。安装完成后，在客户端切换到 **规则模式**。

### 3X-UI 远程下发

1. 在 3X-UI 面板中打开 **订阅设置 → Clash / Mihomo**，开启 **启用路由**。
2. 把下列任一地址填入 **全局路由规则** 并保存。

   **GitHub Raw**

   ```text
   https://raw.githubusercontent.com/JJorigin/next-rules/main/next-rules.yaml
   ```

   **jsDelivr 加速**

   ```text
   https://cdn.jsdelivr.net/gh/JJorigin/next-rules@main/next-rules.yaml
   ```

3. 在 **Clash Verge Rev** 或 **FlClash Windows** 中导入面板生成的 **Mihomo 完整订阅地址**。已导入的订阅直接刷新。

### Clash Verge Rev 本地脚本

1. 导入你的节点订阅，右键该订阅并选择 **扩展脚本**。
2. 复制完整脚本，粘贴到编辑器并保存，再刷新订阅。 [打开脚本](https://raw.githubusercontent.com/JJorigin/next-rules/main/next-rules.js)

## 怎么分流

已收录的国内域名、已知的国内 IP 和局域网直连，例如哔哩哔哩和爱奇艺的国内站。命中服务组时使用该组选择的线路，其余连接交给默认代理组。

| 策略组 | 处理的流量 |
| --- | --- |
| 🚀 **默认代理** | 其他规则未匹配的连接。 |
| 🤖 **AI服务** | ChatGPT（含语音）、Claude、Gemini、Cursor、Microsoft Copilot、GitHub Copilot、Perplexity 等。 |
| 🔍 **谷歌服务** | Google 搜索、Gmail 和 Google 账号登录，包括 YouTube 调用的 Google 登录。 |
| 📺 **YouTube** | YouTube 页面、视频、缩略图和 YouTube Music。默认跟随谷歌服务组，也可以单独选线路。 |
| 🎬 **全球流媒体** | Netflix、Disney+、HBO Max、Prime Video、Apple TV+、Spotify、Twitch 等。 |
| 🌏 **亚太流媒体** | 香港的 myTV SUPER、Now TV、Viu，台湾的动画疯、LiTV、Hami Video，日本的 ABEMA、TVer，以及哔哩哔哩和爱奇艺的国际版等。 |
| 💬 **电报专用** | Telegram 应用、网页版、`t.me` 链接及已收录的 Telegram 地址。 |
| Ⓜ️ **微软服务** | Outlook、OneDrive、Microsoft 365 和 MSN 的部分服务。已识别的国内微软服务直连，Copilot 走 AI 组。 |
| 🍎 **苹果服务** | iCloud 等苹果服务。已识别的中国区苹果服务直连，Apple TV+ 走全球流媒体组。 |
| 💰 **币圈专用** | Binance、OKX、Coinbase 等已收录的加密货币平台。 |
| 🖥️ **软件分流** | Steam、Discord、Epic Games、WhatsApp 中尚未按网站或服务归类的连接。需要客户端能识别应用。 |
| ♻️ **自动选择** | 按连通性和延迟从订阅中挑选代理节点。 |
| 🛑 **广告拦截** | 已收录的广告默认拦截。选 `DIRECT` 可放行并直连。 |

流媒体组内的平台共用该组当前选择的线路。观看地区限定内容时，在对应组选择该地区可用的节点。TikTok 沿用常规分流。 [查看完整流媒体清单](MEDIA.md)

### 怎么选线路

在客户端的 **代理** 或 **代理组** 页面，展开对应组。选具体节点可固定线路，选 **自动选择** 由客户端挑选。场景组里的 **`DIRECT`** 表示手动直连。

FlClash Windows 若要使用软件分流，请开启客户端的 **查找进程**。

## Windows 的 TUN 和 DNS

开启 **TUN（虚拟网卡）** 后，请手动开启 **严格路由**。

- **Clash Verge Rev** 在 **设置 → 虚拟网卡模式** 旁点齿轮，开启 **自动设置全局路由** 和 **严格路由**。有 **DNS 模式** 选项时保持 **Auto**。
- **FlClash Windows** 在 **工具 → 进阶配置 → 网络 → 虚拟网卡 → 添加覆写项** 添加并开启 **严格路由**。

DNS 由订阅或客户端设置决定。分流只用连接的域名和已有目标 IP。批量装机前，先在一台设备上确认 DNS 出口，并试用常访问的网站。

## 更新规则

- **3X-UI 远程下发** 在客户端刷新完整订阅。
- **Clash Verge Rev 本地脚本** 重新复制最新版脚本，替换后保存。
- 客户端运行时每 **24 小时** 检查外部规则集。首次使用请先确认规则集已加载。
- 项目每 **6 小时** 检查本仓库引用的上游名单，校验通过后同步。

[发布版本](https://github.com/JJorigin/next-rules/releases) · [旧版归档](old/)

## 来源和反馈

感谢 MetaCubeX、VPSDance 与其他上游项目。AI 名单跟随 VPSDance 更新，ChatGPT 语音地址来自 OpenAI。 [规则来源与许可](rules/NOTICE.md)

反馈时请附上客户端版本和命中的策略组，先隐藏订阅地址、节点信息和 IP。 [提交 Issue](https://github.com/JJorigin/next-rules/issues)

本项目仅用于网络技术研究、学习和配置交流。请遵守所在地法律法规及所用服务的条款，使用风险由使用者自行承担。

由 **JJorigin** 维护。

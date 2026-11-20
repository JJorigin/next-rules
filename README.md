# Next-Rules · 未来分流

Next-Rules 帮你给 AI、Google、YouTube 和流媒体等服务分别选线路。节点由你自己的订阅提供。

**当前主版本 2.2**

## 选择接入方式

| 客户端 / 接入方式 | 状&#8288;态 | 适合场景 |
| --- | :---: | --- |
| **3X-UI 全局路由规则 → Mihomo** | ✅ | 有自己的 3X-UI 面板，使用 Clash Verge Rev 或 FlClash Windows |
| **Clash Verge Rev** | ✅ | 已有机场或节点订阅，想在本地叠加分流规则 |

## 文件与地址（使用方法）

### 3X-UI 全局路由规则 → Mihomo

1. 进入面板的 **订阅设置 → Clash / Mihomo**，打开 **启用路由**。
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

## Next-Rules 解决什么问题

访问服务时，客户端会按规则找到对应的策略组，并使用你为该组选定的线路。比如，在 **AI服务**组选择节点 A，在 **谷歌服务**组选择节点 B，匹配到的请求就会分别走 A 和 B。

**YouTube** 可以单独选线路，默认跟随 Google 组。**全球流媒体**和**亚太流媒体**也可以分别选线路，后者包含香港、台湾及其他已收录的亚太平台。TikTok 沿用常规规则。[查看流媒体平台清单](MEDIA.md)

已识别的专用服务交给对应场景组，普通国内和局域网流量直连。客户端能识别软件进程时，部分未归类的连接会交给**软件分流**。仍未匹配的请求交给**默认代理**。

### 节点选择方式

| 策略组 | 可选出口 |
| --- | --- |
| `🚀 默认代理 [自选]` | 自动选择、订阅中的节点 |
| AI、Google、全球流媒体、亚太流媒体等场景组 | 自动选择、订阅中的节点、手动 `DIRECT` |
| `📺 YouTube [自选]` | 跟随 Google（默认）、自动选择、订阅中的节点、手动 `DIRECT` |
| `🛑 广告拦截 [系统]` | `REJECT`（默认拦截）、`DIRECT`（放行） |

- **自动选择**会检测节点连接测试地址的连通性和延迟，使用期间约每 5 分钟检测一次，优先选择延迟较低的可用节点。需要固定线路时，直接选择具体节点。
- **`DIRECT` 是直连**，该组会使用本机网络。AI 服务需要走代理时，请在 AI 组选择代理节点或自动选择。
- **代理组里找不到节点**时，请先确认已导入有效的节点订阅，再刷新订阅。没有代理节点时，默认代理和自动选择会拒绝连接。

FlClash Windows 如需按软件进程分流，请在客户端开启**查找进程**。未开启时，仍按域名和 IP 规则分流。

## DNS 与分流

DNS、TUN（虚拟网卡模式）和 IPv6 由原订阅和客户端管理。Windows 用户可在客户端手动开启 **TUN** 和**严格路由**。

- 在 **Clash Verge Rev** 的**设置**中开启**虚拟网卡模式**。点旁边的齿轮，开启**自动设置全局路由**和**严格路由**。有 **DNS 模式**选项时保持 **Auto**。
- 在 **FlClash Windows** 开启虚拟网卡，进入 **工具 → 进阶配置 → 网络 → 虚拟网卡 → 添加覆写项**，添加并开启**严格路由**。

如果网站连不上，可在客户端的**连接**页面查看它命中了哪条规则、用了哪个节点。批量安装前，先在一台设备上用常用网站确认直连和代理出口，并检查 DNS。WebRTC 的直连出口需在浏览器中另外限制，本规则不提供全面 WebRTC 防护。

## 规则更新

- 使用 **3X-UI** 时，保留上面的规则地址，在客户端更新订阅。
- 使用 **Clash Verge Rev 本地脚本**时，从上面的链接重新复制脚本，替换并保存后刷新订阅。
- 请先更新客户端及其服务分类数据库，再导入规则。客户端运行时每 **24 小时**检查一次外部规则集。首次使用须确认规则集加载成功；出现下载错误时，先完成更新再使用需要指定出口的服务。
- 需要固定使用 **2.2** 时，可下载发布文件。 [2.2 发布页](https://github.com/JJorigin/next-rules/releases/tag/v2.2)
- 旧版文件已归档到 [old](old/)，不再维护。原有规则地址仍可用于获取当前主版本。

## 兼容性与边界

已使用 Mihomo 1.19.33、1.19.34 和 FlClash Windows 0.9.3 的内核验证分流。其他客户端能否使用，取决于它的 Mihomo 内核和订阅支持。

## 规则来源与鸣谢

- 服务分类和地址数据参考了规则库及服务商公开资料。 [MetaCubeX 规则库](https://github.com/MetaCubeX/meta-rules-dat)
- AI 名单引用以下项目；地址补充也覆盖语音连接。 [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules) · [Sukka AI IP](https://ruleset.skk.moe/Clash/ip/ai.txt) · [OpenAI 网络说明](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)
- 分流设计参考了以下项目。 [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules) · [Hrules](https://github.com/hcloudlab/Hrules) · [Custom OpenClash Rules](https://github.com/Aethersailor/Custom_OpenClash_Rules)
- 部分流媒体规则引用或参考了以下项目。 [blackmatrix7](https://github.com/blackmatrix7/ios_rule_script) · [liandu2024](https://github.com/liandu2024/clash) · [Sukka](https://github.com/SukkaW/Surge)

规则数据的来源和许可见[来源说明](rules/NOTICE.md)。

## 支持项目

欢迎给项目点 Star。遇到分流问题时，可以带上客户端版本、命中的规则和策略组提交反馈。请先隐去订阅地址、节点信息和 IP。 [提交 Issue](https://github.com/JJorigin/next-rules/issues)

## 免责声明

本项目仅用于网络技术研究、学习和配置交流。请遵守所在地法律法规及所用服务的条款，使用风险由使用者自行承担。

## 作者

**JJorigin**

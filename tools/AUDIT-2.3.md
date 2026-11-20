# Next-Rules 2.3 审计记录

审计基线为 GitHub 已发布的 2.2，提交 `2db33777a1b1426da849d58bde4bf097d2ea422c`。两份发布附件与标签中的 YAML、JS 逐字节一致。以下记录供维护者复核，用户安装步骤见 [README](../README.md)。

## DNS 回归与修复

通过相同的 Mihomo 1.19.34 内核、回环 DNS 和模拟代理对比 1.3 与 2.2。两个版本都将测试用未分类海外域名送入代理。1.3 的路由未向本机配置的 DNS 上游查询该域名，2.2 执行了一次查询。只取消第一个主动解析规则仍会触发查询。两处都改成 `no-resolve` 后，未收录但解析到国内 IP 的对照目标也会走代理。

2.3 保留 IP 判断，用不同出口完成 DNS 查询。已识别的普通国内域名通过直连 DoH 解析，局域网使用本地解析。已能按域名确定场景的查询使用相应策略组。其余域名通过默认代理访问 DoH，代理不可用时查询失败。节点域名单独解析。海外 DoH 使用 IP 形式的服务器地址，节点与国内 DoH 域名的引导查询独立于默认代理。

| 对照来源 | 对 2.3 的作用 |
| --- | --- |
| [Mihomo 路由规则](https://wiki.metacubex.one/config/rules/#no-resolve)与 [DNS 出口](https://wiki.metacubex.one/config/dns/#dns-指定-代理接口-进行连接) | 确认晚解析和 `no-resolve` 的顺序语义，用指定策略组约束 DoH 出口 |
| [Hrules 精细版](https://github.com/hcloudlab/Hrules/blob/main/mihomo/editions/hrules-strict.js) | 对照普通查询、直连查询与节点查询分离的配置 |
| [Sukka 规则集](https://github.com/SukkaW/Surge#规则组列表) | 对照域名与 IP 规则阶段。比较其国内和国内 CDN 数据与 [MetaCubeX 国内分类](https://github.com/MetaCubeX/meta-rules-dat) 后，仍以现有国内分类为准。可在国内访问的上游清单还包含全球服务的域名 |
| [Custom OpenClash Rules](https://github.com/Aethersailor/Custom_OpenClash_Rules/blob/main/cfg/Custom_Clash.ini) | 对照域名优先和 `no-resolve` 的取舍。该配置明确提到冷门国内域名可能落到兜底 |
| [Perfect-Rules 的覆写](https://github.com/n0de-sudo/Perfect-Rules/blob/main/Clash/Clash_merge.yaml) | 对照 TUN 与 DNS 配置。2.3 只下发 DNS，严格路由和网络设置通过客户端开启 |

## 分流与兼容性

- 与 2.2 对照，178 条业务规则的内容与顺序、13 个策略组和原有业务规则集定义一致。YouTube 专用域名先于 Google 通用域名，Google 登录走谷歌服务组。Apple TV+ 的专用规则先于苹果服务。AI 与国际媒体的既有例外先于普通国内域名。
- 从同一套业务规则生成 DNS 匹配器。部署到 3X-UI 后，按其输出顺序验证 AI 优先、国内解析直连和各场景选线。本地脚本的测试覆盖同名节点、同名规则集与二次应用。
- 真实内核测试使用 Mihomo 1.19.33、1.19.34 和 FlClash Windows 0.9.4。回环 DoH 保留 TLS 证书校验，并记录实际连到上游的是直连还是模拟代理。覆盖 Fake-IP、真实 IP 解析、A、AAAA、HTTPS 类型查询、国内预解析、局域网 TCP / UDP、上游失败及默认代理断开时的场景组。既有回归继续检查 IP 分类、进程、UDP 出口与规则集更新。
- 用 [3X-UI 3.11.0 合并源码](https://github.com/MHSanaei/3x-ui/blob/v3.11.0/internal/sub/clash_service.go) 验证远程 DNS 的开关行为。经 [Clash Verge Rev 2.5.10 的配置合并](https://github.com/clash-verge-rev/clash-verge-rev/blob/v2.5.10/src-tauri/src/enhance/mod.rs)和 [FlClash 0.9.4 的配置合并](https://github.com/chen08209/FlClash/blob/v0.9.4/lib/common/task.dart)核对，客户端 DNS 覆写可能盖掉下发设置。

## 验收边界

首次下载失败且缓存为空时，内置 AI 分类可以保护它收录的品牌。仅存在于缺失规则集内的例外仍可能按其他规则走直连。纯远程模板需要规则集加载成功后才能完整分流。现有版本按独立文件下载和缓存规则集，更新到达客户端的时间可能不同。

未收录的国内域名可能先经过代理解析。GeoIP 依据实际返回地址判断，解析地点可能影响 CDN 结果。测试使用回环环境，登录、播放、Windows TUN 接管行为和实际网络上的延迟要在部署环境确认。应用自带加密 DNS、浏览器 WebRTC、手动选 `DIRECT` 及用户自己的 DNS 覆写均可改变客户端表现。

# 规则数据来源

本目录保留各上游来源的许可和署名。转换脚本、来源摘要和测试样本均随仓库公开。AI 分流视图从原始名单按匹配类型和服务归属生成。

| 数据 | 来源 | 许可 / 说明 |
| --- | --- | --- |
| AI 完整来源与域名视图 | [VPSDance/ai-proxy-rules](https://github.com/VPSDance/ai-proxy-rules) | [MIT](licenses/ai-proxy-rules-LICENSE.txt)，保留原作者版权声明 |
| 部分流媒体完整来源与域名视图 | [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) | [GPL-2.0](licenses/ios_rule_script-LICENSE.txt) |
| Crunchyroll 域名数据 | [liandu2024/clash](https://github.com/liandu2024/clash/blob/main/list/Crunchyroll.list) | 保留来源；上游未单列许可 |
| 币圈规则 | [Perfect-Rules](https://github.com/n0de-sudo/Perfect-Rules/blob/main/Clash/rules/crypto.yaml) | 保留来源；上游未单列许可 |
| 服务分类、Telegram 地址 | [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) | 使用客户端数据库与远程维护成品 |
| ChatGPT 语音地址 | [OpenAI 公开地址清单](https://openai.com/chatgpt-voice.json) | 同步时校验并转换为远程 IP 规则集 |

原始文件的校验值和来源版本见 [sources.json](sources.json)。`test/fixtures` 内的上游快照用于离线校验及重现测试，不包含用户订阅数据。

# 测试来源

`panel-merge.go` 的合并及校验函数摘自 [3X-UI v3.11.0](https://github.com/MHSanaei/3x-ui/blob/v3.11.0/internal/sub/clash_service.go)，使用[原项目许可](../rules/licenses/3x-ui-LICENSE.txt)。测试主程序只提供回环模拟订阅，验证两种 DNS 选项下的合并结果。`check-panel-source.py` 会核对摘录与官方固定版本的源码一致。

`fixtures` 的外部规则数据与原作者许可见 [来源说明](../rules/NOTICE.md)。所有模拟节点使用回环地址。测试中用于分类的其他 IP 仅来自公开服务商或标准文档，不是用户 IP，测试不会连接这些地址。

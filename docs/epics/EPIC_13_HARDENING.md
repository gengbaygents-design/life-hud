# EPIC 13 · MVP 验收与加固

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

对已完成 v0.1 进行完整黄金流程、权限/隐私/版本/失败/事件、PWA、持久化与跨设备验证。

## 依赖与边界

00–12 相关实现完成；不得以 hardening 为由推迟基础隐私。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 逐项验证全部 18 步 Golden MVP Journey，包含 DONE 未 SUBMITTED 和显式提交。
- 刷新/第二设备数据正确；AI 禁用时核心系统可用。
- 验证导出、真实隐私删除、越权、冲突、失败/重试和必要事件；未过检查如实报告。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [MVP_SPEC](../MVP_SPEC.md)
- [PRODUCT_CONSTITUTION](../PRODUCT_CONSTITUTION.md)
- [ACTION_CONTRACT](../ACTION_CONTRACT.md)

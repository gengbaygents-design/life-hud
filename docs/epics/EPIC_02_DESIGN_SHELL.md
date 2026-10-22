# EPIC 02 · 设计壳与移动导航

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

响应式 Web/PWA 导航、共用 UI 和全局 Lim overlay 的上下文承载。

## 依赖与边界

00、01；核心业务只接入契约，不提前实现。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 底栏为 HOME / QUEST / ◉ LIM / STUDY / MORE。
- Lim 打开/关闭保留当前 route/entity context；大学课程场景不丢失上下文。
- 空状态有效；MORE 中 WALLET/SOCIAL 仅保留入口，不建设完整模块。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [DESIGN_LANGUAGE](../DESIGN_LANGUAGE.md)
- [LIM_SPEC](../LIM_SPEC.md)

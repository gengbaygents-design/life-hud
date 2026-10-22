# EPIC 05 · 个人状态基础

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

StatusMoment 基本记录；Sleep/Water/Exercise/Cycle 的 v0.1 深度在启动时明确，不借概念列表扩大范围。

## 依赖与边界

01、02；高隐私策略先于敏感数据实现。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- mood-only 等部分输入有效，单日多条记录追加而非覆盖。
- 记录持久化并按 owner 访问；Cycle 为 HIGH_PRIVATE。
- AI 不作医疗诊断；StatusMomentRecorded、失败和隐私拒绝行为可验证。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [PRODUCT_CONSTITUTION](../PRODUCT_CONSTITUTION.md)
- [DATABASE_SCHEMA](../DATABASE_SCHEMA.md)
- [MVP_SPEC](../MVP_SPEC.md)

# EPIC 03 · 任务执行

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

捕获、NOW/TODAY/INBOX、planned time、deadline、完成/延期/drop/历史；Core Task 权威。

## 依赖与边界

01、02；状态迁移和版本冲突规则需先确定。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 延期只调整执行计划，不静默修改 deadline。
- 六个初始状态可按冻结规则持久保存，刷新后仍正确。
- 验证完成/延期失败、跨 owner、版本冲突和必要 Task domain events；不默认展示 FAILED。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [DOMAIN_MODEL](../DOMAIN_MODEL.md)
- [DATABASE_SCHEMA](../DATABASE_SCHEMA.md)
- [MVP_SPEC](../MVP_SPEC.md)

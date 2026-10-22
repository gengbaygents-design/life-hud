# EPIC 11 · 提醒基础

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

Reminder 与基础调度/投递/通知；作业关联 Task + Reminder 的跨域联调。

## 依赖与边界

01、03、04、09、10；00 Ship scheduler 基础。原队列/worker 技术假设已由 Ship 重建替代；有实际需要时再评估额外队列，此 EPIC 尚未开始。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- ReminderCreated/ReminderTriggered 与事实一致；重试/重复投递按冻结幂等契约处理。
- 提醒尊重 owner、隐私、用户选择与相关性；有数据不等于应打断。
- 作业 + Task + Reminder 行动按冻结事务边界处理，失败/撤销不改写 deadline 或伪造提交。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [DATABASE_SCHEMA](../DATABASE_SCHEMA.md)
- [ACTION_CONTRACT](../ACTION_CONTRACT.md)
- [MVP_SPEC](../MVP_SPEC.md)

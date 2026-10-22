# EPIC 09 · Lim 结构化行动

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

EXECUTE/ASSIST/TALK、受限 Context Pack、Action Proposal 安全流水线和 basic memory；行动通过领域服务。

## 依赖与边界

01、02、所用源域；作业/Task/Reminder 黄金流程待 11 联调。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- schema validation → authorization → risk check → Domain Service → DB transaction → Audit / Outbox → Action Result 全链可验证，LLM 无直接 SQL mutation。
- R0/R1/R2/R3 按风险和确认/撤销规则处理；跨域失败/重试不留下错误的部分结果。
- 用户纠正高于推断，“什么也不留”不写长期记忆；AI 禁用后领域功能继续工作。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [LIM_SPEC](../LIM_SPEC.md)
- [ACTION_CONTRACT](../ACTION_CONTRACT.md)
- [UNIVERSITY_PACK](../UNIVERSITY_PACK.md)

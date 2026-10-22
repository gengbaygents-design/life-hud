> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 结构化行动契约

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。
owner 必须来自服务端可信身份；提议中的实体引用、版本和权限需验证。动作具体 schema、幂等、跨域原子性/补偿和撤销契约尚待负责人冻结，不把风险级别当作授权。


## LIM ACTION SAFETY

Hard architecture rule:

LLM
-> structured Action Proposal
-> schema validation
-> authorization
-> risk check
-> Domain Service
-> DB transaction
-> Audit / Outbox
-> Action Result
-> Lim response

The LLM NEVER gets arbitrary SQL/database mutation ability.

Risk levels:

R0 = read-only
R1 = low-risk and easily reversible
R2 = meaningful/bulk/destructive change
R3 = highly sensitive, irreversible, or external action

R1 may usually execute without confirmation.

R2 normally requires confirmation or strong undo semantics.

R3 requires explicit confirmation.

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

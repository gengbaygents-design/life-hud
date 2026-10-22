> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 产品宪章

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。

## PRODUCT CONSTITUTION

These are hard constraints:

1. User agency comes first.
2. Lim is a navigator, not a pilot.
3. Natural language first: if something can reasonably be said, do not force unnecessary form filling.
4. Having data does not mean the system should interrupt the user.
5. Having access does not mean Lim should surface information without relevance.
6. Record facts before labels.
7. AI must never fabricate the user's reflections, emotions, history, or intentions.
8. Past behavior may help understand the present but must not trap the user in an old identity.
9. Silence, empty states, unfinished thoughts, and conversations with no resulting action are valid.
10. User life data belongs to the user and must remain exportable.
11. Reliable domain systems are authoritative; AI is an orchestration layer.
12. LLMs must NEVER mutate the database directly.
13. Build architecture for life, but implement only the current MVP.

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 产品愿景与当前边界

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。

## PRODUCT

LIFE HUD is a lifelong personal operating system centered around Lim,
a persistent AI navigator that helps the user understand, organize,
and act on their life without taking control away from them.

Canonical statement:

"LIFE HUD is a lifelong personal operating system.
University is Voyage #001, not the boundary of the product."

Architecture for Life.
Product for University first.

The current product must remain university-first.
Do NOT implement speculative future Career, Family, Travel, Household,
or other Life Packs.

## PRIMARY PRODUCT MODULES

HOME
QUEST
STUDY
WALLET
STATUS
SOCIAL
GROWTH
ARCHIVE

Shared:
Lim Core
Reminder / Notification
Global Search
Files
Privacy / Permissions
Sync
Cross-domain relations
Voyage

MVP does NOT include full WALLET or full SOCIAL.

## HOME

HOME answers:
"What matters now?"

HOME is an aggregator, not a source of truth.

Core mobile hierarchy:
- NEXT
- Today / current schedule
- compact status
- Lim presence
- important alerts

HOME must allow quiet/empty states.

HOME should not manufacture productivity work.

Canonical rule:

"HOME tells you what matters now.
Bridge helps you think and act on it."

Attention Engine should prefer explainable rules over opaque scores.

Do not show fake numeric priority scores.

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

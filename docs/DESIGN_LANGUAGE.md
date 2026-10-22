> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 信息架构与视觉语言

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。

## MOBILE IA

Bottom navigation is fixed:

HOME
QUEST
◉ LIM
STUDY
MORE

The LIM button is a global communication overlay trigger,
not merely a normal route.

Opening Lim from a page must preserve current route/entity context.

Example:
If user is inside a Math course page and says:
"这章我完全不会"

Lim should know the current Course/page context
without asking what course if context is already sufficient.

MORE contains:
LIFE:
- STATUS
- WALLET
- SOCIAL
- GROWTH

MEMORY:
- ARCHIVE
- VOYAGE

TOOLS:
- SEARCH
- FILES

SETTINGS:
- settings/privacy/help

## VISUAL LANGUAGE

Dark space / subtle HUD / restrained glass.

Avoid:
- corporate SaaS feeling
- neon cyberpunk overload
- RGB gamer UI
- excessive HUD
- mobile-game appearance

World-building concentration:

ordinary module:
10-20%

HOME:
20-30%

Bridge:
80-100%

Night Voyage:
atmospheric but quieter, less HUD

Information clarity wins over fantasy styling.

## LIM VISUAL

Canonical visual direction:

Young female AI navigation officer.
Very long silver-white hair with subtle icy-blue strands.
Clear light-blue attentive eyes.
Awake expression.
Slight gentle smile.
Shoulders covered.
Long sleeves.
Simple white / ice-blue futuristic high or half-high collar.
Long dress / first-officer uniform hybrid.
Restrained silhouette.
Minimal blue tech ornament.
Semi-transparent holographic lower-body/data-particle effect when appropriate.

80% assistant, 20% fantasy.

Avoid:
- exposed shoulders
- goddess ornamentation
- seductive poses
- reclining/bed/sofa poses
- chin resting
- dreamy half-lidded eyes
- sexualized framing
- virtual-girlfriend framing

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

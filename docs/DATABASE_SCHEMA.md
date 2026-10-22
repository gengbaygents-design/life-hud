> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 数据库设计约束（概念阶段）

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。
本文件只记录概念约束；未批准物理表、字段类型、迁移或新增 schema。PostgreSQL 初始方向已定，详细 schema 在对应 EPIC 由负责人设计。


## DATA CONVENTIONS

Owner-scoped entities should generally include:
- id
- owner_id
- created_at
- updated_at
- version
- deleted_at where appropriate

Never trust owner_id from the client.
Resolve authenticated user server-side.

Use optimistic versioning for important mutable records.

Use soft delete where appropriate.

Hard delete must exist for true privacy deletion cases.

Original user content must not be silently overwritten by AI summaries.

## DOMAIN EVENTS / OUTBOX

Use domain events.

Examples:
- TaskCreated
- TaskCompleted
- TaskDelayed
- AssignmentCreated
- AssignmentUpdated
- AssignmentCompleted
- AssignmentSubmitted
- ExamCreated
- StatusMomentRecorded
- LearningRecordCreated
- SkillEvidenceAdded
- ProjectCreated
- ReminderCreated
- ReminderTriggered
- FileUploaded
- FileParsed
- VoyageStarted
- VoyageCompleted

Use a Transactional Outbox pattern where appropriate.

## ENTITY LINK

EntityLink represents semantic relationships between objects.

Examples:
LearningRecord --APPLIED_TO--> Project
Task --PREPARES_FOR--> Exam
Assignment --BELONGS_TO--> Course
CaptainLog --ABOUT--> Project

Use PostgreSQL initially.
Do NOT introduce a graph database in MVP.

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

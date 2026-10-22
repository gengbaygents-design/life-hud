> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# University Pack

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。

## STUDY / UNIVERSITY PACK

STUDY is currently the University learning workspace.

Core University entities:
- Semester
- Course
- Enrollment
- ClassSession
- Assignment
- Exam
- Grade
- CourseMaterialLink

Critical rule:

Assignment != Task

Assignment represents an academic requirement.
Task represents the user's execution plan.

Critical rule:

DONE != SUBMITTED

Assignment needs separate concepts equivalent to:
- work_state
- submission_state

A user may finish the work while still not having submitted it.

Exam does not automatically create ten revision tasks.

CourseMaterialLink references a Core File.

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

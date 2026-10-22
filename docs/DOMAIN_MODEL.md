> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 领域概念与所有权

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。
实体归属见原文；主模块是产品视图，不能反推所有数据都归入一个模块表。Task / Assignment、完成 / 提交、原文 / 摘要等语义分别由源域保持。


## TOP-LEVEL ARCHITECTURE

Three conceptual layers:

1. LIFE HUD Core
2. Voyage
3. Life Pack

LIFE HUD Core contains long-lived capabilities.

Voyage represents a period of life.

Life Packs contain stage/domain-specific functionality.

The first and only currently implemented Life Pack is:
University Pack.

Examples:

Core:
- User
- Voyage
- Person
- Relationship
- Event
- Task
- Project
- Goal
- Place
- File
- Reminder
- Status records
- Learning Record
- Skill
- Archive
- Memory
- Search
- Privacy
- EntityLink
- RealWorldEvent
- ActionGroup
- Lim

University Pack:
- Semester
- Course
- Enrollment
- ClassSession
- Assignment
- Exam
- Grade
- CourseMaterialLink

Hard rule:
If a concept still makes sense after graduation,
it should generally belong to Core.

Person is Core.
"Classmate" is relationship/context, not a Person subtype.

Task is Core.
Assignment is University.

Project is Core.
A course project is a Project linked to a Course.

Place is Core.
A classroom is a Place used in a university context.

File is Core.
Course material references a File rather than copying it.

## REAL WORLD EVENT

RealWorldEvent is important.

It represents one real-life occurrence that may connect multiple domains.

Example:
"Had hotpot with Wang Hao"

may link:
- Person
- Social interaction
- Wallet transaction
- StatusMoment
- Place
- Archive index

Do not collapse those domain objects into one table.

## ENTITY LINK

EntityLink represents semantic relationships between objects.

Examples:
LearningRecord --APPLIED_TO--> Project
Task --PREPARES_FOR--> Exam
Assignment --BELONGS_TO--> Course
CaptainLog --ABOUT--> Project

Use PostgreSQL initially.
Do NOT introduce a graph database in MVP.

## QUEST

QUEST answers:
"What is most worth doing now?"

Core:
- task capture
- NOW
- TODAY
- INBOX
- planned time
- deadline
- complete
- delay
- drop
- history

Critical rule:

planned time != deadline

Delaying a task must not silently modify its deadline.

Task and external requirement are different objects.

Task status initial model:
- INBOX
- PLANNED
- ACTIVE
- COMPLETED
- DELAYED
- DROPPED

Do not create shame-oriented "FAILED" UX by default.

## STATUS

STATUS is personal-state sensing, not medical diagnosis.

Key records:
- StatusMoment
- Sleep
- Water
- Exercise
- Cycle

StatusMoment must allow partial input.

For example:
mood only is valid.

Multiple StatusMoments per day are allowed.
Do not overwrite previous same-day moments.

Cycle data is high privacy.

AI must not make medical diagnoses.

## GROWTH / LEARNING

GROWTH contains:
- Learning Records
- Skills
- Skill Evidence
- Projects
- Goals

Learning Record may contain:
- screenshot
- video/link/article/course source
- user reflection
- questions
- application ideas
- project ideas

Critical rule:

input != mastery

Watching or saving something may produce CONTACT evidence.
It must not automatically produce UNDERSTANDING or mastery.

Suggested skill evidence progression:
- CONTACT
- UNDERSTANDING
- PRACTICE
- INDEPENDENT
- TRANSFER
- OUTPUT

Avoid fake skill percentages.

Do not fabricate a user's reflection.

STUDY records what the user did.
GROWTH Learning Records preserve what the user learned/thought.

## ARCHIVE

ARCHIVE is a memory/time lens, not a duplicate database.

It may organize:
- day
- week
- month
- semester
- year
- Voyage
- life history

Source domain data remains in the source domain.

Captain's Log:
- original user text is authoritative
- AI summary is secondary and separate

"Remember this moment" should create a marker/reference,
not copy every connected record.

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 核心架构

来源：[epic0.txt](source/epic0.txt)。当前工程阶段：EPIC_00；本文件的业务规则尚未实现。以下英文段落按原文摘录，保留既定标识和规则。

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

## TECHNICAL DIRECTION

Use a modular monolith.

Suggested repo:

apps/
  web
  api
  worker

packages/
  ui
  domain
  contracts
  db
  ai
  auth
  config

Frontend:
Next.js + React + TypeScript

Backend:
Fastify + TypeScript

Database:
PostgreSQL

ORM:
Drizzle

Queue:
BullMQ

Redis:
Redis

Object storage:
S3-compatible

Validation:
Zod

Testing:
Vitest + Playwright

Workspace:
pnpm workspaces + Turborepo

Do not introduce microservices.

Business rules belong in domain services.

UI must not directly mutate DB.

AI must not directly mutate DB.

Cross-domain interaction should use domain services and/or domain events.

## SOURCE OF TRUTH

QUEST:
task execution

University:
academic facts such as Assignment, Course, Exam

STATUS:
personal-state records

GROWTH:
skills/evidence/learning meaning

FILES:
original files

ARCHIVE:
NOT source of truth for copied domain data

LIM:
orchestration, not business truth

## 实施与审查

仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。

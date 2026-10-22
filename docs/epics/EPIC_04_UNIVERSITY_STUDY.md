# EPIC 04 · 大学学习域

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

Semester、Course、Enrollment、ClassSession、Assignment、Exam、Grade、CourseMaterialLink 的当前核心；Assignment 与 Core Task 关联。

## 依赖与边界

01、02、03；课程材料引用待 07 联调。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 学业要求与执行计划保存为不同对象；Course Project 引用 Core Project。
- Task 完成不等于提交；Assignment work DONE 时仍可 NOT_SUBMITTED，显式提交才 SUBMITTED。
- Exam 不自动生成一组复习任务；课程材料引用 Core File，必要大学事件正确发出。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [UNIVERSITY_PACK](../UNIVERSITY_PACK.md)
- [DOMAIN_MODEL](../DOMAIN_MODEL.md)

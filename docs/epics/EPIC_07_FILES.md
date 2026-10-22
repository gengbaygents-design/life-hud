# EPIC 07 · 文件基础

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

Core File 与 S3-compatible 原始文件存储基础；课程材料和 Learning Record 通过引用使用。

## 依赖与边界

01、02；先确定类型/大小、解析范围、隐私和删除传播。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 上传、访问、失败行为经过 owner/权限验证；不因有文件而自动供 AI 读取。
- CourseMaterialLink 引用 Core File，不复制原始文件；上传/解析状态有对应事件。
- 在冻结范围内验证导出与真实隐私删除，原文件/索引/引用处理按契约执行。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [CORE_ARCHITECTURE](../CORE_ARCHITECTURE.md)
- [DOMAIN_MODEL](../DOMAIN_MODEL.md)
- [DATABASE_SCHEMA](../DATABASE_SCHEMA.md)

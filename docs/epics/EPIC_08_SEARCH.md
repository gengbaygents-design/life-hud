# EPIC 08 · 搜索基础

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

跨既有领域的 basic 搜索；源域保持权威，只取授权且未删除的数据。

## 依赖与边界

01、相关已完成源域；文件搜索依赖 07。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 普通用户搜索授权与 Lim 上下文 AI policy 分开判断。
- 结果回到源对象；无跨 owner 泄露，删除和权限变更后的结果一致。
- 覆盖空结果/不可访问/检索失败；不引入高级 RAG 或图数据库。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [DOMAIN_MODEL](../DOMAIN_MODEL.md)
- [LIM_SPEC](../LIM_SPEC.md)
- [DATABASE_SCHEMA](../DATABASE_SCHEMA.md)

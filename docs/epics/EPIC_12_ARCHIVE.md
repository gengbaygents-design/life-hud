# EPIC 12 · 时间与记忆视图

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

basic 时间索引、Voyage/时期视角、Captain's Log 原文与分开的 AI 摘要、记忆标记/引用。

## 依赖与边界

01、02、已完成的源域；AI 摘要受 09 隐私契约控制。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- ARCHIVE 不复制源域数据成为第二数据库；“记住这一刻”创建标记/引用。
- 原始 Captain's Log 文本权威，摘要可分辨且不静默覆盖。
- 权限/删除/导出遵循基础契约；敏感旧记录不因技术访问而自动进入 AI 上下文。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [DOMAIN_MODEL](../DOMAIN_MODEL.md)
- [LIM_SPEC](../LIM_SPEC.md)
- [MVP_SPEC](../MVP_SPEC.md)

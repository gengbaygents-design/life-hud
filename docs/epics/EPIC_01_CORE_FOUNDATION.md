# EPIC 01 · Core 基础

状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。

## 目标与范围

认证、服务端身份/owner、当前 Voyage、隐私授权、最小 Core 契约、版本/事务/事件及同步基础。只建已需要的实体。

## 依赖与边界

00；先冻结认证、必要 schema、事务与同步契约。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 验收条件（待实施）

- 未认证和跨 owner 请求被拒绝；客户端 owner_id 不能决定所有权。
- 版本冲突和失败不悄悄覆盖记录；事件与成功写入保持一致。
- AI access policy 与普通数据访问分开；隐私规则在下游开始前生效。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [CORE_ARCHITECTURE](../CORE_ARCHITECTURE.md)
- [DOMAIN_MODEL](../DOMAIN_MODEL.md)
- [DATABASE_SCHEMA](../DATABASE_SCHEMA.md)
- [ACTION_CONTRACT](../ACTION_CONTRACT.md)

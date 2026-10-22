> 工程方案已于 2026-10-15 替换：原框架任务为历史参考，当前采用 [Ship 基础重建](../SHIP_REBASE.md)；2026-10-16 已完成真实服务验收。

# EPIC 00 · 基础设施

状态：**COMPLETED**。用户于 2026-10-14 明确启动，后续授权 Ship 替代与容器安装；本地基础已完成真实验收，未开始业务功能。来源：[epic0.txt](../source/epic0.txt) 与 [重建要求](../../We+are+RESTARTI.txt)。

## 目标与范围

建立 Ship Web、Hono/oRPC API、基础认证与迁移、存储、会话、scheduler 和共享包。采用 [当前技术选择](../SHIP_REBASE.md)；原独立 worker 方案已替代。下文旧实施清单仅作历史参考。

## 依赖与边界

无；用户已明确授权启动 EPIC 00。实施范围见 [EPIC 00 计划](../EPIC_00_PLAN.md)。

只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。

## 本次验收

结果以 [Ship 实际验收](../SHIP_REBASE_ACCEPTANCE.md) 为准；原 [手工工程验收](../EPIC_00_ACCEPTANCE.md) 是历史记录。真实数据库、迁移、认证、隔离、存储、邮件、调度与浏览器流程均已通过。

- 从干净环境按说明启动/检查工程工具链。
- 配置、临时输出和项目依赖缓存均位于 E:\LIFE HUD；秘密不进入 Git。
- infra 验收不包含业务功能；不提前实施后续 EPIC。

## 委派与审查

zcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。

## 必要阅读

- [CORE_ARCHITECTURE](../CORE_ARCHITECTURE.md)

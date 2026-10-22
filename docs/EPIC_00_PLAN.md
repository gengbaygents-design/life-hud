> 历史记录（已替代）：本文记录原手工 EPIC 00 方案和当时检查结果；当前以 [Ship 重建](SHIP_REBASE.md)、[开发说明](SHIP_LOCAL_DEVELOPMENT.md) 及 [验收](SHIP_REBASE_ACCEPTANCE.md) 为准。下列旧命令不再适用于活动工程。

# EPIC 00 实施计划

用户于 2026-10-14 明确启动 EPIC 00，并选择暂不安装 Docker，先完成工程与 Compose 配置。当前 EPIC 00 为 IN_PROGRESS；EPIC 01–13 为 NOT_STARTED。

## 冻结范围

- 模块化单体的 pnpm/Turborepo 工作区：apps/web、apps/api、apps/worker，以及原规格建议的共享包目录。
- Node 24、pnpm 11；Next.js 16 / React 19、Fastify 5、TypeScript 5、Zod 4、BullMQ 5 / Redis、PostgreSQL、S3-compatible。具体依赖版本从官方 registry 核对后精确固定并生成锁文件。
- 当前只实现工程配置、服务启动/关闭、配置验证、基础依赖连通性、liveness/readiness 与 infra smoke 工具；不实现认证、业务实体、物理 schema 或迁移。
- Web 只显示工程就绪状态，提供 Web App Manifest；不实施 EPIC 02 导航和产品设计壳，不建立离线业务同步或推送通知。
- Compose 配置 PostgreSQL、Redis 和 S3-compatible 开发服务，端口仅绑定本机，数据目录绑定项目内 `.local/infra/`；本机 Docker 尚未安装，实际服务联调单独标记待验收。
- Auth、AI 和 Domain 包只预留明确边界，不导入工具侧 Qoder 凭据，不实现业务或模型行为。Drizzle 表和迁移在 EPIC 01 需要时再落地。

## 实际验收

工程部分：精确依赖/锁文件、构建、类型检查、lint、必要测试、Web/API/worker 启动和关闭；依赖缺失时 readiness 返回 503，liveness 仍准确，响应与日志不包含连接密码。

服务部分：Docker 可用后验证 PostgreSQL 查询、Redis 队列实际处理及 S3-compatible 文件往返；这些未运行前不宣称完整 EPIC 00 验收通过。

## 分工

Codex 冻结契约、依赖和运行方案，实施配置/依赖边界与服务生命周期，审查所有草稿并验收。先验证 zcode 版本；前次模型资源阻塞保持记录，按用户授权使用 Qoder 生成范围固定的 UI 样板。Qoder 不决定架构、认证、数据库 schema 或最终验收。

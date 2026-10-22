# Ship 基础重建

Product architecture is authoritative. Ship is the implementation substrate.

2026-10-15，用户明确采用 [重建要求](../We+are+RESTARTI.txt)。本次仅重建本地工程基础，授权基础认证、迁移、存储、AI 对话底座和导航外壳；不启动 LIFE HUD 业务功能。2026-10-16 已完成真实验收，EPIC 00 为 COMPLETED，EPIC 01–13 均 NOT_STARTED；按附件要求在此停止。

## 来源与保留

上游：[paralect/ship](https://github.com/paralect/ship/tree/3374e79a5deebbd017ab734a4968e8be224dc239)，固定提交 `3374e79a5deebbd017ab734a4968e8be224dc239`。MIT 版权和许可保存在 [LICENSE.ship](../LICENSE.ship)。未导入上游 Git 历史或发布设施。

原工程提交 `0c7a8ca`，备份分支 `codex/backup-before-ship`；当前工作分支 `codex/ship-foundation`。原产品文档保留，原始规格保持原字节。聊天备份仅保留于本机，不纳入代码提交。旧活动工程另保存在 Git 忽略的项目退休目录中。

## 当前技术栈

| 部分 | 当前选择 |
| --- | --- |
| Web | TanStack Start / Router / Query、React、shadcn/ui、Tailwind |
| API | Hono、oRPC、Zod、Ship 纵向 resource 约定和客户端生成 |
| 数据库 | PostgreSQL、Drizzle，基础账户和对话迁移 |
| 身份 | Better Auth，本地邮箱/密码；不配置 Google OAuth |
| 文件 | Ship cloud-storage，Garage 私有 S3 桶和服务端用户 key 命名空间 |
| 邮件 | Ship React Email 模板，本地 Mailpit HTTP 投递与预览 |
| AI | Ship ai-chat 会话/消息基础与 AI SDK；缺少凭据时明确失败 |
| 调度 | Ship scheduler；无独立 worker 应用，未启用 socket，当前不需要 Redis |
| 工作区 | pnpm、Turborepo、TypeScript；Windows Node 启动脚本 |

原 Next.js / Fastify / BullMQ worker / 手工 REST 方案已被替代，不再属于活动工作区。未选用 notes/admin 插件。上游 Unix 创建器无法直接满足 Windows 和项目内状态隔离要求，按其模板及五个插件的合并规则建立干净工程，记录来源并逐项审查。

上游默认实现并非直接验收结果。本次修正存储 key 所有权缺口、开发邮箱验证捷径、OAuth/遥测默认值、缺少 AI 配置的失败行为、Windows 命令及依赖兼容/安全问题。Drizzle 采用修复漏洞的 `1.0.0-rc.4`，仍是预发布版本；数据库正向测试不可省略。

运行见 [本地开发](SHIP_LOCAL_DEVELOPMENT.md)，领域映射见 [架构映射](SHIP_RESOURCE_MAPPING.md)，实际结果见 [重建验收](SHIP_REBASE_ACCEPTANCE.md)。

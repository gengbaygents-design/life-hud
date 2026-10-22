# WorkBuddy · PHASE 9A 只读能力核查交接

WorkBuddy 已完成 CloudBase 连接，负责人已通过桌面会话发送只读查询。下文保留为可复用核查契约；实际结果与未解决项见 [PHASE 9A](PHASE_9A_PUBLIC_DAILY_DRIVER.md)。它不是发布脚本，不含凭据，不授权绕过权限、改写领域或执行迁移。

```text
请使用当前 WorkBuddy 实际可用的部署/CloudBase 连接器，先做只读能力核查，不创建付费资源、不部署、不改文件或数据库。

目标是部署现有 LIFE HUD，不是重新生成另一套应用。它使用 Ship：TanStack Start/Vite Web、Hono/oRPC API、Better Auth、Drizzle/PostgreSQL、私有 S3 兼容文件、独立 Node scheduler。保留原有领域、owner 隔离和 Lim 隐私边界。

请仅报告已实际调用并确认的能力及工具名：
1. 当前授权可用的环境/区域及权限。不要输出任何 Token、密码或 secret 值。
2. 是否能部署现有任意 Node.js 容器/API，配置构建命令、启动命令、环境 secrets 和健康检查。
3. 是否有持久 PostgreSQL，能否让现有 Drizzle 服务通过标准 PostgreSQL 协议连接，是否支持事务/行锁/迁移/备份。
4. 是否能使用私有持久文件存储，并维持现有 S3 或授权下载接口。
5. 是否能运行单独的 Node scheduler，或提供无需 Windows 开机的持久受控定时任务；是否会休眠、自动扩容、产生多实例。
6. 是否提供稳定 HTTPS、前后端路由，以及保持 Better Auth Cookie/CSRF 的配置。
7. 费用/配额和任何必须用户点选的授权步骤。未实际验证的内容明确写“未验证”。

内置 cloudstudio-deploy 技能仅静态前端，单独使用不满足本任务。禁止公网前端指向 localhost、127.0.0.1 或家中电脑。不要用平台认证替换 Better Auth，不把 PostgreSQL 换成其他数据库。

不要读取项目 .env、.local、工具状态、浏览器 Cookie 或个人数据，不索取在聊天里粘贴密钥。只做能力核查；在 Codex 确认生产安全修复、拓扑、迁移和验证计划之前不要发布。
```

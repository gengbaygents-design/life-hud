# Windows 本地开发

所有命令在 `E:\LIFE HUD` 执行。当前本机 Docker Linux 引擎和三个基础容器已实际运行，位置与用户授权的 Docker 自身目录例外见 [容器记录](CONTAINER_SETUP.md)。Node 24 与项目包装的 pnpm 为现有运行工具。

## 日常使用：双击启动

在项目根目录双击 [Start LIFE HUD.cmd](../Start%20LIFE%20HUD.cmd)。它会在隐藏后台启动本地服务，等待 API 与 Web 就绪后打开 `http://127.0.0.1:3002/`；启动窗口自动退出后，后台服务继续运行。重复双击会检查并复用已有服务，同时启动通过项目内文件锁防止重复创建进程。遇到部分启动或端口占用时等待就绪或明确报错，不强杀未知进程、不隐藏服务失败。启动日志位于 `.local/logs/local-*.out.log` 和对应 `.err.log`。

用户于 2026-10-21 选择手动双击，未设置 Windows 自动启动。电脑重启后需再次双击入口。只有 Web/API 已在运行时，单独刷新浏览器才能访问本地站点。`ERR_CONNECTION_REFUSED` 表示没有连上本地服务，不能据此判断账户或会话过期。原来的命令行启动仍可用于开发，关闭该前台终端会停止其应用进程。

## 命令行开发

```powershell
node scripts/run-pnpm.cjs install --frozen-lockfile
node scripts/local.cjs start
```

本机依赖已安装时，只需第二条。`start` 初始化配置，必要时启动项目安装的 Docker Desktop 并等待 Linux 引擎，启动 PostgreSQL / Garage / Mailpit，幂等准备私有桶、迁移和空 seed，然后启动 API、Web 与 Ship scheduler。Web 和 API readiness 均就绪后向 Windows 默认浏览器发出打开请求。地址为 <http://127.0.0.1:3002>，可创建自己的本地账户。

| 服务 | 地址 |
| --- | --- |
| Web / API | `127.0.0.1:3002` / `127.0.0.1:3001` |
| PostgreSQL | `127.0.0.1:5433` |
| Garage S3 / 管理 | `127.0.0.1:3900` / `127.0.0.1:3903` |
| 本地邮件预览 | `127.0.0.1:8025` |

Ctrl+C 关闭本次启动的应用进程，容器与数据保留；停止容器用 `node scripts/local.cjs infra-down`，不删除数据目录。单独准备服务用 `node scripts/local.cjs setup`；只生成配置用 `node scripts/local.cjs init`。`apps` 仅用于故障检查，跳过基础服务，不能代表完整运行验收。

根 `.env` 为配置源，首次生成随机本地密码/密钥，已有根文件不会覆盖。派生 API 配置与仅含公开 URL 的 `apps/web/.env`、`.env.development.local`、`.env.production.local`；后两者避免上游模式配置把地址改成 localhost。启动进程也显式传递公开 Vite URL。使用打印的 127.0.0.1 地址，不混用 localhost；修改根配置后重启。不要提交或粘贴凭据、派生配置或 `.local/`。

本地邮箱/密码允许直接注册登录，不强制邮箱验证，不证明邮箱归属。密码重置邮件只进入 Mailpit，重置撤销旧会话。没有开发验证绕过接口、Google OAuth 或演示用户。文件页面只提供本次上传/下载/确认删除基础，没有完整 File 管理或解析；原文件保留在私有 S3。

AI 配置仍保存在根 `.env`，仅写入 API 环境；[Phase 5 Lim](PHASE_5_LIM_CORE.md) 支持 Google 或 OpenAI 适配器的环境选择，身份与模型独立。未配置时应用正常运行，模型对话不可用；[Phase 6](PHASE_6_HOME_ATTENTION.md) 的本地“我现在干嘛？”仍可使用。提供方故障保留消息，不编造执行成功。Lim 只通过严格注册表调用领域方法，没有任意数据库工具。

```powershell
node scripts/run-pnpm.cjs build
node scripts/run-pnpm.cjs typecheck
node scripts/run-pnpm.cjs lint
node scripts/run-pnpm.cjs test
node scripts/run-pnpm.cjs test:e2e
node scripts/local.cjs verify
```

首次单独构建前先运行 `init`。`test:e2e` 在独立 3201/3202 启动故障注入 API 和生产 preview，重新构建至 `apps/web/dist/e2e`；无需关闭普通应用，禁止把不可达测试数据库配置用于日常 3001/3002。`verify` 需要真实 API 与服务运行，验证身份/双用户隔离/错误 Origin/私有 S3/重置邮件/会话撤销，清理自己的合成数据，遵守限流，不调用付费 AI。最终证据见 [验收记录](SHIP_REBASE_ACCEPTANCE.md)。

工作已保存在本地 Git 分支 `codex/ship-foundation`；源码提交不包含本地密码、数据库、对象或工具认证状态。保留整个项目目录可以保留本机数据；Git 提交本身不是数据库或凭据备份。后续业务阶段需用户另行指令。

后续已授权的 [Phase 3 University/STUDY](PHASE_3_UNIVERSITY_STUDY.md) 也已完成；当前分支为 `codex/university-study`，启动方式相同。真实大学验收用 `node scripts/run-pnpm.cjs test:university`；完整真实浏览器流程用 `test:university:e2e`，需要以仅 development 生效的 `DEV_NOW=2026-10-16T02:00:00Z` 启动服务以固定课中时刻，结束后重启恢复实时钟。普通启动不设置此变量，生产会忽略它。`seed:university --email 已有本地账户 --date 2026-10-16` 是可选的明确样例导入，不会向新用户自动添加课程。下一阶段不自动开始。

此前 [Phase 4 STATUS/GROWTH](PHASE_4_STATUS_GROWTH.md) 已完成。`test:personal` 验证真实双用户状态/成长领域，固定时钟要求为仅 development 的 `DEV_NOW=2026-10-16T06:30:00Z`；`test:personal:e2e` 验证真实浏览器流程。`seed:personal --email 已有本地账户 --date 2026-10-16` 为可选明确导入，默认不导入周期；隐私测试样例需要显式 `--include-private-cycle`。

此前 Phase 5 分支 `codex/lim-core`。`test:lim` 使用专用合成账户和真实数据库验证 LIM-001–023 与安全边界；`test:lim:e2e` 跑真实 Edge Golden Journey。确定性浏览器验收要求启动进程设置 `LIM_PROVIDER=mock`、`DEV_NOW=2026-10-16T06:30:00Z`，界面显示开发验收模式。提供方故障用 `LIM_PROVIDER=mock-failure` 启动后运行 `node scripts/run-pnpm.cjs test:lim:e2e --outage`；这些开关仅 development 生效，不写根环境文件。验收后关闭该启动进程，在新终端以普通 `node scripts/local.cjs start` 恢复实时钟和真实提供方配置。未配置凭据时不声称云模型已验收。

此前 Phase 6 分支 `codex/home-attention`。`test:home` 验证真实数据库、只读聚合、所有权、隐私、共享 Lim 和 HOME-001–017；`test:home:e2e` 自行启动 3011/3012 的真实 API/Web，以进程环境切换开发时钟，验证完整 Golden Attention Journey，不占用普通 3001/3002 应用。`seed:home --email 已有本地账户 --date 2026-10-16` 显式导入标准日课程、任务和状态；重复运行不覆盖用户修改或完成状态。正常启动无需设置 DEV_NOW 或模型 mock，未配置模型时 HOME 与 Lim 本地建议照常工作。完成 PHASE 6 后停止，下一阶段需用户指令。

此前 Phase 7 分支 `codex/reminder-archive`，详见 [Phase 7](PHASE_7_REMINDER_ARCHIVE.md)。`test:reminder-archive` 验证真实数据库和 HTTP 的 REM-001–011 / ARCH-001–011；需要普通 API/服务运行，内部受控时间扫描严格限定合成 owner。`test:reminder-archive:e2e` 自行启动 3111/3112 真实 API/Web 和 Ship scheduler 子进程，以仅 development 生效的 DEV_NOW 和 DEV_REMINDER_OWNER 隔离测试时钟与合成账户范围。跑此完整流程前先关闭普通应用，结束后以普通 `node scripts/local.cjs start` 恢复；不通过 HTTP 调时。浏览器中的自然语言模型为明确标识的开发替身，重启、存储、领域、调度与投递均是真实实现。

`seed:archive --email 已有本地账户 --date 2026-10-17` 显式创建日志、学习线索、Project #001 引用和时刻样例，稳定 ID 不覆盖用户编辑或删除；不会自动导入。提醒只支持一次性本地通知，配置的安静时段随规则持久化；通知页在 MORE → REMINDERS，历史和日志在 MORE → ARCHIVE。没有系统推送、云模型成功声明、自动记忆或 AI 日志摘要。本阶段结束后停止，Visual Polish 等待新指令。

当前分支 `codex/visual-polish`，详见 [Phase 8](PHASE_8_VISUAL_POLISH.md)，本地视觉检查已执行，用户尚未验收整个阶段。启动方式和业务配置不变。普通应用及 Ship scheduler 运行时，用 `node --env-file=.env scripts/run-pnpm.cjs test:visual` 在独立 3011/3012 端口执行真实合成账户的五时间状态和六宽度验收；59 张截图与检查结果只在项目内 `.local/validation/phase8-*`。视觉 Phase 不新增业务数据表或迁移。当前仅修复运行故障，完成后停止。

PHASE 8 用户尚未验收。运行时诊断与归因限制见 [修复记录](PHASE_8_RUNTIME_FIX.md)。重复 init/verify 不再重写相同派生配置。`node --env-file=.env scripts/run-pnpm.cjs test:runtime:e2e --headed` 用真实 Edge 与普通端口执行登录、各路由、API中断/恢复及全栈重启；需先停普通应用，结束后重新普通启动。不得把网络故障误判为未登录。

# PHASE 8 · 运行时故障诊断与修复

用户明确拒绝上一轮 PHASE 8 验收。本轮只排查运行时 500、修复可证实的启动缺陷并补足错误处理；保留 `5013a65` 的视觉工作，不新增领域、schema、迁移或依赖。**PHASE 8 仍未获得用户验收。**

## 已知事实与归因边界

2026-10-20 续查确认第二个独立故障：旧 `playwright.config.ts` 在日常端口 3001/3002 启动故障注入服务器，测试 API 的 `DATABASE_URL` 故意指向 `127.0.0.1:1/unavailable`。此前测试日志实际捕获了非合成用户的登录请求：`POST :3001/api/auth/sign-in/email` → Better Auth `findUserByEmail` → Drizzle 查询 `users.email` → `ECONNREFUSED 127.0.0.1:1`。用户在测试期间能连到这个后端，真实登录因此返回服务错误；这不是生产数据库 schema 或账户数据损坏。私有日志含个人信息，不提交或复制到公开报告。

已将故障注入 API/Web 移到 3201/3202，构建输出独立为 `apps/web/dist/e2e`、缓存位于 `.local/e2e-vite-cache`，显式编译相应的 VITE API/Web URL。普通 3001/3002 的 API、Web、scheduler 和真实 PostgreSQL 保持在线。独立 11 项生产测试与可见 Edge 的真实登录/模块导航并行通过。恢复后用户明确回复“已正常显示 LIFE HUD”。这是当前站点恢复的确认，不等于 PHASE 8 整体验收。

用户报告普通根页出现 `{"status":500,"unhandled":true,"message":"HTTPError"}`。原 live 日志在 18:45:20–22 记录 Web `.env` / `.env.development.local` 重写、Vite 连续重启，以及 TanStack 服务端入口加载时 `transport was disconnected, cannot call "fetchModule"` 的堆栈。框架 `@tanstack/start-server-core` 的 `createErrorResponse` 确实会把未处理错误编码为 HTTPError JSON。

本轮首次可见 Edge 检查 `GET :3002/`、`/app`、`/sign-in` 已返回 200；未登录 `/app` 正确转登录。干净启动后，重复调用旧 `local init` 可重复触发环境文件变化、Vite 重启、SSR transport 断连和浏览器连接失败。高频 document 取样与构建并行取样未再次捕获相同 JSON 500：温启动记录 1165 个 200 / 35 次连接失败，生产构建并行 150 个 200，冷启动交叉配置重写也出现连接失败后恢复 200。

因此，**已证实两个具体缺陷：重复初始化打断 Vite 服务端传输，以及测试服务器占用日常端口使真实登录命中不可用测试数据库。**后者有精确 endpoint、查询和连接错误证据。最初那一次根页 document 的 JSON 500 没有对应的完整请求追踪，不能把上述任一个缺陷说成它的唯一历史原因。没有证据指向数据库 schema、用户实体或视觉 token；没有删除用户数据或修改这些边界。

## 修改

- `scripts/write-if-changed.cjs`：派生配置按字节相同时不写，保留 mtime；真实变化才写，非 ENOENT 的权限/读错误向上传播。`scripts/local.cjs` 的 API/Web/Garage 派生配置统一使用它。自动打开浏览器现在同时等待 Web 和 API readiness，避免 API 尚未就绪时就打开入口。
- `apps/web/src/components/route-load-error.tsx`、根路由和认证路由：显示“暂时没能载入这里。”与重试；重试重新运行 loader，仍失败时保留错误。只有确实 401 才按未登录处理，500/503、超时和网络中断不再伪装成登录失效或正常公共空态。技术错误仅写开发日志。样式复用既有壳层，Qoder 草稿的错误 token 和重试语义已由负责人纠正。
- `apps/web/src/server.ts` / `lib/document-error-response.ts`：框架返回 JSON 的失败 HTML document 使用安全错误页；保留原 500/503、Retry-After 等响应头并加 no-store。API/server-function JSON、401/403、成功响应和非 GET 不受影响。没有捕获后返回 200，没有绕过授权或禁用功能。
- HOME 的 Today/Status 在无已知数据且读取失败时明确显示“暂时无法读取”，不使用“没有安排/尚未记录”代替故障。实际已有缓存仍遵循既有保留上次内容逻辑。
- `playwright.config.ts`、`scripts/e2e-web.cjs`、`apps/web/vite.config.ts`：隔离故障注入端口、VITE 编译地址、构建与缓存；测试不再替换日常服务。测试 server 使用 strictPort，不复用未知服务。
- `apps/web/e2e/mock-core.ts` 的 `**/study` 等宽泛 fixture 收紧到测试 API 3201，其他 fixture 和请求断言同步测试端口。新增直达测试发现旧规则会把 `/app/study` document 本身拦成 JSON 200，无法证明真实路由渲染正常。
- 新增配置 watcher/权限传播、document 错误呈现、路由 500/503 恢复及真实全栈生命周期回归。`test:runtime:e2e` 使用普通 3001/3002，需先停止已有应用，只停止自己创建的子进程，合成账户在 finally 清理。

## 为什么上一轮没有发现

生产 preview 测试不经过 Vite dev 环境文件 watcher；多数 Golden 流程使用独立端口/短生命周期，最终普通应用只做了瞬时 readiness/sign-in HTTP 检查。没有覆盖对运行中普通应用重复执行 `init` / `verify` 后的 document 与浏览器生命周期，也缺少 session/bootstrap 500 的错误边界测试。旧的宽泛 API fixture 还可能绕开直接 document 加载。故障注入测试预期 readiness 503、前端请求多数被 mock，因此测试自身通过也无法保证同端口的真实用户能登录。原日志出现 transport 错误时，没有继续把它作为阻塞项逐条追踪，这是上一轮验收的不足。

## 实际验证

- 90 项单元测试（13 文件）通过，含相同配置保留 mtime、真实变更写入、EACCES 不覆盖；document 的 500/503 保留状态/Retry-After、隐藏技术正文、401/403/成功/API/非 GET 不改写。
- typecheck 13/13、lint、生产构建 8/8（根页预渲染）通过。
- 生产浏览器 11 项通过，新增根 session 503 持续失败/重试恢复、认证 bootstrap 500 不转登录、不显示 HTTPError，以及直达 STUDY/刷新。
- 真实可见 Edge、真实 API/PostgreSQL、普通端口 3001/3002：未登录入口/保护路由、真实登录、HOME/QUEST/STUDY/STATUS/GROWTH/ARCHIVE/REMINDERS/MORE 直达和刷新、Lim 本地建议、退出/再登录、连续三次 init 后 mtime/文档不变全部通过。
- 实际停止 API 后重载显示持续错误且不转登录，API 恢复后重试/重载成功；API/Web/scheduler 整体重启后真实会话和全部路由仍可使用。没有 mock 领域响应，没有减弱断言。
- 在自动化流程之外，负责人另开持续可见 Edge，用独立合成账户逐步导航各模块、打开/关闭 Lim、退出/再登录、刷新，查看实际截图、网络状态和脚本错误。所查正常页面无 HTTP 500、无原始 JSON、无脚本异常；视觉保持。截图/技术日志仅在 `.local/phase8-runtime/`，不提交。
- 续查最终状态：lint、90 单元测试、typecheck 13/13、生产构建 8/8 再次通过；隔离后的生产浏览器 11/11 通过。可见 Edge 再次真实登录，查看全部模块、STUDY 直达/刷新、Lim、退出/登录、HOME 刷新；正常请求无 500，用户也确认正常。首次把测试构建放在仓库根 `.local` 时，外部依赖解析找不到 Web 的 React，构建正确失败；改为 Web 自身独立的 `dist/e2e` 后构建与测试通过，未添加依赖或更改产品功能。
- 既有 Core、University、STATUS/GROWTH、Lim、HOME、Reminder/Archive 的真实领域回归及基础认证/Origin/私有存储/重置邮件/会话撤销验收通过。Reminder 第一次在注册阶段遇到既有限流，未绕过限制，单独重跑通过。新生命周期脚本第一次错误地将未设置 DEV_NOW 写成空字符串，被时钟校验拒绝；改为真正删除测试环境变量后通过，未改变产品时钟验证。

zcode 0.16.9 实际探测返回 provider 1113 / HTTP 429，Qoder 1.1.64 实际探测成功并提供低风险错误界面草稿。负责人亲自审查故障证据、所有修复、错误传播、权限边界及最终真实浏览器。

## 当前状态

上述可证实缺陷已修复；当前普通应用、真实浏览器、用户当前刷新和重启流程均已恢复。最初根页 JSON 500 的同一次请求没有重新捕获，历史唯一原因仍有限制；没有把边界页面当成根因修复或用测试替代用户反馈。完成安全提交后停止，不自行接受 PHASE 8，不启动其他阶段。

## 本次修改文件清单

| 用途 | 文件 |
| --- | --- |
| 幂等配置、启动 readiness | `scripts/local.cjs`、`scripts/write-if-changed.cjs` |
| 路由错误与认证失败传播 | `apps/web/src/components/route-load-error.tsx`、`apps/web/src/routes/__root.tsx`、`apps/web/src/routes/_authenticated.tsx`、`apps/web/src/routes/index.tsx` |
| document 失败状态与呈现 | `apps/web/src/server.ts`、`apps/web/src/lib/document-error-response.ts` |
| HOME 区分失败与空态 | `apps/web/src/components/home/cards.tsx`、`apps/web/src/components/shell/home-view.tsx` |
| 测试服务器与构建隔离 | `playwright.config.ts`、`scripts/e2e-web.cjs`、`apps/web/vite.config.ts` |
| 测试 fixture 与网络断言 | `apps/web/e2e/mock-core.ts`、`apps/web/e2e/foundation.spec.ts`、`apps/web/e2e/shell.spec.ts`、`apps/web/e2e/visual-polish.spec.ts` |
| 新增运行时回归 | `apps/api/scripts/verify-runtime-browser.ts`、`apps/web/e2e/runtime-error.spec.ts`、`apps/web/tests/document-error-response.test.ts`、`scripts/write-if-changed.test.ts` |
| 检查入口 | `package.json`、`apps/api/package.json`、`vitest.config.ts` |
| 范围、运行说明、证据与验收状态 | `AGENTS.md`、`CODEX_START_HERE.md`、`README.md`、`docs/DOCUMENT_INDEX.md`、`docs/PHASE_8_VISUAL_POLISH.md`、`docs/PROJECT_STATUS.json`、`docs/SHIP_LOCAL_DEVELOPMENT.md`、`docs/PHASE_8_RUNTIME_FIX.md` |

共 32 文件。未改视觉 CSS/token、领域实现、schema 或迁移；环境文件、账户、运行日志与截图不提交。最终检查确认 39 张 public 表、7 次迁移保持，合成验收账户为 0；Web 构建 168 个文本产物未匹配项目秘密；12 份原产品文档及原文哈希保持。文档检查 405 项、干净副本回归 24 项通过。

## 2026-10-21：本地进程停止后的连接被拒绝

用户截图是 `/sign-in` 的 `ERR_CONNECTION_REFUSED`。只读检查确认 3001/3002 均无监听、没有项目 Node 应用进程；旧运行日志的 scheduler 结束于 1073807364（Windows 终端中断状态）。证据支持应用已停止，不是本次收到了 HTTP 500，也不能据此判断账户过期；不能仅凭此退出码确定是谁关闭了终端。旧入口为前台开发进程，没有跨终端退出或 Windows 重启的常驻保障。

按用户明确选择新增项目根 `Start LIFE HUD.cmd` 与 `scripts/start-local-background.ps1`。以独立隐藏进程启动原有完整本地栈，日志/临时目录/并发锁都留在项目内，等待 API readiness 与 Web 登录页正常后打开浏览器；已有服务复用，部分失败明确报错且不终止未知进程。`scripts/local.cjs` 增加 `--no-open` 参数，避免被包装入口重复打开页面。没有设置 Windows 自动启动或改变账户、数据库、视觉、领域逻辑。

zcode 版本 0.16.9 已复核，沿用已记录的余额不足 HTTP 429 / 1113 阻塞，不反复请求。Qoder 1.1.64 实际 probe 成功并起草固定事实下的启动说明；负责人审查，收窄“重复启动不会造成冲突”的绝对措辞，明确部分启动/端口冲突仍可失败。Codex 负责进程生命周期、启动代码与真实浏览器验收。ego-browser 入口不可用，未为本次诊断额外安装浏览器，使用现有可见 Edge。

本轮实际验证：一键入口完整冷启动通过；入口进程退出后 Web/API 继续监听；同时执行两个入口，文件锁生效且服务 PID 保持不变；真实 Edge 的 HOME、STUDY 直达/刷新、Lim、退出/再登录和 HOME 刷新正常，无脚本错误或 500。API readiness 与 `/sign-in` 均 200。PowerShell 语法解析、Node 脚本语法和 90 项既有单元测试通过。既有领域与视觉代码未变，本轮没有把上一轮完整领域/构建测试说成本轮重跑。

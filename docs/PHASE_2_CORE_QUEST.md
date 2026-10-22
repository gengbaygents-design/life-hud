# PHASE 2 · LIFE HUD Core + QUEST

状态：COMPLETED（2026-10-16）。来源：[用户阶段要求](source/phase2-core-quest.txt)。在已验收的 [Phase 1 Shell](PHASE_1_SHELL.md) 上接入真实领域数据，不重新设计视觉。按要求停止，不开始 University/STUDY、STATUS、Lim 行动、提醒、记忆或公共部署。

## 领域与持久化

新增七张表及对应 Ship resource：`voyages`、`projects`、`goals`、`tasks`、`entity_links`、`audit_logs`、`outbox_events`。迁移为 `apps/api/drizzle/20261016074029_core_quest/migration.sql`，仅新增表/约束/索引；迁移前数据库备份保留在项目内 Git 忽略的私有备份目录，没有恢复出厂或重置数据。原六张基础表保留。

schema 定义持久化；contract 定义传输输入/输出；methods 及 Core 公共方法承担领域规则；endpoints 只鉴权、校验和调用 methods；middlewares 把他人/不存在/软删记录统一为 NOT_FOUND。React 只负责交互和 API 绑定。

owner 只来自服务端认证身份。Task 创建时的 owner/id/status/version 由服务端决定，客户端同名保留字段不会成为权威。重要实体采用版本检查，Task 在事务中锁定自己所属行，再用 owner/id/version 条件更新；版本过期返回 CONFLICT。Project、Goal、Voyage 复用同一模式。Project→Voyage、Task→Project 另有数据库复合外键，不能跨 owner。EntityLink 只支持已实现的 Core 类型，写入时验证两端均归当前用户且未软删；不添加未来领域表或图数据库。

用户首次进入受保护空间时以显式 POST 幂等确保 ACTIVE 的 University Voyage；创建 Task 的领域方法也执行相同保证，避免绕过 UI 的正常 API 调用缺少默认航程。唯一索引约束同 owner 只有一个未删除的 ACTIVE University Voyage。默认 startAt 是空间初始化时间，不推断真实入学日期。Voyage 父级必须同 owner，层级不能形成循环。

## Task 与 QUEST 规则

`INBOX → PLANNED / ACTIVE → COMPLETED`，另支持 DROPPED；COMPLETED/DROPPED 可显式重新打开。没有 FAILED。只有标题是必填项；无计划/截止可合法进入 INBOX。start、complete、delay、drop、reopen、remove 均为独立方法和端点，普通 update 不接受任意状态覆盖。

`plannedStart/plannedEnd` 与 `dueAt` 完全独立。delay 只改计划，保留原计划时长（若有），记录 TaskDelayed 后回到 PLANNED；不暗改截止。普通编辑计划也不改省略的 dueAt。结束不能早于开始，但允许用户明确安排在截止之后，不替其修改截止。complete 设置 COMPLETED/completedAt；延期、开始、完成不会标记任何 Assignment 已提交。本阶段不创建 Assignment。

NOW v0 在服务端使用稳定、可解释的顺序：进行中 → 已到截止 → 24 小时内截止 → 已到计划时间 → 用户标为重要的未安排任务；同层再看 importance、可用时长匹配及时间/创建/id。最多返回三个候选，不返回优先分。未来计划但未紧急的任务、普通未安排 Inbox 不被塞进 NOW。TODAY 按 IANA 时区下的计划日/跨日计划、截止日及 ACTIVE 状态展示，避免把全部 Inbox 或历史塞入今天。

“换一个”仅轮换已经读取的候选，不调用写接口。空集合允许安静留白。所有已登录 HOME NEXT / 今日安排 / Voyage / Project 与 QUEST 的任务均由真实 API 读取；错误有明确提示，不用静态任务回退。STUDY 仍保持上阶段明确标注的展示外壳，未接入大学领域。

放下和删除需显式确认；任务及重要记录软删，普通查询排除。Task 的 projectId 是所属项目权威字段，同事务维护 TASK→PROJECT 的 BELONGS_TO 关联；不能通过独立 EntityLink 操作绕过任务版本检查而改变所属项目。移除 Core 记录时，其语义关联也软删。完整隐私硬删系统不在本阶段。

## Audit 与 Outbox

重要写入与 AuditLog/Outbox 同一个 PostgreSQL 事务提交。Audit 记录 actor、动作、实体、时间、版本及必要前后元数据，不复制整段标题/说明。TaskCreated / TaskCompleted / TaskDelayed 等事件含 taskId/version/status 和 auditId。

Outbox 是持久化事件，不依赖提交前的内存事件通知。Ship scheduler 注册本地分发入口；采用行锁/SKIP LOCKED、失败退避和有界批次。处理器只可用所传事务执行本地数据库反应，成功标记与反应同事务；失败回滚处理器写入，保留待重试状态和固定安全错误码。当前没有获授权的业务消费者，未注册类型保持待分发，不假称已交付；没有 Kafka、BullMQ、新 worker 或外部行动。

## 开发样例与运行

新用户不会自动获得假任务。明确选择已有本地账户后，可导入真实持久化的开发示例；仅 development 可用。固定 owner 范围的确定性 ID，使重复执行不覆盖已有或已编辑记录。示例包括 University Voyage、LIFE HUD · Project #001、高数第三章作业、架构整理、英语阅读、拿快递及一条已完成记录，说明均标记为开发示例。

```powershell
node scripts/run-pnpm.cjs seed:core --email your-existing-local-email
```

真实 API/数据库与浏览器验收需先保持 `node scripts/local.cjs start` 运行，然后执行：

```powershell
node scripts/run-pnpm.cjs test:core
node scripts/run-pnpm.cjs test:core:e2e
```

两者仅创建/清理自己的随机 `.invalid` 合成账户与数据，不修改其他账户。单元和故障外壳浏览器测试继续使用原命令；`test:e2e` 占用 3001/3002，先停止已有应用。视觉替身与真实持久化验收分开，不把 mock 算作权限/数据库通过。

## 最终验收与委派

| 验收项 | 实际结果 |
| --- | --- |
| Core/QUEST API 与数据库 | 27 项真实检查通过，含 CORE-001/002、QUEST-001–011：所有权、计划/截止、版本冲突、完成、软删、推荐/空状态、审计与事件 |
| 并发与事务 | 同版本并发修改仅一项成功；Task/Audit/Outbox 同时回滚；Outbox 处理器失败不留下反应写入，退避后成功；并发领取只处理一次 |
| 其他 Core 资源 | Voyage/Project/Goal 自己的 CRUD、跨用户读取/修改/删除、父级循环拒绝、关联两端授权、数据库复合外键及软删关联通过 |
| 开发示例 | 对明确选择的合成账户真实持久化五条任务及 Project #001；重复运行新增 0，不覆盖原记录 |
| 真实 Edge 旅程 | QUEST-012 通过：创建“高数第三章作业”20:00 / 23:59 / 35m；HOME 读取真实 NEXT；延期 21:00 保留 23:59；编辑、完成、历史、刷新、第二用户隔离通过 |
| 界面冲突与换候选 | 并发修改后界面保存得到 409，保留用户草稿且未覆盖新记录；“换一个”产生 0 次 Task 写请求，任务前后完全相同 |
| 工程检查 | lint 零警告；13/13 类型任务；8/8 构建；3 文件 16 项单元测试通过 |
| 原基础与 Shell 回归 | 7 项生产浏览器用例通过，保留移动/桌面导航、Lim 路由/焦点/全屏/断点、基础登录与 AI 缺配置故障行为 |
| 视觉 | 390×844 和 1440×1000 的真实数据 HOME/QUEST 已复核，未发现水平溢出；沿用已验收的布局、导航和令牌 |
| 清理与范围 | 最后只读确认本次合成账户剩余 0，Core 表 7 张、迁移记录 2 条、受禁止的未来领域表 0 张；Web/API 均 HTTP 200 |
| 秘密与原文 | 68 个 Web 文本产物无生成秘密；12 份原产品文档及原始规格哈希保留；公开快照秘密扫描通过 |

上述真实服务测试和视觉外壳替身测试分开执行。连续验收的认证请求遵守 Retry-After 作有界等待，未关闭限流。当前没有未解决的阻塞项；未注册业务消费者的事件按设计保持待分发，不宣称未来反应已实现。

[真实数据桌面 HOME](assets/phase2-home-desktop.png) · [真实数据移动 HOME](assets/phase2-home-mobile.png) · [真实数据桌面 QUEST](assets/phase2-quest-desktop.png)。截图来自本次实际 API 创建的合成账户；验收后已清理，不是正常界面的静态任务 fixture。

zcode 0.16.9 版本成功，实际探测仍为 HTTP 429 / 1113。Qoder 1.1.64 探测成功，完成 35 个重复端点的生成器、TaskEditor、TaskCard 及规则测试草稿；两份较大草稿各超时 180 秒后缩小，未计成功。负责人纠正端点默认导入/导出及换行、卡片字段名、测试中的不成立候选假设和输入类型，负责全部 schema、领域语义、权限、事务、版本、调度、审计/事件与最终复核。

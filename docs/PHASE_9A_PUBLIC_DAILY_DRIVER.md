# PHASE 9A · WorkBuddy 公网 Daily Driver

状态：**IN_PROGRESS / CLOUD_DATABASE_BUDGET_BLOCKER，CloudBase 已连接；未部署、未验收**。

授权来源为用户 [原始要求](source/phase9a-public-daily-driver.txt)。用户明确认可 Phase 8 运行时验证并授权本阶段，仅部署现有功能，不进入 Reading、Mind Map、Memory、Bridge、Night Voyage、SOCIAL 或 WALLET。

## 已保护的基线

- 开始时工作区干净；本地可用版本为 `a4d2952`。
- 备份分支 `codex/phase8-stable-a4d2952` 指向该版本；本阶段分支 `codex/public-daily-driver`。
- 未覆盖根或派生环境文件，未改本地数据库、存储、认证或服务实现。当前本地 API readiness 与 Web 登录页均实际返回 200。
- 不上传本地数据库、`.local/`、聊天记录、环境文件、账户密码或已安装工具的认证状态。

## 本机 WorkBuddy 发现与真实调用

`E:\workbuddy` 是工作目录，不能当作安装目录。Windows 开始菜单实际指向 `C:\Users\35889\AppData\Local\Programs\WorkBuddy\WorkBuddy.exe`。初次检查版本为 5.0.2；用户更新后实际复核为 5.8.3，Tencent 签名有效。

安装包 `resources/app.asar.unpacked/cli/bin/codebuddy` 是真实附带入口。通过已安装 Node 调用，并将 home、配置、缓存、临时文件全部隔离到项目 `.local/phase9a/`：

- `--version` 实际返回 2.99.1。
- `--help` 实际可用；没有虚构 `workbuddy deploy` 命令。
- 禁用模型工具的实际连接探测返回 `Authentication required. Please use /login command to sign in to your account`。虽然 CLI 退出码为 0，这不算认证或模型调用成功。
- 旧版桌面配置曾指向本地 MCP connector proxy，初次 initialize/tools-list 返回 HTTP 401；这仅记录当时结果，不能用来否定后来成功的桌面连接。5.8.3 已移除旧版 `.mcp.json`，没有重试旧代理、提取登录密钥、伪造会话或复制凭据。
- 初次 Windows UI Automation 能找到窗口但没有可访问按钮。用户完成 CloudBase 连接后，负责人通过可见窗口截图逐步操作正常桌面会话；未代替用户完成账户登录或授权。

安装包中的 `cloudstudio-deploy/SKILL.md` 明确声明：只支持纯静态前端，不支持 SSR、backend API、数据库或 Node 运行时。此路径不足以交付 LIFE HUD，因此未发布前端或生成冒充 Daily Driver 的链接。

本机缓存工具名含云服务数据库/存储管理，但缓存不是当前可用工具或任意后端托管能力的证明。WorkBuddy 整体是否能承载所需全栈，仍需在已授权连接中验证；不能仅凭静态技能的限制宣布整个产品不可用。

官方依据：[WorkBuddy 网站发布](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App)、[WorkBuddy 云服务](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Cloud-Services)、[CloudBase 连接器配置](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/ide-setup/workbuddy)。前两者证明产品提供云服务入口，不能代替本机资源权限、运行时及持久化验收。

## CloudBase 连接后的实际核查

用户已明确反馈“连接成功了”。2026-10-21 至 22 日，负责人在已登录的 WorkBuddy 中发送只读预检，实际调用 `queryEnv`、`callCloudApi` 及 `searchKnowledgeBase`，查询成功，已经越过连接授权步骤。当前任务名称为“LIFE HUD 腾讯云 CloudBase 部署预检”。

用户明确允许仅 WorkBuddy 自身登录、连接器、会话及任务日志使用现有 Windows 用户目录；项目输出仍在项目内。GUI 工作区为项目内 `workbuddy-deploy/`，已加入 Git 忽略；使用默认权限模式，提示禁止读取父目录、秘密和用户数据。只授权写一个脱敏预检草稿，未授权购买、开通、部署或数据库写入。该目录不是发布源码，也不能提交或整体提供给其他模型。

已查询的非秘密环境信息：

| 项目 | 实际结果与范围 |
| --- | --- |
| 环境 | `life-hud-prod`，ID `life-hud-prod-d3gyfg19352f70c91`，`ap-shanghai`，`NORMAL` |
| 套餐 | `baas_trial` 体验版，预付费；自动续费关闭，`EnableOverrun=false` |
| PostgreSQL | 实例存在，`TenantType=SHARED`；尚无经过连通性验证的 TCP 端点 |
| 云托管 | `tcbr DescribeEnvBaseInfo` 返回 `IsExist=false`；`DescribeCloudRunEnvs` 返回 `UNAVAILABLE`；未开通 |
| 存储与调度 | 环境包含存储资源；现有 S3 签名/授权下载、Node 24、常驻 scheduler 均未实际部署验证 |

负责人亲自读取本机连接器缓存中 `queryEnv` 的公开工具描述，确认其明确区分 `SHARED`（仅 SDK/网关）和 `DEDICATED`（私网 host/TCP）。[官方连接文档](https://docs.cloudbase.net/database/postgresql/connecting-to-postgresql) 则一般性描述支持标准协议，并要求以控制台连接信息为准。因此不能把文档能力直接当作本共享实例可用，也不能把 HTTP SQL 接口替代现有 postgres-js 事务与行锁。当前数据库兼容性门槛仍未解决，未迁移或重写数据层。

用户明确月预算上限为 **人民币 30 元，覆盖完整在线栈**。已要求 WorkBuddy 继续只读核查最低配置、计费单位和实际前置，不购买或升级。初稿称云托管包含于资源点，但 [云托管限制文档](https://docs.cloudbase.net/run/limitation) 说明 CPU/MEM 不包含环境套餐且需超限按量，二者口径冲突；负责人未采用初稿作为已验证账单或预算承诺，要求进一步核对。未核清费用与数据库连接前不选择付费方案。

### 负责人复核的预算门槛（2026-10-22）

负责人直接读取腾讯云现行 [资源点价格](https://cloud.tencent.com/document/product/876/127357) 和 [计费能力项](https://cloud.tencent.com/document/product/876/120713)，并检查现有 `reminder-rules/crons/reconcile.ts` 与 `outbox-events/crons/dispatch.ts`：两项每 15 秒执行数据库查询。这会让共享 PostgreSQL 持续处于有访问的计量时段，即使没有到期提醒，也不能把数据库成本按用户偶尔打开网页估计。

- 上海 PostgreSQL CPU 单价为 0.342 元/核时；共享实例每个有访问的 5 分钟按 0.5 核计量。
- 按现有调度持续运行 30 天推算：`0.5 × 24 × 30 × 0.342 = 123.12` 元数据库计算资源价值。该值是按公布规则的推算，不是已经产生的账单，不含存储和流量，也不是独享实例的报价。
- 个人版公布优惠价 19.9 元/月、含 40,000 资源点。即便把全部 40 元等值资源点都抵扣上述数据库，仍为 `19.9 + 123.12 - 40 = 103.02` 元；尚未包括 Web/API、调度容器、文件及流量。因此当前共享数据库加原有持续调度的组合不能在 30 元月预算内交付。未升级套餐或开启按量。
- 云托管 0.25 核 / 0.5 GiB 单实例运行 720 小时的资源点刊例计算值为 `0.25 × 720 × 0.055 + 0.5 × 720 × 0.032 = 21.42` 元；未验证该规格足够运行应用，也不把这个数字冒充完整栈月费。

WorkBuddy 草稿中的 20 元预算误读已纠正为用户实际 30 元；旧 CU 换算也误把 `0.2 × 0.25` 算成 0.025。负责人核对 [旧 CU 文档](https://cloud.tencent.com/document/product/876/120342)，其明确面向配额制，不能套用本资源点环境；即使按该旧口径，正确乘积为 0.05，不能采用草稿的约 7.2 元结论。另纠正搜索摘要把地域表的“不支持”误读为体验版限制：当前上海地域 PG 环境的能力表列出支持云托管，不能仅凭该表宣布体验版绝无开通路径；按量资格与实际开通仍是另一项前置。

在不更换应用认证或数据库协议、不停掉提醒的前提下，当前 CloudBase 共享数据库路线的实际成本门槛已报告。只读核查同一家腾讯云的固定价轻量服务器作为候选，尚未选择或购买。官方 [活动页](https://cloud.tencent.com/act/pro/lhsale) 展示新用户首年活动，但账户资格、续费价格、部署权限和符合本任务要求的稳定 HTTPS 尚未验实，不能只按首年折扣宣布候选可交付；不购买域名或以 HTTP 代替 HTTPS。

### 固定价候选查询与精确人工门槛

实际 WorkBuddy `callCloudApi` 支持 `lighthouse`，`DescribeBundles` 在 `ap-shanghai` 成功。首个查询仅返回 20/41，负责人拒绝将部分目录的最低价当全目录最低，并要求 `Limit=100, Offset=0` 补全：返回 41/41。上海当前可售 Linux 月付目录最低为 35 元/月（2 核 2 GiB）；至少 2 核 4 GiB 的候选最低目录价为 65 元/月。以上仅是上海目录，不能当作所有地域最低价、当前账户活动资格或活动结算价。

对 `bundle_starter_mc_med4_01` 通过官方 [InquirePriceCreateInstances](https://cloud.tencent.com/document/api/1207/55558) 查询 12 个月实际报价，初次参数层级错误纠正后，实际返回 CAM 权限不足：当前连接器无 `InquirePriceCreateInstances` 权限。没有扩大权限、换凭据、创建订单或实例；未获得实际年付价格。当前需要用户在已登录腾讯云 [活动页](https://cloud.tencent.com/act/pro/lhsale) 查看其账户可购买的 Linux 服务器活动结算价、配置、地域、时长及续费价格，只提供非秘密报价信息，先不付款。年付是否能接受、完整费用与稳定 HTTPS 均需确认；未批准购买。

本次仅更新核查状态、路径例外及忽略规则，没有修改应用、数据库 schema、视觉或生产认证。文档验证 412 项通过，干净副本文档回归 25 项通过，待提交文件秘密扫描 752 文件无匹配；本地 Web 登录页和 API readiness 实测均返回 200。未运行或宣称新的公网/E2E 验收，PHASE 9A 未完成。

仅启用连接器不算上线；可复用的 [只读核查契约](WORKBUDDY_DEPLOYMENT_HANDOFF.md) 保留。不要在聊天中粘贴登录 Token、数据库密码或 AI Key。

## 必须运行在线上的组件

| 组件 | 现有实现与上线要求 | 当前线上状态 |
| --- | --- | --- |
| Web | TanStack Start/Vite；需生产构建及正确路由/静态资源处理 | 未部署 |
| API | Hono/oRPC，保持领域方法、Better Auth 与 owner 隔离 | 未部署 |
| PostgreSQL | Drizzle，39 张 public 表、7 次已有迁移；持久化、私网或受控连接、备份与 TLS | 平台共享实例存在，应用未迁移，TCP 未验证 |
| 文件 | 现有私有 S3 接口；需验证平台私有存储兼容性或授权适配，禁止临时文件系统 | 平台存储存在，应用兼容性未验证 |
| scheduler | 独立 Node 进程，加载现有三项 cron；需平台持续运行或兼容的受控定时触发 | 未部署 |
| 邮件 | 当前 Mailpit 仅本地；公网重置密码需真实邮件服务，或明确关闭未配置的重置入口 | 未配置 |
| Lim | 保持 Context Builder、Action Registry、隐私与授权；无模型 Key 时允许不可用状态 | 未部署，未复制 Key |
| Redis | 当前路径未要求运行 Redis；包依赖不等于实际必需服务 | 不新增 |

WorkBuddy/CloudBase 需要实际证明：任意 Node 容器或运行时、现有 PostgreSQL 的连接与事务能力、私有文件访问、环境 secrets、稳定 HTTPS、可持续或受控定时调度。没有证明前不选定最终拓扑，不新增替代云提供商。禁止公网前端连接 Windows 的 localhost 或家庭电脑。

## 发布前必须修复的现有本地假设

以下是代码检查发现的上线门槛，**尚未修改或冒充已通过**：

1. `apps/api/src/config/index.ts` 只接受 loopback API/Web URL；生产必须严格接受正确 HTTPS origin，同时保留本地隔离。
2. API 仅绑定 127.0.0.1；目标容器监听与入口路由需根据实际平台配置，不暴露数据库或管理端口。
3. `apps/api/src/server.ts` 当前 auth context 的 `secure:false` 需生产校正；Better Auth 的 base URL、trusted origins、Secure/SameSite、HTTPS/CSRF、反向代理和 iPhone Cookie 行为须实测。保持真实认证，不更换为平台演示认证。
4. 当前允许公开注册；确定最简单的 owner 初始化与关闭注册方式，不能留下公开注册或匿名访问用户数据。
5. 邮件发送硬编码到本地 Mailpit；线上不得继续指向 127.0.0.1。
6. Web 的 VITE URL 是编译值；必须与线上环境匹配，不修改本地派生文件来“临时切换生产”。
7. 生产启动/迁移命令不得加载本地 `.env`；生产 secrets 由目标平台注入，不提交凭据。

调度器代码现有 `FOR UPDATE SKIP LOCKED`、通知幂等键、事务内状态推进及安静时段处理是已有防线。仍需真实验证线上重启、并发、补偿与常驻配置，不能仅凭代码宣称在线提醒已验收。

## 本地数据与秘密核查

只读统计：1 个非 synthetic-domain 账户；tasks、assignments、courses、status_moments、learning_records、captain_logs、archive_entries、reminder_rules、core_files 各 0 行。这不表示其他表没有数据，也不授权复制账户、密码哈希或隐私记录。未自动导入 fixture，未迁移数据库；线上 owner 初始化与迁移仍需明确方案。

已扫描全部可达 Git 历史的 1112 个 blob，匹配本地 6 项秘密值及高置信私钥/Token 特征，未发现匹配；当前没有跟踪 `.local/`、真实 `.env`、pem/key 文件。该扫描有规则覆盖限制，不声称能证明未知秘密绝不存在。扫描没有发现需要报告并撤销的实际泄漏。

zcode 0.16.9 已复核，沿用已记录 HTTP 429/provider 1113 余额不足，不重复付费请求。Qoder 1.1.64 实际 probe 和固定事实的检查清单草稿成功；负责人亲自复核能力证据、认证、持久化和上线门槛。草稿“保持认证设置不变”收窄为保留认证机制与安全边界，生产配置必须适配；未把草稿当部署证据。

## 后续验证与更新流程

后续流程：解决实际环境与预算门槛 → Codex 确认全栈拓扑与生产安全修复 → 本地隔离测试及既有领域回归 → 提交 → 经 WorkBuddy 发布 → 验证真实 HTTPS URL。未来更新沿同一路径，不自动部署未测代码、不增加不必要 CI/CD。

公共 URL 必须实测未登录保护、登录、HOME/QUEST/STUDY/STATUS/GROWTH/Lim/REMINDERS/ARCHIVE、Task 创建与重载、状态快录、Captain's Log、私有文件上传下载、登出后的不可访问性、重新登录后的持久性，并验证服务重启与重复提醒防护。移动宽度需覆盖底栏、安全区、键盘、Lim 和横向溢出；实际 iPhone 蜂窝网络验证只能由实际设备完成，不能用模拟代替。

**截至本记录：CloudBase 环境和共享数据库已存在，但 LIFE HUD 尚未部署；没有应用公网 HTTPS URL 或线上测试结果。实际 iPhone 测试未执行。PHASE 9A 未完成。**连接已成功；当前共享数据库及原有持续调度的组合超出 30 元月预算。固定价候选的账户年付询价被 CAM 权限拒绝，等实际活动报价信息再确认拓扑，不能开始其他产品阶段。

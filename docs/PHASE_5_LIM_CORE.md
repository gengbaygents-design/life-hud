# PHASE 5 · LIM CORE

依据用户 [本阶段原始要求](source/phase5-lim-core.txt) 实施，已完成。此前阶段记录保留历史事实，最新阶段以本文件与 [工作入口](../CODEX_START_HERE.md) 为准。旧 EPIC 不自动映射 Phase；不实现 Memory、Night Voyage、Bridge、Attention Engine 或公共部署。

## 架构与权限

Lim 复用 Ship 的 ai_chats / ai_messages，LIM 类型与普通聊天分离，保留用户所有权。身份配置独立于模型，支持 EXECUTE / ASSIST / TALK；抱怨和随口疲惫不授予写权限。全局 overlay 保留 route/entity；移动面板/全屏、桌面侧边对话，简短结果与可用撤销，不展示模型置信度、JSON 或工具日志。

服务端路径为规范化输入→模式/领域选择→权限筛选→Context Builder→模型结构化提案→严格 Zod 验证→owner/版本/意图/风险检查→既有 Domain Method→事务内 Audit/Outbox/执行结果→真实结果收据。模型没有 SQL、数据库连接、函数工具或网络写工具。运行时模型不是 zcode/Qoder。

Context Providers v1 包括 UI、当前 Voyage、QUEST、University/STUDY、STATUS、GROWTH。只选择有界候选、开放任务与相关作业/课程、当前/下节课、必要时间和版本；近期用户原话有字符预算，学习来源摘录有截断标志。不传整库、文件正文、完整状态历史或技能树。

个人内容权限谓词在 SQL 读取内容之前执行。HIGH_PRIVATE / VAULT / NEVER 始终排除；没有 Cycle provider。EXPLICIT_ONLY 的已有学习/状态记录须通过本次 shareRefs 明确授权，拥有记录或打开页面不等于授权。界面仅对当前记录提供明确附上选项；允许发送的个人上下文有不含原文的访问审计。普通“我现在干嘛”不会自动获得默认 EXPLICIT_ONLY 状态。

## 首批行动

R0：QUERY_CURRENT_CONTEXT、QUERY_TIMETABLE。

R1：CREATE_TASK、UPDATE_TASK、COMPLETE_TASK、DELAY_TASK、CREATE_ASSIGNMENT、UPDATE_ASSIGNMENT_DUE_DATE、MARK_ASSIGNMENT_DONE、MARK_ASSIGNMENT_SUBMITTED、RECORD_STATUS、CREATE_LEARNING_RECORD。

所有 payload 严格校验，不接受 owner/SQL/任意字段。HIGH 置信且权限通过的 R1 可直接执行；MEDIUM/LOW 或重要歧义仅提出必要补充。R2/R3 是保留风险级别，本阶段没有注册其执行入口。不存在删除、支付、外部消息或任意批量写入行动。

Task 计划与 Assignment 截止分别路由既有 Core/University 方法；延期保留截止，截止变化沿用原同步逻辑。COMPLETE_TASK 发布既有 TaskCompleted，由 Outbox 推进 Assignment DONE，不标记提交；明确提交才调用 University 提交方法。学习反思与应用只允许实际用户原话，来源独立且反思可 null；不提升技能。状态只记录明确请求和输入的事实，不从疲惫猜测数值。

## ActionGroup、重试与撤销

ActionGroup 对应一条用户消息，最多四个严格行动；owner/requestId 唯一与请求指纹阻止重复或异内容复用。模型调用不持有数据库锁。每个行动的领域变更、Audit/Outbox 与执行收据同事务提交，行动组可真实返回 SUCCESS / PARTIAL / FAILED。

多行动通过受限 `$previousTask` 引用上一条 CREATE_ASSIGNMENT 已提交的关联任务；不复制 University 创建/截止同步逻辑。同 owner、课程与精确标题的重复创建会协调既有记录，重要歧义不猜测。

中断超过两分钟的处理只恢复已提交收据并跳过未执行步骤，不自动重放；未记录成功的写入与收据一起回滚。开发 trace 仅含模式、领域、获准引用、排除类别、行动名、验证/风险/结果；生产 trace 入口返回 404，不输出敏感内容。

小范围 Undo 支持 CREATE_TASK / DELAY_TASK / UPDATE_TASK，并支持本阶段新建状态/学习记录的软移除。owner、随机令牌、24 小时有效期和结果版本一起校验；后续用户修改导致冲突，不能覆盖。任务编辑通过窄领域撤销命令复核引用、时间及状态，不还原任意数据库 blob。行动组有其他不可撤销步骤时，只撤销明确支持的成功操作；界面文案为“撤销可撤销操作”。

## 模型配置与本地验收

沿用 Vercel AI SDK，支持 Google 与 OpenAI 适配器，以及程序注入的 LanguageModel。根 `.env` 可配置 AI_PROVIDER=google、GOOGLE_GENERATIVE_AI_API_KEY、AI_MODEL；或 AI_PROVIDER=openai、OPENAI_API_KEY、AI_MODEL，兼容服务可额外设 AI_BASE_URL。密钥仅传 API，不写 Web 环境。未配置时应用照常启动，对话历史可读，Lim 明确不可用；提供方异常保留用户消息、无执行成功声明，其他模块独立工作。

开发 mock 仅在 APP_ENV=development 且启动进程明确设置 LIM_PROVIDER=mock 时启用，界面标明固定模拟回复；LIM_PROVIDER=mock-failure 用于提供方故障测试。它们不写根 .env，生产环境忽略这些开关。正常验收完成后恢复无 mock 与实时钟。

```powershell
$env:LIM_PROVIDER='mock'
$env:DEV_NOW='2026-10-16T06:30:00Z'
node scripts/local.cjs start
```

另一个项目终端运行 `node scripts/run-pnpm.cjs test:lim` 与 `node scripts/run-pnpm.cjs test:lim:e2e`。Golden Journey 使用真实登录、领域服务、PostgreSQL、Outbox 和浏览器，只有模型回答为确定性替身；不把 mock 当成真实云模型验证。

## 验收记录

真实 PostgreSQL 服务验收 33 组，覆盖 LIM-001–023、三类个人权限谓词分别隔离、EXPLICIT_ONLY 授权、置信度澄清、不推断状态数值、请求并发幂等、成功撤销/后续编辑冲突、事务回滚、中断恢复、HTTP 所有权/Origin、生产禁用 trace/mock 与会话持久化。没有配置运行时模型凭据，真实云模型调用未验收；确定性 provider 与实际 AI SDK 的替身验证分别通过，不宣称云模型成功。

真实 Edge Golden Journey 通过：登录→高数课程内打开 Lim→第三章作业今晚九点→原 Task 调整且无重复→做完→Outbox 推进 DONE/NOT_SUBMITTED→明确提交→下一次作业/关联任务/计划多行动→随口疲惫不记录→明确精力 2 部分记录→过拟合实际用户原话保存且反思 null→重载→安全撤销。移动和桌面截图已检查，保留原桌面 440px 面板，来源标签简洁，路由/query/hash/entity 状态保留，不暴露 UUID/调试日志。

另以真实 API 的开发提供方故障模式跑浏览器：Lim 返回失败收据并保留用户消息，HOME/QUEST/STUDY/STATUS/GROWTH 页面仍可用。普通启动不设置 mock；无凭据时 Lim 清楚显示不可用，其他功能正常。

单元测试 7 文件共 50 项；lint、typecheck 13/13、生产 build 8/8（含根页预渲染）、冻结锁文件安装均通过。Core/QUEST API 27 项、University/STUDY API 25 项、STATUS/GROWTH API 31 项、真实 Core 与个人领域 Edge Golden 回归及基础认证/私有 S3/重置邮件/会话验收通过。生产 Shell/认证失败/普通 AI 离线浏览器回归 7 项通过；首轮发现登录链接新增焦点及面板宽度变化，恢复原宽度并覆盖新登录焦点后复测通过。

文档检查与干净副本回归 24 项通过，12 份原产品文档与原始 epic0 哈希保持。可提交源码和 Web 构建产物的配置秘密匹配为 0，认证工具状态、环境文件、数据库与测试截图保留在项目私有目录且 Git 忽略。最终数据库 34 张公开表、6 条迁移，合成验收账户清理为 0，没有未来领域或重复 GrowthProject/Goal 表。

迁移前与完成后备份保存在项目内私有目录。普通 API/Web/scheduler 恢复实时运行；源码保存于本地 `codex/lim-core`，不推送、不部署。除未配置真实模型凭据这一环境限制外，无已知验收阻塞；按要求停止。

## 委派记录

zcode 0.16.9 实际调用返回 HTTP 429 / provider 1113；Qoder 1.1.64 实际探测通过，完成对话契约样板、八个端点生成器、固定 mock provider 与展示卡片草稿。负责人纠正错误 ACTION 模式、宽泛 any、上下文目标猜测、无输入数值推断、端点多余 imports 和重复回复的撤销关联，并逐项复核。Codex 负责架构、行动 schema/权限/风险、隐私 Context Builder、领域路由、事务/幂等/撤销、提供方适配及真实验收。新 OpenAI SDK 的初选版本与仓库 provider-utils 覆盖不兼容，运行测试发现后改用契约兼容且锁定的 3.0.41；无隐瞒失败。

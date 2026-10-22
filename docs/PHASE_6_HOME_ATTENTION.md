# PHASE 6 · HOME + ATTENTION ENGINE

依据用户 [本阶段原文](source/phase6-home-attention.txt) 实施，已于 2026-10-17 完成本地验收。此前阶段记录保留历史事实，最新状态见 [工作入口](../CODEX_START_HERE.md)。只做本地 HOME/Attention，不开始 Reminder、Archive、Memory、Bridge、Night Voyage 或重大 Visual Polish；旧 EPIC 不自动映射 Phase。

## 只读聚合与源领域

数据路径为 Domain Context Providers → HOME Aggregator → Attention Engine → 紧凑 View Model。`GET /home` 只接受有效 IANA timeZone，owner 来自认证身份；没有 HTTP owner、now 或调时入口。整个聚合在 PostgreSQL repeatable-read / read-only 事务中读取，规则函数是无数据库访问的纯函数。没有新表、迁移、复制 Task/Assignment 或持久化推荐缓存。

QUEST provider 只取 owner 的开放任务和必要时间/版本/来源；University provider 使用真实 ClassSession/Course/Semester/Voyage，过滤删除与非活动父级，并取相关未提交作业。任务和作业保持不同身份；已完成 Task 或 DONE 作业尚未提交时，HOME 呈现实际待核对提交的事项，避免重复推荐做作业，也不在 Outbox 延迟期间捏造提交。截止仍由 University 维护，Home 不同步或修改源领域。

STATUS provider 只读过去 24 小时、非未来、NORMAL/PRIVATE 的一个瞬间，不读备注、身体内容、周期或历史列表。Voyage 是小型当前航程标记；Project provider 只查候选任务或当前 Voyage 关联的活动项目名称。当前没有权威的持久化系统告警域，对应 provider 返回空集合，不制造基础设施或生活告警。真实时间冲突可由规则生成提示。

## 确定性规则

当前真实课程优先，使用与 STUDY 相同的课程时间换算，开始包含、结束不包含。未来一小时内课程形成主要上下文；课前保留十分钟缓冲，不建议开启不适合剩余时长的长任务。一个主推荐，最多一个合适替代；TODAY 最多六项实际课程、计划或截止，不列出全部 QUEST。

硬截止六小时内或已经到期时优先于轻松任务；同日其他硬截止仍保留真实上下文。进行中任务代表明确行动与中断成本。无更紧急事项时，近两小时内到达计划时间的短任务可先清理，再回到稍后的截止工作。仅在没有更强紧迫性或明确进行中意图时，近期低精力会软性倾向短任务；不能删除、延期、修改截止或作医疗推断。

深夜为当地 23:00–06:00，普通非紧急 SHOULD/OPTIONAL 不占用主推荐；真实临近/过期截止和用户明确进行中的事项仍可见。无事可推荐时显示“此刻，可以留白”或“今晚没有必须处理的事”，不补造自我提升任务、不显示未完成计数或羞辱状态。当前课程与截止冲突时，保留课程主上下文并明确提示真实截止。现有任务没有依赖图，规则不伪造依赖可用性、心理动机或任意优先分。

## Lim、隐私与动作

Lim 的“我现在干嘛？”直接调用同一个 HOME/Attention 服务和规则，带上当前时区，生成一个主建议与最多一个替代的简短答复。它走已注册 QUERY_CURRENT_CONTEXT 的 R0 记录和既有 owner/幂等边界，不调用模型，因此无运行时模型凭据也可使用。不是另一套模型猜测的推荐逻辑，也不改变既有 EXECUTE/ASSIST/TALK 写行动权限。

该本地答复仅使用最终主建议/替代和非敏感理由，不将状态内容、记录 ID、HOME 快照或助手答复回传给云模型。现有模型路径仍保留独立 AI 授权门禁；供 MODEL audience 使用的 Home provider 还要求 ALWAYS / WHEN_RELEVANT，或本次明确授权的 EXPLICIT_ONLY。HIGH_PRIVATE、VAULT、NEVER 始终不进入模型输入。普通 HOME 作为本地、无模型的 owner 界面，沿用原技术读取权限；它不获得任何 Cycle provider。

Home 的“完成”是用户明确触发的现有 Task Domain Method，带版本；不是 Attention 引擎的隐式变更。提交要到 University 明确标记。没有新增 Home 写端点或 Lim 写行动。

## 界面与更新

保留 AppShell、深色 HUD、既有 cards/tokens、移动五项导航与全局 Lim。CURRENT/UPCOMING/NEXT 单张焦点卡，TODAY 小型混合安排，STATUS 安静记录入口，Voyage 与关联项目只作次级背景。保留移动与桌面布局，不启动独立视觉重设计。

HOME 默认 15 秒有界再验证，临近计划/课程/截止边界时可缩短到一秒；窗口恢复焦点或联网时重读。Task、University、Status、Project 的相关写入及 Lim 行动会使 home 查询失效；HOME 明确完成后立即重新聚合。Outbox 沿用原机制，Task 已完成的事实足以阻止重复推荐做同一作业。读取失败明确提示，并在可用时保留上次数据，不把故障当成真实空白。

## 开发数据与验收方法

`node scripts/run-pnpm.cjs seed:home --email 已有本地账户 --date 2026-10-16` 显式导入 STANDARD_DAY：两门课程及真实课次、16:00 十分钟快递、20:00/23:59 三十五分钟高数作业、二十分钟英语、九十分钟 Project 架构任务、09:05 CALM/3 和 13:10 TIRED/2。使用 owner 确定性 ID，重复导入不重置完成状态或用户修改；只有本次新建的学术 Task 按 fixture 明确设置同名标题。没有自动向普通账户注入样例。

`test:home` 覆盖真实数据库和 HOME-001–017；`test:home:e2e` 启动独立 3011/3012 真实开发 API/Web，以进程环境切换既有 DEV_NOW，实际验证 09:10 / 14:20 / 16:10 / 20:30 / 次日 00:40。没有 mock API 数据、HTTP 调时入口或需要云模型的步骤；单独的开发测试进程退出后清理自己的账户、会话与子进程，不改变正常应用时钟或用户数据。

## 实际验收

真实 PostgreSQL/API 验收覆盖 HOME-001–017 及附加边界，共 16 组通过：跨 owner 隔离、严格 HTTP 输入、无客户端调时、聚合不写数据、最小 DTO、HIGH_PRIVATE/Cycle 排除、独立 MODEL 授权、无模型的共享 Lim、不同 IANA 时区一致、Task 完成与提交的及时区分、显式 fixture 幂等。9 个文件共 64 项单元测试、typecheck 13/13、lint 和生产构建 8/8（含根页预渲染）通过；未增加表或迁移。

真实 Edge Golden Attention Journey 通过：09:10 高数即将上课；14:20 当前 AI 基础课程；16:10 拿快递优先、明确完成后立即回到高数；20:30 高数今晚截止、英语作为唯一替代；无模型时 Lim 与 HOME 同源；完成作业后保留未提交、Outbox 推进 DONE、再明确提交；次日 00:40 安静留白；真实 01:00 硬截止创建后自动出现，重载仍持久。专用真实 API 进程切换 DEV_NOW，浏览器自动再验证，没有 HTTP 调时或 mock API。390px / 1440px 截图已检查，无横向溢出或页面脚本异常。

既有领域回归通过：Core/QUEST API 27 项、University/STUDY API 25 项、STATUS/GROWTH API 31 项、Lim API 33 组；四个领域各自的真实 Edge Golden Journey 均通过。生产 Shell/认证失败/键盘焦点/移动与桌面/全局 Lim 回归 7 项通过；基础认证、私有 S3、重置邮件、会话撤销与错误 Origin 实测通过。Lim 既有模型对话 Golden Journey 明确使用开发替身；本阶段 HOME/Lim Attention Journey 不需要模型或替身，没有声称云模型已验收。

首次 Golden 流程发现 fixture 关联 Task 沿用默认“完成…”标题，以及导航名称断言未兼容桌面说明，分别修正新 fixture 标题与测试定位后通过。University 回归旧断言匹配旧 HOME 文案，改为验证 CURRENT、上课说明与真实结束时间后通过。当前课/即将上课与过期截止冲突均有明确提示，已有单元覆盖。

文档检查及 24 项干净副本回归通过；12 份原产品文档和原始 epic0 哈希保持，Web 构建产物与可提交文件中的配置秘密匹配为 0。数据库保持 34 张公开表、6 条迁移，合成验收账户清理为 0，没有 Home/Attention 持久化表或未来领域。迁移前与完成后备份位于项目内私有目录，均不进入 Git。

普通 API/Web/scheduler 已恢复实时钟及根配置提供方，移除验收进程的 DEV_NOW/mock；本地分支为 `codex/home-attention`。本阶段无已知验收阻塞；运行时云模型凭据仍未配置，本地 Attention 不依赖它。只保存在本地，不推送或部署。按要求停止。

## 委派与纠正

zcode 0.16.9 实际探测继续返回 HTTP 429 / provider 1113。Qoder 1.1.64 实际连接成功，承担 DTO/Zod 样板、标准日 JSON fixture、展示卡片和契约测试草稿。负责人纠正自行从 TODAY 推导 fallback、错误 status/id/kicker 字段、空值类型，以及测试中将 owner/now 当作客户端参数的错误假设。所有整合结果经过复核；Codex 负责规则、跨域优先级、推荐语义、只读事务、隐私、Lim 共享、开发时钟验收与最终审查。

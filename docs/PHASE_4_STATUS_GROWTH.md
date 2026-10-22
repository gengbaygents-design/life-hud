# PHASE 4 · STATUS + GROWTH

状态：COMPLETED（2026-10-17）。依据：[用户阶段要求](source/phase4-status-growth.txt)。保留 [Phase 3 University/STUDY](PHASE_3_UNIVERSITY_STUDY.md)、Core/QUEST、HOME 和视觉系统；仅本地运行，本阶段完成后停止，不自动开始 Lim。

## 资源与边界

新增九个 Core 个人领域资源与表：`status_moments`、`sleep_records`、`water_records`、`exercise_records`、`cycle_records`、`learning_records`、`learning_mistakes`、`skills`、`skill_evidence`。沿用 Ship schema/methods/endpoints、既有 PostgreSQL、Core Project/Goal/File、Audit/Outbox 和界面组件；没有新 Project/Goal 系统或新框架。迁移为新增表与 EntityLink 类型/关系约束扩展，之前已保存本地一致性备份。

StatusMoment 可以只含心情、精力、压力、专注、身体感受或备注中的一项；空对象被拒绝。支持 HAPPY/CALM/TIRED/ANXIOUS/SAD 与自定义感受，主观量表为可空 1–5。每条瞬间有独立 UUID、recordedAt 和版本，不设每日唯一约束。修改和移除须带版本，旧版本冲突不会覆盖新记录。

Sleep 保存起止、可选质量/备注，时长按时间差推导；Water 只累计实际记录毫升数；Exercise 只保存用户明确输入的活动事实。日/周/月窗口按用户时区的本地日期选择，未来记录不进入当前趋势；不补造缺失日、不设置喝水羞辱目标或睡眠诊断。没有周期预测、健康平台同步或 LLM 身体计算。

## 隐私

个人状态、睡眠/饮水/运动、学习记录/混淆点与证据默认 PRIVATE；Skill 默认 NORMAL。支持 NORMAL / PRIVATE / HIGH_PRIVATE，并保留 VAULT 标签兼容；当前界面不提供 Vault，加密保险库及完整隐私引擎仍在未来范围。

Cycle 默认且最低 HIGH_PRIVATE，AI policy 为 NEVER。其他新资源 AI policy 固定从服务端设置为 EXPLICIT_ONLY；客户端不能改写该字段。现有 AI 聊天没有这些资源的读取或写入工具，不会自动获得状态、周期、反思或证据上下文。

HOME 调用专门的最小状态接口：只选择过去 24 小时、非未来、NORMAL/PRIVATE 的最新瞬间，输出心情/主观量表/时间，不返回备注、身体内容、来源、周期或高隐私记录。没有记录时保持安静，不推断感受。

STATUS 通用视图不查询或返回 Cycle。用户必须打开私密区域才读取周期数据，收起时移除其查询缓存；所有新 HIGH_PRIVATE/VAULT 详情读取及 Cycle 读取均写入访问审计。日志只含实体 ID、动作和操作类型，不复制症状、备注或反思；不产生访问 Outbox 事件。

周期永久删除要求 owner、版本与明确确认，数据库行硬删；审计保留无内容的删除动作，不声称清除历史备份。其他资源通常软删；跨用户读取、修改、删除和引用均返回与不存在相同的 404，匿名访问被拒绝。File 被有效学习来源/混淆点/证据引用时，沿用 Core 存储删除保护。

## 学习记录与证据

LearningRecord 的 source 与 reflection 独立。标题、来源链接/手动文本/已有 File 或 Image/Course/Assignment 可独立保存，reflection 默认 null；服务器不抓取 URL、不复制文件字节或自动写“学到了什么”。用户反思、问题、应用和项目想法作为原文保存，不 trim 或改写用户表达；createdBy 来自认证身份。

写契约不接受生成摘要、AI 作者或任意隐藏字段；生成来源不能通过反思写入门禁。没有 AI 更新反思的入口，未来摘要/候选笔记必须另行设计，不能挤入用户字段。普通 UI 编辑保留未编辑字段，失败/版本冲突保留表单输入。

LearningMistake 保存真实混淆点与可选更正，来源可指向已有 Assignment 等实体，显式复查状态与 reviewedAt 分开处理。没有高级间隔复习。

Skill 使用 EXPOSED / UNDERSTANDING / PRACTICING / INDEPENDENT / TRANSFER / PROVEN 六种定性状态，不存在百分比、XP、等级或掌握分。初始只允许 EXPOSED；新增证据不会自动升级状态。用户要改变为更高状态，必须明确确认，并已有对应类型的有效 owner 证据。

SkillEvidence 指向实际存在且同 owner 的来源。CONTACT 可以引用仅保存来源的记录；更高类型必须有用户说明与明确确认，来源型学习记录本身没有反思/应用时不能被当作高阶证据。UNDERSTANDING 要求自己的解释，TRANSFER 要求实际应用。PROVEN 必须已有 OUTPUT 证据，再由用户确认；这些是有来源的用户定性判断，不是系统证明或自动推断的掌握度。

已确认技能不能无声删除最后一条对应证据，需先调整状态；技能软删后其证据仍可移除，避免清理死锁。证据的来源/类型/观察时间不能普通改写，新事实须新增。重要可变记录采用乐观版本，事务与审计同提交。

LearningRecord → Project 通过现有 EntityLink 的 APPLIED_TO 关联；创建时指定项目会同事务建立链接。EntityLink 类型扩展仅用于本阶段已存在实体，APPLIED_TO 方向限定为 LearningRecord→Project。GROWTH 直接呈现既有 Core Project/Goal，LIFE HUD · Project #001 不被复制到成长专属表。

Study 完成只沿用既有 Assignment/Task 事件反应，不自动创建反思型 LearningRecord、不写用户感悟或提升技能。只有 StatusMomentRecorded 为本阶段新增的业务发布事件；其载荷不含心情/备注/身体内容。其他新记录保留必要审计，不增加无消费者事件族。

## 界面与显式开发样例

保留 MORE 下的 STATUS/GROWTH 路径、AppShell、GlassCard/HUDCard、颜色 tokens、五项移动导航与全局 Lim overlay。HOME 的“记录状态”打开小弹层，心情可选，详情折叠；保存后关闭并刷新最小摘要。STATUS 先展示今日/最近瞬间，再展示睡眠、饮水和事实趋势；运动与私密周期为次级入口。GROWTH 按学习记录、技能证据、项目排列，目标/混淆点在次级区域。没有后台管理表格或游戏技能树。

```powershell
node scripts/run-pnpm.cjs seed:personal --email existing-local-account --date 2026-10-16
```

只允许 development 下显式选择已有账户；确定性 owner UUID、存在检查和原 Project 复用使重复导入不覆盖用户修改或删除的记录。样例包括两条状态、01:10–08:05 睡眠、300/250ml 饮水、指定反思与仅 URL 的学习记录、混淆点和三个定性技能及显式证据。会复用/建立 University 开发样例作为课程/作业来源；不自动向普通新账户填充数据。

Cycle 默认不导入，只有明确 `--include-private-cycle` 才添加隐私测试样例；不生成假运动或 PROVEN 掌握。仅开发可用的既有 DEV_NOW 支持固定时间测试；本阶段黄金验收使用 `2026-10-16T06:30:00Z`，正常运行会恢复实时钟。

## 实际验收

已完成：真实 STATUS/GROWTH 域验收 31 项，含 STATUS-001–004/006–009、GROWTH-001–011、全部九资源及跨域引用的双用户隔离、高隐私访问审计筛选、原文与生成写入门禁、文件引用保护、技能/证据约束、周期硬删和开发样例幂等。STATUS-009 是“不实现预测且无 LLM 路径”的验证，不声称验收了不存在的预测算法。

真实 Edge 黄金流程通过 STATUS-005/006/010：登录→HOME 平静/精力 3→保存刷新→STATUS 第二条疲惫/精力 2→两条重载保留→睡眠/饮水→周期显式打开/确认删除→GROWTH 指定原文与 Project #001 关联→仅 URL 记录反思为 null→CONTACT 不升级→显式理解证据→单独确认定性状态→证据可见→重载和第二用户隔离。已检查移动与桌面截图及页面错误列表，未见横向溢出或页面脚本异常。

单元测试 6 个文件共 40 项；lint、typecheck 13/13、生产 build 8/8（含根页预渲染）通过。University 真实服务 25 项、Core 真实服务 27 项、原 QUEST 真实 Edge 黄金流程、生产 Shell/认证失败/AI 离线浏览器回归 7 项均通过。最后的编辑用例另证明：对其他字段做 UI 编辑时，反思原有首尾空白及 CRLF 换行不会被浏览器归一化写回。

正式文档检查与无私有状态的干净副本回归 24 项通过。原始 12 份产品文档及 epic0 哈希保持；可保存源码和 Web 产物的配置秘密匹配数为 0，工具状态/凭据/数据库被 Git 忽略。最终数据库为 32 张公开表、5 条迁移；合成验收账户已清理，没有未来领域表或重复 GrowthProject/Goal。

固定开发时钟已移除，API/Web/scheduler 恢复实时运行。迁移前、完成后的数据库备份在项目私有目录。源码在 `codex/status-growth` 本地分支保存，不推送、不部署；无遗留阻塞，按要求停止。

## 工具分工与纠正

zcode 0.16.9 实际探测继续返回 HTTP 429 / provider 1113；按用户授权改用 Qoder 1.1.64，实际探测 OK。Qoder 完成九资源 schema/契约/方法/45 个端点的机械生成器、状态/技能卡片、捕获/学习表单及六个规则测试草稿。首个测试扩展调用 180 秒超时，缩小后完成。

负责人在执行生成器前纠正资源路径、oRPC 构造、方法导入、PUT 路由及只读字段排除，避免让 createdBy/aiPolicy 成为写入输入；另纠正卡片错误隐私枚举、组件默认/命名导入、TEXT 来源表单遗漏、测试函数签名和下拉控件可访问名称。没有盲目执行或合并模型输出。

Codex 负责领域定义、隐私与用户原文边界、owner/来源/证据校验、事务、敏感访问审计、Core 关联、真实页面整合、种子幂等与最终服务/浏览器/安全验收。所有项目输出和工具状态仍在项目内，秘密与数据库不进入 Git。

未实现 Lim actions、Memory consolidation、Archive intelligence、完整 Attention Engine、语义搜索/高级文件解析、医疗诊断、自动心情推断、职业/社交/钱包、Bridge、Night Voyage 或公共部署。下一阶段须另行授权。

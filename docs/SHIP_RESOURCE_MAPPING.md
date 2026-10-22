# LIFE HUD 与 Ship 的架构映射

Product architecture is authoritative. Ship is the implementation substrate.

以下是后续实现位置，不创建业务表或业务资源。Core / Voyage / Life Pack 三层保持；University 为 Voyage #001，当前仅 University Pack。

| 领域 | 后续 resource 组 |
| --- | --- |
| Core 航行与执行 | voyages、projects、goals、tasks、entity-links、real-world-events |
| 行动记录 | action-groups、audit-logs、outbox-events |
| University | semesters、courses、enrollments、class-sessions、assignments、exams、grades |
| 状态 | status-moments、sleep-records、water-records、exercise-records、cycle-records |
| 学习 | learning-records、learning-mistakes、skills、skill-evidence |
| 原始资料与归档 | files、archive-entries、captain-logs |
| 上下文与导航员 | memory-items、shared-contexts、lim |

资源位于 `apps/api/src/resources/`：schema 定义数据；methods 承载领域规则；endpoints 只处理传输；middlewares 进行身份、所有权及未来隐私许可检查；handlers/events 处理跨域反应；crons 使用 Ship scheduler。React 页面不承载核心领域逻辑。

认证身份决定 owner。所有权不符与不存在统一不可见；不能相信客户端 owner。未来隐私级别 NORMAL / PRIVATE / HIGH_PRIVATE / VAULT 与 AI 策略 ALWAYS / WHEN_RELEVANT / EXPLICIT_ONLY / NEVER 仍是独立许可维度，基础鉴权不能替代这些许可。

Task != Assignment；DONE != SUBMITTED；planned time != deadline；input != mastery。原始文件和 Captain's Log 原文权威；解析失败不能破坏原件，AI 摘要不得覆盖原文；Archive 不建立重复事实源；用户纠正高于 AI 推断。

未来 Lim：意图/模式 → 相关领域 → 许可 → Context Builder → LLM → Action Proposal → schema validation → authorization → risk check → Domain Service / method → DB transaction → Audit / Outbox → Action Result。此次只准备会话底座，不实现该行动系统。技术访问不代表 AI 上下文授权。

移动入口固定 HOME / QUEST / ◉ LIM / STUDY / MORE；LIM 为覆盖层，保留 pathname 与当前页面，不通过普通导航切换丢失上下文。当前页仅为基础外壳；Quest、Study 等业务尚未实现。

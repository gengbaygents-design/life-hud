# PHASE 7 · REMINDER + ARCHIVE FOUNDATION

依据用户 [本阶段原文](source/phase7-reminder-archive.txt) 实施，已于 2026-10-17 完成本地验收。只做本地 Reminder/Archive；保留既有领域、HOME/Attention、Lim 和视觉。完成后停止，不开始 Visual Polish、长期记忆、Night Voyage、Bridge、向量检索或公共部署。

## 持久化提醒

ReminderRule 与 NotificationInstance 分表，首版只支持一次性提醒。规则持久化时间、来源引用、P0–P3 和时区/安静时段；通知保存这一次实际投递的标题、计划时间和已读/收起状态。投递指进入本地提醒页，不是系统推送、邮件或外部通知。

现有 Ship scheduler 启动时及每十五秒补偿扫描数据库。到期规则使用事务行锁、SKIP LOCKED 和通知唯一发生键；通知写入与规则 FIRED 同事务提交。停机期间到期的规则可恢复；未到期规则留在数据库，不依靠进程计时器。创建使用 owner 下的规范化逻辑键和短事务锁处理浏览器/网络/Lim 重试；同一发生不重复投递。

普通默认 P2，23:30–07:30 为安静时段；用户可在每次设置中指定持久化的本地配置。DEFER 延到安静时段结束，SILENT 进入本地页并标记静默；P0 需要明确确认，可绕过安静时段。Lim 创建只允许 P1/P2/P3，不允许模型升级为 P0。真实时区与夏令时边界由 UTC 实际分钟转换处理。取消只影响未触发规则；已读/收起不会删除规则或其他通知。

## Archive 与日志

新增 ArchiveEntry、ArchiveEntryLink、CaptainLog；重要时刻是 MOMENT 子类型，期间索引使用 PERIOD。链接仅保存类型与 ID，不复制 Task/Assignment/Status/Learning 的领域事实。历史视图从源表读取完成任务、课程、作业变更/提交、状态、学习、日志和时刻；关键词在日志原文、学习标题、档案标题/备注及引用标题中查找。Voyage/Semester 只作基础历史导航，完成的父级仍可浏览。

日志 body 保留原始字符、空白与换行；局部隐私编辑不重写 body。没有 AI 摘要字段、重写行动、自动任务化或聊天自动存档。AI 摘要与长期记忆明确延后。标准移除软删，Audit 仅记字段/引用元信息，不复制正文，为后续隐私删除兼容保留边界；不实现本阶段外的完整导出/硬删套件。

普通历史查询排除 HIGH_PRIVATE/VAULT；本次明确查看敏感记录才读取并记录访问审计。GET 布尔开关严格区分 true/false 与对应字符串，不使用字符串真值转换。创建引用校验 owner/未删来源，并阻止档案隐私低于来源。来源删除后链接保留为不可用，不返回旧内容。Cycle 不是可链接来源。没有 Captain Log 模型读取 provider，NEVER 及其他未授权日志不从该资源进入普通 Lim 上下文。

Lim 最小扩展 CREATE_REMINDER / CREATE_CAPTAIN_LOG / REMEMBER_MOMENT，仍走严格 proposal → schema → authority/risk → Domain Service → transaction / Audit → receipt。提醒不创建 Task；日志必须匹配实际用户完整原文，时刻必须明确请求，链接由当前已认证 UI 引用决定。这个本地引用不扩大 Context Builder 的 AI 正文授权；CREATE_CAPTAIN_LOG 的执行收据不再复制正文 payload。

## 工具与实际验收

zcode 0.16.9 实际返回 429 / provider 1113；Qoder 1.1.64 探测成功。双文件大契约请求均在 180 秒超时；缩小为单文件后返回契约、卡片、quiet-hours 测试和 fixture 草稿。负责人修正错误 HIGH/PRIVATE_VAULT 枚举、多余 links 输出、未补全默认测试数据、新颜色样式、不存在的通知状态及 fixture 的转义换行/尾空格。负责人负责调度/重启、去重、权限、日志原文、隐私和最终验收。

真实 PostgreSQL/HTTP 的 15 组验收通过，覆盖 REM-001–011 / ARCH-001–011：持久化和分表、并发逻辑去重、重复补偿一次发生、已读/收起不删规则、通知快照独立、安静时段 DEFER/SILENT、明确 P0、Task/Assignment/Exam 引用与所有权、Lim R1 与提供方故障、原文字节保持、无自动任务化、引用删除占位、高隐私显式读取/审计、普通 Lim 排除日志、独立 UI 引用不扩大 AI 内容权限、历史学期和关键词检索、明确 fixture 幂等。

真实 Edge Golden Phase 7 Journey 通过：创建 Task → Lim 设置 16:00 提醒 → 15:56/15:57 重启真实应用和 Ship scheduler，规则仍在且未提前投递 → 16:01 到期 → 16:02 再重启并经过真实轮询，仍只有一条通知 → 明确标为已读并核对 API 的 READ → 手动 P0 确认/取消且不投递 → 写日志、重载、原文不变 → 记住当前日志引用 → 当日 Task/Learning/Status/Log/Marker 时间线 → LIFE HUD 关键词 → NEVER 设置保留原文 → 普通 Lim trace 排除日志；完整 provider-context 内容排除另由 API spy 实测。没有 mock API；自然语言模型明确使用开发替身，不声称实际云模型成功。

浏览器使用独立 3111/3112 子进程，既有 DEV_NOW 调时只在 development 生效；scheduler 的 DEV_REMINDER_OWNER 在开发验收中限定合成 owner，生产忽略。没有 HTTP 调时或客户端 owner 入口，测试扫描不会推进其他用户的提醒。390px / 1440px 截图已检查，无横向溢出或页面脚本异常；次级航程/隐私筛选可展开，保留原 HUD 和导航。

验收纠正了 GET 布尔字符串解析（明确 false 不得升级敏感权限）、旧 HOME 空 DTO fixture、fixture 的错误方法导出、未授权 AI 正文与本地引用的分离，并补强已读精确断言避免“未读”误匹配。时间线使用源领域各自的真实时间戳；测试不为统一开发日期而修改既有 Task 完成语义。只接受命名时区，避免 SQL 固定偏移与 Intl 的符号歧义。

81 项单元测试（11 文件）、typecheck 13/13、lint、生产构建 8/8（含根页预渲染）通过。Core API 27、University 25、STATUS/GROWTH 31、Lim 33 组、HOME-001–017 回归通过；Core、University、STATUS/GROWTH、Lim、HOME 的真实浏览器 Golden 回归均通过。生产页面/失败行为/键盘与全局 Lim 回归 7 项，以及真实认证、私有 S3、重置邮件、会话撤销与 Origin 验收通过。

文档与 24 项干净副本回归通过；12 份原产品文档及 epic0 原始哈希保持。可提交文件和 Web 产物的配置秘密匹配为 0。最终数据库 39 张公开表、7 条迁移，合成验收账户清理为 0；仅本阶段新增五张表，无长期 Memory、摘要、向量或其他未来领域。

项目内迁移前/完成后备份已生成并核对可读目录。普通 API/Web/scheduler 恢复实时钟和根配置，不保留开发 mock/验收 owner；源码保存在本地 `codex/reminder-archive`，不推送或部署。当前无本阶段验收阻塞；一次性本地通知以外的系统推送/复杂重复日历、AI 日志摘要及长期记忆均未实现，符合范围。实际运行时云模型凭据未配置，云模型调用未验收；本地提醒投递和 Archive 不依赖它。按要求停止。

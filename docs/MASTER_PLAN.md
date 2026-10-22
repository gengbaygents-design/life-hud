> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 主计划

来源：[epic0.txt](source/epic0.txt) 的工程规则、MVP 与首项任务。当前 EPIC_00：用户已明确启动基础设施。EPIC 00 为 IN_PROGRESS，EPIC 01–13 为 NOT_STARTED；先完成工程与 Compose 配置，暂不安装 Docker。

## 阶段与依赖

以下分解与依赖是依据固定范围整理的实施建议；详细架构/认证/schema 决策由负责人冻结。

| EPIC | 范围 | 主要依赖 | 状态 |
| --- | --- | --- | --- |
| [00_INFRA](epics/EPIC_00_INFRA.md) | 基础设施 | 无；用户已明确启动。 | IN_PROGRESS |
| [01_CORE_FOUNDATION](epics/EPIC_01_CORE_FOUNDATION.md) | Core 基础 | 00；先冻结认证、必要 schema、事务与同步契约。 | NOT_STARTED |
| [02_DESIGN_SHELL](epics/EPIC_02_DESIGN_SHELL.md) | 设计壳与移动导航 | 00、01；核心业务只接入契约，不提前实现。 | NOT_STARTED |
| [03_QUEST](epics/EPIC_03_QUEST.md) | 任务执行 | 01、02；状态迁移和版本冲突规则需先确定。 | NOT_STARTED |
| [04_UNIVERSITY_STUDY](epics/EPIC_04_UNIVERSITY_STUDY.md) | 大学学习域 | 01、02、03；课程材料引用待 07 联调。 | NOT_STARTED |
| [05_STATUS](epics/EPIC_05_STATUS.md) | 个人状态基础 | 01、02；高隐私策略先于敏感数据实现。 | NOT_STARTED |
| [06_GROWTH](epics/EPIC_06_GROWTH.md) | 学习意义与成长 | 01、02；图片/来源 File 待 07 联调。 | NOT_STARTED |
| [07_FILES](epics/EPIC_07_FILES.md) | 文件基础 | 01、02；先确定类型/大小、解析范围、隐私和删除传播。 | NOT_STARTED |
| [08_SEARCH](epics/EPIC_08_SEARCH.md) | 搜索基础 | 01、相关已完成源域；文件搜索依赖 07。 | NOT_STARTED |
| [09_LIM_CORE](epics/EPIC_09_LIM_CORE.md) | Lim 结构化行动 | 01、02、所用源域；作业/Task/Reminder 黄金流程待 11 联调。 | NOT_STARTED |
| [10_HOME](epics/EPIC_10_HOME.md) | 当下聚合 | 02、03、04、05、09；提醒待 11 联调。 | NOT_STARTED |
| [11_REMINDERS](epics/EPIC_11_REMINDERS.md) | 提醒基础 | 01、03、04、09、10；00 队列/worker 基础。 | NOT_STARTED |
| [12_ARCHIVE](epics/EPIC_12_ARCHIVE.md) | 时间与记忆视图 | 01、02、已完成的源域；AI 摘要受 09 隐私契约控制。 | NOT_STARTED |
| [13_HARDENING](epics/EPIC_13_HARDENING.md) | MVP 验收与加固 | 00–12 相关实现完成；不得以 hardening 为由推迟基础隐私。 | NOT_STARTED |

## 范围门槛

- EPIC 00 已获授权，可建立应用工程和开发服务配置；本次不创建业务 schema/迁移，也不提前实施 EPIC 01–13。
- 隐私、认证、服务端 owner、版本/事务与同步基础在 01 建立，下游源域不能等到 13 才加权限。
- 04/06 的文件引用待 07 联调；09/10 与 11 完成 Assignment + Task + Reminder 黄金流程；13 验证完整 18 步。
- Core 跨设备正确与禁用 AI 后可运行贯穿源域；ARCHIVE 和 HOME 不成为源域第二真相。
- 只实现 [MVP_SPEC](MVP_SPEC.md)；完整 WALLET/SOCIAL、native iOS、未来 Life Packs 等仍 deferred。

## 每个 EPIC 的工作顺序

检查仓库与授权 → 读必要文档 → 简短计划/冲突检查 → 验证 zcode 并委派低风险工作（不可用时按用户授权改用 Qoder）→ 实现 → 负责人审查生成结果 → 相关测试 → 报告验收。工具不可用时报告精确阻塞，不静默转由 Codex 承担大量重复起草。

Done 包含正确持久化、授权、验证、失败行为、必要事件、测试与验收；界面渲染不足以证明完成。

未决项见 [DECISIONS_AND_OPEN_QUESTIONS](DECISIONS_AND_OPEN_QUESTIONS.md)。

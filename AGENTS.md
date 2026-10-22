# LIFE HUD 工作规则

## 权威与当前范围
- 用户明确指令优先；已由用户授权采用的原始规格为 [docs/source/epic0.txt](docs/source/epic0.txt)。派生文档必须与它一致，歧义见 [决策记录](docs/DECISIONS_AND_OPEN_QUESTIONS.md)。
- 所有本项目生成文件必须位于 `E:\LIFE HUD` 内，包括临时文件、日志、缓存、草稿、工具状态和最终输出。可读取外部已安装工具，不得将项目输出写到外部。
- 用户于 2026-10-16 明确允许仅对 Docker 自身的用户配置、日志和 CLI 插件使用 Windows 用户目录；项目代码、数据库、文件、容器磁盘和项目缓存仍必须留在项目内。实际位置和首次安装修复见 [容器记录](docs/CONTAINER_SETUP.md)。
- 用户于 2026-10-21 明确允许 WorkBuddy 自身登录、连接器、会话及任务日志使用其现有 Windows 用户目录；项目代码、部署材料、缓存和 Codex 输出仍留在 `E:\LIFE HUD`。不得复制工具凭据或将其送入模型上下文。
- 当前阶段：`PHASE_9A_PUBLIC_DAILY_DRIVER`，用户已认可 Phase 8 运行时验证并明确授权使用本机 WorkBuddy 部署现有完整栈，依据 [PHASE 9A 原始要求](docs/source/phase9a-public-daily-driver.txt)，见 [部署预检与实际状态](docs/PHASE_9A_PUBLIC_DAILY_DRIVER.md)。仅部署现有功能、必要生产安全适配与验证，保留本地开发；不进入 Reading、Mind Map 或其他领域。WorkBuddy 的 CloudBase 连接已成功，当前尚未上线；需解决共享 PostgreSQL 与现有标准协议连接的兼容性，并确认云托管开通前置及费用。未经证明 WorkBuddy 无法承载并报告阻塞，不引入其他托管商；不得把仅前端或连接家庭电脑的页面当部署成功。新 Phase 不自动映射旧 EPIC。
- Product architecture is authoritative. Ship is the implementation substrate. 原 Next.js / Fastify / BullMQ worker 技术决定已被替代。只实施当前明确授权的 Phase；未来完整智能系统不在本阶段。不得把文档验收、界面渲染或 mock 当作真实持久化/授权验收。工具状态不属于应用数据。

## 开始工作
1. 检查仓库现状，读取 [CODEX_START_HERE.md](CODEX_START_HERE.md)。
2. 识别当前获授权的 EPIC，只读取所需文档；提出简短计划并指出冲突。
3. 先验证 `zcode` 帮助或版本，将安全、重复工作委派给它；用户已明确允许 zcode 不可用时改用 Qoder，同样先验证入口与实际调用，再做实质实现。
4. 由负责人审查全部生成结果，运行相关检查，报告实际验收状态。

## zcode 委派
- 本机已验证：`node scripts/run-zcode.cjs --help` 和 `--version`；安装入口 `E:\cc\ZCode\resources\glm\zcode.cjs`。运行方法与限制见 [docs/LOCAL_TOOLING.md](docs/LOCAL_TOOLING.md)。
- 适合：固定契约下的文档整理、重复类型/接口、UI 样板、fixtures、测试用例扩展、窄范围 lint 修复。
- 不委派最终权限：产品架构、领域边界、数据库所有权、schema 架构、破坏性迁移、认证/授权、隐私、密钥/密码学、AI 安全、跨域事务、冲突解决、重大重构、依赖策略、最终审查与验收。
- 输出均是待审草稿。必须亲自检查、纠正、验证后整合；不能盲信或自动合并。
- 无法调用时记录精确错误，不悄悄跳过，也不由 Codex 接管大量应委派工作。
- 替代工具：用户于 2026-10-14 明确指示“zcode 没办法用就用 qoder”。Qoder 沿用相同的委派边界、项目内文件隔离、秘密保护、负责人审查与验收要求；帮助/版本通过不等于模型委派成功。其接入不改变当前 EPIC 授权范围。
- 每次实现会话报告 Codex 工作、zcode 工作、纠正情况。文档会话也采用此报告方式。

## 不可破坏的产品与数据边界
- 模块化单体；Core / Voyage / University Pack。大学是首个 Voyage，当前只实现 University Pack；不扩展未来 Life Packs、完整 WALLET/SOCIAL、微服务或图数据库。
- Core Task 与 University Assignment 分离；`planned time != deadline`；延期不能悄悄改变截止时间；`DONE != SUBMITTED`。
- StatusMoment 可部分输入，每日多条，不能覆盖；Cycle 高隐私；不作医疗诊断。
- `input != mastery`；不伪造反思、情绪、经历或意图；不生成虚假优先分、技能百分比或羞辱性 FAILED UX。
- HOME 聚合且允许安静/空状态；ARCHIVE 是引用/时间视图；原始 Captain's Log 与 AI 摘要分开。
- Person、Place、File、Project 属于 Core；课程材料引用 File；跨域发生通过 RealWorldEvent/EntityLink 关联，不合并领域表。
- LLM 只提出结构化 Action Proposal。经过 schema validation → authorization → risk check → Domain Service → DB transaction → Audit / Outbox → Action Result；LLM/UI 均不得直接变更数据库。
- owner 由服务端认证身份决定；重要可变记录乐观版本控制；适当软删，真实隐私删除需硬删；用户数据可导出。
- Privacy：NORMAL / PRIVATE / HIGH_PRIVATE / VAULT；AI policy：ALWAYS / WHEN_RELEVANT / EXPLICIT_ONLY / NEVER。技术访问不等于 AI 上下文授权；只提供相关最小上下文，敏感访问可审计。
- R0 只读；R1 低风险可撤销；R2 有意义/批量/破坏性操作需确认或强撤销；R3 敏感/不可逆/外部行动需明确确认。
- Lim 是导航员，支持 EXECUTE / ASSIST / TALK；允许沉默；用户纠正优先于推断；“什么也不留”禁止会话后长期记忆持久化。
- 移动底栏固定 HOME / QUEST / ◉ LIM / STUDY / MORE；LIM 是保留 route/entity context 的全局 overlay。

## 完成与安全
- 业务完成须有正确持久化、所有权/授权、验证、失败行为、必要事件、测试和验收；界面可渲染不代表完成。
- 不实现未来 EPIC、不暗中扩大 schema、不安装无必要框架、不隐藏失败、不在测试失败时宣称成功。
- `.local/` 内含工具认证与运行状态，禁止提交、输出密钥、分享或提供给模型上下文；检查 Git 忽略规则。

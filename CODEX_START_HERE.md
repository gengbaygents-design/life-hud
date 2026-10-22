# LIFE HUD · 从这里开始

当前阶段：**PHASE_9A_PUBLIC_DAILY_DRIVER，已授权，尚未部署；WorkBuddy 已连接 CloudBase，核实数据库兼容性与云托管前置**，依据用户 [原始要求](docs/source/phase9a-public-daily-driver.txt)，见 [部署预检与实际状态](docs/PHASE_9A_PUBLIC_DAILY_DRIVER.md)。Phase 8 运行时验证已获认可；当前仅部署现有功能与必要生产安全适配。

Product architecture is authoritative. Ship is the implementation substrate.

1. 读 [AGENTS.md](AGENTS.md)、[产品索引](docs/DOCUMENT_INDEX.md)、[重建记录](docs/SHIP_REBASE.md)。
2. 原始 [规格](docs/source/epic0.txt) 按字节保留；原产品原则和边界仍有效，旧框架决定以已授权 Ship 方案替代。
3. 读 [当前运行说明](docs/SHIP_LOCAL_DEVELOPMENT.md) 和 [实际验收](docs/SHIP_REBASE_ACCEPTANCE.md)。旧 EPIC 00 计划/验收为历史记录，不作为当前栈验收。
4. 优先验证并委派 zcode；实际不可用时按授权改用 Qoder。只发送已选择的低风险内容，工具状态和密钥不得进入模型上下文；结果须负责人复核。
5. [Docker 与真实基础服务已验收](docs/CONTAINER_SETUP.md)，保留本地一键启动和现有服务。本次公网部署必须通过本机 WorkBuddy，不能用静态预览代替全栈；完成后停止，不开始 Reading、Mind Map、长期 Memory 或 Night Voyage。用户已允许 Docker 自身配置/日志/CLI 插件的用户目录例外，应用数据和容器磁盘仍在项目内。

`apps/web` 为 TanStack Start；`apps/api` 为 Hono/oRPC 及 Ship scheduler；`packages` 为 Ship 共享基础；`scripts` 包含 Windows 本地启动、隔离工具和文档检查。没有独立 worker 应用。

来源检查基线是 [公开清单](docs/source/source-extraction-manifest.json)。运行 `node scripts/validate-docs.cjs` 和 `node scripts/check-doc-validation.cjs`；二者仅验证文档，不能证明应用可用。

运行时问题的已证实事实、归因限制和实际测试见 [运行时修复记录](docs/PHASE_8_RUNTIME_FIX.md)。不自动开始下一阶段。

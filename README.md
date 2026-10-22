# LIFE HUD

Product architecture is authoritative. Ship is the implementation substrate.

Ship 基础及 Phase 1–7 已验收，Phase 8 视觉与运行时修复已保存。用户已授权 [PHASE 9A · WorkBuddy 公网 Daily Driver](docs/PHASE_9A_PUBLIC_DAILY_DRIVER.md)；WorkBuddy 已连接 CloudBase，尚未部署，正在核实数据库兼容性及云托管前置，不增加产品功能。

- [工作入口](CODEX_START_HERE.md)
- [产品文档索引](docs/DOCUMENT_INDEX.md)
- [Ship 来源、取舍与保留记录](docs/SHIP_REBASE.md)
- [本地开发与启动](docs/SHIP_LOCAL_DEVELOPMENT.md)
- [领域映射](docs/SHIP_RESOURCE_MAPPING.md)
- [实际验收状态](docs/SHIP_REBASE_ACCEPTANCE.md)

日常使用：在项目目录双击 [Start LIFE HUD.cmd](Start%20LIFE%20HUD.cmd)，后台启动并自动打开页面。电脑重启后再次双击即可；无需一直保留聊天或启动终端。细节见 [启动说明](docs/SHIP_LOCAL_DEVELOPMENT.md)。

```powershell
node scripts/run-pnpm.cjs install --frozen-lockfile
node scripts/local.cjs start
```

本机 [Docker 与基础服务已验收](docs/SHIP_REBASE_ACCEPTANCE.md)。启动命令会优先使用项目安装的 Docker，并在需要时启动引擎；缺少运行环境时明确停止。Web 地址为 http://127.0.0.1:3002，可创建自己的本地账户。

旧工程已保存在提交 `0c7a8ca` 和备份分支 `codex/backup-before-ship`；活动代码只有 Ship 架构。许可证见 [LICENSE.ship](LICENSE.ship)。

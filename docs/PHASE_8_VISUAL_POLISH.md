> 用户尚未接受 PHASE 8。以下为上一轮历史验收记录，本轮运行时诊断修复见 [修复记录](PHASE_8_RUNTIME_FIX.md)，原始 JSON 500 尚未完全归因；不能据历史记录宣称用户验收完成。

# PHASE 8 · VISUAL POLISH v1

依据用户 [本阶段原文](source/phase8-visual-polish.txt)，已于 2026-10-17 完成本地验收。本阶段仅修改 Web 视觉与 UX、验收脚本和阶段文档；没有修改领域 API 实现、schema、迁移、依赖或业务状态机。分支 `codex/visual-polish`。完成后停止，不自动开始新功能。

## 设计系统与页面

以清晰、安静的个人空间为主，蓝黑背景、克制冰蓝强调和很淡的星点/轨道为辅。集中 surface、文字、accent、状态色、边框、阴影、圆角、间距、排版及 180ms 交互 token，保留原世界观参数。中文正文 15px，辅助文字 13px，微文字 12px，表单 16px；减少大写字距、等宽小字、重复页眉和装饰。Glass/HUD/Focus/Quiet/Alert 五种表面共享中央契约，减少卡中卡；各模块使用相同按钮、状态标签、空态和 loading skeleton。移除正常 UI 中的 SHELL 01 与过时的外壳预览说明。

| 区域 | 最终呈现 |
| --- | --- |
| HOME | 移动顺序为焦点、Today、紧凑状态、小型 Lim、必要提示和航程；有行动时突出内容和动作，安静时缩成轻量留白。Today 使用时间、类型和标题行；桌面两栏聚焦，不强填三栏。 |
| QUEST | 保留 NOW/TODAY/INBOX；突出 NOW、清晰区分计划和截止、缩小次要动作；完成用安静成功色，调整与放下不使用失败红色。 |
| STUDY | DOM、阅读和移动顺序统一为今日课程、作业、课程、资料；减少管理工具条权重，完成/提交仍分别显示，完成未提交保留克制提醒。 |
| STATUS | 心情捕捉保留六个简单选项，详情可选；状态瞬间、睡眠、饮水和基本趋势分层，去除嵌套卡片；私密周期访问边界不变。 |
| GROWTH | 以学习原文、来源、定性技能和证据计数为主，记录与项目分层，没有 XP、等级或虚假百分比。 |
| ARCHIVE | 轻时间线边框、正文优先、次级日期和隐私信息；查看原记录改为轻动作，日志原文与访问策略保持原契约。 |
| REMINDERS | 紧凑条目和清晰通知状态，仍在 MORE；取消/收起降低视觉权重，不改变确认、去重和调度。 |
| MORE | 保留 LIFE/MEMORY/TOOLS/SETTINGS，改为分组行入口，去除巨型同权重卡片网格。 |
| Lim | 小型首页存在感；手机 sheet/全屏、桌面 440px 侧面板；轻消息区分、小收据与 Undo、自然不可用提示、窄屏选择器；保留 route/entity context、焦点与背景滚动。 |

导航仍为 HOME / QUEST / ◉ LIM / STUDY / MORE。桌面持久侧栏，手机底栏含 safe area；图标继续统一使用既有 Lucide。焦点可见、触控尺寸、表单标签、对话框内部滚动和 reduced-motion 共用基础样式；修正 React autoFocus 抢占后导致关闭任务弹窗无法回到入口的问题。保留真实错误与重试，正常 UI 不显示后端异常正文。

## 实际验收

- 375 / 390 / 430 / 768 / 1024 / 1440px：8 个实际页面 × 6 宽度，共 48 组，外加 6 个 Lim 面板；均无横向溢出。合成账户使用真实 API/数据库，没有 mock 领域响应。
- 54 张六宽度截图，加 HOME 09:10 即将上课、14:20 上课中、16:10 正常任务、20:30 截止行动、00:40 安静共 5 张，合计 59 张。已复核所需移动 HOME/QUEST/STUDY/STATUS/GROWTH/ARCHIVE/LIM/MORE、桌面 HOME/QUEST/STUDY/LIM 和五时间状态。截图与机器结果只在项目内 `.local/validation/phase8-*`，不提交。
- 375×600 短视口任务表单、关闭后焦点返回、Lim 焦点循环/恢复、中文心情标签、减少动态均通过。正文/辅助/微文字/强调/提醒/成功 token 对 elevated 表面的对比度均高于 4.5:1，最低 6.33:1。
- 81 项单元测试、typecheck 13/13、lint、生产 build 8/8（含根页预渲染）通过。生产页面/故障/导航/键盘回归 9 项通过，新增 loading→quiet、503→retry、原始错误不外露、短视口弹窗和 reduced-motion 断言。
- Core 27、University 25、STATUS/GROWTH 31、Lim、HOME-001–017、REM-001–011/ARCH-001–011 的既有真实业务验收通过。Core、University、STATUS/GROWTH、Lim、HOME 和 Reminder/Archive 的真实 Edge Golden 流程均通过，保留所有权、计划/截止、DONE/提交、原文字节和隐私断言。
- 真实认证/双用户隔离/Origin/私有 S3/重置邮件/会话撤销验收通过；文档与 24 项干净副本回归通过。12 份原产品文档及 epic0 哈希保持，Web 构建产物配置秘密匹配为 0。数据库仍为 39 张公开表、7 条迁移，合成验收账户清理完成。

视觉验收使用本机 Edge；没有声称实体手机、Safari 或完整屏幕阅读器审计。未发现本轮覆盖范围内的阻塞视觉问题。未扩大未实现的 WALLET/SOCIAL/Memory 等功能；既有未来入口如实保留。

## 工具、纠正与复现

zcode 0.16.9 帮助/版本可用，实际模型探测返回 HTTP 429 / provider 1113（余额或资源包不足）。按用户授权使用 Qoder 1.1.64，实际探测成功；交付 token 与个人模块重复样式草稿。Archive 长样式请求 180 秒超时，缩小契约后个人样式成功。负责人修正世界观变量前缀、固定网格防溢出、禁用态、间距 token 和卡片样式级联冲突；全部结果经过审查。

Codex 负责层级/密度、HOME、移动与桌面、Lim 交互、焦点修复、整合和最终验收。中途失败没有作为通过记录：首次就绪超时、验收脚本误用 Task 删除路由均已纠正；旧个人/Core/University 测试曾在不匹配的日期或 scheduler 停止时运行，恢复各自既定时钟和真实 Ship Outbox 消费后重跑通过，没有更改产品语义或降低断言。

复现：先运行普通 `node scripts/local.cjs start`（需要 Ship scheduler 消费 TaskCompleted），再在另一终端运行 `node --env-file=.env scripts/run-pnpm.cjs test:visual`。视觉脚本自行启动 3011/3012 的真实开发服务，以进程环境切时，不添加 HTTP 后门；只创建/清理自己的合成账户。生产 `test:e2e` 独占普通 3001/3002，需先停应用；Reminder/Archive 完整浏览器验收仍按前阶段说明独立调度。结束后普通 3001/3002 已恢复，无 DEV_NOW、模型 mock 或测试 owner 限定。

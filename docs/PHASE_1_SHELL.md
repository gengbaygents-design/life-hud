# PHASE 1 · LIFE HUD Shell

状态：COMPLETED（2026-10-16）。用户明确授权 [原始阶段要求](source/phase1-shell.txt)。这不是原 EPIC 01 Core Foundation；EPIC 00 保持已完成，原 EPIC 01–13 均不启动。按阶段要求在此停止。

## 实现边界

共享 AppShell 在桌面（1024px 起）提供持续左栏、内容工作区和 HOME 右侧 Lim presence；移动端与平板使用 HOME / QUEST / ◉ LIM / STUDY / MORE 底栏。页面、视觉组件与语义令牌共用，不分为两套应用。

HOME 展示 NEXT、今日安排、状态、Lim Brief 和 Voyage；QUEST 展示 NOW/TODAY/INBOX；STUDY 提供四个页内分区；MORE 提供 LIFE/MEMORY/TOOLS/SETTINGS 下的十个入口。示例内容不会调用业务接口或持久化，状态与 Lim Brief 不伪造感受或摘要。FILES 保留已验收的基础存储页面，不新增领域实现。

LimProvider 位于根布局，仅使用内存 UI 状态：isOpen、presentation、sourceRoute、sourceEntity、conversationId。打开时捕获来源路由（含 query/hash），不改变地址；支持 sheet/fullscreen。bridge 只保留类型，不提供实现或入口。实体来源显式传入，不隐式沿用上个页面实体；未创建实际会话。复用现有 Radix/shadcn Sheet、Dialog 和 Popover，管理焦点、Escape、背景滚动和关闭后的焦点恢复。

语义颜色及氛围令牌集中在 `apps/web/src/components/shell/tokens.css`，展示层不散落独立颜色。星点静态、装饰不阻挡操作、支持减少动态效果。Modal/Sheet/Popover 复用现有原语。

## 验收

| 验收 | 真实结果 |
| --- | --- |
| 移动与桌面 | 390×844、1440×1000 的四个主页面及 Lim 面板通过；另查 320px 窄屏与打开面板时切换至 1280px；未发现水平溢出 |
| 路由 | HOME / QUEST / STUDY / MORE 可导航；MORE 九个占位页及已有 FILES 入口可达；未知入口有返回路径；STUDY 分区锚点可用 |
| Lim / 可访问性 | 四路由来源保存、query/hash、sheet/fullscreen、Tab 循环、Escape、背景滚动锁定、关闭恢复焦点、跨断点隐藏入口时回到主内容通过；Modal / Popover 焦点通过 |
| 构建与静态检查 | 8/8 构建、13/13 类型任务；lint 零警告 |
| 回归 | 8 项单元测试；7 项生产浏览器用例通过，包含原基础故障回归及新 Shell 用例 |
| 真实服务浏览器 | 真实 Edge 注册、受保护导航与覆盖层、文件上传/确认删除、AI 缺密钥保留输入、退出与密码登录通过；本次合成账户和数据已清理 |
| 边界与秘密 | API、数据库、共享服务包、Compose 和依赖锁文件无变化；Shell 导航不发业务写请求；64 个 Web 文本产物未含生成秘密；原始产品文档与规格保留 |
| 文档 | 阶段授权明确与原 EPIC 分开；文档检查和 24 项回归通过 |

Shell 浏览器用例对身份查询使用固定界面替身，API 仍拒绝真实未登录请求；真实服务浏览器另行执行，不把替身验证当成认证或数据库验收。视觉截图已经过负责人逐项查看，入场动画完成后取证，避免中间帧误判。当前未发现阻塞性视觉问题。

[桌面 HOME](assets/phase1-shell-desktop.png) · [移动 HOME](assets/phase1-shell-mobile.png) · [移动 Lim](assets/phase1-lim-mobile.png)。截图仅有明确标注的展示示例，不含真实用户记录。

## 委派

zcode 0.16.9 帮助与版本通过，实际探测再次返回 HTTP 429 / 1113（资源不足）。Qoder 1.1.64 实际探测成功，完成 HOME/QUEST/STUDY、MORE、共享卡片与原语包装、页面网格/面板 CSS 草稿；两次 CSS 请求各超时 180 秒，未计成功，不再重复消耗调用。负责人完成响应式导航、共享令牌、Lim 状态与覆盖层、基础样式和最终整合；修正图标导入、网格放置、小 presence 选择器、面板层级、展示文案和弹窗焦点恢复。7 项浏览器回归验证这些修正。没有增加框架或提前实现业务领域；Bridge、完整 Lim、PWA 深度打磨均不开展。

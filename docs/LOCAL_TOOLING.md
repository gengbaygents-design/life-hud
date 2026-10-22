# 本机工具与 zcode / Qoder 调用记录

记录日期：2026-10-14（Asia/Shanghai）。项目固定路径：`E:\LIFE HUD`。来源：[原始规格](source/epic0.txt) 的委派策略和本次实测。

## 环境发现
- 新项目文件夹起初为空，已初始化 Git 仓库，分支 `main`，尚未创建提交或配置 remote。
- Git `2.55.0.windows.5`；本次脚本使用已安装 Node `v24.19.0`。这些是工具实测版本，不是未来应用的版本选型。
- `zcode` 未加入当前 PATH。桌面程序位于 `E:\cc\ZCode\ZCode.exe`，附带 CLI 位于 `E:\cc\ZCode\resources\glm\zcode.cjs`。
- 首次只执行 `--help`；后续 `--version` 均成功，CLI 为 `0.16.9`。

## 已验证调用方式
在项目根目录运行：

```powershell
node scripts/run-zcode.cjs --help
node scripts/run-zcode.cjs --version
```

单次提示可通过 `--prompt-file` 读取项目内 UTF-8 文本；提示作为进程参数数据传递，不拼入 shell 命令。文档委派使用 `--mode plan --json --no-color`，并禁用 Bash/Edit/Write/Read/Glob/Grep/Task/Agent/WebFetch/WebSearch 等模型工具。样例：

```powershell
node scripts/run-zcode.cjs --prompt-file .local/prompts/main-docs.txt --mode plan --json --no-color --disallowed-tools Bash Edit Write MultiEdit NotebookEdit Read Glob Grep Task Agent WebFetch WebSearch
```

正式输出需要重定向至 `.local/drafts/`；stderr 至 `.local/logs/`。调用最大 180 秒，超时只停止本次子进程。提示入口必须在项目内；默认 cwd 为项目根目录。

## 本项目文件隔离
- [run-zcode.cjs](../scripts/run-zcode.cjs) 将可写配置、工具日志、会话数据库、临时目录和缓存定位到项目 `.local/`。
- [zcode-isolation.cjs](../scripts/zcode-isolation.cjs) 在子进程内将 home 派生路径定位到 `.local/home`；不改变操作系统用户主目录或安装目录。
- 已有认证文件的加密副本仅保存于 Git 忽略的 `.local/home/.zcode/v2/`；保留原凭据的 cipher context，并仅在该副本补充 CLI 所需的 account identity。没有修改原始账户文件。
- 本次关闭插件、MCP、自动记忆和 subagent 功能；运行日志已确认存储和 working directory 均在项目内。
- `.local/` 包含认证与运行状态，禁止提交、分享或作为模型上下文。脚本不是操作系统级沙箱；将来开启模型写工具仍需检查任务路径和授权。

## 远程服务与精确阻塞
这套 zcode 是本机客户端，模型推理使用 Z.AI，配置接口为 `https://api.z.ai/api/anthropic`，本次实际请求模型为 `GLM-5.3`。不能声称是离线本地模型。

前次自动审批因完整规格发送授权不够明确而拒绝；在向用户明确说明内容和目的地后，用户回复“继续”，本次调用已获放行并实际到达服务。授权仅对应本次已说明的项目文档委派，不推广为任意远程数据发送权限。

服务返回：**HTTP 429 / provider code 1113**，消息：`Insufficient balance or no resource package. Please recharge.` 本次命令退出码为 1，**没有生成文档草稿**。未充值、未反复重试、未改用其他提供方。

## 本次完成方法
受账户资源阻塞后，使用 [populate-docs.cjs](../scripts/populate-docs.cjs) 在本机确定性提取原文章节，并填入文档骨架；没有调用另一模型大量重写。主要规格段落保留原文，EPIC 依赖/验收建议由负责人审查。脚本拒绝覆盖已有目标，已审文档应正常编辑，不重复运行生成器。

验证：`node scripts/validate-docs.cjs`。输出在 `.local/validation/`，验收说明见 [INITIALIZATION_ACCEPTANCE](INITIALIZATION_ACCEPTANCE.md)。

## Qoder 备用工具接入（2026-10-14）

用户明确指示“zcode 没办法用就用 qoder”。当前文档初始化范围不变；Qoder 沿用 zcode 的委派边界，所有结果仍由负责人审查。此前 zcode 的 HTTP 429 / 1113 阻塞未通过反复请求重试。

本机发现桌面程序 `E:\Qoder`、`E:\Qoder CN`，但当前 PATH 与默认 CLI 安装目录均未找到独立 `qodercli`。本次使用 `E:\Qoder\resources\app.asar.unpacked\node_modules\@qoder-ai\qoder-agent-sdk\dist\_worker\qoder-worker-runtime.obf.mjs`，其帮助及版本命令均成功，报告 **1.1.64**。这是桌面程序附带的内部 runtime，未来桌面更新可能改变路径；不是新安装的独立 CLI，也不保证后续版本兼容。

项目调用入口为 [run-qoder.cjs](../scripts/run-qoder.cjs)，子进程 home 重定向由 [qoder-isolation.cjs](../scripts/qoder-isolation.cjs) 提供：

```powershell
node scripts/run-qoder.cjs --help
node scripts/run-qoder.cjs --version
node scripts/run-qoder.cjs --probe
node scripts/run-qoder.cjs login
node scripts/run-qoder.cjs --prompt-file .local/prompts/qoder-doc-review.txt
```

`--probe` 仅要求回复 OK，不包含项目数据。`--prompt-file` 读取项目内 `.md` / `.txt` UTF-8 提示，通过进程参数传递；拒绝项目外路径、指向项目外的链接、Git 内部文件及 `.local/` 内非 `prompts/` 的运行状态文件。调用禁用所有内置模型工具、使用空 MCP 配置、禁用会话持久化和自动记忆，采用 `dont_ask`，不跳过权限检查。提示中的资料必须由负责人事先选取，禁止加入认证、密钥或 `.local/` 运行状态。只读文字检查的输出是待审草稿，不直接修改正式文件。

配置、home、临时目录、数据、缓存和诊断路径均配置在项目 `.local/qoder/` 内；继承的用户配置、插件和 MCP 不用于文档提示调用。未读取或复制桌面程序认证内容，未修改原始账户配置，未安装应用依赖。CLI 的 `--config-dir` / `QODER_CONFIG_DIR` 及非交互调用参数见 [官方命令参考](https://docs.qoder.com/cli/cli-reference)；认证方式见 [官方认证说明](https://docs.qoder.com/cli/authentication)。这仍是进程配置隔离，不是操作系统级沙箱，也不是离线推理证明。

**实际探测结果：退出码 1，`Not logged in · Please run /login`。** 返回 `is_error: true`，API 耗时及输入/输出 token 均为 0；没有产生文档草稿。日志留在 Git 忽略的 `.local/qoder/logs/`，不提交或分享。下一步是在项目终端执行上面的 `login` 命令，由用户完成账户认证，然后重跑 `--probe`；只有实际模型响应成功后才开始委派。不要把帮助/版本通过报告成委派完成，也不要把密码或 Token 粘贴进聊天。

后续“继续”会话再次运行 `--probe`，仍为上述未登录错误，随后实际启动了 `login`。登录命令进入 `Waiting for browser authorization...`，已生成 Qoder 官方浏览器认证页；生成登录页不代表认证完成，页面中的一次性参数不写入正式文档。已准备只含 27 份正式文档路径与标题的索引草稿提示，位于 `.local/prompts/qoder-doc-review.txt`；认证成功前未发送。帮助/版本探测与文档完整性检查均通过，当前委派仍取决于用户完成浏览器认证。

首次交互登录未收到 CLI 认证结果，触发包装脚本的 180 秒停止上限，精确消息为 `Qoder invocation timed out after 180 seconds.`。包装脚本已将交互登录等待上限调整为 600 秒，并重新提供登录页；模型提示/探测仍限定 180 秒，帮助/版本限定 30 秒。此前登录页可能已失效，应使用本次新页面，或在项目终端重跑 `login`。

再次续接读取登录进程结果，返回 **`Login failed: Device flow timed out after 5 minutes. Please try again.`**，退出码 1；随后探测仍返回未登录。600 秒仅是包装脚本的进程等待上限，不能延长 Qoder 自身五分钟的设备认证有效期；上一登录页已过期，不能继续用旧页面完成该次授权。未完成认证前不重复自动生成登录页；可由用户在项目终端运行 `login` 后立即完成浏览器确认。尚未拿到成功的认证结果，不能从浏览器当前地址推断已登录。

不依赖模型的本机整理已继续完成：直接从 27 份既有文档提取一级标题与路径，生成 [文档导航索引](DOCUMENT_INDEX.md)，负责人核对 2 / 11 / 14 分组、27 个唯一路径和全部标题一致性。该索引是确定性提取结果，不是 Qoder 产出。旧索引起草提示未发送；另备 `.local/prompts/qoder-index-check.txt`，在认证成功后可委派 Qoder 核对已完成索引，输出仍作为待审检查草稿。

## 浏览器确认成功但 CLI 未登录：网络排查与恢复

用户明确反馈已完成浏览器确认。负责人随后只对运行日志作固定错误分类，不输出日志、凭据或完整认证 URL；发现认证轮询存在 `ENOTFOUND`。可复用 [diagnose-qoder.cjs](../scripts/diagnose-qoder.cjs) 输出最近运行的固定错误类别计数，命令为 `node scripts/diagnose-qoder.cjs`；历史计数不代表当前认证状态或当前网络失败。

对照实测：受限执行环境内，直连 `openapi.qoder.sh` 返回 curl code 6（域名解析失败），通过既有本地代理返回 curl code 7（连接失败）；自动审批放行后在该环境之外执行相同只读 HEAD 检查，直连与代理均收到 HTTP 404，`center.qoder.sh` 也收到 HTTP 404。404 仅证明服务可响应，不表示认证已成功。Windows 系统代理已启用，但子进程没有代理变量；在获准联网的执行环境中直连可达，因此未修改全局代理或硬编码代理端口。相关机制见 [官方网络说明](https://docs.qoder.com/cli/network)。

先前仅将超时归为未完成浏览器确认不准确；可确认的阻塞是受限执行环境导致认证轮询网络失败。新的 `login` 调用经自动审批获准联网，CLI 返回 **`Login successful!`，退出码 0**。随后同一执行环境中的 `--probe` 返回 **OK、`is_error: false`、退出码 0**，实际模型连通性已验证。认证 URL、账户身份和凭据不写入正式文档；全局网络及账户配置未修改。

后续模型探测和委派必须在可访问 Qoder 服务的执行环境中运行。在 Codex 的受限网络环境中，应通过工具的正常审批流程取得联网权限；不要仅重复登录或延长等待时间。在普通项目终端中仍使用项目包装脚本，保持项目内配置、日志及临时目录隔离。

**本次索引复核实际完成：退出码 0，`is_error: false`，检查 27 份文档。** Qoder 返回的 missingPaths / duplicatePaths / wrongTitles / wrongRelativeLinks / unsupportedClaims 五个数组均为空。负责人核对了返回结构、文档数和全部检查结果，与此前本机逐项核对一致；无需纠正索引内容。Qoder 检查输出是待审结果，已由负责人确认后写入验收记录，原始返回和提取草稿仍保留在项目内 Git 忽略的日志/草稿目录，不作为公开附件。

诊断脚本另用合成日志验证：DNS/轮询错误可被分类，合成秘密标记、原始日志行和运行目录名均不输出，测试临时文件已清理。该脚本只读取运行日志并输出固定类别与布尔状态，不读取认证凭据；历史错误计数不能代替本次已成功的登录、探测和委派结果。

## 不依赖私有状态的文档验证

发现旧检查器仅在 `.local/validation/source-extraction-manifest.json` 存在时核对原文哈希与摘录；缺失该私有生成记录时会跳过检查。现改用必须存在的 [公开原文基线](source/source-extraction-manifest.json)，只保留 schema 版本、提取方法、原文路径/哈希及十份文档的章节映射，不包含认证或运行状态。原文哈希与此前已验证的原始附件基线一致；28 个映射章节均逐段与原文核对。

缺失/损坏基线、无效格式、缺失/重复/未知文档映射、空/重复章节、原文变化或摘录变化都会返回失败报告。缺失被引用文档也返回机器可读失败，不抛出中途未处理错误。EPIC 状态从唯一的实际“状态”行读取，支持加粗格式；正文中出现旧 NOT_STARTED 不能掩盖实际 IN_PROGRESS。Windows CRLF 文档按行结束规范化核对段落，原始附件哈希仍按原始字节计算。

[check-doc-validation.cjs](../scripts/check-doc-validation.cjs) 在项目内新建干净副本，不复制 `.local/` 或聊天备份，执行 23 个实际正/负回归场景；其中包含无私有记录的完整通过、来源变化/基线变化/状态变化失败，以及文档生成器的干净生成与防止部分覆盖。副本清理前验证绝对路径仍位于项目校验目录，正式规格和文档不受测试修改。运行方法：

```powershell
node scripts/validate-docs.cjs
node scripts/check-doc-validation.cjs
```

文档生成器也会输出同一公开基线，写入前先检查全部生成目标；只要存在已审目标就拒绝整批写入，不对当前已审文档重复生成。私有生成记录可保留为本机历史状态，但不再决定正式文档验证能否执行。

本轮已先验证 zcode/Qoder 版本，再将固定清单与失败场景建议委派 Qoder。首个调用触发 `Qoder invocation timed out after 180 seconds.`，退出码 1、未返回草稿；随后已把请求缩小为仅核对文档路径和章节名。最终工具实现与回归验收由负责人完成，不把超时算作委派通过。

缩小后的 Qoder 调用实际完成，退出码 0、`is_error: false`：检查十份映射，duplicateDocuments / duplicateSections / unknownSourceSections 均为空。负责人审查返回结构和清单，并与本机来源检查对照，一致，无需纠正公开映射。原始输出和审查草稿留在项目内 Git 忽略的工具目录。最终正式文档检查 **330 项通过、0 项失败**；干净副本回归 **23 项通过**。

## PHASE 8 视觉会话

zcode 0.16.9 实际探测为 HTTP 429 / provider 1113（余额或资源包不足）。Qoder 1.1.64 帮助、版本和实际探测通过；交付 token、个人模块样式草稿，Archive 长样式请求 180 秒超时未采用。负责人修正世界观变量前缀、网格防溢出、禁用态、间距 token 与卡片级联；只整合经复核的公开样式草稿。Codex 负责视觉层级、HOME/模块/Lim 整合、无障碍与最终验收，见 [阶段记录](PHASE_8_VISUAL_POLISH.md)。提示/草稿/日志均在项目内忽略目录，不包含用户数据或秘密。

## PHASE 9A · WorkBuddy 桌面连接

用户明确允许 WorkBuddy 自身登录、连接器、会话及任务日志使用既有 Windows 用户目录；这不放宽项目代码、部署材料、缓存及 Codex 输出的项目内路径要求。已安装入口为 `C:\Users\35889\AppData\Local\Programs\WorkBuddy\WorkBuddy.exe`，更新后实际版本 5.8.3。通过正常 GUI 使用用户已完成的 CloudBase 连接，不复制登录凭据、不重用旧版失败的代理或 CLI 认证。

项目内 `workbuddy-deploy/` 是 Git 忽略的隔离核查工作区，不是发布源码或权威产品文档；文档验证不读取该目录。查询提示仅含已选取的技术栈契约及非秘密资源问题；负责人亲自复核数据库接入、权限、计费与部署门槛，未将工具草稿或平台宣传当成完整部署验收。实际进度见 [PHASE 9A](PHASE_9A_PUBLIC_DAILY_DRIVER.md)。

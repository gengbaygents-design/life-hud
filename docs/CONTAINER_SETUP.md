# 本地容器环境

2026-10-16 已实测 Docker Desktop 4.95.0、Docker Engine 29.8.2（Linux）、Compose 5.6.0。用户完成固件设置并重启后，HypervisorPresent=true；WSL 3.0.3.0 与相关 Windows 功能可用。应用服务结果另见 [实际验收](SHIP_REBASE_ACCEPTANCE.md)。

采用 [官方 Windows 安装参数](https://docs.docker.com/desktop/setup/install/windows-install/)的当前用户模式、WSL 2、禁止 Windows containers、自定义安装和磁盘目录。固定 build 242831 的 [官方 SHA-256](https://desktop.docker.com/win/main/amd64/242831/checksums.txt) 为 `73431db38491f770543880366228a23c993f84d1e8e045f56d83b8a98940cf76`；完整下载匹配，Authenticode 为 Valid、Docker Inc。未关闭校验、修改 BIOS 或自动重启。

| 内容 | 实际位置 |
| --- | --- |
| Docker 安装 | 项目 `.local/docker-desktop/` |
| 镜像、容器层和 WSL 数据磁盘 | 项目 `.local/docker-runtime/disk/docker_data.vhdx` |
| WSL 系统磁盘 | 项目 `.local/docker-runtime/main/ext4.vhdx` |
| CLI 配置 / 后端状态与日志 | 项目 `.local/docker/` / `.local/docker-profile/Local/Docker/` |
| Roaming 配置实体 | 项目 `.local/docker-roaming-runtime/` |
| 应用数据库、对象和邮件 | 项目 `.local/infra/` |

用户本日明确允许 Docker 自身的用户配置、日志和 CLI 插件使用 Windows 用户目录；不扩展至应用数据、项目代码、容器磁盘或项目缓存。安装器没有完全遵循进程 APPDATA / LOCALAPPDATA，首次仍写入默认目录，不能仅凭参数宣称所有状态在项目内。

首次启动发现默认 AppData 的 Docker 目录继承 EFS 属性，同目录普通文件重命名也返回 EXDEV；项目目录同样操作成功。“仅临时目录跨盘”的初步判断已纠正，改为同盘临时目录仍不能解决。没有解密 AppData、修改系统加密策略或恢复出厂设置。

本次新建的 Roaming 配置逐文件复制、验证哈希并备份后，将 `%APPDATA%\Docker` 建为指向项目配置实体的目录联接。Local 配置/日志也已复制并验证哈希；其中停止后的 IPC 文件无法正常访问，未复制其内容，也未继续强制删除。当前后端通过进程 LOCALAPPDATA 使用项目内目录，旧默认目录残留不作为运行数据源。CLI 插件副本可位于 `%USERPROFILE%\.docker\cli-plugins`，属于用户允许的例外。不要手工删除联接目标、移动已有 VHDX 或恢复出厂设置；以上是本机首次空安装修复记录，不是通用迁移脚本。

`node scripts/local.cjs start` 优先使用项目安装的 Docker，设置 Compose 插件目录与凭据助手 PATH；引擎未运行时启动 Docker Desktop 并最多等待两分钟。详见 [本地开发](SHIP_LOCAL_DEVELOPMENT.md)。`node scripts/check-container-host.cjs` 仅检查主机前置，不证明应用服务通过；WMI 信息为空时返回 CHECK_UNAVAILABLE，不误报固件关闭。运行中的 Hypervisor 是硬件就绪的有效证据。

zcode 0.16.9 与 Qoder 1.1.64 入口成功；zcode 先前 HTTP 429 / 1113 资源阻塞没有反复重试。Qoder 本次实际生成通用 Node 环境目录映射草稿，负责人增加绝对路径校验、Compose 插件发现和凭据助手 PATH，并按实测纠正 APPDATA 映射不能约束全部 Windows 组件的问题。安装、安全、数据位置和最终验收由负责人处理。此前 180 秒超时不计为成功草稿。

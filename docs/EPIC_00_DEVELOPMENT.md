> 历史记录（已替代）：本文记录原手工 EPIC 00 方案和当时检查结果；当前以 [Ship 重建](SHIP_REBASE.md)、[开发说明](SHIP_LOCAL_DEVELOPMENT.md) 及 [验收](SHIP_REBASE_ACCEPTANCE.md) 为准。下列旧命令不再适用于活动工程。

# EPIC 00 开发与验证

范围：工程与 Compose 配置。EPIC 00 为 IN_PROGRESS；业务认证、实体/schema/迁移、大学功能及 AI 业务调用尚未实现。

## 工具链

Node `24.19.0`，pnpm `11.25.0`；精确依赖在 package manifests 与 pnpm lockfile 中固定。项目工具使用已安装的 pnpm，缓存、仓库、配置、状态和临时目录由 `scripts/run-pnpm.cjs` 定位在项目 `.local/` 中。pnpm 11 的普通设置位于 `pnpm-workspace.yaml`，`.npmrc` 只保存公开 registry 地址；原生包构建仅允许 esbuild、sharp、msgpackr-extract。安装保留完整性及供应链检查；精确固定的新版本排除项已逐项保留在工作区配置中。

Node 使用 Windows 系统 CA，保持 TLS 校验；网络需要代理时在当前终端提供既有 HTTP_PROXY/HTTPS_PROXY，配置不写入全局设置，也不把认证信息放入工作区文件。安装不要改用未审提供方或关闭 TLS 校验。

## 启动

在项目根目录运行：

```powershell
node scripts/init-env.cjs
node scripts/run-pnpm.cjs install --frozen-lockfile
node scripts/run-pnpm.cjs build
node scripts/run-pnpm.cjs dev
```

`init-env` 只在没有 `.env` 时生成随机本地开发密码，不打印值、不覆盖已有配置。`.env` 被 Git 忽略；`.env.example` 不包含真实密码。工具侧 Qoder 认证不用于应用服务。

Web 为 `http://127.0.0.1:3000`，API 为 `http://127.0.0.1:4000`，worker 健康端口为 `http://127.0.0.1:4001`。API/worker `/health/live` 表示进程可响应；`/health/ready` 验证实际依赖，未就绪时为 HTTP 503。Web 使用 API 的真实就绪结果，缺失基础服务时显示等待状态。原生生产启动可在构建后分别运行 `--filter @life-hud/web start`、`--filter @life-hud/api start`、`--filter @life-hud/worker start`。

当前没有业务写入 API。`domain`、`auth`、`ai` 包只是预留边界，不提供已实现能力；`db` 仅提供连接池，未建立业务表。

## Compose 配置与服务验收

当前按用户选择不安装 Docker。离线配置检查：

```powershell
node scripts/check-infra-config.cjs
```

`compose.yaml` 使用 JSON 形式的合法 YAML，便于无附加依赖的离线结构核对；Docker Compose 通过该文件运行。PostgreSQL `17.11`、Redis `7.4.8-alpine`、SeaweedFS `4.48` 精确固定标签，端口仅绑定 127.0.0.1，持久目录绑定 `.local/infra/`。S3-compatible 本地实现选用 SeaweedFS 单进程 `mini`，只映射 S3 端口；初始凭据与 bucket 通过本地 `.env` 提供。官方部署方式见 [SeaweedFS Quick Start](https://github.com/seaweedfs/seaweedfs/wiki/Quick-Start-with-weed-mini)。这是开发服务选择，应用契约保持 S3-compatible。

具备 Docker 后，先确保 Docker 引擎的项目镜像/缓存存储位置也符合项目路径约束，再运行：

```powershell
node scripts/run-compose.cjs validate
node scripts/run-compose.cjs up
node scripts/run-pnpm.cjs infra:smoke
node scripts/run-compose.cjs down
```

`validate` 使用 `config --quiet`，避免打印展开后的秘密；`down` 不删除数据目录。`infra:smoke` 验证 PostgreSQL 查询、S3 文件往返、worker 队列消费，只使用 UUID 标识的自身探测对象和 job，并清理这些探测记录；没有业务数据或迁移。服务缺失时返回 PENDING_SERVICES 和非零退出码，不宣称联调通过。

## 工程检查

```powershell
node scripts/run-pnpm.cjs build
node scripts/run-pnpm.cjs typecheck
node scripts/run-pnpm.cjs lint
node scripts/run-pnpm.cjs test
node scripts/run-pnpm.cjs test:tooling
node scripts/run-pnpm.cjs test:e2e
node scripts/validate-docs.cjs
node scripts/check-doc-validation.cjs
```

浏览器测试使用本机 Edge，无需另下载浏览器；端口 3080/4080/4081，与普通开发端口分开。依赖故障场景显式指向不可用的 loopback 端口，验证真实 503 和等待状态，不依赖本机是否启动了开发服务。报告、截图、临时浏览器状态均位于项目 `.local/`。PWA 只包含 manifest、图标与不持久化数据的导航离线提示；不实现离线业务同步或推送。

完整 EPIC 00 验收必须同时具备工程检查和实际基础服务 smoke 结果；仅工程构建或 Compose 静态通过不代表业务/MVP 通过。

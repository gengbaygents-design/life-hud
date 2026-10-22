> 2026-10-15 工程更新：Product architecture is authoritative. Ship is the implementation substrate. 产品规则与原文摘录保留；其中 Next.js / Fastify / BullMQ 等旧技术方案已被用户授权的 Ship 重建替代。当前工程与验收以 [重建记录](SHIP_REBASE.md) 为准。

# 已确定约束与待决事项

来源：[原始规格](source/epic0.txt)。本文件区分规格既定事实与待设计细节，不批准 EPIC 实现。当前 `EPIC_00` 已获用户明确授权并实施中；后续 EPIC 均 `NOT_STARTED`。

## 已确定
- 输出路径固定 `E:\LIFE HUD`；本次可建立 EPIC 00 工程和 Compose 配置；暂不安装 Docker，不写业务代码或 schema/迁移。
- 模块化单体、Core / Voyage / University Pack、PostgreSQL 起步、领域服务掌握业务规则、AI 结构化行动安全流水线、隐私/所有权基础均是约束。
- 原文的仓库布局及 Next.js/React/TypeScript、Fastify、Drizzle、BullMQ/Redis、S3-compatible、Zod、Vitest/Playwright、pnpm/Turborepo 是建议技术方向。沿此方向冻结 EPIC 00 版本和工程依赖；具体计划见 EPIC_00_PLAN。Drizzle 表/迁移及应用认证在后续需要时实现。
- 主计划中的依赖和各 EPIC 详细验收是从固定范围整理的实施建议，不是已实现行为或源规格新增要求。

## 后续实施前需明确
| 事项 | 源规格已限定 | 待决细节 / 最迟处理阶段 |
| --- | --- | --- |
| 认证和部署 | 身份服务端可信，跨设备持久正确 | 会话方案、provider、运行/部署方式；EPIC 00/01 |
| 依赖与基础设施 | 上述建议技术栈，模块化单体 | 支持版本、PostgreSQL/Redis/object storage 本地供应方式；EPIC 00 |
| Core Event / RealWorldEvent / ActionGroup | 概念均存在，跨域记录不可合表 | 生命周期、事务边界、关联/行动组契约；EPIC 01，跨域前冻结 |
| Task 状态 | 六个初始状态；计划与截止分离 | DELAYED 后重新计划的合法迁移、NOW/TODAY 查询规则；EPIC 03 |
| Task 完成 → Assignment | 完成 Task 后 Assignment **可能** work DONE，绝不自动 SUBMITTED | 多 Task 与 Assignment 完成判定、明确动作/提示规则；EPIC 04/09 |
| 多对象行动与重试 | Assignment + Task + Reminder；Domain Service / DB transaction / Audit / Outbox | 原子性、幂等键、失败回滚、重试/撤销策略；EPIC 01 契约，EPIC 09/11 完成 |
| 同步与版本冲突 | 重要记录乐观版本，刷新/第二设备数据正确 | 同步协议、冲突界面、时间/时区语义；EPIC 01/03，EPIC 13 验证 |
| STATUS basic | StatusMoment 部分输入/多条；Sleep/Water/Exercise/Cycle 概念 | 各记录实际 v0.1 深度；Cycle 必须高隐私，不因概念列表默认扩张；EPIC 05 |
| Files 与 Search | Core File 权威、引用不复制、访问受控 | 文件大小/type、解析范围、索引粒度及删除传播；EPIC 07/08 |
| 敏感隐私与删除 | AI policy 与技术访问分离、敏感访问审计、导出和真实硬删 | 权限粒度、保留/撤销/删除处理及审计内容最小化；EPIC 01，相关域实现前 |
| Lim Provider / Memory | 禁止直接 DB mutation，纠正高于推断，“什么也不留” | 模型提供方、记忆候选升降、可审计规则；EPIC 09，仅 basic memory，不实现高级 Night Voyage |

## zcode 环境说明
找到的是本机安装的 ZCode **客户端/CLI**，不是已证明可离线运行的本地模型。帮助命令可运行，不代表模型服务调用一定可用；以实际委派结果记录可用性。规格要求使用该工具已遵守，不能把客户端安装位置写成“模型完全在本机推理”的结论。

## EPIC 00 已冻结事项

用户已明确启动 EPIC 00，并选择先完成工程和 Compose 配置，暂不安装 Docker。Node 24.19.0 / pnpm 11.25.0 及项目内存储目录已验证；精确依赖见 package manifests / pnpm lockfile。Web、API、worker 和共享包的工程边界、liveness/readiness、配置验证及故障测试已落实。

开发服务采用 PostgreSQL 17.11、Redis 7.4.8-alpine、SeaweedFS 4.48 的 S3-compatible 单进程配置；端口 loopback，数据目录位于项目内。供应方案已选择，实际镜像拉取与容器联调仍待 Docker 环境具备。认证、业务 schema/迁移和其他源域规则保留到相应 EPIC，由负责人设计/审查。

阶段结果见 [EPIC 00 验收](EPIC_00_ACCEPTANCE.md)。以上文档记录不替代用户授权或业务验收。

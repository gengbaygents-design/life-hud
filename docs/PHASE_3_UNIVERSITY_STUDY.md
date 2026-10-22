# PHASE 3 · University Pack + STUDY

状态：COMPLETED（2026-10-16）。来源：[用户原始要求](source/phase3-university-study.txt)。保留已验收的 [Shell](PHASE_1_SHELL.md) 和 [Core/QUEST](PHASE_2_CORE_QUEST.md)。仅本地运行，本阶段完成后停止。

## 数据与边界

新增大学表 `semesters`、`courses`、`enrollments`、`class_sessions`、`assignments`、`exams`、`grades`、`course_material_links`，以及最小 Core `places`、`core_files`。沿用 Ship schema/methods/endpoints 垂直资源、现有 PostgreSQL、Core Task、Audit/Outbox、对象存储和 scheduler；没有新框架。数据库迁移前已保存项目内私有一致性备份，不提交数据库或工具状态。

Semester 创建时须属于用户当前 ACTIVE University Voyage。父级身份不可在普通编辑中替换；引用同时校验 owner 与未删除状态，并用复合外键约束同 owner。课次采用明确日期、同日开始/结束、IANA 时区和可空 Core Place，不引入重复规则引擎。Enrollment 是个人修读状态。Grade 只记录考核、分数、满分、权重与记录时间；不推导 GPA 或学习掌握度。

文件上传继续写入现有私有对象桶，同时建立 Core File 的 ID/key/name/type/size 元数据。CourseMaterialLink 只引用同 owner 的 File，课程不复制文件字节或元数据。下载必须通过已认证 owner 的 File ID 或原有 owner key 门禁；仍有效的资料引用阻止删除底层文件，用户先移除引用。存储删除失败不改变文件元数据；删除重试幂等。这里只添加最小身份桥接，没有 Files/Search 系统。

## Assignment 与 Task

默认创建作业时，在同一数据库事务插入独立 Assignment 和 Core Task，二者 UUID 不同；Assignment 的 `taskId`、Task 的 `sourceType=ASSIGNMENT/sourceId` 构成显式桥接。唯一约束防止同一来源重复生成 Task。可明确 `createTask=false` 仅记录课程要求；客户端不能通过 Task 普通接口伪造或更换 Assignment 来源。

Assignment 是课程要求与学术截止的权威。更新 dueAt 会在同事务调用 Core 的窄接口同步 linked Task 的硬截止并递增版本、写审计；不改变 plannedStart/plannedEnd。Task 延期只改计划；QUEST 编辑器对课程截止只读，服务端也拒绝独立改写。软删除 Assignment 保留用户的执行 Task 和历史；软删除 Task 后不再向它同步，不自动制造替代任务。

TaskCompleted 持久化 Outbox → University handler → Assignment.workState=DONE。API 与 scheduler 进程都注册相同处理器，沿用现有 15 秒分发；界面会重新读取，处理可能有短暂延迟。反应和 processedAt 同事务，支持重试和重复投递；已 DONE 不再次递增，已重开或已删除 Task 的旧事件不标记完成。锁按 Assignment → Task 顺序，与学术截止同步一致。

`workState=NOT_STARTED/IN_PROGRESS/DONE` 与 `submissionState=NOT_SUBMITTED/SUBMITTED` 是独立列；DONE + NOT_SUBMITTED 合法。只有显式 submit 设置提交状态与时间，unsubmit 可更正。直接在 STUDY 标记作业工作完成也不会偷偷完成 Core Task。Exam 创建只保存考试事实，不创建备考 Tasks。

AssignmentCreated / AssignmentUpdated / AssignmentCompleted / AssignmentSubmitted 与 ExamCreated 按实际动作记录。普通学期/课程/课次等编辑只保留有意义审计，不为无消费者变化扩展大量 Outbox 类型；既有 Core 发布默认行为保留。审计不记录页面浏览。所有可变资源带版本，过期提交返回 409；跨用户读取、写入和外键引用均返回无存在性差异的 404。

## 页面与开发数据

STUDY 的今日课程、课程、作业、资料读取真实 `/study` 一致性快照；考试和成绩为次级展开区。支持添加学期/课程/课次/地点、修读状态、作业编辑与独立提交、考试/成绩记录、上传 Core 文件再关联。课程详情沿用相同外壳并按课程筛选。错误与安静空状态分别呈现；不自动向普通用户填充虚构课程。

今日/current/next 均来自真实 ClassSession，开始包含、结束不包含，跨日期/时区排序确定。HOME 在课中优先呈现该课程上下文，QUEST 继续同时容纳个人与课程执行任务。未登录公开预览不请求个人大学数据。保留五项移动底栏、全局 Lim overlay、tokens 和现有组件。

仅 development 接受服务端 `DEV_NOW` ISO 时间；生产和 test 环境忽略它，没有调时 HTTP 端点。Core 的截止临近选择和大学课表共用此时钟。固定时钟的浏览器验收结束后恢复实时运行。

显式导入已有账户的开发数据：

```powershell
node scripts/run-pnpm.cjs seed:university --email existing-local-account --date 2026-10-16
```

确定性 owner UUID 和存在检查让重复导入不覆盖已编辑/已删除记录。样例包含大一上、四门指定课程、今日高数/AI 课次、次日英语、第三章作业及预计 35 分钟 Task、两周后的高数期中考试；无假成绩或自动复习计划。`--date` 可省略以采用当前开发时钟日期。fixture 清单由 Qoder 草拟，创建与幂等行为由负责人实现和实测。

## 验收与工具分工

全部实际通过：

- lint 无错误/警告；typecheck 13/13；生产 build 8/8，保留 TanStack 根页预渲染。
- 单元测试 4 个文件、31 项：原所有权/推荐/AI 离线契约，以及课前/课中/课后、时区/跨日/输入不变、开发/生产时钟与截止临近边界。
- 真实 PostgreSQL/HTTP/S3 大学验收 25 项，包含全部 UNI-001–017；另验证过期版本、无效字段、匿名拒绝、抑制自动 Task、审计、重复/旧事件、用户后续纠正优先、资料移除后重新关联、普通变化不生成多余事件和种子幂等。
- 真实 Edge Golden University Journey：UI 登录→创建学期/课程/课次/作业→关联 QUEST→周四 19:00 计划→21:00 延期且周五截止不变→STUDY 改下周一截止且计划不变→Task 完成→作业已完成/未提交分别可见→显式提交→重载保持→第二用户不可访问。另验证课程详情、390/1440px、无控制台页面异常，以及无关长任务已成为 NOW 首选时 HOME 仍将当前课程置于主位。
- 原 Core 真实服务 27 项及真实 QUEST Edge 流程通过；独立生产预览 Shell/认证失败/AI 离线回归 7 项通过。生产故障测试故意让依赖不可达，预期连接失败日志不代表真实服务验收失败。
- 正式文档 387 项及无私有状态的干净副本回归 24 项通过；12 份原始产品文档与 epic0 哈希保持。535 个可保存文件秘密扫描通过；74 个 Web 产物未匹配本地配置秘密。
- 最终数据库为 23 张公开表、4 条迁移记录；本轮 Core/University 合成验收账户为 0，未出现禁止的未来领域表。迁移前及阶段完成后的数据库备份均保留在项目私有目录。

开发固定时钟已移除，实时 API/Web/scheduler 恢复运行。源码在 `codex/university-study` 分支保存；Git 不包含 `.env`、工具认证、日志、数据库或对象数据。没有公共部署或推送。无遗留阻塞；事件反应沿用有界异步分发，提交始终需要用户显式操作。下一阶段须用户另行授权。

zcode 0.16.9 帮助/版本可用，本次实际模型探测返回 HTTP 429 / provider 1113，未视为成功。按用户既有授权改用 Qoder 1.1.64，实际探测 OK。Qoder 完成端点生成草稿、课程时段选择及边界测试、课程 fixtures、课表/作业卡和通用表单样板；组合 UI 调用一次 180 秒超时后拆小完成。纠正了删除端点输入/输出倒置、跨时区 next 排序、开发时钟格式验证、StatusChip 属性与现有 API 不符、表单忙时交互和小屏排版。所有生成结果均经负责人复核。

Codex 负责领域/schema 定义、所有权与事务、Core 桥接、事件处理、文件身份、真实 UI 绑定、服务及浏览器验收和最终安全检查。原始产品文档与 epic0 来源保持不变，旧 EPIC 状态不自动对应本 Phase。

不包含 STATUS/GROWTH、完整 Files/Search、Learning Records/Skills/Memory/Archive、Attention Engine、自动复习/GPA、Lim actions、Bridge、Night Voyage 或公共部署。

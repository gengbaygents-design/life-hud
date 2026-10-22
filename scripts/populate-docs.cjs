// Deterministic local fallback: no model calls and no new product architecture.
// Existing targets are never overwritten. Canonical passages are copied exactly.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const bytes = fs.readFileSync(path.join(root, 'docs/source/epic0.txt'));
const source = (bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le') : bytes.toString('utf8')).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const headings = [...source.matchAll(/={20,}\n([^\n]+)\n={20,}\n/g)];
const sections = new Map(headings.map((m, i) => [m[1], source.slice(m.index + m[0].length, headings[i + 1]?.index ?? source.length).trim()]));
const mappings = [
  ['PRODUCT_VISION', '产品愿景与当前边界', ['PRODUCT', 'PRIMARY PRODUCT MODULES', 'HOME']],
  ['PRODUCT_CONSTITUTION', '产品宪章', ['PRODUCT CONSTITUTION']],
  ['CORE_ARCHITECTURE', '核心架构', ['TOP-LEVEL ARCHITECTURE', 'TECHNICAL DIRECTION', 'SOURCE OF TRUTH']],
  ['DOMAIN_MODEL', '领域概念与所有权', ['TOP-LEVEL ARCHITECTURE', 'REAL WORLD EVENT', 'ENTITY LINK', 'QUEST', 'STATUS', 'GROWTH / LEARNING', 'ARCHIVE']],
  ['UNIVERSITY_PACK', 'University Pack', ['STUDY / UNIVERSITY PACK']],
  ['LIM_SPEC', 'Lim 规格', ['LIM', 'LIM MEMORY', 'CONTEXT BUILDER', 'PRIVACY']],
  ['DATABASE_SCHEMA', '数据库设计约束（概念阶段）', ['DATA CONVENTIONS', 'DOMAIN EVENTS / OUTBOX', 'ENTITY LINK']],
  ['ACTION_CONTRACT', '结构化行动契约', ['LIM ACTION SAFETY']],
  ['MVP_SPEC', 'MVP v0.1 范围与黄金流程', ['MVP v0.1', 'GOLDEN MVP JOURNEY']],
  ['DESIGN_LANGUAGE', '信息架构与视觉语言', ['MOBILE IA', 'VISUAL LANGUAGE', 'LIM VISUAL']],
];
const epics = [
  ['00_INFRA', '基础设施', '建立 Web/PWA、API、worker 与共享包的工程基础；沿既定建议栈评估环境、版本和开发服务。', '无；必须先获得用户明确启动 EPIC 00 的指令。', ['CORE_ARCHITECTURE'], ['从干净环境按说明启动/检查工程工具链。', '配置、临时输出和项目依赖缓存均位于 E:\\LIFE HUD；秘密不进入 Git。', 'infra 验收不包含业务功能；不提前实施后续 EPIC。']],
  ['01_CORE_FOUNDATION', 'Core 基础', '认证、服务端身份/owner、当前 Voyage、隐私授权、最小 Core 契约、版本/事务/事件及同步基础。只建已需要的实体。', '00；先冻结认证、必要 schema、事务与同步契约。', ['CORE_ARCHITECTURE', 'DOMAIN_MODEL', 'DATABASE_SCHEMA', 'ACTION_CONTRACT'], ['未认证和跨 owner 请求被拒绝；客户端 owner_id 不能决定所有权。', '版本冲突和失败不悄悄覆盖记录；事件与成功写入保持一致。', 'AI access policy 与普通数据访问分开；隐私规则在下游开始前生效。']],
  ['02_DESIGN_SHELL', '设计壳与移动导航', '响应式 Web/PWA 导航、共用 UI 和全局 Lim overlay 的上下文承载。', '00、01；核心业务只接入契约，不提前实现。', ['DESIGN_LANGUAGE', 'LIM_SPEC'], ['底栏为 HOME / QUEST / ◉ LIM / STUDY / MORE。', 'Lim 打开/关闭保留当前 route/entity context；大学课程场景不丢失上下文。', '空状态有效；MORE 中 WALLET/SOCIAL 仅保留入口，不建设完整模块。']],
  ['03_QUEST', '任务执行', '捕获、NOW/TODAY/INBOX、planned time、deadline、完成/延期/drop/历史；Core Task 权威。', '01、02；状态迁移和版本冲突规则需先确定。', ['DOMAIN_MODEL', 'DATABASE_SCHEMA', 'MVP_SPEC'], ['延期只调整执行计划，不静默修改 deadline。', '六个初始状态可按冻结规则持久保存，刷新后仍正确。', '验证完成/延期失败、跨 owner、版本冲突和必要 Task domain events；不默认展示 FAILED。']],
  ['04_UNIVERSITY_STUDY', '大学学习域', 'Semester、Course、Enrollment、ClassSession、Assignment、Exam、Grade、CourseMaterialLink 的当前核心；Assignment 与 Core Task 关联。', '01、02、03；课程材料引用待 07 联调。', ['UNIVERSITY_PACK', 'DOMAIN_MODEL'], ['学业要求与执行计划保存为不同对象；Course Project 引用 Core Project。', 'Task 完成不等于提交；Assignment work DONE 时仍可 NOT_SUBMITTED，显式提交才 SUBMITTED。', 'Exam 不自动生成一组复习任务；课程材料引用 Core File，必要大学事件正确发出。']],
  ['05_STATUS', '个人状态基础', 'StatusMoment 基本记录；Sleep/Water/Exercise/Cycle 的 v0.1 深度在启动时明确，不借概念列表扩大范围。', '01、02；高隐私策略先于敏感数据实现。', ['PRODUCT_CONSTITUTION', 'DATABASE_SCHEMA', 'MVP_SPEC'], ['mood-only 等部分输入有效，单日多条记录追加而非覆盖。', '记录持久化并按 owner 访问；Cycle 为 HIGH_PRIVATE。', 'AI 不作医疗诊断；StatusMomentRecorded、失败和隐私拒绝行为可验证。']],
  ['06_GROWTH', '学习意义与成长', 'Learning Record、Skill/Evidence、Project、Goal 的 basic 范围；来源、用户反思/问题/应用想法可分别保存。', '01、02；图片/来源 File 待 07 联调。', ['DOMAIN_MODEL', 'PRODUCT_CONSTITUTION', 'MVP_SPEC'], ['单纯保存或观看输入可以产生 CONTACT，但不自动提升为理解或 mastery。', '原始用户反思不被伪造/替换；保留 CONTACT → UNDERSTANDING → PRACTICE → INDEPENDENT → TRANSFER → OUTPUT 的证据区分。', 'LearningRecord 与 Project 的关联、必要事件、失败及所有权行为可验证；无虚假技能百分比。']],
  ['07_FILES', '文件基础', 'Core File 与 S3-compatible 原始文件存储基础；课程材料和 Learning Record 通过引用使用。', '01、02；先确定类型/大小、解析范围、隐私和删除传播。', ['CORE_ARCHITECTURE', 'DOMAIN_MODEL', 'DATABASE_SCHEMA'], ['上传、访问、失败行为经过 owner/权限验证；不因有文件而自动供 AI 读取。', 'CourseMaterialLink 引用 Core File，不复制原始文件；上传/解析状态有对应事件。', '在冻结范围内验证导出与真实隐私删除，原文件/索引/引用处理按契约执行。']],
  ['08_SEARCH', '搜索基础', '跨既有领域的 basic 搜索；源域保持权威，只取授权且未删除的数据。', '01、相关已完成源域；文件搜索依赖 07。', ['DOMAIN_MODEL', 'LIM_SPEC', 'DATABASE_SCHEMA'], ['普通用户搜索授权与 Lim 上下文 AI policy 分开判断。', '结果回到源对象；无跨 owner 泄露，删除和权限变更后的结果一致。', '覆盖空结果/不可访问/检索失败；不引入高级 RAG 或图数据库。']],
  ['09_LIM_CORE', 'Lim 结构化行动', 'EXECUTE/ASSIST/TALK、受限 Context Pack、Action Proposal 安全流水线和 basic memory；行动通过领域服务。', '01、02、所用源域；作业/Task/Reminder 黄金流程待 11 联调。', ['LIM_SPEC', 'ACTION_CONTRACT', 'UNIVERSITY_PACK'], ['schema validation → authorization → risk check → Domain Service → DB transaction → Audit / Outbox → Action Result 全链可验证，LLM 无直接 SQL mutation。', 'R0/R1/R2/R3 按风险和确认/撤销规则处理；跨域失败/重试不留下错误的部分结果。', '用户纠正高于推断，“什么也不留”不写长期记忆；AI 禁用后领域功能继续工作。']],
  ['10_HOME', '当下聚合', 'NEXT、当前/今日安排、紧凑状态、Lim presence 与重要提醒；基于可解释规则聚合。', '02、03、04、05、09；提醒待 11 联调。', ['PRODUCT_VISION', 'DESIGN_LANGUAGE', 'MVP_SPEC'], ['展示当前/下一课程或相关事件，来源保持在对应领域。', '“现在做什么”给一个主建议和一个备选，并能解释相关依据。', '允许空/安静状态，不制造任务、不显示虚假优先分、不自动暴露无关敏感资料。']],
  ['11_REMINDERS', '提醒基础', 'Reminder 与基础调度/投递/通知；作业关联 Task + Reminder 的跨域联调。', '01、03、04、09、10；00 队列/worker 基础。', ['DATABASE_SCHEMA', 'ACTION_CONTRACT', 'MVP_SPEC'], ['ReminderCreated/ReminderTriggered 与事实一致；重试/重复投递按冻结幂等契约处理。', '提醒尊重 owner、隐私、用户选择与相关性；有数据不等于应打断。', '作业 + Task + Reminder 行动按冻结事务边界处理，失败/撤销不改写 deadline 或伪造提交。']],
  ['12_ARCHIVE', '时间与记忆视图', 'basic 时间索引、Voyage/时期视角、Captain\'s Log 原文与分开的 AI 摘要、记忆标记/引用。', '01、02、已完成的源域；AI 摘要受 09 隐私契约控制。', ['DOMAIN_MODEL', 'LIM_SPEC', 'MVP_SPEC'], ['ARCHIVE 不复制源域数据成为第二数据库；“记住这一刻”创建标记/引用。', '原始 Captain\'s Log 文本权威，摘要可分辨且不静默覆盖。', '权限/删除/导出遵循基础契约；敏感旧记录不因技术访问而自动进入 AI 上下文。']],
  ['13_HARDENING', 'MVP 验收与加固', '对已完成 v0.1 进行完整黄金流程、权限/隐私/版本/失败/事件、PWA、持久化与跨设备验证。', '00–12 相关实现完成；不得以 hardening 为由推迟基础隐私。', ['MVP_SPEC', 'PRODUCT_CONSTITUTION', 'ACTION_CONTRACT'], ['逐项验证全部 18 步 Golden MVP Journey，包含 DONE 未 SUBMITTED 和显式提交。', '刷新/第二设备数据正确；AI 禁用时核心系统可用。', '验证导出、真实隐私删除、越权、冲突、失败/重试和必要事件；未过检查如实报告。']],
];
const publicManifestPath = 'docs/source/source-extraction-manifest.json';
const generatedPaths = [...mappings.map(([name]) => `docs/${name}.md`), 'docs/MASTER_PLAN.md', ...epics.map(([id]) => `docs/epics/EPIC_${id}.md`), publicManifestPath];
for (const relative of generatedPaths) {
  if (fs.existsSync(path.join(root, relative))) throw new Error(`Refusing to overwrite reviewed initialization artifact: ${relative}`);
}
const manifest = { schemaVersion: 1, method: 'deterministic-local-source-extraction', sourcePath: 'docs/source/epic0.txt', sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'), documents: [] };
function write(relative, content, sectionNames = []) {
  const target = path.join(root, relative);
  if (fs.existsSync(target)) throw new Error(`Refusing to overwrite reviewed document: ${relative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${content.trim()}\n`);
  manifest.documents.push({ path: relative, sourceSections: sectionNames, sha256: crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') });
}
for (const [name, title, sectionNames] of mappings) {
  const extra = name === 'DATABASE_SCHEMA' ? '\n本文件只记录概念约束；未批准物理表、字段类型、迁移或新增 schema。PostgreSQL 初始方向已定，详细 schema 在对应 EPIC 由负责人设计。\n'
    : name === 'ACTION_CONTRACT' ? '\nowner 必须来自服务端可信身份；提议中的实体引用、版本和权限需验证。动作具体 schema、幂等、跨域原子性/补偿和撤销契约尚待负责人冻结，不把风险级别当作授权。\n'
    : name === 'DOMAIN_MODEL' ? '\n实体归属见原文；主模块是产品视图，不能反推所有数据都归入一个模块表。Task / Assignment、完成 / 提交、原文 / 摘要等语义分别由源域保持。\n' : '';
  const text = sectionNames.map(n => {
    if (!sections.has(n)) throw new Error(`Source section missing: ${n}`);
    return `## ${n}\n\n${sections.get(n)}`;
  }).join('\n\n');
  write(`docs/${name}.md`, `# ${title}\n\n来源：[epic0.txt](source/epic0.txt)。当前阶段：PRE_EPIC_00；相关实现均 NOT_STARTED。以下英文段落按原文摘录，保留既定标识和规则。${extra}\n\n${text}\n\n## 实施与审查\n\n仅按 [MASTER_PLAN](MASTER_PLAN.md) 中获授权的 EPIC 实施；详细未决项见 [决策记录](DECISIONS_AND_OPEN_QUESTIONS.md)。文档中的要求是未来验收依据，并非已通过的测试。`, sectionNames);
}
write('docs/MASTER_PLAN.md', `# 主计划\n\n来源：[epic0.txt](source/epic0.txt) 的工程规则、MVP 与首项任务。当前 PRE_EPIC_00：文档初始化。EPIC 00–13 均 NOT_STARTED；用户本次“继续”是完成文档及既说明的 zcode 调用授权，不是启动 EPIC 00。\n\n## 阶段与依赖\n\n以下分解与依赖是依据固定范围整理的实施建议；详细架构/认证/schema 决策由负责人冻结。\n\n| EPIC | 范围 | 主要依赖 | 状态 |\n| --- | --- | --- | --- |\n${epics.map(([id,title,scope,deps]) => `| [${id}](epics/EPIC_${id}.md) | ${title} | ${deps} | NOT_STARTED |`).join('\n')}\n\n## 范围门槛\n\n- EPIC 00 必须等用户明确启动后才实施；本次不建应用脚手架、不安装项目依赖、不创建应用数据库或迁移。\n- 隐私、认证、服务端 owner、版本/事务与同步基础在 01 建立，下游源域不能等到 13 才加权限。\n- 04/06 的文件引用待 07 联调；09/10 与 11 完成 Assignment + Task + Reminder 黄金流程；13 验证完整 18 步。\n- Core 跨设备正确与禁用 AI 后可运行贯穿源域；ARCHIVE 和 HOME 不成为源域第二真相。\n- 只实现 [MVP_SPEC](MVP_SPEC.md)；完整 WALLET/SOCIAL、native iOS、未来 Life Packs 等仍 deferred。\n\n## 每个 EPIC 的工作顺序\n\n检查仓库与授权 → 读必要文档 → 简短计划/冲突检查 → 验证 zcode 并委派低风险工作 → 实现 → 负责人审查生成结果 → 相关测试 → 报告验收。zcode 不可用时报告精确阻塞，不静默转由 Codex 承担大量重复起草。\n\nDone 包含正确持久化、授权、验证、失败行为、必要事件、测试与验收；界面渲染不足以证明完成。\n\n未决项见 [DECISIONS_AND_OPEN_QUESTIONS](DECISIONS_AND_OPEN_QUESTIONS.md)。`);
for (const [id,title,scope,deps,refs,acceptance] of epics) {
  write(`docs/epics/EPIC_${id}.md`, `# EPIC ${id.slice(0,2)} · ${title}\n\n状态：**NOT_STARTED**。当前 PRE_EPIC_00；本文是后续实施/验收建议，未执行。来源：[epic0.txt](../source/epic0.txt)。\n\n## 目标与范围\n\n${scope}\n\n## 依赖与边界\n\n${deps}\n\n只处理本 EPIC 获授权的范围；不引入微服务、图数据库、未来 Life Packs 或完整 WALLET/SOCIAL。固定要求以原始规格为准，未决项见 [决策记录](../DECISIONS_AND_OPEN_QUESTIONS.md)。\n\n## 验收条件（待实施）\n\n${acceptance.map(x=>`- ${x}`).join('\n')}\n\n## 委派与审查\n\nzcode 可整理固定契约下的重复文档/类型/fixtures/样板及测试用例；负责人保留架构、认证/授权、隐私、schema、跨域事务、依赖策略和最终验收权。zcode 输出须审查、相关测试通过后整合；工具不可用需报告。\n\n## 必要阅读\n\n${refs.map(x=>`- [${x}](../${x}.md)`).join('\n')}`);
}
fs.mkdirSync(path.join(root, '.local/validation'), { recursive: true });
fs.writeFileSync(path.join(root, '.local/validation/source-extraction-manifest.json'), JSON.stringify(manifest, null, 2));
const publicManifest = { ...manifest, documents: manifest.documents.filter(document => document.sourceSections.length).map(({ path, sourceSections }) => ({ path, sourceSections })) };
fs.writeFileSync(path.join(root, publicManifestPath), `${JSON.stringify(publicManifest, null, 2)}\n`);
console.log(JSON.stringify({ createdDocuments: manifest.documents.length, method: manifest.method, sourceSha256: manifest.sourceSha256 }));

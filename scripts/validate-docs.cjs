// Validate source-backed documentation and declared phase. No application acceptance implied.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const mainDocs = ['PRODUCT_VISION', 'PRODUCT_CONSTITUTION', 'MASTER_PLAN', 'CORE_ARCHITECTURE', 'DOMAIN_MODEL', 'UNIVERSITY_PACK', 'LIM_SPEC', 'DATABASE_SCHEMA', 'ACTION_CONTRACT', 'MVP_SPEC', 'DESIGN_LANGUAGE'];
const epicNames = ['00_INFRA', '01_CORE_FOUNDATION', '02_DESIGN_SHELL', '03_QUEST', '04_UNIVERSITY_STUDY', '05_STATUS', '06_GROWTH', '07_FILES', '08_SEARCH', '09_LIM_CORE', '10_HOME', '11_REMINDERS', '12_ARCHIVE', '13_HARDENING'];
const required = ['AGENTS.md', 'CODEX_START_HERE.md', ...mainDocs.map(n => `docs/${n}.md`), ...epicNames.map(n => `docs/epics/EPIC_${n}.md`)];
const problems = [];
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) problems.push(`${name}: ${detail}`);
}
let phase = 'PRE_EPIC_00';
let epicStatuses = Object.fromEntries(epicNames.map(name => [name.slice(0, 2), 'NOT_STARTED']));
try {
  const status = JSON.parse(fs.readFileSync(path.join(root, 'docs/PROJECT_STATUS.json'), 'utf8'));
  const valid = status.schemaVersion === 1 && ['PRE_EPIC_00', 'EPIC_00', 'PHASE_1_SHELL', 'PHASE_2_CORE_QUEST', 'PHASE_3_UNIVERSITY_STUDY', 'PHASE_4_STATUS_GROWTH', 'PHASE_5_LIM_CORE', 'PHASE_6_HOME_ATTENTION', 'PHASE_7_REMINDER_ARCHIVE', 'PHASE_8_VISUAL_POLISH', 'PHASE_9A_PUBLIC_DAILY_DRIVER'].includes(status.phase)
    && status.epics && typeof status.epics === 'object'
    && Object.keys(status.epics).length === 14
    && epicNames.every(name => ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status.epics[name.slice(0, 2)]))
    && epicNames.slice(1).every(name => status.epics[name.slice(0, 2)] === 'NOT_STARTED')
    && (status.phase === 'PRE_EPIC_00' ? status.epics['00'] === 'NOT_STARTED' : status.phase.startsWith('PHASE_') ? status.epics['00'] === 'COMPLETED' : status.epics['00'] !== 'NOT_STARTED');
  check('project-status', Boolean(valid), 'current authorized phase and fourteen EPIC states');
  if (valid) { phase = status.phase; epicStatuses = status.epics; }
} catch { check('project-status', false, 'readable docs/PROJECT_STATUS.json is required'); }
const docs = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    // The ignored WorkBuddy workspace holds unreviewed tool drafts, not canonical docs.
    if (['.git', '.local', 'node_modules'].includes(item.name) || (dir === root && item.name === 'workbuddy-deploy')) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    // Historical chat exports contain attachment paths and past status messages.
    // They are evidence archives, not current project documentation.
    else if (item.name.endsWith('.md') && full !== path.join(root, 'codex-chat-backup-LIFE-HUD.md')) docs.push(full);
  }
}
walk(root);
for (const relative of required) {
  const target = path.join(root, relative);
  const exists = fs.existsSync(target);
  check(`required:${relative}`, exists, exists ? 'present' : 'missing');
  if (exists) {
    const content = fs.readFileSync(target, 'utf8');
    check(`content:${relative}`, content.trim().length >= 150 && !content.includes('\uFFFD') && !content.includes('\0'), 'nonempty readable text');
  }
}
for (const full of docs) {
  const relative = path.relative(root, full).replaceAll('\\', '/');
  const content = fs.readFileSync(full, 'utf8');
  const links = [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]);
  for (const raw of links) {
    const target = raw.replace(/^<|>$/g, '').split('#')[0];
    const windowsPath = /^\/?[a-z]:[\\/]/i.test(target);
    if (!target || (!windowsPath && /^[a-z][a-z0-9+.-]*:/i.test(target))) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      check(`link:${relative}:${target}`, false, 'invalid URL encoding');
      continue;
    }
    // Codex renders Windows file links as /E:/path; Node needs E:/path.
    const normalized = decoded.replace(/^\/([a-z]:[\\/])/i, '$1');
    const resolved = path.resolve(path.dirname(full), normalized);
    const child = path.relative(root, resolved);
    check(`link:${relative}:${target}`, !child.startsWith('..') && !path.isAbsolute(child) && fs.existsSync(resolved), 'target must exist within project');
  }
  if (epicNames.some(name => relative === `docs/epics/EPIC_${name}.md`)) {
    const statuses = [...content.matchAll(/^状态\s*[:：]\s*(?:\*\*)?([A-Z][A-Z0-9_]*)\b/gm)].map(match => match[1]);
    const expected = epicStatuses[path.basename(relative).slice(5, 7)];
    check(`epic-status:${relative}`, statuses.length === 1 && statuses[0] === expected, `exactly one status line declaring ${expected}`);
  }
}
const all = docs.map(p => fs.readFileSync(p, 'utf8')).join('\n');
for (const token of ['PRE_EPIC_00', 'University', 'Voyage', 'Assignment', 'Task', 'NOT_SUBMITTED', 'SUBMITTED', 'StatusMoment', 'EntityLink', 'RealWorldEvent', 'ActionGroup', 'Domain Service', 'Outbox', 'NORMAL', 'PRIVATE', 'HIGH_PRIVATE', 'VAULT', 'ALWAYS', 'WHEN_RELEVANT', 'EXPLICIT_ONLY', 'NEVER', 'CONTACT', 'UNDERSTANDING', 'PRACTICE', 'INDEPENDENT', 'TRANSFER', 'OUTPUT', 'R0', 'R1', 'R2', 'R3', 'EXECUTE', 'ASSIST', 'TALK']) {
  check(`coverage:${token}`, all.includes(token), 'canonical concept appears; semantic correctness needs human review');
}
for (const relative of phase === 'PRE_EPIC_00' ? ['package.json', 'pnpm-workspace.yaml', 'turbo.json', 'apps', 'packages'] : []) {
  check(`no-app-implementation:${relative}`, !fs.existsSync(path.join(root, relative)), 'not created during pre-EPIC initialization');
}
const source = path.join(root, 'docs/source/epic0.txt');
const sourceHash = fs.existsSync(source) ? crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex') : null;
check('source-preserved', sourceHash !== null, 'original supplied specification retained');
const manifestPath = path.join(root, 'docs/source/source-extraction-manifest.json');
const manifestExists = fs.existsSync(manifestPath);
check('source-manifest-required', manifestExists, 'public source baseline must exist; private tool state is not required');
let manifest;
if (manifestExists) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check('source-manifest-readable', true, 'valid JSON');
  } catch {
    check('source-manifest-readable', false, 'source baseline must be readable JSON');
  }
}
const extractedPaths = mainDocs.filter(name => name !== 'MASTER_PLAN').map(name => `docs/${name}.md`);
const validManifest = manifest && typeof manifest === 'object' && !Array.isArray(manifest)
  && manifest.schemaVersion === 1 && manifest.method === 'deterministic-local-source-extraction'
  && manifest.sourcePath === 'docs/source/epic0.txt'
  && typeof manifest.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(manifest.sourceSha256)
  && Array.isArray(manifest.documents)
  && manifest.documents.every(document => document && typeof document === 'object'
    && typeof document.path === 'string' && Array.isArray(document.sourceSections)
    && document.sourceSections.length > 0 && document.sourceSections.every(section => typeof section === 'string' && section.length > 0)
    && new Set(document.sourceSections).size === document.sourceSections.length);
if (manifest !== undefined) check('source-manifest-schema', Boolean(validManifest), 'version 1 source hash and nonempty unique section mappings');
if (validManifest && sourceHash) {
  const mappedPaths = manifest.documents.map(document => document.path);
  check('source-manifest-documents', mappedPaths.length === extractedPaths.length
    && new Set(mappedPaths).size === mappedPaths.length && extractedPaths.every(expected => mappedPaths.includes(expected)),
  'all ten extracted documents appear exactly once; unknown paths are prohibited');
  check('source-hash-unchanged', manifest.sourceSha256 === sourceHash, 'original bytes match public baseline');
  const sourceBytes = fs.readFileSync(source);
  const sourceText = (sourceBytes[0] === 0xff && sourceBytes[1] === 0xfe ? sourceBytes.toString('utf16le') : sourceBytes.toString('utf8')).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const headings = [...sourceText.matchAll(/={20,}\n([^\n]+)\n={20,}\n/g)];
  const sections = new Map(headings.map((m, i) => [m[1], sourceText.slice(m.index + m[0].length, headings[i + 1]?.index ?? sourceText.length).trim()]));
  for (const document of manifest.documents) {
    // Only predefined documentation paths may be read, even for malformed mappings.
    if (!extractedPaths.includes(document.path)) continue;
    const exists = fs.existsSync(path.join(root, document.path));
    check(`source-document-present:${document.path}`, exists, 'mapped document exists');
    if (!exists) continue;
    const content = fs.readFileSync(path.join(root, document.path), 'utf8').replace(/\r\n/g, '\n');
    for (const section of document.sourceSections) {
      check(`source-extract:${document.path}:${section}`, sections.has(section) && content.includes(sections.get(section)), 'canonical passage retained verbatim');
    }
  }
}
const result = {
  phase, requiredDocuments: required.length, markdownDocuments: docs.length,
  checks: checks.length, passed: checks.filter(c => c.ok).length, failed: problems.length,
  sourceSha256: sourceHash, status: problems.length ? 'FAIL' : 'PASS',
  scope: 'Document completeness, source passages, links and declared EPIC phase. PRE_EPIC_00 also excludes application scaffolds. Not application/MVP acceptance.',
  problems, results: checks,
};
const outputDir = path.join(root, '.local', 'validation');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'doc-validation.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, requiredDocuments: result.requiredDocuments, markdownDocuments: result.markdownDocuments, checks: result.checks, passed: result.passed, failed: result.failed, problems }));
process.exitCode = problems.length ? 1 : 0;

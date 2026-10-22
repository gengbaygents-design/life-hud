// Exercise document-validation failures in a clean project-local copy.
// Never copy private .local state or mutate the real specification/documents.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const validationDir = path.join(root, '.local', 'validation');
fs.mkdirSync(validationDir, { recursive: true });
function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
assert.ok(within(root, fs.realpathSync(validationDir)), 'Validation output must stay inside the project');
const fixtureRoot = fs.mkdtempSync(path.join(validationDir, 'doc-check-fixture-'));
const results = [];
const manifestFile = 'docs/source/source-extraction-manifest.json';
const sourceFile = 'docs/source/epic0.txt';
const documentFile = 'docs/PRODUCT_VISION.md';
const epicFile = 'docs/epics/EPIC_01_CORE_FOUNDATION.md';
const probeFile = 'docs/.validation-regression-probe.md';
function absolute(relative) { return path.join(fixtureRoot, relative); }
function run() {
  const result = cp.spawnSync(process.execPath, ['scripts/validate-docs.cjs'], { cwd: fixtureRoot, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  assert.ok(result.stdout.trim(), `Validator must emit a report: ${result.stderr}`);
  const report = JSON.parse(result.stdout.trim());
  assert.equal(result.status, report.status === 'PASS' ? 0 : 1, 'Report and exit code agree');
  return report;
}
function test(name, files, mutation, expected, failurePrefix) {
  const originals = new Map(files.map(file => [file, fs.existsSync(absolute(file)) ? fs.readFileSync(absolute(file)) : null]));
  try {
    mutation();
    const report = run();
    assert.equal(report.status, expected, `${name}: ${JSON.stringify(report.problems)}`);
    if (failurePrefix) assert.ok(report.problems.some(problem => problem.startsWith(failurePrefix)), `${name}: expected ${failurePrefix}`);
    results.push({ name, status: 'PASS', expectedResult: expected });
  } finally {
    for (const [file, original] of originals) {
      if (original === null) { if (fs.existsSync(absolute(file))) fs.unlinkSync(absolute(file)); }
      else fs.writeFileSync(absolute(file), original);
    }
  }
}
function mutateManifest(change) {
  const manifest = JSON.parse(fs.readFileSync(absolute(manifestFile), 'utf8'));
  change(manifest);
  fs.writeFileSync(absolute(manifestFile), JSON.stringify(manifest));
}
try {
  // Explicit allowlist excludes credentials, caches, logs and chat backups.
  for (const directory of ['docs', 'scripts']) fs.cpSync(path.join(root, directory), absolute(directory), { recursive: true, errorOnExist: true });
  for (const file of ['AGENTS.md', 'CODEX_START_HERE.md', 'README.md', 'We+are+RESTARTI.txt', 'LICENSE.ship', 'Start LIFE HUD.cmd']) fs.copyFileSync(path.join(root, file), absolute(file));
  assert.ok(!fs.existsSync(absolute('.local')), 'Fixture starts without private tool state');
  test('clean copy without private manifest', [], () => {}, 'PASS');
  test('shell authorization does not start business EPICs', ['docs/PROJECT_STATUS.json'], () => {
    const file=absolute('docs/PROJECT_STATUS.json');
    const status=JSON.parse(fs.readFileSync(file,'utf8'));
    status.phase='PHASE_1_SHELL';status.epics['00']='COMPLETED';status.epics['01']='IN_PROGRESS';
    fs.writeFileSync(file,JSON.stringify(status));
  }, 'FAIL', 'project-status:');
  test('Phase 9A deployment does not authorize legacy EPIC 09', ['docs/PROJECT_STATUS.json'], () => {
    const file=absolute('docs/PROJECT_STATUS.json');
    const status=JSON.parse(fs.readFileSync(file,'utf8'));
    status.phase='PHASE_9A_PUBLIC_DAILY_DRIVER';status.epics['00']='COMPLETED';status.epics['09']='IN_PROGRESS';
    fs.writeFileSync(file,JSON.stringify(status));
  }, 'FAIL', 'project-status:');
  test('missing public baseline', [manifestFile], () => fs.unlinkSync(absolute(manifestFile)), 'FAIL', 'source-manifest-required:');
  test('invalid baseline JSON', [manifestFile], () => fs.writeFileSync(absolute(manifestFile), '{broken'), 'FAIL', 'source-manifest-readable:');
  test('invalid baseline schema', [manifestFile], () => mutateManifest(value => { value.documents = null; }), 'FAIL', 'source-manifest-schema:');
  test('missing document mapping', [manifestFile], () => mutateManifest(value => value.documents.pop()), 'FAIL', 'source-manifest-documents:');
  test('duplicate document mapping', [manifestFile], () => mutateManifest(value => { value.documents[1] = value.documents[0]; }), 'FAIL', 'source-manifest-documents:');
  test('out-of-project mapping', [manifestFile], () => mutateManifest(value => { value.documents[0].path = '../outside.md'; }), 'FAIL', 'source-manifest-documents:');
  test('empty section mapping', [manifestFile], () => mutateManifest(value => { value.documents[0].sourceSections = []; }), 'FAIL', 'source-manifest-schema:');
  test('duplicate section mapping', [manifestFile], () => mutateManifest(value => { value.documents[0].sourceSections.push(value.documents[0].sourceSections[0]); }), 'FAIL', 'source-manifest-schema:');
  test('unknown source section', [manifestFile], () => mutateManifest(value => { value.documents[0].sourceSections[0] = 'UNKNOWN SECTION'; }), 'FAIL', 'source-extract:');
  test('changed source bytes', [sourceFile], () => fs.appendFileSync(absolute(sourceFile), Buffer.from(' ')), 'FAIL', 'source-hash-unchanged:');
  test('missing source file', [sourceFile], () => fs.unlinkSync(absolute(sourceFile)), 'FAIL', 'source-preserved:');
  test('missing mapped document reports failure', [documentFile], () => fs.unlinkSync(absolute(documentFile)), 'FAIL', 'source-document-present:');
  test('altered canonical passage', [documentFile], () => {
    const content = fs.readFileSync(absolute(documentFile), 'utf8');
    fs.writeFileSync(absolute(documentFile), content.replace('LIFE HUD is a lifelong personal operating system.', 'LIFE HUD is a changed operating system.'));
  }, 'FAIL', 'source-extract:');
  test('CRLF document passages', [documentFile], () => fs.writeFileSync(absolute(documentFile), fs.readFileSync(absolute(documentFile), 'utf8').replace(/\r?\n/g, '\r\n')), 'PASS');
  test('bold EPIC status overrides historical mentions', [epicFile], () => {
    fs.writeFileSync(absolute(epicFile), fs.readFileSync(absolute(epicFile), 'utf8').replace('状态：**NOT_STARTED**', '状态：**IN_PROGRESS**') + '\nHistorical status: NOT_STARTED\n');
  }, 'FAIL', 'epic-status:');
  test('duplicate EPIC status lines', [epicFile], () => fs.appendFileSync(absolute(epicFile), '\n状态：**NOT_STARTED**\n'), 'FAIL', 'epic-status:');
  const insideLink = absolute('CODEX_START_HERE.md').replaceAll('\\', '/');
  if (process.platform === 'win32') {
    test('Windows absolute file link', [probeFile], () => fs.writeFileSync(absolute(probeFile), `[Entry](<${insideLink}>)\n`), 'PASS');
    test('Codex Windows link with encoded spaces', [probeFile], () => fs.writeFileSync(absolute(probeFile), `[Entry](</${insideLink.replaceAll(' ', '%20')}>)\n`), 'PASS');
  }
  test('existing file outside fixture', [probeFile], () => fs.writeFileSync(absolute(probeFile), `[Outside](<${path.join(root, 'CODEX_START_HERE.md').replaceAll('\\', '/')}>)\n`), 'FAIL', 'link:');
  test('malformed link encoding', [probeFile], () => fs.writeFileSync(absolute(probeFile), '[Broken](broken%ZZ.md)\n'), 'FAIL', 'link:');
  const manifest = JSON.parse(fs.readFileSync(absolute(manifestFile), 'utf8'));
  const generatedPaths = [...manifest.documents.map(document => document.path), 'docs/MASTER_PLAN.md',
    ...fs.readdirSync(absolute('docs/epics')).filter(file => /^EPIC_.*\.md$/.test(file)).map(file => `docs/epics/${file}`), manifestFile];
  const generate = () => cp.spawnSync(process.execPath, ['scripts/populate-docs.cjs'], { cwd: fixtureRoot, encoding: 'utf8', windowsHide: true });
  test('generator refuses partial overwrite before writing', generatedPaths, () => {
    const preserved = 'docs/epics/EPIC_13_HARDENING.md';
    const original = fs.readFileSync(absolute(preserved));
    for (const file of generatedPaths) if (file !== preserved) fs.unlinkSync(absolute(file));
    const generated = generate();
    if (generated.error) throw generated.error;
    assert.equal(generated.status, 1);
    assert.ok(!fs.existsSync(absolute(documentFile)), 'No earlier targets are written before an existing later target is rejected');
    assert.deepEqual(fs.readFileSync(absolute(preserved)), original);
  }, 'FAIL', 'source-manifest-required:');
  test('clean generator creates public validation baseline', [...generatedPaths, 'docs/PROJECT_STATUS.json'], () => {
    const status = JSON.parse(fs.readFileSync(absolute('docs/PROJECT_STATUS.json'), 'utf8'));
    status.phase = 'PRE_EPIC_00';
    for (const epic of Object.keys(status.epics)) status.epics[epic] = 'NOT_STARTED';
    fs.writeFileSync(absolute('docs/PROJECT_STATUS.json'), JSON.stringify(status));
    for (const file of generatedPaths) fs.unlinkSync(absolute(file));
    const generated = generate();
    if (generated.error) throw generated.error;
    assert.equal(generated.status, 0, generated.stderr);
    const baseline = JSON.parse(fs.readFileSync(absolute(manifestFile), 'utf8'));
    assert.equal(baseline.schemaVersion, 1);
    assert.equal(baseline.documents.length, 10);
    assert.ok(baseline.documents.every(document => document.sourceSections.length > 0));
  }, 'PASS');
  assert.equal(run().status, 'PASS', 'Clean baseline is restored after all mutations');
  const report = { status: 'PASS', cases: results.length, privateStateCopied: false, originalFilesMutated: false, results };
  fs.writeFileSync(path.join(validationDir, 'doc-validator-regression.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, cases: report.cases, privateStateCopied: false, originalFilesMutated: false }));
} finally {
  // Before recursive deletion, verify this exact newly created fixture stays
  // inside the intended project validation directory and is not a symlink.
  if (fs.existsSync(fixtureRoot)) {
    assert.ok(!fs.lstatSync(fixtureRoot).isSymbolicLink());
    const resolved = fs.realpathSync(fixtureRoot);
    assert.ok(within(fs.realpathSync(validationDir), resolved));
    assert.equal(resolved, fixtureRoot);
    fs.rmSync(resolved, { recursive: true });
  }
}

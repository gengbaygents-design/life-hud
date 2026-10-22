import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fork, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { databaseClient } from '../src/db';

if (process.env.APP_ENV !== 'development') throw new Error('Local development verification only');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiRoot = path.join(root, 'apps/api'), webRoot = path.join(root, 'apps/web');
const api = 'http://127.0.0.1:3001', web = 'http://127.0.0.1:3002';
const require = createRequire(import.meta.url), loader = pathToFileURL(require.resolve('tsx/esm')).href;
const dir = path.join(root, '.local/phase8-runtime');
fs.mkdirSync(dir, { recursive: true });
const environment: NodeJS.ProcessEnv = { ...process.env, APP_ENV: 'development', NODE_ENV: 'development', API_URL: api, WEB_URL: web, PORT: '3001', VITE_API_URL: api, VITE_WEB_URL: web, VITE_APP_ENV: 'development' };
for (const key of ['DEV_NOW', 'DEV_REMINDER_OWNER', 'LIM_PROVIDER']) delete environment[key];
const descriptors = ['api', 'web', 'scheduler'].map(name => fs.openSync(path.join(dir, 'smoke-' + name + '.log'), 'a'));
let apiProcess: ChildProcess | undefined, webProcess: ChildProcess | undefined, schedulerProcess: ChildProcess | undefined;
let ownerId: string | undefined, phase = 'startup';
const email = 'runtime-browser-' + randomUUID() + '@local.invalid', password = randomBytes(24).toString('base64url');
const browser = await chromium.launch({ channel: 'msedge', headless: !process.argv.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Shanghai' });
const page = await context.newPage();
const network: { path: string; port: string; status: number }[] = [], consoleErrors: string[] = [], scriptErrors: string[] = [];
page.on('response', response => { const url = new URL(response.url()); if (url.hostname === '127.0.0.1') network.push({ path: url.pathname, port: url.port, status: response.status() }); });
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 1200)); });
page.on('pageerror', error => scriptErrors.push(error.message));
function stop(child: ChildProcess | undefined) {
  if (child?.pid && child.exitCode === null && child.signalCode === null) spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
}
async function ready(url: string) {
  for (let n = 0; n < 160; n++) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); await response.body?.cancel(); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Runtime verification server not ready');
}
function startApi() {
  apiProcess = fork(path.join(apiRoot, 'src/app.ts'), [], { cwd: apiRoot, windowsHide: true, execArgv: ['--env-file=.env', '--import', loader], env: environment, stdio: ['ignore', descriptors[0], descriptors[0], 'ipc'] });
}
async function startStack() {
  startApi();
  const vite = path.join(path.dirname(require.resolve('vite/package.json', { paths: [webRoot] })), 'bin/vite.js');
  webProcess = fork(vite, ['--host', '127.0.0.1', '--port', '3002', '--strictPort'], { cwd: webRoot, windowsHide: true, execArgv: [], env: environment, stdio: ['ignore', descriptors[1], descriptors[1], 'ipc'] });
  schedulerProcess = fork(path.join(apiRoot, 'src/scheduler/run.ts'), [], { cwd: apiRoot, windowsHide: true, execArgv: ['--env-file=.env', '--import', loader], env: environment, stdio: ['ignore', descriptors[2], descriptors[2], 'ipc'] });
  await ready(api + '/health/ready'); await ready(web + '/sign-in');
}
async function document(route: string, title: string, refresh = true) {
  const response = await page.goto(web + route);
  assert.equal(response?.status(), 200, 'document ' + route);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('.shell-skeleton')).toHaveCount(0);
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
  assert.ok(!/HTTPError|"unhandled"\s*:\s*true/.test(await page.locator('body').innerText()));
  if (refresh) {
    const reload = await page.reload(); assert.equal(reload?.status(), 200);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.shell-skeleton')).toHaveCount(0);
  }
}
async function signIn() {
  await document('/sign-in', '登录', false);
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole('heading', { name: 'HOME', exact: true })).toBeVisible();
}
try {
  // Refuse to displace any user/other test process occupying the ordinary ports.
  for (const port of [3001, 3002]) {
    let occupied = false;
    try { const response = await fetch('http://127.0.0.1:' + port, { signal: AbortSignal.timeout(500) }); await response.body?.cancel(); occupied = true; } catch {}
    assert.equal(occupied, false, 'Stop the existing local app before runtime verification');
  }
  await startStack();
  phase = 'unauthenticated entry';
  await document('/', 'HOME');
  await page.goto(web + '/app/quest'); await expect(page).toHaveURL(/\/sign-in$/);
  const registration = await context.request.post(api + '/api/auth/sign-up/email', { headers: { Origin: web }, data: { email, password, name: 'Runtime verification' } });
  assert.equal(registration.status(), 200);
  ownerId = (await databaseClient`select id from users where email=${email}`)[0]?.id;
  assert.ok(ownerId);
  await context.clearCookies();
  phase = 'real sign in'; await signIn();
  console.log('PASS runtime: unauthenticated entry, gate and real sign in');
  for (const [route, title] of [['/app', 'HOME'], ['/app/quest', 'QUEST'], ['/app/study', 'STUDY'], ['/app/more/status', 'STATUS'], ['/app/more/growth', 'GROWTH'], ['/app/more/archive', 'ARCHIVE'], ['/app/more/reminders', 'REMINDERS'], ['/app/more', 'MORE']]) {
    phase = route; await document(route, title);
    await page.screenshot({ path: path.join(dir, 'normal-' + title.toLowerCase() + '.png') });
  }
  assert.equal(network.filter(r => r.status >= 500).length, 0);
  console.log('PASS runtime: 8 direct routes and refreshes, no document/API 500');
  phase = 'Lim';
  await page.getByRole('button', { name: '◉ LIM', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Lim', exact: true });
  await expect(panel).toBeVisible(); await expect(panel.getByLabel('对 Lim 说')).toBeEnabled();
  await panel.getByRole('button', { name: '我现在干嘛？', exact: true }).click();
  await expect(panel.getByRole('log')).toContainText('Lim');
  await expect(panel.getByRole('button', { name: '我现在干嘛？', exact: true })).toBeEnabled();
  await page.screenshot({ path: path.join(dir, 'normal-lim.png') });
  await panel.getByRole('button', { name: '关闭', exact: true }).click();
  phase = 'logout/login';
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/); await signIn();
  console.log('PASS runtime: local Lim and logout/login cycle');
  phase = 'same configuration initialization';
  const derived = ['apps/api/.env', 'apps/web/.env', 'apps/web/.env.development.local', 'apps/web/.env.production.local', '.local/infra/garage.toml'];
  const timestamps = derived.map(file => fs.statSync(path.join(root, file)).mtimeMs);
  for (let n = 0; n < 3; n++) {
    const result = spawnSync(process.execPath, ['scripts/local.cjs', 'init'], { cwd: root, windowsHide: true, env: environment, stdio: 'ignore' });
    assert.equal(result.status, 0); await document('/app', 'HOME');
  }
  assert.deepEqual(derived.map(file => fs.statSync(path.join(root, file)).mtimeMs), timestamps);
  assert.ok(!fs.readFileSync(path.join(dir, 'smoke-web.log'), 'utf8').includes('transport was disconnected'));
  console.log('PASS runtime: repeated local init preserves configuration mtimes and live documents');
  phase = 'API outage and recovery'; stop(apiProcess);
  await page.reload();
  await expect(page.getByRole('heading', { name: '暂时没能载入这里。', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/app\/?$/);
  assert.ok(!/HTTPError|"unhandled"/.test(await page.locator('body').innerText()));
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: '暂时没能载入这里。', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(dir, 'recoverable-api-failure.png') });
  startApi(); await ready(api + '/health/ready');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'HOME', exact: true })).toBeVisible();
  await document('/app/study', 'STUDY');
  console.log('PASS runtime: actual API stop, visible persistent failure, API restart and retry/reload recovery');
  phase = 'full stack restart'; stop(apiProcess); stop(webProcess); stop(schedulerProcess);
  await startStack();
  await document('/', 'HOME'); await expect(page).toHaveURL(/\/app\/?$/);
  for (const [route, title] of [['/app/quest','QUEST'], ['/app/study','STUDY'], ['/app/more/status','STATUS'], ['/app/more/growth','GROWTH'], ['/app/more/archive','ARCHIVE'], ['/app/more/reminders','REMINDERS'], ['/app/more','MORE']]) await document(route,title);
  assert.deepEqual(scriptErrors, []);
  fs.writeFileSync(path.join(dir, 'browser-smoke.json'), JSON.stringify({ status: 'PASS', network, consoleErrors, scriptErrors, fullStackRestart: true, apiRestart: true, authenticationCycle: true }, null, 2));
  console.log('PASS runtime: full API/Web/scheduler restart, persistent real session, all direct routes and refreshes');
} catch (error) {
  console.error('FAIL runtime at ' + phase + ': ' + (error instanceof Error ? error.name + ' ' + error.message.split('\n').slice(0,3).join(' ') : 'UnknownError'));
  await page.screenshot({ path: path.join(dir, 'smoke-failure.png') }).catch(() => {});
  fs.writeFileSync(path.join(dir, 'browser-smoke-failure.json'), JSON.stringify({ phase, network, consoleErrors, scriptErrors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close(); stop(apiProcess); stop(webProcess); stop(schedulerProcess); descriptors.forEach(fd => fs.closeSync(fd));
  if (ownerId) {
    assert.ok(email.startsWith('runtime-browser-') && email.endsWith('@local.invalid'));
    await databaseClient.begin(async sql => {
      await sql`delete from ai_chats where user_id=${ownerId!}`;
      await sql`delete from sessions where user_id=${ownerId!}`;
      await sql`delete from accounts where user_id=${ownerId!}`;
      await sql`delete from users where id=${ownerId!} and email=${email}`;
    });
  }
  await databaseClient.end({ timeout: 2 });
}

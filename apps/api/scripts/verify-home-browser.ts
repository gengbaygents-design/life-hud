import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { fork, spawnSync, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { databaseClient } from '../src/db';
import { seedHome } from './seed-home';
import { seedArchive } from './seed-archive';
import { captureVisualReview } from './visual-polish-review';
import { attentionReply } from '../src/resources/home/lim-recommendation';
import type { HomeViewModel } from '../src/resources/home/types';
import type { getRecord } from '../src/resources/assignments/methods';
if (process.env.APP_ENV !== 'development')
  throw new Error('Development acceptance only');
// Dedicated real servers isolate the existing developer app. Time changes use
// only the existing process environment, never an HTTP test backdoor.
const root = fileURLToPath(new URL('../../../', import.meta.url)),
  apiRoot = path.join(root, 'apps/api'),
  webRoot = path.join(root, 'apps/web');
const require = createRequire(import.meta.url),
  loader = pathToFileURL(require.resolve('tsx/esm')).href;
const api = 'http://127.0.0.1:3011',
  web = 'http://127.0.0.1:3012';
const apiLog = fs.openSync(
    path.join(root, '.local/logs/phase6-browser-api.log'),
    'a',
  ),
  webLog = fs.openSync(
    path.join(root, '.local/logs/phase6-browser-web.log'),
    'a',
  );
let apiProcess: ChildProcess | undefined,
  webProcess: ChildProcess | undefined,
  ownerId: string | undefined,
  phase = 'startup';
const email = 'home-browser-' + randomUUID() + '@local.invalid',
  password = randomBytes(24).toString('base64url');
const browser = await chromium.launch({ channel: 'msedge', headless: true }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Shanghai',
  }),
  page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.name));
const at = (clock: string, day = '2026-10-16') =>
  new Date(day + 'T' + clock + ':00+08:00').toISOString();
function stop(child: ChildProcess | undefined) {
  if (child?.pid && child.exitCode === null && child.signalCode === null)
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
    });
}
async function ready(url: string) {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Dedicated verification server not ready');
}
async function startApi(clock: string, day = '2026-10-16') {
  stop(apiProcess);
  apiProcess = fork(path.join(apiRoot, 'src/app.ts'), [], {
    cwd: apiRoot,
    windowsHide: true,
    execArgv: ['--env-file=.env', '--import', loader],
    env: {
      ...process.env,
      PORT: '3011',
      API_URL: api,
      WEB_URL: web,
      APP_ENV: 'development',
      DEV_NOW: at(clock, day),
      LIM_PROVIDER: '',
      GOOGLE_GENERATIVE_AI_API_KEY: '',
      OPENAI_API_KEY: '',
      AI_PROVIDER: '',
    },
    stdio: ['ignore', apiLog, apiLog, 'ipc'],
  });
  await ready(api + '/health/ready');
}
async function clock(clock: string, day = '2026-10-16') {
  await startApi(clock, day);
  await page.waitForResponse(
    async (r) =>
      new URL(r.url()).pathname === '/home' &&
      r.status() === 200 &&
      ((await r.json()) as HomeViewModel).asOf === at(clock, day),
    { timeout: 25000 },
  );
}
const nav = () =>
  page.getByRole('navigation', {
    name: page.viewportSize()!.width < 1024 ? '主导航' : '桌面主导航',
    exact: true,
  });
async function home() {
  const r = await context.request.get(api + '/home');
  assert.equal(r.status(), 200);
  return (await r.json()) as HomeViewModel;
}
try {
  await startApi('09:10');
  const vite = path.join(
    path.dirname(require.resolve('vite/package.json', { paths: [webRoot] })),
    'bin/vite.js',
  );
  webProcess = fork(
    vite,
    ['--host', '127.0.0.1', '--port', '3012', '--strictPort'],
    {
      cwd: webRoot,
      windowsHide: true,
      execArgv: [],
      env: {
        ...process.env,
        VITE_APP_ENV: 'development',
        VITE_API_URL: api,
        VITE_WEB_URL: web,
      },
      stdio: ['ignore', webLog, webLog, 'ipc'],
    },
  );
  await ready(web + '/sign-in');
  phase = 'login';
  await page.goto(web + '/sign-up');
  await page.getByLabel('称呼').fill('Home browser verification');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/auth/sign-up/email',
    );
    await page
      .getByRole('button', { name: '创建本地账户', exact: true })
      .click();
    const r = await response;
    if (r.status() === 429 && attempt === 0) {
      const seconds = Number(
        r.headers()['retry-after'] || r.headers()['x-retry-after'],
      );
      assert.ok(seconds > 0 && seconds <= 10);
      await new Promise((r) => setTimeout(r, seconds * 1000 + 250));
      continue;
    }
    assert.equal(r.status(), 200);
    break;
  }
  await page.waitForURL(/\/app/);
  ownerId = (await databaseClient`select id from users where email=${email}`)[0]
    ?.id;
  assert.ok(ownerId);
  const fixture = await seedHome(ownerId, '2026-10-16');
  await page.goto(web + '/app');
  phase = '09:10 upcoming';
  await expect(page.getByTestId('home-next-title')).toHaveText('高等数学');
  await expect(page.locator('.home-next')).toContainText('40分钟后有课');
  assert.equal((await home()).statusSnapshot?.energy, 3);
  console.log('PASS real HOME 09:10 upcoming math / time fit');
  if (process.env.VISUAL_POLISH_REVIEW) await page.screenshot({ path: '../../.local/validation/phase8-home-0910.png', fullPage: true });
  phase = '14:20 current';
  await clock('14:20');
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '计算机思维与人工智能基础',
  );
  await expect(page.locator('.home-next')).toContainText('CURRENT');
  assert.equal((await home()).statusSnapshot?.energy, 2);
  await page.screenshot({
    path: '../../.local/validation/phase6-current-mobile.png',
    fullPage: true,
  });
  console.log(
    'PASS real HOME 14:20 current class / automatic clock revalidation',
  );
  if (process.env.VISUAL_POLISH_REVIEW) await page.screenshot({ path: '../../.local/validation/phase8-home-1420.png', fullPage: true });
  phase = '16:10 planned short action';
  await clock('16:10');
  await expect(page.getByTestId('home-next-title')).toHaveText('拿快递');
  if (process.env.VISUAL_POLISH_REVIEW) await page.screenshot({ path: '../../.local/validation/phase8-home-1610.png', fullPage: true });
  const done = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname ===
      '/tasks/' + fixture.taskIds.parcel + '/complete',
  );
  await page
    .locator('.home-next')
    .getByRole('button', { name: '完成', exact: true })
    .click();
  assert.equal((await done).status(), 200);
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '高数第三章作业',
    { timeout: 5000 },
  );
  console.log(
    'PASS real HOME 16:10 parcel / immediate recompute after completion',
  );
  phase = '20:30 hard deadline';
  await clock('20:30');
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '高数第三章作业',
  );
  await expect(page.locator('.home-next')).toContainText(
    '今晚截止，预计35分钟',
  );
  await expect(page.getByTestId('home-fallback')).toContainText('英语阅读');
  await expect(page.getByTestId('home-fallback')).toHaveCount(1);
  const expected = await home();
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '../../.local/validation/phase6-evening-desktop.png',
    fullPage: true,
  });
  console.log('PASS real HOME 20:30 hard deadline + one fallback / desktop');
  if (process.env.VISUAL_POLISH_REVIEW) await page.screenshot({ path: '../../.local/validation/phase8-home-2030.png', fullPage: true });
  phase = 'Lim shared recommendation without provider';
  await page.getByRole('button', { name: '◉ LIM', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Lim 暂未连接 AI');
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/lim/turns' &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '我现在干嘛？', exact: true }).click();
  const result = await response;
  assert.equal(result.status(), 200);
  const turn = (await result.json()) as {
    status: string;
    reply: string;
    result: { createdEntities: unknown[]; updatedEntities: unknown[] };
  };
  assert.equal(turn.status, 'SUCCESS');
  assert.equal(turn.reply, attentionReply(expected));
  assert.deepEqual(turn.result.createdEntities, []);
  assert.deepEqual(turn.result.updatedEntities, []);
  await expect(page.getByRole('log')).toContainText('高数第三章作业');
  await expect(page.getByRole('log')).toContainText('英语阅读');
  await page.screenshot({
    path: '../../.local/validation/phase6-lim-attention-desktop.png',
  });
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  console.log(
    'PASS real Lim reuses HOME primary/fallback with no model configuration',
  );
  phase = 'complete and explicitly submit';
  await page
    .locator('.home-next')
    .getByRole('button', { name: '完成', exact: true })
    .click();
  await expect(page.locator('.home-next')).toContainText('尚未标记提交');
  await expect(
    page
      .locator('.home-next')
      .getByRole('button', { name: '完成', exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(
      async () => {
        const r = await context.request.get(
          api + '/assignments/' + fixture.assignmentId,
        );
        return ((await r.json()) as Awaited<ReturnType<typeof getRecord>>)
          .workState;
      },
      { timeout: 25000 },
    )
    .toBe('DONE');
  await page
    .locator('.home-next')
    .getByRole('link', { name: '查看课程', exact: true })
    .click();
  const assignment = page.getByTestId('assignment-' + fixture.assignmentId);
  await assignment
    .getByRole('button', { name: '标记已提交', exact: true })
    .click();
  await expect(assignment).toContainText('已提交');
  await nav().getByRole('button', { name: /^HOME/ }).click();
  phase = '00:40 quiet';
  await clock('00:40', '2026-10-17');
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '今晚没有必须处理的事。',
  );
  assert.ok(
    !(await page.locator('.home-next').innerText()).match(
      /还有\d+|FAILED|score|优先分/,
    ),
  );
  console.log('PASS real HOME 00:40 quiet after work is complete/submitted');
  if (process.env.VISUAL_POLISH_REVIEW) await page.screenshot({ path: '../../.local/validation/phase8-home-0040.png', fullPage: true });
  phase = '01:00 hard deadline remains visible';
  const urgent = await context.request.post(api + '/tasks', {
    headers: { Origin: web },
    data: { title: '凌晨硬截止', dueAt: at('01:00', '2026-10-17') },
  });
  assert.equal(urgent.status(), 200);
  const urgentTask = await urgent.json() as { id: string; version: number };
  await expect(page.getByTestId('home-next-title')).toHaveText('凌晨硬截止', {
    timeout: 20000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '../../.local/validation/phase6-night-urgent-mobile.png',
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByTestId('home-next-title')).toHaveText('凌晨硬截止');
  assert.deepEqual(errors, []);
  console.log(
    'PASS real HOME overnight hard deadline / cross-session polling / reload persistence',
  );
  console.log(
    'Golden Attention Journey passed with real Edge, dedicated real API clocks, actual domains and shared local Lim orchestration.',
  );
  if (process.env.VISUAL_POLISH_REVIEW) {
    phase = 'Phase 8 visual review';
    const removed = await context.request.delete(api + '/tasks/' + urgentTask.id, { headers: { Origin: web }, data: { version: urgentTask.version, confirm: true } });
    assert.equal(removed.status(), 200);
    await seedArchive(ownerId, '2026-10-16');
    const create = async (route: string, data: unknown) => {
      const response = await context.request.post(api + route, { headers: { Origin: web }, data });
      assert.equal(response.status(), 200);
      return await response.json() as { id: string; version: number };
    };
    const learning = await create('/learning-records', { title: '关于推荐系统的思考', sourceKind: 'TEXT', reflection: '接触过一个概念，还需要通过自己的实践去理解。' });
    const skill = await create('/skills', { name: '系统设计', state: 'EXPOSED', description: '从需求与边界开始理解。' });
    await create('/skill-evidence', { skillId: skill.id, sourceType: 'LEARNING_RECORD', sourceId: learning.id, evidenceType: 'CONTACT' });
    await create('/sleep-records', { sleepStart: at('01:10'), wakeAt: at('08:05') });
    await create('/water-records', { recordedAt: at('10:30'), amountMl: 300 });
    await create('/reminder-rules', { title: '明天带上图书馆借阅卡', scheduledAt: at('09:00', '2026-10-18'), priority: 'P2', timeZone: 'Asia/Shanghai' });
    await startApi('14:20');
    await captureVisualReview(page, web);
    assert.deepEqual(errors, []);
  }
} catch (e) {
  console.error(
    'FAIL Home browser at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  console.error(
    e instanceof Error ? e.message.split('\n').slice(0, 3).join(' ') : '',
  );
  await page
    .screenshot({
      path: '../../.local/validation/phase6-browser-failure.png',
      fullPage: true,
    })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  stop(apiProcess);
  stop(webProcess);
  fs.closeSync(apiLog);
  fs.closeSync(webLog);
  if (ownerId) {
    assert.ok(
      email.startsWith('home-browser-') && email.endsWith('@local.invalid'),
    );
    await databaseClient.begin(async (sql) => {
      await sql`delete from ai_chats where user_id=${ownerId!}`;
      await sql`delete from sessions where user_id=${ownerId!}`;
      await sql`delete from accounts where user_id=${ownerId!}`;
      await sql`delete from users where id=${ownerId!} and email=${email}`;
    });
  }
  await databaseClient.end({ timeout: 2 });
}

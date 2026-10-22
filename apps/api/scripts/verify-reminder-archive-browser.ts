import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { fork, spawnSync, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { databaseClient } from '../src/db';
if (process.env.APP_ENV !== 'development')
  throw new Error('Development acceptance only');
// Dedicated real servers isolate the existing developer app. Time changes use
// only the existing process environment, never an HTTP test backdoor.
const root = fileURLToPath(new URL('../../../', import.meta.url)),
  apiRoot = path.join(root, 'apps/api'),
  webRoot = path.join(root, 'apps/web');
const require = createRequire(import.meta.url),
  loader = pathToFileURL(require.resolve('tsx/esm')).href;
const api = 'http://127.0.0.1:3111',
  web = 'http://127.0.0.1:3112';
const apiLog = fs.openSync(
    path.join(root, '.local/logs/phase7-browser-api.log'),
    'a',
  ),
  webLog = fs.openSync(
    path.join(root, '.local/logs/phase7-browser-web.log'),
    'a',
  );
let schedulerProcess: ChildProcess | undefined;
let apiProcess: ChildProcess | undefined,
  webProcess: ChildProcess | undefined,
  ownerId: string | undefined,
  phase = 'startup';
const email = 'phase7-browser-' + randomUUID() + '@local.invalid',
  password = randomBytes(24).toString('base64url');
const browser = await chromium.launch({ channel: 'msedge', headless: true }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Shanghai',
  }),
  page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.name));
const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
}).format(new Date());
const at = (clock: string, day = DAY) =>
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
async function startApi(clock: string, day = DAY) {
  stop(apiProcess);
  apiProcess = fork(path.join(apiRoot, 'src/app.ts'), [], {
    cwd: apiRoot,
    windowsHide: true,
    execArgv: ['--env-file=.env', '--import', loader],
    env: {
      ...process.env,
      PORT: '3111',
      API_URL: api,
      WEB_URL: web,
      APP_ENV: 'development',
      DEV_NOW: at(clock, day),
      LIM_PROVIDER: 'mock',
      GOOGLE_GENERATIVE_AI_API_KEY: '',
      OPENAI_API_KEY: '',
      AI_PROVIDER: '',
    },
    stdio: ['ignore', apiLog, apiLog, 'ipc'],
  });
  await ready(api + '/health/ready');
}
const nav = () =>
  page.getByRole('navigation', {
    name: page.viewportSize()!.width < 1024 ? '主导航' : '桌面主导航',
    exact: true,
  });

function startScheduler(clock: string) {
  stop(schedulerProcess);
  schedulerProcess = fork(path.join(apiRoot, 'src/scheduler/run.ts'), [], {
    cwd: apiRoot,
    windowsHide: true,
    execArgv: ['--env-file=.env', '--import', loader],
    env: {
      ...process.env,
      APP_ENV: 'development',
      DEV_NOW: at(clock),
      DEV_REMINDER_OWNER: ownerId!,
    },
    stdio: ['ignore', apiLog, apiLog, 'ipc'],
  });
}
async function read<T>(url: string): Promise<T> {
  const r = await context.request.get(api + url);
  assert.equal(r.status(), 200);
  return (await r.json()) as T;
}
async function say(content: string) {
  await page.getByLabel('对 Lim 说', { exact: true }).fill(content);
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/lim/turns' &&
      r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '发送', exact: true }).click();
  const r = await response;
  assert.equal(r.status(), 200);
  const data = (await r.json()) as {
    status: string;
    result: { createdEntities: { id: string; type: string }[] };
  };
  await expect(page.getByLabel('对 Lim 说', { exact: true })).toBeEnabled();
  return data;
}
try {
  await startApi('15:55');
  const vite = path.join(
    path.dirname(require.resolve('vite/package.json', { paths: [webRoot] })),
    'bin/vite.js',
  );
  webProcess = fork(
    vite,
    ['--host', '127.0.0.1', '--port', '3112', '--strictPort'],
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

  phase = 'login and real Task';
  await page.goto(web + '/sign-up');
  await page.getByLabel('称呼').fill('Phase 7 browser');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '创建本地账户', exact: true }).click();
  await page.waitForURL(/\/app/);
  ownerId = (await databaseClient`select id from users where email=${email}`)[0]
    ?.id;
  assert.ok(ownerId);
  await nav()
    .getByRole('button', { name: /^QUEST/ })
    .click();
  await page.getByRole('button', { name: '记录一件事', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: '记录一件事', exact: true });
  await dialog.getByLabel('标题', { exact: true }).fill('拿快递');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await nav().getByRole('button', { name: /^HOME/ }).click();
  await expect(page.getByTestId('home-next-title')).toHaveText('拿快递');
  phase = 'Lim CREATE_REMINDER';
  await page.getByRole('button', { name: '和 Lim 看看', exact: true }).click();
  const receipt = await say('下午四点提醒我拿快递。');
  assert.equal(receipt.status, 'SUCCESS');
  assert.equal(receipt.result.createdEntities[0].type, 'REMINDER_RULE');
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  let rules =
    await read<{ id: string; status: string; sourceId: string | null }[]>(
      '/reminder-rules',
    );
  assert.equal(rules.length, 1);
  assert.ok(rules[0].sourceId);
  const ruleId = rules[0].id;
  assert.equal(
    (
      await databaseClient`select count(*)::int as n from tasks where owner_id=${ownerId!}`
    )[0].n,
    1,
  );
  console.log(
    'PASS real Lim creates a linked persisted reminder, no extra Task',
  );
  phase = 'restart recovery before due';
  await startApi('15:56');
  startScheduler('15:56');
  assert.equal((await read<typeof rules>('/reminder-rules'))[0].id, ruleId);
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal((await read<unknown[]>('/notification-instances')).length, 0);
  stop(schedulerProcess);
  await startApi('15:57');
  startScheduler('15:57');
  assert.equal(
    (await read<typeof rules>('/reminder-rules'))[0].status,
    'ACTIVE',
  );
  console.log('PASS real application/scheduler restarts preserve future rule');
  phase = 'one delivery after restart';
  stop(schedulerProcess);
  await startApi('16:01');
  startScheduler('16:01');
  await expect
    .poll(
      async () => (await read<unknown[]>('/notification-instances')).length,
      { timeout: 20000 },
    )
    .toBe(1);
  stop(schedulerProcess);
  await startApi('16:02');
  startScheduler('16:02');
  await new Promise((r) => setTimeout(r, 16000));
  const occurrences = await read<
    { id: string; status: string; reminderRuleId: string }[]
  >('/notification-instances');
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].reminderRuleId, ruleId);
  rules = await read<typeof rules>('/reminder-rules');
  assert.equal(rules[0].status, 'FIRED');
  await page.goto(web + '/app/more/reminders');
  await page.getByRole('button', { name: '未读', exact: true }).click();
  const notification = page.getByTestId('notification-' + occurrences[0].id);
  await expect(notification).toContainText('拿快递');
  await notification
    .getByRole('button', { name: '标为已读', exact: true })
    .click();
  await page.getByRole('button', { name: '最近通知', exact: true }).click();
  await expect(notification.getByText('已读',{exact:true})).toBeVisible();
  assert.equal((await read<{id:string;status:string}[]>('/notification-instances')).find(n=>n.id===occurrences[0].id)?.status,'READ');
  assert.equal((await read<typeof rules>('/reminder-rules')).length, 1);
  await page.screenshot({
    path: '../../.local/validation/phase7-reminder-mobile.png',
    fullPage: true,
  });
  console.log(
    'PASS one occurrence across scheduler restart/ticks; read preserves rule history',
  );
  phase='manual reminder confirmation and cancellation';
  await page.getByRole('button',{name:'设置提醒',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'设置提醒',exact:true});
  await dialog.getByLabel('提醒内容').fill('明确关键的验收提醒');
  await dialog.getByLabel('提醒时间').fill(DAY+'T17:00');
  await dialog.getByLabel('重要程度').selectOption('P0');
  await expect(dialog.getByRole('button',{name:'保存提醒',exact:true})).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'保存提醒',exact:true}).click();await expect(dialog).not.toBeVisible();
  await page.getByRole('button',{name:'提醒安排',exact:true}).click();
  const manualRules=await read<{id:string;title:string;status:string}[]>('/reminder-rules');const manual=manualRules.find(r=>r.title==='明确关键的验收提醒')!;assert.ok(manual);
  await page.getByTestId('reminder-'+manual.id).getByRole('button',{name:'取消提醒',exact:true}).click();
  await expect(page.getByTestId('reminder-'+manual.id).getByText('已取消',{exact:true})).toBeVisible();
  assert.equal((await read<unknown[]>('/notification-instances')).length,1);
  console.log('PASS real manual P0 requires explicit confirmation; cancellation retains history without delivery');
  phase = 'Captain log exact original';
  await page.goto(web + '/app/more/archive');
  await page
    .getByRole('button', { name: '写 Captain’s Log', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: 'Captain’s Log', exact: true });
  const original = '今天第一次感觉 LIFE HUD 真有可能做出来。\n\n';
  await dialog.getByLabel('日志原文').fill(original);
  await dialog.getByRole('button', { name: '保存原文', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const [logRow] =
    await databaseClient`select id,body from captain_logs where owner_id=${ownerId!}`;
  assert.equal(logRow.body, original);
  const logId = String(logRow.id);
  await page.reload();
  await expect(page.getByTestId('history-' + logId)).toContainText(
    '今天第一次感觉 LIFE HUD 真有可能做出来。',
  );
  const log = await read<{ id: string; body: string }>(
    '/captain-logs/' + logId,
  );
  assert.equal(log.body, original);
  phase = 'Remember context';
  await page
    .getByTestId('history-' + logId)
    .getByRole('button', { name: '查看原记录', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: 'Captain’s Log', exact: true });
  await expect(dialog.getByLabel('日志原文')).toHaveValue(original);
  await dialog
    .getByRole('button', { name: '✨ 记住这一刻', exact: true })
    .click();
  const markerDialog = page.getByRole('dialog', {
    name: '记住这一刻',
    exact: true,
  });
  await markerDialog
    .getByLabel('时刻名称')
    .fill('LIFE HUD · 第一次跑通 Assignment → Task → Lim');
  await markerDialog
    .getByRole('button', { name: '留下标记', exact: true })
    .click();
  await expect(markerDialog).not.toBeVisible();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '重要时刻', exact: true }).click();
  const history = await read<{
    items: {
      sourceType: string;
      sourceId: string;
      links: { sourceId: string }[];
    }[];
  }>('/archive-entries/history');
  const marker = history.items.find((x) => x.sourceType === 'ARCHIVE_ENTRY')!;
  assert.ok(marker.links.some((l) => l.sourceId === logId));
  await expect(page.getByTestId('history-' + marker.sourceId)).toContainText(
    'LIFE HUD',
  );
  console.log(
    'PASS original log survives reload; remembered moment stores a live source reference',
  );
  phase = 'canonical daily timeline';
  assert.equal(
    (
      await context.request.post(api + '/learning-records', {
        headers: { Origin: web },
        data: { title: '过拟合与 LIFE HUD 推荐系统' },
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await context.request.post(api + '/status-moments', {
        headers: { Origin: web },
        data: { energy: 2 },
      })
    ).status(),
    200,
  );
  await page.goto(web + '/app');
  await expect(page.getByTestId('home-next-title')).toHaveText('拿快递');
  await page
    .locator('.home-next')
    .getByRole('button', { name: '完成', exact: true })
    .click();
  await page.goto(web + '/app/more/archive');
  await page.getByRole('button', { name: '时间线', exact: true }).click();
  await page.getByLabel('日期', { exact: true }).fill(DAY);
  await expect(
    page.getByText('过拟合与 LIFE HUD 推荐系统', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('history-' + logId)).toBeVisible();
  const daily = await read<{ items: { sourceType: string }[] }>(
    '/archive-entries/history?day=' + DAY,
  );
  for (const type of [
    'TASK',
    'LEARNING_RECORD',
    'STATUS_MOMENT',
    'CAPTAIN_LOG',
    'ARCHIVE_ENTRY',
  ])
    assert.ok(daily.items.some((x) => x.sourceType === type));
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '../../.local/validation/phase7-archive-mobile.png',
    fullPage: true,
  });
  phase = 'keyword lookup and NEVER policy';
  await page.getByLabel('寻找过去').fill('LIFE HUD');
  await page.getByRole('button', { name: '查找', exact: true }).click();
  await expect(page.getByTestId('history-' + logId)).toBeVisible();
  await expect(
    page.getByText('过拟合与 LIFE HUD 推荐系统', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('history-' + marker.sourceId)).toBeVisible();
  await page
    .getByTestId('history-' + logId)
    .getByRole('button', { name: '查看原记录', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: 'Captain’s Log', exact: true });
  await dialog.getByLabel('AI 访问').selectOption('NEVER');
  await dialog.getByRole('button', { name: '保存原文', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal(
    (
      await read<{ body: string; aiAccessPolicy: string }>(
        '/captain-logs/' + logId,
      )
    ).body,
    original,
  );
  assert.equal(
    (await read<{ aiAccessPolicy: string }>('/captain-logs/' + logId))
      .aiAccessPolicy,
    'NEVER',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '../../.local/validation/phase7-archive-desktop.png',
    fullPage: true,
  });
  console.log(
    'PASS daily canonical timeline, keyword results, NEVER policy and desktop/mobile layout',
  );
  phase = 'ordinary Lim respects archive privacy';
  await nav().getByRole('button', { name: /^HOME/ }).click();
  await page.getByRole('button', { name: '打开 Lim', exact: true }).click();
  await page.getByRole('button', { name: '新对话', exact: true }).click();
  const ordinary = await say('帮我看看学习上下文？');
  assert.equal(ordinary.status, 'SUCCESS');
  const [lastTrace] =
    await databaseClient`select trace from action_groups where owner_id=${ownerId!} order by created_at desc limit 1`;
  assert.ok(!JSON.stringify(lastTrace.trace?.refs ?? []).includes(logId));
  assert.ok(!JSON.stringify(lastTrace.trace ?? {}).includes(original));
  assert.deepEqual(errors, []);
  console.log(
    'PASS ordinary Lim trace excludes Captain Log; full provider-context spy exclusion verified by API acceptance',
  );
  console.log(
    'Golden Phase 7 Journey passed with real Edge, real API/database, actual Ship scheduler restarts and deterministic development model.',
  );
} catch (error) {
  console.error(
    'FAIL Phase 7 browser at ' +
      phase +
      '; ' +
      (error instanceof Error ? error.name : 'UnknownError'),
  );
  console.error(
    error instanceof Error
      ? error.message.split('\n').slice(0, 3).join(' ')
      : '',
  );
  await page
    .screenshot({
      path: '../../.local/validation/phase7-browser-failure.png',
      fullPage: true,
    })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  stop(schedulerProcess);
  stop(apiProcess);
  stop(webProcess);
  fs.closeSync(apiLog);
  fs.closeSync(webLog);
  if (ownerId) {
    assert.ok(
      email.startsWith('phase7-browser-') && email.endsWith('@local.invalid'),
    );
    await databaseClient.begin(async (tx) => {
      await tx`delete from ai_chats where user_id=${ownerId!}`;
      await tx`delete from sessions where user_id=${ownerId!}`;
      await tx`delete from accounts where user_id=${ownerId!}`;
      await tx`delete from users where id=${ownerId!} and email=${email}`;
    });
  }
  await databaseClient.end({ timeout: 2 });
}

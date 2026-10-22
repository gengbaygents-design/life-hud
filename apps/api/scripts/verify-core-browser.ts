import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { databaseClient } from '../src/db';
import type { getTask } from '../src/resources/tasks/methods';

type Task = Awaited<ReturnType<typeof getTask>>;
const web = process.env.WEB_URL!,
  api = process.env.API_URL!;
const email = 'core-browser-' + randomUUID() + '@local.invalid',
  password = randomBytes(24).toString('base64url');
const otherEmail = 'core-browser-' + randomUUID() + '@local.invalid',
  otherPassword = randomBytes(24).toString('base64url');
const identities: { id: string; email: string }[] = [];
let phase = 'startup';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Shanghai',
  }),
  page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.name));
const nav = () => page.getByRole('navigation', { name: '主导航', exact: true });
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(new Date());
const part = (name: string) =>
  parts.find((value) => value.type === name)!.value;
const day = `${part('year')}-${part('month')}-${part('day')}`;
const at = (time: string) =>
  new Date(day + 'T' + time + ':00+08:00').toISOString();
async function readTask(id: string) {
  const response = await context.request.get(api + '/tasks/' + id);
  assert.equal(response.status(), 200);
  return (await response.json()) as Task;
}
async function register(address: string, secret: string) {
  await page.goto(web + '/sign-up');
  await page.getByLabel('称呼').fill('Core browser verification');
  await page.getByLabel('邮箱').fill(address);
  await page.getByLabel('密码', { exact: true }).fill(secret);
  const originalPhase = phase;
  phase = originalPhase + ' / registration response';
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/auth/sign-up/email',
    );
    await page
      .getByRole('button', { name: '创建本地账户', exact: true })
      .click();
    const result = await response;
    if (result.status() === 429 && attempt === 0) {
      const seconds = Number(
        result.headers()['x-retry-after'] || result.headers()['retry-after'],
      );
      assert.ok(
        Number.isFinite(seconds) && seconds > 0 && seconds <= 10,
        'bounded authentication retry',
      );
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 250));
      continue;
    }
    assert.equal(result.status(), 200);
    break;
  }
  const user = (
    await databaseClient`select id from users where email=${address}`
  )[0];
  assert.ok(user);
  identities.push({ id: user.id, email: address });
  await expect(page).toHaveURL(/\/app\/?$/, { timeout: 15000 });
  phase = originalPhase;
}
try {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(api + '/health/ready', {
      signal: AbortSignal.timeout(1000),
    }).catch(() => null);
    if (response?.ok) break;
    if (attempt === 29) throw new Error('NOT_READY');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  phase = 'real signup and quiet HOME';
  await register(email, password);
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '此刻，可以留白。',
  );
  await nav().getByRole('button', { name: 'QUEST', exact: true }).click();
  await expect(
    page.getByText('今天没有必须处理的事。', { exact: true }),
  ).toBeVisible();
  phase = 'create scheduled Task';
  await page.getByRole('button', { name: '记录一件事', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: '记录一件事', exact: true });
  await dialog.getByLabel('标题', { exact: true }).fill('高数第三章作业');
  await dialog.getByLabel('预估分钟数').fill('35');
  await dialog.getByText('更多安排与说明', { exact: true }).click();
  await dialog.getByLabel('计划开始', { exact: true }).fill(day + 'T20:00');
  await dialog.getByLabel('截止时间', { exact: true }).fill(day + 'T23:59');
  await page.screenshot({
    path: '../../.local/validation/phase2-live-task-form.png',
    animations: 'disabled',
  });
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/tasks' &&
      response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  const response = await created;
  assert.equal(response.status(), 200);
  let task = (await response.json()) as Task;
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: 'TODAY', exact: true })
      .getByRole('button', { name: '高数第三章作业', exact: true }),
  ).toBeVisible();
  phase = 'QUEST-012 HOME real persisted NEXT';
  await nav().getByRole('button', { name: 'HOME', exact: true }).click();
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '高数第三章作业',
  );
  assert.equal((await readTask(task.id)).title, '高数第三章作业');
  phase = 'delay without deadline movement';
  await nav().getByRole('button', { name: 'QUEST', exact: true }).click();
  await page
    .getByRole('region', { name: 'NOW', exact: true })
    .getByRole('button', { name: '高数第三章作业', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: '高数第三章作业', exact: true });
  await dialog.getByRole('button', { name: '延期 / 重排' }).click();
  const delayed = page.getByRole('dialog', { name: '调整计划', exact: true });
  await delayed.getByLabel('新的计划开始').fill(day + 'T21:00');
  const moved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/tasks/' + task.id + '/delay',
  );
  await delayed.getByRole('button', { name: '保存新计划' }).click();
  assert.equal((await moved).status(), 200);
  await expect(delayed).toHaveCount(0);
  task = await readTask(task.id);
  assert.equal(task.plannedStart, at('21:00'));
  assert.equal(task.dueAt, at('23:59'));
  phase = 'conflict keeps draft and protects latest record';
  await page
    .getByRole('region', { name: 'NOW', exact: true })
    .getByRole('button', { name: '高数第三章作业', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: '高数第三章作业', exact: true });
  await dialog.getByText('更多安排与说明', { exact: true }).click();
  await dialog
    .getByLabel('说明', { exact: true })
    .fill('先完成第三章的基础练习。');
  assert.equal(
    (
      await context.request.put(api + '/tasks/' + task.id, {
        headers: { Origin: web },
        data: { version: task.version, description: '另一处补充的说明。' },
      })
    ).status(),
    200,
  );
  const conflicted = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/tasks/' + task.id &&
      response.request().method() === 'PUT',
  );
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  assert.equal((await conflicted).status(), 409);
  await expect(dialog.getByRole('alert')).toContainText('输入已保留');
  await expect(dialog.getByLabel('说明', { exact: true })).toHaveValue(
    '先完成第三章的基础练习。',
  );
  assert.equal((await readTask(task.id)).description, '另一处补充的说明。');
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  phase = 'edit Task persistence';
  await page
    .getByRole('region', { name: 'NOW', exact: true })
    .getByRole('button', { name: '高数第三章作业', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: '高数第三章作业', exact: true });
  await dialog.getByText('更多安排与说明', { exact: true }).click();
  await dialog
    .getByLabel('说明', { exact: true })
    .fill('先完成第三章的基础练习。');
  const edited = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/tasks/' + task.id &&
      response.request().method() === 'PUT',
  );
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  assert.equal((await edited).status(), 200);
  await expect(dialog).toHaveCount(0);
  assert.equal(
    (await readTask(task.id)).description,
    '先完成第三章的基础练习。',
  );
  phase = 'candidate alternative has no writes';
  const second = await context.request.post(api + '/tasks', {
    headers: { Origin: web },
    data: { title: '英语阅读', importance: 'HIGH', estimatedMinutes: 20 },
  });
  assert.equal(second.status(), 200);
  await page.reload();
  const now = page.getByRole('region', { name: 'NOW', exact: true });
  await expect(
    now.getByRole('button', { name: '换一个', exact: true }),
  ).toBeVisible();
  const before = await readTask(task.id);
  let writes = 0;
  const listen = (request: import('@playwright/test').Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/tasks') &&
      request.method() !== 'GET' &&
      request.method() !== 'OPTIONS'
    )
      writes++;
  };
  page.on('request', listen);
  await now.getByRole('button', { name: '换一个', exact: true }).click();
  await expect(
    now.getByRole('button', { name: '英语阅读', exact: true }),
  ).toBeVisible();
  page.off('request', listen);
  assert.equal(writes, 0);
  assert.deepEqual(await readTask(task.id), before);
  await now.getByRole('button', { name: '换一个', exact: true }).click();
  phase = 'complete and reload';
  const mathCard = now.locator('[data-task-id="' + task.id + '"]');
  const completed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/tasks/' + task.id + '/complete',
  );
  await mathCard.getByRole('button', { name: '完成', exact: true }).click();
  assert.equal((await completed).status(), 200);
  task = await readTask(task.id);
  assert.equal(task.status, 'COMPLETED');
  assert.ok(task.completedAt);
  await page.reload();
  await page.getByText('最近完成与放下', { exact: true }).click();
  await expect(
    page
      .locator('.quest-history-list')
      .getByRole('button', { name: '高数第三章作业', exact: true }),
  ).toBeVisible();
  await page
    .locator('.quest-history-list')
    .getByRole('button', { name: '高数第三章作业', exact: true })
    .click();
  dialog = page.getByRole('dialog', { name: '高数第三章作业', exact: true });
  await expect(dialog.getByText(/已完成于/)).toBeVisible();
  await dialog.getByText('变更历史', { exact: true }).click();
  for (const action of ['创建任务', '调整计划', '完成任务'])
    await expect(dialog.getByText(action, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  phase = 'desktop and mobile actual data';
  await nav().getByRole('button', { name: 'HOME', exact: true }).click();
  await expect(page.getByTestId('home-next-title')).toHaveText('英语阅读');
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '../../.local/validation/phase2-live-home-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: '../../.local/validation/phase2-live-home-desktop.png',
    animations: 'disabled',
  });
  await page
    .getByRole('navigation', { name: '桌面主导航', exact: true })
    .getByRole('button', { name: /^QUEST/ })
    .click();
  await page.screenshot({
    path: '../../.local/validation/phase2-live-quest-desktop.png',
    animations: 'disabled',
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  phase = 'real second user isolation';
  await page.setViewportSize({ width: 390, height: 844 });
  await nav().getByRole('button', { name: 'MORE', exact: true }).click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await register(otherEmail, otherPassword);
  assert.equal(
    (await context.request.get(api + '/tasks/' + task.id)).status(),
    404,
  );
  await expect(page.getByTestId('home-next-title')).toHaveText(
    '此刻，可以留白。',
  );
  await nav().getByRole('button', { name: 'QUEST', exact: true }).click();
  await expect(
    page.getByText('今天没有必须处理的事。', { exact: true }),
  ).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    'PASS QUEST-012 and real Edge journey: create, HOME NEXT, delay 20:00→21:00 with 23:59 deadline, edit, read-only alternate, complete, history/reload, desktop/mobile and second-user isolation.',
  );
} catch (error) {
  console.error(
    'FAIL Core browser journey at ' +
      phase +
      '; ' +
      (error instanceof Error ? error.name : 'UnknownError') +
      '. No credentials printed.',
  );
  if (error instanceof Error)
    console.error(
      error.message
        .split('\n')[0]
        .replaceAll(email, '[fixture]')
        .replaceAll(password, '[secret]')
        .replaceAll(otherEmail, '[fixture]')
        .replaceAll(otherPassword, '[secret]'),
    );
  const assertion = error as { actual?: unknown; expected?: unknown };
  console.error(
    JSON.stringify({
      actual:
        typeof assertion.actual === 'number' ? assertion.actual : undefined,
      expected:
        typeof assertion.expected === 'number' ? assertion.expected : undefined,
      pageErrorNames: errors,
      route: new URL(page.url()).pathname,
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
  try {
    for (const address of [email, otherEmail]) {
      const [row] =
        await databaseClient`select id from users where email=${address}`;
      if (row && !identities.some((user) => user.id === row.id))
        identities.push({ id: row.id, email: address });
    }
    for (const user of identities) {
      assert.ok(
        user.email.startsWith('core-browser-') &&
          user.email.endsWith('@local.invalid'),
      );
      await databaseClient.begin(async (sql) => {
        await sql`delete from sessions where user_id=${user.id}`;
        await sql`delete from accounts where user_id=${user.id}`;
        await sql`delete from users where id=${user.id} and email=${user.email}`;
      });
    }
  } catch {
    console.error('Core browser fixture cleanup failed.');
    process.exitCode = 1;
  }
  await databaseClient.end({ timeout: 2 });
}

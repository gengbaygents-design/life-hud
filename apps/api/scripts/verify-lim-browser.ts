import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { databaseClient } from '../src/db';
import { seedUniversity } from './seed-university';
import type { getTask } from '../src/resources/tasks/methods';
import type { getRecord } from '../src/resources/assignments/methods';
import type { getTurn } from '../src/resources/lim/methods';
const api = process.env.API_URL!,
  web = process.env.WEB_URL!,
  outage = process.argv.includes('--outage');
if (process.env.APP_ENV !== 'development')
  throw new Error('Development acceptance only');
const email = 'lim-browser-' + randomUUID() + '@local.invalid',
  password = randomBytes(24).toString('base64url');
let ownerId: string | undefined,
  phase = 'startup';
const browser = await chromium.launch({ channel: 'msedge', headless: true }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Shanghai',
  }),
  page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.name));
type Task = Awaited<ReturnType<typeof getTask>>;
type Assignment = Awaited<ReturnType<typeof getRecord>>;
async function read<T>(path: string): Promise<T> {
  const r = await context.request.get(api + path);
  assert.equal(r.status(), 200, phase + ' HTTP');
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
  const result = (await r.json()) as Awaited<ReturnType<typeof getTurn>>;
  await expect(page.getByLabel('对 Lim 说', { exact: true })).toBeEnabled();
  return result;
}
const nav = () => page.getByRole('navigation', { name: '主导航', exact: true });
async function openLim() {
  await nav().getByRole('button', { name: /LIM/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('对 Lim 说', { exact: true })).toBeVisible();
}
try {
  phase = 'login';
  await page.goto(web + '/sign-up');
  await page.getByLabel('称呼').fill('Lim browser verification');
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
      const sec = Number(
        r.headers()['retry-after'] || r.headers()['x-retry-after'],
      );
      assert.ok(sec > 0 && sec <= 10);
      await new Promise((r) => setTimeout(r, sec * 1000 + 250));
      continue;
    }
    assert.equal(r.status(), 200);
    break;
  }
  await page.waitForURL(/\/app/);
  ownerId = (await databaseClient`select id from users where email=${email}`)[0]
    ?.id;
  assert.ok(ownerId);
  const fixtures = await seedUniversity(ownerId, '2026-10-16');
  await page.goto(web + '/app/study/' + fixtures.courseIds.math);
  await expect(
    page.getByRole('heading', { name: '高等数学', exact: true }),
  ).toBeVisible();
  await openLim();
  phase = 'provider status';
  const provider = await read<{ available: boolean; kind: string }>(
    '/lim/status',
  );
  assert.equal(provider.available, true);
  assert.equal(
    provider.kind,
    outage ? 'development-mock-failure' : 'development-mock',
  );
  if (outage) {
    phase = 'provider outage';
    const failed = await say('今天还有什么要紧的？');
    assert.equal(failed.status, 'FAILED');
    await expect(page.getByRole('log')).toContainText('Lim 暂时无法连接');
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    for (const route of [
      '/app',
      '/app/quest',
      '/app/study',
      '/app/more/status',
      '/app/more/growth',
    ]) {
      await page.goto(web + route);
      await expect(page.locator('#hud-main')).toBeVisible();
      assert.ok(!errors.length);
    }
    console.log(
      'PASS real browser: provider failure receipt, preserved message, HOME/QUEST/STUDY/STATUS/GROWTH remain usable.',
    );
  } else {
    phase = 'current course planning';
    const original = await read<Assignment>(
        '/assignments/' + fixtures.assignmentId,
      ),
      before = await read<Task[]>('/tasks');
    const plan = await say('第三章作业今晚九点做。');
    assert.equal(plan.status, 'SUCCESS');
    let task = await read<Task>('/tasks/' + original.taskId);
    assert.equal(task.plannedStart, '2026-10-16T13:00:00.000Z');
    assert.equal(task.dueAt, original.dueAt);
    assert.equal((await read<Task[]>('/tasks')).length, before.length);
    phase = 'completion';
    const completion = await say('做完了。');
    assert.equal(completion.status, 'SUCCESS');
    assert.ok(!completion.reply.includes('已经提交'));
    await expect
      .poll(
        async () =>
          (await read<Assignment>('/assignments/' + original.id)).workState,
        { timeout: 25000 },
      )
      .toBe('DONE');
    assert.equal(
      (await read<Assignment>('/assignments/' + original.id)).submissionState,
      'NOT_SUBMITTED',
    );
    phase = 'submission';
    assert.equal((await say('我交了。')).status, 'SUCCESS');
    assert.equal(
      (await read<Assignment>('/assignments/' + original.id)).submissionState,
      'SUBMITTED',
    );
    phase = 'multi-action';
    const multiple = await say('老师说下一次作业周五交，我周四晚上写。');
    assert.equal(multiple.status, 'SUCCESS');
    assert.equal(multiple.actions.length, 2);
    const next = (await read<Assignment[]>('/assignments')).find(
      (a) => a.title === '下一次作业',
    )!;
    assert.ok(next.taskId);
    task = await read<Task>('/tasks/' + next.taskId);
    assert.ok(task.plannedStart);
    phase = 'casual fatigue';
    const momentsBefore = await read<unknown[]>('/status-moments');
    const talk = await say('我现在有点累。');
    assert.equal(talk.mode, 'TALK');
    assert.equal(
      (await read<unknown[]>('/status-moments')).length,
      momentsBefore.length,
    );
    phase = 'explicit status';
    const capture = await say('记一下，精力 2，有点累。');
    assert.equal(capture.status, 'SUCCESS');
    const moments = await read<{ energy: number }[]>('/status-moments');
    assert.equal(moments.length, momentsBefore.length + 1);
    assert.equal(moments[0].energy, 2);
    phase = 'original thought';
    const actual = '刚才想到：过拟合也许是系统太依赖过去的数据。';
    assert.equal((await say(actual)).mode, 'TALK');
    const saved = await say('把刚才过拟合那个想法记下来。');
    assert.equal(saved.status, 'SUCCESS');
    const records = await read<
      {
        id: string;
        sourceRef: string;
        reflection: null;
        applications: null;
      }[]
    >('/learning-records');
    assert.equal(records.length, 1);
    assert.equal(records[0].sourceRef, actual);
    assert.equal(records[0].reflection, null);
    assert.equal(records[0].applications, null);
    phase = 'reload persistence';
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '高等数学', exact: true }),
    ).toBeVisible();
    await openLim();
    await expect(page.getByRole('log')).toContainText(actual);
    await expect(page.getByRole('log')).toContainText('已记录想法');
    assert.equal(
      (await read<Assignment>('/assignments/' + original.id)).submissionState,
      'SUBMITTED',
    );
    assert.equal(
      (await read<Task>('/tasks/' + next.taskId)).plannedStart,
      task.plannedStart,
    );
    phase = 'mobile visual';
    await page.screenshot({
      path: '../../.local/validation/phase5-lim-mobile.png',
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    phase = 'undo';
    await page
      .getByRole('button', { name: '撤销可撤销操作', exact: true })
      .last()
      .click();
    await expect(page.getByRole('status')).toContainText('已撤销');
    assert.equal((await read<unknown[]>('/learning-records')).length, 0);
    phase = 'desktop visual';
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: '../../.local/validation/phase5-lim-desktop.png',
      fullPage: true,
    });
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    console.log(
      'PASS real Golden Lim Journey: course context, plan/reconcile, COMPLETE→DONE not SUBMITTED, explicit submit, multi-action, TALK, partial status, exact user thought, reload, Undo, mobile/desktop.',
    );
  }
  assert.deepEqual(errors, []);
} catch (e) {
  console.error(
    'FAIL Lim browser at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  console.error(
    e instanceof Error ? e.message.split('\n').slice(0, 3).join(' ') : '',
  );
  await page
    .screenshot({
      path: '../../.local/validation/phase5-lim-failure.png',
      fullPage: true,
    })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  if (ownerId) {
    assert.ok(
      email.startsWith('lim-browser-') && email.endsWith('@local.invalid'),
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

import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium, expect, type Page } from '@playwright/test';
import { databaseClient } from '../src/db';
import type { getRecord } from '../src/resources/assignments/methods';
import type { getTask } from '../src/resources/tasks/methods';
type Assignment = Awaited<ReturnType<typeof getRecord>>;
type Task = Awaited<ReturnType<typeof getTask>>;
const web = process.env.WEB_URL!,
  api = process.env.API_URL!;
const email = 'university-browser-' + randomUUID() + '@local.invalid',
  password = randomBytes(24).toString('base64url');
const otherEmail = 'university-browser-' + randomUUID() + '@local.invalid';
const browser = await chromium.launch({ channel: 'msedge', headless: true }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Shanghai',
  }),
  page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.name));
let phase = 'login';
const at = (day: string, time: string) =>
  new Date(day + 'T' + time + ':00+08:00').toISOString();
async function register(address: string, secret: string) {
  for (let i = 0; i < 2; i++) {
    const r = await context.request.post(api + '/api/auth/sign-up/email', {
      headers: { Origin: web },
      data: {
        email: address,
        password: secret,
        name: 'University browser verification',
      },
    });
    if (r.status() === 429 && i === 0) {
      const sec = Number(
        r.headers()['retry-after'] || r.headers()['x-retry-after'],
      );
      assert.ok(sec > 0 && sec <= 10);
      await new Promise((r) => setTimeout(r, sec * 1000 + 250));
      continue;
    }
    assert.equal(r.status(), 200);
    return;
  }
  throw new Error('Auth retry exhausted');
}
async function read<T>(path: string): Promise<T> {
  const r = await context.request.get(api + path);
  assert.equal(r.status(), 200);
  return (await r.json()) as T;
}
async function saveDialog(
  title: string,
  fill: (dialog: ReturnType<Page['getByRole']>) => Promise<void>,
) {
  const d = page.getByRole('dialog', { name: title, exact: true });
  await expect(d).toBeVisible();
  await fill(d);
  await d.getByRole('button', { name: '保存', exact: true }).click();
  await expect(d).toHaveCount(0, { timeout: 15000 });
}
const nav = () => page.getByRole('navigation', { name: '主导航', exact: true });
try {
  await register(email, password);
  await context.clearCookies();
  await page.goto(web + '/sign-in');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/?$/, { timeout: 15000 });
  phase = 'create Semester and Course in STUDY';
  await nav().getByRole('button', { name: 'STUDY', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'STUDY', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '添加学期', exact: true }).click();
  await saveDialog('添加学期', async (d) => {
    await d.getByLabel('学期名称').fill('大一上');
    await d.getByLabel('学期开始').fill('2026-09-01T00:00');
    await d.getByLabel('学期结束').fill('2027-01-31T23:59');
  });
  await page.getByRole('button', { name: '添加课程', exact: true }).click();
  await saveDialog('添加课程', async (d) => {
    await d.getByLabel('课程名称').fill('高等数学');
  });
  const courses = await read<{ id: string; name: string }[]>('/courses'),
    course = courses.find((c) => c.name === '高等数学');
  assert.ok(course);
  phase = 'real class context';
  await page.getByRole('button', { name: '安排课次', exact: true }).click();
  await saveDialog('安排课次', async (d) => {
    await d.getByLabel('上课日期').fill('2026-10-16');
    await d.getByLabel('上课时间').fill('09:50');
    await d.getByLabel('下课时间').fill('11:25');
  });
  const study = await read<{
    current: { courseName: string } | null;
    asOf: string;
  }>('/study');
  assert.equal(study.asOf, '2026-10-16T02:00:00.000Z');
  assert.equal(study.current?.courseName, '高等数学');
  await expect(page.getByText('正在上课', { exact: true })).toBeVisible();
  phase = 'create Assignment via UI';
  await page.getByRole('button', { name: '添加作业', exact: true }).click();
  await saveDialog('添加作业', async (d) => {
    await d.getByLabel('作业标题').fill('第三章作业');
    await d.getByLabel('课程截止时间').fill('2026-10-16T23:59');
    await d.getByLabel('预估分钟数').fill('35');
  });
  let assignment = (await read<Assignment[]>('/assignments'))[0],
    task = await read<Task>('/tasks/' + assignment.taskId);
  assert.notEqual(assignment.id, task.id);
  assert.equal(task.dueAt, at('2026-10-16', '23:59'));
  await page.screenshot({
    path: '../../.local/validation/phase3-study-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  phase = 'QUEST plan Thursday 19:00';
  await nav().getByRole('button', { name: 'QUEST', exact: true }).click();
  const card = () =>
    page.locator('article.task-item[data-task-id="' + task.id + '"]').first();
  await card().getByRole('button', { name: task.title, exact: true }).click();
  await saveDialog(task.title, async (d) => {
    await d.getByText('更多安排与说明', { exact: true }).click();
    await d.getByLabel('计划开始', { exact: true }).fill('2026-10-15T19:00');
    await expect(d.getByLabel('截止时间', { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
  });
  task = await read<Task>('/tasks/' + task.id);
  assert.equal(task.plannedStart, at('2026-10-15', '19:00'));
  phase = 'delay Thursday 21:00 preserves Friday deadline';
  await card().getByRole('button', { name: task.title, exact: true }).click();
  await page.getByRole('button', { name: '延期 / 重排', exact: true }).click();
  const delay = page.getByRole('dialog', { name: '调整计划', exact: true });
  await delay.getByLabel('新的计划开始').fill('2026-10-15T21:00');
  await delay.getByRole('button', { name: '保存新计划' }).click();
  await expect(delay).toHaveCount(0);
  task = await read<Task>('/tasks/' + task.id);
  assignment = await read<Assignment>('/assignments/' + assignment.id);
  assert.equal(task.plannedStart, at('2026-10-15', '21:00'));
  assert.equal(assignment.dueAt, at('2026-10-16', '23:59'));
  assert.equal(task.dueAt, assignment.dueAt);
  phase = 'HOME current class overrides unrelated Task';
  const personal = await context.request.post(api + '/tasks', {
    headers: { Origin: web },
    data: {
      title: '与课程无关的长任务',
      estimatedMinutes: 180,
      importance: 'HIGH',
    },
  });
  assert.equal(personal.status(), 200);
  const personalTask=await personal.json() as {id:string;version:number};
  assert.equal((await context.request.post(api+'/tasks/'+personalTask.id+'/start',{headers:{Origin:web},data:personalTask})).status(),200);
  assert.equal((await read<{now:{task:{id:string}}[]}>('/tasks/board')).now[0].task.id,personalTask.id);
  await nav().getByRole('button', { name: 'HOME', exact: true }).click();
  await expect(page.getByTestId('home-next-title')).toHaveText('高等数学');
  await expect(page.locator('.home-next')).toContainText('CURRENT · 此刻');
  await expect(page.locator('.home-next')).toContainText('你现在正在上课。');
  await expect(page.locator('.home-next')).toContainText('至 11:25');
  await page.screenshot({
    path: '../../.local/validation/phase3-home-class-mobile.png',
    animations: 'disabled',
  });
  phase = 'teacher deadline Monday preserves execution plan';
  await nav().getByRole('button', { name: 'STUDY', exact: true }).click();
  let aCard = page.getByTestId('assignment-' + assignment.id);
  await aCard.getByRole('button', { name: '编辑作业' }).click();
  await saveDialog('编辑作业', async (d) => {
    await d.getByLabel('课程截止时间').fill('2026-10-19T23:59');
  });
  assignment = await read<Assignment>('/assignments/' + assignment.id);
  task = await read<Task>('/tasks/' + task.id);
  assert.equal(assignment.dueAt, at('2026-10-19', '23:59'));
  assert.equal(task.dueAt, assignment.dueAt);
  assert.equal(task.plannedStart, at('2026-10-15', '21:00'));
  phase = 'Task completion and asynchronous University handler';
  await nav().getByRole('button', { name: 'QUEST', exact: true }).click();
  await expect(page.getByRole('button',{name:'与课程无关的长任务',exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'换一个',exact:true}).click();
  await expect(card()).toBeVisible();
  await card().getByRole('button', { name: '完成', exact: true }).click();
  await expect
    .poll(async () => (await read<Task>('/tasks/' + task.id)).status, {
      timeout: 10000,
    })
    .toBe('COMPLETED');
  await expect
    .poll(
      async () =>
        (await read<Assignment>('/assignments/' + assignment.id)).workState,
      { timeout: 25000, intervals: [500, 1000, 2000] },
    )
    .toBe('DONE');
  await nav().getByRole('button', { name: 'STUDY', exact: true }).click();
  aCard = page.getByTestId('assignment-' + assignment.id);
  await expect(aCard.getByText('已完成', { exact: true })).toBeVisible();
  await expect(aCard.getByText('未提交', { exact: true })).toBeVisible();
  assignment = await read<Assignment>('/assignments/' + assignment.id);
  assert.equal(assignment.submissionState, 'NOT_SUBMITTED');
  assert.equal(assignment.submittedAt, null);
  await page.screenshot({
    path: '../../.local/validation/phase3-done-not-submitted.png',
    fullPage: true,
    animations: 'disabled',
  });
  phase = 'explicit submission and reload persistence';
  await aCard.getByRole('button', { name: '标记已提交', exact: true }).click();
  await expect(
    aCard.getByRole('button', { name: '更正为未提交' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByTestId('assignment-' + assignment.id).getByText(/^已提交/),
  ).toBeVisible();
  assignment = await read<Assignment>('/assignments/' + assignment.id);
  assert.equal(assignment.submissionState, 'SUBMITTED');
  assert.ok(assignment.submittedAt);
  phase = 'real course detail and desktop shell';
  await page
    .locator('#study-courses')
    .getByRole('link', { name: /高等数学/ })
    .click();
  await expect(page).toHaveURL(new RegExp('/app/study/' + course.id + '$'));
  await expect(
    page.getByRole('heading', { name: '高等数学', level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('assignment-' + assignment.id)).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: '../../.local/validation/phase3-course-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  phase = 'second-user isolation';
  await context.clearCookies();
  await register(otherEmail, randomBytes(24).toString('base64url'));
  assert.equal(
    (await context.request.get(api + '/assignments/' + assignment.id)).status(),
    404,
  );
  assert.equal(
    (await context.request.get(api + '/courses/' + course.id)).status(),
    404,
  );
  assert.deepEqual(await read('/assignments'), []);
  await page.goto(web + '/app/study');
  await expect(
    page.getByRole('heading', { name: 'STUDY', level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('assignment-' + assignment.id)).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS Golden University Journey: real UI login, Semester/Course/Class/Assignment creation; distinct QUEST Task; Thursday 19→21 plan with Friday deadline; Monday deadline synchronization; TaskCompleted→DONE NOT_SUBMITTED; explicit submission/reload; current-class HOME priority; course detail, mobile/desktop and second-user isolation.',
  );
} catch (e) {
  console.error(
    'FAIL University browser at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  console.error(
    JSON.stringify({ pageErrors: errors, path: new URL(page.url()).pathname }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
  for (const address of [email, otherEmail]) {
    assert.ok(
      address.startsWith('university-browser-') &&
        address.endsWith('@local.invalid'),
    );
    const [row] =
      await databaseClient`select id from users where email=${address}`;
    if (row)
      await databaseClient.begin(async (sql) => {
        await sql`delete from sessions where user_id=${row.id}`;
        await sql`delete from accounts where user_id=${row.id}`;
        await sql`delete from users where id=${row.id} and email=${address}`;
      });
  }
  await databaseClient.end({ timeout: 2 });
}

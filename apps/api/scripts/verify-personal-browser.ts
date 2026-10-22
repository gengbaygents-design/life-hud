import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium, expect, type Page } from '@playwright/test';
import { databaseClient } from '../src/db';
import { seedUniversity } from './seed-university';
import type { getGrowth } from '../src/resources/growth/methods';
type Growth = Awaited<ReturnType<typeof getGrowth>>;
const web = process.env.WEB_URL!,
  api = process.env.API_URL!;
const email = 'personal-browser-' + randomUUID() + '@local.invalid',
  otherEmail = 'personal-browser-' + randomUUID() + '@local.invalid',
  password = randomBytes(24).toString('base64url');
const browser = await chromium.launch({ channel: 'msedge', headless: true }),
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Asia/Shanghai',
  }),
  page = await context.newPage();
const errors: string[] = [];
let cycleReads = 0,
  phase = 'login';
page.on('pageerror', (e) => errors.push(e.name));
page.on('request', (r) => {
  if (
    new URL(r.url()).pathname.startsWith('/cycle-records') &&
    r.method() === 'GET'
  )
    cycleReads++;
});
const reflection =
  '如果系统太依赖我过去的行为，\n会不会反过来把我固定成某种人？';
async function register(address: string, secret: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await context.request.post(api + '/api/auth/sign-up/email', {
      headers: { Origin: web },
      data: {
        email: address,
        password: secret,
        name: 'Personal browser verification',
      },
    });
    if (r.status() === 429 && attempt === 0) {
      const delay = Number(
        r.headers()['retry-after'] || r.headers()['x-retry-after'],
      );
      assert.ok(delay > 0 && delay <= 10);
      await new Promise((r) => setTimeout(r, delay * 1000 + 250));
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
  fill: (d: ReturnType<Page['getByRole']>) => Promise<void>,
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
  const [owner] =
    await databaseClient`select id from users where email=${email}`;
  assert.ok(owner);
  const university = await seedUniversity(owner.id, '2026-10-16');
  const c = await context.request.post(api + '/cycle-records', {
    headers: { Origin: web },
    data: { startDate: '2026-10-16', note: 'PRIVATE_CYCLE_BROWSER_FIXTURE' },
  });
  assert.equal(c.status(), 200);
  const cycle = (await c.json()) as { id: string; version: number };
  phase = 'STATUS-005 HOME quick capture';
  await page.getByRole('button', { name: '记录状态', exact: true }).click();
  phase = 'quick capture choose mood';
  let d = page.getByRole('dialog', { name: '记录状态', exact: true });
  await d.getByRole('button', { name: '平静', exact: true }).click();
  await d.getByText('可选详情', { exact: true }).click();
  phase = 'quick capture energy and save';
  await d.getByLabel('精力', { exact: true }).selectOption('3');
  await d.getByRole('button', { name: '保存状态', exact: true }).click();
  phase = 'quick capture close and snapshot refresh';
  await expect(d).toHaveCount(0);
  await expect(
    page.getByText('平静 · 精力 3/5', { exact: true }),
  ).toBeVisible();
  assert.equal(new URL(page.url()).pathname, '/app');
  assert.equal(cycleReads, 0);
  await expect(page.getByText('PRIVATE_CYCLE_BROWSER_FIXTURE')).toHaveCount(0);
  console.log(
    'PASS STATUS-005 and STATUS-006 real HOME capture and minimal status snapshot',
  );
  const moments =
    await read<{ id: string; mood: string; energy: number }[]>(
      '/status-moments',
    );
  assert.equal(moments.length, 1);
  const first = moments[0];
  assert.equal(first.mood, 'CALM');
  assert.equal(first.energy, 3);
  await page.screenshot({
    path: '../../.local/validation/phase4-home-status-mobile.png',
    animations: 'disabled',
  });
  phase = 'STATUS timeline with second moment';
  await nav().getByRole('button', { name: 'MORE', exact: true }).click();
  await page.getByRole('link', { name: /^STATUS / }).click();
  await expect(
    page.getByRole('heading', { name: 'STATUS', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByTestId('moment-' + first.id)).toBeVisible();
  await page.getByRole('button', { name: '记录状态', exact: true }).click();
  d = page.getByRole('dialog', { name: '记录状态', exact: true });
  await d.getByRole('button', { name: '疲惫', exact: true }).click();
  await d.getByText('可选详情', { exact: true }).click();
  await d.getByLabel('精力', { exact: true }).selectOption('2');
  await d.getByRole('button', { name: '保存状态', exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.locator('[data-testid^="moment-"]')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('[data-testid^="moment-"]')).toHaveCount(2);
  assert.equal(cycleReads, 0);
  console.log(
    'PASS STATUS-003, STATUS-004 and STATUS-010 separate moments survive reload',
  );
  phase = 'sleep and water UI';
  await page.getByRole('button', { name: '记录睡眠', exact: true }).click();
  await saveDialog('记录睡眠', async (d) => {
    await d.getByLabel('入睡时间').fill('2026-10-16T01:10');
    await d.getByLabel('醒来时间').fill('2026-10-16T08:05');
  });
  await expect(page.getByText(/记录约 6小时55分/)).toBeVisible();
  await page.getByRole('button', { name: '记录饮水', exact: true }).click();
  await saveDialog('记录饮水', async (d) => {
    await d.getByLabel('饮水量（ml）', { exact: true }).fill('300');
  });
  await expect(page.getByText(/300 ml/)).toBeVisible();
  await page.screenshot({
    path: '../../.local/validation/phase4-status-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  phase = 'private cycle explicit visibility and erasure';
  await expect(page.getByText('PRIVATE_CYCLE_BROWSER_FIXTURE')).toHaveCount(0);
  await page
    .getByRole('button', { name: '打开私密周期记录', exact: true })
    .click();
  await expect(
    page.getByText('PRIVATE_CYCLE_BROWSER_FIXTURE', { exact: true }),
  ).toBeVisible();
  assert.ok(cycleReads > 0);
  await page.getByRole('button', { name: '永久删除', exact: true }).click();
  await page
    .getByRole('dialog', { name: '永久删除私密记录', exact: true })
    .getByRole('button', { name: '确认永久删除', exact: true })
    .click();
  await expect(page.getByTestId('cycle-' + cycle.id)).toHaveCount(0);
  assert.equal(
    (await context.request.get(api + '/cycle-records/' + cycle.id)).status(),
    404,
  );
  await page.getByRole('button', { name: '收起私密记录', exact: true }).click();
  phase = 'Growth real Project and authored reflection';
  await page.getByRole('link', { name: '返回 MORE', exact: true }).click();
  await page.getByRole('link', { name: /^GROWTH / }).click();
  await expect(
    page.getByRole('heading', { name: 'GROWTH', exact: true, level: 1 }),
  ).toBeVisible();
  await page.getByRole('button', { name: '记录项目', exact: true }).click();
  await saveDialog('记录项目', async () => {});
  await expect(
    page.getByRole('heading', { name: 'LIFE HUD · Project #001', exact: true }),
  ).toBeVisible();
  const project = (await read<Growth>('/growth')).projects[0];
  await page.getByRole('button', { name: '＋记录', exact: true }).click();
  await saveDialog('记录学习', async (d) => {
    await d
      .getByLabel('标题', { exact: true })
      .fill('过拟合与 LIFE HUD 推荐系统');
    await d.getByLabel('来源类型', { exact: true }).selectOption('COURSE');
    await d
      .getByLabel('来源', { exact: true })
      .selectOption(university.courseIds.ai);
    await d.getByLabel('我的反思', { exact: true }).fill(reflection);
    await d.getByLabel('关联项目', { exact: true }).selectOption(project.id);
  });
  let growth = await read<Growth>('/growth');
  const learning = growth.records.find(
    (r) => r.title === '过拟合与 LIFE HUD 推荐系统',
  );
  assert.ok(learning);
  assert.equal(learning.reflection, reflection);
  assert.ok(
    growth.links.some((l) => l.fromId === learning.id && l.toId === project.id),
  );
  let learningCard = page.getByTestId('learning-' + learning.id);
  await expect(learningCard).toBeVisible();
  assert.equal(
    await learningCard.getByTestId('user-reflection').textContent(),
    reflection,
  );
  phase = 'source-only remains null and no mastery';
  await page.getByRole('button', { name: '＋记录', exact: true }).click();
  await saveDialog('记录学习', async (d) => {
    await d.getByLabel('标题', { exact: true }).fill('Agent Memory 架构文章');
    await d.getByLabel('来源类型', { exact: true }).selectOption('URL');
    await d
      .getByLabel('来源', { exact: true })
      .fill('https://example.com/agent-memory');
  });
  growth = await read<Growth>('/growth');
  const source = growth.records.find(
    (r) => r.title === 'Agent Memory 架构文章',
  );
  assert.ok(source);
  assert.equal(source.reflection, null);
  assert.equal(growth.skills.length, 0);
  assert.equal(growth.evidence.length, 0);
  await expect(
    page
      .getByTestId('learning-' + source.id)
      .getByText('仅保存来源', { exact: true }),
  ).toBeVisible();
  phase = 'skill CONTACT and explicit evidence';
  await page.getByRole('button', { name: '添加技能', exact: true }).click();
  await saveDialog('添加技能', async (d) => {
    await d.getByLabel('技能名称').fill('AI / Agent Systems');
  });
  await page.getByRole('button', { name: /AI \/ Agent Systems/ }).click();
  d = page.getByRole('dialog', { name: 'AI / Agent Systems', exact: true });
  await expect(d.getByText('接触中', { exact: true })).toBeVisible();
  await d.getByRole('button', { name: '添加证据', exact: true }).click();
  await saveDialog('添加证据', async (d) => {
    await d
      .getByLabel('来源记录', { exact: true })
      .selectOption('LEARNING_RECORD:' + source.id);
  });
  growth = await read<Growth>('/growth');
  let skill = growth.skills[0];
  assert.equal(skill.state, 'EXPOSED');
  assert.equal(growth.evidence.length, 1);
  await page.getByRole('button', { name: /AI \/ Agent Systems/ }).click();
  d = page.getByRole('dialog', { name: 'AI / Agent Systems', exact: true });
  await expect(
    d.getByText('Agent Memory 架构文章', { exact: true }),
  ).toBeVisible();
  await d.getByRole('button', { name: '添加证据', exact: true }).click();
  await saveDialog('添加证据', async (d) => {
    await d.getByLabel('证据类型').selectOption('UNDERSTANDING');
    await d
      .getByLabel('来源记录', { exact: true })
      .selectOption('LEARNING_RECORD:' + learning.id);
    await d.getByLabel('证据说明').fill('我写下了对推荐系统偏差的自己的解释。');
  });
  growth = await read<Growth>('/growth');
  assert.equal(growth.skills[0].state, 'EXPOSED');
  await page.getByRole('button', { name: /AI \/ Agent Systems/ }).click();
  await page
    .getByRole('dialog', { name: 'AI / Agent Systems', exact: true })
    .getByRole('button', { name: '确认技能状态', exact: true })
    .click();
  await saveDialog('确认技能状态', async (d) => {
    await d.getByLabel('根据证据确认状态').selectOption('UNDERSTANDING');
  });
  skill = (await read<Growth>('/growth')).skills[0];
  assert.equal(skill.state, 'UNDERSTANDING');
  await page.getByRole('button', { name: /AI \/ Agent Systems/ }).click();
  d = page.getByRole('dialog', { name: 'AI / Agent Systems', exact: true });
  await expect(d.getByText('理解中', { exact: true })).toBeVisible();
  await expect(d.getByText('自己的解释', { exact: true })).toBeVisible();
  await expect(d.locator('[data-testid^="evidence-"]')).toHaveCount(2);
  await page.screenshot({
    path: '../../.local/validation/phase4-skill-evidence-mobile.png',
    animations: 'disabled',
  });
  await d.getByRole('button', { name: '关闭', exact: true }).click();
  phase = 'reload and edit preservation';
  await page.reload();
  learningCard = page.getByTestId('learning-' + learning.id);
  await expect(learningCard).toBeVisible();
  assert.equal(
    await learningCard.getByTestId('user-reflection').textContent(),
    reflection,
  );
  assert.equal(
    (await read<Growth>('/growth')).records.find((r) => r.id === source.id)
      ?.reflection,
    null,
  );
  phase = 'untouched authored text survives browser newline normalization';
  const importedText = '  ' + reflection.replace('\n', '\r\n') + '  ';
  const currentLearning = (await read<Growth>('/growth')).records.find(
    (r) => r.id === learning.id,
  )!;
  assert.equal(
    (
      await context.request.put(api + '/learning-records/' + learning.id, {
        headers: { Origin: web },
        data: {
          id: learning.id,
          version: currentLearning.version,
          reflection: importedText,
        },
      })
    ).status(),
    200,
  );
  await page.reload();
  learningCard = page.getByTestId('learning-' + learning.id);
  await learningCard
    .getByRole('button', { name: '编辑记录', exact: true })
    .click();
  await saveDialog('编辑学习记录', async (d) => {
    await d
      .getByLabel('应用', { exact: true })
      .fill('把这个问题留给推荐策略评审。');
  });
  assert.equal(
    (await read<Growth>('/growth')).records.find((r) => r.id === learning.id)
      ?.reflection,
    importedText,
  );
  console.log(
    'PASS untouched authored whitespace and CRLF survive editing another field',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: '../../.local/validation/phase4-growth-desktop.png',
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
  for (const [resource, id] of [
    ['learning-records', learning.id],
    ['skills', skill.id],
    ['status-moments', first.id],
  ])
    assert.equal(
      (await context.request.get(api + '/' + resource + '/' + id)).status(),
      404,
    );
  await page.goto(web + '/app/more/growth');
  await expect(
    page.getByRole('heading', { name: 'GROWTH', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByTestId('learning-' + learning.id)).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS Golden STATUS/GROWTH journey: real login, HOME quick capture, separate moments/reload, sleep/water, explicit private cycle access/erasure, exact authored reflection and Project link, source-only null/no mastery, CONTACT plus confirmed evidence and qualitative skill state, desktop/mobile and second-user isolation.',
  );
} catch (e) {
  await page
    .screenshot({
      path: '../../.local/validation/phase4-browser-failure.png',
      fullPage: true,
      animations: 'disabled',
    })
    .catch(() => undefined);
  if (e instanceof Error)
    console.error(
      e.message
        .split('\n')[0]
        .replaceAll(email, '[fixture]')
        .replaceAll(password, '[secret]'),
    );
  console.error(
    'FAIL Personal browser at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  const x = e as { actual?: unknown; expected?: unknown };
  console.error(
    JSON.stringify({
      path: new URL(page.url()).pathname,
      pageErrors: errors,
      actual: typeof x.actual === 'number' ? x.actual : undefined,
      expected: typeof x.expected === 'number' ? x.expected : undefined,
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
  for (const address of [email, otherEmail]) {
    assert.ok(
      address.startsWith('personal-browser-') &&
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

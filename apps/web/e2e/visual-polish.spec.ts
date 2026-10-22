import { test, expect } from '@playwright/test';
import { mockCoreShell } from './mock-core';

test('loading, unavailable, retry and quiet HOME remain distinct', async ({page}) => {
  await mockCoreShell(page);
  await page.route('**/users/current', route => route.fulfill({json:{id:'visual-fixture',fullName:'视觉验收',email:'visual@local.invalid',isAdmin:false,isEmailVerified:false}}));
  let fail = false;
  await page.route(/http:\/\/127\.0\.0\.1:3201\/home(?:\?.*)?$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (fail) await route.fulfill({status:503,json:{message:'INTERNAL_BACKEND_FIXTURE_DO_NOT_DISPLAY'}});
    else await route.fulfill({json:{asOf:'2026-10-16T06:30:00Z',timeZone:'Asia/Shanghai',currentContext:null,nextAction:null,fallbackAction:null,upcomingClass:null,upcomingReminder:null,todayItems:[],statusSnapshot:null,voyageSnapshot:null,alerts:[],emptyMessage:'此刻，可以留白。',nextRefreshAt:'2099-01-01T00:00:00Z'}});
  });
  await page.goto('/app');
  await expect(page.getByRole('status',{name:'正在读取你的安排…'})).toBeVisible();
  await expect(page.locator('.home-today')).not.toContainText('今天没有必须处理的事项。');
  await expect(page.getByTestId('home-next-title')).toHaveText('此刻，可以留白。');
  expect((await page.locator('.home-next').boundingBox())!.height).toBeLessThan(200);
  fail = true; await page.reload();
  await expect(page.getByRole('alert')).toContainText('暂时无法更新安排');
  await expect(page.locator('main')).not.toContainText('INTERNAL_BACKEND');
  fail = false;
  await page.getByRole('button',{name:'重试',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('home-next-title')).toHaveText('此刻，可以留白。');
});

test('short mobile task dialog returns keyboard focus and respects reduced motion', async ({page}) => {
  await page.setViewportSize({width:375,height:600});
  await page.emulateMedia({reducedMotion:'reduce'});
  await mockCoreShell(page);
  await page.route('**/users/current', route => route.fulfill({json:{id:'visual-fixture',fullName:'视觉验收',email:'visual@local.invalid',isAdmin:false,isEmailVerified:false}}));
  await page.goto('/app/quest');
  const trigger=page.getByRole('button',{name:'记录一件事'});
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog');
  const title=dialog.getByLabel('标题',{exact:true});
  await expect(title).toBeFocused();
  expect(await title.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  const bounds=(await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y+bounds.height).toBeLessThanOrEqual(601);
  expect(await dialog.evaluate(el => el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  expect(await trigger.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

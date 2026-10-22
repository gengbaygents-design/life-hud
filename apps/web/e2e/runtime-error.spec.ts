import { test, expect } from '@playwright/test';
import { mockCoreShell } from './mock-core';
const identity = { id: 'runtime-smoke', fullName: 'Runtime smoke', email: 'runtime@local.invalid', isAdmin: false, isEmailVerified: false };

test('session service failure remains an error; recovery retries the root loader', async ({page}) => {
  await mockCoreShell(page);
  let unavailable = true;
  await page.route('**/users/current', route => route.fulfill({ status: unavailable ? 503 : 401, json: unavailable ? { code: 'SERVICE_UNAVAILABLE', message: 'PRIVATE_BACKEND_DETAIL' } : { code: 'UNAUTHORIZED', message: 'Unauthorized' } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '暂时没能载入这里。' })).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.locator('body')).not.toContainText('PRIVATE_BACKEND_DETAIL');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: '暂时没能载入这里。' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'HOME', exact: true })).toBeVisible();
});

test('authenticated bootstrap failure does not redirect to login or expose raw JSON', async ({page}) => {
  await mockCoreShell(page);
  await page.route('**/users/current', route => route.fulfill({ json: identity }));
  let unavailable = true;
  await page.route('**/voyages/ensure-current', async route => {
    if (unavailable) await route.fulfill({ status: 500, json: { unhandled: true, message: 'HTTPError' } });
    else await route.fallback();
  });
  await page.goto('/app/study');
  await expect(page.getByRole('heading', { name: '暂时没能载入这里。' })).toBeVisible();
  await expect(page).toHaveURL(/\/app\/study$/);
  await expect(page.locator('body')).not.toContainText('HTTPError');
  unavailable = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'STUDY', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'STUDY', exact: true })).toBeVisible();
});

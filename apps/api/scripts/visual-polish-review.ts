import assert from 'node:assert/strict';
import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';

// Synthetic account only; callers own creation, fixture seeding and cleanup.
// This supplements real domain journeys with visual and accessibility checks.
export async function captureVisualReview(page: Page, web: string) {
  const results: unknown[] = [];
  const routes = [
    ['home', '/app', 'HOME'], ['quest', '/app/quest', 'QUEST'],
    ['study', '/app/study', 'STUDY'], ['status', '/app/more/status', 'STATUS'],
    ['growth', '/app/more/growth', 'GROWTH'], ['archive', '/app/more/archive', 'ARCHIVE'],
    ['more', '/app/more', 'MORE'], ['reminders', '/app/more/reminders', 'REMINDERS'],
  ];
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    for (const [name, route, title] of routes) {
      await page.goto(web + route);
      await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
      await expect(page.locator('.shell-skeleton')).toHaveCount(0);
      await expect(page.locator('main [role=alert]')).toHaveCount(0);
      const state = await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0);
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
      });
      assert.ok(state.scrollWidth <= width, `${name} overflow at ${width}`);
      await expect(page.getByText('SHELL 01', { exact: false })).toHaveCount(0);
      assert.ok(!/NOT_SUBMITTED|HIGH_PRIVATE|PLANNED/.test(await page.locator('main').innerText()));
      const nav = page.getByRole('navigation', { name: width < 1024 ? '主导航' : '桌面主导航', exact: true });
      await expect(nav).toBeVisible();
      if (width < 1024) {
        await expect(nav.getByRole('button')).toHaveText(['HOME', 'QUEST', '◉ LIM', 'STUDY', 'MORE']);
        const box = await nav.boundingBox(); assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1);
      }
      await page.screenshot({ path: `../../.local/validation/phase8-${name}-${width}.png`, fullPage: true, animations: 'disabled' });
      results.push({ page: name, ...state, pass: true });
    }
    await page.getByRole('button', { name: '◉ LIM', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Lim', exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
    await expect(panel.getByLabel('对 Lim 说')).toBeEnabled();
    const box = await panel.boundingBox();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1);
    const contained = await panel.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1);
    assert.ok(contained, `Lim overflow at ${width}`);
    await page.screenshot({ path: `../../.local/validation/phase8-lim-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Shift+Tab');
    await expect(panel.getByRole('button', { name: '展开全屏' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '◉ LIM', exact: true })).toBeFocused();
  }
  // A short viewport exercises scrolling and keyboard reachability in real dialogs.
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(web + '/app/quest');
  await page.getByRole('button', { name: '记录一件事' }).click();
  const taskDialog = page.getByRole('dialog');
  await expect(taskDialog.getByLabel('标题', { exact: true })).toBeFocused();
  const bounds = await taskDialog.boundingBox();
  assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 601);
  await taskDialog.getByLabel('标题', { exact: true }).fill('只用于视觉验收，取消保存');
  await taskDialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('button', { name: '记录一件事' })).toBeFocused();
  await page.goto(web + '/app/more/status');
  await page.getByRole('button', { name: '记录状态', exact: true }).click();
  await expect(page.getByRole('group', { name: '心情' }).getByRole('button')).toHaveText(['开心','平静','疲惫','焦虑','难过','更多']);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const durations = await page.evaluate(() => Array.from(document.querySelectorAll('.action-button,.mood-btn,.shell-skeleton span')).map(el => ({ animation: getComputedStyle(el).animationName, transition: getComputedStyle(el).transitionDuration })));
  assert.ok(durations.every(s => s.animation === 'none' && s.transition === '0s'));
  // WCAG text contrast against the brighter elevated surface, measured from tokens.
  const colors = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return ['surface-elevated','text-primary','text-secondary','text-muted','accent','warning','success'].map(t => css.getPropertyValue('--hud-' + t).trim());
  });
  const luminance = (hex: string) => {
    const channels = hex.replace('#','').match(/../g)!.map(c => parseInt(c,16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
    return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722;
  };
  const contrast = colors.slice(1).map(c => (luminance(c)+.05)/(luminance(colors[0])+.05));
  assert.ok(contrast.every(c => c >= 4.5));
  fs.writeFileSync('../../.local/validation/phase8-visual-checks.json', JSON.stringify({ routes: results, contrast, dialogFocus: 'PASS', reducedMotion: 'PASS' },null,2));
  console.log('PASS Phase 8: 48 real page/width combinations, 6 Lim layouts, 54 screenshots, dialog focus, short viewport, reduced motion and token contrast');
}

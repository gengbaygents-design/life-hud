import { test, expect, type Page } from '@playwright/test';
import { mockCoreShell } from './mock-core';

async function shellIdentity(page: Page) {
  await mockCoreShell(page);
  await page.route('**/users/current', route => route.fulfill({ json: {
    id:'shell-ui-fixture',fullName:'界面验收',email:'shell@local.invalid',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:null,deletedAt:null,isAdmin:false,isEmailVerified:false,avatarUrl:null,lastRequestAt:null,
  } }));
}
for (const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
  test(`shell navigation, route context and focus at ${viewport.width}px`, async({page}) => {
    await page.setViewportSize(viewport);await shellIdentity(page);
    const errors:string[]=[];const writes:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{const url=new URL(request.url());if(url.port==='3201'&&url.pathname!=='/voyages/ensure-current'&&request.method()!=='GET'&&request.method()!=='OPTIONS')writes.push(request.method());});
    await page.goto('/app');
    const nav=page.getByRole('navigation',{name:viewport.width<1024?'主导航':'桌面主导航',exact:true});
    await expect(nav).toBeVisible();
    if(viewport.width<1024)await expect(nav.getByRole('button')).toHaveText(['HOME','QUEST','◉ LIM','STUDY','MORE']);
    else await expect(page.getByRole('navigation',{name:'主导航',exact:true})).toBeHidden();
    for(const label of ['HOME','QUEST','STUDY','MORE']){
      await nav.getByRole('button',{name:new RegExp('^'+label)}).click();
      await expect(page.getByRole('heading',{name:label,exact:true,level:1})).toBeVisible();
      await expect(nav.getByRole('button',{name:new RegExp('^'+label)})).toHaveAttribute('aria-current','page');
      await page.screenshot({path:`.local/validation/phase1-${label.toLowerCase()}-${viewport.width}.png`,fullPage:true,animations:'disabled'});
      const url=page.url();
      const trigger=viewport.width<1024?nav.getByRole('button',{name:'◉ LIM'}):page.getByRole('button',{name:'◉ LIM'});
      await trigger.click();const panel=page.getByRole('dialog',{name:'Lim',exact:true});
      await expect(panel).toBeVisible();await expect(panel).toHaveAttribute('data-source-route',new URL(url).pathname);
      await expect(panel).toHaveAttribute('data-source-entity','');await expect(panel).toHaveAttribute('data-conversation-id','');
      expect(page.url()).toBe(url);await expect(panel.getByRole('button',{name:'关闭',exact:true})).toBeFocused();
      if(label==='HOME'){
        await page.screenshot({path:`.local/validation/phase1-lim-${viewport.width}.png`,animations:'disabled'});
        const sheetBounds=await panel.boundingBox();expect(sheetBounds!.y).toBeGreaterThanOrEqual(0);expect(sheetBounds!.y+sheetBounds!.height).toBeLessThanOrEqual(viewport.height+1);
        if(viewport.width>=1024)expect(sheetBounds!.y).toBe(0);
      }
      await page.keyboard.press('Shift+Tab');await expect(panel.getByRole('button',{name:'展开全屏'})).toBeFocused();
      await panel.getByRole('button',{name:'展开全屏'}).click();await expect(panel).toHaveAttribute('data-presentation','fullscreen');
      const bounds=await panel.boundingBox();expect(bounds?.width).toBeCloseTo(viewport.width,0);
      await panel.getByRole('button',{name:'收起为面板'}).click();await expect(panel).toHaveAttribute('data-presentation','sheet');
      await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(trigger).toBeFocused();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await nav.getByRole('button',{name:/^HOME/}).click();
    await page.screenshot({path:`.local/validation/phase1-home-${viewport.width}.png`,fullPage:true,animations:'disabled'});
    expect(errors).toEqual([]);expect(writes).toEqual([]);
  });
}

test('MORE destinations, privacy modal and popover remain keyboard usable',async({page})=>{
  await shellIdentity(page);await page.goto('/app/more');
  for(const label of ['STATUS','WALLET','SOCIAL','GROWTH','ARCHIVE','VOYAGE','REMINDERS','SEARCH','SETTINGS','PRIVACY']){
    await page.getByRole('link',{name:new RegExp('^'+label+' ')}).click();
    await expect(page.getByRole('heading',{name:label,exact:true,level:1})).toBeVisible();
    await page.getByRole('link',{name:'返回 MORE'}).click();
  }
  await expect(page.getByRole('link',{name:/^FILES /})).toHaveAttribute('href','/app/files');
  await page.getByRole('link',{name:/^PRIVACY /}).click();
  const privacy=page.getByRole('button',{name:'查看隐私原则'});await privacy.click();
  await expect(page.getByRole('dialog',{name:'隐私原则'})).toBeVisible();await page.keyboard.press('Escape');await expect(privacy).toBeFocused();
  const info=page.getByRole('button',{name:'关于这个空间'});await info.click();await expect(page.getByText('留一点空间给自己')).toBeVisible();
  await page.keyboard.press('Escape');await expect(info).toBeFocused();
  await page.goto('/app/more/unknown');await expect(page.getByRole('heading',{name:'未找到入口',exact:true})).toBeVisible();
});

test('Lim preserves query/hash, background scroll, resize and reduced motion',async({page})=>{
  await shellIdentity(page);await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/app/study?view=overview#study-materials');
  const trigger=page.getByRole('navigation',{name:'主导航',exact:true}).getByRole('button',{name:'◉ LIM'});
  await trigger.click();const panel=page.getByRole('dialog',{name:'Lim',exact:true});
  await expect(panel).toHaveAttribute('data-source-route','/app/study?view=overview#study-materials');
  await expect(page.locator('body')).toHaveCSS('overflow','hidden');
  await page.setViewportSize({width:1280,height:900});
  await expect(panel).toBeVisible();expect((await panel.boundingBox())?.width).toBe(440);
  await page.keyboard.press('Escape');await expect(page.locator('#hud-main')).toBeFocused();
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('navigation',{name:'主导航',exact:true}).getByRole('button',{name:'HOME',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

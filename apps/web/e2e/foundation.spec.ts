import { test, expect } from '@playwright/test';
import { mockCoreShell } from './mock-core';
test('local shell preserves context and focus through the Lim overlay',async({page,request})=>{
 const live=await request.get('http://127.0.0.1:3201/health/live');expect(live.status()).toBe(200);
 const ready=await request.get('http://127.0.0.1:3201/health/ready');expect(ready.status()).toBe(503);
 await page.goto('/');await expect(page.getByRole('heading',{name:'HOME',exact:true})).toBeVisible();
 await expect(page.getByRole('status')).toContainText('尚待连接');
 const nav=page.getByRole('navigation',{name:'主导航'});await expect(nav.getByRole('button')).toHaveText(['HOME','QUEST','◉ LIM','STUDY','MORE']);
 const location=page.url();const trigger=nav.getByRole('button',{name:'◉ LIM'});await trigger.click();
 await expect(page.getByRole('dialog',{name:'Lim'})).toBeVisible();expect(page.url()).toBe(location);
 await expect(page.getByRole('link',{name:'前往登录',exact:true})).toBeVisible();
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'前往登录',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'展开全屏'})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'关闭'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'.local/validation/ship-mobile.png',fullPage:true});
});
test('first chat failure preserves the original draft and reuses its chat',async({page})=>{
 await mockCoreShell(page);
 const chatId='00000000-0000-4000-8000-000000000001';let created=0;let sent=0;
 await page.route('**/users/current',route=>route.fulfill({json:{id:'foundation-ui-user',fullName:'Foundation fixture',email:'fixture@local.invalid',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:null,deletedAt:null,isAdmin:false,isEmailVerified:false,avatarUrl:null,lastRequestAt:null}}));
 await page.route('**/ai-chats',route=>{created++;return route.fulfill({json:{id:chatId,title:'New Chat'}});});
 await page.route('**/ai-chats/*/messages',route=>{if(route.request().method()==='GET')return route.fulfill({json:[]});sent++;return route.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE',message:'AI provider is not configured'}});});
 await page.goto('/app/ai-chat');
 const input=page.getByPlaceholder('Ask anything...');const original='Keep this original input after provider failure.';
 await input.fill(original);await input.press('Enter');
 await expect(page.getByRole('alert')).toContainText('输入已保留');await expect(input).toHaveValue(original);await expect(page).toHaveURL(/\/app\/ai-chat\/?$/);
 await input.press('Enter');await expect.poll(()=>sent).toBe(2);await expect(input).toHaveValue(original);expect(created).toBe(1);
});
test('unauthenticated application routes are gated and local login failure is visible',async({page,request})=>{
 const response=await request.get('http://127.0.0.1:3201/ai-chats');expect(response.status()).toBe(401);
 const bypass=await request.post('http://127.0.0.1:3201/users/dev-verify-email',{data:{email:'synthetic@local.invalid'}});expect(bypass.status()).not.toBe(200);
 await page.goto('/app');await expect(page).toHaveURL(/\/sign-in$/,{timeout:12000});
 await expect(page.getByRole('button',{name:/Google/})).toHaveCount(0);
 await page.getByLabel('邮箱').fill('synthetic@local.invalid');await page.getByLabel('密码',{exact:true}).fill('synthetic-test-password');
 await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page).toHaveURL(/\/sign-in$/);
});

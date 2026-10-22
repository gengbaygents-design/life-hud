import type { Page } from '@playwright/test';
// Visual-shell regression fixture only. Real ownership/persistence is verified by
// verify-core.ts and verify-core-browser.ts against the actual local services.
export async function mockCoreShell(page:Page){
  await page.route('http://127.0.0.1:3201/archive-entries/history**',route=>route.fulfill({json:{items:[],voyages:[],semesters:[]}}));
  await page.route('http://127.0.0.1:3201/reminder-rules',route=>route.fulfill({json:[]}));
  await page.route('http://127.0.0.1:3201/notification-instances',route=>route.fulfill({json:[]}));
  await page.route(/http:\/\/127\.0\.0\.1:3201\/home(?:\?.*)?$/,route=>route.fulfill({json:{asOf:'2026-10-16T06:30:00.000Z',timeZone:'Asia/Shanghai',currentContext:null,nextAction:null,fallbackAction:null,upcomingClass:null,upcomingReminder:null,todayItems:[],statusSnapshot:null,voyageSnapshot:null,alerts:[],emptyMessage:'此刻，可以留白。',nextRefreshAt:'2026-10-16T06:30:30.000Z'}}));
  await page.route('http://127.0.0.1:3201/lim/status',route=>route.fulfill({json:{available:false,kind:'unavailable'}}));
  await page.route('http://127.0.0.1:3201/lim/conversations',route=>route.fulfill({json:[]}));
  const voyage={id:'00000000-0000-4000-8000-000000000001',ownerId:'shell-ui-fixture',version:1,title:'大学 · 第一段航行',parentVoyageId:null,voyageType:'UNIVERSITY',primaryContext:'UNIVERSITY',status:'ACTIVE',startAt:'2026-01-01T00:00:00.000Z',endAt:null,summary:null,visualSeed:null,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',deletedAt:null};
  await page.route('http://127.0.0.1:3201/voyages/ensure-current',route=>route.fulfill({json:voyage}));
  await page.route('http://127.0.0.1:3201/voyages',route=>route.fulfill({json:[voyage]}));
  await page.route('http://127.0.0.1:3201/projects',route=>route.fulfill({json:[]}));
  await page.route('http://127.0.0.1:3201/status/snapshot',route=>route.fulfill({json:{asOf:'2026-10-16T06:30:00.000Z',moment:null}}));
  await page.route(/http:\/\/127\.0\.0\.1:3201\/status(?:\?.*)?$/,route=>route.fulfill({json:{asOf:'2026-10-16T06:30:00.000Z',days:7,moments:[],sleep:[],water:[],exercise:[],waterByDay:[],energyTrend:[]}}));
  await page.route('http://127.0.0.1:3201/growth',route=>route.fulfill({json:{records:[],mistakes:[],skills:[],evidence:[],projects:[],goals:[],links:[],sources:[]}}));
  await page.route('http://127.0.0.1:3201/study',route=>route.fulfill({json:{asOf:'2026-10-16T02:00:00.000Z',semesters:[],courses:[],enrollments:[],sessions:[],assignments:[],exams:[],grades:[],materials:[],places:[],files:[],today:[],current:null,next:null}}));
  await page.route('http://127.0.0.1:3201/tasks/board**',route=>route.fulfill({json:{now:[],today:[],inbox:[]}}));
}

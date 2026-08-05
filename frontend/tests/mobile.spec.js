import { expect, test } from '@playwright/test';

const fixture = () => ({
  version:1,
  settings:{primaryCurrency:'USD',currencies:['USD'],rates:{USD:'1'},locale:'en-US',monthStart:1,theme:'light',timezone:'UTC',budgetWarning:80,aiEnabled:false},
  accounts:[{id:'acct-1',name:'Everyday',institution:'Test Bank',type:'current',group:'asset',currency:'USD',balance:'800.00',mask:'•••• 1234',color:'#226b54',includeNetWorth:true,archived:false}],
  categories:[{id:'cat-income',name:'Income',type:'income',color:'#226b54',icon:'+'},{id:'cat-food',name:'Food',type:'expense',color:'#b84545',icon:'-'}],
  transactions:[{id:'tran-income',date:'2026-08-01',description:'Salary',merchant:'Employer',amount:'1000.00',currency:'USD',type:'income',accountId:'acct-1',categoryId:'cat-income',status:'cleared'},{id:'tran-expense',date:'2026-08-02',description:'Lunch',merchant:'Cafe',amount:'200.00',currency:'USD',type:'expense',accountId:'acct-1',categoryId:'cat-food',status:'cleared'}],
  budgets:[{id:'budget-1',categoryId:'cat-food',amount:'350.00',period:'2026-08',method:'standard',warning:80}],
  bills:[],goals:[],holdings:[],loans:[],widgets:['net-worth','income','expenses','surplus'],
});

const mockData = async (page) => {
  let state=fixture();
  await page.route('**/api/data',async(route)=>{
    if(route.request().method()==='PUT'){state=route.request().postDataJSON();await route.fulfill({json:{revision:2,updatedAt:new Date().toISOString()}});return;}
    await route.fulfill({json:state});
  });
  await page.addInitScript(()=>sessionStorage.setItem('harbor-finance-period','2026-08'));
};

for (const width of [320,375,390,430,768,1024]) {
  test(`has no horizontal overflow at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:800});await mockData(page);await page.goto('/');
    for(const path of ['overview','transactions','budget','accounts','settings']){
      await page.goto(`/#/${path}`);await expect(page.locator('h1')).toBeVisible();
      const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
      expect(dimensions.scrollWidth,`${path} overflowed at ${width}px`).toBeLessThanOrEqual(dimensions.innerWidth);
    }
  });
}

test('390px mobile flow keeps actions contextual and updates totals',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mockData(page);await page.goto('/#/overview');
  await expect(page.locator('.mobile-nav')).toBeVisible();
  await page.locator('.mobile-nav a[href="#/transactions"]').click();
  await expect(page.locator('summary', {hasText:'Add transaction'})).toHaveCount(1);
  await expect(page.locator('.transactions-card thead')).toBeHidden();
  await page.locator('tr', {hasText:'Lunch'}).locator('.overflow-menu > summary').click();
  await page.locator('button[data-edit="transactions"][data-id="tran-expense"]').click();
  await page.locator('input[name="amount"]').fill('300.00');
  await page.locator('#entity-form button[type="submit"]').click();
  await page.locator('.mobile-nav a[href="#/overview"]').click();
  await expect(page.getByText('Monthly Expenses').locator('..').getByText('$300')).toBeVisible();
  await page.locator('.mobile-nav a[href="#/settings"]').click();
  await expect(page.locator('#period-month')).toHaveCount(0);
  await expect(page.locator('summary', {hasText:'Add transaction'})).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const clear=await page.locator('button[data-action="clear"]').boundingBox(),nav=await page.locator('.mobile-nav').boundingBox();
  expect(clear.y+clear.height).toBeLessThanOrEqual(nav.y);
});

test('global search, quick add, reports, and assistant are functional',async({page})=>{
  await page.setViewportSize({width:1024,height:900});await mockData(page);await page.goto('/#/overview');
  await page.locator('#global-search').fill('Cafe');
  await expect(page.locator('.global-results')).toContainText('Cafe');
  await page.locator('.quick-add > summary').click();
  await page.locator('.quick-add button[data-transaction-type="income"]').click();
  await expect(page.locator('select[name="type"]')).toHaveValue('income');
  await page.locator('[data-close]').first().click();
  await page.goto('/#/reports');
  await expect(page.getByRole('heading',{name:'Top merchants'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Budget performance'})).toBeVisible();
  await page.goto('/#/assistant');
  await page.locator('#assistant-question').fill('How much can I save?');
  await page.locator('#assistant-form button').click();
  await expect(page.locator('.assistant-answer')).toContainText('12 months');
});

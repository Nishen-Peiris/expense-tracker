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

const mockData = async (page,initial=fixture()) => {
  let state=initial;
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
  await expect(page.locator('.mobile-header')).toBeVisible();
  await page.locator('.mobile-menu > summary').click();
  await page.locator('.mobile-menu a[href="#/transactions"]').click();
  await expect(page.locator('summary',{hasText:'Add transaction'})).toHaveCount(1);
  await expect(page.locator('.transactions-card thead')).toBeHidden();
  await expect(page.locator('.transaction-mobile-meta').first()).toBeVisible();
  await expect(page.locator('.transactions-card tr').first()).toHaveCSS('border-radius','0px');
  await page.locator('tr', {hasText:'Lunch'}).locator('.overflow-menu > summary').click();
  await page.locator('button[data-edit="transactions"][data-id="tran-expense"]').click();
  await page.locator('input[name="amount"]').fill('300.00');
  await page.locator('#entity-form button[type="submit"]').click();
  await page.locator('.mobile-menu > summary').click();
  await page.locator('.mobile-menu a[href="#/overview"]').click();
  await expect(page.getByText('Monthly Expenses').locator('..').getByText('$300')).toBeVisible();
  await page.locator('.mobile-menu > summary').click();
  await page.locator('.mobile-menu a[href="#/settings"]').click();
  await expect(page.locator('#period-month')).toHaveCount(0);
  await expect(page.locator('summary',{hasText:'Add transaction'})).toHaveCount(0);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const clear=await page.locator('button[data-action="clear"]').boundingBox();
  expect(clear.y+clear.height).toBeLessThanOrEqual(page.viewportSize().height);
});

test('mobile menu exposes every page without crowded labels',async({page})=>{
  await page.setViewportSize({width:320,height:700});await mockData(page);await page.goto('/#/overview');
  await page.locator('.mobile-menu > summary').click();
  await expect(page.locator('.mobile-menu nav a')).toHaveCount(13);
  await expect(page.locator('.mobile-menu a[href="#/assistant"]')).toBeVisible();
  await expect(page.locator('.mobile-menu a[href="#/loans"]')).toBeVisible();
});

test('simplified chrome integrates the period and uses bank-card proportions',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mockData(page);await page.goto('/#/overview');
  await expect(page.locator('.topbar .eyebrow')).toHaveCount(0);
  await expect(page.locator('.period-context')).toHaveCount(0);
  await expect(page.locator('.month-control')).toContainText('August 2026');
  await expect(page.locator('.month-control')).toContainText('Aug 1, 2026 – Aug 31, 2026');
  await page.goto('/#/accounts');
  const card=await page.locator('.account-card').first().boundingBox();
  expect(card.width/card.height).toBeCloseTo(1.586,1);
  for(const path of ['transactions','reports','settings']){
    await page.goto(`/#/${path}`);
    await expect(page.getByText(/^(Import|Export|Print)/)).toHaveCount(0);
  }
});

test('list pages share the same compact mobile surface',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mockData(page);await page.goto('/#/transactions');
  for(const path of ['transactions','budget','bills','goals','investments']){
    await page.goto(`/#/${path}`);
    await expect(page.locator('.list-surface')).toHaveCount(1);
    await expect(page.locator('.list-surface')).toHaveCSS('border-radius','14px');
    await expect(page.locator('.list-surface')).toHaveCSS('box-shadow','none');
    await expect(page.locator('[data-list-sort]')).toBeVisible();
  }
  await page.goto('/#/budget');
  await expect(page.locator('.pagination')).toBeVisible();
  await expect(page.locator('[data-list-page-size]')).toHaveValue('10');
});

test('budget generator uses historical category spending',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mockData(page);await page.goto('/#/budget');
  await page.locator('#period-month').fill('2026-09');
  await page.locator('#period-month').press('Tab');
  await page.locator('[data-action="generate-budget"]').click();
  await expect(page.locator('#toast')).toContainText('created from 1 historical period');
  await expect(page.locator('.budget-card')).toContainText('Food');
  await expect(page.locator('.budget-card')).toContainText('$200');
});

test('budget generator can analyse a full year of expense history',async({page})=>{
  const state=fixture();
  state.budgets=[];
  state.transactions=Array.from({length:12},(_,index)=>{const date=new Date(Date.UTC(2025,8+index,2)).toISOString().slice(0,10);return {id:`expense-${index}`,date,description:'Groceries',merchant:'Market',amount:'100.00',currency:'USD',type:'expense',accountId:'acct-1',categoryId:'cat-food',status:'cleared'};});
  await page.setViewportSize({width:390,height:844});await mockData(page,state);await page.goto('/#/budget');
  await expect(page.locator('.smart-budget-toolbar')).toContainText('up to 12 completed periods');
  await page.locator('#period-month').fill('2026-09');
  await page.locator('#period-month').press('Tab');
  await page.locator('[data-action="generate-budget"]').click();
  await expect(page.locator('#toast')).toContainText('created from 12 historical periods');
  await expect(page.locator('.budget-card')).toContainText('$100');
});

test('quick add, reports, and assistant are functional',async({page})=>{
  await page.setViewportSize({width:1024,height:900});await mockData(page);await page.goto('/#/overview');
  await expect(page.locator('#global-search')).toHaveCount(0);
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

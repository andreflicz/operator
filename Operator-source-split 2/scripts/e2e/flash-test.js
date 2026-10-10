// Measures whether actions replace the whole view (black-flash root cause).
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const file = process.argv[2];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const today = new Date(); const ds = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  await page.addInitScript((ds) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded','1');
    const tasks = {items:[
      {id:'t1', title:'Edit reel', clients:['personal'], client:'personal', priority:'high', status:'today', notes:'n1', createdAt:ds},
      {id:'t2', title:'Ongoing thing', clients:['personal'], client:'personal', priority:'med', status:'today', ongoing:true, notes:'', createdAt:ds},
      {id:'v1', title:'Video idea A', clients:['personal'], client:'personal', priority:'med', status:'backlog', isVideoIdea:true, notes:'vid notes', createdAt:ds}
    ]};
    localStorage.setItem('opsdash:tasks', JSON.stringify(tasks));
    localStorage.setItem('opsdash:profile', JSON.stringify({lineupView:'cards'}));
  }, ds);
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(500);
  await page.click('[data-action="nav"][data-view="focus"]');
  await page.click('[data-action="focusMainTab"][data-tab="tasks"]');
  await page.waitForTimeout(400);
  const probe = async (label, fn) => {
    await page.evaluate(() => { window.__panel = document.querySelector('#viewRoot .tab-panel'); });
    await fn();
    await page.waitForTimeout(30);
    const r = await page.evaluate(() => {
      const p = window.__panel; const cur = document.querySelector('#viewRoot .tab-panel');
      return { sameNode: p === cur, panelAnimating: cur ? cur.getAnimations().length : -1, opacity: cur ? getComputedStyle(cur).opacity : null };
    });
    console.log(label, JSON.stringify(r));
  };
  const viaMenu = async (id, op) => { await page.click('.task-card[data-id="'+id+'"] .card-more'); await page.click('#taskCtxMenu [data-op="'+op+'"]'); };
  await probe('ongoing done-for-today', () => viaMenu('t2', 'done'));
  await page.waitForTimeout(1200);
  await probe('move to backlog', () => viaMenu('t1', 'backlog'));
  await browser.close();
  console.log('errors', errors);
})();

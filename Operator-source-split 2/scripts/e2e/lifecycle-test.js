// Client cycles: multiple playbooks, typed items (meeting/form/video), scheduling, board by step.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/lc.html');
  const b = await launch();
  // --- upgrade from the single-checklist version, with a customised checklist + progress ---
  let p = await newPage(b, OUT+'/lc.html', {
    business:{pipeline:[], packages:[], clients:[{id:'c0', name:'Old', business:'Old Co', status:'active', stage:'onboarding', touches:[], deliverables:[], journal:[], lifecycle:{checks:{onboarding:['x1']}, enteredAt:{}}}],
      crm:{lifecycleSeeded:true, leadStages:[{id:'lead',label:'New',color:'#888'},{id:'closed',label:'Won',color:'#3FBE8E',kind:'won'},{id:'lost',label:'Lost',color:'#E8636B',kind:'lost'}],
        clientStages:[{id:'onboarding',label:'Onboarding',color:'#8fdcff',active:true,checklist:[{id:'x1',text:'Onboarding call'},{id:'x2',text:'Onboarding form'}]},{id:'active',label:'Active',color:'#3FBE8E',active:true,checklist:[]},{id:'paused',label:'Paused',color:'#888',active:false,checklist:[]}]}}
  });
  let E = (code) => p.evaluate(c => window.__op.ev(c), code);
  const mine = await E("cycles().find(c=>c.name==='My client cycle')");
  check('upgrade keeps your custom checklist as "My client cycle"', !!mine && mine.steps[0].checklist.map(i=>i.text).join('|')==='Onboarding call|Onboarding form');
  check('upgrade keeps client progress', (await E("lcProgress(state.business.clients[0]).done"))===1 && (await E("state.business.clients[0].cycleId"))===mine.id);
  check('starter cycles also added', (await E("cycles().map(c=>c.name).join('|')"))==='My client cycle|Retainer client|One-off shoot');
  await p.context().close();
  // --- fresh ---
  p = await newPage(b, OUT+'/lc.html', {business:{pipeline:[{id:'p1', name:'Lea', company:'Lea Studio', stage:'proposal', value:900}], packages:[], clients:[{id:'c1', name:'Nina', business:'Nina Co', status:'active', mrr:2000, touches:[], deliverables:[], journal:[]}]}});
  E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('two starter cycles', (await E("cycles().length"))===2 && (await E("crm().defaultCycleId"))===(await E("cycles()[0].id")));
  check('retainer starts with call / form / videos', (await E("cycles()[0].steps[0].checklist.map(i=>i.type).slice(0,3).join()"))==='meeting,form,video');
  check('established client not forced into a cycle', (await E("state.business.clients[0].cycleId"))===null);
  // editor: build a new cycle
  await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="clients"]');
  await p.click('[data-action="openLifecycleEditor"]');
  await p.click('[data-action="cyNew"]');
  const cid = await E("ui.editingCycleId");
  await p.fill('[data-cy-name="'+cid+'"]', 'VIP retainer'); await p.press('[data-cy-name="'+cid+'"]', 'Tab');
  const s1 = await E("cycleById('"+cid+"').steps[0].id");
  await p.selectOption('#cyNewType-'+s1, 'form'); await p.fill('#cyNewItem-'+s1, 'Send onboarding form'); await p.press('#cyNewItem-'+s1, 'Enter');
  await p.selectOption('#cyNewType-'+s1, 'video'); await p.fill('#cyNewItem-'+s1, 'Send onboarding videos'); await p.press('#cyNewItem-'+s1, 'Enter');
  const formId = await E("cycleById('"+cid+"').steps[0].checklist.find(i=>i.type==='form').id");
  await p.fill('[data-cy-item-link="'+cid+':'+s1+':'+formId+'"]', 'https://forms.example.com/onboard'); await p.press('[data-cy-item-link="'+cid+':'+s1+':'+formId+'"]', 'Tab');
  await p.fill('#cyNewStep', 'Kick-off'); await p.press('#cyNewStep', 'Enter');
  const s2 = await E("cycleById('"+cid+"').steps[1].id");
  await p.fill('#cyNewItem-'+s2, 'Kick-off call'); await p.selectOption('#cyNewType-'+s2, 'meeting'); await p.click('[data-action="cyItemAdd"][data-step="'+s2+'"]');
  const cy = await E("cycleById('"+cid+"')");
  check('built cycle: Onboarding (call, form+link, videos) → Kick-off (call)', cy.name==='VIP retainer' && cy.steps.length===2 && cy.steps[0].checklist.length===3 && cy.steps[0].checklist[1].link==='https://forms.example.com/onboard' && cy.steps[1].checklist[0].type==='meeting', cy);
  await p.click('[data-action="cyDefault"][data-id="'+cid+'"]');
  check('set as default', (await E("crm().defaultCycleId"))===cid);
  await p.click('[data-action="cyDuplicate"][data-id="'+cid+'"]');
  check('duplicate', (await E("cycles().length"))===4);
  await p.click('[data-action="cyDelete"][data-id="'+(await E("ui.editingCycleId"))+'"]');
  check('delete', (await E("cycles().length"))===3);
  await p.click('.toast .toast-action');
  check('undo delete', (await E("cycles().length"))===4);
  await p.click('[data-action="closeLifecycleEditor"]');
  // new client picks the cycle
  await p.click('[data-action="openNewContact"][data-kind="client"]');
  check('cycle picker in new client form (default preselected)', (await p.inputValue('#ncCycle'))===cid);
  await p.fill('#ncName','Zed'); await p.fill('#ncCompany','Zed Media'); await p.click('[data-action="saveNewContact"]');
  const zid = await E("state.business.clients.find(c=>c.business==='Zed Media').id");
  check('new client opens on step 1 of their cycle', (await p.textContent('.lc-now-title'))==='Onboarding' && (await p.textContent('.lc-card')).includes('step 1 of 2'));
  check('form item has Copy link', await p.isVisible('.lc-card [data-action="lcCopyLink"]'));
  await p.click('.lc-card [data-action="lcCopyLink"]');
  check('copy link toast', (await p.textContent('#toastContainer')).includes('Link copied'));
  // schedule the onboarding call
  await p.click('.lc-card [data-action="lcSchedule"]');
  check('schedule opens event editor prefilled', (await p.inputValue('#calEventTitle')).includes('Onboarding call / meeting — Zed Media') && (await p.inputValue('#calEventLinkedClient'))===zid);
  await p.fill('#calEventDate', '2026-10-09'); await p.fill('#calEventTime', '10:00'); await p.click('[data-action="saveCalEvent"]');
  check('item shows scheduled date', (await p.textContent('.lc-card')).includes('Oct 9'));
  check('event linked to client', (await E("state.calendar.events.some(e=>e.linkedClient==='"+zid+"' && e.time==='10:00')")));
  // tick everything → next → finish
  for(const box of await p.$$('.lc-card input[data-lc-check]')) await box.check();
  check('step complete → Next highlighted', await p.isVisible('.lc-next-ready'));
  await p.click('.lc-next-ready');
  check('on Kick-off', (await p.textContent('.lc-now-title'))==='Kick-off');
  await p.check('.lc-card input[data-lc-check]');
  await p.click('[data-action="lcFinish"]');
  const z = await E("state.business.clients.find(c=>c.id==='"+zid+"')");
  check('finish cycle → Onboarding client becomes Active', z.cycleDone===true && z.stage==='active', {done:z.cycleDone, stage:z.stage});
  await p.click('[data-action="closeClientModalAndSave"]');
  // put existing client Nina into the Retainer cycle from her page
  await p.click('.crm-card[data-key="crm-c1"] .crm-card-main');
  await p.selectOption('[data-cycle-assign="c1"]', await E("cycles().find(c=>c.name==='Retainer client').id"));
  check('assign cycle from client page', (await E("clientStep(state.business.clients[0]).label"))==='Onboarding');
  await p.click('[data-action="closeClientModalAndSave"]');
  // board grouped by cycle step + drag
  await p.click('[data-action="crmGroup"][data-id="cycle"]');
  await p.selectOption('[data-cycle-board]', await E("cycles().find(c=>c.name==='Retainer client').id"));
  check('board by cycle step: 4 steps + Done', (await p.$$('.crm-col')).length===5);
  const kickId = await E("cycles().find(c=>c.name==='Retainer client').steps[1].id");
  await p.evaluate((kickId) => {
    const card = document.querySelector('[data-crm-drag="client:c1"]'); const col = document.querySelector('[data-cycle-drop$=":'+kickId+'"]');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', {dataTransfer:dt, bubbles:true}));
    col.dispatchEvent(new DragEvent('dragover', {dataTransfer:dt, bubbles:true, cancelable:true}));
    col.dispatchEvent(new DragEvent('drop', {dataTransfer:dt, bubbles:true, cancelable:true}));
  }, kickId);
  check('drag client to Kick-off', (await E("clientStep(state.business.clients[0]).label"))==='Kick-off');
  await p.screenshot({path:OUT+'/cy-board.png'});
  // won lead starts default cycle
  await p.click('[data-action="businessTab"][data-tab="leads"]');
  await E("setStage('lead','p1','closed')");
  check('won lead starts the default cycle', (await E("clientCycle(state.business.clients.find(c=>c.fromLeadId==='p1')).id"))===cid);
  // Today panel
  await p.click('[data-action="nav"][data-view="today"]');
  check('Client Next Steps lists cycle items', await p.isVisible('.lc-steps-card[data-key="lcs-c1"]'));
  await p.screenshot({path:OUT+'/cy-today.png'});
  await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="clients"]');
  await p.click('[data-action="crmGroup"][data-id="stage"]');
  await p.click('.crm-card[data-key="crm-c1"] .crm-card-main'); await p.waitForTimeout(300);
  await p.screenshot({path:OUT+'/cy-client.png'});
  await p.click('[data-action="closeClientModalAndSave"]');
  await p.click('[data-action="openLifecycleEditor"]'); await p.waitForTimeout(300);
  await p.screenshot({path:OUT+'/cy-editor.png'});
  await p.reload(); await p.waitForTimeout(400);
  check('everything persists after reload', (await E("cycles().length"))===4 && (await E("clientStep(state.business.clients[0]).label"))==='Kick-off');
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();

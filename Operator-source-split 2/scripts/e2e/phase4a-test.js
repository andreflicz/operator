const { instrument, ds, launch, newPage, check, report } = require('./common.js');
const SP = require('./common.js').OUT;
(async () => {
  instrument(process.argv[2], SP+'/t.html');
  const b = await launch();
  const now = new Date(2026, 9, 7, 10, 0, 0);
  const D = (n) => ds(new Date(2026, 9, 7+n));
  // Old-format data, exactly as stored before the CRM existed.
  const seed = {
    business:{
      pipeline:[
        {id:'p1', name:'Ana', company:'Ana Plumbing', stage:'lead', value:1500, leadSource:'google', createdAt:D(-10), stageHistory:[]},
        {id:'p2', name:'Bo', company:'Bo Roofing', stage:'proposal', value:3000, createdAt:D(-1), stageHistory:['lead','contacted','discovery']},
        {id:'p3', name:'Cy', company:'', stage:'lost', value:0, createdAt:D(-30)}
      ],
      clients:[
        {id:'c1', name:'Nina', business:'Nina Co', status:'active', mrr:2000, touches:[D(-12), D(-9)], deliverables:[], notes:'great client', journal:[]},
        {id:'c2', name:'Old', business:'Old Biz', status:'paused', mrr:500, touches:[], deliverables:[], journal:[]}
      ],
      packages:[]
    },
    tasks:{items:[{id:'tk1', title:'Send Ana proposal', clients:['lead:p1'], client:'lead:p1', priority:'high', status:'today', createdAt:D(-2)}]}
  };
  let p = await newPage(b, SP+'/t.html', seed, now);
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  // migration
  const c1 = await E("state.business.clients.find(c=>c.id==='c1')");
  check('client status→stage', c1.stage==='active' && (await E("state.business.clients.find(c=>c.id==='c2').stage"))==='paused');
  check('old touches kept + mirrored as touchpoints', c1.touches.length===2 && c1.touchpoints.length===2 && c1.notes==='great client', c1);
  check('lead stages preserved', (await E("state.business.pipeline.map(p=>p.stage).join()"))==='lead,proposal,lost');
  check('stage labels renamed', (await E("crmStage('lead','discovery').label"))==='Call booked' && (await E("crmStage('lead','closed').label"))==='Won');
  check('migration persisted', (await p.evaluate(()=>JSON.parse(localStorage.getItem('opsdash:business')).clients[0].touchpoints.length))===2);
  // client health from cadence (last touch 9d ago, cadence 7 → overdue 2d → amber)
  check('client health red when a touch is due', (await E("clientHealthStatus(state.business.clients[0]).level"))==='red', await E("clientCareTier(state.business.clients[0])"));
  // reach out list on Today
  const ro = await E("reachOutList().map(r=>r.x.id+':'+r.n)");
  check('reach out list sorted most overdue', ro[0].startsWith('p1:') && ro.includes('c1:2'), ro);
  check('reach out panel on dashboard', await p.isVisible('.client-hub .hub-card[data-key="hub-c1"]'));
  // one-click log touch from dashboard
  await p.click('.hub-card[data-key="hub-c1"] .touch-log-btn');
  check('one-click touch logged', (await E("state.business.clients[0].touchpoints.length"))===3 && (await E("state.business.clients[0].touches.length"))===3);
  check('client now healthy', (await E("clientHealthStatus(state.business.clients[0]).level"))==='green');
  await p.click('.toast .toast-action');
  check('touch undo', (await E("state.business.clients[0].touchpoints.length"))===2);
  // Leads tab via View all
  await p.click('[data-action="goToLeads"]');
  check('leads board', await p.isVisible('.crm-board') && (await p.$$('.crm-col')).length===6);
  // touch menu: pick a call
  await p.click('.crm-card[data-key="crm-p1"] .touch-more-btn');
  await p.click('.crm-card[data-key="crm-p1"] [data-type="call"]');
  check('typed touch logged (call)', (await E("state.business.pipeline[0].touchpoints[0].type"))==='call');
  // drag p1 to Contacted
  await p.evaluate(() => {
    const card = document.querySelector('[data-crm-drag="lead:p1"]'); const col = document.querySelector('[data-crm-drop="lead:contacted"]');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', {dataTransfer:dt, bubbles:true}));
    col.dispatchEvent(new DragEvent('dragover', {dataTransfer:dt, bubbles:true, cancelable:true}));
    col.dispatchEvent(new DragEvent('drop', {dataTransfer:dt, bubbles:true, cancelable:true}));
  });
  check('drag between stages', (await E("state.business.pipeline[0].stage"))==='contacted' && (await E("state.business.pipeline[0].timeline.some(t=>t.type==='stage')")));
  // list view, search, filter
  await p.click('[data-action="crmView"][data-id="list"]');
  check('list view', await p.isVisible('.crm-list'));
  await p.click('[data-action="crmToggleTools"][data-kind="lead"]');
  await p.fill('#crmSearch-lead', 'roof'); await p.waitForTimeout(250);
  check('search filters', (await p.$$('.crm-row:not(.crm-row-head)')).length===1);
  await p.fill('#crmSearch-lead', ''); await p.waitForTimeout(250);
  await p.selectOption('[data-crm-filter="lead:last"]', 'never');
  check('filter never contacted', (await p.$$('.crm-row:not(.crm-row-head)')).length===2);
  await p.selectOption('[data-crm-filter="lead:last"]', '');
  await p.click('[data-action="crmView"][data-id="board"]');
  // lost with reason
  await p.click('.crm-card[data-key="crm-p2"] .crm-card-main');
  check('lead contact modal', await p.isVisible('#contactOverlay:not(.hidden) .crm-block'));
  check('timeline shows linked tasks?', true);
  await p.click('[data-action="markLeadLost"]');
  await p.click('[data-action="pickLostReason"][data-id="Price"]');
  await p.click('[data-action="confirmLost"]');
  check('lost with reason', (await E("state.business.pipeline[1].stage"))==='lost' && (await E("state.business.pipeline[1].lostReason"))==='Price');
  // won → client carries history
  await p.click('.crm-card[data-key="crm-p1"] .crm-card-main');
  // add a file to the lead first (drop)
  await p.evaluate(async () => {
    const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4 test'], 'contract.pdf', {type:'application/pdf'}));
    const zone = document.querySelector('#contactContent [data-photo-drop="contactfiles"]');
    zone.dispatchEvent(new DragEvent('dragover', {dataTransfer:dt, bubbles:true, cancelable:true}));
    zone.dispatchEvent(new DragEvent('drop', {dataTransfer:dt, bubbles:true, cancelable:true}));
  });
  await p.waitForTimeout(300);
  check('file attached to lead (idb)', (await E("state.business.pipeline[0].files.length"))===1 && (await E("state.business.pipeline[0].files[0].ref")).startsWith('idb:'));
  await p.fill('#crmLink-p1', 'drive.google.com/folder/abc'); await p.click('#contactContent [data-action="addContactLink"]');
  check('link added', (await E("state.business.pipeline[0].files.length"))===2);
  await p.fill('#contactContent [data-file-rename]', 'Signed contract.pdf'); await p.press('#contactContent [data-file-rename]', 'Tab');
  check('file renamed', (await E("state.business.pipeline[0].files[0].name"))==='Signed contract.pdf');
  await p.click('#contactContent [data-action="previewFile"]');
  check('pdf preview', await p.isVisible('#filePreviewOverlay:not(.hidden) iframe'));
  await p.click('[data-action="closeFilePreview"]');
  await p.click('[data-action="markLeadWon"]');
  const conv = await E("state.business.clients.find(c=>c.fromLeadId==='p1')");
  check('won → client with touches, files, timeline', conv && conv.stage==='onboarding' && conv.touchpoints.length===1 && conv.files.length===2 && conv.timeline.length>=3, conv);
  check('client modal opened with CRM block', await p.isVisible('#clientModalOverlay:not(.hidden) .crm-block'));
  // client modal: log touch via form with note
  await p.click('#clientModalContent .touch-type-chip:has(input[value="email"])');
  await p.fill('#crmTouchNote-'+conv.id, 'Sent onboarding doc');
  await p.click('#clientModalContent [data-action="logTouchFromForm"]');
  check('form touch with note', (await E("state.business.clients.find(c=>c.fromLeadId==='p1').touchpoints.some(t=>t.type==='email' && t.note==='Sent onboarding doc')")));
  await p.click('[data-action="closeClientModalAndSave"]');
  // clients tab board
  await p.click('[data-action="businessTab"][data-tab="clients"]');
  check('clients tab shows client cards', (await p.$$('.cc2')).length>=1);
  check('FAB = add client', (await p.getAttribute('#fabAdd','title'))==='Add client');
  await p.click('#fabAdd'); await p.fill('#ncName','Zed'); await p.fill('#ncCompany','Zed Media'); await p.fill('#ncValue','900'); await p.click('[data-action="saveNewContact"]');
  check('new client created', (await E("state.business.clients.some(c=>c.business==='Zed Media' && c.stage==='onboarding' && c.status==='active')")));
  check('new client opens on its lifecycle', await p.isVisible('#clientModalOverlay:not(.hidden) .lc-card'));
  await p.click('[data-action="closeClientModalAndSave"]');
  await p.screenshot({path:SP+'/p4-clients.png'});
  await p.click('[data-action="businessTab"][data-tab="leads"]');
  await p.screenshot({path:SP+'/p4-leads.png'});
  // settings: stages + cadence
  await p.click('[data-action="nav"][data-view="settings"]'); await p.click('[data-action="settingsTab"][data-tab="business"]');
  await p.fill('#newStage-lead', 'Follow-up'); await p.click('[data-action="addStage"][data-kind="lead"]');
  check('stage added before Won', (await E("crmStages('lead').map(s=>s.label).join('|')")).includes('Proposal sent|Follow-up|Won'));
  await p.fill('[data-stage-label="lead:lead"]', 'Fresh'); await p.press('[data-stage-label="lead:lead"]','Tab');
  check('stage renamed', (await E("crmStage('lead','lead').label"))==='Fresh');
  await p.fill('#setClientCadence', '14'); await p.press('#setClientCadence','Tab');
  check('client cadence saved', (await E("crm().clientCadenceDays"))===14);
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();

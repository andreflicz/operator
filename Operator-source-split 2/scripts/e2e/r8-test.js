// Round 8: only active time counts, GoHighLevel sync, client card flip, the morning briefing,
// board copy/paste, a customizable locked-in page, Now outside lock-in, Settings → You,
// app-update ranges, the goal bar on Business, and video wallpapers that play by themselves.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r8.html');
  const b = await launch();
  const T0 = new Date(2026,9,8,10,0).getTime();
  const tracking = {appTracking:{enabled:true, autoLockIn:true, thresholdMinutes:12, graceMinutes:3, cooldownMinutes:15, idleSeconds:60, awayMinutes:10}};

  // ---- only active time counts ----
  {
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre'}, settings:tracking}, T0);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    let log = '';
    const add = (fromMin, toMin, app, idle) => { for(let m=fromMin; m<=toMin; m+=1/6){ log += Math.round(T0+m*60000)+'\t'+app+'\t'+(idle||0)+'\t\n'; } };
    await p.route('http://127.0.0.1:8934/**', r => r.fulfill({status:200, body:log, headers:{'Access-Control-Allow-Origin':'*'}}));
    const poll = async (atMin) => { await p.clock.setSystemTime(T0+atMin*60000+1000); await E('pollAppActivity()'); await p.waitForTimeout(60); };
    // you lock in yourself at 10:00, work in Firefox for 30 min, then leave for 2.5 hours
    await E("startFocus(null)");
    add(0, 30, 'Firefox');
    await poll(30);
    check('a session you started yourself keeps running while you\'re active', await E("!!state.focus.activeSession"));
    add(30.2, 180, 'Firefox', 400); // the Mac keeps sampling, but nobody's touching it
    await poll(36);
    check('a few idle minutes don\'t stop it', await E("!!state.focus.activeSession"));
    await poll(180);
    const s = await E("state.focus.sessions[state.focus.sessions.length-1]");
    check('away 10+ minutes: the session stops at the last active moment', !(await E("!!state.focus.activeSession")) && s && Math.abs(s.endedAt-(T0+30*60000)) < 30000 && s.away===true, s);
    check('…so the 2½ hours away never count', s && s.minutes<=31 && (await E("deepWorkMinutesFor(todayStr())"))<=31);
    add(180.2, 181, 'Firefox');
    await poll(181);
    await p.clock.runFor(400);   // let the notice fade in
    check('back at the keys: a notice says what happened, with a way to undo', (await p.textContent('#toastContainer')).includes('stepped away') && await p.isVisible('#toastContainer [data-action="restoreAwaySession"]'));
    await p.click('#toastContainer [data-action="restoreAwaySession"]'); await p.waitForTimeout(100);
    check('"I was working" puts the time back', Math.abs((await E("state.focus.activeSession ? state.focus.activeSession.startedAt : 0"))-T0) < 5000 && (await E("state.focus.sessions.filter(x=>x.away).length"))===0);
    check('idle Firefox time isn\'t app time', (await E("appMinutesForDate(todayStr())['Firefox']")) <= 32);
    check('no errors (away)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- GoHighLevel ----
  {
    const NOW = new Date(2026,9,8,11,0).getTime();
    const tomorrow2pm = new Date(2026,9,9,14,0).getTime();
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre'},
      business:{packages:[], pipeline:[{id:'l0',name:'Old Lead',company:'Old Co',stage:'contacted',value:500,createdAt:'2026-09-01',touchpoints:[],email:'old@co.com'}],
        clients:[{id:'c1',name:'Jay',business:'JJS Fitness',email:'jay@jjs.com',phone:'(555) 010-2000',status:'active',stage:'active',mrr:2500,createdAt:'2026-05-01',touches:[],touchpoints:[],deliverables:[],journal:[]}]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const calls = [];
    const dehex = h => Buffer.from(h, 'hex').toString('utf8');
    await p.route('http://127.0.0.1:8936/**', async r => {
      const u = new URL(r.request().url());
      const json = (o, s) => r.fulfill({status:s||200, body:JSON.stringify(o), headers:{'Access-Control-Allow-Origin':'*', 'Content-Type':'application/json'}});
      if(u.pathname==='/ghl/save'){ calls.push('save:'+dehex(u.searchParams.get('t'))); return json({ok:true}); }
      if(u.pathname==='/ghl/status') return json({ok:true, hasKey:true});
      if(u.pathname==='/ghl/forget'){ calls.push('forget'); return json({ok:true}); }
      const m = u.searchParams.get('m'), path = dehex(u.searchParams.get('p')), body = u.searchParams.get('b') ? JSON.parse(dehex(u.searchParams.get('b'))) : null;
      calls.push(m+' '+path.split('?')[0]+(body ? ' '+JSON.stringify(body) : ''));
      if(path.startsWith('/opportunities/pipelines')) return json({pipelines:[{id:'pp', name:'Sales Pipeline', stages:[{id:'s1',name:'New Lead',position:0},{id:'s2',name:'Contacted',position:1},{id:'s3',name:'Appointment Booked',position:2},{id:'s4',name:'Proposal Sent',position:3},{id:'s5',name:'Closed Won',position:4}]}]});
      if(path.startsWith('/opportunities/search')) return json({opportunities:[
        {id:'o1', name:'Peak Roofing', monetaryValue:3000, pipelineId:'pp', pipelineStageId:'s1', status:'open', contactId:'k1', createdAt:'2026-10-07T15:00:00Z', contact:{id:'k1', name:'Mike Peak', companyName:'Peak Roofing', email:'mike@peak.com', phone:'+15550101000'}},
        {id:'o2', name:'Old Co deal', monetaryValue:800, pipelineId:'pp', pipelineStageId:'s4', status:'open', contactId:'k0', createdAt:'2026-09-01T15:00:00Z', contact:{id:'k0', name:'Old Lead', companyName:'Old Co', email:'old@co.com'}},
        {id:'o3', name:'JJS upsell', monetaryValue:1000, pipelineId:'pp', pipelineStageId:'s2', status:'open', contactId:'k9', createdAt:'2026-10-01T15:00:00Z', contact:{id:'k9', name:'Jay', companyName:'JJS Fitness', email:'jay@jjs.com', phone:'5550102000'}}], meta:{total:3}});
      if(path.startsWith('/opportunities/')) return json({opportunity:{id:'o1'}});
      if(path.startsWith('/calendars/events')) return json({events:[
        {id:'ev1', title:'Discovery call — Mike', startTime:new Date(tomorrow2pm).toISOString(), contactId:'k1', appointmentStatus:'confirmed', address:'https://zoom.us/j/1'},
        {id:'ev2', title:'Cancelled thing', startTime:new Date(tomorrow2pm).toISOString(), contactId:'k1', appointmentStatus:'cancelled'}]});
      if(path.startsWith('/calendars/')) return json({calendars:[{id:'cal1', name:'Calls'}]});
      if(path.startsWith('/conversations/search')) return json({conversations:[
        {id:'cv1', contactId:'k9', lastMessageDate:NOW-3600000, lastMessageDirection:'outbound', lastMessageType:'TYPE_SMS', fullName:'Jay', email:'jay@jjs.com'},
        {id:'cv2', contactId:'k1', lastMessageDate:NOW-7200000, lastMessageDirection:'inbound', lastMessageType:'TYPE_EMAIL'}]});
      return json({error:'unknown'}, 404);
    });
    await p.click('[data-action="nav"][data-view="settings"]'); await p.click('[data-action="settingsTab"][data-tab="integrations"]'); await p.waitForTimeout(150);
    check('Settings → Integrations has GoHighLevel, with setup steps', /GoHighLevel/.test(await p.textContent('#viewRoot')) && await p.isVisible('#ghlKey') && /Private Integrations/.test(await p.textContent('.ghl-steps')));
    await p.fill('#ghlKey', 'pit-secret-123'); await p.fill('#ghlLoc', 'LOC123');
    await p.click('[data-action="ghlConnect"]'); await p.waitForTimeout(400);
    check('the key goes to the Operator app on the Mac — not into Operator\'s data', calls.includes('save:pit-secret-123') && !(await E("JSON.stringify(state)")).includes('pit-secret-123'));
    check('connecting reads your pipelines', (await E("ghlCfg().connected"))===true && (await E("ghlCfg().pipelines.length"))===1);
    const map = await E("ghlCfg().stageMap");
    check('GHL stages are matched to yours by name', map.s1==='lead' && map.s2==='contacted' && map.s3==='discovery' && map.s4==='proposal' && map.s5==='closed', map);
    await p.click('[data-action="ghlSyncNow"]'); await p.waitForTimeout(600);
    const lead = await E("state.business.pipeline.find(l=>l.ghlOppId==='o1')");
    check('open opportunities come in as leads', lead && lead.company==='Peak Roofing' && lead.value===3000 && lead.email==='mike@peak.com', lead);
    check('an existing lead is matched, not duplicated — and follows its GHL stage', (await E("state.business.pipeline.filter(l=>l.company==='Old Co').length"))===1 && (await E("state.business.pipeline.find(l=>l.company==='Old Co').stage"))==='proposal');
    check('your client is linked to their GHL contact by phone/email', (await E("state.business.clients[0].ghlContactId"))==='k9');
    const ev = await E("state.calendar.events.find(e=>e.ghlEventId==='ev1')");
    check('appointments land in the Calendar, linked to the lead', ev && ev.date==='2026-10-09' && ev.time==='14:00' && ev.linkedClient==='lead:'+lead.id && ev.meetingLink==='https://zoom.us/j/1', ev);
    check('cancelled appointments don\'t', !(await E("state.calendar.events.some(e=>e.ghlEventId==='ev2')")));
    check('a booked call moves the lead to "Call booked"', (await E("state.business.pipeline.find(l=>l.ghlOppId==='o1').stage"))==='discovery');
    check('a text you sent from GHL counts as a touch', (await E("state.business.clients[0].touchpoints.filter(t=>t.via==='ghl').length"))===1);
    check('…but a message they sent you doesn\'t', (await E("state.business.pipeline.find(l=>l.ghlOppId==='o1').touchpoints.filter(t=>t.via==='ghl').length"))===0);
    await p.click('[data-action="ghlSyncNow"]'); await p.waitForTimeout(500);
    check('syncing again doesn\'t duplicate anything', (await E("state.business.pipeline.length"))===3 && (await E("state.calendar.events.filter(e=>e.ghlEventId).length"))===1 && (await E("state.business.clients[0].touchpoints.filter(t=>t.via==='ghl').length"))===1);
    check('the card shows when it last synced and what came in', /Last sync/.test(await p.textContent('.ghl-card')) && /new lead/.test(await p.textContent('.ghl-card')));
    const lid = lead.id;
    calls.length = 0;
    await E("setStage('lead', '"+lid+"', 'proposal')"); await p.waitForTimeout(200);
    check('moving a lead in Operator moves it in GHL', calls.some(c => c.startsWith('PUT /opportunities/o1') && c.includes('"pipelineStageId":"s4"')), calls);
    check('no errors (GHL)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- client card: the face, then flip to edit ----
  {
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre'},
      business:{packages:[{id:'p1',name:'Growth',price:2500,deliverables:[]}], pipeline:[], clients:[{id:'c1',name:'Jay',business:'JJS Fitness',status:'active',stage:'active',mrr:2500,packageId:'p1',leadSource:'metaads',startDate:'2026-05-02',createdAt:'2026-05-02',touches:[],touchpoints:[],notes:'Call on Fridays.',deliverables:[{id:'d1',title:'Reels',recurring:true,weeklyTarget:2,completedDates:[]}],journal:[]}]}}, T0);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openClientModal('c1')"); await p.waitForTimeout(200);
    const face = await p.textContent('#clientModalContent');
    check('a client opens on a simple card: health, name, plan + deliverables, how we got them, how long, notes', /JJS Fitness/.test(face) && /Growth/.test(face) && /Reels/.test(face) && /Meta Ads/.test(face) && /months/.test(face) && /Call on Fridays/.test(face) && await p.isVisible('#clientModalContent .health-pill'));
    check('…with nothing to edit on the face', !(await p.$('#clientModalContent input, #clientModalContent textarea')));
    await p.click('[data-action="clientFlip"][data-id="back"]'); await p.waitForTimeout(300);
    check('Edit flips it over to everything you can change', await p.isVisible('#clientModalNotes') && await p.isVisible('.client-name-input'));
    await p.context().close();
  }

  // ---- wake-up: alarm screen, then the morning briefing ----
  {
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre'}, tasks:{items:[{id:'t1',title:'Edit JJS reel',status:'today',priority:'high',clients:['personal']}]},
      focus:{wake:{enabled:true,time:'07:00',days:[0,1,2,3,4,5,6]}}, boards:{boards:[{id:'v1',kind:'vision',name:'Vision',parentId:null,elements:[{id:'e1',type:'note',header:true,color:'#3FBE8E',title:'Mind + Body',body:'',x:0,y:0,w:240,h:80}],viewport:{x:0,y:0,zoom:1}}], masterId:'v1'}}, new Date(2026,9,8,7,0).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({test:true})"); await p.waitForTimeout(300);
    check('the alarm screen: big clock, I\'m up, snooze', await p.isVisible('.wk2-clock') && await p.isVisible('.wk2-up') && await p.isVisible('.wk2-snooze'));
    check('…and no vision board on the alarm screen (it\'s in the briefing now)', !(await p.isVisible('.wk2-vision')));
    await p.click('[data-action="wakeImUp"]'); await p.waitForTimeout(400);
    check('the briefing opens with the vision board', await p.isVisible('.br-vision'));
    await p.click('.br-vision'); await p.waitForTimeout(200);
    check('clicking it opens the vision board big', await p.isVisible('.br-vision-big'));
    await p.click('.br-vision-big .wk2-vision-x'); await p.waitForTimeout(200);
    const brief = await p.textContent('.brief');
    check('"I\'m up" opens the morning briefing', /Good morning/.test(brief) && /Yesterday/.test(brief) && /Today.s plan/.test(brief) && /Goals/.test(brief) && /Edit JJS reel/.test(brief));
    await p.click('[data-action="wakeBriefDone"]'); await p.waitForTimeout(200);
    check('Let\'s go takes you into the day', !(await p.isVisible('#wakeOverlay:not(.hidden)')) && (await E("ui.view"))==='today');
    check('no errors (wake)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- boards: right-click keeps the selection; copy to another board ----
  {
    const note = (id, title, x) => ({id, type:'note', header:true, color:'#3FBE8E', title, body:'', x:x, y:0, w:200, h:80});
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre'}, boards:{boards:[
      {id:'j1', kind:'journal', name:'Board A', parentId:null, elements:[note('a1','One',0), note('a2','Two',260), note('a3','Three',520)], viewport:{x:40,y:80,zoom:1}},
      {id:'j2', kind:'journal', name:'Board B', parentId:null, elements:[], viewport:{x:40,y:80,zoom:1}}], masterId:null}}, T0);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='personal'; ui.personalTab='journal'; ui.journalMode='boards'; renderView()"); await p.waitForTimeout(200);
    await E("openBoard('journal','j1')"); await p.waitForTimeout(300);
    await E("cv.sel = new Set(['a1','a2']); drawBoard()");
    await p.click('.bel[data-el="a2"]', {button:'right'}); await p.waitForTimeout(150);
    check('right-clicking one of several picked cards keeps them all picked', (await E("cv.sel.size"))===2 && /2 cards/.test(await p.textContent('#appCtxMenu .ctx-title')));
    await p.click('#appCtxMenu [data-op="bCopy"]'); await p.waitForTimeout(100);
    await E("openBoard('journal','j2')"); await p.waitForTimeout(300);
    await p.mouse.move(700, 500);
    await p.click('#boardHost', {button:'right', position:{x:300, y:200}}); await p.waitForTimeout(150);
    check('another board offers Paste', await p.isVisible('#appCtxMenu [data-op="bPaste"]'));
    await p.click('#appCtxMenu [data-op="bPaste"]'); await p.waitForTimeout(200);
    const els = await E("boardById('j2').elements.map(e=>e.title+':'+(e.id!=='a1'&&e.id!=='a2'))");
    check('…and the cards land there (new copies, layout kept)', els.length===2 && els.every(x => x.endsWith(':true')) && els.some(x => x.startsWith('One')) && (await E("Math.abs((boardById('j2').elements[1].x-boardById('j2').elements[0].x)-260)<1")));
    check('the original board still has its cards', (await E("boardById('j1').elements.length"))===3);
    // ⌘C / ⌘V through the clipboard events
    await E("openBoard('journal','j1')"); await p.waitForTimeout(200);
    await E("cv.sel = new Set(['a3']); drawBoard()");
    const copied = await p.evaluate(() => { const dt = new DataTransfer(); const ev = new ClipboardEvent('copy', {clipboardData:dt, bubbles:true, cancelable:true}); document.dispatchEvent(ev); return dt.getData('text/plain'); });
    check('⌘C puts the cards on the clipboard', copied.startsWith('operator-board-cards:v1:'));
    await E("openBoard('journal','j2')"); await p.waitForTimeout(200);
    await p.evaluate((t) => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.dispatchEvent(new ClipboardEvent('paste', {clipboardData:dt, bubbles:true, cancelable:true})); }, copied);
    await p.waitForTimeout(200);
    check('⌘V on another board pastes them', (await E("boardById('j2').elements.length"))===3 && (await E("boardById('j2').elements.some(e=>e.title==='Three')")));
    check('no errors (boards)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- locked-in page: your layout ----
  {
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre'}, focus:{activeSession:{startedAt:T0-20*60000, breaks:[], onBreak:false, completedTasks:[]}}}, T0);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('locked in: a Customize button', await p.isVisible('[data-action="toggleLockedEdit"]'));
    await p.click('[data-action="toggleLockedEdit"]'); await p.waitForTimeout(150);
    await p.click('[data-action="lockedAdd"][data-id="journal"]'); await p.waitForTimeout(150);
    check('add the journal to the locked-in page', (await E("lockedLayout().indexOf('journal')"))>=0);
    await p.click('.ll-block[data-key="ll-journal"] [data-action="lockedMove"][data-dir="-1"]'); await p.waitForTimeout(100);
    await p.click('[data-action="lockedHide"][data-id="reachout"]'); await p.waitForTimeout(100);
    const order = await E("lockedLayout()");
    check('move blocks and hide them', order.indexOf('reachout')<0 && order.indexOf('journal') < order.length-1, order);
    check('the timer can\'t be hidden', !(await p.$('[data-action="lockedHide"][data-id="timer"]')));
    await p.click('[data-action="toggleLockedEdit"]'); await p.waitForTimeout(150);
    check('your layout is kept', await p.isVisible('.ll-block[data-key="ll-journal"] .journal-compose, .ll-block[data-key="ll-journal"] textarea') && (await E("state.profile.lockedLayout.order.indexOf('journal')"))>=0);
    await p.context().close();
  }

  // ---- small things ----
  {
    const entries = [
      {id:'u1', date:'2026-10-08', timestamp:T0-10*60000, text:'Update A', mood:'up', photos:[]},
      {id:'u2', date:'2026-10-08', timestamp:T0-40*60000, text:'Update B', mood:'up', photos:[]},
      {id:'u3', date:'2026-10-08', timestamp:T0-200*60000, text:'Update C (earlier session)', mood:'up', photos:[]}];
    const p = await newPage(b, OUT+'/r8.html', {profile:{name:'Andre', revenueGoalMonthly:10000}, journal:{entries, types:[{id:'starred',emoji:'⭐',label:'Starred',color:'#FFD700'},{id:'up',emoji:'📣',label:'Updates',color:'#8fdcff'}]},
      tasks:{items:[{id:'t1',title:'Edit reel',status:'today',priority:'high',clients:['personal']}]},
      business:{packages:[], pipeline:[], clients:[{id:'c1',name:'N',business:'Nina Co',status:'active',stage:'active',mrr:2500,createdAt:'2026-09-01',touches:[],touchpoints:[],deliverables:[],journal:[]}]}}, T0);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('[data-action="nav"][data-view="settings"]'); await p.waitForTimeout(150);
    check('Settings opens on You', (await E("ui.settingsTab"))==='you' && /About you/.test(await p.textContent('#viewRoot')) && await p.isVisible('#setName') && /Daily Standard/.test(await p.textContent('#viewRoot')) && /Why You/.test(await p.textContent('#viewRoot')));
    await p.click('[data-action="settingsTab"][data-tab="updates"]'); await p.waitForTimeout(150);
    check('App updates open on the latest session', (await p.$$('.upd-card')).length===2);
    await p.selectOption('#updatesRangeSel', '1h'); await p.waitForTimeout(100);
    check('…or the last hour', (await p.$$('.upd-card')).length===2);
    await p.selectOption('#updatesRangeSel', 'all'); await p.waitForTimeout(100);
    check('…or everything', (await p.$$('.upd-card')).length===3);
    await p.click('[data-action="nav"][data-view="business"]'); await p.waitForTimeout(200);
    check('the revenue bar shows where the goal is', await p.isVisible('.hq-mrr .biz-bar-end') && /\$10k|\$10,000/.test(await p.textContent('.hq-mrr .biz-bar-end')));
    await p.click('[data-action="nav"][data-view="focus"]'); await p.waitForTimeout(200);
    check('not locked in: Now is there too', await p.isVisible('.nn-now'));
    await p.click('.nn-next [data-action="nnStartNext"]'); await p.waitForTimeout(150);
    check('Start now times the task without locking in', (await E("ui.currentTaskId"))==='t1' && !(await E("!!state.focus.activeSession")) && await p.isVisible('.nn-now [data-action="releaseCurrentTask"]'));
    check('video wallpapers play whenever the window is on screen (not only when it\'s in front)', await E("(document.hasFocus = () => false, videoWallShouldPlay())"));
    check('no errors (small)', !p.errors.length, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

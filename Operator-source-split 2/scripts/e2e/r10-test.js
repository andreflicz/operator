// Round 10: the day loop (Wind down → plan of attack + note + alarm → sleep → alarm with the note →
// Good morning → briefing → Morning mode), one-click modes, numbered "Knock these out", package +
// deliverables in one block, Milanote-style boards (marquee, double-click text, easy arrow ends,
// right-click cancels), GoHighLevel Inbox (chats + contacts) and Social as its own tab + panel.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const hex = s => Buffer.from(s||'', 'hex').toString();
(async () => {
  instrument(process.argv[2], OUT+'/r10.html');
  const b = await launch();

  // ---- the day loop ----
  {
    const T = new Date(2026,9,9,22,30).getTime();
    const st = (h,m) => new Date(2026,9,9,h,m).getTime();
    const seed = {profile:{name:'Andre'}, tasks:{items:[
        {id:'a', title:'Edit JJS reel 3', status:'today', priority:'high', clients:['personal']}, {id:'b', title:'Script Nova ad', status:'today', priority:'med', clients:['personal']},
        {id:'c', title:'Invoice clients', status:'done', completedAt:'2026-10-09', priority:'low', clients:['personal']}, {id:'d', title:'Plan shoot', status:'backlog', priority:'med', clients:['personal']},
        {id:'e', title:'Call Mike back', status:'backlog', priority:'high', clients:['personal']}]},
      focus:{sessions:[{id:'s1', type:'deep', date:'2026-10-09', startedAt:st(9,0), endedAt:st(10,40), minutes:100, completedTasks:[]}],
        wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], intro:'cinematic'}}};
    const p = await newPage(b, OUT+'/r10.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    check('one Wind down button at night (no dropdown)', await p.isVisible('[data-action="openWindDown"]') && !(await p.$('.wind-drop')));
    await p.click('[data-action="openWindDown"]'); await p.waitForTimeout(300);
    const recap = await p.textContent('#windContent');
    check('step 1 is a clean recap of today', (await p.$$('#windOverlay .wd-step')).length===4 && /Invoice clients/.test(recap));
    await p.click('#windOverlay [data-action="windNext"]'); await p.waitForTimeout(200);
    check('plan starts from today\'s lineup, numbered', (await p.$$('#windContent .plan-list li, #windContent .wd-plan li')).length>=2);
    await p.click('#windOverlay .wd-chip:has-text("Call Mike back")'); await p.waitForTimeout(150);
    await p.click('#windOverlay [data-action="windMove"][data-id="e"][data-dir="-1"]'); await p.waitForTimeout(100);
    await p.click('#windOverlay [data-action="windMove"][data-id="e"][data-dir="-1"]'); await p.waitForTimeout(100);
    check('reorder: the new task moves to #1', await E("ui.wind.plan[0]")==='e', await E("ui.wind.plan"));
    await p.click('#windOverlay [data-action="windRemove"][data-id="b"]'); await p.waitForTimeout(100);
    check('take one off the plan', await E("ui.wind.plan.join(',')")==='e,a');
    await p.click('#windOverlay [data-action="windNext"]'); await p.waitForTimeout(200);
    await p.fill('#windNote', 'Call Mike first. No phone till 10.');
    await p.click('#windOverlay [data-action="windNext"]'); await p.waitForTimeout(200);
    check('alarm step shows tomorrow\'s time', (await p.inputValue('#windAlarm'))==='07:00');
    await p.click('#windOverlay [data-action="windGoToSleep"]'); await p.waitForTimeout(300);
    check('plan saved in order for tomorrow', await E("JSON.stringify(state.focus.nightPlan.taskIds)")==='["e","a"]' && await E("state.focus.nightPlan.date")==='2026-10-10');
    check('the note is waiting for the morning', await E("morningNotesFor('2026-10-10').some(n=>/Call Mike first/.test(n.text))"));
    check('going to sleep goes straight to Sleep mode', await E("state.modes.active && state.modes.active.sleep") && !(await p.isVisible('#recapOverlay:not(.hidden)')) && !(await p.isVisible('#windOverlay:not(.hidden)')));
    // morning
    await p.clock.setSystemTime(new Date(2026,9,10,7,0,5).getTime()); await E("checkAllAlarms()"); await p.waitForTimeout(400);
    // round 13: the note's headline sits big on the alarm screen (.wk3-head, was .wk2-note)
    check('the alarm shows last night\'s note', await p.isVisible('.wk3-head') && /Call Mike first/.test(await p.textContent('.wk3-head')));
    await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(300);
    check('cinematic intro (setting) plays', await p.isVisible('.brief-intro.is-cinematic'));
    check('the plan lined itself up: #1 is up next', await E("state.focus.lineupOrder[0]")==='e' && await E("state.focus.nextTaskId")==='e' && await E("state.tasks.items.find(t=>t.id==='e').status")==='today');
    const h = await p.$('.br-lastnight');
    await p.waitForTimeout(4500);
    check('briefing doesn\'t pop in twice (same nodes after the intro)', await h.evaluate(n => n.isConnected));
    const brief = await p.textContent('#wakeOverlay');
    // round 13: "The Day Ahead" is now "Today", and the brief has no work in it at all
    check('briefing: the note and today (the plan waits for the business preview)', /Today/.test(await p.textContent('.br-day .br-k')) && /Call Mike first/.test(brief) && !/Call Mike back|Edit JJS reel 3/.test(brief));
    await E("ACTIONS.wakeIntroSkip()");
    // round 13: Start my morning hands off (520 ms leave animation) to the business preview, not Morning mode
    await p.evaluate(() => window.__op.ev("briefRevealAll()")); await p.waitForTimeout(900); await p.click('[data-action="wakeStartMorning"]'); await p.waitForTimeout(900);
    check('Start my morning → the business preview (no Morning mode)', !(await E("state.modes.active && state.modes.active.morning")) && !(await p.isVisible('#wakeOverlay:not(.hidden)')) && await p.isVisible('#planOverlay:not(.hidden) .wi-plan') && !(await p.isVisible('.mm-card')));
    const plan = await p.$$eval('#planOverlay .pr-list .pr-t', e => e.map(x => x.textContent));
    check('…its Plan of Attack is last night\'s plan, #1 first', plan[0]==='Call Mike back' && plan[1]==='Edit JJS reel 3', plan);
    check('…no "Not yet" — the corner ✕ closes it', await p.isVisible('#planOverlay .wd-close[data-action="closePlanReveal"]') && !/Not yet/.test(await p.textContent('#planOverlay')));
    await p.click('#planOverlay .pr-go'); await p.waitForTimeout(300);
    check('LOCK IN → Lock In on #1', !(await E("state.modes.active")) && !(await p.isVisible('#planOverlay:not(.hidden)')) && await p.isVisible('#lockSeqOverlay:not(.hidden)') && await E("ui.lockSeq.nowId")==='e');
    // Morning mode still exists for the other ways in (no button on the Good morning any more)
    await E("closeLockSeq(); ACTIONS.startMorning()"); await p.waitForTimeout(300);
    check('Morning mode: a routine and the note', await E("!!(state.modes.active && state.modes.active.morning)") && await p.isVisible('.mm-card') && /Call Mike first/.test(await p.textContent('#viewRoot')) && /Breakfast/.test(await p.textContent('#viewRoot')));
    await p.click('.mm-r-main >> nth=0'); await p.waitForTimeout(100);
    check('tick a routine step', (await E("state.focus.routineDone.ids.length"))===1);
    check('auto lock-in stays paused in the morning', await E("autoLockInBlockedReason()")==='mode');
    await p.click('.mm-clockin[data-action="clockIn"]'); await p.waitForTimeout(300);
    check('Start Work ends Morning mode and opens the business preview', !(await E("state.modes.active")) && await p.isVisible('#planOverlay:not(.hidden) .pr-go'));
    check('no errors (day loop)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- Today: one-click modes, numbered Knock these out, client card ----
  {
    const T = new Date(2026,9,9,14,30).getTime();
    const seed = {profile:{name:'Andre'}, tasks:{items:[
        {id:'a', title:'Edit JJS reel 3', status:'today', priority:'high', clients:['personal']}, {id:'b', title:'Script Nova ad', status:'today', priority:'med', clients:['personal']}, {id:'c', title:'Invoice clients', status:'today', priority:'low', clients:['personal']}]},
      focus:{lineupOrder:['c','a','b']},
      business:{packages:[{id:'pk1', name:'Growth', price:2000, deliverables:[{title:'Reels', weeklyTarget:2}]}], clients:[{id:'c1', name:'Jay', business:'JJS Fitness', status:'active', mrr:2000, packageId:'pk1', touches:['2026-10-08'],
        deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, fromPackage:true, completedDates:['2026-10-06']}]}], pipeline:[]}};
    const p = await newPage(b, OUT+'/r10.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    const row = await p.$('.th-modes'), rb = await row.boundingBox();
    const bw = await p.$$eval('.th-modes .th-mode', e => e.reduce((a, x) => a + x.getBoundingClientRect().width, 0));
    check('Shooting / Off-time / Day off fill the row', bw > rb.width*0.9, [bw, rb.width]);
    await p.click('.th-mode-shooting'); await p.waitForTimeout(200);
    check('Shooting starts with one click', (await E("state.modes.active && state.modes.active.type"))==='shooting');
    check('…and shows a mode card with an End button', await p.isVisible('.th-modecard'));
    await p.click('#toastContainer [data-action="undoQuickMode"]'); await p.waitForTimeout(150);
    check('Undo takes it back', !(await E("state.modes.active")));
    await E("startFocus(null); ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('locked in: one Now / Up next (not two)', (await p.$$('#viewRoot .now-next')).length===0 && (await p.$$('#viewRoot .nn-stack, #viewRoot [class*="nn-"]')).length>0);
    const nums = await p.$$eval('.knock-out-list .ko-num', e => e.map(x => x.textContent));
    const titles = await p.$$eval('.knock-out-list .task-title', e => e.map(x => x.textContent));
    check('Knock these out is numbered 01, 02, 03', nums.join()==='01,02,03', nums);
    check('…in your lineup order', titles[0]==='Invoice clients' && titles[1]==='Edit JJS reel 3', titles);
    await E("endFocusSessionForSwitch(); ui.view='business'; ui.businessTab='clients'; renderView()"); await p.waitForTimeout(300);
    check('client card: package sits on top of its deliverables', await p.isVisible('.cc2-delivs .cc2-pkg') && /Growth/.test(await p.textContent('.cc2-pkg')));
    await E("openClientModal('c1', true)"); await p.waitForTimeout(300);
    check('edit side: plan & deliverables in one block', (await p.$$('.plan-block')).length===1);
    check('no errors (today / clients)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- the Lock In sequence: 1 Task → 2 Length → 3 Set up → 4 Why, with ⚡ Lock in now ----
  {
    const T = new Date(2026,9,9,14,30).getTime();
    const seed = {profile:{name:'Andre'}, tasks:{items:[
        {id:'a', title:'Edit JJS reel 3', status:'today', priority:'high', clients:['personal']}, {id:'b', title:'Script Nova ad', status:'today', priority:'med', clients:['personal']},
        {id:'d', title:'Call Mike back', status:'backlog', priority:'high', clients:['personal']}]}, focus:{lineupOrder:['b','a']}};
    const p = await newPage(b, OUT+'/r10.html', seed, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
    await p.click('.lockin-cta'); await p.waitForTimeout(250);
    check('Lock In opens a 4-step sequence', await p.isVisible('#lockSeqOverlay:not(.hidden)') && (await p.$$('#lockSeqOverlay .wd-step')).length===4);
    check('step 1 starts on what\'s up next, lineup numbered in order', await E("ui.lockSeq.nowId")==='b' && (await p.$$eval('#lockSeqOverlay .ls-row .wd-num', e => e.map(x => x.textContent))).join()==='01,02');
    check('the corner Lock in is there from step 1', await p.isVisible('#lockSeqOverlay [data-action="lockNow"]'));
    await p.click('#lockSeqOverlay .wd-chip:has-text("Call Mike back")'); await p.waitForTimeout(100);
    await p.click('#lockSeqOverlay .ls-row[data-id="d"] .ls-row-main'); await p.waitForTimeout(100);
    check('add from the rest of your list, then pick it as Now', await E("ui.lockSeq.nowId")==='d' && await E("state.tasks.items.find(t=>t.id==='d').status")==='today');
    await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    check('Enter → next step (Method)', await E("ui.lockSeq.step")==='method');
    await p.click('[data-action="lockLength"][data-min="25"]'); await p.waitForTimeout(100);
    check('single block of 25 minutes — shows when you\'re done', await E("ui.lockSeq.minutes")===25 && /Done at/.test(await p.textContent('.ls-ends')));
    await p.click('[data-action="lockCustom"]'); await p.fill('#lockCustomMin', '40');
    await p.click('#lockSeqOverlay [data-action="lockNext"]'); await p.waitForTimeout(150);
    check('custom length', await E("ui.lockSeq.minutes")===40 && await E("ui.lockSeq.step")==='prep');
    const n = (await p.$$('.ls-check')).length;
    for(let i=0;i<n;i++) await p.click('.ls-check >> nth='+i);
    check('tick the set-up checklist', /Ready/.test(await p.textContent('.ls-ready')));
    await p.click('#lockSeqOverlay [data-action="lockNext"]'); await p.waitForTimeout(150);
    check('Why: getting / avoiding + deep work after this session', await p.isVisible('.ls-col.is-get') && await p.isVisible('.ls-col.is-avoid') && /0\.7h/.test(await p.textContent('.ls-bar-k')));
    await p.click('.ls-go'); await p.waitForTimeout(200);
    check('a "Locked in" stamp plays first', await p.isVisible('.lock-flash'));
    await p.waitForTimeout(1500);
    const s = await E("JSON.stringify({m:state.focus.activeSession && state.focus.activeSession.plannedMinutes, cur:ui.currentTaskId, st:state.tasks.items.find(t=>t.id==='d').status, last:state.focus.lastLock.minutes})");
    check('then LOCK IN starts it: the task, 40 min, in today', s==='{"m":40,"cur":"d","st":"today","last":40}', s);
    await E("state.focus.sessions.push(Object.assign({id:'x', minutes:1, date:todayStr(), endedAt:Date.now()}, state.focus.activeSession)); state.focus.activeSession=null; ui.currentTaskId=null; renderView()");
    await p.waitForTimeout(600);
    await p.keyboard.press('l'); await p.waitForTimeout(150);
    check('next time it remembers your length', await E("ui.lockSeq.minutes")===40);
    await p.click('#lockSeqOverlay [data-action="lockNow"]'); await p.waitForTimeout(1700);
    check('the corner Lock in starts straight from step 1', await E("!!state.focus.activeSession && state.focus.activeSession.plannedMinutes===40") && !(await p.isVisible('#lockSeqOverlay:not(.hidden)')));
    check('no errors (lock in)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- boards ----
  {
    const els = [{id:'n1', type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'Feeding the body.', x:0, y:0, w:300, h:96, z:1},
      {id:'n2', type:'note', header:false, title:'', body:'Small note text', x:380, y:20, w:220, h:90, z:2},
      {id:'l1', type:'line', color:'#E8A23D', width:2, arrow:true, x1:320, y1:200, x2:520, y2:260, z:3}];
    const p = await newPage(b, OUT+'/r10.html', {profile:{name:'Andre'}, boards:{boards:[{id:'v1', kind:'vision', name:'Vision Board', parentId:null, elements:els, viewport:{x:0,y:0,zoom:1}}], masterId:'v1'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("showBoardsPage('v1'); renderView()"); await p.waitForTimeout(700);
    const hb = await (await p.$('#boardHost')).boundingBox();
    const vp = await E("JSON.stringify(boardById('v1').viewport)");
    await p.mouse.move(hb.x+10, hb.y+10); await p.mouse.down(); await p.mouse.move(hb.x+hb.width*0.8, hb.y+hb.height*0.45, {steps:8}); await p.mouse.up();
    check('drag on empty space draws a selection box', (await E("Array.from(cv.sel).sort().join(',')")).includes('n1,n2') && vp===await E("JSON.stringify(boardById('v1').viewport)"));
    await p.mouse.dblclick(hb.x+hb.width-60, hb.y+hb.height-60); await p.waitForTimeout(200);
    await p.keyboard.type('Hello board'); await p.mouse.click(hb.x+20, hb.y+hb.height-20); await p.waitForTimeout(200);
    const nn = await E("JSON.stringify(boardById('v1').elements.find(e=>e.body==='Hello board')||null)");
    check('double-click opens a text box right there', nn!=='null');
    check('new notes are a readable size', nn!=='null' && JSON.parse(nn).w>=240);
    check('note text is crisp (15px, no will-change scaling)', await p.$eval('.bel-body', e => parseFloat(getComputedStyle(e).fontSize))>=15 && await p.$eval('.board-world', e => getComputedStyle(e).willChange)!=='transform');
    const v = JSON.parse(await E("JSON.stringify(boardById('v1').viewport)"));
    const ex = hb.x + v.x + 520*v.zoom + 8, ey = hb.y + v.y + 260*v.zoom + 6;
    await p.mouse.move(ex, ey); await p.mouse.down(); await p.mouse.move(ex+60, ey+40, {steps:5}); await p.mouse.up(); await p.waitForTimeout(100);
    const l1 = JSON.parse(await E("JSON.stringify(boardById('v1').elements.find(e=>e.id==='l1'))"));
    check('grab an arrow end without pixel-perfect aim', l1.x2!==520 && l1.x1===320, l1);
    await E("ACTIONS.boardAddArrow()"); await p.mouse.click(hb.x+100, hb.y+200); await p.mouse.click(hb.x+150, hb.y+250, {button:'right'}); await p.waitForTimeout(150);
    check('right-click cancels the arrow (no menu)', await E("!cv.lineDraw") && !(await p.isVisible('.ctx-menu')));
    const tools = await p.$$eval('.board-tool, .board-toolbar button', e => e.map(x => x.textContent.trim()));
    check('toolbar is icons (tooltips carry the words)', tools.length>0 && tools.every(t => t.length<=3), tools);
    await E("ui.boardFull='vision'; renderView()"); await p.waitForTimeout(150);
    check('full screen hides the activity pill + buttons', await p.evaluate(() => document.body.classList.contains('board-full')) && !(await p.isVisible('#activityPill')));
    check('no errors (boards)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- GoHighLevel: Inbox (chats + contacts), Social tab, Social panel ----
  {
    const T = new Date(2026,9,9,14,0).getTime();
    const social = {breakdowns:{reach:{total:12840, totalChange:18.5}, impressions:{total:30410, totalChange:-4}, posts:{total:5, totalChange:25}, engagement:{instagram:{likes:812, comments:64, shares:20}}}, platformTotals:{followers:{instagram:{total:4382, series:[4300,4310,4325,4340,4351,4370,4382]}}}};
    const seed = {profile:{name:'Andre'}, settings:{ghl:{connected:true, connectedAt:T-864e5, locationId:'L1', pipelineId:'P1', lastSync:T, pipelines:[{id:'P1', name:'Sales', stages:[{id:'s1', name:'New'}]}], stageMap:{s1:'lead'}}},
      goals:{items:[{id:'g1', label:'IG followers', target:10000, current:4000}]},
      tasks:{items:[{id:'a', title:'Edit reel', status:'today', priority:'high', clients:['personal']}]},
      business:{pipeline:[{id:'l1', name:'Mike', company:'Mike Roofing', stage:'lead', ghlContactId:'gc1', touchpoints:[], timeline:[], createdAt:'2026-10-01'}], clients:[]}};
    const p = await newPage(b, OUT+'/r10.html', seed, T);
    const calls = [];
    await p.route('http://127.0.0.1:8936/**', r => { const u = new URL(r.request().url()); const m = u.searchParams.get('m'), path = hex(u.searchParams.get('p')), bd = hex(u.searchParams.get('b')); calls.push({m, path, body:bd ? JSON.parse(bd) : null}); let body = {};
      if(path.startsWith('/conversations/search')) body = {conversations:[{id:'cv1', contactId:'gc1', fullName:'Mike Roofing', unreadCount:1, lastMessageBody:'Can we move the call to 4?', lastMessageDirection:'inbound', lastMessageDate:T-300000},{id:'cv2', contactId:'gc2', fullName:'Sara Dental', unreadCount:0, lastMessageBody:'Sounds good', lastMessageDirection:'outbound', lastMessageDate:T-86400000}]};
      else if(path.startsWith('/conversations/cv1/messages')) body = {messages:{messages:[{direction:'inbound', body:'Can we move the call to 4?', messageType:'TYPE_SMS', dateAdded:new Date(T-300000).toISOString()}]}};
      else if(path==='/contacts/search') body = {contacts:[{id:'gc1', contactName:'Mike Jones', companyName:'Mike Roofing', phone:'+15551234567'},{id:'gc3', contactName:'Tony B', phone:'+15559990000'}]};
      else if(path==='/contacts/upsert') body = {contact:{id:'gc9'}};
      else if(path.startsWith('/contacts/gc1/notes')) body = {notes:[]};
      else if(path.startsWith('/contacts/gc1')) body = {contact:{id:'gc1', firstName:'Mike', lastName:'Jones', companyName:'Mike Roofing', phone:'+15551234567'}};
      else if(path.startsWith('/contacts/gc3')) body = {contact:{id:'gc3', firstName:'Tony', lastName:'B', phone:'+15559990000'}};
      else if(path.startsWith('/social-media-posting/L1/accounts')) body = {results:{accounts:[{id:'a1', profileId:'p1', platform:'instagram', name:'@andre'}]}};
      else if(path.startsWith('/social-media-posting/statistics')) body = {results:social};
      else if(path.startsWith('/opportunities/search')) body = {opportunities:[], meta:{}};
      r.fulfill({status:200, body:JSON.stringify(body), headers:{'Access-Control-Allow-Origin':'*'}}); });
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('Conversations has its own place in the sidebar', await p.isVisible('#sidebarNav [data-view="convos"]'));
    await p.click('#sidebarNav [data-view="convos"]'); await p.waitForTimeout(300); await p.click('[data-action="inboxMode"][data-id="chats"]'); await p.waitForTimeout(700);
    check('Inbox: your GoHighLevel chats, newest first, unread marked', (await p.$$('.ib-row')).length===2 && await p.isVisible('.ib-row.is-unread[data-id="gc1"]'));
    check('Conversations: Chats, Contacts and Social', (await p.$$('[data-action="inboxMode"]')).length===3 && !!(await p.$('[data-action="inboxMode"][data-id="social"]')));
    await p.click('.ib-row[data-id="gc1"]'); await p.waitForTimeout(700);
    check('open a chat inline, reply box right there', (await p.textContent('#viewRoot')).includes('move the call to 4') && await p.isVisible('#ghlMsg'));
    await p.fill('#ghlMsg', 'draft in progress'); await p.dispatchEvent('#ghlMsg', 'input');
    await E("renderView()"); await p.waitForTimeout(100);
    check('your draft survives a refresh', (await p.inputValue('#ghlMsg'))==='draft in progress');
    await p.click('[data-action="inboxMode"][data-id="contacts"]'); await p.waitForTimeout(700);
    check('Contacts list from GoHighLevel', /Tony B/.test(await p.textContent('#viewRoot')));
    check('one click makes a contact a lead', await p.isVisible('[data-action="inboxMakeLead"][data-id="gc3"]'));
    await p.click('[data-action="inboxMakeLead"][data-id="gc3"]'); await p.waitForTimeout(300);
    check('…and it\'s on your leads, linked to GHL', await E("state.business.pipeline.some(l=>l.name==='Tony B' && !!l.ghlContactId)"));
    await p.click('[data-action="inboxMode"][data-id="social"]'); await p.waitForTimeout(900);
    const soc = await p.textContent('#viewRoot');
    check('Social tab: followers, reach, impressions from GHL', /4,382/.test(soc) && /12,840/.test(soc) && /30,410/.test(soc));
    check('asks GHL with your profile ids', calls.some(c => c.path.startsWith('/social-media-posting/statistics') && c.body && c.body.profileIds[0]==='p1'));
    check('an "IG followers" goal follows the real number', await E("state.goals.items[0].current")===4382);
    await E("ui.view='focus'; ui.focusMainTab='tasks'; renderView()"); await p.waitForTimeout(300);
    check('Social isn\'t on Focus → Tasks any more', !(await p.isVisible('.social-panel')));
    await E("startFocus(null); ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('Social panel when locked in', await p.isVisible('.social-panel'));
    await p.click('.social-panel [data-action="goToSocial"]'); await p.waitForTimeout(200);
    check('"Open →" goes to Conversations → Social', await E("ui.view==='convos' && inboxState().mode==='social'"));
    check('no errors (GHL)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- sounds ----
  {
    const p = await newPage(b, OUT+'/r10.html', {profile:{name:'Andre'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('new sounds play without errors', await E("(playLockIn(), playFanfare(), playPing(), playNight(), true)"));
    check('no errors (sounds)', !p.errors.length, p.errors);
    await p.context().close();
  }
  await b.close();
  process.exit(report()?1:0);
})();

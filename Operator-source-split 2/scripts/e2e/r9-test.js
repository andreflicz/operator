// Round 9: list rows that open instead of finishing, weekly pace without carry-over, the wake
// song playing out, music as an alarm sound, the Good Morning intro + night-before notes + the
// vision board in the briefing, boards that frame their content and return you where you were,
// Today page editing, the stacked Now / Up next slot, Sky look, notifications, the Apple Music
// player, GoHighLevel inside Operator, the App updates bar and the simpler task dates.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const hex = s => Buffer.from(s||'', 'hex').toString();
(async () => {
  instrument(process.argv[2], OUT+'/r9.html');
  const b = await launch();
  const FRI = new Date(2026,9,9,14,0).getTime();   // Friday 9 Oct 2026

  // ---- tasks: list rows, dates, deep work wording ----
  {
    const p = await newPage(b, OUT+'/r9.html', {profile:{name:'Andre', lineupView:'list'}, tasks:{items:[
      {id:'a', title:'Edit reel', status:'today', priority:'high', clients:['personal']},
      {id:'b', title:'Old ongoing', status:'today', priority:'med', clients:['personal'], ongoing:true, ongoingDeadline:'2026-10-20'}]}}, FRI);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(200);
    check('list rows have no tick circles', (await p.$$('.tl-row')).length===2 && !(await p.$('.tl-row .tl-check')));
    await p.click('.tl-row[data-task-id="a"] .tl-title'); await p.waitForTimeout(200);
    check('clicking a row opens the task — it doesn\'t finish it', await E("ui.editingTaskId")==='a' && await E("state.tasks.items.find(t=>t.id==='a').status")==='today');
    const modal = await p.textContent('#taskEditContent');
    check('one date per task: no separate "ongoing target date"', !/target date/i.test(modal) && !(await p.$('[id^="editOngoingDeadline"]')));
    check('no per-task "counts as deep work" switch (everything you time counts)', !/counts as deep work/.test(modal));
    check('an old ongoing target date became the deadline', await E("state.tasks.items.find(t=>t.id==='b').deadline")==='2026-10-20');
    check('no errors (tasks)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- deliverables: 2 of 2 by Friday is done for the week ----
  {
    const p = await newPage(b, OUT+'/r9.html', {business:{pipeline:[], clients:[{id:'c1', name:'Jay', business:'JJS', status:'active', mrr:2000, touches:['2026-10-09'],
      deliverables:[{id:'d1', title:'Reels', recurring:true, weeklyTarget:2, completedDates:['2026-10-06','2026-10-08']}]}]}}, FRI);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const D = "state.business.clients[0].deliverables[0]";
    check('2/2 by Friday = green, done for the week', await E("deliverablePaceStatus("+D+")")==='good' && await E("delivPaceWord("+D+")")==='done for the week');
    check('a missed last week doesn\'t pile on: the week needs 2, not 4', await E("deliverableWeekNeed("+D+")")===2);
    check('the client reads healthy, not behind', await E("clientHealthStatus(state.business.clients[0]).level")==='green');
    await E("ui.view='business'; ui.businessTab='clients'; renderView()"); await p.waitForTimeout(200);
    const card = await p.textContent('#viewRoot');
    check('the card shows 2/2 and no "owed"', /2\/2/.test(card) && !/owed/.test(card));
    await p.context().close();
  }

  // ---- wake: music is an alarm sound, the song plays out, notes + vision in the briefing ----
  {
    const p = await newPage(b, OUT+'/r9.html', {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], media:{type:'music', k:'playlist', q:'Morning Run'}}},
      boards:{boards:[{id:'v1', kind:'vision', name:'Vision', parentId:null, elements:[{id:'e1', type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'', x:4000, y:3000, w:240, h:80}], viewport:{x:0,y:0,zoom:1}}], masterId:'v1'}},
      new Date(2026,9,8,22,0).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const calls = [];
    await p.route('http://127.0.0.1:8935/**', r => { const u = new URL(r.request().url()); calls.push(u.pathname); r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}); });
    // the night before: a note for the morning
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(150);
    await E("addMorningNote('Call Mike first. No Instagram before 10.')");
    check('a note is saved for the next morning', await E("state.focus.morningNotes[0].forDate")==='2026-10-09');
    await E("openWakeSetup()"); await p.waitForTimeout(150);
    check('Music is one of the alarm sounds, and it\'s the one picked', await p.isVisible('.ws-sound-music.is-on') && (await p.$$('.ws-sound')).length===4);
    await E("hideOverlay('wakeSetupOverlay')");
    await p.clock.setSystemTime(new Date(2026,9,9,7,0).getTime()); await E("checkAllAlarms()"); await p.waitForTimeout(300);
    check('the ring screen has no vision board on it now', await p.isVisible('.wk2') && !(await p.$('.wk2-vision')));
    check('the music starts by itself — nothing to click', calls.includes('/music/play') && !(await p.$('[data-action="wakePlayMusic"]')), calls);
    calls.length = 0;
    await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(400);
    check('"I\'m up" lets the song finish (no stop)', calls.includes('/music/finish') && !calls.includes('/music/stop'), calls);
    check('it opens with a big "Good morning", like a phone starting up', await p.isVisible('.brief-intro .bi-word') && /Good morning/.test(await p.textContent('.bi-word')));
    check('last night\'s note is up top in the briefing', (await p.textContent('.br-lastnight')).includes('Call Mike first'));
    // round 13: one-screen brief — column 1 shows last night's note OR the vision board, not both
    check('with a note, the note takes the vision board\'s spot (one screen)', !(await p.$('.br-vision')));
    await E("ACTIONS.wakeBoardToggle()"); await p.waitForTimeout(200);
    check('the vision board still opens big from the briefing', await p.isVisible('.br-vision-big') && (await p.textContent('.br-vision-big')).includes('Mind + Body'));
    const off = await p.evaluate(() => { const box = document.querySelector('.br-vision-big .board-static'); const w = box.firstElementChild; const r = box.getBoundingClientRect(), n = w.getBoundingClientRect(); return Math.abs((r.left+r.width/2)-(n.left+n.width/2)); });
    check('…centered on what\'s on it (even far from the origin)', off < 3, off);
    await E("ACTIONS.wakeBoardToggle()"); await p.waitForTimeout(150);
    // the old floating .brief-music pill became the song chip in the brief's top bar
    check('a little chip shows the song is still playing', await p.isVisible('.b4-song') && (await p.textContent('.b4-song')).includes('Morning Run'));
    await E("ACTIONS.wakeIntroSkip()"); await p.waitForTimeout(100);
    check('the intro can be skipped', !(await p.isVisible('.brief-intro')) && await p.isVisible('.brief.intro-skipped'));
    await p.click('[data-action="wakeStopMusic"]'); await p.waitForTimeout(200);
    check('■ stops the music right away', calls.includes('/music/stop'));
    check('no errors (wake)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- vision board from Today: framed on its content, Esc goes back to Today ----
  {
    const p = await newPage(b, OUT+'/r9.html', {boards:{boards:[{id:'v1', kind:'vision', name:'Vision', parentId:null, elements:[
      {id:'e1', type:'note', header:true, color:'#3FBE8E', title:'A', body:'', x:5000, y:4000, w:240, h:80}, {id:'e2', type:'note', header:true, color:'#E8A23D', title:'B', body:'', x:5600, y:4400, w:240, h:80}],
      viewport:{x:-20000, y:-20000, zoom:3}}], masterId:'v1'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('.vision-panel-box'); await p.waitForTimeout(500);
    const c = await p.evaluate(() => { const h = document.getElementById('boardHost').getBoundingClientRect(); const els = Array.from(document.querySelectorAll('#boardHost .bel')).map(e => e.getBoundingClientRect());
      const l = Math.min(...els.map(r => r.left)), r = Math.max(...els.map(r => r.right)), t = Math.min(...els.map(r => r.top)), bt = Math.max(...els.map(r => r.bottom));
      return {dx:Math.abs((l+r)/2-(h.left+h.width/2)), dy:Math.abs((t+bt)/2-(h.top+h.height/2)), inside: l>=h.left && r<=h.right && t>=h.top && bt<=h.bottom}; });
    check('opening the vision board frames everything on it, centered', c.inside && c.dx < 4 && c.dy < 4, c);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check('closing it takes you back to Today, not the boards page', await E("ui.view")==='today' && !(await E("ui.boardFull")));
    check('no errors (board)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- Today: edit the page; the stacked Now / Up next; Sky look ----
  {
    const p = await newPage(b, OUT+'/r9.html', {profile:{name:'Andre'}, tasks:{items:[{id:'a', title:'Edit reel', status:'today', priority:'high', clients:['personal']}, {id:'b', title:'Script ad', status:'today', priority:'med', clients:['personal']}]}}, FRI);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('a quiet pencil to edit the page (no big Customize button)', await p.isVisible('.ll-btn[data-action="toggleTodayEdit"]') && (await p.textContent('.ll-btn[data-action="toggleTodayEdit"]')).trim()==='✎');
    await p.click('[data-action="toggleTodayEdit"]'); await p.waitForTimeout(150);
    check('editing shows every section with move / hide', (await p.$$('.today-panels .ll-head')).length > 4);
    await p.click('[data-action="todayHide"][data-id="journal"]'); await p.waitForTimeout(150);
    check('hide a section', await E("state.dashboardPanels.enabled.journal")===false && await p.isVisible('[data-action="todayAdd"][data-id="journal"]'));
    await p.click('[data-action="todayAdd"][data-id="journal"]'); await p.waitForTimeout(150);
    check('…and add it back', await E("state.dashboardPanels.enabled.journal")===true);
    await p.click('[data-action="toggleTodayEdit"]'); await p.waitForTimeout(150);
    check('the tasks slot has Now on top and Up next below', await p.isVisible('.nn-stack .nn-now') && await p.isVisible('.nn-stack .nn-next'));
    await E("startFocus(null); renderView()"); await p.waitForTimeout(150);
    check('locked in: the tall slot is Now + Up next too', await p.isVisible('.hero-row .nn-stack.nn-hero .nn-now') && await p.isVisible('.hero-row .nn-stack.nn-hero .nn-next'));
    check('locked in: the same quiet pencil', (await p.textContent('.ll-btn[data-action="toggleLockedEdit"]')).trim()==='✎');
    await E("endFocusSessionForSwitch(); renderView()");
    await E("ACTIONS.setSkyLook(null, null, 'golden')"); await p.waitForTimeout(100);
    check('pick the sunset look and it stays, even at 2 PM', await p.getAttribute('.today-hero', 'data-sky')==='golden');
    await E("ACTIONS.setSkyLook(null, null, 'auto')"); await p.waitForTimeout(100);
    check('…or follow the sun again', await p.getAttribute('.today-hero', 'data-sky')!=='golden' || await E("skyPhase()")==='golden');
    check('modern sounds play without errors', await E("(playTick(), playTaskComplete(), playWakeChime(), soundPack())")==='modern');
    check('no errors (today)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- notifications, the music player, GoHighLevel inside Operator ----
  {
    const seed = {profile:{name:'Andre'}, settings:{ghl:{connected:true, connectedAt:FRI-86400000, locationId:'L1', pipelineId:'P1', lastSync:FRI-60000, pipelines:[{id:'P1', name:'Sales', stages:[{id:'s1', name:'New'}]}], stageMap:{s1:'lead'},
        inbox:[{contactId:'gc1', convId:'cv1', name:'Mike Roofing', body:'Can we move the call to 4?', at:FRI-300000}]}},
      tasks:{items:[{id:'t1', title:'Send invoice', status:'today', priority:'high', clients:['personal'], deadline:'2026-10-08'}, {id:'t2', title:'Edit ad', status:'today', priority:'med', clients:['personal'], deadline:'2026-10-09'}]},
      business:{pipeline:[{id:'l1', name:'Mike', company:'Mike Roofing', stage:'lead', ghlContactId:'gc1', touchpoints:[], timeline:[], createdAt:'2026-10-01'},
        {id:'l2', name:'Sara', company:'Sara Dental', email:'sara@dent.com', stage:'lead', touchpoints:[], timeline:[], createdAt:'2026-10-09', value:1500}], clients:[]}};
    const p = await newPage(b, OUT+'/r9.html', seed, FRI);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const music = [], ghl = [];
    await p.route('http://127.0.0.1:8935/**', r => { const u = new URL(r.request().url()); music.push(u.pathname+u.search); let body = '{"ok":true}';
      if(/now|cmd|pick/.test(u.pathname)) body = JSON.stringify({ok:true, state:'playing', name:'Lose Yourself', artist:'Eminem', pos:60, dur:320, vol:70});
      if(u.pathname==='/music/playlists') body = JSON.stringify({ok:true, lists:['Lock In', 'Morning Run']});
      r.fulfill({status:200, body, headers:{'Access-Control-Allow-Origin':'*'}}); });
    await p.route('http://127.0.0.1:8936/**', r => { const u = new URL(r.request().url()); const m = u.searchParams.get('m'), path = hex(u.searchParams.get('p')), bd = hex(u.searchParams.get('b')); ghl.push({m, path, body:bd ? JSON.parse(bd) : null}); let body = {};
      if(path==='/contacts/upsert') body = {contact:{id:'gc2'}};
      else if(path==='/opportunities/' && m==='POST') body = {opportunity:{id:'op2'}};
      else if(path.startsWith('/contacts/gc1/notes') && m==='POST') body = {note:{id:'n2', body:'Wants Meta ads', dateAdded:new Date().toISOString()}};
      else if(path.startsWith('/contacts/gc1/notes')) body = {notes:[]};
      else if(path.startsWith('/contacts/gc1')) body = {contact:{id:'gc1', firstName:'Mike', lastName:'Jones', companyName:'Mike Roofing', phone:'+15551234567'}};
      else if(path.startsWith('/conversations/search')) body = {conversations:[{id:'cv1', contactId:'gc1', unreadCount:1}]};
      else if(path.startsWith('/conversations/cv1/messages')) body = {messages:{messages:[{direction:'inbound', body:'Can we move the call to 4?', messageType:'TYPE_SMS', dateAdded:new Date(FRI-300000).toISOString()}]}};
      else if(path==='/conversations/messages') body = {messageId:'m9', conversationId:'cv1'};
      else if(path.startsWith('/opportunities/search')) body = {opportunities:[], meta:{}};
      r.fulfill({status:200, body:JSON.stringify(body), headers:{'Access-Control-Allow-Origin':'*'}}); });
    await E("renderView(); notifBadge()"); await p.waitForTimeout(500);
    check('the bell counts what needs you', Number(await p.textContent('#notifCount')) >= 3);
    await p.click('#notifBell'); await p.waitForTimeout(200);
    const panel = await p.textContent('#notifPanel');
    check('deadlines, leads and GoHighLevel messages are in it', /Send invoice/.test(panel) && /Overdue/.test(panel) && /Edit ad/.test(panel) && /Due today/.test(panel) && /Mike Roofing messaged you/.test(panel));
    await p.click('.np-item:has-text("Edit ad") .np-dismiss'); await p.waitForTimeout(150);
    check('✕ hides one for today', !(await p.textContent('#notifPanel')).includes('Edit ad'));
    await p.click('.np-main:has-text("messaged you")'); await p.waitForTimeout(700);
    check('a message opens their GoHighLevel conversation, inside Operator', await p.isVisible('#ghlOverlay:not(.hidden) .gp-thread') && (await p.textContent('#ghlThread')).includes('move the call to 4'));
    check('…and it\'s marked read (off the bell)', ghl.some(x => x.m==='PUT' && x.path==='/conversations/cv1' && x.body.unreadCount===0) && (await E("state.settings.ghl.inbox.length"))===0);
    await p.fill('#ghlMsg', '4 works — talk then'); await p.click('[data-action="ghlSend"]'); await p.waitForTimeout(400);
    const sent = ghl.find(x => x.path==='/conversations/messages');
    check('reply by text right here', sent && sent.m==='POST' && sent.body.type==='SMS' && sent.body.contactId==='gc1' && sent.body.message==='4 works — talk then', sent);
    check('…which shows in the thread and counts as a touch', (await p.textContent('#ghlThread')).includes('4 works') && (await E("state.business.pipeline[0].touchpoints.length"))===1);
    await p.click('[data-action="ghlTab"][data-id="notes"]'); await p.waitForTimeout(300);
    await p.fill('#ghlNote', 'Wants Meta ads'); await p.click('[data-action="ghlAddNote"]'); await p.waitForTimeout(300);
    check('add a note — in GHL and on the lead\'s timeline', ghl.some(x => x.m==='POST' && x.path==='/contacts/gc1/notes' && x.body.body==='Wants Meta ads') && JSON.stringify(await E("state.business.pipeline[0].timeline")).includes('Wants Meta ads'));
    await E("ACTIONS.closeGhlPane()");
    // a lead made in Operator goes to GHL on the next sync
    await E("ghlSync(false)"); await p.waitForTimeout(800);
    const up = ghl.find(x => x.path==='/contacts/upsert'), opp = ghl.find(x => x.path==='/opportunities/' && x.m==='POST');
    check('a lead you added here goes to GoHighLevel on its own (contact + opportunity)', up && up.body.email==='sara@dent.com' && opp && opp.body.contactId==='gc2' && opp.body.pipelineStageId==='s1' && (await E("state.business.pipeline[1].ghlOppId"))==='op2', {up, opp});
    check('the in-app music player is gone (no background polling)', !(await p.$('#musicPlayer')) && !music.some(x => x.startsWith('/music/now')));
    check('no errors (notifs / GHL)', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- App updates: one tidy bar ----
  {
    const now = FRI;
    const entries = []; for(let i=0;i<5;i++) entries.push({id:'u'+i, mood:'updates', date:'2026-10-09', timestamp:now-i*1500000, text:'Update '+i});
    const p = await newPage(b, OUT+'/r9.html', {journal:{entries, types:[{id:'updates', emoji:'📣', label:'Updates', color:'#8fdcff'}], updatesType:'updates'}}, now);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='settings'; ui.settingsTab='updates'; renderView()"); await p.waitForTimeout(150);
    const bar = await p.evaluate(() => { const b = document.querySelector('.upd-bar'); const cs = getComputedStyle(b); return {pos:cs.position, h:b.getBoundingClientRect().height}; });
    check('the updates bar doesn\'t float over the list, and fits on one line', bar.pos!=='sticky' && bar.h < 70, bar);
    await p.selectOption('#updatesRangeSel', 'all'); await p.waitForTimeout(100);
    const all = (await p.$$('.upd-card')).length;
    await p.selectOption('#updatesRangeSel', '1h'); await p.waitForTimeout(100);
    const hour = (await p.$$('.upd-card')).length;
    check('pick a range from the dropdown', all===5 && hour===3, {all, hour});
    await p.context().close();
  }

  await b.close();
  process.exit(report()?1:0);
})();

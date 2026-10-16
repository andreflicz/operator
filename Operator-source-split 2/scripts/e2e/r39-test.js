// Round 39: deliverable tasks look like client work (week, deliverable, client, the week meter, due);
// Today's client cards open the client; the touch menu floats and can retype a quick log; Op hears you
// through ElevenLabs Scribe, opens the mic when he asks, can be stopped, shows thinking in his pop-up,
// and does what you ask (client_deliverables).
const { chromium } = require('playwright');
const { instrument, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r39.html');
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const T = new Date(2026,9,14,14,20).getTime();   // Wed Oct 14
  const biz = {clients:[
    {id:'bm', name:'Mike', business:'Brothers Mechanical', stage:'active', status:'active', mrr:2000, startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
      deliverables:[{id:'d1', title:'Reels', weeklyTarget:4, recurring:true, status:'pending', completedDates:[]}]},
    {id:'jj', name:'Jay', business:'JJS Construction', stage:'active', status:'active', mrr:1500, startDate:'2026-09-01', createdAt:'2026-09-01', touches:['2026-10-12'],
      deliverables:[{id:'d2', title:'Ad creatives', weeklyTarget:3, recurring:true, status:'pending', completedDates:[]}]}],
    pipeline:[{id:'l1', name:'Bloom Florals', stage:'contacted', createdAt:'2026-09-20', touchpoints:[{id:'t0', type:'text', date:'2026-09-25'}], followUp:{date:'2026-10-04'}},
               {id:'l2', name:'Atlas Realty', stage:'contacted', createdAt:'2026-09-20', touchpoints:[{id:'t9', type:'text', date:'2026-09-28'}], followUp:{date:'2026-10-06'}}]};
  const J = (r, o, st) => r.fulfill({status:st || 200, body:JSON.stringify(o), headers:{'Access-Control-Allow-Origin':'*'}});

  // ---- 1–3 ----
  {
    const p = await newPage(b, OUT+'/r39.html', {profile:{name:'Andre', lineupView:'cards'}, business:biz, tasks:{items:[]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(1500);
    await E("state.tasks.items.filter(t => t.master && t.master.kind==='dvw' && t.master.clientId==='bm' && t.master.wk<=2).forEach(t => t.status='today'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(300);
    const cs = '.task-card.dvc:not(.car-clone)';
    const txt = await p.textContent(cs);
    check('a deliverable task: the week, the deliverable, the client (violet)', /Week 1/i.test(await p.textContent(cs+' .dvc-wkp')) && (await p.textContent(cs+' .dvc-title'))==='16 Reels' && /Brothers Mechanical/.test(await p.textContent(cs+' .dvc-who')), txt);
    check('…with the week meter and the due date', (await p.evaluate(s => document.querySelector(s).querySelectorAll('.dvc-dots i').length, cs))===4 && /1\/4/.test(await p.textContent(cs+' .dvc-n')) && /Oct 7/.test(await p.textContent(cs+' .dvc-due')), await p.textContent(cs));
    check('…and no priority tag', !(await p.$(cs+' .tag-med')));
    await E("state.profile.lineupView='list'; renderView()"); await p.waitForTimeout(200);
    check('the list view row matches (week pill, name, meter, client chip)', !!(await p.$('.tl-row.tl-dlv .dvc-wkp')) && !!(await p.$('.tl-row.tl-dlv .dvc-dots')) && !!(await p.$('.tl-row.tl-dlv .dvc-who')) && !(await p.$('.tl-row.tl-dlv .tag-client')));
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    await p.click('.hub-card[data-id="jj"] .hub-foot', {position:{x:20, y:8}}).catch(() => p.click('.hub-card[data-id="jj"]')); await p.waitForTimeout(300);
    check('Today: clicking a client card opens that client', await p.isVisible('#clientModalOverlay:not(.hidden)') && /JJS Construction/.test(await p.textContent('#clientModalOverlay')));
    await E("hideOverlay('clientModalOverlay'); renderView()"); await p.waitForTimeout(200);
    await (await p.$('.hub-lead[data-key="hl-l1"] .touch-more-btn')).scrollIntoViewIfNeeded(); await p.click('.hub-lead[data-key="hl-l1"] .touch-more-btn'); await p.waitForTimeout(250);
    check('the lead’s touch-type menu floats above the page (it was hidden under the next panel)', await p.isVisible('body > .touch-menu.is-float') && (await p.$$('body > .touch-menu.is-float .touch-menu-btn')).length >= 5);
    await p.click('body > .touch-menu.is-float [data-type="call"]'); await p.waitForTimeout(250);
    check('…a type logs that type', await E("state.business.pipeline[0].touchpoints.slice(-1)[0].type")==='call');
    await p.click('.hub-lead[data-key="hl-l2"] .touch-log-btn'); await p.waitForTimeout(300);
    check('a quick log opens “Was it something else?”', await p.isVisible('body > .touch-menu.is-float .touch-menu-h'));
    await p.click('body > .touch-menu.is-float [data-type="meeting"]'); await p.waitForTimeout(250);
    check('…and changes the one you just logged', await E("state.business.pipeline[1].touchpoints.slice(-1)[0].type")==='meeting' && await E("state.business.pipeline[1].touchpoints.length")===2);
    check('no page errors (round 39: 1–3)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- 4–9: Op ----
  {
    const p = await newPage(b, OUT+'/r39.html', {profile:{name:'Andre'}, business:biz, tasks:{items:[]}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const asked = []; let sttCalls = 0, sttType = '';
    await p.route('http://127.0.0.1:8935/**', async r => {
      const u = new URL(r.request().url()); asked.push(u.pathname);
      if(u.pathname==='/tts/status') return J(r, {ok:true, hasKey:true});
      if(u.pathname==='/stt'){ sttCalls++; sttType = r.request().headers()['content-type'] || ''; return J(r, {text:'Add next week of deliverables for Brothers Mechanical. (laughs)'}); }
      return J(r, {ok:true});
    });
    await p.waitForTimeout(2200);
    check('with an ElevenLabs key, Op listens through Scribe', await E("scribeWanted()"));
    await E("window.__asked=[]; aiAsk=(function(base){ return function(t){ window.__asked.push(t); return Promise.resolve(); }; })(aiAsk); ACTIONS.opTalk()"); await p.waitForTimeout(1200);
    check('…the mic opens and his pop-up says “Listening” with a Stop', await E("AI.listening") && await p.isVisible('#opBub .ob-status.is-on [data-action="opStopListen"]') && /Listening/.test(await p.textContent('#opBub .ob-status')));
    await E("AI.sendNow && AI.sendNow()"); await p.waitForTimeout(1200);
    check('…your clip goes to the Operator app and your words come back (sound tags dropped)', sttCalls===1 && /audio\/webm/.test(sttType) && await E("JSON.stringify(window.__asked)")==='["Add next week of deliverables for Brothers Mechanical."]', [sttCalls, sttType, await E("JSON.stringify(window.__asked)")]);
    await E("ACTIONS.opTalk()"); await p.waitForTimeout(800);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    check('Esc stops him listening (nothing sent)', !(await E("AI.listening")) && sttCalls===1 && /not listening/i.test(await p.textContent('#opBubText')));
    await E("AI.busy=true"); await p.waitForTimeout(400);
    check('his thinking shows in his pop-up (with a Stop), not a chip by the light', /Thinking/.test(await p.textContent('#opBub .ob-status')) && !!(await p.$('#opBub .ob-status [data-action="opCancelThink"]')) && !(await p.isVisible('#opThink')));
    await E("AI.busy=false"); await p.waitForTimeout(300);
    check('a question anywhere near the end opens the mic (not only a final “?”)', await E("opAsked('Want me to put those on today? Say the word.')") && await E("opAsked('Done. Anything else?')") && !(await E("opAsked('Done, all three are on today.')")));
    const sys = await E("JSON.stringify(aiSystem())");
    check('his rules: he does what you ask, never questions what you finished, then one line of advice at most', /Never refuse/.test(sys) && /never mention “fake completions”/.test(sys) && /do what he asked FIRST/.test(sys));
    await E("masterTasksSync()"); await p.waitForTimeout(100);
    const r1 = await E("opRunTool('client_deliverables', {client:'brothers', action:'today', week:'next'})");
    check('“add next week of deliverables for Brothers Mechanical” puts just their Week 3 on today', /16 Reels 3\/4/.test(r1) && await E("state.tasks.items.filter(t => t.status==='today' && t.master && t.master.kind==='dvw').map(t => t.title).join()")==='16 Reels 3/4', r1);
    const r2 = await E("opRunTool('client_deliverables', {client:'JJS', action:'done', week:'2'})");
    check('…and “JJS week 2 is done” finishes just that one (logging its 3 ad creatives)', /12 Ad creatives 2\/4/.test(r2) && await E("dvwCycleCount(state.business.clients[1].deliverables[0], dvwCycle(state.business.clients[1]))")===3, r2);
    check('no page errors (round 39: Op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

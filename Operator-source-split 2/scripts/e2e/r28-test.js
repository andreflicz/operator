// Round 28: one music player on every full-screen page (Good morning, Work mode, lock-in, locked in) that never
// vanishes; the wake-up song hands off to a morning track; soft lock-in music; last night's note in the reel;
// sports half scores, half stories; headlines without sports (with business); Op's taste-then-ask morning lines;
// Op's words drift in, the bubble waits for answers, the mic opens on questions, no talk of logging excuses;
// Inspiration's wind (Drift speeds, Breeze away), a plane you scroll through, and ideas Op writes for you.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
function helperRoute(calls){
  return r => {
    const u = r.request().url(); calls.push(u.replace('http://127.0.0.1:8935', ''));
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({ok:true, hasKey:true})});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){
      const bm = /[?&]b=([0-9a-f]+)/.exec(u), body = (r.request().postData() || '')+(bm ? Buffer.from(bm[1], 'hex').toString() : '');
      const text = /Inspiration page/.test(body) ? JSON.stringify({ideas:[{e:'🌊', label:'Sunset at the pier', why:'You said the water resets you.', cat:'move'}, {e:'📞', label:'Call your mom', why:'Ten minutes. She’s why.', cat:'people'}], whispers:['The agency that runs without you is getting closer.']}) : 'Noted.';
      return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'end_turn', content:[{type:'text', text:text}]})});
    }
    if(u.includes('/sports')){
      const TEAM = {NYG:'New York Giants', DAL:'Dallas Cowboys', KC:'Kansas City Chiefs', BUF:'Buffalo Bills', NYK:'New York Knicks', BOS:'Boston Celtics'};
      const ev = (id, h, a, hs, as, st, date) => ({id, date, status:{type:{state:st, shortDetail:st==='post' ? 'Final' : ''}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner:st==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h], shortDisplayName:TEAM[h].split(' ').pop()}}, {homeAway:'away', score:as, winner:st==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a], shortDisplayName:TEAM[a].split(' ').pop()}}]}]});
      const list = u.includes('l=nfl') ? [ev('1','NYG','DAL','24','21','post','2026-10-11T17:00Z'), ev('2','KC','BUF','','','pre','2026-10-14T00:20Z')] : u.includes('l=nba') ? [ev('3','NYK','BOS','110','99','post','2026-10-11T23:30Z')] : [];
      return r.fulfill({status:200, headers:CORS, body:JSON.stringify({events:list})});
    }
    if(u.includes('/news')){
      const qm = /q=([0-9a-f]+)/.exec(u), q = qm ? Buffer.from(qm[1], 'hex').toString() : '';
      const list = !q ? ['Fed holds rates steady as inflation cools - Reuters', 'Giants beat Cowboys in NFL week 6 thriller - ESPN', 'City approves new transit line - AP', 'Ocean floor mapped in new detail - BBC']
        : /Giants|NBA|NFL/.test(q) ? ['Knicks rally late to stun Celtics - ESPN', 'Giants rookie named starter - The Athletic', 'Season preview: five teams to watch - Bleacher Report']
        : /AI|Apple/.test(q) ? ['Apple unveils its fastest chip yet - The Verge'] : /business|markets/.test(q) ? ['Agencies see a spike in creator deals - Axios'] : [];
      return r.fulfill({status:200, headers:CORS, body:'<rss><channel>'+list.map((t, i) => '<item><title>'+t+'</title><link>https://x.co/'+i+encodeURIComponent(t.slice(0, 6))+'</link></item>').join('')+'</channel></rss>'});
    }
    return r.fulfill(okJ);
  };
}
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  p.calls = [];
  await p.route('http://127.0.0.1:8935/**', helperRoute(p.calls));
  await p.goto('file://'+path.resolve(OUT+'/r28.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r28.html');
  const b = await launch();
  const NOW = new Date(2026,9,12,8,10,5).getTime();   // a Monday morning
  const tasks = {items:[{id:'t1', title:'Edit JJS reel', status:'today', priority:'high', clients:[], createdAt:'2026-10-01'}, {id:'t2', title:'Send Bloom proposal', status:'today', priority:'med', clients:[], createdAt:'2026-10-12'}]};
  const wake = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', intro:'quick', introChosen:true, voice:false, sports:['nfl','nba']};
  const base = {profile:{name:'Andre', about:{building:'a video agency that runs without me', reset:'the water, a drive'}}, tasks, focus:{wake, morningNotes:[{id:'n1', forDate:'2026-10-12', text:'', headline:'Up at 6. Don’t negotiate.', morning:'Slow coffee, then the JJS edit.'}]}};

  // ---- Good morning: the player, the reel, sports and the news, and Op's taste-then-ask lines ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(600);
    await E("briefRevealAll()"); await p.clock.runFor(6000); await p.waitForTimeout(800);
    check('Good morning has the music player top right', await p.isVisible('#wakeContent .b4-music .mctl'));
    check('…a morning track comes in on its own (no wake-up song playing)', await E("FM.playing && FM.tag==='morning' && !!FOCUS_TRACKS[FM.idx].morning"));
    await p.click('#wakeContent .mctl [data-action="mctlToggle"]'); await p.waitForTimeout(300);
    check('pressing it pauses the music and the player stays (it shows ▶)', !(await E("FM.playing")) && await p.isVisible('#wakeContent .mctl') && /▶/.test(await p.textContent('#wakeContent .mctl .mctl-p')));
    await p.click('#wakeContent .mctl [data-action="mctlToggle"]'); await p.waitForTimeout(300);
    check('…and pressing it again plays the morning track again', await E("FM.playing && FM.tag==='morning'"));
    // a wake-up song from the Music app, still playing out: the player names it, and stopping it really stops it
    await E("focusMusicStop(); wakeCfg().media={type:'music', q:'Sunday Morning', k:'song'}; wakeFinishing=true; dockRefresh()"); await p.waitForTimeout(1700);
    check('a wake-up song shows by name in the player', /Sunday Morning/.test(await p.textContent('#wakeContent .mctl')));
    const n0 = p.calls.length;
    await p.click('#wakeContent .mctl [data-action="mctlToggle"]'); await p.waitForTimeout(400);
    check('…stopping it tells the Music app to stop (and the player stays)', p.calls.slice(n0).some(u => u.startsWith('/music/stop')) && !(await E("wakeFinishing")) && await p.isVisible('#wakeContent .mctl'));
    check('Op talking only turns the music down (Talk to Op no longer stops it)', !/stopWakeMedia/.test(await E("ACTIONS.briefTalk.toString()")));
    // last night's note, first in the reel
    check('last night’s note is the first slide of "you told yourself" (no panel of its own)', await p.$('#wakeContent .bi-slide.is-night') && !(await p.$('#wakeContent .br-lastnight')) && /Up at 6/.test(await p.textContent('#wakeContent .bi-slide.is-night')));
    // sports: half scores, half stories
    check('sports is half scores, half stories', await p.isVisible('#wakeContent .br-sports .brs-scores') && await p.isVisible('#wakeContent .br-sports .brs-news') && /Knicks rally/.test(await p.textContent('#wakeContent .br-sports')));
    const heads = await p.textContent('#wakeContent .br-news');
    check('the headlines leave sports out', /Fed holds rates/.test(heads) && !/Giants beat Cowboys/.test(heads));
    check('…and weave in tech and business', /Tech/.test(heads) && /Business/.test(heads) && /creator deals/.test(heads));
    check('sports stories are spotted by source and words, not team names', await E("isSportsNews({title:'Tech giants report earnings', src:'Reuters'})")===false && await E("isSportsNews({title:'Heat wave hits Texas', src:'AP'})")===false && await E("isSportsNews({title:'Anything', src:'ESPN'})")===true);
    const L = JSON.parse(await E("JSON.stringify(ui.briefLines.map(l => [l.key, l.text]))"));
    const line = k => (L.find(x => x[0]===k) || [])[1] || '';
    check('sports is a taste: your team first, the score, no full rundown', /Your Giants/.test(line('sports')) && /24 to 21/.test(line('sports')) && line('sports').split(/[.!?]/).filter(s => s.trim()).length <= 3, line('sports'));
    check('the news is a few words on what’s going on (round 29: no headlines read out)', /going on in|news in|bits in/i.test(line('news')) && /tech/.test(line('news')) && !/Fed holds rates/.test(line('news')), line('news'));
    check('the last line offers more and ends on the question (the mic opens for it)', /Giants game/.test(line('offer')) && /\?$/.test(line('offer')), line('offer'));
    check('Op knows what it offered when you answer', /offered more on/.test(await E("aiContext()")));
    check('the Good morning offer is the same all morning (no new wording every redraw)', await E("teaseOffer()")===await E("teaseOffer()"));
    check('no page errors (Good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Work mode, lock-in and locked in: the player everywhere, soft music for lock-in ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("clockIn({quiet:true})"); await p.waitForTimeout(500);
    check('Work mode has the music player next to ✕', await p.isVisible('#planOverlay .wi-top .mctl'));
    await E("hideOverlay('planOverlay'); ui.planReveal=null; focusMusicStop(); renderView()"); await p.waitForTimeout(1500);
    await E("openLockSeq()"); await p.waitForTimeout(500);
    check('opening the lock-in sequence starts a low, subtle lock-in track', await E("FM.playing && FM.soft && !!FOCUS_TRACKS[FM.idx].lock"));
    check('…soft means about a third of the volume', Math.abs(await E("fmVolume()/fmVolumeFull()") - 0.32) < 0.01);
    check('…and the sequence has the player', await p.isVisible('#lockSeqOverlay .mctl'));
    await E("closeLockSeq(); state.profile.lockedView='minimal'; ui.currentTaskId='t1'; startFocus(); ui.view='focus'; renderView()"); await p.waitForTimeout(800);
    check('locked in (minimal): the player sits top right, the track isn’t repeated under the controls', await p.isVisible('.np-locked .np-top .mctl') && !(await p.$('.np-locked .np-mrow')));
    check('…still soft while locked in', await E("FM.soft"));
    await E("state.focus.activeSession = null; renderView()"); await p.waitForTimeout(600);
    check('out of the session the music comes back up', !(await E("FM.soft")));
    // work music already on, then lock in: it just goes down
    await E("focusMusicStop()"); await p.waitForTimeout(1500);
    await E("workMusicPlay()"); await p.waitForTimeout(200);
    const wasWork = await E("FOCUS_TRACKS[FM.idx].work===true");
    await E("openLockSeq()"); await p.waitForTimeout(300);
    check('work music already playing just turns down for lock-in (same track)', wasWork && await E("FOCUS_TRACKS[FM.idx].work===true && FM.soft"));
    check('three new tracks: Sunrise for mornings, Low Light and Undertow for lock-in', await E("['Sunrise','Low Light','Undertow'].every(n => FOCUS_TRACKS.some(t => t.name===n))"));
    check('no page errors (music)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op: words drift in, the bubble waits, the mic opens on questions, nothing about logging excuses ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("OV.cap='opBubText'; opCaption('Hey Andre. How did the shoot go?')"); await p.waitForTimeout(200);
    check('Op’s words come in one at a time (each word animates in)', (await p.$$('#opBubText .cw')).length===7 && await p.textContent('#opBubText')==='Hey Andre. How did the shoot go?');
    check('a question keeps the bubble up for a good while (45s+)', await E("opBubStay()") >= 45000);
    await E("opCaption('Hey Andre. How did the shoot go? Tell me')"); await p.waitForTimeout(100);
    check('…new words add on without redrawing the rest', (await p.$$('#opBubText .cw')).length===9);
    await E("opCaption('Fine.')");
    check('a short line goes after a normal read', await E("opBubStay()") < 15000);
    await E("opMood('stern', 9000); opCaption('You said you’d have the edit done by noon.')");
    check('when Op’s on you (stern) it stays up long enough to land', await E("opBubStay()") >= 40000);
    check('the mic opens by itself when Op asks something (not mid-narration)', /aiAutoListen/.test(await E("opSay.toString()")) && /noListen/.test(await E("opSay.toString()")));
    check('Op is your personal assistant, and never piles on what you didn’t ask for', /personal assistant/.test(await E("OP_RULES")) && /Never pile on/.test(await E("OP_RULES")));
    check('check-ins never talk about logging an excuse', /Never mention logging it, excuses/.test(await E("acctAsk.toString()")) && /never tell him you’re logging it/.test(await E("acctSystemNote.toString()")));
    check('no page errors (Op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Inspiration: wind, breeze away, a plane you scroll, and ideas Op writes for you ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("AI.hasKey=true; openInspire()"); await p.waitForTimeout(1600);
    const tools = await p.$$eval('#insp .insp-tools .izk', e => e.map(x => x.textContent));
    check('one Drift effect (Stream is gone) and a Breeze away button', !tools.some(t => /Stream/.test(t)) && tools.some(t => /Drift/.test(t)) && tools.some(t => /Breeze/.test(t)), tools);
    const pos = () => p.$$eval('#inspWorld .izb', e => e.slice(0, 6).map(x => x.style.transform));
    const a = await pos(); await p.clock.runFor(1500); await p.waitForTimeout(300); const c = await pos();
    check('the bubbles are always moving, even in calm air', a.length && a.some((t, i) => t && t!==c[i]), [a[0], c[0]]);
    await p.click('#insp [data-action="inspDrift"]'); await p.waitForTimeout(200);
    check('Drift opens the wind: Calm, Breeze, Wind, Gale', (await p.$$eval('#insp .izk-wind .izw-s', e => e.map(x => x.textContent.trim()))).join()==='Calm,Breeze,Wind,Gale');
    await p.click('#insp .izk-wind [data-id="gale"]'); await p.waitForTimeout(200);
    check('…the wind is saved', await E("inspStore().wind")==='gale' && /Gale/.test(await p.textContent('#insp [data-action="inspDrift"]')));
    const id0 = await E("document.querySelector('#inspWorld .izb').dataset.id");
    const o0 = await E("IW.off['"+id0+"']||0"); await p.clock.runFor(2000); await p.waitForTimeout(300);
    check('…and the bubbles breeze across with it', await E("IW.off['"+id0+"']||0") - o0 > 60);
    await p.click('#insp [data-action="inspBreezeAway"]'); await p.clock.runFor(2500); await p.waitForTimeout(300);
    const ops = await p.$$eval('#inspWorld .izb', e => e.map(x => Number(x.style.opacity || 1)));
    check('Breeze blows them all off but one (round 29: the one for now stays)', ops.length && ops.filter(o => o < 0.05).length >= ops.length - 1 && /Return/.test(await p.textContent('#insp .insp-tools')));
    await p.click('#insp [data-action="inspBreezeAway"]'); await p.clock.runFor(6000); await p.waitForTimeout(400);
    const back = await p.$$eval('#inspWorld .izb:not(.is-behind)', e => e.filter(x => Number(x.style.opacity || 1) > 0.5).length);
    check('…and Return floats them in again', back > 5 && await E("!IW.away"), back);
    await E("inspStore().wind='calm'; inspRender()");
    // a plane you wander: scroll pans; a pinch only leans in a little
    const v0 = JSON.parse(await E("JSON.stringify(ui.inspView)"));
    await p.mouse.move(700, 400); await p.mouse.wheel(0, 300); await p.waitForTimeout(150);
    const v1 = JSON.parse(await E("JSON.stringify(ui.inspView)"));
    check('scrolling wanders the plane instead of zooming', v1.y < v0.y - 200 && v1.z===v0.z, [v0, v1]);
    await p.keyboard.down('Control'); for(let i = 0; i < 8; i++) await p.mouse.wheel(0, 400); await p.keyboard.up('Control'); await p.waitForTimeout(150);
    check('…a pinch can’t zoom way out (never below 0.8)', await E("ui.inspView.z") >= 0.8);
    check('it opens close in (no zoomed-out overview)', await E("inspHome().z") >= 0.86);
    // Op's ideas for you
    await p.waitForTimeout(400);
    if(process.env.DBG) console.log('DBG', await E("JSON.stringify(inspStore().ai)"), p.calls.filter(u => /ai/.test(u)));
    check('Op writes ideas for you from what it knows (once a day)', await E("inspStore().ai && inspStore().ai.date===todayStr() && inspStore().ai.ideas.length===2"));
    check('…they float with the rest', /Sunset at the pier/.test(await p.textContent('#inspWorld')));
    check('…with quiet lines that drift by', await E("inspWhisperLines().some(l => /runs without you/.test(l))"));
    check('…built from you: what resets you and what you’re building', p.calls.length > 0 && await E("/the water/.test(inspAiFacts()) && /video agency/.test(inspAiFacts())"));
    check('no page errors (Inspiration)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- late asks: the + menu, auto lock-in without a task, the recap, Op bringing up what you said you'd do ----
  {
    const p = await ctxPage(b, base, {clock:NOW + 3*3600000});   // 11:10 AM
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(300);
    check('the + has no "Add something" tooltip', !(await p.getAttribute('#fabAdd', 'title')));
    await p.click('#fabAdd'); await p.waitForTimeout(500);
    const tiles = await p.$$eval('.ap-tile b', e => e.map(x => x.textContent));
    check('…its pop-up has no "Add something" header, and goes Task, Video idea, Skill', !/Add something/.test(await E("document.body.innerText")) && tiles.join('|')==='A task|A video idea|A training skill', tiles);
    await E("addSheetClose('addPick')"); await p.waitForTimeout(300);
    // auto lock-in: never on the last task
    await E("activityCategory = function(){ return 'work'; }; ui.currentTaskId='t1'; ui.currentTaskStartedAt=Date.now()-60000; ui.stagedTaskId='t2'; state.appActivity.todayIntervals=[{app:'Final Cut Pro', start:Date.now()-20*60000, end:Date.now()}]; checkAutoLockIn()");
    await p.waitForTimeout(200);
    check('auto lock-in starts a session but puts you on no task', await E("!!(state.focus.activeSession && state.focus.activeSession.autoStarted && state.focus.activeSession.noTask)") && await E("ui.currentTaskId")===null);
    check('…and what you had lined up stays lined up', await E("ui.stagedTaskId")==='t2');
    await E("autoEndFocusSession(Date.now())"); await p.waitForTimeout(200);
    const sid = await E("state.focus.sessions.slice(-1)[0].id");
    check('the recap offers "+ Task" on an auto session', /\+ Task/.test(await E("recapTaskHtml(state.focus.sessions.slice(-1)[0])")));
    const m0 = await E("state.tasks.items.find(t => t.id==='t2').trackedMinutes || 0");
    await E("ACTIONS.recapSetTask({dataset:{sid:'"+sid+"', tid:'t2'}})");
    check('…picking one puts the time on that task', await E("state.tasks.items.find(t => t.id==='t2').trackedMinutes || 0") - m0 >= 15 && await E("state.focus.sessions.slice(-1)[0].taskTitle")==='Send Bloom proposal');
    // Op brings up what you said you'd do
    await E("state.focus.reminders=[{id:'r1', label:'Call the accountant', date:addDays(todayStr(), -1)}]; persist('focus')");
    check('a reminder you haven’t done is next on Op’s list', /accountant/.test(await E("opNudgeNext() && opNudgeNext().short")));
    await E("state.focus.activeSession={startedAt:Date.now(), completedTasks:[], breaks:[]}");
    check('…never while you’re locked in', !(await E("opNudgeDue()")));
    await E("state.focus.activeSession=null; ui._opActiveAt=0");
    check('…otherwise it’s due', await E("opNudgeDue()"));
    await E("opNudge(true)"); await p.waitForTimeout(800);
    check('Op says it (in the bubble, out loud when the voice is on)', await p.isVisible('#opBub.is-in') && (await p.textContent('#opBubText')).length > 2);
    check('…once a day per thing (it won’t repeat it)', !(await E("opNudgeNext()")) && await E("state.profile.opNudge.n")===1);
    check('…and Op knows what it brought up when you answer', /You just brought this up with him: He set himself a reminder: "Call the accountant"/.test(await E("aiContext()")));
    check('the daily question is spoken too, and waits for what you said you’d do', /opSay\(q/.test(await E("opAskQuestion.toString()")) && /opNudgeNext\(\)/.test(await E("opAskQuestion.toString()")));
    check('no page errors (late asks)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Inspiration polish: words every ~45s, its own sounds and volume, search when logging, popping and folding ----
  {
    const p = await ctxPage(b, base, {clock:NOW + 3*3600000});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("const s = inspStore(); s.log.push({id:'lg1', act:'walk', label:'Go for a walk', at:Date.now()-3600000, date:todayStr()}, {id:'lg2', act:'read', label:'Read', at:Date.now()-1800000, date:todayStr()}); persist('personal'); openInspire()"); await p.waitForTimeout(800);
    await p.clock.runFor(15000); await p.waitForTimeout(400);
    check('a few words surface on the sky, behind the bubbles (no author, no quote marks)', await p.$('#inspWorld .izw-layer .izwd') && !/[“”—]/.test(await p.evaluate(() => document.querySelector('.izwd').dataset.text)), await p.evaluate(() => (document.querySelector('.izwd')||{}).textContent));
    check('…word by word, in a quiet spot (never the middle)', (await p.$$('.izwd span')).length >= 3 && await p.evaluate(() => { const r = document.querySelector('.izwd').getBoundingClientRect(), cx = innerWidth/2, cy = innerHeight/2; return !(r.left < cx && r.right > cx && r.top < cy && r.bottom > cy); }));
    await p.clock.runFor(14000); await p.waitForTimeout(400);
    check('…and dissolve after a while', !(await p.$('.izwd')));
    await p.clock.runFor(36000); await p.waitForTimeout(400);
    check('…about every 45 seconds', !!(await p.$('.izwd')));
    // sounds
    await p.click('#insp [data-action="inspSfxOpen"]'); await p.waitForTimeout(200);
    check('Inspiration has its own sound choices: Chimes, Glass, Droplets, Soft keys, Off', (await p.$$eval('#insp .izk-sfx .isx-s', e => e.map(x => x.textContent))).join()==='Chimes,Glass,Droplets,Soft keys,Shuffle,Off');
    await p.click('#insp .izk-sfx [data-id="drops"]'); await p.waitForTimeout(150);
    await p.fill('#insp [data-insp-vol]', '40'); await p.dispatchEvent('#insp [data-insp-vol]', 'input'); await p.clock.runFor(400); await p.waitForTimeout(150);
    check('…the sound and its volume are saved (apart from the music)', await E("inspSfxStyle()")==='drops' && Math.abs(await E("inspSfxVol()") - 0.4) < 0.01 && await E("fmVolume()") > 0.5);
    await E("ACTIONS.inspSfxSet(null, null, 'off')");
    check('…Off means no effects', !(await E("inspSfxOn()")));
    await E("ACTIONS.inspSfxSet(null, null, 'chimes')");
    // search
    await E("ui.inspSfxOpen=false; ACTIONS.inspLogSheet()"); await p.waitForTimeout(300);
    check('logging something has a search box, ready to type', await p.isVisible('#inspFind') && await p.evaluate(() => document.activeElement && document.activeElement.id==='inspFind'));
    await p.keyboard.type('wal'); await p.waitForTimeout(150);
    const vis = await p.$$eval('#insp .izs-grid .izs-a:not(.is-hidden)', e => e.map(x => x.textContent.trim()));
    check('…type "wal" and the walk is right there', vis.length >= 1 && vis.every(t => /wal/i.test(t)) && vis.some(t => /walk/i.test(t)), vis);
    const n0 = await E("inspStore().log.length");
    await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    check('…Enter logs it', await E("inspStore().log.length")===n0 + 1);
    // letting go
    await E("ui.inspSheet=false; inspRender()"); await p.waitForTimeout(300);
    const stones = (await p.$$('#inspWorld .izh-stone')).length;
    await E("ACTIONS.inspLogDel(document.querySelector('#insp .izl-r'), null, 'lg1')"); await p.waitForTimeout(120);
    check('removing a logged thing pops its bubble off the ring around the middle', await p.$('.insp-pop') && await p.$('#inspWorld .izh-stone.is-pop'));
    check('…and its row folds away (no jump)', await p.$('#insp .izl-r.is-fold'));
    await p.waitForTimeout(700);
    check('…then it’s gone', (await p.$$('#inspWorld .izh-stone')).length===stones - 1 && !(await E("inspStore().log.some(x => x.id==='lg1')")));
    await p.click('#insp [data-action="inspPanelToggle"]'); await p.waitForTimeout(120);
    check('folding "This week" away: the panel sinks out instead of jumping', await p.$('#insp .insp-lately.is-leaving'));
    await p.waitForTimeout(600);
    check('…and the small pill rises in its place', await p.isVisible('#insp .insp-lately-min') && !(await p.$('#insp .insp-lately')));
    await p.click('#insp .insp-lately-min'); await p.waitForTimeout(500);
    check('…opening it again rises back', await p.isVisible('#insp .insp-lately'));
    check('Settings → Look & Sound has Inspiration’s sounds too', /Inspiration/.test(await E("soundSettingsHtml()")) && /data-insp-vol/.test(await E("soundSettingsHtml()")));
    check('no page errors (Inspiration polish)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- limbo: Reset on Inspiration, and Op giving you a way out ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {profile:{name:'Andre', about:{reset:'cooking, cleaning'}}}), {clock:NOW + 3*3600000});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openInspire()"); await p.waitForTimeout(700);
    check('Inspiration has "Stuck? Reset" by the middle', await p.isVisible('#insp .izh-reset'));
    await p.click('#insp .izh-reset'); await p.waitForTimeout(300);
    const resets = await p.$$eval('#insp .irs-t b', e => e.map(x => x.textContent));
    check('…your resets first (what you told Op), then cook, clean, a walk, a shower', resets[0]==='Cooking' && resets.some(t => /walk/i.test(t)) && resets.some(t => /shower/i.test(t)) && resets.some(t => /Clean/.test(t)), resets);
    await p.click('#insp .irs-min [data-id="10"]'); await p.waitForTimeout(150);
    await p.click('#insp .irs-t:has-text("walk")'); await p.waitForTimeout(300);
    check('picking one starts it on a gentle timer', await p.isVisible('#insp .irc') && /Go for a walk/.test(await p.textContent('#insp .irc')) && /10:00|9:5/.test(await p.textContent('#ircLeft')));
    check('…Op knows you’re on it', /doing a reset: Go for a walk/.test(await E("aiContext()")));
    await p.click('#insp .irc [data-action="inspResetDone"]'); await p.waitForTimeout(300);
    check('“I’m back” logs it and offers the way back: Lock in for 25', await E("inspStore().log.slice(-1)[0].act")==='walk' && await p.isVisible('#insp .irc.is-done [data-action="inspResetLockIn"]'));
    await p.click('#insp [data-action="inspResetLockIn"]'); await p.waitForTimeout(900);
    check('…which opens the lock-in for 25 minutes', await E("overlayOpen('lockSeqOverlay') && ui.lockSeq && ui.lockSeq.minutes===25") && !(await E("inspOpenNow()")));
    await E("closeLockSeq()");
    // the time runs out while you're away from Inspiration: Op's there
    await E("resetStart('clean', 5); closeInspire()"); await p.waitForTimeout(200);
    await p.clock.runFor(5*60000 + 2000); await p.waitForTimeout(400);
    check('when the time’s up and you’re away, Op asks to lock you in', await p.isVisible('#opBub.is-in') && /lock/i.test(await p.textContent('#opBubText')) && await E("inspStore().log.slice(-1)[0].act")==='clean');
    // Op knows the pattern, and has a tool for it
    check('Op knows your resets and how to handle limbo (pushy, graceful)', /His resets/.test(await E("aiContext()")) && /pushy but graceful/.test(await E("aiContext()")) && /cooking/i.test(await E("limboResetLine()")));
    check('Op can start a reset for you', await E("OP_TOOLS.some(t => t.name==='start_reset')") && /started: A long hot shower/.test(await E("opRunTool('start_reset', {idea:'shower', minutes:10})")));
    check('a check-in answer that sounds like limbo gets a way out, not just a scolding', await E("limboSays('honestly I just dont feel like it today')") && !(await E("limboSays('I was at the dentist')")) && /stuck in between/.test(await E("limboFallback()")));
    check('the check-in’s judge is told to give a reset in limbo', /sounds like limbo/.test(await E("acctJudge.toString()")));
    check('no page errors (limbo)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

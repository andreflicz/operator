// Round 29: the + hover gone, the recap, Shuffle, the music under Op, quick taps, news like a friend,
// your wake-up song as the morning's music, up before the alarm, "Hey Operator", and Inspiration (words behind
// the bubbles, keep to journal, want to, more like this, undo not for me, drag, breeze).
// (helpers as in round 28)
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
  await p.goto('file://'+path.resolve(OUT+'/r29.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r29.html');
  const b = await launch();
  const NOW = new Date(2026,9,13,10,10,5).getTime();   // a Tuesday morning
  const tasks = {items:[{id:'t1', title:'Edit JJS reel', status:'today', priority:'high', clients:[], createdAt:'2026-10-01'}]};
  const wake = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', intro:'quick', introChosen:true, voice:false, sports:['nfl','nba']};
  const base = {profile:{name:'Andre'}, tasks, focus:{wake}};

  // ---- small fixes, the music under Op, quick taps, news ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('the + has no hover label on any page', await p.evaluate(() => getComputedStyle(document.getElementById('fabAdd'), '::after').content)==='none');
    check('work mode: Op’s greeting waits less for the AI (speaks sooner)', /2200/.test(await E("opGreet.toString()")));
    check('the recap opens already drawn (no empty window first)', await E("(openDayRecap(todayStr()), document.getElementById('recapContent').innerHTML.length > 100 && document.getElementById('recapOverlay').classList.contains('is-opening'))"));
    await E("hideOverlay('recapOverlay')");
    check('Inspiration sounds have Shuffle', await E("INSP_SFX.map(x => x[0]).join()")==='chimes,glass,drops,soft,random,off' && await E("(inspSfxCfg().style='random', inspChime(3), true)"));
    await E("inspSfxCfg().style='chimes'");
    // music goes well down under Op, and stays down while a question waits
    await E("focusMusicPlay(0)"); await p.waitForTimeout(300);
    await E("opDuck(true)"); await p.waitForTimeout(600);
    check('Op talking takes the music well down (to about an eighth)', await E("FM.ducked") && await E("FM.bus.g.gain.value") < await E("fmVolume()")*0.3);
    await E("OV.cap='opBubText'; opBubShow(); OV.lastEnd=Date.now(); opCaption('You good, boss?')"); await p.waitForTimeout(900);
    check('…and it stays down while his question waits on you', await E("OV.qDuck===true"));
    await E("opDuck(false)"); await p.waitForTimeout(1500);
    check('…nothing brings it back up mid-question', await E("FM.ducked===true"));
    await E("focusMusicStop()");
    // quick taps while locked in
    await E("ui.currentTaskId='t1'; startFocus(); state.focus.activeSession.startedAt = Date.now()-50*60000; state.focus.activeSession.tapGap = 1; wakeCfg().voice = true; ui._opActiveAt = 0; document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
    check('locked in a while: Op taps in', await E("opTapDue()"));
    await E("opTap()"); await p.waitForTimeout(400);
    check('…with a quick question about what you’re on', /Edit JJS reel|still|good/i.test(await E("AI.history.slice(-1)[0].content")) && /\?\s*$/.test(await E("AI.history.slice(-1)[0].content")));
    check('…and not again right away', !(await E("opTapDue()")));
    await E("state.focus.activeSession = null; wakeCfg().voice = false");
    // news
    check('big news is spotted (a leader shot), everyday crime isn’t', await E("newsIsBig({title:'President shot at rally, officials say - AP'})") && !(await E("newsIsBig({title:'Man charged in downtown robbery - Local'})")) && !(await E("newsIsBig({title:'Apple unveils its fastest chip yet - The Verge'})")));
    await E("ui.morningNews = {date:todayStr(), items:[{title:'Markets edge up on earnings'}, {title:'President shot at rally, officials say'}], sec:{tech:[{title:'Apple unveils a new chip'}], business:[{title:'Agencies see more creator deals'}]}}");
    const big = await E("JSON.stringify(newsTease())");
    check('…a big one is said plainly (and Op sounds like it)', /Something you should know: President shot/.test(big) && await E("ui.briefNewsBig===true"));
    await E("ui.morningNews.items = [{title:'Markets edge up on earnings'}, {title:'Ocean floor mapped in detail'}]");
    const calm = JSON.parse(await E("JSON.stringify(newsTease())"));
    check('…otherwise it’s a few words on what’s going on', /going on in|news in|bits in/i.test(calm.text) && /tech/.test(calm.text) && !/Markets edge up/.test(calm.text), calm.text);
    check('…and Op is told to talk news like a friend, not a newsreader', /like a friend in conversation, not a newsreader/.test(await E("opComposed.toString()")));
    check('no page errors (fixes)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning: your wake-up song is the music ----
  {
    const p = await ctxPage(b, Object.assign({}, base, {focus:{wake:Object.assign({}, wake, {useMusic:true, media:{type:'music', q:'Sunday Morning', k:'song'}})}}), {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(500);
    await E("briefRevealAll()"); await p.clock.runFor(8000); await p.waitForTimeout(500);
    check('with a wake-up song set, the app doesn’t start its own track over it', !(await E("FM.playing")));
    await p.click('#wakeContent .mctl [data-action="mctlToggle"]'); await p.waitForTimeout(300);
    check('…you can still press play for one', await E("FM.playing || wakeSongOn()===false"));
    check('no page errors (song)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- sleep: up before the alarm ----
  {
    const NIGHT = new Date(2026,9,13,5,40,5).getTime();
    const p = await ctxPage(b, Object.assign({}, base, {focus:{wake:Object.assign({}, wake, {armedAt:NIGHT - 8*3600000})}}), {clock:NIGHT});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("startMode('offtime', {sleep:true}); state.modes.active.startedAt = Date.now() - 7*3600000; ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('the sleep screen: “I’m up” and “Good morning →”', await p.isVisible('.sleepv [data-action="sleepUp"]') && await p.isVisible('.sleepv [data-action="sleepGoodMorning"]'));
    await p.click('.sleepv [data-action="sleepUp"]'); await p.waitForTimeout(300);
    check('“I’m up” ends sleep and logs it (about 7 hours)', !(await E("!!state.modes.active")) && await E("(lastNightSleep()||{}).minutes") >= 400);
    check('…and lets the 7:00 alarm go', /let the 7:00 AM alarm go/.test(await E("document.getElementById('toastContainer').textContent")));
    await p.clock.setSystemTime(new Date(2026,9,13,7,0,30)); await E("checkAllAlarms()"); await p.waitForTimeout(300);
    check('…so at 7:00 nothing rings', !(await p.isVisible('#wakeOverlay:not(.hidden)')));
    await E("ACTIONS.sleepGoodMorning()"); await p.waitForTimeout(500);
    check('“Good morning →” opens the briefing, no ringing', await E("ui.wakeMode")==='brief' && await p.isVisible('#wakeOverlay:not(.hidden)'));
    await E("endBriefing()");
    // up and using the app when the alarm comes: it lets it go
    await E("ui._lastInputAt = Date.now(); fireWake({scheduled:true})"); await p.waitForTimeout(200);
    check('already up and using the app: the alarm doesn’t ring, a quiet note offers Good morning', !(await p.isVisible('#wakeOverlay:not(.hidden)')) && /already up/.test(await E("document.getElementById('toastContainer').textContent")));
    check('no page errors (sleep)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- "Hey Operator" ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('it hears “Hey Operator”, “Operator, …” and “op …”', await E("['hey operator', 'Operator what is on today', 'op whats the weather', 'Hey op'].every(t => HEY_RE.test(t))") && !(await E("HEY_RE.test('the operation went well')")) && !(await E("HEY_RE.test('stop that')")));
    check('…and picks out what you asked', await E("HEY_RE.exec('Operator, what’s on today?')[1]")==='what’s on today?');
    await E("window.__asked=null; window.__listen=0; aiAsk = function(t){ window.__asked = t; }; aiListen = function(){ window.__listen++; }");
    await E("heyHeard('what is on today')"); await p.waitForTimeout(400);
    check('“Operator, what’s on today?” is asked straight away', await E("window.__asked")==='what is on today');
    await E("HW.hitAt = 0; heyHeard('')"); await p.waitForTimeout(600);
    check('“Hey Operator” on its own: he answers and the mic opens', await E("window.__listen")>=1 && /Yeah|here|ahead|up/.test(await p.textContent('#opBubText')));
    await E("ui.view='settings'; ui.settingsTab='system'; renderView()"); await p.waitForTimeout(300);
    check('it can be turned off in Settings', /Hey Operator/.test(await E("operatorSettingsHtml()")) && /heyOpToggle/.test(await E("operatorSettingsHtml()")));
    check('no page errors (hey)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Inspiration ----
  {
    const p = await ctxPage(b, base, {clock:NOW});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openInspire()"); await p.waitForTimeout(800);
    // words behind the bubbles, kept through redraws, kept in the journal
    await E("ui._inspWordsAt = Date.now(); inspWords()"); await p.waitForTimeout(300);
    check('words appear on the sky, behind the bubbles', !!(await p.$('#inspWorld .izw-layer .izwd')) && await E("+getComputedStyle(document.querySelector('.izw-layer')).zIndex < +getComputedStyle(document.querySelector('#inspWorld .izb')).zIndex"));
    await E("inspRender(); inspRender()"); await p.waitForTimeout(200);
    check('…redrawing the page doesn’t cut them off (the old glitch)', !!(await p.$('#inspWorld .izwd')));
    await E("ACTIONS.inspKeepWords(document.querySelector('.izwd .izwd-keep'))"); await p.waitForTimeout(200);
    check('tap Keep: they go in your journal, tagged Inspiration', await E("state.journal.entries.slice(-1)[0].mood")==='inspiration' && await E("journalTypes().some(t => t.id==='inspiration')"));
    // catch a drifter: want to
    await E("inspStore().wind='gale'; ACTIONS.inspOpenAct(null, null, 'walk')"); await p.waitForTimeout(300);
    check('an idea’s card: Want to, More like this, Not for me', await p.isVisible('#insp .izb-want') && await p.isVisible('#insp .izb-like') && await p.isVisible('#insp .izb-hide'));
    await p.click('#insp .izb-want'); await p.waitForTimeout(200);
    await E("ui.inspOpenAct=null; inspRender()"); await p.waitForTimeout(200);
    const o0 = await E("IW.off['walk']||0"); await p.clock.runFor(2000); await p.waitForTimeout(300);
    check('“Want to” catches it: it stops drifting and wears the mark', await E("(IW.off['walk']||0)")===o0 && await p.$('#inspWorld .izb.is-want[data-id="walk"]'));
    check('…and it’s in the panel, under Want to', /Want to/.test(await p.textContent('#insp .insp-lately')) && /Go for a walk/.test(await p.textContent('#insp .izl-wants')));
    await p.click('#insp .izl-wd[data-id="walk"]'); await p.waitForTimeout(200);
    check('…✓ logs it and clears it', await E("inspStore().log.slice(-1)[0].act")==='walk' && await E("inspWants().length")===0);
    await E("inspStore().wind='calm'");
    // more like this, not for me (and undo)
    await E("ACTIONS.inspOpenAct(null, null, 'read')"); await p.waitForTimeout(200); await p.click('#insp .izb-like'); await p.waitForTimeout(200);
    check('“More like this” is remembered (and Op’s ideas follow it)', await E("inspLikes().indexOf('read')>=0") && /more like: Read/.test(await E("inspAiFacts()")));
    await E("ACTIONS.inspOpenAct(null, null, 'clean'); inspRender()"); await p.waitForTimeout(200); await p.click('#insp .izb-hide'); await p.waitForTimeout(600);
    check('“Not for me” hides it, with an Undo right there', await E("inspHidden().indexOf('clean')>=0") && await p.isVisible('#inspUndo'));
    await p.click('#inspUndo button'); await p.waitForTimeout(400);
    check('…Undo brings it back', await E("inspHidden().indexOf('clean')<0") && !(await p.$('#inspUndo')) && !!(await p.$('#inspWorld .izb[data-id="clean"]')));
    // pick one up and move it
    await E("ui.inspView = {x:0, y:0, z:1}; inspApply(false)"); await p.waitForTimeout(200);
    const did = await p.evaluate(() => { const bs = Array.from(document.querySelectorAll('#inspWorld .izb')); const b = bs.find(x => { const r = x.getBoundingClientRect(); if(r.left < 300 || r.right > innerWidth - 300 || r.top < 120 || r.bottom > innerHeight - 160) return false; const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return e && e.closest('.izb')===x && Number(x.style.opacity || 1) > 0.9; }); return b && b.dataset.id; });
    const bb = await (await p.$('#inspWorld .izb[data-id="'+did+'"]')).boundingBox();
    await p.mouse.move(bb.x + bb.width/2, bb.y + bb.height/2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width/2 + 120, bb.y + bb.height/2 + 40, {steps:8}); await p.mouse.up(); await p.waitForTimeout(300);
    await p.waitForTimeout(400);
    const bb2 = await (await p.$('#inspWorld .izb[data-id="'+did+'"]')).boundingBox();
    check('you can pick a bubble up and put it somewhere else (it stays)', !!(await E("inspPosStore()['"+did+"']")) && Math.abs((bb2.x - bb.x) - 120) < 45 && Math.abs((bb2.y - bb.y) - 40) < 45, [bb.x, bb2.x, bb.y, bb2.y]);
    check('…without opening its card', !(await E("ui.inspOpenAct")));
    // breeze and return
    await E("ACTIONS.inspBreezeAway()"); await p.clock.runFor(3500); await p.waitForTimeout(300);
    const kept = await p.$$eval('#inspWorld .izb', e => e.filter(x => Number(x.style.opacity || 1) > 0.5).map(x => x.dataset.id));
    check('Breeze: a gust lifts everything away but one', kept.length===1 && !!(await p.$('#inspWorld .izb.is-keep')), kept);
    check('…“One thing, for now.”', /One thing, for now/.test(await p.textContent('#insp')));
    const seed0 = await E("inspStore().seed||0");
    await E("ACTIONS.inspBreezeAway()"); await p.clock.runFor(6000); await p.waitForTimeout(400);
    check('Return brings them all back, in a new arrangement (your own spots stay)', await E("inspStore().seed")===seed0 + 1 && (await p.$$eval('#inspWorld .izb', e => e.filter(x => Number(x.style.opacity || 1) > 0.5).length)) > 5 && await E("parseFloat(document.querySelector('#inspWorld .izb[data-id=\""+did+"\"]').style.left)")===await E("(inspPosStore()['"+did+"']||{}).x"));
    check('the sound panel has no footnote', !(await E("/own player/.test(inspToolsHtml())")));
    // ---- Op never gets stuck (a line on Inspiration that never says it finished, then you leave) ----
    await E("OV.cap = 'opBubText'; opBubShow(); OV.speaking = true; OV.pending = false; OV.audio = null; OV.sayText = 'Want to take a walk before the next block?'; OV.sayAt = Date.now() - 60000; document.body.classList.add('op-speaking')");
    await p.clock.runFor(2500); await p.waitForTimeout(100);
    check('a line that never reports it ended is let go (Op isn’t stuck “speaking”)', await E("!OV.speaking && !OV.pending && !document.body.classList.contains('op-speaking')"));
    await E("closeInspire()"); await p.clock.runFor(1500); await p.waitForTimeout(200);
    await E("document.getElementById('opBub').classList.remove('is-in'); OV.cap = 'opBubText'; opCaption('Back at it, boss?')"); await p.waitForTimeout(400);
    check('…after leaving Inspiration the next thing he says pops up in the bubble', await E("(function(){ const b = document.getElementById('opBub'), r = b.getBoundingClientRect(); return b.classList.contains('is-in') && getComputedStyle(b).opacity!=='0' && r.left >= 0 && r.bottom <= innerHeight && /Back at it/.test(b.textContent); })()"));
    await E("OV.userCut = true; OV.userCutAt = Date.now() - 5000; opSay('You good?', {cap:'opBubText'})");
    check('tapping Op’s light once doesn’t stop the mic opening on his later questions', await E("OV.userCut===false"));
    await E("AI.listening = true; AI.cancelListen = null");
    await p.clock.runFor(84000); await p.waitForTimeout(100);
    check('a mic that never closes is let go', await E("AI.listening===false"));
    check('no page errors (Inspiration)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

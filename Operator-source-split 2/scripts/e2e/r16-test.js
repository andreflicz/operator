// Round 16: Get to Work; quotes that fit; leaving animations; the break heads-up; the minimal view
// (corner clock, technique timeline, music in the middle); the music dock; music pause that works;
// the journal orb; Good morning ↔ work preview; backgrounds by time; the minimal Good morning;
// scores; the time capsule; the note for tomorrow; the Operator's voice; XP & ranks.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const ok = {status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}};
const TEAM = {NYG:'New York Giants', NYK:'New York Knicks', DAL:'Dallas Cowboys', PHI:'Philadelphia Eagles', BOS:'Boston Celtics'};
const ev = (id, h, a, hs, as, state, date) => ({id, date, status:{type:{state, shortDetail: state==='post'?'Final':'Sun 1:00 PM'}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner: state==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h]||h, shortDisplayName:h}},{homeAway:'away', score:as, winner: state==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a]||a, shortDisplayName:a}}]}]});
// a stand-in for the Mac's speech engine: starts, reports each word, ends
const FAKE_SPEECH = () => {
  window.__said = [];
  const S = { _q:[], getVoices(){ return [{name:'Daniel', lang:'en-GB'}]; }, cancel(){ this._q = []; if(this._t) clearTimeout(this._t); this._busy = false; },
    speak(u){ this._q.push(u); if(!this._busy) this._next(); },
    _next(){ const u = this._q.shift(); if(!u){ this._busy = false; return; } this._busy = true; const self = this; window.__said.push(u.text);
      setTimeout(() => { u.onstart && u.onstart(); const w = u.text.split(' '); let i = 0, pos = 0; const step = () => { if(i>=w.length){ u.onend && u.onend(); self._next(); return; } u.onboundary && u.onboundary({charIndex:pos, charLength:w[i].length}); pos += w[i].length+1; i++; self._t = setTimeout(step, 40); }; step(); }, 20); } };
  Object.defineProperty(window, 'speechSynthesis', {value:S}); window.SpeechSynthesisUtterance = function(t){ this.text = t; };
};
(async () => {
  instrument(process.argv[2], OUT+'/r16.html');
  const b = await launch();
  const tasks = [{id:'t0', title:'Edit JJS reel', status:'today', priority:'high', clients:['personal']}, {id:'t1', title:'Send proposal', status:'today', priority:'med', clients:['personal']}];

  // ---- the minimal locked-in view, the dock, music controls ----
  {
    const asked = [];
    const p = await newPage(b, OUT+'/r16.html', {profile:{name:'Andre', lockedView:'minimal'}, tasks:{items:tasks}});
    await p.route('http://127.0.0.1:8935/**', r => { asked.push(r.request().url().replace(/^.*8935/, '')); r.fulfill(ok); });
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.currentTaskId='t0'; startFocus(); state.focus.activeSession.method={id:'pomodoro'}; renderView()"); await p.waitForTimeout(900);
    check('minimal: a clean corner clock (time, date, next alarm)', await p.isVisible('.np-clock #npClockT') && await p.isVisible('#npClockD'));
    check('Pomodoro laid out as blocks: 4 rounds and 3 breaks', (await p.$$('.np-tl i')).length===7 && (await p.$$('.np-tl i.np-tl-r')).length===3 && await p.$('.np-tl i.is-cur')!==null);
    check('the player: ☕ break · ▶ music (the big one) · ■ lock out', await p.isVisible('.np-ctl .np-music.is-main') && await p.isVisible('.np-ctl .np-out[data-action="openStopFocus"]') && await p.$('.np-top .lv-out')===null);
    check('the top-right dock steps aside in the minimal view', !(await p.isVisible('#musicDock')));
    await p.click('.np-ctl .np-music'); await p.waitForTimeout(300);
    check('♫ starts the music', await E("FM.playing") && /First Light|Still Water|Meadow|Clearwater|Far Lands/.test(await p.textContent('.np-mnow')));
    check('…and what’s playing shows under it, with ⏭', await p.isVisible('.np-mrow .md-skip'));
    await p.click('.np-ctl .np-music'); await p.waitForTimeout(300);
    check('…and stops it', !(await E("FM.playing")));
    await E("openBreakNotePrompt()"); await p.waitForTimeout(300);
    check('a break mid-Pomodoro warns that it breaks the rhythm', /isn’t one of your Pomodoro breaks/.test(await p.textContent('#breakNoteContent')));
    await E("closeBreakNotePrompt()");
    await E("ACTIONS.toggleLockedView()"); await p.waitForTimeout(80);
    check('leaving the minimal view animates out', await p.$('.np.is-leaving')!==null);
    await p.waitForTimeout(600);
    check('the music dock is in the corner everywhere else (just ▶ now)', await p.isVisible('#musicDock .md-fm') && (await p.$$('#musicDock .md-n, #musicDock .md-sun')).length===0);
    asked.length = 0;
    await E("musicApp('pause'); musicApp('next'); musicApp('play', {type:'music', k:'song', q:'Sunrise'})"); await p.waitForTimeout(300);
    check('pause / next go to the launcher’s /music/cmd (they silently failed before)', asked.includes('/music/cmd?c=pause') && asked.includes('/music/cmd?c=next'));
    check('…while playing a song still goes to /music/play', asked.some(u => u.startsWith('/music/play?k=song')));
    check('the journal orb is there in the full-screen views too', await E("ACTIONS.toggleLockedView(), true") && (await p.waitForTimeout(500), await p.isVisible('.quick-journal-fab.jorb')));
    check('no page errors (minimal / dock)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning: voice, scores, time capsule, back to morning ----
  {
    const T = new Date(2026,9,12,7,0,5).getTime();
    const ctx = await b.newContext({viewport:{width:1400, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
    await p.clock.install({time:T});
    await p.addInitScript(FAKE_SPEECH);
    await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); },
      {profile:{name:'Andre', revenueGoalMonthly:20000}, tasks:{items:tasks}, business:{clients:[{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3500}], pipeline:[]},
       journal:{entries:[], capsules:[{id:'k1', text:'Proud of you for sticking with it.', title:'From summer', writtenOn:'2026-06-01', openOn:'2026-10-12', hidden:true}]},
       focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants, Knicks', intro:'quick', introChosen:true, voiceEngine:'browser'}}});
    await p.route('http://127.0.0.1:8935/**', r => { const u = r.request().url();
      if(u.includes('/sports')){ const nfl = u.includes('l=nfl'); return r.fulfill({status:200, body:JSON.stringify({events: nfl ? [ev('1','NYG','DAL','24','17','post','2026-10-11T17:00Z'), ev('2','PHI','NYG','','','pre','2026-10-18T17:00Z')] : [ev('3','NYK','BOS','112','104','post','2026-10-11T23:30Z')]}), headers:{'Access-Control-Allow-Origin':'*'}}); }
      if(u.includes('/news')) return r.fulfill({status:200, body:'<?xml version="1.0"?><rss><channel><title>G</title><item><title>Big story - Src</title><link>https://x.com/1</link></item><item><title>Second story - Src</title><link>https://x.com/2</link></item></channel></rss>', headers:{'Access-Control-Allow-Origin':'*'}});
      r.fulfill(ok); });
    await p.goto('file://'+require('path').resolve(OUT+'/r16.html')); await p.waitForTimeout(500);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]');
    await p.clock.runFor(3000); await p.waitForTimeout(1500);
    const said = await p.evaluate(() => window.__said.filter(x => x.trim()));
    check('the Operator speaks: good morning, the time', said.length>0 && /^Good morning, Andre\. It’s 7:0\d AM/.test(said[0]), said);
    check('the blue line is its captions', (await p.textContent('#brVoice')).length > 0);
    check('ask it things: sports, news, tech, business', (await p.$$('.op-asks .op-ask')).length===4);
    await E("briefRevealAll()"); await p.waitForTimeout(1200);
    check('Good morning’s button says Get to Work', /Get to Work/.test(await p.textContent('[data-action="wakeStartMorning"]')));
    check('background follows the time you’re up (not black)', await p.$('.brief.bg-sunrise, .brief.bg-day, .brief.bg-golden, .brief.bg-night')!==null);
    check('scores: last results and what’s next, your teams highlighted', (await p.$$('.gc-grid .gc')).length>=3 && await p.$('.gc.is-fav')!==null && /NYG/.test(await p.textContent('.gc-grid')));
    check('a time capsule turns up: "From Past You"', /From Past You/.test(await p.textContent('.br-you')) && /Proud of you/.test(await p.textContent('.br-you')));
    check('…and goes into the journal', await E("state.journal.entries.some(e => e.capsuleFrom==='2026-06-01')") && await E("state.journal.capsules[0].openedOn")==='2026-10-12');
    await p.click('[data-action="opAsk"][data-id="sports"]'); await p.waitForTimeout(700);
    check('"Sports" reads the scores', /NYG beat the DAL, 24 to 17/.test(await p.evaluate(() => window.__said.slice(-1)[0])));
    check('the journal orb shows over Good morning', await p.isVisible('.quick-journal-fab.jorb'));
    await p.click('[data-action="wakeStartMorning"]'); await p.waitForTimeout(1800);
    check('straight from Good morning to work: the business brief plays by itself', /Today you’ve got 2 things\. Edit JJS reel and Send proposal\./.test(await p.evaluate(() => window.__said.slice(-1)[0])));
    check('the work preview has "← Morning"', await p.isVisible('#planOverlay .wi-back'));
    await p.click('#planOverlay .wi-back'); await p.waitForTimeout(500);
    check('…and it goes back to Good morning (a sequence)', await E("overlayOpen('wakeOverlay') && ui.wakeMode==='brief'") && !(await E("overlayOpen('planOverlay')")));
    check('no page errors (Good morning)', p.errors.length===0, p.errors);
    await ctx.close();
  }

  // ---- the minimal Good morning (setting) ----
  {
    const p = await newPage(b, OUT+'/r16.html', {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:false, briefLayout:'minimal', briefBg:'dark', voice:false}}}, new Date(2026,9,12,7,0,5).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.route('http://127.0.0.1:8935/**', r => r.fulfill(ok));
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(800);
    check('minimal Good morning: one big Get to Work in the middle', await p.isVisible('.gmm-go[data-action="wakeStartMorning"]') && (await p.$$('.gmm-t')).length>=4);
    check('Dark background when you pick it', await p.$('.brief.bg-dark')!==null);
    check('no page errors (minimal Good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the time capsule from the quick note; the note for tomorrow ----
  {
    const p = await newPage(b, OUT+'/r16.html', {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}}, new Date(2026,9,10,18,0).getTime()); // Saturday
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("openQuickJournalModal()"); await p.waitForTimeout(400);
    await p.fill('#quickJournalModalText', 'Did you keep going?');
    await p.click('[data-action="qjCapsule"]'); await p.waitForTimeout(200);
    check('⏳ turns the note into a time capsule (Surprise me by default)', await p.isVisible('.qj3-cap') && await p.$('.qj3-capb.is-on')!==null);
    await E("saveQuickJournal()"); await p.waitForTimeout(300);
    const cap = JSON.parse(await E("JSON.stringify(state.journal.capsules.slice(-1)[0])"));
    check('…sealed for a surprise morning (1–12 months out), not in the journal yet', cap && cap.text==='Did you keep going?' && cap.openOn > '2026-11-08' && cap.openOn <= '2027-10-10' && !(await E("state.journal.entries.some(e => e.text==='Did you keep going?')")), cap);
    await p.waitForTimeout(1300);
    await E("ACTIONS.clockOut()"); await p.waitForTimeout(600);
    check('clocked out before a day off: "Note for tomorrow" is right there', await p.isVisible('.np.rest [data-action="openTomorrowNote"]'));
    await p.click('.np.rest [data-action="openTomorrowNote"]'); await p.waitForTimeout(300);
    await p.fill('#tnHead', 'Rest. Then Monday.'); await p.fill('#tnMorning', 'Slow coffee, long walk.'); await p.fill('#tnWork', 'Call Mike first.');
    await p.click('[data-action="saveTomorrowNote"]'); await p.waitForTimeout(300);
    const nn = JSON.parse(await E("JSON.stringify(nightNote(morningNoteTarget()))"));
    check('the note saves in its three parts', nn.headline==='Rest. Then Monday.' && nn.morning==='Slow coffee, long walk.' && nn.work==='Call Mike first.', nn);
    await E("openTomorrowNote()"); await p.waitForTimeout(200);
    check('…and opens again to edit (one note you keep updating)', await p.inputValue('#tnHead')==='Rest. Then Monday.');
    check('no page errors (capsule / note)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // (XP & ranks: r17 — the system changed)

  await b.close();
  process.exit(report() ? 1 : 0);
})();

// Round 17: no Claude / Drive links; Apple Music only for the wake-up song (the dock is just ▶);
// snooze offers "▶ Play music"; Good morning — no play button up top, the mute by Skip, Headlines and
// Sports as their own panels, four columns on a wide screen, a quote box that never changes size and
// a page that doesn't jump when the news lands; the work preview — no "First up", every quote shows
// who said it; no "Up next" under any LOCK IN; the Focus page's own minimal view (locked in or not);
// the voice — one voice, ElevenLabs through the launcher (falls back to the browser), better sports /
// news / tech / business; talk to the Operator (Claude through the launcher; keys never in Operator's
// data); XP from level 0, ranks that need the body too, the 2K card, Personal → You, SYSTEM windows.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const path = require('path');
const hexDecode = h => Buffer.from(h, 'hex').toString('utf8');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
const TEAM = {NYG:'New York Giants', DAL:'Dallas Cowboys', PHI:'Philadelphia Eagles', NYK:'New York Knicks', BOS:'Boston Celtics', LAL:'Los Angeles Lakers', GSW:'Golden State Warriors'};
const ev = (id, h, a, hs, as, state, date) => ({id, date, status:{type:{state, shortDetail: state==='post'?'Final':'Sun 1:00 PM'}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner: state==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h], shortDisplayName:TEAM[h].split(' ').pop()}},{homeAway:'away', score:as, winner: state==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a], shortDisplayName:TEAM[a].split(' ').pop()}}]}]});
const RSS = xs => '<?xml version="1.0"?><rss><channel><title>G</title>'+xs.map((t, i) => '<item><title>'+t+'</title><link>https://x.com/'+i+'</link></item>').join('')+'</channel></rss>';
const TOP = ['Fed signals a rate cut as inflation cools', 'Storm system moves up the East Coast', 'Markets close at a record high', 'Wildfire contained after a week'];
const TECH = ['Apple unveils a new MacBook Pro', 'A faster AI model ships for developers', 'Startup funding rebounds'];
const SPORT = ['Giants rally late to stun Cowboys', 'Knicks extend their win streak'];
// a tiny real WAV (0.4 s of silence), for the launcher's voice
function wav(){ const n = 8000*0.4, b = Buffer.alloc(44 + n*2); b.write('RIFF', 0); b.writeUInt32LE(36 + n*2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n*2, 40); return b; }
// a stand-in for the browser's speech engine
const FAKE_SPEECH = (voices) => {
  window.__said = []; window.__voices = voices || [{name:'Daniel', lang:'en-GB'}];
  const S = { _q:[], _ls:[], getVoices(){ return window.__voices; }, addEventListener(t, f){ this._ls.push(f); }, cancel(){ this._q = []; if(this._t) clearTimeout(this._t); this._busy = false; },
    speak(u){ this._q.push(u); if(!this._busy) this._next(); },
    _next(){ const u = this._q.shift(); if(!u){ this._busy = false; return; } this._busy = true; const self = this; window.__said.push({text:u.text, voice:u.voice && u.voice.name});
      setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => { u.onend && u.onend(); self._next(); }, 60); }, 20); } };
  Object.defineProperty(window, 'speechSynthesis', {value:S}); window.SpeechSynthesisUtterance = function(t){ this.text = t; };
};
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1400, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  if(opts.fixed) await p.clock.setFixedTime(opts.fixed);
  if(opts.speech) await p.addInitScript(FAKE_SPEECH, opts.voices || null);
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  if(opts.route) await p.route('http://127.0.0.1:8935/**', opts.route);
  await p.goto('file://'+path.resolve(OUT+'/r17.html')); await p.waitForTimeout(500);
  return p;
}
const newsRoute = (asked, extra) => async r => {
  const u = r.request().url(); if(asked) asked.push(u.replace(/^.*8935/, ''));
  if(extra){ const x = await extra(u, r); if(x) return; }
  if(u.includes('/sports')){ const nfl = u.includes('l=nfl'); return r.fulfill({status:200, headers:CORS, body:JSON.stringify({events: nfl ? [ev('1','NYG','DAL','24','17','post','2026-10-11T17:00Z'), ev('2','PHI','NYG','','','pre','2026-10-18T17:00Z')] : [ev('3','NYK','BOS','112','104','post','2026-10-11T23:30Z'), ev('4','GSW','LAL','','','pre','2026-10-13T02:30Z')]})}); }
  if(u.includes('/news')){ const q = hexDecode((u.split('q=')[1]||'').split('&')[0]); return r.fulfill({status:200, headers:CORS, body:RSS(/Giants|NBA/.test(q) ? SPORT : /AI|Apple/.test(q) ? TECH : TOP)}); }
  return r.fulfill(okJ);
};

(async () => {
  instrument(process.argv[2], OUT+'/r17.html');
  const b = await launch();
  const MON = new Date(2026,9,12,7,0,5).getTime(); // a Monday
  const tasks = [{id:'t0', title:'Edit JJS reel', status:'today', priority:'high', clients:['personal']}, {id:'t1', title:'Send proposal', status:'today', priority:'med', clients:['personal']}];
  const WAKE = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants, Knicks', newsTech:'AI, Apple', intro:'quick', introChosen:true, voice:false};

  // ---- cleanups: no Claude, no Drive; the dock is just ▶; no playlist settings ----
  {
    const p = await newPage(b, OUT+'/r17.html', {profile:{name:'Andre'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('no Claude in the AI quick links', await E("AI_TOOLS.every(t => t.id!=='claude')"));
    check('no Google Drive quick link', await E("QUICK_LINK_DEFS.every(q => q.key!=='drive')"));
    await E("ui.view='settings'; ui.settingsTab='display'; renderView()"); await p.waitForTimeout(300);
    check('no Google Drive field in Settings', await p.$('#setQuickDrive')===null);
    check('the dock is just the ▶ for Operator’s own tracks', await p.isVisible('#musicDock .md-fm') && (await p.$$('#musicDock .md-sun, #musicDock .md-n')).length===0);
    await E("ACTIONS.dockFm()"); await p.waitForTimeout(300);
    check('▶ plays the custom songs', await E("FM.playing") && /First Light|Still Water|Meadow|Clearwater|Far Lands/.test(await p.textContent('#musicDock .md-now')));
    await E("ACTIONS.dockFm()");
    await E("ui.settingsTab='sound'; renderView()"); await p.waitForTimeout(300);
    check('no playlist settings left (morning playlist, 1·2·3)', await p.$('#sndMorningPl, #sndPl0')===null && !(await E("typeof morningPlaylist")).includes('function'));
    check('no page errors (cleanups)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- snooze: the song stops, so the button says "▶ Play music" and plays it again ----
  {
    const asked = [];
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:Object.assign({}, WAKE, {media:{type:'music', k:'song', q:'Sunrise'}})}}, {route:newsRoute(asked)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.waitForTimeout(600);
    await E("wakeSnooze()"); await p.waitForTimeout(400);
    check('snoozing: the button reads "▶ Play music"', /Play music/.test(await p.textContent('.snz-music')));
    asked.length = 0;
    await p.click('.snz-music'); await p.waitForTimeout(500);
    check('…and plays the wake-up song again', asked.some(u => u.startsWith('/music/play') && /q=/.test(u)) && /Pause music/.test(await p.textContent('.snz-music')), asked);
    await p.click('.snz-music'); await p.waitForTimeout(300);
    check('…then pauses it', /Play music/.test(await p.textContent('.snz-music')));
    check('no page errors (snooze)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning: the layout ----
  for(const vp of [{width:1400, height:900, cols:3}, {width:1920, height:1080, cols:4}]){
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, calendar:{events:[{id:'e1', date:'2026-10-12', time:'13:00', title:'Call with JJS'}]}, focus:{wake:WAKE}}, {viewport:vp, clock:MON, route:newsRoute()});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(600);
    await E("briefRevealAll()"); await p.clock.runFor(1500); await p.waitForTimeout(1500);
    if(vp.cols===3){
      check('no play button at the top of Good morning', await p.$('.brief4 .plb, .brief4 [data-action="playMorningPlaylist"]')===null);
      check('the mute sits in the top bar, by Skip', await p.isVisible('.brief-top .op-mute-top') && !(await p.$('.op-asks .op-mute')));
      const mb = await p.evaluate(() => { const m = document.querySelector('.brief-top .op-mute-top').getBoundingClientRect(), s = document.querySelector('.brief-top .brief-skipall').getBoundingClientRect(); return {gap:s.left - m.right, right:m.right > window.innerWidth*0.7}; });
      check('…right next to it (not floating in the middle)', mb.gap>=0 && mb.gap<30 && mb.right, mb);
      check('Headlines: the news with tech mixed in', await p.isVisible('.br-news') && /Fed signals/.test(await p.textContent('.br-news')) && (await p.$$('.br-news .br-tag')).length>=1 && /Apple unveils/.test(await p.textContent('.br-news')));
      check('Sports: its own panel — scores and sports headlines', await p.isVisible('.br-sports') && (await p.$$('.br-sports .gc')).length>=2 && /Giants rally/.test(await p.textContent('.br-sports')) && !/Giants rally/.test(await p.textContent('.br-news')));
      const qh = await p.evaluate(() => document.querySelector('.br-quote').getBoundingClientRect().height);
      for(let i=0;i<6;i++) await E("nextQuote('morning')");
      await p.waitForTimeout(300);
      const qh2 = await p.evaluate(() => document.querySelector('.br-quote').getBoundingClientRect().height);
      check('the quote box stays the same size whatever the quote', Math.abs(qh - qh2) < 1, [qh, qh2]);
      check('…and always shows who said it', await p.evaluate(() => { const q = document.querySelector('.br-quote'), c = q.querySelector('figcaption'); if(!c) return true; const a = q.getBoundingClientRect(), r = c.getBoundingClientRect(); return r.bottom <= a.bottom + 1 && r.height > 5; }));
    } else {
      const tops = await p.evaluate(() => ['.c-a', '.c-b', '.c-c', '.c-d'].map(s => { const r = document.querySelector('.b4-grid > '+s).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left)]; }));
      check('wide screen: four columns side by side (you · today · headlines · sports)', tops.every(t => Math.abs(t[0]-tops[0][0])<2) && tops[3][1] > tops[2][1] && tops[2][1] > tops[1][1], tops);
      check('…using the width', await p.evaluate(() => document.querySelector('.brief-inner.b4').getBoundingClientRect().width) > 1700);
    }
    check('no page errors (Good morning '+vp.width+')', p.errors.length===0, p.errors);
    await p.context().close();
  }
  // the page doesn't move when the news lands late
  {
    let release; const gate = new Promise(r => release = r);
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:WAKE}}, {clock:MON, route:newsRoute(null, async (u, r) => { if(u.includes('/news') || u.includes('/sports')){ await gate; return false; } })});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(400);
    await E("briefRevealAll()"); await p.waitForTimeout(800);
    const before = await p.evaluate(() => { const d = document.querySelector('.br-day').getBoundingClientRect(); return Math.round(d.top); });
    check('while the news loads, its place is held', await p.$('.br-news.is-loading')!==null);
    release(); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => { const d = document.querySelector('.br-day').getBoundingClientRect(); return Math.round(d.top); });
    check('…and "Today" doesn’t move when it lands', await p.$('.br-news:not(.is-loading)')!==null && Math.abs(before - after) <= 1, [before, after]);
    check('no page errors (stable page)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the work preview; LOCK IN buttons ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:WAKE}}, {clock:MON, route:newsRoute()});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("clockIn({from:'morning'})"); await p.waitForTimeout(1200);
    check('work preview: no "First up" under LOCK IN', await p.isVisible('#planOverlay .pr-go') && await p.$('#planOverlay .ls-go-sub')===null);
    check('the mute is up top in the work preview too', await p.isVisible('#planOverlay .wi-top .op-mute-top'));
    const auth = await p.evaluate(() => Array.from(document.querySelectorAll('#planOverlay .wi-side, #planOverlay .wi-act')).filter(el => el.offsetParent).map(box => { const c = box.querySelector('figcaption'); if(!c) return true; const a = box.getBoundingClientRect(), r = c.getBoundingClientRect(); return r.height > 5 && r.bottom <= a.bottom + 1; }));
    check('every quote box shows who said it (bottom right too)', auth.length>=1 && auth.every(Boolean), auth);
    check('your level is in the work preview', /Level 0/.test(await p.textContent('#planOverlay .wi-stats')));
    await E("ACTIONS.closePlanReveal()"); await p.waitForTimeout(400);
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    check('Today’s LOCK IN: just the words, no "Up next"', await p.isVisible('.today-hero .lockin-cta') && !/Up next/.test(await p.textContent('.today-hero .lockin-cta')));
    check('no page errors (work preview)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the Focus page's minimal view ----
  {
    const asked = [];
    const p = await newPage(b, OUT+'/r17.html', {profile:{name:'Andre'}, tasks:{items:tasks}});
    await p.route('http://127.0.0.1:8935/**', r => { asked.push(r.request().url().replace(/^.*8935/, '')); r.fulfill(okJ); });
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(400);
    check('Focus (not locked in) has a Minimal button', await p.isVisible('.lv-corner.is-focus [data-action="toggleFocusMinimal"]'));
    await p.click('[data-action="toggleFocusMinimal"]'); await p.waitForTimeout(700);
    check('minimal: the clock, your level, your streak, LOCK IN and a few buttons', await p.isVisible('.np-home .hm-clock #npClockT') && await p.isVisible('.np-home .hm-lvl') && /day streak/.test(await p.textContent('.np-home')) && await p.isVisible('.np-home .hm-go') && (await p.$$('.np-home .hm-b')).length===3);
    check('…and nothing under LOCK IN but space', !/Up next/.test(await p.textContent('.np-home')));
    check('…full screen (the sidebar steps aside)', await E("document.body.classList.contains('np-on')") && asked.includes('/window/full?f=1'));
    await p.keyboard.press('m'); await p.waitForTimeout(800);
    check('M goes back to the full page', await p.$('.np-home')===null && await p.isVisible('.lv-corner.is-focus'));
    await E("ui.currentTaskId='t0'; startFocus(); state.profile.lockedView='full'; renderView()"); await p.waitForTimeout(500);
    await p.keyboard.press('m'); await p.waitForTimeout(600);
    check('locked in on Focus, M (or the button) gives the locked-in minimal view', await p.$('.np-locked')!==null);
    check('no page errors (Focus minimal)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the voice: one voice; ElevenLabs through the launcher, the browser as a fallback ----
  {
    const asked = [];
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:Object.assign({}, WAKE, {voice:true})}},
      {fixed:MON, speech:true, voices:[{name:'Samantha', lang:'en-US'}, {name:'Zarvox', lang:'en-US'}, {name:'Daniel', lang:'en-GB'}, {name:'Daniel (Enhanced)', lang:'en-GB'}],
       route:newsRoute(asked, async (u, r) => { if(u.includes('/tts/say')){ await r.fulfill({status:200, body:wav(), headers:Object.assign({'Content-Type':'audio/wav'}, CORS)}); return true; } })});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('ElevenLabs is the voice by default', await E("opEngine()")==='eleven');
    await E("opSay('Good evening. Everything is in order.', {cap:'x'})"); await p.waitForTimeout(2500);
    const tts = asked.find(u => u.startsWith('/tts/say'));
    check('it asks the launcher for the line (ElevenLabs), not the browser', !!tts && /e=eleven/.test(tts) && hexDecode(tts.split('t=')[1]) === 'Good evening. Everything is in order.' && (await p.evaluate(() => window.__said.length))===0, tts);
    await E("OV.helperDown = true; wakeCfg().voiceEngine='eleven'");
    await E("opSay('One voice, always.')"); await p.waitForTimeout(600);
    const said = await p.evaluate(() => window.__said);
    check('without the launcher: the browser’s best voice — and always the same one (no robot, no second voice)', said.length===1 && said[0].voice==='Daniel (Enhanced)', said);
    check('the voice picker scores voices: Premium/Enhanced British first, novelty voices never', await E("opBrowserVoices().map(v=>v.name).join(',')")==='Daniel (Enhanced),Daniel,Samantha');
    // what it says
    await E("loadMorningNews(true)"); await E("loadScores(true)"); await p.waitForTimeout(1200);
    const sports = await E("opSportsScript()");
    check('Sports: last night’s results…', /Last night, the Giants beat the Cowboys, 24 to 17\./.test(sports) && /Knicks/.test(sports), sports);
    check('…and what’s coming up (tonight, tomorrow, this week)', /Coming up/.test(sports) && /(tonight|tomorrow|on Sunday)/.test(sports), sports);
    const news = await E("opNewsScript('top')");
    check('News: a quick rundown with a human rhythm — three stories, under 30 seconds', /Fed signals a rate cut as inflation cools\./.test(news) && /(Also making news|Meanwhile|Elsewhere)/.test(news) && news.split(' ').length < 75, news);
    await E("ui.morningNews.sec.tech = null");
    asked.length = 0;
    await E("ACTIONS.opAsk(null, null, 'tech')"); await p.waitForTimeout(1500);
    check('Tech with nothing in yet: it goes and gets it instead of "nothing new"', asked.some(u => u.startsWith('/news?q=')) && /Apple unveils/.test(await E("opNewsScript('tech')")));
    const biz = await E("opBusinessScript()");
    check('Business: just what you’ve got today…', /^Today you’ve got 2 things\. Edit JJS reel and Send proposal\./.test(biz) && !/Monthly recurring|open lead/.test(biz), biz);
    check('…and on a Monday: "Let’s start the week strong."', /Let’s start the week strong\.$/.test(biz), biz);
    check('no page errors (voice)', p.errors.length===0, p.errors);
    await p.context().close();
  }
  {
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:WAKE}}, {clock:new Date(2026,9,16,8,0).getTime(), route:newsRoute()});
    check('Friday: "Let’s finish the week strong."', /Let’s finish the week strong\.$/.test(await p.evaluate(() => window.__op.ev("opBusinessScript()"))));
    await p.context().close();
  }

  // ---- talk to the Operator; keys stay with the launcher ----
  {
    const asked = [];
    let chatBody = null;
    const p = await ctxPage(b, {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:WAKE}}, {clock:MON, route:newsRoute(asked, async (u, r) => {
      if(u.includes('/ai/models')){ await r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'model-haiku-x'}, {id:'model-sonnet-x'}]})}); return true; }
      if(u.includes('/ai/chat')){ chatBody = JSON.parse(hexDecode(u.split('b=')[1])); await r.fulfill({status:200, headers:CORS, body:JSON.stringify({content:[{type:'text', text:'Two things today, Andre. Start with the reel.'}]})}); return true; }
      if(u.includes('/ai/status') || u.includes('/tts/status')){ await r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":false}'}); return true; }
    })});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(500);
    await E("briefRevealAll()"); await p.waitForTimeout(800);
    check('a mic with the Operator (no type-in box on the page)', await p.isVisible('.brief4 .op-talk') && await p.$('.brief4 .op-type')===null);
    await E("aiTypeFocus()"); await p.waitForTimeout(300);
    check('…its bubble floats over the page (bottom centre), with a reply box', await p.isVisible('#opBub.is-in #opBubInput'));
    await p.fill('#opBubInput', 'What should I start with?'); await p.press('#opBubInput', 'Enter'); await p.waitForTimeout(1200);
    check('it answers in the bubble — the page doesn’t move', /Start with the reel/.test(await p.textContent('#opBubText')));
    check('the newest Sonnet is used (picked from the API, not hard-coded)', chatBody && chatBody.model==='model-sonnet-x', chatBody && chatBody.model);
    check('it knows your day (plan, level) and speaks in short spoken sentences', chatBody && /Edit JJS reel/.test(chatBody.system) && /level 0/.test(chatBody.system) && /spoken out loud/.test(chatBody.system) && chatBody.messages.slice(-1)[0].content==='What should I start with?');
    await p.fill('#opBubInput', 'And after that?'); await p.press('#opBubInput', 'Enter'); await p.waitForTimeout(900);
    check('…and remembers the conversation', chatBody && chatBody.messages.length===3 && chatBody.messages[1].role==='assistant');
    // the keys
    await E("endBriefing(); ui.view='settings'; ui.settingsTab='focus'; renderView(); openWakeSetup && openWakeSetup()"); await p.waitForTimeout(300);
    await E("wakeCfg().voice = true; renderView()"); await p.waitForTimeout(400);
    const hasFields = await p.$('#aiKey')!==null && await p.$('#opElevenKey')!==null;
    check('Settings: an ElevenLabs key and an Anthropic key, each saved by the launcher', hasFields);
    if(hasFields){
      await p.fill('#aiKey', 'sk-ant-SECRET-1'); await p.click('[data-action="aiKeySave"]');
      await p.fill('#opElevenKey', 'el-SECRET-2'); await p.click('[data-action="opElevenSave"]'); await p.waitForTimeout(600);
      check('…sent to the launcher only', asked.some(u => u.startsWith('/ai/key?t=') && hexDecode(u.split('t=')[1])==='sk-ant-SECRET-1') && asked.some(u => u.startsWith('/tts/key?t=') && hexDecode(u.split('t=')[1])==='el-SECRET-2'));
      const leaked = await p.evaluate(() => { let s = ''; for(let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); s += localStorage.getItem(k); } return /SECRET/.test(s) || /SECRET/.test(JSON.stringify(window.__op.state)); });
      check('…and never in Operator’s data (state, storage, exports)', !leaked && !(await E("/SECRET/.test(JSON.stringify(state))")));
    }
    check('no page errors (talk)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- XP: level 0, the card, ratings, ranks that need the body, SYSTEM windows ----
  {
    const sessions = [], done = [];
    for(let i=1;i<=10;i++){ const d = new Date(2026,9,12-i), ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'), st = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9).getTime(); sessions.push({id:'s'+i, date:ds, startedAt:st, endedAt:st+240*60000, minutes:240, type:'deep', completedTasks:[], breaks:[]}); done.push({id:'d'+i, title:'D'+i, status:'done', completedAt:ds, clients:['personal'], priority:'high'}); }
    const p = await newPage(b, OUT+'/r17.html', {profile:{name:'Andre', heightIn:70}, tasks:{items:done.concat([{id:'t9', title:'Write hooks', status:'today', priority:'high', clients:['personal']}])}, focus:{sessions},
      health:{gymLog:[{id:'g', date:'2026-10-12'}], weightLog:[{id:'w', date:'2026-10-11', weight:205}]},
      business:{clients:[{id:'c1', name:'JJS', stage:'active', status:'active', mrr:3000}], pipeline:[]}}, new Date(2026,9,12,15,0).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(600);
    const x = JSON.parse(await E("JSON.stringify((function(){ const s = xpSummaryFresh(); return {total:s.total, level:s.level, rank:s.rank, mrrXp:s.mrrXp, start:s.start, ovr:s.ovr, items:s.today.map(i=>i.k), hlt:s.attrs.HLT.v, todaySum:s.todayXp}; })())"));
    check('everyone starts at 0 — history before the first day doesn’t count, only what you do from here', x.start==='2026-10-12' && x.total===x.todaySum && x.rank===0, x);
    check('rank 0 is "Locked In"', await E("RANKS[0].name")==='Locked In');
    check('levels are slow: level 1 is 1,000 XP (a good week), level 10 is 16,750', await E("xpForLevel(1)")===1000 && await E("xpForLevel(10)")===16750 && await E("xpLevelOf(999)")===0 && await E("xpLevelOf(1000)")===1);
    check('training counts big (first workouts +150)', x.items.includes('workout'), x);
    await E("state.business.clients[0].mrr = 5000; xpLast = null");
    check('MRR you add is XP (800 per $1k above where you started)', JSON.parse(await E("xpSummaryFresh().mrrXp"))===1600);
    await E("state.business.clients[0].mrr = 2000; xpLast = null");
    check('MRR you lose takes it back', JSON.parse(await E("xpSummaryFresh().mrrXp"))===-800);
    const body = JSON.parse(await E("JSON.stringify(bodyStats())"));
    check('the body: BMI from your height and weight, with the healthy and obese lines for your height', Math.abs(body.bmi-29.4)<0.1 && body.healthyMax===174 && body.obeseAt===209 && body.cls==='Overweight', body);
    check('…and it scales: 150 lb at 5′10″ is healthy, 260 lb is obese', await E("(function(){ state.health.weightLog.push({id:'w2', date:'2026-10-12', weight:150}); const a = bodyStats().cls; state.health.weightLog.push({id:'w3', date:'2026-10-12', weight:260}); state.health.weightLog = state.health.weightLog.filter(w=>w.id!=='w2'); const c = bodyStats().cls; state.health.weightLog = state.health.weightLog.filter(w=>w.id!=='w3'); return a==='Healthy' && /Obese/.test(c); })()"));
    const gate = JSON.parse(await E("(function(){ state.profile.xpStart='2025-10-01'; state.business.clients[0].mrr = 9000; state.profile.xpMrrBase = 0; xpLast = null; const s = xpSummaryFresh(); return JSON.stringify({level:s.level, rank:s.rank, hlt:s.attrs.HLT.v, needs:s.needs}); })()"));
    check('ranks need the body too: the level and the MRR aren’t enough with Health under the bar', gate.level>=5 && gate.hlt<40 ? (gate.rank===0 && gate.needs.some(n => /Health/.test(n))) : true, gate);
    check('100 overall is the very best of everything — nobody gets there by accident', x.ovr < 60);
    await E("state.profile.xpStart='2026-10-12'; state.profile.xpMrrBase=3000; state.business.clients[0].mrr=3000; xpLast=null; renderView()"); await p.waitForTimeout(400);
    check('Today: a minimal card by LOCK IN — the front is just your level and rank', await p.isVisible('.today-hero .pcf .pcf-front') && (await p.textContent('.today-hero .pcf-lvl')).trim()===String(await E("xpSummary().level")) && /Locked In/.test(await p.textContent('.today-hero .pcf-front')));
    check('…no daily quests anywhere', await p.$('.sys-quest')===null);
    await p.click('.today-hero .pcf-front'); await p.waitForTimeout(800);
    check('click: it turns over — overall and the four ratings on the back', await p.$('.today-hero .pcf.is-flipped')!==null && (await p.$$('.today-hero .pcf-back .pc-attrs > span')).length===4 && /OVR/.test(await p.textContent('.today-hero .pcf-back')));
    await p.click('.today-hero .pcf-open'); await p.waitForTimeout(400);
    check('"Your card →" opens Personal → You (the full 2K card)', await E("ui.view==='personal' && ui.personalTab==='you'") && await p.isVisible('.you .pc-big') && (await p.$$('.you-attr')).length===4 && (await p.$$('.you .you-tr')).length===9);
    check('You shows your body on a scale for your height (174 healthy line, 209 obese line, you at 205)', /174/.test(await p.textContent('.you-body .bmi-lab')) && /209/.test(await p.textContent('.you-body .bmi-lab')) && /205/.test(await p.textContent('.you-body .bmi-you')));
    check('…and stays simple (no daily quest, no wall of XP lines)', await p.$('.you .sys-quest, .you .you-today')===null);
    // SYSTEM windows
    await E("ui.view='today'; renderView()"); await p.waitForTimeout(300);
    await E("ui.currentTaskId='t9'; startFocus(); renderView()"); await p.waitForTimeout(400);
    await E("state.focus.activeSession.startedAt = Date.now() - 90*60000; reallyConfirmStopFocus(); renderView()"); await p.clock.runFor(2600); await p.waitForTimeout(800);
    check('locking out: a SYSTEM window — session complete, the XP counting up, the bar filling', await p.isVisible('#sysWin .sys-card') && /SYSTEM/.test(await p.textContent('#sysWin')) && /Session complete/.test(await p.textContent('#sysWin')));
    await E("ACTIONS.sysClose()"); await p.waitForTimeout(400);
    await E("state.profile.xpSeen.level = -1; state.profile.xpSeen.total = 0; completeTask && 0");
    await E("(function(){ const t = state.tasks.items.find(x => x.id==='t9'); t.status='done'; t.completedAt=todayStr(); state.health.gymLog.push({id:'g2', date:todayStr()}); persist('tasks'); renderView(); })()"); await p.clock.runFor(600); await p.waitForTimeout(800);
    check('a level up gets the fanfare: LEVEL UP', await p.isVisible('#sysWin .sys-lvl') && /LEVEL UP/.test(await p.textContent('#sysWin')));
    await E("ACTIONS.sysClose()");
    check('Settings has your height (for the body rating)', await E("ui.view='settings'; ui.settingsTab='you'; renderView(); !!document.getElementById('setHeightFt') || (ui.settingsTab='focus', renderView(), !!document.getElementById('setHeightFt'))"));
    check('no page errors (XP)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

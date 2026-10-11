// Round 21: Op — the AI with a personality you can replace (paste or upload), memory, things it can do
// in the app, Fast/Smart brains, a mic that waits for you to finish, its own words for the briefs, and
// quiet reads on your numbers (Analytics, your card, Social, check-in / check-out); levels like a
// ranked game (ungated, to 100), ranks need level + MRR + Health; goals you can rename, delete and start
// over; carousels like the leads board (Clients is a grid); Health without log buttons; For a Good Day
// without "…" (and slower); hidden news words; hover labels on icon buttons; a journal pop-out you can
// move and size; the app: the mic allowed once, native on Apple silicon.
const { instrument, launch, check, report, OUT } = require('./common.js');
const path = require('path'), fs = require('fs');
const CORS = {'Access-Control-Allow-Origin':'*'};
const okJ = {status:200, body:'{"ok":true}', headers:CORS};
const hex = s => Buffer.from(s, 'hex').toString('utf8');
// a pretend Claude behind the launcher: tools get used when asked, reads and rewrites get text
function aiRoute(log, opts){
  opts = opts || {};
  return r => { const u = r.request().url();
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":true}'});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-sonnet-5-5'}, {id:'claude-haiku-5-5'}, {id:'claude-haiku-4-5'}]})});
    if(u.includes('/ai/chat')){
      const body = JSON.parse(hex(u.split('b=')[1])); log.push(body);
      const last = body.messages[body.messages.length-1], text = typeof last.content==='string' ? last.content : '';
      const reply = t => r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'end_turn', content:[{type:'text', text:t}]})});
      if(Array.isArray(last.content) && last.content.some(c => c.type==='tool_result')) return reply('Done, sir. It’s on today’s list, and I’ve made a note of the gym thing.');
      if(body.tools && /add a task/i.test(text)) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'tool_use', content:[{type:'text', text:'On it.'},
        {type:'tool_use', id:'t1', name:'add_task', input:{title:'Call the accountant', list:'today'}}, {type:'tool_use', id:'t2', name:'remember', input:{fact:'Trains at 6am before work.'}}]})});
      if(/narration lines/.test(text)){ const keys = (text.split('\n\n').pop()||'').split('\n').map(l => l.split(':')[0]).filter(Boolean); return reply(keys.map(k => k+': OP-LINE '+k+'.').join('\n')); }
      if(/Numbers:/.test(text) && /Pattern:/.test(text)) return reply('Pattern: READ '+log.length+' Tuesday carried the week.\nWatch: Thursday slipped to zero.\nMove: Block 9 to 12 tomorrow.');
      if(/Numbers:/.test(text)) return reply('READ '+(log.filter(b => !b.tools).length)+': Tuesday carried the week; protect your mornings.');
      if(/rundown|Brief me/.test(text)) return reply('OP-RUNDOWN: the Giants won and that is what matters.');
      return reply(opts.chatReply || 'Of course, sir.');
    }
    if(u.includes('/ping')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"helper":13}'});
    return r.fulfill(okJ);
  };
}
async function ctxPage(b, seed, opts){
  opts = opts || {};
  const ctx = await b.newContext({viewport: opts.viewport || {width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  if(opts.clock) await p.clock.install({time:opts.clock});
  if(opts.init) await p.addInitScript(opts.init);
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  await p.route('http://127.0.0.1:8935/**', opts.route || (r => r.fulfill(okJ)));
  await p.route(/^https:\/\//, r => r.fulfill({status:500, body:''}));
  await p.goto('file://'+path.resolve(OUT+'/r21.html')); await p.waitForTimeout(500);
  return p;
}
(async () => {
  instrument(process.argv[2], OUT+'/r21.html');
  const b = await launch();
  const WED = new Date(2026,9,14,10,0,5).getTime();
  const WAKE = {enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', intro:'quick', introChosen:true, voice:false};

  // ---- Op: personality, memory, acting in the app, the brain ----
  {
    const log = [];
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:WAKE}}, {clock:WED, route:aiRoute(log)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='settings'; ui.settingsTab='operator'; renderView()"); await p.waitForTimeout(600);
    check('Settings → Op: personality (the default brief), brain, memory', await p.isVisible('#opPersona') && /You are Op/.test(await p.inputValue('#opPersona')) && /Haiku 5.5/.test(await p.textContent('#opAiCard')) && /What Op remembers/.test(await p.textContent('#opAiCard')));
    const f = path.join(OUT, 'persona.md'); fs.writeFileSync(f, '# Op\nYou are Op. Be brief and dry. Call me boss.');
    await p.setInputFiles('#opPersonaFile', f); await p.waitForTimeout(400);
    check('upload a .md and it becomes Op’s personality', /Call me boss/.test(await E("state.settings.opPersona")) && /Call me boss/.test(await p.inputValue('#opPersona')));
    await E("aiAsk('Add a task to call the accountant today. And I train at 6am.', 'opBubText')"); await p.waitForTimeout(1200);
    const first = log.find(x => x.tools);
    check('it asks Claude Haiku 5.5 — thinking off, low effort — with the tools', first && first.model==='claude-haiku-5-5' && first.thinking.type==='disabled' && first.output_config.effort==='low' && first.tools.some(t => t.name==='add_task') && first.tools.some(t => t.name==='remember'), first && first.model);
    check('…the personality you uploaded leads the system prompt, then how it talks in the app', first && /Call me boss/.test(first.system[0].text) && /spoken aloud/.test(first.system[0].text) && /don’t bring up his hours/.test(first.system[0].text));
    check('it did it: the task is on today’s list', await E("state.tasks.items.some(t => t.title==='Call the accountant' && t.status==='today')"));
    check('…and it remembered something about you', await E("state.profile.opMemory.some(m => /6am/.test(m.text))"));
    check('…then said so in its own words', /Done, sir/.test(await p.textContent('#opBubText')));
    await E("aiAsk('What should I do first?', 'opBubText')"); await p.waitForTimeout(800);
    const second = log[log.length-1];
    check('what it remembers goes into the next conversation', /Trains at 6am/.test(second.system[1].text));
    check('…and it carries the conversation (not the tool steps)', second.messages.length===3 && typeof second.messages[1].content==='string');
    await E("ui.view='settings'; ui.settingsTab='operator'; renderView()"); await p.waitForTimeout(300);
    check('memories are listed and can be deleted', (await p.$$('#opAiCard .op-mem-i')).length===1);
    await p.click('#opAiCard .op-mem-x'); await p.waitForTimeout(200);
    check('…gone', await E("state.profile.opMemory.length")===0);
    await p.click('[data-action="opBrainSet"][data-id="smart"]'); await p.waitForTimeout(200);
    await E("aiAsk('Plan my week?', 'opBubText')"); await p.waitForTimeout(800);
    const smart = log[log.length-1];
    check('Smart brain: Claude Sonnet 5.5 (thinking only between tools, low effort)', smart.model==='claude-sonnet-5-5' && smart.thinking.type==='between_tools' && smart.output_config.effort==='low');
    check('the business brief never talks about yesterday’s hours', !/yesterday|hit your number|came up short/i.test(await E("opBusinessScript()")));
    check('no page errors (Op)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the mic: it waits while you pause, sends after ~2 s of quiet ----
  {
    const log = [];
    const init = () => {
      window.__rec = null;
      window.SpeechRecognition = window.webkitSpeechRecognition = function(){ const me = this; window.__rec = me; me.start = function(){ me.started = (me.started||0) + 1; setTimeout(function(){ me.onstart && me.onstart(); }, 10); }; me.stop = function(){ me.stopped = true; setTimeout(function(){ me.onend && me.onend(); }, 10); }; };
      window.__say = function(t, fin){ const r = window.__rec; const res = [[{transcript:t}]]; res[0].isFinal = !!fin; r.onresult({resultIndex:0, results:res}); };
    };
    const p = await ctxPage(b, {profile:{name:'Andre'}, focus:{wake:WAKE}}, {clock:WED, route:aiRoute(log), init});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(300);
    await E("ACTIONS.opTalk()"); await p.waitForTimeout(200);
    check('the mic listens continuously (a pause doesn’t end it)', await p.evaluate(() => window.__rec && window.__rec.continuous===true && window.__rec.interimResults===true));
    await p.evaluate(() => window.__say('so the thing is', true)); await p.clock.runFor(1500);
    check('…a 1.5 s pause: still listening', await p.evaluate(() => !window.__rec.stopped) && log.length===0);
    await p.evaluate(() => { const r = window.__rec; const res = [[{transcript:'so the thing is'}], [{transcript:' what do I do first'}]]; res[0].isFinal = true; res[1].isFinal = true; r.onresult({resultIndex:1, results:res}); });
    await p.clock.runFor(2300); await p.waitForTimeout(600);
    check('…about two seconds of quiet and it sends all of it', log.length===1 && /so the thing is\s+what do I do first/.test(log[0].messages.slice(-1)[0].content), log[0] && log[0].messages.slice(-1)[0].content);
    check('no page errors (mic)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Op's reads, and its words for Good morning ----
  {
    const log = [];
    const sessions = []; for(let i=1;i<10;i++) sessions.push({id:'s'+i, date:'2026-10-'+String(14-i).padStart(2,'0'), minutes:100+i*10, mode:'deep', startedAt:new Date(2026,9,14-i,9).getTime()});
    const wk = '2026-10-05';
    const p = await ctxPage(b, {profile:{name:'Andre', xpStart:'2026-10-01'}, focus:{wake:WAKE, sessions}, goals:{items:[{id:'w1', tier:'week', pk:wk, label:'Ship it', done:true}]}, journal:{entries:[], intentions:{weeks:{[wk]:{at:1}}, months:{}, prompted:{}, goalsMoved:1}}}, {clock:WED, route:aiRoute(log)});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='analytics'; ui.analyticsRange='week'; renderView()"); await p.waitForTimeout(1500);
    check('Focus → Analytics: a quiet read from Op at the top', await p.isVisible('.opi[data-opi="analytics:week"]') && /READ/.test(await p.textContent('.opi[data-opi="analytics:week"]')));
    const n1 = log.length; await E("renderView()"); await p.waitForTimeout(800); await E("renderView()"); await p.waitForTimeout(800);
    check('…made once (re-rendering doesn’t ask again)', log.length===n1);
    const readAsk = log.find(x => !x.tools && /Numbers:/.test(x.messages[0].content));
    check('…from your real numbers, with an angle to take', readAsk && /Work per day/.test(readAsk.messages[0].content) && /Angle for this one/.test(readAsk.messages[0].content));
    check('…a real analysis: Pattern · Watch · Move', (await p.$$('.opi[data-opi="analytics:week"] .opi-row')).length===3 && /Block 9 to 12/.test(await p.textContent('.opi[data-opi="analytics:week"] .opi-row.is-move')));
    await p.click('.opi[data-opi="analytics:week"] .opi-r'); await p.waitForTimeout(900);
    check('↻ gets another take (told what it said last time)', log.length===n1+1 && /Your last take was/.test(log[log.length-1].messages[0].content), [n1, log.length, log.slice(n1).map(x => x.messages[0].content.slice(0, 60))]);
    await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(1300);
    check('your card gets a read too', await p.isVisible('.opi[data-opi="card"]'));
    await E("openCheckoutForm('week', '"+wk+"')"); await p.waitForTimeout(300); await p.click('[data-action="saveCheckout"]'); await p.waitForTimeout(4200);
    check('checking out of a week: Op’s read on how it went (in the bubble)', log.some(x => !x.tools && /checked out of the week/.test(x.messages[0].content)) && /READ/.test(await p.textContent('#opBubText')));
    await E("ACTIONS.sysClose(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(1500);
    await E("renderWakeOverlayInto()"); await p.waitForTimeout(300);
    check('Good morning: Op rewrites the narration in its own words (same facts)', log.some(x => /narration lines/.test(x.messages[0].content)) && await E("ui.briefLines.some(l => /OP-LINE/.test(l.text))"));
    check('no page errors (reads)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- levels like a ranked game; goals you can fix ----
  {
    const p = await ctxPage(b, {profile:{name:'Andre', xpStart:'2026-10-01', xpLevel:4}, business:{clients:[]}, goals:{items:[{id:'g1', tier:'week', pk:'2026-10-12', label:'Test goal'}, {id:'g2', tier:'week', pk:'2026-10-12', label:'Another'}]}, journal:{entries:[], intentions:{weeks:{'2026-10-12':{at:1}}, months:{}, prompted:{}, goalsMoved:1}}}, {clock:WED});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('levels: 1,500 XP for the first, each one after costs more; 100 is the top (round 22)', await E("xpForLevel(1)")===1500 && await E("xpForLevel(2)")===4100 && await E("xpLevelOf(1e9)")===100);
    await E("state.profile.xpMrrBase = 0; xpLast = null");
    await E("state.profile.xpMasterHit = {streak:[30]}; xpLast = null");   // (a master goal's 4,000 XP: plenty for level 5)
    const x = JSON.parse(await E("JSON.stringify((function(){ const s = xpSummaryFresh(); return {level:s.level, canLevel:s.canLevel, blocked:s.blocked, rank:s.rank, mrr:s.mrr, needs:s.needs}; })())"));
    check('no MRR, still free to level past a rank’s level (nothing gates levels)', x.canLevel===true && x.blocked.length===0 && x.mrr===0, x);
    check('…but rank needs the MRR (and Health)', x.rank===0 && x.needs.some(n => /MRR/.test(n)), x);
    await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(1700); await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'))");
    await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300);
    await p.hover('.tab-panel .tg-card.is-week .tg-row >> nth=0');
    p.once('dialog', d => d.accept('Renamed goal'));
    await p.click('.tab-panel .tg-card.is-week .tg-row >> nth=0 >> [data-action="tierGoalRename"]'); await p.waitForTimeout(200);
    check('a weekly goal can be renamed', await E("state.goals.items.find(g => g.id==='g1').label")==='Renamed goal');
    await p.hover('.tab-panel .tg-card.is-week .tg-row >> nth=1');
    await p.click('.tab-panel .tg-card.is-week .tg-row >> nth=1 >> [data-action="tierGoalDelete"]'); await p.waitForTimeout(150);
    check('…delete asks once more', await E("state.goals.items.length")===2 && /Delete\?/.test(await p.textContent('.tab-panel .tg-card.is-week')));
    await p.click('.tab-panel .tg-card.is-week [data-action="tierGoalDelete"].is-armed'); await p.waitForTimeout(150);
    check('…and deletes', await E("state.goals.items.length")===1);
    await E("openIntentForm('week')"); await p.waitForTimeout(300);
    await p.click('[data-action="intentReset"]'); await p.click('[data-action="intentReset"]'); await p.waitForTimeout(300);
    check('the week can be started over (goals and check-in gone)', await E("tierGoals('week', weekKey()).length")===0 && !(await E("checkedIn('week', weekKey())")));
    await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='calendar'; renderView()"); await p.waitForTimeout(400);
    await p.click('#musicDock .md-lvl'); await p.waitForTimeout(300);
    check('the level pop-out has no "Next rank" line', !/Next rank/.test(await p.textContent('#lvlPop')));
    check('no page errors (levels)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the look: carousels, Clients, Health, Good morning, news, hover labels, the journal ----
  {
    const tasks = Array.from({length:8}, (_, i) => ({id:'t'+i, title:'Task '+i, status: i<2 ? 'today' : 'backlog', priority:'med', clients:[], createdAt:'2026-10-10'}));
    const clients = Array.from({length:6}, (_, i) => ({id:'c'+i, name:'Client '+i, stage:'active', status:'active', mrr:1000}));
    const route = r => { const u = r.request().url();
      if(u.includes('/news')) return r.fulfill({status:200, headers:CORS, body:'<rss><channel>'+['Wyoming lawmakers meet - Wyoming Public Media', 'Big story one - Wire', 'Big story two - Wire'].map((t, i) => '<item><title>'+t+'</title><link>https://x.com/'+i+'</link></item>').join('')+'</channel></rss>'});
      return r.fulfill(okJ); };
    const p = await ctxPage(b, {profile:{name:'Andre', cardLayout:'carousel'}, tasks:{items:tasks}, business:{clients}, health:{gymLog:[], weightLog:[{id:'w', date:'2026-10-13', weight:205}], calorieEntries:[]}, focus:{wake:WAKE}}, {clock:WED, route});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; ui.focusTab='tasks'; renderView()"); await p.waitForTimeout(600);
    const fit = await p.evaluate(() => { const t = document.querySelector('.carousel.is-sized .car-track'); if(!t) return null; const tr = t.getBoundingClientRect(); return [...t.children].filter(c => { const r = c.getBoundingClientRect(); return r.right > tr.left + 2 && r.left < tr.right - 2; }).every(c => { const r = c.getBoundingClientRect(); return r.left >= tr.left - 1 && r.right <= tr.right + 1; }); });
    check('carousels: whole cards only (none cut at an edge), like the leads board', fit===true, fit);
    check('…task rows don’t loop (they’re in order)', await p.$('.carousel.is-loop [data-car="soon"]')===null && await p.$('[data-car="soon"][data-loop]')===null);
    await E("ui.view='business'; ui.businessTab='clients'; renderView()"); await p.waitForTimeout(300);
    check('Business → Clients is a grid of panels you scroll (even in carousel mode)', await p.$('.tab-panel .cc2-grid')!==null && await p.$('.tab-panel .carousel')===null);
    await E("ui.view='personal'; ui.personalTab='fitness'; renderView()"); await p.waitForTimeout(300);
    check('Health: no log buttons on the page (the + does it)', await p.$('#viewRoot #weightValue')===null && await p.$('#viewRoot #calAmount')===null && await p.$('#viewRoot [data-action="addWeight"]')===null);
    check('…"No workout yet today"', /No workout yet today/.test(await p.textContent('.fit-today')));
    await p.hover('#fabAdd'); await p.waitForTimeout(500);
    await p.hover('.tab-panel');
    await E("ui.view='personal'; ui.personalTab='journal'; ui.journalMode='boards'; renderView()"); await p.waitForTimeout(500);
    const tool = await p.$('.board-tool');
    if(tool){ await tool.hover(); await p.waitForTimeout(500); }
    check('icon buttons say what they are on hover (right away, styled)', !tool || (await p.isVisible('#hovTip.is-in') && (await p.textContent('#hovTip')).length > 2));
    await p.mouse.move(5, 5); await E("ui.view='today'; renderView(); openQuickJournalModal()"); await p.waitForTimeout(400);
    check('journal pop-out: the tags wait behind one button', await p.$('#quickJournalContent .qj3-tags')===null && await p.isVisible('#quickJournalContent [data-action="qjTags"]'));
    await p.click('#quickJournalContent [data-action="qjTags"]'); await p.waitForTimeout(150);
    check('…tap it and they pop out', await p.isVisible('#quickJournalContent .qj3-tags.is-pop'));
    const h = await p.$('#quickJournalContent .qj3-h small'); const hb = await h.boundingBox();
    await p.mouse.move(hb.x+5, hb.y+3); await p.mouse.down(); await p.mouse.move(400, 200, {steps:5}); await p.mouse.up(); await p.waitForTimeout(200);
    const box = await E("state.profile.qjBox");
    check('…drag it by the top: it moves and remembers where', box && box.x < 500 && box.y < 300, box);
    check('…and its corner sizes it', await p.evaluate(() => getComputedStyle(document.getElementById('quickJournalContent')).resize)==='both');
    await E("closeQuickJournalModal(); fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(900); await E("briefRevealAll()"); await p.clock.runFor(2500); await p.waitForTimeout(800);
    check('news: Wyoming never shows (Hide news about)', !/Wyoming/.test(await p.textContent('.br-news')) && /Big story one/.test(await p.textContent('.br-news')));
    check('For a Good Day: whole sentences, no "…"', await p.evaluate(() => [...document.querySelectorAll('.gd-i span:not(.br-th-i)')].every(s => getComputedStyle(s).webkitLineClamp==='none' || getComputedStyle(s).webkitLineClamp==='')));
    // time two moves in a row: about ten seconds apart
    const moveAt = async () => { const g = await E("ui.gdIdx||0"); for(let t = 0; t < 12000; t += 250){ await p.clock.runFor(250); if(await E("ui.gdIdx||0")!==g) return t; } return null; };
    await moveAt(); const gap = await moveAt();
    check('For a Good Day holds each one about ten seconds', gap!=null && gap >= 9500 && gap <= 10500, gap);
    check('the blue dot’s glow isn’t clipped', await p.evaluate(() => getComputedStyle(document.querySelector('.brief4 .br-voice')).overflow==='visible'));
    check('no page errors (look)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- the app itself ----
  {
    const app = path.join(__dirname, '..', '..', 'packaged', 'Operator-2-7-2.app', 'Contents');
    const launcher = fs.readFileSync(path.join(app, 'MacOS', 'Operator'), 'utf8'), plist = fs.readFileSync(path.join(app, 'Info.plist'), 'utf8');
    check('the mic: Operator’s own window isn’t asked about the microphone every time', /--use-fake-ui-for-media-stream/.test(launcher));
    check('native on Apple silicon (no "Intel app" warning)', /LSRequiresNativeExecution<\/key>\s*<true\/>/.test(plist) && /<string>arm64<\/string>/.test(plist));
    check('always its own app (an old "open in Chrome" switch is cleared)', /rm -f "\$DATA_DIR\/engine.off"/.test(launcher));
  }

  await b.close();
  process.exit(report()?1:0);
})();

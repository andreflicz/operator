// Round 14: full-screen views fill any window; backgrounds (no light shafts, Motion setting, fades
// between times of day); five distinct focus tracks; Good morning (slower narration, Skip → app,
// sunrise background setting, sports/tech news, "You, lately", one music control); wake settings
// survive a reload; Apple Music playlist from a link; carousel rows reach the window edges.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const RSS = n => '<?xml version="1.0"?><rss><channel><title>Google News</title>'+[1,2,3,4].map(i=>`<item><title>${n} headline ${i} - Source ${i}</title><link>https://x.com/${n}${i}</link></item>`).join('')+'</channel></rss>';
const hexDecode = h => Buffer.from(h, 'hex').toString('utf8');
(async () => {
  instrument(process.argv[2], OUT+'/r14.html');
  const b = await launch();
  const tasks = Array.from({length:4}, (_, i) => ({id:'t'+i, title:'Task '+(i+1), status:'today', priority:'high', clients:['personal']}));

  // ---- full-screen views on a wide window ----
  {
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre'}, tasks:{items:tasks}, focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}}, new Date(2026,9,10,18,0).getTime()); // Saturday
    await p.setViewportSize({width:2200, height:1100});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const full = () => p.evaluate(() => { const n = document.querySelector('.np'); if(!n) return null; const r = n.getBoundingClientRect(); return Math.abs(r.left) < 2 && Math.abs(r.top) < 2 && Math.abs(r.width - innerWidth) < 4 && Math.abs(r.height - innerHeight) < 4 ? true : [r.left, r.top, r.width, r.height, innerWidth, innerHeight, document.body.className]; });
    await E("ACTIONS.clockOut()"); await p.waitForTimeout(1400);
    { const f = await full(); check('weekend clock-out fills the whole wide window', f===true, f); }
    await E("clockIn({quiet:true}); ui.planReveal=null; hideOverlay('planOverlay'); ui.currentTaskId='t0'; startFocus(); state.profile.lockedView='minimal'; renderView()"); await p.waitForTimeout(1400);
    { const f = await full(); check('the minimal locked view fills the whole wide window', f===true, f); }
    check('the next alarm says which day (Mon), not just a time', /Mon 7:00/.test(await p.textContent('.np-clock-r')));
    check('no page errors (full-screen views)', p.errors.length===0, p.errors);
    await p.context().close();
  }
  {
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre'}, focus:{wake:{enabled:true, time:'07:00', days:[1,2,3,4,5,6]}}}, new Date(2026,9,11,10,0).getTime()); // Sunday
    await p.setViewportSize({width:2200, height:1100}); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const n = document.querySelector('.np.rest'); const x = n.getBoundingClientRect(); return [x.left, Math.round(x.width), innerWidth]; });
    check('day off fills the whole wide window', r[0]===0 && r[1]===r[2], r);
    await p.context().close();
  }

  // ---- backgrounds ----
  {
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre', scene:'sky'}}, new Date(2026,9,12,7,40).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(800);
    check('no light shafts from the sun', await E("!!SC.x && !SC.x.rays"));
    check('Motion defaults to Calm (lighter on the computer)', await E("sceneMotion()")==='calm');
    await E("ui.view='settings'; ui.settingsTab='display'; renderView()"); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelectorAll('details.set-more').forEach(d => d.open = true));
    check('Settings has a Motion picker: Off / Calm / Smooth', (await p.$$('[data-action="setSceneMotion"]')).length===3);
    await p.click('[data-action="setSceneMotion"][data-id="off"]'); await p.waitForTimeout(200);
    check('Off: the scene stops moving', await E("sceneMotion()==='off' && !sceneAnimates() && !SC.running"));
    await E("sceneBuild(true)"); await p.waitForTimeout(100);
    check('changing time of day fades the old picture out', (await p.$$('canvas.scene-fade')).length===1);
    check('no page errors (backgrounds)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- focus music ----
  {
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const names = await E("FOCUS_TRACKS.map(t=>t.name+':'+t.style).join(',')");
    check('five focus tracks, keeping First Light and Still Water', /First Light/.test(names) && /Still Water/.test(names) && names.split(',').length===5, names);
    check('they don\'t all share one recipe (four different styles)', new Set(names.split(',').map(x => x.split(':')[1])).size===4, names);
    const peaks = await p.evaluate(async () => window.__op.ev(`(async function(){ const out = []; for(const tr of FOCUS_TRACKS){ const sr = 22000, oc = new OfflineAudioContext(1, sr*6, sr); FM.bus = null; sfxBus = null; FM.rnd = 7; const bus = fmBus(oc); bus.g.gain.value = 1; let t = 0.05, bar = 0; while(t < 6){ fmBar(oc, bus.g, t, tr, bar++); t += 60/tr.bpm*4; } const d = (await oc.startRendering()).getChannelData(0); let m = 0; for(let i=0;i<d.length;i++) m = Math.max(m, Math.abs(d[i])); out.push(m); } FM.bus = null; sfxBus = null; return out; })()`));
    check('every track actually makes sound, at a similar level', peaks.every(x => x > 0.02) && Math.max(...peaks)/Math.min(...peaks) < 4, peaks);
    check('no page errors (music)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Good morning ----
  {
    const T = new Date(2026,9,12,7,0,5).getTime();
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre', goalWeight:180}, health:{weightLog:[{date:'2026-09-01',weight:192},{date:'2026-10-11',weight:186}]},
      journal:{entries:[{id:'j1', date:'2026-09-12', timestamp:1, text:'Signed JJS today.', title:'First big client', type:'freeform'}]},
      focus:{wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsTopics:'AI', newsSports:'Knicks', newsTech:'Apple'}}}, T);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.route('http://127.0.0.1:8935/**', r => { const u = r.request().url(); if(u.includes('/news')){ const q = hexDecode((u.split('q=')[1]||'').split('&')[0]) || 'Top'; return r.fulfill({status:200, body:RSS(q), headers:{'Access-Control-Allow-Origin':'*'}}); } return r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}); });
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(400);
    check('sunrise background by default (not black)', await p.$('.brief.bg-sunrise')!==null);
    const lines = await E("JSON.stringify(ui.briefLines)"), L = JSON.parse(lines);
    const paced = L.every((l, i) => i===0 || l.at - L[i-1].at >= Math.max(1500, L[i-1].text.split(' ').length*190 + 650) - 1);
    check('narration is paced: every line is fully said and rests before the next', paced, L.map(l => l.at));
    await p.clock.runFor(L[0].at + 380 + 250); await p.waitForTimeout(50);
    const said = await p.textContent('#brVoice');
    check('…and types a word at a time, slowly (not the whole line at once)', said.length > 0 && said.length < L[0].text.length, said);
    await E("briefRevealAll()"); await p.waitForTimeout(1200);
    check('news: your headlines plus Sports and Tech sections', /AI headline 1/.test(await p.textContent('.br-news')) && /Sports/i.test(await p.textContent('.br-news')) && /Knicks headline/.test(await p.textContent('.br-news')) && /Apple headline/.test(await p.textContent('.br-news')));
    const you = await p.textContent('.br-you');
    check('"You, lately": streak, workouts, weight, and something you wrote a month ago', /day streak/.test(you) && /workouts this week/.test(you) && /186/.test(you) && /A month ago/i.test(you) && /First big client/.test(you));
    check('one music control in the corner', (await p.$$('.b4-music > *')).length===1);
    check('one corner button: Skip', await p.isVisible('.brief-skipall') && !(await p.$('.brief-x')));
    await p.click('.brief-skipall'); await p.clock.runFor(800); await p.waitForTimeout(500);
    check('Skip goes straight to the app\'s front page', !(await E("overlayOpen('wakeOverlay')")) && await E("ui.view")==='today' && !(await E("overlayOpen('planOverlay')")));
    await E("state.focus.wake.briefBg='dark'; persist('focus')");
    await p.reload(); await p.waitForTimeout(1400);
    check('wake settings survive a reload (topics, sections, background)', await E("[state.focus.wake.newsTopics, state.focus.wake.newsSports, state.focus.wake.newsTech, state.focus.wake.briefBg].join('|')")==='AI|Knicks|Apple|dark');
    await E("fireWake({})"); await p.click('[data-action="wakeStartDay"]'); await p.waitForTimeout(300);
    check('Dark background when you pick it', await p.$('.brief.bg-dark')!==null && !(await p.$('.brief.bg-sunrise')));
    check('no page errors (Good morning)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- Apple Music playlist from a link ----
  {
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre'}});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    const asked = [];
    await p.route('http://127.0.0.1:8935/**', r => { const u = r.request().url(); asked.push(u);
      if(u.includes('/music/resolve')) return r.fulfill({status:200, body:'{"ok":true,"name":"Morning Run"}', headers:{'Access-Control-Allow-Origin':'*'}});
      if(u.includes('/music/pick')) return r.fulfill({status:404, body:'{"ok":false,"error":"not in your library","opened":true}', headers:{'Access-Control-Allow-Origin':'*'}});
      return r.fulfill({status:200, body:'{"ok":true}', headers:{'Access-Control-Allow-Origin':'*'}}); });
    await E("setMorningPlaylistFrom('https://music.apple.com/us/playlist/morning-run/pl.u-abc123')"); await p.waitForTimeout(300);
    check('a pasted link becomes the playlist\'s real name (and the link is kept)', await E("JSON.stringify(state.profile.morningPlaylist)")==JSON.stringify({q:'Morning Run', k:'playlist', url:'https://music.apple.com/us/playlist/morning-run/pl.u-abc123'}));
    await E("ACTIONS.playMorningPlaylist()"); await p.waitForTimeout(600);
    const pick = asked.find(u => u.includes('/music/pick'));
    check('playing asks for the playlist by name, with the link as a backup', !!pick && /k=playlist/.test(pick) && hexDecode(pick.split('q=')[1].split('&')[0])==='Morning Run' && /u=/.test(pick));
    check('not in your library → an honest note (it opened in Apple Music; add it once)', /isn’t in your library yet/.test(await p.textContent('body')));
    check('no page errors (playlist)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  // ---- carousels reach the window edges ----
  {
    const items = Array.from({length:24}, (_, i) => ({id:'c'+i, title:'Card '+(i+1), status:i<9?'today':'backlog', priority:'high', clients:['personal']}));
    const p = await newPage(b, OUT+'/r14.html', {profile:{name:'Andre', lineupView:'cards', cardLayout:'carousel'}, tasks:{items}});
    await p.setViewportSize({width:2000, height:1000});
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await E("ui.view='focus'; renderView()"); await p.waitForTimeout(700);
    const g = await p.evaluate(() => { const c = document.querySelector('.carousel.bleed'), v = document.getElementById('viewRoot'), m = v.parentElement; const a = c.getBoundingClientRect(), r = v.getBoundingClientRect(), mm = m.getBoundingClientRect(); return {cl:a.left, cr:a.right, vl:r.left, vr:r.right, ml:mm.left, mr:mm.right - (m.offsetWidth - m.clientWidth)}; });
    check('carousel rows run past the 1400px column to the window edges', g.cl <= g.ml + 1 && g.cr >= g.mr - 1 && g.vl - g.cl > 100, g);
    check('no page errors (carousels)', p.errors.length===0, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

// Round 44b: Social as a control panel (week strip, up next, numbers, chart, what's working, swap accounts).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r44b.html');
  const b = await launch();
  const T = new Date(2026,9,25,11,0).getTime();
  const mk = (i, d, type, views, hook, hour) => ({id:'p'+i, cap:['Shop before/after','3 mistakes owners make','Behind the scenes','Talking head: pricing','Day in the life','Client spotlight','Before/after #2','Q&A'][i%8], type, date:d, at:d+'T'+String(hour).padStart(2,'0')+':10:00', views, reach:Math.round(views*.8), likes:Math.round(views/20), comments:4, saves:Math.round(views/150), shares:3, hook});
  const posts = [mk(0,'2026-10-19','REELS',5100,52,18), mk(1,'2026-10-21','CAROUSEL_ALBUM',4200,null,12), mk(2,'2026-10-15','REELS',3600,40,9), mk(3,'2026-10-13','REELS',1900,28,20), mk(4,'2026-10-10','REELS',4800,48,18), mk(5,'2026-10-07','IMAGE',2600,null,13), mk(6,'2026-10-04','REELS',6200,55,17), mk(7,'2026-09-30','REELS',3900,44,18), mk(8,'2026-09-20','REELS',3000,38,18), mk(9,'2026-09-12','REELS',2500,35,9)];
  const p = await newPage(b, OUT+'/r44b.html', {profile:{name:'Andre', xpBook:43, xpLevel:0}, standards:{contentTargets:{business:{n:4, per:'week'}}},
    tasks:{items:[{id:'v1', title:'Day in the life', status:'today', priority:'med', clients:['jj'], contentRole:'business', isVideoIdea:true, deadline:'2026-10-25', notes:'Nobody tells you running a content agency means this…', createdAt:'2026-10-20'}]},
    settings:{instagram:{accounts:[{id:'b1', username:'yourbiz', role:'business'}, {id:'p1', username:'andre', role:'personal'}], cache:{at:Date.now(), data:{b1:{username:'yourbiz', followers:4210, posts:posts, fh:{gained:96, lost:10, series:[['a',4100],['b',4130],['c',4170],['d',4210]]}}, p1:{username:'andre', followers:900, posts:[]}}}}}}, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='convos'; ui.socTab='overview'; inboxState().mode='social'; renderView()"); await p.waitForTimeout(400);
  check('the week as 7 days with what was posted', (await p.$$('.sx2-d')).length===7 && (await p.$$('.sx2-d.is-p')).length===2 && /2\s*\/ 4 posted/.test(await p.textContent('.sx2-week')));
  check('up next: the next video with Mark posted', /Day in the life/.test(await p.textContent('.sx2-next')) && !!(await p.$('[data-action="sxPosted"]')));
  check('four numbers with their trend', (await p.$$('.sx2-kpi')).length===4 && /4,210/.test(await p.textContent('.sx2-kpis')) && /\+86/.test(await p.textContent('.sx2-kpis')));
  check('views of the last posts against the average', (await p.$$('.sx2-b')).length===8 && !!(await p.$('.sx2-avg')));
  check('what’s working: best format, best time, weakest hook', (await p.$$('.sx2-w')).length===3);
  await p.screenshot({path:OUT+'/r44-social.png', fullPage:true});
  await E("ACTIONS.sxSwapRoles()"); await p.waitForTimeout(150);
  check('swap business ↔ personal without reconnecting', await E("igCfg().accounts.find(a => a.id==='b1').role")==='personal' && await E("igCfg().accounts.find(a => a.id==='p1').role")==='business');
  await E("ACTIONS.sxSwapRoles(); ACTIONS.sxPosted(null, null, 'v1')"); await p.waitForTimeout(150);
  check('Mark posted finishes the video', await E("state.tasks.items.find(t => t.id==='v1').status")==='done');
  check('no page errors (round 44b)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();

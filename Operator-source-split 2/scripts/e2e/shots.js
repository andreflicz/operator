// Screenshots of the main screens with a realistic seed — for eyeballing a round's visual changes.
// node scripts/e2e/shots.js dist/command-center-2.html <outdir> [which,...]
const { instrument, launch, OUT } = require('./common.js');
const path = require('path');
const CORS = {'Access-Control-Allow-Origin':'*'};
function ds(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
(async () => {
  const outDir = process.argv[3] || OUT; const only = (process.argv[4]||'').split(',').filter(Boolean);
  instrument(process.argv[2], OUT+'/shots.html');
  const b = await launch();
  const NOW = new Date(2026,9,11,8,10,5);
  const day = n => ds(new Date(NOW.getTime() - n*86400000));
  const sessions = [], gym = [], weights = [], cal = [];
  for(let i=1;i<40;i++){ if(i%7===6) continue; sessions.push({id:'s'+i, date:day(i), minutes:120+((i*37)%180), mode:'deep', startedAt:NOW.getTime()-i*86400000}); if(i%2===0) gym.push({id:'g'+i, date:day(i), type:['Lift','Run','Lift','Boxing'][i%4], duration:60}); if(i%3===0) weights.push({id:'w'+i, date:day(i), weight:212 - (40-i)*0.15}); }
  cal.push({id:'c1', date:day(0), name:'Eggs & toast', calories:520}, {id:'c2', date:day(0), name:'Chicken bowl', calories:780});
  const seed = {profile:{name:'Andre', heightIn:71, goalWeight:190, revenueGoalMonthly:20000, weeklyWorkoutTarget:4, calorieTarget:2300},
    health:{gymLog:gym, weightLog:weights, calorieEntries:cal},
    meals:{library:[{id:'m1', name:'Chicken bowl', calories:780}, {id:'m2', name:'Protein shake', calories:300}]},
    business:{clients:[{id:'a', name:'JJS', stage:'active', status:'active', mrr:3000, startDate:day(70)}, {id:'b', name:'Kiko', stage:'active', status:'active', mrr:2000, startDate:day(20)}]},
    focus:{sessions, wake:{enabled:true, time:'07:00', days:[0,1,2,3,4,5,6], news:true, newsSports:'Giants', intro:'quick', introChosen:true, voice:false}},
    calendar:{events:[{id:'e1', date:day(0), time:'13:00', title:'Call with JJS'}, {id:'e2', date:day(0), time:'16:00', title:'Shoot B-roll'}]},
    journal:{entries:[], intentions:{months:{'2026-10':{habit:'Phone in bed', goal:'Sign two new clients', note:'Be the guy', at:1}}, weeks:{[ds(new Date(2026,9,5))]:{win:'20h deep work, 4 workouts', focus:'Finish the JJS launch', at:1}}, prompted:{}}}
  };
  const ctx = await b.newContext({viewport:{width:1440, height:900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.clock.install({time:NOW.getTime()});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  const TEAM = {NYG:'New York Giants', DAL:'Dallas Cowboys', PHI:'Philadelphia Eagles'};
  const ev = (id, h, a, hs, as, st, date) => ({id, date, status:{type:{state:st, shortDetail: st==='post'?'Final':'Sun'}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner: st==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h], shortDisplayName:TEAM[h].split(' ').pop()}},{homeAway:'away', score:as, winner: st==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a], shortDisplayName:TEAM[a].split(' ').pop()}}]}]});
  await p.route('http://127.0.0.1:8935/**', r => { const u = r.request().url();
    if(u.includes('/sports')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({events: u.includes('l=nfl') ? [ev('1','NYG','DAL','24','17','post','2026-10-10T17:00Z'), ev('2','PHI','NYG','','','pre','2026-10-18T17:00Z')] : []})});
    if(u.includes('/news')) return r.fulfill({status:200, headers:CORS, body:'<rss><channel>'+[1,2,3,4,5].map(i=>'<item><title>Headline number '+i+' about something - Reuters</title><link>https://x.com/'+i+'</link></item>').join('')+'</channel></rss>'});
    return r.fulfill({status:200, headers:CORS, body:'{"ok":true}'}); });
  await p.goto('file://'+path.resolve(OUT+'/shots.html')); await p.waitForTimeout(600);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  const shot = async (name, fn) => { if(only.length && !only.includes(name)) return; await fn(); await p.waitForTimeout(500); await p.screenshot({path: path.join(outDir, name+'.png')}); };
  await shot('today', async () => { await E("ui.view='today'; renderView()"); });
  await shot('you', async () => { await E("ui.view='personal'; ui.personalTab='you'; renderView()"); });
  await shot('goals', async () => { await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); });
  await shot('health', async () => { await E("ui.view='personal'; ui.personalTab='fitness'; ui.healthTab='workouts'; renderView()"); });
  await shot('health-weight', async () => { await E("ui.view='personal'; ui.personalTab='fitness'; ui.healthTab='weight'; renderView()"); });
  await shot('calendar', async () => { await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(400); await E("ACTIONS.closeIntent && ACTIONS.closeIntent()"); });
  await shot('lvlpop', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300); await p.click('#musicDock .md-lvl'); });
  await E("ui.lvlPop && ACTIONS.lvlPop()");
  await shot('sheet', async () => { await E("ui.view='personal'; ui.personalTab='fitness'; renderView(); openHealthSheet('workout')"); });
  await E("closeHealthSheet()");
  await shot('checkin', async () => { await E("openIntentForm('month')"); await p.waitForTimeout(400); });
  await E("ACTIONS.closeIntent()");
  await shot('guide', async () => { await E("ui.view='personal'; ui.personalTab='you'; renderView(); ACTIONS.openXpHow()"); });
  await E("ACTIONS.closeXpHow()");
  await shot('morning', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='today'; renderView(); fireWake({})"); await p.click('[data-action=\"wakeStartDay\"]'); await p.waitForTimeout(900); await E("briefRevealAll()"); await p.clock.runFor(3000); await p.waitForTimeout(900); });
  console.log('errors:', p.errors);
  await b.close();
})();

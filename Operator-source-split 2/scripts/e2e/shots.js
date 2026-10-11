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
    business:{clients:[{id:'a', name:'JJS', stage:'active', status:'active', mrr:3000, startDate:day(70)}, {id:'b', name:'Kiko', stage:'active', status:'active', mrr:2000, startDate:day(20)}, {id:'c', name:'Nina Studio', stage:'active', status:'active', mrr:1500, startDate:day(40)}, {id:'d', name:'Peak Fitness', stage:'active', status:'active', mrr:2500, startDate:day(90)}, {id:'e', name:'Bloom Co', stage:'active', status:'active', mrr:1800, startDate:day(10)}],
      pipeline:[1,2,3,4,5,6,7].map(i => ({id:'l'+i, name:'Lead '+i, stage:['new','contacted','call','proposal'][i%4], createdAt:day(i)}))},
    tasks:{items:[1,2,3,4,5,6,7,8].map(i => ({id:'t'+i, title:'Task number '+i, status: i<4 ? 'today' : 'backlog', priority:'med', clients:[], createdAt:day(3)}))},
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
    if(u.includes('/ai/status')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true,"hasKey":true}'});
    if(u.includes('/ai/models')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({data:[{id:'claude-haiku-5-5'}]})});
    if(u.includes('/ai/chat')){ const body = JSON.parse(Buffer.from(u.split('b=')[1], 'hex').toString()); const t = body.messages[body.messages.length-1].content;
      const txt = /Pattern:/.test(t) ? 'Pattern: Your week is front-loaded — Tuesday and Wednesday did 60% of the work, then it tapered to under 2 hours a day.\nWatch: Afternoons are where it leaks; nothing after 2 PM has stuck since Thursday.\nMove: Book 9 to 12 tomorrow for the JJS launch before anything else gets the morning.'
        : /narration lines/.test(t) ? '' : 'Your card is carried by Health — Business at 56 is the anchor. Two new clients by month-end moves Scaling and MRR at once; that is the shortest way to Operator.';
      return r.fulfill({status:200, headers:CORS, body:JSON.stringify({stop_reason:'end_turn', content:[{type:'text', text:txt}]})}); }
    return r.fulfill({status:200, headers:CORS, body:'{"ok":true}'}); });
  await p.goto('file://'+path.resolve(OUT+'/shots.html')); await p.waitForTimeout(600);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  const shot = async (name, fn) => { if(only.length && !only.includes(name)) return; await fn(); await p.waitForTimeout(500); await p.screenshot({path: path.join(outDir, name+'.png')}); };
  await shot('today', async () => { await E("ui.view='today'; renderView()"); });
  await shot('you', async () => { await E("ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(1500); });
  await shot('goals', async () => { await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); });
  await shot('health', async () => { await E("ui.view='personal'; ui.personalTab='fitness'; ui.healthTab='workouts'; renderView()"); });
  await shot('health-weight', async () => { await E("ui.view='personal'; ui.personalTab='fitness'; ui.healthTab='weight'; renderView()"); });
  await shot('calendar', async () => { await E("ui.view='calendar'; renderView()"); await p.waitForTimeout(400); await E("ACTIONS.closeIntent && ACTIONS.closeIntent()"); });
  await shot('focus', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='focus'; ui.focusTab='overview'; renderView()"); });
  await shot('focus-bottom', async () => { await E("ui.view='focus'; renderView()"); await p.waitForTimeout(300); await E("const m = document.getElementById('viewRoot').closest('main') || document.scrollingElement; [document.scrollingElement, document.querySelector('.main'), document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 99999; })"); });
  await shot('focus-car', async () => { await E("state.profile.cardLayout='carousel'; ui.view='focus'; renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 99999; })"); });
  await shot('leads', async () => { await E("ui.view='business'; ui.businessTab='leads'; renderView()"); });
  await shot('analytics', async () => { await E("state.profile.cardLayout='grid'; ui.view='focus'; ui.focusTab='analytics'; renderView()"); });
  await shot('progress', async () => { await E("ui.view='today'; renderView()"); await p.waitForTimeout(300); await E("const el = document.querySelector('.progress-panel'); if(el) el.scrollIntoView({block:'center'})"); });
  await shot('aweek', async () => { await E("ui.view='focus'; ui.focusTab='analytics'; ui.analyticsRange='week'; renderView()"); await p.waitForTimeout(1500); });
  await shot('settings-op', async () => { await E("ui.view='settings'; ui.settingsTab='operator'; renderView()"); await p.waitForTimeout(600); });
  await shot('aweek2', async () => { await E("renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 650; })"); });
  await E("ui.analyticsRange='today'");
  await shot('analytics2', async () => { await E("ui.view='focus'; ui.focusTab='analytics'; renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 700; })"); });
  await shot('locked', async () => { await E("ui.focusTab='tasks'; state.focus.activeSession = {startedAt: Date.now()-1800000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false, completeFired:false}; ui.view='focus'; renderView()"); });
  await shot('locked2', async () => { await E("renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 99999; })"); });
  await shot('locked-today', async () => { await E("ui.view='today'; renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 99999; })"); });
  await shot('locked-today-mid', async () => { await E("renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 600; })"); });
  await E("state.focus.activeSession = null; renderView()");
  await shot('leads-car', async () => { await E("state.profile.cardLayout='carousel'; ui.view='business'; ui.businessTab='leads'; renderView()"); });
  await shot('clients-car', async () => { await E("state.profile.cardLayout='carousel'; ui.view='business'; ui.businessTab='clients'; renderView()"); });
  await E("state.profile.cardLayout='grid'");
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

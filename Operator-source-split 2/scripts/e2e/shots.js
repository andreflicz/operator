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
  // a vision board with pictures (made-up gradients standing in for photos)
  const pic = (a, c, t) => 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+c+'"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="300" cy="80" r="46" fill="rgba(255,255,255,.55)"/><text x="30" y="260" font-family="Helvetica" font-size="34" font-weight="700" fill="rgba(255,255,255,.9)">'+t+'</text></svg>');
  const vis = [['#ff9a6b','#7a3cff','Tokyo'], ['#3fbe8e','#0c4a6e','Body'], ['#ffd27a','#e8613d','Family'], ['#5ec8ff','#1d2b6b','Freedom'], ['#ff6fa8','#4b1d6b','Home'], ['#222','#666','Car'], ['#9fe','#357','Ocean']];
  seed.boards = {boards:[{id:'v1', kind:'vision', name:'Vision Board', parentId:null, viewport:{x:0,y:0,zoom:1}, elements: vis.map((v, i) => ({id:'i'+i, type:'image', ref:pic(v[0], v[1], v[2]), x:(i%4)*420, y:Math.floor(i/4)*320, w:400, h:300, z:i+1})).concat([{id:'n1', type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'', x:0, y:700, w:240, h:80, z:9}])}], masterId:'v1'};
  const ctx = await b.newContext({viewport:{width:+process.env.VW || 1440, height:+process.env.VH || 900}}); const p = await ctx.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.clock.install({time:NOW.getTime()});
  await p.addInitScript((seed) => { if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k]))); }, seed);
  const TEAM = {NYG:'New York Giants', DAL:'Dallas Cowboys', PHI:'Philadelphia Eagles', KC:'Kansas City Chiefs', BUF:'Buffalo Bills', SF:'San Francisco 49ers', MIA:'Miami Dolphins', DET:'Detroit Lions', GB:'Green Bay Packers', NYK:'New York Knicks', BOS:'Boston Celtics', LAL:'Los Angeles Lakers', MIL:'Milwaukee Bucks', DEN:'Denver Nuggets', PHX:'Phoenix Suns'};
  const ev = (id, h, a, hs, as, st, date) => ({id, date, status:{type:{state:st, shortDetail: st==='post'?'Final':'Sun'}}, competitions:[{competitors:[{homeAway:'home', score:hs, winner: st==='post' && +hs>+as, team:{abbreviation:h, displayName:TEAM[h], shortDisplayName:TEAM[h].split(' ').pop()}},{homeAway:'away', score:as, winner: st==='post' && +as>+hs, team:{abbreviation:a, displayName:TEAM[a], shortDisplayName:TEAM[a].split(' ').pop()}}]}]});
  await p.route('http://127.0.0.1:8935/**', r => { const u = r.request().url();
    if(u.includes('/sports')) return r.fulfill({status:200, headers:CORS, body:JSON.stringify({events: u.includes('l=nfl') ? [ev('1','NYG','DAL','24','17','post','2026-10-10T17:00Z'), ev('3','KC','BUF','27','24','post','2026-10-09T00:20Z'), ev('4','SF','MIA','','','pre','2026-10-11T17:00Z'), ev('5','DET','GB','','','pre','2026-10-11T17:00Z'), ev('6','BUF','KC','','','pre','2026-10-11T20:25Z'), ev('7','DAL','PHI','','','pre','2026-10-12T00:20Z'), ev('2','PHI','NYG','','','pre','2026-10-16T17:00Z')] : u.includes('l=nba') ? [ev('11','NYK','BOS','112','104','post','2026-10-10T23:30Z'), ev('12','LAL','DEN','98','110','post','2026-10-11T02:00Z'), ev('13','MIL','PHX','','','pre','2026-10-12T23:00Z'), ev('14','BOS','NYK','','','pre','2026-10-14T23:30Z')] : []})});
    if(u.includes('/news')) return r.fulfill({status:200, headers:CORS, body:'<rss><channel>'+[1,2,3,4,5].map(i=>'<item><title>Headline number '+i+' about something - Reuters</title><link>https://x.com/'+i+'</link></item>').join('')+'</channel></rss>'});
    if(u.includes('/fin/accounts')){ const now = Math.floor(Date.now()/1000); return r.fulfill({status:200, headers:CORS, body:JSON.stringify({errors:[], accounts:[{id:'a1', name:'Checking', org:{name:'Chase'}, balance:'4210.55', 'balance-date':now, transactions:[['Chipotle',-14.2],['Shell',-48.1],['Spotify',-11.99],['Whole Foods',-96.4],['Amazon',-38.5],['Payroll',2400]].map((t, i) => ({id:'t'+i, posted:now - i*86400, amount:String(t[1]), description:t[0]}))}]})}); }
    if(u.includes('/fin/claim')) return r.fulfill({status:200, headers:CORS, body:'{"ok":true}'});
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
  await shot('fmin', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.focus.activeSession=null; state.profile.focusMinimal=true; ui.view='focus'; renderView()"); });
  await shot('lmin', async () => { await E("state.profile.focusMinimal=false; state.profile.lockedView='minimal'; state.focus.activeSession = {startedAt: Date.now()-1800000, plannedMinutes:null, completedTasks:[], breaks:[], onBreak:false, completeFired:false}; ui.view='focus'; renderView()"); });
  await shot('lmin-scroll', async () => { await p.mouse.move(700, 450); await p.mouse.wheel(0, 2000); });
  await shot('focus-full', async () => { await E("state.profile.lockedView='full'; state.focus.activeSession=null; ui.view='focus'; ui.focusTab='overview'; renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 99999; })"); });
  await shot('goals2', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.focus.activeSession=null; ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 700; })"); });
  await shot('goalsheet', async () => { await E("openGoalSheet('long')"); });
  await shot('finances', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.focus.activeSession=null; state.finances.bank={connected:true}; ui.view='personal'; ui.personalTab='finances'; renderView(); finSync(true)"); await p.waitForTimeout(800); await E("const el=document.querySelector('.ex'); if(el) el.scrollIntoView({block:'start'})"); });
  await shot('goalsheet2', async () => { await E("closeGoalSheet(); openGoalSheet('week')"); });
  await shot('contentsheet', async () => { await E("closeGoalSheet(); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='videoIdeas'; renderView(); openContentSheet('business')"); });
  await shot('content', async () => { await E("closeContentSheet(); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='videoIdeas'; renderView()"); });
  await shot('social', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.socRole='business'; socImportCsv('Publish time,Description,Permalink,Post type,Reach,Likes,Comments,Shares,Saves,Followers\\n'+[1,2,3,4,5,6,8,10,13].map(i => '2026-10-'+String(11-i%10).padStart(2,'0')+'T15:00,Reel number '+i+',https://instagram.com/p/x'+i+',Reel,'+(1200+i*300)+','+(80+i*11)+','+(5+i)+',3,9,4210').join('\\n'), 'x.csv'); ui.view='convos'; inboxState().mode='social'; renderView()"); await p.waitForTimeout(700); });
  await shot('goals3', async () => { await E("state.goals.items.push({id:'mf', label:'5k followers', done:false, target:5000, current:0, unit:'followers', autoTrack:'followers', master:true, start:3800, xp:1500, createdAt:'2026-10-01'}); ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(400); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 200; })"); });
  await shot('goalsheet3', async () => { await E("ui.gsTrack='followers'; openGoalSheet('long')"); });
  await shot('fabmenu', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='personal'; ui.personalTab='finances'; renderView()"); await p.waitForTimeout(300); await p.click('#fabAdd'); await p.waitForTimeout(500); });
  await E("fabMenuClose()");
  await shot('inspire', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); const s = inspStore(); if(!s.log.length){ ['walk','read','meditate','clean','mealprep'].forEach((a, i) => s.log.push({id:'il'+i, act:a, label:inspAct(a).label, at:Date.now()-i*86400000/2, date:addDays(todayStr(), -Math.floor(i/2))})); s.thoughts.push({id:'th1', x:260, y:-420, text:'Morning walks before the phone. That is the whole trick.', tint:'#ffd1e8'}); } openInspire()"); await p.waitForTimeout(1600); });
  await shot('inspire-card', async () => { await E("ACTIONS.inspOpenAct(null, null, 'walk')"); await p.waitForTimeout(700); });
  await shot('inspire-sheet', async () => { await E("ui.inspOpenAct=null; ACTIONS.inspLogSheet()"); await p.waitForTimeout(700); });
  await shot('inspire-zoom', async () => { await E("ui.inspSheet=false; ui.inspView={x:-300,y:80,z:0.5}; inspRender()"); await p.waitForTimeout(900); });
  await shot('inspire-sand', async () => { await E("ui.inspSheet=false; ui.inspOpenAct=null; ui.inspView=inspHome(); const s = inspSandStore(); if(!s.wishes.length){ s.wishes.push({id:'w1', x:-260, y:-300, text:'A house by the ocean', hue:200}, {id:'w2', x:330, y:250, text:'Take Mom to Japan', hue:320}); s.quotes.push({id:'q1', x:-760, y:-120, q:'Nature does not hurry, yet everything is accomplished.', by:'Lao Tzu'}); } inspRender()"); await p.waitForTimeout(1200); });
  await shot('inspire-sky', async () => { await E("ACTIONS.inspSky()"); await p.waitForTimeout(1600); });
  await shot('inspire-breath', async () => { await E("ACTIONS.inspBreathe()"); await p.waitForTimeout(2500); });
  await E("if(ui.inspBreath) ACTIONS.inspBreatheEnd(); ui.inspView=null; closeInspire()");
  await shot('growth', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); if(!state.tasks.items.some(t=>t.skill)){ state.tasks.items.push({id:'sk1', title:'Meta ads', status:'today', priority:'med', clients:['personal'], skill:true, ongoing:true, trackedMinutes:340}, {id:'sk2', title:'Editing in Premiere', status:'backlog', priority:'med', clients:['personal'], skill:true, ongoing:true, trackedMinutes:120}); state.focus.taskSegments = (state.focus.taskSegments||[]).concat([1,2,3,5,8,9,12,15,20].map(i => ({id:'ts'+i, taskId:i%3?'sk1':'sk2', start:Date.now()-i*86400000, end:Date.now()-i*86400000+(25+i*3)*60000, date:addDays(todayStr(), -i)}))); } ui.view='personal'; ui.personalTab='growth'; renderView()"); await p.waitForTimeout(400); });
  await shot('you3', async () => { await E("xpLast=null; ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(400); await E("(document.querySelector('.acl')||document.body).scrollIntoView({block:'center'})"); await p.waitForTimeout(200); });
  await shot('checkout', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); openCheckoutForm('week', weekKey())"); await p.waitForTimeout(900); });
  await E("closeIntentOverlay()");
  await shot('vault', async () => { await E("if(!vaultStore().length){ vaultStore().push({id:'v1', kind:'week', key:addDays(todayStr(),-7), label:'The week of Oct 5', text:'You did the hard thing this week. Remember how it felt to finish the JJS launch on time.', at:Date.now()-86400000*3, back:true}, {id:'v2', kind:'month', key:'2026-09', label:'September', text:'September was messy. October is the month you stop negotiating with yourself.', at:Date.now()-86400000*11, back:false}); ui.vaultOpen={v1:true}; } ui.view='personal'; ui.personalTab='journal'; ui.journalMode='vault'; renderView()"); await p.waitForTimeout(800); });
  await E("ui.journalMode='entries'");
  await shot('lockseq', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.focus.prepItems=[]; openLockSeq(); ui.lockSeq.maxStep=3; lockGoTo(3)"); await p.waitForTimeout(900); });
  await shot('lockseq1', async () => { await E("lockGoTo(1)"); await p.waitForTimeout(700); });
  await E("closeLockSeq()");
  await shot('lockmin', async () => { await E("state.profile.lockedView='minimal'; state.focus.activeSession = {startedAt: Date.now()-1800000, plannedMinutes:50, completedTasks:[], breaks:[], onBreak:false, completeFired:false}; ui.view='focus'; renderView()"); await p.waitForTimeout(900); });
  await E("state.focus.activeSession=null; state.profile.lockedView='full'; ui.view='today'; renderView()");
  await shot('finsheet', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); fabMenuClose(); ui.view='personal'; ui.personalTab='finances'; renderView(); openFinSheet('expense')"); await p.waitForTimeout(500); });
  await shot('finsheet-debt', async () => { await E("openFinSheet('debt')"); await p.waitForTimeout(400); });
  await shot('fabfocus', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(300); await p.click('#fabAdd', {force:true}); await p.waitForTimeout(500); });
  await shot('skillsheet', async () => { await E("fabMenuClose(); openSkillSheet()"); await p.waitForTimeout(500); });
  await shot('skills', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); if(!state.tasks.items.some(t=>t.skill)){ state.tasks.items.push({id:'sk1', title:'Meta ads', status:'today', priority:'med', clients:['personal'], skill:true, skillGoal:180, ongoing:true, trackedMinutes:340}, {id:'sk2', title:'Editing in Premiere', status:'backlog', priority:'med', clients:['personal'], skill:true, ongoing:true, trackedMinutes:120}); state.focus.taskSegments = (state.focus.taskSegments||[]).concat([1,2,3,5,8,9,12,15,20].map(i => ({id:'ts'+i, taskId:i%3?'sk1':'sk2', start:Date.now()-i*86400000, end:Date.now()-i*86400000+(25+i*3)*60000, date:addDays(todayStr(), -i)}))); } ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='skills'; renderView()"); await p.waitForTimeout(400); });
  await shot('focus-skillcards', async () => { await E("ui.focusTasksSubTab='overview'; renderView()"); await p.waitForTimeout(400); });
  await shot('addtask', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='focus'; renderView(); openAddTaskModal()"); await p.waitForTimeout(500); });
  await shot('addevent', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='calendar'; renderView(); openCalEventModal()"); await p.waitForTimeout(500); });
  await shot('cal-cards', async () => { await E("const pr = intentStore().prompted; checkoutDue().forEach(c => pr['O'+c.kind+':'+c.key] = 1); pr['M'+monthKey()] = 1; pr['W'+weekKey()] = 1; ui._intAsked = 'x'; document.querySelectorAll('.overlay, .int-ov').forEach(o => { o.classList.add('hidden'); o.classList.remove('is-in'); }); ui.view='calendar'; renderView()"); await p.waitForTimeout(900); await E("document.querySelectorAll('.int-ov').forEach(o => { o.classList.add('hidden'); o.classList.remove('is-in'); })"); });
  await shot('light-pick', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.profile.theme='light'; document.documentElement.setAttribute('data-theme','light'); ui.view='focus'; ui.focusTab='tasks'; ui.focusTasksSubTab='skills'; renderView(); ACTIONS.fabAdd()"); await p.waitForTimeout(500); });
  await shot('light-fin', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); openFinSheet('expense')"); await p.waitForTimeout(500); await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.profile.theme='dark'; document.documentElement.setAttribute('data-theme','dark')"); });
  await shot('clockout-wind', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); state.focus.activeSession=null; ui.view='today'; renderView(); ACTIONS.clockOut()"); await p.waitForTimeout(1400); });
  await shot('clockout-tomorrow', async () => { await E("workCfg().enabled = true; ui.wind.step='alarm'; ui.wind.workStart='09:00'; ui.wind.workEnd='17:00'; ui.wind.noWork=false; renderWindInto()"); await p.waitForTimeout(500); });
  await shot('clockout-day', async () => { await E("ACTIONS.windDone()"); await p.waitForTimeout(900); });
  await shot('sleep', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='today'; startMode('offtime', {sleep:true, note:'Sleep'}); renderView()"); await p.waitForTimeout(2600); });
  await E("if(state.modes.active && state.modes.active.sleep) endMode()");
  await shot('board', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='personal'; ui.personalTab='journal'; ui.journalMode='boards'; renderView()"); await p.waitForTimeout(900); });
  await shot('board-full', async () => { await E("ui.boardFull = 'journal'; renderView()"); await p.waitForTimeout(900); });
  await E("ui.boardFull = false");
  await shot('health-body', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='body'; renderView()"); await p.waitForTimeout(400); });
  await shot('health-train', async () => { await E("ui.healthSub='training'; renderView()"); await p.waitForTimeout(400); });
  await E("ui.healthSub='overview'");
  await shot('workset', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.alarmTab='work'; workCfg().enabled=true; openWakeSetup()"); await p.waitForTimeout(500); });
  await E("hideOverlay('wakeSetupOverlay'); ui.alarmTab='wake'");
  await shot('workring', async () => { await E("fireWorkAlarm({test:true})"); await p.waitForTimeout(900); });
  await E("workRingStop(); hideOverlay('wakeOverlay'); ui.wakeMode=null");
  await shot('opmood', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='today'; renderView(); opMood('stern', Infinity); OV.cap='opBubText'; opBubShow(); opCaption('It’s 11:40 and you were meant to start at 9. One task done out of four. What happened?')"); await p.waitForTimeout(900); });
  await E("opMood('neutral')");
  await shot('oplight', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); closeGoalSheet && closeGoalSheet(); ui.view='today'; renderView(); OV.cap='opBubText'; opBubShow(); opCaption('Morning. Three things are lined up today and JJS is due a check-in. Your deep work average is up this week, which is the first time in a while. Want me to lock you in on the JJS launch now, or start with the proposal for Bloom Co?')"); await p.waitForTimeout(500); });
  await shot('guide2', async () => { await E("ACTIONS.openXpHow(); document.getElementById('xpHowOverlay').scrollTop = 1500"); });
  await shot('history', async () => { await E("ACTIONS.openXpHistory()"); });
  await shot('you2', async () => { await E("ACTIONS.closeXpHow(); ui.view='personal'; ui.personalTab='you'; renderView()"); await p.waitForTimeout(300); await E("[document.scrollingElement, document.getElementById('viewRoot').parentElement].forEach(x => { if(x) x.scrollTop = 99999; })"); });
  await shot('health2', async () => { await E("ui.view='personal'; ui.personalTab='fitness'; renderView()"); await p.waitForTimeout(300); await E("document.getElementById('healthScore').scrollIntoView({block:'center'})"); });
  await shot('sleepsheet', async () => { await E("openHealthSheet('sleep')"); });
  await E("ACTIONS.closeXpHow()");
  await shot('morning', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.view='today'; renderView(); fireWake({})"); await p.click('[data-action=\"wakeStartDay\"]'); await p.waitForTimeout(900); await E("briefRevealAll()"); await p.clock.runFor(3000); await p.waitForTimeout(900); });
  await shot('workprev', async () => { await E("document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); ui.wakeMode=null; clockIn({from:'x', quiet:true}); OV.cap='opBubText'; opBubShow(); opCaption('Alright Andre. Three things today: the JJS launch first, then the Bloom proposal, then edits. JJS is due a check-in too. Want me to lock you in on the launch?')"); await p.waitForTimeout(700); });
  await E("hideOverlay && hideOverlay('planOverlay')");
  await shot('morning-vision', async () => { await E("briefHeroSet('vision')"); await p.waitForTimeout(1000); });
  await shot('morning-lvl', async () => { await E("briefHeroSet('lvl')"); await p.waitForTimeout(1000); });
  await shot('morning-board', async () => { await E("briefHeroSet('vision')"); await p.waitForTimeout(800); await p.click('.bh-board'); await p.waitForTimeout(700); });
  await E("ui.wakeBoardBig=false; briefHeroSet('wx')");
  await shot('morning-load', async () => { await E("wakeCfg().voice=true; document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); fireWake({})"); await p.click('[data-action=\"wakeStartDay\"]'); await E("OV.pre={ready:false}; ACTIONS.wakeIntroSkip()"); await p.clock.runFor(2500); await p.waitForTimeout(900); });
  await E("wakeCfg().voice=false");
  console.log('errors:', p.errors);
  await b.close();
})();

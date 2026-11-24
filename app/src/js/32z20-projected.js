// ============ YOUR PROJECTED SELF (round 30) ============
// Who you'd be if you lived locked in every single day from the day this started: eight hours of deep
// work, eating right, training, the weight coming off at a healthy pace, your number of new clients
// signed every month (and your price creeping up as you get better at it). It plays your character
// forward with the game's own rules: the XP and level, the MRR and what that is a year, the clients,
// your weight and Health, the rank. Next to it, where you actually are, so you can see the gap.
// Each rank comes with how that life probably looks (where you live, what you drive, how you travel,
// what you've done for your people), and with a key Op writes it for you, from your numbers.
// It starts the day you first open this version (for someone new: the day they get the app).

function projBase(){
  const p = state.profile;
  if(!p.proj || !p.proj.start){
    const x = xpSummary(), b = bodyStats();
    p.proj = {start:todayStr(), at:Date.now(), xp:x.total, level:x.level, mrr:xpMrr(), clients:projClientsNow(), w:b.w || null, h:b.h || null, kg:!!b.kg, health:x.attrs.HLT.v};
    persist('profile');
  }
  // (height and weight added later: the body starts from the first weigh-in after)
  if(p.proj.w==null){ const b = bodyStats(); if(b.w && b.h){ p.proj.w = b.w; p.proj.h = b.h; p.proj.kg = !!b.kg; persist('profile'); } }
  return p.proj;
}
function pjMoney(n){ return n >= 1e6 ? '$'+(n/1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')+'M' : money(n); }
function projClientsNow(){ return arr(state.business.clients).filter(function(c){ return typeof clientStageActive!=='function' || clientStageActive(c.stage); }).length; }
function projAssume(){
  const paying = arr(state.business.clients).filter(function(c){ return Number(c.mrr) > 0; });
  const avg = paying.length ? paying.reduce(function(a, c){ return a + Number(c.mrr); }, 0)/paying.length : 1000;
  return {hours:8, days:5.5, perMonth:Number(state.standards.newClientsPerMonth) || 2, price:Math.round(avg/50)*50 || 1000, growth:0.02, top:2.5, loss:0.0075};
}
// a locked-in week and month, in XP, by the game's own rules
function projWeekXp(){
  const day = (xpDeep(480, 0).xp + XP_RATES.goldDay)*1.28 + xpTasks(8) + (XP_RATES.outreach*3 + XP_RATES.outreachEach*3);
  return day*5.5 + 205 + 3*CHECKIN_XP.weekGoal + CHECKIN_XP.weekIn + CHECKIN_XP.weekOut + 2*MASTER_XP.weekly;
}
function projMonthXp(){ return 3*CHECKIN_XP.monthGoal + CHECKIN_XP.monthIn + CHECKIN_XP.monthOut + CHECKIN_XP.habit; }
function projGoalWeight(b){
  const g = Number(state.profile.goalWeight);
  if(g > 0) return g;
  if(b.h){ const lb = 23*b.h*b.h/703; return Math.round(b.kg ? lb/2.20462 : lb); }
  return Math.round(b.w*0.88);
}
// you, d days after the start, locked in the whole way
function projAt(d){
  const s = projBase(), A = projAssume(), months = d/30.44, weeks = d/7;
  // clients and money: your number every month, each one at a price that creeps up as you get better
  let mrr = s.mrr, added = 0; const full = Math.floor(months);
  const priceAt = function(m){ return A.price*Math.min(A.top, Math.pow(1 + A.growth, m)); };
  for(let m = 1; m <= full; m++){ mrr += A.perMonth*priceAt(m); added += A.perMonth; }
  const frac = months - full; if(frac > 0){ const k = Math.floor(A.perMonth*frac); mrr += k*priceAt(full + 1); added += k; }
  mrr = Math.round(mrr/50)*50;
  const xp = Math.round(s.xp + projWeekXp()*weeks + projMonthXp()*full + added*XP_RATES.client + Math.max(0, mrr - s.mrr)/1000*XP_RATES.mrrPerK);
  const level = Math.min(LEVEL_MAX, xpLevelOf(xp));
  // the body: about 0.75% a week (never more than 2 lb), down to a healthy weight, and held there
  let w = s.w, bmi = null;
  if(w){
    const goal = projGoalWeight({w:s.w, h:s.h, kg:s.kg}), cap = s.kg ? 0.9 : 2;
    for(let i = 0; i < Math.floor(weeks) && w > goal; i++) w = Math.max(goal, w - Math.min(cap, w*A.loss));
    w = Math.round(w);
    if(s.h){ const lb = s.kg ? w*2.20462 : w; bmi = 703*lb/(s.h*s.h); }
  }
  const top = Math.min(94, healthCap(bmi)), health = Math.round(s.health + (top - s.health)*(1 - Math.exp(-weeks/6)));
  let rank = 0; RANKS.forEach(function(rk, i){ if(level >= rk.level && mrr >= rk.mrr && health >= rk.health) rank = i; });
  const bus = Math.round(25 + 75*(0.45*Math.min(1, Math.sqrt(mrr/83400)) + 0.55*Math.min(1, weeks/8)));
  const ovr = Math.round((bus + health + Math.min(96, 60 + weeks*3) + Math.min(90, 55 + weeks*2))/4);
  return {d:d, date:addDays(s.start, d), mrr:mrr, year:mrr*12, clients:s.clients + added, xp:xp, level:level, w:w, bmi:bmi, health:health, rank:rank, hours:Math.round(A.hours*A.days*weeks), ovr:ovr, weeks:weeks};
}
function projNow(){
  const x = xpSummary(), b = bodyStats(), s = projBase();
  const hrs = Math.round(arr(state.focus.sessions).filter(function(z){ return z.date >= s.start; }).reduce(function(a, z){ return a + (Number(z.minutes)||0); }, 0)/60);
  return {level:x.level, rank:x.rank, mrr:xpMrr(), clients:projClientsNow(), w:b.w || null, bmi:b.bmi, health:x.attrs.HLT.v, hours:hrs, ovr:x.ovr, xp:x.total};
}
const PROJ_MARKS = [[30, 'In a month'], [91, 'In 3 months'], [182, 'In 6 months'], [365, 'In a year'], [730, 'In 2 years'], [1826, 'In 5 years']];

// ---- how each rank lives (Op writes his own version from your life, with a key) ----
const RANK_LIFE = [
  'Still at your parents’ place, and not because you want to be. Whatever comes in goes straight back out: a card that lives near its limit, bills paid late, every train fare counted. No car. Weekends are quiet because plans cost money, and if you’re honest you’re closer to the edge than you like to say. The one thing you own outright is your hours, and that’s exactly where this starts.',
  'Rent’s covered, just. Your own room or a first place with a roommate, paying your way. The debt stops growing. A used car or a monthly pass, and for the first time a little left at the end of the month. People start asking what you do.',
  'Your own apartment, nothing crazy, but yours. A reliable car with a payment you don’t sweat. The debt shrinks every month. You eat out without checking the price first, take a real trip once a year, and cover one of your mom’s bills now and then.',
  'Six figures. A nice place in a good part of town, a car you actually wanted, and the debt’s gone. You fly when you feel like it, you pick up the check, and your mom finally stops worrying about you. You start investing instead of just saving.',
  'A high-rise with a view. A car people turn their heads for, and a small team doing what you used to do yourself. Several trips a year, good seats, good hotels. You’re covering your mom’s rent so she can cut her hours. Your money works while you sleep.',
  'A place you own with two nice cars in the garage. First class is just how you fly now. Your mom works because she wants to, not because she has to, and the family knows who to call. The people around you changed: builders, owners, people who move.',
  'You bought your mom a house. A penthouse waits for you at home while you go country to country on the best flights, working from wherever you land. The company runs without you in the room. Your body is part of it now: a trainer, a chef, sleep dialed in.',
  'Real estate, investments, a team of teams. More than one home and a car for every mood. You fly the whole family out and never look at the bill. You fund other people’s dreams now, and your name opens doors before you knock.',
  'A million a year. A high-rise waiting at home while you’re overseas, a driver, the best table anywhere you go, and nothing on your calendar you didn’t choose. Your mom is retired in the house you bought her, your people are set for life, and you’re in the best shape you’ve ever been in. Free.'
];
function projRankLife(i){ const r = state.profile.rankLife; return (r && Array.isArray(r.list) && r.list[i]) || RANK_LIFE[i]; }
// how you'd look: a line from the numbers (Op writes a better one with a key)
function projLook(pt, i){
  if(!pt.w) return 'Add your height and weight in Settings and this shows the body too.';
  const b = pt.bmi, wk = pt.weeks;
  if(i < 0 || wk < 1) return 'Where you are today.';
  if(b!=null && b < 25 && wk >= 26) return 'Lean and athletic: definition in your arms and shoulders, a tight waist, clear skin, and the kind of posture people notice when you walk in.';
  if(b!=null && b < 25) return 'In the healthy range and getting sharper every week: your face leaner, clothes fitting how they’re supposed to, strength showing.';
  if(b!=null && b < 30) return 'Noticeably slimmer. Your face is sharper, your clothes hang looser, and you move easier. The strength is starting to show through.';
  return 'Lighter and stronger than you are right now, the weight coming off steadily, more energy every week.';
}
function projFigure(pt, color){
  const b = pt.bmi!=null ? pt.bmi : 26, f = Math.max(0, Math.min(1, (b - 19)/20)), m = Math.max(0, Math.min(1, pt.weeks/30));
  const sw = 21 + m*4 + f*5, ww = 11 + f*17, hw = 13 + f*10, aw = 5 + f*3 + m*1.5;
  const c = 50;
  return '<svg class="pj-fig" viewBox="0 0 100 170" aria-hidden="true"><defs><linearGradient id="pjg'+pt.d+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="'+color+'" stop-opacity=".55"/></linearGradient></defs>'+
    '<g fill="url(#pjg'+pt.d+')" stroke="'+color+'" stroke-opacity=".6" stroke-width="1.2">'+
    '<circle cx="50" cy="17" r="11"/>'+
    '<path d="M'+(c-sw)+' 38 Q'+c+' 30 '+(c+sw)+' 38 L'+(c+ww+2)+' 74 Q'+(c+hw)+' 92 '+(c+hw)+' 96 L'+(c-hw)+' 96 Q'+(c-hw)+' 92 '+(c-ww-2)+' 74 Z"/>'+
    '<path d="M'+(c-sw)+' 39 Q'+(c-sw-aw)+' 66 '+(c-sw-aw*0.6)+' 92 L'+(c-sw+aw*0.4)+' 92 Q'+(c-sw+2)+' 66 '+(c-sw+aw)+' 46 Z"/>'+
    '<path d="M'+(c+sw)+' 39 Q'+(c+sw+aw)+' 66 '+(c+sw+aw*0.6)+' 92 L'+(c+sw-aw*0.4)+' 92 Q'+(c+sw-2)+' 66 '+(c+sw-aw)+' 46 Z"/>'+
    '<path d="M'+(c-hw)+' 96 L'+(c-hw*0.55)+' 162 L'+(c-2)+' 162 L'+c+' 104 L'+(c+2)+' 162 L'+(c+hw*0.55)+' 162 L'+(c+hw)+' 96 Z"/>'+
    '</g></svg>';
}
// ---- the page ----
function projCard(pt, label, ai, i){
  const rk = RANKS[pt.rank], u = projBase().kg ? 'kg' : 'lb';
  return '<div class="pj-card" style="--rc:'+rk.color+'"><div class="pj-when"><b>'+label+'</b><span>'+fmtDateShort(pt.date)+'</span></div>'+
    '<div class="pj-body">'+projFigure(pt, rk.color)+'<div class="pj-stats">'+
      '<div class="pj-rank">'+rankBadgeSvg(pt.rank, 30)+'<div><b>'+escapeHtml(rk.name)+'</b><small>Level '+pt.level+'</small></div></div>'+
      '<div class="pj-kv"><span>MRR</span><b>'+pjMoney(pt.mrr)+'</b></div><div class="pj-kv"><span>A year</span><b>'+pjMoney(pt.year)+'</b></div>'+
      '<div class="pj-kv"><span>Clients</span><b>'+pt.clients+'</b></div>'+(pt.w ? '<div class="pj-kv"><span>Weight</span><b>'+pt.w+' '+u+'</b></div>' : '')+
      '<div class="pj-kv"><span>Health</span><b>'+pt.health+'</b></div><div class="pj-kv"><span>Deep work</span><b>'+pt.hours.toLocaleString()+'h</b></div></div></div>'+
    '<div class="pj-look"><small>How you’d look</small>'+escapeHtml((ai && ai.looks && ai.looks[i]) || projLook(pt, i))+'</div>'+
    '<div class="pj-life"><small>How you live</small>'+escapeHtml((ai && ai.lives && ai.lives[i]) || projRankLife(pt.rank))+'</div></div>';
}
ACTIONS.openProjected = function(){
  const o = xpHowOverlay(), s = projBase(), A = projAssume(), day = Math.max(0, Math.round((localTs(todayStr(), '12:00') - localTs(s.start, '12:00'))/86400000));
  const want = projAt(day), now = projNow(), marks = PROJ_MARKS.map(function(m){ return projAt(m[0]); });
  const ai = state.profile.projAi && state.profile.projAi.key===projAiKey(marks) ? state.profile.projAi : null;
  const u = s.kg ? 'kg' : 'lb';
  const row = function(k, a, b, fmt, lowerBetter){ const ok = a==null || b==null ? null : lowerBetter ? b <= a : b >= a; return '<div class="pj-row"><span>'+k+'</span><b>'+(a==null ? '–' : fmt(a))+'</b><b class="'+(ok==null ? '' : ok ? 'is-ok' : 'is-behind')+'">'+(b==null ? '–' : fmt(b))+'</b></div>'; };
  const id = function(v){ return String(v); };
  document.getElementById('xpHowContent').innerHTML =
    '<div class="xpg-top"><button class="xpg-back" data-action="openXpHow">&larr; How XP works</button><div class="xph-k">[ SYSTEM ]</div>'+(AI.hasKey===true ? '<button class="xpg-hist-btn" data-action="projAiWrite">&#10024; '+(ai ? 'Have Op rewrite it' : 'Have Op write it for you')+'</button>' : '')+'</div>'+
    '<h1>Your projected self</h1>'+
    '<div class="xph-lead">If you lived locked in every day from <b>'+fmtDateShort(s.start)+'</b>: '+A.hours+' hours of deep work a day, eating right and training, your weight coming down at a healthy pace, '+A.perMonth+' new client'+(A.perMonth===1 ? '' : 's')+' every month. This is who that makes you.</div>'+
    '<div class="xpg-sec">Today, day '+day+'</div>'+
    '<div class="pj-now"><div class="pj-row pj-head"><span></span><b>Locked in</b><b>You</b></div>'+
      row('Rank', want.rank, now.rank, function(i){ return RANKS[i].name; })+row('Level', want.level, now.level, id)+row('MRR', want.mrr, now.mrr, money)+row('Clients', want.clients, now.clients, id)+
      (want.w ? row('Weight', want.w, now.w, function(v){ return v+' '+u; }, true) : '')+row('Health', want.health, now.health, id)+row('Deep work since', want.hours, now.hours, function(v){ return v+'h'; })+'</div>'+
    '<div class="xpg-sec">Where it goes</div>'+
    '<div class="pj-line">'+marks.map(function(pt, i){ return projCard(pt, PROJ_MARKS[i][1], ai, i); }).join('')+'</div>'+
    '<div class="xpg-sec">How each rank lives</div>'+
    '<div class="pj-ranks">'+RANKS.map(function(rk, i){ return '<div class="pj-rk'+(i===now.rank ? ' is-you' : '')+'" style="--rc:'+rk.color+'">'+rankBadgeSvg(i, 34)+'<div><div class="pj-rk-h"><b>'+escapeHtml(rk.name)+'</b><span>'+(rk.mrr ? pjMoney(rk.mrr*12)+' a year' : 'Starting out')+'</span>'+(i===now.rank ? '<em>You are here</em>' : '')+'</div><p>'+escapeHtml(projRankLife(i))+'</p></div></div>'; }).join('')+'</div>'+
    '<div class="pj-math"><b>The math.</b> The game’s own XP rules, played forward: a gold day of deep work every work day (5.5 a week) with the strong-day bonus, 8 tasks a day, a few touches of outreach, four workouts a week, three weekly and three monthly goals, the check-ins, the rings. '+A.perMonth+' new clients a month at '+money(A.price)+' (your average), the price creeping up 2% a month as you get better (to 2.5 times what you charge now, at most), nobody lost. Weight down about 0.75% a week (never more than '+(s.kg ? '0.9 kg' : '2 lb')+') to '+(state.profile.goalWeight ? 'your goal' : 'a healthy weight for your height')+', then held. Health climbs toward what your body allows. Rank needs the level, the MRR and the Health, same as the real thing.</div>';
  o.classList.remove('hidden'); o.scrollTop = 0;
};
// ---- Op writes it: how you'd look and how you'd live at each point, and each rank, for you ----
function projAiKey(marks){ return projBase().start+'|'+marks.map(function(m){ return m.rank+':'+Math.round(m.mrr/1000); }).join(','); }
function projJson(t){ const a = String(t||''), i = a.indexOf('{'), j = a.lastIndexOf('}'); if(i < 0 || j < i) return null; try{ return JSON.parse(a.slice(i, j + 1)); }catch(e){ return null; } }
ACTIONS.projAiWrite = async function(){
  if(AI.hasKey!==true || typeof aiWrite!=='function') return;
  const marks = PROJ_MARKS.map(function(m){ return projAt(m[0]); }), s = projBase(), u = s.kg ? 'kg' : 'lb';
  showToast('Op’s writing it…', {icon:'&#10024;'});
  const about = typeof aboutYouContext==='function' ? aboutYouContext() : '';
  const facts = marks.map(function(pt, i){ return PROJ_MARKS[i][1]+': rank '+RANKS[pt.rank].name+', '+money(pt.mrr)+' a month ('+money(pt.year)+' a year), '+pt.clients+' clients'+(pt.w ? ', '+pt.w+' '+u+(pt.bmi ? ' (BMI '+pt.bmi.toFixed(1)+')' : '') : '')+', Health '+pt.health+'/100, '+Math.round(pt.weeks)+' weeks of training and eating right'; }).join('\n');
  const t = await aiWrite('Write his projected self: who he becomes if he lives locked in every day from today. Here is the projection:\n'+facts+'\n\nAbout him: '+about+
    '\n\nReturn only JSON: {"looks":[6 strings],"lives":[6 strings],"ranks":[9 strings]}. "looks": for each point, one or two sentences on how he probably looks then (from the weight, BMI and months of training). "lives": for each point, three or four sentences on how his life probably is at that income: where he lives, what he drives, how he travels, what he’s done for his family (his mom especially), his days, who’s around him. Grounded in the money: modest early, then big. "ranks": for each of these ranks in order ('+RANKS.map(function(r){ return r.name+' ('+(r.mrr ? money(r.mrr*12)+'/yr' : 'starting out')+')'; }).join(', ')+'), three sentences on how someone at that rank lives. The first rank is honest about being broke: living with his parents, debt, no car, counting fares, not much of a life yet. The top ranks: countries on the best flights, a high-rise waiting at home, more than one nice car, he bought his mom a house and she doesn’t have to work. Second person ("you"), present tense, vivid and specific, no slurs or crude language, no markdown.', {max:1800});
  const j = projJson(t);
  if(!j){ showToast('Op couldn’t write it just now. Try again in a bit.', {icon:'&#9888;&#65039;'}); return; }
  const fix = function(a, n){ return Array.isArray(a) ? a.slice(0, n).map(function(x){ return opNoDash(String(x||'')).slice(0, 700); }) : null; };
  state.profile.projAi = {key:projAiKey(marks), at:Date.now(), looks:fix(j.looks, 6), lives:fix(j.lives, 6)};
  if(Array.isArray(j.ranks) && j.ranks.length >= 9) state.profile.rankLife = {at:Date.now(), list:fix(j.ranks, 9)};
  persist('profile');
  const o = document.getElementById('xpHowOverlay'); if(o && !o.classList.contains('hidden')) ACTIONS.openProjected();
};
// ---- the way in: How XP works shows a glimpse, and the top bar a button ----
ACTIONS.openXpHow = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      const c = document.getElementById('xpHowContent'), yr = projAt(365), rk = RANKS[yr.rank];
      const top = c.querySelector('.xpg-top'); if(top && !top.querySelector('[data-action="openProjected"]')){ const b = document.createElement('button'); b.className = 'xpg-hist-btn'; b.setAttribute('data-action', 'openProjected'); b.innerHTML = '&#128302; Projected self'; top.appendChild(b); }
      const you = c.querySelector('.xpg-you');
      if(you && !c.querySelector('.pj-tease')){
        const t = document.createElement('button'); t.className = 'pj-tease'; t.setAttribute('data-action', 'openProjected'); t.style.setProperty('--rc', rk.color);
        t.innerHTML = rankBadgeSvg(yr.rank, 40)+'<span><small>&#128302; Your projected self, a year from '+fmtDateShort(projBase().start)+', locked in</small><b>'+escapeHtml(rk.name)+' · Level '+yr.level+' · '+pjMoney(yr.mrr)+'/mo · '+yr.clients+' clients</b></span><em>See it &#8594;</em>';
        you.parentNode.insertBefore(t, you.nextSibling);
      }
    }catch(e){}
    return r;
  };
})(ACTIONS.openXpHow);
// (the clock starts the day this arrives)
setTimeout(function(){ try{ if(state && state.profile) projBase(); }catch(e){} }, 3000);

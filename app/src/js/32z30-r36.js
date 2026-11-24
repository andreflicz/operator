// ============ ROUND 36 ============

// ---- forgetting everything Op knows takes a deliberate act ----
// The button used to sit right under the list: two taps and it was gone. Now there's a quiet link at
// the very bottom of Op's card, and it opens a window where you type FORGET to confirm. (Single items
// still go with their own ✕.) "Copy all" puts the whole list on the clipboard.
opSettingsHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<button class="btn btn-ghost btn-sm" data-action="opMemClear"[^>]*>Forget everything<\/button>/, '<div class="op-mem-tools"><button class="btn btn-ghost btn-sm" data-action="opMemCopy">&#128203; Copy all</button></div>');
    if(opMemory().length) h = h.replace(/<\/div>$/, '<div class="op-danger"><button class="op-danger-link" data-action="opMemClearAsk">Erase Op’s memory&hellip;</button></div></div>');
    return h;
  };
})(opSettingsHtml);
ACTIONS.opMemCopy = function(){
  const t = opMemory().map(function(m){ return '- '+m.text; }).join('\n');
  try{ navigator.clipboard.writeText(t); showToast('Op’s memory is on the clipboard ('+opMemory().length+').', {icon:'&#128203;'}); }catch(e){ showToast('Couldn’t copy it.', {icon:'&#9888;'}); }
};
ACTIONS.opMemClearAsk = function(){
  let o = document.getElementById('opForget'); if(o) o.remove();
  o = document.createElement('div'); o.id = 'opForget'; o.className = 'op-forget';
  o.innerHTML = '<div class="op-forget-c"><div class="op-forget-h">Erase everything Op remembers?</div>'+
    '<p>'+opMemory().length+' things he’s learned about you and how you work. This can’t be undone.</p>'+
    '<input class="input" id="opForgetIn" placeholder="Type FORGET to confirm" autocomplete="off">'+
    '<div class="op-forget-b"><button class="btn" data-action="opMemClearCancel">Keep it</button><button class="btn btn-danger" data-action="opMemClearDo" disabled>Erase</button></div></div>';
  document.body.appendChild(o);
  const i = o.querySelector('#opForgetIn'), go = o.querySelector('[data-action="opMemClearDo"]');
  i.addEventListener('input', function(){ go.disabled = i.value.trim().toUpperCase()!=='FORGET'; });
  setTimeout(function(){ i.focus(); }, 30);
};
ACTIONS.opMemClearCancel = function(){ const o = document.getElementById('opForget'); if(o) o.remove(); };
ACTIONS.opMemClearDo = function(){
  const i = document.getElementById('opForgetIn'); if(!i || i.value.trim().toUpperCase()!=='FORGET') return;
  state.profile.opMemory = []; persist('profile'); ACTIONS.opMemClearCancel(); renderView();
  showToast('Op’s memory is erased.', {icon:'&#129302;'});
};
// (the old two-tap action does nothing on its own now)
ACTIONS.opMemClear = function(){ ACTIONS.opMemClearAsk(); };

// ---- Today's hero stays as it was (name, Op's hello, the date, the weather right under) ----
// (round 36 tried the weather at the bottom and a clock face up here: too much empty space. The
// minute clock lives in the Op bar, bottom left, instead.)
// ---- the stats row: the streak and the week take the room; tasks is a small tile at the end ----
streakWorkHtml = (function(base){
  return function(o){
    o = o || {};
    let h = base.apply(this, arguments);
    if(o.compact) return h;
    // deep work today goes (the circles already show each day's hours); tasks becomes a small tile
    h = h.replace(/<div class="sw-k" id="swDeep"[\s\S]*?<\/i><\/div>/, '');
    h = h.replace(/<div class="sw-k" data-action="goToFinishedTasks"[^>]*><span>Tasks today<\/span><b>(\d+)<small> \/ (\d+)<\/small><\/b><\/div>/, function(m, d, t){
      const n = Number(t), f = n ? Number(d)/n : 0;
      return '<button class="sw-tasks" data-action="goToFinishedTasks" title="Tasks done today"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="sw-tr" cx="18" cy="18" r="15"/>'+(f ? '<circle class="sw-ar is-task" cx="18" cy="18" r="15" stroke-dasharray="'+(2*Math.PI*15*f).toFixed(1)+' '+(2*Math.PI*15).toFixed(1)+'"/>' : '')+'</svg><span><b>'+d+'<small>/'+t+'</small></b><em>tasks</em></span></button>';
    });
    return h.replace('class="sw is-row', 'class="sw is-row is-r36');
  };
})(streakWorkHtml);

// ---- Business: Clients, Leads and Lifecycle are one tab with sub-tabs; the setup gear sits at the
// right end of the tab lane, with Packages and Finances ----
const BIZ_PEOPLE = [['clients', 'Clients'], ['leads', 'Leads'], ['lifecycle', 'Lifecycle']];
renderBusiness = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const t = ui.businessTab || 'overview', people = BIZ_PEOPLE.some(function(x){ return x[0]===t; });
    const tab = function(id, label, on){ return '<div class="tab '+(on ? 'active' : '')+'" data-action="businessTab" data-tab="'+id+'">'+label+'</div>'; };
    const counts = {clients:arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); }).length, leads:arr(state.business.pipeline).filter(leadIsOpen).length, lifecycle:null};
    const subs = '<div class="subtabs">'+BIZ_PEOPLE.map(function(x){ return '<div class="subtab '+(t===x[0] ? 'active' : '')+'" data-action="businessTab" data-tab="'+x[0]+'">'+x[1]+(counts[x[0]]!=null ? ' <span style="opacity:.7;">'+counts[x[0]]+'</span>' : '')+'</div>'; }).join('')+'</div>';
    h = h.replace(/<button class="biz-gear"[^>]*>[^<]*<\/button>/, '');
    h = h.replace(/<div class="tabs">[\s\S]*?<\/div>\s*<div class="tab-panel"/, function(){
      return '<div class="tabs tabs-with-tools biz-tabs">'+tab('overview', 'Overview', t==='overview')+tab(people ? t : 'clients', 'Clients &amp; leads', people)+tab('packages', 'Packages', t==='packages')+tab('finances', 'Finances', t==='finances')+
        '<div class="tabs-tools">'+(people ? subs : '')+'<button class="biz-gear is-lane" data-action="bizSetupOpen" title="Business setup: reach-out, messages, stages, cycles" aria-label="Business setup">&#9881;&#65038;<span>Setup</span></button></div></div><div class="tab-panel"';
    });
    return h;
  };
})(renderBusiness);

// ---- master tasks: the weekly ones the business always needs, made for you ----
// Every week (Monday to Sunday) the app lays out:
//  • Check in with every client: one batch task. Each touch you log on a client ticks them off; when
//    everyone's been touched it finishes itself. Finishing it yourself logs a touch for anyone left.
//  • Deliverables for <client>: one per client with a package, showing this week's count; it finishes
//    itself when the week's deliverables are in.
// They're tied to the client card ("This week" strip), feed client health (touches and deliverables
// are what health reads), and roll up into a master goal ring: Client care this week.
// Delete one and it stays gone for that week.
function mtStore(){ const f = state.focus; if(!f.masterMade || typeof f.masterMade!=='object') f.masterMade = {}; return f.masterMade; }
function mtActiveClients(){ return arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage) && c.status!=='paused'; }); }
function mtTouchedThisWeek(c){ const wk = thisWeekKey(); return arr(c.touches).some(function(t){ return startOfWeekStr(t)===wk; }); }
function mtDelivProgress(c){
  const ds = arr(c.deliverables).filter(function(d){ return d.recurring || d.weeklyTarget; });
  let done = 0, need = 0; ds.forEach(function(d){ const n = d.weeklyTarget || 1; need += n; done += Math.min(n, deliverableWeekCount(d)); });
  return {done:done, need:need, has:ds.length > 0};
}
function mtTitle(t){
  const m = t.master; if(!m) return t.title;
  if(m.kind==='care'){ const cs = mtActiveClients(), left = cs.filter(function(c){ return !mtTouchedThisWeek(c); }); return 'Check in with every client ('+(cs.length - left.length)+'/'+cs.length+')'; }
  const c = arr(state.business.clients).find(function(x){ return x.id===m.clientId; }), p = c ? mtDelivProgress(c) : {done:0, need:0};
  return 'Deliverables for '+(c ? (c.business || c.name) : 'a client')+' ('+p.done+'/'+p.need+')';
}
function mtDoneNow(t){
  const m = t.master; if(!m) return false;
  if(m.kind==='care'){ const cs = mtActiveClients(); return cs.length > 0 && cs.every(mtTouchedThisWeek); }
  const c = arr(state.business.clients).find(function(x){ return x.id===m.clientId; }); if(!c) return false;
  const p = mtDelivProgress(c); return p.need > 0 && p.done >= p.need;
}
function mtThisWeek(){ const wk = thisWeekKey(); return state.tasks.items.filter(function(t){ return t.master && t.master.week===wk; }); }
let mtBusy = false;
function masterTasksSync(){
  if(mtBusy || !state || !state.tasks) return; mtBusy = true;
  try{
    const wk = thisWeekKey(), made = mtStore(), end = addDays(wk, 6), cs = mtActiveClients();
    let changed = false;
    const make = function(key, master, title){
      if(made[key]) return;
      made[key] = 1; changed = true;
      state.tasks.items.push({id:uid(), title:title, client:master.clientId || 'personal', clients:master.clientId ? [master.clientId] : [], priority:'med', deadline:end, notes:'', status:'backlog', createdAt:todayStr(), completedAt:null, master:master});
    };
    if(cs.length) make(wk+':care', {kind:'care', week:wk}, 'Check in with every client');
    cs.forEach(function(c){ if(mtDelivProgress(c).has) make(wk+':deliv:'+c.id, {kind:'deliv', week:wk, clientId:c.id}, 'Deliverables for '+(c.business || c.name)); });
    // keep titles current, and finish the ones that are done by themselves
    mtThisWeek().forEach(function(t){
      const title = mtTitle(t); if(t.title!==title){ t.title = title; changed = true; }
      if(t.status!=='done' && mtDoneNow(t)){ t.status = 'done'; t.completedAt = todayStr(); changed = true; }
    });
    // last week's that were never touched quietly retire (they're history, not clutter)
    state.tasks.items.forEach(function(t){ if(t.master && t.master.week < wk && t.status!=='done' && !t.master.retired){ t.master.retired = true; t.status = 'done'; t.completedAt = addDays(t.master.week, 6); t.missed = true; changed = true; } });
    // (old flags beyond a few weeks go)
    Object.keys(made).forEach(function(k){ if(k.slice(0, 10) < addDays(wk, -35)) delete made[k]; });
    if(changed){ persist('tasks'); persist('focus'); }
  }finally{ mtBusy = false; }
}
afterRenderHooks.push(function(){ masterTasksSync(); });
// finishing the check-in batch yourself: everyone not yet touched this week gets one touch
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='care'){
      const left = mtActiveClients().filter(function(c){ return !mtTouchedThisWeek(c); });
      left.forEach(function(c){ const x = crmFind('client', c.id); if(!x) return; if(!Array.isArray(x.touches)) x.touches = []; x.touches.push(todayStr()); if(!Array.isArray(x.touchpoints)) x.touchpoints = []; x.touchpoints.push({id:uid(), type:x.lastTouchType || 'text', date:todayStr(), note:'Weekly check-in', ts:Date.now()}); });
      if(left.length){ persist('business'); setTimeout(function(){ showToast('Checked in with '+left.length+' client'+(left.length===1 ? '' : 's')+': a touch logged for each.', {icon:'&#128075;'}); }, 750); }
    }
    return base.apply(this, arguments);
  };
})(completeTask);
// the master badge on a task card
taskCard = (function(base){
  return function(t){
    const h = base.apply(this, arguments);
    if(!t || !t.master) return h;
    return h.replace('<div class="task-card-title">', '<div class="task-card-title"><span class="mt-badge" title="A weekly master task: it keeps itself up to date">&#10227; Weekly</span>');
  };
})(taskCard);
// the client card: what this week asks of them
crmCard = (function(base){
  return function(kind, x){
    const h = base.apply(this, arguments);
    if(kind!=='client' || !clientStageActive(x.stage)) return h;
    const touched = mtTouchedThisWeek(x), p = mtDelivProgress(x);
    const strip = '<div class="mt-strip"><span class="'+(touched ? 'is-done' : '')+'">'+(touched ? '&#10003;' : '&#9675;')+' Checked in</span>'+(p.has ? '<span class="'+(p.done >= p.need ? 'is-done' : '')+'">'+(p.done >= p.need ? '&#10003;' : '&#9675;')+' Deliverables '+p.done+'/'+p.need+'</span>' : '')+'</div>';
    return h.replace('<div class="crm-card-meta">', strip+'<div class="crm-card-meta">');
  };
})(crmCard);
// the master goal: client care this week
masterGoalDefs = (function(base){
  return function(){
    const out = base.apply(this, arguments), ts = mtThisWeek();
    if(ts.length) out.push({key:'care', icon:'&#129309;', label:'Client care this week', cur:ts.filter(function(t){ return t.status==='done'; }).length, target:ts.length, field:null, fmt:function(n){ return fmtGoalNum(n); }, suffix:'',
      src:'weekly master tasks', go:'goToClients', color:'#5BC0EB', color2:'#b8e6f7'});
    return out;
  };
})(masterGoalDefs);
masterTargetHtml = (function(base){
  return function(m){ if(m.key==='care') return '<span class="mg-target is-static">of '+m.target+' task'+(m.target===1 ? '' : 's')+'</span>'; return base.apply(this, arguments); };
})(masterTargetHtml);
// the Clients page card: has this client been checked in with this week
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    if(!clientStageActive(c.stage)) return h;
    const on = mtTouchedThisWeek(c);
    return h.replace('<div class="cc2-foot">', '<div class="cc2-foot"><span class="mt-chip'+(on ? ' is-done' : '')+'" title="This week’s check-in (the weekly master task)">'+(on ? '&#10003; Checked in' : '&#9675; Check in this week')+'</span>');
  };
})(clientCardV2);

// ---- Op's reads sit at the top of the page they're on, the same everywhere ----
const OP_TIP_RE = /<div class="op-tip"[^>]*>[\s\S]*?<\/span>(?:<button class="op-tip-r"[^>]*>[^<]*<\/button>)?<\/div>/;
renderBusinessOverview = (function(base){
  return function(){
    const h = base.apply(this, arguments), m = OP_TIP_RE.exec(h);
    if(!m) return h;
    return '<div class="op-tip-top">'+m[0]+'</div>'+h.replace(m[0], '');
  };
})(renderBusinessOverview);

// ---- standing with Op ----
// A score (0 to 100) for how things stand between you and Op lately, from the last two weeks:
//  • check-ins: a fair reason is fine; "not good enough" and no answer pull it down (fading with age)
//  • how productive you were when he looked in (the 1 to 5 he notes)
//  • this week's commitments: what was on today's list and got done
//  • work days on your deep-work target, the last seven days
// It's a Discipline sub-stat ("Standing with Op"), it's on his screen, and it sets the mood he
// checks in with: proud when you're solid, concerned when it's slipping, stern when it's bad.
function opStanding(){
  const today = todayStr(), from7 = addDays(today, -6), parts = [];
  const a = typeof acctScore==='function' ? acctScore() : null;
  const prods = typeof acct==='function' ? acct().log.filter(function(x){ return x.prod && x.date >= from7; }) : [];
  const prod = prods.length ? (prods.reduce(function(s, x){ return s + x.prod; }, 0)/prods.length - 1)/4 : null;
  const k = typeof opKeptWeek==='function' ? opKeptWeek() : {made:0, kept:0}, kept = k.made >= 2 ? k.kept/k.made : null;
  const target = state.standards.deepWorkTargetMinutes || 180;
  let on = 0, worked = 0; for(let i = 1; i <= 7; i++){ const d = addDays(today, -i); if(isDayOff(d)) continue; worked++; if(deepWorkMinutesFor(d) >= target) on++; }
  const deep = worked ? on/worked : null;
  const w = [[.35, a], [.2, prod], [.25, kept], [.2, deep]];
  let s = 0, ws = 0; w.forEach(function(p){ if(p[1]==null) return; s += p[0]*p[1]; ws += p[0]; });
  if(a!=null) parts.push('check-ins '+Math.round(a*100)); if(prod!=null) parts.push('productivity '+(prods.reduce(function(x, y){ return x + y.prod; }, 0)/prods.length).toFixed(1)+'/5');
  if(kept!=null) parts.push(k.kept+' of '+k.made+' kept this week'); if(deep!=null) parts.push(on+' of '+worked+' days on target');
  if(!ws) return null;
  const f = Math.max(0, Math.min(1, s/ws)), v = Math.round(f*100);
  return {f:f, v:v, label:v >= 80 ? 'Solid' : v >= 60 ? 'Good standing' : v >= 40 ? 'Slipping' : 'On thin ice', mood:v >= 80 ? 'proud' : v >= 60 ? null : v >= 40 ? 'concern' : 'stern', parts:parts};
}
// (Discipline gets it as a fourth sub-stat)
xpAttributes = (function(base){
  return function(ctx){
    const out = base.apply(this, arguments), st = opStanding(), D = out.DIS.subs;
    D.push({label:'Standing', v:st ? rate99(st.f) : null, note:st ? st.label+' · '+st.parts.join(', ') : 'Builds once Op has checked in on you'});
    const mix = function(parts){ let s = 0, w = 0; parts.forEach(function(p){ if(p[1]==null) return; s += p[0]*p[1]; w += p[0]; }); return w ? s/w : 0; };
    const dMix = mix(D.map(function(x, i){ return [[.2, .35, .25, .2][i], x.v==null ? null : (x.v-25)/75]; }));
    out.DIS.v = rate99(Math.pow(dMix, 0.8));
    const ovr = .3*out.BUS.v + .3*out.HLT.v + .2*out.DIS.v + .2*out.PER.v;
    out.OVR = ovr >= 99.999 ? 100 : Math.min(99, Math.floor(ovr));
    return out;
  };
})(xpAttributes);
// he checks in with that energy
acctSay = (function(base){
  return function(){
    const st = opStanding();
    // (only while a check-in is open and the moment hasn't set his mood already: a worried ping stays
    // worried, and once it's settled he goes back to white)
    if(st && st.mood && typeof opMood==='function' && acct().pending && !document.documentElement.hasAttribute('data-op-mood')) opMood(st.mood, 60000);
    return base.apply(this, arguments);
  };
})(acctSay);
// on his screen: a standing meter at the top of the accountability panel
opAccHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), st = opStanding();
    if(!st) return h;
    return '<div class="oa-stand is-'+(st.v >= 80 ? 'solid' : st.v >= 60 ? 'good' : st.v >= 40 ? 'slip' : 'thin')+'" title="'+escapeHtml(st.parts.join(' · '))+'"><div class="oa-stand-k"><span>Standing with Op</span><b>'+st.v+'</b></div><i><u style="width:'+st.v+'%"></u></i><small>'+st.label+'</small></div>'+h;
  };
})(opAccHtml);
// and he knows where you stand
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments), st = opStanding();
    if(Array.isArray(s) && st) s.push({type:'text', text:'His standing with you right now: '+st.v+'/100 ('+st.label+'; '+st.parts.join(', ')+'). Let it color how you talk to him: warm and proud when it’s solid, more pointed when it’s slipping. Don’t recite the number unless he asks.'});
    return s;
  };
})(aiSystem);

// ---- the Op bar (bottom left: Op's light, the app you're in, the session) gets the minute clock ----
// The "minutes" face: each minute of the hour fills its spot on the ring. Tap it for the time.
function opBarClockHtml(){
  const t = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
  return '<span class="ap-ck" title="'+t+'"><span class="ck ck-minutes ck-bar" data-style="minutes"><svg viewBox="0 0 120 120" aria-hidden="true">'+clockFaceSvg('minutes')+'</svg></span><b class="ap-ck-t">'+t+'</b></span>';
}
updateActivityPill = (function(base){
  return function(){
    base.apply(this, arguments);
    const el = document.getElementById('activityPill'); if(!el || state.profile.clockInBar===false) return;
    if(el.classList.contains('is-hidden')){ el.classList.remove('is-hidden'); el.dataset.cat = 'neutral'; el.dataset.state = 'clock'; if(!el.querySelector('.ap-ck') || el.children.length > 1){ el.innerHTML = opBarClockHtml(); el._html = el.innerHTML; } }
    else if(!el.querySelector('.ap-ck')) el.insertAdjacentHTML('afterbegin', opBarClockHtml());
    const tt = el.querySelector('.ap-ck-t'), now = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    if(tt && tt.textContent!==now) tt.textContent = now;
    if(typeof clockTick==='function') clockTick();
  };
})(updateActivityPill);
setInterval(function(){ try{ updateActivityPill(); }catch(e){} }, 20000);
ACTIONS.clockInBar = function(){ state.profile.clockInBar = state.profile.clockInBar===false; persist('profile'); playTick(); updateActivityPill(); renderView(); };
soundSettingsHtml = (function(base){
  return function(){
    const on = state.profile.clockInBar!==false;
    return base.apply(this, arguments).replace('<label class="ck-dock-sw"', '<label class="ck-dock-sw" title="The minute clock in the Op bar, bottom left"><span>Minute clock in the Op bar</span><button class="cx-switch'+(on ? ' is-on' : '')+'" data-action="clockInBar" role="switch" aria-checked="'+on+'"><i></i></button></label><label class="ck-dock-sw"');
  };
})(soundSettingsHtml);

// ---- when you can't get going: something to make starting feel possible ----
// In work hours, not locked in, nothing worked for the last 45 minutes and still short of today's
// target: a card at the top of Today, in Op's colors. It names the method built for exactly this
// (Pomodoro: "getting started on things you've been putting off"), reminds you what the work is
// for, and says how close one sprint gets you. One tap locks you in with it.
function stuckNow(){
  if(state.focus.activeSession || state.modes.active) return false;
  if(typeof workPhase!=='function' || workPhase()!=='work') return false;
  const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180;
  if(dw >= target) return false;
  const last = Math.max(state.focus.lastSessionEndedAt || 0, state.focus.lastManualStopAt || 0);
  if(last && Date.now() - last < 45*60000) return false;
  if(ui.stuckHideAt && Date.now() - ui.stuckHideAt < 90*60000) return false;
  return true;
}
function stuckCardHtml(){
  if(!stuckNow()) return '';
  const lines = ['Starting is the whole battle. Twenty-five minutes, then you’re allowed to stop.', 'You don’t need to feel like it. You need one sprint.', 'The hardest part is the first five minutes. Let’s just do those.'];
  const line = lines[Number(todayStr().replace(/-/g, '')) % lines.length];
  return '<div class="stuck"><i class="th-op-o"></i><span class="stuck-h op-says" title="Talk to Op">'+line+'</span>'+
    '<button class="op-btn" data-action="stuckGo">&#127813; Lock in for 25</button><button class="stuck-x" data-action="stuckLater" title="Not now">&#10005;</button></div>';
}
ACTIONS.stuckGo = function(){ ui.stuckHideAt = Date.now(); openLockSeq(); if(ui.lockSeq){ ui.lockSeq.method = 'pomodoro'; renderLockSeqInto(); } };
ACTIONS.stuckLater = function(){ ui.stuckHideAt = Date.now(); renderView(); };
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments), card = stuckCardHtml();
    if(!card) return h;
    return h.replace('<div class="today-panels', card+'<div class="today-panels');
  };
})(renderToday);

// ---- test mode and demo mode ----
// Test mode: every "test this" button in the app (ring the alarm now, test the voice…) is hidden
// unless it's on, and Settings → Connections & Data gets a test bench with all of them in one place.
// Demo mode: the app switches to its own copy of everything, filled with a made-up business, so you
// can show it off. Your real data isn't read or touched; turning it off brings you straight back.
const TEST_ACTIONS = ['opTest', 'testAlarmSound', 'wakeTestNow', 'wakeTestSoon', 'workTestNow'];
afterRenderHooks.push(function(){ document.body.classList.toggle('test-mode', !!(state.settings && state.settings.testMode)); document.body.classList.toggle('demo-mode', DEMO_ON); });
function testDemoHtml(){
  const t = !!state.settings.testMode;
  const tb = function(action, label, extra){ return '<button class="btn btn-sm tb" data-action="'+action+'"'+(extra||'')+'>'+label+'</button>'; };
  return '<div class="set-part" id="setPart-testdemo"><div class="set-part-h">Test &amp; demo</div><div class="card td-card">'+
    '<label class="ck-dock-sw"><span><b>Test mode</b><small>The test buttons (ring the alarm now, test Op’s voice…) only show while this is on, plus the test bench below.</small></span><button class="cx-switch'+(t ? ' is-on' : '')+'" data-action="testModeToggle" role="switch" aria-checked="'+t+'"><i></i></button></label>'+
    (t ? '<div class="test-bench">'+tb('wakeTestNow', '&#9200; Ring the wake alarm')+tb('wakeTestSoon', '&#9201; Wake alarm in 1 min')+tb('workTestNow', '&#128188; Ring the work alarm')+tb('opTest', '&#129302; Test Op’s voice')+tb('testAlarmSound', '&#128276; Alarm sound')+tb('tbCheckin', '&#128172; Op checks in now')+tb('tbStuck', '&#127813; Show the “can’t get going” card')+tb('tbMorning', '&#127749; Good morning')+'</div>' : '')+
    '<label class="ck-dock-sw" style="margin-top:14px;"><span><b>Demo mode</b><small>'+(DEMO_ON ? 'On: you’re looking at a made-up business. Your real account is untouched.' : 'Show the app off with a made-up business. Your real data stays exactly where it is.')+'</small></span><button class="cx-switch'+(DEMO_ON ? ' is-on' : '')+'" data-action="demoToggle" role="switch" aria-checked="'+DEMO_ON+'"><i></i></button></label>'+
  '</div></div>';
}
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.indexOf('id="setPart-updates"') >= 0 ? h.replace('<div class="set-part" id="setPart-updates">', testDemoHtml()+'<div class="set-part" id="setPart-updates">') : h;
  };
})(renderSettings);
ACTIONS.testModeToggle = function(){ state.settings.testMode = !state.settings.testMode; persist('settings'); playTick(); renderView(); };
ACTIONS.tbCheckin = function(){ if(typeof acctPing==='function'){ acctPing(); } };
ACTIONS.tbStuck = function(){ ui.stuckHideAt = 0; ui.stuckForce = true; ui.view = 'today'; renderView(); };
ACTIONS.tbMorning = function(){ if(ACTIONS.sleepGoodMorning) ACTIONS.sleepGoodMorning(); };
stuckNow = (function(base){ return function(){ if(ui.stuckForce && !state.focus.activeSession) return true; return base.apply(this, arguments); }; })(stuckNow);
ACTIONS.stuckLater = (function(base){ return function(){ ui.stuckForce = false; return base.apply(this, arguments); }; })(ACTIONS.stuckLater);
ACTIONS.demoToggle = function(){
  persistFlush();
  try{ if(DEMO_ON) localStorage.removeItem('opsdash-mode'); else localStorage.setItem('opsdash-mode', 'demo'); }catch(e){ showToast('Couldn’t switch modes.', {icon:'&#9888;'}); return; }
  fsVeil(function(){ location.reload(); }, 2000);
};
ACTIONS.demoExit = function(){ ACTIONS.demoToggle(); };
// the demo business: a few clients and leads, tasks, a month of work, goals, a little health and a journal
function demoSeed(){
  const T = todayStr(), d = function(n){ return addDays(T, n); }, now = Date.now();
  const p = state.profile; p.name = 'Alex'; p.businessName = 'Northwind Studio'; p.revenueGoalMonthly = 25000; p.goalWeight = 175; p.weeklyWorkoutTarget = 4; p.demoSeeded = true; p.onboarded = true;
  state.business.clients = [
    {id:'dc1', name:'Maya Chen', business:'Lumen Coffee', stage:'active', status:'active', mrr:4500, startDate:d(-120), createdAt:d(-120), touches:[d(-3)], deliverables:[{id:'dd1', title:'Reels', weeklyTarget:3, recurring:true, completedDates:[d(-1), d(-2)]}]},
    {id:'dc2', name:'Jordan Reyes', business:'Peak Fitness', stage:'active', status:'active', mrr:3200, startDate:d(-60), createdAt:d(-60), touches:[d(-9)], deliverables:[{id:'dd2', title:'Ad creatives', weeklyTarget:2, recurring:true, completedDates:[d(-1)]}]},
    {id:'dc3', name:'Sam Patel', business:'Harbor Dental', stage:'active', status:'active', mrr:2800, startDate:d(-30), createdAt:d(-30), touches:[d(-1)], deliverables:[]}
  ];
  state.business.pipeline = [
    {id:'dl1', name:'Riley Brooks', company:'Ember Bakery', stage:'new', value:2500, createdAt:d(-2)},
    {id:'dl2', name:'Chris Doyle', company:'Atlas Realty', stage:'contacted', value:4000, createdAt:d(-6), touchpoints:[{id:'t', type:'call', date:d(-4)}]},
    {id:'dl3', name:'Taylor Kim', company:'Bloom Florals', stage:'proposal', value:3000, createdAt:d(-12)}
  ];
  const tk = function(id, title, status, extra){ return Object.assign({id:id, title:title, client:'personal', clients:[], priority:'med', deadline:null, notes:'', status:status, createdAt:d(-3), completedAt:null}, extra||{}); };
  state.tasks.items = [
    tk('dt1', 'Edit Lumen launch reel', 'today', {clients:['dc1'], client:'dc1', deadline:d(1), priority:'high'}),
    tk('dt2', 'Send Atlas proposal', 'today', {deadline:d(0)}),
    tk('dt3', 'Plan next month’s content', 'backlog'),
    tk('dt4', 'Shoot B-roll for Peak', 'backlog', {clients:['dc2'], client:'dc2', deadline:d(3)}),
    tk('dt5', 'Invoice batch', 'done', {completedAt:d(-1)}),
    tk('dv1', 'How we tripled a café’s foot traffic', 'backlog', {isVideoIdea:true, contentRole:'business'}),
    tk('dv2', 'A day in the studio', 'backlog', {isVideoIdea:true, contentRole:'personal'})
  ];
  const sessions = []; for(let i = 1; i <= 28; i++){ if(i % 7===6) continue; const m = 150 + ((i*53) % 200); sessions.push({id:'ds'+i, type:'deep', date:d(-i), startedAt:now - i*86400000, endedAt:now - i*86400000 + m*60000, minutes:m, completedTasks:[], reviewed:true}); }
  state.focus.sessions = sessions;
  state.calendar.events = [{id:'de1', date:d(0), time:'15:00', title:'Call: Lumen Coffee'}, {id:'de2', date:d(2), time:'10:00', title:'Shoot day: Peak Fitness'}];
  state.goals.items = [{id:'dg1', label:'Run a half marathon', target:1, current:0}, {id:'dg2', label:'Read 12 books', target:12, current:7, unit:'books', deadline:'2026-12-31'}];
  if(Array.isArray(state.health.weightLog)) state.health.weightLog = [{date:d(-21), weight:184}, {date:d(-14), weight:182}, {date:d(-7), weight:180}, {date:d(0), weight:179}];
  if(state.journal && Array.isArray(state.journal.entries)) state.journal.entries = [{id:'dj1', date:d(-1), timestamp:now - 86400000, title:'Good day', text:'Closed the Harbor deal. Felt like the system is working.', type:'freeform'}];
  STATE_KEYS.forEach(function(k){ persist(k); });
}
afterRenderHooks.push(function(){
  if(!DEMO_ON) return;
  if(!state.profile.demoSeeded){ demoSeed(); setTimeout(renderView, 30); }
  if(!document.getElementById('demoBanner')){ const b = document.createElement('div'); b.id = 'demoBanner'; b.className = 'demo-banner'; b.innerHTML = '<span>&#127917; Demo mode &middot; a made-up business. Your real account is untouched.</span><button data-action="demoExit">Exit demo</button>'; document.body.appendChild(b); }
});

// ---- "Operator" gets an answer ----
// It only caught the name as the very first thing heard, so "…okay operator, what's up" (the mic
// keeps a running transcript) never matched, and it stopped listening whenever another window had
// focus. Now the name counts anywhere in what was just said (with the usual mishearings), and it
// listens whenever Operator's window is showing.
const HEY_ANY = /(?:^|[\s,.!?])(?:(?:hey|hi|yo|ok|okay)[\s,]+)?(?:operator|operater|operators|opperator|operate her|opera tor|op)\b[\s,.!?]*(.*)$/i;
heyQuietNow = function(){
  const m = state.modes && state.modes.active;
  if(OV.lastEnd && Date.now() - OV.lastEnd < 6000) return true;
  if(OV.qDuck) return true;
  return AI.listening || AI.busy || OV.speaking || OV.pending || document.hidden || (m && m.sleep) || (typeof inspBreathOn!=='undefined' && ui.inspBreath);
};
heyStart = function(){
  if(HW.on || HW.blocked || !heyOpOn() || heyQuietNow()) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR) return;
  const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3; rec.lang = navigator.language || 'en-US';
  HW.rec = rec; HW.on = true;
  rec.onresult = function(e){
    for(let i = e.resultIndex; i < e.results.length; i++){
      const r = e.results[i];
      HW.fails = 0;
      for(let a = 0; a < r.length; a++){
        const t = String(r[a].transcript||'').trim(), m = HEY_ANY.exec(t);
        if(!m) continue;
        // the full name (or "hey op") is enough mid-phrase; a bare "op" waits for the phrase to end
        if(!r.isFinal && !/operat|opera tor|operate her|hey|yo/i.test(t)) continue;
        heyHeard(r.isFinal ? m[1] : ''); return;
      }
    }
  };
  rec.onerror = function(e){ if(e && (e.error==='not-allowed' || e.error==='service-not-allowed')) HW.blocked = true; else if(e && e.error!=='no-speech' && e.error!=='aborted') HW.fails++; };
  rec.onend = function(){ HW.on = false; HW.rec = null; };
  try{ rec.start(); }catch(e){ HW.on = false; HW.rec = null; }
};

// ---- the work methods: each round and each break arrives with a moment ----
// A round ending, a break ending and the next round starting each get a full-screen beat (the ring and a
// line, the same family as the lock-in flash) and a system notification if Operator's in the background.
function roundFlash(kind, big, small){
  const d = document.createElement('div');
  d.className = 'lock-flash rf-'+kind;
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">'+big+'</div><div class="lf-t">'+small+'</div>';
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 2100);
  try{ if(document.hidden && 'Notification' in window && Notification.permission==='granted') new Notification('Operator', {body:(big+' · '+small).replace(/<[^>]+>|&[a-z#0-9]+;/g, '').trim()}); }catch(e){}
}
methodBreak = (function(base){
  return function(minutes){
    const was = state.focus.activeSession && !state.focus.activeSession.onBreak;
    base.apply(this, arguments);
    const as = state.focus.activeSession;
    if(was && as && as.onBreak){ const st = typeof methodState==='function' ? methodState() : null; roundFlash('break', '&#9749; Break', (st && st.round ? 'Round '+Math.max(1, st.round-1)+' done · ' : '')+minutes+' minutes off'); }
  };
})(methodBreak);
endBreakModeFromFocus = (function(base){
  return function(){
    const as = state.focus.activeSession, wasBreak = !!(as && as.onBreak);
    const r = base.apply(this, arguments);
    const st = typeof methodState==='function' ? methodState() : null;
    if(wasBreak && st && st.m && st.m.work) roundFlash('round', '&#128274; Round '+st.round, st.m.work+' minutes. Here we go.');
    return r;
  };
})(endBreakModeFromFocus);
// (a break's timer running out: a beat and a nudge to come back)
setInterval(function(){
  try{
    const as = state.focus.activeSession; if(!as || !as.breakOverAt) return;
    if(ui._boFlash===as.breakOverAt) return; ui._boFlash = as.breakOverAt;
    roundFlash('over', 'Break’s over', 'Lock back in when you’re back');
  }catch(e){}
}, 1500);

// ---- cursors you can't lose ----
// Settings → Look & Sound → Cursor: the system one, or a bigger one with a dark body and a white edge
// (shows on white and on dark), or Op's (a pointer with his glow). Applies everywhere in the app.
const CURSORS = [['system', 'System'], ['big', 'Big & clear'], ['op', 'Op']];
function cursorSvg(kind, hand){
  const glow = kind==='op' ? '<circle cx="6" cy="6" r="6" fill="#8fa0ff" opacity=".35"/>' : '';
  const arrow = '<path d="M5 3 L5 25 L11 19.5 L15 29 L19 27.3 L15 18 L23 18 Z" fill="#14161f" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>';
  const finger = '<path d="M11 4.5c0-1.5 3-1.5 3 0v9.2l1-.2c0-1.4 3-1.4 3 .1v.6c.4-1.3 3-1.1 3 .4v1c.5-1.1 3-.9 3 .6v6.3c0 4-2.5 6.5-6.5 6.5h-1.5c-2.6 0-4-1.3-5.4-3.5l-3.9-6c-.9-1.4.8-2.9 2.1-1.8L11 19Z" fill="#14161f" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'+glow+(hand ? finger : arrow)+'</svg>';
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'") '+(hand ? '11 4' : '5 3')+', '+(hand ? 'pointer' : 'auto');
}
function cursorApply(){
  const k = state.profile.cursor || 'system';
  let st = document.getElementById('cursorStyle');
  if(k==='system'){ if(st) st.remove(); return; }
  if(!st){ st = document.createElement('style'); st.id = 'cursorStyle'; document.head.appendChild(st); }
  const css = 'html, body, body *{ cursor:'+cursorSvg(k, false)+'; } a, button, [data-action], select, label, summary, .tab, .subtab, [role="button"], [role="switch"]{ cursor:'+cursorSvg(k, true)+' !important; } input[type="text"], input:not([type]), textarea, [contenteditable="true"]{ cursor:text !important; }';
  if(st.textContent!==css) st.textContent = css;
}
afterRenderHooks.push(cursorApply);
ACTIONS.cursorSet = function(el, e, id){ state.profile.cursor = id; persist('profile'); playTick(); cursorApply(); renderView(); };
soundSettingsHtml = (function(base){
  return function(){
    const k = state.profile.cursor || 'system';
    return base.apply(this, arguments)+'<div class="section"><div class="section-title">Cursor</div><div class="card"><div class="kpi-sub">Lose the pointer on a white background? Pick one that shows on anything.</div><div class="cur-picks">'+
      CURSORS.map(function(x){ return '<button class="cur-pick'+(x[0]===k ? ' is-on' : '')+'" data-action="cursorSet" data-id="'+x[0]+'"><span class="cur-prev">'+(x[0]==='system' ? '<span class="cur-sys">&#11009;</span>' : '<img alt="" src="'+cursorSvg(x[0], false).split('"')[1]+'">')+'</span><b>'+x[1]+'</b></button>'; }).join('')+'</div></div></div>';
  };
})(soundSettingsHtml);

// ---- what Op remembers that's really about the app ----
// Plenty of what you tell Op ("the + should ask first", "clients get checked in on weekly") isn't about you,
// it's how the app should work. Each memory has a "→ App" button that moves it to Op's ideas for the app (the
// list that feeds the next update); "Copy for the update" puts that list on the clipboard.
opSettingsHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<button class="op-mem-x" data-action="opMemDel" data-id="([^"]+)"/g, '<button class="op-mem-app" data-action="opMemToApp" data-id="$1" title="This is how the app should work: move it to Op’s ideas for the app">&rarr; App</button><button class="op-mem-x" data-action="opMemDel" data-id="$1"');
    if(arr(state.settings.opIdeas).length) h = h.replace(/(Op’s ideas for the app <span class="kpi-sub">\d+<\/span><\/label>)/, '$1<button class="btn btn-ghost btn-sm op-ideas-copy" data-action="opIdeasCopy">&#128203; Copy for the update</button>');
    return h;
  };
})(opSettingsHtml);
ACTIONS.opMemToApp = function(el, e, id){
  const m = opMemory().find(function(x){ return x.id===id; }); if(!m) return;
  if(!Array.isArray(state.settings.opIdeas)) state.settings.opIdeas = [];
  state.settings.opIdeas.push({id:uid(), text:m.text, at:Date.now(), from:'memory'});
  state.profile.opMemory = opMemory().filter(function(x){ return x.id!==id; });
  persist('settings'); persist('profile'); playTick(); renderView();
  showToast('Moved to Op’s ideas for the app.', {icon:'&#128161;'});
};
ACTIONS.opIdeasCopy = function(){
  const t = arr(state.settings.opIdeas).map(function(m){ return '- '+m.text; }).join('\n');
  try{ navigator.clipboard.writeText(t); showToast('Copied '+arr(state.settings.opIdeas).length+' ideas. Paste them into your next update request.', {icon:'&#128203;'}); }catch(e){}
};
// (and going forward he files them himself: how the app should work goes to the ideas, not his memory of you)
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:'Memory vs. the app: when he tells you how the APP should behave or look (a feature, a default, how a screen or a flow should work, how you should interact through the app), that is not a fact about him: log it with suggest_improvement so it goes into the next update, and do not save it as a memory. Save memories only for things about him, his life, his business and how he likes to be treated.'});
    return s;
  };
})(aiSystem);

// ---- the end of the day, round 36 ----
// • "Here's how today went": a card layout (the ring with a line about the day, stat tiles, the timeline in
//   its own card, done and tomorrow side by side).
// • That's the day: three real buttons (Clock back in · Edit wind-down · 🌙 Tmrw 10 AM to sleep).
// • The ideas panel becomes a deck you swipe through: tonight's ideas, a line to carry, the headlines,
//   the games, tomorrow. Same size; dots and arrows; it moves on by itself.
// • "I'm up" on the sleep screen opens Up early: the same calm page, morning version. How long until
//   the alarm would have gone off, the deck, and Good morning / Clock in / Back to sleep. No stats.
windRecapHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const d = workDayDate(), deep = deepWorkOn(d), target = state.standards.deepWorkTargetMinutes || 180;
    const line = deep >= target ? 'Target hit. That’s a real day.' : deep >= target*0.6 ? 'Solid. Close to the full target.' : deep > 0 ? 'Some real work in. Tomorrow’s a fresh run at it.' : 'A quiet one. Tomorrow’s a clean slate.';
    h = h.replace('<div class="wd-hero">', '<div class="wd-hero"><div class="wd-ringbox">').replace('<div class="wd-stats">', '<div class="wd-line">'+line+'</div></div><div class="wd-stats">');
    h = h.replace('<div class="wd-k">When you worked</div>', '<div class="wd-box wd-when"><div class="wd-k">When you worked</div>').replace('<div class="wd-cols">', '</div><div class="wd-cols">');
    return h;
  };
})(windRecapHtml);
// the deck
function restDeckSlides(early){
  const slides = [], today = todayStr();
  if(!early){
    const d = Number(today.replace(/-/g, '')), ideas = [0, 1, 2].map(function(i){ return EVENING_IDEAS[(d + i*2) % EVENING_IDEAS.length]; });
    slides.push({k:'&#127769; Tonight', html:ideas.map(function(x){ return '<div class="br-th"><span class="br-th-i">'+x[0]+'</span><div><b>'+x[1]+'</b><span>'+x[2]+'</span></div></div>'; }).join('')});
  }
  try{ const q = quoteOfDay(); if(q && q[0]) slides.push({k:'&#10024; Something to carry', html:'<div class="rd-q">&ldquo;'+escapeHtml(q[0])+'&rdquo;</div>'+(q[1] ? '<div class="rd-qa">'+escapeHtml(q[1])+'</div>' : '')}); }catch(e){}
  const nw = ui.morningNews && ui.morningNews.items ? ui.morningNews.items.slice(0, 4) : [];
  if(nw.length) slides.push({k:'&#128240; The headlines', html:nw.map(function(n){ return '<div class="rd-li">'+escapeHtml(typeof sayHeadline==='function' ? sayHeadline(n.title) : n.title)+'</div>'; }).join('')});
  try{ const st = typeof sportsTease==='function' ? sportsTease() : null; if(st && st.text) slides.push({k:'&#127936; The games', html:'<div class="rd-q is-sm">'+escapeHtml(st.text.replace(/\s*Want[^?]*\?\s*$/, ''))+'</div>'}); }catch(e){}
  const tom = early ? today : addDays(today, 1), ev = arr(state.calendar.events).filter(function(e){ return e.date===tom; }).sort(function(a, b){ return (a.time||'').localeCompare(b.time||''); });
  const plan = typeof todaysPlan==='function' && early ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : (state.focus.nightPlan && state.focus.nightPlan.date===tom ? arr(state.focus.nightPlan.taskIds).map(function(id){ return state.tasks.items.find(function(t){ return t.id===id; }); }).filter(Boolean) : []);
  if(ev.length || plan.length) slides.push({k:early ? '&#128197; Today' : '&#128197; Tomorrow', html:ev.slice(0, 3).map(function(e){ return '<div class="rd-li"><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b> '+escapeHtml(e.title)+'</div>'; }).join('')+plan.slice(0, 3).map(function(t, i){ return '<div class="rd-li"><b>'+(i+1)+'</b> '+escapeHtml(t.title)+'</div>'; }).join('')});
  if(early){ const w = typeof wxNow==='function' ? wxNow() : null, win = dayWindow(); slides.unshift({k:'&#9728;&#65039; Outside', html:'<div class="rd-q">'+(w ? w.temp+'&deg; and '+escapeHtml(wxLabel(w.code).toLowerCase())+'.' : SKY_META[skyPhase()].label+'.')+'</div><div class="rd-qa">Sunrise '+fmtMinOfDay(win.rise)+' &middot; sunset '+fmtMinOfDay(win.set)+'</div>'}); }
  return slides;
}
function restDeckHtml(early){
  const s = restDeckSlides(early); if(!s.length) return '';
  const i = ((ui.rdIdx||0) % s.length + s.length) % s.length;
  return '<div class="rd" data-n="'+s.length+'">'+
    '<button class="rd-nav is-prev" data-action="rdGo" data-id="-1" aria-label="Previous">&#8249;</button>'+
    '<div class="rd-view"><div class="rd-track" style="transform:translateX(-'+(i*100)+'%)">'+s.map(function(x){ return '<div class="rd-slide"><div class="rd-k">'+x.k+'</div><div class="rd-body">'+x.html+'</div></div>'; }).join('')+'</div></div>'+
    '<button class="rd-nav is-next" data-action="rdGo" data-id="1" aria-label="Next">&#8250;</button>'+
    '<div class="rd-dots">'+s.map(function(x, k){ return '<i class="'+(k===i ? 'is-on' : '')+'" data-action="rdTo" data-id="'+k+'"></i>'; }).join('')+'</div></div>';
}
function rdMove(to){
  const rd = document.querySelector('.rd'); if(!rd) return;
  const n = Number(rd.dataset.n)||1; ui.rdIdx = ((to % n) + n) % n; ui.rdAt = Date.now();
  const tr = rd.querySelector('.rd-track'); if(tr) tr.style.transform = 'translateX(-'+(ui.rdIdx*100)+'%)';
  rd.querySelectorAll('.rd-dots i').forEach(function(x, k){ x.classList.toggle('is-on', k===ui.rdIdx); });
}
ACTIONS.rdGo = function(el, e, id){ rdMove((ui.rdIdx||0) + Number(id)); };
ACTIONS.rdTo = function(el, e, id){ rdMove(Number(id)); };
setInterval(function(){ if(document.querySelector('.rd') && Date.now() - (ui.rdAt||0) > 9000){ rdMove((ui.rdIdx||0) + 1); } }, 3000);
(function(){ let x0 = null; document.addEventListener('pointerdown', function(e){ x0 = e.target.closest && e.target.closest('.rd-view') ? e.clientX : null; }, true);
  document.addEventListener('pointerup', function(e){ if(x0==null) return; const dx = e.clientX - x0; x0 = null; if(Math.abs(dx) > 40) rdMove((ui.rdIdx||0) + (dx < 0 ? 1 : -1)); }, true);
  document.addEventListener('wheel', function(e){ if(!(e.target.closest && e.target.closest('.rd-view')) || Math.abs(e.deltaX) < 25 || Date.now() - (ui.rdAt||0) < 500) return; rdMove((ui.rdIdx||0) + (e.deltaX > 0 ? 1 : -1)); }, {passive:true}); })();
// That's the day: real buttons, and the deck in place of the ideas list
renderWeekendOffView = (function(base){
  return function(){
    const m = state.modes.active;
    if(m && m.earlyUp) return upEarlyHtml();
    let h = base.apply(this, arguments);
    const i0 = h.indexOf('<div class="dayoff-ideas">'), i1 = h.indexOf('<div class="dayoff-row">');
    if(i0 > 0 && i1 > i0) h = h.slice(0, i0)+restDeckHtml(false)+h.slice(i1);
    h = h.replace('<div class="dayoff-row">', '<div class="dayoff-row is-btns">');
    return h;
  };
})(renderWeekendOffView);
// Up early: up before the alarm, not working yet
function upEarlyHtml(){
  const m = state.modes.active, name = (state.profile.name || '').split(' ')[0];
  const alarm = m.alarmTs || null, left = alarm ? Math.max(0, Math.round((alarm - Date.now())/60000)) : null;
  const leftLabel = left==null ? '' : left >= 60 ? Math.floor(left/60)+'h '+(left%60 ? left%60+'m' : '') : left+'m';
  const t = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
  return '<div class="np rest dayoff is-clockedout is-early rest-full">'+
    '<div class="dayoff-bg"></div>'+
    restTopHtml()+
    '<div class="dayoff-in">'+
      '<div class="dayoff-k">&#127749; Up early</div>'+
      '<h1 class="dayoff-h">Morning'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+
      '<div class="dayoff-cards">'+
        '<div class="dayoff-c"><b>'+t+'</b><span>right now</span></div>'+
        (alarm ? '<div class="dayoff-c"><b>'+leftLabel.trim()+'</b><span>before your '+fmtTimeShort(alarm)+' alarm (it won’t ring)</span></div>' : '<div class="dayoff-c"><b>No alarm</b><span>nothing was set for this morning</span></div>')+
        '<div class="dayoff-c"><b>'+fmtMinOfDay(dayWindow().rise)+'</b><span>sunrise</span></div>'+
      '</div>'+
      restDeckHtml(true)+
      '<div class="dayoff-row is-btns">'+
        '<button class="dayoff-back is-main is-sun" data-action="earlyGoodMorning">&#9728;&#65039; Good morning</button>'+
        '<button class="dayoff-back" data-action="clockIn">Clock in</button>'+
        '<button class="dayoff-back is-sleep" data-action="startSleepMode">&#127769; Back to sleep</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
ACTIONS.sleepUp = function(){
  const nw = typeof nextWake==='function' ? nextWake() : null, at = nw && nw.ts - Date.now() < 10*3600000 ? nw.ts : null;
  const r = sleepUpNow();
  fsVeil(function(){
    startMode('offtime', {clockedOut:true, earlyUp:true, alarmTs:at, note:'Up early'});
    ui.view = 'today'; ui.restFull = true; renderView();
  }, 220);
  const msg = (r && r.mins >= 60 ? 'You slept '+fmtDurationLabel(r.mins)+'. ' : '')+(r && r.alarm ? 'I let the '+fmt12Hour(r.alarm.time)+' alarm go.' : '');
  if(msg) setTimeout(function(){ showToast(msg.trim(), {icon:'&#127769;', duration:7000}); }, 350);
};
ACTIONS.earlyGoodMorning = function(){ const m = state.modes.active; if(m && m.earlyUp && typeof finishActiveMode==='function') finishActiveMode(true); ACTIONS.sleepGoodMorning(); };

// ---- Op's words are Op: click any of them and he's there ----
// His hello, his reads (the white tips), the "can't get going" line: tap the text and his screen opens.
document.addEventListener('click', function(e){
  const t = e.target; if(!t || !t.closest || t.closest('button, a, input, [data-action]')) return;
  const hit = t.closest('.op-says, .th-op-t, .op-tip-t'); if(!hit) return;
  if(typeof opfOpen==='function') opfOpen({});
}, true);

// ---- the Op bar, simplified: Op's light | one status dot | the app you're in ----
// Green: working (locked in, or on a work app in work hours). Red: in work hours and not working.
// Grey: outside work hours. Amber: on a break or at lunch. Nothing else lives here now (the time is
// top right with the music; the session's timer and controls are one tap away in the bar's menu).
function opBarStatus(){
  const s = state.focus.activeSession, app = currentForegroundApp(), ph = typeof workPhase==='function' ? workPhase() : 'off';
  if(s) return s.onBreak ? 'amber' : 'green';
  if(ph==='lunch' || ph==='break') return 'amber';
  if(ph!=='work') return 'grey';
  return app && activityCategory(app)==='work' ? 'green' : 'red';
}
const OB_LABEL = {green:'Working', red:'Not working', grey:'Off the clock', amber:'On a break'};
updateActivityPill = function(){
  const el = document.getElementById('activityPill'); if(!el) return;
  const st = state.settings.appTracking, app = (st && st.enabled!==false) ? currentForegroundApp() : null;
  const k = opBarStatus(), siteUnknown = app && BROWSER_APPS.indexOf(activityKey(app)) >= 0;
  el.classList.remove('is-hidden');
  el.dataset.ob = k; el.dataset.cat = app ? activityCategory(app) : 'neutral'; el.dataset.state = state.focus.activeSession ? (state.focus.activeSession.onBreak ? 'break' : 'locked') : 'free';
  const html = '<span class="ob-dot" title="'+OB_LABEL[k]+'"></span><span class="ap-name">'+escapeHtml(app || OB_LABEL[k])+'</span>'+(siteUnknown ? '<span class="ap-warn">?</span>' : '');
  if(el._html!==html){ el.innerHTML = html; el._html = html; }
  el.title = OB_LABEL[k]+(app ? ' · '+app+' ('+CAT_META[activityCategory(app)].label+')' : '')+' · click for the session and app settings';
};
soundSettingsHtml = (function(base){
  return function(){ return base.apply(this, arguments).replace(/<label class="ck-dock-sw" title="The minute clock in the Op bar[^"]*">[\s\S]*?<\/label>/, ''); };
})(soundSettingsHtml);
// the time sits top right with the music
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(state.profile.clockInDock) return h;
    const t = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    return h.replace(/^(<div class="md-in[^"]*">)/, '$1<span class="md-time">'+t+'</span>');
  };
})(dockHtml);
setInterval(function(){ try{ if(typeof dockRefresh==='function') dockRefresh(); }catch(e){} }, 15000);

// ---- while locked in, the Minimal view lives on Today (the overview) only ----
// Focus shows its full page and no Minimal button while you're locked in; Today gets the button in its
// locked-in header, and M works there.
renderFocus = (function(base){
  return function(){
    const as = state.focus.activeSession;
    if(!as) return base.apply(this, arguments);
    const keep = state.profile.lockedView; state.profile.lockedView = 'full';
    let h; try{ h = base.apply(this, arguments); } finally { state.profile.lockedView = keep; }
    return h.replace(/<span class="lv-corner is-focus">[\s\S]*?<\/button><\/span>/, '');
  };
})(renderFocus);
renderToday = (function(base){
  return function(){
    const as = state.focus.activeSession;
    if(as && !(state.modes.active && state.modes.active.type==='offtime') && lockedMinimal()) return renderLockedMinimal();
    const h = base.apply(this, arguments);
    if(!as) return h;
    return h.replace('<div class="locked-in-header">', '<div class="locked-in-header"><span class="lv-corner is-today">'+lockedViewBtnHtml()+'</span>');
  };
})(renderToday);
afterRenderHooks.push(function(){
  if(ui.view==='today' && state.focus.activeSession && lockedMinimal() && document.querySelector('#viewRoot .np-locked')) document.body.classList.add('np-on');
});
// M: on Today while locked in (Focus no longer takes it)
document.addEventListener('keydown', function(e){
  if(e.key!=='m' && e.key!=='M') return;
  if(e.metaKey || e.ctrlKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || (e.target && e.target.isContentEditable)) return;
  if(!state.focus.activeSession || document.querySelector('.overlay:not(.hidden)')) return;
  if(ui.view==='focus'){ e.stopImmediatePropagation(); return; }
  if(ui.view==='today'){ e.preventDefault(); e.stopImmediatePropagation(); ACTIONS.toggleLockedView(); }
}, true);

// ---- when Op does something for you, he doesn't pop up ----
// Logging a task, moving a client, setting a reminder: the work just happens, with a small notice in
// his colors (and it's on his screen's log). His screen only shows it if it's already open.
opfAction = (function(base){
  return function(text){
    if(typeof OPF!=='undefined' && OPF.open) return base.apply(this, arguments);
    const t = String(text||''); if(!t) return;
    if(typeof opChatLog==='function') opChatLog('act', t.charAt(0).toUpperCase()+t.slice(1));
    if(typeof tone==='function') try{ tone([988, 1319], 0.12, 0.05); }catch(e){}
    showToast(t.charAt(0).toUpperCase()+t.slice(1), {icon:'<i class="th-op-o op-note-o"></i>', duration:4500});
    const msg = document.querySelector('#activeToast .toast-msg'); if(msg) msg.insertAdjacentHTML('afterbegin', '<span class="op-note-k">Op</span> ');
    // (and a Mac notification when Operator isn't in front)
    try{ if(document.hidden && 'Notification' in window && Notification.permission==='granted') new Notification('Op', {body:t.charAt(0).toUpperCase()+t.slice(1)}); }catch(e){}
  };
})(opfAction);

// ---- the Op bar's Work / Not work is what drives auto lock-in and auto lock-out ----
// The dot follows the app: a work app is green (any hour), a not-work or unsorted one is red in work
// hours and grey after. Marking the app in front acts right away instead of waiting on the timers:
//   Work      → if you've already put the time in, the auto lock-in starts now (dated back);
//               otherwise the menu shows how far along it is.
//   Not work  → an automatic session that this app started is thrown out (it never was work, so no
//               XP); one that started on real work ends where the work stopped.
// Apps not sorted yet get a small "Work?" on the bar, and once a day, after a few minutes on one in
// work hours, a notice asks.
opBarStatus = function(){
  const s = state.focus.activeSession, app = currentForegroundApp(), ph = typeof workPhase==='function' ? workPhase() : 'off';
  if(s) return s.onBreak ? 'amber' : 'green';
  if(app && activityCategory(app)==='work') return 'green';
  if(ph==='lunch' || ph==='break') return 'amber';
  return ph==='work' ? 'red' : 'grey';
};
function autoLockProgress(){
  const st = state.settings.appTracking || {};
  if(st.enabled===false) return {off:'App tracking is off'};
  if(st.autoLockIn===false) return {off:'Auto lock-in is off in Settings'};
  if(state.focus.activeSession) return null;
  const why = autoLockInBlockedReason();
  if(why) return {off:({dayoff:'Paused: day off', mode:'Paused while a mode is on', cooldown:'Paused: you just locked out', rejected:'Paused half an hour: you said that wasn’t work'})[why] || 'Paused'};
  const need = autoThresholdMin(), ivs = state.appActivity.todayIntervals || [], last = ivs[ivs.length-1];
  if(!last || Date.now() - last.end > APP_ACTIVITY_GAP_MS) return {min:0, need:need};
  const s = autoWorkStretch(ivs); if(!s) return {min:0, need:need};
  const from = Math.max(s.start, autoLockInCountFrom({start:s.start}));
  return {min:autoWorkMsFrom(ivs, from)/60000, need:need};
}
function pillAutoHtml(app, cat){
  const s = state.focus.activeSession;
  if(s){
    if(!s.autoStarted || s.onBreak) return '';
    return '<div class="ap-auto is-on">Locked in automatically'+(s.autoApp ? ' on '+escapeHtml(s.autoApp) : '')+'. Mark it <b>Not work</b> and the session goes.</div>';
  }
  const p = autoLockProgress(); if(!p) return '';
  if(p.off) return '<div class="ap-auto is-off">'+escapeHtml(p.off)+'</div>';
  if(cat!=='work') return '<div class="ap-auto">'+(cat==='unsorted' ? 'Not sorted yet, so it can’t lock you in.' : 'Doesn’t count toward a lock-in.')+'</div>';
  const left = Math.max(1, Math.ceil(p.need - p.min)), f = clamp(p.min / p.need, 0, 1);
  return '<div class="ap-auto"><div class="ap-auto-row"><span>Auto lock-in in '+left+' min</span><button class="ap-auto-go" data-action="pillLockNow">Lock in now</button></div><div class="ap-auto-bar"><i style="width:'+Math.round(f*100)+'%"></i></div></div>';
}
renderPillMenu = function(){
  let m = document.getElementById('activityPillMenu');
  if(!ui.pillMenu){ if(m) m.remove(); return; }
  if(!m){ m = document.createElement('div'); m.id = 'activityPillMenu'; m.className = 'ap-menu'; document.body.appendChild(m); }
  const app = ui.pillMenu==='__none' ? null : ui.pillMenu, cat = app ? activityCategory(app) : null, s = state.focus.activeSession;
  const status = s ? '<div class="ap-status'+(s.onBreak?' is-break':'')+'">'+
      (s.onBreak ? '<div class="ap-st-k">&#9749; On break</div><div class="ap-st-v">'+(s.breakEndsAt ? formatElapsed(Math.max(0, s.breakEndsAt-Date.now()))+' left' : 'no timer')+'</div>'+
          '<div class="ap-st-acts">'+(s.breakEndsAt ? '<button class="btn btn-ghost btn-sm" data-action="extendBreak" data-minutes="5">+5 min</button>' : '')+'<button class="btn btn-primary btn-sm" data-action="endBreakModeFromFocus">Back to it</button></div>'
        : '<div class="ap-st-k">&#128274; Locked in'+(s.method && LOCK_METHODS[s.method.id] && s.method.id!=='block' ? ' &middot; '+LOCK_METHODS[s.method.id].label : '')+'</div><div class="ap-st-v">'+formatElapsed(Date.now()-s.startedAt)+(s.plannedMinutes ? ' <small>of '+fmtDurationLabel(s.plannedMinutes)+'</small>' : '')+'</div>'+
          '<div class="ap-st-acts"><button class="btn btn-ghost btn-sm" data-action="openBreakNotePrompt">&#9749; Break</button><button class="btn btn-ghost btn-sm" data-action="openStopFocus">Lock out</button></div>')+
    '</div>' : '';
  const browser = app && BROWSER_APPS.indexOf(activityKey(app)) >= 0;
  const body = !app ? '<div class="ap-menu-title">Nothing in front right now</div>'
    : browser ? '<div class="ap-menu-title">'+escapeHtml(app)+'</div><div class="ap-menu-hint" style="margin-top:0;">Can’t see which website is open'+
        tip('So it can’t tell YouTube from work. '+(activityKey(app)==='firefox' ? 'Operator reads Firefox’s address bar through Accessibility: System Settings → Privacy & Security → Accessibility → turn on Operator, then reopen it. If it still can’t, open about:config in Firefox and set accessibility.force_disabled to 0. (Until then it guesses from the page title: YouTube, Netflix, Docs and so on.)' : 'On your Mac: System Settings → Privacy & Security → Automation → Operator → turn on '+app+'. Then reopen Operator.'))+'</div>'
    : '<div class="ap-menu-title"><span class="ap-mdot is-'+cat+'"></span>'+escapeHtml(app)+'</div>'+
      '<div class="ap-seg is-wide">'+['work','other'].map(function(c){ return '<button class="ap-seg-btn'+(cat===c?' is-on':'')+'" data-action="pillSetCat" data-id="'+c+'">'+CAT_META[c].label+'</button>'; }).join('')+'</div>'+
      pillAutoHtml(app, cat);
  m.innerHTML = status+body+'<button class="ap-menu-link" data-action="goToActivitySettings">All apps &amp; sites &rarr;</button>';
};
function autoSessionThrowOut(msg){
  const a = state.focus.activeSession; if(!a) return;
  state.focus.activeSession = null;
  state.focus.lastSessionEndedAt = Date.now();
  autoLockInMeta = {app:null, intervalStart:null};
  persist('focus'); renderView();
  showToast(msg, {icon:'&#128465;', duration:5000});
}
ACTIONS.pillSetCat = (function(base){
  return function(el, e, id){
    const app = ui.pillMenu; base.apply(this, arguments);
    if(!app || app==='__none') return;
    const s = state.focus.activeSession;
    if(id==='other' && s && s.autoStarted && !s.onBreak){
      const ivs = state.appActivity.todayIntervals || [], lw = lastWorkActivityEnd(ivs, s.startedAt, false);
      if(activityKey(s.autoApp)===activityKey(app) || !lw || lw - s.startedAt < 60000) autoSessionThrowOut('Thrown out: '+app+' isn’t work, so that session never counted.');
      else { autoEndFocusSession(Math.max(lw, s.startedAt + 60000)); autoLockInMeta = {app:null, intervalStart:null}; }
    } else if(id==='work' && !s){
      if(state.focus.autoRejectedAt) state.focus.autoRejectedAt = null;   // you've said it is work now
      checkAutoLockIn();
    }
    renderPillMenu(); updateActivityPill();
  };
})(ACTIONS.pillSetCat);
ACTIONS.pillLockNow = function(){
  const ivs = state.appActivity.todayIntervals || [], st = autoWorkStretch(ivs);
  ui.pillMenu = null; renderPillMenu();
  const staged = ui.stagedTaskId; ui.stagedTaskId = null; ui.currentTaskId = null; ui.currentTaskStartedAt = null;
  startFocus(null); ui.stagedTaskId = staged;
  const a = state.focus.activeSession, last = ivs[ivs.length-1];
  if(a){ a.autoStarted = true; a.noTask = true; a.autoApp = last ? last.app : null; if(st) a.startedAt = Math.max(st.start, autoLockInCountFrom({start:st.start})); }
  persist('focus'); renderView(); updateActivityPill();
};
// the bar: an unsorted app gets a small "Work?"
updateActivityPill = (function(base){
  return function(){
    base.apply(this, arguments);
    const el = document.getElementById('activityPill'); if(!el) return;
    const st = state.settings.appTracking, app = (st && st.enabled!==false) ? currentForegroundApp() : null;
    const ask = app && activityCategory(app)==='unsorted' && BROWSER_APPS.indexOf(activityKey(app)) < 0;
    const has = !!el.querySelector('.ap-ask');
    if(ask && !has){ el.insertAdjacentHTML('beforeend', '<span class="ap-ask">Work?</span>'); el._html = null; }
    else if(!ask && has){ el.querySelector('.ap-ask').remove(); el._html = null; }
  };
})(updateActivityPill);
// once a day per app: a few minutes on something unsorted in work hours, not locked in → ask
// (in an automatic session it asks after a minute, any hour: if it's work, the session keeps going
// instead of ending a couple of minutes later)
function unsortedNudge(){
  const st = state.settings.appTracking; if(!st || st.enabled===false) return;
  const s = state.focus.activeSession, inAuto = !!(s && s.autoStarted && !s.onBreak);
  if(s && !inAuto) return;
  if(!inAuto && (typeof workPhase==='function' ? workPhase() : 'off')!=='work') return;
  const ivs = state.appActivity.todayIntervals || [], last = ivs[ivs.length-1];
  if(!last || Date.now() - last.end > APP_ACTIVITY_GAP_MS) return;
  const app = last.app, k = activityKey(app);
  if(activityCategory(app)!=='unsorted' || BROWSER_APPS.indexOf(k) >= 0) return;
  if(last.end - last.start < (inAuto ? 60000 : 3*60000)) return;
  const asked = st.askedSort || (st.askedSort = {});
  if(asked[k]===todayStr()) return;
  asked[k] = todayStr(); persist('settings');
  showToast(inAuto ? 'Is '+app+' work? If not, this session wraps up in a couple of minutes.' : 'Is '+app+' work? Mark it and I’ll lock you in when you’re on it.', {icon:'<i class="th-op-o op-note-o"></i>', actionLabel:'It’s work', actionAction:'sortAsWork', actionId:app, duration:inAuto ? 90000 : 12000});
}
ACTIONS.sortAsWork = function(el, e, id){ if(!id) return; setActivityCategory(id, 'work'); state.focus.autoRejectedAt = null; dismissToast(); checkAutoLockIn(); updateActivityPill(); playTick(); };
setInterval(function(){ try{ if(state && state.settings) unsortedNudge(); }catch(e){} }, 30000);

// ---- review pass: one number in one place ----
// • Today's Standard: "1h 10m / 3h deep work" (it said the same number twice: "1.2h / 3.0h (1h 10m)").
// • The week's circles say 0h, not 0, and a past day with nothing logged says so (not "in progress").
// • Client cards: the weekly check-in chip says what's due, so "touch in 7d" next to it goes (an
//   overdue touch still shows). The Clients row counts this week's check-ins instead of a second
//   "to reach out to" count.
// • Outreach: the "N touches" badge repeated "people reached".
// • Analytics → Today: the cards on top already have deep work, workouts and the streak lives on
//   Today; the Deep Work card shows your best hour instead, and the day's tiles keep only what
//   isn't above (shooting, other).
// • The time is top right; Calendar has its own big clock, so the small one steps aside there.
fmtH = function(m){ if(!m) return '0h'; const h = m/60; return h >= 10 ? Math.round(h)+'h' : h >= 1 ? (Math.round(h*10)/10)+'h' : m+'m'; };
streakWorkHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/title="([A-Z][a-z]{2}) · 0m worked · in progress"/g, function(all, d){
      return weekdayShort(todayStr())===d ? all : 'title="'+d+' · nothing logged"';
    });
  };
})(streakWorkHtml);
deepWorkChipHtml = (function(base){
  return function(){
    const mins = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180;
    return base.apply(this, arguments).replace(/>[^<>]*? deep work \([^)]*\)<\/span>$/, '>'+fmtDurationLabel(mins)+' / '+fmtDurationLabel(target)+' deep work</span>');
  };
})(deepWorkChipHtml);
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    if(!clientStageActive(c.stage) || h.indexOf('mt-chip') < 0) return h;
    return h.replace(/<span class="crm-due ">touch in \d+d<\/span>/, '');
  };
})(clientCardV2);
renderClientsHome = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const act = crmList('client').filter(function(c){ return clientStageActive(c.stage); });
    if(!act.length) return h;
    const n = act.filter(mtTouchedThisWeek).length;
    return h.replace(/<div class="cc2-stat( is-warn)?"><div class="cc2-stat-v">\d+<\/div><div class="cc2-stat-k">to reach out to<\/div><\/div>/,
      '<div class="cc2-stat'+(n >= act.length ? ' is-good' : '')+'"><div class="cc2-stat-v">'+n+'<small>/'+act.length+'</small></div><div class="cc2-stat-k">checked in this week</div></div>');
  };
})(renderClientsHome);
renderBusinessOverview = (function(base){
  return function(){ return base.apply(this, arguments).replace(/(<span>Outreach this week<\/span>)<span class="hq-count">\d+ touch(?:es)?<\/span>/, '$1'); };
})(renderBusinessOverview);
analyticsOverviewHtml = (function(base){
  return function(r){
    const h = base.apply(this, arguments);
    if(r!=='today' && r) return h;
    // the hour you got the most deep work in today
    const today = todayStr(), hours = []; for(let i = 0; i < 24; i++) hours.push(0);
    const add = function(s, e){ for(let i = 0; i < 24; i++){ const hs = localTs(today, pad2(i)+':00'), ov = Math.min(e, hs+3600000) - Math.max(s, hs); if(ov > 0) hours[i] += ov/60000; } };
    state.focus.sessions.filter(function(s){ return s.date===today && sessionType(s)==='deep' && s.endedAt > s.startedAt; }).forEach(function(s){ add(s.startedAt, s.endedAt); });
    const as = state.focus.activeSession; if(as && !as.onBreak && sessionType(as)==='deep') add(as.startedAt, Date.now());
    let bi = -1, bm = 0; hours.forEach(function(m, i){ if(m > bm){ bm = m; bi = i; } });
    const lbl = bi < 0 ? '-' : ((bi % 12) || 12)+(bi < 12 ? 'am' : 'pm');
    return h.replace(/<div class="an-tile">(?:(?!<div class="an-tile">)[\s\S])*?days in a row[\s\S]*?<\/div><\/div>/, function(){
      return anTile('Best hour', lbl, bi < 0 ? '' : fmtDurationLabel(Math.round(bm))+' of deep work');
    });
  };
})(analyticsOverviewHtml);
renderAnalyticsToday = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<div class="mode-tile"><span class="mode-tile-dot"[^>]*><\/span><div class="mode-tile-val">[^<]*<\/div><div class="mode-tile-label">(?:Deep work|Working out)<\/div><\/div>/g, '');
  };
})(renderAnalyticsToday);
// hours read "3h" and "2.6h" (not "3.0h"), everywhere
fmtHours = function(mins){ return (Math.round((Number(mins)||0)/6)/10)+'h'; };
// the locked-in Deep work tile: the number once, with the target under it
deepWorkStatInnerHtml = function(mins){
  const target = state.standards.deepWorkTargetMinutes || 180;
  return '<div class="stat-chip-label">Deep work</div><div class="stat-chip-value">'+fmtDurationLabel(mins)+'</div><div class="kpi-sub">of '+fmtDurationLabel(target)+'</div>';
};
// locked in but on a not-work app: the dot goes red and the bar says the time isn't counting
opBarStatus = (function(base){
  return function(){
    const s = state.focus.activeSession, app = currentForegroundApp();
    if(s && !s.onBreak && app && activityCategory(app)==='other') return 'red';
    return base.apply(this, arguments);
  };
})(opBarStatus);
updateActivityPill = (function(base){
  return function(){
    base.apply(this, arguments);
    const el = document.getElementById('activityPill'); if(!el) return;
    const s = state.focus.activeSession, app = currentForegroundApp();
    const off = !!(s && !s.onBreak && app && activityCategory(app)==='other'), has = !!el.querySelector('.ap-off');
    if(off && !has){ el.insertAdjacentHTML('beforeend', '<span class="ap-off">not counting</span>'); el._html = null; }
    else if(!off && has){ el.querySelector('.ap-off').remove(); el._html = null; }
    if(off) el.title = 'Locked in, but '+app+' is marked Not work: this time isn’t counted as deep work (click to change)';
  };
})(updateActivityPill);

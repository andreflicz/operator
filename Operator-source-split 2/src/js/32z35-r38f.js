// ============ ROUND 38f ============
// • The sidebar only steps aside when a full-screen view is really on screen (it used to vanish on Focus
//   while you were locked in with the minimal view chosen).
// • The minimal views: Full view and Player/Cockpit are small links on the panel, not in the corners.
// • Goals: the master goals sit in Master / This month / This week, and Customize picks which show and
//   sets their targets. Big goals you set are measured against the target (not from where you started).
//   A goal of your own needs no number, and the sheet's messages show above it.
// • Calendar: This week / This month fit their card (no scrolling; a "+N more" if it runs over), and a day
//   is green only when you beat your deep-work goal, fading the further back it is.
// • The work alarm always shows up: the full alarm, or (if you're already going, or something's open) a
//   pop-up. Op knows your alarms, and he never talks over one that's ringing.

// ---- the sidebar ----
afterRenderHooks.push(function(){
  if(!document.body.classList.contains('np-on')) return;
  if(!document.querySelector('#viewRoot .np, #viewRoot .rest-full')) document.body.classList.remove('np-on');
});

// ---- the minimal views: the switches live on the panel ----
function npViewLinksHtml(kind){
  const locked = kind==='locked';
  const sty = typeof lockedStyle==='function' ? lockedStyle() : 'player';
  return '<div class="np-views">'+
    '<button class="np-v" data-action="'+(locked ? 'toggleLockedView' : 'toggleFocusMinimal')+'" title="Back to the full page (M)">&#9638; Full view</button>'+
    (locked ? '<i></i><button class="np-v" data-action="lockedStyleSet" data-id="'+(sty==='cockpit' ? 'player' : 'cockpit')+'" title="Switch the look">'+(sty==='cockpit' ? '&#9654; Player' : '&#9680; Cockpit')+'</button>' : '')+
  '</div>';
}
function npMoveSwitches(h, kind){
  const tpl = document.createElement('template'); tpl.innerHTML = h;
  const root = tpl.content.firstElementChild; if(!root) return h;
  root.querySelectorAll('.np-top .lv-btn, .np-top .lv-corner').forEach(function(e){ e.remove(); });
  const links = document.createElement('template'); links.innerHTML = npViewLinksHtml(kind);
  const spot = root.querySelector('.ckx-l') || root.querySelector('.np-meta') || root.querySelector('.hm-acts, .hm-btns') || root.querySelector('.np-main');
  if(kind==='home'){
    const ref = root.querySelector('[data-action="clockOut"]');
    const holder = ref ? ref.parentElement : null;
    if(holder && holder.parentElement){ holder.parentElement.insertBefore(links.content.firstElementChild, holder.nextSibling); return tpl.innerHTML; }
  }
  if(spot) spot.appendChild(links.content.firstElementChild);
  return tpl.innerHTML;
}
renderLockedMinimal = (function(base){ return function(){ return npMoveSwitches(base.apply(this, arguments), 'locked'); }; })(renderLockedMinimal);
renderFocusMinimal = (function(base){ return function(){ return npMoveSwitches(base.apply(this, arguments), 'home'); }; })(renderFocusMinimal);

// ---- goals ----
// a big one you set is measured against its target (MRR 10.5k of 20k is 52%, not "0% since you set it");
// weight still counts from where you started, since down is the way
goalPct = (function(base){
  return function(g){
    if(g && g.master && g.autoTrack && g.autoTrack!=='weight' && g.target > 0){
      const cur = goalLiveCurrent(g); return cur==null ? 0 : clamp(cur/g.target*100, 0, 100);
    }
    return base.apply(this, arguments);
  };
})(goalPct);
const MG_PERIOD = {mrr:'master', weight:'master', streak:'master', workouts:'week', deep:'week', care:'week'};
function mgHidden(){ const h = state.profile.mgHide; return h && typeof h==='object' ? h : {}; }
// one monthly ring of the app's own: new clients this month (shown in This month; it pays nothing extra)
function mgMonthlyDefs(){
  const p = state.profile, mk = thisMonthKey();
  const n = arr(state.business && state.business.clients).filter(function(c){ return monthKeyOf(c.startDate || c.createdAt || '')===mk; }).length;
  const target = Number(p.newClientsGoalMonthly) || Number(state.standards && state.standards.newClientsPerMonth) || 2;
  return [{key:'newclients', icon:'&#129309;', label:'New clients this month', cur:n, target:target, field:'newClientsGoalMonthly', fmt:function(x){ return fmtGoalNum(x); }, suffix:'', src:'clients you started this month', go:'goToClients', color:'#5BC0EB', color2:'#b8e6f7'}];
}
function mgSectionHtml(title, cards){
  if(!cards.length) return '';
  return '<div class="gx-sec-h">'+title+'</div>'+cards.join('');
}
renderGoalsTab = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const hide = mgHidden(), defs = masterGoalDefs(), mine = arr(state.goals && state.goals.items).filter(function(g){ return g.master && !g.tier; });
    const vis = function(m){ return !hide[m.key]; };
    const hero = defs[0] && vis(defs[0]) ? masterHeroHtml(defs[0]) : '';
    const master = defs.slice(1).filter(function(m){ return (MG_PERIOD[m.key] || 'master')==='master' && vis(m); }).map(function(m){ return masterRingHtml(m, false); })
      .concat(mine.filter(function(g){ return !hide['g:'+g.id]; }).map(userMasterRingHtml));
    const month = mgMonthlyDefs().filter(vis).map(function(m){ return masterRingHtml(m, false).replace(/<span class="mg-xp[\s\S]*?<\/span>/, ''); });
    const week = defs.filter(function(m){ return MG_PERIOD[m.key]==='week' && vis(m); }).map(function(m){ return masterRingHtml(m, false); });
    let rings = mgSectionHtml('Master', master)+mgSectionHtml('This month', month)+mgSectionHtml('This week', week);
    const cust = '<button class="gx-cust" data-action="mgCustomize" title="Pick which master goals show and set their targets">&#9881;&#65038; Customize</button>';
    rings = rings ? rings.replace(/(<div class="gx-sec-h">[^<]*)<\/div>/, '$1'+cust+'</div>') : '<div class="gx-sec-h">'+cust+'</div><div class="gx-none">Every master goal is hidden. Customize brings them back.</div>';
    const top = '<div class="gx-top'+(hero ? '' : ' no-hero')+'">'+hero+'<div class="gx-rings is-grouped">'+rings+'</div></div>';
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const old = tpl.content.querySelector('.gx-top');
    if(!old) return h;
    const nt = document.createElement('template'); nt.innerHTML = top;
    old.replaceWith(nt.content.firstElementChild);
    return tpl.innerHTML;
  };
})(renderGoalsTab);
// (a ring that has no field of its own to edit uses the profile key the def names)
ACTIONS.saveMasterTarget = (function(base){
  return function(el, e, id){
    if(id==='newclients'){ const i = document.getElementById('mgEdit-'+id); const v = i ? Number(i.value) : NaN; if(v > 0){ state.profile.newClientsGoalMonthly = v; persist('profile'); } ui.editMaster = null; renderView(); return; }
    return base ? base.apply(this, arguments) : undefined;
  };
})(ACTIONS.saveMasterTarget);
// Customize: show/hide, the target, and which group it's in
function mgCustomizeHtml(){
  const hide = mgHidden(), defs = masterGoalDefs().concat(mgMonthlyDefs()), mine = arr(state.goals && state.goals.items).filter(function(g){ return g.master && !g.tier && !g.done; });
  const per = {master:'Master', month:'This month', week:'This week'};
  const row = function(key, icon, label, period, target, unit, editable){
    const on = !hide[key];
    return '<div class="mgc-row'+(on ? '' : ' is-off')+'"><label class="ws-switch"><input type="checkbox" data-mgc="'+key+'"'+(on ? ' checked' : '')+'><span></span></label>'+
      '<span class="mgc-i">'+icon+'</span><span class="mgc-l"><b>'+escapeHtml(label)+'</b><small>'+per[period]+'</small></span>'+
      (editable ? '<label class="mgc-t"><input class="input" type="number" step="any" data-mgt="'+key+'" value="'+(target!=null ? target : '')+'" placeholder="target"><em>'+escapeHtml(unit||'')+'</em></label>' : '<span class="mgc-t is-ro">'+(target!=null ? fmtGoalNum(target)+' '+escapeHtml(unit||'') : '')+'</span>')+
    '</div>';
  };
  const groups = {master:[], month:[], week:[]};
  defs.forEach(function(m){
    const period = m.key==='newclients' ? 'month' : (MG_PERIOD[m.key] || 'master');
    const unit = m.key==='mrr' ? '$/mo' : m.key==='weight' ? 'lbs' : m.key==='deep' ? 'hours' : m.key==='streak' ? 'days' : '';
    groups[period].push(row(m.key, m.icon, m.label, period, m.target, unit, !!m.field && m.key!=='care'));
  });
  mine.forEach(function(g){ groups.master.push(row('g:'+g.id, (goalTracker(g) || {icon:'&#127919;'}).icon, g.label, 'master', g.target, (goalTracker(g) || {}).unit || g.unit || '', false)); });
  return '<button class="int-x hs-x" data-action="mgCustomizeClose" title="Close">&#10005;</button>'+
    '<div class="gs-h">Master goals</div><div class="mgc-sub">Pick which show on Goals and set their targets. Big goals of your own come from the + (Long-term).</div>'+
    ['master', 'month', 'week'].map(function(k){ return groups[k].length ? '<div class="mgc-g"><div class="mgc-gh">'+per[k]+'</div>'+groups[k].join('')+'</div>' : ''; }).join('')+
    '<div class="gs-foot"><button class="btn btn-ghost" data-action="mgAddBig">&#65291; A big goal of your own</button><button class="btn btn-primary" data-action="mgCustomizeClose">Done</button></div>';
}
ACTIONS.mgCustomize = function(){
  let o = document.getElementById('mgcSheet');
  if(!o){ o = document.createElement('div'); o.id = 'mgcSheet'; o.className = 'overlay gs-ov hidden'; o.innerHTML = '<div class="card gs mgc" id="mgcContent"></div>'; document.body.appendChild(o); }
  document.getElementById('mgcContent').innerHTML = mgCustomizeHtml();
  o.classList.remove('hidden');
};
ACTIONS.mgCustomizeClose = function(){ const o = document.getElementById('mgcSheet'); if(o) o.classList.add('hidden'); renderView(); };
ACTIONS.mgAddBig = function(){ ACTIONS.mgCustomizeClose(); ui.gsTrack = 'mrr'; openGoalSheet('long'); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.closest || !t.closest('#mgcSheet')) return;
  if(t.dataset.mgc){ const h = Object.assign({}, mgHidden()); if(t.checked) delete h[t.dataset.mgc]; else h[t.dataset.mgc] = true; state.profile.mgHide = h; persist('profile'); t.closest('.mgc-row').classList.toggle('is-off', !t.checked); playTick(); }
  if(t.dataset.mgt){
    const key = t.dataset.mgt, v = Number(t.value);
    const m = masterGoalDefs().concat(mgMonthlyDefs()).find(function(x){ return x.key===key; });
    if(m && m.field && (v > 0 || (key==='weight' && t.value!==''))){ state.profile[m.field] = v; persist('profile'); playTick(); }
  }
});
// a goal of your own: no number needed (it's then done or not done)
ACTIONS.gsSave = (function(base){
  return function(){
    if((ui.gsKind || 'week')==='long' && (!ui.gsTrack || ui.gsTrack==='own')){
      const t = document.getElementById('gsTarget'), l = document.getElementById('gsLabel');
      if(t && !(Number(t.value) > 0) && l && l.value.trim()) t.value = '1';
    }
    const n = state.goals.items.length, r = base.apply(this, arguments);
    if(state.goals.items.length > n){
      const g = state.goals.items[state.goals.items.length - 1];
      setTimeout(function(){ showToast('Added: '+goalTitle(g)+(g.tier ? ' (in '+(g.tier==='month' ? 'this month' : 'this week')+')' : g.master ? ' (in your master goals)' : ' (under Your goals)')+'.', {icon:'&#127919;'}); }, 300);
    } else if((ui.gsKind || 'week')!=='long'){
      const k = ui.gsKind || 'week', key = periodKey(k);
      if(checkedOut(k, key)) showToast('This '+(k==='month' ? 'month' : 'week')+' is checked out. Reopen it to add more.', {icon:'&#128274;'});
      else if(tierGoals(k, key).length >= 5) showToast('That’s five already. Finish one first.', {icon:'&#127919;'});
    }
    return r;
  };
})(ACTIONS.gsSave);

// ---- calendar: This week / This month fit their card ----
function cxFitTier(){
  const body = document.querySelector('.calx .cx-tierbody'); if(!body) return;
  const list = body.querySelector('.tg-list'); if(!list) return;
  const rows = Array.from(list.querySelectorAll('.tg-row')); rows.forEach(function(r){ r.style.display = ''; });
  const old = list.querySelector('.tg-more'); if(old) old.remove();
  if(body.scrollHeight <= body.clientHeight + 1) return;
  let hidden = 0;
  const more = document.createElement('button'); more.className = 'tg-more'; more.dataset.action = 'nav'; more.dataset.view = 'personal'; more.dataset.tab = 'goals';
  list.appendChild(more);
  // finished ones go first, then the open ones from the bottom
  const order = rows.filter(function(r){ return r.classList.contains('is-done'); }).reverse()
    .concat(rows.filter(function(r){ return !r.classList.contains('is-done'); }).reverse());
  for(let i = 0; i < order.length && body.scrollHeight > body.clientHeight + 1; i++){
    order[i].style.display = 'none'; hidden++;
    more.textContent = '+'+hidden+' more on Goals';
  }
  if(!hidden) more.remove();
}
afterRenderHooks.push(function(){ if(ui.view==='calendar') requestAnimationFrame(cxFitTier); });
window.addEventListener('resize', function(){ if(ui.view==='calendar') cxFitTier(); });
// green = a day you beat your deep-work goal; it fades the further back it is
cxMonthCardHtml = (function(base){
  return function(){
    const target = state.standards.deepWorkTargetMinutes || 180, today = todayStr();
    return base.apply(this, arguments)
      .replace(/(data-date="(\d{4}-\d{2}-\d{2})"[^>]*?style="--h:)[0-9.]+/g, function(m, pre, ds){
        if(ds > today) return pre+'0';
        const dw = deepWorkMinutesFor(ds), met = dw >= target;
        const age = Math.max(0, daysAgoFrom(ds));
        return pre+(met ? Math.max(0.18, 1 - age*0.028).toFixed(2) : '0');
      })
      .replace('<span><i class="is-heat"></i>Worked</span>', '<span title="Days you beat your deep-work goal; older ones fade"><i class="is-heat"></i>Hit your goal</span>');
  };
})(cxMonthCardHtml);

// ---- the work alarm always shows up ----
function workPopHtml(started){
  const w = workToday();
  return '<div class="wpop-card"><span class="wpop-i">&#128188;</span><div class="wpop-t"><b>'+(started ? 'Work hours start now' : 'Time to work')+'</b><small>'+fmt12Hour(w.start)+' to '+fmt12Hour(w.end)+(started ? ' &middot; you’re already at it' : '')+'</small></div>'+
    (started ? '' : '<button class="btn btn-primary btn-sm" data-action="workPopGo">Let’s go</button>')+'<button class="btn btn-ghost btn-sm" data-action="workPopX">'+(started ? 'Nice' : 'Later')+'</button></div>';
}
function workPopShow(started){
  let el = document.getElementById('workPop');
  if(!el){ el = document.createElement('div'); el.id = 'workPop'; el.className = 'wpop'; document.body.appendChild(el); }
  el.innerHTML = workPopHtml(started); el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in');
  try{ if(typeof playAlarmSound==='function') playAlarmSound(workCfg().sound || 'standard'); }catch(e){}
  try{ if('Notification' in window && Notification.permission==='granted') new Notification('Operator: work hours start now'); }catch(e){}
  clearTimeout(workPopShow._t); workPopShow._t = setTimeout(function(){ el.classList.remove('is-in'); }, 90000);
}
ACTIONS.workPopX = function(){ const el = document.getElementById('workPop'); if(el) el.classList.remove('is-in'); };
ACTIONS.workPopGo = function(){ ACTIONS.workPopX(); if(typeof clockIn==='function') clockIn({from:'workalarm'}); };
checkWorkAlarm = (function(base){
  return function(){
    const w = workToday();
    if(w.enabled && workDayToday()){
      const d = workDayState(), m = nowMin(), s = hmMin(w.start);
      if(s!=null && !d.rangAt && m >= s && m < s + 60){
        const brief = overlayOpen('wakeOverlay') && ui.wakeMode==='brief';
        const blocked = workStartedToday() || overlayOpen('planOverlay') || (overlayOpen('wakeOverlay') && !brief);
        if(blocked){ d.rangAt = Date.now(); persist('focus'); workPopShow(workStartedToday()); return; }
      }
    }
    return base.apply(this, arguments);
  };
})(checkWorkAlarm);

// ---- Op and alarms: he knows them, and he waits while one rings ----
function alarmRingingNow(){
  return overlayOpen('alarmOverlay') || !!(typeof wakeRing!=='undefined' && wakeRing && overlayOpen('wakeOverlay') && /^(ring|work|snooze)$/.test(ui.wakeMode || ''));
}
opSay = (function(base){
  return function(){
    const self = this, args = arguments;
    if(!alarmRingingNow()) return base.apply(self, args);
    return new Promise(function(res){
      const t0 = Date.now();
      const wait = setInterval(function(){
        if(alarmRingingNow() && Date.now() - t0 < 180000) return;
        clearInterval(wait);
        Promise.resolve(base.apply(self, args)).then(res, res);
      }, 700);
    });
  };
})(opSay);
aiContext = (function(base){
  return function(){
    let s = base.apply(this, arguments);
    const out = [];
    try{
      const wk = typeof wakeCfg==='function' ? wakeCfg() : null, nw = typeof nextWake==='function' ? nextWake() : null;
      if(wk && wk.enabled && nw) out.push('wake-up alarm '+fmt12Hour(nw.time)+(nw.date && nw.date!==todayStr() ? ' ('+nw.date+')' : ''));
      const w = workToday(); if(w.enabled && workDayToday()) out.push('work alarm '+fmt12Hour(w.start)+' (work hours to '+fmt12Hour(w.end)+')');
      arr(state.focus.alarms).filter(function(a){ return a.enabled; }).forEach(function(a){ out.push((a.label || 'alarm')+' '+fmt12Hour(a.time)); });
    }catch(e){}
    if(out.length) s += '\nAlarms: '+out.join('; ')+'.'+(alarmRingingNow() ? ' AN ALARM IS RINGING RIGHT NOW: wait until it’s dealt with.' : '');
    return s;
  };
})(aiContext);

// ---- Settings → Test & demo: no "can't get going" preview button (it only showed on Today, so it looked dead) ----
testDemoHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="btn btn-sm tb" data-action="tbStuck"[^>]*>[\s\S]*?<\/button>/, ''); }; })(testDemoHtml);

// ---- the mic, the way Discord does it: one steady stream, not in and out ----
// Every time a listener started and stopped, macOS switched the audio route (headphones drop into "call"
// quality, other apps get turned down) and back again. Now, while Operator is in front and Op's ear is on,
// one mic stream stays open (no voice processing, so nothing else gets ducked) and the listeners ride on
// it. The wake word keeps running while Op talks and just ignores what it hears, instead of stopping and
// restarting every few seconds. Click into another app and the mic is let go after a moment.
const MIC = {stream:null, want:false, offAt:0, opening:false};
function micHoldWanted(){
  const m = state.modes && state.modes.active;
  return state.profile.micSteady!==false && typeof heyOpOn==='function' && heyOpOn() && !document.hidden && document.hasFocus() && !(m && m.sleep);
}
function micHoldSync(){
  const want = micHoldWanted();
  if(want){
    MIC.offAt = 0;
    if(!MIC.stream && !MIC.opening && navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      MIC.opening = true;
      navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false, channelCount:1}})
        .then(function(s){ MIC.opening = false; if(!micHoldWanted()){ s.getTracks().forEach(function(t){ t.stop(); }); return; } MIC.stream = s; })
        .catch(function(){ MIC.opening = false; MIC.failedAt = Date.now(); });
    }
  } else if(MIC.stream){
    if(!MIC.offAt) MIC.offAt = Date.now() + 8000;
    else if(Date.now() >= MIC.offAt){ MIC.stream.getTracks().forEach(function(t){ t.stop(); }); MIC.stream = null; MIC.offAt = 0; }
  }
}
setInterval(function(){ try{ if(!MIC.failedAt || Date.now() - MIC.failedAt > 60000) micHoldSync(); }catch(e){} }, 1500);
window.addEventListener('focus', function(){ try{ micHoldSync(); }catch(e){} });
// the wake word: only hard stops stop it (app in the background, asleep, the main mic in use); while Op is
// talking or just asked something it keeps running and ignores what it hears
function heySoftQuiet(){ return !!((OV.lastEnd && Date.now() - OV.lastEnd < 9000) || OV.qDuck || AI.busy || OV.speaking || OV.pending); }
heyQuietNow = (function(base){
  return function(){
    if(state.profile.micSteady===false) return base.apply(this, arguments);
    const m = state.modes && state.modes.active;
    return !!(AI.listening || document.hidden || !document.hasFocus() || (m && m.sleep) || (typeof inspBreathOn!=='undefined' && ui.inspBreath));
  };
})(heyQuietNow);
heyHeard = (function(base){ return function(){ if(state.profile.micSteady!==false && heySoftQuiet()) return; return base.apply(this, arguments); }; })(heyHeard);

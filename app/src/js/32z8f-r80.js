// ================= Round 80 =================
// Streaks and Today's standard are one thing now. A streak's rules show up in Today's standard and count toward the
// day; rules can be checked by the app itself (work hours, a workout, two workouts, a calorie deficit, reaching out,
// the journal, a weigh-in). Master streaks run app-wide on their own: Work hours (your deep work target, nothing
// new to tick), Workout, Calorie deficit, Reach out, Journal. Health gets a calorie goal (what you burn, the deficit
// you want, the target that follows) and Op's tips. A schedule (Personal → Schedule): a week from a preset you
// can change, rules for saying yes or no, the month's rhythm, holidays and vacations for the year; it runs the
// wake-up and work alarms. The money check-ins get a cleaner layout.

// ================= what the app can check by itself =================
function r80Touched(d){
  return ['client', 'lead'].some(function(k){ return arr(crmList(k)).some(function(x){ return arr(x.touchpoints).some(function(t){ return t.date===d; }) || (k==='client' && arr(x.touches).indexOf(d) >= 0); }); });
}
function r80Cals(d){ return arr(state.health.calorieEntries).filter(function(c){ return c.date===d; }); }
function r80CalTarget(){ return Number(state.profile.calorieTarget) || 2000; }
// how much deep work a day asks for: your target on a work day, half on a light or shoot day, nothing on a day off
function r80Target(d){
  const base = Number(state.standards.deepWorkTargetMinutes) || 180;
  const day = typeof r80Day==='function' ? r80Day(d) : null;
  if(day){ if(!day.start) return 0; if(day.kind==='light' || day.kind==='shoot') return Math.round(base/2); return base; }
  return isDayOff(d) ? 0 : base;
}
const R80_TRACK = {
  work:{label:'Work hours', icon:'&#9201;', met:function(d){ const t = r80Target(d); return t > 0 ? standardWorkMinutesFor(d) >= t : null; }, sub:function(d){ const t = r80Target(d); return t ? fmtDurationLabel(Math.min(t, standardWorkMinutesFor(d)))+' of '+fmtDurationLabel(t) : 'a day off'; }},
  workout:{label:'Workout', icon:'&#128170;', met:function(d){ return trainedDoneFor(d); }},
  workout2:{label:'Two workouts', icon:'&#128170;', met:function(d){ return arr(state.health.gymLog).filter(function(g){ return g.date===d; }).length >= 2; }},
  deficit:{label:'Calorie deficit', icon:'&#129367;', met:function(d){ const e = r80Cals(d); if(!e.length) return false; return e.reduce(function(s, c){ return s + Number(c.calories || 0); }, 0) <= r80CalTarget(); },
    sub:function(d){ const e = r80Cals(d), t = e.reduce(function(s, c){ return s + Number(c.calories || 0); }, 0); return e.length ? t.toLocaleString()+' of '+r80CalTarget().toLocaleString()+' cal' : 'log what you eat'; }},
  outreach:{label:'Reach out to a client or lead', icon:'&#129309;', met:function(d){ const day = typeof r80Day==='function' ? r80Day(d) : null; if(day && !day.start) return null; return r80Touched(d); }},
  journal:{label:'Journal', icon:'&#128221;', met:function(d){ return arr(state.journal && state.journal.entries).some(function(e){ return String(e.date || '').slice(0, 10)===d; }); }},
  weighin:{label:'Weigh in', icon:'&#9878;&#65039;', met:function(d){ return arr(state.health.weightLog).some(function(w){ return w.date===d; }); }}
};
function r80Met(track, d){ const T = R80_TRACK[track]; if(!T) return false; try{ return T.met(d); }catch(e){ return false; } }

// ================= master streaks =================
const R80_MASTER = [
  {id:'work', line:'Your deep work target, every work day (days off don’t count against it).', def:true},
  {id:'workout', line:'A logged workout. Rest days off your schedule are skipped.', def:true},
  {id:'deficit', line:'Log what you eat and stay under your calorie target.', def:false},
  {id:'outreach', line:'Reach out to a client or a lead, every work day.', def:false},
  {id:'journal', line:'Write in the journal, every day.', def:false}
];
function r80M(){ const s = state.standards; if(!s.master || typeof s.master!=='object'){ s.master = {}; R80_MASTER.forEach(function(m){ if(m.def) s.master[m.id] = '2000-01-01'; }); } return s.master; }
function r80MOn(id){ return !!r80M()[id]; }
// a run of days in a row (today counts once it's done; a day off neither breaks it nor adds to it)
function r80Run(track, since){
  const t = todayStr(), lim = addDays(t, -120), from = since && since > lim ? since : lim;
  let run = 0;
  for(let d = t; d >= from; d = addDays(d, -1)){ const m = r80Met(track, d); if(m===null) continue; if(m) run++; else if(d!==t) break; }
  let best = 0, cur = 0;
  for(let d = from; d <= t; d = addDays(d, 1)){ const m = r80Met(track, d); if(m===null) continue; if(m){ cur++; if(cur > best) best = cur; } else if(d!==t) cur = 0; }
  return {run:run, best:Math.max(best, run), today:r80Met(track, t)};
}
function r80Dots(track, n){
  let h = ''; const t = todayStr();
  for(let i = n - 1; i >= 0; i--){ const d = addDays(t, -i), m = r80Met(track, d); h += '<i class="'+(m===null ? 'is-off' : m ? 'is-ok' : d===t ? 'is-t' : 'is-miss')+'" title="'+escapeHtml(fmtDateShort(d))+'"></i>'; }
  return h;
}
function r80MasterHtml(){
  const M = r80M();
  return '<div class="r63-sec r80-ms"><div class="r63-h">Master streaks <span class="r80-hs">kept by the app, every day, everywhere</span></div><div class="r80-mg">'+R80_MASTER.map(function(m){
    const T = R80_TRACK[m.id], on = !!M[m.id], R = on ? r80Run(m.id) : null;
    return '<div class="r80-mc'+(on ? ' is-on' : '')+'"><div class="r80-mc-h"><span class="r80-mc-i">'+T.icon+'</span><b>'+escapeHtml(T.label==='Reach out to a client or lead' ? 'Reach out' : T.label)+'</b>'+
      '<button class="r45-sw'+(on ? ' on' : '')+'" data-action="r80Master" data-id="'+m.id+'" aria-label="On or off"><span></span></button></div>'+
      (on ? '<div class="r80-mc-n"><b>'+R.run+'</b><span>day'+(R.run===1 ? '' : 's')+' in a row'+(R.best > R.run ? ' · best '+R.best : '')+'</span></div><div class="r80-dots">'+r80Dots(m.id, 21)+'</div>'+
        (T.sub ? '<small>Today: '+escapeHtml(T.sub(todayStr()))+'</small>' : '<small>Today: '+(R.today===null ? 'a day off' : R.today ? 'done' : 'not yet')+'</small>') : '<p>'+escapeHtml(m.line)+'</p>')+
      (m.id==='deficit' && on && !state.profile.maintCal ? '<button class="r43-link" data-action="r80GoHealth">Set your calorie goal &#8594;</button>' : '')+
    '</div>';
  }).join('')+'</div></div>';
}
ACTIONS.r80Master = function(el, e, id){
  const M = r80M(); if(M[id]) delete M[id]; else M[id] = todayStr();
  if(id!=='work' && id!=='workout'){ if(M[id]) r80StdAdd(id); else r80StdDrop(id); }
  persist('standards'); playTick(); renderView();
  if(id==='deficit' && M[id] && !state.profile.maintCal) showToast('Set what you burn a day in Health, and the target follows.', {icon:'&#129367;'});
};
// ---- tracked items in Today's standard (work hours and a workout are its own deep work and Trained chips) ----
const R80_BUILTIN = {work:1, workout:1};
function r80StdAdd(track){
  if(R80_BUILTIN[track]) return null;
  const items = arr(state.standards.items);
  let it = items.find(function(x){ return x.track===track; });
  if(!it && track==='deficit') it = items.find(function(x){ return !x.track && /calorie/i.test(x.label || ''); });   // ("Stayed within calorie target" is this one)
  if(it){ it.track = track; if(track==='deficit') it.label = 'Calorie deficit'; }
  else { it = {id:uid(), label:R80_TRACK[track].label, createdAt:todayStr(), track:track}; items.push(it); }
  state.standards.items = items; persist('standards'); r80Sync();
  return it;
}
function r80StdDrop(track){ state.standards.items = arr(state.standards.items).filter(function(x){ return x.track!==track; }); persist('standards'); }
ACTIONS.r80GoHealth = function(){ ui.view = 'personal'; ui.personalTab = 'fitness'; renderView(); };

// ================= a streak's rules can be checked by the app =================
// (the 75s keep their rules as you tick them; pick "App: …" on any rule to have the app check it)
if(!R63_PRESETS.some(function(p){ return p.id==='lockedin'; })){
  R63_PRESETS.splice(1, 0, {id:'lockedin', name:'Locked In 30', days:30, strict:'twice', icon:'&#128274;', line:'30 work days of the basics, checked by the app: the hours, a workout, reaching out, the journal.',
    rules:[{label:'Work hours', cue:'', track:'work'}, {label:'Workout', cue:'', track:'workout'}, {label:'Reach out to a client or lead', cue:'', track:'outreach'}, {label:'Journal', cue:'Before bed', track:'journal'}]});
}
const R80_TRACK_OPTS = [['', 'I tick it'], ['work', 'App: work hours'], ['workout', 'App: a workout'], ['workout2', 'App: two workouts'], ['deficit', 'App: calorie deficit'], ['outreach', 'App: reached out'], ['journal', 'App: journal'], ['weighin', 'App: weigh-in']];
ACTIONS.r63Setup = (function(base){ return function(el, e, id){ const r = base.apply(this, arguments); try{ const p = R63_PRESETS.find(function(x){ return x.id===id; }); if(p && ui.r63Draft) ui.r63Draft.rules.forEach(function(r, i){ if(p.rules[i] && p.rules[i].track) r.track = p.rules[i].track; }); addSheetRefresh('r63Sheet'); }catch(x){} return r; }; })(ACTIONS.r63Setup);
r63SheetHtml = (function(base){
  return function(){
    const D = ui.r63Draft || {rules:[]}, h = base.apply(this, arguments);
    return h.replace(/(<input class="input r63-d[^"]*"[^>]*data-r63-d="cue\|(\d+)"[^>]*>)/g, function(m, all, i){
      const r = D.rules[Number(i)] || {}, cur = r.track || '';
      return all+'<select class="input r80-trk" data-r80-trk="'+i+'" title="How it’s checked">'+R80_TRACK_OPTS.map(function(o){ return '<option value="'+o[0]+'"'+(cur===o[0] ? ' selected' : '')+'>'+o[1]+'</option>'; }).join('')+'</select>';
    }).replace('<div class="r63-f"><span>Every day</span>', '<div class="r63-f"><span>Every day <em class="r80-fe">(the app checks off the ones it can see)</em></span>');
  };
})(r63SheetHtml);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.hasAttribute || !t.hasAttribute('data-r80-trk') || !ui.r63Draft) return;
  const r = ui.r63Draft.rules[Number(t.getAttribute('data-r80-trk'))]; if(!r) return;
  r.track = t.value || null; if(r.track && !String(r.label || '').trim()) r.label = R80_TRACK[r.track].label;
  addSheetRefresh('r63Sheet');
});
r63New = (function(base){
  return function(p, over){
    over = over || {};
    const src = (over.rules || p.rules).filter(function(r){ return String(r.label || '').trim(); });
    const c = base.apply(this, arguments);
    if(c){ c.rules.forEach(function(r, i){ if(src[i] && src[i].track) r.track = src[i].track; }); persist('standards'); r80Sync(); }
    return c;
  };
})(r63New);
if(typeof r68ToStd==='function') r68ToStd = (function(base){
  return function(rules){
    const plain = arr(rules).filter(function(r){ return !r.track; });
    arr(rules).forEach(function(r){ if(!r.track) return; if(R80_BUILTIN[r.track]){ const M = r80M(); if(!M[r.track]) M[r.track] = todayStr(); } else { const M = r80M(); if(!M[r.track]) M[r.track] = todayStr(); r80StdAdd(r.track); } });
    return base.call(this, plain);
  };
})(r68ToStd);
// your tick can't override what the app sees
toggleStandard = (function(base){ return function(id, d){ const it = arr(state.standards.items).find(function(x){ return x.id===id; }); if(it && it.track){ showToast('The app checks this one: '+R80_TRACK[it.track].label.toLowerCase()+'.', {icon:'&#9989;'}); return; } return base.apply(this, arguments); }; })(toggleStandard);
// the app's rules tick themselves (every day of the run, so a past day it can see counts too)
function r80Sync(){
  let ch = false; const t = todayStr();
  r63Active().forEach(function(c){
    const tr = c.rules.filter(function(r){ return r.track; }); if(!tr.length) return;
    c.log = c.log || {};
    for(let d = c.start; d <= t; d = addDays(d, 1)){
      const L = c.log[d] = c.log[d] || [];
      tr.forEach(function(r){
        const m = r80Met(r.track, d), on = m===null ? true : !!m, i = L.indexOf(r.id);   // (a day off counts as kept)
        if(on && i < 0){ L.push(r.id); ch = true; } else if(!on && i >= 0){ L.splice(i, 1); ch = true; }
      });
      if(!L.length) delete c.log[d];
    }
  });
  // tracked items in Today's standard tick themselves (from when they were added, up to 60 days back)
  arr(state.standards.items).forEach(function(it){
    if(!it.track) return;
    const from = it.createdAt && it.createdAt > addDays(t, -60) ? it.createdAt : addDays(t, -60);
    for(let d = from; d <= t; d = addDays(d, 1)){
      const m = r80Met(it.track, d), on = m===null ? true : !!m;
      let rec = state.standards.completions.find(function(c){ return c.date===d; });
      if(!rec){ if(!on) continue; rec = {date:d, doneIds:[]}; state.standards.completions.push(rec); }
      const i = rec.doneIds.indexOf(it.id);
      if(on && i < 0){ rec.doneIds.push(it.id); ch = true; } else if(!on && i >= 0){ rec.doneIds.splice(i, 1); ch = true; }
    }
  });
  if(ch){ persist('standards'); try{ r63Settle(); }catch(e){} }
  return ch;
}
// (your tick can't override what the app sees)
ACTIONS.r63Tick = (function(base){ return function(el, e, id){ const a = String(id || '').split('|'), c = r63List().find(function(x){ return x.id===a[0]; }), r = c && c.rules.find(function(x){ return x.id===a[1]; }); if(r && r.track){ showToast('The app checks this one: '+R80_TRACK[r.track].label.toLowerCase()+'.', {icon:'&#9989;'}); return; } return base.apply(this, arguments); }; })(ACTIONS.r63Tick);
// the Streaks tab: master streaks up top; a tracked rule says so on the running streak
r63Tab = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    r63Active().forEach(function(c){ c.rules.forEach(function(r){ if(!r.track) return;
      h = h.replace('data-action="r63Tick" data-id="'+c.id+'|'+r.id+'"', function(m){ return m+' data-r80-auto="1" title="Checked by the app"'; });
    }); });
    arr(state.standards.items).forEach(function(it){ if(!it.track) return;
      h = h.split('data-action="r68StdTick" data-id="'+it.id+'"').join('data-action="r68StdTick" data-id="'+it.id+'" data-r80-auto="1" title="Checked by the app"');
    });
    return h;
  };
})(r63Tab);
// (Round 65 draws the Streaks page: the master streaks sit right above Today's standard)
if(typeof r65StdHtml==='function') r65StdHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    arr(state.standards.items).forEach(function(it){
      if(!it.track) return;
      h = h.replace('<input value="'+escapeHtml(it.label)+'" data-r63-item="'+it.id+'"', function(m){ return '<em class="r80-autot" title="Checked by the app">auto</em>'+m+' readonly'; });
    });
    h = h.replace('<div class="r65-items">', function(m){ return '<div class="r80-stdn">Work hours are your deep work target; a workout is Trained. Items marked auto tick themselves when the app can see them.</div>'+m; });
    return r80MasterHtml()+h;
  };
})(r65StdHtml);
r63StdHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    arr(state.standards.items).forEach(function(it){
      if(!it.track) return;
      h = h.replace('<input value="'+escapeHtml(it.label)+'" data-r63-item="'+it.id+'"', function(m){ return '<em class="r80-autot" title="Checked by the app">auto</em>'+m+' readonly'; });
    });
    return h.replace('<div class="r63-std-row">', function(m){ return '<div class="r80-stdn">Work hours = your deep work target. Workout = Trained. The rest tick themselves when the app can see them (auto), or by you.</div>'+m; });
  };
})(r63StdHtml);
// ================= one Today's standard =================
// (the day is only complete with your streak's rules and your master streaks in it; light days ask for half the deep work)
dayStandardsCompleteRaw = (function(base){
  return function(d){
    const keep = state.standards.deepWorkTargetMinutes, t = r80Target(d);
    let ok;
    // (a light or shoot day asks for half; a day off is skipped by the streak itself, so its target stays as is)
    try{ if(t) state.standards.deepWorkTargetMinutes = t; ok = base.apply(this, arguments); }
    finally{ state.standards.deepWorkTargetMinutes = keep; }
    return ok;
  };
})(dayStandardsCompleteRaw);
// on Today: the standard's tracked items are marked as the app's (it ticks them)
PANEL_RENDERERS.personalStats = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    try{
      arr(state.standards.items).forEach(function(it){
        if(!it.track) return;
        h = h.replace(new RegExp('<span class="chip ([^"]*)" data-action="toggleStandard" data-id="'+it.id+'"'), function(m, cls){ return '<span class="chip '+cls+' r80-sc is-auto" title="Checked by the app" data-id="'+it.id+'"'; });
      });
    }catch(e){}
    return h;
  };
})(PANEL_RENDERERS.personalStats);
setInterval(function(){ try{ if(r80Sync()) renderView(); }catch(e){} }, 120000);
// (before a draw, not during one: the day's numbers are cached while a page is drawn)
let r80SyncAt = 0;
renderView = (function(base){ return function(){ if(Date.now() - r80SyncAt > 4000){ r80SyncAt = Date.now(); try{ r80Sync(); }catch(e){} } return base.apply(this, arguments); }; })(renderView);

// ================= Health: the calorie goal, and Op's tips =================
function r80HealthGoalHtml(){
  const p = state.profile, maint = Number(p.maintCal) || 0, def = Number(p.deficitCal) || 500, tgt = r80CalTarget(), d = todayStr();
  const eaten = r80Cals(d).reduce(function(s, c){ return s + Number(c.calories || 0); }, 0), left = tgt - eaten;
  const wl = arr(state.health.weightLog).slice().sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); }), w = wl.length ? Number(wl[wl.length - 1].weight) : null;
  const R = r80MOn('deficit') ? r80Run('deficit', r80M().deficit) : null;
  const lbs = Math.round(def*7/3500*10)/10;
  return '<div class="card r80-hg"><div class="r80-hg-h"><div><b>&#129367; Calorie goal</b><span>A deficit you can keep beats one you can’t.</span></div>'+
      (R ? '<div class="r80-hg-st"><b>'+R.run+'</b><span>day deficit streak</span></div>' : '<button class="btn btn-sm btn-ghost" data-action="r80Master" data-id="deficit">Track it as a streak</button>')+'</div>'+
    '<div class="r80-hg-g">'+
      '<label><span>You burn a day</span><div class="r80-hg-in"><input class="input" type="number" id="r80Maint" value="'+(maint || '')+'" placeholder="e.g. 2600">'+(w ? '<button class="r43-link" data-action="r80Estimate" title="Weight × 15 for a moderately active day. A rough start; adjust after two weeks.">Estimate</button>' : '')+'</div></label>'+
      '<label><span>Deficit</span><div class="r43-seg">'+[[250, 'Easy'], [500, 'Steady'], [750, 'Hard']].map(function(o){ return '<button type="button" class="'+(def===o[0] ? 'is-on' : '')+'" data-action="r80Def" data-id="'+o[0]+'">'+o[1]+' −'+o[0]+'</button>'; }).join('')+'</div></label>'+
      '<label><span>Goal weight</span><input class="input" type="number" id="r80Goal" value="'+(p.goalWeight || '')+'" placeholder="'+(w ? w : '')+'"></label>'+
    '</div>'+
    '<div class="r80-hg-t"><div><small>Daily target</small><b>'+tgt.toLocaleString()+'</b><em>'+(maint ? 'about '+lbs+' lb a week' : 'set what you burn')+'</em></div>'+
      '<div><small>Eaten today</small><b>'+eaten.toLocaleString()+'</b><em>'+(eaten ? (left >= 0 ? left.toLocaleString()+' left' : Math.abs(left).toLocaleString()+' over') : 'nothing logged yet')+'</em></div>'+
      (w && p.goalWeight ? '<div><small>To goal</small><b>'+Math.max(0, Math.round((w - Number(p.goalWeight))*10)/10)+' lb</b><em>'+(maint && w > p.goalWeight ? 'about '+Math.ceil((w - p.goalWeight)/Math.max(0.1, lbs))+' weeks' : '')+'</em></div>' : '')+'</div>'+
    '<div class="r80-tip"><span>&#128172; <b>Op:</b> '+escapeHtml(r80HealthTip(eaten, left, tgt))+'</span><button class="r43-link" data-action="r80AskTip">Ask Op for more</button></div>'+
  '</div>';
}
function r80HealthTip(eaten, left, tgt){
  const h = new Date().getHours(), list = ['Protein first at every meal: it keeps you full longest.', 'Drink a big glass of water before you eat.', 'Liquid calories count: soda, juice and drinks add up fast.', 'Plan tonight’s dinner now, so hunger doesn’t pick it.', 'Weigh in at the same time each morning and watch the weekly average, not the day.', 'A 30-minute walk is about 150 calories, and it clears your head.', 'Keep go-to meals you know the calories of. Fewer guesses, fewer misses.'];
  if(!eaten && h >= 13) return 'Nothing logged yet today. A deficit you don’t track is a guess: log breakfast and lunch now.';
  if(left < 0) return 'You’re '+Math.abs(left).toLocaleString()+' over. Don’t chase it with nothing tonight: a walk and a light, protein-heavy dinner, then back on it tomorrow.';
  if(eaten && left < 400 && h < 17) return 'Only '+left.toLocaleString()+' left and the day’s not done. Keep the rest lean: vegetables, eggs, chicken, water.';
  if(eaten && left >= 0 && h >= 20) return 'Under by '+left.toLocaleString()+' today. That’s the deficit. Kitchen’s closed.';
  return list[new Date().getDate() % list.length];
}
renderFitness = (function(base){ return function(){ const h = base.apply(this, arguments); return r80HealthGoalHtml()+h; }; })(renderFitness);
function r80SetTarget(){ const p = state.profile, m = Number(p.maintCal) || 0; if(m > 0) p.calorieTarget = Math.max(1200, m - (Number(p.deficitCal) || 500)); persist('profile'); }
ACTIONS.r80Def = function(el, e, id){ state.profile.deficitCal = Number(id); r80SetTarget(); playTick(); renderView(); };
ACTIONS.r80Estimate = function(){ const wl = arr(state.health.weightLog).slice().sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); }); if(!wl.length) return; state.profile.maintCal = Math.round(Number(wl[wl.length - 1].weight)*15/10)*10; r80SetTarget(); renderView(); showToast('About '+state.profile.maintCal.toLocaleString()+' a day. A starting point: adjust it after two weeks of weigh-ins.', {icon:'&#129367;', duration:7000}); };
ACTIONS.r80AskTip = function(){ try{ aiAsk('Give me one or two practical tips to keep my calorie deficit today, based on what I’ve eaten so far and my target.'); }catch(e){} };
document.addEventListener('change', function(e){
  const t = e.target; if(!t) return;
  if(t.id==='r80Maint'){ state.profile.maintCal = Math.max(0, Math.round(Number(t.value) || 0)) || null; r80SetTarget(); renderView(); }
  if(t.id==='r80Goal'){ state.profile.goalWeight = Number(t.value) || null; persist('profile'); renderView(); }
});

// ================= the schedule =================
const R80_KIND = {
  work:{label:'Work day', c:'#F59E0B', icon:'&#128188;'}, shoot:{label:'Shoot day', c:'#F472B6', icon:'&#127909;'},
  light:{label:'Light day', c:'#38BDF8', icon:'&#9925;'}, off:{label:'Day off', c:'#34D399', icon:'&#127796;'}, vacation:{label:'Vacation', c:'#A78BFA', icon:'&#9992;&#65039;'}
};
const R80_DAYT = {work:{kind:'work', wake:'06:30', start:'08:30', end:'18:00'}, shoot:{kind:'shoot', wake:'06:00', start:'07:30', end:'17:00'}, light:{kind:'light', wake:'07:30', start:'10:00', end:'14:00'}, off:{kind:'off', wake:'08:30', start:null, end:null}};
function r80D(k, o){ return Object.assign({}, R80_DAYT[k], o || {}); }
// the presets (Sunday first, like the rest of the app)
const R80_PRESETS = [
  {id:'locked', name:'Locked in', icon:'&#128274;', line:'Six days on. Mon–Fri full days, Saturday light, Sunday off and the week planned.',
    week:[r80D('off'), r80D('work'), r80D('work'), r80D('work'), r80D('work'), r80D('work'), r80D('light')], social:2,
    rules:['No plans before 6 PM on a work day.', 'Two social nights a week at most, Friday or Saturday.', 'Nothing that ends after 11 PM the night before a work day.', 'Sunday at 6 PM: plan the week.', 'A new client call can take a work hour. Hanging out can’t.']},
  {id:'creator', name:'Creator week', icon:'&#127909;', line:'Shoot Tuesday and Thursday, edit Monday, Wednesday and Friday. Saturday light, Sunday off.',
    week:[r80D('off'), r80D('work', {start:'09:00'}), r80D('shoot'), r80D('work', {start:'09:00'}), r80D('shoot'), r80D('work', {start:'09:00', end:'17:00'}), r80D('light')], social:2,
    rules:['Shoot days are for clients: no personal plans.', 'Book a new shoot only on a shoot day.', 'Edit days: phone in another room until lunch.', 'No late night before a shoot (home by 10).', 'Sunday at 6 PM: plan the week and the shot lists.']},
  {id:'classic', name:'Classic 5/2', icon:'&#128197;', line:'Mon–Fri 9 to 5, weekends off. Steady and simple.',
    week:[r80D('off', {wake:'09:00'}), r80D('work', {wake:'07:00', start:'09:00', end:'17:00'}), r80D('work', {wake:'07:00', start:'09:00', end:'17:00'}), r80D('work', {wake:'07:00', start:'09:00', end:'17:00'}), r80D('work', {wake:'07:00', start:'09:00', end:'17:00'}), r80D('work', {wake:'07:00', start:'09:00', end:'17:00'}), r80D('off', {wake:'09:00'})], social:3,
    rules:['Evenings after 5 are yours.', 'One weekend day fully free, every week.', 'Say no to work on the weekend unless it’s paid and booked.']},
  {id:'monk', name:'Monk mode', icon:'&#9876;&#65039;', line:'A sprint: up at 5:30, seven days, Sunday light. For a month you mean.',
    week:[r80D('light', {wake:'06:30', start:'09:00', end:'13:00'}), r80D('work', {wake:'05:30', start:'07:30', end:'19:00'}), r80D('work', {wake:'05:30', start:'07:30', end:'19:00'}), r80D('work', {wake:'05:30', start:'07:30', end:'19:00'}), r80D('work', {wake:'05:30', start:'07:30', end:'19:00'}), r80D('work', {wake:'05:30', start:'07:30', end:'19:00'}), r80D('work', {wake:'06:30', start:'08:00', end:'15:00'})], social:1,
    rules:['No to anything that isn’t work, the gym or family.', 'One social thing a week, at most.', 'In bed by 9:30.', 'No alcohol.']}
];
// the year's holidays, and what each one is by default (off, light or a work day)
function r80NthDow(y, m, dow, n){ const d = new Date(y, m, 1), first = (dow - d.getDay() + 7) % 7 + 1; return y+'-'+pad2(m + 1)+'-'+pad2(first + (n - 1)*7); }
function r80LastDow(y, m, dow){ const d = new Date(y, m + 1, 0), last = d.getDate() - ((d.getDay() - dow + 7) % 7); return y+'-'+pad2(m + 1)+'-'+pad2(last); }
function r80Holidays(y){
  const L = [
    ['newyear', 'New Year’s Day', y+'-01-01', 'off'], ['mlk', 'MLK Day', r80NthDow(y, 0, 1, 3), 'work'], ['presidents', 'Presidents’ Day', r80NthDow(y, 1, 1, 3), 'work'],
    ['easter', 'Easter', typeof r60Easter==='function' ? r60Easter(y) : null, 'off'], ['mothers', 'Mother’s Day', r80NthDow(y, 4, 0, 2), 'off'], ['memorial', 'Memorial Day', r80LastDow(y, 4, 1), 'light'],
    ['fathers', 'Father’s Day', r80NthDow(y, 5, 0, 3), 'off'], ['juneteenth', 'Juneteenth', y+'-06-19', 'work'], ['july4', 'Fourth of July', y+'-07-04', 'off'], ['labor', 'Labor Day', r80NthDow(y, 8, 1, 1), 'light'],
    ['columbus', 'Columbus Day', r80NthDow(y, 9, 1, 2), 'work'], ['halloween', 'Halloween', y+'-10-31', 'work'], ['veterans', 'Veterans Day', y+'-11-11', 'work'],
    ['thanksgiving', 'Thanksgiving', holThanksgiving(y), 'off'], ['blackfriday', 'Black Friday', addDays(holThanksgiving(y), 1), 'light'],
    ['xmaseve', 'Christmas Eve', y+'-12-24', 'light'], ['christmas', 'Christmas', y+'-12-25', 'off'], ['nye', 'New Year’s Eve', y+'-12-31', 'light']
  ];
  return L.filter(function(h){ return h[2]; }).map(function(h){ return {id:h[0], name:h[1], date:h[2], def:h[3]}; });
}
const R80HC = {};
function r80HolidayOn(d){ const y = Number(d.slice(0, 4)); const L = R80HC[y] || (R80HC[y] = r80Holidays(y)); return L.find(function(h){ return h.date===d; }) || null; }
const R80_HOL_TIP = {
  work:'Clients and most people are off: a quiet day for deep work and catching up.',
  light:'A few focused hours in the morning, then it’s yours.',
  off:'Off. Be with people. The alarm sleeps in.'
};
function r80S(){
  const f = state.focus; if(!f.schedule || typeof f.schedule!=='object') f.schedule = {on:false};
  const S = f.schedule;
  if(!Array.isArray(S.week) || S.week.length!==7) S.week = R80_PRESETS[0].week.map(function(d){ return Object.assign({}, d); });
  S.holidays = S.holidays && typeof S.holidays==='object' ? S.holidays : {};
  S.vacations = arr(S.vacations); S.rules = arr(S.rules); S.month = S.month && typeof S.month==='object' ? S.month : {plan:true, wrap:true};
  S.decisions = arr(S.decisions); if(S.social==null) S.social = 2;
  return S;
}
function r80Day(d){
  const S = state.focus && state.focus.schedule; if(!S || !S.on) return null;
  const s = r80S();
  const v = s.vacations.find(function(x){ return d >= x.from && d <= x.to; });
  if(v) return {kind:'vacation', label:v.label || 'Vacation', wake:null, start:null, end:null, vacation:true};
  const base = Object.assign({}, s.week[dowOf(d)] || R80_DAYT.off), h = r80HolidayOn(d);
  if(h){
    const pol = s.holidays[h.id] || h.def;
    if(pol==='off') return {kind:'off', label:h.name, holiday:h.name, wake:base.kind==='off' ? base.wake : '08:30', start:null, end:null};
    if(pol==='light' && base.start) return Object.assign({}, R80_DAYT.light, {label:h.name, holiday:h.name, wake:base.wake > R80_DAYT.light.wake ? base.wake : R80_DAYT.light.wake});
    return Object.assign(base, {label:h.name+(base.start ? ' (work day)' : ''), holiday:h.name});
  }
  base.label = R80_KIND[base.kind] ? R80_KIND[base.kind].label : 'Day';
  if(!base.start) base.start = null;
  return base;
}
// ---- it runs the alarms (a change you make for one morning or one day still wins) ----
wakeTimeFor = (function(base){
  return function(d){
    const day = r80Day(d), w = wakeCfg();
    if(!day || (w && w.override && w.override.date===d)) return base.apply(this, arguments);
    return day.wake || null;
  };
})(wakeTimeFor);
wakeBaseTimeFor = (function(base){ return function(d){ const day = r80Day(d); return day ? (day.wake || null) : base.apply(this, arguments); }; })(wakeBaseTimeFor);
workHoursFor = (function(base){
  return function(d){
    const h = base.apply(this, arguments), day = r80Day(d), w = workCfg();
    if(!day || (w.override && w.override.date===d)) return h;
    if(!day.start){ h.off = true; return h; }
    h.start = day.start; h.end = day.end || h.end; h.enabled = true; h.off = false;
    if(day.kind==='light'){ h.lunch = ''; h.brk = ''; }
    return h;
  };
})(workHoursFor);
workDayToday = (function(base){ return function(){ const t = todayStr(), day = r80Day(t), w = workCfg(); if(!day || (w.override && w.override.date===t)) return base.apply(this, arguments); return !!day.start; }; })(workDayToday);
isDayOff = (function(base){ return function(d){ if(state.daysOff.dates.indexOf(d) >= 0) return true; const day = r80Day(d); return day ? !day.start : base.apply(this, arguments); }; })(isDayOff);
if(typeof isWorkDay==='function') isWorkDay = (function(base){ return function(d){ const day = r80Day(d); return day ? !!day.start : base.apply(this, arguments); }; })(isWorkDay);

// ---- should I say yes? ----
function r80WeekSocial(){ const ws = startOfWeekStr(todayStr()); return r80S().decisions.filter(function(x){ return x.go && x.kind==='social' && x.date >= ws && x.date <= addDays(ws, 6); }).length; }
function r80Decide(q){
  const day = r80Day(q.date) || {kind:'work', start:'09:00', end:'17:00', label:'Work day'}, next = r80Day(addDays(q.date, 1)) || {kind:'work', wake:'07:00', start:'09:00'};
  const tm = hmMin(q.time || '19:00'), st = hmMin(day.start), en = hmMin(day.end), bedBy = next.wake ? hmMin(next.wake) - 8*60 + 24*60 : null, S = r80S();
  const fmt = function(m){ m = ((m % 1440) + 1440) % 1440; return fmt12Hour(pad2(Math.floor(m/60))+':'+pad2(m % 60)); };
  const during = day.start && tm!=null && st!=null && en!=null && tm >= st && tm < en;
  const out = {yes:true, why:'', tip:''};
  if(q.kind==='opp'){
    out.yes = true; out.why = during ? 'It’s during work hours, and it’s work. Take it if it pays or leads somewhere.' : 'It’s outside work hours: yes if it’s paid or a real lead, not a favor dressed up as one.';
    if(day.kind==='off' || day.vacation) { out.yes = !!q.paid; out.why = day.vacation ? 'You’re on vacation. Only if it’s big and paid.' : 'It’s your day off. Only if it’s paid; otherwise offer a work day.'; }
    return out;
  }
  if(q.kind==='family'){ out.yes = true; out.why = during ? 'Family. If it can’t move, go, and make the hours up tonight.' : 'Family. Yes.'; return out; }
  if(day.vacation || day.kind==='off'){ out.yes = true; out.why = (day.holiday ? day.holiday+'. ' : '')+'It’s a day off. Go.'+(next.start && bedBy ? ' Home by '+fmt(bedBy + 30)+': '+(next.kind==='shoot' ? 'you shoot' : 'you work')+' tomorrow at '+fmt12Hour(next.start)+'.' : ''); return out; }
  if(during){ out.yes = false; out.why = 'That’s during work hours ('+fmt12Hour(day.start)+'–'+fmt12Hour(day.end)+'). Say you can do after '+fmt12Hour(day.end)+'.'; return out; }
  if(q.kind==='social' || q.kind==='date'){
    const n = r80WeekSocial(), cap = Number(S.social) || 2;
    if(q.kind==='social' && n >= cap){ out.yes = false; out.why = 'You’ve had '+n+' social night'+(n===1 ? '' : 's')+' this week (your limit is '+cap+'). Next week.'; return out; }
    if(next.kind==='shoot' && tm >= 19*60){ out.yes = false; out.why = 'You shoot tomorrow at '+fmt12Hour(next.start)+'. Not tonight; make it the night after.'; return out; }
    out.yes = true; out.why = q.kind==='date' ? 'Yes.' : 'Yes. That’s '+(n + 1)+' of '+cap+' this week.';
    if(next.start && bedBy) out.why += ' Leave by '+fmt(bedBy - 30)+' to be up at '+fmt12Hour(next.wake)+'.';
    return out;
  }
  if(q.kind==='favor'){ out.yes = !during; out.why = 'A favor after work hours is fine if it’s quick. If it eats a work block, no.'; return out; }
  return out;
}
function r80AskHtml(){
  const A = ui.r80Ask || (ui.r80Ask = {kind:'social', date:todayStr(), time:'19:00', what:''}), R = A.result;
  return '<div class="r80-sec"><div class="r80-sh">&#129300; Should I say yes?<span>Check it against your schedule before you answer.</span></div>'+
    '<div class="r80-ask"><input class="input" id="r80AskWhat" placeholder="What is it? (e.g. Dinner with Jay)" value="'+escapeHtml(A.what || '')+'">'+
      '<div class="r43-seg">'+[['social', 'Going out'], ['date', 'A date'], ['family', 'Family'], ['opp', 'Work / money'], ['favor', 'A favor']].map(function(o){ return '<button type="button" class="'+(A.kind===o[0] ? 'is-on' : '')+'" data-action="r80AskKind" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
      '<input class="input" type="date" id="r80AskDate" value="'+escapeHtml(A.date)+'"><input class="input" type="time" id="r80AskTime" value="'+escapeHtml(A.time)+'">'+
      '<button class="btn btn-primary btn-sm" data-action="r80AskGo">Check</button></div>'+
    (R ? '<div class="r80-ans '+(R.yes ? 'is-yes' : 'is-no')+'"><b>'+(R.yes ? 'Yes' : 'No')+'</b><span>'+escapeHtml(R.why)+'</span>'+
      '<div>'+(R.yes ? '<button class="btn btn-sm btn-good" data-action="r80AskLog" data-id="go">I’m going (put it on the calendar)</button>' : '')+'<button class="btn btn-sm btn-ghost" data-action="r80AskLog" data-id="pass">'+(R.yes ? 'Pass anyway' : 'Got it, I’ll pass')+'</button></div></div>' : '')+
  '</div>';
}
ACTIONS.r80AskKind = function(el, e, id){ r80AskRead(); ui.r80Ask.kind = id; ui.r80Ask.result = null; renderView(); };
function r80AskRead(){ const A = ui.r80Ask || (ui.r80Ask = {}); const g = function(id){ const x = document.getElementById(id); return x ? x.value : null; }; if(g('r80AskWhat')!=null) A.what = g('r80AskWhat'); if(g('r80AskDate')) A.date = g('r80AskDate'); if(g('r80AskTime')) A.time = g('r80AskTime'); return A; }
ACTIONS.r80AskGo = function(){ const A = r80AskRead(); A.result = r80Decide(A); playTick(); renderView(); };
ACTIONS.r80AskLog = function(el, e, id){
  const A = r80AskRead(), S = r80S();
  S.decisions.push({id:uid(), date:A.date, time:A.time, what:A.what || '', kind:A.kind, go:id==='go', yes:!!(A.result && A.result.yes), at:Date.now()}); S.decisions = S.decisions.slice(-120);
  persist('focus');
  if(id==='go'){ try{ opRunTool('add_event', {title:A.what || ({social:'Going out', date:'Date', family:'Family', opp:'Work', favor:'Favor'})[A.kind], date:A.date, time:A.time}); }catch(err){} showToast('On the calendar.', {icon:'&#128197;'}); }
  ui.r80Ask = {kind:A.kind, date:todayStr(), time:'19:00', what:''}; renderView();
};

// ---- the tab: Personal → Schedule ----
function r80SchedHtml(){
  const S = r80S(), t = todayStr(), today = r80Day(t);
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], order = [1, 2, 3, 4, 5, 6, 0];
  const tline = today ? (today.label+(today.wake ? ' · up '+fmt12Hour(today.wake) : ' · no alarm')+(today.start ? ' · work '+fmt12Hour(today.start)+'–'+fmt12Hour(today.end) : '')) : '';
  let h = '<div class="r80">';
  h += '<div class="r80-top"><div><b>Your schedule</b><span>'+(S.on ? 'It runs your wake-up and work alarms. A change you make for one day still wins.' : 'Pick how your weeks go. Turn it on and it runs your alarms.')+'</span>'+(S.on && tline ? '<em>Today: '+escapeHtml(tline)+'</em>' : '')+'</div>'+
    '<button class="r45-sw'+(S.on ? ' on' : '')+'" data-action="r80On" aria-label="On or off"><span></span></button></div>';
  // the next two weeks at a glance
  let strip = ''; for(let i = 0; i < 14; i++){ const d = addDays(t, i), day = r80Day(d) || (function(){ const b = Object.assign({}, S.week[dowOf(d)]); b.label = R80_KIND[b.kind].label; return b; })(), K = R80_KIND[day.kind] || R80_KIND.work;
    strip += '<div class="r80-sd'+(i===0 ? ' is-t' : '')+'" style="--c:'+K.c+'" title="'+escapeHtml(day.label)+'"><small>'+escapeHtml(weekdayShort(d))+'</small><b>'+Number(d.slice(8))+'</b><i>'+K.icon+'</i>'+(day.holiday ? '<em>'+escapeHtml(day.holiday)+'</em>' : day.vacation ? '<em>'+escapeHtml(day.label)+'</em>' : '')+'</div>'; }
  h += '<div class="r80-strip">'+strip+'</div>';
  // presets
  h += '<div class="r80-sec"><div class="r80-sh">Start from<span>Pick one, then change any day.</span></div><div class="r80-pre">'+R80_PRESETS.map(function(p){ return '<button class="r80-pc'+(S.preset===p.id ? ' is-on' : '')+'" data-action="r80Preset" data-id="'+p.id+'"><span>'+p.icon+'</span><b>'+p.name+'</b><small>'+p.line+'</small></button>'; }).join('')+'</div></div>';
  // the week
  h += '<div class="r80-sec"><div class="r80-sh">The week<span>Each day: what kind of day, when you’re up, when work starts and ends.</span></div><div class="r80-wk">'+order.map(function(i){
    const d = S.week[i], K = R80_KIND[d.kind];
    return '<div class="r80-wr" style="--c:'+K.c+'"><b>'+names[i]+'</b><div class="r43-seg">'+['work', 'shoot', 'light', 'off'].map(function(k){ return '<button type="button" class="'+(d.kind===k ? 'is-on' : '')+'" data-action="r80Kind" data-id="'+i+'|'+k+'">'+R80_KIND[k].label.replace(' day', '')+'</button>'; }).join('')+'</div>'+
      '<label>Up <input class="input" type="time" data-r80-wk="'+i+'|wake" value="'+(d.wake || '')+'"></label>'+
      (d.start ? '<label>Work <input class="input" type="time" data-r80-wk="'+i+'|start" value="'+d.start+'"> to <input class="input" type="time" data-r80-wk="'+i+'|end" value="'+(d.end || '')+'"></label>' : '<span class="r80-wo">No work alarm</span>')+'</div>';
  }).join('')+'</div></div>';
  // yes / no
  h += r80AskHtml();
  h += '<div class="r80-sec"><div class="r80-sh">Your rules<span>What you hold yourself to. Op holds you to them too.</span></div><div class="r80-rules">'+S.rules.map(function(r, i){ return '<div class="r80-rule"><span>'+escapeHtml(r)+'</span><button data-action="r80RuleDel" data-id="'+i+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
    '<div class="r80-rule is-add"><input class="input" id="r80RuleNew" placeholder="Add a rule (e.g. No drinks on a weeknight)"><button class="btn btn-sm btn-ghost" data-action="r80RuleAdd">Add</button></div></div>'+
    '<label class="r80-soc">Social nights a week, at most <select class="input input-sm" data-r80-soc>'+[1, 2, 3, 4, 7].map(function(n){ return '<option value="'+n+'"'+(Number(S.social)===n ? ' selected' : '')+'>'+(n===7 ? 'No limit' : n)+'</option>'; }).join('')+'</select></label></div>';
  // the month
  h += '<div class="r80-sec"><div class="r80-sh">The month<span>The same rhythm every month. These show up as tasks on their day.</span></div><div class="r80-mo">'+
    '<div><b>1st</b><span>Monthly money review (statements, where it went)</span><em>always on</em></div>'+
    '<div><b>First Monday</b><span>Plan the month: three goals, the shoots, the money target</span><button class="r45-sw'+(S.month.plan!==false ? ' on' : '')+'" data-action="r80Month" data-id="plan"><span></span></button></div>'+
    '<div><b>Last Friday</b><span>Wrap the month: clients, content, money, what to change</span><button class="r45-sw'+(S.month.wrap!==false ? ' on' : '')+'" data-action="r80Month" data-id="wrap"><span></span></button></div>'+
  '</div></div>';
  // the year: holidays and vacations
  const y = Number(t.slice(0, 4)), hol = r80Holidays(y).concat(r80Holidays(y + 1)).filter(function(x){ return x.date >= t && x.date <= addDays(t, 366); });
  h += '<div class="r80-sec"><div class="r80-sh">The year<span>What each holiday is. Monday holidays are quiet days to get ahead; the big ones are off.</span></div><div class="r80-hols">'+hol.map(function(x){
    const pol = S.holidays[x.id] || x.def;
    return '<div class="r80-hol"><span><b>'+escapeHtml(x.name)+'</b><small>'+escapeHtml(weekdayShort(x.date)+' '+fmtDateShort(x.date))+'</small></span><div class="r43-seg">'+['off', 'light', 'work'].map(function(k){ return '<button type="button" class="'+(pol===k ? 'is-on' : '')+'" data-action="r80Hol" data-id="'+x.id+'|'+k+'" title="'+escapeHtml(R80_HOL_TIP[k])+'">'+(k==='off' ? 'Off' : k==='light' ? 'Light' : 'Work')+'</button>'; }).join('')+'</div></div>';
  }).join('')+'</div>'+
  '<div class="r80-vac"><div class="r80-sh2">Vacations <span>Two weeks a year: put them in now so the year bends around them. No alarms on these days.</span></div>'+
    S.vacations.map(function(v, i){ return '<div class="r80-vr"><b>'+escapeHtml(v.label || 'Vacation')+'</b><span>'+escapeHtml(fmtDateShort(v.from)+' – '+fmtDateShort(v.to))+'</span><button class="r43-link" data-action="r80VacDel" data-id="'+i+'">Remove</button></div>'; }).join('')+
    '<div class="r80-vr is-add"><input class="input" id="r80VacLabel" placeholder="Name (e.g. DR trip)"><input class="input" type="date" id="r80VacFrom"><input class="input" type="date" id="r80VacTo"><button class="btn btn-sm btn-ghost" data-action="r80VacAdd">Add</button></div></div></div>';
  return h+'</div>';
}
renderPersonal = (function(base){
  return function(){
    const want = ui.personalTab==='schedule';
    if(want) ui.personalTab = 'wishlist';
    let h; try{ h = base.apply(this, arguments); } finally { if(want) ui.personalTab = 'schedule'; }
    const tab = '<div class="tab '+(want ? 'active' : '')+'" data-action="personalTab" data-tab="schedule">Schedule</div>';
    h = h.replace(/(<div class="tab [^"]*" data-action="personalTab" data-tab="streaks">Streaks<\/div>)/, function(m){ return m+tab; });
    if(!want) return h;
    h = h.replace('<div class="tab active" data-action="personalTab" data-tab="wishlist">', '<div class="tab " data-action="personalTab" data-tab="wishlist">');
    const cut = r60Cut(h, '<div class="tab-panel" data-key="personal-wishlist">'); if(!cut) return h;
    return h.replace(cut.html, function(){ return '<div class="tab-panel" data-key="personal-schedule">'+r80SchedHtml()+'</div>'; });
  };
})(renderPersonal);
ACTIONS.r80On = function(){
  const S = r80S(), w = wakeCfg(), k = workCfg();
  S.on = !S.on;
  if(S.on){
    S.was = {wake:!!(w && w.enabled), work:!!k.enabled}; if(w) w.enabled = true; k.enabled = true; if(!S.preset) S.preset = 'custom';
    // (turned on after today's start: no alarm right now for a start that already went by)
    try{ const h = workToday(), st = hmMin(h.start); if(st!=null && nowMin() >= st){ workDayState().rangAt = Date.now(); } }catch(e){}
  }
  else if(S.was){ if(w) w.enabled = S.was.wake; k.enabled = S.was.work; }
  try{ wakeArm(); }catch(e){} persist('focus'); playTick(); renderView();
  if(S.on){ const nw = nextWake(); showToast('Your schedule runs the alarms now.'+(nw ? ' Next: '+morningLabel(nw.date)+' at '+fmt12Hour(nw.time)+'.' : ''), {icon:'&#128197;', duration:7000}); }
};
ACTIONS.r80Preset = function(el, e, id){
  const p = R80_PRESETS.find(function(x){ return x.id===id; }); if(!p) return;
  const S = r80S(), go = function(){ S.preset = p.id; S.week = p.week.map(function(d){ return Object.assign({}, d); }); S.rules = p.rules.slice(); S.social = p.social; S.holidays = {}; persist('focus'); playPositive(); renderView(); showToast(p.name+'. Change any day below.'+(S.on ? '' : ' Turn it on to run your alarms.'), {icon:'&#128197;', duration:6000}); };
  if(S.preset && S.preset!==p.id) uiConfirm('Switch to '+p.name+'? Your week and rules are replaced.').then(function(ok){ if(ok) go(); }); else go();
};
ACTIONS.r80Kind = function(el, e, id){
  const a = String(id).split('|'), S = r80S(), i = Number(a[0]), d = S.week[i];
  const keepWake = d.wake; S.week[i] = Object.assign({}, R80_DAYT[a[1]]); if(keepWake && a[1]!=='off') S.week[i].wake = keepWake;
  S.preset = S.preset ? S.preset : 'custom'; persist('focus'); try{ wakeArm(); }catch(x){} playTick(); renderView();
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  const k = t.getAttribute('data-r80-wk');
  if(k){ const a = k.split('|'), S = r80S(), d = S.week[Number(a[0])]; if(d){ d[a[1]] = t.value || null; persist('focus'); try{ wakeArm(); }catch(x){} renderView(); } return; }
  if(t.hasAttribute('data-r80-soc')){ r80S().social = Number(t.value) || 2; persist('focus'); renderView(); }
});
ACTIONS.r80RuleAdd = function(){ const i = document.getElementById('r80RuleNew'), v = i ? i.value.trim() : ''; if(!v) return; r80S().rules.push(v.slice(0, 140)); persist('focus'); renderView(); };
ACTIONS.r80RuleDel = function(el, e, id){ r80S().rules.splice(Number(id), 1); persist('focus'); renderView(); };
ACTIONS.r80Hol = function(el, e, id){ const a = String(id).split('|'); r80S().holidays[a[0]] = a[1]; persist('focus'); try{ wakeArm(); }catch(x){} playTick(); renderView(); };
ACTIONS.r80Month = function(el, e, id){ const S = r80S(); S.month[id] = S.month[id]===false; persist('focus'); renderView(); };
ACTIONS.r80VacAdd = function(){
  const g = function(id){ const x = document.getElementById(id); return x ? x.value.trim() : ''; }, from = g('r80VacFrom'), to = g('r80VacTo') || from;
  if(!from){ const x = document.getElementById('r80VacFrom'); if(x) x.focus(); return; }
  r80S().vacations.push({from:from <= to ? from : to, to:from <= to ? to : from, label:g('r80VacLabel') || 'Vacation'}); persist('focus'); try{ wakeArm(); }catch(x){} renderView();
};
ACTIONS.r80VacDel = function(el, e, id){ r80S().vacations.splice(Number(id), 1); persist('focus'); renderView(); };
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='r80RuleNew'){ e.preventDefault(); ACTIONS.r80RuleAdd(); } });
// the month's rhythm: tasks on their day (only while the schedule is on)
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      const S = state.focus && state.focus.schedule; if(!S || !S.on || mt38Busy) return r;
      const t = todayStr(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)) - 1, ym = t.slice(0, 7);
      const want = [];
      if(S.month && S.month.plan!==false){ const d = r80NthDow(y, m, 1, 1); if(t >= d && t <= addDays(d, 6)) want.push({k:'monthPlan', title:'Plan the month: three goals, the shoots, the money target', due:addDays(d, 1)}); }
      if(S.month && S.month.wrap!==false){ const d = r80LastDow(y, m, 5); if(t >= d) want.push({k:'monthWrap', title:'Wrap the month: clients, content, money, what to change', due:addDays(d, 2) > ym+'-31' ? d : addDays(d, 2)}); }
      want.forEach(function(w){
        if(state.tasks.items.some(function(x){ return x.master && x.master.kind===w.k && x.master.ym===ym; })) return;
        state.tasks.items.push({id:uid(), title:w.title, client:'personal', clients:['personal'], priority:'high', deadline:w.due, notes:'From your schedule.', status:'today', createdAt:t, completedAt:null, master:{kind:w.k, ym:ym}});
        persist('tasks');
      });
    }catch(e){}
    return r;
  };
})(masterTasksSync);
// the alarm settings say who's running them
renderWakeSetup = (function(base){
  return function(){
    const h = base.apply(this, arguments), S = state.focus.schedule;
    if(!S || !S.on) return h;
    const note = '<div class="r80-runs">&#128197; Your schedule sets these times day by day. <button class="r43-link" data-action="r80OpenSched">Open your schedule</button> &nbsp;·&nbsp; A change for one morning or day still wins.</div>';
    return h.replace('<div class="wake-setup', function(m){ return note+m; });
  };
})(renderWakeSetup);
ACTIONS.r80OpenSched = function(){ try{ hideOverlay('wakeSetupOverlay'); }catch(e){} ui.view = 'personal'; ui.personalTab = 'schedule'; renderView(); };

// ================= Op knows all of it =================
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    try{
      if(!Array.isArray(s)) return s;
      const lines = [], t = todayStr(), S = state.focus.schedule;
      if(S && S.on){
        const dd = function(d){ const x = r80Day(d); return x.label+(x.wake ? ', up '+x.wake : ', no alarm')+(x.start ? ', work '+x.start+'–'+x.end : ''); };
        lines.push('His schedule (he set it; hold him to it): today '+dd(t)+'; tomorrow '+dd(addDays(t, 1))+'. Social nights this week: '+r80WeekSocial()+' of '+(S.social || 2)+'.');
        if(arr(S.rules).length) lines.push('His rules: '+S.rules.join(' | '));
        lines.push('When he asks whether to say yes to something, check it against the schedule and rules, give a straight yes or no with the reason, and the time to leave by.');
      }
      const M = r80M(), on = R80_MASTER.filter(function(m){ return M[m.id]; });
      if(on.length) lines.push('Master streaks: '+on.map(function(m){ const R = r80Run(m.id); return R80_TRACK[m.id].label+' '+R.run+' days (today '+(R.today===null ? 'off' : R.today ? 'done' : 'not yet')+')'; }).join('; ')+'.');
      const p = state.profile;
      if(p.maintCal || M.deficit){
        const e = r80Cals(t).reduce(function(a, c){ return a + Number(c.calories || 0); }, 0);
        lines.push('Calorie goal: burns about '+(p.maintCal || '?')+' a day, target '+r80CalTarget()+' (a '+(p.deficitCal || 500)+' deficit)'+(p.goalWeight ? ', goal weight '+p.goalWeight : '')+'. Eaten today: '+e+'. Give practical, specific tips to keep the deficit (meals, protein, timing), not lectures.');
      }
      if(lines.length) s.push({type:'text', text:lines.join('\n')});
    }catch(e){}
    return s;
  };
})(aiSystem);

// ================= the money check-ins: a cleaner sheet =================
function r80Prog(done, n){ return '<div class="r80-prog"><i style="width:'+Math.round(done/n*100)+'%"></i><span>'+done+' of '+n+' done</span></div>'; }
r55McHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), S = ui.r55Mc || {};
    const done = ['spend', 'where'].filter(function(k){ return S[k]; }).length;
    return h.replace(/(<div class="as-h">[\s\S]*?<\/div><\/div><\/div>)/, function(m){ return m+r80Prog(done, 2); });
  };
})(r55McHtml);
r79MonthHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), S = ui.r79Ms || {};
    const done = ['get', 'up', 'where', 'bills', 'next'].filter(function(k){ return S[k]; }).length;
    return h.replace(/(<div class="as-h">[\s\S]*?<\/div><\/div><\/div>)/, function(m){ return m+r80Prog(done, 5); });
  };
})(r79MonthHtml);

setTimeout(function(){ try{ r80M(); r80Sync(); }catch(e){ console.error(e); } }, 1500);

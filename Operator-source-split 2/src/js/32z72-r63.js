// ============ ROUND 63: Streaks ============
// The list is ROUND-63-LIST.md. Personal → Streaks: Today's standard is set here (and nowhere else), and streaks
// (challenges: a first streak, 75 Soft / Medium / Hard, your own) are started, checked off and kept here. The techniques
// that make a streak stick are built in: never miss twice, the two-minute version, a moment for each rule (stacking it
// onto something you already do), a visible chain, and stepping up from one challenge to the next.
const R63 = {};

// ================= The challenges =================
// (the 75s are their commonly published rules; 75 Hard's come from Andy Frisella; Soft and Medium have no official
// version. Every rule can be changed before you start.)
const R63_PRESETS = [
  {id:'first', name:'First streak', days:21, strict:'twice', icon:'&#127793;', line:'Three small wins a day for three weeks. One slip is fine; two in a row starts over.',
    rules:[{label:'Move for 10 minutes', cue:'After I get up'}, {label:'Read 2 pages', cue:'With my coffee'}, {label:'Plan tomorrow in 2 minutes', cue:'Before bed'}]},
  {id:'soft', name:'75 Soft', days:75, strict:'twice', icon:'&#127807;', line:'75 days. A gentler start: one workout, eat well, water, reading.',
    rules:[{label:'45-minute workout (one rest day a week)', cue:''}, {label:'Eat well, drink only on social occasions', cue:''}, {label:'3 liters of water', cue:''}, {label:'Read 10 pages', cue:''}]},
  {id:'medium', name:'75 Medium', days:75, strict:'twice', icon:'&#9889;', line:'75 days. One workout, your diet, water, reading and ten quiet minutes.',
    rules:[{label:'45-minute workout', cue:''}, {label:'Stick to your diet, no alcohol', cue:''}, {label:'3 liters of water', cue:''}, {label:'Read 10 pages', cue:''}, {label:'10 minutes of quiet (journal, breathe, pray)', cue:''}]},
  {id:'hard', name:'75 Hard', days:75, strict:'reset', icon:'&#128293;', line:'75 days, no exceptions. Miss anything and it’s back to day 1.',
    rules:[{label:'Workout 1: 45 minutes', cue:''}, {label:'Workout 2: 45 minutes, outside', cue:''}, {label:'Follow a diet: no cheat meals, no alcohol', cue:''}, {label:'Drink a gallon of water', cue:''}, {label:'Read 10 pages of non-fiction', cue:''}, {label:'Take a progress photo', cue:''}]},
  {id:'own', name:'Your own', days:30, strict:'twice', icon:'&#10024;', line:'Your rules, your length.', rules:[{label:'', cue:''}]}
];
const R63_LADDER = ['first', 'soft', 'medium', 'hard'];
const R63_STRICT = {reset:'Back to day 1', twice:'Never miss twice', track:'Just track it'};
const R63_TIPS = [
  ['Never miss twice', 'One slip is life. Two in a row is a new habit, so the day after a miss matters most.'],
  ['Make it two minutes', 'Start so small you can’t say no. Grow it once it’s automatic.'],
  ['Stack it', '“After I ___, I ___.” Tie each rule to something you already do every day.'],
  ['Same time, same place', 'Fewer decisions. The moment does the remembering for you.'],
  ['Don’t break the chain', 'Watch the row of days grow. It gets harder to break the longer it is.'],
  ['Step up', 'First streak, then 75 Soft, 75 Medium, 75 Hard. Finish one before the next.']
];

function r63List(){ const s = state.standards; if(!Array.isArray(s.challenges)) s.challenges = []; return s.challenges; }
function r63Active(){ return r63List().filter(function(c){ return !c.ended; }); }
function r63Diff(a, b){ return Math.round((new Date(b+'T12:00:00') - new Date(a+'T12:00:00'))/86400000); }
function r63DayDone(c, d){ const L = (c.log || {})[d] || []; return c.rules.length > 0 && c.rules.every(function(r){ return L.indexOf(r.id) >= 0; }); }
// where the run stands: when this run began, which day it is, the slips, the restarts, the best run so far
function r63Status(c){
  const today = todayStr(), end = c.ended ? c.ended.date : today;
  let runStart = c.start, miss = 0, restarts = 0, best = 0, slips = [], resets = [];
  for(let d = c.start; d < end; d = addDays(d, 1)){
    if(r63DayDone(c, d)){ miss = 0; continue; }
    if(c.strict==='track'){ slips.push(d); continue; }
    miss++;
    if(c.strict==='reset' || miss >= 2){ best = Math.max(best, r63Diff(runStart, d) - (c.strict==='twice' ? 1 : 0)); resets.push(d); runStart = addDays(d, 1); miss = 0; restarts++; }
    else slips.push(d);
  }
  const day = r63Diff(runStart, end) + 1;
  const doneToday = r63DayDone(c, end);
  const doneDays = c.strict==='track' ? Object.keys(c.log || {}).filter(function(d){ return d >= c.start && r63DayDone(c, d); }).length : 0;
  const finished = c.strict==='track' ? r63Diff(c.start, end) + 1 > c.days || (r63Diff(c.start, end) + 1===c.days && doneToday) : (day > c.days || (day===c.days && doneToday));
  best = Math.max(best, Math.min(c.days, day - (doneToday ? 0 : 1)));
  return {runStart:runStart, day:Math.min(day, c.days), rawDay:day, restarts:restarts, best:best, slips:slips, resets:resets, doneToday:doneToday, finished:finished, doneDays:doneDays};
}
// (a finished run closes itself and offers the next step)
function r63Settle(){
  let ch = false;
  r63Active().forEach(function(c){ const s = r63Status(c); if(s.finished){ c.ended = {date:todayStr(), done:true, at:Date.now()}; ch = true; R63.justDone = c.id; try{ showToast('You finished '+c.name+'. '+c.days+' days.', {icon:'&#127942;'}); }catch(e){} } });
  if(ch) persist('standards');
}
function r63New(p, over){
  over = over || {};
  const c = {id:uid(), preset:p.id, name:over.name || p.name, days:Number(over.days || p.days) || 30, strict:over.strict || p.strict, start:todayStr(), log:{}, ended:null, at:Date.now(),
    rules:(over.rules || p.rules).filter(function(r){ return String(r.label || '').trim(); }).map(function(r){ return {id:uid(), label:String(r.label).trim().slice(0, 120), cue:String(r.cue || '').trim().slice(0, 80)}; })};
  if(!c.rules.length) return null;
  r63List().push(c); persist('standards');
  return c;
}
function r63Tick(c, rid, on){
  const d = todayStr(); c.log = c.log || {}; const L = c.log[d] = c.log[d] || [];
  const i = L.indexOf(rid); const want = on==null ? i < 0 : !!on;
  if(want && i < 0) L.push(rid); if(!want && i >= 0) L.splice(i, 1);
  persist('standards');
  if(want && r63DayDone(c, d)){ try{ playTick(); showToast('Day '+r63Status(c).day+' of '+c.days+' done.', {icon:'&#128293;'}); }catch(e){} }
  r63Settle();
}

// ================= The tab =================
renderPersonal = (function(base){
  return function(){
    const want = ui.personalTab==='streaks';
    if(want) ui.personalTab = 'wishlist';
    let h;
    try{ h = base.apply(this, arguments); } finally { if(want) ui.personalTab = 'streaks'; }
    const tab = '<div class="tab '+(want ? 'active' : '')+'" data-action="personalTab" data-tab="streaks">Streaks</div>';
    h = h.replace(/(<div class="tab [^"]*" data-action="personalTab" data-tab="goals">Goals<\/div>)/, '$1'+tab);
    if(!want) return h;
    h = h.replace('<div class="tab active" data-action="personalTab" data-tab="wishlist">', '<div class="tab " data-action="personalTab" data-tab="wishlist">');
    const cut = r60Cut(h, '<div class="tab-panel" data-key="personal-wishlist">'); if(!cut) return h;
    return h.replace(cut.html, '<div class="tab-panel" data-key="personal-streaks">'+r63Tab()+'</div>');
  };
})(renderPersonal);
function r63Tab(){
  r63Settle();
  const act = r63Active(), past = r63List().filter(function(c){ return c.ended; }).slice().reverse();
  return '<div class="r63">'+
    act.map(r63RunHtml).join('')+
    (act.length ? '' : r63NextHtml())+
    r63StdHtml()+
    (act.length ? '<div class="r63-sec"><div class="r63-h">Start another</div>'+r63PresetsHtml(true)+'</div>' : '<div class="r63-sec"><div class="r63-h">Start a streak</div>'+r63PresetsHtml(false)+'</div>')+
    (past.length ? '<div class="r63-sec"><div class="r63-h">Past streaks</div><div class="r63-past">'+past.slice(0, 8).map(function(c){ const s = r63Status(c); return '<div class="r63-pr"><b>'+escapeHtml(c.name)+'</b><span>'+(c.ended.done ? '&#127942; Finished, '+c.days+' days' : 'Ended on day '+s.day+' of '+c.days)+'</span><small>'+escapeHtml(fmtDateShort ? fmtDateShort(c.start) : c.start)+'</small></div>'; }).join('')+'</div></div>' : '')+
    '<div class="r63-sec"><div class="r63-h">How streaks stick</div><div class="r63-tips">'+R63_TIPS.map(function(t){ return '<div class="r63-tip"><b>'+t[0]+'</b><span>'+t[1]+'</span></div>'; }).join('')+'</div></div>'+
  '</div>';
}
// (finished one: the next step up, front and centre)
function r63NextHtml(){
  const last = r63List().filter(function(c){ return c.ended && c.ended.done; }).slice(-1)[0]; if(!last) return '';
  const i = R63_LADDER.indexOf(last.preset), nx = i >= 0 && i < R63_LADDER.length - 1 ? R63_PRESETS.find(function(p){ return p.id===R63_LADDER[i + 1]; }) : null;
  return '<div class="r63-won"><div class="r63-won-i">&#127942;</div><div><b>'+escapeHtml(last.name)+' done.</b><span>'+last.days+' days in a row'+(nx ? '. Ready for '+nx.name+'?' : '.')+'</span></div>'+(nx ? '<button class="btn btn-primary btn-sm" data-action="r63Setup" data-id="'+nx.id+'">Start '+nx.name+'</button>' : '')+'</div>';
}
function r63RunHtml(c){
  const s = r63Status(c), today = todayStr(), L = (c.log || {})[today] || [];
  const pct = Math.round(100*(c.strict==='track' ? s.doneDays : s.day - (s.doneToday ? 0 : 1))/c.days);
  let chain = '';
  for(let i = 0; i < c.days; i++){
    const d = addDays(c.strict==='track' ? c.start : s.runStart, i);
    const cls = d > today ? 'is-f' : d===today ? (s.doneToday ? 'is-ok is-t' : 'is-t') : r63DayDone(c, d) ? 'is-ok' : s.slips.indexOf(d) >= 0 ? 'is-slip' : 'is-miss';
    chain += '<i class="'+cls+'" title="Day '+(i + 1)+'"></i>';
  }
  const note = s.restarts && c.strict!=='track' ? '<span class="r63-note">Back to day 1 on '+escapeHtml(fmtDateShort ? fmtDateShort(s.runStart) : s.runStart)+(s.best > 1 ? ' · best run '+s.best+' days' : '')+'</span>' : (s.slips.length && c.strict==='twice' && s.slips[s.slips.length - 1]===addDays(today, -1) ? '<span class="r63-note is-warn">You missed yesterday. Don’t miss twice.</span>' : '');
  return '<div class="r63-run" data-id="'+c.id+'">'+
    '<div class="r63-run-h"><div><div class="r63-run-n">'+escapeHtml(c.name)+'</div><div class="r63-run-d"><b>Day '+s.day+'</b> of '+c.days+'<span class="r63-pill">'+R63_STRICT[c.strict]+'</span></div></div>'+
      '<div class="r63-run-a"><button class="btn btn-ghost btn-sm" data-action="r63Restart" data-id="'+c.id+'">Restart</button><button class="btn btn-ghost btn-sm" data-action="r63End" data-id="'+c.id+'">End</button></div></div>'+
    '<div class="r63-bar"><i style="width:'+Math.max(0, Math.min(100, pct))+'%"></i></div>'+
    note+
    '<div class="r63-rules">'+c.rules.map(function(r){ const on = L.indexOf(r.id) >= 0; return '<button class="r63-rule'+(on ? ' is-on' : '')+'" data-action="r63Tick" data-id="'+c.id+'|'+r.id+'"><span class="r63-box">'+(on ? '&#10003;' : '')+'</span><span class="r63-rl">'+escapeHtml(r.label)+'</span>'+(r.cue ? '<span class="r63-cue">'+escapeHtml(r.cue)+'</span>' : '')+'</button>'; }).join('')+'</div>'+
    '<div class="r63-chain'+(c.days > 40 ? ' is-long' : '')+'">'+chain+'</div>'+
  '</div>';
}
function r63PresetsHtml(small){
  return '<div class="r63-pre'+(small ? ' is-small' : '')+'">'+R63_PRESETS.map(function(p){
    return '<button class="r63-pc" data-action="r63Setup" data-id="'+p.id+'"><span class="r63-pc-i">'+p.icon+'</span><b>'+p.name+'</b>'+(small ? '' : '<span class="r63-pc-l">'+p.line+'</span>')+'<span class="r63-pc-m">'+(p.id==='own' ? 'You choose' : p.days+' days · '+R63_STRICT[p.strict])+'</span></button>';
  }).join('')+'</div>';
}
// Today's standard, set here and only here
function r63StdHtml(){
  const S = state.standards, items = arr(S.items), dw = S.deepWorkTargetMinutes || 180, off = S.daysOffAllowedPerWeek!=null ? S.daysOffAllowedPerWeek : 2;
  const opts = [60, 90, 120, 150, 180, 210, 240, 300, 360, 420, 480];
  return '<div class="r63-sec r63-std" id="r63Std"><div class="r63-h">Today’s standard</div><div class="r63-std-c">'+
    '<div class="r63-std-row"><span class="r63-std-k">Deep work</span><select class="input r63-sel" data-r63-std="dw">'+opts.map(function(m){ return '<option value="'+m+'"'+(m===dw ? ' selected' : '')+'>'+fmtDurationLabel(m)+'</option>'; }).join('')+'</select>'+
      '<span class="r63-std-k">Days off a week</span><select class="input r63-sel" data-r63-std="off">'+[0, 1, 2, 3].map(function(n){ return '<option value="'+n+'"'+(n===off ? ' selected' : '')+'>'+n+'</option>'; }).join('')+'</select></div>'+
    '<div class="r63-items">'+items.map(function(it){ return '<span class="r63-it"><input value="'+escapeHtml(it.label)+'" data-r63-item="'+it.id+'" aria-label="Rename"><button data-action="r63StdDel" data-id="'+it.id+'" aria-label="Remove">&#10005;</button></span>'; }).join('')+
      '<span class="r63-it is-add"><input id="r63StdNew" placeholder="Add to the standard"><button data-action="r63StdAdd" aria-label="Add">&#43;</button></span></div>'+
  '</div></div>';
}
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute) return;
  const k = t.getAttribute('data-r63-std');
  if(k==='dw'){ state.standards.deepWorkTargetMinutes = Number(t.value) || 180; persist('standards'); renderView(); }
  if(k==='off'){ state.standards.daysOffAllowedPerWeek = Math.max(0, Math.min(6, Number(t.value) || 0)); persist('standards'); renderView(); }
  const id = t.getAttribute('data-r63-item');
  if(id){ const it = arr(state.standards.items).find(function(x){ return x.id===id; }); const v = t.value.trim(); if(it && v && v!==it.label){ it.label = v.slice(0, 120); persist('standards'); renderView(); } }
});
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='r63StdNew'){ e.preventDefault(); ACTIONS.r63StdAdd(); } });
ACTIONS.r63StdAdd = function(){ const i = document.getElementById('r63StdNew'), v = i ? i.value.trim() : ''; if(!v) return; state.standards.items.push({id:uid(), label:v.slice(0, 120), createdAt:todayStr()}); persist('standards'); playTick(); renderView(); setTimeout(function(){ const n = document.getElementById('r63StdNew'); if(n) n.focus(); }, 30); };
ACTIONS.r63StdDel = function(el, e, id){ state.standards.items = arr(state.standards.items).filter(function(x){ return x.id!==id; }); persist('standards'); renderView(); };

// ================= Starting one =================
ACTIONS.r63Setup = function(el, e, id){
  const p = R63_PRESETS.find(function(x){ return x.id===id; }) || R63_PRESETS[0];
  ui.r63Draft = {preset:p.id, name:p.id==='own' ? '' : p.name, days:p.days, strict:p.strict, rules:p.rules.map(function(r){ return {label:r.label, cue:r.cue}; })};
  addSheetOpen('r63Sheet', r63SheetHtml, p.id==='own' ? 'r63Name' : null);
};
function r63SheetHtml(){
  const D = ui.r63Draft || {}, p = R63_PRESETS.find(function(x){ return x.id===D.preset; }) || R63_PRESETS[0];
  return asHead(p.icon, p.id==='own' ? 'Your own streak' : p.name)+
    '<div class="r63-sh">'+
      '<label class="r63-f"><span>Name</span><input class="input" id="r63Name" data-r63-d="name" value="'+escapeHtml(D.name || '')+'" placeholder="e.g. 30 days locked in"></label>'+
      '<div class="r63-f"><span>Days</span><div class="seg-tabs seg-sm">'+[7, 14, 21, 30, 66, 75, 100].map(function(n){ return '<button class="seg-tab'+(D.days===n ? ' active' : '')+'" data-action="r63Draft" data-id="days|'+n+'">'+n+'</button>'; }).join('')+'</div></div>'+
      '<div class="r63-f"><span>If you miss a day</span><div class="seg-tabs seg-sm">'+Object.keys(R63_STRICT).map(function(k){ return '<button class="seg-tab'+(D.strict===k ? ' active' : '')+'" data-action="r63Draft" data-id="strict|'+k+'">'+R63_STRICT[k]+'</button>'; }).join('')+'</div></div>'+
      '<div class="r63-f"><span>Every day</span><div class="r63-dr">'+D.rules.map(function(r, i){ return '<div class="r63-drr"><input class="input" data-r63-d="rule|'+i+'" value="'+escapeHtml(r.label)+'" placeholder="What you’ll do"><input class="input r63-drc" data-r63-d="cue|'+i+'" value="'+escapeHtml(r.cue || '')+'" placeholder="When (after I…)"><button class="r63-x" data-action="r63Draft" data-id="del|'+i+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
        '<button class="btn btn-ghost btn-sm" data-action="r63Draft" data-id="add|1">&#43; Add a rule</button></div></div>'+
      '<button class="btn btn-primary hs-go" data-action="r63Start">Start today</button>'+
    '</div>';
}
document.addEventListener('input', function(e){
  const t = e.target, k = t && t.getAttribute && t.getAttribute('data-r63-d'); if(!k || !ui.r63Draft) return;
  const D = ui.r63Draft, m = /^(rule|cue)\|(\d+)$/.exec(k);
  if(k==='name') D.name = t.value;
  else if(m && D.rules[Number(m[2])]) D.rules[Number(m[2])][m[1]==='rule' ? 'label' : 'cue'] = t.value;
});
ACTIONS.r63Draft = function(el, e, id){
  const D = ui.r63Draft; if(!D) return;
  const a = String(id || '').split('|');
  if(a[0]==='days') D.days = Number(a[1]);
  if(a[0]==='strict') D.strict = a[1];
  if(a[0]==='del') D.rules.splice(Number(a[1]), 1);
  if(a[0]==='add'){ D.rules.push({label:'', cue:''}); setTimeout(function(){ const i = document.querySelector('[data-r63-d="rule|'+(D.rules.length - 1)+'"]'); if(i) i.focus(); }, 60); }
  addSheetRefresh('r63Sheet');
};
ACTIONS.r63Start = function(){
  const D = ui.r63Draft; if(!D) return;
  const p = R63_PRESETS.find(function(x){ return x.id===D.preset; }) || R63_PRESETS[4];
  if(!D.rules.some(function(r){ return String(r.label || '').trim(); })){ showToast('Add at least one rule.'); return; }
  const c = r63New(p, {name:String(D.name || '').trim() || p.name, days:D.days, strict:D.strict, rules:D.rules});
  if(!c) return;
  addSheetClose('r63Sheet'); ui.r63Draft = null;
  showToast(c.name+': day 1 starts today.', {icon:'&#128293;'});
  ui.view = 'personal'; ui.personalTab = 'streaks'; renderView();
};
ACTIONS.r63Tick = function(el, e, id){ const a = String(id || '').split('|'), c = r63List().find(function(x){ return x.id===a[0]; }); if(!c) return; r63Tick(c, a[1]); renderView(); };
ACTIONS.r63Restart = function(el, e, id){ const c = r63List().find(function(x){ return x.id===id; }); if(!c) return; uiConfirm('Restart '+c.name+' from day 1, today?').then(function(ok){ if(!ok) return; c.start = todayStr(); c.log = {}; persist('standards'); renderView(); }); };
ACTIONS.r63End = function(el, e, id){ const c = r63List().find(function(x){ return x.id===id; }); if(!c) return; uiConfirm('End '+c.name+'? It moves to past streaks.').then(function(ok){ if(!ok) return; c.ended = {date:todayStr(), done:false, at:Date.now()}; persist('standards'); renderView(); }); };

// ================= On Today =================
// The running streak sits in the streak panel, under Today's standard, with today's rules to tick. "Today's standard"
// opens Streaks (where it's set).
PANEL_RENDERERS.personalStats = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace('<span class="r60-std-k">Today’s standard</span>', '<button class="r60-std-k r63-stdlink" data-action="r63Open" data-hov="Set it in Personal → Streaks">Today’s standard</button>');
    const act = r63Active(); if(!act.length) return h;
    const strip = act.map(function(c){
      const s = r63Status(c), L = (c.log || {})[todayStr()] || [];
      return '<div class="r63-today"><button class="r63-today-k" data-action="r63Open"><b>'+escapeHtml(c.name)+'</b> · Day '+s.day+' of '+c.days+'</button><div class="r63-today-c">'+c.rules.map(function(r){ const on = L.indexOf(r.id) >= 0; return '<button class="r63-chip'+(on ? ' is-on' : '')+'" data-action="r63Tick" data-id="'+c.id+'|'+r.id+'">'+(on ? '&#10003; ' : '')+escapeHtml(r.label)+'</button>'; }).join('')+'</div></div>';
    }).join('');
    const i = h.indexOf('<div class="r60-std">'); if(i < 0) return h;
    const cut = r60Cut(h, '<div class="r60-std">'); if(!cut) return h;
    return h.slice(0, i + cut.html.length)+strip+h.slice(i + cut.html.length);
  };
})(PANEL_RENDERERS.personalStats);
ACTIONS.r63Open = function(){ ui.view = 'personal'; ui.personalTab = 'streaks'; renderView(); try{ const v = document.getElementById('viewRoot'); if(v) v.scrollTop = 0; }catch(e){} };

// ================= Settings: the standard moved out =================
// (Settings → Goals & Standards becomes Goals & Targets: work, content and new clients stay there)
renderSettings = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.split('Goals &amp; Standards').join('Goals &amp; Targets').split('Goals & Standards').join('Goals & Targets');
    ['<div class="field"><label>Deep work target per day', '<div class="card section"><div class="section-title">Streak Rules', '<div class="section"><div class="section-title">Daily Standard'].forEach(function(mk){ const c = r60Cut(h, mk); if(c) h = c.rest; });
    return h;
  };
})(renderSettings);

// ================= Op =================
OP_TOOLS.push(
  {name:'streak_check', description:'Check off (or undo) one of today\'s rules in his running streak, e.g. "I did my 10 pages". rule: a few words of the rule. done: false to undo.', input_schema:{type:'object', properties:{rule:{type:'string'}, done:{type:'boolean'}}, required:['rule'], additionalProperties:false}},
  {name:'start_streak', description:'Start a streak for him when he asks. preset: first (a first streak, 21 days), soft, medium, hard (75 Soft / Medium / Hard), or own with name, days and rules.', input_schema:{type:'object', properties:{preset:{type:'string'}, name:{type:'string'}, days:{type:'integer'}, rules:{type:'array', items:{type:'string'}}}, required:['preset'], additionalProperties:false}}
);
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='streak_check'){
      const w = String(x.rule || '').toLowerCase().split(/\s+/).filter(function(s){ return s.length > 2; });
      let best = null, score = 0;
      r63Active().forEach(function(c){ c.rules.forEach(function(r){ const l = r.label.toLowerCase(), n = w.filter(function(s){ return l.indexOf(s) >= 0; }).length; if(n > score){ score = n; best = {c:c, r:r}; } }); });
      if(!best) throw new Error('no rule in a running streak matches that');
      r63Tick(best.c, best.r.id, x.done!==false); try{ renderView(); }catch(e){}
      const s = r63Status(best.c);
      return (x.done===false ? 'unchecked: ' : 'checked off: ')+best.r.label+' ('+best.c.name+', day '+s.day+' of '+best.c.days+(s.doneToday ? ', today is complete' : '')+')';
    }
    if(name==='start_streak'){
      const p = R63_PRESETS.find(function(q){ return q.id===String(x.preset || '').toLowerCase(); }) || R63_PRESETS[4];
      const c = r63New(p, {name:x.name, days:x.days, rules:Array.isArray(x.rules) && x.rules.length ? x.rules.map(function(t){ return {label:t, cue:''}; }) : null});
      if(!c) throw new Error('a streak needs at least one rule');
      try{ renderView(); }catch(e){}
      return 'started '+c.name+': '+c.days+' days, '+R63_STRICT[c.strict].toLowerCase()+'; rules: '+c.rules.map(function(r){ return r.label; }).join('; ');
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    try{
      const act = r63Active();
      if(Array.isArray(s) && act.length) s.push({type:'text', text:'His running streak'+(act.length > 1 ? 's' : '')+': '+act.map(function(c){ const st = r63Status(c), L = (c.log || {})[todayStr()] || []; return c.name+', day '+st.day+' of '+c.days+' ('+R63_STRICT[c.strict]+'); today: '+c.rules.map(function(r){ return r.label+(L.indexOf(r.id) >= 0 ? ' (done)' : ''); }).join(', '); }).join(' | ')+'. When he says he did one, call streak_check.'});
    }catch(e){}
    return s;
  };
})(aiSystem);
setTimeout(function(){ try{ r63Settle(); }catch(e){} }, 0);

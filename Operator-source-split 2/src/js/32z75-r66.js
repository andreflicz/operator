// ============ ROUND 66 (part 1) ============
// The list is ROUND-66-LIST.md (with Andre's answers). Here: playbook task names, "When they finish", no "Starts when a
// lead reaches", a Clients view on the Calendar, challenges (a library by level, a real lock-in, what finishing is
// worth), the setup questions (where you are, your holidays, time off), the vault's sealed notes, Today's widgets.
// Notifications, social XP and the report are in 32z76-r66b.js.
const R66 = {};

// ================= A1. A playbook task is named after its step =================
// A new step starts as "New step" while you name it; its task was made at once and kept that name. Now a step that
// still has its placeholder name makes no task, and an open task follows its step's name (unless you renamed the task).
pbState = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(!R65.inSync || !s || !Array.isArray(s.occ)) return s;
    return Object.assign({}, s, {occ:s.occ.filter(function(o){ return String(o.it.title || '').trim() && o.it.title!=='New step'; })});
  };
})(pbState);
function r66TaskNames(){
  let ch = false;
  state.tasks.items.forEach(function(t){
    const m = t.master; if(!m || m.kind!=='pb' || t.status==='done') return;
    let st = null; try{ st = pb57StepOf(t); }catch(e){} if(!st || !st.title || st.title==='New step') return;
    const was = m.stepTitle || (t.title==='New step' || t.title==='Next step' || t.title==='Book: New step' ? t.title : null);
    if(was==null){ if(!m.stepTitle){ m.stepTitle = t.title===st.title ? st.title : '\u0000'; ch = true; } return; }
    if(t.title===was && st.title!==was){ t.title = st.title; m.stepTitle = st.title; ch = true; }
    else if(m.stepTitle!==st.title && t.title===st.title){ m.stepTitle = st.title; ch = true; }
  });
  return ch;
}
pbSync = (function(base){ return function(){ const r = base.apply(this, arguments); let ch = false; try{ ch = r66TaskNames(); }catch(e){} if(ch) persist('tasks'); return r || ch; }; })(pbSync);

// ================= A2. "When they finish": the stages (or another playbook) as choices =================
function r66EndOf(p){
  if(p.r66End && p.r66End.stage && pb57StageOf(p, p.r66End.stage)) return {k:'stage', id:p.r66End.stage};
  if(pbRepeats(p)){ const f = pbStages(p)[0]; return {k:'stage', id:f ? f.id : null}; }
  if(p.next && pbById(p.next)) return {k:'pb', id:p.next};
  return {k:'done'};
}
function r66EndHtml(p){
  const e = r66EndOf(p), L = pbStages(p), who = pbFor(p), others = pbAll().filter(function(x){ return x.id!==p.id && pbFor(x)===who; });
  const cur = e.k==='stage' ? 'Back to '+escapeHtml((pb57StageOf(p, e.id) || {}).name || 'a stage') : e.k==='pb' ? 'On to '+escapeHtml(pbById(e.id).name) : 'They’re done';
  const pill = function(id, label, on){ return '<button class="r66-endo'+(on ? ' is-on' : '')+'" data-action="r66End" data-id="'+p.id+'|'+id+'">'+label+'</button>'; };
  return '<span class="r66-endw"><span class="r66-endk">When they finish</span><button class="r66-endb'+(ui.r66EndOpen ? ' is-on' : '')+'" data-action="r66EndOpen">'+cur+' <i>&#9662;</i></button>'+
    (ui.r66EndOpen ? '<div class="r66-endpop">'+pill('done', 'They’re done', e.k==='done')+
      (L.length ? '<div class="r66-endh">Back to a stage</div>'+L.map(function(s, i){ return pill('stage:'+s.id, (i + 1)+'. '+escapeHtml(s.name), e.k==='stage' && e.id===s.id); }).join('') : '')+
      (others.length ? '<div class="r66-endh">On to another playbook</div>'+others.map(function(x){ return pill('pb:'+x.id, escapeHtml(x.name), e.k==='pb' && e.id===x.id); }).join('') : '')+'</div>' : '')+'</span>';
}
ACTIONS.r66EndOpen = function(){ ui.r66EndOpen = !ui.r66EndOpen; renderView(); };
ACTIONS.r66End = function(el, e, v){
  const a = String(v || '').split('|'), p = pbById(a[0]); if(!p) return;
  const c = a.slice(1).join('|');
  p.repeats = false; p.next = null; p.r66End = null;
  if(c.indexOf('stage:')===0){ p.r66End = {stage:c.slice(6)}; if(pbStages(p)[0] && pbStages(p)[0].id===p.r66End.stage) p.repeats = true; }
  else if(c.indexOf('pb:')===0) p.next = c.slice(3);
  try{ pbKindSync(p); }catch(err){}
  ui.r66EndOpen = false; playTick(); pbSave(); renderView();
};
document.addEventListener('mousedown', function(e){ if(ui.r66EndOpen && !(e.target.closest && e.target.closest('.r66-endw'))){ ui.r66EndOpen = false; try{ renderView(); }catch(err){} } });
// (the last stage: back to the stage you picked)
pbAdvance = (function(base){
  return function(kind, x, manual){
    const s = pbState(kind, x);
    if(s && s.stage && s.p && s.p.r66End && s.p.r66End.stage && s.si===s.stages.length - 1 && !(pb57Rep(s.stage) && !manual)){
      const to = pb57StageOf(s.p, s.p.r66End.stage);
      if(to){ x.pb.run = Date.now().toString(36).slice(-5); return pb57Enter(kind, x, to.id, {again:true, quiet:!manual}); }
    }
    return base.apply(this, arguments);
  };
})(pbAdvance);
// ================= A3. No "Starts when a lead reaches" (every lead is on the lead playbook already) =================
renderBusiness = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(ui.businessTab!=='lifecycle' || ui.pbView!=='build') return h;
    h = h.replace(/<label class="pb6-rule"><span>Starts when a lead reaches<\/span>[\s\S]*?<\/label>/, '');
    const p = pbSel && pbSel();
    if(p) h = h.replace(/<label class="pb6-rule"><span>(?:When they finish|After the last stage)<\/span>[\s\S]*?<\/label>/, function(){ return r66EndHtml(p); });
    return h;
  };
})(renderBusiness);

// ================= B4. Calendar: all clients at once =================
function r66CliShort(c){ const n = String(c.business || c.name || '?'); return n.length > 8 ? n.split(/\s+/).map(function(w){ return w[0]; }).join('').slice(0, 3).toUpperCase() : n; }
function r66AllItems(from, to){
  const out = [];
  mtActiveClients().forEach(function(c){ try{ r59ClientItems(c, from, to).forEach(function(x){ out.push(Object.assign({}, x, {cli:c, cc:clientAccent(c), t:r66CliShort(c)+' · '+x.t})); }); }catch(e){} });
  return out;
}
cxMonthCardHtml = (function(base){
  return function(){
    if(ui.r59CalClient!=='__all') return base.apply(this, arguments);
    ui.r59CalClient = null; R66.allCal = true; let out;
    try{ out = base.apply(this, arguments); } finally { ui.r59CalClient = '__all'; R66.allCal = false; }
    const y = ui.calendarYear, m = ui.calendarMonth, dim = new Date(y, m + 1, 0).getDate(), today = todayStr(), sel = ui.calendarSelectedDate || today;
    const off = ui.r59CcOff || {}, items = r66AllItems(todayStr(new Date(y, m, 1)), todayStr(new Date(y, m, dim))).filter(function(x){ return !off[x.kind]; }), by = {};
    items.forEach(function(x){ (by[x.date] = by[x.date] || []).push(x); });
    out = out.replace(/(<button class="cx-d[^"]*" data-action="selectCalDay" data-date="(\d{4}-\d{2}-\d{2})"[^>]*>)<span>(\d+)<\/span>[\s\S]*?<\/button>/g, function(m0, open, ds, n){
      const its = by[ds] || [];
      return open+'<span>'+n+'</span>'+(its.length ? '<small class="cx-peek" style="--c:'+its[0].cc+'">'+escapeHtml(its[0].t)+'</small>'+(its.length > 1 ? '<small class="cx-more">+'+(its.length - 1)+'</small>' : '') : '')+'<em>'+Array.from(new Set(its.map(function(x){ return x.cc; }))).slice(0, 4).map(function(col){ return '<i style="background:'+col+'"></i>'; }).join('')+'</em></button>';
    });
    const day = by[sel] || [];
    const agenda = '<div class="cx-agenda r59-cxa r66-cxa" data-key="r66cxa-'+sel+'"><div class="r59-cxa-h">All clients &middot; '+escapeHtml(fmtDateShort(sel))+'</div>'+(day.length ? day.map(function(x){ return '<div class="r59-cxa-i" style="--c:'+x.cc+'"><i></i><span>'+escapeHtml(x.t)+'</span><small>'+escapeHtml((R59_KINDS.find(function(k){ return k[0]===x.kind; }) || ['', ''])[1])+'</small></div>'; }).join('') : '<div class="r59-cxa-none">Nothing for your clients this day.</div>')+'</div>';
    out = out.replace(/<div class="cx-legend[^"]*">[\s\S]*?<\/div>/, '<div class="cx-legend r59-cxl">'+R59_KINDS.map(function(k){ return '<button class="'+(off[k[0]] ? '' : 'is-on')+'" data-action="r59CalKind" data-id="'+k[0]+'">'+k[1]+'</button>'; }).join('')+'</div>');
    out = out.replace(/<div class="cx-agenda[\s\S]*<\/section>$/, agenda+'</section>');
    return out;
  };
})(cxMonthCardHtml);
r59CalClient = (function(base){ return function(){ if(ui.r59CalClient==='__all') return null; return base.apply(this, arguments); }; })(r59CalClient);
r60CalPickHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const all = ui.r59CalClient==='__all' || R66.allCal;
    if(all) h = h.replace(/(<button class="r60-calb[^"]*"[^>]*>[\s\S]*?<\/svg>)[\s\S]*?(<\/button>)/, '$1<span>All clients</span>$2').replace('class="r60-calb', 'class="r60-calb is-client is-all');
    return h.replace(/(<div class="r60-calk">Clients<\/div>)/, '<button class="r60-calo'+(all ? ' is-on' : '')+'" data-action="r60CalSet" data-id="__all"><i style="--cc:linear-gradient(135deg,#ff8fb1,#8fd3ff)"></i>All clients</button>$1');
  };
})(r60CalPickHtml);

// ================= C5–6. Challenges: a library by level, a real lock-in, what finishing is worth =================
// Day streaks (working regularly) stay what they are. Challenges are stretches of doing something good for yourself,
// non-stop, at four levels of hardness. Starting one is a commitment: why you're doing it, the rules read back, and you
// hold to lock in. Finishing pays XP by level and length; the tab shows what it would do to your level.
const R66_LEVELS = [{n:1, name:'Warm-up', per:20, c:'#7ef0c0'}, {n:2, name:'Build', per:30, c:'#8fd3ff'}, {n:3, name:'Commit', per:40, c:'#c3a6ff'}, {n:4, name:'Hard', per:60, c:'#ff8a4a'}];
(function(){
  const lv = {first:1, soft:2, medium:3, hard:4, own:2};
  R63_PRESETS.forEach(function(p){ p.level = lv[p.id] || 2; });
  const add = function(o, beforeId){ const i = R63_PRESETS.findIndex(function(p){ return p.id===beforeId; }); R63_PRESETS.splice(i < 0 ? R63_PRESETS.length : i, 0, o); };
  add({id:'reset7', level:1, name:'7-day reset', days:7, strict:'reset', icon:'&#9201;', line:'One clean week to get your feet under you.', rules:[{label:'Up by 7', cue:''}, {label:'No junk food', cue:''}, {label:'20 minutes of movement', cue:''}, {label:'Plan tomorrow tonight', cue:'Before bed'}]}, 'soft');
  add({id:'clean30', level:2, name:'30 days clean', days:30, strict:'reset', icon:'&#128167;', line:'No alcohol for 30 days (the Dry January idea, any month).', rules:[{label:'No alcohol', cue:''}, {label:'3 liters of water', cue:''}]}, 'soft');
  add({id:'eat30', level:2, name:'Clean eating 30', days:30, strict:'reset', icon:'&#129367;', line:'30 days of real food (Whole30-style): no added sugar, no junk.', rules:[{label:'No added sugar', cue:''}, {label:'No fast food or junk', cue:''}, {label:'Log what you eat', cue:''}]}, 'soft');
  add({id:'cold30', level:2, name:'Cold 30', days:30, strict:'reset', icon:'&#129482;', line:'A cold shower every day for 30 days.', rules:[{label:'2-minute cold shower', cue:'After I get up'}]}, 'soft');
  add({id:'habit66', level:3, name:'66 days', days:66, strict:'twice', icon:'&#129504;', line:'One habit for 66 days: the median it takes to become automatic.', rules:[{label:'Your one habit', cue:''}]}, 'medium');
  add({id:'monk30', level:3, name:'Monk mode 30', days:30, strict:'reset', icon:'&#129496;', line:'30 days of focus: no scrolling, deep work, body, early nights.', rules:[{label:'No social media scrolling', cue:''}, {label:'4 hours of deep work', cue:''}, {label:'Train', cue:''}, {label:'Read 10 pages', cue:''}, {label:'In bed by 11', cue:''}]}, 'medium');
  add({id:'monk90', level:4, name:'Monk mode 90', days:90, strict:'reset', icon:'&#9876;&#65039;', line:'90 days. One goal, nothing else.', rules:[{label:'No social media scrolling', cue:''}, {label:'5 hours of deep work', cue:''}, {label:'Train', cue:''}, {label:'Read 10 pages', cue:''}, {label:'No alcohol', cue:''}, {label:'In bed by 11', cue:''}]}, 'own');
  const own = R63_PRESETS.find(function(p){ return p.id==='own'; }); if(own){ R63_PRESETS.splice(R63_PRESETS.indexOf(own), 1); R63_PRESETS.push(own); }
})();
const R66_QUOTES = [
  ['Discipline is choosing between what you want now and what you want most.', 'Abraham Lincoln (attributed)'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant, on Aristotle'],
  ['Hard choices, easy life. Easy choices, hard life.', 'Jerzy Gregorek'],
  ['You will never always be motivated. You have to learn to be disciplined.', 'Unknown'],
  ['The pain of discipline weighs ounces. The pain of regret weighs tons.', 'Jim Rohn (attributed)'],
  ['Don’t count the days. Make the days count.', 'Muhammad Ali'],
  ['Small daily improvements over time lead to stunning results.', 'Robin Sharma'],
  ['The only easy day was yesterday.', 'U.S. Navy SEALs'],
  ['Success isn’t always about greatness. It’s about consistency.', 'Dwayne Johnson'],
  ['When you feel like quitting, think about why you started.', 'Unknown'],
  ['Do something today that your future self will thank you for.', 'Unknown'],
  ['It never gets easier. You just get better.', 'Unknown']
];
function r66Quote(){ const d = todayStr(), i = Math.abs(d.split('').reduce(function(a, ch){ return a*31 + ch.charCodeAt(0) | 0; }, 7)) % R66_QUOTES.length; return R66_QUOTES[i]; }
function r66LevelOf(p){ return R66_LEVELS[(p.level || 2) - 1] || R66_LEVELS[1]; }
function r66ChXp(c){ const p = R63_PRESETS.find(function(x){ return x.id===c.preset; }) || {}; const L = r66LevelOf(p); return Math.round(c.days*L.per*(c.strict==='reset' ? 1.2 : c.strict==='track' ? .6 : 1)); }
// (finishing one pays, once)
r63Settle = (function(base){
  return function(){
    const before = r63List().filter(function(c){ return !c.ended; }).map(function(c){ return c.id; });
    const r = base.apply(this, arguments);
    r63List().forEach(function(c){ if(before.indexOf(c.id) >= 0 && c.ended && c.ended.done && !c.r66Paid){ c.r66Paid = true; r66XpAdd({d:todayStr(), why:'Finished '+c.name, xp:r66ChXp(c), k:'challenge', a:'personal'}); persist('standards'); } });
    return r;
  };
})(r63Settle);
function r66Proj(add){
  let x = null; try{ x = xpSummary(); }catch(e){} if(!x) return null;
  const to = x.total + add, L = xpLevelOf(to);
  return {from:x.level, to:Math.max(x.level, L), total:x.total, add:add};
}
// the tab, with the push
r63Tab = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const q = r66Quote(), act = r63Active();
    let worth = '';
    if(act.length){
      const c = act[0], s = r63Status(c), xp = r66ChXp(c), P = r66Proj(xp);
      worth = '<div class="r66-worth"><div><b>+'+xp.toLocaleString()+' XP</b><span>when you finish '+escapeHtml(c.name)+'</span></div>'+(P ? '<div><b>Level '+P.from+' &rarr; '+P.to+'</b><span>'+(P.to > P.from ? 'where finishing takes you' : 'and closer to the next one')+'</span></div>' : '')+'<div><b>'+(c.days - s.day + (s.doneToday ? 0 : 1))+'</b><span>days left. '+(c.strict==='reset' ? 'Miss one and it’s day 1.' : c.strict==='twice' ? 'Never miss twice.' : 'Keep going.')+'</span></div></div>';
    }
    const top = '<section class="r66-hero"><div class="r66-q"><p>“'+escapeHtml(q[0])+'”</p><small>'+escapeHtml(q[1])+'</small></div>'+worth+'</section>';
    h = h.replace('<div class="r65s">', '<div class="r65s">'+top);
    // the start cards, by level
    const lvl = R66_LEVELS.map(function(L){
      const ps = R63_PRESETS.filter(function(p){ return p.id!=='own' && (p.level || 2)===L.n; });
      return ps.length ? '<div class="r66-lvl" style="--lc:'+L.c+'"><div class="r66-lvl-h"><b>'+L.n+'</b><span>'+L.name+'</span></div><div class="r66-lvl-g">'+ps.map(function(p){ return '<button class="r66-pc" data-action="r63Setup" data-id="'+p.id+'"><span class="r66-pc-i">'+p.icon+'</span><b>'+escapeHtml(p.name)+'</b><small>'+p.days+' days · +'+Math.round(p.days*L.per*(p.strict==='reset' ? 1.2 : 1)).toLocaleString()+' XP</small></button>'; }).join('')+'</div></div>' : '';
    }).join('');
    h = h.replace(/<div class="r65-pre">[\s\S]*?<\/div><\/section>/, '<div class="r66-lvls">'+lvl+'<button class="r66-own" data-action="r63Setup" data-id="own">&#10024; Make your own</button></div></section>');
    return h;
  };
})(r63Tab);
// the run card carries your why
r65RunHtml = (function(base){ return function(c){ const h = base.apply(this, arguments); return c.why ? h.replace('<div class="r65-tag">', '<div class="r66-why">“'+escapeHtml(c.why)+'”</div><div class="r65-tag">') : h; }; })(r65RunHtml);
// starting: the sheet, then the commitment
r63SheetHtml = (function(base){
  return function(){
    const D = ui.r63Draft || {};
    if(D.r66Step!=='commit') return base.apply(this, arguments).replace(/<button class="btn btn-primary hs-go" data-action="r63Start">Start today<\/button>/, '<button class="btn btn-primary hs-go" data-action="r66Next">Next: commit</button>');
    const p = R63_PRESETS.find(function(x){ return x.id===D.preset; }) || {}, rules = D.rules.filter(function(r){ return String(r.label || '').trim(); });
    const name = String(D.name || '').trim() || p.name, who = String(state.profile.name || '').split(' ')[0] || 'I';
    const xp = Math.round(D.days*r66LevelOf(p).per*(D.strict==='reset' ? 1.2 : D.strict==='track' ? .6 : 1));
    return asHead(p.icon || '&#128293;', 'Lock in')+
      '<div class="r66-commit">'+
        '<p class="r66-oath">'+escapeHtml(who)+', for the next <b>'+D.days+' days</b>, every day, you will:</p>'+
        '<ol class="r66-rules">'+rules.map(function(r){ return '<li>'+escapeHtml(r.label)+(r.cue ? ' <small>'+escapeHtml(r.cue)+'</small>' : '')+'</li>'; }).join('')+'</ol>'+
        '<p class="r66-rule-line">'+(D.strict==='reset' ? 'Miss one day and it’s back to day 1.' : D.strict==='twice' ? 'One slip is life. Two in a row and it starts over.' : 'Every day you show up counts.')+'</p>'+
        '<label class="r66-whyf"><span>Why are you doing this?</span><textarea class="input" id="r66Why" data-r66-why rows="2" placeholder="The real reason. You’ll see it every day.">'+escapeHtml(D.why || '')+'</textarea></label>'+
        '<div class="r66-stake"><b>+'+xp.toLocaleString()+' XP</b> when you finish '+escapeHtml(name)+'.</div>'+
        '<button class="r66-hold" data-r66-hold="1"><span class="r66-hold-f"></span><span class="r66-hold-t">Hold to lock in</span></button>'+
        '<button class="r66-back" data-action="r66Back">Back</button>'+
      '</div>';
  };
})(r63SheetHtml);
document.addEventListener('input', function(e){ if(e.target && e.target.hasAttribute && e.target.hasAttribute('data-r66-why') && ui.r63Draft) ui.r63Draft.why = e.target.value; });
ACTIONS.r66Next = function(){
  const D = ui.r63Draft; if(!D) return;
  if(!D.rules.some(function(r){ return String(r.label || '').trim(); })){ showToast('Add at least one rule.'); return; }
  D.r66Step = 'commit'; addSheetRefresh('r63Sheet'); setTimeout(function(){ const t = document.getElementById('r66Why'); if(t) t.focus(); }, 60);
};
ACTIONS.r66Back = function(){ const D = ui.r63Draft; if(!D) return; D.r66Step = null; addSheetRefresh('r63Sheet'); };
(function(){
  let H = null;
  const stop = function(){ if(!H) return; clearTimeout(H.t); H.b.classList.remove('is-holding'); H = null; };
  document.addEventListener('pointerdown', function(e){
    const b = e.target.closest && e.target.closest('[data-r66-hold]'); if(!b) return;
    e.preventDefault();
    const D = ui.r63Draft; if(!D) return;
    if(!String(D.why || '').trim()){ const t = document.getElementById('r66Why'); if(t){ t.classList.add('is-need'); t.focus(); } showToast('Write down why first.'); return; }
    b.classList.add('is-holding');
    H = {b:b, t:setTimeout(function(){ stop(); r66LockIn(); }, 1600)};
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(k){ document.addEventListener(k, function(e){ if(H && (k!=='pointerleave' || e.target===H.b)) stop(); }, true); });
})();
function r66LockIn(){
  const D = ui.r63Draft; if(!D) return;
  const why = String(D.why || '').trim();
  const before = r63List().length;
  ACTIONS.r63Start();
  const c = r63List().length > before ? r63List()[r63List().length - 1] : null;
  if(c){ c.why = why.slice(0, 300); persist('standards'); }
  try{ playPositive && playPositive(); }catch(e){}
  r66LockedMoment(c);
  renderView();
}
function r66LockedMoment(c){
  const q = r66Quote(), o = document.createElement('div'); o.className = 'r66-locked';
  o.innerHTML = '<div class="r66-locked-c"><div class="r66-locked-k">Locked in</div><div class="r66-locked-n">Day 1</div><div class="r66-locked-t">'+escapeHtml(c ? c.name : '')+'</div><p>“'+escapeHtml(q[0])+'”</p></div>';
  document.body.appendChild(o);
  requestAnimationFrame(function(){ o.classList.add('is-in'); });
  const go = function(){ o.classList.remove('is-in'); setTimeout(function(){ o.remove(); }, 500); };
  o.addEventListener('click', go); setTimeout(go, 3200);
}

// ================= H18. The app asks what it needs: where you are, your holidays, time off =================
// A card at the top of Today until it's answered (it doesn't jump in front of anything). The answers: day streaks skip
// the holidays you take off (and the days around them you choose), the holiday looks follow your holidays, Op knows.
const R66_HOLS = [
  {id:'newyear', name:'New Year’s Day', d:function(y){ return y+'-01-01'; }},
  {id:'easter', name:'Easter', d:function(y){ return typeof r60Easter==='function' ? r60Easter(y) : null; }},
  {id:'memorial', name:'Memorial Day', d:function(y){ const d = new Date(y, 4, 31); while(d.getDay()!==1) d.setDate(d.getDate() - 1); return todayStr(d); }, us:true},
  {id:'july4', name:'Independence Day', d:function(y){ return y+'-07-04'; }, us:true},
  {id:'labor', name:'Labor Day', d:function(y){ const d = new Date(y, 8, 1); while(d.getDay()!==1) d.setDate(d.getDate() + 1); return todayStr(d); }, us:true},
  {id:'halloween', name:'Halloween', d:function(y){ return y+'-10-31'; }},
  {id:'thanksgiving', name:'Thanksgiving', d:function(y){ return holThanksgiving(y); }, us:true},
  {id:'christmaseve', name:'Christmas Eve', d:function(y){ return y+'-12-24'; }},
  {id:'christmas', name:'Christmas', d:function(y){ return y+'-12-25'; }},
  {id:'nye', name:'New Year’s Eve', d:function(y){ return y+'-12-31'; }}
];
const R66_COUNTRIES = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Ireland', 'Australia', 'New Zealand', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Brazil', 'Argentina', 'Colombia', 'Philippines', 'India', 'Nigeria', 'South Africa', 'United Arab Emirates', 'Other'];
function r66Me(){ const p = state.profile; return p.r66Me && typeof p.r66Me==='object' ? p.r66Me : null; }
function r66HolOff(dateStr){
  const M = r66Me(); if(!M || !M.off) return false;
  const y = Number(dateStr.slice(0, 4)), ext = Math.max(0, Math.min(5, Number(M.ext) || 0));
  return arr(M.hols).some(function(id){ const H = R66_HOLS.find(function(h){ return h.id===id; }); if(!H) return false; return [y - 1, y, y + 1].some(function(yy){ const d = H.d(yy); if(!d) return false; const k = r63Diff(d, dateStr); return k >= -ext && k <= ext; }); }) ||
    arr(M.own).some(function(o){ if(!o || !o.date) return false; const d = Number(dateStr.slice(0, 4))+o.date.slice(4); const k = r63Diff(d, dateStr); return k >= -ext && k <= ext; });
}
isDayOff = (function(base){ return function(d){ if(d && r66HolOff(d)) return true; return base.apply(this, arguments); }; })(isDayOff);
holToday = (function(base){
  return function(d){
    const h = base.apply(this, arguments), M = r66Me();
    if(!h || h==='birthday' || !M) return h;
    return arr(M.hols).indexOf(h) >= 0 ? h : null;
  };
})(holToday);
// the card on Today
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(r66Me() || state.profile.r66SetupLater===todayStr()) return h;
    const card = '<div class="r66-ask"><div class="r66-ask-i">&#128075;</div><div class="r66-ask-t"><b>Let’s set you up</b><span>Where you are, the holidays you celebrate, and when you take time off. Three quick questions.</span></div><button class="btn btn-primary btn-sm" data-action="r66SetupOpen">Start</button><button class="r66-ask-x" data-action="r66SetupLater" aria-label="Later">&#10005;</button></div>';
    return h.replace(/(<div class="today-hero)/, card+'$1');
  };
})(renderToday);
ACTIONS.r66SetupLater = function(){ state.profile.r66SetupLater = todayStr(); persist('profile'); renderView(); };
ACTIONS.r66SetupOpen = function(){
  const M = r66Me() || {};
  ui.r66Draft = {step:0, country:M.country || '', hols:arr(M.hols).slice(), off:M.off!=null ? !!M.off : true, ext:Number(M.ext) || 0, own:arr(M.own).slice()};
  addSheetOpen('r66Setup', r66SetupHtml);
};
function r66SetupHtml(){
  const D = ui.r66Draft || {step:0}, steps = ['Where you are', 'Your holidays', 'Time off'];
  const dots = '<div class="r66-steps">'+steps.map(function(s, i){ return '<span class="'+(i===D.step ? 'is-on' : i < D.step ? 'is-done' : '')+'">'+s+'</span>'; }).join('')+'</div>';
  let body = '';
  if(D.step===0) body = '<label class="r66-f"><span>Where do you live?</span><select class="input" data-r66-d="country"><option value="">Pick one</option>'+R66_COUNTRIES.map(function(c){ return '<option'+(D.country===c ? ' selected' : '')+'>'+c+'</option>'; }).join('')+'</select></label>';
  if(D.step===1){
    const list = R66_HOLS.filter(function(H){ return !H.us || !D.country || D.country==='United States'; });
    body = '<div class="r66-f"><span>Which holidays do you celebrate?</span><div class="r66-hols">'+list.map(function(H){ const on = D.hols.indexOf(H.id) >= 0; return '<button class="r66-hol'+(on ? ' is-on' : '')+'" data-action="r66Hol" data-id="'+H.id+'">'+(on ? '&#10003; ' : '')+escapeHtml(H.name)+'</button>'; }).join('')+'</div></div>'+
      '<div class="r66-f"><span>Any others? (a date and a name)</span><div class="r66-own">'+D.own.map(function(o, i){ return '<span class="r66-ownc">'+escapeHtml(o.name)+' · '+escapeHtml(fmtDateShort(o.date))+'<button data-action="r66OwnDel" data-id="'+i+'">&#10005;</button></span>'; }).join('')+
      '<input type="date" class="input" id="r66OwnD"><input class="input" id="r66OwnN" placeholder="e.g. Diwali, Eid, a family day"><button class="btn btn-sm" data-action="r66OwnAdd">Add</button></div></div>';
  }
  if(D.step===2) body = '<div class="r66-f"><span>On your holidays, do you take the day off?</span><div class="seg-tabs seg-sm"><button class="seg-tab'+(D.off ? ' active' : '')+'" data-action="r66Set" data-id="off|1">Yes, I’m off</button><button class="seg-tab'+(!D.off ? ' active' : '')+'" data-action="r66Set" data-id="off|0">I work through them</button></div></div>'+
    (D.off ? '<div class="r66-f"><span>Extra days around each one</span><div class="seg-tabs seg-sm">'+[0, 1, 2, 3].map(function(n){ return '<button class="seg-tab'+(D.ext===n ? ' active' : '')+'" data-action="r66Set" data-id="ext|'+n+'">'+(n ? '±'+n : 'Just the day')+'</button>'; }).join('')+'</div></div>' : '')+
    '<p class="r66-note">Days off don’t break your day streak. Your usual days off a week stay in Personal → Streaks.</p>';
  return asHead('&#128075;', 'Let’s set you up')+dots+'<div class="r66-sb">'+body+'</div><div class="r66-sf">'+(D.step ? '<button class="btn btn-ghost" data-action="r66Step" data-id="-1">Back</button>' : '<span></span>')+'<button class="btn btn-primary hs-go" data-action="'+(D.step < 2 ? 'r66Step' : 'r66SetupSave')+'" data-id="1">'+(D.step < 2 ? 'Next' : 'Done')+'</button></div>';
}
document.addEventListener('change', function(e){ const t = e.target; if(t && t.getAttribute && t.getAttribute('data-r66-d')==='country' && ui.r66Draft){ ui.r66Draft.country = t.value; } });
ACTIONS.r66Step = function(el, e, n){ const D = ui.r66Draft; if(!D) return; D.step = Math.max(0, Math.min(2, D.step + Number(n))); addSheetRefresh('r66Setup'); };
ACTIONS.r66Hol = function(el, e, id){ const D = ui.r66Draft; if(!D) return; const i = D.hols.indexOf(id); if(i >= 0) D.hols.splice(i, 1); else D.hols.push(id); addSheetRefresh('r66Setup'); };
ACTIONS.r66Set = function(el, e, v){ const D = ui.r66Draft; if(!D) return; const a = String(v).split('|'); if(a[0]==='off') D.off = a[1]==='1'; if(a[0]==='ext') D.ext = Number(a[1]); addSheetRefresh('r66Setup'); };
ACTIONS.r66OwnAdd = function(){ const D = ui.r66Draft; if(!D) return; const d = (document.getElementById('r66OwnD') || {}).value, n = ((document.getElementById('r66OwnN') || {}).value || '').trim(); if(!d || !n){ showToast('Pick a date and give it a name.'); return; } D.own.push({date:d, name:n.slice(0, 40)}); addSheetRefresh('r66Setup'); };
ACTIONS.r66OwnDel = function(el, e, i){ const D = ui.r66Draft; if(!D) return; D.own.splice(Number(i), 1); addSheetRefresh('r66Setup'); };
ACTIONS.r66SetupSave = function(){
  const D = ui.r66Draft; if(!D) return;
  state.profile.r66Me = {country:D.country || '', hols:D.hols.slice(0, 20), off:!!D.off, ext:D.ext || 0, own:D.own.slice(0, 20), at:Date.now()};
  persist('profile'); addSheetClose('r66Setup'); ui.r66Draft = null;
  try{ xpCache && (xpCache.days = {}); }catch(e){}
  showToast('Got it. Your holidays and time off are set.', {icon:'&#9989;'}); renderView();
};
// Op knows
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments), M = r66Me();
    if(M && Array.isArray(s)){ const names = arr(M.hols).map(function(id){ const H = R66_HOLS.find(function(h){ return h.id===id; }); return H ? H.name : null; }).filter(Boolean).concat(arr(M.own).map(function(o){ return o.name; })); s.push({type:'text', text:'About him: lives in '+(M.country || 'unknown')+'. Celebrates '+(names.join(', ') || 'no particular holidays')+(M.off ? ', takes them off'+(M.ext ? ' (±'+M.ext+' days)' : '') : ', works through them')+'.'}); }
    return s;
  };
})(aiSystem);
// (in Settings → You: change them any time)
ACTIONS.r66SetupEdit = ACTIONS.r66SetupOpen;

// ================= E10. The vault: sealed notes stay sealed =================
// Week and month notes went into the vault readable straight away. They're sealed now: a week note opens 30 days after
// you seal it, a month note 91 days after (the same as "send it back to me"). Notes already in there whose date has
// passed get a new date in the future, so they're sealed too.
function r66VaultFix(){
  const L = vaultStore(); let ch = false; const today = todayStr(), first = !state.settings.r66VaultFixed;
  L.forEach(function(m){
    if(m.kind!=='week' && m.kind!=='month') return;
    if(!m.openOn){
      const nat = addDays(todayStr(new Date(m.at || Date.now())), m.kind==='month' ? 91 : 30);
      m.openOn = nat > today || !first ? nat : addDays(today, m.kind==='month' ? 91 : 30);
      ch = true;
    }
  });
  if(first){ state.settings.r66VaultFixed = true; ch = true; }
  if(ch){ persist('settings'); persist('journal'); }
}
vaultItems = (function(base){
  return function(){
    try{ r66VaultFix(); }catch(e){}
    const today = todayStr();
    return base.apply(this, arguments).map(function(m){ if((m.kind==='week' || m.kind==='month') && m.openOn && m.openOn > today) return Object.assign({}, m, {locked:true}); return m; });
  };
})(vaultItems);
vaultHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    vaultItems().forEach(function(m){
      if(m.kind!=='week' && m.kind!=='month') return;
      const label = m.kind==='month' ? 'Month note' : 'Week note';
      const re = new RegExp('(data-id="'+m.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')+'"[\\s\\S]*?)<span class="r60-vs is-open">'+label+' · open</span>');
      h = h.replace(re, function(m0, a){ return a+(m.locked ? '<span class="r60-vs is-sealed">'+label+' · opens '+escapeHtml(fmtDateShort(m.openOn))+'</span>' : '<span class="r60-vs is-open">'+label+' · open</span>'); });
    });
    return h;
  };
})(vaultHtml);
setTimeout(function(){ try{ r66VaultFix(); }catch(e){} }, 0);

// ================= D8. Your why: small by default (it's short) =================
R60_SPAN_DEF.why = 4;
setTimeout(function(){ try{ const S = r60Spans(); if(!state.dashboardPanels.r66WhySmall){ if(!S.why || S.why===12) S.why = 4; state.dashboardPanels.r66WhySmall = true; persist('dashboardPanels'); } }catch(e){} }, 0);

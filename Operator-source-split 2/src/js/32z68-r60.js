// ============ ROUND 60 (core) ============
// The list is ROUND-60-LIST.md. This file: Op's read typing once, the push-to-talk cut showing his reply once, Op
// filing app changes every time, playbook presets (built-in and your own) and chains, deliverables by the month, and
// personal packages.
const R60 = {};

// ================= A1. Op's read types once and stays =================
// What went wrong: Round 59 wrote a read again whenever the stored one was over 220 characters, so a long read was
// fetched again on the next redraw (it typed twice, or rewrote itself after it was done). Now a read is only written
// again for the reasons it always was (a new day, your ↻); a read made before Round 59 that's too long is redone once.
opReadKick = (function(base){
  return function(kind, facts, ask, opts){
    const st = opReadStore(), cur = st[kind];
    if(cur && String(cur.text || '').length > R59_READ_MAX && !(opts && opts.force)){
      // (stand the long read in as short for Round 59's check, so it isn't fetched again; the page clamps it to fit)
      const t = cur.text; cur.text = t.slice(0, R59_READ_MAX);
      try{ return base.apply(this, arguments); } finally { if(st[kind]===cur) cur.text = t; }
    }
    return base.apply(this, arguments);
  };
})(opReadKick);

// ================= A2. The push-to-talk cut shows his reply once =================
// What went wrong: the cut wrote the line he was saying into the chat, then the end of his turn wrote his whole reply
// again. Now the cut writes one entry, and the end of the turn fills that same entry with the whole reply.
opChatLog = (function(base){
  return function(r, t){
    const c = R60.cutEntry;
    if(r==='op' && c && Date.now() - c.at < 180000){
      const L = opChat(), e = L.indexOf(c.e) >= 0 ? c.e : null;
      if(e){ const full = String(t || '').replace(/\s+/g, ' ').trim(); if(full && full.length >= e.t.length) e.t = full.slice(0, 4000); persist('focus'); if(R60.turnDone) R60.cutEntry = null; return; }
    }
    return base.apply(this, arguments);
  };
})(opChatLog);
r59ShowLine = function(text){
  const t = String(text || '').replace(/\s+/g, ' ').trim(); if(!t) return;
  const L = opChat(), c = R60.cutEntry;
  if(c && L.indexOf(c.e) >= 0){ if(t.length > c.e.t.length || c.e.t.indexOf(t) < 0) c.e.t = c.e.t.indexOf(t) >= 0 ? c.e.t : (t.indexOf(c.e.t)===0 ? t : c.e.t+' '+t); persist('focus'); }
  else { const e = {r:'op', t:t.slice(0, 4000), at:Date.now()}; L.push(e); persist('focus'); R60.cutEntry = {e:e, at:Date.now()}; }
  try{ opChatDraw(); }catch(e){}
  setTimeout(function(){ const b = document.querySelector('#opBub .op-bub-log'); if(b) b.scrollTop = b.scrollHeight; }, 30);
};
aiAsk = (function(base){
  return function(){
    R60.turnDone = false;
    if(R60.cutEntry && Date.now() - R60.cutEntry.at > 1500) R60.cutEntry = null;   // (a new message starts clean)
    const r = base.apply(this, arguments);
    Promise.resolve(r).catch(function(){}).then(function(){ R60.turnDone = true; setTimeout(function(){ R60.cutEntry = null; }, 50); });
    return r;
  };
})(aiAsk);

// ================= A3. Op files app changes, every time =================
// Op is told again, plainly; and when Andre's message asks for something to be added to the updates and Op filed
// nothing, the app writes it up and files it itself (and Op's reply can't claim otherwise without it being true).
const R60_ASKS_UPDATE = /\b(add|put|log|file|save|mark|note|write)\b[^.?!]{0,40}\b(to|in|into|as)\b[^.?!]{0,20}\b(the\s+)?(app\s+)?updates?\b|\b(add|log|mark)\s+(that|this|it)\s+(to|as|in)\s+(the\s+)?updates?\b|\bplease add that\b/i;
aiAsk = (function(base){
  return function(text){
    const t = String(text || '').trim(), T0 = R58.turn;
    const r = base.apply(this, arguments);
    Promise.resolve(r).then(function(){
      const T = R60.lastTurn; if(!T || T.text!==t) return;
      if(!T.filed && !T.tools.some(function(n){ return /suggest_improvement|mark_update|file_updates|add_journal/.test(n); }) && R60_ASKS_UPDATE.test(t)){
        const words = r58IsMeta(t) ? r58Words() : t;
        r59Summarize(words).then(function(s){ r59File(s || words, s ? words : '', Date.now()); try{ renderView(); }catch(e){} });
      }
    }).catch(function(){});
    return r;
  };
})(aiAsk);
// (keep hold of the turn after Round 58 lets it go, so the check above can read it)
opRunTool = (function(base){ return function(){ if(R58.turn) R60.lastTurn = R58.turn; return base.apply(this, arguments); }; })(opRunTool);
aiAsk = (function(base){ return function(){ const r = base.apply(this, arguments); if(R58.turn) R60.lastTurn = R58.turn; return r; }; })(aiAsk);
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:'Non-negotiable: when he asks you to add, log, mark or put something in the updates, or gives you a change or feedback for this app, you call suggest_improvement (or mark_update / file_updates) in that same reply, before you answer. He relies on you for this and will not check. Only then say it is saved.'});
    return s;
  };
})(aiSystem);

// ================= B6–B8. Playbook presets and chains =================
// Built-in presets to start from (each one an ordinary playbook you can change), your own presets (save any playbook
// as one), and chains: Onboarding hands people to Monthly client by itself when it's done.
function r60St(name, extra, steps){ const s = pb57Stage(name, extra || {}); s.steps = steps || []; return s; }
function r60Sp(title, type, due, extra){ return pb57Step(title, type, due, extra); }
const R60_PRESETS = [
  {key:'onboarding', name:'Onboarding', icon:'&#128075;', line:'The first week and month with a new client', build:function(){
    return {repeats:false, stages:[
      r60St('First week', {days:7}, [r60Sp('Welcome call', 'call', {rule:'enter'}), r60Sp('Get access', 'access', {rule:'day', n:2}, {checklist:[{id:uid(), t:'Meta Business Manager'}, {id:uid(), t:'Ad account'}, {id:uid(), t:'Brand assets'}]}), r60Sp('Send the intake form', 'send', {rule:'day', n:2}), r60Sp('Kick-off call', 'call', {rule:'day', n:5})]),
      r60St('First month', {days:23}, [r60Sp('Strategy doc', 'doc', {rule:'day', n:3}), r60Sp('First content out', 'task', {rule:'day', n:10}), r60Sp('30-day review call', 'call', {rule:'end'})])]}; }},
  {key:'monthly', name:'Monthly client', icon:'&#128197;', line:'The rhythm every month: reports, calls, check-ins', build:function(){
    return {repeats:false, stages:[r60St('Every month', {repeat:'month'}, [r60Sp('Weekly report', 'report', {rule:'week', dow:5}), r60Sp('Book the monthly call', 'task', {rule:'before', n:7}), r60Sp('Monthly call', 'call', {rule:'before', n:3}), r60Sp('Monthly report', 'report', {rule:'end'})])]}; }},
  {key:'save', name:'Save a client', icon:'&#129693;', line:'When a client goes quiet or wants to leave', build:function(){
    return {repeats:false, stages:[r60St('At risk', {days:10}, [r60Sp('Save call', 'call', {rule:'enter'}), r60Sp('Send a quick win', 'send', {rule:'day', n:3}), r60Sp('Check in', 'task', {rule:'day', n:7}), r60Sp('Decide: stay or wrap up', 'task', {rule:'end'})])]}; }},
  {key:'offboarding', name:'Offboarding', icon:'&#128075;', line:'Wrap up well and leave the door open', build:function(){
    return {repeats:false, stages:[r60St('Wrapping up', {days:7}, [r60Sp('Final report', 'report', {rule:'day', n:2}), r60Sp('Hand over access and files', 'access', {rule:'day', n:4}), r60Sp('Ask for a testimonial or referral', 'send', {rule:'end'})])]}; }}
];
function r60Customs(){ const c = crm(); if(!Array.isArray(c.pbPresets)) c.pbPresets = []; return c.pbPresets; }
// a copy with fresh ids (so a preset never shares steps with a playbook)
function r60Fresh(stages){ return JSON.parse(JSON.stringify(arr(stages))).map(function(s){ s.id = uid(); s.steps = arr(s.steps).map(function(it){ it.id = uid(); arr(it.checklist).forEach(function(c){ c.id = uid(); }); it.files = []; return it; }); return s; }); }
function r60Make(name, def, next){
  const p = pbNew('client', name, 30, {for:'client', repeats:!!def.repeats, next:next || null});
  p.stages = r60Fresh(def.stages); p.postDays = []; if(def.preset) p.preset = def.preset;
  pbAll().push(p); pbSave(); return p;
}
function r60UsePreset(key){
  if(key==='chain'){
    const m = r60Make('Monthly client', Object.assign(R60_PRESETS[1].build(), {preset:'monthly'}));
    const o = r60Make('Onboarding', Object.assign(R60_PRESETS[0].build(), {preset:'onboarding'}), m.id);
    return o;
  }
  const b = R60_PRESETS.find(function(x){ return x.key===key; });
  if(b) return r60Make(b.name, Object.assign(b.build(), {preset:b.key}));
  const c = r60Customs().find(function(x){ return x.id===key; });
  if(c) return r60Make(c.name, {stages:c.stages, repeats:c.repeats});
  return null;
}
ACTIONS.r60UsePreset = function(el, e, key){
  const p = r60UsePreset(key); if(!p) return;
  addSheetClose('pb6NewSheet'); playPositive();
  ui.view = 'business'; ui.businessTab = 'lifecycle'; ui.pbView = 'build'; ui.pbSel = p.id; ui.pbItem = null; ui.pb57Stage = pbStages(p)[0] ? pbStages(p)[0].id : null; ui.pb57StageEdit = false;
  renderView(); showToast(key==='chain' ? 'Onboarding, then Monthly client: people move on by themselves.' : p.name+' is ready to make your own.', {icon:'&#9776;'});
};
ACTIONS.r60SavePreset = function(el, e, id){
  const p = pbById(id); if(!p) return;
  const L = r60Customs(), was = L.find(function(x){ return x.from===p.id; });
  const snap = {id:was ? was.id : uid(), from:p.id, name:p.name, repeats:!!p.repeats, stages:JSON.parse(JSON.stringify(pbStages(p))), at:Date.now()};
  if(was) L[L.indexOf(was)] = snap; else L.push(snap);
  pbSave(); playPositive(); showToast((was ? 'Preset updated: ' : 'Saved as a preset: ')+p.name, {icon:'&#11088;'}); renderView();
};
ACTIONS.r60DelPreset = function(el, e, id){ const c = crm(); c.pbPresets = r60Customs().filter(function(x){ return x.id!==id; }); pbSave(); playTick(); try{ addSheetRefresh('pb6NewSheet'); }catch(err){} renderView(); };

// ================= C10. Deliverables by the week or by the month =================
// A deliverable can be "3 a week" or "2 a month" (two YouTube videos a month). A monthly one counts against the month
// only: it's never "behind this week".
function r60PerMonth(d){ return !!(d && d.per==='month'); }
function r60Monthly(d){ return Math.max(1, Math.round(Number(d.monthly) || 1)); }
monthlyTargetFor = (function(base){ return function(d){ return r60PerMonth(d) ? r60Monthly(d) : base.apply(this, arguments); }; })(monthlyTargetFor);
isDeliverableDoneThisWeek = (function(base){ return function(d){ if(d && d.recurring && r60PerMonth(d)) return deliverableMonthCount(d) >= r60Monthly(d); return base.apply(this, arguments); }; })(isDeliverableDoneThisWeek);
r59PkNeed = function(d){ return r60PerMonth(d) ? r60Monthly(d) : Math.max(1, Math.round((Number(d.weeklyTarget) || 1)*52/12)); };
function r60Cadence(d){ return r60PerMonth(d) ? r60Monthly(d)+' a month' : (Number(d.weeklyTarget) || 1)+' a week'; }
// (clients on a package get the cadence too)
r59PkSync = (function(base){
  return function(pk){
    base.apply(this, arguments);
    arr(state.business.clients).forEach(function(c){ if(c.packageId!==pk.id) return; arr(c.deliverables).forEach(function(d){ const pd = d.fromPackage && arr(pk.deliverables).find(function(x){ return x.id===d.sourceId; }); if(!pd) return; if(r60PerMonth(pd)){ d.per = 'month'; d.monthly = r60Monthly(pd); } else { delete d.per; delete d.monthly; } }); });
  };
})(r59PkSync);
if(typeof assignClientPackage==='function') assignClientPackage = (function(base){ return function(id){ const r = base.apply(this, arguments); const c = arr(state.business.clients).find(function(x){ return x.id===id; }), pk = c && r59Pk(c.packageId); if(pk){ r59PkSync(pk); persist('business'); } return r; }; })(assignClientPackage);

// ================= C11. Personal packages =================
// A package marked Personal is your own content plan: no price, no "who's on it", nothing billed. (You aren't put on
// it: you lock in on it from Social when you're ready.)
function r60Personal(pk){ return !!(pk && (pk.personal || pk.type==='self')); }

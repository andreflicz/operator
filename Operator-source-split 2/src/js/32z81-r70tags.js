// ============ ROUND 70 (part 2): NFC tags ============
// A tag is a sticker with a link on it. Tap your phone to it and the Mac runs the tag's steps: lock in, start a
// break, go to sleep, log a meal, talk to Op. One tag can do several things, and each step can have a rule, so the
// same tag locks you in when you're out and locks you out when you're in.
//
// An iPhone can't read a tag from a web page, so the link does the work: `http://<host>:8940/t/<secret>`. It opens
// from the banner with one tap, or with none at all through a Shortcuts automation. Every tag has its own secret,
// so there's no code to type and no header to set.
//
// The list is ROUND-70-LIST.md, items 19–47. The app updates are in 32z80-r70.js.

STATE_KEYS.push('tags');
function r70TagsNorm(t){
  t = t && typeof t==='object' ? t : {};
  if(!Array.isArray(t.list)) t.list = [];
  t.list.forEach(function(g){
    if(!Array.isArray(g.steps)) g.steps = [];
    g.steps.forEach(function(s){ if(!s.id) s.id = uid(); if(!s.when || typeof s.when!=='object') s.when = {}; });
    if(typeof g.on!=='boolean') g.on = true;
    g.taps = Number(g.taps) || 0;
  });
  if(!Array.isArray(t.log)) t.log = [];
  return t;
}
function r70Tags(){ if(!state.tags || !Array.isArray(state.tags.list)) state.tags = r70TagsNorm(state.tags); return state.tags; }
function r70TagList(){ return r70Tags().list; }
init = typeof init==='function' ? (function(base){
  return async function(){
    try{ state.tags = r70TagsNorm(await loadKey('tags', {list:[], log:[]})); }catch(e){ state.tags = r70TagsNorm(null); }
    return base.apply(this, arguments);
  };
})(init) : init;
// a secret per tag: 128 bits, so a link can stand on its own with no code and no header
function r70Secret(){
  try{
    const a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.from(a).map(function(b){ return ('0'+b.toString(16)).slice(-2); }).join('');
  }catch(e){ return (Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)).slice(0, 32); }
}
function r70TagBySecret(sec){ return r70TagList().find(function(g){ return g.secret===String(sec || ''); }) || null; }
function r70TagById(id){ return r70TagList().find(function(g){ return g.id===id; }) || null; }

// ---------------- what a step can do ----------------
// Each one says where it likes to live, what it needs, and what it does. Place is only ever a suggestion:
// any action can go on any tag.
const R70T_ACTS = [
  {id:'lockin', g:'Focus', label:'Lock in', icon:'&#9201;&#65039;', place:'desk'},
  {id:'lockout', g:'Focus', label:'Lock out', icon:'&#9209;&#65039;', place:'desk'},
  {id:'locktoggle', g:'Focus', label:'Lock in, or out if I already am', icon:'&#128260;', place:'desk', toggle:true},
  {id:'break', g:'Focus', label:'Take a break', icon:'&#9749;', place:'desk', num:{key:'min', label:'minutes', def:15}},
  {id:'breakend', g:'Focus', label:'End the break', icon:'&#9654;&#65039;', place:'desk'},
  {id:'breaktoggle', g:'Focus', label:'Break, or end the one I’m on', icon:'&#128260;', place:'desk', toggle:true},
  {id:'block', g:'Focus', label:'A timed block of work', icon:'&#9203;', place:'desk', num:{key:'min', label:'minutes', def:50}},
  {id:'sleep', g:'Your day', label:'Go to sleep (snooze if the alarm is going)', icon:'&#128164;', place:'nightstand'},
  {id:'awake', g:'Your day', label:'I’m awake', icon:'&#9728;&#65039;', place:'nightstand'},
  {id:'goodmorning', g:'Your day', label:'Start Good morning', icon:'&#127749;', place:'nightstand'},
  {id:'out', g:'Your day', label:'I’m heading out', icon:'&#128682;', place:'the door', pick:{key:'kind', opts:[['shooting', 'Shooting'], ['training', 'Training'], ['errand', 'An errand'], ['other', 'Something else'], ['ask', 'Ask me which']], def:'ask'}},
  {id:'back', g:'Your day', label:'I’m back', icon:'&#127968;', place:'the door'},
  {id:'shoot', g:'Your day', label:'Shooting mode', icon:'&#127916;', place:'your bag'},
  {id:'train', g:'Your day', label:'Training mode', icon:'&#128170;', place:'the gym bag'},
  {id:'reading', g:'Your day', label:'A reading block', icon:'&#128214;', place:'the reading chair', toggle:true},
  {id:'meal', g:'Log', label:'Log a meal', icon:'&#127869;&#65039;', place:'the kitchen', sticky:true},
  {id:'weigh', g:'Log', label:'Weigh in', icon:'&#9878;&#65039;', place:'the bathroom', value:'number', sticky:true},
  {id:'water', g:'Log', label:'Log water', icon:'&#128167;', place:'the kitchen'},
  {id:'workout', g:'Log', label:'Log a workout', icon:'&#127947;', place:'the gym bag', sticky:true},
  {id:'note', g:'Log', label:'A journal entry (say it)', icon:'&#128221;', place:'anywhere', value:'text'},
  {id:'standard', g:'Log', label:'Tick off today’s standard', icon:'&#9989;', place:'the desk'},
  {id:'task', g:'Tasks', label:'Add a task (say it)', icon:'&#128203;', place:'anywhere', value:'text'},
  {id:'ask', g:'Op', label:'Talk to Op', icon:'&#128483;&#65039;', place:'your keychain', value:'text'},
  {id:'read', g:'Op', label:'Op reads you the day', icon:'&#128276;', place:'the desk'},
  {id:'nudge', g:'Op', label:'Remind me to log something', icon:'&#128226;', place:'anywhere', pick:{key:'kind', opts:[['meal', 'A meal'], ['workout', 'A workout'], ['weigh', 'Your weight'], ['shoot', 'What you shot']], def:'meal'}}
];
function r70TAct(id){ return R70T_ACTS.find(function(a){ return a.id===id; }) || null; }

// ---------------- the rules on a step ----------------
// Nothing set means the step always runs. Anything set has to be true at the moment of the tap.
const R70T_RULES = [
  {id:'locked', label:'Only when I’m', opts:[['in', 'locked in'], ['out', 'not locked in']]},
  {id:'onbreak', label:'Only when I’m', opts:[['yes', 'on a break'], ['no', 'not on a break']]},
  {id:'sleeping', label:'Only when I’m', opts:[['yes', 'asleep'], ['no', 'awake']]},
  {id:'ringing', label:'Only when the alarm is', opts:[['yes', 'going'], ['no', 'not going']]},
  {id:'away', label:'Only when I’m', opts:[['yes', 'out'], ['no', 'home']]},
  {id:'first', label:'Only on', opts:[['yes', 'the first tap today'], ['no', 'the taps after the first']]},
  {id:'part', label:'Only in the', opts:[['am', 'morning (before noon)'], ['pm', 'afternoon and evening'], ['night', 'night (after 9pm)']]}
];
function r70TNow(){
  const as = state.focus.activeSession, m = state.modes && state.modes.active, h = new Date().getHours();
  let ringing = false; try{ ringing = !!(typeof wakeRing!=='undefined' && wakeRing) || !!(state.focus.snooze && state.focus.snooze.wake); }catch(e){}
  return {
    locked:!!as,
    onbreak:!!((as && as.onBreak) || (m && m.type==='break')),
    sleeping:!!(m && m.sleep),
    ringing:ringing,
    away:!!r70TOut(),
    hour:h, part:h < 12 ? 'am' : h < 21 ? 'pm' : 'night'
  };
}
function r70TStepFits(s, now, first){
  const w = s.when || {};
  if(w.locked && w.locked!==(now.locked ? 'in' : 'out')) return false;
  if(w.onbreak && w.onbreak!==(now.onbreak ? 'yes' : 'no')) return false;
  if(w.sleeping && w.sleeping!==(now.sleeping ? 'yes' : 'no')) return false;
  if(w.ringing && w.ringing!==(now.ringing ? 'yes' : 'no')) return false;
  if(w.away && w.away!==(now.away ? 'yes' : 'no')) return false;
  if(w.first && w.first!==(first ? 'yes' : 'no')) return false;
  if(w.part && w.part!==now.part) return false;
  if(w.from && w.to){
    const mins = now.hour*60 + new Date().getMinutes();
    const a = r70TMins(w.from), b = r70TMins(w.to);
    if(a!=null && b!=null && !(a <= b ? (mins >= a && mins <= b) : (mins >= a || mins <= b))) return false;
  }
  return true;
}
function r70TMins(hhmm){ const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? Number(m[1])*60 + Number(m[2]) : null; }

// ---------------- running a tap ----------------
// Every step whose rules fit runs, in order, and each one says in plain words what it did. Already done is not a
// failure: "Already locked in, 1h 12m" is a perfectly good answer.
const R70T = {last:{}, running:false};
function r70TOut(){ const o = state.focus.r70Out; return o && o.startedAt ? o : null; }
function r70TSay(parts){
  const L = parts.filter(Boolean);
  if(!L.length) return 'Nothing to do.';
  return L.join(' ');
}
function r70TRunStep(s, g, value){
  const act = s.act, n = Math.max(1, Math.round(Number(s.min) || (r70TAct(act) && r70TAct(act).num ? r70TAct(act).num.def : 0) || 0));
  const as = state.focus.activeSession, m = state.modes && state.modes.active;
  switch(act){
    case 'lockin':
    case 'locktoggle': {
      if(as && act==='locktoggle') return r70TRunStep({act:'lockout'}, g);
      if(as) return 'Already locked in, '+fmtDurationLabel(Math.max(1, Math.round((Date.now() - as.startedAt)/60000)))+'.';
      try{ opRunTool('lock_in', {}); }catch(e){ return 'Couldn’t lock in: '+(e.message || e); }
      return 'Locked in.';
    }
    case 'lockout': {
      if(!as) return 'You weren’t locked in.';
      // a tap right after locking in is nearly always the tag being read twice: ask instead of ending it
      if(Date.now() - as.startedAt < 10*60000){
        r70TConfirmOut(g);
        return 'You only locked in '+fmtDurationLabel(Math.max(1, Math.round((Date.now() - as.startedAt)/60000)))+' ago, so I’ve asked on the Mac before ending it.';
      }
      const mins = r70LockOutNow();
      return 'Locked out. '+fmtDurationLabel(mins)+' this session.';
    }
    case 'break': {
      if(as && as.onBreak) return 'Already on a break.';
      if(m && m.type==='break') return 'Already on a break.';
      try{ opRunTool('take_break', {minutes:n}); }catch(e){ return 'Couldn’t start a break: '+(e.message || e); }
      r70StopMusic();
      return 'On a break, '+n+' min.';
    }
    case 'breakend': {
      if(as && as.onBreak){ endBreakModeFromFocus(); return 'Break over, back to it.'; }
      if(m && m.type==='break'){ endMode(); return 'Break over.'; }
      return 'You weren’t on a break.';
    }
    case 'breaktoggle': return r70TRunStep({act:(as && as.onBreak) || (m && m.type==='break') ? 'breakend' : 'break', min:s.min}, g);
    case 'block': {
      if(as) return 'Already locked in, '+fmtDurationLabel(Math.max(1, Math.round((Date.now() - as.startedAt)/60000)))+'.';
      try{ opRunTool('lock_in', {}); }catch(e){ return 'Couldn’t start it: '+(e.message || e); }
      state.focus.r70Block = {until:Date.now() + n*60000}; persist('focus');
      return n+' minutes, starting now.';
    }
    case 'sleep': {
      const now = r70TNow();
      if(now.ringing){
        let t = '';
        try{ if(typeof snoozeRegularAlarm==='function') snoozeRegularAlarm(); else snoozeAlarm(); }catch(e){}
        try{ const sn = state.focus.snooze; if(sn && sn.ts) t = fmtTimeShort(sn.ts); }catch(e){}
        return 'Snoozed'+(t ? ' until '+t : '')+'.';
      }
      if(now.sleeping) return 'Already down for the night.';
      r70TSleepStart();
      return 'Goodnight. I’ll be quiet until the alarm.';
    }
    case 'awake': {
      const slept = r70TWakeUp();
      return slept ? 'Morning. '+slept+'.' : 'Morning.';
    }
    case 'goodmorning': {
      r70TWakeUp();
      setTimeout(function(){ try{ if(ACTIONS.sleepGoodMorning) ACTIONS.sleepGoodMorning(); }catch(e){} }, 400);
      return 'Starting your morning.';
    }
    case 'out': {
      const o = r70TOut(); if(o) return 'You’re already out ('+r70TOutName(o.kind)+').';
      let kind = s.kind || 'ask';
      if(kind==='ask' && String(value || '')) kind = String(value).toLowerCase();
      if(kind==='ask'){ r70TAskOut(g); return 'What are you heading out for? I’ve asked on the Mac.'; }
      return r70TGoOut(kind, g && g.id);
    }
    case 'back': return r70TComeBack();
    case 'shoot': return r70TGoOut('shooting', g && g.id);
    case 'train': return r70TGoOut('training', g && g.id);
    case 'reading': {
      if(m && m.type==='offtime' && m.note==='Reading'){ endMode(); return 'Reading done, '+fmtDurationLabel(Math.max(1, Math.round((Date.now() - m.startedAt)/60000)))+'.'; }
      startMode('offtime', {note:'Reading'});
      return 'Reading. Enjoy it.';
    }
    case 'meal': {
      r70NudgeAdd('meal', g && g.id);
      return 'What did you eat?';
    }
    case 'weigh': {
      const w = Number(value);
      if(!isFinite(w) || w <= 0){ r70NudgeAdd('weigh', g && g.id); return 'What are you weighing in at?'; }
      // (addWeight reads the boxes on the Health page; from a tag there are no boxes)
      const before = arr(state.health.weightLog).slice(-1)[0];
      state.health.weightLog.push({id:uid(), date:todayStr(), weight:w});
      persist('health'); try{ playPositive(); }catch(e){}
      r70NudgeClear('weigh');
      if(!before || !Number(before.weight)) return w+' logged. First one on the board.';
      const d = w - Number(before.weight);
      return w+' logged. '+(Math.abs(d) < 0.05 ? 'Same as last time.' : (d < 0 ? 'Down ' : 'Up ')+Math.abs(d).toFixed(1)+' from last time.');
    }
    case 'water': {
      try{ if(typeof addWater==='function') addWater(1); else if(typeof ACTIONS.addWater==='function') ACTIONS.addWater(); else throw new Error('x'); }
      catch(e){ const h = state.health; h.r70Water = (Number(h.r70Water) || 0) + 1; persist('health'); }
      return 'Water logged.';
    }
    case 'workout': { r70NudgeAdd('workout', g && g.id); return 'Log the workout when you get a second.'; }
    case 'note': {
      const t = String(value || '').trim(); if(!t){ return 'Nothing to write down.'; }
      state.journal.entries.push({id:uid(), title:'', text:t.slice(0, 20000), date:todayStr(), createdAt:new Date().toISOString(), tag:null});
      persist('journal');
      return 'In your journal.';
    }
    case 'standard': { ui.view = 'personal'; ui.personalTab = 'streaks'; return 'Today’s standard is up on the Mac.'; }
    case 'task': {
      const t = String(value || s.title || '').trim(); if(!t) return 'What’s the task?';
      try{ opRunTool('add_task', {title:t}); }catch(e){ state.tasks.items.push({id:uid(), title:t.slice(0, 200), status:'today', createdAt:todayStr()}); persist('tasks'); }
      return 'Added: '+t.slice(0, 60)+'.';
    }
    case 'ask': {
      const t = String(value || s.text || '').trim(); if(!t) return 'I’m listening.';
      r70TAsk(t, g);
      return '…';
    }
    case 'read': { try{ aiAsk('Read me the day: where I am, what’s next, in three short lines.'); }catch(e){} return 'Coming up.'; }
    case 'nudge': { r70NudgeAdd(s.kind || 'meal', g && g.id); return 'I’ll keep asking.'; }
  }
  return '';
}
function r70TRun(g, o){
  o = o || {};
  if(!g) return {ok:false, say:'That tag isn’t set up on this Mac.', code:'unknown'};
  if(!g.on) return {ok:false, say:'That tag is switched off.', code:'off'};
  // one tap, however many times the phone reads it
  const now = Date.now();
  if(R70T.last[g.id] && now - R70T.last[g.id] < 2000) return {ok:true, say:g.lastSay || 'Got it.', repeat:true};
  R70T.last[g.id] = now;
  const first = !g.lastTap || todayStr(new Date(g.lastTap))!==todayStr();
  // every rule is read against how things stood when you tapped, not as the steps change it. Otherwise a tag that
  // locks you in and then locks you out when you're in would undo itself in the same tap.
  const state0 = r70TNow(), said = [], did = [];
  const fits = arr(g.steps).filter(function(s){ return r70TStepFits(s, state0, first); });
  fits.forEach(function(s){
    let out = '';
    try{ out = r70TRunStep(s, g, o.value); }catch(e){ out = 'That one didn’t work: '+(e && e.message || e); }
    if(out && out!=='…'){ said.push(out); }
    did.push(s.act);
  });
  g.lastTap = now; g.taps = (Number(g.taps) || 0) + 1; g.lastSay = r70TSay(said);
  r70Tags().log.push({id:uid(), tag:g.id, name:g.name, at:now, did:did, say:g.lastSay});
  if(r70Tags().log.length > 300) r70Tags().log.splice(0, r70Tags().log.length - 300);
  persist('tags');
  // a tap says you're here
  R70.lastInput = now;
  if(did.length){
    try{ r58FeedAdd({kind:'did', short:g.name+': '+g.lastSay.slice(0, 120), full:'You tapped '+g.name+' — '+g.lastSay}); }catch(e){}
    try{ r70NoteShow(g.name+': '+r70NoteLine(g.lastSay), {}); }catch(e){}
  }
  try{ renderView(); }catch(e){}
  return {ok:true, say:did.length ? g.lastSay : 'Nothing on that tag fits right now.', did:did, tag:g.name, state:r70TNow(), was:state0};
}
// the Mac asks, because a tag can't
function r70TConfirmOut(g){
  try{
    uiConfirm({title:'Lock out already?', text:'You locked in only a few minutes ago. If '+(g ? g.name : 'the tag')+' was read twice by accident, keep going.', okLabel:'Lock out', cancelLabel:'Keep going'}).then(function(yes){
      if(yes){ const m = r70LockOutNow(); showToast('Locked out. '+fmtDurationLabel(m)+'.', {icon:'&#9209;'}); }
    });
  }catch(e){}
}
function r70TAskOut(g){
  try{
    r70AskShow({kind:'out', text:'Heading out — what for?', buttons:[['Shooting', 'r70TOutShoot'], ['Training', 'r70TOutTrain'], ['Something else', 'r70TOutOther']]});
  }catch(e){}
}
ACTIONS.r70TOutShoot = function(){ r70AskHide(); showToast(r70TGoOut('shooting'), {icon:'&#127916;'}); renderView(); };
ACTIONS.r70TOutTrain = function(){ r70AskHide(); showToast(r70TGoOut('training'), {icon:'&#128170;'}); renderView(); };
ACTIONS.r70TOutOther = function(){ r70AskHide(); showToast(r70TGoOut('other'), {icon:'&#128682;'}); renderView(); };
function r70TAsk(text, g){
  const where = (g && g.reply) || r70P('r70TSpeak', 'mac');
  try{
    if(where==='silent' || where==='text'){ if(typeof R59!=='undefined') R59.hush = true; }
    // it came from his pocket, so the answer is written to be heard, not read
    R70T.viaPhone = true;
    const done = function(){ R70T.viaPhone = false; };
    const p = aiAsk(text);
    if(p && typeof p.then==='function') p.then(done, done); else setTimeout(done, 45000);
  }catch(e){ R70T.viaPhone = false; }
}

// ---------------- out of the house, and back ----------------
function r70TOutName(k){ return k==='shooting' ? 'shooting' : k==='training' ? 'training' : k==='errand' ? 'an errand' : 'out'; }
function r70TGoOut(kind, tagId){
  const as = state.focus.activeSession;
  const broke = !!(as && !as.onBreak);
  state.focus.r70Out = {kind:kind, startedAt:Date.now(), tagId:tagId || null, brokeSession:broke};
  if(broke){
    // locked in when you left: it's an ordinary break, with the reason on it
    try{ opRunTool('take_break', {minutes:90}); }catch(e){}
    try{ const s = state.focus.activeSession; if(s){ const b = arr(s.breaks); if(b.length) b[b.length - 1].note = r70TOutName(kind); } }catch(e){}
  } else if(kind==='shooting' || kind==='training'){
    try{ startMode(kind, {note:r70TOutName(kind)}); }catch(e){}
  } else {
    try{ startMode('offtime', {note:r70TOutName(kind)}); }catch(e){}
  }
  r70StopMusic();
  persist('focus');
  return broke ? 'Out for '+r70TOutName(kind)+'. Your session is on a break until you’re back.' : 'Out for '+r70TOutName(kind)+'.';
}
function r70TComeBack(){
  const o = r70TOut();
  if(!o) return 'You weren’t out.';
  const mins = Math.max(1, Math.round((Date.now() - o.startedAt)/60000));
  state.focus.r70Out = null;
  const as = state.focus.activeSession;
  let back = '';
  if(o.brokeSession && as && as.onBreak){ try{ endBreakModeFromFocus(); back = ' Back on the clock.'; }catch(e){} }
  else { const m = state.modes && state.modes.active; if(m && !m.linkedFocus){ try{ finishActiveMode(true); }catch(e){} } }
  if(o.kind==='training') r70NudgeAdd('workout', o.tagId);
  if(o.kind==='shooting') r70NudgeAdd('shoot', o.tagId);
  persist('focus'); persist('modes');
  return 'Welcome back, '+fmtDurationLabel(mins)+' out.'+back;
}
// forgot the tap on the way back in: the Mac noticing you is enough
function r70TBackCheck(){
  try{
    const o = r70TOut(); if(!o) return;
    if(Date.now() - o.startedAt < 12*60000) return;
    if(Date.now() - r70LastActive() > 60000) return;
    const say = r70TComeBack();
    showToast(say, {icon:'&#127968;', duration:9000});
    try{ renderView(); }catch(e){}
  }catch(e){}
}
setInterval(r70TBackCheck, 60000);

// ---------------- sleep, measured by the taps ----------------
function r70TSleep(){ const f = state.focus; if(!f.r70Sleep || typeof f.r70Sleep!=='object') f.r70Sleep = {}; return f.r70Sleep; }
function r70TSleepStart(){
  const S = r70TSleep();
  S.bed = Date.now(); S.source = 'tag'; S.awake = null; S.minutes = 0;
  persist('focus');
  try{ startMode('offtime', {sleep:true, note:'Sleep'}); }catch(e){}
  try{ if(typeof opGoodnight==='function') opGoodnight(); }catch(e){}
  try{ r70StopMusic(); }catch(e){}
}
// how long you slept, in plain words, and the number kept for the morning and for analytics
function r70TWakeUp(){
  const S = r70TSleep(), m = state.modes && state.modes.active;
  let out = '';
  if(S.bed && !S.awake){
    S.awake = Date.now();
    S.minutes = Math.max(0, Math.round((S.awake - S.bed)/60000));
    S.source = S.source || 'tag';
    S.date = todayStr();
    const H = arr(state.focus.r70Sleeps); H.push({bed:S.bed, awake:S.awake, minutes:S.minutes, source:S.source, date:S.date});
    if(H.length > 400) H.splice(0, H.length - 400);
    state.focus.r70Sleeps = H;
    out = fmtDurationLabel(S.minutes)+', in bed at '+fmtTimeShort(S.bed);
  }
  if(m && m.sleep){ try{ finishActiveMode(true); }catch(e){} }
  try{ r70QuietUp(); }catch(e){}
  persist('focus'); persist('modes');
  return out;
}
// no tap in the morning: sleep ends when the Mac sees you, and the number says it's an estimate
function r70TSleepCheck(){
  try{
    const S = r70TSleep(); if(!S.bed || S.awake) return;
    const up = Date.now() - r70LastActive() < 90000, h = new Date().getHours();
    if(!up || h < 3 || h > 13) return;
    if(Date.now() - S.bed < 2*3600000) return;
    S.source = 'estimated';
    r70TWakeUp();
  }catch(e){}
}
setInterval(r70TSleepCheck, 120000);
// last night, the way the morning asks for it
function r70TLastNight(){
  const S = r70TSleep();
  if(S.minutes && S.date===todayStr()) return S;
  const H = arr(state.focus.r70Sleeps);
  const last = H[H.length - 1];
  return last && last.date===todayStr() ? last : null;
}
lastNightSleep = typeof lastNightSleep==='function' ? (function(base){
  return function(){
    const t = r70TLastNight();
    if(t && t.minutes) return t.minutes;
    return base.apply(this, arguments);
  };
})(lastNightSleep) : lastNightSleep;

// ---------------- the reminder that doesn't go away ----------------
// A pill with a slow pulse, on every page and on the phone. It stays until you log the thing, or press Skip.
const R70_NUDGE = {
  meal:{label:'Log your meal', icon:'&#127869;&#65039;', act:'r70NudgeMeal'},
  workout:{label:'Log your workout', icon:'&#128170;', act:'r70NudgeWorkout'},
  weigh:{label:'Log your weight', icon:'&#9878;&#65039;', act:'r70NudgeWeigh'},
  shoot:{label:'Log what you shot', icon:'&#127916;', act:'r70NudgeShoot'}
};
function r70Nudges(){ const f = state.focus; if(!Array.isArray(f.tagNudges)) f.tagNudges = []; return f.tagNudges; }
function r70NudgeAdd(kind, tagId){
  if(!R70_NUDGE[kind]) return null;
  const L = r70Nudges();
  if(L.some(function(n){ return n.kind===kind; })) return null;
  const n = {id:uid(), kind:kind, tagId:tagId || null, at:Date.now()};
  L.push(n); persist('focus');
  try{ r66FeedAdd({cat:'other', icon:R70_NUDGE[kind].icon, title:R70_NUDGE[kind].label, sub:'It’ll keep asking until you do', act:{a:R70_NUDGE[kind].act}}); }catch(e){}
  r70NudgePill();
  return n;
}
function r70NudgeClear(kind){
  const L = r70Nudges(), before = L.length;
  state.focus.tagNudges = L.filter(function(n){ return n.kind!==kind; });
  if(state.focus.tagNudges.length!==before){ persist('focus'); r70NudgePill(); }
}
function r70NudgePill(){
  let p = document.getElementById('r70Nudge');
  const L = r70Nudges();
  if(!L.length || document.body.classList.contains('opf-on')){ if(p) p.remove(); return; }
  const n = L[0], meta = R70_NUDGE[n.kind]; if(!meta){ r70NudgeClear(n.kind); return; }
  if(!p){ p = document.createElement('div'); p.id = 'r70Nudge'; p.className = 'r70-nudge'; document.body.appendChild(p); requestAnimationFrame(function(){ p.classList.add('is-in'); }); }
  p.innerHTML = '<button class="r70-nudge-g" data-action="'+meta.act+'"><i></i><span>'+meta.label+'</span>'+(L.length > 1 ? '<em>+'+(L.length - 1)+'</em>' : '')+'</button>'+
    '<button class="r70-nudge-x" data-action="r70NudgeSkip" data-id="'+n.kind+'">Skip this one</button>';
}
ACTIONS.r70NudgeSkip = function(el, e, id){ r70NudgeClear(id); playTick(); renderView(); };
ACTIONS.r70NudgeMeal = function(){ r70NudgeClear('meal'); ui.view = 'personal'; ui.personalTab = 'fitness'; renderView(); };
ACTIONS.r70NudgeWorkout = function(){ r70NudgeClear('workout'); ui.view = 'personal'; ui.personalTab = 'fitness'; renderView(); };
ACTIONS.r70NudgeWeigh = function(){ r70NudgeClear('weigh'); ui.view = 'personal'; ui.personalTab = 'fitness'; renderView(); };
ACTIONS.r70NudgeShoot = function(){ r70NudgeClear('shoot'); ui.view = 'personal'; ui.personalTab = 'journal'; if(typeof openQuickJournalModal==='function') openQuickJournalModal(); else renderView(); };
afterRenderHooks.push(function(){ try{ r70NudgePill(); }catch(e){} });
// logging the thing clears the reminder by itself
function r70NudgeWatch(){
  try{
    const t = todayStr();
    if(arr(state.health.calorieEntries).some(function(c){ return c.date===t && (c.at || 0) > (r70Nudges().find(function(n){ return n.kind==='meal'; }) || {at:0}).at; })) r70NudgeClear('meal');
    const nw = r70Nudges().find(function(n){ return n.kind==='weigh'; });
    if(nw && arr(state.health.weightLog).some(function(w){ return w.date===t; })) r70NudgeClear('weigh');
    const nk = r70Nudges().find(function(n){ return n.kind==='workout'; });
    if(nk && arr(state.health.workouts).some(function(w){ return w.date===t && new Date(w.at || 0).getTime() > nk.at - 60000; })) r70NudgeClear('workout');
  }catch(e){}
}
setInterval(r70NudgeWatch, 20000);
afterRenderHooks.push(r70NudgeWatch);

// ---------------- the tag's own link, and what a tap returns ----------------
// One host, picked for him: the tailnet address when Tailscale is up (so the tags work anywhere), otherwise
// whatever the Mac is serving on. Never a mix of the two.
function r70TBase(){
  const T = r70Tags();
  // Plain Tailscale reaches the server on its own port. `tailscale serve` puts it behind https with no port,
  // which is also what the phone's microphone needs — so that form wins when it's set up.
  if(T.tailnet) return T.tailserve ? 'https://'+T.tailnet : 'http://'+T.tailnet+':8940';
  const I = ui.r68Phone;
  if(I && I.url) return String(I.url).replace(/\/+$/, '');
  if(T.host) return 'http://'+T.host+':8940';
  return '';
}
// Look for Tailscale once at startup, so the address is right without anyone pressing a button.
function r70TailCheck(quiet){
  if(!(window.operatorApp && operatorApp.tailscale)) return Promise.resolve(null);
  return operatorApp.tailscale().then(function(r){
    const T = r70Tags();
    if(r && r.host){
      const changed = T.tailnet !== r.host;
      T.tailnet = r.host; T.tailserve = !!r.serve; persist('tags');
      if(changed && !quiet) showToast('Away from home is on: '+r.host, {icon:'&#127758;', duration:8000});
      if(changed) try{ renderView(); }catch(e){}
    } else if(T.tailnet && !quiet){ /* keep the last known address rather than dropping it */ }
    return r;
  }).catch(function(){ return null; });
}
setTimeout(function(){ r70TailCheck(true); }, 6000);
function r70THost(){ return r70TBase().replace(/^https?:\/\//, ''); }
function r70TLink(g){ const b = r70TBase(); return (b || 'http://your-mac.local:8940')+'/t/'+(g ? g.secret : ''); }
// the address changed since last time: say so, because every tag's link carries it
function r70THostWatch(){
  try{
    const b = r70TBase(); if(!b) return;
    const T = r70Tags();
    if(T.lastBase && T.lastBase!==b){
      showToast('This Mac’s address changed. Your tag links point at the old one — open Settings → Tags to write the new one.', {icon:'&#128225;', duration:15000, actionLabel:'Open', actionAction:'r70TOpenSettings'});
    }
    if(T.lastBase!==b){ T.lastBase = b; persist('tags'); }
  }catch(e){}
}
setTimeout(r70THostWatch, 12000); setInterval(r70THostWatch, 10*60000);
ACTIONS.r70TOpenSettings = function(){ ui.view = 'settings'; ui.settingsTab = 'tags'; renderView(); };
function r70TNewSecret(g){ g.secret = r70Secret(); persist('tags'); return g.secret; }

// ---------------- Op's side ----------------
if(typeof OP_TOOLS!=='undefined' && Array.isArray(OP_TOOLS)){
  OP_TOOLS.push(
    {name:'list_tags', description:'His NFC tags: name, where each one lives, what it does, when it was last tapped.', input_schema:{type:'object', properties:{}}},
    {name:'create_tag', description:'Make a tag. Steps are actions from the catalog; give each one a rule if it should only run sometimes (e.g. lock in when he is not locked in).', input_schema:{type:'object', properties:{name:{type:'string'}, place:{type:'string', description:'where it will live, e.g. "the nightstand"'}, steps:{type:'array', items:{type:'object', properties:{act:{type:'string', description:'one of the catalog ids: lockin, lockout, locktoggle, break, breakend, breaktoggle, block, sleep, awake, goodmorning, out, back, shoot, train, reading, meal, weigh, water, workout, note, standard, task, ask, read, nudge'}, min:{type:'number'}, kind:{type:'string'}, when:{type:'object', description:'rules: locked in|out, onbreak yes|no, sleeping yes|no, ringing yes|no, away yes|no, first yes|no, part am|pm|night'}}, required:['act']}}}, required:['name', 'steps']}},
    {name:'run_tag', description:'Run a tag now, from the Mac, as if it had been tapped. Good for testing one.', input_schema:{type:'object', properties:{name:{type:'string'}}, required:['name']}},
    {name:'tag_status', description:'Whether the tag system is ready: the phone server, the address, the Mac staying awake, and which tags have gone quiet.', input_schema:{type:'object', properties:{}}},
    {name:'tags_help', description:'The next step he needs to take to finish setting up a tag, in order. Use this when he asks how to set one up.', input_schema:{type:'object', properties:{name:{type:'string', description:'a tag, if he means one in particular'}}}}
  );
}
function r70TFind(name){
  const q = String(name || '').trim().toLowerCase(); if(!q) return null;
  return r70TagList().find(function(g){ return g.name.toLowerCase()===q; }) || r70TagList().find(function(g){ return g.name.toLowerCase().indexOf(q) >= 0; }) || null;
}
function r70TCheck(){
  const on = !!(window.OPAPP && OPAPP.phoneOn), host = r70THost();
  const quiet = r70TagList().filter(function(g){ return g.on && g.lastTap && Date.now() - g.lastTap > 14*86400000; });
  const never = r70TagList().filter(function(g){ return g.on && !g.lastTap; });
  return {
    rows:[
      ['The phone server', on ? 'on, port 8940' : 'off — Settings → Op → Your iPhone', on],
      ['The Mac’s address', host || 'not known yet', !!host],
      ['Away from home', state.tags && state.tags.tailnet ? 'Tailscale: '+state.tags.tailnet : 'same Wi-Fi only — set up Tailscale to use these anywhere', !!(state.tags && state.tags.tailnet)],
      ['Staying awake', r70P('r70TAwake', true)!==false ? 'the Mac is kept awake for taps' : 'off — a sleeping Mac can’t answer a tap', r70P('r70TAwake', true)!==false],
      ['Your tags', r70TagList().length ? r70TagList().filter(function(g){ return g.on; }).length+' on, '+never.length+' never tapped' : 'none yet', !!r70TagList().length]
    ],
    quiet:quiet, never:never, on:on, host:host
  };
}
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='list_tags'){
      if(!r70TagList().length) return 'No tags yet. Settings → Tags → Add a tag, or ask me to make one.';
      return r70TagList().map(function(g){
        return g.name+(g.place ? ' ('+g.place+')' : '')+(g.on ? '' : ' [off]')+': '+arr(g.steps).map(function(s){ const a = r70TAct(s.act); return a ? a.label.toLowerCase() : s.act; }).join(', ')+
          ' · '+(g.lastTap ? 'last tapped '+fmtDateShort(todayStr(new Date(g.lastTap)))+', '+g.taps+' taps' : 'never tapped');
      }).join('\n');
    }
    if(name==='create_tag'){
      const g = r70TMake(x.name, x.place, arr(x.steps).map(function(s){ return {id:uid(), act:String(s.act || ''), min:Number(s.min) || undefined, kind:s.kind, when:s.when && typeof s.when==='object' ? s.when : {}}; }).filter(function(s){ return r70TAct(s.act); }));
      if(!g.steps.length) throw new Error('none of those steps are in the catalog');
      try{ renderView(); }catch(e){}
      return 'made the tag "'+g.name+'" with '+g.steps.length+' step'+(g.steps.length===1 ? '' : 's')+'. Its link is '+r70TLink(g)+' — write that to the sticker, or set it up hands-free in Shortcuts.';
    }
    if(name==='run_tag'){ const g = r70TFind(x.name); if(!g) throw new Error('no tag called "'+x.name+'"'); const r = r70TRun(g, {}); return r.say; }
    if(name==='tag_status'){ const c = r70TCheck(); return c.rows.map(function(r){ return (r[2] ? '✓ ' : '✗ ')+r[0]+': '+r[1]; }).join('\n')+(c.quiet.length ? '\nQuiet for two weeks: '+c.quiet.map(function(g){ return g.name; }).join(', ') : ''); }
    if(name==='tags_help'){
      const g = x.name ? r70TFind(x.name) : null, c = r70TCheck();
      const bad = c.rows.find(function(r){ return !r[2]; });
      if(bad) return 'First: '+bad[0]+' — '+bad[1];
      if(g && !g.lastTap) return '"'+g.name+'" is ready but has never been tapped. Write this link to the sticker with an NFC writer app (Write → Add a record → URL, protocol None): '+r70TLink(g)+'. Then tap it once and it\'ll show up here.';
      if(!r70TagList().length) return 'Nothing made yet. Settings → Tags → Add a tag, pick what it should do, and it\'ll give you the link to write to the sticker.';
      return 'Everything\'s set. '+r70TagList().filter(function(q){ return q.on; }).length+' tags on, '+r70TagList().reduce(function(a, q){ return a + (q.taps || 0); }, 0)+' taps so far.';
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
aiSystem = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    let add = '';
    try{
      const L = r70Tags().log.filter(function(l){ return Date.now() - l.at < 14*3600000; }).slice(-6);
      if(L.length) add = '\n\nTAGS HE TAPPED TODAY: '+L.map(function(l){ return l.name+' at '+fmtTimeShort(l.at); }).join(', ')+'.';
      const o = r70TOut(); if(o) add += '\nHe is out right now ('+r70TOutName(o.kind)+'), since '+fmtTimeShort(o.startedAt)+'.';
      const s = r70TLastNight(); if(s && s.minutes) add += '\nHe slept '+fmtDurationLabel(s.minutes)+' last night'+(s.source==='estimated' ? ' (estimated, he didn\'t tap)' : '')+', in bed at '+fmtTimeShort(s.bed)+'.';
      const N = r70Nudges(); if(N.length) add += '\nStill to log: '+N.map(function(n){ return (R70_NUDGE[n.kind] || {}).label; }).filter(Boolean).join(', ')+'.';
    }catch(e){}
    if(!add) return out;
    try{ if(Array.isArray(out)) out.push({type:'text', text:add.trim()}); else return String(out || '')+add; }catch(e){}
    return out;
  };
})(aiSystem);

// ---------------- making one ----------------
function r70TMake(name, place, steps){
  const g = {id:uid(), name:String(name || 'Tag').trim().slice(0, 40) || 'Tag', place:String(place || '').slice(0, 40), secret:r70Secret(),
    steps:arr(steps), on:true, reply:'', createdAt:Date.now(), lastTap:0, taps:0};
  r70TagList().push(g); persist('tags');
  return g;
}
// the starter set: everything Andre asked for, each one a preset he can change
const R70T_STARTERS = [
  {id:'desk', name:'Desk', place:'your desk', icon:'&#128187;', about:'Lock in. Tap it again to lock out.',
   steps:[{act:'lockin', when:{locked:'out'}}, {act:'lockout', when:{locked:'in'}}]},
  {id:'break', name:'Break', place:'by the desk', icon:'&#9749;', about:'A break, and the end of one.',
   steps:[{act:'breaktoggle', min:15}]},
  {id:'sleep', name:'Sleep', place:'the nightstand', icon:'&#128164;', about:'Goodnight — or snooze, if the alarm is going.',
   steps:[{act:'sleep'}]},
  {id:'awake', name:'Awake', place:'the nightstand', icon:'&#9728;&#65039;', about:'Up. It saves how long you slept and starts Good morning.',
   steps:[{act:'goodmorning'}]},
  {id:'door', name:'Door', place:'by the door', icon:'&#128682;', about:'Heading out, and back again. Locked in when you leave: it becomes a break.',
   steps:[{act:'out', kind:'ask', when:{away:'no'}}, {act:'back', when:{away:'yes'}}]},
  {id:'kitchen', name:'Kitchen', place:'the kitchen', icon:'&#127869;&#65039;', about:'A meal to log, and a reminder that won’t let it go.',
   steps:[{act:'meal'}]},
  {id:'weigh', name:'Weigh-in', place:'the bathroom', icon:'&#9878;&#65039;', about:'The number, saved, with the change from last time.',
   steps:[{act:'weigh'}]},
  {id:'op', name:'Talk to Op', place:'your keychain', icon:'&#128483;&#65039;', about:'Say it, and he answers out loud.',
   steps:[{act:'ask'}]},
  {id:'gym', name:'Gym bag', place:'the gym bag', icon:'&#128170;', about:'Training mode, and log the workout when you’re back.', off:true,
   steps:[{act:'train', when:{away:'no'}}, {act:'back', when:{away:'yes'}}]},
  {id:'read', name:'Reading chair', place:'the reading chair', icon:'&#128214;', about:'A reading block, and the end of it.', off:true,
   steps:[{act:'reading'}]},
  {id:'box', name:'Phone box', place:'the phone box', icon:'&#128241;', about:'Deep work with the phone put away.', off:true,
   steps:[{act:'block', min:50}]},
  {id:'addtask', name:'Add a task', place:'anywhere', icon:'&#128203;', about:'Say it, and it lands in today.', off:true,
   steps:[{act:'task'}]}
];
function r70TStarterMake(id){
  const p = R70T_STARTERS.find(function(s){ return s.id===id; }); if(!p) return null;
  const g = r70TMake(p.name, p.place, p.steps.map(function(s){ return Object.assign({id:uid(), when:{}}, s); }));
  g.starter = p.id;
  persist('tags');
  return g;
}
ACTIONS.r70TStarter = function(el, e, id){ const g = r70TStarterMake(id); if(g){ ui.r70TOpen = g.id; playPositive(); renderView(); } };
ACTIONS.r70TStarterAll = function(){
  R70T_STARTERS.filter(function(s){ return !s.off; }).forEach(function(s){ if(!r70TagList().some(function(g){ return g.starter===s.id; })) r70TStarterMake(s.id); });
  playPositive(); renderView();
};

// ---------------- Settings → Tags ----------------
renderSettings = (function(base){
  return function(){
    const on = ui.settingsTab==='tags';
    if(on) ui.settingsTab = 'you';
    let h;
    try{ h = base.apply(this, arguments); } finally { if(on) ui.settingsTab = 'tags'; }
    const btn = '<button class="settings-nav-item'+(on ? ' active' : '')+'" data-action="settingsTab" data-tab="tags"><span style="margin-right:8px;">&#128225;</span>Tags</button>';
    h = h.replace(/(<button class="settings-nav-item[^"]*" data-action="settingsTab" data-tab="op">[\s\S]*?<\/button>)/, '$1'+btn);
    if(!on) return h;
    h = h.replace(/<button class="settings-nav-item active" data-action="settingsTab" data-tab="you">/, '<button class="settings-nav-item" data-action="settingsTab" data-tab="you">');
    const cut = typeof r60Cut==='function' ? r60Cut(h, '<div class="settings-content') : null; if(!cut) return h;
    let body = '';
    try{ body = r70TSettingsHtml(); }catch(e){ body = '<div class="card section">Tags couldn’t draw: '+escapeHtml(e.message || String(e))+'</div>'; }
    return h.replace(cut.html, '<div class="settings-content tab-panel" data-key="settings-tags">'+body+'</div>');
  };
})(renderSettings);
function r70TSettingsHtml(){
  // the iPhone card loads the Mac's address; ask for it once so the links below are right
  if(!ui.r68Phone && window.operatorApp && operatorApp.phoneInfo){ ui.r68Phone = {loading:true}; operatorApp.phoneInfo().then(function(i){ ui.r68Phone = i || {}; renderView(); }); }
  return r70TCheckHtml()+(ui.r70TWiz ? r70TWizHtml() : '')+r70TListHtml()+r70TAwayHtml()+r70TPrefsHtml();
}
function r70TCheckHtml(){
  const c = r70TCheck();
  return '<div class="card section op-settings"><div class="section-title">&#9989; Ready to tap</div>'+
    '<div class="r70t-check">'+c.rows.map(function(r){ return '<div class="r70t-cr'+(r[2] ? ' is-ok' : '')+'"><i>'+(r[2] ? '&#10003;' : '!')+'</i><b>'+r[0]+'</b><span>'+escapeHtml(r[1])+'</span></div>'; }).join('')+'</div>'+
    (c.quiet.length ? '<p class="r70t-quiet">Quiet for two weeks: '+c.quiet.map(function(g){ return escapeHtml(g.name); }).join(', ')+'. Worth checking the sticker still reads.</p>' : '')+
  '</div>';
}
function r70TListHtml(){
  const L = r70TagList();
  const head = '<div class="section-title">&#128225; Your tags<button class="btn btn-sm btn-primary r70t-add" data-action="r70TWizOpen">+ Add a tag</button></div>';
  if(!L.length){
    return '<div class="card section op-settings">'+head+
      '<p class="r70t-p">A tag is a sticker with a link on it. Tap your phone to it and this Mac does the rest. Start with the set below, or build one of your own.</p>'+
      r70TStartersHtml()+'</div>';
  }
  return '<div class="card section op-settings">'+head+
    '<div class="r70t-list">'+L.map(r70TCardHtml).join('')+'</div>'+
    (L.length < R70T_STARTERS.length ? '<details class="r70t-more"><summary>More to start from</summary>'+r70TStartersHtml()+'</details>' : '')+
  '</div>';
}
function r70TStartersHtml(){
  const have = {}; r70TagList().forEach(function(g){ if(g.starter) have[g.starter] = 1; });
  const left = R70T_STARTERS.filter(function(s){ return !have[s.id]; });
  if(!left.length) return '';
  const core = left.filter(function(s){ return !s.off; });
  return (core.length > 1 ? '<button class="btn btn-sm r70t-allbtn" data-action="r70TStarterAll">Set up all '+core.length+' at once</button>' : '')+
    '<div class="r70t-starters">'+left.map(function(s){
      return '<button class="r70t-st" data-action="r70TStarter" data-id="'+s.id+'"><i>'+s.icon+'</i><b>'+escapeHtml(s.name)+'</b><small>'+escapeHtml(s.place)+'</small><span>'+escapeHtml(s.about)+'</span></button>';
    }).join('')+'</div>';
}
function r70TStepLine(s){
  const a = r70TAct(s.act); if(!a) return s.act;
  let t = a.label;
  if(a.num && s.min) t = t.replace(/$/, ' ('+s.min+' min)');
  if(a.pick && s.kind && s.kind!=='ask'){ const o = a.pick.opts.find(function(q){ return q[0]===s.kind; }); if(o) t += ' — '+o[1].toLowerCase(); }
  const w = s.when || {}, bits = [];
  if(w.locked) bits.push(w.locked==='in' ? 'when locked in' : 'when not locked in');
  if(w.onbreak) bits.push(w.onbreak==='yes' ? 'on a break' : 'not on a break');
  if(w.sleeping) bits.push(w.sleeping==='yes' ? 'asleep' : 'awake');
  if(w.ringing) bits.push(w.ringing==='yes' ? 'alarm going' : 'alarm not going');
  if(w.away) bits.push(w.away==='yes' ? 'when out' : 'when home');
  if(w.first) bits.push(w.first==='yes' ? 'first tap today' : 'after the first tap');
  if(w.part) bits.push(w.part==='am' ? 'mornings' : w.part==='pm' ? 'afternoons' : 'nights');
  return t+(bits.length ? ' <em>'+bits.join(', ')+'</em>' : '');
}
function r70TCardHtml(g){
  const open = ui.r70TOpen===g.id, link = r70TLink(g), a0 = r70TAct(arr(g.steps)[0] && g.steps[0].act);
  const waiting = !g.lastTap;
  return '<div class="r70t-card'+(open ? ' is-open' : '')+(g.on ? '' : ' is-off')+'" id="r70t-'+g.id+'">'+
    '<button class="r70t-h" data-action="r70TOpenCard" data-id="'+g.id+'">'+
      '<i>'+(a0 ? a0.icon : '&#128225;')+'</i>'+
      '<span class="r70t-n"><b>'+escapeHtml(g.name)+'</b><small>'+escapeHtml(g.place || 'anywhere')+' · '+arr(g.steps).length+' step'+(arr(g.steps).length===1 ? '' : 's')+'</small></span>'+
      '<span class="r70t-t">'+(waiting ? '<em class="r70t-wait">waiting for its first tap</em>' : fmtDateShort(todayStr(new Date(g.lastTap)))+' · '+g.taps+' taps')+'</span>'+
      '<span class="r45-sw'+(g.on ? ' on' : '')+'" data-action="r70TToggle" data-id="'+g.id+'"><span></span></span>'+
    '</button>'+
    (open ? '<div class="r70t-b">'+
      '<ol class="r70t-steps">'+arr(g.steps).map(function(s, i){ return '<li>'+r70TStepLine(s)+'<button class="r70t-x" data-action="r70TStepDel" data-id="'+g.id+'|'+i+'" aria-label="Remove">&#10005;</button></li>'; }).join('')+'</ol>'+
      '<div class="r70t-addstep"><select class="input input-sm" id="r70TAddAct-'+g.id+'">'+r70TActOpts()+'</select><button class="btn btn-sm" data-action="r70TStepAdd" data-id="'+g.id+'">Add a step</button></div>'+
      '<div class="r70t-link"><label>The link to write to the sticker</label><div class="r70t-lrow"><code>'+escapeHtml(link)+'</code><button class="btn btn-sm" data-action="r70TCopy" data-id="'+escapeHtml(link)+'">Copy</button></div></div>'+
      '<div class="r70t-qrow"><div class="r69-qr">'+r69Qr(link)+'</div>'+
        '<ol class="r69-steps"><li>Open an NFC writer app on your phone (NFC Tools is the usual one).</li>'+
          '<li><b>Write → Add a record → URL/URI</b>, protocol <b>None</b>. Scan this code to get the link in, or paste it.</li>'+
          '<li>Hold the sticker to the back of your phone and write it.</li>'+
          '<li>Tap it once. This card says <b>Heard it</b> the moment it lands.</li></ol></div>'+
      '<div class="r70t-f">'+
        '<button class="btn btn-sm" data-action="r70TTest" data-id="'+g.id+'">Test it now</button>'+
        '<button class="btn btn-sm" data-action="r70TDupe" data-id="'+g.id+'">Duplicate</button>'+
        '<button class="btn btn-sm" data-action="r70TNewLink" data-id="'+g.id+'">New link</button>'+
        '<button class="btn btn-sm r70t-del" data-action="r70TDel" data-id="'+g.id+'">Delete</button>'+
      '</div>'+
    '</div>' : '')+
  '</div>';
}
function r70TActOpts(sel){
  const by = {};
  R70T_ACTS.forEach(function(a){ (by[a.g] = by[a.g] || []).push(a); });
  return Object.keys(by).map(function(gname){
    return '<optgroup label="'+escapeHtml(gname)+'">'+by[gname].map(function(a){ return '<option value="'+a.id+'"'+(sel===a.id ? ' selected' : '')+'>'+a.label+'</option>'; }).join('')+'</optgroup>';
  }).join('');
}
function r70TAwayHtml(){
  const T = r70Tags();
  return '<div class="card section op-settings"><div class="section-title">&#127758; Away from home</div>'+
    '<p class="r70t-p">On your own Wi-Fi the tags already work. Tailscale is free and makes a private line between this Mac and your phone, so they work anywhere — and it gives the page an https address, which is what the microphone needs.</p>'+
    '<ol class="r69-steps"><li>Install Tailscale on this Mac and on your iPhone, and sign in to both with the same account.</li>'+
      '<li>On this Mac, run <code>tailscale serve --bg 8940</code> once.</li>'+
      '<li>Press Check below. The address it finds goes into every tag link and into the QR code.</li></ol>'+
    '<div class="r70t-f"><button class="btn btn-sm" data-action="r70TTail">Check for Tailscale</button>'+
      (T.tailnet ? '<span class="r70t-ok">Using <b>'+escapeHtml(T.tailnet)+'</b></span><button class="btn btn-sm" data-action="r70TTailOff">Use the Wi-Fi address instead</button>' : '<span class="r70t-p">Not set up — same Wi-Fi only.</span>')+'</div>'+
  '</div>';
}
function r70TPrefsHtml(){
  const where = r70P('r70TSpeak', 'mac');
  return '<div class="card section op-settings"><div class="section-title">&#128483;&#65039; When a tag makes Op talk</div>'+
    '<div class="seg-tabs r70t-seg">'+[['mac', 'This Mac’s speakers'], ['phone', 'The phone'], ['text', 'Text only'], ['silent', 'Silent']].map(function(o){
      return '<button class="seg-tab'+(where===o[0] ? ' active' : '')+'" data-action="r70TSpeak" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
    r51Row('Keep this Mac awake so a tap always lands', r51Sw(r70P('r70TAwake', true)!==false, 'r70TAwake'))+
    r51Row('A meal tag only works at meal times', r51Sw(r70P('r70TMealHours', false)===true, 'r70TMealHours'))+
  '</div>';
}
ACTIONS.r70TSpeak = function(el, e, id){ r70Set('r70TSpeak', id); playTick(); renderView(); };
ACTIONS.r70TAwake = function(){ const on = r70P('r70TAwake', true)!==false; r70Set('r70TAwake', !on); try{ if(window.operatorApp && operatorApp.keepAwake) operatorApp.keepAwake(!on); }catch(e){} playTick(); renderView(); };
ACTIONS.r70TMealHours = function(){ r70Set('r70TMealHours', r70P('r70TMealHours', false)!==true); playTick(); renderView(); };
ACTIONS.r70TOpenCard = function(el, e, id){ ui.r70TOpen = ui.r70TOpen===id ? null : id; playTick(); renderView(); };
ACTIONS.r70TToggle = function(el, e, id){ if(e && e.stopPropagation) e.stopPropagation(); const g = r70TagById(id); if(!g) return; g.on = !g.on; if(!g.on) g.secret = r70Secret(); persist('tags'); playTick(); renderView(); };
ACTIONS.r70TCopy = function(el, e, id){ try{ navigator.clipboard.writeText(id); showToast('Copied.', {icon:'&#128203;'}); }catch(err){} };
ACTIONS.r70TTest = function(el, e, id){ const g = r70TagById(id); if(!g) return; const r = r70TRun(g, {}); showToast(r.say, {icon:'&#128225;', duration:8000}); renderView(); };
ACTIONS.r70TDupe = function(el, e, id){
  const g = r70TagById(id); if(!g) return;
  const c = r70TMake(g.name+' copy', g.place, arr(g.steps).map(function(s){ return Object.assign({}, s, {id:uid()}); }));
  ui.r70TOpen = c.id; playTick(); renderView();
};
ACTIONS.r70TNewLink = function(el, e, id){
  const g = r70TagById(id); if(!g) return;
  uiConfirm({title:'A new link for '+g.name+'?', text:'The old one stops working straight away, so you’ll need to write the new one to the sticker.', okLabel:'New link'}).then(function(yes){ if(yes){ r70TNewSecret(g); renderView(); } });
};
ACTIONS.r70TDel = function(el, e, id){
  const g = r70TagById(id); if(!g) return;
  uiConfirm({title:'Delete '+g.name+'?', text:'The sticker will stop doing anything. You can always make it again.', okLabel:'Delete'}).then(function(yes){
    if(!yes) return;
    state.tags.list = r70TagList().filter(function(q){ return q.id!==id; }); persist('tags'); renderView();
  });
};
ACTIONS.r70TStepAdd = function(el, e, id){
  const g = r70TagById(id); if(!g) return;
  const sel = document.getElementById('r70TAddAct-'+id), act = sel ? sel.value : '';
  const a = r70TAct(act); if(!a) return;
  g.steps.push({id:uid(), act:act, when:{}, min:a.num ? a.num.def : undefined, kind:a.pick ? a.pick.def : undefined});
  persist('tags'); playTick(); renderView();
};
ACTIONS.r70TStepDel = function(el, e, id){
  const p = String(id).split('|'), g = r70TagById(p[0]); if(!g) return;
  g.steps.splice(Number(p[1]), 1); persist('tags'); playTick(); renderView();
};
ACTIONS.r70TTail = function(){
  if(!(window.operatorApp && operatorApp.tailscale)){ showToast('This needs Operator for Mac.', {icon:'&#9888;'}); return; }
  operatorApp.tailscale().then(function(r){
    if(r && r.host){ r70Tags().tailnet = r.host; r70Tags().tailserve = !!r.serve; persist('tags'); showToast('Found it: '+r.host+'. Tag links and the iPhone page now use it.', {icon:'&#127758;', duration:9000}); }
    else showToast(r && r.why ? r.why : 'No Tailscale found on this Mac yet.', {icon:'&#9888;', duration:9000});
    renderView();
  }).catch(function(){ showToast('Couldn’t check.', {icon:'&#9888;'}); });
};
ACTIONS.r70TTailOff = function(){ delete r70Tags().tailnet; persist('tags'); renderView(); };

// ---------------- the wizard ----------------
function r70TWiz(){ return ui.r70TWiz || (ui.r70TWiz = {step:1, picks:[], name:'', place:'', how:'open'}); }
ACTIONS.r70TWizOpen = function(){ ui.r70TWiz = {step:1, picks:[], name:'', place:'', how:'open'}; playTick(); renderView(); };
ACTIONS.r70TWizClose = function(){ ui.r70TWiz = null; playTick(); renderView(); };
ACTIONS.r70TWizPick = function(el, e, id){
  const W = r70TWiz(), i = W.picks.indexOf(id);
  if(i >= 0) W.picks.splice(i, 1); else W.picks.push(id);
  if(!W.name && W.picks.length===1){ const a = r70TAct(W.picks[0]); if(a){ W.name = a.label.split(',')[0].split('(')[0].trim(); W.place = a.place; } }
  playTick(); renderView();
};
ACTIONS.r70TWizStep = function(el, e, id){
  const W = r70TWiz();
  if(id==='2' && !W.picks.length){ showToast('Pick at least one thing for it to do.', {icon:'&#9888;'}); return; }
  const n = document.getElementById('r70TWizName'), p = document.getElementById('r70TWizPlace');
  if(n) W.name = n.value.trim(); if(p) W.place = p.value.trim();
  if(id==='3'){
    if(!W.name) W.name = 'My tag';
    const steps = W.picks.map(function(act){ const a = r70TAct(act); return {id:uid(), act:act, when:{}, min:a && a.num ? a.num.def : undefined, kind:a && a.pick ? a.pick.def : undefined}; });
    // two halves of the same toggle get their rule written for them
    if(W.picks.indexOf('lockin') >= 0 && W.picks.indexOf('lockout') >= 0){
      steps.forEach(function(s){ if(s.act==='lockin') s.when = {locked:'out'}; if(s.act==='lockout') s.when = {locked:'in'}; });
    }
    if(W.picks.indexOf('out') >= 0 && W.picks.indexOf('back') >= 0){
      steps.forEach(function(s){ if(s.act==='out') s.when = {away:'no'}; if(s.act==='back') s.when = {away:'yes'}; });
    }
    const g = r70TMake(W.name, W.place, steps);
    W.made = g.id; W.waitFrom = Date.now();
  }
  W.step = Number(id); playTick(); renderView();
};
ACTIONS.r70TWizHow = function(el, e, id){ r70TWiz().how = id; playTick(); renderView(); };
ACTIONS.r70TWizDone = function(){ const W = r70TWiz(); const id = W.made; ui.r70TWiz = null; ui.r70TOpen = id || null; playPositive(); renderView(); };
function r70TWizHtml(){
  const W = r70TWiz();
  const head = '<div class="section-title">&#10133; A new tag<button class="r70t-wx" data-action="r70TWizClose" aria-label="Close">&#10005;</button></div>';
  if(W.step===1){
    const by = {}; R70T_ACTS.forEach(function(a){ (by[a.g] = by[a.g] || []).push(a); });
    return '<div class="card section op-settings r70t-wiz">'+head+
      '<p class="r70t-p">What should it do? Pick as many as you like — they run in order, and you can give each one a rule afterwards.</p>'+
      Object.keys(by).map(function(gn){
        return '<div class="r70t-wg"><h4>'+escapeHtml(gn)+'</h4><div class="r70t-wgrid">'+by[gn].map(function(a){
          return '<button class="r70t-wa'+(W.picks.indexOf(a.id) >= 0 ? ' is-on' : '')+'" data-action="r70TWizPick" data-id="'+a.id+'"><i>'+a.icon+'</i><b>'+escapeHtml(a.label)+'</b><small>good on '+escapeHtml(a.place)+'</small></button>';
        }).join('')+'</div></div>';
      }).join('')+
      '<div class="r70t-f"><button class="btn btn-sm btn-primary" data-action="r70TWizStep" data-id="2">Next'+(W.picks.length ? ' ('+W.picks.length+')' : '')+'</button></div>'+
    '</div>';
  }
  if(W.step===2){
    const a0 = r70TAct(W.picks[0]);
    return '<div class="card section op-settings r70t-wiz">'+head+
      '<div class="field"><label>What do you want to call it?</label><input class="input" id="r70TWizName" value="'+escapeHtml(W.name)+'" placeholder="Desk"></div>'+
      '<div class="field"><label>Where will it live?</label><input class="input" id="r70TWizPlace" value="'+escapeHtml(W.place || (a0 ? a0.place : ''))+'" placeholder="'+escapeHtml(a0 ? a0.place : 'your desk')+'"><small class="r70t-p">Only a note to yourself. Any tag can do anything.</small></div>'+
      '<div class="field"><label>How do you want to tap it?</label>'+
        '<div class="r70t-how">'+
          '<button class="r70t-hw'+(W.how==='open' ? ' is-on' : '')+'" data-action="r70TWizHow" data-id="open"><b>Tap and open</b><span>Easiest. A banner pops up on your phone and you tap it. Nothing to install.</span></button>'+
          '<button class="r70t-hw'+(W.how==='hands' ? ' is-on' : '')+'" data-action="r70TWizHow" data-id="hands"><b>Hands-free</b><span>No banner, nothing to tap. One Shortcuts automation to set up, once per tag.</span></button>'+
        '</div></div>'+
      '<div class="r70t-f"><button class="btn btn-sm" data-action="r70TWizStep" data-id="1">Back</button><button class="btn btn-sm btn-primary" data-action="r70TWizStep" data-id="3">Make it</button></div>'+
    '</div>';
  }
  const g = r70TagById(W.made);
  if(!g) return '<div class="card section op-settings r70t-wiz">'+head+'<p class="r70t-p">That didn’t save. Try again.</p></div>';
  const link = r70TLink(g), heard = !!g.lastTap;
  const steps = W.how==='hands'
    ? '<ol class="r69-steps"><li>On your iPhone, open <b>Shortcuts → Automation → + → NFC → Scan</b> and hold the sticker to the phone.</li>'+
      '<li>Choose <b>Get Contents of URL</b> and paste the link below. Turn <b>Ask Before Running</b> off.</li>'+
      '<li>Save it. From now on the tap just happens, with nothing on screen.</li></ol>'
    : '<ol class="r69-steps"><li>Open an NFC writer app (NFC Tools does the job).</li>'+
      '<li><b>Write → Add a record → URL/URI</b>, protocol <b>None</b>. Scan the code to get the link in, or paste it.</li>'+
      '<li>Hold the sticker to the back of your phone and write it.</li></ol>';
  return '<div class="card section op-settings r70t-wiz">'+head+
    '<div class="r70t-made"><b>'+escapeHtml(g.name)+'</b> is ready. Now put it on the sticker.</div>'+
    '<div class="r70t-qrow"><div class="r69-qr">'+r69Qr(link)+'</div>'+steps+'</div>'+
    '<div class="r70t-link"><label>The link</label><div class="r70t-lrow"><code>'+escapeHtml(link)+'</code><button class="btn btn-sm" data-action="r70TCopy" data-id="'+escapeHtml(link)+'">Copy</button></div></div>'+
    '<div class="r70t-waiting'+(heard ? ' is-heard' : '')+'"><i></i><b>'+(heard ? 'Heard it &#10003;' : 'Tap your tag now…')+'</b><span>'+(heard ? 'That’s it working. '+escapeHtml(g.lastSay || '') : 'This turns green the moment the first tap lands.')+'</span></div>'+
    '<div class="r70t-f"><button class="btn btn-sm" data-action="r70TTest" data-id="'+g.id+'">Test it from here</button><button class="btn btn-sm btn-primary" data-action="r70TWizDone">Done</button></div>'+
  '</div>';
}
// while the wizard is waiting for that first tap, keep looking
setInterval(function(){
  try{
    const W = ui.r70TWiz;
    if(!W || W.step!==3 || !W.made) return;
    if(ui.view!=='settings' || ui.settingsTab!=='tags') return;
    const g = r70TagById(W.made);
    if(g && g.lastTap && !W.heard){ W.heard = true; playPositive(); renderView(); }
  }catch(e){}
}, 1200);

// ---------------- what the phone and the tag link can ask for ----------------
// These are what the Mac's phone server is allowed to call. They're named so the Mac app can hand them straight
// over, and so the checks can run them without a Mac.
const r70PhoneApi = {
    // a tag was tapped: the secret is the whole of the authentication
    phoneTag: function(secret, value){
      const g = r70TagBySecret(secret);
      if(!g) return {ok:false, say:'That tag isn’t set up on this Mac.', code:'unknown'};
      return r70TRun(g, {value:value});
    },
    // the phone's own list, so it can show what exists and run one as a button
    phoneTags: function(){
      return r70TagList().filter(function(g){ return g.on; }).map(function(g){
        const a = r70TAct(arr(g.steps)[0] && g.steps[0].act);
        return {id:g.id, name:g.name, place:g.place, icon:a ? a.icon : '&#128225;', secret:g.secret, last:g.lastTap || 0, taps:g.taps || 0, say:g.lastSay || ''};
      });
    },
    phoneRunTag: function(id){ const g = r70TagById(id); return g ? r70TRun(g, {}) : {ok:false, say:'Gone.'}; },
    // the sticky reminders, and the quick logs behind them
    phoneNudges: function(){ return r70Nudges().map(function(n){ return {kind:n.kind, label:(R70_NUDGE[n.kind] || {}).label || n.kind, at:n.at}; }); },
    phoneMeals: function(){
      const L = arr(state.meals && state.meals.library).slice().sort(function(a, b){ return (Number(b.uses) || 0) - (Number(a.uses) || 0); }).slice(0, 12);
      return L.map(function(m){ return {id:m.id, name:m.name, kcal:Number(m.calories) || Number(m.kcal) || 0}; });
    },
    phoneMeal: function(id, text){
      try{
        if(id){ quickMeal(id); }
        else { const t = String(text || '').trim(); if(!t) return false; addCalorieEntry ? addCalorieEntry({name:t, calories:0, date:todayStr()}) : state.health.calorieEntries.push({id:uid(), name:t, calories:0, date:todayStr(), at:Date.now()}); persist('health'); }
      }catch(e){
        state.health.calorieEntries.push({id:uid(), name:String(text || 'A meal'), calories:0, date:todayStr(), at:Date.now()}); persist('health');
      }
      r70NudgeClear('meal'); try{ renderView(); }catch(e){}
      return true;
    },
    phoneWeigh: function(n){ return r70TRunStep({act:'weigh'}, null, n); },
    phoneQuick: function(what, value){
      const map = {water:'water', workout:'workout', meal:'meal', weigh:'weigh', mood:'note', task:'task', note:'note'};
      const act = map[what]; if(!act) return {ok:false, say:'Not one of mine.'};
      let say = ''; try{ say = r70TRunStep({act:act}, null, value); }catch(e){ say = 'That didn’t work.'; }
      try{ renderView(); }catch(e){}
      return {ok:true, say:say};
    },
    // today, in the shape the phone draws it
    phoneToday: function(){
      const t = todayStr();
      const tasks = state.tasks.items.filter(function(x){ return x.status==='today'; }).slice(0, 12).map(function(x){ return {id:x.id, title:typeof taskName==='function' ? taskName(x) : x.title, done:x.status==='done'}; });
      let std = [];
      try{ std = arr(state.standards.items).map(function(i){ return {id:i.id, label:i.label || i.name, done:arr(getStandardRec(t).doneIds).indexOf(i.id) >= 0}; }); }catch(e){}
      const s = r70TLastNight();
      return {tasks:tasks, standard:std, streak:(function(){ try{ return computeStreak(); }catch(e){ return 0; } })(), slept:s && s.minutes ? fmtDurationLabel(s.minutes) : '', nudges:r70PhoneApi.phoneNudges()};
    },
    phoneTaskDone: function(id){ try{ completeTask(id); renderView(); return true; }catch(e){ return false; } },
    phoneStandard: function(id){ try{ toggleStandard(id); renderView(); return true; }catch(e){ return false; } },
    // what Op should say out loud on the phone, and in how few words
    phoneSpeakWhere: function(){ return r70P('r70TSpeak', 'mac'); },
    // Op's real voice on the phone: the page knows the engine and the voice, so it hands the Mac the address of
    // the audio and the Mac passes the mp3 on. The iPhone's own robot voice is only the fallback.
    phoneSpeakUrl: function(text){
      try{
        const t = String(text || '').trim(); if(!t) return '';
        if(typeof opUseHelper==='function' && !opUseHelper()) return '';
        return typeof opTtsUrl==='function' ? opTtsUrl(typeof speakable==='function' ? speakable(t.slice(0, 2000)) : t.slice(0, 2000)) : '';
      }catch(e){ return ''; }
    },
    // the Mac's own version, so an old build can say so instead of going quiet
    phoneVersion: function(){
      return {app:(window.OPAPP && OPAPP.version) || '', page:typeof OP_BUILT!=='undefined' ? OP_BUILT : 0, tags:true,
        routes:['state', 'lockin', 'lockout', 'break', 'ask', 'task', 'tag', 'tags', 'speak', 'today', 'meals', 'meal', 'weigh', 'quick', 'version']};
    }
};
(function(){
  if(!window.operatorPage) return;
  try{ window.operatorPage = Object.freeze(Object.assign({}, window.operatorPage, r70PhoneApi)); }catch(e){}
})();
// a reply going to the phone stays short enough to listen to
aiSystem = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    if(!R70T.viaPhone) return out;
    const add = '\n\nHE IS ON HIS PHONE: answer in one or two short sentences, written to be heard out loud. No lists, no headings.';
    try{ if(Array.isArray(out)) out.push({type:'text', text:add.trim()}); else return String(out || '')+add; }catch(e){}
    return out;
  };
})(aiSystem);

// ---- the pairing card follows the same one-host rule as the tags ----
// Without this the QR still points at the Wi-Fi address, so the page can't be opened on cell data.
r68PhoneCardHtml = typeof r68PhoneCardHtml==='function' ? (function(base){
  return function(){
    const T = r70Tags();
    if(!T.tailnet) return base.apply(this, arguments);
    const real = ui.r68Phone, away = r70TBase();
    if(!real || !real.on || !away) return base.apply(this, arguments);
    let h;
    ui.r68Phone = Object.assign({}, real, {url:away});
    try{ h = base.apply(this, arguments); } finally { ui.r68Phone = real; }
    return h.replace('</div>', '</div>')
      .replace(/(<div class="r68-ph-f">)/, '<p class="r70t-away">Away from home is on, so this address works anywhere \u2014 on cell data too. Your Wi-Fi address is <b>'+escapeHtml(real.url || '')+'</b>.</p>$1');
  };
})(r68PhoneCardHtml) : r68PhoneCardHtml;

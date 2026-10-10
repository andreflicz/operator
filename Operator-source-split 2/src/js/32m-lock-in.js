// ============ LOCK IN: THE SEQUENCE ============
// The same 1 → 2 → 3 → 4 walk as Wind down, warm instead of night-blue:
//   1 Task   — today's lineup (numbered, drag to reorder): pick Now and Next, add more to today
//   2 Method — one block of your length, or a way of working (Pomodoro, 52/17, 90/20, Flowtime,
//              until the task's done)
//   3 Set up — your checklist; every box has to be ticked to get past it
//   4 Why    — what you're getting / avoiding, today's deep work → the big LOCK IN
// The 🔒 Lock in pill in the corner is the one way to skip ahead: it starts right away with what's
// picked. The timer starts after the "Locked in" stamp, not under it.
const LOCK_STEPS = [['task','Task'],['method','Method'],['prep','Set up'],['why','Why']];
const LOCK_METHODS = {
  block:     {label:'Single Block', icon:'&#127919;', sub:'One Stretch, Your Length', how:'One focused stretch, as long as you set. No breaks unless you take one.', best:'Deep work with a clear finish line'},
  pomodoro:  {label:'Pomodoro', icon:'&#127813;', sub:'25 On · 5 Off · 4 Rounds', work:25, rest:5, long:15, every:4, rounds:4, how:'Four 25-minute sprints with a 5-minute breather between each. Breaks start and end by themselves.', best:'Getting started on things you\'ve been putting off'},
  '5217':    {label:'52 / 17', icon:'&#9203;', sub:'52 On · 17 Off · Repeats', work:52, rest:17, how:'52 minutes on, 17 off, on repeat. Long enough to go deep, with real rest between.', best:'Full workdays, so you\'re still sharp in the afternoon'},
  ultradian: {label:'90 / 20', icon:'&#127754;', sub:'90 On · 20 Off · Repeats', work:90, rest:20, how:'90 minutes on, 20 off. Rides your body\'s natural 90-minute energy cycle.', best:'Hard, creative work that needs a long runway'},
  flow:      {label:'Flowtime', icon:'&#127744;', sub:'No Timer · Break When You Dip', how:'No clock cutting you off. Work until focus fades, then rest about a fifth of what you did.', best:'When you\'re already in the zone'},
  done:      {label:'Until It\'s Done', icon:'&#9989;', sub:'Ends With the Task', how:'No timer at all. The session ends the moment the task is ticked off.', best:'One thing that just has to get finished'}
};
const LOCK_METHOD_ORDER = ['block','pomodoro','5217','ultradian','flow','done'];
function lockTaskPick(id){ return id ? state.tasks.items.find(function(t){ return t.id===id && t.status!=='done'; }) || null : null; }
function lockLineup(){ return lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today' && !isOngoingDoneToday(t); })); }
function openLockSeq(opts){
  opts = opts || {};
  if(state.focus.activeSession || ui.lockStarting) return;
  const lineup = lockLineup();
  const now = lockTaskPick(ui.stagedTaskId) || nextUpTask() || lineup[0] || null;
  const nextExplicit = lockTaskPick(state.focus.nextTaskId);
  const next = nextExplicit && (!now || nextExplicit.id!==now.id) ? nextExplicit : lineup.find(function(t){ return !now || t.id!==now.id; }) || null;
  const last = state.focus.lastLock || {};
  ui.lockSeq = {step:'task', maxStep:0, nowId:now ? now.id : null, nextId:next ? next.id : null,
    method: LOCK_METHODS[last.method] ? last.method : 'block',
    minutes: opts.minutes!==undefined ? opts.minutes : (last.minutes!==undefined ? last.minutes : (state.focus.lastLockMinutes!==undefined ? state.focus.lastLockMinutes : 50)),
    custom:false, prep:[], search:'', denied:false};
  closeLockInChooser(); hideOverlay('preFocusOverlay');
  showOverlay('lockSeqOverlay'); renderLockSeqInto();
}
function closeLockSeq(){ ui.lockSeq = null; hideOverlay('lockSeqOverlay'); }
function lockStepIndex(id){ return LOCK_STEPS.findIndex(function(s){ return s[0]===id; }); }
function lockPrepDone(){ const s = ui.lockSeq; return arr(state.focus.prepItems).every(function(x){ return s.prep.indexOf(x.id)>=0; }); }
// moving forward: never past Set up until every box is ticked
function lockGoTo(i){
  const s = ui.lockSeq, cur = lockStepIndex(s.step), prep = lockStepIndex('prep');
  lockReadForm();
  if(i > cur && cur>=prep && !lockPrepDone()){ lockDeny(); return; }
  if(i > prep && cur < prep && !lockPrepDone()) i = prep;
  if(i > s.maxStep + 1) i = s.maxStep + 1;
  s.step = LOCK_STEPS[Math.max(0, Math.min(LOCK_STEPS.length-1, i))][0];
  s.maxStep = Math.max(s.maxStep, lockStepIndex(s.step));
  s.denied = false;
  playStep(lockStepIndex(s.step));
  renderLockSeqInto();
}
function lockDeny(){
  const s = ui.lockSeq; s.denied = true; playDeny(); renderLockSeqInto();
  const box = document.querySelector('#lockSeqOverlay .ls-checks');
  if(box){ box.classList.remove('is-shake'); void box.offsetWidth; box.classList.add('is-shake'); }
}
ACTIONS.closeLockSeq = function(){ closeLockSeq(); };
ACTIONS.lockStep = function(el, e, id){ lockGoTo(lockStepIndex(id)); };
ACTIONS.lockNext = function(){ lockGoTo(lockStepIndex(ui.lockSeq.step) + 1); };
ACTIONS.lockBack = function(){ lockGoTo(lockStepIndex(ui.lockSeq.step) - 1); };
// step 1: Now / Next, and adding to today's lineup
ACTIONS.lockSetNow = function(el, e, id){ const s = ui.lockSeq; s.nowId = id; if(s.nextId===id) s.nextId = null; playTick(); renderLockSeqInto(); };
ACTIONS.lockSetNext = function(el, e, id){ const s = ui.lockSeq; s.nextId = s.nextId===id ? null : id; if(s.nowId===id) s.nowId = null; playTick(); renderLockSeqInto(); };
ACTIONS.lockAddToday = function(el, e, id){
  const t = lockTaskPick(id); if(!t) return;
  t.status = 'today'; state.focus.lineupOrder = arr(state.focus.lineupOrder).filter(function(x){ return x!==id; }).concat([id]);
  persist('tasks'); persist('focus'); playTaskAdded();
  if(!ui.lockSeq.nowId) ui.lockSeq.nowId = id;
  renderLockSeqInto();
};
ACTIONS.lockNewTask = function(){
  const inp = document.getElementById('lockNewTask'), title = inp ? inp.value.trim() : ''; if(!title) return;
  const t = {id:uid(), title:title, status:'today', priority:'med', clients:['personal'], client:'personal', createdAt:todayStr()};
  state.tasks.items.push(t); state.focus.lineupOrder = arr(state.focus.lineupOrder).concat([t.id]);
  persist('tasks'); persist('focus'); playTaskAdded();
  if(!ui.lockSeq.nowId) ui.lockSeq.nowId = t.id;
  renderLockSeqInto();
  setTimeout(function(){ const i = document.getElementById('lockNewTask'); if(i) i.focus(); }, 20);
};
// step 2: how you'll work
ACTIONS.lockMethod = function(el, e, id){ const s = ui.lockSeq; if(!LOCK_METHODS[id]) return; s.method = id; playTick(); renderLockSeqInto(); };
ACTIONS.lockLength = function(el){ const s = ui.lockSeq; s.custom = false; s.minutes = el.dataset.min==='open' ? null : Number(el.dataset.min); playTick(); renderLockSeqInto(); };
ACTIONS.lockCustom = function(){ ui.lockSeq.custom = true; renderLockSeqInto(); setTimeout(function(){ const i = document.getElementById('lockCustomMin'); if(i){ i.focus(); i.select(); } }, 20); };
// step 3
ACTIONS.lockPrep = function(el, e, id){ const s = ui.lockSeq, p = s.prep, i = p.indexOf(id); if(i>=0) p.splice(i, 1); else { p.push(id); playStep(Math.min(5, p.length)); } if(lockPrepDone()) s.denied = false; renderLockSeqInto(); };
ACTIONS.lockGo = function(){ lockReadForm(); lockGo(); };
ACTIONS.lockNow = function(){ lockReadForm(); lockGo(); };
function lockReadForm(){
  const s = ui.lockSeq; if(!s) return;
  const c = document.getElementById('lockCustomMin');
  if(c && s.custom){ const v = Math.round(Number(c.value)); if(v>0) s.minutes = Math.min(600, v); }
}
function lockPlannedMinutes(s){
  const m = LOCK_METHODS[s.method];
  if(s.method==='block') return s.minutes || null;
  if(m.rounds) return m.rounds * m.work;
  return null;
}
function lockGo(){
  const s = ui.lockSeq; if(!s || ui.lockStarting) return;
  const t = lockTaskPick(s.nowId), nx = lockTaskPick(s.nextId);
  [t, nx].forEach(function(x){ if(x && x.status==='backlog'){ x.status = 'today'; } });
  persist('tasks');
  if(nx){ state.focus.nextTaskId = nx.id; }
  state.focus.lastLock = {method:s.method, minutes:s.minutes};
  state.focus.lastLockMinutes = s.minutes || null;
  persist('focus');
  const method = s.method, planned = lockPlannedMinutes(s);
  closeLockSeq();
  // the stamp plays first; the clock starts when it's done
  ui.lockStarting = true;
  playLockIn(); const cover = lockFlash(t, method);
  if(typeof playLockInSong==='function') playLockInSong();
  // The stamp covers the whole window while the page underneath turns into the locked-in
  // screen; it only lifts once that's drawn, so you never see the switch happen.
  setTimeout(function(){
    ui.lockStarting = false;
    ui.stagedTaskId = t ? t.id : null;
    if(nx){ state.focus.nextTaskId = nx.id; }
    ui.view = 'today';
    ui.pendingLockMethod = {id:method, taskId:t ? t.id : null};
    startFocus(planned);
    ui.pendingLockMethod = null;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ cover.classList.add('is-leaving'); setTimeout(function(){ if(cover.parentNode) cover.parentNode.removeChild(cover); }, 650); }); });
  }, LOCK_FLASH_MS);
}
const LOCK_FLASH_MS = 1500;
// a short "Locked in" stamp over the page as it starts
function lockFlash(t, method){
  const m = LOCK_METHODS[method];
  const d = document.createElement('div');
  d.className = 'lock-flash is-hold';
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-ring is-2"></div><div class="lf-k">&#128274; Locked In</div>'+(t ? '<div class="lf-t">'+escapeHtml(t.title)+'</div>' : '')+(m && method!=='block' ? '<div class="lf-m">'+m.icon+' '+m.label+'</div>' : '');
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 6000); // safety
  return d;
}
// locking out gets its own stamp: what you just put in
function lockOutFlash(minutes, done){
  const d = document.createElement('div');
  d.className = 'lock-flash is-out';
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">&#128275; Locked Out</div><div class="lf-t">'+fmtDurationLabel(minutes)+' of deep work'+(done ? ' &middot; '+done+' task'+(done===1?'':'s')+' done' : '')+'</div>';
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 2100);
}
// ---- the methods while you're locked in: breaks come and go on their own ----
function checkMethodTimer(){
  const as = state.focus && state.focus.activeSession;
  if(!as || !as.method || as.onBreak) return;
  const m = LOCK_METHODS[as.method.id]; if(!m || !m.work) return;
  const worked = Date.now() - as.startedAt;
  const round = as.round || 1;
  const leftMs = m.work*60000 - (worked - (as.segStart||0));
  if(leftMs > 0){
    // a soft heads-up a minute out, so the break doesn't cut a thought in half
    if(leftMs <= 60000 && as.warnedRound!==round && m.work>=5){
      as.warnedRound = round; persist('focus');
      playStep(1);
      const last = m.rounds && round>=m.rounds;
      showToast(last ? 'One minute left in your last round.' : 'One minute, then a '+(m.long && m.every && round%m.every===0 ? m.long : m.rest)+' min break. Wrap up the thought.', {icon:m.icon, duration:6000});
    }
    return;
  }
  if(m.rounds && round >= m.rounds) return; // the last round ends the session (Time's up)
  const rest = m.long && m.every && round % m.every===0 ? m.long : m.rest;
  as.round = round + 1;
  methodBreak(rest, m.label+' · break '+round);
}
// what the method is doing right now, for the locked-in timer card (updated every second)
function methodState(as){
  as = as || state.focus.activeSession;
  if(!as || !as.method || !LOCK_METHODS[as.method.id] || as.method.id==='block') return null;
  const id = as.method.id, m = LOCK_METHODS[id], round = as.round || 1;
  const st = {id:id, m:m, round:round, onBreak:!!as.onBreak};
  if(m.work){
    if(as.onBreak){ st.left = Math.max(0, (as.breakEndsAt||Date.now()) - Date.now()); }
    else { const inSeg = (Date.now() - as.startedAt) - (as.segStart||0); st.inSeg = inSeg; st.left = Math.max(0, m.work*60000 - inSeg); st.frac = Math.min(1, inSeg/(m.work*60000)); }
    st.last = !!(m.rounds && round>=m.rounds);
  } else if(id==='flow' && !as.onBreak){ st.inSeg = (Date.now() - as.startedAt) - (as.segStart||0); st.earned = flowBreakMinutes(); }
  return st;
}
function methodLine(st){
  const m = st.m;
  if(m.work){
    const r = 'Round '+(st.onBreak ? st.round-1 : st.round)+(m.rounds ? ' of '+m.rounds : '');
    if(st.onBreak){ const as = state.focus.activeSession, b = as && as.breaks[as.breaks.length-1]; return b && !b.auto ? 'Round '+st.round+(m.rounds ? ' of '+m.rounds : '')+' paused' : r+' done'; }
    return r+' · '+(st.last ? 'Last round, <b>'+formatElapsed(st.left)+'</b> to go' : 'Break in <b>'+formatElapsed(st.left)+'</b>');
  }
  if(st.id==='flow') return st.onBreak ? 'Resting · back when you\'re ready' : 'In the flow for <b>'+formatElapsed(st.inSeg||0)+'</b> · break earned: <b>'+(st.earned||5)+' min</b>';
  const as = state.focus.activeSession, t = as && lockTaskPick(as.method.taskId);
  return t ? 'Until <b>'+escapeHtml(t.title)+'</b> is done' : 'Until it\'s done';
}
function methodStripHtml(as){
  const st = methodState(as); if(!st) return '';
  const m = st.m;
  let bar = '';
  if(m.rounds){
    const segs = lockMethodSegments(st.id), total = segs.reduce(function(a, x){ return a + x.min; }, 0);
    // which piece are we in? work round r is piece 2(r-1); its break is the next one
    const cur = st.onBreak ? 2*(st.round-1)-1 : 2*(st.round-1);
    bar = '<div class="ms-bar">'+segs.map(function(x, i){
      const fill = i<cur ? 1 : i===cur ? (st.onBreak ? 1 - st.left/((x.min||1)*60000) : (st.frac||0)) : 0;
      return '<i class="ms-'+x.k+(i===cur?' is-cur':'')+'" style="flex:'+(x.min/total).toFixed(3)+'" data-tip="'+(x.k==='w' ? 'Round '+x.round+' · '+x.min+' min' : (x.long?'Long break':'Break')+' · '+x.min+' min')+'"><u'+(i===cur?' id="msFill"':'')+' style="width:'+(Math.max(0, Math.min(1, fill))*100).toFixed(1)+'%"></u></i>';
    }).join('')+'</div>';
  } else if(m.work && !st.onBreak){
    bar = '<div class="ms-bar"><i class="ms-w is-cur" style="flex:1" data-tip="This round · '+m.work+' min, then '+m.rest+' min off"><u id="msFill" style="width:'+((st.frac||0)*100).toFixed(1)+'%"></u></i></div>';
  }
  return '<div class="ms'+(st.onBreak?' is-break':'')+'">'+bar+'<div class="ms-line"><span class="ms-k">'+m.icon+' '+m.label+'</span><span id="msLine">'+methodLine(st)+'</span></div>'+
    (st.id==='flow' && !st.onBreak ? '<button class="btn btn-ghost btn-sm ms-btn" data-action="openBreakNotePrompt">Take my '+(st.earned||5)+' min</button>' : '')+'</div>';
}
function tickMethodStrip(){
  const line = document.getElementById('msLine'); if(!line) return;
  const st = methodState(); if(!st) return;
  const html = methodLine(st); if(line.innerHTML!==html) line.innerHTML = html;
  const f = document.getElementById('msFill');
  if(f){
    let fr = st.frac;
    if(st.onBreak){ const as = state.focus.activeSession, b = as.breaks && as.breaks[as.breaks.length-1]; fr = b && b.minutes ? 1 - st.left/(b.minutes*60000) : null; }
    if(fr!=null) f.style.width = (Math.max(0, Math.min(1, fr))*100).toFixed(1)+'%';
  }
}
function methodBreak(minutes, note){
  const as = state.focus.activeSession; if(!as || as.onBreak) return;
  if(!Array.isArray(as.breaks)) as.breaks = [];
  as.breaks.push({start:Date.now(), note:note, minutes:minutes, auto:true});
  as.onBreak = true;
  as.breakStartedAt = Date.now();
  as.breakEndsAt = Date.now() + minutes*60000;
  as.frozenElapsedMs = Date.now() - as.startedAt;
  as.segStart = as.frozenElapsedMs;
  state.modes.active = {type:'break', startedAt:Date.now(), note:note, linkedFocus:true};
  if(ui.currentTaskId){ ui.pausedTaskId = ui.currentTaskId; accumulateCurrentTaskTime(ui.currentTaskId); persist('tasks'); }
  ui.pendingCurrentTaskId = null;
  playRestSound(); pingWrapper();
  showToast('Round done. '+minutes+' min break: stand up, look out a window. It ends by itself.', {icon:'&#9749;', duration:8000});
  try{ if('Notification' in window && Notification.permission==='granted') new Notification('Operator: '+minutes+' min break'); }catch(e){}
  persist('focus'); persist('modes'); renderView();
}
// Flowtime: the break you take is about a fifth of the stretch you just did
function flowBreakMinutes(){
  const as = state.focus.activeSession; if(!as || !as.method || as.method.id!=='flow') return null;
  const worked = (Date.now() - as.startedAt) - (as.segStart||0);
  return Math.max(5, Math.min(30, Math.round(worked/60000/5/5)*5));
}
// "Until it's done": finishing that task offers to lock out
function methodTaskDone(id){
  const as = state.focus.activeSession;
  if(!as || !as.method || as.method.id!=='done' || as.method.taskId!==id) return;
  showToast('That\'s the one — done.', {icon:'&#9989;', actionLabel:'Lock out', actionAction:'openStopFocus', duration:12000});
}
ACTIONS.openStopFocus = function(){ openStopFocus(); };
document.addEventListener('keydown', function(e){
  if(!ui.lockSeq || !overlayOpen('lockSeqOverlay')) return;
  if(e.key!=='Enter') return;
  const inInput = e.target && /INPUT|TEXTAREA/.test(e.target.tagName);
  if(e.metaKey || e.ctrlKey){ e.preventDefault(); ACTIONS.lockNow(); return; }
  if(inInput && e.target.id==='lockNewTask'){ e.preventDefault(); ACTIONS.lockNewTask(); return; }
  if(inInput && e.target.id==='lockSearch') return;
  e.preventDefault();
  if(ui.lockSeq.step==='why') ACTIONS.lockGo(); else ACTIONS.lockNext();
});
document.addEventListener('input', function(e){ if(e.target && e.target.id==='lockSearch' && ui.lockSeq){ ui.lockSeq.search = e.target.value; clearTimeout(ui._lockT); ui._lockT = setTimeout(renderLockSeqInto, 120); } });
// drag to reorder today's lineup inside step 1
document.addEventListener('dragstart', function(e){
  const r = e.target.closest && e.target.closest('.ls-row'); if(!r || !ui.lockSeq) return;
  ui.lockSeq.dragId = r.dataset.id; e.dataTransfer.effectAllowed = 'move';
  try{ e.dataTransfer.setData('text/x-lock', r.dataset.id); }catch(err){}
  const n = r.querySelector('.wd-num'), t = r.querySelector('.wd-title');
  dragGhost(e, t ? t.textContent : '', {num: n ? n.textContent : null, src: r});
});
document.addEventListener('dragover', function(e){
  if(!ui.lockSeq || !ui.lockSeq.dragId || !e.target.closest) return;
  const r = e.target.closest('.ls-row'); if(!r) return;
  e.preventDefault();
  const rect = r.getBoundingClientRect(); markDropLine('.ls-row', r, e.clientY > rect.top + rect.height/2);
});
document.addEventListener('dragend', function(){ if(ui.lockSeq) ui.lockSeq.dragId = null; markDropLine('.ls-row', null); });
ACTIONS.lockMove = function(el, e, id){
  const ids = lockLineup().map(function(t){ return t.id; }), i = ids.indexOf(id), j = i + Number(el.dataset.dir);
  if(i<0 || j<0 || j>=ids.length) return;
  ids.splice(i, 1); ids.splice(j, 0, id);
  state.focus.lineupOrder = ids.concat(arr(state.focus.lineupOrder).filter(function(x){ return ids.indexOf(x)<0; }));
  persist('focus'); playDrop(); renderLockSeqInto();
};
document.addEventListener('drop', function(e){
  const r = e.target.closest && e.target.closest('.ls-row'); if(!r || !ui.lockSeq || !ui.lockSeq.dragId) return;
  e.preventDefault(); markDropLine('.ls-row', null);
  const id = ui.lockSeq.dragId, rect = r.getBoundingClientRect(); ui.lockSeq.dragId = null;
  if(id===r.dataset.id) return;
  const ids = lockLineup().map(function(t){ return t.id; }).filter(function(x){ return x!==id; });
  let at = ids.indexOf(r.dataset.id); if(e.clientY > rect.top + rect.height/2) at++;
  ids.splice(at, 0, id);
  state.focus.lineupOrder = ids; persist('focus'); playDrop(); renderLockSeqInto();
});

function lockLenLabel(m){ return m ? (m>=60 ? (m%60 ? Math.floor(m/60)+'h '+(m%60)+'m' : (m/60)+'h') : m+'m') : 'Open'; }
function lockTaskHtml(){
  const s = ui.lockSeq, lineup = lockLineup();
  const q = (s.search||'').toLowerCase();
  const pool = sortByPriorityAndDeadline(state.tasks.items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea && (!q || t.title.toLowerCase().indexOf(q)>=0); })).slice(0, 10);
  return '<div class="ls-task">'+
    (lineup.length ? '<ol class="wd-list ls-list">'+lineup.map(function(t, i){
      const isNow = t.id===s.nowId, isNext = t.id===s.nextId;
      return '<li class="wd-row ls-row'+(isNow?' is-now':'')+(isNext?' is-next':'')+'" draggable="true" data-id="'+t.id+'" style="animation-delay:'+(i*45)+'ms">'+
        '<span class="wd-num">'+String(i+1).padStart(2,'0')+'</span>'+
        '<button class="ls-row-main" data-action="lockSetNow" data-id="'+t.id+'">'+priorityTag(t.priority)+'<span class="wd-title">'+escapeHtml(t.title)+'</span></button>'+
        '<span class="ls-slots"><button class="ls-slot ls-slot-now'+(isNow?' is-on':'')+'" data-action="lockSetNow" data-id="'+t.id+'">Now</button>'+
          '<button class="ls-slot ls-slot-next'+(isNext?' is-on':'')+'" data-action="lockSetNext" data-id="'+t.id+'">Next</button></span>'+
        '<span class="ls-moves"><button class="wd-ctl" data-action="lockMove" data-id="'+t.id+'" data-dir="-1" title="Move up"'+(i===0?' disabled':'')+'>&#8593;</button>'+
          '<button class="wd-ctl" data-action="lockMove" data-id="'+t.id+'" data-dir="1" title="Move down"'+(i===lineup.length-1?' disabled':'')+'>&#8595;</button></span></li>';
    }).join('')+'</ol>' : '<div class="wd-empty">Your lineup is empty.</div>')+
    '<div class="ls-add">'+
      '<div class="wd-add"><input class="input" id="lockNewTask" placeholder="+ Add a task to today"><button class="btn btn-sm" data-action="lockNewTask">Add</button></div>'+
      (pool.length || q ? '<div class="ls-pool-h"><span class="wd-k" style="margin:0;">From your list</span><input class="input ls-search" id="lockSearch" placeholder="Search" value="'+escapeHtml(s.search||'')+'"></div>'+
        '<div class="wd-pool">'+(pool.length ? pool.map(function(t){ return '<button class="wd-chip ls-chip" data-action="lockAddToday" data-id="'+t.id+'" title="Add to today">'+priorityTag(t.priority)+'<span>'+escapeHtml(t.title)+'</span><b>+</b></button>'; }).join('') : '<span class="kpi-sub">No match.</span>')+'</div>' : '')+
    '</div>'+
  '</div>';
}
// The method's shape, laid out from now: every piece says what it is and when (hover it).
function lockMethodSegments(id){
  const m = LOCK_METHODS[id], segs = [];
  if(m.rounds){ for(let i=1;i<=m.rounds;i++){ segs.push({k:'w', min:m.work, round:i}); if(i<m.rounds){ const long = m.long && i%m.every===0; segs.push({k:'r', min:long ? m.long : m.rest, long:long, round:i}); } } }
  else if(m.work){ for(let i=1;i<=3;i++){ segs.push({k:'w', min:m.work, round:i}); segs.push({k:'r', min:m.rest, round:i}); } segs.push({k:'more', min:m.work*0.6}); }
  else if(id==='flow') segs.push({k:'w', min:70, grad:true, flow:true}, {k:'r', min:14, flow:true}, {k:'w', min:45, grad:true, flow:true}, {k:'r', min:9, flow:true}, {k:'more', min:30});
  else segs.push({k:'w', min:100, grad:true, open:true}, {k:'flag', min:6});
  return segs;
}
function lockPreviewHtml(id){
  const m = LOCK_METHODS[id];
  if(id==='block') return '';
  const segs = lockMethodSegments(id), total = segs.reduce(function(a, x){ return a + x.min; }, 0);
  const timed = !!m.work;
  let t = Date.now();
  const tm = function(ms){ return fmtTimeShort(ms); };
  const out = segs.map(function(x){
    let tip = '', when = '';
    if(timed && (x.k==='w' || x.k==='r')){ when = tm(t)+' – '+tm(t + x.min*60000); t += x.min*60000; }
    if(x.k==='w') tip = x.open ? 'Work until the task is ticked off' : x.flow ? 'Work until your focus dips. No timer.' : 'Round '+x.round+(m.rounds ? ' of '+m.rounds : '')+' · '+x.min+' min focus';
    else if(x.k==='r') tip = x.flow ? 'Break · about a fifth of what you just did (50 min → 10 min)' : (x.long ? 'Long break' : 'Break')+' · '+x.min+' min';
    else if(x.k==='more') tip = timed ? 'Keeps going, '+m.work+' on / '+m.rest+' off, until you lock out' : 'And again, as long as you like';
    else tip = 'Task done → you\'re done';
    return '<i class="lsp-'+x.k+(x.grad?' is-grad':'')+'" style="flex:'+(x.min/total).toFixed(3)+'" data-tip="'+escapeHtml(tip)+'"'+(when ? ' data-when="'+when+'"' : '')+'>'+(x.k==='flag' ? '&#9873;' : '')+'</i>';
  }).join('');
  const focus = segs.filter(function(x){ return x.k==='w'; }).reduce(function(a, x){ return a + x.min; }, 0), rest = segs.filter(function(x){ return x.k==='r'; }).reduce(function(a, x){ return a + x.min; }, 0);
  return '<div class="ls-preview">'+out+'</div>'+
    '<div class="ls-legend">'+(m.rounds
      ? '<span><i class="lsl-w"></i>Focus <b>'+fmtDurationLabel(focus)+'</b></span><span><i class="lsl-r"></i>Breaks <b>'+fmtDurationLabel(rest)+'</b></span>'
      : m.work ? '<span><i class="lsl-w"></i>Focus <b>'+m.work+' min</b></span><span><i class="lsl-r"></i>Break <b>'+m.rest+' min</b></span><span>Repeats until you lock out</span>'
      : id==='flow' ? '<span><i class="lsl-w"></i>Focus <b>as long as it lasts</b></span><span><i class="lsl-r"></i>Break <b>⅕ of it</b></span>'
      : '<span><i class="lsl-w"></i>Focus <b>until it\'s done</b></span>')+'<span class="ls-legend-h">Hover the bar for times</span></div>';
}
function lockMethodHtml(){
  const s = ui.lockSeq, m = s.minutes;
  const tile = function(v, big, small){ const on = !s.custom && (v==='open' ? !m : m===v); return '<button class="ls-len'+(on?' is-on':'')+'" data-action="lockLength" data-min="'+v+'"><b>'+big+'</b><span>'+small+'</span></button>'; };
  const mm = LOCK_METHODS[s.method];
  let total = lockPlannedMinutes(s);
  if(mm.rounds) total = mm.rounds*mm.work + (mm.rounds-1)*mm.rest;
  return '<div class="ls-method">'+
    '<div class="ls-methods">'+LOCK_METHOD_ORDER.map(function(id, i){ const x = LOCK_METHODS[id]; return '<button class="ls-mcard'+(s.method===id?' is-on':'')+'" data-action="lockMethod" data-id="'+id+'" style="animation-delay:'+(i*40)+'ms"><span class="ls-mi">'+x.icon+'</span><b>'+x.label+'</b><span>'+x.sub+'</span></button>'; }).join('')+'</div>'+
    '<div class="ls-about" data-key="about-'+s.method+'">'+
      '<div class="ls-about-id"><span class="ls-about-i">'+mm.icon+'</span><div><b>'+mm.label+'</b><span>'+mm.sub+'</span></div></div>'+
      '<div class="ls-about-txt"><div><span class="ls-about-k">How it works</span><p>'+mm.how+'</p></div>'+
        '<div><span class="ls-about-k is-best">Best for</span><p>'+mm.best+'</p></div></div>'+
    '</div>'+
    (s.method==='block' ? '<div class="ls-lens">'+
        tile(25, '25', 'min')+tile(50, '50', 'min')+tile(90, '90', 'min')+tile(120, '2', 'hours')+tile(180, '3', 'hours')+tile('open', '&infin;', 'open')+
      '</div>'+
      '<div class="ls-custom">'+(s.custom ? '<input class="input ls-custom-in" type="number" min="5" max="600" step="5" id="lockCustomMin" value="'+(m||60)+'"><span>min</span>' : '<button class="btn btn-ghost btn-sm" data-action="lockCustom">Custom</button>')+'</div>'
      : lockPreviewHtml(s.method))+
    '<div class="ls-ends">'+(total ? 'Done at <b>'+fmtTimeShort(Date.now() + total*60000)+'</b>' : '&nbsp;')+'</div>'+
  '</div>';
}
function lockPrepHtml(){
  const s = ui.lockSeq, items = arr(state.focus.prepItems), me = nextMeetingEventToday();
  const ready = items.filter(function(x){ return s.prep.indexOf(x.id)>=0; }).length;
  return '<div class="ls-prep">'+
    (items.length ? '<div class="ls-checks'+(s.denied?' is-denied':'')+'">'+items.map(function(x, i){ const on = s.prep.indexOf(x.id)>=0; return '<button class="ls-check'+(on?' is-on':'')+'" data-action="lockPrep" data-id="'+x.id+'" style="animation-delay:'+(i*60)+'ms"><span class="ls-box">'+(on?'&#10003;':'')+'</span><span>'+escapeHtml(x.label)+'</span></button>'; }).join('')+'</div>'+
      '<div class="ls-ready'+(ready===items.length?' is-all':'')+(s.denied?' is-denied':'')+'">'+(ready===items.length ? '&#10003; Ready.' : s.denied ? 'Tick every box first.' : ready+' / '+items.length)+'</div>'
      : '<div class="wd-empty">No checklist yet. <a href="#" data-action="goToFocusSettings">Add one</a></div>')+
    (me ? '<div class="ls-call"><span>&#128222; '+escapeHtml(me.title)+(me.time ? ' at '+fmt12Hour(me.time) : '')+'</span><button class="btn btn-good btn-sm" data-action="joinCall" data-url="'+escapeHtml(me.meetingLink)+'">Join call</button></div>' : '')+
  '</div>';
}
function lockWhyHtml(){
  const s = ui.lockSeq, pick = lockTaskPick(s.nowId), mm = LOCK_METHODS[s.method];
  const toward = arr(state.focus.motivations && state.focus.motivations.toward), away = arr(state.focus.motivations && state.focus.motivations.away);
  const target = state.standards.deepWorkTargetMinutes || 180, deep = deepWorkMinutesTodayLive();
  const planned = lockPlannedMinutes(s), after = planned ? deep + planned : null;
  const pct = Math.min(100, deep/target*100), pct2 = after ? Math.min(100, after/target*100) : pct;
  return '<div class="ls-why">'+
    '<div class="ls-cols">'+
      '<div class="ls-col is-get"><div class="ls-col-k">Getting</div>'+(toward.length ? toward.map(function(m){ return '<div class="ls-m">'+escapeHtml(m.text)+'</div>'; }).join('') : '<div class="ls-dim">Add these in Settings.</div>')+'</div>'+
      '<div class="ls-col is-avoid"><div class="ls-col-k">Avoiding</div>'+(away.length ? away.map(function(m){ return '<div class="ls-m">'+escapeHtml(m.text)+'</div>'; }).join('') : '<div class="ls-dim">Add these in Settings.</div>')+'</div>'+
    '</div>'+
    '<div class="ls-bar"><div class="ls-bar-k"><span>Deep work today</span><span>'+fmtHours(deep)+(after ? ' &rarr; <b>'+fmtHours(after)+'</b>' : '')+' / '+fmtHours(target)+'</span></div>'+
      '<div class="ls-bar-t"><i class="ls-bar-now" style="width:'+pct.toFixed(1)+'%"></i><i class="ls-bar-add" style="left:'+pct.toFixed(1)+'%;width:'+Math.max(0, pct2-pct).toFixed(1)+'%"></i></div></div>'+
    '<div class="ls-go-wrap"><button class="ls-go" data-action="lockGo"><span class="ls-go-ring"></span><span class="ls-go-i">&#128274;</span><b>LOCK IN</b></button></div>'+
  '</div>';
}
function lockSeqHtml(){
  const s = ui.lockSeq; if(!s) return '';
  const i = lockStepIndex(s.step), prep = lockStepIndex('prep');
  const titles = {task:'What are we knocking out?', method:'How are you working?', prep:'Set the room up.', why:'Remember why.'};
  const body = s.step==='method' ? lockMethodHtml() : s.step==='prep' ? lockPrepHtml() : s.step==='why' ? lockWhyHtml() : lockTaskHtml();
  const reachable = function(k){ return k <= s.maxStep + 1 && (k <= prep || lockPrepDone() || k <= i); };
  return '<div class="wd ls">'+
    '<div class="wd-top">'+
      '<div class="wd-steps">'+LOCK_STEPS.map(function(x, k){ return '<button class="wd-step'+(k===i?' is-on':'')+(k<i?' is-past':'')+(reachable(k)?'':' is-locked')+'" data-action="lockStep" data-id="'+x[0]+'"'+(reachable(k)?'':' disabled')+'><span>'+(k+1)+'</span>'+x[1]+'</button>'; }).join('')+'</div>'+
      '<button class="ls-now'+(s.step==='why' ? ' is-hidden' : '')+'" data-action="lockNow" title="Lock in right now with what\'s picked (⌘↵)"'+(s.step==='why' ? ' tabindex="-1"' : '')+'>&#128274; Lock in</button>'+
      '<button class="wd-close" data-action="closeLockSeq" title="Close (Esc)">&#10005;</button></div>'+
    '<div class="wd-inner ls-inner" data-key="ls-'+s.step+'"><div class="ls-stage"><h2 class="wd-title-h">'+titles[s.step]+'</h2>'+body+'</div></div>'+
    '<div class="wd-foot">'+
      (i>0 ? '<button class="btn btn-ghost ls-back" data-action="lockBack">&larr; Back</button>' : '<span></span>')+
      (s.step==='why' ? '<span></span>' : '<button class="ls-next" data-action="lockNext">Next <span>&rarr;</span></button>')+
    '</div>'+
  '</div>';
}
function renderLockSeqInto(){ const el = document.getElementById('lockSeqContent'); if(el) morphInto(el, lockSeqHtml(), {form:true}); }
registerModal('lockSeqOverlay', renderLockSeqInto);
ACTIONS.goToFocusSettings = function(){ closeLockSeq(); ui.view = 'settings'; ui.settingsTab = 'focus'; renderView(); };

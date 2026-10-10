// ============ LOCK IN: THE SEQUENCE ============
// The same 1 → 2 → 3 → 4 walk as Wind down, warm instead of night-blue:
//   1 Task   — what you're knocking out (your lineup, numbered; or add one)
//   2 Length — 25m / 50m / 90m / 2h / 3h / open-ended, or your own
//   3 Set up — your prep checklist (phone away…), and the next call if there is one
//   4 Why    — what you're getting / avoiding, today's deep work so far → LOCK IN
// "⚡ Lock in now" sits in the corner of every step: it starts right away with what's picked.
const LOCK_STEPS = [['task','Task'],['length','Length'],['prep','Set up'],['why','Why']];
const LOCK_LENGTHS = [25, 50, 90, 120, 180];
function lockTaskPick(id){ return id ? state.tasks.items.find(function(t){ return t.id===id && t.status!=='done'; }) || null : null; }
function openLockSeq(opts){
  opts = opts || {};
  if(state.focus.activeSession) return;
  const next = nextUpTask();
  const last = state.focus.lastLockMinutes;
  ui.lockSeq = {step:opts.step || 'task', taskId:(lockTaskPick(ui.stagedTaskId) || next || {}).id || null,
    minutes:opts.minutes!==undefined ? opts.minutes : (last===undefined ? 50 : last), custom:false, prep:[], search:''};
  closeLockInChooser(); hideOverlay('preFocusOverlay');
  showOverlay('lockSeqOverlay'); renderLockSeqInto();
}
function closeLockSeq(){ ui.lockSeq = null; hideOverlay('lockSeqOverlay'); }
ACTIONS.closeLockSeq = function(){ closeLockSeq(); };
ACTIONS.lockStep = function(el, e, id){ lockReadForm(); ui.lockSeq.step = id; renderLockSeqInto(); };
ACTIONS.lockNext = function(){ lockReadForm(); const i = LOCK_STEPS.findIndex(function(s){ return s[0]===ui.lockSeq.step; }); ui.lockSeq.step = LOCK_STEPS[Math.min(LOCK_STEPS.length-1, i+1)][0]; renderLockSeqInto(); };
ACTIONS.lockBack = function(){ lockReadForm(); const i = LOCK_STEPS.findIndex(function(s){ return s[0]===ui.lockSeq.step; }); ui.lockSeq.step = LOCK_STEPS[Math.max(0, i-1)][0]; renderLockSeqInto(); };
ACTIONS.lockPickTask = function(el, e, id){ ui.lockSeq.taskId = id; playTick(); renderLockSeqInto(); };
ACTIONS.lockNoTask = function(){ ui.lockSeq.taskId = null; renderLockSeqInto(); };
ACTIONS.lockNewTask = function(){
  const inp = document.getElementById('lockNewTask'), title = inp ? inp.value.trim() : ''; if(!title) return;
  const t = {id:uid(), title:title, status:'today', priority:'med', clients:['personal'], client:'personal', createdAt:todayStr()};
  state.tasks.items.push(t); persist('tasks'); playTaskAdded();
  ui.lockSeq.taskId = t.id; renderLockSeqInto();
};
ACTIONS.lockLength = function(el){ const s = ui.lockSeq; s.custom = false; s.minutes = el.dataset.min==='open' ? null : Number(el.dataset.min); playTick(); renderLockSeqInto(); };
ACTIONS.lockCustom = function(){ ui.lockSeq.custom = true; renderLockSeqInto(); setTimeout(function(){ const i = document.getElementById('lockCustomMin'); if(i){ i.focus(); i.select(); } }, 20); };
ACTIONS.lockPrep = function(el, e, id){ const p = ui.lockSeq.prep, i = p.indexOf(id); if(i>=0) p.splice(i, 1); else { p.push(id); playTick(); } renderLockSeqInto(); };
ACTIONS.lockGo = function(){ lockReadForm(); lockGo(); };
ACTIONS.lockNow = function(){ lockReadForm(); lockGo(); };
function lockReadForm(){
  const s = ui.lockSeq; if(!s) return;
  const c = document.getElementById('lockCustomMin');
  if(c && s.custom){ const v = Math.round(Number(c.value)); if(v>0) s.minutes = Math.min(600, v); }
}
function lockGo(){
  const s = ui.lockSeq; if(!s) return;
  const t = lockTaskPick(s.taskId);
  if(t && t.status==='backlog'){ t.status = 'today'; persist('tasks'); }
  ui.stagedTaskId = t ? t.id : null;
  state.focus.lastLockMinutes = s.minutes || null;
  closeLockSeq();
  startFocus(s.minutes || null);
  if(!state.focus.activeSession) return;
  playLockIn(); lockFlash(t);
}
// a short "Locked in" stamp over the page as it starts
function lockFlash(t){
  const d = document.createElement('div');
  d.className = 'lock-flash';
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">&#128274; Locked in</div>'+(t ? '<div class="lf-t">'+escapeHtml(t.title)+'</div>' : '');
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 1700);
}
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

function lockLenLabel(m){ return m ? (m>=60 ? (m%60 ? Math.floor(m/60)+'h '+(m%60)+'m' : (m/60)+'h') : m+'m') : 'Open'; }
function lockTaskHtml(){
  const s = ui.lockSeq, pick = lockTaskPick(s.taskId);
  const lineup = lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today' && !isOngoingDoneToday(t); }));
  const q = (s.search||'').toLowerCase();
  const pool = sortByPriorityAndDeadline(state.tasks.items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea && (!q || t.title.toLowerCase().indexOf(q)>=0); })).slice(0, 10);
  return '<div class="ls-task">'+
    '<div class="ls-pick'+(pick?' has-task':'')+'">'+
      '<div class="ls-pick-k">'+(pick ? 'You\'re locking in on' : 'No task picked')+(pick ? '<button class="ls-notask" data-action="lockNoTask">Just the clock</button>' : '')+'</div>'+
      '<div class="ls-pick-t">'+(pick ? priorityTag(pick.priority)+'<span>'+escapeHtml(pick.title)+'</span>' : '<span class="ls-dim">Just the clock — pick one below, or go without.</span>')+'</div>'+
    '</div>'+
    (lineup.length ? '<div class="wd-k">Today\'s lineup</div><ol class="wd-list ls-list">'+lineup.slice(0, 8).map(function(t, i){
      const on = t.id===s.taskId;
      return '<li class="wd-row ls-row'+(on?' is-picked':'')+'" data-action="lockPickTask" data-id="'+t.id+'"><span class="wd-num">'+String(i+1).padStart(2,'0')+'</span>'+priorityTag(t.priority)+'<span class="wd-title">'+escapeHtml(t.title)+'</span><span class="ls-tick">'+(on?'&#10003;':'')+'</span></li>';
    }).join('')+'</ol>' : '')+
    '<div class="wd-add"><input class="input" id="lockNewTask" placeholder="+ Something new (Enter)"><button class="btn btn-sm" data-action="lockNewTask">Add</button></div>'+
    (pool.length || q ? '<div class="wd-k" style="margin-top:16px;">From your list</div><input class="input wd-search" id="lockSearch" placeholder="Search…" value="'+escapeHtml(s.search||'')+'">'+
      '<div class="wd-pool">'+(pool.length ? pool.map(function(t){ return '<button class="wd-chip ls-chip'+(t.id===s.taskId?' is-picked':'')+'" data-action="lockPickTask" data-id="'+t.id+'">'+priorityTag(t.priority)+'<span>'+escapeHtml(t.title)+'</span><b>'+(t.id===s.taskId?'&#10003;':'+')+'</b></button>'; }).join('') : '<span class="kpi-sub">No match.</span>')+'</div>' : '')+
  '</div>';
}
function lockLengthHtml(){
  const s = ui.lockSeq, m = s.minutes;
  const ends = m ? fmtTimeShort(Date.now() + m*60000) : null;
  const tile = function(v, big, small){ const on = !s.custom && (v==='open' ? !m : m===v); return '<button class="ls-len'+(on?' is-on':'')+'" data-action="lockLength" data-min="'+v+'"><b>'+big+'</b><span>'+small+'</span></button>'; };
  return '<div class="ls-length">'+
    '<div class="ls-lens">'+
      tile(25, '25', 'min · sprint')+tile(50, '50', 'min · classic')+tile(90, '90', 'min · deep')+tile(120, '2', 'hours')+tile(180, '3', 'hours')+tile('open', '&infin;', 'open-ended')+
    '</div>'+
    '<div class="ls-custom">'+(s.custom ? '<input class="input ls-custom-in" type="number" min="5" max="600" step="5" id="lockCustomMin" value="'+(m||60)+'"><span>minutes</span>' : '<button class="btn btn-ghost btn-sm" data-action="lockCustom">Custom length…</button>')+'</div>'+
    '<div class="ls-ends">'+(m ? 'Done at <b>'+ends+'</b> &middot; '+lockLenLabel(m) : 'No finish line — stop when you\'re done.')+'</div>'+
  '</div>';
}
function lockPrepHtml(){
  const s = ui.lockSeq, items = arr(state.focus.prepItems), me = nextMeetingEventToday();
  const ready = items.filter(function(x){ return s.prep.indexOf(x.id)>=0; }).length;
  return '<div class="ls-prep">'+
    (items.length ? '<div class="ls-checks">'+items.map(function(x){ const on = s.prep.indexOf(x.id)>=0; return '<button class="ls-check'+(on?' is-on':'')+'" data-action="lockPrep" data-id="'+x.id+'"><span class="ls-box">'+(on?'&#10003;':'')+'</span><span>'+escapeHtml(x.label)+'</span></button>'; }).join('')+'</div>'+
      '<div class="ls-ready'+(ready===items.length?' is-all':'')+'">'+(ready===items.length ? '&#10003; All set.' : ready+' of '+items.length+' ready')+'</div>'
      : '<div class="wd-empty">No set-up checklist yet — add one in Settings (phone away, water, door shut…).</div>')+
    (me ? '<div class="ls-call"><span>&#128222; '+escapeHtml(me.title)+(me.time ? ' at '+fmt12Hour(me.time) : '')+'</span><button class="btn btn-good btn-sm" data-action="joinCall" data-url="'+escapeHtml(me.meetingLink)+'">Join call</button></div>' : '')+
  '</div>';
}
function lockWhyHtml(){
  const s = ui.lockSeq, pick = lockTaskPick(s.taskId);
  const toward = arr(state.focus.motivations && state.focus.motivations.toward), away = arr(state.focus.motivations && state.focus.motivations.away);
  const target = state.standards.deepWorkTargetMinutes || 180, deep = deepWorkMinutesTodayLive();
  const after = s.minutes ? deep + s.minutes : null;
  const pct = Math.min(100, deep/target*100), pct2 = after ? Math.min(100, after/target*100) : pct;
  return '<div class="ls-why">'+
    '<div class="ls-cols">'+
      '<div class="ls-col is-get"><div class="ls-col-k">Getting</div>'+(toward.length ? toward.map(function(m){ return '<div class="ls-m">'+escapeHtml(m.text)+'</div>'; }).join('') : '<div class="ls-dim">Add these in Settings.</div>')+'</div>'+
      '<div class="ls-col is-avoid"><div class="ls-col-k">Avoiding</div>'+(away.length ? away.map(function(m){ return '<div class="ls-m">'+escapeHtml(m.text)+'</div>'; }).join('') : '<div class="ls-dim">Add these in Settings.</div>')+'</div>'+
    '</div>'+
    '<div class="ls-bar"><div class="ls-bar-k"><span>Deep work today</span><span>'+fmtHours(deep)+(after ? ' &rarr; <b>'+fmtHours(after)+'</b>' : '')+' of '+fmtHours(target)+'</span></div>'+
      '<div class="ls-bar-t"><i class="ls-bar-now" style="width:'+pct.toFixed(1)+'%"></i><i class="ls-bar-add" style="left:'+pct.toFixed(1)+'%;width:'+Math.max(0, pct2-pct).toFixed(1)+'%"></i></div></div>'+
    '<button class="ls-go" data-action="lockGo"><span class="ls-go-i">&#128274;</span><span><b>LOCK IN</b><small>'+(pick ? escapeHtml(pick.title)+' &middot; ' : '')+lockLenLabel(s.minutes)+'</small></span></button>'+
  '</div>';
}
function lockSeqHtml(){
  const s = ui.lockSeq; if(!s) return '';
  const i = LOCK_STEPS.findIndex(function(x){ return x[0]===s.step; });
  const titles = {task:'What are we knocking out?', length:'How long are you in for?', prep:'Set the room up.', why:'Remember why.'};
  const body = s.step==='length' ? lockLengthHtml() : s.step==='prep' ? lockPrepHtml() : s.step==='why' ? lockWhyHtml() : lockTaskHtml();
  const pick = lockTaskPick(s.taskId);
  return '<div class="wd ls">'+
    '<div class="wd-top"><span class="ls-lock">&#128274;</span><span class="wd-brand ls-brand">Lock in</span>'+
      '<div class="wd-steps">'+LOCK_STEPS.map(function(x, k){ return '<button class="wd-step'+(k===i?' is-on':'')+(k<i?' is-past':'')+'" data-action="lockStep" data-id="'+x[0]+'"><span>'+(k+1)+'</span>'+x[1]+'</button>'; }).join('')+'</div>'+
      '<button class="ls-now" data-action="lockNow" title="Start right now with what\'s picked (⌘↵)">&#9889; Lock in now</button>'+
      '<button class="wd-close" data-action="closeLockSeq" title="Close (Esc)">&#10005;</button></div>'+
    '<div class="wd-inner" data-key="ls-'+s.step+'"><h2 class="wd-title-h">'+titles[s.step]+'</h2>'+body+'</div>'+
    '<div class="wd-foot">'+
      (i>0 ? '<button class="btn btn-ghost" data-action="lockBack">&larr; Back</button>' : '<span></span>')+
      (s.step==='why' ? '<span class="ls-sum">'+(pick ? escapeHtml(pick.title) : 'No task')+' &middot; '+lockLenLabel(s.minutes)+'</span>'
        : '<span class="row" style="gap:10px;align-items:center;"><span class="ls-sum">'+(pick ? escapeHtml(pick.title) : 'No task')+' &middot; '+lockLenLabel(s.minutes)+'</span><button class="btn btn-primary" data-action="lockNext">Next &rarr;</button></span>')+
    '</div>'+
  '</div>';
}
function renderLockSeqInto(){ const el = document.getElementById('lockSeqContent'); if(el) morphInto(el, lockSeqHtml(), {form:true}); }
registerModal('lockSeqOverlay', renderLockSeqInto);

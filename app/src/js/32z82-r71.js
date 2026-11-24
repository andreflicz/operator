// ============ ROUND 71: Command View ============
// A board for the spare monitor. It is the opposite of the lock-in screen: that one is for while you're working,
// this one is for while you're not. It answers four things from across the room — where you are in your work day,
// what kind of day it is, what's coming at you, and whether you're keeping to a rhythm — and then shows you what
// you're doing it all for.
//
// It only ever reads. No check-ins, no "did you start?", no notifications, nothing that escalates. Every number
// comes from a system that already exists (work hours, day types, deadlines, sessions, the vision board, quotes).
// If it ever starts asking you things, that's a bug.

const R71_BANDS = [
  {id:'clock', label:'Your work day', def:true},
  {id:'type', label:'What kind of day it is', def:true},
  {id:'rhythm', label:'When you usually start', def:true},
  {id:'numbers', label:'Hours today', def:true},
  {id:'deadlines', label:'What’s due', def:true},
  {id:'standard', label:'Today’s standard', def:false},
  {id:'vision', label:'Vision board', def:true},
  {id:'quote', label:'One line', def:true}
];
function r71Cfg(){
  const s = state.settings;
  if(!s.cmd || typeof s.cmd!=='object') s.cmd = {};
  const c = s.cmd;
  if(!c.bands || typeof c.bands!=='object'){ c.bands = {}; R71_BANDS.forEach(function(b){ c.bands[b.id] = b.def; }); }
  if(typeof c.tone!=='string') c.tone = 'work';      // which quote set: work, action, or both
  if(typeof c.target!=='number') c.target = 0;       // 0 = follow Today's standard
  return c;
}
function r71On(id){ const c = r71Cfg(); return c.bands[id] !== false; }
function r71Mins(hhmm){ const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? Number(m[1])*60 + Number(m[2]) : null; }
function r71Clock(mins){
  const h = Math.floor(mins/60), m = Math.round(mins%60);
  try{ return r57Clock(localTs(todayStr(), (h<10?'0':'')+h+':'+(m<10?'0':'')+m)); }catch(e){}
  return (h<10?'0':'')+h+':'+(m<10?'0':'')+m;
}

// ---- where you are in the day ----
function r71Work(){
  const d = todayStr();
  let w = null; try{ w = workHoursFor(d); }catch(e){}
  const now = new Date(), mins = now.getHours()*60 + now.getMinutes();
  if(!w || w.enabled===false || w.off || !w.start || !w.end) return {none:true, mins:mins};
  const a = r71Mins(w.start), b = r71Mins(w.end);
  if(a==null || b==null) return {none:true, mins:mins};
  const span = Math.max(1, b - a);
  return {
    none:false, start:a, end:b, mins:mins, span:span,
    pct:Math.max(0, Math.min(1, (mins - a)/span)),
    before:mins < a, after:mins > b, open:mins >= a && mins <= b,
    left:Math.max(0, b - mins), until:Math.max(0, a - mins)
  };
}

// ---- what kind of day it is ----
// A shoot day doesn't quietly lower the bar — Andre was clear about that. It says the day is heavier so you know
// where you stand, and the target stays exactly where it was.
function r71Type(){
  const d = todayStr();
  let shoot = false, off = false;
  try{ off = isDayOff(d); }catch(e){}
  try{ const k = r70OffKinds()[d]; if(k==='shoot') shoot = true; }catch(e){}
  try{ if(!shoot) shoot = arr(state.modes && state.modes.history).some(function(m){ return m && (m.type==='shooting' || m.shooting) && String(m.date || '')===d; }); }catch(e){}
  try{ const a = state.modes && state.modes.active; if(a && a.type==='shooting') shoot = true; }catch(e){}
  if(shoot) return {id:'shoot', label:'Shoot day', note:'Same target, heavier day. Anything you get is on top.'};
  if(off) return {id:'off', label:'Day off', note:'Marked off. The streak holds either way.'};
  const dow = new Date().getDay();
  if(dow===0 || dow===6) return {id:'weekend', label:'Weekend', note:'No one’s expecting anything.'};
  return {id:'normal', label:'Normal day', note:'Nothing special about it. That’s the point.'};
}

// ---- the rhythm: are you starting at the same time, or whenever ----
// The honest version of "I want to be habitual about when I work": show the actual spread of start times over the
// last three weeks. Consistency is visible as a straight line of dots; randomness is visible as scatter.
function r71Rhythm(){
  const out = {days:[], usual:null, today:null, drift:null, n:0};
  try{
    const byDay = {};
    arr(state.focus.sessions).forEach(function(s){
      if(!s || !s.startedAt || !s.date) return;
      const t = new Date(s.startedAt), m = t.getHours()*60 + t.getMinutes();
      if(byDay[s.date]==null || m < byDay[s.date]) byDay[s.date] = m;
    });
    const live = state.focus.activeSession;
    if(live && live.startedAt){
      const t = new Date(live.startedAt), m = t.getHours()*60 + t.getMinutes(), d = todayStr(t);
      if(byDay[d]==null || m < byDay[d]) byDay[d] = m;
    }
    const today = todayStr();
    for(let i = 20; i >= 0; i--){
      const d = addDays(today, -i);
      let skip = false; try{ skip = isDayOff(d); }catch(e){}
      out.days.push({date:d, start:byDay[d]==null ? null : byDay[d], off:skip, today:d===today});
    }
    const starts = out.days.filter(function(x){ return x.start!=null && !x.today; }).map(function(x){ return x.start; }).sort(function(a, b){ return a - b; });
    out.n = starts.length;
    if(starts.length >= 3) out.usual = starts[Math.floor(starts.length/2)];
    out.today = byDay[today]==null ? null : byDay[today];
    if(out.usual!=null && out.today!=null) out.drift = out.today - out.usual;
  }catch(e){}
  return out;
}

// ---- the numbers ----
function r71Target(){
  const c = r71Cfg();
  if(c.target > 0) return c.target;
  try{ return Number(state.standards.deepWorkTarget) || 240; }catch(e){ return 240; }
}
function r71Today(){ try{ return deepWorkMinutesFor(todayStr()) || 0; }catch(e){ return 0; } }
function r71Deadlines(n){
  const t = todayStr(), out = [];
  try{
    arr(state.tasks.items).forEach(function(x){
      if(!x || x.status==='done' || !x.deadline) return;
      out.push({title:(typeof taskName==='function' ? taskName(x) : x.title) || 'Untitled', date:x.deadline, days:daysBetween(t, x.deadline)});
    });
  }catch(e){}
  out.sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); });
  return out.slice(0, n || 3);
}
function daysBetween(a, b){
  try{ return Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000); }catch(e){ return 0; }
}
function r71Urgency(days){ return days < 0 ? 'late' : days===0 ? 'today' : days <= 2 ? 'soon' : ''; }

// ---- what's still open today, read-only ----
function r71Standard(){
  const out = [];
  try{
    const done = arr(getStandardRec(todayStr()).doneIds);
    arr(state.standards.items).forEach(function(i){ out.push({label:i.label || i.name, done:done.indexOf(i.id) >= 0}); });
  }catch(e){}
  return out;
}

// ---- the one line ----
function r71Quote(){
  const c = r71Cfg();
  const kind = c.tone==='action' ? 'action' : c.tone==='both' ? (dayNum()%2 ? 'action' : 'work') : 'work';
  try{ const q = quoteFor(kind); return {text:q[0], who:q[1], kind:kind}; }catch(e){ return null; }
}

// ================= the board =================
function r71Html(mode){
  const big = mode!=='panel';
  const W = r71Work(), T = r71Type(), c = r71Cfg();
  let h = '<div class="r71'+(big ? ' is-big' : ' is-panel')+' is-'+T.id+'">';

  // 1. where you are in the day
  if(r71On('clock')){
    if(W.none){
      h += '<div class="r71-clock is-none"><b>No work hours set</b><span>Settings → Focus &amp; Lock in</span></div>';
    } else {
      const head = W.before ? 'Starts '+r71Clock(W.start) : W.after ? 'Done for the day' : r71Clock(W.start)+' – '+r71Clock(W.end);
      const sub = W.before ? 'in '+fmtDurationLabel(W.until) : W.after ? 'Off the clock' : fmtDurationLabel(W.left)+' left';
      h += '<div class="r71-clock'+(W.open ? ' is-open' : '')+'">'+
        '<div class="r71-ct"><b>'+escapeHtml(head)+'</b><span>'+escapeHtml(sub)+'</span></div>'+
        '<div class="r71-bar"><i style="width:'+(W.pct*100).toFixed(1)+'%"></i>'+(W.open ? '<u style="left:'+(W.pct*100).toFixed(1)+'%"></u>' : '')+'</div>'+
      '</div>';
    }
  }

  // 2. what kind of day it is
  if(r71On('type')) h += '<div class="r71-type"><b>'+escapeHtml(T.label)+'</b><span>'+escapeHtml(T.note)+'</span></div>';

  // 3 + 4 side by side: the rhythm, and the hours
  let mid = '';
  if(r71On('rhythm')){
    const R = r71Rhythm();
    let line;
    if(R.usual==null) line = '<b>Still learning your rhythm</b><span>'+R.n+' day'+(R.n===1 ? '' : 's')+' so far. Three starts and it can tell you.</span>';
    else if(R.today==null) line = '<b>You usually start '+escapeHtml(r71Clock(R.usual))+'</b><span>'+(W.none || W.before ? 'Not yet today.' : 'Not yet today — '+fmtDurationLabel(Math.max(0, W.mins - R.usual))+' past it.')+'</span>';
    else if(Math.abs(R.drift) <= 20) line = '<b>Started '+escapeHtml(r71Clock(R.today))+'</b><span>On rhythm. You usually start '+escapeHtml(r71Clock(R.usual))+'.</span>';
    else line = '<b>Started '+escapeHtml(r71Clock(R.today))+'</b><span>'+fmtDurationLabel(Math.abs(R.drift))+' '+(R.drift > 0 ? 'later' : 'earlier')+' than usual ('+escapeHtml(r71Clock(R.usual))+').</span>';
    const lo = 5*60, hi = 23*60;
    mid += '<div class="r71-card r71-rhythm"><div class="r71-h">Your rhythm</div><div class="r71-rl">'+line+'</div>'+
      '<div class="r71-dots">'+R.days.map(function(d){
        if(d.off) return '<i class="is-off" title="'+escapeHtml(d.date)+' · day off"></i>';
        if(d.start==null) return '<i class="is-none" title="'+escapeHtml(d.date)+' · nothing logged"></i>';
        const y = Math.max(0, Math.min(1, (d.start - lo)/(hi - lo)));
        return '<i class="is-on'+(d.today ? ' is-today' : '')+'" style="--y:'+(y*100).toFixed(1)+'%" title="'+escapeHtml(d.date)+' · started '+escapeHtml(r71Clock(d.start))+'"></i>';
      }).join('')+(R.usual!=null ? '<u style="--y:'+(Math.max(0, Math.min(1, (R.usual - lo)/(hi - lo)))*100).toFixed(1)+'%"></u>' : '')+'</div>'+
      '<div class="r71-dl"><span>early</span><span>21 days</span><span>late</span></div></div>';
  }
  if(r71On('numbers')){
    const done = r71Today(), target = r71Target(), pct = Math.max(0, Math.min(1, done/target));
    mid += '<div class="r71-card r71-hours"><div class="r71-h">Today</div>'+
      '<div class="r71-big">'+escapeHtml(fmtDurationLabel(done) || '0m')+'</div>'+
      '<div class="r71-ring" style="--p:'+(pct*360).toFixed(0)+'deg"><span>'+Math.round(pct*100)+'%</span></div>'+
      '<div class="r71-sub">of '+escapeHtml(fmtDurationLabel(target))+(T.id==='shoot' ? ' · same as any day' : '')+'</div></div>';
  }
  if(mid) h += '<div class="r71-mid">'+mid+'</div>';

  // 5. what's due
  if(r71On('deadlines')){
    const D = r71Deadlines(big ? 4 : 2);
    h += '<div class="r71-card r71-dues"><div class="r71-h">What’s due</div>'+
      (D.length ? '<div class="r71-dues-l">'+D.map(function(d){
        const u = r71Urgency(d.days);
        const when = d.days < 0 ? Math.abs(d.days)+'d late' : d.days===0 ? 'today' : d.days===1 ? 'tomorrow' : 'in '+d.days+'d';
        return '<div class="r71-due'+(u ? ' is-'+u : '')+'"><b>'+escapeHtml(d.title)+'</b><span>'+escapeHtml(when)+'</span></div>';
      }).join('')+'</div>' : '<div class="r71-empty">Nothing with a date on it.</div>')+'</div>';
  }

  // 6. today's standard, if you want it up there
  if(r71On('standard')){
    const S = r71Standard();
    if(S.length) h += '<div class="r71-card r71-std"><div class="r71-h">Today’s standard</div><div class="r71-chips">'+
      S.map(function(s){ return '<span class="'+(s.done ? 'is-done' : '')+'">'+(s.done ? '&#10003; ' : '')+escapeHtml(s.label)+'</span>'; }).join('')+'</div></div>';
  }

  // 7. what it's all for
  if(r71On('vision')){
    let vb = '';
    try{ if(typeof masterVisionBoard==='function' && masterVisionBoard() && typeof renderVisionSlideshow==='function') vb = renderVisionSlideshow(); }catch(e){ vb = ''; }
    if(vb) h += '<div class="r71-card r71-vision">'+vb+'</div>';
  }

  // 8. one line
  if(r71On('quote')){
    const q = r71Quote();
    if(q) h += '<div class="r71-quote"><b>'+escapeHtml(q.text)+'</b><span>'+escapeHtml(q.who || '')+'</span></div>';
  }

  return h+'</div>';
}

// ---- full screen, for the spare monitor ----
function r71Open(){
  let v = document.getElementById('r71Full');
  if(!v){
    v = document.createElement('div'); v.id = 'r71Full'; v.className = 'r71-full';
    document.body.appendChild(v);
    requestAnimationFrame(function(){ v.classList.add('is-in'); });
  }
  v.innerHTML = '<button class="r71-x" data-action="r71Close" aria-label="Close">&#10005;</button>'+
    '<button class="r71-gear" data-action="r71Settings" aria-label="What it shows">&#9881;</button>'+
    r71Html('full');
  document.body.classList.add('r71-on');
}
function r71Tick(){ if(document.getElementById('r71Full')) r71Open(); }
ACTIONS.r71Open = function(){ r71Open(); };
ACTIONS.r71Close = function(){
  const v = document.getElementById('r71Full'); if(!v) return;
  v.classList.remove('is-in'); document.body.classList.remove('r71-on');
  setTimeout(function(){ v.remove(); }, 240);
};
ACTIONS.r71Settings = function(){ ACTIONS.r71Close(); ui.view = 'settings'; ui.settingsTab = 'focus'; renderView(); setTimeout(function(){ const el = document.getElementById('r71Set'); if(el) el.scrollIntoView({block:'center', behavior:'smooth'}); }, 120); };
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && document.getElementById('r71Full')) ACTIONS.r71Close(); });
// it has to be right without anyone touching it
setInterval(r71Tick, 30000);

// ---- as a panel on Today ----
if(typeof PANEL_DEFS!=='undefined' && Array.isArray(PANEL_DEFS) && !PANEL_DEFS.some(function(p){ return p.id==='command'; })){
  PANEL_DEFS.push({id:'command', label:'Command View: your day, your rhythm, what’s due'});
}
if(typeof PANEL_RENDERERS!=='undefined') PANEL_RENDERERS.command = function(){
  return '<div><div class="section-title" style="justify-content:center;">Command View<button class="btn btn-ghost btn-sm" data-action="r71Open" style="margin-left:8px;">Full screen</button></div>'+r71Html('panel')+'</div>';
};

// ---- the way in ----
// It belongs where you'd reach for it when you're not working, so: the Today page's header, next to Customize.
pageEditBtnHtml = typeof pageEditBtnHtml==='function' ? (function(base){
  return function(action){
    const h = base.apply(this, arguments);
    if(action!=='toggleTodayEdit') return h;
    return '<button class="r71-cb" data-action="r71Open" title="A board for the other monitor">&#128250; Command View</button>'+h;
  };
})(pageEditBtnHtml) : pageEditBtnHtml;

// ---- settings (Focus & Lock in) ----
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(ui.settingsTab!=='focus' || h.indexOf('r71Set') >= 0) return h;
    const c = r71Cfg();
    const card = '<div class="card section op-settings" id="r71Set"><div class="section-title">&#128250; Command View</div>'+
      '<p class="r71-p">A board for a spare monitor, for when you’re not locked in. It only reads — it never asks you anything.</p>'+
      '<div class="r71-f"><button class="btn btn-sm btn-primary" data-action="r71Open">Open it</button></div>'+
      '<div class="r71-bl">'+R71_BANDS.map(function(b){
        return r51Row(b.label, '<button class="r45-sw'+(c.bands[b.id] !== false ? ' on' : '')+'" data-action="r71Band" data-id="'+b.id+'"><span></span></button>');
      }).join('')+'</div>'+
      '<div class="seg-tabs r71-seg">'+[['work', 'Doing the work'], ['action', 'Starting'], ['both', 'Both']].map(function(o){
        return '<button class="seg-tab'+(c.tone===o[0] ? ' active' : '')+'" data-action="r71Tone" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
    '</div>';
    return h.replace(/(<\/div>\s*)$/, card+'$1');
  };
})(renderSettings);
ACTIONS.r71Band = function(el, e, id){ const c = r71Cfg(); c.bands[id] = c.bands[id] === false; persist('settings'); playTick(); renderView(); r71Tick(); };
ACTIONS.r71Tone = function(el, e, id){ r71Cfg().tone = id; persist('settings'); playTick(); renderView(); r71Tick(); };

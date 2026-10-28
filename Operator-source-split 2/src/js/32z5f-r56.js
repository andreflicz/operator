// ============ ROUND 56 ============
// The Calendar fits the screen it's on: the month's rows share whatever height is left under the header, so the
// week/month numbers under the grid are never pushed off the bottom (on a 1440-high ultrawide or a laptop alike).
// One measure, one change, one check. On a phone, or a window too short for rows of a usable height, it leaves the
// page to scroll as it always did.
const R56_ROW_MIN = 52, R56_ROW_MAX = 210;
function r56CalFit(){
  if(ui.view!=='calendar') return;
  const month = document.querySelector('.calx .cx-month'), grid = month && month.querySelector('.cx-grid'); if(!grid) return;
  const cells = grid.querySelectorAll('.cx-d'); if(!cells.length) return;
  const root = document.documentElement, clear = function(){ root.classList.remove('r56-fit'); root.style.removeProperty('--r56-rh'); };
  if(window.innerWidth < 900){ clear(); return; }
  const rows = Math.ceil(cells.length/7) || 5, main = document.querySelector('main');
  // how much too tall (or too short) the page is, with the rows as they are now
  // (one target: the month ends where the window's own bottom padding starts, so the page never scrolls)
  const pad = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  const off = function(){ return month.getBoundingClientRect().bottom - (window.innerHeight - Math.max(22, pad) - 1); };
  for(let pass = 0; pass < 3; pass++){
    const over = off(); if(Math.abs(over) < 3) return;
    const rh = cells[cells.length - 1].getBoundingClientRect().height, want = Math.floor(rh - over/rows);
    if(want < R56_ROW_MIN){ clear(); return; }
    const next = Math.min(R56_ROW_MAX, want); if(Math.abs(next - rh) < 2) return;
    // (on the page root, not the grid: the calendar redraws every second and would drop it)
    root.style.setProperty('--r56-rh', next+'px'); root.classList.add('r56-fit');
  }
}
afterRenderHooks.push(function(){ try{ r56CalFit(); }catch(e){} });
window.addEventListener('resize', function(){ clearTimeout(r56CalFit._t); r56CalFit._t = setTimeout(function(){ try{ r56CalFit(); }catch(e){} }, 80); });

// ---- Op and the automatic lock-ins: they're the app's doing, not yours, so he says nothing around them ----
// (no check-in in the 45 minutes after an automatic lock-in starts or after one ends, and no "session's over" line
// for a session the app started)
function r56AutoQuiet(){ const f = state.focus || {}, s = f.activeSession; return (s && s.autoStarted) || (f.r56AutoAt && Date.now() - f.r56AutoAt < 45*60000); }
r54May = (function(base){ return function(kind){ if(r54UserTurn && r54UserTurn()) return base.apply(this, arguments); if((kind==='auto' || kind==='sessionEnd') && r56AutoQuiet()) return false; return base.apply(this, arguments); }; })(r54May);
opHoldBack = function(){ return !r54May('auto'); };
checkAutoLockIn = (function(base){ return function(){ const had = !!(state.focus && state.focus.activeSession); const r = base.apply(this, arguments); const s = state.focus && state.focus.activeSession; if(!had && s && s.autoStarted){ state.focus.r56AutoAt = Date.now(); persist('focus'); } return r; }; })(checkAutoLockIn);

// ---- a session stays open until you stop it ----
// Going quiet on the Mac, or off work apps, no longer ends a session (automatic or not): it stays on until you stop
// it. Once you've been away a while, it asks (once), with a Stop button right there.
function r56AwayAsk(){
  const s = state.focus && state.focus.activeSession; if(!s || s.r56Asked) return;
  s.r56Asked = Date.now(); persist('focus');
  showToast('Still locked in. Stop it whenever you’re done.', {icon:'&#128274;', duration:9000, actionLabel:'Stop', actionAction:'r56StopSession'});
}
autoEndFocusSession = function(){ r56AwayAsk(); };
endSessionForAway = function(){ r56AwayAsk(); };
ACTIONS.r56StopSession = function(){ if(!state.focus.activeSession) return; if(ACTIONS.openStopFocus) ACTIONS.openStopFocus(); };
// Op locks you in whenever you ask, work hours or not (a clock-out or day-off mode steps aside)
opRunTool = (function(base){
  return function(name, x){
    if(name==='lock_in' && !state.focus.activeSession){
      const m = state.modes && state.modes.active;
      if(m && (m.clockedOut || m.type==='offtime') && typeof endMode==='function'){ try{ endMode(); }catch(e){} }
      if(state.focus.opHold) state.focus.opHold = null;
      state.focus.lastSessionEndedAt = 0;
    }
    // (he can't rename the tasks the app makes from your clients' plans: their names come from the plan)
    if(name==='update_task' && x && x.title){ const t = typeof opFindTask==='function' ? opFindTask(x.task) : null; if(t && t.master && /^(dvw|pb|money|reachLeads|reach|care|deliv)$/.test(t.master.kind)) x = Object.assign({}, x, {title:undefined}); }
    return base.call(this, name, x);
  };
})(opRunTool);
// ---- music: an automatic lock-in plays nothing unless you say so (so it doesn't take over your AirPods) ----
playLockInSong = (function(base){ return function(){ const s = state.focus && state.focus.activeSession; if(s && s.autoStarted && !soundPref('autoLockMusic', false)) return; return base.apply(this, arguments); }; })(playLockInSong);
focusMusicAfterIntro = (function(base){ return function(){ const s = state.focus && state.focus.activeSession; if(s && s.autoStarted && !soundPref('autoLockMusic', false)) return; return base.apply(this, arguments); }; })(focusMusicAfterIntro);

// ---- client deliverable tasks keep their real names ----
// (some had been renamed into things like "JJS Construction: 2 JJS Construction: 1 8 reel, week 0, week 2":
// every one gets its name back from the plan, and it's kept that way)
function r56FixTitles(){
  let ch = false;
  state.tasks.items.forEach(function(t){
    const m = t.master; if(!m || t.status==='done') return;
    if(m.kind==='dvw'){
      const c = arr(state.business.clients).find(function(x){ return x.id===m.clientId; }), d = c && arr(c.deliverables).find(function(x){ return x.id===m.delivId; }); if(!d) return;
      let want = null;
      if(m.oneOff) want = String(d.title || 'Deliverable').trim();
      else if(m.post){ if(/, week \d|: \d+ .*: /i.test(t.title)) want = String(d.title || 'Deliverable').trim(); }
      else if(m.wk) want = dvwTitle(d, m.wk);
      if(want && t.title!==want){ t.title = want; ch = true; }
    }
  });
  return ch;
}
masterTasksSync = (function(base){ return function(){ const r = base.apply(this, arguments); try{ if(r56FixTitles()) persist('tasks'); }catch(e){} return r; }; })(masterTasksSync);

// ---- leads: their playbook due dates fold into "Reach out to leads" and notifications ----
function r56LeadPbDue(){
  const today = todayStr(), out = [];
  arr(state.business.pipeline).forEach(function(l){
    if(!leadIsOpen(l) || !l.pb || !l.pb.id) return; const s = pbState('lead', l); if(!s) return;
    const due = s.open.filter(function(o){ return o.date <= today; }); if(due.length) out.push({x:l, n:Math.max(0, pbDaysBetween(due[0].date, today)), items:due});
  });
  return out;
}
r53LeadsDue = (function(base){ return function(){ const out = base.apply(this, arguments), have = {}; out.forEach(function(r){ have[r.x.id] = 1; }); r56LeadPbDue().forEach(function(r){ if(!have[r.x.id]) out.push({x:r.x, n:r.n}); }); return out.sort(function(a, b){ return b.n - a.n; }); }; })(r53LeadsDue);
notifList = (function(base){
  return function(){
    const out = base.apply(this, arguments), today = todayStr(), dis = notifDismissed();
    r56LeadPbDue().forEach(function(r){
      r.items.forEach(function(o){
        const key = 'pbl:'+r.x.id+':'+o.key; if(dis[key]===today) return;
        out.push({key:key, kind:'lead', level:o.date < today ? 'danger' : 'warn', icon:(PB_TYPES[o.it.type] || PB_TYPES.task).icon, title:crmName('lead', r.x)+' · '+o.it.title, sub:o.date < today ? 'Late since '+fmtDateShort(o.date) : 'Today', act:{a:'r54OpenLeads'}, sort:o.date < today ? 0 : 1});
      });
    });
    return out;
  };
})(notifList);
// logging a touch with a lead ticks off what was due on their playbook (a call, a message, a link sent)
logTouch = (function(base){
  return function(kind, id){
    const r = base.apply(this, arguments);
    try{ if(kind==='lead'){ const l = crmFind('lead', id); if(l && l.pb && l.pb.id){ const s = pbState('lead', l); if(s){ let n = 0; s.open.forEach(function(o){ if(o.date <= todayStr()){ l.pb.done[o.key] = todayStr(); n++; } }); if(n){ persist('business'); try{ masterTasksSync(); }catch(e){} } } } } }catch(e){}
    return r;
  };
})(logTouch);
// the Leads view in the Log center: a list, or a calendar of the month (who's due a touch, and their playbook)
r54LeadsHtml = (function(base){
  return function(){
    const cal = ui.r56LeadCal===true;
    const sw = '<div class="r56-lv"><button class="'+(cal ? '' : 'is-on')+'" data-action="r56LeadView" data-id="list">List</button><button class="'+(cal ? 'is-on' : '')+'" data-action="r56LeadView" data-id="cal">Calendar</button></div>';
    return sw+(cal ? r56LeadCalHtml() : base.apply(this, arguments));
  };
})(r54LeadsHtml);
ACTIONS.r56LeadView = function(el, e, v){ ui.r56LeadCal = v==='cal'; playTick(); renderView(); };
ACTIONS.r56LeadMonth = function(el, e, d){ ui.r56LeadMo = (ui.r56LeadMo || 0) + Number(d); playTick(); renderView(); };
function r56LeadCalHtml(){
  const today = todayStr(), base = new Date(localTs(today, '12:00')); base.setDate(1); base.setMonth(base.getMonth() + (ui.r56LeadMo || 0));
  const y = base.getFullYear(), mo = base.getMonth(), first = todayStr(new Date(y, mo, 1)), days = new Date(y, mo + 1, 0).getDate(), lead = (new Date(y, mo, 1).getDay() + 6) % 7;
  const by = {};
  const put = function(d, it){ (by[d] = by[d] || []).push(it); };
  arr(state.business.pipeline).filter(leadIsOpen).forEach(function(l){
    const n = crmOverdueDays('lead', l), nm = crmName('lead', l);
    if(n!=null){ const d = n >= 0 ? today : addDays(today, -n); put(d, {l:l, t:'Reach out', c:'#E8A23D', late:n > 0, nm:nm}); }
    if(l.pb && l.pb.id){ const s = pbState('lead', l); if(s) s.occ.forEach(function(o){ if(!o.done) put(o.date, {l:l, t:o.it.title, c:(PB_TYPES[o.it.type] || PB_TYPES.task).color, late:o.date < today, nm:nm}); }); }
  });
  let cells = ''; for(let i = 0; i < lead; i++) cells += '<div class="r56-lc-d is-empty"></div>';
  for(let i = 1; i <= days; i++){
    const d = todayStr(new Date(y, mo, i)), its = by[d] || [];
    cells += '<div class="r56-lc-d'+(d===today ? ' is-today' : '')+(d < today ? ' is-past' : '')+'"><span class="r56-lc-n">'+i+'</span>'+its.slice(0, 4).map(function(x){ return '<button class="r56-lc-i'+(x.late ? ' is-late' : '')+'" style="--lc:'+x.c+'" data-action="openContact" data-kind="lead" data-id="'+x.l.id+'"><b>'+escapeHtml(x.nm)+'</b><span>'+escapeHtml(x.t)+'</span></button>'; }).join('')+(its.length > 4 ? '<small>+'+(its.length - 4)+'</small>' : '')+'</div>';
  }
  return '<div class="r56-lc"><div class="r56-lc-h"><button data-action="r56LeadMonth" data-id="-1">&lsaquo;</button><b>'+new Date(y, mo, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'})+'</b><button data-action="r56LeadMonth" data-id="1">&rsaquo;</button></div>'+
    '<div class="r56-lc-w">'+['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div><div class="r56-lc-g">'+cells+'</div></div>';
}

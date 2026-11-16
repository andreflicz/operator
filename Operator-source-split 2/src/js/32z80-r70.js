// ============ ROUND 70 (part 1): the app updates list ============
// The list is ROUND-70-LIST.md (items 1–18). Tags are in 32z81-r70tags.js.
const R70 = {turn:null, lastInput:Date.now(), notes:[], ask:null};
function r70P(k, d){ const v = state.profile ? state.profile[k] : undefined; return v===undefined || v===null ? d : v; }
function r70Set(k, v){ state.profile[k] = v; persist('profile'); }
['pointerdown', 'keydown', 'wheel'].forEach(function(n){ document.addEventListener(n, function(){ R70.lastInput = Date.now(); }, true); });
// when you last touched the Mac (the activity helper's idle seconds when it's running, else this page)
function r70LastActive(){
  let t = R70.lastInput;
  try{ if(typeof actSamples!=='undefined' && actSamples && actSamples.length && lastRawSampleAt && Date.now() - lastRawSampleAt < 120000) t = Math.max(t, Date.now() - r57IdleSec()*1000); }catch(e){}
  return Math.min(Date.now(), t);
}
// a number box in Settings: data-r70-num="profileKey" (min / max on the input)
document.addEventListener('change', function(e){
  const el = e.target; if(!el || !el.getAttribute) return;
  const k = el.getAttribute('data-r70-num');
  if(k){
    let v = Number(el.value); const mn = Number(el.min), mx = Number(el.max);
    if(!isFinite(v)) return; if(isFinite(mn) && el.min!=='') v = Math.max(mn, v); if(isFinite(mx) && el.max!=='') v = Math.min(mx, v);
    r70Set(k, v); playTick(); renderView();
  }
});
function r70Num(key, val, min, max, unit){ return '<span class="r70-num"><input class="input" type="number" data-r70-num="'+key+'" value="'+val+'" min="'+min+'" max="'+max+'"><i>'+unit+'</i></span>'; }

// ================= 2. Op lives in the bottom left =================
// His tab, what he says he did and anything he asks all sit in one corner: bottom left, above the clock-in pill.
// (A place you dragged his tab to before this round is forgotten once, so the corner is where he starts.)
setTimeout(function(){ try{ if(!state.profile.r70OpCorner){ state.profile.r70OpCorner = true; delete state.profile.r65OpPos; persist('profile'); r65OpPlace(document.getElementById('opBub')); } }catch(e){} }, 0);
function r70CornerLeft(){ const sb = document.querySelector('.sidebar, #sidebar'); const l = sb ? sb.getBoundingClientRect().right : 0; return Math.round(Math.max(0, l) + 10); }
function r70PillTop(){ const p = document.getElementById('activityPill'); if(p && !p.classList.contains('is-hidden')){ const r = p.getBoundingClientRect(); if(r.height && r.top > window.innerHeight/2) return r.top; } return window.innerHeight - 14; }
r65OpPlace = (function(base){
  return function(b){
    if(!b || !b.classList.contains('r64-mini')) return;
    if(state.profile.r65OpPos && state.profile.r65OpPos.x!=null){ base.apply(this, arguments); r70DockPlace(); return; }
    const r = b.getBoundingClientRect(), hh = r.height || 44;
    const x = r70CornerLeft(), y = Math.max(8, r70PillTop() - hh - 10);
    b.style.setProperty('left', x+'px', 'important'); b.style.setProperty('top', y+'px', 'important');
    b.style.setProperty('bottom', 'auto', 'important'); b.style.setProperty('right', 'auto', 'important');
    const dot = document.getElementById('r64Dot'); if(dot){ dot.style.left = (x + 4)+'px'; dot.style.top = (y + 7)+'px'; dot.style.bottom = 'auto'; }
    r70DockPlace();
  };
})(r65OpPlace);
// the corner stack: notes and questions sit above his tab (or above the pill when the tab is tucked away)
function r70Dock(){
  let d = document.getElementById('r70Dock');
  if(!d){ d = document.createElement('div'); d.id = 'r70Dock'; d.className = 'r70-dock'; document.body.appendChild(d); }
  return d;
}
function r70DockPlace(){
  const d = document.getElementById('r70Dock'); if(!d) return;
  const b = document.getElementById('opBub');
  let top = r70PillTop(), left = r70CornerLeft();
  if(b && b.classList.contains('is-in') && b.classList.contains('r64-mini')){ const r = b.getBoundingClientRect(); if(r.height){ top = r.top; if(!(state.profile.r65OpPos && state.profile.r65OpPos.x!=null)) left = r.left; else left = Math.max(8, Math.min(window.innerWidth - 340, r.left)); } }
  d.style.left = left+'px'; d.style.bottom = Math.max(8, window.innerHeight - top + 8)+'px';
}
window.addEventListener('resize', r70DockPlace);
afterRenderHooks.push(function(){ try{ const b = document.getElementById('opBub'); if(b && b.classList.contains('is-in')) r65OpPlace(b); else r70DockPlace(); }catch(e){} });
setInterval(function(){ if(document.getElementById('r70Dock') && document.getElementById('r70Dock').children.length) r70DockPlace(); }, 700);

// ================= 8a. When Op has done something: one small note in his corner =================
// A short line by his tab. Tap it and his chat opens with everything. (It still goes to Notifications → From Op.)
function r70NoteShow(line, o){
  o = o || {};
  const d = r70Dock(), n = document.createElement('button');
  n.className = 'r70-note'+(o.bad ? ' is-bad' : '')+(o.kind==='idea' ? ' is-idea' : ''); n.setAttribute('data-action', o.action || 'r70NoteOpen');
  if(o.feed) n.setAttribute('data-feed', o.feed);
  n.innerHTML = '<i class="r70-note-o"></i><span>'+escapeHtml(line)+'</span>';
  // one at a time: a new one takes the old one's place
  Array.from(d.querySelectorAll('.r70-note')).forEach(function(x){ clearTimeout(x._out); x.remove(); });
  d.insertBefore(n, d.firstChild); r70DockPlace();
  requestAnimationFrame(function(){ n.classList.add('is-in'); });
  const out = function(){ n._out = setTimeout(function(){ n.classList.remove('is-in'); setTimeout(function(){ n.remove(); }, 380); }, o.bad ? 9000 : 5200); };
  out();
  n.addEventListener('mouseenter', function(){ clearTimeout(n._out); });
  n.addEventListener('mouseleave', out);
  return n;
}
function r70NoteLine(text, kind){
  if(kind==='idea') return 'Saved to App updates';
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > 54 ? t.slice(0, 52).replace(/\s+\S*$/, '')+'…' : t;
}
ACTIONS.r70NoteOpen = function(el){ if(el){ clearTimeout(el._out); el.remove(); } if(ACTIONS.r57OpOpen) ACTIONS.r57OpOpen(); };
r57Note = function(text, kind, more){
  text = String(text || '').trim(); if(!text) return;
  more = more || {};
  const it = r58FeedAdd({kind:kind==='idea' ? 'update' : 'did', short:text.slice(0, 160), full:more.full || text, title:more.title || '', entry:more.entry || null});
  const old = document.getElementById('r60Pop'); if(old) old.remove();
  r70NoteShow(r70NoteLine(text, kind), {kind:kind, feed:it.id, bad:!!more.bad});
};

// ================= 1. A session that runs long: Op asks, then clocks you out =================
// After 8 hours (Settings → Focus) he asks if you're still working. No answer in 10 minutes: the session ends at the
// last moment you touched the Mac, so hours you weren't there don't count. "Still working" asks again 2 hours later.
function r70LongHrs(){ const h = Number(r70P('r70LongHrs', 8)); return h >= 1 ? h : 8; }
function r70LongWait(){ const m = Number(r70P('r70LongWait', 10)); return m >= 1 ? m : 10; }
function r70AskShow(o){
  r70AskHide();
  const d = r70Dock(), c = document.createElement('div');
  c.id = 'r70Ask'; c.className = 'r70-ask';
  c.innerHTML = '<div class="r70-ask-t"><i class="r70-note-o"></i><span>'+escapeHtml(o.text)+'</span></div><div class="r70-ask-b">'+
    o.buttons.map(function(b, i){ return '<button class="'+(i===0 ? 'is-main' : '')+'" data-action="'+b[1]+'">'+escapeHtml(b[0])+'</button>'; }).join('')+'</div>';
  d.appendChild(c); R70.ask = o; r70DockPlace();
  requestAnimationFrame(function(){ c.classList.add('is-in'); });
  try{ if(typeof tone==='function') tone([523, 659], 0.18, 0.07); }catch(e){}
}
function r70AskHide(){ const c = document.getElementById('r70Ask'); if(c) c.remove(); R70.ask = null; }
function r70EndSessionAt(at){
  const s = state.focus.activeSession; if(!s) return 0;
  at = Math.max(s.startedAt + 60000, Math.min(Date.now(), at));
  try{ closeStopFocus(); }catch(e){} try{ closeFinalStopConfirm(); }catch(e){}
  // (a break that was running when you left comes off: the session ends where it began)
  if(s.onBreak){ const bs = s.breakStartedAt || (arr(s.breaks)[arr(s.breaks).length - 1] || {}).start; if(bs) at = Math.min(at, bs); if(arr(s.breaks).length) s.breaks.pop(); s.onBreak = false; s.breakEndsAt = null; s.breakOverAt = null; s.breakNudgeAt = null; s.breakStartedAt = null; if(state.modes.active && state.modes.active.type==='break') state.modes.active = null; }
  ui.pausedTaskId = null; ui.pendingCurrentTaskId = null;
  const real = Date.now; Date.now = function(){ return at; };
  try{ endFocusSessionForSwitch(); } finally { Date.now = real; }
  ui.currentTaskId = null;
  const last = state.focus.sessions[state.focus.sessions.length - 1]; if(last){ last.autoStopped = true; last.r70Long = true; }
  if(state.modes.active && state.modes.active.linkedFocus) state.modes.active = null;
  try{ stopLockInSong(); }catch(e){}
  persist('focus'); persist('modes');
  return last ? last.minutes : 0;
}
function r70LongTick(){
  try{
    const s = state.focus.activeSession; if(!s){ if(R70.ask && R70.ask.kind==='long') r70AskHide(); return; }
    s.r58Long = true;   // (Round 58's one-time 10-hour note is replaced by this)
    const now = Date.now();
    if(s.r70Asked){
      if(!document.getElementById('r70Ask')) r70AskShow({kind:'long', text:'Still working? '+fmtDurationLabel(Math.round((now - s.startedAt)/60000))+' locked in.', buttons:[['Still working', 'r70LongYes'], ['Clock me out', 'r70LongNo']]});
      if(now - s.r70Asked >= r70LongWait()*60000){
        const at = Math.min(r70LastActive(), s.r70Asked), mins = r70EndSessionAt(at);
        r70AskHide();
        showToast('No answer, so you’re clocked out at '+fmtTimeShort(at)+' ('+fmtDurationLabel(mins)+' logged).', {icon:'&#9209;', duration:12000});
        try{ renderView(); }catch(e){}
      }
      return;
    }
    if(s.onBreak) return;
    const due = s.r70LongNext || (s.startedAt + r70LongHrs()*3600000);
    if(now >= due){ s.r70Asked = now; persist('focus'); r70LongTick(); }
  }catch(e){}
}
ACTIONS.r70LongYes = function(){ const s = state.focus.activeSession; if(s){ s.r70Asked = null; s.r70LongNext = Date.now() + 2*3600000; persist('focus'); } r70AskHide(); playTick(); };
ACTIONS.r70LongNo = function(){ const s = state.focus.activeSession; r70AskHide(); if(!s) return; const m = r69LockOutNow(); try{ renderView(); }catch(e){} showToast('Clocked out. '+fmtDurationLabel(m)+' this session.', {icon:'&#9209;'}); };
setInterval(r70LongTick, 30000); setTimeout(r70LongTick, 5000);
document.addEventListener('visibilitychange', function(){ if(!document.hidden) r70LongTick(); });
// Settings → Focus & Lock in: how long before he asks, how long he waits, and when a break becomes clocking out
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('id="setAppTrackingAway"') < 0 || h.indexOf('r70-long') >= 0) return h;
    const rows = '<div class="r70-long">'+
      r51Row('Ask if I’m still working after', r70Num('r70LongHrs', r70LongHrs(), 1, 24, 'hours'))+
      r51Row('No answer: clock me out after', r70Num('r70LongWait', r70LongWait(), 1, 120, 'min'))+
      r51Row('A break becomes clocking out after', r70Num('longBreakMins', r69LongBreakMins(), 30, 720, 'min'))+'</div>';
    return h.replace(/(<div class="r51-row r57-away">|<div class="field"><label>Stop any session after \(minutes away\))/, function(m0){ return rows+m0; });
  };
})(renderSettings);

// ================= 3. Good morning is yours to start =================
// "I'm up" on the alarm no longer starts the sequence: the alarm lifts away into the app, quietly, and your wake time
// is kept. Good morning has its own button there, and until noon a small bar at the top of Today and Focus offers it
// (Start, or ✕ to leave it). Once it has played, or after noon, the bar is gone for the day.
function r70Gm(){ const f = state.focus; if(!f.r70Gm || f.r70Gm.date!==todayStr()) f.r70Gm = {date:todayStr()}; return f.r70Gm; }
function r70MarkUp(at){ const g = r70Gm(); if(!g.up){ g.up = at || Date.now(); persist('focus'); } return g.up; }
function r70QuietUp(){
  try{ clearInterval(wakeBeepTimer); wakeBeepTimer = null; }catch(e){}
  try{ stopWakeMedia(false); }catch(e){}
  const wasTest = !!(wakeRing && wakeRing.test);
  wakeRing = null; ui.snzPlaying = false;
  if(state.focus.snooze && state.focus.snooze.wake) state.focus.snooze = null;
  if(!wasTest){
    try{ wakeStandDown(); }catch(e){}
    if(state.modes.active && state.modes.active.sleep) finishActiveMode(true);
    try{ if(typeof applyNightPlanAuto==='function') applyNightPlanAuto(); }catch(e){}
    r70MarkUp();
  }
  persist('focus');
  ui.view = 'today'; try{ renderView(); }catch(e){}
  const done = function(){ ui.wakeMode = null; hideOverlay('wakeOverlay'); try{ renderView(); }catch(e){} };
  if(overlayOpen('wakeOverlay')) wakeLiftAway(done); else done();
}
ACTIONS.r70QuietUp = function(){ r70QuietUp(); };
wakeRingHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace('<button class="wk2-up" data-action="wakeStartDay"><span>&#9728;&#65039; I’m up</span></button>',
      '<button class="wk2-up" data-action="r70QuietUp"><span>I’m up</span></button><button class="wk2-snooze r70-gm-go" data-action="wakeStartDay">&#9728;&#65039; Good morning</button>');
  };
})(wakeRingHtml);
snoozeHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace('<button class="dawn-btn" data-action="snoozeUp">&#9728;&#65039; I’m up</button>',
      '<button class="dawn-btn" data-action="r70QuietUp">I’m up</button><button class="snz-music" data-action="snoozeUp">&#9728;&#65039; Good morning</button>');
  };
})(snoozeHtml);
// the sequence ran (from the alarm, the sleep screen or the bar): no bar today, and you're up
wakeImUpNow = (function(base){
  return function(){
    const test = !!(wakeRing && wakeRing.test);
    const r = base.apply(this, arguments);
    if(!test){ const g = r70Gm(); g.played = Date.now(); r70MarkUp(); persist('focus'); r70GmBar(); }
    return r;
  };
})(wakeImUpNow);
if(ACTIONS.sleepUp) ACTIONS.sleepUp = (function(base){ return function(){ r70MarkUp(); return base.apply(this, arguments); }; })(ACTIONS.sleepUp);
function r70GmWanted(){
  if(r70P('r70GmOffer', true)===false) return false;
  const h = new Date().getHours(); if(h < 4 || h >= 12) return false;
  if(ui.view!=='today' && ui.view!=='focus') return false;
  const g = r70Gm(); if(g.played || g.closed) return false;
  if(state.focus.activeSession || (state.modes.active && state.modes.active.sleep)) return false;
  if(document.querySelector('.overlay:not(.hidden)') || document.body.classList.contains('opf-on')) return false;
  return true;
}
function r70GmBar(){
  let b = document.getElementById('r70GmBar');
  if(!r70GmWanted()){ if(b) b.remove(); return; }
  if(b) return;
  b = document.createElement('div'); b.id = 'r70GmBar'; b.className = 'r70-gm';
  b.innerHTML = '<span class="r70-gm-i">&#9728;&#65039;</span><b>Good morning</b><button class="r70-gm-s" data-action="r70GmStart">Start</button><button class="r70-gm-x" data-action="r70GmClose" aria-label="Not today">&#10005;</button>';
  document.body.appendChild(b);
  requestAnimationFrame(function(){ b.classList.add('is-in'); });
}
ACTIONS.r70GmStart = function(){ const b = document.getElementById('r70GmBar'); if(b) b.remove(); if(typeof opUnlock==='function') opUnlock(); ACTIONS.sleepGoodMorning(); };
ACTIONS.r70GmClose = function(){ const g = r70Gm(); g.closed = Date.now(); r70MarkUp(); persist('focus'); const b = document.getElementById('r70GmBar'); if(b){ b.classList.remove('is-in'); setTimeout(function(){ b.remove(); }, 260); } };
afterRenderHooks.push(function(){ try{ r70GmBar(); }catch(e){} });
setInterval(function(){ try{ r70GmBar(); }catch(e){} }, 20000);
// Settings → Good morning: the offer can be switched off
r48MorningHtml = typeof r48MorningHtml==='function' ? (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.replace(/<\/div>\s*$/, function(m0){ return '<div class="card section op-settings r70-gmset"><div class="section-title">&#9728;&#65039; When you’re up</div>'+r51Row('Offer Good morning until noon', r51Sw(r70P('r70GmOffer', true)!==false, 'r70GmOffer'))+'</div>'+m0; });
  };
})(r48MorningHtml) : undefined;
ACTIONS.r70GmOffer = function(){ r70Set('r70GmOffer', r70P('r70GmOffer', true)===false); playTick(); renderView(); };

// ================= 16. Sealed messages: "Keep bringing it back" is one small button =================
// The "Keep bringing it back" row and its switch are gone. In their place, one small Repeat button sitting with
// the rest of the choices, on when it's on.
r57ThreadHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r57-bk-') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const row = tpl.content.querySelector('.r57-bk-r'); if(row) row.remove();
    const D = ui.r57ThreadDraft || {}, opts = tpl.content.querySelector('.r57-bk-o');
    if(opts && D.mode && D.mode!=='date'){
      opts.insertAdjacentHTML('beforeend', '<button class="r70-rep'+(D.repeat ? ' is-on' : '')+'" data-action="r57BackRepeat" title="Keep bringing it back, not just the once">&#8635; Repeat</button>');
    }
    return tpl.innerHTML;
  };
})(r57ThreadHtml);

// ================= 17. The menu bar: lock out, break and music, right away =================
// From the Mac's menu bar: Lock out ends the session there and then (no window, no holding a button), Take a break /
// End break, and Stop music, which stops whatever is playing (focus tracks, the lock-in song, the wake-up song).
function r70MusicOn(){ try{ return !!(fmOn() || wakeSongOn() || (typeof lockSongPlaying!=='undefined' && lockSongPlaying) || (typeof R60!=='undefined' && R60.music)); }catch(e){ return false; } }
function r70StopMusic(){
  try{ if(FM.playing) focusMusicStop(); clearTimeout(FM.introT); }catch(e){}
  try{ stopWakeMedia(true); ui.snzPlaying = false; }catch(e){}
  try{ if(typeof lockSongPlaying!=='undefined' && lockSongPlaying){ musicApp('pause'); lockSongPlaying = false; } }catch(e){}
  try{ r60MusicStop(); }catch(e){}
  try{ dockRefresh(); }catch(e){}
  return true;
}
function r70OnBreak(){ const as = state.focus.activeSession, m = state.modes && state.modes.active; return !!((as && as.onBreak) || (m && m.type==='break')); }
function r70BreakToggle(min){
  const as = state.focus.activeSession, m = state.modes && state.modes.active;
  if(as && as.onBreak) endBreakModeFromFocus();
  else if(m && m.type==='break') endMode();
  else { try{ opRunTool('take_break', {minutes:Math.max(1, Math.round(Number(min) || Number(r70P('r70BreakMins', 15)) || 15))}); }catch(e){} }
  try{ renderView(); }catch(e){}
  return r70OnBreak();
}
function r70LockOutNow(){ if(!state.focus.activeSession) return 0; const m = r69LockOutNow(); r70StopMusic(); try{ renderView(); }catch(e){} return m; }
function r70BreakFromBar(){ const on = r70BreakToggle(); if(on) r70StopMusic(); return on; }
function r70TrayState(){ return {onBreak:r70OnBreak(), music:r70MusicOn()}; }
(function(){
  if(!window.operatorPage) return;
  const P = window.operatorPage;
  try{
    window.operatorPage = Object.freeze(Object.assign({}, P, {
      lockOutNow:r70LockOutNow, breakToggle:r70BreakFromBar, musicStop:r70StopMusic, trayState:r70TrayState
    }));
  }catch(e){}
})();

// ================= 15. View All Sessions opens the list =================
// The button on Analytics only re-opened Analytics (so nothing happened). It opens the sessions page now; each row
// shows its breaks, and a tap edits or removes it (the same editor as before).
viewAllSessions = function(){ ui.view = 'focus'; ui.focusTab = 'analytics'; ui.focusMainTab = 'analytics'; ui.analyticsDay = null; ACTIONS.openSessionsPage(); };
sessionRowHtml = (function(base){
  return function(x){
    let h = base.apply(this, arguments);
    const s = x.kind==='session' ? state.focus.sessions.find(function(q){ return q.id===x.id; }) : null;
    const bm = s ? arr(s.breaks).reduce(function(a, b){ return a + (Number(b.minutes) || (b.end && b.start ? Math.round((b.end - b.start)/60000) : 0)); }, 0) : 0;
    const extra = (x.breaks ? '<em class="r70-sx-b">'+x.breaks+' break'+(x.breaks===1 ? '' : 's')+(bm ? ' · '+fmtDurationLabel(bm) : '')+'</em>' : '')+(s && s.r70Long ? '<em class="r70-sx-b">clocked out for you</em>' : '');
    return h.replace(/<span class="sx-len">([\s\S]*?)<\/span>/, function(m0, len){ return '<span class="sx-len r70-sx-len">'+extra+'<b>'+len+'</b><i class="r70-sx-e" aria-hidden="true">&#9998;</i></span>'; });
  };
})(sessionRowHtml);

// ================= 5. Expenses: Personal, Business or a client =================
// Every expense has a type on top of its category. Pick it when you add one, or change it later on its row in
// Transactions. Transactions can be filtered by type, and the Expenses card shows this month's total for each.
const R70_TYPS = [{id:'personal', label:'Personal', c:'#7AA2FF'}, {id:'business', label:'Business', c:'#E8A23D'}, {id:'client', label:'Client', c:'#C58FFF'}];
const R70_BIZ_RE = /adobe|canva|notion|zoom|slack|openai|anthropic|chatgpt|claude\b|highlevel|meta ads|facebk|facebook ads|google ads|google workspace|b&h|capcut|frame\.io|epidemic|artlist|envato|dropbox|squarespace|wix\b|godaddy|namecheap|calendly|quickbooks|stripe|zernio|elevenlabs|figma|loom\b|riverside|descript|motion array|storyblocks|linkedin|upwork|fiverr/i;
function r70Typ(e){ return e.typ==='business' || e.typ==='client' || e.typ==='personal' ? e.typ : (R70_BIZ_RE.test(String(e.name || '')) ? 'business' : 'personal'); }
function r70TypInfo(id){ return R70_TYPS.find(function(t){ return t.id===id; }) || R70_TYPS[0]; }
function r70TypTotals(mk){
  mk = mk || thisMonthKey(); const out = {personal:0, business:0, client:0};
  finExpenses().forEach(function(e){ if(monthKeyOf(e.date)!==mk || e.cat==='move') return; out[r70Typ(e)] += Number(e.amount) || 0; });
  return out;
}
function r70Money(n){ return '$'+Math.round(n).toLocaleString(); }
r44Transactions = (function(base){
  return function(){
    let list = base.apply(this, arguments);
    if(!R70.inTx) return list;
    const f = ui.r70Typ || 'all', byId = {}; finExpenses().forEach(function(e){ byId[e.id] = e; });
    if(f!=='all') list = list.filter(function(t){ return t.kind==='exp' && byId[t.id] && r70Typ(byId[t.id])===f; });
    // (each row carries its id through the older drawing code, invisibly, so the type control can find its expense)
    return list.map(function(t){ return Object.assign({}, t, {name:String(t.name || '')+'⁣'+t.kind+':'+t.id+'⁣'}); });
  };
})(r44Transactions);
r44TxHtml = (function(base){
  return function(){
    let h; R70.inTx = true; try{ h = base.apply(this, arguments); } finally { R70.inTx = false; }
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const byId = {}; finExpenses().forEach(function(e){ byId[e.id] = e; });
    const clients = arr(state.business.clients).filter(function(c){ return c.status!=='paused'; });
    tpl.content.querySelectorAll('.r44-tx').forEach(function(r){
      const b = r.querySelector('.r44-txn b'); if(!b) return;
      const m = /⁣(\w+):([^⁣]+)⁣/.exec(b.textContent); if(!m) return;
      b.textContent = b.textContent.replace(m[0], '');
      const e = m[1]==='exp' ? byId[m[2]] : null; if(!e) return;
      const t = r70Typ(e), val = t==='client' && e.typClient ? 'client:'+e.typClient : t;
      const opts = '<option value="personal"'+(val==='personal' ? ' selected' : '')+'>Personal</option><option value="business"'+(val==='business' ? ' selected' : '')+'>Business</option>'+
        (clients.length ? clients.map(function(c){ const v = 'client:'+c.id; return '<option value="'+escapeHtml(v)+'"'+(val===v ? ' selected' : '')+'>'+escapeHtml(c.business || c.name)+'</option>'; }).join('') : '<option value="client"'+(val==='client' ? ' selected' : '')+'>Client</option>')+
        (t==='client' && !clients.some(function(c){ return 'client:'+c.id===val; }) && clients.length ? '<option value="client" selected>Client</option>' : '');
      const cat = r.querySelector('.r44-cat');
      const sel = '<select class="r70-typ" style="--c:'+r70TypInfo(t).c+'" data-r70-typ="'+escapeHtml(e.id)+'" aria-label="Type">'+opts+'</select>';
      if(cat) cat.insertAdjacentHTML('afterend', sel); else r.insertAdjacentHTML('beforeend', sel);
      r.classList.add('r70-tx');
    });
    const tot = r70TypTotals(), f = ui.r70Typ || 'all';
    const chips = '<div class="r44-chips r70-typs">'+[{id:'all', label:'All types'}].concat(R70_TYPS).map(function(t){ return '<button class="'+(f===t.id ? 'is-on' : '')+'" style="--c:'+(t.c || '#E8A23D')+'" data-action="r70TypFilter" data-id="'+t.id+'">'+(t.id==='all' ? '' : '<i></i>')+t.label+(t.id!=='all' && tot[t.id] ? ' <em>'+r70Money(tot[t.id])+'</em>' : '')+'</button>'; }).join('')+'</div>';
    const first = tpl.content.querySelector('.r44-chips');
    if(first) first.insertAdjacentHTML('afterend', chips); else tpl.innerHTML = chips+tpl.innerHTML;
    return tpl.innerHTML;
  };
})(r44TxHtml);
ACTIONS.r70TypFilter = function(el, e, id){ ui.r70Typ = id; ui.r44TxN = 25; ui.finTab = 'transactions'; playTick(); renderView(); };
document.addEventListener('change', function(e){
  const el = e.target, id = el && el.getAttribute && el.getAttribute('data-r70-typ'); if(!id) return;
  const x = finExpenses().find(function(z){ return z.id===id; }); if(!x) return;
  const v = String(el.value);
  if(v.indexOf('client')===0){ x.typ = 'client'; x.typClient = v.split(':')[1] || null; } else { x.typ = v; delete x.typClient; }
  persist('finances'); playTick(); renderView();
});
// the Expenses card: this month by type (tap one to see just those)
r44SpentHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments); if(!h) return h;
    const tot = r70TypTotals(); if(!(tot.personal + tot.business + tot.client)) return h;
    const row = '<div class="r70-kinds">'+R70_TYPS.map(function(t){ return '<button data-action="r70TypFilter" data-id="'+t.id+'" style="--c:'+t.c+'"><i></i><span>'+t.label+'</span><b>'+r70Money(tot[t.id])+'</b></button>'; }).join('')+'</div>';
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const top = tpl.content.querySelector('.ex-top'); if(!top) return h;
    top.insertAdjacentHTML('afterend', row);
    return tpl.innerHTML;
  };
})(r44SpentHtml);
// adding one: the type sits under the categories
finSheetHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if((ui.finSheet || 'expense')!=='expense') return h;
    const cur = ui.r70SheetTyp || '';
    const row = '<div class="as-chips r70-styp">'+R70_TYPS.map(function(t){ return '<button class="as-chip'+(cur===t.id ? ' is-on' : '')+'" data-action="r70SheetTyp" data-id="'+t.id+'">'+t.label+'</button>'; }).join('')+'</div>';
    return h.replace('<input type="hidden" id="expCat"', function(){ return row+'<input type="hidden" id="expCat"'; });
  };
})(finSheetHtml);
openFinSheet = (function(base){ return function(){ ui.r70SheetTyp = ''; return base.apply(this, arguments); }; })(openFinSheet);
ACTIONS.r70SheetTyp = function(el, e, id){ ui.r70SheetTyp = ui.r70SheetTyp===id ? '' : id; document.querySelectorAll('#finSheet .r70-styp .as-chip').forEach(function(b){ b.classList.toggle('is-on', b.dataset.id===ui.r70SheetTyp); }); };
ACTIONS.expAdd = (function(base){
  return function(){
    const n = finExpenses().length, typ = ui.r70SheetTyp;
    const r = base.apply(this, arguments);
    const L = finExpenses(); if(L.length > n && typ){ L[L.length - 1].typ = typ; persist('finances'); }
    return r;
  };
})(ACTIONS.expAdd);

// ================= 8b. Done means saved =================
// (1) A touch Op logs goes through the same door as one you log yourself, so a follow-up that was due is cleared and
//     the overdue count resets. Before, his touch was written down but an old follow-up date kept saying "5d overdue".
// (2) If a tool fails, it is tried once more; if it still fails Op is told, and a red note says it didn't save.
// (3) If Op says something is done and no tool ran in that reply, the app sends it back to him once: do it, or say
//     plainly it isn't done. So "logged" is only ever said after it is.
function r70TouchLog(x){
  const hit = opFindContact(x && x.who); if(!hit) throw new Error('no client or lead matches "'+(x && x.who)+'"');
  if(x.date && !isYmd(x.date)) throw new Error('date must be YYYY-MM-DD');
  const date = x.date || todayStr(), before = arr(hit.x.touchpoints).length;
  const quiet = showToast; showToast = function(){};
  try{ logTouch(hit.kind, hit.x.id, x.type || 'other', date); } finally { showToast = quiet; }
  if(arr(hit.x.touchpoints).length <= before) throw new Error('the touch did not save');
  const n = crmOverdueDays(hit.kind, hit.x), due = crmNextDue(hit.kind, hit.x), name = crmName(hit.kind, hit.x);
  return 'logged a '+(x.type || 'touch')+' with '+name+(n!=null && n > 0 ? '. Still '+n+'d overdue: a follow-up is set for '+fmtDateShort(due)+', after this touch’s date' : n!=null ? '. Not overdue any more; next touch due '+fmtDateShort(due) : '');
}
opRunTool = (function(base){
  return function(name, x){
    const T = R70.turn; if(T) T.tools.push(name);
    if(name==='log_touch'){ const out = r70TouchLog(x || {}); try{ r57Did(r57DidLine(name, x, out.split('. ')[0])); }catch(e){} return out; }
    try{ return base.apply(this, arguments); }
    catch(err){
      // (a wrong or missing detail is his to hear about, not something to try twice)
      if(/^(missing|unknown|no |date must|he isn|already|time must|pick )/i.test(String(err && err.message || err))) throw err;
      // once more, then say so
      let out;
      try{ out = base.apply(this, arguments); }
      catch(err2){
        const why = String(err2 && err2.message || err2);
        if(!/^(missing|unknown|no |date must|he isn|already)/i.test(why)) try{ r70NoteShow('Didn’t save: '+r70NoteLine(why), {bad:true}); r58FeedAdd({kind:'did', short:'Didn’t save: '+why.slice(0, 140), full:'Op tried '+name+' twice and it didn’t save: '+why}); }catch(e){}
        throw err2;
      }
      return out;
    }
  };
})(opRunTool);
const R70_CLAIM = /(?:^|[.!?]\s+|,\s+)(?:done|logged|added|saved|marked|noted|filed|scheduled|created|moved|updated|removed|deleted|started|got it[,.]?\s+(?:logged|added|saved)|all set|i(?:'|’)?ve\s+(?:just\s+)?(?:logged|added|saved|marked|set|scheduled|created|moved|updated|put|started|filed|removed|deleted|noted|changed)|i\s+(?:just\s+)?(?:logged|added|saved|marked|set|scheduled|created|moved|updated|put|started|filed|removed|deleted|noted|changed)|(?:it|that)(?:'|’)?s\s+(?:now\s+)?(?:logged|added|saved|done|in your|on your|set|scheduled))\b/i;
const R70_NEG = /\b(?:haven(?:'|’)?t|have not|not yet|didn(?:'|’)?t|did not|won(?:'|’)?t|can(?:'|’)?t|couldn(?:'|’)?t|wasn(?:'|’)?t|isn(?:'|’)?t|should i|want me to|shall i|do you want|would you like)\b/i;
function r70Claims(text){ const t = String(text || ''); return R70_CLAIM.test(t) && !R70_NEG.test(t); }
function r70Guard(base){
  return async function(req){
    const res = await base.apply(this, arguments);
    try{
      const T = R70.turn, conv = req && Array.isArray(req.tools) && req.tools.length > 5 && Array.isArray(req.messages);
      if(!T || !conv || T.nudged || T.tools.length || !res || !res.ok || !res.j || res.j.stop_reason==='tool_use') return res;
      const text = arr(res.j.content).filter(function(c){ return c.type==='text'; }).map(function(c){ return c.text; }).join(' ');
      if(!r70Claims(text)) return res;
      T.nudged = true;
      req.messages.push({role:'assistant', content:res.j.content}, {role:'user', content:'(From the app, not from him: you said that was done, but no tool ran in this reply, so nothing was saved. If he asked you to do or log something, do it now with the right tool and then confirm in one short line. If it really was only talk, or you can’t do it, say plainly that it isn’t done.)'});
      const again = await base.call(this, req);
      return again && again.ok ? again : res;
    }catch(e){ return res; }
  };
}
aiCall = r70Guard(aiCall);
aiAsk = (function(base){
  return function(text){
    if(String(text || '').trim() && !AI.busy) R70.turn = {tools:[], nudged:false, at:Date.now()};
    return base.apply(this, arguments);
  };
})(aiAsk);
aiSystem = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    const add = '\n\nDONE MEANS SAVED: only say something is logged, added, saved or done after the tool for it returned without an error in this same reply. If a tool gave an error, say plainly that it didn’t save and why. Never act on your own: do exactly what he asks, when he asks, without asking first.';
    try{ if(Array.isArray(out)) out.push({type:'text', text:add.trim()}); else return String(out || '')+add; }catch(e){}
    return out;
  };
})(aiSystem);

// ================= 18. Client backlog: last month's work can still be done =================
// On an earlier month, each deliverable has "Add to my tasks": the weeks you were short on come back as open tasks
// (new ones if they were never made). They say how many days late they are, the pieces you finish fill that month,
// and the task counts as done on the day you actually did it.
function r70LateDays(t){ const m = t && t.master; if(!m || !m.r70Late || t.status==='done') return 0; return Math.max(0, daysAgoFrom(t.deadline || m.cycleEnd)); }
function r70LateOpen(cid, did, cycleStart){
  const hit = delivFind(cid, did); if(!hit) return 0;
  const cy = dvwCycle(hit.c, cycleStart); if(!cy || cy.end >= todayStr()) return 0;
  const a = r51Alloc(hit.c, hit.d, cy), made = mtStore(), today = todayStr(); let n = 0;
  a.weeks.forEach(function(w, i){
    const k = i + 1; if(!(a.needs[i] > 0) || a.fill[i] >= a.needs[i]) return;
    let t = state.tasks.items.find(function(q){ const m = q.master; return m && m.kind==='dvw' && !m.oneOff && m.clientId===cid && m.delivId===did && m.cycle===cy.start && m.wk===k; });
    if(t && t.status!=='done') { if(!t.master.r70Late){ t.master.r70Late = true; t.master.retired = true; n++; } return; }
    if(t){ t.status = 'backlog'; t.completedAt = null; t.missed = false; t.master.retired = true; t.master.r70Late = true; t.master.logged = 0; }
    else {
      t = {id:uid(), title:dvwTitle(hit.d, k), client:cid, clients:[cid], priority:'med', deadline:w.end, notes:'', status:'backlog', createdAt:today, completedAt:null,
        master:{kind:'dvw', cycle:cy.start, cycleEnd:cy.end, wk:k, start:w.start, clientId:cid, delivId:did, retired:true, r70Late:true}};
      state.tasks.items.push(t); made[cy.start+':dvw:'+cid+':'+did+':'+k] = 1;
    }
    n++;
  });
  if(n){ persist('tasks'); persist('focus'); }
  return n;
}
ACTIONS.r70LateOpen = function(el, e, id){
  const p = String(id).split('|'), n = r70LateOpen(p[0], p[1], p[2]);
  playTick(); renderView();
  showToast(n ? n+' task'+(n===1 ? '' : 's')+' added. Finish them when you can.' : 'Nothing left to add for that month.', {icon:'&#128230;'});
};
// a late week is done the moment its count is in (the day you did it), and never gets closed as missed again
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      if(typeof mt38Busy!=='undefined' && mt38Busy) return r;
      const today = todayStr(); let ch = false;
      state.tasks.items.forEach(function(t){
        const m = t.master; if(!m || m.kind!=='dvw' || !m.r70Late || m.oneOff) return;
        const x = dvwFind(t); if(!x) return;
        if(t.status!=='done' && x.need > 0 && x.done >= x.need){ m.prev = t.status; t.status = 'done'; t.completedAt = today; t.missed = false; m.r70DoneLate = daysAgoFrom(t.deadline || m.cycleEnd); ch = true; }
        else if(t.status==='done' && x.done < x.need && !t.missed){ t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; ch = true; }
      });
      if(ch){ persist('tasks'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
    }catch(e){}
    return r;
  };
})(masterTasksSync);
r51WeekRow = (function(base){
  return function(t, x){
    let h = base.apply(this, arguments);
    const late = r70LateDays(t);
    if(late > 0) h = h.replace(/<span class="r51-sub">[\s\S]*?<\/span>/, function(){ return '<span class="r51-sub r70-late">'+late+' day'+(late===1 ? '' : 's')+' late · '+Math.max(0, x.need - x.done)+' to go</span>'; }).replace('is-missed', 'is-now r70-islate');
    return h;
  };
})(r51WeekRow);
clientBacklogHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), off = Number(ui.r68CblOff) || 0;
    if(off >= 0) return h;
    const at = (function(){ const d = new Date(todayStr()+'T12:00:00'); d.setDate(15); d.setMonth(d.getMonth() + off); return todayStr(d); })();
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.cbl-client').forEach(function(card){
      const c = arr(state.business.clients).find(function(q){ return q.id===card.getAttribute('data-cid'); }); if(!c) return;
      const cy = dvwCycle(c, at); if(!cy || cy.end >= todayStr()) return;
      const ds = arr(c.deliverables).filter(function(d){ return d.recurring; }), pick = ds.find(function(d){ return d.id===(ui.r51Dlv || {})[c.id]; }) || ds[0]; if(!pick) return;
      const a = r51Alloc(c, pick, cy);
      const short = a.needs.some(function(n, i){ if(!(n > 0) || a.fill[i] >= n) return false; const t = state.tasks.items.find(function(q){ const m = q.master; return m && m.kind==='dvw' && m.clientId===c.id && m.delivId===pick.id && m.cycle===cy.start && m.wk===i + 1; }); return !t || t.status==='done' || !t.master.r70Late; });
      const head = card.querySelector('.cbl-d .cbl-dh'); if(!head || !short) return;
      head.insertAdjacentHTML('beforeend', '<button class="cbl-today r70-lateadd" data-action="r70LateOpen" data-id="'+escapeHtml(c.id+'|'+pick.id+'|'+cy.start)+'">+ Add to my tasks</button>');
    });
    return tpl.innerHTML;
  };
})(clientBacklogHtml);

// ================= 4. The journal bubble: a voice memo =================
// A mic on the quick journal (the orb, bottom right) and on the Mac's floating bubble. Tap it, talk, tap again: the
// recording is saved to Journal → Memos. Anything you typed goes with it; typing is optional.
function r70MemoSave(blob, dur, name, note){
  const id = uid(), d = new Date(), m = {id:id, name:String(name || '').trim().slice(0, 80) || 'Voice memo, '+d.toLocaleDateString(undefined, {month:'short', day:'numeric'})+', '+fmtTimeShort(d.getTime()), src:'rec|'+d.getTime(), date:todayStr(d), dur:Math.round(dur || 0), words:0, title:'', summary:'', points:[], at:Date.now(), saved:true, audio:true, mime:blob.type || 'audio/webm', fname:''};
  m.title = m.name; note = String(note || '').trim(); if(note) m.note = note.slice(0, 20000);
  r67Memos().push(m); persist('journal');
  return r68MemoAudioPut(id, blob).then(function(){ try{ renderView(); }catch(e){} return m; });
}
ACTIONS.r70QjMic = async function(){
  if(R70.rec){ try{ R70.rec.mr.stop(); }catch(e){} return; }
  let stream = null;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:true}); }catch(e){ showToast('The mic isn’t available.', {icon:'&#127908;'}); return; }
  const mr = new MediaRecorder(stream), parts = [], at = Date.now();
  R70.rec = {mr:mr, at:at, keep:true};
  mr.ondataavailable = function(ev){ if(ev.data && ev.data.size) parts.push(ev.data); };
  mr.onstop = function(){
    stream.getTracks().forEach(function(t){ t.stop(); });
    const keep = R70.rec && R70.rec.keep; clearInterval(R70.recT); R70.rec = null;
    const blob = new Blob(parts, {type:mr.mimeType || 'audio/webm'});
    if(!keep || blob.size < 2000){ renderQuickJournalModalInto(); return; }
    const ti = document.getElementById('quickJournalModalTextTitle'), tx = document.getElementById('quickJournalModalText');
    r70MemoSave(blob, (Date.now() - at)/1000, ti ? ti.value : '', tx ? tx.value : '').then(function(){
      ui.journalDraftText = ''; ui.qjTitleDraft = ''; if(tx) tx.value = ''; if(ti) ti.value = '';
      closeQuickJournalModal(); playPositive();
      showToast('Voice memo saved.', {icon:'&#127908;', actionLabel:'Open', actionAction:'r70MemosOpen', duration:5000});
    });
  };
  mr.start(1000); renderQuickJournalModalInto();
  R70.recT = setInterval(function(){ const el = document.getElementById('r70RecT'); if(el && R70.rec) el.textContent = r67Clock((Date.now() - R70.rec.at)/1000); }, 500);
};
ACTIONS.r70QjMicCancel = function(){ if(R70.rec){ R70.rec.keep = false; try{ R70.rec.mr.stop(); }catch(e){} } };
ACTIONS.r70MemosOpen = function(){ ui.view = 'personal'; ui.personalTab = 'journal'; ui.journalMode = 'memos'; renderView(); };
renderQuickJournalModal = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(ui.qjSaved) return h;
    const on = !!R70.rec;
    h = h.replace('<button class="qj3-ph" data-action="triggerJournalPhotoInput"', function(m0){ return '<button class="qj3-ph r70-mic'+(on ? ' is-on' : '')+'" data-action="r70QjMic" title="'+(on ? 'Stop and save' : 'Voice memo')+'">&#127908;</button>'+m0; });
    if(on) h = h.replace('<div class="qj3-f">', function(m0){ return '<div class="r70-rec"><i></i><b>Recording</b><span id="r70RecT">'+r67Clock((Date.now() - R70.rec.at)/1000)+'</span><button data-action="r70QjMic">Stop and save</button><button class="r70-rec-x" data-action="r70QjMicCancel" aria-label="Throw it away">&#10005;</button></div>'+m0; });
    return h;
  };
})(renderQuickJournalModal);
// (what you typed with a memo shows under it in Memos)
r67MemosHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const noted = r67Memos().filter(function(m){ return m.note; }); if(!noted.length) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.r68-mc').forEach(function(a){
      const b = a.querySelector('[data-action="r67MemoOpen"]'), m = b && noted.find(function(x){ return x.id===b.getAttribute('data-id'); });
      const head = a.querySelector('.r68-mh'); if(m && head) head.insertAdjacentHTML('afterend', '<p class="r70-mnote">'+escapeHtml(m.note)+'</p>');
    });
    return tpl.innerHTML;
  };
})(r67MemosHtml);
// from the Mac's floating bubble: the recording as base64
function r70AddVoiceMemo(o){
  try{
    const bin = atob(String(o && o.b64 || '')), u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    if(u.length < 2000) return false;
    const text = String(o.text || '').trim(), first = text.split('\n')[0];
    r70MemoSave(new Blob([u], {type:o.mime || 'audio/webm'}), Number(o.dur) || 0, first.length > 60 ? first.slice(0, 57)+'…' : first, text);
    return true;
  }catch(e){ return false; }
}
(function(){
  if(!window.operatorPage) return;
  const P = window.operatorPage;
  try{ window.operatorPage = Object.freeze(Object.assign({}, P, {addVoiceMemo:r70AddVoiceMemo})); }catch(e){}
})();

// ================= 6. Journal: search and sorting live behind one Filter button =================
// The bar under the writing card is gone (its Starred / Updates sat right under the same two tags). One Filter button
// by the entries opens it: search, month, day and tags. Closed, it shows how many filters are on, with Clear.
r67JFilterHtml = (function(base){
  return function(){
    const inner = base.apply(this, arguments);
    const on = [ui.journalSearchText, ui.r67JMonth, ui.r67JDay, ui.journalFilterMood].filter(Boolean).length, open = !!ui.r70Jf;
    const ico = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8.5V19l-4 2v-7.500z"/></svg>';
    return '<div class="r70-jf'+(open ? ' is-open' : '')+'"><button class="r70-jf-b'+(on ? ' is-on' : '')+'" data-action="r70JfToggle" aria-expanded="'+open+'">'+ico+'<span>Filter</span>'+(on ? '<em>'+on+'</em>' : '')+'</button>'+
      (on && !open ? '<span class="r70-jf-n">'+filteredJournalEntries().length+' found</span><button class="r67-jf-x" data-action="r67JClear">Clear</button>' : '')+
      (open ? '<div class="r70-jfp">'+inner+'</div>' : '')+'</div>';
  };
})(r67JFilterHtml);
ACTIONS.r70JfToggle = function(){ ui.r70Jf = !ui.r70Jf; playTick(); renderView(); if(ui.r70Jf) setTimeout(function(){ const i = document.getElementById('journalSearchInput'); if(i) i.focus(); }, 40); };
document.addEventListener('mousedown', function(e){ if(ui.r70Jf && !(e.target.closest && e.target.closest('.r70-jf'))){ ui.r70Jf = false; try{ renderView(); }catch(x){} } });
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && ui.r70Jf){ ui.r70Jf = false; try{ renderView(); }catch(x){} } });

// ================= 9. Inspiration: more to reach for, your own, and ones you forgot to log =================
// A wider set of ideas (playing an instrument first), grouped in "What did you do?". Add your own with an emoji and a
// name. "When" on the sheet logs one for an earlier day.
Object.assign(INSP_CATS, {music:'Music', make:'Making', learn:'Learning'});
const R70_INSP = [
  {id:'piano', e:'&#127929;', label:'Play the piano', cat:'music', pts:2, why:'Ten minutes at the keys. No audience.'},
  {id:'guitar', e:'&#127928;', label:'Play guitar', cat:'music', pts:2, why:'A few chords, or the song you keep meaning to learn.'},
  {id:'sing', e:'&#127908;', label:'Sing', cat:'music', pts:1, why:'In the car, in the shower, loud.'},
  {id:'beat', e:'&#127899;&#65039;', label:'Make a beat', cat:'music', pts:2, why:'Open the software and mess around.'},
  {id:'learnsong', e:'&#127932;', label:'Learn a song', cat:'music', pts:2, why:'One you love, start to finish.'},
  {id:'livemusic', e:'&#127927;', label:'Hear live music', cat:'music', pts:2, why:'A small room and a band you don’t know.'},
  {id:'draw', e:'&#9999;&#65039;', label:'Draw', cat:'make', pts:1, why:'A page of sketches. Bad ones count.'},
  {id:'paint', e:'&#128396;&#65039;', label:'Paint', cat:'make', pts:2, why:'Colour first, meaning later.'},
  {id:'photowalk', e:'&#128247;', label:'Photo walk', cat:'make', pts:2, why:'One lens, one hour, nothing for a client.'},
  {id:'filmself', e:'&#127909;', label:'Film something for you', cat:'make', pts:2, why:'No brief. Shoot what you find beautiful.'},
  {id:'writesong', e:'&#128221;', label:'Write a poem or a verse', cat:'make', pts:1, why:'Four lines is a start.'},
  {id:'buildhands', e:'&#128296;', label:'Build with your hands', cat:'make', pts:2, why:'Wood, clay, Lego, a shelf.'},
  {id:'newrecipe', e:'&#129379;', label:'Cook a new recipe', cat:'make', pts:1, why:'Something you’ve never made.'},
  {id:'language', e:'&#128483;&#65039;', label:'Practice a language', cat:'learn', pts:1, why:'Fifteen minutes out loud.'},
  {id:'documentary', e:'&#127902;&#65039;', label:'Watch a documentary', cat:'learn', pts:1, why:'About something far from your work.'},
  {id:'museum', e:'&#128444;&#65039;', label:'Museum or gallery', cat:'learn', pts:2, why:'Stand in front of one piece for five minutes.'},
  {id:'takeclass', e:'&#127891;', label:'Take a class', cat:'learn', pts:2, why:'Be a beginner at something.'},
  {id:'chess', e:'&#9823;&#65039;', label:'Play chess or a puzzle', cat:'learn', pts:1, why:'A different kind of thinking.'},
  {id:'studygreat', e:'&#128270;', label:'Study someone great', cat:'learn', pts:1, why:'How did they actually do it?'},
  {id:'dance', e:'&#128131;', label:'Dance', cat:'move', pts:1, why:'One song, door closed.'},
  {id:'swim', e:'&#127946;', label:'Swim', cat:'move', pts:2, why:'Water resets everything.'},
  {id:'hike', e:'&#129406;', label:'Hike', cat:'move', pts:2, why:'Up something, with a view at the top.'},
  {id:'sport', e:'&#127936;', label:'Play a sport', cat:'move', pts:2, why:'For the game, not the workout.'},
  {id:'bike', e:'&#128690;', label:'Bike ride', cat:'move', pts:2, why:'No route. Turn when it looks good.'},
  {id:'friends', e:'&#127860;', label:'Dinner with friends', cat:'people', pts:2, why:'Phones in the middle of the table.'},
  {id:'newperson', e:'&#129309;', label:'Talk to someone new', cat:'people', pts:1, why:'Ask what they’re working on.'},
  {id:'letter', e:'&#128140;', label:'Write someone a letter', cat:'people', pts:1, why:'By hand. Send it.'},
  {id:'giveback', e:'&#129782;', label:'Help someone out', cat:'people', pts:2, why:'An hour of your time, no post about it.'},
  {id:'stars', e:'&#127756;', label:'Look at the stars', cat:'unplug', pts:1, why:'Ten minutes, head back.'},
  {id:'silence', e:'&#129323;', label:'Sit in silence', cat:'unplug', pts:1, why:'No input at all. See what comes up.'},
  {id:'sauna', e:'&#129494;', label:'Sauna or a cold plunge', cat:'unplug', pts:1, why:'Nothing to do but be there.'},
  {id:'drive', e:'&#128663;', label:'Drive with no destination', cat:'unplug', pts:1, why:'Windows down, one album.'}
];
function r70InspOwn(){ const s = inspStore(); if(!Array.isArray(s.own)) s.own = []; return s.own; }
inspActs = (function(base){
  return function(){
    const have = {}, out = base.apply(this, arguments).slice(); out.forEach(function(a){ have[a.id] = 1; });
    R70_INSP.forEach(function(a){ if(!have[a.id]) out.push(a); });
    r70InspOwn().forEach(function(a){ out.push({id:a.id, e:a.e || '&#10024;', label:a.label, cat:'own', pts:2, why:'One of yours.', own:true}); });
    return out;
  };
})(inspActs);
const R70_INSP_ORDER = [['own', 'Yours'], ['music', 'Music'], ['make', 'Make'], ['learn', 'Learn'], ['move', 'Move'], ['mind', 'Mind'], ['people', 'People'], ['home', 'Home'], ['unplug', 'Unplugged']];
inspHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(!ui.inspSheet) return h;
    const acts = inspActs(), hidden = typeof inspHidden==='function' ? inspHidden() : [];
    const btn = function(a){ return '<button class="izs-a c-'+a.cat+'" data-action="inspLogFromSheet" data-id="'+a.id+'"><span>'+a.e+'</span>'+escapeHtml(a.label)+(a.own ? '<i class="r70-io-x" data-action="r70InspOwnDel" data-id="'+a.id+'" title="Remove">&#10005;</i>' : '')+'</button>'; };
    const groups = R70_INSP_ORDER.map(function(g){
      const L = acts.filter(function(a){ return (INSP_CATS[a.cat] || a.cat==='own' ? a.cat : 'mind')===g[0] && hidden.indexOf(a.id) < 0; });
      if(!L.length && g[0]!=='own') return '';
      return '<div class="r70-ig"><h4>'+g[1]+'</h4><div class="izs-grid">'+L.map(btn).join('')+(g[0]==='own' ? '<span class="r70-io"><input id="r70InspE" maxlength="4" placeholder="&#127775;" aria-label="Emoji"><input id="r70InspN" maxlength="40" placeholder="Add your own"><button data-action="r70InspOwnAdd">Add</button></span>' : '')+'</div></div>';
    }).join('');
    h = h.replace(/<div class="izs-grid">[\s\S]*?<\/div>(?=<div class="izs-more">)/, function(){ return '<div class="r70-igs">'+groups+'</div>'; });
    // when: today, or an earlier day (for the ones you forgot)
    h = h.replace('<div class="izs-more">', function(){ return '<div class="izs-more"><input class="input r70-iw" id="r70InspWhen" type="date" max="'+todayStr()+'" value="'+escapeHtml(ui.r70InspWhen || todayStr())+'" title="When">'; });
    return h;
  };
})(inspHtml);
document.addEventListener('change', function(e){ if(e.target && e.target.id==='r70InspWhen') ui.r70InspWhen = e.target.value; });
ACTIONS.inspLogSheet = (function(base){ return function(){ ui.r70InspWhen = ''; return base.apply(this, arguments); }; })(ACTIONS.inspLogSheet);
ACTIONS.inspLogFromSheet = (function(base){
  return function(el, e, id){
    const w = document.getElementById('r70InspWhen'), when = w && isYmd(w.value) && w.value < todayStr() ? w.value : '';
    const n = inspStore().log.length, r = base.apply(this, arguments), L = inspStore().log;
    if(when && L.length > n){ const x = L[L.length - 1]; x.date = when; x.at = localTs(when, '12:00'); x.back = true; persist('personal'); try{ xpLast = null; }catch(err){} inspRender(); }
    ui.r70InspWhen = '';
    return r;
  };
})(ACTIONS.inspLogFromSheet);
ACTIONS.r70InspOwnAdd = function(){
  const n = document.getElementById('r70InspN'), em = document.getElementById('r70InspE'), label = n ? n.value.trim() : '';
  if(!label){ if(n) n.focus(); return; }
  r70InspOwn().push({id:'own'+uid(), e:escapeHtml((em && em.value.trim()) || '✨'), label:label.slice(0, 40)});
  persist('personal'); ui._inspScatter = null; playTick(); inspRender();
};
ACTIONS.r70InspOwnDel = function(el, e, id){ if(e && e.stopPropagation) e.stopPropagation(); const s = inspStore(); s.own = r70InspOwn().filter(function(a){ return a.id!==id; }); persist('personal'); ui._inspScatter = null; inspRender(); };
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && (e.target.id==='r70InspN' || e.target.id==='r70InspE')){ e.preventDefault(); ACTIONS.r70InspOwnAdd(); } });

// ================= 13. Client journals take photos and screenshots =================
// Drop them on the card or use the camera button. They show as small thumbnails on the entry; tap one to see it big.
// Op can look at them too (the see_client_photos tool).
function r70CjDraft(){ if(!Array.isArray(ui.r70CjPhotos)) ui.r70CjPhotos = []; return ui.r70CjPhotos; }
async function r70CjAdd(files){
  const list = Array.prototype.filter.call(files || [], function(f){ return f && f.type && f.type.indexOf('image/')===0; });
  for(const f of list){ try{ r70CjDraft().push(await storeImageFile(f)); }catch(e){} }
  if(list.length){ const t = document.getElementById('journalTabClientText'); if(t) ui.journalTabClientDraft = t.value; playTick(); renderView(); }
}
ACTIONS['drop:clientjournal'] = function(zone, files){ r70CjAdd(files); };
ACTIONS.r70CjPick = function(){ const i = document.getElementById('r70CjFile'); if(i) i.click(); };
ACTIONS.r70CjRemove = function(el, e, i){ r70CjDraft().splice(Number(i), 1); const t = document.getElementById('journalTabClientText'); if(t) ui.journalTabClientDraft = t.value; renderView(); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='r70CjFile'){ r70CjAdd(e.target.files); e.target.value = ''; } });
document.addEventListener('paste', function(e){ const t = e.target; if(!t || t.id!=='journalTabClientText') return; const imgs = imageFilesFromTransfer(e.clipboardData); if(!imgs.length) return; e.preventDefault(); r70CjAdd(imgs); });
renderClientJournalComposeCard = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(h.indexOf('journalTabClientText') < 0) return h;
    const ph = r70CjDraft();
    h = h.replace('<div class="r60-jw is-client"', '<div data-photo-drop="clientjournal" class="r60-jw is-client"');
    h = h.replace('<div class="r60-jw-f"><span style="flex:1"></span>', function(){ return (ph.length ? '<div class="r70-cjd">'+ph.map(function(src, i){ return '<span><img src="'+escapeHtml(blobUrl(src))+'" alt=""><button data-action="r70CjRemove" data-id="'+i+'" aria-label="Remove">&times;</button></span>'; }).join('')+'</div>' : '')+
      '<div class="r60-jw-f"><span style="flex:1"></span><input type="file" id="r70CjFile" accept="image/*" multiple hidden><button class="r60-jw-p" data-action="r70CjPick" data-hov="Add a photo or screenshot" aria-label="Add a photo or screenshot">&#128247;</button>'; });
    return h;
  };
})(renderClientJournalComposeCard);
addClientJournalEntryFromJournal = function(){
  const selEl = document.getElementById('journalTabClientSelect'), textEl = document.getElementById('journalTabClientText');
  const clientId = selEl ? selEl.value : ui.journalTabClientId, text = textEl ? textEl.value.trim() : '', photos = r70CjDraft().slice();
  if(!clientId || (!text && !photos.length)) return;
  const c = state.business.clients.find(function(x){ return x.id===clientId; }); if(!c) return;
  if(!Array.isArray(c.journal)) c.journal = [];
  const e = {id:uid(), text:text, tag:null, date:todayStr(), createdAt:new Date().toISOString()}; if(photos.length) e.photos = photos;
  c.journal.push(e);
  ui.r70CjPhotos = []; ui.journalTabClientDraft = ''; if(textEl) textEl.value = '';
  persist('business'); playPositive(); renderView();
};
renderAllClientJournalRow = (function(base){
  return function(row){
    const h = base.apply(this, arguments), ph = arr(row.entry && row.entry.photos);
    if(!ph.length) return h;
    const strip = '<div class="r70-cjp">'+ph.map(function(src, i){ return '<button data-action="r70CjView" data-id="'+escapeHtml(row.entry.id)+'" data-idx="'+i+'" aria-label="Open the photo"><img src="'+escapeHtml(blobUrl(src))+'" alt=""></button>'; }).join('')+'</div>';
    return h.replace(/<\/article>$/, strip+'</article>');
  };
})(renderAllClientJournalRow);
function r70CjEntry(id){ let hit = null; arr(state.business.clients).forEach(function(c){ arr(c.journal).forEach(function(j){ if(j.id===id) hit = {c:c, j:j}; }); }); return hit; }
ACTIONS.r70CjView = function(el, e, id){
  const hit = r70CjEntry(id); if(!hit) return; const i = Number(el.dataset.idx) || 0, src = arr(hit.j.photos)[i]; if(!src) return;
  let v = document.getElementById('r70Light'); if(v) v.remove();
  v = document.createElement('div'); v.id = 'r70Light'; v.className = 'r70-light'; v.setAttribute('data-action', 'r70LightClose');
  v.innerHTML = '<img src="'+escapeHtml(blobUrl(src))+'" alt=""><button class="r70-light-x" data-action="r70LightClose" aria-label="Close">&#10005;</button>';
  document.body.appendChild(v); requestAnimationFrame(function(){ v.classList.add('is-in'); });
};
ACTIONS.r70LightClose = function(){ const v = document.getElementById('r70Light'); if(v) v.remove(); };
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && document.getElementById('r70Light')) ACTIONS.r70LightClose(); });
// (a deleted entry's photos go with it)
deleteItemNow = typeof deleteItemNow==='function' ? deleteItemNow : undefined;

// ================= 7. Op can do everything =================
// He could read your boards but never write to one. Now he can put something on a board, start a board, and say
// how the app scores you (Mind, Finances, Consistency, Goals) by reading the real numbers. He never changes a score,
// and he never does any of it unless you ask.
function r70BoardFind(name){
  const L = arr(state.boards && state.boards.boards); if(!L.length) return null;
  const q = String(name || '').trim().toLowerCase();
  if(!q) return boardById(currentBoardId('journal')) || L[0];
  return L.find(function(b){ return String(b.name || '').toLowerCase()===q; })
    || L.find(function(b){ return String(b.name || '').toLowerCase().indexOf(q) >= 0; })
    || L.find(function(b){ return q.indexOf(String(b.name || '').toLowerCase()) >= 0 && String(b.name || '').length > 3; })
    || null;
}
// a free spot under everything already on the board, in a tidy column of three
function r70BoardSpot(b){
  const els = arr(b.elements); if(!els.length) return {x:60, y:40};
  const mine = els.filter(function(e){ return e.r70; });
  const last = mine[mine.length - 1];
  if(last && mine.length % 3) return {x:last.x, y:last.y + (last.h || 96) + 18};
  let bottom = 0, left = 60;
  els.forEach(function(e){ bottom = Math.max(bottom, (e.y || 0) + (e.h || 96)); left = Math.min(left, e.x || 0); });
  return {x:left, y:bottom + 40};
}
function r70BoardAdd(x){
  const b = r70BoardFind(x.board);
  if(!b) throw new Error('no board called "'+(x.board || '')+'". Boards: '+arr(state.boards.boards).map(function(q){ return q.name; }).join(', '));
  const body = String(x.text || '').trim(); if(!body) throw new Error('missing text');
  const title = String(x.title || '').trim();
  const at = r70BoardSpot(b), col = String(x.color || '').match(/^#[0-9a-f]{6}$/i) ? x.color : BOARD_COLORS[arr(b.elements).length % 6];
  const lines = body.split('\n').map(function(s){ return s.replace(/^[-•*]\s*/, '').trim(); }).filter(Boolean);
  const asList = lines.length > 2 && lines.every(function(s){ return s.length < 90; });
  const el = asList
    ? {id:uid(), type:'list', title:title || 'Notes', color:col, items:lines.slice(0, 20).map(function(s){ return {id:uid(), text:s.slice(0, 160)}; }), x:at.x, y:at.y, w:300, h:Math.min(420, 56 + lines.length*26), z:arr(b.elements).length + 1, r70:1}
    : {id:uid(), type:'note', header:!!title, color:col, title:title, body:body.slice(0, 4000), x:at.x, y:at.y, w:300, h:Math.max(90, Math.min(360, 50 + body.length/3)), z:arr(b.elements).length + 1, r70:1};
  b.elements.push(el); persist('boards');
  if(ui.view==='personal' && ui.personalTab==='journal' && ui.journalMode==='boards'){ try{ renderView(); }catch(e){} }
  return 'put it on '+b.name+(title ? ' as "'+title+'"' : '')+(asList ? ' ('+lines.length+' lines)' : '');
}
// what the app actually knows about how you're scored: read only, never touched
function r70ScoreRead(area){
  const out = [], x = xpSummary();
  const want = String(area || '').toLowerCase();
  const pick = function(k){ return !want || want==='all' || want.indexOf(k) >= 0 || k.indexOf(want) >= 0; };
  if(pick('level') || pick('xp')) out.push('Level '+x.level+' ('+RANKS[x.rank].name+'), '+x.total.toLocaleString()+' XP. '+(x.maxed ? 'Top level.' : x.canLevel ? 'Level '+(x.level + 1)+' is ready to claim.' : (x.levelHi - x.total).toLocaleString()+' XP to level '+(x.level + 1)+'.'));
  const names = {BUS:'business', PER:'personal', HLT:'health', DIS:'discipline'};
  Object.keys(x.attrs || {}).forEach(function(k){
    const a = x.attrs[k]; if(!a) return;
    if(!(pick(String(a.name || '').toLowerCase()) || pick(names[k] || ''))) return;
    out.push(a.name+': '+a.v+'/100'+(a.cap ? ' (capped at '+a.cap+' at your weight)' : '')+'. From '+arr(a.subs).map(function(s){ return s.label+' '+(s.v==null ? 'no data' : s.v); }).join(', ')+'.');
  });
  if(pick('consist')){
    let c = null; try{ c = consistencyStats(xpCtx()); }catch(e){}
    out.push(c ? 'Consistency: '+Math.round(c.f*100)+'/100, '+(c.trend > 0 ? 'going up' : c.trend < 0 ? 'going down' : 'level')+'. It counts '+c.parts.join(', ')+' over the last four weeks, with the last two weighted most.'
      : 'Consistency: not enough logged yet to score it.');
  }
  if(pick('goal')){
    let w = null, m = null; try{ w = tierHitRate('week', 4); m = tierHitRate('month', 3); }catch(e){}
    out.push('Goals: '+(w==null ? 'no weekly goals yet' : Math.round(w*100)+'% of weekly goals hit over four weeks')+'; '+(m==null ? 'no monthly goals yet' : Math.round(m*100)+'% monthly over three months')+'.');
  }
  if(pick('financ') || pick('money')){
    let mrr = 0; try{ mrr = typeof activeMrr==='function' ? activeMrr() : 0; }catch(e){}
    out.push('Finances feed the Business rating and one-off XP: '+(mrr ? '$'+Math.round(mrr).toLocaleString()+' MRR' : 'no MRR recorded')+'. '+XP_BOOK.oneoff.mrrPerK+' XP per $1k of MRR, '+XP_BOOK.oneoff.client+' for a new client.');
  }
  if(!out.length) return 'Nothing by that name. The ratings are Business, Personal, Health and Discipline; there is also Consistency, Goals, Finances and your level.';
  return out.join('\n');
}
if(typeof OP_TOOLS!=='undefined' && Array.isArray(OP_TOOLS)){
  OP_TOOLS.push(
    {name:'add_to_board', description:'Put something on one of his boards (Journal → Boards), formatted as a note or a list card. Use this when he pastes content and says to file it on a board. Only when he asks.', input_schema:{type:'object', properties:{board:{type:'string', description:'the board’s name, e.g. "Contractor Co-Content"'}, title:{type:'string', description:'a short heading for the card'}, text:{type:'string', description:'the content; several short lines become a list card'}, color:{type:'string', description:'#rrggbb'}}, required:['board', 'text']}},
    {name:'list_boards', description:'The names of his boards, with how many things are on each.', input_schema:{type:'object', properties:{}}},
    {name:'make_board', description:'Start a new board.', input_schema:{type:'object', properties:{name:{type:'string'}}, required:['name']}},
    {name:'explain_score', description:'Read out how the app is scoring him right now and what feeds it: Business, Personal, Health, Discipline, Consistency, Goals, Finances, level and XP. Read only: it never changes a score.', input_schema:{type:'object', properties:{area:{type:'string', description:'which one, or leave out for all'}}}}
  );
}
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='add_to_board') return r70BoardAdd(x);
    if(name==='list_boards') return arr(state.boards.boards).map(function(b){ return b.name+' ('+arr(b.elements).length+')'; }).join('\n') || 'no boards yet';
    if(name==='make_board'){ const n = String(x.name || '').trim(); if(!n) throw new Error('missing name'); const b = createBoard('journal', n.slice(0, 60)); return 'started the board "'+b.name+'"'; }
    if(name==='explain_score') return r70ScoreRead(x.area);
    return base.apply(this, arguments);
  };
})(opRunTool);
aiSystem = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    const add = '\n\nYOU ARE THE APP: there is no part of it you can’t reach. Boards included (add_to_board, list_boards, make_board). If he asks how he’s being scored, read it with explain_score instead of guessing or saying you don’t know; never change a score.';
    try{ if(Array.isArray(out)) out.push({type:'text', text:add.trim()}); else return String(out || '')+add; }catch(e){}
    return out;
  };
})(aiSystem);

// ================= 10. When the key stops working, you hear about it =================
// Anthropic turning the key down used to be one grey line inside Op's window. Now it's a notification with a button
// straight to the box you paste the new key into. Once an hour at most, and it clears the moment he answers again.
function r70KeyBad(line){ return /turned the key down|out of credit|no api key|key in Settings/i.test(String(line || '')); }
ACTIONS.r70KeyFix = function(){ ui.view = 'settings'; ui.settingsTab = 'connections'; renderView(); setTimeout(function(){ const el = document.querySelector('#opApiKey, [id*="ApiKey"], [id*="apiKey"]'); if(el){ el.scrollIntoView({block:'center', behavior:'smooth'}); el.focus(); } }, 120); };
aiErrLine = (function(base){
  return function(res){
    const line = base.apply(this, arguments);
    try{
      if(r70KeyBad(line)){
        const p = state.profile, now = Date.now();
        if(!p.r70KeyAt || now - p.r70KeyAt > 3600000){
          p.r70KeyAt = now; persist('profile');
          r66FeedAdd({cat:'other', icon:'&#128273;', title:'Op can’t reach his brain', sub:line, act:{a:'r70KeyFix'}});
          r70NoteShow('Op can’t reach his brain', {bad:true, action:'r70KeyFix'});
          showToast(line, {icon:'&#128273;', duration:14000, actionLabel:'Open Settings', actionAction:'r70KeyFix'});
          try{ notifBadge(); }catch(e){}
        }
      } else if(state.profile.r70KeyAt){ delete state.profile.r70KeyAt; persist('profile'); }
    }catch(e){}
    return line;
  };
})(aiErrLine);

// ================= 11. A client can be on more than one playbook =================
// Their main one still sits in x.pb; the others live in x.pbs, each with its own progress, its own tasks and its own
// day 1. A client running ads in Social joins the ad playbook by itself. When the campaigns stop, the app asks.
function r70Pbs(x){ if(!Array.isArray(x.pbs)) x.pbs = []; return x.pbs; }
function r70PbEveryone(){
  const out = [];
  arr(state.business.clients).forEach(function(c){ out.push({kind:'client', x:c}); });
  arr(state.business.pipeline).forEach(function(l){ out.push({kind:'lead', x:l}); });
  return out;
}
function r70PbDepth(){ let n = 0; r70PbEveryone().forEach(function(h){ n = Math.max(n, r70Pbs(h.x).filter(function(p){ return p && p.id; }).length); }); return n; }
// one sync pass per extra playbook: x.pb is swapped for it, and the tasks of the playbooks that pass isn't about
// are put back afterwards (each pass only clears away its own).
pbSync = (function(base){
  return function(){
    let ch = false, depth = 0;
    try{ depth = r70PbDepth(); }catch(e){}
    if(!depth) return base.apply(this, arguments);
    for(let k = -1; k < depth; k++){
      const swap = [], mine = {};
      if(k >= 0){
        r70PbEveryone().forEach(function(h){ const e = r70Pbs(h.x)[k]; if(!e || !e.id) return; swap.push({x:h.x, main:h.x.pb, k:k}); h.x.pb = e; });
        if(!swap.length) continue;
      }
      r70PbEveryone().forEach(function(h){ if(h.x.pb && h.x.pb.id) mine[h.x.pb.id+'|'+h.kind+':'+h.x.id] = 1; });
      const keep = state.tasks.items.slice();
      try{ if(base.apply(this, arguments)) ch = true; }
      finally {
        const have = {}; state.tasks.items.forEach(function(t){ have[t.id] = 1; });
        keep.forEach(function(t){
          if(have[t.id]) return;
          const m = t.master;
          if(m && m.kind==='pb' && mine[m.pb+'|'+m.who+':'+m.id]) return;   // this pass's own clear-out: let it go
          state.tasks.items.push(t);
        });
        swap.forEach(function(s){ s.x.pbs[s.k] = s.x.pb; s.x.pb = s.main; });
      }
    }
    return ch;
  };
})(pbSync);
// ticking a playbook task finds the playbook it belongs to, main or not
pbTaskPerson = (function(base){
  return function(t){
    const P = base.apply(this, arguments);
    return P && t && t.master && P.x.pb && P.x.pb.id===t.master.pb ? P : null;
  };
})(pbTaskPerson);
function r70PbExtraFor(t){
  const m = t && t.master; if(!m || m.kind!=='pb') return null;
  const x = crmFind(m.who, m.id); if(!x) return null;
  if(x.pb && x.pb.id===m.pb) return null;
  const hit = r70Pbs(x).find(function(p){ return p && p.id===m.pb && p.done; });
  return hit ? {x:x, pb:hit} : null;
}
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(q){ return q.id===id; }), E = r70PbExtraFor(t);
    const r = base.apply(this, arguments);
    if(E) setTimeout(function(){ if(t.status==='done'){ E.pb.done[t.master.key] = todayStr(); persist('business'); try{ masterTasksSync(); }catch(e){} } }, 1100);
    return r;
  };
})(completeTask);
undoTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(q){ return q.id===id; }), E = r70PbExtraFor(t);
    const r = base.apply(this, arguments);
    if(E){ delete E.pb.done[t.master.key]; persist('business'); }
    return r;
  };
})(undoTask);
// putting someone on another one, and taking them off it
function r70PbAdd(kind, x, pbId, quiet){
  const p = pbById(pbId); if(!p) return false;
  if(x.pb && x.pb.id===pbId) return false;
  if(r70Pbs(x).some(function(q){ return q && q.id===pbId; })) return false;
  if(!x.pb || !x.pb.id){ pbStart(kind, x, pbId, pbDay1(kind, x, p), quiet); persist('business'); return true; }
  r70Pbs(x).push({id:p.id, start:pbDay1(kind, x, p), run:Date.now().toString(36).slice(-5), done:{}, auto:{}, hist:[]});
  persist('business');
  if(!quiet) r55Banner(pbName(kind, x)+' is also on '+p.name);
  try{ masterTasksSync(); }catch(e){}
  return true;
}
function r70PbDrop(kind, x, pbId){
  const L = r70Pbs(x), i = L.findIndex(function(q){ return q && q.id===pbId; });
  if(i < 0) return false;
  L.splice(i, 1);
  state.tasks.items = state.tasks.items.filter(function(t){ const m = t.master; return !(m && m.kind==='pb' && m.pb===pbId && m.who===kind && m.id===x.id && t.status!=='done'); });
  persist('business'); persist('tasks');
  return true;
}
ACTIONS.r70PbAdd = function(el, e, id){
  const p = String(id).split('|'), hit = crmFind(p[0], p[1]); if(!hit) return;
  const sel = el.closest('.r70-pbx') ? el.closest('.r70-pbx').querySelector('select') : null;
  const pbId = (sel && sel.value) || p[2]; if(!pbId) return;
  if(r70PbAdd(p[0], hit, pbId)) { playPositive(); renderView(); }
};
ACTIONS.r70PbDrop = function(el, e, id){
  const p = String(id).split('|'), hit = crmFind(p[0], p[1]); if(!hit) return;
  if(r70PbDrop(p[0], hit, p[2])){ playTick(); renderView(); }
};
// their window: the main playbook, then each of the others, then "on another one"
pbPersonHtml = (function(base){
  return function(kind, x){
    let h = base.apply(this, arguments);
    const extras = r70Pbs(x).filter(function(p){ return p && p.id && pbById(p.id); });
    extras.forEach(function(p){
      const main = x.pb; x.pb = p;
      let part = '';
      try{ part = base.call(this, kind, x); } catch(e){ part = ''; } finally { x.pb = main; }
      if(part) h += '<div class="r70-pbmore"><div class="r70-pbmore-h"><b>'+escapeHtml(pbById(p.id).name)+'</b><button data-action="r70PbDrop" data-id="'+escapeHtml(kind+'|'+x.id+'|'+p.id)+'">Take them off</button></div>'+part+'</div>';
    });
    const on = [x.pb && x.pb.id].concat(extras.map(function(p){ return p.id; })).filter(Boolean);
    const left = pbAll().filter(function(p){ return (kind==='lead' ? p.kind==='lead' : p.kind!=='lead') && on.indexOf(p.id) < 0 && !p.master; });
    if(left.length && x.pb && x.pb.id){
      h += '<div class="r70-pbx"><select class="input input-sm"><option value="">Also on…</option>'+left.map(function(p){ return '<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>'; }).join('')+
        '</select><button class="btn btn-sm" data-action="r70PbAdd" data-id="'+escapeHtml(kind+'|'+x.id+'|')+'">Add</button></div>';
    }
    return h;
  };
})(pbPersonHtml);
// ---- the ad playbook joins itself up ----
function r70AdsPb(){
  const cm = crm();
  let p = cm.r70AdsPb ? pbById(cm.r70AdsPb) : null;
  if(p) return p;
  p = pbAll().find(function(q){ return q.kind!=='lead' && !q.master && /ad/i.test(q.name) && /manage|management|ads?$/i.test(q.name); })
   || pbAll().find(function(q){ return q.kind!=='lead' && !q.master && /^ads?\b|\bads?\b/i.test(q.name); });
  if(p){ cm.r70AdsPb = p.id; persist('business'); }
  return p || null;
}
function r70LiveAds(){
  let g = null; try{ g = adGroups(); }catch(e){}
  const out = {};
  if(!g) return out;
  Object.keys(g.by).forEach(function(id){
    if(id.indexOf('acct:')===0) return;
    const live = g.by[id].some(function(k){ const s = String(k.status || k.effective_status || '').toUpperCase(); return s ? s==='ACTIVE' : (k.x && k.x.spend > 0); });
    if(live) out[id] = 1;
  });
  return out;
}
function r70AdsTick(){
  try{
    const p = r70AdsPb(); if(!p) return;
    const cm = crm(), live = r70LiveAds(), seen = cm.r70AdsOn && typeof cm.r70AdsOn==='object' ? cm.r70AdsOn : (cm.r70AdsOn = {});
    if(!Object.keys(live).length && !Object.keys(seen).length) return;
    let ch = false;
    Object.keys(live).forEach(function(id){
      const c = arr(state.business.clients).find(function(q){ return q.id===id; }); if(!c) return;
      if(!seen[id]){ seen[id] = todayStr(); ch = true; }
      const on = (c.pb && c.pb.id===p.id) || r70Pbs(c).some(function(q){ return q && q.id===p.id; });
      if(on || cm.r70AdsOff && cm.r70AdsOff[id]) return;
      if(r70PbAdd('client', c, p.id, true)){
        ch = true;
        r66FeedAdd({cat:'playbook', icon:'&#128226;', title:(c.business || c.name)+' is on '+p.name, sub:'Their ads are running', cli:id});
      }
    });
    // the ads stopped: ask once what to do with them
    Object.keys(seen).forEach(function(id){
      if(live[id]) return;
      delete seen[id]; ch = true;
      const c = arr(state.business.clients).find(function(q){ return q.id===id; }); if(!c) return;
      const on = (c.pb && c.pb.id===p.id) || r70Pbs(c).some(function(q){ return q && q.id===p.id; });
      if(!on) return;
      r66FeedAdd({cat:'playbook', icon:'&#9208;&#65039;', title:(c.business || c.name)+'’s ads stopped', sub:'Keep them on '+p.name+', or take them off?', cli:id, act:{a:'r70AdsAsk', id:id}});
      try{ notifBadge(); }catch(e){}
    });
    if(ch) persist('business');
  }catch(e){}
}
ACTIONS.r70AdsAsk = function(el, e, id){
  const cid = id || (el && el.dataset ? el.dataset.id : '');
  const c = arr(state.business.clients).find(function(q){ return q.id===cid; }), p = r70AdsPb();
  if(!c || !p) return;
  uiConfirm({title:(c.business || c.name)+'’s ads stopped', text:'They’re still on '+p.name+'. Keep them on it, or take them off?', okLabel:'Take them off', cancelLabel:'Keep them on'}).then(function(off){
    const cm = crm();
    if(off){ if(c.pb && c.pb.id===p.id) c.pb = {id:null, hist:arr(c.pb.hist)}; else r70PbDrop('client', c, p.id); showToast('Off '+p.name+'.', {icon:'&#9776;'}); }
    else { if(!cm.r70AdsOff) cm.r70AdsOff = {}; }
    persist('business'); renderView();
  });
};
setTimeout(r70AdsTick, 9000); setInterval(r70AdsTick, 15*60000);
// ---- a playbook from a name, or from an idea ----
function r70PbMake(name, forKind, stages){
  const n = String(name || '').trim(); if(!n) throw new Error('missing name');
  const p = {id:uid(), name:n.slice(0, 60), kind:forKind==='lead' ? 'lead' : 'client', for:forKind==='lead' ? 'lead' : 'client', days:30, stages:[], postDays:[]};
  const S = arr(stages);
  p.stages = (S.length ? S : [{name:'Getting started', steps:['Kick-off call', 'Get everything you need from them', 'Set it all up']}]).slice(0, 8).map(function(s){
    return {id:uid(), name:String(s.name || 'Stage').slice(0, 50), crm:null, repeat:s.repeat==='month' ? 'month' : null, days:Number(s.days) > 0 ? Number(s.days) : 14,
      steps:arr(s.steps).slice(0, 14).map(function(t, i){
        const title = typeof t==='string' ? t : String(t && t.title || 'Step');
        const type = typeof t==='object' && /^(task|call|doc)$/.test(t.type) ? t.type : (/\bcall\b|\bmeeting\b|\bkick.?off\b/i.test(title) ? 'call' : 'task');
        return {id:uid(), title:title.slice(0, 90), type:type, due:{rule:'day', n:i + 1}, checklist:[], links:[], files:[], notes:typeof t==='object' ? String(t.notes || '').slice(0, 400) : ''};
      })};
  });
  pbAll().push(p); persist('business');
  try{ masterTasksSync(); }catch(e){}
  return p;
}
if(typeof OP_TOOLS!=='undefined' && Array.isArray(OP_TOOLS)){
  OP_TOOLS.push(
    {name:'create_playbook', description:'Make a playbook. He may give you only a name or an idea: write the stages and steps yourself, the way a good SOP reads, and pass them in. Only when he asks for one.', input_schema:{type:'object', properties:{name:{type:'string'}, for:{type:'string', enum:['client', 'lead']}, stages:{type:'array', description:'stages in order, each with a name and its steps', items:{type:'object', properties:{name:{type:'string'}, days:{type:'number', description:'how long the stage should take'}, repeat:{type:'string', enum:['month']}, steps:{type:'array', items:{type:'string'}}}, required:['name', 'steps']}}}, required:['name']}},
    {name:'add_playbook', description:'Put a client or lead on another playbook, on top of the one they are already on. Each one keeps its own progress.', input_schema:{type:'object', properties:{who:{type:'string'}, playbook:{type:'string'}}, required:['who', 'playbook']}}
  );
}
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='create_playbook'){ const p = r70PbMake(x.name, x.for, x.stages); return 'made the playbook "'+p.name+'" with '+p.stages.length+' stage'+(p.stages.length===1 ? '' : 's')+' and '+p.stages.reduce(function(a, s){ return a + s.steps.length; }, 0)+' steps'; }
    if(name==='add_playbook'){
      const hit = opFindContact(x.who); if(!hit) throw new Error('no client or lead matches "'+x.who+'"');
      const q = String(x.playbook || '').toLowerCase();
      const p = pbAll().find(function(z){ return String(z.name).toLowerCase()===q; }) || pbAll().find(function(z){ return String(z.name).toLowerCase().indexOf(q) >= 0; });
      if(!p) throw new Error('no playbook called "'+x.playbook+'"');
      if(!r70PbAdd(hit.kind, hit.x, p.id)) throw new Error('already on '+p.name);
      try{ renderView(); }catch(e){}
      return crmName(hit.kind, hit.x)+' is now also on '+p.name;
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
// "Describe it and Op writes it" in the new-playbook sheet
ACTIONS.r70PbIdea = function(){
  const el = document.getElementById('r70PbIdea'), idea = el ? el.value.trim() : '';
  if(!idea){ if(el) el.focus(); return; }
  if(typeof aiAsk!=='function'){ showToast('Op isn’t on.', {icon:'&#9888;'}); return; }
  try{ addSheetClose('pbNew'); }catch(e){}
  showToast('Op’s writing it…', {icon:'&#9776;', duration:4000});
  aiAsk('Make me a playbook with create_playbook: '+idea+'. Write the stages and the steps yourself, in my words, no filler. Then tell me in one line what you made.');
};

// ================= 12. The XP center =================
// Inside Personal → You: where your XP stands, every quest still open today, and a Claim button when a level is
// ready, with a proper send-off when you take it. Consistency also counts the touches you log.
const R70_Q = [
  {id:'deep', icon:'&#9201;&#65039;', label:'Hit your deep work target', xp:function(){ return XP_BOOK.work.deepBase + XP_BOOK.work.deepStep*4; }, done:function(){ return deepWorkMinutesFor(todayStr()) >= (state.standards.deepWorkTarget || 240); }, act:'openFocus'},
  {id:'std', icon:'&#9989;', label:'Finish today’s standard', xp:function(){ return XP_BOOK.added.session; }, done:function(){ return dayStandardsComplete(todayStr()); }, act:'openStreaks'},
  {id:'task', icon:'&#128203;', label:'Finish a task', xp:function(){ return XP_BOOK.work.taskMax; }, done:function(){ return state.tasks.items.some(function(t){ return t.status==='done' && t.completedAt===todayStr(); }); }, act:'openFocus'},
  {id:'train', icon:'&#128170;', label:'Train', xp:function(){ return XP_BOOK.health.workouts[0]; }, done:function(){ return arr(state.health.workouts).some(function(w){ return w.date===todayStr(); }); }, act:'openHealth'},
  {id:'food', icon:'&#127869;&#65039;', label:'Log what you ate', xp:function(){ return XP_BOOK.health.food; }, done:function(){ return arr(state.health.calorieEntries).some(function(c){ return c.date===todayStr(); }); }, act:'openHealth'},
  {id:'weigh', icon:'&#9878;&#65039;', label:'Weigh in', xp:function(){ return XP_BOOK.health.weighIn; }, done:function(){ return arr(state.health.weightLog).some(function(w){ return w.date===todayStr(); }); }, act:'openHealth'},
  {id:'journal', icon:'&#128221;', label:'Write in your journal', xp:function(){ return XP_BOOK.personal.journal; }, done:function(){ return arr(state.journal.entries).some(function(e){ return e.date===todayStr() && (!r55JournalCounts || r55JournalCounts(e)); }); }, act:'openJournalQ'},
  {id:'insp', icon:'&#10024;', label:'Do something that inspires you', xp:function(){ return XP_BOOK.personal.insp; }, done:function(){ return arr(inspStore().log).some(function(l){ return l.date===todayStr(); }); }, act:'openInspire'},
  {id:'touch', icon:'&#128222;', label:'Touch base with a client or lead', xp:function(){ return XP_BOOK.work.touch; }, done:function(){ return r70TouchedOn(todayStr()) > 0; }, act:'openLogCenter'},
  {id:'habit', icon:'&#128257;', label:'Tick a habit', xp:function(){ return XP_BOOK.personal.habit; }, done:function(){ try{ return arr(tierGoals('habit')).some(function(g){ return g.done; }); }catch(e){ return true; } }, act:'openGoals'},
  {id:'week', icon:'&#127919;', label:'Check in for the week', xp:function(){ return XP_BOOK.goals.weekIn; }, done:function(){ try{ return checkedIn('week', weekKey(todayStr())); }catch(e){ return true; } }, act:'openGoals', weekly:true}
];
function r70TouchedOn(d){
  let n = 0;
  const count = function(x){ arr(x.touchpoints).forEach(function(t){ if((t.date || '').slice(0, 10)===d) n++; }); };
  arr(state.business.clients).forEach(count); arr(state.business.pipeline).forEach(count);
  return n;
}
function r70Quests(){
  return R70_Q.map(function(q){
    let done = true, xp = 0;
    try{ done = !!q.done(); }catch(e){ done = true; }
    try{ xp = Math.round(q.xp()) || 0; }catch(e){ xp = 0; }
    return {id:q.id, icon:q.icon, label:q.label, xp:xp, done:done, act:q.act, weekly:!!q.weekly};
  }).filter(function(q){ return q.xp > 0; });
}
ACTIONS.openStreaks = function(){ ui.view = 'personal'; ui.personalTab = 'streaks'; renderView(); };
ACTIONS.openHealth = function(){ ui.view = 'personal'; ui.personalTab = 'fitness'; renderView(); };
ACTIONS.openGoals = function(){ ui.view = 'personal'; ui.personalTab = 'goals'; renderView(); };
ACTIONS.openFocus = function(){ ui.view = 'focus'; ui.focusTab = 'tasks'; renderView(); };
ACTIONS.openJournalQ = function(){ if(typeof openQuickJournalModal==='function') openQuickJournalModal(); else { ui.view = 'personal'; ui.personalTab = 'journal'; renderView(); } };
ACTIONS.openLogCenter = function(){ ui.view = 'business'; ui.businessTab = 'logcenter'; renderView(); };
ACTIONS.r70XpOpen = function(){ ui.r70Xp = !ui.r70Xp; playTick(); renderView(); };
function r70XpHtml(){
  const x = xpSummary(), r = RANKS[x.rank], Q = r70Quests();
  const open = Q.filter(function(q){ return !q.done; }), got = Q.length - open.length;
  const left = open.reduce(function(a, q){ return a + q.xp; }, 0);
  const show = ui.r70Xp !== false;
  const chip = function(q){
    return '<button class="r70-q'+(q.done ? ' is-done' : '')+'" data-action="'+q.act+'"><i>'+(q.done ? '&#10003;' : q.icon)+'</i><span>'+escapeHtml(q.label)+(q.weekly ? ' <em>this week</em>' : '')+'</span><b>'+(q.done ? 'got it' : '+'+q.xp.toLocaleString())+'</b></button>';
  };
  return '<section class="r70-xp'+(x.canLevel ? ' is-ready' : '')+(show ? ' is-open' : '')+'" style="--rc:'+r.color+'">'+
    '<header data-action="r70XpOpen"><span class="r70-xp-k">XP</span>'+
      '<div class="r70-xp-bar"><i><u style="width:'+Math.min(100, x.levelPct*100).toFixed(1)+'%"></u></i></div>'+
      '<b>'+x.total.toLocaleString()+'</b>'+
      '<em>'+(x.maxed ? 'maxed' : x.canLevel ? 'level '+(x.level + 1)+' ready' : (x.levelHi - x.total).toLocaleString()+' to go')+'</em>'+
      '<i class="r70-xp-c" aria-hidden="true">'+(show ? '&#9650;' : '&#9660;')+'</i></header>'+
    (show ? '<div class="r70-xp-b">'+
      (x.canLevel ? '<div class="r70-claim"><button data-action="r70Claim"><span>&#128293;</span>Claim level '+(x.level + 1)+'</button><small>'+escapeHtml(RANKS[Math.min(RANKS.length - 1, x.rank)].tag || '')+'</small></div>' : '')+
      '<div class="r70-q-h"><b>Quests</b><span>'+(open.length ? got+' of '+Q.length+' done · '+left.toLocaleString()+' XP still out there' : 'All '+Q.length+' done today. Clean sweep.')+'</span></div>'+
      '<div class="r70-qs">'+open.map(chip).join('')+Q.filter(function(q){ return q.done; }).map(chip).join('')+'</div>'+
    '</div>' : '')+'</section>';
}
ACTIONS.r70Claim = function(){ if(ACTIONS.levelUp) ACTIONS.levelUp(); };
renderYouTab = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    let panel = ''; try{ panel = r70XpHtml(); }catch(e){ panel = ''; }
    if(!panel) return h;
    return h.indexOf('<div class="you-attrs">') >= 0 ? h.replace('<div class="you-attrs">', panel+'<div class="you-attrs">') : h.replace(/<\/div>\s*$/, panel+'</div>');
  };
})(renderYouTab);
// claiming it: fireworks over the top of the usual flames
levelUpFx = (function(base){
  return function(L, newRank){
    const r = base.apply(this, arguments);
    try{
      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return r;
      const host = document.getElementById('lvlFx'); if(!host) return r;
      const cv = document.createElement('canvas'); cv.className = 'r70-fw'; host.appendChild(cv);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const fit = function(){ cv.width = innerWidth*dpr; cv.height = innerHeight*dpr; };
      fit();
      const ctx = cv.getContext('2d'), P = [], COL = ['#ffd166', '#ff6b9d', '#7ef0c0', '#8fd3ff', '#c3a6ff', '#ff9a6b', '#fff2b0'];
      const burst = function(x, y, n, col){
        for(let i = 0; i < n; i++){
          const a = Math.random()*Math.PI*2, sp = (1 + Math.random()*5.5)*(0.7 + L*0.02);
          P.push({x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, col:col, r:1 + Math.random()*2.4});
        }
      };
      const shells = Math.min(14, 5 + Math.floor(L/5)) + (newRank!=null ? 5 : 0);
      let fired = 0;
      const fire = function(){
        if(fired++ >= shells) return;
        burst(innerWidth*(0.15 + Math.random()*0.7)*dpr, innerHeight*(0.12 + Math.random()*0.45)*dpr, 46 + Math.floor(Math.random()*40), COL[Math.floor(Math.random()*COL.length)]);
        try{ if(typeof tone==='function') tone([180 + Math.random()*500], 0.12, 0.05); }catch(e){}
        setTimeout(fire, 150 + Math.random()*260);
      };
      fire();
      let t0 = performance.now(), stop = false;
      const step = function(now){
        if(stop || !host.parentNode){ cv.remove(); return; }
        ctx.clearRect(0, 0, cv.width, cv.height);
        for(let i = P.length - 1; i >= 0; i--){
          const p = P[i];
          p.x += p.vx*dpr; p.y += p.vy*dpr; p.vy += 0.085*dpr; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.0115;
          if(p.life <= 0){ P.splice(i, 1); continue; }
          ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r*dpr*p.life, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if(now - t0 > 11000 && !P.length){ cv.remove(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      window.addEventListener('resize', fit);
      setTimeout(function(){ stop = true; }, 13000);
    }catch(e){}
    return r;
  };
})(levelUpFx);
// consistency counts the touches you log, alongside the work, the tasks, the videos and training
consistencyStats = (function(base){
  return function(ctx){
    const out = base.apply(this, arguments);
    try{
      if(!out) return out;
      const today = todayStr();
      let any = false, weeks = [];
      for(let k = 0; k < 4; k++){
        let t = 0, d = 0;
        for(let i = 0; i < 7; i++){ const day = addDays(today, -(7*k + i)); const n = r70TouchedOn(day); if(n) any = true; t += n; d++; }
        weeks.push(Math.min(1, t/3));   // three touches in a week is the week handled
      }
      if(!any) return out;
      const tf = [.4, .3, .2, .1].reduce(function(a, w, i){ return a + w*weeks[i]; }, 0);
      out.f = out.f*0.88 + tf*0.12;
      if(out.parts.indexOf('client touches') < 0) out.parts = out.parts.concat(['client touches']);
    }catch(e){}
    return out;
  };
})(consistencyStats);

// ================= 14. Days off, shooting days, and a streak that survives them =================
// Mark a day off and the streak holds where it is: no +1, no break. You can mark them a month ahead, from the
// streak page or from the lock-in screen. A day you spent shooting counts by itself.
const R70_OFF = [{id:'off', label:'Off', icon:'&#127796;'}, {id:'break', label:'Break', icon:'&#9749;'}, {id:'shoot', label:'Shooting', icon:'&#127916;'}];
function r70OffKinds(){ const d = state.daysOff; if(!d.r70Kinds || typeof d.r70Kinds!=='object') d.r70Kinds = {}; return d.r70Kinds; }
function r70ShootOn(d){
  if(r70P('r70ShootOff', true)===false) return false;
  return arr(state.modes && state.modes.history).some(function(m){ return m && (m.type==='shooting' || m.shooting) && String(m.date || todayStr(m.startedAt))===d; });
}
isDayOff = (function(base){
  return function(d){
    try{ if(state.daysOff.dates.indexOf(d) >= 0) return true; if(r70ShootOn(d)) return true; }catch(e){}
    return base.apply(this, arguments);
  };
})(isDayOff);
function r70OffSet(d, kind){
  const L = state.daysOff.dates, K = r70OffKinds(), i = L.indexOf(d);
  if(!kind){ if(i >= 0) L.splice(i, 1); delete K[d]; }
  else { if(i < 0) L.push(d); K[d] = kind; }
  persist('daysOff');   // (the memo cache is cleared by the next render)
}
ACTIONS.r70OffPick = function(el, e, id){
  const p = String(id).split('|'), d = p[0], K = r70OffKinds();
  const cur = state.daysOff.dates.indexOf(d) >= 0 ? (K[d] || 'off') : '';
  const order = ['', 'off', 'break', 'shoot'];
  r70OffSet(d, order[(order.indexOf(cur) + 1) % order.length]);
  playTick(); renderView(); r70OffPanel(true);
};
function r70OffGrid(){
  const today = todayStr(), K = r70OffKinds(), start = addDays(today, -7);
  let h = '', d = start;
  const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  // line the first row up with the right weekday
  for(let i = 0; i < dowOf(start); i++) h += '<i></i>';
  for(let n = 0; n < 45; n++){
    const kind = state.daysOff.dates.indexOf(d) >= 0 ? (K[d] || 'off') : (r70ShootOn(d) ? 'shoot' : '');
    const auto = !kind ? '' : state.daysOff.dates.indexOf(d) < 0 ? ' is-auto' : '';
    const dd = Number(d.slice(8, 10));
    h += '<button class="r70-od'+(kind ? ' is-'+kind : '')+auto+(d===today ? ' is-today' : '')+'" data-action="r70OffPick" data-id="'+d+'" title="'+escapeHtml(fmtDateShort(d))+(kind ? ' · '+kind : '')+'">'+
      (dd===1 || n===0 ? '<em>'+monthName(d.slice(0, 7)).slice(0, 3)+'</em>' : '')+dd+'</button>';
    d = addDays(d, 1);
  }
  return '<div class="r70-odow">'+dows.map(function(x){ return '<i>'+x+'</i>'; }).join('')+'</div><div class="r70-ogrid">'+h+'</div>';
}
function r70OffPanel(refreshOnly){
  let v = document.getElementById('r70Off');
  if(refreshOnly && !v) return;
  if(!v){
    v = document.createElement('div'); v.id = 'r70Off'; v.className = 'r70-off';
    document.body.appendChild(v); requestAnimationFrame(function(){ v.classList.add('is-in'); });
  }
  v.innerHTML = '<div class="r70-off-c"><div class="r70-off-h"><b>Days off</b><button data-action="r70OffClose" aria-label="Close">&#10005;</button></div>'+
    '<p class="r70-off-p">Tap a day to mark it, tap again to change it. A marked day holds the streak where it is: no +1, no break. Shooting days you logged count by themselves.</p>'+
    r70OffGrid()+
    '<div class="r70-okey">'+R70_OFF.map(function(k){ return '<span class="is-'+k.id+'"><i></i>'+k.label+'</span>'; }).join('')+'<span class="is-auto"><i></i>From a shoot you logged</span></div>'+
    '<div class="r70-off-f">'+r51Row('A day I spent shooting is a day off', r51Sw(r70P('r70ShootOff', true)!==false, 'r70ShootOff'))+'</div></div>';
}
ACTIONS.r70OffOpen = function(){ r70OffPanel(); };
ACTIONS.r70OffClose = function(){ const v = document.getElementById('r70Off'); if(v){ v.classList.remove('is-in'); setTimeout(function(){ v.remove(); }, 240); } try{ renderView(); }catch(e){} };
ACTIONS.r70ShootOff = function(){ r70Set('r70ShootOff', r70P('r70ShootOff', true)===false); playTick(); r70OffPanel(true); };
document.addEventListener('mousedown', function(e){ const v = document.getElementById('r70Off'); if(v && e.target===v) ACTIONS.r70OffClose(); });
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && document.getElementById('r70Off')) ACTIONS.r70OffClose(); });
// the way in: the streak page, and the lock-in screen
r63Tab = typeof r63Tab==='function' ? (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r70-offb') >= 0) return h;
    const btn = '<button class="r70-offb" data-action="r70OffOpen">&#127796; Days off</button>';
    const put = h.replace(/(<div class="[^"]*r65s[^"]*"[^>]*>)/, function(m0){ return m0+btn; });
    return put!==h ? put : btn+h;
  };
})(r63Tab) : undefined;
renderPreFocusModal = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r70-offb') >= 0) return h;
    return h.replace(/<\/div>\s*$/, function(m0){ return '<div class="r70-prefo"><button class="r70-offb" data-action="r70OffOpen">&#127796; Planning a day off?</button></div>'+m0; });
  };
})(renderPreFocusModal);

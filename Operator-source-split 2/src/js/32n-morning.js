// ============ GOOD MORNING: THE START-UP ============
// After "I'm up", the morning builds itself slowly, one piece at a time, with a quiet line of
// narration typing above it — the time and weather, your note from last night, a line to carry,
// the vision board, today, your goals, yesterday, a few headlines. Then two ways forward:
// Start my morning (life first: teeth, breakfast…) or Clock in (the plan of attack, then Lock in).
// Clock out (Focus / Today) is the other end of the work day.

// ---- a line for the day (chosen by date, so it's the same all day) ----
const MORNING_QUOTES = [
  ['We suffer more often in imagination than in reality.', 'Seneca'],
  ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius'],
  ['Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca'],
  ['How we spend our days is, of course, how we spend our lives.', 'Annie Dillard'],
  ['Amateurs sit and wait for inspiration, the rest of us just get up and go to work.', 'Stephen King'],
  ['Discipline equals freedom.', 'Jocko Willink'],
  ['Be so good they can’t ignore you.', 'Steve Martin'],
  ['Hard choices, easy life. Easy choices, hard life.', 'Jerzy Gregorek'],
  ['Make each day your masterpiece.', 'John Wooden'],
  ['Slow is smooth, and smooth is fast.', 'Navy SEAL saying'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall'],
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['Lost time is never found again.', 'Benjamin Franklin'],
  ['The sun himself is weak when he first rises, and gathers strength and courage as the day gets on.', 'Charles Dickens'],
  ['Write it on your heart that every day is the best day in the year.', 'Ralph Waldo Emerson'],
  ['The best time to plant a tree was twenty years ago. The second best time is now.', 'Proverb'],
  ['Stay hungry. Stay foolish.', 'Steve Jobs'],
  ['Everything is figureoutable.', 'Marie Forleo'],
  ['The obstacle is the way.', 'Ryan Holiday'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
  ['Motivation is what gets you started. Habit is what keeps you going.', 'Jim Ryun'],
  ['You could leave life right now. Let that determine what you do and say and think.', 'Marcus Aurelius']
];
function quoteOfDay(){
  const d = new Date(), start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d - start)/86400000);
  return MORNING_QUOTES[day % MORNING_QUOTES.length];
}
// ---- headlines (through the launcher; hidden when it can't get them) ----
function morningNewsOn(){ return wakeCfg().news!==false; }
async function loadMorningNews(){
  if(!morningNewsOn()) return;
  const today = todayStr();
  if(ui.morningNews && ui.morningNews.date===today && (ui.morningNews.items || ui.morningNews.loading)) return;
  ui.morningNews = {date:today, loading:true, items:null};
  let items = null;
  try{
    const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, 9000);
    const res = await fetch(WAKE_HELPER+'news', {cache:'no-store', signal:ctl.signal}); clearTimeout(tm);
    if(res.ok){
      const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
      const chan = xml.querySelector('channel > title');
      const src = chan ? chan.textContent.replace(/\s*[:\-|].*$/, '').trim() : '';
      items = Array.prototype.slice.call(xml.querySelectorAll('item')).slice(0, 4).map(function(it){
        const t = it.querySelector('title'), l = it.querySelector('link');
        return {title:(t ? t.textContent : '').trim(), link:(l ? l.textContent : '').trim(), src:src};
      }).filter(function(x){ return x.title; });
    }
  }catch(e){}
  ui.morningNews = {date:today, loading:false, items:items && items.length ? items : null};
  if(ui.morningNews.items && ui.wakeMode==='brief' && overlayOpen('wakeOverlay')){
    // it arrived after the page started building: give it its moment instead of popping in
    ui.briefNewsAt = Date.now();
    renderWakeOverlayInto();
  }
}
ACTIONS.openNewsLink = function(el){ const u = el.dataset.url; if(!/^https?:\/\//.test(u||'')) return; helperFetch(WAKE_HELPER+'open?b=default&u='+hexUtf8(u), 3000).then(function(ok){ if(!ok) window.open(u, '_blank'); }); };
// ---- the narration: one line at a time, typed out ----
let briefVoiceTimer = null;
function briefVoiceRun(){
  clearInterval(briefVoiceTimer);
  briefVoiceTimer = setInterval(function(){
    const el = document.getElementById('brVoice');
    if(!el || ui.wakeMode!=='brief' || !overlayOpen('wakeOverlay')){ if(!overlayOpen('wakeOverlay')) clearInterval(briefVoiceTimer); return; }
    const lines = ui.briefLines || [], t = Date.now() - (ui.briefT0||0);
    let cur = null; lines.forEach(function(l){ if(t >= l.at) cur = l; });
    const txt = cur ? (ui.briefSkipped ? cur.text : cur.text.slice(0, Math.max(0, Math.floor((t - cur.at)/32)))) : '';
    if(el.textContent!==txt) el.textContent = txt;
    const wrap = el.parentNode; if(wrap) wrap.classList.toggle('is-typing', !!cur && txt.length < cur.text.length);
    // as the narration reaches each piece, bring it into view if it's below the fold
    const idx = cur ? lines.indexOf(cur) : -1;
    if(idx>0 && idx!==ui.briefLineSeen && !ui.briefSkipped){
      ui.briefLineSeen = idx;
      const target = document.querySelector('#wakeContent .br-p[data-k="'+(idx-1)+'"]');
      if(target) setTimeout(function(){ target.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 400);
    }
  }, 32);
}
ACTIONS.briefSkip = function(){ ui.wakeIntroDone = true; ui.briefSkipped = true; renderWakeOverlayInto(); };

// ---- Clock in: the plan of attack, then Lock in ----
function clockIn(){
  const m = state.modes.active;
  if(m && (m.morning || (m.type==='offtime' && !m.sleep))) finishActiveMode(true);
  if(typeof applyNightPlanAuto==='function') applyNightPlanAuto();
  ui.view = 'today'; renderView();
  ui.planReveal = {at:Date.now()};
  showOverlay('planOverlay'); renderPlanRevealInto();
  playStep(0); setTimeout(function(){ playStep(2); }, 260); setTimeout(function(){ playStep(4); }, 520);
}
ACTIONS.clockIn = function(){ clockIn(); };
ACTIONS.closePlanReveal = function(){ ui.planReveal = null; hideOverlay('planOverlay'); renderView(); };
ACTIONS.planLockIn = function(el, e, id){ ui.planReveal = null; hideOverlay('planOverlay'); if(id) setNextUp(id); renderView(); openLockInChooser(); };
function renderPlanReveal(){
  if(!ui.planReveal) return '';
  const plan = todaysPlan().filter(function(t){ return t.status!=='done'; }).slice(0, 8), first = plan[0];
  const today = todayStr();
  const events = state.calendar.events.filter(function(e){ return e.date===today; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const deadlines = state.tasks.items.filter(function(t){ return t.deadline===today && t.status!=='done'; });
  const line = plan.length ? (plan.length===1 ? 'One thing today.' : plan.length+' things today.')+' First up: '+first.title+'.' : 'Nothing planned yet. Pick your first move.';
  return '<div class="pr">'+
    '<div class="pr-top"><span class="pr-badge">&#128339; Clocked in</span><span class="pr-time">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</span>'+
      '<button class="wd-close" data-action="closePlanReveal" title="Close">&#10005;</button></div>'+
    '<div class="pr-inner">'+
      '<div class="pr-k">Plan of attack</div>'+
      '<h2 class="pr-line">'+escapeHtml(line)+'</h2>'+
      (plan.length ? '<ol class="pr-list">'+plan.map(function(t, i){ return '<li class="pr-row'+(i===0?' is-first':'')+'" style="animation-delay:'+(500 + i*220)+'ms"><span class="wd-num">'+String(i+1).padStart(2,'0')+'</span>'+priorityTag(t.priority)+'<span class="pr-t">'+escapeHtml(t.title)+'</span>'+(t.deadline===today ? '<span class="pr-due">due today</span>' : '')+'</li>'; }).join('')+'</ol>' : '')+
      ((events.length || deadlines.length) ? '<div class="pr-cal" style="animation-delay:'+(600 + plan.length*220)+'ms">'+events.map(function(e){ return '<span><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b> '+escapeHtml(e.title)+'</span>'; }).join('')+'</div>' : '')+
      '<div class="pr-cta" style="animation-delay:'+(800 + plan.length*220)+'ms">'+
        (first ? '<button class="ls-go pr-go" data-action="planLockIn" data-id="'+first.id+'"><span class="ls-go-ring"></span><span class="ls-go-i">&#128274;</span><b>LOCK IN</b></button><div class="ls-go-sub">on &ldquo;'+escapeHtml(first.title)+'&rdquo;</div>'
          : '<button class="ls-go pr-go" data-action="planLockIn"><span class="ls-go-ring"></span><span class="ls-go-i">&#128274;</span><b>LOCK IN</b></button>')+
        '<button class="pr-later" data-action="closePlanReveal">Not yet</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderPlanRevealInto(){ const el = document.getElementById('planContent'); if(el) morphInto(el, renderPlanReveal()); }
registerModal('planOverlay', renderPlanRevealInto);

// ---- Clock out: done working for the day ----
function clockOutFlash(){
  const d = document.createElement('div');
  d.className = 'lock-flash is-out is-clock';
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">&#127937; Clocked out</div><div class="lf-t">'+fmtHours(deepWorkMinutesTodayLive())+' of deep work today</div>';
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 2100);
}
ACTIONS.clockOut = function(){
  if(state.focus.activeSession){ showToast('Lock out of your session first.', {icon:'&#128274;'}); return; }
  const prev = state.modes.active ? Object.assign({}, state.modes.active) : null;
  startMode('offtime', {clockedOut:true, note:'Clocked out'});
  ui.undoMode = {prev:prev, at:Date.now()};
  playLockOut(); clockOutFlash();
  showToast('Done for the day.', {icon:'&#127937;', actionLabel:'Undo', actionAction:'undoQuickMode', duration:6000});
};

// the vision board fits itself once its entrance has played (it measures wrong while scaled)
document.addEventListener('animationend', function(e){ if(e.target && e.target.classList && (e.target.classList.contains('br-vision') || e.target.classList.contains('mm-vision'))) fitStaticBoards(e.target); });

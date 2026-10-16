// ============ ROUND 40 ============

// ---- Personal → You: the card turns over cleanly ----
// The 3D flip blanked out halfway and the back spilled out of the card. Now it turns edge-on, swaps
// faces, and opens back out: the same box both sides, nothing disappears.
ACTIONS.ycFlip = function(el){
  const c = el && el.closest('.ycf'), inn = c && c.querySelector('.ycf-in');
  ui.ycFlip = !ui.ycFlip; playTick();
  if(!c || !inn){ renderView(); return; }
  if(inn._t) clearTimeout(inn._t);
  inn.classList.remove('is-turn-in'); inn.classList.add('is-turn-out');
  inn._t = setTimeout(function(){
    c.classList.toggle('is-flipped', !!ui.ycFlip);
    inn.classList.remove('is-turn-out'); void inn.offsetWidth; inn.classList.add('is-turn-in');
    inn._t = setTimeout(function(){ inn.classList.remove('is-turn-in'); }, 220);
  }, 170);
};
// ---- Discipline: the trend arrow sat in the label and wrapped onto its own line ("▲" between
// Consistency and Action). The number carries it now: green when it's climbing, red when it's slipping ----
renderYouTab = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/ <em class="you-tr (is-up|is-down)" title="([^"]*)">[^<]*<\/em>(<\/span><i>[\s\S]*?<\/i>)<b>/g, function(m0, cls, t, mid){
      return mid+'<b class="you-v-'+(cls==='is-up' ? 'up' : 'down')+'" title="'+t+'">';
    });
  };
})(renderYouTab);

// ---- client cards: one-off deliverables show (open ones to tick off, the last few done ones faded), and
// no "Next step" row ----
clientDelivRowsHtml = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    const ones = arr(c.deliverables).filter(function(d){ return !d.recurring; });
    if(!ones.length) return h;
    const open = ones.filter(function(d){ return d.status!=='done'; }).sort(function(a, b){ return (a.dueDate || '9999').localeCompare(b.dueDate || '9999'); });
    const done = ones.filter(function(d){ return d.status==='done'; }).sort(function(a, b){ return (b.completedAt || '').localeCompare(a.completedAt || ''); }).slice(0, 2);
    const row = function(d){
      const late = d.status!=='done' && d.dueDate && d.dueDate < todayStr();
      return '<div class="cc2-deliv cc2-one'+(d.status==='done' ? ' is-done' : '')+(late ? ' is-late' : '')+'" data-key="dv1-'+c.id+'-'+d.id+'">'+
        '<span class="cc2-deliv-title">'+escapeHtml(d.title || 'Deliverable')+'<small class="cc2-deliv-mo">One-off'+(d.dueDate ? ' &middot; '+(late ? 'was due ' : 'due ')+fmtDateShort(d.dueDate) : '')+(d.status==='done' && d.completedAt ? ' &middot; done '+fmtDateShort(d.completedAt) : '')+'</small></span>'+
        '<button class="cc2-one-ck'+(d.status==='done' ? ' is-on' : '')+'" data-action="oneOffToggle" data-client="'+c.id+'" data-id="'+d.id+'" title="'+(d.status==='done' ? 'Done. Tap to undo' : 'Mark it done')+'">'+(d.status==='done' ? '&#10003;' : '')+'</button>'+
      '</div>';
    };
    const rows = open.concat(done).map(row).join('');
    return h ? h.replace(/<\/div>$/, rows+'</div>') : '<div class="cc2-delivs">'+rows+'</div>';
  };
})(clientDelivRowsHtml);
ACTIONS.oneOffToggle = function(el){
  const c = arr(state.business.clients).find(function(x){ return x.id===el.dataset.client; }); if(!c) return;
  const d = arr(c.deliverables).find(function(x){ return x.id===el.dataset.id; }); if(!d) return;
  const t = d.linkedTaskId ? state.tasks.items.find(function(x){ return x.id===d.linkedTaskId; }) : null;
  if(t && t.master && t.master.kind==='dvw'){ if(d.status==='done') dvwUndo(t); else dvwDone(t); return; }
  if(d.status==='done'){ d.status = 'pending'; d.completedAt = null; } else { d.status = 'done'; d.completedAt = todayStr(); playTaskComplete(); }
  persist('business'); if(typeof masterTasksSync==='function') masterTasksSync(); renderView();
};
clientNextHtml = function(){ return ''; };

// ---- the + on Focus → Tasks: no "A client deliverable" (they're made for you from each client) ----
focusAddMenu = (function(base){
  return function(){ return base.apply(this, arguments).filter(function(x){ return !(x && /A client deliverable/.test(x[1])); }); };
})(focusAddMenu);

// ---- work mode and the clock-out pages: a deliverable task says whose and what ("Brothers Mechanical:
// 4 reels, week 1"), not "16 Reels 1/4" ----
function taskNiceTitle(t){
  if(!t || !t.master || t.master.kind!=='dvw' || typeof dvwView!=='function') return t ? t.title : '';
  const v = dvwView(t); if(!v) return t.title;
  return v.x.oneOff ? v.who+': '+v.name : v.who+': '+v.pieces+', week '+v.x.k;
}
function niceTitlePairs(){
  return state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dvw' && t.title; }).map(function(t){ return [t.title, taskNiceTitle(t)]; })
    .filter(function(p){ return p[1] && p[1]!==p[0]; }).sort(function(a, b){ return b[0].length - a[0].length; });
}
function niceTitlesHtml(h){
  if(typeof h!=='string' || !h) return h;
  niceTitlePairs().forEach(function(p){ const a = escapeHtml(p[0]); if(h.indexOf(a) >= 0) h = h.split(a).join(escapeHtml(p[1])); });
  return h;
}
function niceTitlesIn(root){
  if(!root) return;
  const pairs = niceTitlePairs(); if(!pairs.length) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while((n = w.nextNode())){
    let v = n.nodeValue; if(!v || v.length < 3) continue;
    pairs.forEach(function(p){ if(v.indexOf(p[0]) >= 0 && v.indexOf(p[1]) < 0) v = v.split(p[0]).join(p[1]); });
    if(v!==n.nodeValue) n.nodeValue = v;
  }
}
const NICE_SPOTS = '#planOverlay, #lockSeqOverlay, #windOverlay, #recapOverlay, #stopFocusOverlay, #timesUpOverlay, #viewRoot .np, #viewRoot .rest-full';
function niceTitlesSweep(){ document.querySelectorAll(NICE_SPOTS).forEach(function(el){ if(!el.classList.contains('hidden')) niceTitlesIn(el); }); }
['renderPlanRevealInto', 'renderLockSeqInto', 'renderRecapInto', 'renderStopFocusModalInto'].forEach(function(k){
  if(typeof window[k]!=='function') return;
  const base = window[k];
  window[k] = function(){ const r = base.apply(this, arguments); try{ niceTitlesSweep(); }catch(e){} return r; };
});
windHtml = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(windHtml);
renderLockedMinimal = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderLockedMinimal);
renderFocusMinimal = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderFocusMinimal);
renderWeekendOffView = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderWeekendOffView);
afterRenderHooks.push(function(){ try{ niceTitlesSweep(); }catch(e){} });
setInterval(function(){ try{ niceTitlesSweep(); }catch(e){} }, 1500);

// ---- the lock-out screen, rebuilt ----
// It was a long list nobody read. Now it's one screen: how long you've been at it, one reason you're
// doing this (from your own "why"), a line about working hard, what's left, and the way out takes a
// press-and-hold (the friction), not a click. "Keep going" is the big button; "+10 min" for one more push.
const LOCKOUT_QUOTES = [
  ['Work like there is someone working twenty-four hours a day to take it all away from you.', 'Mark Cuban'],
  ['The difference between ordinary and extraordinary is that little extra.', 'Jimmy Johnson'],
  ['Don’t stop when you’re tired. Stop when you’re done.', 'David Goggins'],
  ['Hard work beats talent when talent doesn’t work hard.', 'Tim Notke'],
  ['The dream is free. The hustle is sold separately.', ''],
  ['You don’t get what you wish for. You get what you work for.', ''],
  ['When you think you’re done, you’re only at 40% of what your body is capable of.', 'David Goggins'],
  ['Success isn’t owed. It’s leased, and rent is due every day.', 'Rory Vaden'],
  ['Discipline is doing what needs to be done, even if you don’t want to do it.', ''],
  ['The last ten minutes are where the people who win separate from the people who almost did.', ''],
  ['Nobody cares. Work harder.', 'Cameron Hanes'],
  ['Great things are done by a series of small things brought together.', 'Vincent van Gogh'],
  ['If it were easy, everyone would do it.', ''],
  ['Pain is temporary. Quitting lasts forever.', 'Lance Armstrong'],
  ['Max out the day. Tomorrow you’ll be glad you did.', '']
];
function lockoutPick(list, key){ ui.loPick = ui.loPick || {}; if(ui.loPick[key]==null || ui.loPick[key] >= list.length) ui.loPick[key] = Math.floor(Math.random()*Math.max(1, list.length)); return list[ui.loPick[key]]; }
renderStopFocusModal = function(){
  const as = state.focus.activeSession; if(!as) return '';
  const mins = Math.max(0, Math.round((Date.now() - as.startedAt)/60000) - Math.round(arr(as.breaks).reduce(function(a, b){ return a + Math.max(0, (b.endedAt || Date.now()) - (b.startedAt || Date.now())); }, 0)/60000));
  const toward = arr(state.focus.motivations && state.focus.motivations.toward), away = arr(state.focus.motivations && state.focus.motivations.away);
  const why = toward.length ? lockoutPick(toward, 'why') : null, avoid = away.length ? lockoutPick(away, 'avoid') : null;
  const q = lockoutPick(LOCKOUT_QUOTES, 'q');
  const left = state.tasks.items.filter(function(t){ return t.status==='today' && !(typeof isOngoingDoneToday==='function' && isOngoingDoneToday(t)); });
  const done = arr(as.completedTasks).length, dw = typeof deepWorkMinutesTodayLive==='function' ? deepWorkMinutesTodayLive() : 0, target = state.standards.deepWorkTargetMinutes || 180;
  const next = left[0];
  return '<div class="lo">'+
    '<div class="lo-k">&#128274; Locking out?</div>'+
    '<div class="lo-time"><b>'+fmtDurationLabel(mins)+'</b><span>this session'+(done ? ' &middot; '+done+' done' : '')+'</span></div>'+
    '<div class="lo-bar"><i style="width:'+Math.min(100, dw/target*100).toFixed(1)+'%"></i></div>'+
    '<div class="lo-day">'+fmtDurationLabel(dw)+' of '+fmtDurationLabel(target)+' today'+(dw >= target ? ' &middot; target hit' : ' &middot; '+fmtDurationLabel(target - dw)+' to go')+'</div>'+
    (why || avoid ? '<div class="lo-why"><small>Remember why</small>'+(why ? '<b>'+escapeHtml(why.text)+'</b>' : '')+(avoid ? '<span>Not: '+escapeHtml(avoid.text)+'</span>' : '')+'</div>' : '')+
    '<figure class="lo-q"><blockquote>'+escapeHtml(q[0])+'</blockquote>'+(q[1] ? '<figcaption>'+escapeHtml(q[1])+'</figcaption>' : '')+'</figure>'+
    (left.length ? '<div class="lo-left">'+left.length+' left today'+(next ? ' &middot; next: <b>'+escapeHtml(taskNiceTitle(next))+'</b>' : '')+'</div>' : '<div class="lo-left is-clear">&#10003; Today’s list is clear.</div>')+
    '<div class="lo-btns"><button class="lo-go" data-action="cancelStopFocus">Keep going</button><button class="lo-more" data-action="lockoutMore">+10 min</button></div>'+
    '<button class="lo-hold" id="loHold" title="Press and hold to lock out"><i></i><span>Hold to lock out</span></button>'+
  '</div>';
};
openStopFocus = (function(base){
  return function(){ ui.loPick = null; const o = document.getElementById('stopFocusOverlay'); if(o) o.classList.add('lo-ov'); return base.apply(this, arguments); };
})(openStopFocus);
ACTIONS.lockoutMore = function(){
  const as = state.focus.activeSession; if(!as) return;
  as.plannedMinutes = Math.round((Date.now() - as.startedAt)/60000) + 10; persist('focus');
  closeStopFocus(); playTick(); renderView();
  showToast('Ten more minutes. Then you can go.', {icon:'&#9201;'});
};
(function(){
  let t0 = 0, raf = 0, btn = null;
  const HOLD = 1600;
  const stop = function(){ cancelAnimationFrame(raf); if(btn){ btn.classList.remove('is-holding'); btn.style.setProperty('--p', 0); } btn = null; t0 = 0; };
  const tick = function(){
    if(!btn) return;
    const p = Math.min(1, (Date.now() - t0)/HOLD); btn.style.setProperty('--p', p);
    if(p >= 1){ stop(); closeStopFocus(); reallyConfirmStopFocus(); return; }
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('pointerdown', function(e){ const b = e.target.closest && e.target.closest('#loHold'); if(!b) return; e.preventDefault(); btn = b; t0 = Date.now(); b.classList.add('is-holding'); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(k){ document.addEventListener(k, function(e){ if(btn && (k!=='pointerleave' || e.target===btn)) stop(); }, true); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && overlayOpen('stopFocusOverlay')){ closeStopFocus(); } });
})();

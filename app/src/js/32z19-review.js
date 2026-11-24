// ============ WORK TO REVIEW: ONE NOTICE, THE SYSTEM WAY (round 30) ============
// Sessions that start on their own (auto lock-in) need a quick look in the recap: was that really work,
// and on what. They used to come up one at a time; now it's one line in the bell, "Review 3 sessions",
// and a SYSTEM window (the same look as leveling up) that pops up in the middle with a sound, counts
// down, and closes itself after 30 seconds if you leave it. It comes back when there's more to review,
// or a few hours later if it's still waiting. Never while you're locked in or asleep.

function reviewPending(){
  const t = todayStr(), y = addDays(t, -1);
  const on = function(d){ return typeof sessionsOn==='function' ? sessionsOn(d).filter(function(s){ return s.auto && !s.reviewed; }).length : 0; };
  const ny = on(y), nt = on(t);
  return {n:ny + nt, date:ny ? y : t};
}
// the bell: one line for all of them
notifList = (function(base){
  return function(){
    const out = base.apply(this, arguments), r = reviewPending();
    if(r.n){
      const key = 'review:'+todayStr()+':'+r.n, dis = notifDismissed();
      if(dis[key]!==todayStr()) out.unshift({key:key, kind:'review', level:'warn', icon:'&#128202;', title:'You need to review '+r.n+' session'+(r.n===1 ? '' : 's'), sub:'Work that started on its own. Keep it, or put it on a task.', act:{a:'openReview'}, sort:0});
    }
    return out;
  };
})(notifList);
notifPanelHtml = (function(base){
  return function(list){
    let h = base.apply(this, arguments);
    const items = arr(list).filter(function(n){ return n.kind==='review'; }); if(!items.length) return h;
    const g = '<div class="nt-group"><div class="nt-k">Review</div>'+items.map(function(n){
      return '<div class="nt-item is-'+n.level+'" data-key="np-'+escapeHtml(n.key)+'"><button class="nt-main" data-action="notifOpen" data-id="'+escapeHtml(n.key)+'"><span class="nt-i">'+n.icon+'</span><span class="nt-txt"><span class="nt-t">'+escapeHtml(n.title)+'</span><span class="nt-s">'+escapeHtml(n.sub)+'</span></span></button><button class="nt-dismiss" data-action="notifDismiss" data-id="'+escapeHtml(n.key)+'" title="Hide for today">&#10005;</button></div>';
    }).join('')+'</div>';
    // (right under the header; and no "all clear" when this is the only thing)
    h = h.replace(/<div class="nt-empty">[\s\S]*$/, '');
    const at = h.indexOf('</div>', h.indexOf('nt-head')) + 6;
    return h.slice(0, at)+g+h.slice(at);
  };
})(notifPanelHtml);
ACTIONS.notifOpen = (function(base){
  return function(el, e, key){
    if(/^review:/.test(String(key||''))){ ui.notifOpen = false; const p = document.getElementById('notifPanel'); if(p) p.hidden = true; ACTIONS.openReview(); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.notifOpen);
ACTIONS.openReview = function(){
  ACTIONS.sysRevClose();
  const r = reviewPending();
  if(r.date!==todayStr() && ACTIONS.openRecapYesterday) ACTIONS.openRecapYesterday(); else if(ACTIONS.openRecapToday) ACTIONS.openRecapToday(); else if(typeof openDayRecap==='function') openDayRecap();
};

// ---- the SYSTEM window ----
function sysRevSound(){
  if(typeof tone!=='function') return;
  [784, 988].forEach(function(f, i){ setTimeout(function(){ tone([f], 0.16, 0.16); }, i*120); });
  setTimeout(function(){ tone([659, 988, 1319], 0.5, 0.14); }, 280);
}
function sysRevShow(n){
  const old = document.getElementById('sysRev'); if(old) old.remove();
  const d = document.createElement('div'); d.id = 'sysRev'; d.className = 'sys-win sys-rev';
  d.innerHTML = '<div class="sys-card"><div class="sys-k">[ SYSTEM ]</div>'+
    '<div class="sys-title">Review your work</div>'+
    '<div class="sys-sub">'+n+' session'+(n===1 ? '' : 's')+' started on '+(n===1 ? 'its' : 'their')+' own. Confirm '+(n===1 ? 'it' : 'them')+' so the record stays honest.</div>'+
    '<div class="sys-rev-n"><b>'+n+'</b><span>to review</span></div>'+
    '<div class="sys-rev-acts"><button class="sys-ok sys-rev-go" data-action="openReview">Review now</button><button class="sys-ok sys-rev-later" data-action="sysRevClose">Later</button></div>'+
    '<div class="sys-rev-time"><i id="sysRevBar"></i></div></div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add('is-in'); const b = document.getElementById('sysRevBar'); if(b){ b.style.transition = 'width 30s linear'; b.style.width = '0%'; } });
  sysRevSound();
  clearTimeout(sysRevShow._t); sysRevShow._t = setTimeout(function(){ ACTIONS.sysRevClose(); }, 30000);
}
ACTIONS.sysRevClose = function(){ clearTimeout(sysRevShow._t); const d = document.getElementById('sysRev'); if(!d) return; d.classList.remove('is-in'); d.classList.add('is-out'); setTimeout(function(){ if(d.parentNode) d.remove(); }, 320); };
// when it comes up: something new to review, or still waiting a few hours later
function sysRevDue(){
  if(!state || !state.focus) return 0;
  const r = reviewPending(); if(!r.n) return 0;
  const m = state.modes && state.modes.active;
  if(state.focus.activeSession || (m && m.sleep) || document.hidden) return 0;
  if(document.querySelector('.overlay:not(.hidden)') || document.getElementById('sysWin') || document.getElementById('sysRev') || (typeof opfIsOpen==='function' && opfIsOpen())) return 0;
  const h = new Date().getHours(); if(h < 7 || h >= 23) return 0;
  const s = state.focus.revPop || {};
  if(r.n > (s.n||0) && Date.now() - (s.at||0) > 20*60000) return r.n;
  if(Date.now() - (s.at||0) > 3*3600000) return r.n;
  return 0;
}
function sysRevTick(){ const n = sysRevDue(); if(!n) return; state.focus.revPop = {at:Date.now(), n:n}; persist('focus'); sysRevShow(n); }
// (it replaces the old one-by-one notes; the evening "recap is ready" stays, once)
maybeShowRecap = function(){
  if(state.focus.activeSession || document.querySelector('.overlay:not(.hidden)')) return;
  const seen = state.focus.recapSeen || {}, today = todayStr();
  const rt = (state.settings.appTracking && state.settings.appTracking.recapTime) || '21:30';
  if(!seen[today] && !recapNudged[today] && nowHM() >= rt && sessionsOn(today).length){
    recapNudged[today] = true;
    showToast('Your day recap is ready.', {icon:'&#128202;', actionLabel:'Open', actionAction:'openRecapToday', duration:15000});
  }
};
setInterval(function(){ try{ sysRevTick(); }catch(e){} }, 60000);
setTimeout(function(){ try{ sysRevTick(); }catch(e){} }, 9000);

// ============ ROUND 69: the talk key's permission, when macOS holds an old one ============
// A switch can show on in System Settings and still do nothing: it belongs to an older copy of Operator. Check in the
// Mac app now clears those old entries and asks again (main.js op:talkCheck); this says so, plainly, in the panel.
r62CheckHtml = (function(base){
  return function(){
    const html = base.apply(this, arguments), c = R62.check, h = c && c.h || {};
    if(!h.reset) return html;
    const line = '<div class="r62-ck-f r69-reset">Cleared Operator’s old '+escapeHtml(h.reset)+' switch (it belonged to an older copy). Turn Operator on again in the window that opened, then <button class="btn btn-sm" data-action="r62Relaunch">Restart Operator</button></div>';
    return html.replace('<div class="r62-ck">', '<div class="r62-ck">'+line);
  };
})(r62CheckHtml);

// ---------------- the iPhone card: scan, and it's paired ----------------
// A QR code of the address with the code in it: point the iPhone's camera at it, tap, and Operator opens already
// paired. (The code stays in the address, so the Home Screen icon is paired too.)
function r69PhoneLink(I){ return I && I.url && I.code ? I.url.replace(/\/?$/, '/')+'#c='+encodeURIComponent(I.code) : ''; }
function r69Qr(text){ try{ const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({cellSize:4, margin:2, scalable:true}); }catch(e){ return ''; } }
r68PhoneCardHtml = function(){
  if(!window.operatorApp || !operatorApp.phoneInfo) return '';
  if(!ui.r68Phone){ ui.r68Phone = {loading:true}; operatorApp.phoneInfo().then(function(i){ ui.r68Phone = i || {}; if(document.getElementById('r68Phone')) renderView(); }); }
  const I = ui.r68Phone, link = r69PhoneLink(I);
  const body = !I.on ? '' : !I.url ? '<div class="r68-ph-f"><span>Connect this Mac to Wi-Fi to use it from your iPhone.</span></div>' :
    '<div class="r69-ph">'+
      '<div class="r69-qr">'+r69Qr(link)+'</div>'+
      '<ol class="r69-steps"><li>Open the <b>Camera</b> on your iPhone and point it here. Tap the link that pops up.</li>'+
        '<li>In Safari: <b>Share → Add to Home Screen</b>. Now it’s an app icon.</li>'+
        '<li>Open it any time your phone is on the same Wi-Fi as this Mac, with Operator running.</li></ol>'+
    '</div>'+
    '<div class="r68-ph-f"><span>Or type <b>'+escapeHtml(I.url)+'</b> · code <b class="r68-code">'+escapeHtml(I.code || '')+'</b></span><button class="btn btn-ghost btn-sm" data-action="r68PhoneCode">New code</button></div>';
  return '<div class="card section op-settings r68-ph" id="r68Phone"><div class="section-title">&#128241; Your iPhone</div>'+
    '<div class="r45-row r46-line"><span>Use Operator from your iPhone</span><button class="r45-sw'+(I.on ? ' on' : '')+'" data-action="r68PhoneToggle"><span></span></button></div>'+body+
  '</div>';
};

// ---------------- a break that runs past 2 hours is you clocking out ----------------
// (a "break" of 14 hours is sleep, not a break) Once it passes 2 hours, the session ends where the break began: the time
// before counts as locked in, the break comes off, and the rest is off the clock. Works out the moment the page wakes
// up after the Mac has slept, too. state.profile.longBreakMins changes the 2 hours.
function r69LongBreakMins(){ const m = Number(state.profile && state.profile.longBreakMins); return m >= 30 ? m : 120; }
function r69LongBreakCheck(){
  try{
    const lim = r69LongBreakMins()*60000, now = Date.now(), as = state.focus.activeSession, m = state.modes && state.modes.active;
    if(as && as.onBreak){
      const last = arr(as.breaks)[arr(as.breaks).length - 1] || {};
      const bs = as.breakStartedAt || last.start;
      if(!bs || now - bs < lim) return false;
      // the break comes off; the session ends when it began
      if(arr(as.breaks).length) as.breaks.pop();
      as.onBreak = false; as.breakEndsAt = null; as.breakOverAt = null; as.breakNudgeAt = null; as.breakStartedAt = null;
      if(m && m.type==='break') state.modes.active = null;
      ui.pausedTaskId = null; ui.pendingCurrentTaskId = null;
      ui.currentTaskId = null;
      const real = Date.now; Date.now = function(){ return bs; };
      try{ endFocusSessionForSwitch(); } finally { Date.now = real; }
      state.modes.history.push({id:uid(), type:'offtime', date:todayStr(new Date(bs)), startedAt:bs, endedAt:now, minutes:Math.max(1, Math.round((now - bs)/60000)), note:'Long break: clocked out'});
      persist('focus'); persist('modes');
      showToast('That break went past '+fmtDurationLabel(r69LongBreakMins())+', so you clocked out at '+fmtTimeShort(bs)+'.', {icon:'&#127769;', duration:9000});
      try{ renderView(); }catch(e){}
      return true;
    }
    if(m && m.type==='break' && !as && m.startedAt && now - m.startedAt >= lim){
      // a break on its own (not locked in): it becomes off-the-clock time
      state.modes.active = null;
      state.modes.history.push({id:uid(), type:'offtime', date:todayStr(new Date(m.startedAt)), startedAt:m.startedAt, endedAt:now, minutes:Math.max(1, Math.round((now - m.startedAt)/60000)), note:'Long break: clocked out'});
      persist('modes'); try{ renderView(); }catch(e){}
      return true;
    }
  }catch(e){}
  return false;
}
setInterval(r69LongBreakCheck, 60000);
setTimeout(r69LongBreakCheck, 4000);
document.addEventListener('visibilitychange', function(){ if(!document.hidden) r69LongBreakCheck(); });

// ---------------- the phone: breaks, and whether you're really working ----------------
function r69TodayMins(){
  const t = todayStr(); let ms = 0;
  arr(state.focus.sessions).forEach(function(s){ if(s.date===t) ms += (s.endedAt - s.startedAt); });
  const as = state.focus.activeSession; if(as) ms += as.onBreak ? (as.frozenElapsedMs || 0) : Date.now() - as.startedAt;
  return Math.max(0, Math.round(ms/60000));
}
function r69NowApp(){
  try{ const L = arr(state.appActivity && state.appActivity.todayIntervals), x = L[L.length - 1]; return x && Date.now() - x.end < 180000 ? String(x.app || '') : ''; }catch(e){ return ''; }
}
(function(){
  if(!window.operatorPage || !window.operatorPage.phoneState) return;
  const P = window.operatorPage;
  const ext = {
    phoneState: function(){
      r69LongBreakCheck();
      const s = Object.assign({}, P.phoneState()), as = state.focus.activeSession, m = state.modes && state.modes.active;
      s.onBreak = !!((as && as.onBreak) || (m && m.type==='break'));
      const back = as && as.onBreak ? as.breakEndsAt : (m && m.type==='break' ? m.endsAt : null);
      s.breakBack = back ? fmtTimeShort(back) : '';
      s.today = fmtDurationLabel(Math.max(0, r69TodayMins())) ;
      s.todayMins = r69TodayMins();
      s.app = r69NowApp();
      return s;
    },
    // minutes > 0 starts a break; 0 ends it
    phoneBreak: function(min){
      min = Math.round(Number(min) || 0);
      const as = state.focus.activeSession, m = state.modes && state.modes.active;
      if(min > 0){ try{ opRunTool('take_break', {minutes:min}); }catch(e){} }
      else if(as && as.onBreak) endBreakModeFromFocus();
      else if(m && m.type==='break') endMode();
      try{ renderView(); }catch(e){}
      return ext.phoneState();
    }
  };
  window.operatorPage = Object.freeze(Object.assign({}, P, ext));
})();

// ---------------- Op locks you out (no holding a button) ----------------
// lock_out used to open the "Hold to lock out" sheet and wait for you; asked, Op now does it. Clocking out while
// locked in locks out first. (Op still only does the big moves on a plain yes: see his rules.)
function r69LockOutNow(){
  const s = state.focus.activeSession; if(!s) return 0;
  try{ closeStopFocus(); }catch(e){} try{ closeFinalStopConfirm(); }catch(e){}
  if(s.onBreak) endBreakModeFromFocus();
  const mins = Math.max(1, Math.round((Date.now() - state.focus.activeSession.startedAt)/60000));
  reallyConfirmStopFocus();
  return mins;
}
opRunTool = (function(base){
  return function(name, x){
    if(name==='lock_out'){
      if(!state.focus.activeSession) return 'he isn’t locked in';
      const m = r69LockOutNow();
      return 'locked out: '+fmtDurationLabel(m)+' this session';
    }
    if(name==='clock' && x && x.action!=='in' && state.focus.activeSession){
      r69LockOutNow();
      const r = base.apply(this, arguments);
      return 'locked out, then '+r;
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
(function(){ const t = OP_TOOLS.find(function(t){ return t.name==='lock_out'; }); if(t) t.description = 'Lock him out of his session right now: it ends and is logged (no sheet, no holding a button).'; })();
(function(){
  if(!window.operatorPage || !window.operatorPage.phoneState) return;
  const P = window.operatorPage;
  window.operatorPage = Object.freeze(Object.assign({}, P, {
    phoneLockIn: function(){ P.phoneLockIn(); return P.phoneState(); },
    phoneLockOut: function(){ r69LockOutNow(); try{ renderView(); }catch(e){} return P.phoneState(); }
  }));
})();

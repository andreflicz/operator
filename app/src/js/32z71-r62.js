// ============ ROUND 62 ============
// The list is ROUND-62-LIST.md. Op: one reply per message (no double sends), every "filed" real, a clean ✕ (no freeze,
// no popping back), a working indicator, a window that opens compact and grows (still resizable), a Check button for the
// talk key that does something. Today: Customize inside the top panel, the Business widget fixed, widgets that match.
// Personal: Goals without the label or the gap, the Journal's tabs on the Personal tab line. Social: no gap.
const R62 = {last:null, queue:null, tool:'', toolAt:0, quiet:false, closedAt:0, openIdx:-1, manual:false, dropped:0, check:null};

// ================= A1. One message, one reply =================
// Three ways a message reached Op twice: the same words sent again a moment later (a second submit, the talk key and the
// mic both finishing), his own reply heard back by the mic and sent as if Andre said it, and a message sent while he was
// still on the last one (it went through half the app before being dropped). Now the same words within 10 seconds go
// once; anything that matches what Op just said (by voice) is ignored; and a message sent while he's busy waits its turn
// and goes as soon as he's free.
function r62Norm(t){ return String(t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function r62Sim(a, b){
  const A = a.split(' ').filter(Boolean), B = b.split(' ').filter(Boolean); if(!A.length || !B.length) return 0;
  const S = new Set(B); let n = 0; A.forEach(function(w){ if(S.has(w)) n++; });
  return n/Math.min(A.length, B.length);
}
function r62IsEcho(n){
  if(AI.typedAt && Date.now() - AI.typedAt < 3000) return false;   // typed: never an echo
  if(n.split(' ').length < 4) return false;
  const L = opChat();
  for(let i = L.length - 1; i >= 0 && i >= L.length - 4; i--){
    const e = L[i]; if(e.r!=='op' || Date.now() - (e.at || 0) > 45000) continue;
    const o = r62Norm(e.t); if(o.indexOf(n) >= 0 || r62Sim(n, o) >= .8) return true;
  }
  return false;
}
aiAsk = (function(base){
  return function(text, cap){
    const t = String(text || '').trim();
    if(!t) return base.apply(this, arguments);
    const n = r62Norm(t), now = Date.now();
    if(R62.last && R62.last.n===n && now - R62.last.at < 10000){ R62.dropped++; return Promise.resolve(); }
    if(r62IsEcho(n)){ R62.dropped++; return Promise.resolve(); }
    R62.quiet = false;   // he's talking to Op again: Op may show
    if(AI.busy){
      // (one waiting message at most: the newest)
      R62.queue = {text:t, cap:cap, n:n};
      try{ opChatLog('me', t); opChatDraw(); }catch(e){}
      return Promise.resolve();
    }
    R62.last = {n:n, at:now};
    const r = base.apply(this, arguments);
    Promise.resolve(r).catch(function(){}).then(r62Next);
    return r;
  };
})(aiAsk);
function r62Next(){
  const q = R62.queue; if(!q || AI.busy) return;
  R62.queue = null; R62.last = null;
  R62.skipMe = q.text;   // (it's already in the chat, where he sent it; don't write it twice)
  const r = aiAsk.call(null, q.text, q.cap);
  setTimeout(function(){ R62.skipMe = null; }, 0);
  return r;
}
setInterval(function(){ if(R62.queue && !AI.busy) r62Next(); }, 300);
// (the same line of his twice in the last few, as the reply and then as the caption, is one line)
opChatLog = (function(base){
  return function(r, t){
    if(r==='me' && R62.skipMe && String(t || '').trim()===R62.skipMe){ R62.skipMe = null; return; }
    if(r==='op'){
      const s = String(t || '').replace(/\s+/g, ' ').trim(), L = opChat();
      for(let i = L.length - 1; i >= 0 && i >= L.length - 6; i--){ const e = L[i]; if(e.r==='op' && e.t===s && Date.now() - (e.at || 0) < 300000) return; }
    }
    return base.apply(this, arguments);
  };
})(opChatLog);

// ================= A2. "Filed" is always true =================
// The old safety net only filed when Op had called no tool at all. If he added a task and then said "and it's in app
// updates", nothing was filed. Now: if his reply says he filed, logged, saved or added something to the updates and no
// filing tool ran in that reply, the app files it (summary + Andre's words), whatever else he did.
const R62_CLAIM = /\b(?:filed|logged|saved|noted|marked|added|put|captured|recorded|dropped)\b[^.?!]{0,60}\b(?:app\s+updates?|the\s+updates?|updates?\s+list|in\s+updates|to\s+updates|dev(?:eloper)?\s+list|feedback)\b|\b(?:it'?s|that'?s|both|all)\s+(?:now\s+)?in\s+(?:the\s+)?(?:app\s+)?updates?\b|\bin\s+app\s+updates\b/i;
const R62_NEG = /\b(?:haven'?t|have not|not yet|didn'?t|did not|won'?t|can'?t|couldn'?t|wasn'?t|should i|want me to|shall i|do you want)\b/i;
function r62FilingTool(T){ return T.tools.some(function(n){ return /suggest_improvement|mark_update|file_updates/.test(n); }) || (T.filed === true); }
aiAsk = (function(base){
  return function(text){
    const t = String(text || '').trim(), n0 = AI.history.length;
    const r = base.apply(this, arguments);
    Promise.resolve(r).then(function(){
      const T = R60.lastTurn, last = AI.history[AI.history.length - 1];
      if(!t || !T || T.text!==t || AI.history.length===n0 || !last || last.role!=='assistant') return;
      const said = String(last.content || '');
      if(!R62_CLAIM.test(said) || r62FilingTool(T)) return;
      const claimLine = said.split(/(?<=[.!?])\s+/).filter(function(s){ return R62_CLAIM.test(s); })[0] || said;
      if(R62_NEG.test(claimLine)) return;
      setTimeout(function(){
        const words = r58IsMeta(t) ? r58Words() : t;
        if(!words || r58UpdateEntries().some(function(e){ return e.text===words || e.said===words; })) return;
        R62.netFiled = (R62.netFiled || 0) + 1;
        r59Summarize(words).then(function(s){ r59File(s || words, s ? words : '', Date.now()); try{ renderView(); }catch(e){} });
      }, 400);
    }).catch(function(){});
    return r;
  };
})(aiAsk);

// ================= A3. ✕ closes cleanly =================
// What froze him: closing stopped the voice, but the turn was still waiting for the voice to finish, which it never did,
// so he stayed "busy" (and any message was dropped) until something else let go. And whatever he said next in that turn
// opened the window again (the ✕ "didn't work"). Now ✕ ends the wait straight away, the rest of that turn is written to
// the chat quietly (no voice, the window stays shut), and a new message goes through as soon as he's free.
ACTIONS.opBubClose = (function(base){
  return function(){
    const speaking = !!(OV.speaking || OV.pending), line = typeof R57!=='undefined' ? R57.lastSaid : '';
    const r = base.apply(this, arguments);
    R62.closedAt = Date.now(); R62.manual = false; R62.openIdx = -1;
    if(AI.busy || speaking){
      R62.quiet = true;
      R59.hush = Date.now() + 90000;
      if(speaking && line) try{ r59ShowLine(line); }catch(e){}
    }
    R59_PENDING.splice(0).forEach(function(it){ it.res(false); });
    const b = document.getElementById('opBub'); if(b) b.classList.remove('is-in', 'is-live');
    return r;
  };
})(ACTIONS.opBubClose);
// (while it's quiet, nothing pops the window back open; it's quiet until the turn is over, or he talks to Op)
opBubShow = (function(base){
  return function(){
    if(R62.quiet){ const b = document.getElementById('opBub'); if(b) return b; const nb = base.apply(this, arguments); if(nb) nb.classList.remove('is-in'); return nb; }
    return base.apply(this, arguments);
  };
})(opBubShow);
setInterval(function(){ if(R62.quiet && !AI.busy && !(OV.speaking || OV.pending) && Date.now() - R62.closedAt > 1500) R62.quiet = false; }, 500);
r54TalkToggle = (function(base){ return function(){ R62.quiet = false; return base.apply(this, arguments); }; })(r54TalkToggle);
// (reaching for Op, the orb, his window, a talk button, ends the quiet; the ✕ itself doesn't)
document.addEventListener('pointerdown', function(e){
  const t = e.target; if(!R62.quiet || !t || !t.closest || t.closest('.op-bub-x')) return;
  if(t.closest('#opBub, #opFull, [id^="op"], [class*="op-orb"], [class*="opOrb"], [data-action^="op"], [data-action*="Talk"], [data-action*="talk"]')) R62.quiet = false;
}, true);

// ================= A4. A working indicator =================
// In the window's top bar while he's at it: "Thinking…", or what he's doing ("Adding a task…"). The Op orb pulses too.
const R62_TOOL_LABEL = {add_task:'Adding a task', complete_task:'Checking it off', suggest_improvement:'Filing it in App updates', mark_update:'Filing it in App updates', file_updates:'Filing them in App updates', add_journal:'Writing in your journal', remember:'Remembering that', forget:'Forgetting that', take_break:'Starting your break', add_event:'Adding it to your calendar', delete_session:'Removing the session'};
opRunTool = (function(base){ return function(name){ R62.tool = R62_TOOL_LABEL[name] || 'Working on it'; R62.toolAt = Date.now(); return base.apply(this, arguments); }; })(opRunTool);
function r62WorkText(){
  if(!AI.busy || OV.speaking || OV.pending) return '';
  if(R62.tool && Date.now() - R62.toolAt < 4000) return R62.tool+'…';
  return 'Thinking…';
}
function r62WorkTick(){
  const b = document.getElementById('opBub'), t = r62WorkText();
  document.body.classList.toggle('r62-busy', !!t);
  if(!b) return;
  const h = b.querySelector('.op-bub-h'); if(!h) return;
  let w = h.querySelector('.r62-work');
  if(!w){ w = document.createElement('span'); w.className = 'r62-work'; w.setAttribute('aria-live', 'polite'); const k = h.querySelector('b'); if(k) k.after(w); else h.prepend(w); }
  if(w.textContent!==t) w.textContent = t;
  w.classList.toggle('is-on', !!t);
  if(!AI.busy && R62.tool && Date.now() - R62.toolAt > 4000) R62.tool = '';
}
setInterval(r62WorkTick, 200);

// ================= A5. Op's window: compact, grows, resizable =================
// It opens small (the last exchange), grows with each new line up to most of the window, and keeps the older chat a
// scroll away. Drag the corner to size it yourself; that size holds until you close it (the width is remembered).
function r62LogFit(b){
  const log = b && b.querySelector('.op-bub-log'); if(!log || !b.classList.contains('is-log')) return;
  if(R62.manual) return;
  const max = Math.round(Math.min(window.innerHeight*0.58, 520)), L = opChat();
  if(R62.openIdx > L.length) R62.openIdx = Math.max(0, L.length - 2);   // (the chat was cleared)
  const ms = log.querySelectorAll('.ocl-m');
  let from = null;
  if(R62.openIdx >= 0 && L.length){
    const keep = Math.max(1, L.length - R62.openIdx), all = Array.prototype.filter.call(ms, function(m){ return !m.classList.contains('ocl-typing'); });
    from = all[Math.max(0, all.length - keep)] || null;
  }
  // (with its day label, when the first line starts a new day)
  if(from && from.previousElementSibling && from.previousElementSibling.classList.contains('ocl-day')) from = from.previousElementSibling;
  let need = 96;
  if(from){ const lr = log.getBoundingClientRect(), fr = from.getBoundingClientRect(); need = Math.ceil(log.scrollHeight - (fr.top - lr.top + log.scrollTop) + 14); }
  else if(!ms.length) need = 96;
  const cur = parseFloat(log.style.height) || 0;
  const h = Math.max(96, Math.min(max, Math.max(need, cur && b.classList.contains('is-in') ? cur : 0)));
  log.style.setProperty('height', h+'px', 'important'); log.style.setProperty('max-height', max+'px', 'important');
  b.classList.add('r62-fit'); b.classList.remove('r58-sized');
  log.scrollTop = log.scrollHeight;
}
r58BubLogSize = function(b){
  const log = b && b.querySelector('.op-bub-log'); if(!log) return;
  if(R62.manual && R62.manualH){ log.style.setProperty('height', R62.manualH+'px', 'important'); log.style.removeProperty('max-height'); b.classList.add('r58-sized'); return; }
  r62LogFit(b);
};
r58BubGrip = function(b){
  let g0 = b && b.querySelector('.op-bub-rs');
  if(!b) return;
  if(!g0){ g0 = document.createElement('span'); g0.className = 'op-bub-rs'; b.appendChild(g0); }
  if(g0.r62) return;
  const g = g0.cloneNode(true); g.r62 = true; g.title = 'Drag to resize'; g0.replaceWith(g);
  g.addEventListener('mousedown', function(e){
    e.preventDefault(); e.stopPropagation();
    const log = b.querySelector('.op-bub-log'), r = b.getBoundingClientRect(), h0 = log ? log.getBoundingClientRect().height : 200, x0 = e.clientX, y0 = e.clientY;
    b.classList.add('is-resizing');
    const mv = function(ev){
      const w = Math.max(340, Math.min(window.innerWidth - 40, r.width + (ev.clientX - x0)));
      const h = Math.max(96, Math.min(window.innerHeight*0.8, h0 - (ev.clientY - y0)));
      R62.manual = true; R62.manualH = Math.round(h);
      state.profile.opBubSize = {w:Math.round(w), h:0};
      b.style.setProperty('width', w+'px', 'important'); r58BubLogSize(b);
    };
    const up = function(){ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); b.classList.remove('is-resizing'); persist('profile'); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
  g.addEventListener('dblclick', function(){ R62.manual = false; state.profile.opBubSize = {w:460, h:0}; persist('profile'); b.style.setProperty('width', '460px', 'important'); r62LogFit(b); });
};
setTimeout(function(){ try{ const s = state.profile.opBubSize; if(s && s.w > 300) { const b = document.getElementById('opBub'); if(b) b.style.setProperty('width', Math.min(window.innerWidth - 32, s.w)+'px', 'important'); } }catch(e){} }, 0);
opBubShow = (function(base){
  return function(){
    const b0 = document.getElementById('opBub'), was = !!(b0 && b0.classList.contains('is-in'));
    const b = base.apply(this, arguments);
    if(b && !was && b.classList.contains('is-in')){
      // (opening: start from the last exchange)
      const L = opChat(); R62.openIdx = Math.max(0, L.length - 2); R62.manual = false;
      const log = b.querySelector('.op-bub-log'); if(log) log.style.removeProperty('height');
      const s = state.profile.opBubSize; if(s && s.w > 300) b.style.setProperty('width', Math.min(window.innerWidth - 32, s.w)+'px', 'important');
    }
    if(b){ r58BubGrip(b); requestAnimationFrame(function(){ r58BubLogSize(b); }); }
    return b;
  };
})(opBubShow);
opChatDraw = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    const b = document.getElementById('opBub'); if(b && b.classList.contains('is-in')) r58BubLogSize(b);
    return r;
  };
})(opChatDraw);

// ================= A6. The talk key anywhere on the Mac: a Check that does something =================
// macOS only lets an app hear keys pressed in other apps once it's on in Privacy & Security → Accessibility and Input
// Monitoring, and only after the app restarts. "Check" now asks macOS (its own prompt the first time), opens the setting
// that's still off, then shows live: Accessibility on or off, whether a key pressed in another app reached Operator, and
// a Restart button.
ACTIONS.r57OpenPrivacy = function(){
  if(!OPAPP) return;
  R62.check = {at:Date.now(), h:null, pane:''};
  const done = function(h){ R62.check.h = h || {}; R62.check.pane = (h && h.opened) || 'Input Monitoring'; showToast('Opened System Settings → Privacy & Security → '+R62.check.pane+'. Turn Operator on there.', {icon:'&#128273;'}); try{ renderView(); }catch(e){} };
  try{
    if(OPAPP.talkCheck) OPAPP.talkCheck().then(done).catch(function(){ done({}); });
    else { if(OPAPP.openPrivacy) OPAPP.openPrivacy(R57.keyHealth && R57.keyHealth.need || 'ListenEvent'); done({}); }
  }catch(e){ done({}); }
  clearInterval(R62.checkT);
  R62.checkT = setInterval(function(){
    if(!R62.check || Date.now() - R62.check.at > 180000 || !OPAPP.talkHealth){ clearInterval(R62.checkT); return; }
    OPAPP.talkHealth().then(function(h){ const was = JSON.stringify(R62.check.h || {}); R62.check.h = Object.assign({}, R62.check.h || {}, h); R57.keyHealth = h; if(JSON.stringify(R62.check.h)!==was && ui.view==='settings') renderView(); }).catch(function(){});
  }, 1500);
};
ACTIONS.r62Relaunch = function(){ try{ if(OPAPP && OPAPP.relaunch){ OPAPP.relaunch(); return; } }catch(e){} showToast('Quit Operator (⌘Q) and open it again.'); };
function r62CheckHtml(){
  const c = R62.check; if(!c) return '';
  const h = c.h || {};
  const acc = h.trusted===false || h.need==='Accessibility' ? false : (h.trusted===true || (h.hooked && h.need!=='Accessibility') ? true : null);
  const heard = !!(h.last && h.last > c.at + 300);
  const row = function(ok, k, v){ return '<div class="r62-ck-r"><span class="r62-ck-i '+(ok===true ? 'is-ok' : ok===false ? 'is-no' : 'is-wait')+'">'+(ok===true ? '&#10003;' : ok===false ? '&#10005;' : '&#8226;')+'</span><b>'+k+'</b><span>'+v+'</span></div>'; };
  return '<div class="r62-ck">'+
    row(acc, 'Accessibility', acc===true ? 'On' : acc===false ? 'Off: turn Operator on in the window that opened' : 'Checking…')+
    row(heard ? true : null, 'Keys from other apps', heard ? 'Operator hears them' : 'Press your talk key in another app to test')+
    (heard ? '' : '<div class="r62-ck-f">Turned it on already? macOS needs Operator to restart before it hears keys from other apps. <button class="btn btn-sm" data-action="r62Relaunch">Restart Operator</button></div>')+
  '</div>';
}
r57KeyWarn = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(!OPAPP) return h;
    return h.replace(/<button class="btn btn-sm" data-action="r57OpenPrivacy">[^<]*<\/button>/g, '<button class="btn btn-sm" data-action="r57OpenPrivacy">'+(R62.check ? 'Check again' : 'Check')+'</button>')+r62CheckHtml();
  };
})(r57KeyWarn);

// ================= B7. Customize sits in the top panel =================
// No row of its own: a small button at the top right of the top panel, beside full screen ("Done" while you arrange).
const R62_CB_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>';
pageEditBtnHtml = (function(base){
  return function(action, on){
    if(action!=='toggleTodayEdit') return base.apply(this, arguments);
    return '<!--r62cb:'+(on ? 1 : 0)+'-->';
  };
})(pageEditBtnHtml);
renderToday = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const m = /<!--r62cb:(\d)-->/.exec(h); if(!m) return h;
    const on = m[1]==='1';
    const btn = '<button class="r62-cb'+(on ? ' is-on' : '')+'" data-action="toggleTodayEdit" aria-label="'+(on ? 'Done arranging' : 'Customize Today')+'" data-hov="'+(on ? 'Done' : 'Customize: arrange and size the panels')+'">'+(on ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Done' : R62_CB_SVG)+'</button>';
    if(/<button class="th-full"/.test(h)){
      h = h.replace(m[0], '');
      h = h.replace(/<button class="th-full"/, function(){ return btn+'<button class="th-full"'; });
      return h;
    }
    // (no top panel on screen: the old place, as before)
    return h.replace(m[0], '<div class="ll-bar r61-cust">'+btn.replace('class="r62-cb', 'class="r62-cb r62-cb-alone')+'</div>');
  };
})(renderToday);

// ================= C10. Goals: no label, no gap =================
renderGoalsTab = (function(base){
  return function(){ return base.apply(this, arguments).replace('<span class="r61-gt">Goals</span>', ''); };
})(renderGoalsTab);

// ================= C11. Journal: its tabs on the Personal tab line, at the far right =================
renderPersonal = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(ui.personalTab==='goals'){
      // (Goals: its settings button on the tab line too, so the goals start right under the tabs)
      const g = r60Cut(h, '<div class="r43-sec is-top">'); if(!g) return h;
      const at = g.rest.indexOf('</div><div class="tab-panel"'); if(at < 0) return h;
      return g.rest.slice(0, at)+'<div class="r62-gtop">'+g.html+'</div>'+g.rest.slice(at);
    }
    if(ui.personalTab!=='journal') return h;
    const cut = r60Cut(h, '<div class="r61-jtabs">'); if(!cut) return h;
    const tabs = cut.html.replace('<div class="r61-jtabs">', '<div class="r62-jtabs">');
    const at = cut.rest.indexOf('</div><div class="tab-panel"'); if(at < 0) return h;
    return cut.rest.slice(0, at)+tabs+cut.rest.slice(at);
  };
})(renderPersonal);

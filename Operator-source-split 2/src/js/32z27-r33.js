// ============ ROUND 33 ============
//  • Clock styles. The minute ring is one of six faces: Ring, Orbit, Analog, Day arc, Dots, Pulse.
//    Tap any clock to try the next one (or pick in Settings → Look & Sound). The same face shows on the
//    Calendar, as a Clock panel you can add to Today, and on the wake-up screen.
//  • Op's screen is one conversation: his light on top, everything you've said to each other under it,
//    and a box you can type into or talk to, any time. (Plane and Chat were the same talk twice.)
//  • Anything from Op wears his colour: his one-line reads and his cards take his mood.
//  • Alarms you add get an emoji, so they look like the two master alarms on the Calendar.
//  • Inspiration doesn't scroll: the wheel does nothing there now (drag still moves the sky).

// ---- clocks ----
const CLOCK_STYLES = [['ring', 'Ring'], ['minutes', 'Minutes'], ['orbit', 'Orbit'], ['analog', 'Analog'], ['day', 'Day arc'], ['dots', 'Dots'], ['pulse', 'Pulse']];
function clockStyle(){ const s = state.profile.clockStyle; return CLOCK_STYLES.some(function(x){ return x[0]===s; }) ? s : 'ring'; }
function clockFaceSvg(style){
  const C = '<circle class="ck-track" cx="60" cy="60" r="54"/>';
  if(style==='orbit') return C+'<path class="ck-trail" d=""/><g class="ck-orb"><circle class="ck-dot" cx="60" cy="6" r="5"/></g><circle class="ck-hub" cx="60" cy="60" r="3"/>';
  if(style==='analog'){
    let t = ''; for(let i = 0; i < 12; i++){ const a = i*30*Math.PI/180, r1 = i % 3 ? 49 : 45; t += '<line class="ck-tick'+(i % 3 ? '' : ' is-q')+'" x1="'+(60 + Math.sin(a)*r1).toFixed(1)+'" y1="'+(60 - Math.cos(a)*r1).toFixed(1)+'" x2="'+(60 + Math.sin(a)*53).toFixed(1)+'" y2="'+(60 - Math.cos(a)*53).toFixed(1)+'"/>'; }
    return '<circle class="ck-face" cx="60" cy="60" r="56"/>'+t+'<line class="ck-h" x1="60" y1="60" x2="60" y2="32"/><line class="ck-m" x1="60" y1="60" x2="60" y2="16"/><line class="ck-s" x1="60" y1="68" x2="60" y2="10"/><circle class="ck-hub" cx="60" cy="60" r="3.5"/>';
  }
  if(style==='day'){ const D = 'M 23.23 96.77 A 52 52 0 1 1 96.77 96.77'; return '<path class="ck-track" d="'+D+'"/><path class="ck-daypath" d="'+D+'" pathLength="100"/><circle class="ck-sun" cx="23.23" cy="96.77" r="6"/>'; }
  if(style==='dots'){ let d = ''; for(let i = 0; i < 60; i++){ const a = i*6*Math.PI/180; d += '<circle class="ck-d" data-i="'+i+'" cx="'+(60 + Math.sin(a)*52).toFixed(1)+'" cy="'+(60 - Math.cos(a)*52).toFixed(1)+'" r="'+(i % 5 ? 1.6 : 2.6)+'"/>'; } return d; }
  if(style==='minutes'){ let d = ''; for(let i = 0; i < 60; i++){ const a = i*6*Math.PI/180; d += '<circle class="ck-mn" data-i="'+i+'" cx="'+(60 + Math.sin(a)*52).toFixed(1)+'" cy="'+(60 - Math.cos(a)*52).toFixed(1)+'" r="'+(i % 5 ? 2.2 : 3)+'"/>'; } return d; }
  if(style==='pulse') return '<circle class="ck-p ck-p1" cx="60" cy="60" r="20"/><circle class="ck-p ck-p2" cx="60" cy="60" r="20"/><circle class="ck-core" cx="60" cy="60" r="12"/>';
  return C+'<circle class="ck-arc" cx="60" cy="60" r="54" pathLength="60"/>';
}
// one clock: the face, and (inner) the time inside it
function clockFaceHtml(cls, opts){
  opts = opts || {}; const st = clockStyle();
  return '<button class="ck ck-'+st+' '+(cls||'')+'" data-action="clockNext" data-style="'+st+'" title="'+CLOCK_STYLES.find(function(x){ return x[0]===st; })[1]+' · tap for another clock style" aria-label="Clock style: '+st+'">'+
    '<svg viewBox="0 0 120 120" aria-hidden="true">'+clockFaceSvg(st)+'</svg>'+
    (opts.inner ? '<span class="ck-in"><b class="ck-t"></b><small class="ck-d8"></small></span>' : '')+'</button>';
}
function clockTick(){
  const now = new Date(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours(), ms = now.getMilliseconds();
  document.querySelectorAll('.ck').forEach(function(ck){
    const st = ck.dataset.style;
    if(st==='ring'){ const a = ck.querySelector('.ck-arc'); if(a) a.style.strokeDashoffset = String(60 - s); }
    else if(st==='orbit'){
      const g = ck.querySelector('.ck-orb'); if(g) g.setAttribute('transform', 'rotate('+(s*6)+' 60 60)');
      const tr = ck.querySelector('.ck-trail'); if(tr){ const a0 = Math.max(0, s - 12)*6*Math.PI/180, a1 = s*6*Math.PI/180; tr.setAttribute('d', 'M '+(60 + Math.sin(a0)*54).toFixed(2)+' '+(60 - Math.cos(a0)*54).toFixed(2)+' A 54 54 0 0 1 '+(60 + Math.sin(a1)*54).toFixed(2)+' '+(60 - Math.cos(a1)*54).toFixed(2)); }
    }
    else if(st==='analog'){
      const set = function(sel, deg){ const el = ck.querySelector(sel); if(el) el.style.transform = 'rotate('+deg+'deg)'; };
      set('.ck-h', (h % 12)*30 + m*0.5); set('.ck-m', m*6 + s*0.1); const sh = ck.querySelector('.ck-s'); if(sh){ sh.style.transition = s===0 ? 'none' : ''; sh.style.transform = 'rotate('+(s*6)+'deg)'; }
    }
    else if(st==='day'){
      const p = (h*60 + m)/1440, path = ck.querySelector('.ck-daypath'), sun = ck.querySelector('.ck-sun');
      if(path) path.style.strokeDashoffset = String(100 - p*100);
      if(sun && path && path.getTotalLength){ const L = path.getTotalLength(), pt = path.getPointAtLength(L*p); sun.setAttribute('cx', pt.x.toFixed(1)); sun.setAttribute('cy', pt.y.toFixed(1)); sun.classList.toggle('is-moon', h < 6 || h >= 20); }
    }
    else if(st==='dots'){ ck.querySelectorAll('.ck-d').forEach(function(d){ const i = +d.dataset.i; d.classList.toggle('is-on', i <= s); d.classList.toggle('is-now', i===s); d.classList.toggle('is-min', i===m); }); }
    else if(st==='minutes'){ ck.querySelectorAll('.ck-mn').forEach(function(d){ const i = +d.dataset.i; d.classList.toggle('is-left', i >= m); d.classList.toggle('is-now', i===m); }); }
    else if(st==='pulse'){ const p = ck.querySelector('.ck-p1'), q = ck.querySelector('.ck-p2'); if(p){ p.classList.remove('is-go'); q.classList.remove('is-go'); void p.getBoundingClientRect(); p.classList.add('is-go'); if(s % 5===0) q.classList.add('is-go'); } }
    const t = ck.querySelector('.ck-t'); if(t) t.textContent = now.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    const d8 = ck.querySelector('.ck-d8'); if(d8) d8.textContent = now.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  });
}
setInterval(clockTick, 1000);
afterRenderHooks.push(clockTick);
function clockSwap(st){
  state.profile.clockStyle = st; persist('profile');
  document.querySelectorAll('.ck').forEach(function(ck){
    const inner = !!ck.querySelector('.ck-in'), cls = Array.prototype.filter.call(ck.classList, function(c){ return c!=='ck' && !/^ck-(ring|orbit|analog|day|dots|pulse)$/.test(c) && c!=='is-swap'; }).join(' ');
    const t = document.createElement('div'); t.innerHTML = clockFaceHtml(cls, {inner:inner}); const n = t.firstChild; n.classList.add('is-swap');
    ck.replaceWith(n);
  });
  clockTick();
  document.querySelectorAll('.ck-pick').forEach(function(b){ b.classList.toggle('is-on', b.dataset.id===st); });
}
ACTIONS.clockNext = function(){ const i = CLOCK_STYLES.findIndex(function(x){ return x[0]===clockStyle(); }); clockSwap(CLOCK_STYLES[(i + 1) % CLOCK_STYLES.length][0]); playTick(); };
ACTIONS.clockSet = function(el, e, id){ clockSwap(id); playTick(); };
// a Clock panel for Today
PANEL_DEFS.push({id:'clock', label:'Clock (tap it for another style)'});
PANEL_RENDERERS.clock = function(){ setTimeout(clockTick, 30); return '<div class="section"><div class="card ck-panel">'+clockFaceHtml('ck-big', {inner:true})+'</div></div>'; };
// the wake-up screen
wakeRingHtml = (function(base){
  return function(){
    setTimeout(clockTick, 30);
    return base.apply(this, arguments).replace(/<div class="wk2-clock" id="wakeClock">([^<]*)<\/div>/, function(m, t){ return '<div class="wk2-clock wk-ck">'+clockFaceHtml('ck-wake')+'<span id="wakeClock">'+t+'</span></div>'; });
  };
})(wakeRingHtml);
// Settings → Look & Sound: pick one
soundSettingsHtml = (function(base){
  return function(){
    const st = clockStyle();
    return base.apply(this, arguments).replace('<div class="snd">', '<div class="snd"><div class="card section"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#128336; Clock</div><div class="kpi-sub">Calendar, Today’s Clock panel and the wake-up screen.</div></div></div>'+
      '<div class="ck-picks">'+CLOCK_STYLES.map(function(x){ return '<button class="ck-pick'+(x[0]===st ? ' is-on' : '')+'" data-action="clockSet" data-id="'+x[0]+'"><span class="ck ck-'+x[0]+' ck-mini" data-style="'+x[0]+'"><svg viewBox="0 0 120 120" aria-hidden="true">'+clockFaceSvg(x[0])+'</svg></span><b>'+x[1]+'</b></button>'; }).join('')+'</div></div>');
  };
})(soundSettingsHtml);

// ---- Op's screen: one conversation ----
opfMode = function(){ return 'chat'; };
opfEl = (function(base){
  return function(){
    const fresh = !document.getElementById('opFull'), el = base.apply(this, arguments);
    if(fresh){
      const modes = el.querySelector('.opf-modes'); if(modes) modes.querySelectorAll('.opf-m[data-id]').forEach(function(b){ b.remove(); });
      const orb = el.querySelector('.opf-orb'), chat = el.querySelector('.opf-chat'); if(orb && chat) chat.insertBefore(orb, chat.firstChild);
      const inp = el.querySelector('#opfInput'); if(inp) inp.placeholder = 'Type to Op, or tap the light to talk…';
      const hint = el.querySelector('.opf-hint'); if(hint) hint.remove();
      const mic = el.querySelector('.opf-mic'); if(mic) mic.remove();
    }
    return el;
  };
})(opfEl);
// (tapping his light talks; tapping anywhere else, or just typing, goes to the box)
document.addEventListener('pointerdown', function(e){
  if(!OPF.open || !e.target.closest) return;
  if(e.target.closest('.opf-orb')){ e.preventDefault(); ACTIONS.opfTalk(); return; }
  if(e.target.closest('#opFull') && !e.target.closest('button, a, input, textarea, .opf-log, .opf-acc, .opf-top')){ e.preventDefault(); const i = document.getElementById('opfInput'); if(i) i.focus(); }
}, true);
document.addEventListener('keydown', function(e){
  if(!OPF.open || e.metaKey || e.ctrlKey || e.altKey || e.key.length!==1) return;
  const a = document.activeElement; if(a && (a.tagName==='INPUT' || a.tagName==='TEXTAREA' || a.isContentEditable)) return;
  if(document.querySelector('.overlay:not(.hidden)')) return;
  const i = document.getElementById('opfInput'); if(i) i.focus();
}, true);

// ---- Op wears his colour ----
// (his reads, his tips and his chips use --op-c, so they shift with his mood)

// ---- alarms get an emoji ----
const ALARM_EMOJI = ['&#9200;', '&#128138;', '&#128222;', '&#127947;&#65039;', '&#127859;', '&#128716;', '&#128188;', '&#127916;', '&#128694;', '&#129496;'];
alarmSheetHtml = (function(base){
  return function(){
    const cur = ui.alarmEmoji || ALARM_EMOJI[0];
    return base.apply(this, arguments).replace('<div class="as-lbl">Repeats</div>', '<div class="as-chips al-emo">'+ALARM_EMOJI.map(function(x){ return '<button class="as-chip'+(x===cur ? ' is-on' : '')+'" data-action="alarmEmoji" data-id="'+x+'">'+x+'</button>'; }).join('')+'</div><div class="as-lbl">Repeats</div>');
  };
})(alarmSheetHtml);
ACTIONS.alarmEmoji = function(el, e, id){ const t = document.getElementById('alSheetTime'), l = document.getElementById('alSheetLabel'); if(t) ui.alarmSheetTime = t.value; ui.alarmLabelDraft = l ? l.value : ''; ui.alarmEmoji = id; addSheetRefresh('alarmSheet'); const l2 = document.getElementById('alSheetLabel'); if(l2) l2.value = ui.alarmLabelDraft; };
openAlarmSheet = (function(base){ return function(){ ui.alarmEmoji = null; return base.apply(this, arguments); }; })(openAlarmSheet);
ACTIONS.alarmSheetAdd = (function(base){ return function(){ const n = state.focus.alarms.length, r = base.apply(this, arguments); if(state.focus.alarms.length > n){ state.focus.alarms[state.focus.alarms.length - 1].emoji = ui.alarmEmoji || ALARM_EMOJI[0]; persist('focus'); renderView(); } return r; }; })(ACTIONS.alarmSheetAdd);

// ---- Inspiration doesn't scroll ----
inspBindWander = function(L){
  L.addEventListener('wheel', function(e){ if(!e.target.closest('#inspPlane') || e.target.closest('textarea')) return; e.preventDefault(); e.stopImmediatePropagation(); }, {passive:false, capture:true});
};
inspHtml = (function(base){ return function(){ return base.apply(this, arguments).replace('Drag or scroll to wander · ', 'Drag to wander · '); }; })(inspHtml);

// ---- smoother: a page fades in when you change pages or tabs ----
afterRenderHooks.push(function(){
  const key = ui.view+'|'+(ui.businessTab||'')+'|'+(ui.personalTab||'')+'|'+(ui.focusTab||'')+'|'+(ui.settingsTab||'');
  if(ui._r33Key===key) return; ui._r33Key = key;
  const v = document.getElementById('viewRoot'); if(!v) return;
  v.classList.remove('r33-in'); void v.offsetWidth; v.classList.add('r33-in');
});

// ---- the locked-in timer gets styles too (same idea as the clocks) ----
// The big square on the minimal locked-in screen. Tap it for the next one: Cover (the original), Ring
// (the session filling up), Orbit (a light going round each minute), Dots (the hour, a dot a minute),
// Breathe (a slow 4-second breath to settle into) and Fill (the session rising like water).
// With a planned length it shows that session; without one, each hour fills and starts again.
const TIMER_STYLES = [['art', 'Cover'], ['ring', 'Ring'], ['orbit', 'Orbit'], ['dots', 'Dots'], ['breathe', 'Breathe'], ['fill', 'Fill']];
function timerStyle(){ const s = state.profile.timerStyle; return TIMER_STYLES.some(function(x){ return x[0]===s; }) ? s : 'art'; }
function timerFaceSvg(st){
  if(st==='ring') return '<circle class="tm-track" cx="60" cy="60" r="52"/><circle class="tm-arc" cx="60" cy="60" r="52" pathLength="100"/>';
  if(st==='orbit') return '<circle class="tm-track" cx="60" cy="60" r="52"/><circle class="tm-arc is-thin" cx="60" cy="60" r="52" pathLength="100"/><g class="tm-orb"><circle class="tm-dot" cx="60" cy="8" r="5"/></g>';
  if(st==='dots'){ let d = ''; for(let i = 0; i < 60; i++){ const a = i*6*Math.PI/180; d += '<circle class="tm-d" data-i="'+i+'" cx="'+(60 + Math.sin(a)*50).toFixed(1)+'" cy="'+(60 - Math.cos(a)*50).toFixed(1)+'" r="'+(i % 5 ? 1.8 : 2.8)+'"/>'; } return d; }
  if(st==='breathe') return '<circle class="tm-b tm-b1" cx="60" cy="60" r="34"/><circle class="tm-b tm-b2" cx="60" cy="60" r="24"/><circle class="tm-b tm-b3" cx="60" cy="60" r="14"/>';
  if(st==='fill') return '<defs><clipPath id="tmClip"><circle cx="60" cy="60" r="50"/></clipPath></defs><circle class="tm-track" cx="60" cy="60" r="52"/><g clip-path="url(#tmClip)"><path class="tm-water" d=""/></g>';
  return '';
}
function timerFaceHtml(icon){
  const st = timerStyle();
  if(st==='art') return null;
  return '<button class="np-art tm tm-'+st+'" data-action="timerNext" data-style="'+st+'" title="'+TIMER_STYLES.find(function(x){ return x[0]===st; })[1]+' · tap for another timer style"><svg viewBox="0 0 120 120" aria-hidden="true">'+timerFaceSvg(st)+'</svg><span class="tm-in"><i>'+icon+'</i><b class="tm-t"></b></span></button>';
}
renderLockedMinimal = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.replace(/<div class="np-art( is-music)?"><span>([^<]*)<\/span>(<span class="np-art-eq wk2-eq">(?:<i><\/i>)+<\/span>)?<\/div>/, function(m, mus, icon){
      const f = timerFaceHtml(icon); if(f){ setTimeout(timerTick, 20); return f; }
      return m.replace('<div class="np-art', '<div data-action="timerNext" title="Tap for another timer style" class="np-art');
    });
  };
})(renderLockedMinimal);
function timerTick(){
  const as = state.focus.activeSession; if(!as || as.onBreak) return;
  const el = Date.now() - as.startedAt, plan = as.plannedMinutes ? as.plannedMinutes*60000 : 0;
  const p = plan ? Math.min(1, el/plan) : (el % 3600000)/3600000, s = new Date().getSeconds();
  document.querySelectorAll('.tm').forEach(function(tm){
    const st = tm.dataset.style, arc = tm.querySelector('.tm-arc');
    if(arc) arc.style.strokeDashoffset = String(100 - p*100);
    if(st==='orbit'){ const g = tm.querySelector('.tm-orb'); if(g) g.setAttribute('transform', 'rotate('+(s*6)+' 60 60)'); }
    if(st==='dots'){ const lit = Math.floor((plan ? p*60 : (el % 3600000)/60000)); tm.querySelectorAll('.tm-d').forEach(function(d){ const i = +d.dataset.i; d.classList.toggle('is-on', i < lit); d.classList.toggle('is-now', i===lit); }); }
    if(st==='fill'){ const w = tm.querySelector('.tm-water'); if(w){ const y = 110 - p*100, ph = Date.now()/600; let d = 'M 0 '+y.toFixed(1); for(let x = 0; x <= 120; x += 10) d += ' L '+x+' '+(y + Math.sin(ph + x/14)*3).toFixed(1); w.setAttribute('d', d+' L 120 130 L 0 130 Z'); } }
    const t = tm.querySelector('.tm-t'); if(t) t.textContent = formatElapsed(el);
  });
}
setInterval(timerTick, 1000);
ACTIONS.timerNext = function(){
  const i = TIMER_STYLES.findIndex(function(x){ return x[0]===timerStyle(); });
  state.profile.timerStyle = TIMER_STYLES[(i + 1) % TIMER_STYLES.length][0]; persist('profile'); playTick(); renderView();
  setTimeout(function(){ const tm = document.querySelector('.np-locked .np-art'); if(tm) tm.classList.add('is-swap'); timerTick(); }, 10);
};
ACTIONS.timerSet = function(el, e, id){ state.profile.timerStyle = id; persist('profile'); playTick(); renderView(); };
// (and in Settings, under the clock styles)
soundSettingsHtml = (function(base){
  return function(){
    const st = timerStyle();
    return base.apply(this, arguments).replace('<div class="ck-picks">', '<div class="ck-picks">').replace(/(<div class="ck-picks">[\s\S]*?<\/div>)(<\/div>)/, function(m, picks, close){
      return picks+'<div class="kpi-sub" style="margin-top:14px;">Locked-in timer (tap it while you work to change it)</div><div class="tm-picks">'+TIMER_STYLES.map(function(x){ return '<button class="ck-pick tm-pick'+(x[0]===st ? ' is-on' : '')+'" data-action="timerSet" data-id="'+x[0]+'"><span class="tm-mini tm-'+x[0]+'"><svg viewBox="0 0 120 120" aria-hidden="true">'+(x[0]==='art' ? '<rect class="tm-cover" x="10" y="10" width="100" height="100" rx="22"/>' : timerFaceSvg(x[0]))+'</svg></span><b>'+x[1]+'</b></button>'; }).join('')+'</div>'+close;
    });
  };
})(soundSettingsHtml);

// ---- a clock in the corner (the music bar, top right) ----
// Settings → Look & Sound → Clock: "Show it in the corner". Tiny, always there, the same style; tap the
// face for the next style.
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(!state.profile.clockInDock) return h;
    const t = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
    return h.replace(/^(<div class="md-in[^"]*">)/, '$1<span class="md-ck">'+clockFaceHtml('ck-dock')+'<b>'+t+'</b></span>');
  };
})(dockHtml);
setInterval(function(){ if(state && state.profile && state.profile.clockInDock && typeof dockRefresh==='function') dockRefresh(); }, 15000);
ACTIONS.clockDock = function(){ state.profile.clockInDock = !state.profile.clockInDock; persist('profile'); playTick(); dockRefresh(); renderView(); };
soundSettingsHtml = (function(base){
  return function(){
    const on = !!state.profile.clockInDock;
    return base.apply(this, arguments).replace('<div class="kpi-sub">Calendar, Today’s Clock panel and the wake-up screen.</div></div></div>', '<div class="kpi-sub">Calendar, Today’s Clock panel and the wake-up screen.</div></div><label class="ck-dock-sw" title="A small clock in the music bar, top right, on every page"><span>Show it in the corner</span><button class="cx-switch'+(on ? ' is-on' : '')+'" data-action="clockDock" role="switch" aria-checked="'+on+'"><i></i></button></label></div>');
  };
})(soundSettingsHtml);

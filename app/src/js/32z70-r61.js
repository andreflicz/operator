// ============ ROUND 61 ============
// The list is ROUND-61-LIST.md: Today's widgets with set sizes, Today's standard centered, a cleaner Customize button,
// Goals without the labels, the Journal centered with its tabs top right and search at the bottom, the business name on
// Social, Op's window sizing itself and closing when idle, a calmer note fade, no combined playbook preset, holidays
// (no preview outside Test / demo, a ✕ on the banner, better Halloween music).
const R61 = {};

// ================= A1. The Customize button =================
pageEditBtnHtml = (function(base){
  return function(action, on){
    if(action!=='toggleTodayEdit') return base.apply(this, arguments);
    return '<div class="ll-bar r61-cust"><button class="r61-cb'+(on ? ' is-on' : '')+'" data-action="'+action+'">'+(on ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Done' : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>Customize')+'</button></div>';
  };
})(pageEditBtnHtml);

// ================= A3. Widgets: Small, Medium, Large =================
// Three sizes only (a third, half, the full width), set by the layout, never dragged to an odd width. Panels side by side
// are the same height, with their content centered. Drag a panel by its title to move it.
function r61Snap(n){ n = Number(n) || 6; return n <= 5 ? 4 : n <= 9 ? 6 : 12; }
r60Span = (function(base){ return function(pid){ return r61Snap(base.apply(this, arguments)); }; })(r60Span);
todayEditWrap = (function(base){
  return function(pid){
    const s = r60Span(pid), b = function(n, l){ return '<button class="r60-sz'+(s===n ? ' is-on' : '')+'" data-action="r60Size" data-id="'+pid+'|'+n+'">'+l+'</button>'; };
    return base.apply(this, arguments).replace(/<span class="r60-szs">[\s\S]*?<\/span>/, '<span class="r60-szs">'+b(4, 'S')+b(6, 'M')+b(12, 'L')+'</span>').replace(/<span class="r60-rs"[^>]*><\/span>/, '');
  };
})(todayEditWrap);

// ================= B4. Goals: just "Goals", the settings at the top right =================
renderGoalsTab = (function(base){
  return function(){
    const h = base.apply(this, arguments), top = '<div class="r43-goalsp g39">';
    if(h.indexOf(top)!==0) return h;
    const cut = r60Cut(h, '<div class="r43-sec is-top">'); if(!cut) return h;
    const head = cut.html.replace(/<span class="r43-k"[^>]*>[\s\S]*?<\/span>/, '<span class="r61-gt">Goals</span>');
    let rest = cut.rest.replace(/<div class="r43-sec is-mine">[\s\S]*?<\/div><\/div>/, '');
    return top+head+rest.slice(top.length);
  };
})(renderGoalsTab);

// ================= B5. The Journal: tabs top right, centered, search at the bottom =================
renderJournalTab = (function(base){
  return function(){
    return '<div class="r61-j">'+base.apply(this, arguments).replace('<div class="row" style="justify-content:center;margin-bottom:14px;"><div class="seg-tabs" style="margin:0;">', '<div class="r61-jtabs"><div class="seg-tabs" style="margin:0;">')+'</div>';
  };
})(renderJournalTab);
r60JournalHead = function(clients){
  return '<div class="r60-jh r61-jh"><div class="r60-seg"><button class="'+(clients ? '' : 'is-on')+'" data-action="setJournalViewMode" data-value="personal">My journal</button><button class="'+(clients ? 'is-on' : '')+'" data-action="setJournalViewMode" data-value="clients">Client journals</button></div></div>';
};
renderJournalEntriesTab = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(ui.journalViewMode==='clients') return h;
    const open = ui.r61Search || !!ui.journalSearchText;
    const search = '<div class="r61-js'+(open ? ' is-open' : '')+'">'+(open ? '<input id="journalSearchInput" placeholder="Search your journal" value="'+escapeHtml(ui.journalSearchText || '')+'"><button data-action="r61SearchClose" aria-label="Close search">&#10005;</button>' : '<button class="r61-jsb" data-action="r61SearchOpen" aria-label="Search your journal" data-hov="Search your journal">&#128269;</button>')+'</div>';
    return h.replace(/<\/div>$/, search+'</div>');
  };
})(renderJournalEntriesTab);
ACTIONS.r61SearchOpen = function(){ ui.r61Search = true; renderView(); setTimeout(function(){ const i = document.getElementById('journalSearchInput'); if(i) i.focus(); }, 30); };
ACTIONS.r61SearchClose = function(){ ui.r61Search = false; ui.journalSearchText = ''; renderView(); };

// ================= C6. Social: the business name at the top left =================
renderConversations = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(typeof businessNameTagHtml!=='function' || h.indexOf('business-name-tag') >= 0) return h;
    return h.replace('<div class="view-header"><div><div class="view-title">', '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">');
  };
})(renderConversations);

// ================= D9. Op's window sizes itself, and closes when nothing's going on =================
// No more resizing by hand: it fits the conversation (up to most of the window). After a minute and a half with nothing
// happening (he isn't talking, listening or thinking, you aren't typing, nothing new in the chat) it closes itself.
// (Round 62: resizable again, and it opens compact and grows: see 32z71-r62.js)
setTimeout(function(){ try{ const s = state.profile.opBubSize; if(s && s.h){ state.profile.opBubSize = {w:s.w || 460, h:0}; persist('profile'); } }catch(e){} }, 0);
R61.lastChat = 0; R61.idleSince = Date.now();
setInterval(function(){
  try{
    const b = document.getElementById('opBub'); if(!b || !b.classList.contains('is-in')){ R61.idleSince = Date.now(); return; }
    const L = opChat(), last = L.length ? (L[L.length - 1].at || 0) : 0;
    const busy = OV.speaking || OV.pending || AI.busy || AI.listening || b._hover || b.matches(':hover') || (document.activeElement && b.contains(document.activeElement) && document.activeElement.value);
    if(busy || last!==R61.lastChat){ R61.lastChat = last; R61.idleSince = Date.now(); return; }
    if(Date.now() - R61.idleSince > 90000){ b.classList.remove('is-in'); R61.idleSince = Date.now(); }
  }catch(e){}
}, 3000);

// ================= E11. No combined "Onboarding → Monthly client" preset =================
r60PresetCards = (function(base){ return function(){ return base.apply(this, arguments).replace(/<div class="r60-pre"><button class="r60-pre-b" data-action="r60UsePreset" data-id="chain">[\s\S]*?<\/button><\/div>/, ''); }; })(r60PresetCards);

// ================= F12–14. Holidays: no preview outside Test / demo, a ✕ on the banner, better Halloween music =================
function r61TestMode(){ return !!((state.settings && state.settings.testMode) || (typeof DEMO_ON!=='undefined' && DEMO_ON)); }
themeSettingsHtml = (function(base){ return function(){ const h = base.apply(this, arguments); return r61TestMode() ? h : h.replace(/<div class="hol-row"><span>Preview<\/span>[\s\S]*?<\/div><\/div>/, ''); }; })(themeSettingsHtml);
setTimeout(function(){ if(!r61TestMode()) ui.holPreview = null; }, 0);
function r61HolKey(h){ return h+'|'+todayStr().slice(0, 4); }
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments), hol = holActive();
    if(!hol) return h;
    const hidden = (state.profile.r61HolHidden || {})[r61HolKey(hol)];
    const cut = r60Cut(h, '<div class="hol-ban'); if(!cut) return h;
    if(hidden) return cut.rest;
    return cut.html.replace(/<button class="r60-holm[^"]*" data-action="r60HolMusic">[\s\S]*?<\/button>/, function(m0){ const on = /is-on/.test(m0); return '<button class="r60-holm r61-holm'+(on ? ' is-on' : '')+'" data-action="r60HolMusic" aria-label="'+(on ? 'Pause the music' : 'Holiday music')+'" data-hov="'+(on ? 'Pause the music' : 'Holiday music')+'">'+(on ? '&#10074;&#10074;' : '&#9835;')+'</button>'; }).replace(/<\/div>$/, '<button class="r61-holx" data-action="r61HolHide" aria-label="Close" data-hov="Hide it until next time">&#10005;</button></div>')+cut.rest;
  };
})(renderToday);
ACTIONS.r61HolHide = function(){ const hol = holActive(); if(!hol) return; state.profile.r61HolHidden = state.profile.r61HolHidden || {}; state.profile.r61HolHidden[r61HolKey(hol)] = true; persist('profile'); if(R60.music) r60MusicStop(); playTick(); renderView(); };
// a slower, eerier Halloween: a minor waltz on a soft organ, with a low note under each bar
R60_TUNES.halloween = {bpm:78, wave:'sine', organ:true, n:[['A4',1],['C5',1],['E5',1],['D#5',2],['E5',1],['C5',1],['A4',1],['G#4',3],['F4',1],['A4',1],['C5',1],['B4',2],['G#4',1],['E4',3],['A4',1],['C5',1],['E5',1],['A5',2],['G#5',1],['F5',1],['D5',1],['E5',3],['B4',1],['C5',1],['A4',4]], bass:['A2','A2','F2','E2','A2','D3','E2','A2']};
r60MusicPlay = (function(base){
  return function(h){
    const T = R60_TUNES[h]; if(!T || !T.organ) return base.apply(this, arguments);
    r60MusicStop();
    const Ctx = window.AudioContext || window.webkitAudioContext; if(!Ctx) return;
    const ctx = new Ctx(), g = ctx.createGain(); g.gain.value = .05; g.connect(ctx.destination);
    const M = R60.music = {h:h, ctx:ctx, g:g, t:null}, beat = 60/T.bpm;
    const voice = function(f, t, dur, vol, type){
      [0, 7].forEach(function(det, k){ const o = ctx.createOscillator(), e = ctx.createGain(); o.type = type || 'sine'; o.frequency.value = f; o.detune.value = det*(k ? 1 : 0);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + dur + .3);
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol*(k ? .5 : 1), t + .08); e.gain.setTargetAtTime(0, t + dur*.85, .18); o.connect(e); e.connect(g); o.start(t); o.stop(t + dur + .6); });
    };
    const loop = function(){
      if(R60.music!==M) return;
      let t = ctx.currentTime + .05, total = 0;
      T.n.forEach(function(x){ const dur = x[1]*beat; voice(r60Hz(x[0]), t, dur, 1, 'sine'); t += dur; total += dur; });
      const bar = total/T.bass.length; T.bass.forEach(function(n, i){ voice(r60Hz(n), ctx.currentTime + .05 + i*bar, bar*.95, .7, 'triangle'); });
      M.t = setTimeout(loop, (total + beat*2)*1000);
    };
    loop();
  };
})(r60MusicPlay);

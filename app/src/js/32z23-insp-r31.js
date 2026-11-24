// ============ INSPIRATION, ROUND 31 ============
// - Breeze clears the sky: every bubble lifts away (your "Want to"s stay put). Return brings them back
//   somewhere new. Hold Breeze down and it asks to clear everything, Want to's included (with an Undo).
// - The toolbar: Thought, Wish, Words, a + in the middle, Drift, Breeze, Sounds. The + opens a little
//   menu at the bottom: Log something, Reset, Breathe, and the sky. (Stuck? Reset left the middle.)
// - Want to's you put together stay together: drop one on another and they join, a dotted line between
//   them and a "together" tag you can open: do them all at once, or split them up.
// - Nothing gets lost any more: a bubble left under the middle or behind the vision board (where it
//   fades and can't be grabbed) is moved back out into the open, and the Want to list can find any of them.
// - A bubble's card always opens right where the bubble is, even mid-drift.
// - The words on the sky are about life now: perspective, not your to-do list.

// ---- the engine: wants stay through a breeze unless you clear everything; the card sticks to its bubble ----
inspWindTick = function(now){
  IW.raf = 0;
  const L = document.getElementById('insp'); if(!L || !L.classList.contains('is-in')){ IW.last = 0; return; }
  const dt = IW.last ? Math.min(0.1, (now - IW.last)/1000) : 0; IW.last = now;
  const t = now/1000, speed = INSP_WINDS[inspWind()][2], f = inspField(), wants = inspWants();
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card = L.querySelector('#inspWorld .izb-card');
  const placed = {};
  L.querySelectorAll('#inspWorld .izb').forEach(function(el){
    const id = el.dataset.id; if(!id) return;
    const x0 = parseFloat(el.style.left) || 0, y0 = parseFloat(el.style.top) || 0;
    if(el._drag){ placed[id] = {x:x0 + (el._dx||0), y:y0 + (el._dy||0)}; return; }
    const h = inspHash(id), want = wants.indexOf(id) >= 0, held = ui.inspOpenAct===id || el.matches(':hover') || want;
    el.classList.toggle('is-want', want);
    // the gust: from the left; Want to's stay unless you cleared everything
    const stays = IW.away && want && !IW.all;
    let g = 0;
    if(IW.away && !stays){ const t0 = want && IW.allAt ? IW.allAt : IW.awayAt, lag = Math.max(0, Math.min(1, (x0 - f.min)/f.w))*650; g = Math.max(0, Math.min(1, (now - t0 - lag)/1100)); }
    if((!held || (IW.away && !stays)) && !reduce){ IW.off[id] = (IW.off[id] || 0) + (speed*(0.75 + h*0.5)*(held ? 0 : 1) + g*g*1500)*dt; }
    let off = IW.off[id] || 0;
    const r = IW.ret[id]; if(r){ const k = Math.min(1, Math.max(0, (now - r.t0)/r.dur)), e = 1 - Math.pow(1 - k, 3); off += r.from*(1 - e); if(k >= 1) delete IW.ret[id]; }
    let wx = x0 + off; if(!IW.away){ wx = ((wx - f.min) % f.w + f.w) % f.w + f.min; }
    const amp = reduce ? 0 : 1, lift = speed ? 1 + speed/40 : 1;
    const dx = wx - x0 + amp*(Math.sin(t*(0.31 + h*0.2) + h*20)*14 + Math.sin(t*(0.13 + h*0.07) + h*7)*10);
    const dy = amp*(Math.cos(t*(0.27 + h*0.18) + h*11)*12*lift + Math.sin(t*(0.11 + h*0.05) + h*3)*9*lift) - g*g*(140 + h*120);
    const sc = 1 - g*0.18, rot = amp*Math.sin(t*0.4 + h*9)*(2 + speed/30) + g*(12 + h*14);
    el.classList.toggle('is-keep', !!stays);
    el._dx = dx; el._dy = dy;
    el.style.transform = 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0) rotate('+rot.toFixed(2)+'deg)'+(sc!==1 ? ' scale('+sc.toFixed(3)+')' : '');
    let op = 1;
    if(speed > 0 && !IW.away && !held){ const d = Math.min(wx - f.min, f.max - wx); op = Math.max(0, Math.min(1, d/260)); }
    if(IW.away && !stays) op = Math.max(0, 1 - Math.max(0, (off - 380)/520));
    if(r && !IW.away) op = Math.min(op, Math.min(1, Math.max(0, (now - r.t0)/900)));
    const px = x0 + dx, py = y0 + dy;
    const nearHub = Math.hypot(px, py*1.15) < 300 ? 1 - Math.max(0, (Math.hypot(px, py*1.15) - 230)/70) : 0;
    const nearBoard = Math.abs(px) < 300 && py < -400 && py > -700 ? 1 : 0;
    const behind = stays || want ? 0 : Math.max(nearHub, nearBoard);
    if(behind > 0) op = Math.min(op, 1 - behind*0.8);
    el.classList.toggle('is-behind', behind > 0.5);
    el.style.opacity = op < 0.999 ? op.toFixed(3) : '';
    el.style.pointerEvents = op < 0.15 ? 'none' : '';
    placed[id] = {x:px, y:py};
    // (the card opens on the bubble, wherever it's drifted to)
    if(card && ui.inspOpenAct===id){ card.style.left = x0+'px'; card.style.top = y0+'px'; card.style.transform = 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0)'; }
  });
  inspGroupsDraw(placed);
  IW.raf = requestAnimationFrame(inspWindTick);
};

// ---- Breeze: tap clears the sky (Want to's stay); hold to clear everything ----
ACTIONS.inspBreezeAway = function(){
  const L = document.getElementById('insp');
  if(!IW.away){
    IW.away = true; IW.all = false; IW.allAt = 0; IW.awayAt = performance.now(); IW.keep = null; IW.keepAt = null; ui.inspOpenAct = null; ui.inspGroupOpen = null;
    inspWhoosh(1); if(L) L.classList.add('is-away');
  } else {
    IW.away = false; IW.all = false; IW.allAt = 0;
    const now = performance.now(), s = inspStore(); s.seed = (s.seed || 0) + 1; persist('personal'); ui._inspScatter = null;
    IW.off = {}; IW.ret = {};
    inspRender();
    const f = inspField();
    document.querySelectorAll('#inspWorld .izb').forEach(function(el, i){
      const id = el.dataset.id; if(!id || inspWants().indexOf(id) >= 0) return;
      const x0 = parseFloat(el.style.left) || 0;
      IW.ret[id] = {from:-(x0 - f.min + 420 + inspHash(id)*500), t0:now + i*60, dur:3000 + inspHash(id+'r')*1500};
    });
    if(L) L.classList.remove('is-away');
    if(typeof inspChime==='function') inspChime(3);
  }
  inspRender();
};
ACTIONS.inspBreezeAll = function(){
  ui.inspBreezeAsk = false;
  const s = inspStore(), wants = inspWants();
  s.wantsGone = {wants:wants.slice(), groups:inspGroups().map(function(g){ return g.slice(); }), at:Date.now()};
  if(!IW.away){ IW.away = true; IW.awayAt = performance.now(); inspWhoosh(1); const L = document.getElementById('insp'); if(L) L.classList.add('is-away'); }
  IW.all = true; IW.allAt = performance.now(); ui.inspOpenAct = null; ui.inspGroupOpen = null;
  // (they lift off first; the list clears once they're gone)
  setTimeout(function(){ wants.length = 0; s.wantGroups = []; persist('personal'); inspRender(); }, 2400);
  inspRender();
  showToast('Everything’s breezed off, Want to’s too.', {icon:'&#127811;', actionLabel:'Undo', actionAction:'inspBreezeUndo', duration:12000});
};
ACTIONS.inspBreezeUndo = function(){
  const s = inspStore(), g = s.wantsGone; if(!g) return;
  const w = inspWants(); g.wants.forEach(function(id){ if(w.indexOf(id) < 0) w.push(id); }); s.wantGroups = g.groups; s.wantsGone = null; persist('personal');
  IW.all = false; IW.allAt = 0; g.wants.forEach(function(id){ IW.off[id] = 0; });
  inspRender();
};
ACTIONS.inspBreezeAskClose = function(){ ui.inspBreezeAsk = false; inspRender(); };
// press and hold Breeze (about half a second)
(function(){
  let t = null, fired = false;
  document.addEventListener('pointerdown', function(e){
    const b = e.target.closest && e.target.closest('#insp [data-action="inspBreezeAway"]'); if(!b || e.button!==0) return;
    fired = false; clearTimeout(t);
    t = setTimeout(function(){ fired = true; b.classList.add('is-held'); ui.inspBreezeAsk = true; ui.inspPlusOpen = false; inspRender(); if(typeof inspChime==='function') inspChime(1); }, 550);
  }, true);
  const stop = function(){ clearTimeout(t); t = null; document.querySelectorAll('#insp .is-held').forEach(function(x){ x.classList.remove('is-held'); }); };
  document.addEventListener('pointerup', stop, true); document.addEventListener('pointercancel', stop, true);
  // (a hold isn't a tap)
  document.addEventListener('click', function(e){ if(fired && e.target.closest && e.target.closest('#insp [data-action="inspBreezeAway"]')){ fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
})();

// ---- the toolbar ----
ACTIONS.inspPlusOpen = function(){ ui.inspPlusOpen = !ui.inspPlusOpen; ui.inspWindOpen = false; ui.inspSfxOpen = false; ui.inspBreezeAsk = false; inspRender(); };
['inspLogSheet', 'inspResetOpen', 'inspBreathe'].forEach(function(k){ const base = ACTIONS[k]; if(base) ACTIONS[k] = function(){ ui.inspPlusOpen = false; return base.apply(this, arguments); }; });
inspToolsHtml = function(){
  const sky = (INSP_SKIES.find(function(x){ return x[0]===(inspSandStore().sky || 'dusk'); }) || INSP_SKIES[0])[1];
  const b = function(act, ic, label, on, cls){ return '<button class="izk'+(on ? ' is-on' : '')+(cls ? ' '+cls : '')+'" data-action="'+act+'"><span>'+ic+'</span>'+label+'</button>'; };
  const w = inspWind();
  const plus = '<span class="izk-wrap izk-plus-wrap"><button class="izk-plus'+(ui.inspPlusOpen ? ' is-on' : '')+'" data-action="inspPlusOpen" aria-label="More">+</button>'+
    (ui.inspPlusOpen ? '<span class="izk-plusmenu">'+
      '<button data-action="inspLogSheet"><i>&#9998;</i>Log something</button>'+
      '<button data-action="inspResetOpen"><i>&#8635;</i>Reset</button>'+
      '<button data-action="inspBreathe"><i>&#10061;</i>Breathe</button>'+
      '<button data-action="inspSky"><i>&#9790;</i>'+escapeHtml(sky)+'</button></span>' : '')+'</span>';
  const ask = ui.inspBreezeAsk ? '<span class="izk-wind izk-ask"><small>Breeze everything?</small><p>Every bubble goes, your Want to’s too.</p><span class="izk-ask-r"><button class="izk-ask-go" data-action="inspBreezeAll">Breeze it all</button><button data-action="inspBreezeAskClose">Keep them</button></span></span>' : '';
  return '<div class="insp-tools">'+b('inspToolThought', '&#9998;', 'Thought')+b('inspToolWish', '&#10022;', 'Wish')+b('inspToolWords', '&#10077;', 'Words')+
    plus+
    '<span class="izk-wrap">'+b('inspDrift', '&#8776;', 'Drift'+(w ? ' &middot; '+INSP_WINDS[w][1] : ''), w > 0 || ui.inspWindOpen)+
      (ui.inspWindOpen ? '<span class="izk-wind"><small>The wind</small>'+INSP_WINDS.map(function(x, i){ return '<button class="izw-s'+(i===w ? ' is-on' : '')+'" data-action="inspWindSet" data-id="'+x[0]+'"><i style="--n:'+i+'"></i>'+x[1]+'</button>'; }).join('')+'</span>' : '')+'</span>'+
    '<span class="izk-wrap">'+b('inspBreezeAway', IW.away ? '&#127808;' : '&#127811;', IW.away ? 'Return' : 'Breeze', IW.away)+ask+'</span>'+
    '<span class="izk-wrap"><button class="izk'+(ui.inspSfxOpen ? ' is-on' : '')+'" data-action="inspSfxOpen"><span>&#127925;</span>Sounds</button>'+
      (ui.inspSfxOpen ? '<span class="izk-wind izk-sfx"><small>Sound effects</small>'+inspSfxControlsHtml()+'</span>' : '')+'</span></div>';
};
// (the other little panels close the + menu, and Esc closes it first; a click elsewhere closes it too)
['inspSfxOpen', 'inspDrift'].forEach(function(k){ const base = ACTIONS[k]; if(base) ACTIONS[k] = function(){ ui.inspPlusOpen = false; ui.inspBreezeAsk = false; return base.apply(this, arguments); }; });
document.addEventListener('keydown', function(e){
  if(e.key!=='Escape' || !(ui.inspPlusOpen || ui.inspBreezeAsk || ui.inspGroupOpen!=null) || !inspOpenNow()) return;
  e.stopPropagation(); e.preventDefault(); ui.inspPlusOpen = false; ui.inspBreezeAsk = false; ui.inspGroupOpen = null; inspRender();
}, true);
document.addEventListener('pointerdown', function(e){
  if(!(ui.inspPlusOpen || ui.inspBreezeAsk) || !e.target.closest) return;
  if(e.target.closest('.izk-plus-wrap, .izk-ask, [data-action="inspBreezeAway"]')) return;
  ui.inspPlusOpen = false; ui.inspBreezeAsk = false; setTimeout(inspRender, 0);
}, true);
// the middle: no more "Stuck? Reset" there (it's in the + menu); the groups get their own layer
inspHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<button class="izh-reset"[^>]*>[\s\S]*?<\/button>/, '');
    h = h.replace(/(<div class="izw-layer" data-morph-ignore="words"><\/div>)/, '$1<div class="izg-layer" data-morph-ignore="groups"></div>');
    if(IW.away) h = h.replace('<div class="izk-one">One thing, for now.</div>', '<div class="izk-one">A clear sky.</div>');
    if(IW.away && !/izk-one/.test(h)) h += '<div class="izk-one">A clear sky.</div>';
    return h;
  };
})(inspHtml);

// ---- Want to's that belong together ----
function inspGroups(){ const s = inspStore(); if(!Array.isArray(s.wantGroups)) s.wantGroups = []; return s.wantGroups; }
function inspGroupOf(id){ return inspGroups().find(function(g){ return g.indexOf(id) >= 0; }) || null; }
function inspGroupJoin(a, b){
  const gs = inspGroups(), ga = inspGroupOf(a), gb = inspGroupOf(b);
  if(ga && ga===gb) return;
  if(ga && gb){ gb.forEach(function(id){ if(ga.indexOf(id) < 0) ga.push(id); }); gs.splice(gs.indexOf(gb), 1); }
  else if(ga) ga.push(b); else if(gb) gb.push(a); else gs.push([b, a]);
  persist('personal');
}
function inspGroupsClean(){
  const w = inspWants(), gs = inspGroups();
  for(let i = gs.length - 1; i >= 0; i--){ gs[i] = gs[i].filter(function(id){ return w.indexOf(id) >= 0; }); if(gs[i].length < 2) gs.splice(i, 1); }
}
// drop a bubble on a Want to and they join (it becomes a Want to too); it settles in beside it
(function(){
  let src = null;
  document.addEventListener('pointerdown', function(e){ const b = e.target.closest && e.target.closest('#inspWorld .izb'); src = b ? b.dataset.id : null; }, true);
  window.addEventListener('pointerup', function(){
    const id = src; src = null;
    if(!id || Date.now() - (ui._inspDragAt||0) > 200) return;
    const me = document.querySelector('#inspWorld .izb[data-id="'+id+'"]'); if(!me) return;
    const r = me.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2, wants = inspWants();
    let hit = null;
    document.querySelectorAll('#inspWorld .izb').forEach(function(o){
      if(hit || o===me || wants.indexOf(o.dataset.id) < 0) return;
      const q = o.getBoundingClientRect(); if(Math.hypot(q.left + q.width/2 - cx, q.top + q.height/2 - cy) < Math.max(70, q.width*0.75)) hit = o;
    });
    const pos = inspPosStore();
    if(hit){
      if(wants.indexOf(id) < 0) wants.push(id);
      inspGroupJoin(hit.dataset.id, id);
      const tp = pos[hit.dataset.id] || {x:parseFloat(hit.style.left)||0, y:parseFloat(hit.style.top)||0}, n = inspGroupOf(id).length;
      const ang = n*1.1;
      pos[id] = {x:Math.round(tp.x + Math.cos(ang)*120), y:Math.round(tp.y + Math.sin(ang)*95)};
      persist('personal'); if(typeof inspChime==='function') inspChime(3);
      showToast('Together now. Open the “together” tag to do them all at once.', {icon:'&#128279;', duration:5000});
    }
    inspUnstick(); inspRender();
  });
})();
// the dotted line between them, and the tag
function inspGroupsDraw(placed){
  const layer = document.querySelector('#inspWorld .izg-layer'); if(!layer) return;
  inspGroupsClean();
  const gs = inspGroups().filter(function(g){ return g.every(function(id){ return placed[id]; }); });
  let sig = gs.map(function(g){ return g.join('+'); }).join('|')+'#'+(ui.inspGroupOpen!=null ? ui.inspGroupOpen : '');
  if(layer.dataset.sig!==sig){
    layer.dataset.sig = sig;
    layer.innerHTML = '<svg class="izg-svg" width="1" height="1">'+gs.map(function(g, gi){ return g.slice(1).map(function(_, k){ return '<line data-g="'+gi+'" data-k="'+k+'"/>'; }).join(''); }).join('')+'</svg>'+
      gs.map(function(g, gi){ return '<button class="izg-tag" data-action="inspGroupOpen" data-id="'+gi+'"><span>&#128279;</span>'+g.length+' together</button>'; }).join('')+
      (ui.inspGroupOpen!=null && gs[ui.inspGroupOpen] ? inspGroupCardHtml(gs[ui.inspGroupOpen], ui.inspGroupOpen) : '');
  }
  const lines = layer.querySelectorAll('line'), tags = layer.querySelectorAll('.izg-tag'), card = layer.querySelector('.izg-card');
  gs.forEach(function(g, gi){
    const pts = g.map(function(id){ return placed[id]; }), cx = pts.reduce(function(a, p){ return a + p.x; }, 0)/pts.length, cy = Math.min.apply(null, pts.map(function(p){ return p.y; }));
    // (edge to edge, not through the bubbles)
    g.slice(1).forEach(function(id, k){ const l = layer.querySelector('line[data-g="'+gi+'"][data-k="'+k+'"]'); if(l){ const a = placed[g[k]], b = placed[id], d = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), ux = (b.x - a.x)/d, uy = (b.y - a.y)/d, r = Math.min(62, d/2 - 4); l.style.display = d < 130 ? 'none' : ''; l.setAttribute('x1', (a.x + ux*r).toFixed(1)); l.setAttribute('y1', (a.y + uy*r).toFixed(1)); l.setAttribute('x2', (b.x - ux*r).toFixed(1)); l.setAttribute('y2', (b.y - uy*r).toFixed(1)); } });
    if(tags[gi]){ tags[gi].style.left = cx.toFixed(1)+'px'; tags[gi].style.top = (cy - 92).toFixed(1)+'px'; }
    if(card && gi===ui.inspGroupOpen){ card.style.left = cx.toFixed(1)+'px'; card.style.top = (cy - 104).toFixed(1)+'px'; }
  });
}
function inspGroupCardHtml(g, gi){
  return '<div class="izg-card"><small>Together</small>'+g.map(function(id){ const a = inspActs().find(function(x){ return x.id===id; }); return a ? '<div class="izg-i"><span>'+a.e+'</span>'+escapeHtml(a.label)+'</div>' : ''; }).join('')+
    '<div class="izg-r"><button class="izg-do" data-action="inspGroupDone" data-id="'+gi+'">I did them all</button><button data-action="inspGroupSplit" data-id="'+gi+'">Split up</button></div>'+
    '<button class="izg-x" data-action="inspGroupOpen" data-id="'+gi+'" aria-label="Close">&#10005;</button></div>';
}
ACTIONS.inspGroupOpen = function(el, e, id){ const i = Number(id); ui.inspGroupOpen = ui.inspGroupOpen===i ? null : i; ui.inspOpenAct = null; const l = document.querySelector('#inspWorld .izg-layer'); if(l) l.dataset.sig = ''; };
ACTIONS.inspGroupSplit = function(el, e, id){ const gs = inspGroups(), g = gs.filter(function(x){ return x.length >= 2; })[Number(id)]; if(g) gs.splice(gs.indexOf(g), 1); ui.inspGroupOpen = null; persist('personal'); const l = document.querySelector('#inspWorld .izg-layer'); if(l) l.dataset.sig = ''; inspRender(); };
ACTIONS.inspGroupDone = function(el, e, id){
  const g = inspGroups().filter(function(x){ return x.length >= 2; })[Number(id)]; if(!g) return;
  const ids = g.slice(); ui.inspGroupOpen = null;
  ids.forEach(function(aid, i){ setTimeout(function(){ try{ inspLogAct(aid); }catch(err){} }, i*180); });
  setTimeout(function(){ inspGroupsClean(); persist('personal'); inspRender(); }, ids.length*180 + 100);
};
// ---- nothing in limbo: out from under the middle and the vision board, and not stacked on each other ----
function inspUnstick(){
  const pos = inspPosStore(), wants = inspWants(), ids = Object.keys(pos);
  let moved = false;
  ids.forEach(function(id){
    const p = pos[id]; if(!p) return;
    const rr = Math.hypot(p.x, p.y*1.15);
    if(rr < 340){ const a = Math.atan2(p.y*1.15, p.x || 1); p.x = Math.round(Math.cos(a)*360); p.y = Math.round(Math.sin(a)*360/1.15); moved = true; }
    if(Math.abs(p.x) < 320 && p.y < -380 && p.y > -720){ if(p.y > -550) p.y = -370; else p.x = p.x < 0 ? -340 : 340; moved = true; }
  });
  // (two Want to's on the same spot: the one underneath steps out)
  for(let i = 0; i < ids.length; i++) for(let k = i + 1; k < ids.length; k++){
    const a = pos[ids[i]], b = pos[ids[k]]; if(!a || !b || wants.indexOf(ids[i]) < 0 || wants.indexOf(ids[k]) < 0) continue;
    if(Math.hypot(a.x - b.x, a.y - b.y) < 70){ b.x = Math.round(a.x + 120); b.y = Math.round(a.y + 40); moved = true; }
  }
  if(moved){ persist('personal'); ui._inspScatter = null; }
  return moved;
}
openInspire = (function(base){ return function(){ try{ inspUnstick(); inspGroupsClean(); }catch(e){} return base.apply(this, arguments); }; })(openInspire);
// the Want to list can find any of them: it comes out beside you and glows
ACTIONS.inspWantFind = function(el, e, id){
  const pos = inspPosStore(), n = inspWants().indexOf(id);
  pos[id] = {x:400 + (n % 3)*40, y:-60 + (n % 4)*90}; IW.off[id] = 0; delete IW.ret[id];
  persist('personal'); inspUnstick(); inspRender();
  setTimeout(function(){ const b = document.querySelector('#inspWorld .izb[data-id="'+id+'"]'); if(b){ b.classList.add('is-found'); setTimeout(function(){ b.classList.remove('is-found'); }, 2400); } }, 60);
};
inspHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    // a "find it" on each Want to row
    h = h.replace(/(<button class="izl-wd" data-action="inspWantDone" data-id="([^"]+)")/g, '<button class="izl-wf" data-action="inspWantFind" data-id="$2" title="Find it">&#8982;</button>$1');
    return h;
  };
})(inspHtml);

// ---- the words: perspective, not a to-do list ----
const INSP_SKY_LINES = [
  'You are allowed to be both a masterpiece and a work in progress.',
  'The sky doesn’t hurry, and everything still gets done.',
  'Most of what you worry about never happens.',
  'You can’t pour from an empty cup.',
  'Every day is a small life. Live this one well.',
  'Nothing is permanent. Not the hard days either.',
  'The obstacle is the way through.',
  'Be where your feet are.',
  'What you water grows.',
  'Slow is smooth. Smooth is fast.',
  'You don’t have to see the whole staircase. Just the next step.',
  'Rivers know this: there’s no hurry, we’ll get there some day.',
  'A calm mind sees further.',
  'Comparison is the thief of joy.',
  'Everything you want is on the other side of a little discomfort.',
  'You are not your thoughts. You’re the one noticing them.',
  'Gratitude turns what you have into enough.',
  'Rest is not the opposite of work. It’s part of it.',
  'The people you love are the point.',
  'Look up more. The sky is free.',
  'One kind word can change someone’s whole day.',
  'Breathe in what you need. Let go of the rest.',
  'Small steps, every day, add up to a different life.',
  'You’ve survived every bad day so far.',
  'Curiosity is the antidote to fear.',
  'Be the calm in the room.',
  'Life is long if you know how to use it.',
  'The present moment is the only one you’ll ever get to live in.',
  'Don’t believe everything you think.',
  'A closed mind is a quiet prison.',
  'Ask better questions and you’ll get a better life.',
  'There is more to life than making it faster.',
  'What would this look like if it were easy?',
  'Change is the only constant. Learn to dance with it.',
  'Be soft with yourself. You’re learning.',
  'Peace is a practice, not a place.',
  'Silence is where the good ideas hide.',
  'The best view comes after the hardest climb.',
  'You are always one decision away from a different day.',
  'Let the world be bigger than your problems for a minute.',
  'Who you are becoming matters more than what you have.',
  'Even the moon has phases.',
  'Joy is found in ordinary moments, noticed.',
  'Not everything that counts can be counted.',
  'Wherever you go, there you are.',
  'The mind is a garden. Choose your seeds.',
  'You don’t find meaning. You make it.',
  'Laugh more. It costs nothing.',
  'Every master was once a beginner.',
  'Some days you grow roots, not branches.'
];
inspWhisperLines = function(){
  const s = inspStore(), ai = s.skyLines && s.skyLines.date===todayStr() ? arr(s.skyLines.lines) : [];
  return ai.concat(INSP_SKY_LINES);
};
// Op writes a few of his own each day (when he can): the same spirit, never about work or goals
async function inspSkyRefresh(){
  const s = inspStore(); if(AI.hasKey!==true || typeof aiWrite!=='function' || (s.skyLines && s.skyLines.date===todayStr()) || ui._inspSkyBusy) return;
  ui._inspSkyBusy = true;
  try{
    const t = await Promise.race([aiWrite('Write six short lines that could drift across a calm night sky to widen someone’s perspective: philosophical, about life, time, attention, people, nature, impermanence, gratitude or curiosity. Like quotes, but your own words. Never about work, goals, productivity, habits or numbers, never an instruction to do something, no names or authors. At most fourteen words each. Answer with JSON only: {"lines":[""]}', {max:300}), new Promise(function(r){ setTimeout(r, 15000); })]);
    const m = /\{[\s\S]*\}/.exec(String(t||'')); if(!m) return;
    const lines = arr(JSON.parse(m[0]).lines).map(function(x){ return opNoDash(String(x||'')).replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120); }).filter(function(x){ return x.length > 8; }).slice(0, 6);
    if(lines.length){ s.skyLines = {date:todayStr(), lines:lines}; persist('personal'); }
  }catch(e){} finally{ ui._inspSkyBusy = false; }
}
openInspire = (function(base){ return function(){ const r = base.apply(this, arguments); setTimeout(function(){ try{ inspSkyRefresh(); }catch(e){} }, 1500); return r; }; })(openInspire);

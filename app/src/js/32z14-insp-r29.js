// ============ INSPIRATION, ROUND 29 ============
// - Words live on the sky now, behind the bubbles: they come into focus, drift a little and fade, smooth
//   (the page redrawing can't cut them off any more). Tap one to keep it in your journal (tagged Inspiration).
// - Catch a bubble as it drifts and keep it: "Want to" stops it in place, marks it, and lists it in the panel.
// - "Not for me" can be undone right there, and "More like this" tells Op what you like (his ideas follow).
// - Pick bubbles up and put them where you want them; they stay there.
// - Breeze: a gust from the left lifts everything away, all but the one idea for right now, which floats
//   up beside you ("one thing, for now"). Return brings them all back, somewhere new.

function inspWants(){ const s = inspStore(); if(!Array.isArray(s.wants)) s.wants = []; return s.wants; }
function inspLikes(){ const s = inspStore(); if(!Array.isArray(s.likes)) s.likes = []; return s.likes; }
function inspPosStore(){ const s = inspStore(); if(!s.pos || typeof s.pos!=='object') s.pos = {}; return s.pos; }

// ---- where they sit: your own spots win, and Return shuffles the rest ----
inspScatter = (function(base){
  return function(acts){
    const seed = inspStore().seed || 0;
    let out;
    if(!seed) out = base(acts);
    else {
      const key = acts.map(function(a){ return a.id; }).join(',')+'#'+seed;
      if(ui._inspScatter && ui._inspScatter.key===key) out = ui._inspScatter.out;
      else {
        const rnd = inspRand(acts.length*7919 + 17 + seed*104729), placed = [];
        out = [];
        acts.forEach(function(a, i){
          const s = 104 + Math.round(rnd()*30); let best = null;
          for(let tries = 0; tries < 160; tries++){
            const r = 270 + Math.min(900, i*34)*(0.55 + rnd()*0.6), ang = rnd()*Math.PI*2, x = Math.round(Math.cos(ang)*r*1.55), y = Math.round(Math.sin(ang)*r*0.78);
            if(Math.abs(x) < 300 && y < -330 && y > -720) continue;
            if(Math.hypot(x, y*1.15) < 330) continue;
            let ok = true; for(let k = 0; k < placed.length; k++){ const q = placed[k]; if(Math.hypot(q.x - x, q.y - y) < (q.s + s)/2 + 46){ ok = false; break; } }
            if(ok){ best = {x:x, y:y}; break; }
          }
          if(!best){ const ang = i*2.39996; best = {x:Math.round(Math.cos(ang)*(1300 + i*12)), y:Math.round(Math.sin(ang)*(620 + i*6))}; }
          placed.push({x:best.x, y:best.y, s:s}); out.push({a:a, x:best.x, y:best.y, s:s, d:(rnd()*7).toFixed(2)*1, t:(6 + rnd()*6).toFixed(1)*1});
        });
        ui._inspScatter = {key:key, out:out};
      }
    }
    const pos = inspPosStore(), likes = inspLikes();
    return out.map(function(p){ const q = pos[p.a.id]; return q || likes.indexOf(p.a.id) >= 0 ? Object.assign({}, p, q ? {x:q.x, y:q.y} : {}, likes.indexOf(p.a.id) >= 0 ? {s:Math.round(p.s*1.12)} : {}) : p; });
  };
})(inspScatter);

// ---- the engine, again: drag, wants, and the new breeze ----
IW.keep = null;
inspWindTick = function(now){
  IW.raf = 0;
  const L = document.getElementById('insp'); if(!L || !L.classList.contains('is-in')){ IW.last = 0; return; }
  const dt = IW.last ? Math.min(0.1, (now - IW.last)/1000) : 0; IW.last = now;
  const t = now/1000, speed = INSP_WINDS[inspWind()][2], f = inspField(), wants = inspWants();
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  L.querySelectorAll('#inspWorld .izb').forEach(function(el){
    const id = el.dataset.id; if(!id || el._drag) return;
    const x0 = parseFloat(el.style.left) || 0, y0 = parseFloat(el.style.top) || 0;
    const h = inspHash(id), want = wants.indexOf(id) >= 0, held = ui.inspOpenAct===id || el.matches(':hover') || want;
    el.classList.toggle('is-want', want);
    // the gust: it reaches the left side first; each bubble lifts, tilts and sails off to the right
    const keep = IW.away && IW.keep===id;
    let g = 0;
    if(IW.away && !keep){ const lag = Math.max(0, Math.min(1, (x0 - f.min)/f.w))*650; g = Math.max(0, Math.min(1, (now - IW.awayAt - lag)/1100)); }
    if(!held && !reduce && !keep){ IW.off[id] = (IW.off[id] || 0) + (speed*(0.75 + h*0.5) + g*g*1500)*dt; }
    let off = IW.off[id] || 0;
    const r = IW.ret[id]; if(r){ const k = Math.min(1, Math.max(0, (now - r.t0)/r.dur)), e = 1 - Math.pow(1 - k, 3); off += r.from*(1 - e); if(k >= 1) delete IW.ret[id]; }
    let wx = x0 + off; if(!IW.away){ wx = ((wx - f.min) % f.w + f.w) % f.w + f.min; }
    const amp = reduce ? 0 : 1, lift = speed ? 1 + speed/40 : 1;
    let dx = wx - x0 + amp*(Math.sin(t*(0.31 + h*0.2) + h*20)*14 + Math.sin(t*(0.13 + h*0.07) + h*7)*10);
    let dy = amp*(Math.cos(t*(0.27 + h*0.18) + h*11)*12*lift + Math.sin(t*(0.11 + h*0.05) + h*3)*9*lift) - g*g*(140 + h*120);
    let sc = 1 - g*0.18, rot = amp*Math.sin(t*0.4 + h*9)*(2 + speed/30) + g*(12 + h*14);
    // the one that stays: it floats up beside you, a little bigger
    const kp = IW.keepAt && IW.keep===id ? IW.keepAt : null;
    if(kp){ const k = Math.min(1, (now - kp.t0)/1600), ease = 1 - Math.pow(1 - k, 3), ee = IW.away ? ease : 1 - ease; dx = dx*(1 - ee) + (kp.x - x0)*ee; dy = dy*(1 - ee) + (kp.y - y0)*ee; sc = 1 + 0.16*ee;
      if(!IW.away && k >= 1){ IW.keepAt = null; IW.keep = null; } }
    el.classList.toggle('is-keep', !!(IW.away && keep));
    el._dx = dx; el._dy = dy;
    el.style.transform = 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0) rotate('+rot.toFixed(2)+'deg)'+(sc!==1 ? ' scale('+sc.toFixed(3)+')' : '');
    let op = 1;
    if(speed > 0 && !IW.away && !held){ const d = Math.min(wx - f.min, f.max - wx); op = Math.max(0, Math.min(1, d/260)); }
    // (they fade only once they're well on their way, not on the spot)
    if(IW.away && !keep) op = Math.max(0, 1 - Math.max(0, (off - 380)/520));
    if(r && !IW.away) op = Math.min(op, Math.min(1, Math.max(0, (now - r.t0)/900)));
    const px = x0 + dx, py = y0 + dy;
    const nearHub = Math.hypot(px, py*1.15) < 300 ? 1 - Math.max(0, (Math.hypot(px, py*1.15) - 230)/70) : 0;
    const nearBoard = Math.abs(px) < 300 && py < -400 && py > -700 ? 1 : 0;
    const behind = keep ? 0 : Math.max(nearHub, nearBoard);
    if(behind > 0) op = Math.min(op, 1 - behind*0.8);
    el.classList.toggle('is-behind', behind > 0.5);
    el.style.opacity = op < 0.999 ? op.toFixed(3) : '';
    el.style.pointerEvents = op < 0.15 ? 'none' : '';
    if(ui.inspOpenAct===id){ const c = L.querySelector('#inspWorld .izb-card'); if(c) c.style.transform = 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0)'; }
  });
  IW.raf = requestAnimationFrame(inspWindTick);
};
// Breeze: everything but the one for right now; Return: all back, in a new arrangement
function inspKeepId(){
  const wants = inspWants(), t = todayStr(), did = inspStore().log.filter(function(x){ return x.date===t; }).map(function(x){ return x.act; });
  const ids = Array.prototype.map.call(document.querySelectorAll('#inspWorld .izb'), function(b){ return b.dataset.id; });
  const pick = wants.find(function(id){ return ids.indexOf(id) >= 0; }) || (typeof inspPicks==='function' ? inspPicks().map(function(a){ return a.id; }).find(function(id){ return ids.indexOf(id) >= 0 && did.indexOf(id) < 0; }) : null);
  return pick || ids[0] || null;
}
ACTIONS.inspBreezeAway = function(){
  const L = document.getElementById('insp');
  if(!IW.away){
    IW.away = true; IW.awayAt = performance.now(); ui.inspOpenAct = null;
    IW.keep = inspKeepId(); IW.keepAt = IW.keep ? {t0:performance.now(), x:330, y:-30} : null;
    inspWhoosh(1); if(L) L.classList.add('is-away');
  } else {
    IW.away = false; const now = performance.now();
    if(IW.keepAt) IW.keepAt.t0 = now;
    // somewhere new: a fresh arrangement (the spots you chose stay yours)
    const s = inspStore(); s.seed = (s.seed || 0) + 1; persist('personal'); ui._inspScatter = null;
    IW.off = {}; IW.ret = {};
    inspRender();
    const f = inspField();
    document.querySelectorAll('#inspWorld .izb').forEach(function(el, i){
      const id = el.dataset.id; if(!id || id===IW.keep) return;
      const x0 = parseFloat(el.style.left) || 0;
      IW.ret[id] = {from:-(x0 - f.min + 420 + inspHash(id)*500), t0:now + i*60, dur:3000 + inspHash(id+'r')*1500};
    });
    if(L) L.classList.remove('is-away');
    if(typeof inspChime==='function') inspChime(3);
  }
  inspRender();
};

// ---- the card: Want to, More like this, I did this ----
inspHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const open = ui.inspOpenAct, wants = inspWants(), likes = inspLikes();
    if(open){
      const w = wants.indexOf(open) >= 0, l = likes.indexOf(open) >= 0;
      h = h.replace(/<button class="izb-x" data-action="inspOpenAct" data-id="([^"]+)">Later<\/button>/, '<button class="izb-want'+(w ? ' is-on' : '')+'" data-action="inspWant" data-id="$1">'+(w ? '&#9733; Want to' : '&#9734; Want to')+'</button><button class="izb-x" data-action="inspOpenAct" data-id="$1">Later</button>');
      h = h.replace(/<button class="izb-hide" data-action="inspHideAct" data-id="([^"]+)">Not for me<\/button>/, '<span class="izb-taste"><button class="izb-like'+(l ? ' is-on' : '')+'" data-action="inspLike" data-id="$1">'+(l ? '&#9829; You like this' : '&#9825; More like this')+'</button><button class="izb-hide" data-action="inspHideAct" data-id="$1">Not for me</button></span>');
    }
    // the words layer, behind the bubbles (the page redrawing leaves it alone)
    h = h.replace(/(<div class="insp-world" id="inspWorld"[^>]*>)/, '$1<div class="izw-layer" data-morph-ignore="words"></div>');
    // what you want to do, at the top of the panel
    if(wants.length && h.indexOf('<div class="izl-h">This week</div>') >= 0){
      const rows = wants.map(function(id){ const a = inspActs().find(function(x){ return x.id===id; }); return a ? '<div class="izl-want"><span>'+a.e+'</span><b>'+escapeHtml(a.label)+'</b><button class="izl-wd" data-action="inspWantDone" data-id="'+id+'" title="Did it">&#10003;</button><button class="izl-wx" data-action="inspWant" data-id="'+id+'" title="Not anymore">&#10005;</button></div>' : ''; }).join('');
      h = h.replace('<div class="izl-h">This week</div>', '<div class="izl-h">Want to</div><div class="izl-wants">'+rows+'</div><div class="izl-h">This week</div>');
    }
    if(IW.away && IW.keep) h += '<div class="izk-one">One thing, for now.</div>';
    return h;
  };
})(inspHtml);
ACTIONS.inspWant = function(el, e, id){
  const w = inspWants(), i = w.indexOf(id);
  if(i >= 0) w.splice(i, 1); else { w.push(id); if(typeof inspChime==='function') inspChime(2); }
  persist('personal'); inspRender();
};
ACTIONS.inspWantDone = function(el, e, id){ const w = inspWants(), i = w.indexOf(id); if(i >= 0) w.splice(i, 1); inspLogAct(id); if(typeof inspRipple==='function') inspRipple(); if(typeof inspChime==='function') inspChime(3); persist('personal'); inspRender(); };
inspLogAct = (function(base){ return function(id){ const w = inspWants(), i = w.indexOf(id); if(i >= 0) w.splice(i, 1); return base.apply(this, arguments); }; })(inspLogAct);
ACTIONS.inspLike = function(el, e, id){
  const l = inspLikes(), i = l.indexOf(id);
  if(i >= 0) l.splice(i, 1); else { l.push(id); if(typeof inspChime==='function') inspChime(2); }
  persist('personal'); inspRender();
};
// "Not for me" can be undone right away
ACTIONS.inspHideAct = (function(base){
  return function(el, e, id){
    base.apply(this, arguments);
    const a = inspActs().find(function(x){ return x.id===id; });
    let p = document.getElementById('inspUndo'); if(p) p.remove();
    p = document.createElement('div'); p.id = 'inspUndo'; p.className = 'insp-undo';
    p.innerHTML = '<span>'+(a ? a.e+' ' : '')+'Hidden'+(a ? ': '+escapeHtml(a.label) : '')+'</span><button data-action="inspUndoHide" data-id="'+id+'">Undo</button>';
    document.body.appendChild(p); clearTimeout(ui._inspUndoT);
    ui._inspUndoT = setTimeout(function(){ p.classList.add('is-out'); setTimeout(function(){ if(p.parentNode) p.remove(); }, 400); }, 7000);
  };
})(ACTIONS.inspHideAct);
ACTIONS.inspUndoHide = function(el, e, id){ const p = document.getElementById('inspUndo'); if(p) p.remove(); ACTIONS.inspUnhideAct(el, e, id); };
closeInspire = (function(base){ return function(){ const p = document.getElementById('inspUndo'); if(p) p.remove(); return base.apply(this, arguments); }; })(closeInspire);
// what you like and pass on shapes Op's ideas
inspAiFacts = (function(base){ return function(){ const l = inspLikes().map(function(id){ const a = inspActs().find(function(x){ return x.id===id; }); return a ? a.label : ''; }).filter(Boolean);
  return base.apply(this, arguments)+(l.length ? '\nIdeas he wants more like: '+l.join(', ')+'.' : '')+(inspWants().length ? '\nIdeas he’s saved to do: '+inspWants().map(function(id){ const a = inspActs().find(function(x){ return x.id===id; }); return a ? a.label : ''; }).filter(Boolean).join(', ')+'.' : ''); }; })(inspAiFacts);

// ---- pick a bubble up and put it where you want it ----
(function(){
  let d = null;
  document.addEventListener('pointerdown', function(e){
    const b = e.target.closest && e.target.closest('#inspWorld .izb'); if(!b || e.button!==0) return;
    d = {el:b, id:b.dataset.id, sx:e.clientX, sy:e.clientY, dx0:b._dx || 0, dy0:b._dy || 0, moved:false};
  }, true);
  window.addEventListener('pointermove', function(e){
    if(!d) return;
    const z = (ui.inspView || {z:1}).z, mx = (e.clientX - d.sx)/z, my = (e.clientY - d.sy)/z;
    if(!d.moved && Math.hypot(mx, my) < 6) return;
    if(!d.moved){ d.moved = true; d.el._drag = true; d.el.classList.add('is-dragging'); ui.inspOpenAct = null; }
    d.x = d.dx0 + mx; d.y = d.dy0 + my;
    d.el.style.transform = 'translate3d('+d.x.toFixed(1)+'px,'+d.y.toFixed(1)+'px,0) scale(1.08)';
  });
  window.addEventListener('pointerup', function(){
    if(!d) return; const x = d; d = null;
    if(!x.moved) return;
    ui._inspDragAt = Date.now();
    const nx = Math.round((parseFloat(x.el.style.left) || 0) + x.x), ny = Math.round((parseFloat(x.el.style.top) || 0) + x.y);
    inspPosStore()[x.id] = {x:nx, y:ny}; IW.off[x.id] = 0; delete IW.ret[x.id];
    x.el.style.left = nx+'px'; x.el.style.top = ny+'px'; x.el._drag = false; x.el.classList.remove('is-dragging');
    persist('personal'); if(typeof inspChime==='function') inspChime(1);
    inspRender();
  });
})();
ACTIONS.inspOpenAct = (function(base){ return function(){ if(Date.now() - (ui._inspDragAt||0) < 350) return; return base.apply(this, arguments); }; })(ACTIONS.inspOpenAct);

// ---- words on the sky, behind the bubbles; tap one to keep it ----
function inspWordsLayer(){ return document.querySelector('#inspWorld .izw-layer'); }
inspWords = function(){
  if(!inspOpenNow() || ui.inspBreath) return;
  const layer = inspWordsLayer(); if(!layer || layer.querySelector('.izwd:not(.is-gone)')) return;
  const lines = inspWhisperLines(); if(!lines.length) return;
  let t = lines[Math.floor(Math.random()*lines.length)]; if(t===ui._inspLastWhisper) t = lines[(lines.indexOf(t) + 1) % lines.length]; ui._inspLastWhisper = t;
  t = String(t).replace(/^["“]|["”]$/g, '').replace(/\s+[—-]\s+[A-Z][\w .]+$/, '');
  let slot = Math.floor(Math.random()*INSP_WORD_SLOTS.length); if(slot===ui._inspWordSlot) slot = (slot + 1) % INSP_WORD_SLOTS.length; ui._inspWordSlot = slot;
  const v = ui.inspView || inspHome(), W = window.innerWidth, H = window.innerHeight;
  const sx = INSP_WORD_SLOTS[slot][0]/100*W, sy = INSP_WORD_SLOTS[slot][1]/100*H;
  const w = document.createElement('div'); w.className = 'izwd'; w.dataset.text = t;
  w.style.left = Math.round((sx - W/2 - v.x)/v.z)+'px'; w.style.top = Math.round((sy - H/2 - v.y)/v.z)+'px';
  t.split(/\s+/).forEach(function(word, i){ const s = document.createElement('span'); s.textContent = word; s.style.animationDelay = (0.35 + i*0.09).toFixed(2)+'s'; w.appendChild(s); w.appendChild(document.createTextNode(' ')); });
  const k = document.createElement('button'); k.className = 'izwd-keep'; k.setAttribute('data-action', 'inspKeepWords'); k.innerHTML = '&#9825; Keep'; w.appendChild(k);
  layer.appendChild(w);
  setTimeout(function(){ w.classList.add('is-gone'); }, 11000);
  setTimeout(function(){ if(w.parentNode) w.parentNode.removeChild(w); }, 13200);
};
function journalTypeEnsure(id, emoji, label, color){
  const j = state.journal; if(!Array.isArray(j.types) || !j.types.length) j.types = defaultJournalTypes();
  if(!j.types.some(function(x){ return x.id===id; })) j.types.push({id:id, emoji:emoji, label:label, color:color});
}
function inspKeepText(text, by){
  journalTypeEnsure('inspiration', '✨', 'Inspiration', '#c9b6ff');
  state.journal.entries.push({id:uid(), date:todayStr(), timestamp:Date.now(), text:String(text||'')+(by ? '\n\n'+by : ''), title:'✨ Inspiration', type:'freeform', mood:'inspiration', pinned:false, photos:[]});
  persist('journal');
}
ACTIONS.inspKeepWords = function(el){
  const w = el.closest('.izwd'); if(!w || w.classList.contains('is-kept')) return;
  inspKeepText(w.dataset.text); w.classList.add('is-kept'); el.innerHTML = '&#9829; Kept';
  if(typeof inspChime==='function') inspChime(2);
};
// the Words cards keep too
inspSandHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="izq-x" data-action="inspQuoteDel" data-id="([^"]+)"/g, '<button class="izq-keep" data-action="inspKeepQuote" data-id="$1" title="Keep it in your journal">&#9825;</button><button class="izq-x" data-action="inspQuoteDel" data-id="$1"'); }; })(inspSandHtml);
ACTIONS.inspKeepQuote = function(el, e, id){ const q = inspSandStore().quotes.find(function(x){ return x.id===id; }); if(!q) return; inspKeepText(q.q, q.by ? '— '+q.by : ''); el.innerHTML = '&#9829;'; el.classList.add('is-on'); if(typeof inspChime==='function') inspChime(2); };

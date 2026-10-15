// ============ ROUND 38e ============
// • Top right: just your level and the music player (no clock, no full-screen icon).
// • Today's full-screen view: a small icon in the panel's corner (and M, and right-click).
// • Focus: no Minimal button and no way into the minimal view from there.
// • Skills: → Today / ← Backlog on their cards (they look the same), and never in "Ongoing".
// • Personal → You: the card turns over like the one on Today.
// • Op's box: grows with what he says (smoothly), you can resize it, long answers scroll gently.
// • Op at start-up: if his helper isn't up yet he waits a moment and tries again (no error line).

// ---- top right: level + music ----
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.md-time, .md-ck, .md-full').forEach(function(e){ e.remove(); });
    return tpl.innerHTML;
  };
})(dockHtml);
// ---- Today: full screen from a corner icon ----
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('class="today-hero') < 0) return h;
    return h.replace(/(<div class="today-hero[^"]*"[^>]*>)/, '$1<button class="th-full" data-action="toggleFocusMinimal" title="Full-screen view (M)" aria-label="Full-screen view"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>');
  };
})(renderToday);
// ---- Focus: no minimal view ----
renderFocus = (function(base){
  return function(){
    const was = state.profile.focusMinimal; state.profile.focusMinimal = false;
    let h;
    try{ h = base.apply(this, arguments); } finally { state.profile.focusMinimal = was; }
    return h.replace(/<span class="lv-corner is-focus">[\s\S]*?<\/button><\/span>/, '');
  };
})(renderFocus);
appMenuHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<div class="ctx-sep"><\/div><button class="ctx-item[^"]*" data-action="ctx" data-op="minimal"[^>]*>[\s\S]*?<\/button>/, '');
    if(ui.view==='today' && !state.focus.activeSession && !focusMinimalOn()) h += '<div class="ctx-sep"></div>'+ci('minimal', '&#9974; Full-screen view <span class="ctx-kbd">M</span>');
    return h;
  };
})(appMenuHtml);

// ---- skills: Today ⇄ Backlog, and not "Ongoing" ----
ACTIONS.skillMove = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t || t.status==='done') return;
  if(t.status==='today' && ui.currentTaskId===t.id && typeof releaseCurrentTask==='function') releaseCurrentTask();
  t.status = t.status==='today' ? 'backlog' : 'today';
  playTick(); persist('tasks'); renderView();
  showToast(t.status==='today' ? t.title+' is on today.' : t.title+' is back in the backlog.', {icon:'&#127919;'});
};
trainingSkillsHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/(<button class="btn btn-ghost btn-sm" data-action="openTaskEditModal" data-id="([^"]+)">Edit<\/button>)/g, function(m, b, id){
      const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return m;
      const on = t.status==='today';
      return b+'<button class="btn btn-ghost btn-sm sk-move'+(on ? ' is-today' : '')+'" data-action="skillMove" data-id="'+id+'" title="'+(on ? 'On today: send it back to the backlog' : 'Put it on today')+'">'+(on ? '&larr; Backlog' : '&rarr; Today')+'</button>';
    });
  };
})(trainingSkillsHtml);
renderOngoingTasksPanel = (function(base){
  return function(){
    const off = state.tasks.items.filter(function(t){ return t.skill && t.status!=='done'; }), was = off.map(function(t){ return t.status; });
    off.forEach(function(t){ t.status = 'done'; });
    try{ return base.apply(this, arguments); } finally { off.forEach(function(t, i){ t.status = was[i]; }); }
  };
})(renderOngoingTasksPanel);

// ---- Personal → You: the card turns over ----
function youCardBackHtml(){
  const x = xpSummary(), r = RANKS[x.rank];
  return '<div class="pc pc-big ycf-back tier-'+x.rank+'" data-action="ycFlip" style="--rc:'+r.color+'" title="Turn it back">'+
    '<span class="ycb-badge">'+rankBadgeSvg(x.rank, 44)+'</span>'+
    '<b class="ycb-rank" style="color:'+r.color+'">'+escapeHtml(r.name)+'</b>'+
    '<small class="ycb-k">Level '+x.level+' &middot; '+Math.max(0, x.levelHi - x.total).toLocaleString()+' XP to '+(x.level + 1)+'</small>'+
    '<i class="pcf-bar ycb-bar"><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i>'+
    (x.maxed ? '<small class="ycb-next">Top rank. Nothing above it.</small>' : x.next ? '<span class="ycb-next"><small>Next rank</small><b style="color:'+x.next.color+'">'+escapeHtml(x.next.name)+'</b>'+
      (x.needs && x.needs.length ? '<span class="ycb-needs">'+x.needs.map(function(n){ return '<i>'+escapeHtml(n)+'</i>'; }).join('')+'</span>' : '<span class="ycb-needs"><i>Ready: level up to rank up</i></span>')+'</span>' : '')+
    '<small class="ycb-tap">Tap to turn back</small>'+
  '</div>';
}
renderYouTab = (function(base){
  return function(){
    const h = base.apply(this, arguments), front = playerCardHtml('big');
    if(h.indexOf(front) < 0) return h;
    const f = front.replace('data-action="openYou"', 'data-action="ycFlip"').replace(/title="[^"]*"/, 'title="Turn the card over"');
    return h.replace(front, '<div class="ycf'+(ui.ycFlip ? ' is-flipped' : '')+'"><div class="ycf-in">'+f+youCardBackHtml()+'</div></div>');
  };
})(renderYouTab);
ACTIONS.ycFlip = function(el){ ui.ycFlip = !ui.ycFlip; const c = el && el.closest('.ycf'); if(c) c.classList.toggle('is-flipped', !!ui.ycFlip); playTick(); };

// ---- Op's box: grows with his words, resizable, gentle scrolling ----
function opBubSize(){ const s = state.profile.opBubSize; return s && s.w ? s : {w:380, h:0}; }
function opBubApplySize(b){
  if(!b) return;
  const s = opBubSize(), w = Math.max(300, Math.min(window.innerWidth - 40, s.w));
  b.style.setProperty('width', w+'px', 'important');
  opBubFit();
}
// the text area is as tall as the words need, up to your size (or 45% of the window), and it animates
function opBubFit(){
  const el = document.getElementById('opBubText'); if(!el) return;
  const s = opBubSize(), max = s.h ? Math.max(70, Math.min(window.innerHeight*0.7, s.h)) : Math.round(window.innerHeight*0.45);
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
  const want = Math.max(Math.ceil(lh*2.2), Math.min(max, el.scrollHeight));
  el.style.setProperty('height', want+'px', 'important');
  el.style.setProperty('max-height', max+'px', 'important');
  if(el.scrollHeight > want + 2) el.scrollTo({top:el.scrollHeight, behavior:'smooth'});
}
opBubShow = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b && !b.querySelector('.op-bub-rs')){
      const g = document.createElement('span'); g.className = 'op-bub-rs'; g.title = 'Drag to resize'; b.appendChild(g);
      g.addEventListener('mousedown', function(e){
        e.preventDefault(); e.stopPropagation();
        const r = b.getBoundingClientRect(), el = document.getElementById('opBubText'), th = el ? el.getBoundingClientRect().height : 120, x0 = e.clientX, y0 = e.clientY;
        b.classList.add('is-resizing');
        const mv = function(ev){
          const w = Math.max(300, Math.min(window.innerWidth - 40, r.width + (ev.clientX - x0)));
          const h = Math.max(70, Math.min(window.innerHeight*0.7, th - (ev.clientY - y0)));
          state.profile.opBubSize = {w:Math.round(w), h:Math.round(h)};
          b.style.setProperty('width', w+'px', 'important');
          if(el){ el.style.setProperty('height', h+'px', 'important'); el.style.setProperty('max-height', h+'px', 'important'); }
        };
        const up = function(){ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); b.classList.remove('is-resizing'); persist('profile'); opBubFit(); };
        document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
      });
      g.addEventListener('dblclick', function(){ state.profile.opBubSize = null; persist('profile'); opBubApplySize(b); });
    }
    opBubApplySize(b);
    return b;
  };
})(opBubShow);
opCaption = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(OV.cap==='opBubText' || !OV.cap) requestAnimationFrame(opBubFit);
    return r;
  };
})(opCaption);
window.addEventListener('resize', function(){ try{ opBubFit(); }catch(e){} });

// ---- Op at start-up: his helper may still be starting; wait and try again instead of an error ----
const OP_BOOT_AT = Date.now();
aiCall = (function(base){
  return async function(req){
    let res = await base.apply(this, arguments), n = 0;
    while(res && !res.ok && res.status===0 && !res.cancelled && !res.timedOut && Date.now() - OP_BOOT_AT < 90000 && n < 5){
      await new Promise(function(r){ setTimeout(r, 1500 + n*1000); }); n++;
      res = await base.call(this, req);
    }
    return res;
  };
})(aiCall);

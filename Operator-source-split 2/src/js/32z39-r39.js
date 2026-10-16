// ============ ROUND 39 ============
// One file per area of the round; each part says what it does.

// ---- 1. client deliverable tasks look like client work: violet, the deliverable big, the week as dots ----
function dvwView(t){
  const x = dvwFind(t); if(!x) return null;
  const c = x.c, name = x.oneOff ? String(x.d.title || 'Deliverable') : dvwBaseName(x.d);
  const parts = x.oneOff ? [] : dvwParts(x.d), at = x.oneOff ? 0 : parts.indexOf(x.k) + 1;
  return {x:x, c:c, who:c.business || c.name || 'Client', name:name, at:at, of:parts.length, pieces:x.oneOff ? 'One-off' : dvwPieces(x.d, x.need)};
}
function dvwDotsHtml(v){
  if(!v.of) return '<span class="dvc-one">One-off</span>';
  let h = '<span class="dvc-dots" title="Week '+v.x.k+' of the cycle">';
  for(let i = 1; i <= v.of; i++) h += '<i class="'+(i < v.at ? 'is-past' : i===v.at ? 'is-on' : '')+'"></i>';
  return h+'</span><b class="dvc-n">'+v.at+'/'+v.of+'</b>';
}
function dvwWeekLabel(v){ return v.x.oneOff ? 'One-off' : 'Week '+v.x.k; }
function dvwWhoHtml(v){ return '<span class="dvc-who"><span class="dvc-av" style="background:'+clientColor(v.c)+'">'+escapeHtml(clientInitials(v.c))+'</span>'+escapeHtml(v.who)+'</span>'; }
taskCard = (function(base){
  return function(t){
    const h = base.apply(this, arguments);
    if(!t || !t.master || t.master.kind!=='dvw') return h;
    const v = dvwView(t); if(!v) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const card = tpl.content.firstElementChild; if(!card) return h;
    const due = card.querySelector('.kpi-sub'), more = card.querySelector('.card-more');
    card.classList.add('dvc');
    // just the three things: the week, the deliverable, the client
    card.innerHTML = '<div class="dvc-top"><span class="dvc-wkp">'+dvwWeekLabel(v)+'</span>'+(more ? more.outerHTML : '')+'</div>'+
      '<div class="dvc-title">'+escapeHtml(v.name)+'</div>'+
      '<div class="dvc-wk">'+(v.of ? dvwDotsHtml(v) : '')+(due ? '<span class="dvc-due">'+due.outerHTML+'</span>' : '')+'</div>'+
      '<div class="dvc-foot">'+dvwWhoHtml(v)+'</div>';
    return tpl.innerHTML;
  };
})(taskCard);
lineupListHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('tl-row') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.tl-row').forEach(function(row){
      const t = state.tasks.items.find(function(x){ return x.id===row.dataset.taskId; });
      if(!t || !t.master || t.master.kind!=='dvw') return;
      const v = dvwView(t); if(!v) return;
      row.classList.add('tl-dlv');
      const main = row.querySelector('.tl-main');
      if(main) main.innerHTML = '<span class="dvc-wkp">'+dvwWeekLabel(v)+'</span><span class="tl-title">'+escapeHtml(v.name)+'</span>'+(v.of ? '<span class="dvc-wk is-inline">'+dvwDotsHtml(v)+'</span>' : '');
      row.querySelectorAll('.tag-client').forEach(function(e, i){ if(i===0){ const w = document.createElement('template'); w.innerHTML = dvwWhoHtml(v); e.replaceWith(w.content.firstElementChild); } else e.remove(); });
    });
    return tpl.innerHTML;
  };
})(lineupListHtml);

// ---- 2. Today's Clients panel: the whole card opens the client ----
renderClientHubPanel = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<div class="hub-card (hl-[a-z]+)" data-key="hub-([^"]+)">/g, function(m, hl, id){
      return '<div class="hub-card '+hl+' is-open-able" data-key="hub-'+id+'" data-action="openContact" data-kind="client" data-id="'+id+'" title="Open their card">';
    });
  };
})(renderClientHubPanel);

// ---- 3. logging a touch: the type menu floats above everything (it was hidden under the next panel), and
// after a quick log it opens on its own so you can say what it really was ----
function touchFloatSync(){
  document.querySelectorAll('body > .touch-menu.is-float').forEach(function(e){ e.remove(); });
  const m = document.querySelector('#viewRoot .touch-menu'); if(!m || !ui.touchMenu) return;
  const k = ui.touchMenu.split(':'), btn = document.querySelector('#viewRoot .touch-more-btn[data-kind="'+k[0]+'"][data-id="'+k[1]+'"]');
  if(!btn){ m.remove(); return; }
  const r = btn.getBoundingClientRect();
  m.classList.add('is-float'); document.body.appendChild(m);
  const w = m.offsetWidth || 240, h = m.offsetHeight || 140;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))+'px';
  m.style.top = (r.bottom + 6 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6)+'px';
  if(ui.touchRetype && ui.touchRetype.key===ui.touchMenu){
    const hd = document.createElement('div'); hd.className = 'touch-menu-h'; hd.innerHTML = 'Logged a '+escapeHtml(touchTypeById(ui.touchRetype.type).label.toLowerCase())+'. Was it something else?';
    m.insertBefore(hd, m.firstChild);
    m.querySelectorAll('.touch-menu-btn').forEach(function(b){ b.dataset.action = 'retypeTouch'; b.classList.toggle('is-on', b.dataset.type===ui.touchRetype.type); });
  }
}
afterRenderHooks.push(function(){ try{ touchFloatSync(); }catch(e){} });
window.addEventListener('scroll', function(){ if(ui.touchMenu){ ui.touchMenu = null; ui.touchRetype = null; document.querySelectorAll('body > .touch-menu.is-float').forEach(function(e){ e.remove(); }); } }, true);
document.addEventListener('mousedown', function(e){
  if(!ui.touchMenu || (e.target.closest && e.target.closest('.touch-menu, .touch-more-btn, .touch-log-btn'))) return;
  ui.touchMenu = null; ui.touchRetype = null; document.querySelectorAll('body > .touch-menu.is-float').forEach(function(x){ x.remove(); });
});
ACTIONS.quickTouch = (function(base){
  return function(el){
    const r = base.apply(this, arguments);
    const l = lastTouchLogged;
    if(l && el && !el.closest('#clientModalOverlay')){
      const x = crmFind(l.kind, l.id), tp = x && arr(x.touchpoints).find(function(t){ return t.id===l.tpId; });
      if(tp){ ui.touchMenu = l.kind+':'+l.id; ui.touchRetype = {key:ui.touchMenu, type:tp.type}; renderView(); clearTimeout(ACTIONS.quickTouch._t); ACTIONS.quickTouch._t = setTimeout(function(){ if(ui.touchRetype){ ui.touchMenu = null; ui.touchRetype = null; renderView(); } }, 6000); }
    }
    return r;
  };
})(ACTIONS.quickTouch);
ACTIONS.retypeTouch = function(el){
  const l = lastTouchLogged, ty = el && el.dataset.type; if(!l || !ty) return;
  const x = crmFind(l.kind, l.id), tp = x && arr(x.touchpoints).find(function(t){ return t.id===l.tpId; });
  if(tp){ tp.type = ty; x.lastTouchType = ty; crm().lastTouchType = ty; persist('business'); }
  ui.touchMenu = null; ui.touchRetype = null; playTick(); renderView();
  const tt = touchTypeById(ty); showToast('Changed to a '+tt.label.toLowerCase()+' with '+crmName(l.kind, x)+'.', {icon:tt.icon});
};

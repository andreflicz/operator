// ============ ROUND 43 (build 3d): FOCUS LOOKS ============
// Current + Up next can be shown three ways (Settings → Look & Sound → Appearance): Spotlight (Current big,
// Up next as the strip under it), Side by side, or Classic (how it looked before).
const FOCUS_LOOKS = [['spotlight', 'Spotlight'], ['split', 'Side by side'], ['classic', 'Classic']];
function focusLook(){ const v = state.profile.focusLook; return FOCUS_LOOKS.some(function(l){ return l[0]===v; }) ? v : 'spotlight'; }
nowNextPanelHtml = (function(base){
  return function(opts){
    const look = focusLook();
    if(opts && opts.stack) return base.apply(this, arguments);
    if(look==='classic' && r41NnBase) return r41NnBase.apply(this, arguments);
    const h = base.apply(this, arguments);
    return look==='split' ? h.replace('<div class="r41-nn', '<div class="r41-nn is-split') : h;
  };
})(nowNextPanelHtml);
themeSettingsHtml = (function(base){
  return function(){
    const cur = focusLook();
    return base.apply(this, arguments)+'<div class="field r43-look"><label>Focus layout</label><div class="r43-seg">'+
      FOCUS_LOOKS.map(function(l){ return '<button type="button" class="'+(cur===l[0] ? 'is-on' : '')+'" data-action="setFocusLook" data-id="'+l[0]+'">'+l[1]+'</button>'; }).join('')+'</div></div>';
  };
})(themeSettingsHtml);
ACTIONS.setFocusLook = function(el, e, id){ state.profile.focusLook = id; persist('profile'); playTick(); renderView(); };

// ---- Waiting on clients, at a glance: a dashed strip under Worth doing soon (tap one for the Waiting tab) ----
renderFocusTasksOverview = (function(base){
  return function(){
    const h = base.apply(this, arguments), w = typeof r42Waiting==='function' ? r42Waiting() : [];
    if(!w.length) return h;
    const chips = w.map(function(t){
      const x = t.waitingOn || {}, c = r42ClientOf(t), col = c ? clientAccent(c) : '#8A90A2';
      const days = x.since ? Math.max(0, Math.round((new Date(todayStr()+'T12:00') - new Date(x.since+'T12:00'))/86400000)) : 0;
      return '<button class="r43-wchip" style="--cc:'+col+'" data-action="r43OpenWaiting">'+escapeHtml((c ? (c.business || c.name)+' · ' : '')+(x.what || t.title))+' · '+(days ? days+' day'+(days===1 ? '' : 's') : 'today')+'</button>';
    }).join('');
    return h+'<section class="r43-wait" aria-label="Waiting on clients"><span class="r43-k">Waiting on clients</span>'+chips+'</section>';
  };
})(renderFocusTasksOverview);
ACTIONS.r43OpenWaiting = function(){ ui.focusTasksSubTab = 'waiting'; renderView(); };

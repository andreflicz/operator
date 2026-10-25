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

// ============ MUSIC DOCK ============
// Always up in the top-right corner, tiny: ▶ plays Operator's own generated tracks (⏭ skips).
// That's it — the Apple Music playlists are gone; Apple Music is only for the wake-up song.
// In the minimal locked-in view the same player sits under the timer.
function dockSrc(){ return FM.playing ? 'fm' : null; }
function musicOn(){ return !!FM.playing; }
function dockSrcName(){ return FM.playing ? FOCUS_TRACKS[FM.idx].name : ''; }
ACTIONS.dockFm = function(){
  if(FM.playing) focusMusicStop(); else focusMusicPlay();
  dockRefresh();
};
ACTIONS.dockNext = function(){ if(FM.playing) ACTIONS.fmNext(); };
// the third button in the minimal view: music on / off
ACTIONS.npMusic = function(){ ACTIONS.dockFm(); };
function dockBtnsHtml(){
  const on = musicOn();
  return '<button class="md-b md-fm'+(on?' is-on':'')+'" data-action="dockFm" title="'+(on ? 'Pause' : 'Play Operator’s focus tracks')+'">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9654;')+'</button>';
}
function dockHtml(){
  const name = dockSrcName();
  return '<div class="md-in'+(musicOn()?' is-playing':'')+'">'+(name ? '<span class="md-now" title="'+escapeHtml(name)+'">'+escapeHtml(name)+'</span><button class="md-b md-skip" data-action="dockNext" title="Next">&#9197;</button>' : '')+dockBtnsHtml()+'</div>';
}
function npMusicBtnHtml(){ const on = musicOn(); return '<button class="np-c np-music'+(on?' is-on':'')+'" data-action="npMusic" title="'+(on ? 'Pause the music' : 'Music')+'">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9835;')+'</button>'; }
function npMusicRowHtml(){
  const name = dockSrcName();
  return '<div class="np-mrow"><span class="np-mnow">'+(name ? escapeHtml(name) : 'Focus music')+'</span>'+(name ? '<button class="md-b md-skip" data-action="dockNext" title="Next">&#9197;</button>' : '')+'<span class="np-msrc">'+dockBtnsHtml()+'</span></div>';
}
function dockRefresh(){
  let d = document.getElementById('musicDock');
  if(!d){ d = document.createElement('div'); d.id = 'musicDock'; d.className = 'md'; document.body.appendChild(d); }
  const h = dockHtml(); if(d._h!==h){ d.innerHTML = h; d._h = h; }
  const key = String(dockSrc())+'|'+dockSrcName();
  document.querySelectorAll('.np-mrow, .np-c.np-music').forEach(function(el){ if(el.dataset.k===key) return; const n = el.classList.contains('np-mrow') ? npMusicRowHtml() : npMusicBtnHtml(); const t = document.createElement('div'); t.innerHTML = n; const nn = t.firstChild; nn.dataset.k = key; el.replaceWith(nn); });
  const art = document.querySelector('.np-locked .np-art:not(.is-break)');
  if(art){ const on = musicOn(); art.classList.toggle('is-music', on); const eq = art.querySelector('.np-art-eq'); if(on && !eq) art.insertAdjacentHTML('beforeend', '<span class="np-art-eq wk2-eq"><i></i><i></i><i></i><i></i></span>'); if(!on && eq) eq.remove(); }
}
// the old player's refresh now refreshes the dock too
fmRefresh = function(){ dockRefresh(); };
afterRenderHooks.push(function(){ dockRefresh(); document.body.classList.toggle('np-locked-on', !!document.querySelector('#viewRoot .np-locked')); });

// ============ MUSIC DOCK ============
// Always up in the top-right corner, tiny: ▶ plays Operator's own generated tracks (⏭ skips).
// That's it — the Apple Music playlists are gone; Apple Music is only for the wake-up song.
// In the minimal locked-in view the same player sits under the timer.
function fmOn(){ return !!(FM.playing || FM.switching); }
function dockSrc(){ return fmOn() ? 'fm' : null; }
function musicOn(){ return fmOn(); }
function dockSrcName(){ return fmOn() ? FOCUS_TRACKS[FM.idx].name : ''; }
ACTIONS.dockFm = function(){
  if(FM.switching) return;
  if(FM.playing) focusMusicStop(); else focusMusicPlay();
  dockRefresh();
};
ACTIONS.dockNext = function(){ if(FM.playing && !FM.switching) ACTIONS.fmNext(); };
// the third button in the minimal view: music on / off
ACTIONS.npMusic = function(){ ACTIONS.dockFm(); };
function dockBtnsHtml(){
  const on = musicOn();
  return '<button class="md-b md-fm'+(on?' is-on':'')+'" data-action="dockFm" title="'+(on ? 'Pause' : 'Play Operator’s focus tracks')+'">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9654;')+'</button>';
}
function dockHtml(){
  const name = dockSrcName();
  // the Operator's mic sits here too: talk to it from anywhere
  return '<div class="md-in'+(musicOn()?' is-playing':'')+'">'+(name ? '<span class="md-now" title="'+escapeHtml(name)+'">'+escapeHtml(name)+'</span><button class="md-b md-skip" data-action="dockNext" title="Next">&#9197;</button>' : '')+dockBtnsHtml()+
    '<button class="md-b md-op op-talk" data-action="opTalk" title="Talk to the Operator">&#127897;&#65039;</button></div>';
}
// (main: the big middle button of the minimal player — ▶ / ❚❚)
function npMusicBtnHtml(main){ const on = musicOn(); return '<button class="np-c np-music'+(main?' is-main':'')+(on?' is-on':'')+'" data-action="npMusic" title="'+(on ? 'Pause the music' : 'Play music')+'">'+(on ? (main ? '&#10073;&#10073;' : '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>') : (main ? '&#9654;' : '&#9835;'))+'</button>'; }
// under the player: what's playing and ⏭ — only while something plays (the big button starts it)
function npMusicRowHtml(){
  const name = dockSrcName();
  if(!name) return '<div class="np-mrow is-empty"></div>';
  return '<div class="np-mrow"><span class="np-mnow">&#9835; '+escapeHtml(name)+'</span><button class="md-b md-skip" data-action="dockNext" title="Next track">&#9197;</button></div>';
}
function dockRefresh(){
  let d = document.getElementById('musicDock');
  if(!d){ d = document.createElement('div'); d.id = 'musicDock'; d.className = 'md'; document.body.appendChild(d); }
  const h = dockHtml(); if(d._h!==h){ d.innerHTML = h; d._h = h; }
  const key = String(dockSrc())+'|'+dockSrcName();
  document.querySelectorAll('.np-mrow, .np-c.np-music').forEach(function(el){ if(el.dataset.k===key) return; const n = el.classList.contains('np-mrow') ? npMusicRowHtml() : npMusicBtnHtml(el.classList.contains('is-main')); const t = document.createElement('div'); t.innerHTML = n; const nn = t.firstChild; nn.dataset.k = key; el.replaceWith(nn); });
  const art = document.querySelector('.np-locked .np-art:not(.is-break)');
  if(art){ const on = musicOn(); art.classList.toggle('is-music', on); const eq = art.querySelector('.np-art-eq'); if(on && !eq) art.insertAdjacentHTML('beforeend', '<span class="np-art-eq wk2-eq"><i></i><i></i><i></i><i></i></span>'); if(!on && eq) eq.remove(); }
}
// the old player's refresh now refreshes the dock too
fmRefresh = function(){ dockRefresh(); };
afterRenderHooks.push(function(){ dockRefresh(); document.body.classList.toggle('np-locked-on', !!document.querySelector('#viewRoot .np-locked')); });

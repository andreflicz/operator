// ============ MUSIC DOCK ============
// Always up in the top-right corner, tiny: ▶ plays Operator's own generated tracks; ☀ is your
// morning playlist; 1 · 2 · 3 are three Apple Music playlists of your choosing (each its own colour).
// Only one thing plays at a time. In the minimal locked-in view the same controls sit under the timer.
const DOCK_COLORS = ['#5fd4c4', '#a98bff', '#ff8fb1'];
const SUN_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="4.3" fill="currentColor"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6L7 17M17 7l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function userPlaylists(){
  let p = state.profile.playlists;
  if(!Array.isArray(p)) p = state.profile.playlists = [null, null, null];
  while(p.length < 3) p.push(null);
  return p;
}
// what's playing: 'fm' (generated), 'sun' (morning playlist), or 0/1/2 (a numbered playlist)
function dockSrc(){ if(FM.playing) return 'fm'; return ui.amSrc!=null ? ui.amSrc : null; }
function musicOn(){ return dockSrc()!=null; }
function dockSrcName(){
  const s = dockSrc();
  if(s==='fm') return FOCUS_TRACKS[FM.idx].name;
  if(s==='sun'){ const m = morningPlaylist(); return m ? m.q : 'Morning playlist'; }
  if(s!=null){ const p = userPlaylists()[s]; return p ? p.q : ''; }
  return '';
}
async function playApplePlaylist(pl, src){
  if(!pl) return false;
  if(FM.playing) focusMusicStop();
  ui.amSrc = src; if(src==='sun') ui.plPlaying = true; dockRefresh();
  const r = await fetchWithin(MUSIC_URL+'pick?k=playlist&q='+hexUtf8(pl.q)+(pl.url ? '&u='+hexUtf8(pl.url) : ''), 12000);
  if(r && r.ok) return true;
  if(ui.amSrc===src){ ui.amSrc = null; if(src==='sun') ui.plPlaying = false; }
  dockRefresh();
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(j && j.opened) showToast('“'+escapeHtml(pl.q)+'” isn’t in your library yet — it’s open in Apple Music now. Tap ＋ Add once, then it plays from here.', {icon:'&#9835;', duration:9000});
  else if(r) showToast('No playlist called “'+escapeHtml(pl.q)+'” in your library. Paste its link in Settings → Sound instead.', {icon:'&#9888;', duration:7000});
  else showToast('Apple Music plays through the Operator app — it isn’t reachable right now.', {icon:'&#9888;'});
  return false;
}
function stopAppleMusic(){ if(ui.amSrc!=null){ ui.amSrc = null; ui.plPlaying = false; musicApp('pause'); } }
// the morning playlist goes through the same path (☀ in the dock, the play button on Good morning)
ACTIONS.playMorningPlaylist = function(){ return playApplePlaylist(morningPlaylist(), 'sun'); };
ACTIONS.stopMorningPlaylist = function(){ stopAppleMusic(); dockRefresh(); };
ACTIONS.dockFm = function(){
  if(FM.playing){ focusMusicStop(); }
  else { stopAppleMusic(); focusMusicPlay(); }
  dockRefresh();
};
ACTIONS.dockSun = function(){
  if(dockSrc()==='sun'){ stopAppleMusic(); dockRefresh(); return; }
  if(!morningPlaylist()){ ACTIONS.setMorningPlaylist(); return; }
  ACTIONS.playMorningPlaylist();
};
async function setUserPlaylist(i, v){
  const pl = await setPlaylistFrom(v);
  userPlaylists()[i] = pl; persist('profile');
  return pl;
}
ACTIONS.dockPl = function(el, e, id){
  const i = Number(id), pl = userPlaylists()[i];
  if(!pl){ const v = window.prompt('Playlist '+(i+1)+' — paste its Apple Music link (••• → Share → Copy Link), or type its exact name:', ''); if(!v || !v.trim()) return; setUserPlaylist(i, v).then(function(p){ if(p) playApplePlaylist(p, i); dockRefresh(); }); return; }
  if(dockSrc()===i){ stopAppleMusic(); dockRefresh(); return; }
  playApplePlaylist(pl, i);
};
// right-click a number to change which playlist it plays
document.addEventListener('contextmenu', function(e){
  const b = e.target.closest && e.target.closest('[data-action="dockPl"]'); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const i = Number(b.dataset.id), cur = userPlaylists()[i];
  const v = window.prompt('Playlist '+(i+1)+' — paste an Apple Music link or a name (empty to clear):', cur ? (cur.url || cur.q) : '');
  if(v===null) return;
  if(!v.trim()){ userPlaylists()[i] = null; persist('profile'); dockRefresh(); return; }
  setUserPlaylist(i, v).then(dockRefresh);
}, true);
ACTIONS.dockNext = function(){ if(dockSrc()==='fm') ACTIONS.fmNext(); else if(dockSrc()!=null) musicApp('next'); };
// the third button in the minimal view: music on / off (picks up whatever played last)
ACTIONS.npMusic = function(){
  const s = dockSrc();
  if(s!=null){ ui.lastSrc = s; if(s==='fm') focusMusicStop(); else stopAppleMusic(); dockRefresh(); return; }
  const last = ui.lastSrc;
  if(last==='sun' && morningPlaylist()) ACTIONS.playMorningPlaylist();
  else if(typeof last==='number' && userPlaylists()[last]) playApplePlaylist(userPlaylists()[last], last);
  else { focusMusicPlay(); dockRefresh(); }
};
function dockBtnsHtml(){
  const s = dockSrc(), pls = userPlaylists();
  return '<button class="md-b md-fm'+(s==='fm'?' is-on':'')+'" data-action="dockFm" title="'+(s==='fm' ? 'Pause' : 'Play Operator’s focus tracks')+'">'+(s==='fm' ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9654;')+'</button>'+
    '<button class="md-b md-sun'+(s==='sun'?' is-on':'')+(morningPlaylist()?'':' is-unset')+'" data-action="dockSun" title="'+(morningPlaylist() ? (s==='sun' ? 'Pause ' : 'Play ')+escapeHtml(morningPlaylist().q) : 'Pick a morning playlist')+'">'+SUN_SVG+'</button>'+
    [0,1,2].map(function(i){ const p = pls[i]; return '<button class="md-b md-n'+(s===i?' is-on':'')+(p?'':' is-unset')+'" style="--c:'+DOCK_COLORS[i]+'" data-action="dockPl" data-id="'+i+'" title="'+(p ? (s===i ? 'Pause ' : 'Play ')+escapeHtml(p.q)+' (right-click to change)' : 'Set playlist '+(i+1))+'">'+(i+1)+'</button>'; }).join('');
}
function dockHtml(){
  const name = dockSrcName();
  return '<div class="md-in'+(musicOn()?' is-playing':'')+'">'+(name ? '<span class="md-now" title="'+escapeHtml(name)+'">'+escapeHtml(name)+'</span><button class="md-b md-skip" data-action="dockNext" title="Next">&#9197;</button>' : '')+dockBtnsHtml()+'</div>';
}
function npMusicBtnHtml(){ const on = musicOn(); return '<button class="np-c np-music'+(on?' is-on':'')+'" data-action="npMusic" title="'+(on ? 'Pause the music' : 'Music')+'">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9835;')+'</button>'; }
function npMusicRowHtml(){
  const name = dockSrcName();
  return '<div class="np-mrow"><span class="np-mnow">'+(name ? escapeHtml(name) : 'Music')+'</span>'+(name ? '<button class="md-b md-skip" data-action="dockNext" title="Next">&#9197;</button>' : '')+'<span class="np-msrc">'+dockBtnsHtml()+'</span></div>';
}
function dockRefresh(){
  let d = document.getElementById('musicDock');
  if(!d){ d = document.createElement('div'); d.id = 'musicDock'; d.className = 'md'; document.body.appendChild(d); }
  const h = dockHtml(); if(d._h!==h){ d.innerHTML = h; d._h = h; }
  const key = String(dockSrc())+'|'+dockSrcName()+'|'+JSON.stringify(userPlaylists().map(function(p){ return p ? p.q : ''; }))+'|'+(morningPlaylist() ? morningPlaylist().q : '');
  document.querySelectorAll('.np-mrow, .np-c.np-music').forEach(function(el){ if(el.dataset.k===key) return; const n = el.classList.contains('np-mrow') ? npMusicRowHtml() : npMusicBtnHtml(); const t = document.createElement('div'); t.innerHTML = n; const nn = t.firstChild; nn.dataset.k = key; el.replaceWith(nn); });
  const art = document.querySelector('.np-locked .np-art:not(.is-break)');
  if(art){ const on = musicOn(); art.classList.toggle('is-music', on); const eq = art.querySelector('.np-art-eq'); if(on && !eq) art.insertAdjacentHTML('beforeend', '<span class="np-art-eq wk2-eq"><i></i><i></i><i></i><i></i></span>'); if(!on && eq) eq.remove(); }
  if(overlayOpen('wakeOverlay') && ui.wakeMode==='brief' && ui._dockKey!==key){ ui._dockKey = key; renderWakeOverlayInto(); }
}
// the old player's refresh now refreshes the dock too
fmRefresh = function(){ dockRefresh(); };
afterRenderHooks.push(function(){ dockRefresh(); document.body.classList.toggle('np-locked-on', !!document.querySelector('#viewRoot .np-locked')); });

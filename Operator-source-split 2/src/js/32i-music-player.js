
// ============ APPLE MUSIC PLAYER (sidebar) ============
// A small player at the bottom of the sidebar that drives the Music app on this Mac through the
// Operator app (127.0.0.1:8935): what's playing, play/pause, skip, volume, and your playlists to
// pick from — so music, like the wake-up song, never needs another window. It only shows when
// the Operator app is there to talk to, and only asks what's playing while Operator is on screen.
const MP = {now:null, at:0, helper:null, lists:null, timer:null, tick:null, open:false, failAt:0};
function mpOn(){ return state.profile.musicPlayer!==false; }
function mpUrl(path){ return WAKE_HELPER+'music/'+path; }
async function mpPoll(){
  if(!mpOn() || document.hidden){ return; }
  if(MP.helper===false && Date.now()-MP.failAt < 60000) return;
  const j = await helperFetch(mpUrl('now'), 3500, true);
  if(!j){ MP.helper = false; MP.failAt = Date.now(); mpRender(); return; }
  MP.helper = true; MP.now = j; MP.at = Date.now(); mpRender();
}
function mpStart(){
  clearInterval(MP.timer); MP.timer = setInterval(mpPoll, 5000);
  clearInterval(MP.tick); MP.tick = setInterval(mpTickBar, 1000);
  setTimeout(mpPoll, 1200);
}
document.addEventListener('visibilitychange', function(){ if(!document.hidden) mpPoll(); });
function mpPos(){
  const n = MP.now; if(!n || !n.dur) return 0;
  return Math.min(n.dur, (n.pos||0) + (n.state==='playing' ? (Date.now()-MP.at)/1000 : 0));
}
function mpFmt(s){ s = Math.max(0, Math.round(s)); return Math.floor(s/60)+':'+pad2(s%60); }
function mpTickBar(){
  const n = MP.now; if(!n || n.state!=='playing') return;
  const bar = document.getElementById('mpBar'), t = document.getElementById('mpTime');
  if(bar) bar.style.width = (n.dur ? mpPos()/n.dur*100 : 0).toFixed(1)+'%';
  if(t) t.textContent = mpFmt(mpPos())+' / '+mpFmt(n.dur);
}
function mpHtml(){
  if(!mpOn() || !MP.helper) return '';
  const n = MP.now || {state:'off'};
  const playing = n.state==='playing', has = n.state==='playing' || n.state==='paused';
  const btn = function(c, icon, title, cls){ return '<button class="mp-btn'+(cls?' '+cls:'')+'" data-action="mpCmd" data-id="'+c+'" title="'+title+'">'+icon+'</button>'; };
  return '<div class="mp'+(playing?' is-playing':'')+(MP.open?' is-open':'')+'">'+
    '<div class="mp-top" data-action="mpToggle" title="'+(MP.open?'Hide':'Playlists & volume')+'">'+
      '<span class="mp-art">'+(playing ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9835;')+'</span>'+
      '<span class="mp-meta"><span class="mp-name">'+(has ? escapeHtml(n.name||'') : 'Apple Music')+'</span><span class="mp-artist">'+(has ? escapeHtml(n.artist||'') : 'Pick a playlist')+'</span></span>'+
    '</div>'+
    (has ? '<div class="mp-prog"><i id="mpBar" style="width:'+(n.dur ? mpPos()/n.dur*100 : 0).toFixed(1)+'%"></i></div>' : '')+
    '<div class="mp-ctl">'+btn('prev', '&#9198;', 'Previous')+btn('playpause', playing ? '&#10073;&#10073;' : '&#9654;', playing ? 'Pause' : 'Play', 'mp-main')+btn('next', '&#9197;', 'Next')+
      (has ? '<span class="mp-time" id="mpTime">'+mpFmt(mpPos())+' / '+mpFmt(n.dur||0)+'</span>' : '')+'</div>'+
    (MP.open ? '<div class="mp-more">'+
      '<label class="mp-vol"><span>&#128264;</span><input type="range" min="0" max="100" value="'+(n.vol||50)+'" id="mpVol"></label>'+
      '<div class="mp-search"><input class="input" id="mpQuery" placeholder="Play a song or playlist…"></div>'+
      '<div class="mp-lists">'+(MP.lists==null ? '<span class="kpi-sub">Loading playlists…</span>' : MP.lists.length ? MP.lists.map(function(l){ return '<button class="mp-list" data-action="mpPick" data-id="'+escapeHtml(l)+'">'+escapeHtml(l)+'</button>'; }).join('') : '<span class="kpi-sub">No playlists found.</span>')+'</div>'+
    '</div>' : '')+
  '</div>';
}
function mpRender(){ const el = document.getElementById('musicPlayer'); if(el) morphInto(el, mpHtml()); }
ACTIONS.mpCmd = async function(el, e, id){
  if(e) e.stopPropagation();
  // feel instant: flip play/pause on screen right away
  if(id==='playpause' && MP.now && (MP.now.state==='playing' || MP.now.state==='paused')){ MP.now.pos = mpPos(); MP.at = Date.now(); MP.now.state = MP.now.state==='playing' ? 'paused' : 'playing'; mpRender(); }
  const j = await helperFetch(mpUrl('cmd?c='+id), 4000, true);
  if(j){ MP.now = j; MP.at = Date.now(); mpRender(); }
};
ACTIONS.mpToggle = function(){
  MP.open = !MP.open; mpRender();
  if(MP.open && MP.lists==null) helperFetch(mpUrl('playlists'), 6000, true).then(function(j){ MP.lists = j && Array.isArray(j.lists) ? j.lists : []; mpRender(); });
};
async function mpPlay(name, kind){
  const j = await helperFetch(mpUrl('pick?k='+(kind||'playlist')+'&q='+hexUtf8(name)), 8000, true);
  if(j && j.state){ MP.now = j; MP.at = Date.now(); mpRender(); }
  else showToast('Couldn\'t find "'+name+'" in your Music library.', {icon:'&#9835;'});
}
ACTIONS.mpPick = function(el, e, id){ mpPlay(id, 'playlist'); };
document.addEventListener('keydown', function(e){
  if(e.key==='Enter' && e.target && e.target.id==='mpQuery'){ e.preventDefault(); const v = e.target.value.trim(); if(v){ mpPlay(v, 'any'); e.target.value = ''; } }
});
let mpVolT = null;
document.addEventListener('input', function(e){
  if(e.target && e.target.id==='mpVol'){ const v = Math.round(Number(e.target.value)); if(MP.now) MP.now.vol = v; clearTimeout(mpVolT); mpVolT = setTimeout(function(){ helperFetch(mpUrl('vol?v='+v), 3000); }, 120); }
});
ACTIONS.setMusicPlayer = function(el){ state.profile.musicPlayer = !!el.checked; persist('profile'); if(mpOn()) mpPoll(); mpRender(); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='setMusicPlayer') ACTIONS.setMusicPlayer(e.target); });
afterRenderHooks.push(function(){ if(!MP.timer && typeof state!=='undefined' && state && state.profile) mpStart(); });

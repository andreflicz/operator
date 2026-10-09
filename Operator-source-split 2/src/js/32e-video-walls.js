
// ============ VIDEO WALLPAPERS ============
// Real footage as the background — a space flyover, Tokyo at night, a rainy skyline — like a live
// wallpaper. Add your own clips (any .mp4/.mov/.webm, e.g. free 4K loops from Pexels or Mixkit) or a
// direct video link. Files stay on this Mac in IndexedDB under their own "vidb:" key, so they never
// bloat the JSON backup. The video plays muted on a loop behind a soft veil (so text stays readable)
// and pauses whenever Operator isn't the window in front, so it costs nothing while you're elsewhere.
function videoWalls(){ return arr(state.profile.videoWalls); }
function videoWallById(id){ return videoWalls().find(function(v){ return v.id===id; }) || null; }
const VW = {wrap:null, video:null, id:null, url:null};
async function videoWallSrc(v){
  if(!v) return null;
  if(String(v.src).indexOf('vidb:')!==0) return v.src;
  try{
    const b = await blobTx('readonly', function(store){ return store.get(v.src.slice(5)); });
    return b ? URL.createObjectURL(b) : null;
  }catch(e){ return null; }
}
function videoWallRelease(){
  if(VW.url && VW.url.indexOf('blob:')===0){ try{ URL.revokeObjectURL(VW.url); }catch(e){} }
  VW.url = null;
}
function videoWallMount(id){
  if(!id){
    if(VW.wrap){ VW.video.pause(); VW.video.removeAttribute('src'); VW.video.load(); VW.wrap.remove(); VW.wrap = VW.video = null; }
    videoWallRelease(); VW.id = null; return;
  }
  if(!VW.wrap){
    VW.wrap = document.createElement('div'); VW.wrap.className = 'scene-layer scene-video-wrap'; VW.wrap.id = 'sceneVideoWrap';
    VW.video = document.createElement('video'); VW.video.className = 'scene-video';
    VW.video.muted = true; VW.video.loop = true; VW.video.playsInline = true; VW.video.setAttribute('muted', ''); VW.video.setAttribute('playsinline', ''); VW.video.preload = 'auto';
    VW.video.addEventListener('playing', function(){ VW.wrap && VW.wrap.classList.add('is-ready'); });
    VW.wrap.appendChild(VW.video);
    document.body.insertBefore(VW.wrap, document.body.firstChild);
  }
  if(VW.id===id) { videoWallPlayPause(); return; }
  VW.id = id; VW.wrap.classList.remove('is-ready');
  const v = videoWallById(id);
  videoWallSrc(v).then(function(url){
    if(VW.id!==id || !VW.video) { if(url && url.indexOf('blob:')===0) URL.revokeObjectURL(url); return; }
    videoWallRelease(); VW.url = url;
    if(!url){ showToast('That video couldn\'t be loaded — try adding it again.', {icon:'&#127902;'}); return; }
    VW.video.src = url;
    videoWallPlayPause();
  });
}
function videoWallShouldPlay(){ return !document.hidden && (document.hasFocus() || state.profile.videoWallAlwaysPlay===true); }
function videoWallPlayPause(){
  if(!VW.video || !VW.video.src) return;
  if(videoWallShouldPlay()){ const p = VW.video.play(); if(p && p.catch) p.catch(function(){}); }
  else VW.video.pause();
}
window.addEventListener('focus', videoWallPlayPause);
window.addEventListener('blur', videoWallPlayPause);
document.addEventListener('visibilitychange', videoWallPlayPause);
// ---- adding / removing ----
function videoWallName(raw){
  const base = String(raw||'').split(/[\\/?#]/).filter(Boolean).pop() || 'Video';
  const name = base.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[-_]+/g, ' ').trim();
  return name.length > 28 ? name.slice(0, 27)+'…' : (name || 'Video');
}
// A still from a couple of seconds in, for the picker card (links from other sites may not allow it).
function videoWallThumb(url){
  return new Promise(function(resolve){
    const v = document.createElement('video'); let done = false;
    const finish = function(d){ if(done) return; done = true; v.removeAttribute('src'); v.load(); resolve(d); };
    v.muted = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.addEventListener('loadeddata', function(){ try{ v.currentTime = Math.min(2, (v.duration||4)/3); }catch(e){ finish(''); } });
    v.addEventListener('seeked', function(){
      try{ const c = document.createElement('canvas'); c.width = 336; c.height = 200;
        const s = Math.max(c.width/v.videoWidth, c.height/v.videoHeight), w = v.videoWidth*s, h = v.videoHeight*s;
        c.getContext('2d').drawImage(v, (c.width-w)/2, (c.height-h)/2, w, h); finish(c.toDataURL('image/jpeg', 0.78)); }
      catch(e){ finish(''); }
    });
    v.addEventListener('error', function(){ finish(''); });
    setTimeout(function(){ finish(''); }, 8000);
    v.src = url;
  });
}
async function addVideoWallFile(file){
  if(!file || !(file.type||'').match(/^video\//)){ showToast('Pick a video file (.mp4, .mov or .webm).', {icon:'&#127902;'}); return; }
  const key = 'vw'+uid();
  try{ await blobTx('readwrite', function(store){ return store.put(file, key); }); }
  catch(e){ showToast('Couldn\'t save that video — the disk may be full.', {icon:'&#9888;'}); return; }
  const url = URL.createObjectURL(file);
  const thumb = await videoWallThumb(url); URL.revokeObjectURL(url);
  const v = {id:uid(), name:videoWallName(file.name), src:'vidb:'+key, thumb:thumb, size:file.size};
  state.profile.videoWalls = videoWalls().concat([v]);
  setScene('vid:'+v.id);
  showToast('Video wallpaper on — it pauses whenever Operator isn\'t in front.', {icon:'&#127902;'});
}
async function addVideoWallUrl(raw){
  const url = String(raw||'').trim();
  if(!/^https?:\/\/\S+$/i.test(url)){ showToast('Paste a direct link to a video file (ending in .mp4 or .webm).', {icon:'&#127902;'}); return; }
  const v = {id:uid(), name:videoWallName(url), src:url, thumb:''};
  state.profile.videoWalls = videoWalls().concat([v]);
  ui.videoWallLink = false;
  setScene('vid:'+v.id);
  videoWallThumb(url).then(function(t){ if(t){ v.thumb = t; persist('profile'); renderView(); } });
}
ACTIONS.videoWallPickFile = function(){ const i = document.getElementById('videoWallFile'); if(i) i.click(); };
ACTIONS.videoWallLink = function(){ ui.videoWallLink = !ui.videoWallLink; renderView(); setTimeout(function(){ const i = document.getElementById('videoWallUrl'); if(i) i.focus(); }, 30); };
ACTIONS.videoWallAddUrl = function(){ const i = document.getElementById('videoWallUrl'); addVideoWallUrl(i ? i.value : ''); };
ACTIONS.videoWallRemove = function(el, e, id){
  if(e) e.stopPropagation();
  const v = videoWallById(id); if(!v) return;
  if(!confirm('Remove the "'+v.name+'" wallpaper?')) return;
  state.profile.videoWalls = videoWalls().filter(function(x){ return x.id!==id; });
  if(String(v.src).indexOf('vidb:')===0) blobTx('readwrite', function(store){ return store.delete(v.src.slice(5)); }).catch(function(){});
  if(state.profile.scene==='vid:'+id) state.profile.scene = 'minimal';
  persist('profile'); sceneMount(); renderView();
};
document.addEventListener('change', function(e){
  const t = e.target;
  if(t && t.id==='videoWallFile' && t.files && t.files[0]){ addVideoWallFile(t.files[0]); t.value = ''; }
  else if(t && t.id==='videoWallAlways'){ state.profile.videoWallAlwaysPlay = t.checked; persist('profile'); videoWallPlayPause(); }
});
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='videoWallUrl'){ e.preventDefault(); ACTIONS.videoWallAddUrl(); } });
// ---- picker (inside Settings → Display → Scene) ----
function videoWallCardsHtml(cur){
  return videoWalls().map(function(v){
    return '<button class="scene-card scene-card-video'+(cur==='vid:'+v.id?' is-on':'')+'" data-action="setScene" data-id="vid:'+v.id+'">'+
      '<span class="scene-thumb'+(v.thumb?'':' is-video-blank')+'"'+(v.thumb ? ' style="background-image:url('+v.thumb+')"' : '')+'><span class="scene-vid-badge">&#9654;</span></span>'+
      '<span class="scene-name">'+escapeHtml(v.name)+'</span>'+
      '<span class="scene-vid-x" data-action="videoWallRemove" data-id="'+v.id+'" title="Remove">&#10005;</span></button>';
  }).join('');
}
function videoWallAddHtml(){
  return '<div class="vw-add">'+
    '<span class="kind-label" style="margin:0;">Video wallpaper'+tip('Real footage behind the app — space, Tokyo at night, a skyline in the rain. Free 4K loops: pexels.com/videos or mixkit.co (search "tokyo night", "space", "shanghai"). Download one, then add it here. Short loops (10–60s, 1080p) are smoothest.')+'</span>'+
    '<button class="btn btn-ghost btn-sm" data-action="videoWallPickFile">&#127902; Add a video file</button>'+
    '<button class="btn btn-ghost btn-sm" data-action="videoWallLink">&#128279; From a link</button>'+
    '<input type="file" id="videoWallFile" accept="video/*" hidden>'+
    (ui.videoWallLink ? '<div class="row vw-link"><input class="input" id="videoWallUrl" placeholder="https://…/clip.mp4" style="flex:1;min-width:220px;"><button class="btn btn-sm" data-action="videoWallAddUrl">Add</button></div>' : '')+
    (sceneId().indexOf('vid:')===0 ? '<label class="row" style="gap:8px;width:100%;font-size:12.5px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" id="videoWallAlways" '+(state.profile.videoWallAlwaysPlay===true?'checked':'')+'>Keep playing when Operator isn\'t in front (uses more battery)</label>' : '')+
  '</div>';
}

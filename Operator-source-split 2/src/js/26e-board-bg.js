
// ============ BOARD BACKGROUNDS ============
// Every board can have its own background: a color, a gradient, a dot / grid / ruled pattern,
// or a photo of your own. "Match theme" (the default) is dark in dark mode and light in light mode.
// Light backgrounds switch the cards to white and the default-colored lines to dark ink.
const BOARD_BGS = [
  {id:'auto', label:'Match theme'},
  {id:'midnight', label:'Midnight', color:'#0a0c10', dots:'rgba(255,255,255,.07)'},
  {id:'charcoal', label:'Charcoal', color:'#17191f'},
  {id:'night', label:'Night sky', color:'#0b1430', grad:'linear-gradient(160deg,#0b1430,#1d2b52)', dots:'rgba(255,255,255,.05)'},
  {id:'forest', label:'Forest', color:'#0f1f1a', grad:'linear-gradient(160deg,#0d1c17,#1c3a2e)'},
  {id:'plum', label:'Plum', color:'#1c1028', grad:'linear-gradient(160deg,#1a0f26,#3a1d40)'},
  {id:'sunset', label:'Sunset', color:'#2b1d3a', grad:'linear-gradient(170deg,#241a3d,#6b3a5c 55%,#c97a5c)'},
  {id:'blueprint', label:'Blueprint', color:'#123a6b', grid:'rgba(255,255,255,.12)'},
  {id:'cloud', label:'Cloud', color:'#eef1f6', dots:'rgba(20,24,36,.14)', light:true},
  {id:'paper', label:'Paper', color:'#f6f2e9', lines:'rgba(60,70,90,.12)', light:true},
  {id:'sand', label:'Sand', color:'#efe5d3', light:true},
  {id:'white', label:'White', color:'#ffffff', grid:'rgba(20,24,36,.06)', light:true}
];
function boardBgPreset(b){
  const id = b && typeof b.bg==='string' ? b.bg : 'auto';
  if(id==='auto') return BOARD_BGS.find(function(x){ return x.id===(document.documentElement.getAttribute('data-theme')==='light' ? 'cloud' : 'midnight'); });
  return BOARD_BGS.find(function(x){ return x.id===id; }) || BOARD_BGS[1];
}
function boardBgPattern(p){
  if(p.dots) return 'radial-gradient('+p.dots+' 1px, transparent 1.2px)';
  if(p.grid) return 'linear-gradient('+p.grid+' 1px, transparent 1px), linear-gradient(90deg, '+p.grid+' 1px, transparent 1px)';
  if(p.lines) return 'linear-gradient('+p.lines+' 1px, transparent 1px)';
  return 'none';
}
function boardHasImage(b){ return !!(b && b.bg && typeof b.bg==='object' && b.bg.img); }
function boardIsLight(b){ return !boardHasImage(b) && !!boardBgPreset(b).light; }
// the live canvas: color + zoom-following pattern on the host, gradient / photo on a still layer under it
function applyBoardBg(host, b){
  if(!host || !b) return;
  const p = boardBgPreset(b), img = boardHasImage(b);
  host.style.backgroundColor = img ? '#0a0c10' : p.color;
  host.style.backgroundImage = img ? 'none' : boardBgPattern(p);
  host.classList.toggle('board-light', boardIsLight(b));
  let layer = host.querySelector(':scope > .board-bg');
  if(!layer){ layer = document.createElement('div'); layer.className = 'board-bg'; host.insertBefore(layer, host.firstChild); }
  const bgImg = img ? 'linear-gradient(rgba(0,0,0,'+(b.bg.dim!=null ? b.bg.dim : 0.25)+'), rgba(0,0,0,'+(b.bg.dim!=null ? b.bg.dim : 0.25)+')), url("'+blobUrl(b.bg.img)+'")' : (p.grad || 'none');
  if(layer.style.backgroundImage!==bgImg) layer.style.backgroundImage = bgImg;
}
// the same look for pictures of a board (Today, the wake screen, the strip)
function boardBgStyle(b){
  const p = boardBgPreset(b);
  if(boardHasImage(b)) return 'background:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25)), url(&quot;'+escapeHtml(blobUrl(b.bg.img))+'&quot;) center/cover, #0a0c10;';
  return 'background:'+(p.grad ? p.grad+', ' : '')+p.color+';';
}
function boardBgPickerHtml(b){
  const cur = boardHasImage(b) ? 'image' : (typeof b.bg==='string' ? b.bg : 'auto');
  return '<div class="board-bg-pop" data-key="bgpop-'+b.id+'">'+
    '<div class="board-bg-grid">'+BOARD_BGS.map(function(p){
      const sw = p.id==='auto' ? 'linear-gradient(135deg,#0a0c10 50%,#eef1f6 50%)' : (p.grad || p.color);
      return '<button class="board-bg-sw'+(cur===p.id?' is-on':'')+'" data-action="boardSetBg" data-id="'+p.id+'" title="'+escapeHtml(p.label)+'"><span style="background:'+sw+'"></span><em>'+escapeHtml(p.label)+'</em></button>';
    }).join('')+'</div>'+
    '<div class="row" style="gap:6px;margin-top:10px;"><button class="btn btn-sm" data-action="boardBgUpload">&#128444; Use a photo</button>'+(cur==='image' ? '<button class="btn btn-ghost btn-sm" data-action="boardSetBg" data-id="auto">Remove photo</button>' : '')+'</div>'+
  '</div>';
}
ACTIONS.boardBgToggle = function(){ ui.boardBgOpen = !ui.boardBgOpen; renderView(); };
ACTIONS.boardSetBg = function(el, e, id){
  const b = cvBoard() || boardById(ui.boardIds && ui.boardIds.journal); if(!b) return;
  if(boardHasImage(b) && typeof blobRemove==='function'){ try{ blobRemove(b.bg.img); }catch(err){} }
  b.bg = id; persist('boards'); renderView();
  if(cv.host) applyBoardBg(cv.host, b);
};
ACTIONS.boardBgUpload = function(){
  const b = cvBoard(); if(!b) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async function(){
    const f = inp.files && inp.files[0]; if(!f) return;
    try{
      const ref = await storeImageFile(f);
      if(boardHasImage(b) && typeof blobRemove==='function'){ try{ blobRemove(b.bg.img); }catch(err){} }
      b.bg = {img:ref, dim:0.25}; persist('boards'); ui.boardBgOpen = false; renderView();
      if(cv.host) applyBoardBg(cv.host, b);
    }catch(err){ showToast('Couldn\'t use that image.', {icon:'&#9888;'}); }
  };
  inp.click();
};
document.addEventListener('pointerdown', function(e){
  if(!ui.boardBgOpen) return;
  if(e.target.closest && (e.target.closest('.board-bg-pop') || e.target.closest('[data-action="boardBgToggle"]'))) return;
  ui.boardBgOpen = false; renderView();
}, true);

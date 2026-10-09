
// ============ CAROUSEL LAYOUT ============
// Rows that don't fit slide sideways instead of showing a scrollbar: the edges fade, ‹ › arrows
// appear only when there's more that way. With "Card layout: Carousel" (Settings → Display) the
// leads board, client cards and task rows become a 3D carousel — cards tilt and fade toward the
// ends (a scroll-driven CSS animation, so it costs no script work while you scroll).
function cardLayout(){ return state.profile.cardLayout==='carousel' ? 'carousel' : 'grid'; }
function carouselOn(){ return cardLayout()==='carousel'; }
// opts.loop + opts.count: a long row loops forever — the cards are laid out three times and the
// scroll position quietly jumps back to the middle copy, so there's never an end to hit.
function carouselWrap(itemsHtml, key, opts){
  opts = opts || {};
  const threeD = opts.threeD!==undefined ? opts.threeD : carouselOn();
  const avail = Math.max(320, window.innerWidth - (state.profile.sidebarCollapsed ? 70 : 230) - 40);
  const loop = !!(opts.loop && opts.count && opts.count*((opts.w||240)+12) > avail);
  const clone = function(tag){ return itemsHtml.replace(/ data-key="/g, ' data-key="'+tag+'-').replace(/ id="[^"]*"/g, '').replace(/class="/, 'aria-hidden="true" class="car-clone '); };
  const body = loop ? clone('cA')+itemsHtml+clone('cB') : itemsHtml;
  return '<div class="carousel'+(threeD?' is-3d':'')+(opts.fit?' is-fit':'')+(loop?' is-loop':'')+(opts.bleed!==false?' bleed':'')+(opts.cls?' '+opts.cls:'')+'" data-key="car-'+key+'"'+(opts.w?' style="--car-w:'+opts.w+'px"':'')+'>'+
    '<button class="car-arrow car-prev" data-action="carouselStep" data-dir="-1" aria-label="Back">&#8249;</button>'+
    '<div class="car-track'+(opts.trackCls?' '+opts.trackCls:'')+'" data-car="'+key+'"'+(loop?' data-loop="1"':'')+'>'+body+'</div>'+
    '<button class="car-arrow car-next" data-action="carouselStep" data-dir="1" aria-label="More">&#8250;</button>'+
  '</div>';
}
function carUpdate(track){
  const wrap = track.parentElement; if(!wrap) return;
  if(track.dataset.loop){
    const third = track.scrollWidth/3;
    if(!track._loopInit){ track._loopInit = true; track.scrollLeft = third; }
    else if(track.scrollLeft < third*0.5) track.scrollLeft += third;
    else if(track.scrollLeft > third*1.5) track.scrollLeft -= third;
    if(!wrap.classList.contains('can-prev')) wrap.classList.add('can-prev', 'can-next');
    track.classList.add('fade-l', 'fade-r');
    return;
  }
  const max = track.scrollWidth - track.clientWidth;
  const l = track.scrollLeft > 4, r = track.scrollLeft < max - 4;
  if(track.classList.contains('fade-l')!==l) track.classList.toggle('fade-l', l);
  if(track.classList.contains('fade-r')!==r) track.classList.toggle('fade-r', r);
  if(wrap.classList.contains('can-prev')!==l) wrap.classList.toggle('can-prev', l);
  if(wrap.classList.contains('can-next')!==r) wrap.classList.toggle('can-next', r);
}
function carUpdateAll(){ document.querySelectorAll('.car-track').forEach(carUpdate); }
let carRaf = 0, carPending = new Set();
document.addEventListener('scroll', function(e){
  const t = e.target; if(!t || !t.classList || !t.classList.contains('car-track')) return;
  carPending.add(t);
  if(!carRaf) carRaf = requestAnimationFrame(function(){ carRaf = 0; carPending.forEach(carUpdate); carPending.clear(); });
}, {capture:true, passive:true});
window.addEventListener('resize', function(){ requestAnimationFrame(carUpdateAll); });
let carHookRaf = 0;
afterRenderHooks.push(function(){ if(!carHookRaf && document.querySelector('.car-track')) carHookRaf = requestAnimationFrame(function(){ carHookRaf = 0; carUpdateAll(); }); });
ACTIONS.carouselStep = function(el){
  const track = el.parentElement && el.parentElement.querySelector('.car-track'); if(!track) return;
  track.scrollBy({left:Number(el.dataset.dir) * Math.max(220, track.clientWidth*0.75), behavior:'smooth'});
};
ACTIONS.setCardLayout = function(el, e, id){ state.profile.cardLayout = id; persist('profile'); renderView(); };
function cardLayoutSettingsHtml(){
  const cur = cardLayout();
  const opt = function(id, label){ return '<button class="seg-tab'+(cur===id?' active':'')+'" data-action="setCardLayout" data-id="'+id+'">'+label+'</button>'; };
  return '<div class="section"><div class="section-title">Card layout'+tip('Carousel lines up leads, clients and tasks in a sliding row — cards tilt and fade toward the edges, with arrows to move. Grid keeps them in rows; the leads board then stretches to fit the screen.')+'</div><div class="card">'+
    '<div class="seg-tabs" style="margin:0;">'+opt('grid', '&#9638; Grid')+opt('carousel', '&#10697; Carousel')+'</div>'+
  '</div></div>';
}

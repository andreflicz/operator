
// ============ WISH LIST (Personal) ============
const WISH_PRIORITIES = [{id:'high', label:'Must have'}, {id:'med', label:'Want'}, {id:'low', label:'Someday'}];
function wishPrice(w){ const n = Number(w.price); return isNaN(n) ? 0 : n; }
function fmtMoney(n){ return '$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:0, maximumFractionDigits:2}); }
function renderWishlistTab(){
  const items = arr(state.personal.wishlist);
  const rank = {high:0, med:1, low:2};
  const open = items.filter(function(w){ return !w.purchased; }).sort(function(a,b){ return (rank[a.priority]-rank[b.priority]) || wishPrice(b)-wishPrice(a); });
  const bought = items.filter(function(w){ return w.purchased; });
  const total = open.reduce(function(a,w){ return a+wishPrice(w); },0);
  const mustTotal = open.filter(function(w){ return w.priority==='high'; }).reduce(function(a,w){ return a+wishPrice(w); },0);
  return '<div class="wish-total card">'+
      '<div><div class="kpi-label">Still to buy</div><div class="wish-total-val">'+fmtMoney(total)+'</div><div class="kpi-sub">'+open.length+' item'+(open.length===1?'':'s')+(mustTotal?' &middot; '+fmtMoney(mustTotal)+' must-haves':'')+'</div></div>'+
    '</div>'+
    '<div class="wish-grid">'+(open.map(wishCard).join('') || '<div class="empty" style="grid-column:1/-1;">Nothing on the list yet.</div>')+'</div>'+
    (bought.length ? '<div class="kind-label" style="margin-top:22px;">Purchased &middot; '+bought.length+'</div><div class="wish-grid">'+bought.map(wishCard).join('')+'</div>' : '');
}
function wishCard(w){
  const pr = WISH_PRIORITIES.find(function(p){ return p.id===w.priority; }) || WISH_PRIORITIES[1];
  return '<div class="wish-card'+(w.purchased?' is-bought':'')+'" data-key="wish-'+w.id+'">'+
    '<div class="wish-img" data-action="openWishItem" data-id="'+w.id+'">'+(w.image ? '<img src="'+escapeHtml(blobUrl(w.image))+'" alt="">' : '<span>&#127873;</span>')+'</div>'+
    '<div class="wish-body">'+
      '<div class="wish-name" data-action="openWishItem" data-id="'+w.id+'">'+escapeHtml(w.name)+'</div>'+
      '<div class="row" style="justify-content:space-between;align-items:center;">'+
        '<span class="wish-price">'+(w.price!=null && w.price!=='' ? fmtMoney(wishPrice(w)) : '<span class="kpi-sub">no price</span>')+'</span>'+
        '<span class="tag tag-'+(w.priority||'med')+'">'+pr.label+'</span>'+
      '</div>'+
      '<div class="row" style="justify-content:space-between;align-items:center;margin-top:8px;">'+
        '<label class="row kpi-sub" style="gap:6px;cursor:pointer;"><input type="checkbox" data-wish-bought="'+w.id+'" '+(w.purchased?'checked':'')+'>Purchased</label>'+
        (w.link ? '<a class="mini-move" href="'+escapeHtml(safariizeUrl(w.link))+'" target="_blank" rel="noopener">Open link &#8599;</a>' : '')+
      '</div>'+
    '</div>'+
  '</div>';
}
document.addEventListener('change', function(e){
  const id = e.target && e.target.dataset && e.target.dataset.wishBought;
  if(!id) return;
  const w = state.personal.wishlist.find(function(x){ return x.id===id; }); if(!w) return;
  w.purchased = e.target.checked;
  w.purchasedAt = w.purchased ? todayStr() : null;
  if(w.purchased) playTaskComplete(); else playTick();
  persist('personal'); renderView();
});
function openWishItemModal(id){
  const w = id ? state.personal.wishlist.find(function(x){ return x.id===id; }) : null;
  ui.wishDraft = w ? {id:w.id, image:w.image||null} : {id:null, image:null};
  showOverlay('wishItemOverlay'); renderWishItemModalInto();
}
ACTIONS.openWishItem = function(el, e, id){ openWishItemModal(id||null); };
function renderWishItemModal(){
  const d = ui.wishDraft; if(!d) return '';
  const w = d.id ? state.personal.wishlist.find(function(x){ return x.id===d.id; }) : {};
  return '<div data-photo-drop="wish">'+
    '<div class="section-title" style="margin-bottom:14px;">'+(d.id?'Edit Item':'Add to Wish List')+'</div>'+
    '<div class="wish-img-edit" data-action="pickWishImage">'+(d.image ? '<img src="'+escapeHtml(blobUrl(d.image))+'" alt="">' : '<span class="kpi-sub">Drop, paste or click to add an image</span>')+'</div>'+
    (d.image ? '<div class="row" style="justify-content:flex-end;"><button class="mini-move mini-move-danger" data-action="clearWishImage">Remove image</button></div>' : '')+
    '<div class="field" style="margin-top:10px;"><label>Name</label><input class="input" id="wishName" value="'+escapeHtml(w.name||'')+'" style="width:100%;"></div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Price</label><input class="input" type="number" min="0" step="0.01" id="wishPrice" value="'+(w.price!=null?escapeHtml(String(w.price)):'')+'"></div>'+
      '<div class="field"><label>Priority</label><select class="input" id="wishPriority">'+WISH_PRIORITIES.map(function(p){ return '<option value="'+p.id+'" '+((w.priority||'med')===p.id?'selected':'')+'>'+p.label+'</option>'; }).join('')+'</select></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Link</label><input class="input" id="wishLink" value="'+escapeHtml(w.link||'')+'" placeholder="https://…" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Image URL (optional, instead of uploading)</label><input class="input" id="wishImageUrl" value="" placeholder="https://…/photo.jpg" style="width:100%;"></div>'+
    '<div class="row" style="margin-top:18px;justify-content:space-between;">'+
      (d.id ? '<button class="btn btn-ghost btn-sm mini-move-danger" data-action="deleteWishItem">Delete</button>' : '<span></span>')+
      '<div class="row"><button class="btn btn-ghost" data-action="closeWishItem">Cancel</button><button class="btn btn-primary" data-action="saveWishItem">Save</button></div>'+
    '</div>'+
  '</div>';
}
function renderWishItemModalInto(){ const el=document.getElementById('wishItemContent'); if(el) morphInto(el, renderWishItemModal(), {form:true}); }
registerModal('wishItemOverlay', renderWishItemModalInto);
async function setWishImageFromFiles(files){
  const img = arr(files).find(function(f){ return f.type && f.type.indexOf('image/')===0; });
  if(!img || !ui.wishDraft) return;
  ui.wishDraft.image = await storeImageFile(img);
  renderWishItemModalInto();
}
ACTIONS['drop:wish'] = function(zone, files){ setWishImageFromFiles(files); };
ACTIONS.pickWishImage = function(){
  const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange = function(){ setWishImageFromFiles(Array.prototype.slice.call(inp.files||[])); };
  inp.click();
};
ACTIONS.clearWishImage = function(){ if(ui.wishDraft){ ui.wishDraft.image = null; renderWishItemModalInto(); } };
document.addEventListener('paste', function(e){
  if(!overlayOpen('wishItemOverlay')) return;
  const imgs = imageFilesFromTransfer(e.clipboardData);
  if(!imgs.length) return;
  e.preventDefault(); setWishImageFromFiles(imgs);
});
ACTIONS.closeWishItem = function(){ ui.wishDraft = null; hideOverlay('wishItemOverlay'); };
ACTIONS.saveWishItem = function(){
  const d = ui.wishDraft; if(!d) return;
  const name = document.getElementById('wishName').value.trim();
  if(!name){ document.getElementById('wishName').focus(); return; }
  const priceRaw = document.getElementById('wishPrice').value;
  const imgUrl = document.getElementById('wishImageUrl').value.trim();
  let w = d.id ? state.personal.wishlist.find(function(x){ return x.id===d.id; }) : null;
  if(!w){ w = {id:uid(), purchased:false, createdAt:todayStr()}; state.personal.wishlist.push(w); }
  if(w.image && w.image!==d.image) blobRemove(w.image);
  w.name = name;
  w.price = priceRaw==='' ? null : Number(priceRaw);
  w.priority = document.getElementById('wishPriority').value;
  w.link = document.getElementById('wishLink').value.trim() || null;
  w.image = imgUrl || d.image || null;
  ui.wishDraft = null; hideOverlay('wishItemOverlay');
  playPositive(); persist('personal'); renderView();
};
ACTIONS.deleteWishItem = function(){
  const d = ui.wishDraft; if(!d || !d.id) return;
  const idx = state.personal.wishlist.findIndex(function(x){ return x.id===d.id; }); if(idx<0) return;
  const removed = state.personal.wishlist.splice(idx,1)[0];
  ui.lastDeletedWish = {item:removed, index:idx};
  ui.wishDraft = null; hideOverlay('wishItemOverlay');
  persist('personal'); renderView();
  showToast('Removed “'+removed.name+'”', {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteWish', duration:7000});
};
ACTIONS.undoDeleteWish = function(){
  const d = ui.lastDeletedWish; if(!d) return;
  state.personal.wishlist.splice(Math.min(d.index, state.personal.wishlist.length), 0, d.item);
  ui.lastDeletedWish = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  persist('personal'); renderView();
};

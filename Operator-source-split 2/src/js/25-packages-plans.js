// ============ PACKAGES / PLANS ============
function renderPackagesTab(){
  const packages = arr(state.business.packages);
  return '<div class="card section" style="text-align:center;">'+
    '<button class="btn btn-good" style="font-size:16px;font-weight:700;padding:14px 36px;box-shadow:0 4px 22px rgba(63,190,142,.4);" data-action="openNewPackageModal">+ Add Package</button>'+
  '</div>'+
  '<div class="task-list">'+(packages.map(packageRow).join('') || '<div class="empty">No packages yet — add the plans you offer clients.</div>')+'</div>';
}
function openNewPackageModal(){
  const o = document.getElementById('newPackageOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderNewPackageModalInto();
  setTimeout(function(){ const el=document.getElementById('newPackageName'); if(el) el.focus(); }, 30);
}
function closeNewPackageModal(){ const o=document.getElementById('newPackageOverlay'); if(o) o.classList.add('hidden'); }
function renderNewPackageModal(){
  return '<div class="section-title" style="margin-bottom:14px;">New Package</div>'+
    '<div class="field"><label>Name</label><input class="input" id="newPackageName" placeholder="e.g. Growth Plan" style="width:100%;"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Price (optional)</label><input class="input" type="number" id="newPackagePrice" placeholder="e.g. 1500" style="width:100%;"></div>'+
    '<div class="kpi-sub" style="margin-top:10px;">You\'ll add deliverables and a description on the next screen.</div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeNewPackageModal">Cancel</button>'+
      '<button class="btn btn-primary" data-action="addPackage">Create Package</button>'+
    '</div>';
}
function renderNewPackageModalInto(){ const el=document.getElementById('newPackageContent'); if(el) el.innerHTML = renderNewPackageModal(); }
function packageRow(pk){
  const deliverables = arr(pk.deliverables);
  return '<div class="card" style="margin-bottom:10px;">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;">'+
      '<div>'+
        '<div class="task-title">'+escapeHtml(pk.name)+(pk.price ? '<span class="kpi-sub" style="margin-left:8px;">$'+Number(pk.price).toLocaleString()+'</span>' : '')+'</div>'+
        (pk.description ? '<div class="kpi-sub" style="margin-top:4px;">'+escapeHtml(pk.description)+'</div>' : '')+
        '<div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap;">'+(deliverables.length ? deliverables.map(function(d){return '<span class="tag" style="background:var(--good-dim);color:var(--good);">'+escapeHtml(d.title)+' &middot; '+(d.weeklyTarget||1)+'&times;/wk</span>';}).join('') : '<span class="kpi-sub">No deliverables defined yet</span>')+'</div>'+
      '</div>'+
      '<button class="btn btn-ghost btn-sm" data-action="openPackageEditModal" data-id="'+pk.id+'">Edit</button>'+
    '</div>'+
  '</div>';
}
function addPackage(){
  const el = document.getElementById('newPackageName');
  const name = el.value.trim();
  if(!name) return;
  const price = Number(document.getElementById('newPackagePrice').value) || 0;
  const newId = uid();
  state.business.packages.push({id:newId, name:name, description:'', price:price, deliverables:[], createdAt:todayStr()});
  playPositive();
  persist('business');
  closeNewPackageModal();
  renderView();
  openPackageEditModal(newId);
}
function openPackageEditModal(id){
  ui.editingPackageId = id;
  const o = document.getElementById('packageEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderPackageEditModalInto();
}
function closePackageEditModal(){
  if(ui.editingPackageId) savePackageFields(ui.editingPackageId);
  ui.editingPackageId = null;
  const o=document.getElementById('packageEditOverlay'); if(o) o.classList.add('hidden');
  renderView();
}
function renderPackageEditModal(){
  const pk = arr(state.business.packages).find(function(x){return x.id===ui.editingPackageId;});
  if(!pk) return '';
  const deliverables = arr(pk.deliverables);
  return '<div class="section-title" style="margin-bottom:14px;">Edit Package</div>'+
    '<div class="field"><label>Name</label><input class="input" id="editPackageName-'+pk.id+'" value="'+escapeHtml(pk.name)+'" style="width:100%;"></div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Price (optional)</label><input class="input" type="number" id="editPackagePrice-'+pk.id+'" value="'+(pk.price||'')+'"></div>'+
      '<div class="field"><label>Description (optional)</label><input class="input" id="editPackageDesc-'+pk.id+'" value="'+escapeHtml(pk.description||'')+'"></div>'+
    '</div>'+
    '<div class="section-title" style="margin-top:16px;margin-bottom:8px;">Deliverables<span class="kpi-sub">set a weekly pace instead of a monthly total — e.g. "Reels" at 3&times;/week</span></div>'+
    '<div class="task-list" style="margin-bottom:10px;">'+(deliverables.map(function(d){
      return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(d.title)+'</div>'+
        '<div class="row" style="gap:4px;align-items:center;"><input class="input" type="number" min="1" data-action-input="packageDeliverableTarget" data-id="'+pk.id+'" data-did="'+d.id+'" value="'+(d.weeklyTarget||1)+'" style="width:56px;text-align:center;"><span class="kpi-sub">&times;/week</span></div>'+
        '<button class="btn btn-ghost btn-sm" data-action="removePackageDeliverable" data-id="'+pk.id+'" data-did="'+d.id+'">Remove</button></div>';
    }).join('') || '<div class="empty">No deliverables yet.</div>')+'</div>'+
    '<div class="row"><input class="input" id="newPackageDeliverableTitle-'+pk.id+'" placeholder="e.g. Reels" style="flex:1;"><input class="input" type="number" min="1" id="newPackageDeliverableTarget-'+pk.id+'" placeholder="per week" value="1" style="width:90px;"><button class="btn btn-ghost btn-sm" data-action="addPackageDeliverable" data-id="'+pk.id+'">Add</button></div>'+
    '<div class="row" style="margin-top:20px;justify-content:space-between;">'+
      deleteBtn('package', pk.id)+
      '<button class="btn btn-primary" data-action="closePackageEditModal">Done</button>'+
    '</div>';
}
function renderPackageEditModalInto(){ const el=document.getElementById('packageEditContent'); if(el) el.innerHTML = renderPackageEditModal(); }
function savePackageFields(id){
  const pk = arr(state.business.packages).find(function(x){return x.id===id;}); if(!pk) return;
  const nameEl = document.getElementById('editPackageName-'+id);
  if(nameEl) pk.name = nameEl.value.trim() || pk.name;
  const priceEl = document.getElementById('editPackagePrice-'+id);
  if(priceEl) pk.price = Number(priceEl.value) || 0;
  const descEl = document.getElementById('editPackageDesc-'+id);
  if(descEl) pk.description = descEl.value.trim();
  persist('business');
}
function addPackageDeliverable(id){
  savePackageFields(id);
  const pk = arr(state.business.packages).find(function(x){return x.id===id;}); if(!pk) return;
  const titleEl = document.getElementById('newPackageDeliverableTitle-'+id);
  const title = titleEl ? titleEl.value.trim() : '';
  if(!title) return;
  const targetEl = document.getElementById('newPackageDeliverableTarget-'+id);
  const weeklyTarget = targetEl ? Math.max(1, Number(targetEl.value)||1) : 1;
  if(!Array.isArray(pk.deliverables)) pk.deliverables=[];
  pk.deliverables.push({id:uid(), title:title, weeklyTarget:weeklyTarget});
  persist('business'); renderPackageEditModalInto();
}
function removePackageDeliverable(id, deliverableId){
  const pk = arr(state.business.packages).find(function(x){return x.id===id;}); if(!pk) return;
  pk.deliverables = arr(pk.deliverables).filter(function(x){return x.id!==deliverableId;});
  persist('business'); renderPackageEditModalInto();
}



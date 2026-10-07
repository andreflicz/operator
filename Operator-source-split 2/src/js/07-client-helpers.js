// ============ CLIENT HELPERS ============
function clientOptionsHtml(selected){
  const clients = arr(state.business && state.business.clients);
  const opts = [{value:'personal',label:'Personal'},{value:'general',label:'General Business'}].concat(
    clients.map(function(c){ return {value:c.id, label:(c.business||c.name||'Client')}; })
  );
  return opts.map(function(o){ return '<option value="'+o.value+'" '+(selected===o.value?'selected':'')+'>'+escapeHtml(o.label)+'</option>'; }).join('');
}
function clientCheckboxOptions(){
  const clients = arr(state.business && state.business.clients);
  const leads = arr(state.business && state.business.pipeline).filter(function(p){ return p.stage!=='lost'; });
  return [{value:'personal',label:'Personal'},{value:'general',label:'General Business'}]
    .concat(clients.map(function(c){ return {value:c.id, label:(c.business||c.name||'Client')}; }))
    .concat(leads.map(function(p){ return {value:'lead:'+p.id, label:(p.company||p.name||'Lead')+' (Lead)'}; }));
}
function clientCheckboxesHtml(selectedArr, idPrefix){
  const selected = arr(selectedArr);
  const opts = clientCheckboxOptions();
  return '<div class="client-check-list">'+opts.map(function(o){
    const checked = selected.indexOf(o.value)>=0;
    return '<label class="client-check-row"><input type="checkbox" data-client-check="'+idPrefix+'" value="'+o.value+'" '+(checked?'checked':'')+'>'+escapeHtml(o.label)+'</label>';
  }).join('')+'</div>';
}
function getCheckedClientValues(idPrefix){
  const boxes = document.querySelectorAll('[data-client-check="'+idPrefix+'"]:checked');
  const vals = Array.prototype.map.call(boxes, function(b){ return b.value; });
  return vals.length ? vals : ['personal'];
}
function clientChipPickerHtml(selectedArr, toggleAction){
  const selected = arr(selectedArr).length ? arr(selectedArr) : ['personal'];
  const opts = clientCheckboxOptions();
  return '<div class="row" style="gap:6px;">'+opts.map(function(o){
    const active = selected.indexOf(o.value)>=0;
    return '<span class="chip'+(active?' active':'')+'" data-action="'+toggleAction+'" data-value="'+o.value+'">'+escapeHtml(o.label)+'</span>';
  }).join('')+'</div>';
}
function toggleNewClientChip(value){
  const idx = ui.newTaskClients.indexOf(value);
  if(idx>=0) ui.newTaskClients.splice(idx,1); else ui.newTaskClients.push(value);
  if(!ui.newTaskClients.length) ui.newTaskClients=['personal'];
  renderAddTaskModalInto();
}
function toggleEditClientChip(value){
  const idx = ui.editTaskClientsSel.indexOf(value);
  if(idx>=0) ui.editTaskClientsSel.splice(idx,1); else ui.editTaskClientsSel.push(value);
  if(!ui.editTaskClientsSel.length) ui.editTaskClientsSel=['personal'];
  renderTaskEditModalInto();
}
function clientLabel(val){
  if(!val || val==='personal') return 'Personal';
  if(val==='general') return 'General Business';
  if(String(val).indexOf('lead:')===0){
    const leadId = val.slice(5);
    const p = arr(state.business && state.business.pipeline).find(function(x){ return x.id===leadId; });
    return p ? (p.company||p.name||'Lead') : 'Lead';
  }
  const c = arr(state.business && state.business.clients).find(function(x){ return x.id===val; });
  if(!c) return 'Personal';
  return c.business || c.name || 'Client';
}
function clientTagHtml(val){
  if(!val || val==='personal') return '<span class="tag tag-personal">Personal</span>';
  if(val==='general') return '<span class="tag tag-general">General Business</span>';
  if(String(val).indexOf('lead:')===0) return '<span class="tag" style="background:rgba(232,162,61,.16);color:#E8A23D;">'+escapeHtml(clientLabel(val))+' (Lead)</span>';
  return '<span class="tag tag-client">'+escapeHtml(clientLabel(val))+'</span>';
}
function clientTagsHtml(arrVal){
  const vals = arr(arrVal).length ? arr(arrVal) : ['personal'];
  return vals.map(clientTagHtml).join('');
}
function priorityTag(pr){
  if(pr==='high') return '<span class="tag tag-high">High</span>';
  if(pr==='low') return '<span class="tag tag-low">Low</span>';
  return '<span class="tag tag-med">Medium</span>';
}


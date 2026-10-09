
// ============ SETTINGS → APP UPDATES ============
// Notes about changes to the app itself (entries filed under an "Updates" journal type) aren't
// part of the everyday journal — they live in Settings → App updates: every one in full (no Read
// More), newest first, each with a Copy button, plus Copy all for a date range. They're kept out
// of My Journal entirely.
function updatesTypeId(){
  const set = state.journal && state.journal.updatesType;
  const all = journalTypes().concat(MOODS);
  if(set && all.some(function(m){ return m.id===set; })) return set;
  const hit = all.find(function(m){ return /update/i.test(m.label||'') || /update/i.test(m.id||''); });
  return hit ? hit.id : null;
}
function isUpdateEntry(e){ const id = updatesTypeId(); return !!(id && e && e.mood===id); }
// Ranges: the latest session (updates posted with less than an hour between them — one sitting
// of changes), the last hour or two, or by days.
const UPDATE_SESSION_GAP = 60*60000;
function updatesRange(){ return ui.updatesRange || 'session'; }
function updateEntries(){
  const r = updatesRange();
  const since = r==='7' ? addDays(todayStr(), -6) : r==='30' ? addDays(todayStr(), -29) : null;
  const sinceTs = r==='1h' ? Date.now()-3600000 : r==='2h' ? Date.now()-2*3600000 : null;
  const q = (ui.updatesSearch||'').toLowerCase();
  let list = state.journal.entries.filter(function(e){ return isUpdateEntry(e) && (!since || e.date>=since) && (!sinceTs || (e.timestamp||0)>=sinceTs) && (!q || String(e.text||'').toLowerCase().indexOf(q)>=0); })
    .sort(function(a, b){ return b.timestamp-a.timestamp; });
  if(r==='session' && list.length){
    let n = 1;
    while(n < list.length && (list[n-1].timestamp - list[n].timestamp) < UPDATE_SESSION_GAP) n++;
    list = list.slice(0, n);
  }
  return list;
}
function updateCopyText(e){ return fmtDateShort(e.date)+(e.timestamp ? ' · '+fmtTimeShort(e.timestamp) : '')+'\n'+(e.text||''); }
function copyToClipboard(text, what){
  const done = function(){ showToast((what||'Copied')+' — ready to paste', {icon:'&#128203;', duration:1600}); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function(){ if(fallbackCopy(text)) done(); });
  else if(fallbackCopy(text)) done();
}
ACTIONS.copyUpdate = function(el, e, id){
  const en = state.journal.entries.find(function(x){ return x.id===id; }); if(!en) return;
  copyToClipboard(en.text||'', 'Update copied');
  el.classList.add('is-copied'); setTimeout(function(){ el.classList.remove('is-copied'); }, 1200);
};
ACTIONS.copyAllUpdates = function(){
  const list = updateEntries(); if(!list.length) return;
  copyToClipboard(list.slice().reverse().map(updateCopyText).join('\n\n———\n\n'), list.length+' update'+(list.length===1?'':'s')+' copied');
};
ACTIONS.updatesRange = function(el, e, id){ ui.updatesRange = id; renderView(); };
ACTIONS.setUpdatesType = function(el){ state.journal.updatesType = el.value || null; persist('journal'); renderView(); };
ACTIONS.createUpdatesType = function(){
  if(!Array.isArray(state.journal.types) || !state.journal.types.length) state.journal.types = defaultJournalTypes().slice();
  const t = {id:'updates', emoji:'&#128227;', label:'Updates', color:'#8fdcff'};
  if(!state.journal.types.some(function(x){ return x.id==='updates'; })) state.journal.types.push({id:t.id, emoji:'📣', label:t.label, color:t.color});
  state.journal.updatesType = 'updates';
  persist('journal'); renderView();
};
document.addEventListener('change', function(e){ if(e.target && e.target.id==='updatesTypeSel') ACTIONS.setUpdatesType(e.target); });
document.addEventListener('input', function(e){ if(e.target && e.target.id==='updatesSearch'){ ui.updatesSearch = e.target.value; clearTimeout(ui._updT); ui._updT = setTimeout(renderView, 150); } });
function updateCardHtml(e){
  const photos = arr(e.photos);
  return '<article class="upd-card" data-journal-id="'+e.id+'">'+
    '<header class="upd-head"><span class="upd-date">'+escapeHtml(fmtDateShort(e.date))+'</span><span class="upd-time">'+(e.timestamp ? fmtTimeShort(e.timestamp) : '')+'</span>'+
      '<span style="flex:1"></span>'+
      '<button class="upd-copy" data-action="copyUpdate" data-id="'+e.id+'" title="Copy this update"><span class="upd-copy-i">&#128203;</span><span class="upd-copy-l">Copy</span><span class="upd-copied">&#10003; Copied</span></button>'+
      '<button class="je-more" data-action="journalMenu" data-id="'+e.id+'" title="Pin, edit, remove">&#8943;</button>'+
    '</header>'+
    '<div class="upd-text">'+escapeHtml(e.text||'')+'</div>'+
    (photos.length ? '<div class="row" style="margin-top:10px;flex-wrap:wrap;">'+photos.map(function(src, idx){ return '<img src="'+escapeHtml(blobUrl(src))+'" class="journal-photo-thumb" data-action="viewJournalPhoto" data-id="'+e.id+'" data-idx="'+idx+'">'; }).join('')+'</div>' : '')+
  '</article>';
}
function renderUpdatesTab(){
  const typeId = updatesTypeId();
  const types = journalTypes().concat(MOODS.filter(function(m){ return !journalTypes().some(function(t){ return t.id===m.id; }); }));
  const picker = '<select class="input" id="updatesTypeSel" style="max-width:220px;">'+types.map(function(t){ return '<option value="'+escapeHtml(t.id)+'"'+(t.id===typeId?' selected':'')+'>'+escapeHtml((t.emoji||'')+' '+t.label)+'</option>'; }).join('')+'</select>';
  if(!typeId){
    return '<div class="card upd-empty"><div style="font-size:28px;">&#128227;</div><div class="section-title" style="justify-content:center;margin:6px 0;">Updates</div>'+
      '<div class="kpi-sub" style="margin:0 auto 14px;">Which journal type are they filed under?'+tip('Notes about changes to the app live here — each in full, with one-click copy — and stay out of your journal.')+'</div>'+
      '<div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap;">'+picker+'<button class="btn btn-good btn-sm" data-action="createUpdatesType">+ Make an "Updates" type</button></div></div>';
  }
  const list = updateEntries(), r = updatesRange();
  const groups = [], byDate = {};
  list.forEach(function(e){ if(!byDate[e.date]){ byDate[e.date] = []; groups.push(e.date); } byDate[e.date].push(e); });
  return '<div class="upd-bar">'+
      '<div class="seg-tabs" style="margin:0;">'+[['session','Latest session'],['1h','Last hour'],['2h','Last 2 hours'],['7','7 days'],['30','30 days'],['all','All']].map(function(x){ return '<button class="seg-tab'+(r===x[0]?' active':'')+'" data-action="updatesRange" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
      '<input class="input" id="updatesSearch" placeholder="Search updates…" value="'+escapeHtml(ui.updatesSearch||'')+'" style="flex:1;min-width:160px;max-width:280px;">'+
      '<span style="flex:1"></span>'+
      '<span class="kpi-sub">'+list.length+' update'+(list.length===1?'':'s')+'</span>'+
      '<button class="btn btn-primary btn-sm" data-action="copyAllUpdates"'+(list.length?'':' disabled')+'>&#128203; Copy all</button>'+
    '</div>'+
    (list.length ? groups.map(function(d){
      const label = d===todayStr() ? 'Today' : d===addDays(todayStr(), -1) ? 'Yesterday' : weekdayShort(d)+', '+fmtDateShort(d);
      return '<div class="kind-label">'+label+'</div>'+byDate[d].map(updateCardHtml).join('');
    }).join('') : '<div class="empty">No updates '+(r==='all' ? 'yet' : 'in this range')+'. Journal entries filed under '+escapeHtml((moodById(typeId)||{}).label||'Updates')+' show up here, not in your journal.</div>')+
    '<div class="row upd-foot"><span class="kpi-sub">Counted as updates:</span>'+picker+'</div>';
}

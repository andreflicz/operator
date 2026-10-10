// ============ JOURNAL ============
function journalEntryRow(e){
  const isLong = e.text.length>220;
  const expanded = expandedJournal.has(e.id);
  const shown = (!isLong || expanded) ? e.text : e.text.slice(0,220)+'…';
  const mood = e.mood ? moodById(e.mood) : null;
  const isStarred = e.mood==='starred';
  const photos = arr(e.photos);
  // pin / edit / remove live in the right-click menu (or the ⋯ that shows on hover)
  return '<div class="journal-entry'+(isStarred?' journal-entry-starred':'')+'" data-journal-id="'+e.id+'" style="'+(mood && !isStarred?'border-left:4px solid '+mood.color+';':'')+'">'+
    '<div class="row" style="justify-content:space-between;">'+
      '<div class="kpi-sub">'+(mood?mood.emoji+' ':'')+fmtTimeShort(e.timestamp)+(e.pinned?' <span class="je-pin" title="Pinned">&#9733;</span>':'')+'</div>'+
      '<button class="je-more" data-action="journalMenu" data-id="'+e.id+'" title="Pin, edit, remove (or right-click the entry)">&#8943;</button>'+
    '</div>'+
    '<div class="journal-text">'+escapeHtml(shown)+'</div>'+
    (photos.length ? '<div class="row" style="margin-bottom:8px;flex-wrap:wrap;">'+photos.map(function(src, idx){ return '<img src="'+escapeHtml(blobUrl(src))+'" class="journal-photo-thumb" data-action="viewJournalPhoto" data-id="'+e.id+'" data-idx="'+idx+'">'; }).join('')+'</div>' : '')+
    (isLong ? '<button class="btn btn-ghost btn-sm" data-action="toggleJournalExpand" data-id="'+e.id+'">'+(expanded?'Show Less':'Read More')+'</button>' : '')+
  '</div>';
}
// One-time cleanup: older journal photos were stored as giant text strings inside the journal
// data, so every journal save re-wrote megabytes. Move each into the image store and keep a
// small reference instead. A photo is only swapped once it's safely stored.
async function migrateInlineJournalPhotos(){
  let moved = 0;
  for(const e of state.journal.entries){
    const photos = arr(e.photos);
    for(let i=0;i<photos.length;i++){
      const src = photos[i];
      if(typeof src!=='string' || src.indexOf('data:')!==0) continue;
      try{
        const ref = await blobStore(dataUrlToBlob(src));
        if(isBlobRef(ref)){ photos[i] = ref; moved++; }
      }catch(err){}
    }
  }
  if(moved){ await persist('journal'); }
}
function openJournalPhotoView(entryId, idx){
  ui.viewingJournalPhoto = {entryId:entryId, idx:Number(idx)};
  const o = document.getElementById('journalPhotoViewOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderJournalPhotoViewModalInto();
}
function closeJournalPhotoView(){ ui.viewingJournalPhoto = null; const o=document.getElementById('journalPhotoViewOverlay'); if(o) o.classList.add('hidden'); }
function renderJournalPhotoViewModal(){
  const v = ui.viewingJournalPhoto;
  if(!v) return '';
  const e = state.journal.entries.find(function(x){ return x.id===v.entryId; });
  const src = e && arr(e.photos)[v.idx];
  if(!src) return '<div class="empty">Photo not found.</div>';
  return '<img src="'+escapeHtml(blobUrl(src))+'" style="max-width:100%;max-height:70vh;border-radius:8px;">'+
    '<div class="row" style="margin-top:16px;justify-content:center;">'+
      '<button class="btn btn-primary" data-action="closeJournalPhotoView">Close</button>'+
    '</div>';
}
function renderJournalPhotoViewModalInto(){ const el=document.getElementById('journalPhotoViewContent'); if(el) morphInto(el, renderJournalPhotoViewModal(), {form:true}); }
// Only the most recent entries are rendered (more on demand) — rendering the whole
// history on every click was the slowest thing in the app once a year of entries piled up.
const JOURNAL_PAGE = 40;
function renderJournalHistory(entries){
  const pinned = entries.filter(function(e){return e.pinned;});
  const allRest = entries.filter(function(e){return !e.pinned;});
  const limit = ui.journalShowCount || JOURNAL_PAGE;
  const rest = allRest.slice(0, limit);
  const hidden = allRest.length - rest.length;
  const groups = {}; const order = [];
  rest.forEach(function(e){ if(!groups[e.date]){ groups[e.date]=[]; order.push(e.date); } groups[e.date].push(e); });
  let html = '';
  if(pinned.length) html += '<div class="kind-label">Pinned</div>'+pinned.map(journalEntryRow).join('');
  order.forEach(function(d){
    const label = d===todayStr() ? 'Today' : d===addDays(todayStr(),-1) ? 'Yesterday' : fmtDateShort(d);
    html += '<div class="kind-label">'+label+'</div>'+groups[d].map(journalEntryRow).join('');
  });
  if(hidden>0) html += '<div class="row" style="justify-content:center;margin-top:10px;"><button class="btn btn-ghost btn-sm" data-action="journalShowMore" data-autoload="1">Show '+Math.min(hidden, JOURNAL_PAGE)+' more &middot; '+hidden+' older</button></div>';
  return html || '<div class="empty">Nothing matches yet.</div>';
}
ACTIONS.journalShowMore = function(){ ui.journalShowCount = (ui.journalShowCount || JOURNAL_PAGE) + JOURNAL_PAGE; updateJournalHistoryDisplay(); };
function filteredJournalEntries(){
  const allEntries = state.journal.entries.slice().sort(function(a,b){ return b.timestamp-a.timestamp; });
  const searchLower = (ui.journalSearchText||'').toLowerCase();
  return allEntries.filter(function(e){
    const matchesMood = ui.journalFilterMood ? e.mood===ui.journalFilterMood : !isUpdateEntry(e);
    const matchesSearch = !searchLower || e.text.toLowerCase().indexOf(searchLower)>=0;
    return matchesMood && matchesSearch;
  });
}
function updateJournalHistoryDisplay(){
  const el = document.getElementById('journalHistoryContainer');
  if(!el) return;
  morphInto(el, renderJournalHistory(filteredJournalEntries()));
}
function setJournalMoodFilter(moodId){ ui.journalFilterMood = (ui.journalFilterMood===moodId) ? null : moodId; renderView(); }
function clearJournalFilters(){ ui.journalFilterMood=null; ui.journalSearchText=''; ui.journalSearchOpen=false; renderView(); }
function toggleJournalSearch(){ ui.journalSearchOpen = !ui.journalSearchOpen; renderView(); }
function setJournalViewMode(mode){ ui.journalViewMode = mode; renderView(); }
function allClientJournalEntries(){
  const rows = [];
  arr(state.business.clients).forEach(function(c){
    arr(c.journal).forEach(function(e){ rows.push({clientId:c.id, clientName:c.business||c.name||'Client', entry:e}); });
  });
  rows.sort(function(a,b){ return (b.entry.createdAt||'').localeCompare(a.entry.createdAt||''); });
  return rows;
}
function renderAllClientJournalRow(row){
  const e = row.entry;
  const tag = e.tag ? moodById(e.tag) : null;
  return '<div class="task-item-v2" style="align-items:flex-start;">'+
    '<div style="display:flex;flex-direction:column;gap:4px;min-width:120px;">'+
      '<span class="tag" style="background:var(--accent-dim);color:var(--accent);">'+escapeHtml(row.clientName)+'</span>'+
      (tag ? '<span class="tag" style="background:'+tag.color+'22;color:'+tag.color+';">'+tag.emoji+' '+escapeHtml(tag.label)+'</span>' : '')+
    '</div>'+
    '<div style="flex:1;min-width:0;">'+
      '<div class="task-notes" style="white-space:pre-wrap;">'+escapeHtml(e.text||'')+'</div>'+
      '<div class="kpi-sub" style="margin-top:4px;">'+fmtDateShort(e.date)+'</div>'+
    '</div>'+
    deleteBtn('clientjournal', e.id)+
  '</div>';
}
function renderClientJournalComposeCard(){
  const clients = arr(state.business.clients).filter(function(c){ return c.status==='active'; });
  if(!clients.length) return '<div class="card section" style="text-align:center;"><div class="kpi-sub">Add an active client in Business &rarr; Clients before starting a client journal.</div></div>';
  if(ui.journalTabClientId===undefined || !clients.some(function(c){return c.id===ui.journalTabClientId;})) ui.journalTabClientId = clients[0].id;
  return '<div class="card section" style="text-align:center;">'+
    '<div class="field" style="margin-bottom:10px;max-width:320px;margin-left:auto;margin-right:auto;"><label>Client</label><select class="input" id="journalTabClientSelect">'+
      clients.map(function(c){ return '<option value="'+c.id+'" '+(ui.journalTabClientId===c.id?'selected':'')+'>'+escapeHtml(c.business||c.name||'Client')+'</option>'; }).join('')+
    '</select></div>'+
    '<textarea class="input" id="journalTabClientText" placeholder="What happened, what was said, what to remember next time…" style="width:100%;min-height:80px;text-align:left;">'+escapeHtml(ui.journalTabClientDraft||'')+'</textarea>'+
    '<div class="row" style="justify-content:center;margin-top:10px;">'+
      '<button class="btn btn-primary btn-sm" data-action="addClientJournalEntryFromJournal">Save Entry</button>'+
    '</div>'+
  '</div>';
}
function clientJournalFilterActive(){ return !!(ui.clientJournalSearchText || ui.clientJournalFilterMood || ui.clientJournalFilterClientId); }
function filteredClientJournalEntries(){
  const search = (ui.clientJournalSearchText||'').toLowerCase();
  return allClientJournalEntries().filter(function(row){
    if(ui.clientJournalFilterClientId && row.clientId!==ui.clientJournalFilterClientId) return false;
    if(ui.clientJournalFilterMood && row.entry.tag!==ui.clientJournalFilterMood) return false;
    if(search && (row.entry.text||'').toLowerCase().indexOf(search)<0 && row.clientName.toLowerCase().indexOf(search)<0) return false;
    return true;
  });
}
function renderClientJournalResultsList(){
  const filtered = filteredClientJournalEntries();
  return filtered.map(renderAllClientJournalRow).join('') || '<div class="empty">No matching entries.</div>';
}
function updateClientJournalResultsDisplay(){
  const el = document.getElementById('clientJournalResultsContainer');
  if(el) el.innerHTML = renderClientJournalResultsList();
}
function setClientJournalMoodFilter(moodId){ ui.clientJournalFilterMood = (ui.clientJournalFilterMood===moodId) ? null : moodId; renderClientJournalPopoverInto(); if(ui.view==='personal' && ui.personalTab==='journal') renderView(); }
function clearClientJournalFilters(){ ui.clientJournalFilterMood=null; ui.clientJournalSearchText=''; ui.clientJournalFilterClientId=null; renderClientJournalPopoverInto(); if(ui.view==='personal' && ui.personalTab==='journal') renderView(); }
function openClientJournalPopover(clientId){
  ui.clientJournalFilterClientId = clientId || null;
  const o = document.getElementById('clientJournalOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderClientJournalPopoverInto();
}
function closeClientJournalPopover(){ const o=document.getElementById('clientJournalOverlay'); if(o) o.classList.add('hidden'); }
function renderClientJournalPopoverInto(){ const el=document.getElementById('clientJournalContent'); if(el) morphInto(el, renderClientJournalPopover(), {form:true}); }
function renderClientJournalPopover(){
  const clients = arr(state.business.clients);
  return '<div class="section-title" style="justify-content:center;margin-bottom:10px;">Client Journals</div>'+
    '<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px;">'+
      '<input class="input" id="clientJournalSearchInput" placeholder="Search entries…" value="'+escapeHtml(ui.clientJournalSearchText||'')+'" style="flex:1;min-width:140px;">'+
      '<select class="input" id="clientJournalClientFilterSelect" style="width:160px;"><option value="">All Clients</option>'+clients.map(function(c){ return '<option value="'+c.id+'" '+(ui.clientJournalFilterClientId===c.id?'selected':'')+'>'+escapeHtml(c.business||c.name||'Client')+'</option>'; }).join('')+'</select>'+
    '</div>'+
    '<div class="row" style="gap:6px;margin-bottom:12px;">'+
      journalTypes().map(function(m){ return '<span class="chip '+(ui.clientJournalFilterMood===m.id?'active':'')+'" data-action="setClientJournalMoodFilter" data-mood="'+m.id+'" title="'+m.label+'">'+m.emoji+'</span>'; }).join('')+
      (clientJournalFilterActive() ? '<button class="btn btn-ghost btn-sm" data-action="clearClientJournalFilters">Clear</button>' : '')+
    '</div>'+
    '<div class="task-list" id="clientJournalResultsContainer">'+renderClientJournalResultsList()+'</div>'+
    '<div class="row" style="margin-top:16px;justify-content:flex-end;">'+
      '<button class="btn btn-primary" data-action="closeClientJournalPopover">Close</button>'+
    '</div>';
}
function renderClientJournalsAllTab(){
  const clients = arr(state.business.clients);
  return renderClientJournalComposeCard()+
  '<div class="section"><div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px;">'+
    '<input class="input" id="journalTabAllClientSearchInput" placeholder="Search entries…" value="'+escapeHtml(ui.clientJournalSearchText||'')+'" style="flex:1;min-width:140px;">'+
    '<select class="input" id="journalTabAllClientFilterSelect" style="width:170px;"><option value="">All Clients</option>'+clients.map(function(c){ return '<option value="'+c.id+'" '+(ui.clientJournalFilterClientId===c.id?'selected':'')+'>'+escapeHtml(c.business||c.name||'Client')+'</option>'; }).join('')+'</select>'+
  '</div>'+
  '<div class="row" style="gap:6px;margin-bottom:12px;">'+
    journalTypes().map(function(m){ return '<span class="chip '+(ui.clientJournalFilterMood===m.id?'active':'')+'" data-action="setClientJournalMoodFilter" data-mood="'+m.id+'" title="'+m.label+'">'+m.emoji+'</span>'; }).join('')+
    (clientJournalFilterActive() ? '<button class="btn btn-ghost btn-sm" data-action="clearClientJournalFilters">Clear</button>' : '')+
  '</div>'+
  '<div class="task-list" id="journalTabAllClientResultsContainer">'+renderClientJournalResultsList()+'</div>'+
  '</div>';
}
function updateJournalTabAllClientResultsDisplay(){
  const el = document.getElementById('journalTabAllClientResultsContainer');
  if(el) el.innerHTML = renderClientJournalResultsList();
}
function addClientJournalEntryFromJournal(){
  const selEl = document.getElementById('journalTabClientSelect');
  const textEl = document.getElementById('journalTabClientText');
  const clientId = selEl ? selEl.value : ui.journalTabClientId;
  const text = textEl ? textEl.value.trim() : '';
  if(!clientId || !text) return;
  const c = state.business.clients.find(function(x){return x.id===clientId;}); if(!c) return;
  if(!Array.isArray(c.journal)) c.journal=[];
  c.journal.push({id:uid(), text:text, tag:null, date:todayStr(), createdAt:new Date().toISOString()});
  ui.journalTabClientId = clientId;
  ui.journalTabClientDraft = '';
  playPositive();
  persist('business'); renderView();
}
function renderJournalTab(){
  // Entries (the regular journal) and Boards (freeform canvas pages) live side by side.
  const mode = ui.journalMode==='boards' ? 'boards' : 'entries';
  const switcher = '<div class="row" style="justify-content:center;margin-bottom:14px;"><div class="seg-tabs" style="margin:0;">'+
    '<button class="seg-tab'+(mode==='entries'?' active':'')+'" data-action="journalMode" data-id="entries">Entries</button>'+
    '<button class="seg-tab'+(mode==='boards'?' active':'')+'" data-action="journalMode" data-id="boards">Boards</button>'+
  '</div></div>';
  if(mode==='boards') return switcher+'<div class="subtab-panel" data-key="journal-boards">'+renderBoardShell('journal')+'</div>';
  return switcher+'<div class="subtab-panel" data-key="journal-entries">'+renderJournalEntriesTab()+'</div>';
}
ACTIONS.journalMode = function(el, e, id){ ui.journalMode = id; renderView(); };
function renderJournalEntriesTab(){
  const filtered = filteredJournalEntries();
  const hasFilters = !!(ui.journalFilterMood || ui.journalSearchText);
  const clientsView = ui.journalViewMode==='clients';
  return '<div class="row" style="justify-content:center;margin-bottom:14px;gap:6px;position:relative;">'+
    '<span class="chip'+(!clientsView?' active':'')+'" data-action="setJournalViewMode" data-value="personal">My Journal</span>'+
    '<span class="chip'+(clientsView?' active':'')+'" data-action="setJournalViewMode" data-value="clients">Client Journals</span>'+
    (!clientsView && !ui.journalSearchOpen && !hasFilters ? '<button class="btn btn-ghost btn-sm" data-action="toggleJournalSearch" title="Search Entries" style="position:absolute;right:0;top:50%;transform:translateY(-50%);padding:4px 8px;">&#128269;</button>' : '')+
  '</div>'+
  (clientsView ? renderClientJournalsAllTab() : (
  '<div class="card journal-compose-card" data-photo-drop="journal" style="text-align:center;margin-bottom:14px;">'+
    '<div style="position:relative;">'+
      '<textarea class="input" id="journalPageText" placeholder="Write something… (paste or drop images in too)" style="width:100%;min-height:230px;text-align:left;padding-right:44px;">'+escapeHtml(ui.journalDraftText||'')+'</textarea>'+
      '<button class="btn btn-ghost btn-sm" data-action="triggerJournalPhotoInput" title="Add Photo" style="position:absolute;top:8px;right:8px;padding:4px 7px;font-size:15px;line-height:1;">&#128247;</button>'+
    '</div>'+
    renderJournalPhotoThumbsRow()+
    renderJournalMoodChipsOnly()+
    '<div class="journal-compose-actions">'+
      '<span></span>'+
      '<button class="btn btn-primary" data-action="addJournal" data-target="journalPageText">Save Entry</button>'+
    '</div>'+
  '</div>'+
  (ui.journalSearchOpen || hasFilters ? (
    '<div class="card section"><div class="row">'+
      '<input class="input" id="journalSearchInput" placeholder="Search entries…" value="'+escapeHtml(ui.journalSearchText||'')+'" style="flex:1;min-width:160px;">'+
      journalTypes().map(function(m){ return '<span class="chip '+(ui.journalFilterMood===m.id?'active':'')+'" data-action="setJournalMoodFilter" data-mood="'+m.id+'" title="'+m.label+'">'+m.emoji+'</span>'; }).join('')+
      '<button class="btn btn-ghost btn-sm" data-action="toggleJournalSearch">'+(hasFilters?'Hide':'Close')+'</button>'+
      (hasFilters ? '<button class="btn btn-ghost btn-sm" data-action="clearJournalFilters">Clear</button>' : '')+
    '</div></div>'
  ) : '')+
  '<div class="section" id="journalHistoryContainer">'+renderJournalHistory(filtered)+'</div>'
  ));
}
function renderJournalMoodChipsOnly(){
  return '<div class="row" style="margin-top:10px;justify-content:center;flex-wrap:wrap;gap:4px;">'+
    journalTypes().map(function(m){
      const active = ui.selectedMood===m.id;
      return '<span class="chip" data-action="selectMood" data-mood="'+m.id+'" style="'+(active?'background:'+m.color+';border-color:'+m.color+';color:#06231a;':'')+'">'+m.emoji+' '+m.label+'</span>';
    }).join('')+
  '</div>';
}
function renderJournalMoodChipsInline(){
  return journalTypes().map(function(m){
    const active = ui.selectedMood===m.id;
    return '<span class="chip" data-action="selectMood" data-mood="'+m.id+'" style="'+(active?'background:'+m.color+';border-color:'+m.color+';color:#06231a;':'')+'">'+m.emoji+' '+m.label+'</span>';
  }).join('');
}
function renderJournalPhotoThumbsRow(){
  const photos = arr(ui.journalDraftPhotos);
  if(!photos.length) return '';
  return '<div class="row" style="margin-top:8px;justify-content:center;flex-wrap:wrap;gap:8px;">'+
    photos.map(function(src, idx){
      return '<span style="position:relative;display:inline-block;">'+
        '<img src="'+escapeHtml(blobUrl(src))+'" class="journal-photo-thumb" style="width:36px;height:36px;">'+
        '<button class="btn btn-ghost btn-sm" data-action="removeJournalDraftPhoto" data-idx="'+idx+'" title="Remove" style="position:absolute;top:-9px;right:-9px;padding:0 4px;border-radius:50%;background:var(--panel);line-height:16px;">&times;</button>'+
      '</span>';
    }).join('')+
  '</div>';
}
function toggleJournalExpand(id){ if(expandedJournal.has(id)) expandedJournal.delete(id); else expandedJournal.add(id); renderView(); }
function openJournalEditModal(id){
  ui.editingJournalId = id;
  const e = state.journal.entries.find(function(x){return x.id===id;});
  ui.journalDraftPhotos = e ? arr(e.photos).slice() : [];
  const o = document.getElementById('journalEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderJournalEditModalInto();
}
function closeJournalEditModal(){ ui.editingJournalId = null; ui.journalDraftPhotos = []; const o=document.getElementById('journalEditOverlay'); if(o) o.classList.add('hidden'); }
function renderJournalEditModal(){
  const e = state.journal.entries.find(function(x){return x.id===ui.editingJournalId;});
  if(!e) return '';
  return '<div data-photo-drop="journal"><div class="section-title" style="margin-bottom:14px;">Edit Entry</div>'+
    '<textarea class="input" id="editJournalText" style="width:100%;min-height:120px;">'+escapeHtml(e.text)+'</textarea>'+
    '<div class="row" style="margin:12px 0;justify-content:center;">'+
      journalTypes().map(function(m){ const active = ui.editingJournalMood===m.id; return '<span class="chip" data-action="setEditingJournalMood" data-mood="'+m.id+'" style="'+(active?'background:'+m.color+';border-color:'+m.color+';color:#06231a;':'')+'">'+m.emoji+' '+m.label+'</span>'; }).join('')+
    '</div>'+
    renderJournalPhotoAttachHtml()+
    '<div class="row" style="justify-content:flex-end;margin-top:16px;">'+
      '<button class="btn btn-ghost" data-action="closeJournalEditModal">Cancel</button>'+
      '<button class="btn btn-primary" data-action="saveEditJournal" data-id="'+e.id+'">Save</button>'+
    '</div></div>';
}
function renderJournalEditModalInto(){
  if(ui.editingJournalMood===undefined){
    const e = state.journal.entries.find(function(x){return x.id===ui.editingJournalId;});
    ui.editingJournalMood = e ? e.mood : null;
  }
  const el=document.getElementById('journalEditContent'); if(el) morphInto(el, renderJournalEditModal(), {form:true});
}
function setEditingJournalMood(moodId){ ui.editingJournalMood = (ui.editingJournalMood===moodId) ? null : moodId; renderJournalEditModalInto(); }
function saveEditJournal(id){
  const e = state.journal.entries.find(function(x){return x.id===id;}); if(!e) return;
  const text = document.getElementById('editJournalText').value.trim();
  if(!text) return;
  e.text = text;
  e.mood = ui.editingJournalMood!==undefined ? ui.editingJournalMood : e.mood;
  e.photos = arr(ui.journalDraftPhotos).slice();
  ui.editingJournalMood = undefined;
  ui.journalDraftPhotos = [];
  closeJournalEditModal();
  persist('journal'); renderView();
}
function togglePinJournal(id){
  const e = state.journal.entries.find(function(x){return x.id===id;}); if(!e) return;
  e.pinned = !e.pinned;
  persist('journal'); renderView();
}
function selectMood(id){ ui.selectedMood = (ui.selectedMood===id) ? null : id; renderView(); }
function addJournalEntry(targetId, type){
  const el = document.getElementById(targetId);
  const text = el.value.trim();
  if(!text) return;
  state.journal.entries.push({id:uid(), date:todayStr(), timestamp:Date.now(), text:text, type:type||'freeform', mood:ui.selectedMood, pinned:false, photos: arr(ui.journalDraftPhotos).slice()});
  ui.journalDraftText = '';
  ui.selectedMood = null;
  ui.journalDraftPhotos = [];
  playJournalSound();
  persist('journal'); renderView();
}
// The 📝 button: a little notepad that slides up from the corner — type, pick a tag, ⌘↵ to save.
const QJ_PROMPTS = ['What’s on your mind?', 'A win from today?', 'An idea worth keeping?', 'What’s bugging you?', 'What are you grateful for?', 'What did you learn?'];
function openQuickJournalModal(){
  const o = document.getElementById('quickJournalOverlay');
  if(!o) return;
  o.classList.add('qj-pop-overlay');
  o.classList.remove('hidden');
  ui.qjPrompt = QJ_PROMPTS[Math.floor(Math.random()*QJ_PROMPTS.length)];
  ui.qjSaved = false;
  renderQuickJournalModalInto();
  setTimeout(function(){ const t = document.getElementById('quickJournalModalText'); if(t){ t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 60);
}
function closeQuickJournalModal(){ const o=document.getElementById('quickJournalOverlay'); if(o) o.classList.add('hidden'); }
function renderQuickJournalModal(){
  const today = state.journal.entries.filter(function(e){ return e.date===todayStr(); }).length;
  const now = new Date();
  if(ui.qjSaved) return '<div class="qj3 is-saved"><div class="qj3-done"><span>&#10003;</span>Saved to your journal</div></div>';
  return '<div class="qj3" data-photo-drop="journal">'+
    '<div class="qj3-h"><span class="qj3-i">&#128221;</span><div><b>Quick note</b><small>'+now.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})+' &middot; '+now.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+(today ? ' &middot; '+today+' today' : '')+'</small></div>'+
      '<button class="qj3-x" data-action="closeQuickJournalModal" title="Close (Esc)">&#10005;</button></div>'+
    '<textarea class="qj3-text" id="quickJournalModalText" placeholder="'+escapeHtml(ui.qjPrompt||QJ_PROMPTS[0])+'">'+escapeHtml(ui.journalDraftText||'')+'</textarea>'+
    '<div class="qj3-tags">'+journalTypes().slice(0, 7).map(function(m){ return '<button class="qj3-tag'+(ui.selectedMood===m.id?' is-on':'')+'" data-action="qjMood" data-id="'+m.id+'" title="'+escapeHtml(m.label)+'">'+m.emoji+'<span>'+escapeHtml(m.label)+'</span></button>'; }).join('')+'</div>'+
    '<div class="qj3-f"><button class="qj3-open" data-action="qjOpenJournal">Open journal &rarr;</button><span class="qj3-hint">&#8984;&#8629;</span><button class="btn btn-primary btn-sm" data-action="saveQuickJournal">Save</button></div>'+
  '</div>';
}
function renderQuickJournalModalInto(){ const el=document.getElementById('quickJournalContent'); if(el) morphInto(el, renderQuickJournalModal(), {form:true}); }
ACTIONS.qjMood = function(el, e, id){ ui.selectedMood = ui.selectedMood===id ? null : id; const t = document.getElementById('quickJournalModalText'); if(t) ui.journalDraftText = t.value; renderQuickJournalModalInto(); };
ACTIONS.qjOpenJournal = function(){ const t = document.getElementById('quickJournalModalText'); if(t) ui.journalDraftText = t.value; closeQuickJournalModal(); ui.view = 'personal'; ui.personalTab = 'journal'; renderView(); };
document.addEventListener('input', function(e){ if(e.target && e.target.id==='quickJournalModalText') ui.journalDraftText = e.target.value; });
document.addEventListener('keydown', function(e){
  if(e.target && e.target.id==='quickJournalModalText'){
    if(e.key==='Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); saveQuickJournal(); }
    else if(e.key==='Escape'){ e.preventDefault(); closeQuickJournalModal(); }
  }
});
function saveQuickJournal(){
  const t = document.getElementById('quickJournalModalText');
  if(!t || !t.value.trim()){ if(t){ t.focus(); t.classList.remove('is-shake'); void t.offsetWidth; t.classList.add('is-shake'); } return; }
  addJournalEntry('quickJournalModalText');
  ui.qjSaved = true; renderQuickJournalModalInto();
  setTimeout(function(){ closeQuickJournalModal(); ui.qjSaved = false; }, 900);
}


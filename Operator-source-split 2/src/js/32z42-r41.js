// ============ ROUND 41 ============
// Build 1 of the October batch. Each part says what it changes.

// ---- 1. client colours: every client has one, and you can pick it ----
// A client's colour shows wherever their work does: the chip on a task, a deliverable, the client card.
// Picked on the client's card (Business → Clients); until then one is chosen from the name.
const CLIENT_PALETTE = ['#4FC3B8', '#9B8CFF', '#5B9BFF', '#FF8FB1', '#B5E06A', '#FFB86B', '#F2E27A', '#7FD1FF'];
function clientAccent(c){
  if(!c) return '#8A90A2';
  if(c.color && /^#[0-9a-f]{6}$/i.test(c.color)) return c.color;
  const s = String((c.business||'')+(c.name||'')+c.id); let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return CLIENT_PALETTE[Math.abs(h) % CLIENT_PALETTE.length];
}
// a picked colour also becomes the avatar colour (with dark letters, the picks are light)
clientColor = (function(base){ return function(c){ return c && c.color && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : base.apply(this, arguments); }; })(clientColor);
function clientChipHtml(c, extra){
  const col = clientAccent(c);
  return '<span class="tag tag-client cchip" style="--cc:'+col+'"'+(extra||'')+'><i></i>'+escapeHtml(c.business || c.name || 'Client')+'</span>';
}
clientTagHtml = (function(base){
  return function(val){
    if(!val || val==='personal' || val==='general' || String(val).indexOf('lead:')===0) return base.apply(this, arguments);
    const c = arr(state.business && state.business.clients).find(function(x){ return x.id===val; });
    return c ? clientChipHtml(c) : base.apply(this, arguments);
  };
})(clientTagHtml);

// ---- 2. no client photos or initials on tasks: the coloured chip says whose it is ----
dvwWhoHtml = function(v){ return clientChipHtml(v.c, ' data-who="1"'); };

// ---- 3. Current + Up next ----
// What you're on is the biggest thing on the page: "Current", its timer, whose it is and how far along.
// Up next is one clear step down. (The words are Current and Up next everywhere now; "Now" is gone.)
function r41TaskChips(t){
  const out = [];
  arr(t.clients).forEach(function(v){ const c = arr(state.business && state.business.clients).find(function(x){ return x.id===v; }); if(c) out.push(clientChipHtml(c)); });
  if(t.deadline && typeof deadlineTag==='function') out.push(deadlineTag(t));
  return out.join('');
}
function r41DvwProgress(t, big){
  if(!t || !t.master || t.master.kind!=='dvw' || typeof dvwFind!=='function') return '';
  const x = dvwFind(t); if(!x || !x.need) return '';
  const col = clientAccent(x.c);
  let segs = ''; for(let i=0;i<x.need;i++) segs += '<i class="'+(i < x.done ? 'is-on' : '')+'"></i>';
  return '<span class="r41-prog'+(big ? ' is-big' : '')+'" style="--cc:'+col+'"><span class="r41-segs">'+segs+'</span><b>'+x.done+' / '+x.need+'</b></span>';
}
let r41NnBase = null;   // (the look before round 41: Settings → Appearance can bring it back)
nowNextPanelHtml = (function(base){
  r41NnBase = base;
  return function(opts){
    opts = opts || {};
    // the stacked version (Today, locked-in): same words, same pieces, just smaller
    if(opts.stack) return base.apply(this, arguments).replace(/<div class="nn-k">Now/g, '<div class="nn-k">Current');
    const as = state.focus.activeSession, inS = !!as, onBreak = !!(inS && as.onBreak);
    const cur = nnTask(ui.currentTaskId), pend = nnTask(ui.pendingCurrentTaskId), explicit = nnExplicitNext();
    let next = explicit;
    if(!next){ const s = nextUpTask(); if(s && s.id!==ui.currentTaskId && !(pend && s.id===pend.id)) next = s; }
    const picker = function(label){ return '<span class="nn-pick-wrap"><button class="btn btn-ghost btn-sm" data-action="toggleNextPicker" data-where="panel">'+label+' &#9662;</button>'+nextPickerHtml('panel')+'</span>'; };
    let curHtml;
    if(pend){
      curHtml = '<section class="r41-cur is-asking" data-dropzone="current" data-key="r41-cur">'+
        '<div class="r41-k"><i></i>Current</div>'+
        '<div class="r41-title">'+(cur ? 'Switch to' : 'Start')+' &ldquo;'+escapeHtml(pend.title)+'&rdquo;?</div>'+
        '<div class="r41-acts"><button class="btn btn-good" data-action="confirmPendingCurrentTask">'+(cur ? '&#8646; Switch' : '&#9654; Start')+'</button>'+
          '<button class="btn btn-ghost" data-action="nnPendingToNext">Make it next</button>'+
          '<button class="btn btn-ghost" data-action="cancelPendingCurrentTask">Cancel</button></div>'+
      '</section>';
    } else if(cur){
      curHtml = '<section class="r41-cur has-task'+(inS ? ' is-in' : '')+'" data-dropzone="current" data-key="r41-cur">'+
        '<div class="r41-cur-l">'+
          '<div class="r41-k"><i></i>Current'+(inS ? '' : '<span class="r41-sub">not locked in</span>')+'</div>'+
          '<div class="r41-title nn-drag" draggable="true" data-task-id="'+cur.id+'" data-from="now" title="Drag to move it">'+escapeHtml(cur.title)+'</div>'+
          '<div class="r41-chips">'+r41TaskChips(cur)+'</div>'+
          r41DvwProgress(cur, true)+
        '</div>'+
        '<div class="r41-cur-r">'+
          '<span class="r41-timer" id="currentTaskElapsedBar">'+formatElapsed(Date.now()-(ui.currentTaskStartedAt||Date.now()))+'</span>'+
          '<div class="r41-acts">'+
            '<button class="btn btn-ghost" data-action="releaseCurrentTask" title="Stop timing it. It stays on today\'s list">Release</button>'+
            (inS ? '' : '<button class="btn btn-ghost" data-action="openLockInChooser" title="Lock in: it counts as deep work">&#128274; Lock in</button>')+
            '<button class="btn btn-good" data-action="finishCurrentTask">&#10003; Done</button>'+
          '</div>'+
        '</div>'+
      '</section>';
    } else {
      curHtml = '<section class="r41-cur is-empty" data-dropzone="current" data-key="r41-cur">'+
        '<div class="r41-k"><i></i>Current</div>'+
        '<div class="r41-title is-empty">'+(onBreak ? 'On a break' : 'Nothing yet')+'</div>'+
        '<div class="r41-hint">Start what\'s up next, or drag a task here.</div>'+
      '</section>';
    }
    const nextHtml = '<section class="r41-next" data-dropzone="next" data-key="r41-next">'+
      '<span class="r41-k is-next">Up next</span>'+
      (next
        ? '<span class="r41-next-t nn-drag" draggable="true" data-task-id="'+next.id+'" data-from="next" title="Drag to move it">'+escapeHtml(next.title)+'</span>'+
          '<span class="r41-chips">'+r41TaskChips(next)+'</span>'+
          '<span class="r41-acts">'+
            (onBreak ? '' : '<button class="btn btn-primary btn-sm" data-action="nnStartNext" data-id="'+next.id+'">'+(cur ? 'Switch to it' : 'Start')+'</button>')+
            (inS ? '' : '<button class="btn btn-ghost btn-sm" data-action="nnLockInNext" data-id="'+next.id+'">&#128274; Lock in on it</button>')+
            (inS ? '' : picker('Change'))+
            (explicit ? '<button class="btn btn-ghost btn-sm" data-action="clearStagedTask" title="Clear what\'s next">&#10005;</button>' : '')+
          '</span>'
        : '<span class="r41-next-t is-empty">Nothing lined up</span><span class="r41-acts">'+(inS ? '' : picker('Pick one'))+'</span>')+
    '</section>';
    return '<div class="r41-nn'+(inS ? ' is-locked' : '')+'" data-key="nn-panel">'+curHtml+nextHtml+'</div>';
  };
})(nowNextPanelHtml);
// the lineup says Current too, and row 1 / row 2 are lit like the panel above
lineupListHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<span class="tl-badge is-now">Now<\/span>/g, '<span class="tl-badge is-now">Current</span>');
  };
})(lineupListHtml);

// ---- 4. Worth doing soon: one even row of slim tiles, nothing cut off ----
// Five big cards wrapped to a lone card on a second row and the row's edges clipped. Now it's a single row
// of small tiles (as many as fit the width), each the priority dot, the title and one line under it.
function r41SoonTile(t){
  const c = arr(t.clients).map(function(v){ return arr(state.business && state.business.clients).find(function(x){ return x.id===v; }); }).filter(Boolean)[0];
  const meta = c ? '<span class="r41-soon-m" style="color:color-mix(in srgb, '+clientAccent(c)+' 80%, white)">'+escapeHtml(c.business || c.name)+'</span>'
    : '<span class="r41-soon-m">'+escapeHtml(clientLabel(arr(t.clients)[0] || 'personal'))+(t.deadline ? ' &middot; '+escapeHtml(typeof fmtDateShort==='function' ? fmtDateShort(t.deadline) : t.deadline) : '')+'</span>';
  return '<div class="r41-soon-t" data-flip="soon-'+t.id+'" draggable="true" data-task-id="'+t.id+'" data-action="openTaskEditModal" data-id="'+t.id+'" title="Open: right-click for more">'+
    '<span class="r41-soon-h"><i class="pr-'+(t.priority || 'med')+'" aria-label="'+(t.priority==='high' ? 'High' : t.priority==='low' ? 'Low' : 'Medium')+' priority"></i><b>'+escapeHtml(t.title)+'</b></span>'+meta+
  '</div>';
}
renderFocusTasksOverview = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const start = h.indexOf('<div class="section" style="margin-bottom:14px;"><div class="section-title" style="align-items:center;">Worth Doing Soon');
    if(start < 0) return h;
    // the section ends where the ongoing panel (or the end) begins: find its closing by counting divs
    let i = start, depth = 0;
    const re = /<\/?div\b[^>]*>/g; re.lastIndex = start;
    let m, end = -1;
    while((m = re.exec(h))){ if(m[0][1]==='/') depth--; else depth++; if(depth===0){ end = re.lastIndex; break; } }
    if(end < 0) return h;
    const items = typeof dvwHiddenFromBacklog==='function' ? state.tasks.items : state.tasks.items;
    const all = sortByPriorityAndDeadline(items.filter(function(t){ return t.status==='backlog' && !t.isVideoIdea && !(t.master && t.master.kind==='dvw') && !t.snoozedUntil && !t.waitingOn; }));
    if(!all.length) return h.slice(0, start)+h.slice(end);
    const sec = '<div class="section r41-soon-sec"><div class="section-title" style="align-items:center;">Worth Doing Soon<span class="kpi-sub">'+all.length+'</span><button class="btn btn-ghost btn-sm" style="margin-left:auto;" data-action="focusTasksSubTab" data-tab="backlog">See all &rarr;</button></div>'+
      '<div class="r41-soon">'+all.slice(0, 8).map(r41SoonTile).join('')+'</div></div>';
    return h.slice(0, start)+sec+h.slice(end);
  };
})(renderFocusTasksOverview);

// ---- 5. things slide to their new place instead of blinking ----
// Anything carrying data-flip (the Worth doing soon tiles, the lineup rows) glides from where it was to
// where it is after a re-render, so a reorder or a finished task reads as movement, not a flash.
renderView = (function(base){
  return function(){
    const before = {};
    try{ document.querySelectorAll('#viewRoot [data-flip]').forEach(function(el){ before[el.getAttribute('data-flip')] = el.getBoundingClientRect(); }); }catch(e){}
    const r = base.apply(this, arguments);
    try{
      const keys = Object.keys(before); if(!keys.length) return r;
      document.querySelectorAll('#viewRoot [data-flip]').forEach(function(el){
        const b = before[el.getAttribute('data-flip')]; if(!b) { el.classList.remove('r41-in'); void el.offsetWidth; el.classList.add('r41-in'); return; }
        const a = el.getBoundingClientRect(), dx = b.left - a.left, dy = b.top - a.top;
        if(Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.style.transition = 'none'; el.style.transform = 'translate('+dx+'px,'+dy+'px)';
        requestAnimationFrame(function(){ el.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; setTimeout(function(){ el.style.transition = ''; }, 320); });
      });
    }catch(e){}
    return r;
  };
})(renderView);
lineupListHtml = (function(base){
  return function(){ return base.apply(this, arguments).replace(/<li class="tl-row([^"]*)" draggable="true" data-task-id="([^"]+)"/g, '<li class="tl-row$1" data-flip="tl-$2" draggable="true" data-task-id="$2"'); };
})(lineupListHtml);

// ---- 6. alarms can be removed right from the Calendar ----
// Every alarm in the Calendar's Alarms card gets a remove button next to its switch (it asks first, and
// you can undo). The Remove in the alarm's own editor is red now, so it reads as what it is.
cxAlarmsBodyHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/(<button class="cx-switch[^"]*" data-action="cxAlarmToggle" data-id="([^"]+)")/g, '<button class="cx-al-x" data-action="r41AlarmRemove" data-id="$2" title="Remove this alarm" aria-label="Remove this alarm">&#10005;</button>$1');
  };
})(cxAlarmsBodyHtml);
ACTIONS.r41AlarmRemove = function(el, e, id){
  if(e) e.stopPropagation();
  const a = arr(state.focus.alarms).find(function(x){ return x.id===id; }); if(!a) return;
  uiConfirm({title:'Remove the '+(a.label || 'alarm')+' alarm?', text:fmt12Hour(a.time)+(a.date ? '' : ' · '+(typeof wakeDaysLabel==='function' ? wakeDaysLabel(a.days || []) : '')), ok:'Remove', danger:true}).then(function(yes){
    if(!yes) return;
    const at = state.focus.alarms.indexOf(a);
    state.focus.alarms = state.focus.alarms.filter(function(x){ return x.id!==id; });
    persist('focus'); renderView();
    ui.r41UndoAlarm = {a:a, at:at};
    showToast('Alarm removed.', {icon:'&#9200;', actionLabel:'Undo', actionAction:'r41UndoAlarm', duration:6000});
  });
};
renderAlarmEditModal = (function(base){ return function(){ return base.apply(this, arguments).replace(/(<button[^>]*class="[^"]*)("[^>]*data-action="[^"]*"[^>]*data-scope="alarm")/, '$1 r41-danger$2'); }; })(renderAlarmEditModal);
ACTIONS.r41UndoAlarm = function(){ const u = ui.r41UndoAlarm; if(!u) return; ui.r41UndoAlarm = null; state.focus.alarms.splice(Math.max(0, u.at), 0, u.a); persist('focus'); renderView(); if(typeof dismissToast==='function') dismissToast(); };

// ---- 7. no explainers on goals that fill themselves in (MRR, followers…): you know where they come from ----
goalCardHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<div class="goal-src"[^>]*>[\s\S]*?<\/div>/g, ''); }; })(goalCardHtml);
gxGoalRowHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<small>&#9889; live<\/small>/g, '<small></small>'); }; })(gxGoalRowHtml);

// ---- 8. the journal: deleting asks first, and goes to Recently deleted for 30 days ----
// Right-click → Remove (or Remove in the editor) asks once, then moves the entry to Recently deleted, a
// list at the bottom of the journal where it can be restored. After 30 days it's gone for good (its
// photos with it). Clearing the whole journal sends everything there too.
const JOURNAL_TRASH_DAYS = 30;
normalizeJournal = (function(base){
  return function(j){
    j = base.apply(this, arguments);
    j.trash = arr(j.trash).filter(function(x){ return x && x.e && x.e.id; });
    const cut = Date.now() - JOURNAL_TRASH_DAYS*86400000;
    j.trash = j.trash.filter(function(x){ if((x.at||0) >= cut) return true; arr(x.e.photos).forEach(function(p){ try{ blobRemove(p); }catch(err){} }); return false; });
    return j;
  };
})(normalizeJournal);
function journalTrash(e){
  if(!e) return;
  state.journal.entries = state.journal.entries.filter(function(x){ return x.id!==e.id; });
  state.journal.trash = [{e:e, at:Date.now()}].concat(arr(state.journal.trash)).slice(0, 500);
  persist('journal');
}
function journalAskTrash(id, after){
  const e = state.journal.entries.find(function(x){ return x.id===id; }); if(!e) return;
  uiConfirm({title:'Delete this entry?', text:'It moves to Recently deleted at the bottom of your journal. You can bring it back for 30 days.', ok:'Delete', danger:true}).then(function(yes){
    if(!yes) return;
    journalTrash(e); if(after) after();
    renderView();
    showToast('Moved to Recently deleted', {icon:'&#128465;', actionLabel:'Undo', actionAction:'r41JournalRestore', actionId:e.id, duration:6000});
  });
}
// the right-click menu's Remove goes through the question
ACTIONS.ctx = (function(base){
  return function(el){
    const op = el && el.dataset ? el.dataset.op : null;
    if(op==='jRemove'){ const a = el.dataset.a; if(typeof ctxClose==='function') ctxClose(); journalAskTrash(a); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.ctx);
// the editor's Remove (armed → Confirm) goes to the trash too, never straight out
performDelete = (function(base){
  return function(scope, id){
    if(scope==='journal'){ const e = state.journal.entries.find(function(x){ return x.id===id; }); if(e){ journalTrash(e); if(ui.editingJournalId===id && typeof closeJournalEditModal==='function') closeJournalEditModal(); renderView(); showToast('Moved to Recently deleted', {icon:'&#128465;', actionLabel:'Undo', actionAction:'r41JournalRestore', actionId:e.id, duration:6000}); } return; }
    return base.apply(this, arguments);
  };
})(performDelete);
ACTIONS.r41JournalRestore = function(el, e, id){
  const t = arr(state.journal.trash).find(function(x){ return x.e.id===id; }); if(!t) return;
  state.journal.trash = state.journal.trash.filter(function(x){ return x!==t; });
  state.journal.entries.push(t.e); state.journal.entries.sort(function(a, b){ return String(b.date||'').localeCompare(String(a.date||'')); });
  persist('journal'); if(typeof dismissToast==='function') dismissToast(); renderView(); playTick();
};
ACTIONS.r41JournalForget = function(el, e, id){
  const t = arr(state.journal.trash).find(function(x){ return x.e.id===id; }); if(!t) return;
  uiConfirm({title:'Delete it for good?', text:'This one can\'t be brought back.', ok:'Delete for good', danger:true}).then(function(yes){
    if(!yes) return;
    arr(t.e.photos).forEach(function(p){ try{ blobRemove(p); }catch(err){} });
    state.journal.trash = state.journal.trash.filter(function(x){ return x!==t; });
    persist('journal'); renderView();
  });
};
ACTIONS.r41JournalTrashOpen = function(){ ui.r41TrashOpen = !ui.r41TrashOpen; renderView(); };
function journalTrashHtml(){
  const list = arr(state.journal.trash);
  if(!list.length) return '';
  const days = function(at){ const left = JOURNAL_TRASH_DAYS - Math.floor((Date.now() - at)/86400000); return left <= 1 ? 'gone tomorrow' : left+' days left'; };
  return '<div class="r41-trash'+(ui.r41TrashOpen ? ' is-open' : '')+'">'+
    '<button class="r41-trash-h" data-action="r41JournalTrashOpen"><span>Recently deleted</span><small>'+list.length+'</small><i>'+(ui.r41TrashOpen ? '&#9652;' : '&#9662;')+'</i></button>'+
    (ui.r41TrashOpen ? '<div class="r41-trash-l">'+list.map(function(x){
      const e = x.e, title = e.title || String(e.text||'').split('\n')[0].slice(0, 80) || 'Entry';
      return '<div class="r41-trash-r"><div><b>'+escapeHtml(title)+'</b><small>'+escapeHtml(e.date ? fmtDateShort(e.date) : '')+' &middot; '+days(x.at||Date.now())+'</small></div>'+
        '<button class="btn btn-ghost btn-sm" data-action="r41JournalRestore" data-id="'+e.id+'">Restore</button>'+
        '<button class="btn btn-ghost btn-sm r41-danger" data-action="r41JournalForget" data-id="'+e.id+'">Delete for good</button></div>';
    }).join('')+'</div>' : '')+
  '</div>';
}
renderJournalEntriesTab = (function(base){ return function(){ return base.apply(this, arguments)+(ui.journalViewMode==='clients' ? '' : journalTrashHtml()); }; })(renderJournalEntriesTab);
// clearing the whole journal: everything goes to Recently deleted first
confirmJournalClearFinal = (function(base){
  return function(){
    if((ui.journalClearText||'').trim().toUpperCase()!=='DELETE') return;
    arr(state.journal.entries).slice().forEach(function(e){ journalTrash(e); });
    closeJournalClearConfirm(); renderView();
    showToast('Everything moved to Recently deleted', {icon:'&#128465;'});
  };
})(confirmJournalClearFinal);

// ---- 9. adding or editing a task: the essentials up top, the rest behind More ----
// One sheet for both: a big title, who it's for, priority and the due date. Category, the alarm, notes,
// "takes more than a day", training skill and the deliverable link sit under More (opened by itself when
// one of them is already set on the task you're editing). Every field is still there, so nothing about
// saving changes.
function r41TaskSheet(h, kind, t){
  if(!h) return h;
  const tpl = document.createElement('template'); tpl.innerHTML = h;
  const root = tpl.content;
  const pre = kind==='add' ? 'newTask' : 'edit';
  const sel = kind==='add'
    ? {title:'#newTaskTitle', pri:'#newTaskPriority', due:'#newTaskDeadline'}
    : {title:'#editTitle-'+t.id, pri:'#editPriority-'+t.id, due:'#editDeadline-'+t.id};
  const kids = Array.from(root.children);
  const actions = kids.filter(function(el){ return el.querySelector && el.querySelector('[data-action="closeAddTaskModal"], [data-action="closeTaskEditModal"]'); }).pop();
  const header = kids.filter(function(el){ return el.classList && (el.classList.contains('as-h') || el.classList.contains('section-title')); });
  const auto = kids.filter(function(el){ return el.classList && el.classList.contains('dvw-auto'); });
  const field = function(q){ const i = root.querySelector(q); return i ? i.closest('.field') : null; };
  const fTitle = field(sel.title), fPri = field(sel.pri), fDue = field(sel.due);
  const fWho = kids.filter(function(el){ const l = el.classList && el.classList.contains('field') && el.querySelector('label'); return l && /^Client/.test(l.textContent); })[0] || null;
  const ess = [fTitle, fWho, fPri, fDue].filter(Boolean);
  const more = kids.filter(function(el){ return ess.indexOf(el) < 0 && el!==actions && header.indexOf(el) < 0 && auto.indexOf(el) < 0; });
  // the title: no label, big
  if(fTitle){ const l = fTitle.querySelector('label'); if(l) l.remove(); const i = fTitle.querySelector('input'); if(i){ i.classList.add('r41-ts-title'); if(kind==='add') i.setAttribute('placeholder', 'What needs to get done?'); } fTitle.classList.add('r41-ts-tf'); fTitle.removeAttribute('style'); }
  // who / priority / due: small labels, no "(optional)"
  [fWho, fPri, fDue].concat(more).forEach(function(f){ if(!f || !f.querySelectorAll) return; f.removeAttribute('style'); f.querySelectorAll('label').forEach(function(l){ l.innerHTML = l.innerHTML.replace(/\s*\(optional\)/gi, '').replace(/<span class="tdv-opt">[\s\S]*?<\/span>/, ''); }); f.querySelectorAll('.tip, [data-tip]').forEach(function(x){ if(x.classList.contains('tip')) x.remove(); }); });
  if(fWho){ const l = fWho.querySelector('label'); if(l) l.textContent = 'For'; }
  // edit uses the same Low / Medium / High control as add (the select stays, hidden, for saving)
  if(kind==='edit' && fPri){
    const s = fPri.querySelector('select');
    if(s){ s.style.display = 'none'; const v = ui.r41EditPriV || t.priority || 'med'; s.querySelectorAll('option').forEach(function(o){ if(o.value===v) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
      const seg = document.createElement('div'); seg.className = 'hs-seg pri-seg';
      seg.innerHTML = [['low', 'Low'], ['med', 'Medium'], ['high', 'High']].map(function(x){ return '<button type="button" class="pri-'+x[0]+(x[0]===v ? ' is-on' : '')+'" data-action="r41EditPri" data-id="'+x[0]+'"><i></i>'+x[1]+'</button>'; }).join('');
      s.insertAdjacentElement('afterend', seg); }
  }
  if(actions){ actions.querySelectorAll('[data-action="deleteTaskUndoable"]').forEach(function(b){ b.classList.add('r41-danger'); }); }
  if(fDue){ const l = fDue.querySelector('label'); if(l) l.textContent = 'Due'; fDue.querySelectorAll('[data-action="openDatePicker"]').forEach(function(b){ b.remove(); }); }
  // More opens by itself on a task that already uses one of the extras
  const used = kind==='edit' && t && (t.categoryId || t.notes || t.ongoing || t.skill || (t.alarm && t.alarm.on) || t.deliv);
  const open = ui.r41TaskMore===kind ? true : ui.r41TaskMore===kind+':closed' ? false : !!used;
  const label = kind==='add' ? 'New task' : 'Edit task';
  let out = '<div class="r41-ts">'+
    '<div class="r41-ts-k">'+label+'</div>'+
    auto.map(function(a){ return a.outerHTML; }).join('')+
    (fTitle ? fTitle.outerHTML : '')+
    (fWho ? '<div class="r41-ts-who">'+fWho.outerHTML+'</div>' : '')+
    '<div class="r41-ts-row">'+(fPri ? fPri.outerHTML : '')+(fDue ? fDue.outerHTML : '')+'</div>'+
    (more.length ? '<button type="button" class="r41-ts-more-b'+(open ? ' is-open' : '')+'" data-action="r41TaskMore" data-id="'+kind+'">'+(open ? 'Less' : 'More')+' <i>'+(open ? '&#9652;' : '&#9662;')+'</i></button>'+
      '<div class="r41-ts-more'+(open ? ' is-open' : '')+'">'+more.map(function(m){ return m.outerHTML; }).join('')+'</div>' : '')+
    (actions ? actions.outerHTML : '')+
  '</div>';
  return out;
}
ACTIONS.r41TaskMore = function(el, e, id){
  const open = !(el && el.classList.contains('is-open'));
  ui.r41TaskMore = open ? id : id+':closed';
  const sheet = el && el.closest('.r41-ts'), box = sheet && sheet.querySelector('.r41-ts-more');
  if(box){ box.classList.toggle('is-open', open); el.classList.toggle('is-open', open); el.innerHTML = (open ? 'Less' : 'More')+' <i>'+(open ? '&#9652;' : '&#9662;')+'</i>'; }
};
openAddTaskModal = (function(base){ return function(){ ui.r41TaskMore = null; return base.apply(this, arguments); }; })(openAddTaskModal);
openTaskEditModal = (function(base){ return function(){ ui.r41TaskMore = null; ui.r41EditPriV = null; return base.apply(this, arguments); }; })(openTaskEditModal);
renderAddTaskModal = (function(base){ return function(){ return r41TaskSheet(base.apply(this, arguments), 'add'); }; })(renderAddTaskModal);
renderTaskEditModal = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const t = state.tasks.items.find(function(x){ return x.id===ui.editingTaskId; });
    return t ? r41TaskSheet(h, 'edit', t) : h;
  };
})(renderTaskEditModal);
ACTIONS.r41EditPri = function(el, e, id){
  const sheet = el && el.closest('.r41-ts'); if(!sheet) return;
  ui.r41EditPriV = id;
  const sel = sheet.querySelector('select[id^="editPriority-"]'); if(sel) sel.value = id;
  sheet.querySelectorAll('[data-action="r41EditPri"]').forEach(function(b){ b.classList.toggle('is-on', b.dataset.id===id); });
  playTick();
};

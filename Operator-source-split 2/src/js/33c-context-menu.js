
// ============ RIGHT-CLICK, EVERYWHERE ============
// Right-click anywhere for Operator's own menu: quick add, lock in, recap, jump to a page, and the
// look-and-feel switches (theme, scene, card layout). Things you right-click get their own menu —
// tasks (17b), journal entries, clients & leads, boards. Text fields keep the normal Mac menu
// (copy, paste, spelling), and Option-right-click always gives the normal menu too.
let ctxTarget = null;
function ctxClose(){ const m = document.getElementById('appCtxMenu'); if(m) m.remove(); ctxTarget = null; }
function ctxShow(html, x, y, target){
  closeTaskMenu(); ctxClose();
  ctxTarget = target || null;
  const m = document.createElement('div');
  m.id = 'appCtxMenu'; m.className = 'ctx-menu ctx-app'; m.innerHTML = html;
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, window.innerWidth-r.width-8))+'px';
  m.style.top = Math.max(8, Math.min(y, window.innerHeight-r.height-8))+'px';
}
function ci(op, label, opts){
  opts = opts || {};
  return '<button class="ctx-item'+(opts.cls?' '+opts.cls:'')+(opts.on?' is-on':'')+'" data-action="ctx" data-op="'+op+'"'+(opts.a!=null?' data-a="'+escapeHtml(String(opts.a))+'"':'')+(opts.b!=null?' data-b="'+escapeHtml(String(opts.b))+'"':'')+(opts.title?' title="'+escapeHtml(opts.title)+'"':'')+'>'+label+'</button>';
}
function chip(op, label, opts){ opts = opts || {}; opts.cls = 'ctx-chip'+(opts.cls?' '+opts.cls:''); return ci(op, label, opts); }
function crow(k, inner){ return '<div class="ctx-row">'+(k?'<span class="ctx-k">'+k+'</span>':'')+'<div class="ctx-chips">'+inner+'</div></div>'; }
const SEP = '<div class="ctx-sep"></div>';
// ---- the app menu ----
function appMenuHtml(){
  const s = state.focus.activeSession, theme = state.profile.theme || 'dark', scene = sceneId(), lay = cardLayout();
  return '<div class="ctx-title">Operator</div>'+
    crow('Add', chip('add', 'Task', {a:'task'})+chip('add', 'Lead', {a:'lead'})+chip('add', 'Client', {a:'client'})+chip('add', 'Note', {a:'journal'})+chip('add', 'Event', {a:'event'}))+
    SEP+
    (s ? ci('stop', '&#9632; Stop &amp; log session')+(s.onBreak ? '' : ci('break', '&#9749; Take a break')) : ci('lockin', '&#128274; Lock in <span class="ctx-kbd">L</span>'))+
    ci('recap', '&#128202; Day recap')+
    (selectableView() && selVisibleCards().length ? ci('selAll', '&#9745; Select all tasks <span class="ctx-kbd">&#8984;A</span>') : '')+
    ci('wake', '&#9200; Wake-up alarm')+
    SEP+
    crow('Go to', ['today','focus','business','calendar','personal'].map(function(v){ return chip('go', v[0].toUpperCase()+v.slice(1), {a:v, on:ui.view===v}); }).join(''))+
    SEP+
    crow('Theme', [['dark','Dark'],['light','Light'],['auto','Auto']].map(function(t){ return chip('theme', t[1], {a:t[0], on:theme===t[0]}); }).join(''))+
    crow('Scene', SCENES.map(function(sc){ return chip('scene', sc.label, {a:sc.id, on:scene===sc.id}); }).join('')+videoWalls().map(function(v){ return chip('scene', '&#9654; '+escapeHtml(v.name), {a:'vid:'+v.id, on:scene==='vid:'+v.id}); }).join(''))+
    crow('Cards', chip('layout', 'Grid', {a:'grid', on:lay==='grid'})+chip('layout', 'Carousel', {a:'carousel', on:lay==='carousel'}))+
    SEP+
    ci('sidebar', state.profile.sidebarCollapsed ? '&#9776; Show the menu' : '&#9776; Hide the menu')+
    ci('go', '&#9881; Settings', {a:'settings'});
}
// ---- journal entries ----
function journalMenuHtml(e){
  return '<div class="ctx-title">'+escapeHtml((e.text||'Entry').slice(0, 48))+'</div>'+
    ci('jPin', e.pinned ? '&#9733; Unpin' : '&#9734; Pin to top', {a:e.id})+
    ci('jEdit', '&#9998; Edit…', {a:e.id})+
    ci('jStar', e.mood==='starred' ? '&#10024; Unstar' : '&#10024; Star it', {a:e.id})+
    ci('jCopy', '&#128203; Copy text', {a:e.id})+
    SEP+ci('jRemove', '&#128465; Remove', {a:e.id, cls:'ctx-danger'});
}
// ---- clients & leads ----
function contactMenuHtml(kind, x){
  return '<div class="ctx-title">'+escapeHtml(crmName(kind, x))+'</div>'+
    ci('open', '&#8599; Open card', {a:kind, b:x.id})+
    (typeof contactReachHtml==='function' ? contactReachHtml(kind, x) : '')+
    crow('Log', TOUCH_TYPES.map(function(t){ return chip('touch', t.icon, {a:kind+':'+x.id, b:t.id, title:'Log a '+t.label.toLowerCase()}); }).join(''))+
    (typeof followUpMenuHtml==='function' ? followUpMenuHtml(kind, x) : '')+
    SEP+
    crow('Stage', crmStages(kind).map(function(st){ return chip('stage', escapeHtml(st.label), {a:kind+':'+x.id, b:st.id, on:x.stage===st.id}); }).join(''));
}
// ---- boards ----
function boardMenuHtml(elId){
  if(elId) return '<div class="ctx-title">Card</div>'+ci('bDup', '&#10697; Duplicate')+ci('bFwd', '&#11014; Bring forward')+ci('bBack', '&#11015; Send back')+SEP+ci('bDel', '&#128465; Delete', {cls:'ctx-danger'});
  return '<div class="ctx-title">Board</div>'+
    crow('Add here', chip('bAdd', 'Note', {a:'note'})+chip('bAdd', 'Label', {a:'label'})+chip('bAdd', 'List', {a:'list'}))+
    ci('bBg', '&#127912; Background…')+ci('bFit', '&#9974; Fit everything')+ci('bFull', ui.boardFull ? '&#10530; Exit full screen' : '&#9974; Full screen');
}
function contactFromEl(el){
  const card = el.closest('.crm-card, .cc2, .hub-card, .crm-row, .hq-row, .reach-row, .hub-lead, .hq-due-lead, .cc2-head');
  if(!card) return null;
  const a = card.matches('[data-action="openContact"][data-kind][data-id]') ? card : card.querySelector('[data-action="openContact"][data-kind][data-id]');
  if(!a) return null;
  const x = crmFind(a.dataset.kind, a.dataset.id);
  return x ? {kind:a.dataset.kind, x:x} : null;
}
document.addEventListener('contextmenu', function(e){
  if(e.defaultPrevented) return;            // a task — its own menu already opened
  if(e.altKey){ ctxClose(); return; }       // Option-right-click: the normal menu
  const t = e.target;
  if(!t.closest || t.closest('input, textarea, select, [contenteditable="true"], .ctx-menu')){ ctxClose(); return; }
  const sel = window.getSelection && String(window.getSelection());
  if(sel && sel.trim()){ ctxClose(); return; } // selected text: keep Copy / Look Up
  if(t.closest('#wakeOverlay:not(.hidden), #alarmOverlay:not(.hidden)')) return;
  e.preventDefault();
  const je = t.closest('.journal-entry[data-journal-id]');
  if(je){ const entry = state.journal.entries.find(function(x){ return x.id===je.dataset.journalId; }); if(entry){ ctxShow(journalMenuHtml(entry), e.clientX, e.clientY); return; } }
  const c = contactFromEl(t);
  if(c){ ctxShow(contactMenuHtml(c.kind, c.x), e.clientX, e.clientY); return; }
  const host = t.closest('#boardHost');
  if(host && !cv.view){
    const bel = t.closest('.bel[data-el]');
    if(bel){ cv.sel = new Set([bel.dataset.el]); drawBoard(); }
    const r = host.getBoundingClientRect(), b = cvBoard(), v = b ? b.viewport : {x:0, y:0, zoom:1};
    ctxShow(boardMenuHtml(bel ? bel.dataset.el : null), e.clientX, e.clientY, {x:(e.clientX - r.left - v.x)/v.zoom, y:(e.clientY - r.top - v.y)/v.zoom});
    return;
  }
  ctxShow(appMenuHtml(), e.clientX, e.clientY);
});
document.addEventListener('pointerdown', function(e){ const m = document.getElementById('appCtxMenu'); if(m && !m.contains(e.target)) ctxClose(); }, true);
document.addEventListener('keydown', function(e){ if(e.key==='Escape') ctxClose(); });
window.addEventListener('blur', ctxClose);
document.addEventListener('scroll', function(e){ if(!(e.target && e.target.closest && e.target.closest('.ctx-menu'))) ctxClose(); }, true);
let journalRemoved = null;
ACTIONS.undoJournalRemove = function(){ if(!journalRemoved) return; state.journal.entries.splice(Math.min(journalRemoved.i, state.journal.entries.length), 0, journalRemoved.e); journalRemoved = null; clearToasts(); persist('journal'); renderView(); };
ACTIONS.ctx = function(el){
  const op = el.dataset.op, a = el.dataset.a, b2 = el.dataset.b, at = ctxTarget;
  ctxClose();
  const go = function(v){ const n = document.querySelector('[data-action="nav"][data-view="'+v+'"]'); if(n) n.click(); else { ui.view = v; renderView(); } };
  if(op==='add'){
    if(a==='task') openAddTaskModal();
    else if(a==='lead' || a==='client') openNewContactModal(a);
    else if(a==='event') openCalEventModal();
    else if(a==='journal'){ ui.view = 'personal'; ui.personalTab = 'journal'; ui.journalMode = 'entries'; renderView(); setTimeout(function(){ const ta = document.getElementById('journalPageText'); if(ta) ta.focus(); }, 30); }
  }
  else if(op==='lockin') openLockInChooser();
  else if(op==='stop') openStopFocus();
  else if(op==='break') openBreakNotePrompt();
  else if(op==='recap') ACTIONS.openDayRecap();
  else if(op==='selAll') selectAllVisibleTasks();
  else if(op==='wake') openWakeSetup();
  else if(op==='go') go(a);
  else if(op==='theme') setThemePref(a);
  else if(op==='scene') setScene(a);
  else if(op==='layout') ACTIONS.setCardLayout(null, null, a);
  else if(op==='sidebar') toggleSidebar();
  else if(op==='jPin') togglePinJournal(a);
  else if(op==='jEdit') openJournalEditModal(a);
  else if(op==='jStar'){ const e = state.journal.entries.find(function(x){ return x.id===a; }); if(e){ e.mood = e.mood==='starred' ? null : 'starred'; persist('journal'); renderView(); } }
  else if(op==='jCopy'){ const e = state.journal.entries.find(function(x){ return x.id===a; }); if(e && navigator.clipboard) navigator.clipboard.writeText(e.text||'').then(function(){ showToast('Copied', {icon:'&#128203;', duration:1500}); }).catch(function(){}); }
  else if(op==='jRemove'){
    const i = state.journal.entries.findIndex(function(x){ return x.id===a; }); if(i<0) return;
    journalRemoved = {i:i, e:state.journal.entries.splice(i, 1)[0]};
    persist('journal'); renderView();
    showToast('Entry removed', {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoJournalRemove', duration:6000});
  }
  else if(op==='open'){ openContact(a, b2); }
  else if(op==='touch'){ const p = a.split(':'); logTouch(p[0], p[1], b2); }
  else if(op==='stage'){ const p = a.split(':'); setStage(p[0], p[1], b2); renderView(); }
  else if(op==='bAdd'){ if(a==='note') addElement({type:'note', header:false, title:'', body:'Double-click to write', w:220, h:90}, at); else if(a==='label') addElement({type:'note', header:true, color:BOARD_COLORS[Math.floor(Math.random()*6)], title:'Category', body:'', w:240, h:56}, at); else addElement({type:'list', title:'List', color:'#3a3f4d', items:[{id:uid(), text:'First thing'}], w:240, h:100}, at); }
  else if(op==='bBg'){ ui.boardBgOpen = true; renderView(); }
  else if(op==='bFit') ACTIONS.boardFit();
  else if(op==='bFull') ACTIONS.boardFullscreen({dataset:{kind:cv.kind}});
  else if(op==='bDup') ACTIONS.boardDuplicate();
  else if(op==='bFwd') ACTIONS.boardForward();
  else if(op==='bBack') ACTIONS.boardBackward();
  else if(op==='bDel') ACTIONS.boardDelete();
  else if(typeof ctxExtra==='function') ctxExtra(op, a, b2);
};
ACTIONS.journalMenu = function(el, e, id){
  const entry = state.journal.entries.find(function(x){ return x.id===id; }); if(!entry) return;
  const r = el.getBoundingClientRect();
  ctxShow(journalMenuHtml(entry), r.right - 220, r.bottom + 6);
};

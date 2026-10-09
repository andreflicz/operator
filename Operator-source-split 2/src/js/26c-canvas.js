
// ============ BOARD CANVAS (vision boards + journal boards) ============
// One engine for both: an infinite, pannable/zoomable dark canvas holding images, note
// cards (optional colored header bar), list cards, links to nested boards, and lines /
// arrows. The engine owns the DOM inside its host element (data-morph-ignore keeps the
// page re-render away from it) and redraws its own elements with morphInto, keyed per
// element, so images never reload while you move things around.
//
// Controls: drag the background to pan · scroll / two-finger to pan · Ctrl/Cmd+scroll or
// pinch to zoom · Shift+drag the background to box-select · Shift+click to add to the
// selection · drag to move · corner handle to resize · double-click a card to edit text ·
// double-click a board card to open it · Delete removes · Cmd+Z / Shift+Cmd+Z undo/redo ·
// paste or drop images anywhere on the board.
const BOARD_COLORS = ['#E8A23D','#3FBE8E','#E8636B','#8fdcff','#b39ddb','#f48fb1','#f3c988','#8A90A2','#E7E9EE'];
const cv = { kind:null, boardId:null, host:null, world:null, els:null, svg:null, marquee:null, sel:new Set(), drag:null, editing:null, history:{}, view:false };
function boardById(id){ return arr(state.boards.boards).find(function(b){ return b.id===id; }) || null; }
function boardsOfKind(kind){ return arr(state.boards.boards).filter(function(b){ return b.kind===kind; }); }
// All boards live in Journal → Boards: the vision board (the one you wake up to) is pinned
// first, then every other board.
function currentBoardId(kind){
  ui.boardIds = ui.boardIds || {};
  let id = ui.boardIds[kind];
  if(!boardById(id)){
    const m = masterVisionBoard();
    const roots = rootBoards();
    id = m ? m.id : (roots.length ? roots[0].id : null);
    ui.boardIds[kind] = id;
  }
  return id;
}
function rootBoards(){
  const m = masterVisionBoard();
  return arr(state.boards.boards).filter(function(b){ return !b.parentId && (!m || b.id!==m.id); });
}
const BOARD_KIND_META = {
  journal:{icon:'&#128204;', title:'Boards', sub:'Your vision board — the one you wake up to — and every other board: moodboards, plans, shoot ideas, journal pages. Bring old Milanote boards in with Import.'}
};
function createBoard(kind, name, parentId){
  const b = {id:uid(), name:name||'Untitled board', kind:kind, parentId:parentId||null, elements:[], viewport:{x:60, y:40, zoom:1}, createdAt:Date.now()};
  state.boards.boards.push(b);
  if(kind==='vision' && !parentId && !masterVisionBoard()) state.boards.masterId = b.id;
  persist('boards');
  return b;
}
function boardPath(b){ const out = []; let cur = b; let guard = 0; while(cur && guard++<20){ out.unshift(cur); cur = cur.parentId ? boardById(cur.parentId) : null; } return out; }
let boardSaveTimer = null;
function saveBoardsSoon(){ clearTimeout(boardSaveTimer); boardSaveTimer = setTimeout(function(){ persist('boards'); }, 350); }
// ---- page shell (header + toolbar are normal re-rendered markup; the canvas is not) ----
function boardStripHtml(kind, current){
  const master = masterVisionBoard();
  const list = (master ? [master] : []).concat(rootBoards());
  const activeRoot = current ? boardPath(current)[0] : null;
  return '<div class="board-strip">'+list.map(function(r){
      const count = r.elements.length;
      const isMaster = master && r.id===master.id;
      return '<button class="board-pill'+(activeRoot && activeRoot.id===r.id?' is-active':'')+(isMaster?' is-master':'')+'" data-action="boardOpen" data-kind="'+kind+'" data-id="'+r.id+'" title="Open '+escapeHtml(r.name)+'">'+
        '<span class="board-pill-thumb">'+(count ? boardStaticHtml(r, 'board-thumb') : '<span class="board-pill-empty">empty</span>')+(isMaster ? '<span class="board-pill-star" title="Your vision board — shows on Today and when you wake up">&#9733;</span>' : '')+'</span>'+
        '<span class="board-pill-text"><span class="board-pill-name">'+escapeHtml(r.name)+'</span><span class="board-pill-count">'+(isMaster ? 'vision board &middot; ' : '')+count+' item'+(count===1?'':'s')+'</span></span>'+
      '</button>';
    }).join('')+
    (master ? '' : '<button class="board-pill board-pill-new" data-action="boardNewVision"><span class="board-pill-plus">&#9733;</span><span class="board-pill-text"><span class="board-pill-name">Vision board</span><span class="board-pill-count">the one you wake up to</span></span></button>')+
    '<button class="board-pill board-pill-new" data-action="boardNew" data-kind="'+kind+'"><span class="board-pill-plus">+</span><span class="board-pill-text"><span class="board-pill-name">New board</span></span></button>'+
    '<button class="board-pill board-pill-new" data-action="boardImport"><span class="board-pill-plus">&#11014;</span><span class="board-pill-text"><span class="board-pill-name">Import boards</span><span class="board-pill-count">Milanote export, .md, images</span></span></button>'+
  '</div>';
}
function renderBoardShell(kind){
  const id = currentBoardId(kind);
  const b = id ? boardById(id) : null;
  const meta = BOARD_KIND_META.journal;
  if(!b){
    return '<div class="board-empty card">'+
      '<div style="font-size:34px;">'+meta.icon+'</div>'+
      '<div class="section-title" style="justify-content:center;margin:8px 0 16px;">'+meta.title+tip(meta.sub)+'</div>'+
      '<div class="row" style="justify-content:center;gap:8px;align-items:center;">'+
        '<button class="btn btn-primary" data-action="boardTemplate">&#9733; Create my vision board</button>'+
        '<button class="btn btn-ghost" data-action="boardNew" data-kind="'+kind+'">+ Blank board</button>'+
        '<button class="btn btn-ghost" data-action="boardImport">&#11014; Import boards</button>'+
        tip('Moving from Milanote? Open a board there → ⋯ menu → Export → Markdown (or download the images), then Import here.')+
      '</div>'+
    '</div>';
  }
  const view = !!(ui.boardView && ui.boardView[kind]);
  const full = ui.boardFull===kind;
  const path = boardPath(b);
  const selCount = cv.boardId===b.id ? cv.sel.size : 0;
  const tool = function(action, label, title, extra){ return '<button class="board-tool" data-action="'+action+'" data-kind="'+kind+'" title="'+escapeHtml(title||label)+'"'+(extra||'')+'>'+label+'</button>'; };
  return '<div class="board-shell'+(view?' is-view':'')+(full?' is-full':'')+'" data-key="shell-'+kind+'">'+
    (!full ? boardStripHtml(kind, b) : '')+
    '<div class="board-bar">'+
      '<div class="board-crumbs">'+
        path.slice(0,-1).map(function(x){ return '<span class="board-crumb" data-action="boardOpen" data-kind="'+kind+'" data-id="'+x.id+'">'+escapeHtml(x.name)+'</span><span class="board-crumb-sep">/</span>'; }).join('')+
        (view ? '<span class="board-title-static">'+escapeHtml(b.name)+'</span>' : '<input class="board-title-input" data-board-rename="'+b.id+'" value="'+escapeHtml(b.name)+'">')+
        (path[0] && masterVisionBoard() && path[0].id===masterVisionBoard().id ? '<span class="board-master-tag" title="Shows on Today and on the wake-up screen">&#9733; Vision board</span>'
          : (!b.parentId && !view ? '<button class="board-tool" data-action="boardMakeMaster" title="Make this the board you wake up to">&#9734; Make it my vision board</button>' : ''))+
      '</div>'+
      '<div class="row" style="gap:6px;position:relative;">'+
        tool('boardBgToggle', '&#127912; Background', 'Change this board\'s background', ui.boardBgOpen ? ' data-on="1"' : '')+
        (ui.boardBgOpen ? boardBgPickerHtml(b) : '')+
        tool('boardToggleView', view?'&#9998; Edit':'&#128065; View', view?'Back to editing':'View mode — hide the editing tools')+
        tool('boardFullscreen', full?(ui.boardReturnTo?'&#8592; Back':'&#10530; Exit full screen'):'&#9974; Full screen', full?(ui.boardReturnTo?'Back to where you were (Esc)':'Exit full screen (Esc)'):'Full screen')+
      '</div>'+
    '</div>'+
    (view ? '' : '<div class="board-toolbar">'+
      tool('boardAddNote','&#9645; Note','Add a note card')+
      tool('boardAddLabel','&#9644; Label','Add a category card with a colored title bar')+
      tool('boardAddList','&#9776; List','Add a list card')+
      tool('boardAddImage','&#128444; Image','Upload images (or paste / drop them on the board)')+
      tool('boardAddImageUrl','&#128279; Image URL','Add an image from a link')+
      tool('boardAddNested','&#128203; Board','Add a board inside this one')+
      tool('boardAddLine','&#9585; Line','Draw a line: click the start, then the end', cv.lineDraw && !cv.lineDraw.arrow ? ' data-on="1"' : '')+
      tool('boardAddArrow','&#10140; Arrow','Draw an arrow: click where it starts, then where it points', cv.lineDraw && cv.lineDraw.arrow ? ' data-on="1"' : '')+
      '<span class="board-tool-sep"></span>'+
      BOARD_COLORS.map(function(c){ return '<button class="board-swatch" data-action="boardColor" data-kind="'+kind+'" data-id="'+c+'" style="background:'+c+'" title="Color selected"'+(selCount?'':' disabled')+'></button>'; }).join('')+
      '<span class="board-tool-sep"></span>'+
      tool('boardForward','&#11014;','Bring forward', selCount?'':' disabled')+
      tool('boardBackward','&#11015;','Send back', selCount?'':' disabled')+
      tool('boardDuplicate','&#10697;','Duplicate', selCount?'':' disabled')+
      tool('boardDelete','&#128465;','Delete selected (Delete key)', selCount?'':' disabled')+
      '<span class="board-tool-sep"></span>'+
      tool('boardUndo','&#8630;','Undo (Cmd+Z)')+
      tool('boardRedo','&#8631;','Redo (Shift+Cmd+Z)')+
      '<span class="board-tool-sep"></span>'+
      tool('boardZoomOut','&minus;','Zoom out')+
      tool('boardZoomIn','+','Zoom in')+
      tool('boardFit','&#9974; Fit','Fit everything')+
      tip('Drag the background to pan · scroll to move · Ctrl/⌘ + scroll to zoom · Shift + drag to select · double-click a card to edit · paste or drop images anywhere.', 'board-help')+
      '<span style="flex:1"></span>'+
      (!(masterVisionBoard() && b.id===masterVisionBoard().id) ? tool('boardDeleteBoard','Delete board','Delete this board (and boards inside it)') : '')+
    '</div>')+
    '<div class="board-host" id="boardHost" data-photo-drop="board" data-morph-ignore="'+kind+':'+b.id+':'+(view?'v':'e')+(full?':f':'')+'"></div>'+
  '</div>';
}
ACTIONS.boardFullscreen = function(el){
  const kind = el.dataset.kind;
  if(ui.boardFull===kind){ exitBoardFullscreen(); return; }
  ui.boardFull = kind;
  try{ if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){}); }catch(e){}
  renderView();
};
function boardReturnBack(){
  const r = ui.boardReturnTo; ui.boardReturnTo = null;
  if(!r) return;
  if(ui.boardView) ui.boardView.journal = false;
  ui.view = r.view;
  renderView();
  const root = document.getElementById('viewRoot'); if(root && r.scroll) root.scrollTop = r.scroll;
}
function exitBoardFullscreen(){
  ui.boardFull = null;
  try{ if(document.fullscreenElement) document.exitFullscreen().catch(function(){}); }catch(e){}
  if(ui.boardReturnTo){ boardReturnBack(); return; }
  renderView();
}
document.addEventListener('fullscreenchange', function(){ if(!document.fullscreenElement && ui.boardFull){ ui.boardFull = null; if(ui.boardReturnTo){ boardReturnBack(); return; } renderView(); } });
// ---- mounting ----
afterRenderHooks.push(function(){
  const host = document.getElementById('boardHost');
  if(!host){ cv.host = null; return; }
  const key = host.getAttribute('data-morph-ignore');
  const parts = key.split(':');
  if(cv.host!==host || host._cvKey!==key){
    cv.kind = parts[0]; cv.boardId = parts[1]; cv.view = parts[2]==='v';
    if(host._cvKey && host._cvKey.split(':')[1]!==cv.boardId) cv.sel.clear();
    mountBoard(host, key);
  } else if(!cv.drag && !cv.editing){
    drawBoard();
  }
});
// Opening a board always frames everything on it, centred (like Milanote) — and while you
// haven't panned or zoomed yourself, it stays framed as the window or full screen changes size.
let cvResizeObs = null;
function fitBoardSoon(){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ if(!cv.userMoved || cv._fitPending){ cv._fitPending = false; fitBoard(); } }); }); }
function mountBoard(host, key){
  const sameBoard = host._cvKey && host._cvKey.split(':')[1]===key.split(':')[1];
  cv.host = host; host._cvKey = key;
  if(!sameBoard || ui.boardFull){ cv.userMoved = false; cv._fitPending = true; }
  host.innerHTML = '<div class="board-world"><svg class="board-lines" width="1" height="1"><defs><marker id="bArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs><g class="board-lines-g"></g></svg><div class="board-els"></div></div><div class="board-marquee"></div>';
  cv.world = host.querySelector('.board-world');
  cv.els = host.querySelector('.board-els');
  cv.svg = host.querySelector('.board-lines-g');
  cv.marquee = host.querySelector('.board-marquee');
  if(!host._cvWired){
    host._cvWired = true;
    host.addEventListener('pointerdown', boardPointerDown);
    host.addEventListener('pointermove', boardPointerMove);
    host.addEventListener('pointerup', boardPointerUp);
    host.addEventListener('pointercancel', boardPointerUp);
    host.addEventListener('dblclick', boardDblClick);
    host.addEventListener('wheel', boardWheel, {passive:false});
  }
  if(typeof ResizeObserver!=='undefined'){
    if(cvResizeObs) cvResizeObs.disconnect();
    let last = '';
    cvResizeObs = new ResizeObserver(function(){
      if(!cv.host) return;
      const r = cv.host.getBoundingClientRect(), sig = Math.round(r.width)+'x'+Math.round(r.height);
      if(sig===last) return; last = sig;
      if(!cv.userMoved && !cv.drag) fitBoard();
    });
    cvResizeObs.observe(host);
  }
  drawBoard();
  fitBoardSoon();
}
function cvBoard(){ return boardById(cv.boardId); }
function applyViewport(){
  const b = cvBoard(); if(!b || !cv.world) return;
  const v = b.viewport;
  cv.world.style.transform = 'translate('+v.x+'px,'+v.y+'px) scale('+v.zoom+')';
  if(cv.host) cv.host.style.backgroundPosition = v.x+'px '+v.y+'px';
  if(cv.host) cv.host.style.backgroundSize = (24*v.zoom)+'px '+(24*v.zoom)+'px';
}
function elHtml(el, single){
  const sel = cv.sel.has(el.id);
  const base = 'class="bel bel-'+el.type+(sel?' is-sel':'')+'" data-key="el-'+el.id+'" data-el="'+el.id+'" style="left:'+el.x+'px;top:'+el.y+'px;width:'+el.w+'px;'+(el.type==='image'?'height:'+el.h+'px;':'min-height:'+el.h+'px;')+'z-index:'+(el.z||1)+';"';
  const handle = (sel && single && !cv.view) ? '<span class="bel-resize" data-handle="'+el.id+'"></span>' : '';
  if(el.type==='image') return '<div '+base+'><img src="'+escapeHtml(blobUrl(el.ref))+'" draggable="false" alt="">'+handle+'</div>';
  if(el.type==='note'){
    const head = el.header ? '<div class="bel-head" style="background:'+(el.color||'#E8A23D')+'"><div class="bel-title" data-field="title">'+escapeHtml(el.title||'')+'</div></div>' : (el.title ? '<div class="bel-title bel-title-plain" data-field="title">'+escapeHtml(el.title)+'</div>' : '');
    return '<div '+base+'>'+head+'<div class="bel-body" data-field="body">'+escapeHtml(el.body||'')+'</div>'+handle+'</div>';
  }
  if(el.type==='list'){
    return '<div '+base+'><div class="bel-head" style="background:'+(el.color||'#3a3f4d')+'"><div class="bel-title" data-field="title">'+escapeHtml(el.title||'List')+'</div></div>'+
      '<div class="bel-list" data-field="items">'+arr(el.items).map(function(it){ return '<div>'+escapeHtml(it.text||'')+'</div>'; }).join('')+'</div>'+handle+'</div>';
  }
  if(el.type==='board'){
    const nb = boardById(el.boardId);
    const count = nb ? nb.elements.length : 0;
    return '<div '+base+'><div class="bel-board-stripe" style="background:'+(el.color||'#8fdcff')+'"></div><div class="bel-board-icon">&#128203;</div><div class="bel-board-name">'+escapeHtml(nb?nb.name:'Missing board')+'</div><div class="kpi-sub">'+count+' item'+(count===1?'':'s')+' &middot; double-click to open</div>'+handle+'</div>';
  }
  return '';
}
function drawBoard(){
  const b = cvBoard(); if(!b || !cv.els) return;
  applyBoardBg(cv.host, b);
  applyViewport();
  cv.host.classList.toggle('is-view', cv.view);
  const els = b.elements.slice().sort(function(a,b2){ return (a.z||0)-(b2.z||0); });
  const single = cv.sel.size===1;
  morphInto(cv.els, els.filter(function(e){ return e.type!=='line'; }).map(function(e){ return elHtml(e, single); }).join('')+
    els.filter(function(e){ return e.type==='line' && cv.sel.has(e.id) && !cv.view; }).map(function(e){
      return '<span class="bel-line-end" data-key="le1-'+e.id+'" data-line-end="'+e.id+':1" style="left:'+e.x1+'px;top:'+e.y1+'px;"></span><span class="bel-line-end" data-key="le2-'+e.id+'" data-line-end="'+e.id+':2" style="left:'+e.x2+'px;top:'+e.y2+'px;"></span>';
    }).join(''));
  const lines = els.filter(function(e){ return e.type==='line'; }).map(function(e){
    const sel = cv.sel.has(e.id);
    return '<line data-key="ln-'+e.id+'" data-el="'+e.id+'" class="bline'+(sel?' is-sel':'')+'" x1="'+e.x1+'" y1="'+e.y1+'" x2="'+e.x2+'" y2="'+e.y2+'" stroke="'+(e.color||'#8A90A2')+'" stroke-width="'+(e.width||2)+'" stroke-linecap="round"'+(e.arrow?' marker-end="url(#bArrow)"':'')+'/>'+
      '<line data-key="lh-'+e.id+'" data-el="'+e.id+'" class="bline-hit" x1="'+e.x1+'" y1="'+e.y1+'" x2="'+e.x2+'" y2="'+e.y2+'" stroke="transparent" stroke-width="22" stroke-linecap="round"/>';
  }).join('');
  cv.svg.innerHTML = lines;
}
// ---- history / mutations ----
function cvHist(){ const id = cv.boardId; if(!cv.history[id]) cv.history[id] = {undo:[], redo:[]}; return cv.history[id]; }
function snapshot(){ const b = cvBoard(); if(!b) return; const h = cvHist(); h.undo.push(JSON.stringify(b.elements)); if(h.undo.length>80) h.undo.shift(); h.redo = []; }
function commitBoard(chrome){ saveBoardsSoon(); drawBoard(); if(chrome) renderView(); }
function maxZ(b){ return b.elements.reduce(function(m,e){ return Math.max(m, e.z||0); }, 0); }
function viewCenter(){
  const b = cvBoard(); const r = cv.host.getBoundingClientRect();
  return {x:(r.width/2 - b.viewport.x)/b.viewport.zoom, y:(r.height/2 - b.viewport.y)/b.viewport.zoom};
}
function addElement(el, at){
  const b = cvBoard(); if(!b) return null;
  snapshot();
  const c = at || viewCenter();
  el.id = uid(); el.z = maxZ(b)+1;
  if(el.type==='line'){ el.x1 = c.x-90; el.y1 = c.y; el.x2 = c.x+90; el.y2 = c.y; }
  else { el.x = Math.round(c.x - el.w/2 + (Math.random()*30-15)); el.y = Math.round(c.y - el.h/2 + (Math.random()*30-15)); }
  b.elements.push(el);
  cv.sel = new Set([el.id]);
  commitBoard(true);
  return el;
}
function screenToWorld(clientX, clientY){
  const b = cvBoard(); const r = cv.host.getBoundingClientRect();
  return {x:(clientX - r.left - b.viewport.x)/b.viewport.zoom, y:(clientY - r.top - b.viewport.y)/b.viewport.zoom};
}
async function addImagesToBoard(files, at){
  const b = cvBoard(); if(!b) return;
  let pos = at || viewCenter();
  for(const f of files){
    const ref = await storeImageFile(f);
    const dims = await new Promise(function(res){ const i = new Image(); i.onload = function(){ res([i.naturalWidth, i.naturalHeight]); }; i.onerror = function(){ res([400,300]); }; i.src = blobUrl(ref)===BLANK_IMG ? URL.createObjectURL(f) : blobUrl(ref); });
    const w = Math.min(340, dims[0]), h = Math.round(w*dims[1]/Math.max(1,dims[0]));
    addElement({type:'image', ref:ref, w:w, h:h}, {x:pos.x, y:pos.y});
    pos = {x:pos.x+30, y:pos.y+30};
  }
}
ACTIONS['drop:board'] = function(zone, files, e){
  if(cv.view) return;
  const imgs = files.filter(function(f){ return f.type && f.type.indexOf('image/')===0; });
  if(imgs.length) addImagesToBoard(imgs, screenToWorld(e.clientX, e.clientY));
};
// ---- pointer interaction ----
function elFromTarget(t){ const n = t.closest && t.closest('[data-el]'); return n ? n.getAttribute('data-el') : null; }
function boardPointerDown(e){
  const b = cvBoard(); if(!b) return;
  if(e.button===2) return;
  if(cv.lineDraw){
    e.preventDefault();
    const pt = lineDrawPoint(e);
    if(!cv.lineDraw.start){ cv.lineDraw.start = pt; cv.lineDraw.down = {cx:e.clientX, cy:e.clientY}; drawLinePreview(pt); setDrawHint(cv.lineDraw.arrow ? 'Now click where the arrow points' : 'Now click where the line ends'); }
    else finishLineDraw(pt);
    return;
  }
  if(cv.editing){
    if(e.target.closest('[contenteditable="true"]')) return;
    finishEditing();
  }
  const start = {cx:e.clientX, cy:e.clientY};
  const handle = e.target.getAttribute && e.target.getAttribute('data-handle');
  const lineEnd = e.target.getAttribute && e.target.getAttribute('data-line-end');
  const elId = elFromTarget(e.target);
  if(!cv.view && handle){
    const el = b.elements.find(function(x){ return x.id===handle; });
    cv.drag = {type:'resize', el:el, w:el.w, h:el.h, start:start, moved:false, ratio: el.type==='image' ? el.h/Math.max(1,el.w) : null};
  } else if(!cv.view && lineEnd){
    const p = lineEnd.split(':'); const el = b.elements.find(function(x){ return x.id===p[0]; });
    cv.drag = {type:'lineEnd', el:el, end:p[1], ox:el['x'+p[1]], oy:el['y'+p[1]], start:start, moved:false};
  } else if(elId && !cv.view){
    if(e.shiftKey){ if(cv.sel.has(elId)) cv.sel.delete(elId); else cv.sel.add(elId); drawBoard(); renderView(); return; }
    const wasSelected = cv.sel.has(elId);
    if(!wasSelected){ cv.sel = new Set([elId]); }
    const origins = {};
    b.elements.forEach(function(x){ if(cv.sel.has(x.id)) origins[x.id] = x.type==='line' ? {x1:x.x1,y1:x.y1,x2:x.x2,y2:x.y2} : {x:x.x, y:x.y}; });
    cv.drag = {type:'move', origins:origins, start:start, moved:false, selChanged:!wasSelected};
    drawBoard();
  } else if(!cv.view && e.shiftKey){
    cv.drag = {type:'marquee', start:start, moved:false, w0:screenToWorld(e.clientX, e.clientY)};
  } else {
    cv.drag = {type:'pan', start:start, vx:b.viewport.x, vy:b.viewport.y, moved:false, el:elId};
  }
  cv.drag.pointerId = e.pointerId;
}
function boardPointerMove(e){
  if(cv.lineDraw && cv.lineDraw.start){ drawLinePreview(lineDrawPoint(e)); return; }
  const d = cv.drag; if(!d) return;
  const b = cvBoard(); if(!b) return;
  const dx = e.clientX - d.start.cx, dy = e.clientY - d.start.cy;
  if(!d.moved && Math.abs(dx)+Math.abs(dy) < 3) return;
  if(!d.moved){
    d.moved = true;
    // Capture only once it's really a drag, so plain clicks/double-clicks keep their target.
    try{ cv.host.setPointerCapture(d.pointerId); }catch(err){}
    if(d.type==='move' || d.type==='resize' || d.type==='lineEnd') snapshot();
    cv.host.classList.add('is-dragging');
  }
  const z = b.viewport.zoom;
  if(d.type==='pan'){
    b.viewport.x = d.vx + dx; b.viewport.y = d.vy + dy; cv.userMoved = true; applyViewport();
  } else if(d.type==='move'){
    b.elements.forEach(function(x){
      const o = d.origins[x.id]; if(!o) return;
      if(x.type==='line'){ x.x1 = Math.round(o.x1+dx/z); x.y1 = Math.round(o.y1+dy/z); x.x2 = Math.round(o.x2+dx/z); x.y2 = Math.round(o.y2+dy/z); }
      else { x.x = Math.round(o.x+dx/z); x.y = Math.round(o.y+dy/z); }
    });
    drawBoard();
  } else if(d.type==='resize'){
    d.el.w = Math.max(60, Math.round(d.w + dx/z));
    d.el.h = d.ratio ? Math.round(d.el.w*d.ratio) : Math.max(40, Math.round(d.h + dy/z));
    drawBoard();
  } else if(d.type==='lineEnd'){
    d.el['x'+d.end] = Math.round(d.ox + dx/z); d.el['y'+d.end] = Math.round(d.oy + dy/z);
    if(e.shiftKey){ const o = d.end==='1'?'2':'1'; if(Math.abs(d.el['x'+d.end]-d.el['x'+o]) < Math.abs(d.el['y'+d.end]-d.el['y'+o])) d.el['x'+d.end] = d.el['x'+o]; else d.el['y'+d.end] = d.el['y'+o]; }
    drawBoard();
  } else if(d.type==='marquee'){
    const r = cv.host.getBoundingClientRect();
    const x = Math.min(e.clientX, d.start.cx)-r.left, y = Math.min(e.clientY, d.start.cy)-r.top;
    cv.marquee.style.cssText = 'display:block;left:'+x+'px;top:'+y+'px;width:'+Math.abs(dx)+'px;height:'+Math.abs(dy)+'px;';
    const w1 = d.w0, w2 = screenToWorld(e.clientX, e.clientY);
    const minX = Math.min(w1.x,w2.x), maxX = Math.max(w1.x,w2.x), minY = Math.min(w1.y,w2.y), maxY = Math.max(w1.y,w2.y);
    cv.sel = new Set(b.elements.filter(function(x){
      if(x.type==='line') return Math.min(x.x1,x.x2)>=minX && Math.max(x.x1,x.x2)<=maxX && Math.min(x.y1,x.y2)>=minY && Math.max(x.y1,x.y2)<=maxY;
      return x.x>=minX && x.x+x.w<=maxX && x.y>=minY && x.y+x.h<=maxY;
    }).map(function(x){ return x.id; }));
    drawBoard();
  }
}
function boardPointerUp(e){
  // press-and-drag also draws: let go somewhere else and that's the end point
  if(cv.lineDraw && cv.lineDraw.start && cv.lineDraw.down && Math.abs(e.clientX-cv.lineDraw.down.cx)+Math.abs(e.clientY-cv.lineDraw.down.cy) > 10){ finishLineDraw(lineDrawPoint(e)); return; }
  if(cv.lineDraw && cv.lineDraw.down) cv.lineDraw.down = null;
  const d = cv.drag; if(!d) return;
  cv.drag = null;
  cv.host.classList.remove('is-dragging');
  if(cv.marquee) cv.marquee.style.display = 'none';
  const b = cvBoard(); if(!b) return;
  if(d.type==='pan'){
    if(d.moved) saveBoardsSoon();
    else if(cv.view && d.el){ const el = b.elements.find(function(x){ return x.id===d.el; }); if(el && el.type==='board') openBoard(cv.kind, el.boardId); }
    else if(cv.sel.size){ cv.sel.clear(); drawBoard(); renderView(); }
    return;
  }
  if(d.moved){ commitBoard(d.type==='marquee'); }
  else if(d.type==='move' && d.selChanged) renderView();
}
function boardWheel(e){
  const b = cvBoard(); if(!b) return;
  e.preventDefault();
  if(e.ctrlKey || e.metaKey){
    const r = cv.host.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const z0 = b.viewport.zoom;
    const z1 = clamp(z0 * Math.exp(-e.deltaY*0.0045), 0.15, 4);
    b.viewport.x = mx - (mx - b.viewport.x) * z1/z0;
    b.viewport.y = my - (my - b.viewport.y) * z1/z0;
    b.viewport.zoom = z1;
  } else {
    b.viewport.x -= e.deltaX; b.viewport.y -= e.deltaY;
  }
  cv.userMoved = true;
  applyViewport(); saveBoardsSoon();
}
function zoomBy(f){
  const b = cvBoard(); if(!b || !cv.host) return;
  const r = cv.host.getBoundingClientRect(); const mx = r.width/2, my = r.height/2;
  const z0 = b.viewport.zoom, z1 = clamp(z0*f, 0.15, 4);
  b.viewport.x = mx - (mx-b.viewport.x)*z1/z0; b.viewport.y = my - (my-b.viewport.y)*z1/z0; b.viewport.zoom = z1;
  cv.userMoved = true;
  applyViewport(); saveBoardsSoon();
}
function fitBoard(){
  const b = cvBoard(); if(!b || !cv.host || !b.elements.length) return;
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  b.elements.forEach(function(e){
    if(e.type==='line'){ minX=Math.min(minX,e.x1,e.x2); maxX=Math.max(maxX,e.x1,e.x2); minY=Math.min(minY,e.y1,e.y2); maxY=Math.max(maxY,e.y1,e.y2); }
    else {
      // cards grow with their text, so measure the drawn card when there is one
      const node = cv.els && cv.els.querySelector('[data-el="'+e.id+'"]');
      const h = Math.max(e.h||0, node ? node.offsetHeight : 0), w = Math.max(e.w||0, node ? node.offsetWidth : 0);
      minX=Math.min(minX,e.x); minY=Math.min(minY,e.y); maxX=Math.max(maxX,e.x+w); maxY=Math.max(maxY,e.y+h);
    }
  });
  if(!isFinite(minX) || !isFinite(minY)) return;
  const r = cv.host.getBoundingClientRect(), pad = 40;
  if(!r.width || !r.height) return;
  cv.userMoved = false;
  const z = clamp(Math.min((r.width-pad*2)/Math.max(1,maxX-minX), (r.height-pad*2)/Math.max(1,maxY-minY)), 0.15, 1.5);
  b.viewport = {zoom:z, x:(r.width-(maxX-minX)*z)/2 - minX*z, y:(r.height-(maxY-minY)*z)/2 - minY*z};
  applyViewport(); saveBoardsSoon();
}
// ---- text editing ----
function boardDblClick(e){
  const b = cvBoard(); if(!b) return;
  const id = elFromTarget(e.target); if(!id) return;
  const el = b.elements.find(function(x){ return x.id===id; }); if(!el) return;
  if(el.type==='board'){ openBoard(cv.kind, el.boardId); return; }
  if(cv.view || (el.type!=='note' && el.type!=='list')) return;
  const node = cv.els.querySelector('[data-el="'+id+'"]'); if(!node) return;
  let field = e.target.closest('[data-field]');
  if(!field) field = node.querySelector('[data-field="body"]') || node.querySelector('[data-field="items"]');
  if(el.type==='note' && !node.querySelector('[data-field="title"]') && e.target.closest('[data-field="title"]')) field = null;
  snapshot();
  cv.editing = {id:id};
  node.classList.add('is-editing');
  node.querySelectorAll('[data-field]').forEach(function(f){ f.setAttribute('contenteditable','true'); });
  const target = field || node.querySelector('[data-field]');
  if(target){
    target.focus();
    try{ const range = document.createRange(); range.selectNodeContents(target); range.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }catch(err){}
  }
}
function finishEditing(){
  const ed = cv.editing; if(!ed) return;
  cv.editing = null;
  const b = cvBoard(); const el = b && b.elements.find(function(x){ return x.id===ed.id; });
  const node = cv.els && cv.els.querySelector('[data-el="'+ed.id+'"]');
  if(el && node){
    const t = node.querySelector('[data-field="title"]'); if(t) el.title = t.innerText.trim();
    const bd = node.querySelector('[data-field="body"]'); if(bd) el.body = bd.innerText.replace(/\n+$/,'');
    const it = node.querySelector('[data-field="items"]');
    if(it){
      const lines = it.innerText.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      el.items = lines.map(function(s, i){ const prev = arr(el.items)[i]; return {id: prev ? prev.id : uid(), text:s}; });
    }
    node.classList.remove('is-editing');
    node.querySelectorAll('[contenteditable]').forEach(function(f){ f.removeAttribute('contenteditable'); });
    // grow the card to fit its text
    if(el.type!=='image') el.h = Math.max(el.h, Math.round(node.offsetHeight));
  }
  commitBoard(false);
}
document.addEventListener('focusout', function(e){
  if(!cv.editing || !cv.els) return;
  const node = cv.els.querySelector('[data-el="'+cv.editing.id+'"]');
  setTimeout(function(){ if(cv.editing && node && !node.contains(document.activeElement)) finishEditing(); }, 0);
});
// ---- keyboard + paste ----
function boardActive(){ return !!(cv.host && document.body.contains(cv.host) && cvBoard()); }
function typingInField(t){ return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
document.addEventListener('keydown', function(e){
  if(!boardActive()) return;
  if(cv.lineDraw && e.key==='Escape'){ e.preventDefault(); cancelLineDraw(); return; }
  if(ui.boardFull && e.key==='Escape' && !cv.editing && !cv.sel.size && !document.querySelector('.overlay:not(.hidden)')){ e.preventDefault(); exitBoardFullscreen(); return; }
  if(cv.editing){ if(e.key==='Escape'){ e.preventDefault(); finishEditing(); } return; }
  if(typingInField(e.target)) return;
  if(document.querySelector('.overlay:not(.hidden)')) return;
  const mod = e.metaKey || e.ctrlKey;
  if(mod && e.key.toLowerCase()==='z'){ e.preventDefault(); if(e.shiftKey) ACTIONS.boardRedo(); else ACTIONS.boardUndo(); return; }
  if(mod && e.key.toLowerCase()==='y'){ e.preventDefault(); ACTIONS.boardRedo(); return; }
  if(cv.view) return;
  if((e.key==='Delete' || e.key==='Backspace') && cv.sel.size){ e.preventDefault(); ACTIONS.boardDelete(); return; }
  if(mod && e.key.toLowerCase()==='d' && cv.sel.size){ e.preventDefault(); ACTIONS.boardDuplicate(); return; }
  if(mod && e.key.toLowerCase()==='a'){ e.preventDefault(); cv.sel = new Set(cvBoard().elements.map(function(x){ return x.id; })); drawBoard(); renderView(); return; }
  if(e.key==='Escape' && cv.sel.size){ cv.sel.clear(); drawBoard(); renderView(); }
});
document.addEventListener('paste', function(e){
  if(!boardActive() || cv.view || cv.editing || typingInField(e.target)) return;
  if(document.querySelector('.overlay:not(.hidden)')) return;
  const imgs = imageFilesFromTransfer(e.clipboardData);
  if(imgs.length){ e.preventDefault(); addImagesToBoard(imgs); return; }
  const text = (e.clipboardData && e.clipboardData.getData('text/plain')||'').trim();
  if(!text) return;
  e.preventDefault();
  if(/^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i.test(text)) addElement({type:'image', ref:text, w:320, h:220});
  else addElement({type:'note', title:'', body:text, w:240, h:90});
});
// ---- toolbar actions ----
function openBoard(kind, id){ if(cv.editing) finishEditing(); ui.boardIds = ui.boardIds||{}; ui.boardIds[kind] = id; cv.sel.clear(); renderView(); }
ACTIONS.boardOpen = function(el){ openBoard(el.dataset.kind, el.dataset.id); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.dataset) return;
  if(t.dataset.boardPick) openBoard(t.dataset.boardPick, t.value);
  if(t.dataset.boardRename){ const b = boardById(t.dataset.boardRename); if(b && t.value.trim()){ b.name = t.value.trim(); persist('boards'); renderView(); } }
});
ACTIONS.boardNew = function(){
  const b = createBoard('journal', 'Board '+(rootBoards().length+1));
  openBoard('journal', b.id);
};
ACTIONS.boardNewVision = function(){ ACTIONS.boardTemplate(); };
ACTIONS.boardMakeMaster = function(){
  const b = cvBoard(); if(!b) return;
  const root = boardPath(b)[0];
  state.boards.masterId = root.id;
  persist('boards'); playPositive(); renderView();
  showToast('“'+root.name+'” is your vision board now — it shows on Today and when your alarm goes off.', {icon:'&#9733;'});
};
ACTIONS.boardToggleView = function(el){
  if(cv.editing) finishEditing();
  ui.boardView = ui.boardView || {}; ui.boardView[el.dataset.kind] = !ui.boardView[el.dataset.kind];
  cv.sel.clear(); renderView();
};
function canvasAddNote(){ if(cvBoard()) ACTIONS.boardAddNote(); }
ACTIONS.boardAddNote = function(){ addElement({type:'note', header:false, title:'', body:'Double-click to write', w:220, h:90}); };
ACTIONS.boardAddLabel = function(){ addElement({type:'note', header:true, color:BOARD_COLORS[Math.floor(Math.random()*6)], title:'Category', body:'One-line subtitle', w:260, h:96}); };
ACTIONS.boardAddList = function(){ addElement({type:'list', title:'List', color:'#3a3f4d', items:[{id:uid(), text:'First thing'},{id:uid(), text:'Second thing'}], w:260, h:120}); };
// Lines and arrows are drawn: pick the tool, click where it starts, then where it ends
// (or press and drag). Shift keeps it straight; Esc cancels.
ACTIONS.boardAddLine = function(){ startLineDraw(false); };
ACTIONS.boardAddArrow = function(){ startLineDraw(true); };
function startLineDraw(arrow){
  if(!cvBoard() || cv.view) return;
  if(cv.lineDraw && cv.lineDraw.arrow===arrow){ cancelLineDraw(); return; }
  cv.lineDraw = {arrow:arrow, color: arrow ? '#E7E9EE' : '#8A90A2', start:null};
  cv.sel.clear();
  if(cv.host){ cv.host.classList.add('is-drawing'); setDrawHint(arrow ? 'Click where the arrow starts, then where it points' : 'Click where the line starts, then where it ends'); }
  drawBoard(); renderView();
}
function cancelLineDraw(){
  cv.lineDraw = null;
  if(cv.host){ cv.host.classList.remove('is-drawing'); setDrawHint(''); }
  const pv = cv.svg && cv.svg.querySelector('.bline-preview'); if(pv) pv.remove();
  renderView();
}
function setDrawHint(text){
  if(!cv.host) return;
  let h = cv.host.querySelector('.board-draw-hint');
  if(!text){ if(h) h.remove(); return; }
  if(!h){ h = document.createElement('div'); h.className = 'board-draw-hint'; cv.host.appendChild(h); }
  h.textContent = text+' · Esc to cancel';
}
function lineDrawPoint(e){
  const w = screenToWorld(e.clientX, e.clientY);
  const st = cv.lineDraw && cv.lineDraw.start;
  if(st && e.shiftKey){ if(Math.abs(w.x-st.x) > Math.abs(w.y-st.y)) w.y = st.y; else w.x = st.x; }
  return {x:Math.round(w.x), y:Math.round(w.y)};
}
function drawLinePreview(end){
  const st = cv.lineDraw.start; if(!st || !cv.svg) return;
  let pv = cv.svg.querySelector('.bline-preview');
  if(!pv){ pv = document.createElementNS('http://www.w3.org/2000/svg', 'line'); pv.setAttribute('class', 'bline-preview'); cv.svg.appendChild(pv); }
  pv.setAttribute('x1', st.x); pv.setAttribute('y1', st.y); pv.setAttribute('x2', end.x); pv.setAttribute('y2', end.y);
  pv.setAttribute('stroke', cv.lineDraw.color); pv.setAttribute('stroke-width', 2); pv.setAttribute('stroke-dasharray', '6 5');
  if(cv.lineDraw.arrow) pv.setAttribute('marker-end', 'url(#bArrow)'); else pv.removeAttribute('marker-end');
}
function finishLineDraw(end){
  const ld = cv.lineDraw, b = cvBoard(); if(!ld || !ld.start || !b) return false;
  if(Math.abs(end.x-ld.start.x) + Math.abs(end.y-ld.start.y) < 6) return false;
  snapshot();
  const el = {id:uid(), type:'line', color:ld.color, width:2, arrow:ld.arrow, x1:ld.start.x, y1:ld.start.y, x2:end.x, y2:end.y, z:maxZ(b)+1};
  b.elements.push(el);
  cv.lineDraw = null;
  if(cv.host){ cv.host.classList.remove('is-drawing'); setDrawHint(''); }
  cv.sel = new Set([el.id]);
  commitBoard(true);
  return true;
}
ACTIONS.boardAddImage = function(){
  const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.multiple = true;
  inp.onchange = function(){ addImagesToBoard(Array.prototype.slice.call(inp.files||[])); };
  inp.click();
};
ACTIONS.boardAddImageUrl = function(){
  const url = window.prompt('Image link (https://…)');
  if(url && /^https?:\/\//i.test(url.trim())) addElement({type:'image', ref:url.trim(), w:320, h:220});
};
ACTIONS.boardAddNested = function(){
  const parent = cvBoard(); if(!parent) return;
  const child = createBoard(parent.kind, 'New board', parent.id);
  addElement({type:'board', boardId:child.id, color:'#8fdcff', w:220, h:96});
};
ACTIONS.boardColor = function(el, e, color){
  const b = cvBoard(); if(!b || !cv.sel.size) return;
  snapshot();
  b.elements.forEach(function(x){ if(!cv.sel.has(x.id)) return; x.color = color; if(x.type==='note') x.header = true; });
  commitBoard(false);
};
ACTIONS.boardForward = function(){ const b = cvBoard(); if(!b) return; snapshot(); let z = maxZ(b); b.elements.forEach(function(x){ if(cv.sel.has(x.id)) x.z = ++z; }); commitBoard(false); };
ACTIONS.boardBackward = function(){ const b = cvBoard(); if(!b) return; snapshot(); let z = b.elements.reduce(function(m,x){ return Math.min(m, x.z||0); }, 0); b.elements.forEach(function(x){ if(cv.sel.has(x.id)) x.z = --z; }); commitBoard(false); };
ACTIONS.boardDuplicate = function(){
  const b = cvBoard(); if(!b || !cv.sel.size) return; snapshot();
  const copies = [];
  let z = maxZ(b);
  b.elements.filter(function(x){ return cv.sel.has(x.id); }).forEach(function(x){
    const c = JSON.parse(JSON.stringify(x)); c.id = uid(); c.z = ++z;
    if(c.type==='line'){ c.x1+=24; c.y1+=24; c.x2+=24; c.y2+=24; } else { c.x+=24; c.y+=24; }
    copies.push(c);
  });
  copies.forEach(function(c){ b.elements.push(c); });
  cv.sel = new Set(copies.map(function(c){ return c.id; }));
  commitBoard(true);
};
ACTIONS.boardDelete = function(){
  const b = cvBoard(); if(!b || !cv.sel.size) return; snapshot();
  b.elements = b.elements.filter(function(x){ return !cv.sel.has(x.id); });
  cv.sel.clear();
  commitBoard(true);
};
ACTIONS.boardUndo = function(){
  const b = cvBoard(); if(!b) return; const h = cvHist(); if(!h.undo.length) return;
  h.redo.push(JSON.stringify(b.elements)); b.elements = JSON.parse(h.undo.pop()); cv.sel.clear(); commitBoard(true);
};
ACTIONS.boardRedo = function(){
  const b = cvBoard(); if(!b) return; const h = cvHist(); if(!h.redo.length) return;
  h.undo.push(JSON.stringify(b.elements)); b.elements = JSON.parse(h.redo.pop()); cv.sel.clear(); commitBoard(true);
};
ACTIONS.boardZoomIn = function(){ zoomBy(1.2); };
ACTIONS.boardZoomOut = function(){ zoomBy(1/1.2); };
ACTIONS.boardFit = function(){ fitBoard(); };
let lastDeletedBoards = null;
ACTIONS.boardDeleteBoard = function(el){
  const b = cvBoard(); if(!b) return;
  const doomed = new Set([b.id]);
  let grew = true;
  while(grew){ grew = false; state.boards.boards.forEach(function(x){ if(x.parentId && doomed.has(x.parentId) && !doomed.has(x.id)){ doomed.add(x.id); grew = true; } }); }
  lastDeletedBoards = state.boards.boards.filter(function(x){ return doomed.has(x.id); });
  state.boards.boards = state.boards.boards.filter(function(x){ return !doomed.has(x.id); });
  ui.boardIds[el.dataset.kind] = b.parentId || null;
  cv.sel.clear();
  persist('boards'); renderView();
  showToast('Deleted board “'+b.name+'”', {icon:'&#128465;', actionLabel:'Undo', actionAction:'undoDeleteBoard', duration:8000});
};
ACTIONS.undoDeleteBoard = function(){
  if(!lastDeletedBoards) return;
  lastDeletedBoards.forEach(function(x){ state.boards.boards.push(x); });
  ui.boardIds[lastDeletedBoards[0].kind] = lastDeletedBoards[0].id;
  lastDeletedBoards = null;
  const c = document.getElementById('toastContainer'); if(c) c.innerHTML='';
  persist('boards'); renderView();
};
// Starter layout mirroring the Milanote board: category label cards, the "avoiding" list,
// a nested "The Key To Life" board and a vertical divider. Drop your photos in around them.
ACTIONS.boardTemplate = function(){
  const b = createBoard(masterVisionBoard() ? 'journal' : 'vision', 'Vision Board');
  const key = createBoard(b.kind, 'The Key To Life', b.id);
  const els = [
    {type:'note', header:true, color:'#3FBE8E', title:'Mind + Body', body:'Feeding the body and the brain. Free of temptation.', x:40, y:40, w:300, h:96},
    {type:'note', header:true, color:'#E8A23D', title:'Being creative', body:'', x:380, y:40, w:260, h:70},
    {type:'note', header:true, color:'#8fdcff', title:'Enjoying my work', body:'', x:40, y:320, w:280, h:70},
    {type:'note', header:true, color:'#b39ddb', title:'Visions of the Future', body:'', x:380, y:320, w:300, h:70},
    {type:'line', color:'#4E5568', width:2, arrow:false, x1:740, y1:20, x2:740, y2:620},
    {type:'list', title:'What we are avoiding by locking in', color:'#E8636B', items:[{id:uid(), text:'Staying stuck'},{id:uid(), text:'More debt'},{id:uid(), text:'Feeling like garbage tomorrow morning'}], x:800, y:40, w:320, h:150},
    {type:'board', boardId:key.id, color:'#f3c988', x:800, y:240, w:240, h:96}
  ];
  els.forEach(function(e, i){ e.id = uid(); e.z = i+1; b.elements.push(e); });
  persist('boards');
  ui.view = 'personal'; ui.personalTab = 'journal'; ui.journalMode = 'boards';
  openBoard('journal', b.id);
  setTimeout(fitBoard, 50);
};
function showBoardsPage(boardId){
  ui.view = 'personal'; ui.personalTab = 'journal'; ui.journalMode = 'boards';
  ui.boardIds = ui.boardIds || {}; if(boardId) ui.boardIds.journal = boardId;
}
ACTIONS.goToVision = function(){ const m = masterVisionBoard(); showBoardsPage(m && m.id); renderView(); };
function renderVisionSlideshow(){ return renderVisionPanel(); }
// ---- static (read-only) render of a board — wake screen, second display, previews ----
// The master vision board is the one board that shows up on the wake screen.
function masterVisionBoard(){
  const id = state.boards.masterId;
  const b = id ? boardById(id) : null;
  if(b && !b.parentId) return b;
  return boardsOfKind('vision').filter(function(x){ return !x.parentId; })[0] || null;
}
function boardBounds(b){
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  b.elements.forEach(function(e){
    if(e.type==='line'){ minX=Math.min(minX,e.x1,e.x2); maxX=Math.max(maxX,e.x1,e.x2); minY=Math.min(minY,e.y1,e.y2); maxY=Math.max(maxY,e.y1,e.y2); }
    else { minX=Math.min(minX,e.x); minY=Math.min(minY,e.y); maxX=Math.max(maxX,e.x+e.w); maxY=Math.max(maxY,e.y+(e.h||0)); }
  });
  if(minX===Infinity) return null;
  return {x:minX-20, y:minY-20, w:maxX-minX+40, h:maxY-minY+40};
}
function boardStaticHtml(b, cls){
  if(!b || !b.elements.length) return '';
  const bb = boardBounds(b); if(!bb) return '';
  const els = b.elements.slice().sort(function(a,c){ return (a.z||0)-(c.z||0); });
  const shift = function(e){ const c = Object.assign({}, e); if(c.type==='line'){ c.x1-=bb.x; c.x2-=bb.x; c.y1-=bb.y; c.y2-=bb.y; } else { c.x-=bb.x; c.y-=bb.y; } return c; };
  const savedSel = cv.sel; cv.sel = new Set();
  // previews are pictures, not the live canvas: no element ids / edit hooks in them
  const body = els.filter(function(e){ return e.type!=='line'; }).map(function(e){ return elHtml(shift(e), false); }).join('').replace(/ data-(el|key|handle|field)="[^"]*"/g, '');
  cv.sel = savedSel;
  const lines = els.filter(function(e){ return e.type==='line'; }).map(function(e){ const c = shift(e); return '<line x1="'+c.x1+'" y1="'+c.y1+'" x2="'+c.x2+'" y2="'+c.y2+'" stroke="'+(c.color||'#8A90A2')+'" stroke-width="'+(c.width||2)+'" stroke-linecap="round"'+(c.arrow?' marker-end="url(#bArrowS)"':'')+'/>'; }).join('');
  return '<div class="board-static '+(cls||'')+(boardIsLight(b)?' board-light':'')+'" style="'+boardBgStyle(b)+'" data-bw="'+bb.w+'" data-bh="'+bb.h+'">'+
    '<div class="board-static-world" style="width:'+bb.w+'px;height:'+bb.h+'px;">'+
      '<svg class="board-lines" width="'+bb.w+'" height="'+bb.h+'"><defs><marker id="bArrowS" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>'+lines+'</svg>'+
      body+
    '</div></div>';
}
// Scale every static board to fit its box (contain, centred).
function fitStaticBoards(root){
  (root||document).querySelectorAll('.board-static').forEach(function(box){
    const w = Number(box.dataset.bw)||1, h = Number(box.dataset.bh)||1;
    const r = box.getBoundingClientRect(); if(!r.width || !r.height) return;
    const s = Math.min(r.width/w, r.height/h, 2);
    const world = box.firstElementChild;
    world.style.transform = 'translate('+Math.round((r.width-w*s)/2)+'px,'+Math.round((r.height-h*s)/2)+'px) scale('+s+')';
  });
}
window.addEventListener('resize', function(){ fitStaticBoards(); });
afterRenderHooks.push(function(){ fitStaticBoards(); });
// ---- the master vision board on Today ----
function renderVisionPanel(){
  const b = masterVisionBoard();
  if(!b || !b.elements.length){
    return '<div class="section"><div class="card vision-panel-empty" data-action="goToVision"><span style="font-size:22px;">&#127775;</span><div><div class="kpi-label" style="margin:0;">Vision board</div><div class="kpi-sub">Build the one board you wake up to &rarr;</div></div></div></div>';
  }
  return '<div class="section vision-panel">'+
    '<div class="vision-panel-box" data-action="openVisionFull" title="Open your vision board full screen">'+boardStaticHtml(b, 'vision-panel-board')+
      '<span class="vision-panel-hint">&#9974; Full screen</span></div>'+
  '</div>';
}
// Opened from Today / the locked-in page: closing it (Esc, Exit full screen) takes you back there.
ACTIONS.openVisionFull = function(){
  const m = masterVisionBoard();
  ui.boardReturnTo = {view:ui.view, scroll:(document.getElementById('viewRoot')||{}).scrollTop||0};
  showBoardsPage(m && m.id);
  ui.boardView = ui.boardView || {}; ui.boardView.journal = true;
  ui.boardFull = 'journal';
  try{ if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){}); }catch(e){}
  renderView();
  setTimeout(fitBoard, 80);
};

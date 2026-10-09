
// ============ BOARDS: COPY / CUT / PASTE ============
// ⌘C / ⌘X the selected cards, open any board, ⌘V — they land where the pointer is (or the
// middle of the view), keeping their layout. Works from the right-click menu too. The cards
// also go on the system clipboard (tagged so a paste knows they're Operator cards), so it
// survives switching boards or reopening the app; images are shared, not re-uploaded.
const BOARD_CLIP_MARK = 'operator-board-cards:v1:';
let boardClip = null, boardPointer = null;
document.addEventListener('pointermove', function(e){
  if(cv.host && cv.host.contains(e.target)) boardPointer = {x:e.clientX, y:e.clientY, at:Date.now()};
}, {passive:true});
function boardSelectionCopy(){
  const b = cvBoard(); if(!b || !cv.sel.size) return null;
  return b.elements.filter(function(x){ return cv.sel.has(x.id); }).map(function(x){ return JSON.parse(JSON.stringify(x)); });
}
function boardCopy(cut, clipboardEvent){
  const els = boardSelectionCopy(); if(!els || !els.length) return false;
  boardClip = {els:els, from:cv.boardId};
  const text = BOARD_CLIP_MARK+JSON.stringify(els);
  if(clipboardEvent && clipboardEvent.clipboardData){ clipboardEvent.clipboardData.setData('text/plain', text); clipboardEvent.preventDefault(); }
  else { try{ if(navigator.clipboard) navigator.clipboard.writeText(text).catch(function(){}); }catch(err){} }
  if(cut) ACTIONS.boardDelete();
  showToast((cut ? 'Cut ' : 'Copied ')+els.length+' card'+(els.length===1?'':'s')+' — open any board and paste (⌘V)', {icon:'&#128203;', duration:2200});
  return true;
}
function elBox(x){ return x.type==='line' ? {l:Math.min(x.x1, x.x2), t:Math.min(x.y1, x.y2), r:Math.max(x.x1, x.x2), b:Math.max(x.y1, x.y2)} : {l:x.x, t:x.y, r:x.x+(x.w||0), b:x.y+(x.h||0)}; }
function boardPaste(els){
  const b = cvBoard(); if(!b || !els || !els.length) return;
  snapshot();
  const box = els.map(elBox).reduce(function(a, q){ return {l:Math.min(a.l, q.l), t:Math.min(a.t, q.t), r:Math.max(a.r, q.r), b:Math.max(a.b, q.b)}; });
  const fresh = boardPointer && Date.now()-boardPointer.at < 8000;
  const at = fresh ? screenToWorld(boardPointer.x, boardPointer.y) : viewCenter();
  let dx = at.x - (box.l+box.r)/2, dy = at.y - (box.t+box.b)/2;
  // pasting onto the same spot it came from: nudge so the copy is visible
  if(Math.abs(dx) < 4 && Math.abs(dy) < 4){ dx = 24; dy = 24; }
  let z = maxZ(b);
  const added = els.map(function(src){
    const c = JSON.parse(JSON.stringify(src)); c.id = uid(); c.z = ++z;
    if(c.type==='line'){ c.x1 += dx; c.y1 += dy; c.x2 += dx; c.y2 += dy; } else { c.x = Math.round(c.x+dx); c.y = Math.round(c.y+dy); }
    return c;
  });
  added.forEach(function(c){ b.elements.push(c); });
  cv.sel = new Set(added.map(function(c){ return c.id; }));
  commitBoard(true);
  playTick();
}
function boardCanUseKeys(e){ return boardActive() && !cv.view && !cv.editing && !typingInField(e.target) && !document.querySelector('.overlay:not(.hidden)'); }
document.addEventListener('copy', function(e){ if(boardCanUseKeys(e) && cv.sel.size && !String(window.getSelection()||'').trim()) boardCopy(false, e); });
document.addEventListener('cut', function(e){ if(boardCanUseKeys(e) && cv.sel.size && !String(window.getSelection()||'').trim()) boardCopy(true, e); });
// runs before the board's own paste handler (images / plain text become new cards)
document.addEventListener('paste', function(e){
  if(!boardCanUseKeys(e)) return;
  const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
  let els = null;
  if(text.indexOf(BOARD_CLIP_MARK)===0){ try{ els = JSON.parse(text.slice(BOARD_CLIP_MARK.length)); }catch(err){ els = null; } }
  else if(!text && boardClip && !(e.clipboardData && e.clipboardData.files && e.clipboardData.files.length)) els = boardClip.els;
  if(!els) return;
  e.preventDefault(); e.stopImmediatePropagation();
  boardPaste(els);
}, true);
ACTIONS.boardCopySel = function(){ boardCopy(false); };
ACTIONS.boardCutSel = function(){ boardCopy(true); };
ACTIONS.boardPasteClip = function(){ if(boardClip) boardPaste(boardClip.els); };

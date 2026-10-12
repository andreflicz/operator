// ============ OPERATOR, FULL SCREEN (round 30) ============
// Op, in person: a white plane that goes on forever, soft and dreamy like Inspiration, but this one is
// him. Knowledge, will, accountability. It's white, and it takes his color as he feels things (the
// same colors as his light). You can't move it; you don't need to. Click anywhere and write, and he
// answers right there, because he's everywhere here. Or just talk. Old words drift off on their own.
// "Chat" is the same conversation in order, every word, like a terminal: what you said, what he said,
// and what he did. When Op gets to work in the app (finishing a task, setting a follow-up), this is
// where it shows: he opens it, you watch it happen, and it slips away again when he's done.

const OPF = {open:false, auto:false, touched:false, n:0, cur:null, me:null, slot:0, mode:'plane'};
function opfIsOpen(){ return OPF.open; }
function opfMode(){ return state.profile.opfMode==='chat' ? 'chat' : 'plane'; }
function opfEl(){
  let el = document.getElementById('opFull');
  if(el) return el;
  el = document.createElement('div'); el.id = 'opFull'; el.className = 'opf';
  let motes = ''; for(let i = 0; i < 34; i++) motes += '<i class="opf-mote" style="left:'+(Math.random()*100).toFixed(1)+'%;top:'+(20 + Math.random()*80).toFixed(1)+'%;animation-duration:'+(9 + Math.random()*14).toFixed(1)+'s;animation-delay:-'+(Math.random()*20).toFixed(1)+'s;transform:scale('+(0.5 + Math.random()).toFixed(2)+')"></i>';
  el.innerHTML = '<div class="opf-sky"></div><div class="opf-floor"></div><div class="opf-core"></div><div class="opf-motes">'+motes+'</div>'+
    '<div class="opf-plane" id="opfPlane"></div>'+
    '<div class="opf-chat" id="opfChat"><div class="opf-log" id="opfLog"></div><div class="opf-live" id="opfLiveRow"><span class="opc-dot"></span><div class="opf-live-t" id="opfLive"></div></div>'+
      '<div class="opf-prompt"><span class="opf-gt">&gt;</span><textarea id="opfInput" rows="1" placeholder="Talk to Op…" autocomplete="off"></textarea></div></div>'+
    '<div class="opf-acts" id="opfActs"></div>'+
    '<div class="opf-top"><button class="opf-x" data-action="opfClose" aria-label="Back to the app">&#10005;</button><div class="opf-name">OPERATOR</div>'+
      '<div class="opf-modes"><button class="opf-m" data-action="opfSetMode" data-id="plane">Plane</button><button class="opf-m" data-action="opfSetMode" data-id="chat">Chat</button>'+
      '<button class="opf-m opf-mute" data-action="opMuteToggle" aria-label="Mute Op"></button></div></div>'+
    '<button class="opf-mic" data-action="opfTalk" aria-label="Talk to Op"><span></span></button>'+
    '<div class="opf-hint">Click anywhere and write. Or just talk.</div>';
  document.body.appendChild(el);
  el.addEventListener('pointerdown', opfPointer);
  return el;
}
function opfSync(){
  const el = document.getElementById('opFull'); if(!el) return;
  const m = opfMode(); el.dataset.mode = m;
  el.querySelectorAll('.opf-m[data-id]').forEach(function(b){ b.classList.toggle('is-on', b.dataset.id===m); });
  const mu = el.querySelector('.opf-mute'); if(mu){ const on = typeof opMuted==='function' && opMuted(); mu.innerHTML = on ? '&#128263;' : '&#128264;'; mu.classList.toggle('is-on', on); }
  el.classList.toggle('is-live', !!(OV.speaking || OV.pending));
  el.classList.toggle('is-listen', !!AI.listening);
  el.classList.toggle('is-think', !!AI.busy && !(OV.speaking || OV.pending));
}
function opfOpen(opts){
  opts = opts || {};
  const el = opfEl();
  OPF.auto = !!opts.auto && !OPF.open; OPF.touched = false;
  if(!OPF.open){ OPF.open = true; document.body.classList.add('opf-on'); void el.offsetWidth; el.classList.add('is-in'); el.classList.remove('hint-gone'); setTimeout(function(){ el.classList.add('hint-gone'); }, 6500); }
  const b = document.getElementById('opBub'); if(b){ b.classList.remove('is-in'); }
  opfSync(); opfChatDraw(true);
  if(opfMode()==='chat' && !opts.auto) setTimeout(function(){ const i = document.getElementById('opfInput'); if(i) i.focus(); }, 80);
}
function opfClose(){
  const el = document.getElementById('opFull'); if(!el || !OPF.open) return;
  OPF.open = false; OPF.auto = false; OPF.cur = null; OPF.me = null;
  el.classList.remove('is-in'); document.body.classList.remove('opf-on');
  // whatever he was saying carries on in the bubble
  if(OV.speaking || OV.pending || AI.busy){ OV.cap = 'opBubText'; opBubShow(); }
}
ACTIONS.opfOpen = function(){ opfOpen(); };
ACTIONS.opfClose = function(){ opfClose(); };
ACTIONS.opfSetMode = function(el, e, id){ state.profile.opfMode = id==='chat' ? 'chat' : 'plane'; persist('profile'); OPF.touched = true; opfSync(); opfChatDraw(true); if(id==='chat') setTimeout(function(){ const i = document.getElementById('opfInput'); if(i) i.focus(); }, 60); };
ACTIONS.opfTalk = function(){ OPF.touched = true; if(AI.listening){ if(AI.sendNow) AI.sendNow(); return; } AI.typedAt = 0; OV.cap = 'opBubText'; aiListen('opBubText'); };
document.addEventListener('keydown', function(e){
  if(!OPF.open) return;
  OPF.touched = true;
  if(e.key==='Escape'){ const a = document.activeElement; if(a && a.classList && a.classList.contains('opf-type') && a.value){ a.value = ''; return; } if(a && a.closest && a.closest('.opf-in')){ a.closest('.opf-in').remove(); return; } e.stopPropagation(); opfClose(); return; }
  // on the plane, just start typing: the words appear somewhere and he's listening
  if(opfMode()==='plane' && e.key.length===1 && !e.metaKey && !e.ctrlKey && !e.altKey){
    const a = document.activeElement; if(a && (a.tagName==='INPUT' || a.tagName==='TEXTAREA')) return;
    const s = opfSlot(); opfInputAt(s.x, s.y);   // (focused now, so this very key lands in it)
  }
}, true);

// ---- the plane: write anywhere ----
function opfPointer(e){
  OPF.touched = true;
  if(opfMode()!=='plane') return;
  if(e.target.closest('.opf-top, .opf-mic, .opf-in, .opf-w, .opf-acts')) return;
  e.preventDefault();
  opfInputAt(e.clientX, e.clientY);
}
function opfInputAt(x, y){
  const p = document.getElementById('opfPlane'); if(!p) return null;
  p.querySelectorAll('.opf-in').forEach(function(n){ if(!n.querySelector('input').value) n.remove(); });
  const w = document.createElement('div'); w.className = 'opf-in';
  const left = Math.max(24, Math.min(window.innerWidth - 360, x - 10)), top = Math.max(80, Math.min(window.innerHeight - 160, y - 16));
  w.style.left = left+'px'; w.style.top = top+'px';
  w.innerHTML = '<input class="opf-type" placeholder="…" autocomplete="off" spellcheck="false">';
  p.appendChild(w);
  const inp = w.querySelector('input');
  inp.addEventListener('keydown', function(ev){
    if(ev.key!=='Enter') return; ev.preventDefault();
    const v = inp.value.trim(); if(!v) return;
    const at = {x:parseFloat(w.style.left), y:parseFloat(w.style.top)}; w.remove();
    opfSend(v, at);
  });
  inp.focus();
  return inp;
}
// free spots on the plane, around the middle, so lines don't land on each other
function opfSlot(){
  const W = window.innerWidth, H = window.innerHeight;
  const spots = [[0.14, 0.24], [0.56, 0.2], [0.2, 0.58], [0.6, 0.52], [0.36, 0.38], [0.1, 0.74], [0.58, 0.72], [0.34, 0.16]];
  const taken = Array.prototype.map.call(document.querySelectorAll('#opfPlane .opf-w:not(.is-gone)'), function(n){ return n.getBoundingClientRect(); });
  for(let k = 0; k < spots.length; k++){
    const s = spots[(OPF.slot + k) % spots.length], x = s[0]*W, y = s[1]*H;
    if(!taken.some(function(r){ return x < r.right + 30 && x + 360 > r.left - 30 && y < r.bottom + 30 && y + 90 > r.top - 30; })){ OPF.slot = (OPF.slot + k + 1) % spots.length; return {x:x, y:y}; }
  }
  OPF.slot = (OPF.slot + 1) % spots.length; const s = spots[OPF.slot]; return {x:s[0]*W, y:s[1]*H};
}
function opfWord(cls, x, y){
  const p = document.getElementById('opfPlane'); const n = document.createElement('div');
  n.className = 'opf-w '+cls; n.id = 'opfR'+(++OPF.n); n.dataset.at = Date.now();
  n.style.left = Math.max(24, Math.min(window.innerWidth - 420, x))+'px'; n.style.top = Math.max(76, Math.min(window.innerHeight - 140, y))+'px';
  p.appendChild(n);
  // (only so many on the plane at once: the oldest go first)
  const all = p.querySelectorAll('.opf-w'); if(all.length > 14) for(let i = 0; i < all.length - 14; i++) opfFade(all[i], true);
  return n;
}
function opfFade(n, now){ if(!n || n.classList.contains('is-gone')) return; n.classList.add('is-gone'); setTimeout(function(){ if(n.parentNode) n.remove(); }, now ? 900 : 2400); }
// what you wrote stays where you wrote it; his answer comes in just under it
function opfSend(text, at){
  OPF.touched = true;
  if(opfMode()==='chat'){ AI.typedAt = Date.now(); OV.cap = 'opfLive'; aiAsk(text, 'opfLive'); return; }
  const me = opfWord('opf-me', at.x, at.y); capSet(me, text);
  const r = me.getBoundingClientRect(), below = r.bottom + 12 + 90 < window.innerHeight;
  const op = opfWord('opf-op', at.x + 8, below ? r.bottom + 12 : r.top - 100);
  op.textContent = ''; OPF.cur = op; OPF.me = null;
  AI.typedAt = 0;
  aiAsk(text, op.id);
}
// a line from him with nowhere set for it: under what you just said, or a free spot
function opfOpLine(){
  if(opfMode()==='chat') return 'opfLive';
  const c = OPF.cur;
  if(c && c.parentNode && !c.classList.contains('is-gone') && (!c.textContent || c.textContent==='…')) return c.id;
  const me = OPF.me && OPF.me.parentNode ? OPF.me : null;
  let pos;
  if(me){ const r = me.getBoundingClientRect(); pos = {x:r.left + 8, y:r.bottom + 12}; OPF.me = null; }
  else pos = opfSlot();
  const n = opfWord('opf-op', pos.x, pos.y); OPF.cur = n; return n.id;
}
// you talking: your words show where you'll see them
function opfMe(text, wait){
  if(opfMode()==='chat'){ const l = document.getElementById('opfLive'); if(l){ l.classList.toggle('is-me', true); capSet(l, wait ? '' : text); l.dataset.wait = wait ? '1' : ''; } return; }
  let me = OPF.me && OPF.me.parentNode ? OPF.me : null;
  if(!me){ const s = opfSlot(); me = opfWord('opf-me', s.x, s.y); OPF.me = me; }
  me.classList.toggle('is-wait', !!wait);
  if(wait){ me.textContent = 'Listening…'; return; }
  capSet(me, text);
}
// old words drift off
setInterval(function(){
  if(!OPF.open) return;
  const now = Date.now();
  document.querySelectorAll('#opfPlane .opf-w').forEach(function(n){
    const age = now - Number(n.dataset.at||now);
    if(n===OPF.cur && (OV.speaking || OV.pending || AI.busy)) return;
    if(age > 150000) opfFade(n); else if(age > 70000) n.classList.add('is-old');
  });
  document.querySelectorAll('#opfActs .opf-act').forEach(function(n){ if(now - Number(n.dataset.at||now) > 9000) opfFade(n); });
}, 3000);

// ---- chat: everything, in order ----
const OPFC = {sig:''};
function opfChatDraw(force){
  if(!OPF.open || opfMode()!=='chat') return;
  const box = document.getElementById('opfLog'); if(!box) return;
  const L = typeof opChat==='function' ? opChat() : [];
  const sig = L.length+'|'+(L.length ? L[L.length-1].at : 0);
  if(sig===OPFC.sig && !force) return; OPFC.sig = sig;
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  let h = '', day = '';
  L.slice(-300).forEach(function(e){
    const d = typeof opChatDay==='function' ? opChatDay(e.at) : ''; if(d!==day){ day = d; h += '<div class="opc-day">'+d+'</div>'; }
    if(e.r==='me') h += '<div class="opc-me"><span class="opc-gt">&gt;</span><span>'+escapeHtml(e.t)+'</span></div>';
    else if(e.r==='act') h += '<div class="opc-act"><span class="opc-l">&#9151;</span><span>'+escapeHtml(e.t)+'</span></div>';
    else h += '<div class="opc-op"><span class="opc-dot"></span><span>'+escapeHtml(e.t)+'</span></div>';
  });
  box.innerHTML = h || '<div class="opc-empty">This is everything you and Op say to each other, in order. Type below, or talk.</div>';
  // (the live line steps aside once what it said is in the log)
  const live = document.getElementById('opfLive'), last = L[L.length-1];
  if(live && last && last.r==='op' && !(OV.speaking || OV.pending || AI.busy) && speakable(live.textContent.trim())===speakable(last.t)) live.textContent = '';
  if(near || force) box.scrollTop = box.scrollHeight;
}
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || t.id!=='opfInput' || e.key!=='Enter' || e.shiftKey) return;
  e.preventDefault(); const v = t.value.trim(); if(!v) return; t.value = ''; t.style.height = '';
  const live = document.getElementById('opfLive'); if(live){ live.textContent = ''; live.classList.remove('is-me'); }
  opfSend(v, null);
});
document.addEventListener('input', function(e){ if(e.target && e.target.id==='opfInput'){ const t = e.target; t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight)+'px'; } });

// ---- where his words go while this is open ----
opCaption = (function(base){
  return function(txt){
    if(OPF.open && (OV.cap==='opBubText' || OV.cap==='opfLive' || /^opfR/.test(OV.cap||''))){
      if(txt==='Listening…'){ opfMe('', true); return; }
      if(/^“[\s\S]*”$/.test(String(txt||'')) && AI.listening){ opfMe(String(txt).slice(1, -1)); return; }
      if(OV.cap==='opBubText') OV.cap = opfOpLine();
      if(OV.cap==='opfLive'){ const l = document.getElementById('opfLive'); if(l && l.classList.contains('is-me')){ l.classList.remove('is-me'); l.textContent = ''; } }
    }
    const r = base.apply(this, arguments);
    if(OPF.open && OV.cap && OV.cap!=='opBubText'){ const el = document.getElementById(OV.cap); if(el && OV.cap==='opfLive'){ const box = document.getElementById('opfLog'); if(box) box.scrollTop = box.scrollHeight; } }
    return r;
  };
})(opCaption);
opSay = (function(base){
  return function(text, opts){
    opts = opts || {};
    if(OPF.open && opts.cap==='opBubText'){ opts = Object.assign({}, opts, {cap:opfOpLine()}); if(!opVoiceOn()){ OV.cap = opts.cap; opCaption(text); } }
    return base(text, opts);
  };
})(opSay);
aiAsk = (function(base){
  return function(text, cap){
    if(OPF.open && cap==='opBubText'){ if(OPF.me && OPF.me.parentNode) OPF.me.classList.remove('is-wait'); cap = opfOpLine(); }
    if(OPF.open && opfMode()==='chat' && cap==='opfLive'){ const live = document.getElementById('opfLive'); if(live){ live.classList.remove('is-me'); live.textContent = ''; } }
    return Promise.resolve(base.call(this, text, cap)).then(function(r){
      opfChatDraw(true);
      if(OPF.open && OPF.auto) opfAutoClose();
      if(OPF.navClose){ OPF.navClose = false; setTimeout(opfClose, 500); }
      return r;
    });
  };
})(aiAsk);
// his lines that weren't answers (presses, nudges) go in the log once they've settled
const OPFS = {txt:'', since:0, logged:''};
setInterval(function(){
  try{
    opfSync();
    if(!OPF.open) return;
    const el = OV.cap && OV.cap!=='opBubText' ? document.getElementById(OV.cap) : null, t = el && /^opf/.test(el.id) ? el.textContent.trim() : '';
    if(t!==OPFS.txt){ OPFS.txt = t; OPFS.since = Date.now(); }
    else if(t && t!==OPFS.logged && t!=='…' && !OV.speaking && !OV.pending && !AI.busy && !el.classList.contains('opf-me') && !el.classList.contains('is-me') && Date.now() - OPFS.since > 900){ OPFS.logged = t; if(typeof opChatLog==='function') opChatLog('op', t); }
    opfChatDraw();
  }catch(e){}
}, 300);
// (the bubble's words, when Op runs things from there, keep pointing at the bubble)

// ---- action mode: when he does things, you see them here ----
function opfAction(text){
  if(!OPF.open){ opfOpen({auto:true}); }
  const box = document.getElementById('opfActs');
  if(box){ const c = document.createElement('div'); c.className = 'opf-act'; c.dataset.at = Date.now(); c.innerHTML = '<span>&#10003;</span>'+escapeHtml(text.charAt(0).toUpperCase()+text.slice(1)); box.appendChild(c); }
  if(typeof opChatLog==='function') opChatLog('act', text.charAt(0).toUpperCase()+text.slice(1));
  if(typeof tone==='function') try{ tone([988, 1319], 0.12, 0.06); }catch(e){}
}
function opfAutoClose(){
  const wait = setInterval(function(){
    if(!OPF.open || OPF.touched){ clearInterval(wait); return; }
    if(OV.speaking || OV.pending || AI.busy || AI.listening) return;
    clearInterval(wait);
    setTimeout(function(){ if(OPF.open && OPF.auto && !OPF.touched && !AI.listening && !(OV.speaking || OV.pending)) opfClose(); }, 2600);
  }, 300);
}
opRunTool = (function(base){
  return function(name){
    const out = base.apply(this, arguments);
    try{
      if(OP_ACTION_TOOLS.indexOf(name) >= 0) opfAction(String(out));
      else if(OP_NAV_TOOLS.indexOf(name) >= 0 && OPF.open && !(name==='open_page' && arguments[1] && arguments[1].page==='operator')) OPF.navClose = true;
    }catch(e){}
    return out;
  };
})(opRunTool);

// ---- the way in: a button on his bubble, a right-click on his light ----
opBubShow = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b && !b.querySelector('.op-bub-full')){ const ics = b.querySelector('.op-bub-ics'); if(ics){ const f = document.createElement('button'); f.className = 'op-bub-ic op-bub-full'; f.setAttribute('data-action', 'opfOpen'); f.setAttribute('aria-label', 'Op, full screen'); f.innerHTML = '&#10530;'; ics.insertBefore(f, ics.firstChild); } }
    if(OPF.open && b) b.classList.remove('is-in');
    return b;
  };
})(opBubShow);
document.addEventListener('contextmenu', function(e){ if(e.target.closest && e.target.closest('#opLight')){ e.preventDefault(); opfOpen(); } });
// (the mute button here and in the bubble stay in step)
ACTIONS.opMuteToggle = (function(base){ return function(){ const r = base.apply(this, arguments); opfSync(); return r; }; })(ACTIONS.opMuteToggle);

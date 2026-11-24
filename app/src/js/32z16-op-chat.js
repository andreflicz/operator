// ============ OP'S CHAT BOX (round 29) ============
// The bubble is a proper little chat now. His words keep a steady box (no more the panel jumping and
// re-drawing as he talks: only the new words pop in). What you say stays on screen in its own line, with
// the same pop-in, instead of vanishing the moment he starts thinking. A speaker turns his voice off
// (he answers in text), and the clock opens every conversation you've had with him, by day.
// Type to him and it's a normal chat: any question, any topic, answered in text and as long as it needs.

// ---- the words: keep what didn't change, pop in only what's new ----
capSet = (function(base){
  return function(el, txt){
    if(!el) return;
    txt = txt==null ? '' : String(txt);
    const was = el.textContent;
    if(was===txt) return;
    if(!txt || !was || txt.indexOf(was)===0) return base(el, txt);
    const nodes = Array.prototype.slice.call(el.childNodes);
    const clean = nodes.every(function(n){ return n.nodeType===3 ? !/\S/.test(n.nodeValue) : (n.nodeType===1 && n.classList.contains('cw')); });
    if(clean){
      const toks = txt.split(/(\s+)/).filter(Boolean);
      let i = 0; while(i < nodes.length && i < toks.length && nodes[i].textContent===toks[i]) i++;
      if(i > 0){
        for(let j = nodes.length - 1; j >= i; j--) el.removeChild(nodes[j]);
        capWords(el, toks.slice(i).join(''), toks.length - i > 6);
        return;
      }
    }
    return base(el, txt);
  };
})(capSet);

// ---- the log: every conversation, kept (your words and his) ----
function opChat(){ const f = state.focus; if(!Array.isArray(f.opChat)) f.opChat = []; return f.opChat; }
const OPC_SKIP = /^(…|\.\.\.|Listening…|One moment…|One moment: getting the scores…|Didn’t catch that\.)$/;
function opChatLog(r, t){
  t = String(t||'').replace(/\s+/g, ' ').trim(); if(!t || t.length < 2 || OPC_SKIP.test(t) || /^“/.test(t)) return;
  const L = opChat();
  // (the same line twice in a row, as shown and then as spoken, is one line)
  const same = function(e){ return e.r===r && speakable(e.t)===speakable(t); };
  if(L.length && same(L[L.length - 1])) return;
  L.push({r:r, t:t.slice(0, 4000), at:Date.now()});
  if(L.length > 600) L.splice(0, L.length - 600);
  persist('focus');
}
function opMuted(){ return !!(state.focus && state.focus.opMuted); }
// typing to him (in the last few minutes) means a chat in text
function opTextMode(){ return opMuted() || !!(AI.typedAt && Date.now() - AI.typedAt < 180000); }

// ---- his voice: off when muted, and quiet for the replies to what you typed ----
opVoiceOn = (function(base){ return function(){ if(opMuted()) return false; if(AI.busy && AI.typedAt && Date.now() - AI.typedAt < 180000) return false; return base.apply(this, arguments); }; })(opVoiceOn);
opSay = (function(base){
  return function(text, opts){
    opts = opts || {};
    // (a new line from Op that isn't an answer: your last words step aside)
    if(opts.cap==='opBubText' && !AI.busy && !AI.listening) opMeSet('');
    // muted: the bubble still gets the words
    if(opts.cap==='opBubText' && !opVoiceOn()){ OV.cap = 'opBubText'; opCaption(text); }
    return base(text, opts);
  };
})(opSay);
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(opTextMode() && Array.isArray(s)) s.push({type:'text', text:'Right now he is typing to you in the chat box and your reply shows as text (it is not spoken). Talk like a normal chat: any topic is fine (general questions, ideas, explanations, advice, writing), answered as fully as the question needs. Still plain text with no markdown symbols; short paragraphs are fine.'});
    return s;
  };
})(aiSystem);
// your words: shown and kept
aiAsk = (function(base){
  return function(text, cap){
    const t = String(text||'').trim();
    if(t && !AI.busy){ opMeSet(t); opChatLog('me', t); }
    const last0 = AI.history[AI.history.length - 1];
    return Promise.resolve(base.apply(this, arguments)).then(function(r){
      const last = AI.history[AI.history.length - 1];
      if(last && last!==last0 && last.role==='assistant') opChatLog('op', last.content);
      opChatDraw();
      return r;
    });
  };
})(aiAsk);
// talking (not typing) puts him back on voice
aiListen = (function(base){ return function(){ AI.typedAt = 0; return base.apply(this, arguments); }; })(aiListen);
aiAutoListen = (function(base){ return function(){ if(opTextMode()) return; return base.apply(this, arguments); }; })(aiAutoListen);
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || !t.classList || !t.classList.contains('op-type') || e.key!=='Enter' || !t.value.trim()) return;
  AI.typedAt = Date.now();
  if(t.id==='opBubInput') opChatOpen(true);
}, true);
// starting to type while the mic is open: the mic steps aside
document.addEventListener('focusin', function(e){ if(e.target && e.target.id==='opBubInput' && AI.listening && AI.cancelListen) AI.cancelListen(); });

// ---- the bubble: your line, his line, the log, the buttons ----
function opMeEl(){ return document.getElementById('opBubMe'); }
function opMeSet(t, wait){
  const el = opMeEl(); if(!el) return;
  el.classList.toggle('is-wait', !!wait);
  if(wait){ el.textContent = t; return; }
  capSet(el, t || '');
  el.scrollTop = el.scrollHeight;
}
function opBubIcons(){
  const b = document.getElementById('opBub'); if(!b) return;
  const m = b.querySelector('.op-bub-mute'), l = b.querySelector('.op-bub-logb');
  if(m){ m.innerHTML = opMuted() ? '&#128263;' : '&#128264;'; m.classList.toggle('is-on', opMuted()); m.setAttribute('aria-label', opMuted() ? 'Turn Op’s voice on' : 'Mute Op'); }
  if(l){ l.classList.toggle('is-on', b.classList.contains('is-log')); }
}
opBubShow = (function(base){
  return function(){
    const pre = document.getElementById('opBub'), wasIn = !!(pre && pre.classList.contains('is-in'));
    const b = base.apply(this, arguments);
    if(b && !b.querySelector('.op-bub-mute')){
      const x = b.querySelector('.op-bub-x');
      const add = document.createElement('span'); add.className = 'op-bub-ics';
      add.innerHTML = '<button class="op-bub-ic op-bub-logb" data-action="opChatToggle" aria-label="Your chats with Op">&#128338;</button><button class="op-bub-ic op-bub-mute" data-action="opMuteToggle" aria-label="Mute Op"></button>';
      x.parentNode.insertBefore(add, x);
      const t = document.getElementById('opBubText');
      const log = document.createElement('div'); log.className = 'op-bub-log'; log.id = 'opBubLog'; t.parentNode.insertBefore(log, t);
      const me = document.createElement('div'); me.className = 'op-bub-me'; me.id = 'opBubMe'; t.parentNode.insertBefore(me, t);
      opBubIcons();
    }
    // (a fresh bubble starts clean, unless you're mid-conversation)
    if(!wasIn && !AI.listening && !AI.busy) opMeSet('');
    return b;
  };
})(opBubShow);
// Op listening / hearing you: it goes in your line (his question stays put)
opCaption = (function(base){
  return function(txt){
    if(OV.cap==='opBubText' && opMeEl()){
      if(txt==='Listening…'){ opBubShow(); opMeSet('Listening…', true); if(typeof opBubHideLater==='function') opBubHideLater(); return; }
      if(/^“[\s\S]*”$/.test(String(txt||'')) && AI.listening){ opBubShow(); opMeSet(String(txt).slice(1, -1)); if(typeof opBubHideLater==='function') opBubHideLater(); return; }
    }
    return base.apply(this, arguments);
  };
})(opCaption);
// (an open chat doesn't slip away on its own)
opBubHideLater = (function(base){ return function(){ const b = document.getElementById('opBub'); if(b && b.classList.contains('is-log')){ clearTimeout(opBubHideLater._t); return; } return base.apply(this, arguments); }; })(opBubHideLater);
// tapping his light while he's muted opens the chat to type
ACTIONS.opLightTap = (function(base){
  return function(){
    if(opMuted() && !AI.listening && !(OV.speaking || OV.pending)){ OV.cap = 'opBubText'; opBubShow(); opChatOpen(true); const i = document.getElementById('opBubInput'); if(i) setTimeout(function(){ i.focus(); }, 60); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.opLightTap);
ACTIONS.opMuteToggle = function(){
  state.focus.opMuted = !opMuted(); persist('focus');
  if(opMuted() && (OV.speaking || OV.pending)){ const t = OV.sayText; opStop(); if(t){ OV.cap = 'opBubText'; opCaption(t); } }
  opBubIcons();
  showToast(opMuted() ? 'Op’s voice is off. He answers in text.' : 'Op’s voice is back on.');
};
function opChatOpen(on){
  const b = document.getElementById('opBub'); if(!b) return;
  b.classList.toggle('is-log', !!on);
  OPCD.sig = ''; opChatDraw();
  opBubIcons();
  if(typeof opBubPlace==='function') opBubPlace(b);
  if(!on && typeof opBubHideLater==='function') opBubHideLater();
}
ACTIONS.opChatToggle = function(){ const b = document.getElementById('opBub'); opChatOpen(!(b && b.classList.contains('is-log'))); };

// ---- the log, drawn ----
const OPCD = {sig:'', n:0};
function opChatDay(ts){
  const d = new Date(ts), k = todayStr(d), t = todayStr();
  if(k===t) return 'Today';
  if(k===addDays(t, -1)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
}
function opChatDraw(){
  const b = document.getElementById('opBub'), box = document.getElementById('opBubLog');
  if(!b || !box) return;
  const live = !!(OV.speaking || OV.pending);
  b.classList.toggle('is-live', live);
  if(!b.classList.contains('is-log')) return;
  const L = opChat(), think = AI.busy && !live;
  const sig = L.length+'|'+(L.length ? L[L.length-1].at : 0)+'|'+think;
  if(sig===OPCD.sig) return;
  const grew = L.length > OPCD.n && OPCD.sig!=='';
  OPCD.sig = sig; OPCD.n = L.length;
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  let h = '', day = '';
  L.forEach(function(e, i){
    const d = opChatDay(e.at); if(d!==day){ day = d; h += '<div class="ocl-day">'+d+'</div>'; }
    h += '<div class="ocl-m ocl-'+e.r+(grew && i===L.length-1 ? ' is-new' : '')+'">'+escapeHtml(e.t)+'</div>';
  });
  if(think) h += '<div class="ocl-m ocl-op ocl-typing"><i></i><i></i><i></i></div>';
  box.innerHTML = h || '<div class="ocl-empty">Say anything, or type it below.</div>';
  if(near || grew || !OPCD.drawn){ box.scrollTop = box.scrollHeight; OPCD.drawn = true; }
}
// his lines that weren't answers (check-ins, nudges, taps) go in the log once they've settled
const OPCS = {txt:'', since:0, logged:''};
setInterval(function(){
  try{
    const el = document.getElementById('opBubText'), t = el ? el.textContent.trim() : '';
    if(t!==OPCS.txt){ OPCS.txt = t; OPCS.since = Date.now(); }
    else if(t && t!==OPCS.logged && !OV.speaking && !OV.pending && !AI.busy && Date.now() - OPCS.since > 900){ OPCS.logged = t; opChatLog('op', t); }
    opChatDraw();
  }catch(e){}
}, 300);

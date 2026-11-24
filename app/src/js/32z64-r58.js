// ============ ROUND 58 ============
// Everything from Andre's Op session on Oct 31 (ROUND-58-LIST.md). This file: updates and Op's records, notes and
// the notifications feed, Op's chat, voice, Op's read, the bubble. 32z65-r58ui.js: Business, Playbooks, Social,
// Packages, Settings.

// ================= A. Updates: his words, one place, really saved =================
// What went wrong: Op wrote his own summary of each update instead of the words; each one went to two lists
// (Op's ideas in Settings and App updates); he said "logged" when nothing had been saved; "mark that as an update"
// filed the words "mark that as an update"; and there was no way to hold a list until he said "done".
// Now an update is ONE App updates entry (tag Update) whose text is exactly what he said; Op's line is its title.
// Op files them with suggest_improvement (this message), mark_update (an earlier message, by a few of its words),
// or file_updates (a list, after he says go). If Op says he logged something and didn't call a tool, the app files
// the message itself. Settings' separate ideas list is gone (what was in it moved into App updates).
const R58 = {turn:null};
function r58UserMsgs(){ return (typeof opChat==='function' ? opChat() : []).filter(function(e){ return e.r==='me' && e.t; }); }
const R58_META = /^\s*(?:ok(?:ay)?|yeah|yes|so|and|also|please|pls|can you|could you|buddy|op|hey)?[\s,]*(?:please\s+)?(?:mark|log|save|add|put|file|write)\s+(?:that|this|it|those|them|all (?:of )?(?:that|those|them))\b[^.?!]{0,40}[.?!]?\s*$/i;
function r58IsMeta(t){ t = String(t || '').trim(); return t.length < 90 && R58_META.test(t); }
// the words to file: this message, or (when this message is only "mark that as an update") the one before it
function r58Words(){
  const T = R58.turn; let t = T ? T.text : '';
  if(!t || r58IsMeta(t)){ const L = r58UserMsgs().filter(function(e){ return !r58IsMeta(e.t) && (!T || e.t!==T.text); }); if(L.length) t = L[L.length - 1].t; }
  return String(t || '').trim();
}
function r58Find(snippet, back){
  const L = r58UserMsgs().filter(function(e){ return !r58IsMeta(e.t); });
  if(snippet){ const s = String(snippet).toLowerCase().replace(/\s+/g, ' ').trim(); for(let i = L.length - 1; i >= 0; i--){ if(L[i].t.toLowerCase().replace(/\s+/g, ' ').indexOf(s) >= 0) return L[i]; } return null; }
  const n = Math.max(1, Number(back) || 1); return L[L.length - n] || null;
}
function r58UpdateEntries(){ const id = updatesTypeId(); return id ? state.journal.entries.filter(function(e){ return e.mood===id; }) : []; }
// one entry per thing he said; a second summary of the same words is added to the same entry (no second note)
function r58File(words, summary, at){
  words = String(words || '').trim(); summary = String(summary || '').trim();
  if(!words && !summary) return null;
  const tag = r57UpdateType(), text = words || summary;
  let e = r58UpdateEntries().find(function(x){ return x.text===text; });
  if(e){
    if(summary && arr(e.summaries).indexOf(summary) < 0 && e.title!==summary){ e.summaries = arr(e.summaries).concat([summary]); persist('journal'); }
    return {e:e, isNew:false};
  }
  e = {id:uid(), date:todayStr(at ? new Date(at) : new Date()), timestamp:at || Date.now(), title:(summary || 'Update').slice(0, 160), text:text.slice(0, 8000), type:'freeform', mood:tag, pinned:false, photos:[], by:'op', verbatim:!!words};
  state.journal.entries.push(e); persist('journal');
  if(R58.turn) R58.turn.filed = true;
  r57Note(summary || text, 'idea', {full:text, title:summary, entry:e.id});
  return {e:e, isNew:true};
}
// (Op's own records of what he did go to the notes and the notifications feed, not to App updates)
r57Log = function(text, kind){ if(kind==='idea') return r58File(r58Words(), text); r57Note(text, kind); };
r57Did = function(text){ r57Note(text, 'did'); };
// the tools
OP_TOOLS.push(
  {name:'mark_update', description:'File one of his EARLIER messages in App updates, word for word (when he says "mark that as an update", "log that", or you missed one). Give a few exact words from that message in contains, or back=1 for his message before this one. Use summary for a one-line title.', input_schema:{type:'object', properties:{contains:{type:'string'}, back:{type:'integer'}, summary:{type:'string'}}, additionalProperties:false}},
  {name:'file_updates', description:'File several of his messages in App updates at once, word for word (after he gave you a list and said go, or when he asks you to go back and log everything). One item per message: a few exact words from it in contains, and a one-line summary.', input_schema:{type:'object', properties:{items:{type:'array', items:{type:'object', properties:{contains:{type:'string'}, summary:{type:'string'}}, required:['contains']}}}, required:['items']}},
  {name:'delete_session', description:'Remove a work session he says is wrong (e.g. "remove that last work session"). which: "last" (the most recent, the default) or "longest_today".', input_schema:{type:'object', properties:{which:{type:'string'}}, additionalProperties:false}}
);
(function(){ const t = OP_TOOLS.find(function(t){ return t.name==='suggest_improvement'; }); if(t){ t.description = 'File what he just said about the app (a change, a fix, feedback) in App updates. The app saves HIS EXACT WORDS from this message; idea is your one-line title for it. One call per thing he asked for in this message.'; } })();
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(R58.turn) R58.turn.tools.push(name);
    if(name==='suggest_improvement'){ const r = r58File(R58.turn ? r58Words() : String(x.idea || '').trim() || r58Words(), String(x.idea || '').slice(0, 400)); if(!r) throw new Error('nothing to file'); return r.isNew ? 'filed in App updates, his words as he said them' : 'already in App updates (summary added)'; }
    if(name==='mark_update'){
      const m = r58Find(x.contains, x.back); if(!m) throw new Error('no message of his matches that');
      const r = r58File(m.t, String(x.summary || '').slice(0, 400), m.at); return r.isNew ? 'filed in App updates: “'+m.t.slice(0, 80)+(m.t.length > 80 ? '…' : '')+'”' : 'that one was already in App updates';
    }
    if(name==='file_updates'){
      let n = 0, have = 0, miss = [];
      arr(x.items).forEach(function(it){ const m = r58Find(it.contains); if(!m){ miss.push(it.contains); return; } const r = r58File(m.t, String(it.summary || '').slice(0, 400), m.at); if(r && r.isNew) n++; else have++; });
      return 'filed '+n+' in App updates'+(have ? ', '+have+' already there' : '')+(miss.length ? '; couldn’t find: '+miss.join(' | ') : '');
    }
    if(name==='add_journal' && x.tag && /^updates?$/i.test(String(x.tag).trim())){ const r = r58File(R58.turn ? r58Words() : String(x.text || x.title || '').trim() || r58Words(), String(x.title || x.text || '').slice(0, 400)); return r && r.isNew ? 'filed in App updates, his words as he said them' : 'already in App updates'; }
    if(name==='delete_session'){
      const S = state.focus.sessions, today = todayStr();
      let s = null;
      if(x.which==='longest_today') s = S.filter(function(q){ return q.date===today; }).sort(function(a, b){ return (b.minutes || 0) - (a.minutes || 0); })[0];
      else s = S.slice().sort(function(a, b){ return (b.endedAt || 0) - (a.endedAt || 0); })[0];
      if(!s) return 'no sessions to remove';
      state.focus.sessions = S.filter(function(q){ return q!==s; }); R58.lastDeleted = s; persist('focus'); try{ xpLast = null; }catch(e){} renderView();
      showToast('Removed the '+fmtDurationLabel(s.minutes || 0)+' session from '+fmtDateShort(s.date)+'.', {icon:'&#128465;', actionLabel:'Undo', actionAction:'r58UndoSession', duration:8000});
      return 'removed the '+fmtDurationLabel(s.minutes || 0)+' session ('+fmtDateShort(s.date)+', '+fmt12Hour(nowHM(new Date(s.startedAt)))+' to '+fmt12Hour(nowHM(new Date(s.endedAt)))+')';
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
ACTIONS.r58UndoSession = function(){ if(!R58.lastDeleted) return; state.focus.sessions.push(R58.lastDeleted); R58.lastDeleted = null; persist('focus'); try{ xpLast = null; }catch(e){} clearToasts(); renderView(); };
// how he handles updates (the rules)
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:'App updates (his changes and feedback for this app):\n'+
      '- When he asks for a change to the app, or gives feedback on it, call suggest_improvement in that same reply, once per thing he asked for. The app saves his exact words; your idea is only the title.\n'+
      '- "Mark that as an update", "log that", "add that to the updates": call mark_update for the message he means (back=1, or contains with a few of its words).\n'+
      '- If he says he will give you several things and to wait until he says he is done: do not file them yet. When he says he is done, read the list back (short, numbered) and wait for his yes; then call file_updates with every item.\n'+
      '- When he asks you to go back and log everything you missed, call file_updates with every app request of his from the conversation.\n'+
      '- Never say you logged, marked, saved or added something unless you called the tool in this reply and it said so. If you did not, say you have not yet and do it.'});
    return s;
  };
})(aiSystem);
// the turn: what he said, what Op called; and if Op claims he logged it without a tool, the app files his words
aiAsk = (function(base){
  return function(text){
    const t = String(text || '').trim();
    const T = R58.turn = {text:t, tools:[], filed:false, at:Date.now()};
    const n0 = AI.history.length, r = base.apply(this, arguments);
    Promise.resolve(r).then(function(){
      if(R58.turn!==T) return;
      const last = AI.history[AI.history.length - 1];
      if(AI.history.length===n0 || !last || last.role!=='assistant') return;
      const claim = /\b(logged|noted|marked|filed|saved|it'?s in the (?:update|list|journal)|in app updates|added (?:it|that|this|both|all)|in the update)\b/i.test(String(last.content || ''));
      if(claim && !T.filed && !T.tools.length && t && !/^(?:ok(?:ay)?|thanks|thank you|cool|nice|perfect|got it)[.!]*$/i.test(t)){ r58File(r58Words(), ''); }
    }).catch(function(){}).then(function(){ if(R58.turn===T) R58.turn = null; }); // the turn is over: later tool calls aren't about this message
    return r;
  };
})(aiAsk);
// (what was in the old ideas list moves into App updates once; Op's "did" records leave App updates for the feed)
setTimeout(function(){
  try{
    const s = state.settings, tag = r57UpdateType(); let ch = false;
    arr(s.opIdeas).forEach(function(i){
      if(i.from==='did'){ r58FeedAdd({at:i.at || Date.now(), kind:'did', short:i.text, full:i.text}); return; }
      if(!r58UpdateEntries().some(function(e){ return e.text===i.text || e.title===i.text; })){ state.journal.entries.push({id:uid(), date:todayStr(new Date(i.at || Date.now())), timestamp:i.at || Date.now(), title:'From Op’s ideas', text:i.text, type:'freeform', mood:tag, pinned:false, photos:[], by:'op'}); }
      ch = true;
    });
    if(arr(s.opIdeas).length){ s.r58IdeasMoved = (s.r58IdeasMoved || 0) + s.opIdeas.length; s.opIdeas = []; persist('settings'); }
    const n = state.journal.entries.length;
    state.journal.entries = state.journal.entries.filter(function(e){ return !(e.by==='op' && e.title==='Op did'); });
    if(state.journal.entries.length!==n) ch = true;
    if(ch) persist('journal');
  }catch(e){}
}, 0);

// ================= B. Notes, the notifications feed =================
// One note per thing (an update with two summaries is one note), a ✕ on each, and they fade out (never blank).
// Every note also goes to the Op feed in Notifications: one short line each; tap it for the whole thing.
function r58Feed(){ const f = state.focus; if(!Array.isArray(f.r58Feed)) f.r58Feed = []; return f.r58Feed; }
function r58FeedAdd(o){ const F = r58Feed(); const it = Object.assign({id:uid(), at:Date.now()}, o); F.push(it); if(F.length > 200) F.splice(0, F.length - 200); persist('focus'); return it; }
r57Note = function(text, kind, more){
  text = String(text || '').trim(); if(!text) return;
  more = more || {};
  const it = r58FeedAdd({kind:kind==='idea' ? 'update' : 'did', short:text.slice(0, 160), full:more.full || text, title:more.title || '', entry:more.entry || null});
  let box = document.getElementById('r57Notes'); if(!box){ box = document.createElement('div'); box.id = 'r57Notes'; box.className = 'r57-notes'; document.body.appendChild(box); }
  const n = document.createElement('div'); n.className = 'r57-note'+(kind==='idea' ? ' is-idea' : ''); n.setAttribute('data-feed', it.id);
  n.innerHTML = '<div class="r57-nh"><i class="th-op-o op-note-o"></i><b>'+(kind==='idea' ? 'Saved to App updates' : 'Op')+'</b><time>'+r57Clock()+'</time><button class="r58-nx" data-action="r58NoteClose" aria-label="Close">&#10005;</button></div><p></p>';
  box.appendChild(n);
  // (more than three: the oldest fades out first)
  const live = Array.from(box.children).filter(function(c){ return !c.classList.contains('is-out'); });
  if(live.length > 3) r58NoteOut(live[0]);
  const p = n.querySelector('p'); let i = 0;
  const step = function(){ i = Math.min(text.length, i + 2); p.textContent = text.slice(0, i); if(i < text.length) n._t = setTimeout(step, 16); };
  step();
  n._out = setTimeout(function(){ r58NoteOut(n); }, 5600 + text.length*30);
  n.addEventListener('mouseenter', function(){ clearTimeout(n._out); });
  n.addEventListener('mouseleave', function(){ n._out = setTimeout(function(){ r58NoteOut(n); }, 2500); });
};
function r58NoteOut(n){ if(!n || n.classList.contains('is-out')) return; n.classList.add('is-out'); setTimeout(function(){ n.remove(); }, 420); }
ACTIONS.r58NoteClose = function(el, e){ if(e && e.stopPropagation) e.stopPropagation(); r58NoteOut(el.closest('.r57-note')); };
// a tap on a note opens the whole thing
document.addEventListener('click', function(e){ const n = e.target.closest && e.target.closest('.r57-note'); if(!n || e.target.closest('button')) return; r58FeedOpen(n.getAttribute('data-feed')); });
// toasts fade too (a new one doesn't blank the old one; it fades across)
showToast = (function(base){
  return function(){
    const c = document.getElementById('toastContainer'), old = c && c.querySelector('#activeToast');
    if(old && old.classList.contains('show')){
      const ghost = old.cloneNode(true); ghost.removeAttribute('id'); ghost.classList.add('r58-ghost'); ghost.style.position = 'absolute'; ghost.style.top = old.offsetTop+'px'; ghost.style.left = old.offsetLeft+'px'; ghost.style.width = old.offsetWidth+'px';
      const r = base.apply(this, arguments); c.appendChild(ghost); requestAnimationFrame(function(){ ghost.classList.remove('show'); }); setTimeout(function(){ ghost.remove(); }, 320); return r;
    }
    return base.apply(this, arguments);
  };
})(showToast);
// Notifications: the Op feed under what needs you
notifPanelHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), F = r58Feed().slice(-8).reverse();
    if(!F.length) return h;
    const feed = '<div class="r58-feed"><div class="r58-fh">From Op</div>'+F.map(function(it){ return '<button class="r58-fi is-'+it.kind+'" data-action="r58FeedOpen" data-id="'+it.id+'"><i></i><span>'+escapeHtml(it.short)+'</span><time>'+r58When(it.at)+'</time></button>'; }).join('')+'</div>';
    const i = h.indexOf('</div>', h.indexOf('nt-head')); // newest from Op first, right under the header
    return i < 0 ? h+feed : h.slice(0, i+6)+feed+h.slice(i+6);
  };
})(notifPanelHtml);
function r58When(at){ const d = new Date(at); return (todayStr(d)===todayStr() ? '' : fmtDateShort(todayStr(d))+' ')+r57Clock(at); }
function r58FeedOpen(id){
  const it = r58Feed().find(function(x){ return x.id===id; }); if(!it) return;
  ui.notifOpen = false; const p = document.getElementById('notifPanel'); if(p) p.hidden = true;
  ui.r58FeedItem = id;
  addSheetOpen('r58FeedSheet', function(){
    const x = r58Feed().find(function(y){ return y.id===ui.r58FeedItem; }) || it, e = x.entry ? state.journal.entries.find(function(j){ return j.id===x.entry; }) : null;
    return asHead(x.kind==='update' ? '&#128736;&#65039;' : '&#9673;', x.kind==='update' ? 'Saved to App updates' : 'Op did this', r58When(x.at))+
      (e && e.title && e.title!==e.text ? '<div class="r58-fd-t">'+escapeHtml(e.title)+(arr(e.summaries).length ? '<br>'+e.summaries.map(escapeHtml).join('<br>') : '')+'</div>' : '')+
      '<blockquote class="r58-fd-q">'+escapeHtml(e ? e.text : x.full)+'</blockquote>'+
      (e ? '<div class="as-f"><button class="btn" data-action="r58OpenUpdates">Open App updates</button></div>' : '');
  });
}
ACTIONS.r58FeedOpen = function(el, e, id){ r58FeedOpen(id); };
ACTIONS.r58OpenUpdates = function(){ addSheetClose('r58FeedSheet'); ui.view = 'settings'; ui.settingsTab = 'system'; ui.r52Sub = ui.r52Sub || {}; ui.r52Sub['settings-system'] = 'updates'; renderView(); };

// ================= C. A session that ran too long =================
// One that's been open more than 10 hours asks once whether it's real, with Remove right there (Op can remove one too).
setInterval(function(){
  try{
    const s = state.focus.activeSession; if(!s || s.r58Long) return;
    if(Date.now() - s.startedAt > 10*3600000){ s.r58Long = true; persist('focus'); showToast('Still locked in after '+fmtDurationLabel(Math.round((Date.now() - s.startedAt)/60000))+'. Really working?', {icon:'&#9201;', actionLabel:'End it now', actionAction:'r56StopSession', duration:20000}); }
  }catch(e){}
}, 60000);

// ================= D. Op's chat: the time on every message =================
function r58Stamp(box, sel, list){
  if(!box) return;
  const els = box.querySelectorAll(sel); if(els.length!==list.length) return;
  els.forEach(function(el, i){ if(el.querySelector('time.r58-t')) return; const at = list[i] && list[i].at; if(!at) return; const t = document.createElement('time'); t.className = 'r58-t'; t.textContent = r57Clock(at); el.appendChild(t); });
}
opChatDraw = (function(base){ return function(){ const r = base.apply(this, arguments); try{ r58Stamp(document.getElementById('opBubLog'), '.ocl-m:not(.ocl-typing)', opChat()); }catch(e){} return r; }; })(opChatDraw);
opfChatDraw = (function(base){ return function(){ const r = base.apply(this, arguments); try{ r58Stamp(document.getElementById('opfLog'), '.opc-me, .opc-act, .opc-op', opChat().slice(-300)); }catch(e){} return r; }; })(opfChatDraw);

// ================= E. Voice: it doesn't cut you off =================
// Hands-free: no time cap at all; quiet talking still counts as talking; it ends only after a clear pause (about
// four seconds, longer the longer you've been going, up to ten). The browser engine's 60-second stop is ignored.
function r58PauseMs(talked){ return Math.max(typeof opPauseMs==='function' ? opPauseMs() : 2500, 3800) + Math.min(6000, talked*0.25); }
scribeListen = async function(cap){
  if(AI.listening){ if(AI.sendNow) AI.sendNow(); return; }
  if(typeof opStop==='function') opStop();
  const heyWas = typeof HW!=='undefined' && HW.on; if(heyWas && typeof heyStop==='function') heyStop();
  OV.cap = cap || 'opBubText'; AI.listening = true; AI.typedAt = 0; aiUiRefresh(); opCaption('Listening…');
  let stream = null;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:r57MicOpts()}); }
  catch(e){ AI.listening = false; aiUiRefresh(); opCaption(e && e.name==='NotAllowedError' ? 'I need the microphone. Allow it for Operator (or type instead).' : 'The mic isn’t working: type instead.'); return; }
  r57Duck('mic', true);
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
  const rec = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined), chunks = [];
  rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
  let ctx = null, an = null, buf = null;
  try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an); buf = new Float32Array(an.fftSize); }catch(e){}
  let floor = 0.004, spoke = false, lastLoud = Date.now(), why = null, talked = 0; AI._longWarn = false;
  const t0 = Date.now(), held = !!OPX.ptt;
  const finish = function(reason){ if(why) return; why = reason; clearInterval(tick); try{ if(rec.state!=='inactive') rec.stop(); }catch(e){ rec.onstop(); } };
  AI.sendNow = function(){ finish(spoke || !an ? 'send' : 'silence'); };
  AI.cancelListen = function(){ finish('cancel'); };
  const tick = setInterval(function(){
    let rms = 0;
    if(an){ an.getFloatTimeDomainData(buf); let s = 0; for(let i = 0; i < buf.length; i++) s += buf[i]*buf[i]; rms = Math.sqrt(s/buf.length); }
    SCR.level = rms;
    if(!spoke) floor = floor*0.95 + Math.min(rms, 0.03)*0.05;
    // (once you've started, anything a little over the room's own noise is you still talking)
    const loud = spoke ? Math.max(0.0045, floor*1.5) : Math.max(0.012, floor*2.6);
    if(rms > loud){ if(spoke) talked += 100; lastLoud = Date.now(); if(!spoke && Date.now() - t0 > 120){ spoke = true; if(!held) opCaption('Listening… take your time'); } }
    if(held || OPX.ptt) return;
    if(spoke && Date.now() - lastLoud > r58PauseMs(talked)) finish('send');
    else if(!spoke && Date.now() - t0 > (an ? 12000 : 8000)) finish(an ? 'silence' : 'send');
  }, 100);
  rec.onstop = async function(){
    stream.getTracks().forEach(function(t){ t.stop(); }); try{ if(ctx) ctx.close(); }catch(e){}
    AI.listening = false; AI.sendNow = null; AI.cancelListen = null; SCR.level = 0; aiUiRefresh(); r57Duck('mic', false);
    if(why==='cancel') return;
    if(why==='silence'){ opCaption('Didn’t hear anything.'); return; }
    AI.transcribing = true; opCaption('…');
    let text = '';
    try{ text = await scribeText(new Blob(chunks, {type:mime || 'audio/webm'}), mime || 'audio/webm'); }
    catch(e){ AI.transcribing = false; if(/no ElevenLabs key/i.test(e.message)) SCR.on = false; opCaption('Couldn’t make that out ('+(e.name==='AbortError' ? 'it took too long' : e.message)+'). Try again, or type.'); return; }
    AI.transcribing = false;
    if(text) aiAsk(text, OV.cap || cap); else opCaption('Didn’t catch that.');
  };
  rec.start(250);
};
if(typeof r51Busy==='function') scribeListen = (function(base){ return function(){ if(r51Busy()) return; return base.apply(this, arguments); }; })(scribeListen);
// (the browser's speech engine: its own 60-second stop never ends a hands-free message either)
(function(){
  const st = window.setTimeout;
  window.setTimeout = function(fn, ms){
    if(ms===60000 && typeof fn==='function' && AI && AI.listening){ return st.call(window, function(){ if(AI.listening){ R57.srPending = fn; return; } fn(); }, ms); }
    return st.apply(window, arguments);
  };
})();
// a tap while he's talking: he stops, his line finishes writing out quickly, and the mic stays closed (a double tap
// is what opens it)
r54TalkToggle = (function(base){
  return function(){
    if(OV.speaking || OV.pending){
      const line = R57.lastSaid;
      try{ opStop(); }catch(e){} OV.userCut = true; R58.cutAt = Date.now(); AI.closedAt = Date.now();
      if(line) r58FinishLine(line);
      return;
    }
    if(R58.cutAt && Date.now() - R58.cutAt < 450){ R58.cutAt = 0; AI.closedAt = 0; return base.apply(this, arguments); }
    return base.apply(this, arguments);
  };
})(r54TalkToggle);
function r58FinishLine(text){
  const el = document.getElementById('opBubText'); if(!el) return;
  const have = el.textContent || '', i0 = text.indexOf(have) === 0 ? have.length : 0;
  let i = i0; clearInterval(R58.fin);
  R58.fin = setInterval(function(){ i = Math.min(text.length, i + Math.max(3, Math.ceil((text.length - i0)/18))); el.textContent = text.slice(0, i); if(i >= text.length) clearInterval(R58.fin); }, 16);
}

// ================= F. Op's read: one look, never pushes the page, and it always finishes typing =================
// What went wrong: the typing kept its progress on the page itself, so a redraw in the middle put the whole text back
// at once. Now its progress lives outside the page and every redraw shows exactly what's been typed so far. While
// he thinks, the line already takes the space the read will need, so nothing under it moves.
const R58T = {};
function r58ReadParts(text){
  const parts = ['Pattern', 'Watch', 'Move'].map(function(k){ const m = new RegExp('(?:^|\\n|\\s)'+k+':\\s*([^\\n]+?)(?=\\s*(?:Pattern|Watch|Move):|\\n|$)').exec(text); return m ? [k, m[1].trim()] : null; }).filter(Boolean);
  return parts.length >= 2 ? parts : null;
}
opReadHtml = function(kind, kick){
  if(kick) kick();
  const r = opReadStore()[kind], failed = ui['opReadFail_'+kind] && Date.now() - ui['opReadFail_'+kind] < 15*60000, busy = !!ui['opRead_'+kind] || (!!kick && !failed);
  if(!r && !busy) return '';
  const label = {Pattern:'What’s going on', Watch:'Watch', Move:'Next'};
  let T = R58T[kind];
  if(r && (!T || T.text!==r.text)) T = R58T[kind] = {text:r.text, pos:R57_TYPED[kind]===r.text ? 1e9 : 0};
  if(T && T.pos < T.text.length) r58TypeKick();
  const shown = function(s, from){ if(!T) return s; const left = Math.max(0, T.pos - from); return s.slice(0, left); };
  let body;
  if(!r) body = '<p class="r57-opl-t"><i class="opi-dots"><b></b><b></b><b></b></i></p>';
  else {
    const parts = r58ReadParts(r.text);
    if(parts){ let from = 0; body = '<div class="r57-opl-rows">'+parts.map(function(x){ const s = shown(x[1], from); from += x[1].length; return '<div class="r57-opl-r is-'+x[0].toLowerCase()+'"><b>'+label[x[0]]+'</b><span data-r58-k="'+escapeHtml(kind)+'">'+escapeHtml(s)+'</span></div>'; }).join('')+'</div>'; }
    else body = '<p class="r57-opl-t" data-r58-k="'+escapeHtml(kind)+'">'+escapeHtml(shown(r.text, 0))+'</p>';
  }
  return '<div class="opi r57-opl r58-opl'+(r ? '' : ' is-busy')+'" data-opi="'+escapeHtml(kind)+'"><span class="r57-opl-o"></span><div class="r57-opl-b"><span class="r57-opl-k">Op’s read</span>'+body+'</div>'+
    (r ? '<button class="opi-r" data-action="opReadAgain" data-id="'+escapeHtml(kind)+'" title="Another take">&#8635;</button>' : '')+'</div>';
};
// one typing clock: it writes into whatever is on the page now, and never jumps ahead. It only runs while
// something is still typing.
var r58TypeTimer = null;
function r58TypeKick(){ if(!r58TypeTimer) r58TypeTimer = setInterval(r58TypeTick, 22); }
function r58TypeTick(){
  let busy = false;
  Object.keys(R58T).forEach(function(kind){
    const T = R58T[kind], total = T.text.length; if(T.pos >= total) return; busy = true;
    const el = document.querySelector('.r58-opl[data-opi="'+(window.CSS && CSS.escape ? CSS.escape(kind) : kind)+'"]'); if(!el) return;
    T.pos = Math.min(total, T.pos + 2);
    const parts = r58ReadParts(T.text), spans = el.querySelectorAll('[data-r58-k]');
    if(parts && spans.length===parts.length){ let from = 0; parts.forEach(function(x, i){ const s = x[1].slice(0, Math.max(0, T.pos - from)); if(spans[i].textContent!==s) spans[i].textContent = s; from += x[1].length; }); }
    else if(spans.length===1) spans[0].textContent = T.text.slice(0, T.pos);
    if(T.pos >= total) R57_TYPED[kind] = T.text;
  });
  if(!busy){ clearInterval(r58TypeTimer); r58TypeTimer = null; }
}

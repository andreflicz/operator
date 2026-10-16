// ============ ROUND 39 ============
// One file per area of the round; each part says what it does.

// ---- 1. client deliverable tasks look like client work: violet, the deliverable big, the week as dots ----
function dvwView(t){
  const x = dvwFind(t); if(!x) return null;
  const c = x.c, name = x.oneOff ? String(x.d.title || 'Deliverable') : dvwBaseName(x.d);
  const parts = x.oneOff ? [] : dvwParts(x.d), at = x.oneOff ? 0 : parts.indexOf(x.k) + 1;
  return {x:x, c:c, who:c.business || c.name || 'Client', name:name, at:at, of:parts.length, pieces:x.oneOff ? 'One-off' : dvwPieces(x.d, x.need)};
}
function dvwDotsHtml(v){
  if(!v.of) return '<span class="dvc-one">One-off</span>';
  let h = '<span class="dvc-dots" title="Week '+v.x.k+' of the cycle">';
  for(let i = 1; i <= v.of; i++) h += '<i class="'+(i < v.at ? 'is-past' : i===v.at ? 'is-on' : '')+'"></i>';
  return h+'</span><b class="dvc-n">'+v.at+'/'+v.of+'</b>';
}
function dvwWeekLabel(v){ return v.x.oneOff ? 'One-off' : 'Week '+v.x.k; }
function dvwWhoHtml(v){ return '<span class="dvc-who"><span class="dvc-av" style="background:'+clientColor(v.c)+'">'+escapeHtml(clientInitials(v.c))+'</span>'+escapeHtml(v.who)+'</span>'; }
taskCard = (function(base){
  return function(t){
    const h = base.apply(this, arguments);
    if(!t || !t.master || t.master.kind!=='dvw') return h;
    const v = dvwView(t); if(!v) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const card = tpl.content.firstElementChild; if(!card) return h;
    const due = card.querySelector('.kpi-sub'), more = card.querySelector('.card-more');
    card.classList.add('dvc');
    // just the three things: the week, the deliverable, the client
    card.innerHTML = '<div class="dvc-top"><span class="dvc-wkp">'+dvwWeekLabel(v)+'</span>'+(more ? more.outerHTML : '')+'</div>'+
      '<div class="dvc-title">'+escapeHtml(v.name)+'</div>'+
      '<div class="dvc-wk">'+(v.of ? dvwDotsHtml(v) : '')+(due ? '<span class="dvc-due">'+due.outerHTML+'</span>' : '')+'</div>'+
      '<div class="dvc-foot">'+dvwWhoHtml(v)+'</div>';
    return tpl.innerHTML;
  };
})(taskCard);
lineupListHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('tl-row') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.tl-row').forEach(function(row){
      const t = state.tasks.items.find(function(x){ return x.id===row.dataset.taskId; });
      if(!t || !t.master || t.master.kind!=='dvw') return;
      const v = dvwView(t); if(!v) return;
      row.classList.add('tl-dlv');
      const main = row.querySelector('.tl-main');
      if(main) main.innerHTML = '<span class="dvc-wkp">'+dvwWeekLabel(v)+'</span><span class="tl-title">'+escapeHtml(v.name)+'</span>'+(v.of ? '<span class="dvc-wk is-inline">'+dvwDotsHtml(v)+'</span>' : '');
      row.querySelectorAll('.tag-client').forEach(function(e, i){ if(i===0){ const w = document.createElement('template'); w.innerHTML = dvwWhoHtml(v); e.replaceWith(w.content.firstElementChild); } else e.remove(); });
    });
    return tpl.innerHTML;
  };
})(lineupListHtml);

// ---- 2. Today's Clients panel: the whole card opens the client ----
renderClientHubPanel = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<div class="hub-card (hl-[a-z]+)" data-key="hub-([^"]+)">/g, function(m, hl, id){
      return '<div class="hub-card '+hl+' is-open-able" data-key="hub-'+id+'" data-action="openContact" data-kind="client" data-id="'+id+'" title="Open their card">';
    });
  };
})(renderClientHubPanel);

// ---- 3. logging a touch: the type menu floats above everything (it was hidden under the next panel), and
// after a quick log it opens on its own so you can say what it really was ----
function touchFloatSync(){
  document.querySelectorAll('body > .touch-menu.is-float').forEach(function(e){ e.remove(); });
  if(!ui.touchMenu) return;
  const k = ui.touchMenu.split(':'), btn = document.querySelector('#viewRoot .touch-more-btn[data-kind="'+k[0]+'"][data-id="'+k[1]+'"]');
  const retype = ui.touchRetype && ui.touchRetype.key===ui.touchMenu ? ui.touchRetype : null;
  let m = document.querySelector('#viewRoot .touch-menu');
  if(!m && retype && retype.rect){
    // (a lead you just logged leaves the "to reach out to" list; the menu stays where its button was)
    const x0 = crmFind(k[0], k[1]); if(!x0) return;
    const t0 = document.createElement('template'); t0.innerHTML = touchMenuHtml(k[0], x0); m = t0.content.firstElementChild;
  }
  if(!m) return;
  if(!btn && !(retype && retype.rect)){ m.remove(); return; }
  const r = btn ? btn.getBoundingClientRect() : retype.rect;
  m.classList.add('is-float'); document.body.appendChild(m);
  const w = m.offsetWidth || 240, h = m.offsetHeight || 140;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))+'px';
  m.style.top = (r.bottom + 6 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6)+'px';
  if(retype){
    const hd = document.createElement('div'); hd.className = 'touch-menu-h'; hd.innerHTML = 'Logged a '+escapeHtml(touchTypeById(retype.type).label.toLowerCase())+'. Was it something else?';
    m.insertBefore(hd, m.firstChild);
    m.querySelectorAll('.touch-menu-btn').forEach(function(b){ b.dataset.action = 'retypeTouch'; b.classList.toggle('is-on', b.dataset.type===retype.type); });
  }
}
afterRenderHooks.push(function(){ try{ touchFloatSync(); }catch(e){} });
window.addEventListener('scroll', function(){ if(ui.touchMenu){ ui.touchMenu = null; ui.touchRetype = null; document.querySelectorAll('body > .touch-menu.is-float').forEach(function(e){ e.remove(); }); } }, true);
document.addEventListener('mousedown', function(e){
  if(!ui.touchMenu || (e.target.closest && e.target.closest('.touch-menu, .touch-more-btn, .touch-log-btn'))) return;
  ui.touchMenu = null; ui.touchRetype = null; document.querySelectorAll('body > .touch-menu.is-float').forEach(function(x){ x.remove(); });
});
ACTIONS.quickTouch = (function(base){
  return function(el){
    const rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    const r = base.apply(this, arguments);
    const l = lastTouchLogged;
    if(l && el && !el.closest('#clientModalOverlay')){
      const x = crmFind(l.kind, l.id), tp = x && arr(x.touchpoints).find(function(t){ return t.id===l.tpId; });
      if(tp){ ui.touchMenu = l.kind+':'+l.id; ui.touchRetype = {key:ui.touchMenu, type:tp.type, rect:rect ? {left:rect.left, right:rect.right + 34, top:rect.top, bottom:rect.bottom} : null}; renderView(); clearTimeout(ACTIONS.quickTouch._t); ACTIONS.quickTouch._t = setTimeout(function(){ if(ui.touchRetype){ ui.touchMenu = null; ui.touchRetype = null; renderView(); } }, 6000); }
    }
    return r;
  };
})(ACTIONS.quickTouch);
ACTIONS.retypeTouch = function(el){
  const l = lastTouchLogged, ty = el && el.dataset.type; if(!l || !ty) return;
  const x = crmFind(l.kind, l.id), tp = x && arr(x.touchpoints).find(function(t){ return t.id===l.tpId; });
  if(tp){ tp.type = ty; x.lastTouchType = ty; crm().lastTouchType = ty; persist('business'); }
  ui.touchMenu = null; ui.touchRetype = null; playTick(); renderView();
  const tt = touchTypeById(ty); showToast('Changed to a '+tt.label.toLowerCase()+' with '+crmName(l.kind, x)+'.', {icon:tt.icon});
};

// ---- 4–9. Op: he hears you properly, he listens when he asks, you can stop him listening, his thinking
// shows in his pop-up, and he does what you ask ----
// Listening with ElevenLabs Scribe (when there's an ElevenLabs key; Chrome's speech recognition otherwise):
// the mic records while you talk, stops after a pause, and the clip goes to the Operator app, which asks
// ElevenLabs for the words. Much better at names, numbers and fast speech than Chrome.
const SCR = {on:null, level:0};
function scribeCheck(){
  fetchWithin(WAKE_HELPER+'tts/status', 6000).then(function(r){ return r && r.ok ? r.json() : null; })
    .then(function(j){ SCR.on = !!(j && j.hasKey) && typeof MediaRecorder!=='undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }).catch(function(){});
}
setTimeout(scribeCheck, 1500); setInterval(scribeCheck, 10*60000);
function scribeWanted(){ return !!SCR.on && state.profile.sttEngine!=='chrome'; }
async function scribeText(blob, mime){
  const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, 50000);
  try{
    const r = await fetch(WAKE_HELPER+'stt', {method:'POST', body:blob, headers:{'Content-Type':mime || 'audio/webm'}, signal:ctl.signal});
    let j = null; try{ j = await r.json(); }catch(e){}
    if(!r.ok) throw new Error((j && (j.detail && (j.detail.message || j.detail.status) || j.error)) || 'ElevenLabs said no ('+r.status+')');
    // (sound tags like "(laughs)" aren't words)
    return String((j && j.text) || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
  } finally { clearTimeout(tm); }
}
async function scribeListen(cap){
  if(AI.listening){ if(AI.sendNow) AI.sendNow(); return; }
  if(typeof opStop==='function') opStop();
  const heyWas = typeof HW!=='undefined' && HW.on; if(heyWas && typeof heyStop==='function') heyStop();
  OV.cap = cap || 'opBubText'; AI.listening = true; AI.typedAt = 0; aiUiRefresh(); opCaption('Listening…');
  let stream = null;
  try{ stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1}}); }
  catch(e){ AI.listening = false; aiUiRefresh(); opCaption(e && e.name==='NotAllowedError' ? 'I need the microphone. Allow it for Operator (or type instead).' : 'The mic isn’t working: type instead.'); return; }
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
  const rec = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined), chunks = [];
  rec.ondataavailable = function(e){ if(e.data && e.data.size) chunks.push(e.data); };
  let ctx = null, an = null, buf = null;
  try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an); buf = new Float32Array(an.fftSize); }catch(e){}
  let floor = 0.006, spoke = false, lastLoud = Date.now(), why = null;
  const t0 = Date.now();
  const finish = function(reason){ if(why) return; why = reason; clearInterval(tick); try{ if(rec.state!=='inactive') rec.stop(); }catch(e){ rec.onstop(); } };
  AI.sendNow = function(){ finish('send'); };
  AI.cancelListen = function(){ finish('cancel'); };
  const tick = setInterval(function(){
    let rms = 0;
    if(an){ an.getFloatTimeDomainData(buf); let s = 0; for(let i = 0; i < buf.length; i++) s += buf[i]*buf[i]; rms = Math.sqrt(s/buf.length); }
    SCR.level = rms;
    if(!spoke) floor = floor*0.94 + Math.min(rms, 0.04)*0.06;
    if(rms > Math.max(0.014, floor*3)){ lastLoud = Date.now(); if(!spoke && Date.now() - t0 > 120){ spoke = true; opCaption('Listening… go on'); } }
    const pause = typeof opPauseMs==='function' ? opPauseMs() : 2500;
    if(spoke && Date.now() - lastLoud > pause) finish('send');
    else if(!spoke && Date.now() - t0 > (an ? 9000 : 6000)) finish(an ? 'silence' : 'send');
    else if(Date.now() - t0 > 60000) finish('send');
  }, 100);
  rec.onstop = async function(){
    stream.getTracks().forEach(function(t){ t.stop(); }); try{ if(ctx) ctx.close(); }catch(e){}
    AI.listening = false; AI.sendNow = null; AI.cancelListen = null; SCR.level = 0; aiUiRefresh();
    if(why==='cancel') return;
    if(why==='silence'){ opCaption('Didn’t hear anything. Tap the mic when you’re ready.'); return; }
    AI.transcribing = true; opCaption('…');
    let text = '';
    try{ text = await scribeText(new Blob(chunks, {type:mime || 'audio/webm'}), mime || 'audio/webm'); }
    catch(e){
      AI.transcribing = false;
      if(/no ElevenLabs key/i.test(e.message)) SCR.on = false;
      opCaption('Couldn’t make that out ('+(e.name==='AbortError' ? 'it took too long' : e.message)+'). Try again, or type.'); return;
    }
    AI.transcribing = false;
    if(text) aiAsk(text, OV.cap || cap); else opCaption('Didn’t catch that.');
  };
  rec.start(250);
}
aiListen = (function(base){
  return function(cap){ return scribeWanted() ? scribeListen(cap) : base.apply(this, arguments); };
})(aiListen);

// when he asks you something, the mic opens once he's finished talking (not 0.35s after, when he often
// hadn't, so it never opened), for any question near the end of what he said, not only the last character
function opAsked(text){ const t = String(text || '').trim(); if(!t) return false; const tail = t.slice(-180); return /\?/.test(tail.split(/(?<=[.!])\s+/).pop() || '') || /\?["”’)]*\s*$/.test(t); }
function opListenWhenDone(cap){
  const t0 = Date.now();
  const go = function(){
    if(AI.listening || OV.userCut) return;
    const busy = AI.busy || OV.speaking || OV.pending || (typeof alarmRingingNow==='function' && alarmRingingNow());
    if(busy){ if(Date.now() - t0 < 25000) setTimeout(go, 250); return; }
    if(typeof aiAutoListen==='function') aiAutoListen(cap || OV.cap || 'opBubText');
  };
  setTimeout(go, 300);
}
opSay = (function(base){
  return function(text, opts){
    opts = opts || {};
    return Promise.resolve(base.apply(this, arguments)).then(function(ok){
      if(ok && !opts.noListen && opAsked(text)) opListenWhenDone(opts.cap);
      return ok;
    });
  };
})(opSay);
aiAsk = (function(base){
  return function(text, cap){
    return Promise.resolve(base.apply(this, arguments)).then(function(r){
      // (with his voice off the reply is only written; a question still opens the mic)
      const el = document.getElementById(cap || 'opBubText');
      if(!opVoiceOn() && el && opAsked(el.textContent)) opListenWhenDone(cap);
      return r;
    });
  };
})(aiAsk);

// stop him listening: the Stop in his pop-up, Esc, or tapping his light while he listens
ACTIONS.opStopListen = function(){
  if(AI.cancelListen) AI.cancelListen(); else if(AI.rec){ try{ AI.rec.abort(); }catch(e){} }
  AI.listening = false; AI.closedAt = Date.now(); aiUiRefresh(); opCaption('Okay, I’m not listening.');
};
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && AI.listening){ e.preventDefault(); ACTIONS.opStopListen(); } }, true);

// his pop-up says what he's doing: listening (with your voice level and a Stop), thinking (with a Stop),
// getting your words. The floating "Thinking" chip by his light is gone; it lives here now.
(function(){
  setInterval(function(){
    const st = AI.listening ? 'listen' : AI.transcribing ? 'words' : AI.busy ? 'think' : '';
    const full = !!document.getElementById('opfStatus') && typeof overlayOpen==='function' && document.querySelector('#opFull.is-in, #opFull:not(.hidden)');
    let b = document.getElementById('opBub');
    if(st && !full && (!b || !b.classList.contains('is-in')) && (st!=='listen' || OV.cap==='opBubText')) b = opBubShow();
    if(!b) return;
    let s = b.querySelector('.ob-status');
    if(!s){ s = document.createElement('div'); s.className = 'ob-status'; const h = b.querySelector('.op-bub-h'); if(h) h.insertAdjacentElement('afterend', s); else b.prepend(s); }
    if(s.dataset.st!==st){
      s.dataset.st = st;
      s.innerHTML = st==='listen' ? '<span class="obs-wave"><i></i><i></i><i></i><i></i><i></i></span><span class="obs-t">Listening</span><button class="obs-x" data-action="opStopListen" title="Stop listening (Esc)">&#9632; Stop</button>'
        : st==='think' ? '<span class="obs-dots"><i></i><i></i><i></i></span><span class="obs-t">Thinking</span><button class="obs-x" data-action="opCancelThink" title="Stop">&#10005; Stop</button>'
        : st==='words' ? '<span class="obs-dots"><i></i><i></i><i></i></span><span class="obs-t">Getting your words</span>' : '';
      s.classList.toggle('is-on', !!st);
    }
    if(st==='listen'){
      const lv = Math.min(1, (SCR.level || 0)*14);
      s.querySelectorAll('.obs-wave i').forEach(function(i, n){ i.style.transform = 'scaleY('+(0.25 + lv*(0.6 + 0.4*Math.abs(Math.sin(Date.now()/140 + n))))+')'; });
    }
  }, 120);
})();

// he does what you ask
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:
      'How you take requests (this overrides anything above that conflicts):\n'+
      '- He is in charge of his own app. When he asks you to do something in it, do it with your tools, every time, then confirm in one short line. Never refuse, never stall, never ask him to do it himself.\n'+
      '- He knows what he did. When he says something is done, mark it done. Never question whether it really happened, never mention “fake completions”, padding stats, or cheating the system. Finishing a lot at once is fine.\n'+
      '- If you think there’s a smarter way (like not piling everything onto today at once), do what he asked FIRST, then add at most one short line of advice. Never withhold the action to make the point.\n'+
      '- Be exact with specifics. Do only what he named: the client he named, the week he named, the task he named. Don’t do extra.\n'+
      '- Client deliverable tasks are made automatically from each client’s deliverables and named like “16 Reels 2/4” (the monthly deliverable, then which of the four weeks of the client’s cycle). Use client_deliverables for them: put a client’s next week (or this week) on today, send it back, mark a week done, or undo it. “Add next week of deliverables for X” means: client_deliverables with client X, week "next", action "today", nothing else. Don’t create new tasks for deliverables with add_task.\n'+
      '- To finish several tasks, call complete_task once per task.'});
    return s;
  };
})(aiSystem);
function opFindClient(q){
  const w = String(q || '').toLowerCase().trim(); if(!w) return null;
  const cs = arr(state.business.clients);
  return cs.find(function(c){ return [c.business, c.name].some(function(n){ return String(n || '').toLowerCase()===w; }); }) ||
         cs.find(function(c){ return [c.business, c.name].some(function(n){ n = String(n || '').toLowerCase(); return n && (n.indexOf(w) >= 0 || w.indexOf(n) >= 0); }); }) || null;
}
OP_TOOLS.push({name:'client_deliverables', description:'Work with a client’s deliverable tasks (the automatic ones named like “16 Reels 2/4”). action: today = put on today’s lineup, later = back to the Client backlog, done = mark done (logs the week’s pieces on their card), undo = not done after all. week: this, next, last, all, or a number 1 to 4 (the week of their cycle). deliverable narrows it to one deliverable (e.g. "reels").',
  input_schema:{type:'object', properties:{client:{type:'string'}, action:{type:'string', enum:['today', 'later', 'done', 'undo']}, week:{type:'string', description:'this | next | last | all | 1 | 2 | 3 | 4'}, deliverable:{type:'string'}}, required:['client', 'action'], additionalProperties:false}});
opRunTool = (function(base){
  return function(name, x){
    if(name!=='client_deliverables') return base.apply(this, arguments);
    x = x || {};
    const c = opFindClient(x.client); if(!c) throw new Error('no client matches "'+x.client+'"');
    const cy = dvwCycle(c), today = todayStr(), dq = String(x.deliverable || '').toLowerCase().replace(/s$/, '');
    const all = state.tasks.items.filter(function(t){ const m = t.master; if(!m || m.kind!=='dvw' || m.clientId!==c.id || m.oneOff) return false; if(m.cycle!==cy.start) return false; if(!dq) return true; const d = delivFind(c.id, m.delivId); return !!(d && String(d.d.title || '').toLowerCase().indexOf(dq) >= 0); });
    if(!all.length) throw new Error((c.business || c.name)+' has no deliverable tasks this cycle'+(dq ? ' for "'+x.deliverable+'"' : ''));
    const nowWk = (dvwWeeks(cy).find(function(w){ return w.start <= today && today <= w.end; }) || {k:1}).k;
    const wk = String(x.week || 'this').toLowerCase();
    const want = wk==='all' ? null : wk==='next' ? nowWk + 1 : wk==='last' ? nowWk - 1 : /^[1-4]$/.test(wk) ? Number(wk) : nowWk;
    if(want!=null && (want < 1 || want > 4)) throw new Error(want > 4 ? 'next week is in their next cycle (it starts '+fmtDateShort(addDays(cy.end, 1))+'); its tasks show up then' : 'there is no week before week 1 in this cycle');
    const ts = all.filter(function(t){ return want==null || t.master.wk===want; });
    if(!ts.length) throw new Error('no deliverable task for week '+want+' (that week has nothing due)');
    const did = [];
    ts.forEach(function(t){
      if(x.action==='today'){ if(t.status!=='done'){ t.status = 'today'; did.push(t.title); } }
      else if(x.action==='later'){ if(t.status!=='done'){ t.status = 'backlog'; did.push(t.title); } }
      else if(x.action==='done'){ if(t.status!=='done'){ dvwDone(t); did.push(t.title); } }
      else if(x.action==='undo'){ if(t.status==='done'){ dvwUndo(t); did.push(t.title); } }
    });
    persist('tasks'); renderView();
    return did.length ? x.action+': '+did.join(', ')+' ('+(c.business || c.name)+')' : 'nothing to change (already '+(x.action==='done' ? 'done' : x.action==='undo' ? 'open' : 'there')+')';
  };
})(opRunTool);

// ---- 10. Op's corner: his light and the pill stay together on full-screen pages (Work mode, Inspiration,
// minimal views), the pill says "Clocked in" when you are (it said "Off the clock" outside work hours even
// while you worked), and on his own page the pill steps aside (his screen shows what he's doing) ----
opBarStatus = (function(base){
  return function(){
    const k = base.apply(this, arguments);
    if(k==='grey' && typeof workDayState==='function' && workDayState().clockedInAt && !(state.modes.active && state.modes.active.clockedOut)) return 'clocked';
    return k;
  };
})(opBarStatus);
OB_LABEL.clocked = 'Clocked in';
clockIn = (function(base){ return function(){ const r = base.apply(this, arguments); try{ updateActivityPill(); }catch(e){} return r; }; })(clockIn);

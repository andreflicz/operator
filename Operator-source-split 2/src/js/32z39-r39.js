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

// ---- 11–14. levels, ranks, goals ----
// Rank is claimed now, like a level: when you have the level, the MRR and the Health for the next rank a
// gold Rank up button shows up (your card, You, the level card top right, notifications). Press it and
// you get the ceremony. Until then your card shows the rank you've claimed.
xpSummary = (function(base){
  return function(){
    const x = base.apply(this, arguments); if(!x) return x;
    const p = state.profile;
    const earned = x._rankEarned!=null ? x._rankEarned : x.rank; x._rankEarned = earned;
    if(p.rankClaimed==null){ p.rankClaimed = earned; persist('profile'); }
    if(earned > p.rankClaimed){
      x.rankReady = p.rankClaimed + 1; x.rank = p.rankClaimed; x.next = RANKS[x.rank + 1] || null; x.needs = [];
    } else { x.rankReady = null; if(x.rank!==earned) x.rank = earned; }
    return x;
  };
})(xpSummary);
function rankUpBtnHtml(where){
  const x = xpSummary(); if(!x.rankReady) return '';
  const r = RANKS[x.rankReady];
  return '<button class="rank-up-btn rank-up-'+(where || 'x')+'" data-action="rankUp" style="--rc:'+r.color+'" title="You’ve earned '+escapeHtml(r.name)+'. Claim it.">'+rankBadgeSvg(x.rankReady, 20)+'<span>Rank up</span><b>'+escapeHtml(r.name)+'</b></button>';
}
levelUpBtnHtml = (function(base){ return function(where){ return rankUpBtnHtml(where)+base.apply(this, arguments); }; })(levelUpBtnHtml);
levelUpPending = (function(base){
  return function(){
    const out = base.apply(this, arguments), x = xpSummary();
    if(x.rankReady) out.unshift({key:'rank:'+x.rankReady, kind:'level', level:'good', icon:'&#128081;', title:'Rank up: '+RANKS[x.rankReady].name, sub:'You’ve got the level, the MRR and the body. Claim it.', act:{a:'rankUp'}, sort:-1});
    return out;
  };
})(levelUpPending);
afterRenderHooks.push(function(){
  if(!state || !state.profile || typeof xpSummary!=='function') return;
  const x = xpSummary(), p = state.profile;
  if(x.rankReady && p.rankReadyFor!==x.rankReady){ p.rankReadyFor = x.rankReady; persist('profile'); if(typeof sysNote==='function') setTimeout(function(){ sysNote('Rank up: '+RANKS[x.rankReady].name+'. Claim it.'); }, 900); if(typeof notifBadge==='function') notifBadge(); }
});
ACTIONS.rankUp = function(){
  const x = xpSummary(); if(!x.rankReady){ renderView(); return; }
  const to = x.rankReady, from = state.profile.rankClaimed;
  state.profile.rankClaimed = to; state.profile.rankReadyFor = null; state.profile.rankClaimedAt = Object.assign({}, state.profile.rankClaimedAt, {[to]:todayStr()});
  persist('profile'); if(typeof xpLast!=='undefined') xpLast = null;
  ui.lvlPop = false;
  rankUpFx(from, to);
  setTimeout(function(){ renderView(); if(typeof notifBadge==='function') notifBadge(); }, 400);
};
// the ceremony: the room goes dark, light gathers, the old badge breaks, the new one rises in its
// colour with rays behind it, the name lands letter by letter, what it took, and what this rank is.
function rankUpFx(from, to){
  const old = document.getElementById('rankFx'); if(old) old.remove();
  const r = RANKS[to], f = RANKS[from] || RANKS[0], calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const life = typeof projRankLife==='function' ? projRankLife(to) : '';
  const x = xpSummary();
  const d = document.createElement('div'); d.id = 'rankFx'; d.className = 'rank-fx'; d.style.setProperty('--rc', r.color); d.style.setProperty('--rc0', f.color);
  d.innerHTML = '<canvas class="rfx-cv"></canvas><div class="rfx-rays"></div><div class="rfx-ring"></div><div class="rfx-ring is-2"></div>'+
    '<div class="rfx-core">'+
      '<div class="rfx-k">RANK UP</div>'+
      '<div class="rfx-badges"><span class="rfx-old">'+rankBadgeSvg(from, 64)+'</span><span class="rfx-new">'+rankBadgeSvg(to, 132)+'</span></div>'+
      '<div class="rfx-name">'+String(r.name).split('').map(function(ch, i){ return '<i style="--i:'+i+'">'+(ch===' ' ? '&nbsp;' : escapeHtml(ch))+'</i>'; }).join('')+'</div>'+
      (r.tag ? '<div class="rfx-tag">'+escapeHtml(r.tag)+'</div>' : '')+
      '<div class="rfx-took"><span><small>Level</small><b>'+x.level+'</b></span><span><small>MRR</small><b>'+money(typeof xpMrr==='function' ? xpMrr() : 0)+'</b></span><span><small>Health</small><b>'+x.attrs.HLT.v+'</b></span></div>'+
      (life ? '<div class="rfx-life">'+escapeHtml(String(life))+'</div>' : '')+
      '<button class="rfx-go" data-action="rankFxClose">Wear it</button>'+
    '</div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add('is-in'); });
  if(!calm){
    document.body.style.setProperty('--shake', '10px'); document.body.classList.remove('lvl-shake'); void document.body.offsetWidth;
    setTimeout(function(){ document.body.classList.add('lvl-shake'); setTimeout(function(){ document.body.classList.remove('lvl-shake'); }, 800); }, 1500);
    setTimeout(function(){ const c = d.querySelector('.rfx-cv'); if(c && typeof lvlEmbers==='function') lvlEmbers(c, [r.color, '#ffffff', '#ffd27a'], 1400, 2.1); }, 1500);
  }
  if(typeof tone==='function'){
    [262, 330, 392].forEach(function(f0, i){ setTimeout(function(){ tone([f0], 0.5, 0.14); }, 200 + i*260); });
    setTimeout(function(){ tone([392, 523, 659, 784, 1047], 2.2, 0.24); }, 1500);
    setTimeout(function(){ tone([523, 784, 1047, 1568], 2.6, 0.2); }, 2300);
  }
}
ACTIONS.rankFxClose = function(){ const d = document.getElementById('rankFx'); if(!d) return; d.classList.add('is-out'); setTimeout(function(){ d.remove(); }, 700); };

// every level-up looks a little different: four stagings take turns, and the line changes
levelUpFx = (function(base){
  return function(L){
    base.apply(this, arguments);
    const d = document.getElementById('lvlFx'); if(!d) return;
    const v = ['burst', 'rise', 'slam', 'orbit'][L % 4];
    d.classList.add('lv-'+v);
    const k = d.querySelector('.lvl-k'); if(k) k.textContent = ['LEVEL UP', 'NEW LEVEL', 'LEVEL UP', 'CLIMBING'][L % 4];
  };
})(levelUpFx);

// the top right shows the level, not the bar
lvlChipHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<i><u style="width:[^"]*"><\/u><\/i>/, '').replace(/(<button class="md-lvl)/, function(m){ const x = xpSummary(); return x.rankReady ? m+' is-rank' : m; }); }; })(lvlChipHtml);

// a goal you add lands like a level up (smaller): the goal, where it lives and what it pays
function goalSetFx(g){
  const old = document.getElementById('goalFx'); if(old) old.remove();
  const where = g.tier==='week' ? 'This week' : g.tier==='month' ? 'This month' : g.master ? 'Master goal' : 'Your goals';
  const xp = typeof goalXpOf==='function' ? goalXpOf(g) : 0;
  const d = document.createElement('div'); d.id = 'goalFx'; d.className = 'goal-fx';
  d.innerHTML = '<div class="gfx-core"><div class="gfx-k">GOAL SET</div><div class="gfx-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/></svg><span>&#127919;</span></div>'+
    '<div class="gfx-t">'+escapeHtml(typeof goalTitle==='function' ? goalTitle(g) : (g.label || 'Your goal'))+'</div>'+
    '<div class="gfx-m"><span>'+where+'</span>'+(xp ? '<b>+'+Number(xp).toLocaleString()+' XP</b>' : '')+'</div></div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add('is-in'); });
  if(typeof tone==='function'){ tone([523], 0.18, 0.16); setTimeout(function(){ tone([659, 784], 0.4, 0.16); }, 140); }
  const close = function(){ if(!d.parentNode) return; d.classList.add('is-out'); setTimeout(function(){ if(d.parentNode) d.remove(); }, 450); };
  d.addEventListener('click', close); setTimeout(close, 2600);
}
ACTIONS.gsSave = (function(base){
  return function(){
    const n = state.goals.items.length, r = base.apply(this, arguments);
    if(state.goals.items.length > n){ const g = state.goals.items[state.goals.items.length - 1]; setTimeout(function(){ goalSetFx(g); }, 120); }
    return r;
  };
})(ACTIONS.gsSave);
// (the plain "Added:" toast it replaces)
showToast = (function(base){ return function(msg){ if(document.getElementById('goalFx') && /^Added: /.test(String(msg || ''))) return; return base.apply(this, arguments); }; })(showToast);

// ---- 15. the app's music goes through the top-right player ----
// The lock-in song ("Lock In") is a real track in the player now: locking in switches the player to it
// (whatever was on stops first, so nothing plays over it), it shows top right, and when it ends the
// player carries on with the low lock-in music. The short sounds (lock out, wind-down, the work intro)
// turn the music down for a moment instead of playing over it.
FOCUS_TRACKS.push({name:'Lock In', style:'song', song:'chill', len:14.5, bpm:240/14.5, special:true, next:'lock', hiss:0});
fmDream = (function(base){
  return function(style){
    if(style==='song') return function(ctx, out, t, tr, bar){ if(bar===0 && SFX[tr.song]) SFX[tr.song](ctx, out, t); };
    return base(style);
  };
})(fmDream);
fmSchedule = function(){
  if(!FM.playing) return;
  const ctx = getAudioCtx(); if(!ctx) return;
  const bus = fmBus(ctx);
  while(FM.nextAt < ctx.currentTime + 1.5){
    let tr = FOCUS_TRACKS[FM.idx];
    if(FM.bar >= (tr.style==='song' ? 1 : FM_BARS)){
      if(tr.special){
        const ids = fmTrackIds(tr.next || 'lock');
        FM.idx = ids.length ? ids[Math.floor(Math.random()*ids.length)] : 0; FM.tag = tr.next || FM.tag;
        if(tr.next==='lock' && (typeof soundPref!=='function' || soundPref('lockMusic', true))){ FM.soft = true; setTimeout(function(){ fmRamp(3); }, 50); }
      } else { let n = 0; do { FM.idx = (FM.idx + 1) % FOCUS_TRACKS.length; n++; } while(FOCUS_TRACKS[FM.idx].special && n < FOCUS_TRACKS.length); }
      FM.bar = 0; fmHiss(ctx, bus.g, FOCUS_TRACKS[FM.idx].hiss); fmRefresh(); tr = FOCUS_TRACKS[FM.idx];
    }
    fmBar(ctx, bus.g, FM.nextAt, tr, FM.bar);
    FM.nextAt += 60/tr.bpm*4; FM.bar++;
  }
};
// ⏭ skips the app's own songs
ACTIONS.fmNext = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    let n = 0; while(FOCUS_TRACKS[FM.idx].special && n++ < FOCUS_TRACKS.length) FM.idx = (FM.idx + 1) % FOCUS_TRACKS.length;
    return r;
  };
})(ACTIONS.fmNext);
function fmPlaySong(name, tag){
  const idx = FOCUS_TRACKS.findIndex(function(t){ return t.name===name; }); if(idx < 0 || typeof focusMusicPlay!=='function') return false;
  clearTimeout(FM.introT); FM.soft = false; FM.tag = tag || FM.tag;
  if(FM.playing){ FM.switching = true; focusMusicStop(); setTimeout(function(){ FM.switching = false; FM.soft = false; focusMusicPlay(idx); fmQuickIn(); dockRefresh(); }, 700); }
  else { focusMusicPlay(idx); fmQuickIn(); }
  dockRefresh(); return true;
}
// a song starts at full volume (the player's slow fade-in would swallow its opening)
function fmQuickIn(){ const ctx = getAudioCtx(); if(!ctx || !FM.bus) return; const g = FM.bus.g.gain, now = ctx.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.exponentialRampToValueAtTime(Math.max(0.0002, fmVolume()), now + 0.15); }
playLockInSong = (function(base){
  return function(){
    if(lockStartSound()==='chill' && soundOn()){ setTimeout(function(){ fmPlaySong('Lock In', 'lock'); }, 500); return; }
    return base.apply(this, arguments);
  };
})(playLockInSong);
// (the lock-in music doesn't turn the song down)
lockMusicOn = (function(base){ return function(){ if(FM.playing && FOCUS_TRACKS[FM.idx] && FOCUS_TRACKS[FM.idx].special) return; return base.apply(this, arguments); }; })(lockMusicOn);
// short sounds: the music dips under them
function fmDuckFor(ms){
  const ctx = getAudioCtx(); if(!ctx || !FM.playing || !FM.bus) return;
  const g = FM.bus.g.gain, now = ctx.currentTime, v = Math.max(0.0002, g.value);
  g.cancelScheduledValues(now); g.setValueAtTime(v, now); g.exponentialRampToValueAtTime(Math.max(0.0002, v*0.15), now + 0.25);
  clearTimeout(fmDuckFor._t); fmDuckFor._t = setTimeout(function(){ if(typeof fmRamp==='function') fmRamp(1.5); }, ms);
}
function fmDuckWrap(base, ms){ return function(){ fmDuckFor(ms); return base.apply(this, arguments); }; }
playLockOut = fmDuckWrap(playLockOut, 2600); playNight = fmDuckWrap(playNight, 2600); playWorkIntro = fmDuckWrap(playWorkIntro, 5500);
playSessionComplete = fmDuckWrap(playSessionComplete, 2600); playFanfare = fmDuckWrap(playFanfare, 2600);

// ---- 16–17. the Cockpit: its right side has every song you can swap to (Your day is a tab next to it),
// and no Done button (finishing a task belongs to the task list, not the session screen) ----
const FM_VIBE = [['special', 'Lock-in song'], ['lock', 'Deep focus'], ['work', 'Work'], ['morning', 'Morning'], ['dream', 'Dreamy']];
function fmVibe(tr){ for(let i = 0; i < FM_VIBE.length; i++) if(tr[FM_VIBE[i][0]]) return FM_VIBE[i][1]; return 'Focus'; }
function ckSongsInner(){
  const on = FM.playing || FM.switching;
  return FOCUS_TRACKS.map(function(tr, i){
    const cur = on && FM.idx===i;
    return '<button class="ckm-s'+(cur ? ' is-on' : '')+(tr.special ? ' is-special' : '')+'" data-action="fmPick" data-id="'+i+'" title="'+(cur ? 'Pause' : 'Play '+escapeHtml(tr.name))+'">'+
      '<span class="ckm-i">'+(cur ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9654;')+'</span>'+
      '<span class="ckm-n"><b>'+escapeHtml(tr.name)+'</b><small>'+fmVibe(tr)+'</small></span>'+
      (cur ? '<span class="ckm-p">&#10073;&#10073;</span>' : '')+'</button>';
  }).join('');
}
function ckSongsKey(){ return [FM.playing || FM.switching ? 1 : 0, FM.idx].join('|'); }
function ckPane(){ return state.profile.ckpPane==='day' ? 'day' : 'songs'; }
cockpitDayHtml = (function(base){
  return function(){
    const pane = ckPane();
    const tabs = '<div class="ckm-tabs">'+[['songs', '&#9835; Songs'], ['day', 'Your day']].map(function(x){ return '<button class="'+(pane===x[0] ? 'is-on' : '')+'" data-action="ckPaneSet" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
    if(pane==='day') return base.apply(this, arguments).replace(/<div class="ckd-h">[\s\S]*?<\/div>/, tabs);
    const tr = FOCUS_TRACKS[FM.idx], on = FM.playing || FM.switching;
    return '<div class="ckp-day ckd ckm">'+tabs+
      '<div class="ckm-now"><span>'+(on ? 'Now playing' : 'Paused')+'</span><b>'+escapeHtml(tr ? tr.name : '')+'</b></div>'+
      '<div class="ckm-list" id="ckSongs" data-k="'+ckSongsKey()+'">'+ckSongsInner()+'</div>'+
    '</div>';
  };
})(cockpitDayHtml);
cockpitHtml = (function(base){
  return function(){ return base.apply(this, arguments).replace(/<button class="ckx-b is-done" data-action="finishCurrentTask">[\s\S]*?<\/button>/, ''); };
})(cockpitHtml);
ACTIONS.ckPaneSet = function(el, e, id){ state.profile.ckpPane = id==='day' ? 'day' : 'songs'; persist('profile'); playTick(); renderView(); };
ACTIONS.fmPick = function(el, e, id){
  const i = Number(id); if(!(i >= 0 && i < FOCUS_TRACKS.length)) return;
  if((FM.playing || FM.switching) && FM.idx===i){ focusMusicStop(); ckSongsSync(); dockRefresh(); return; }
  const tr = FOCUS_TRACKS[i];
  if(tr.special){ fmPlaySong(tr.name, 'lock'); setTimeout(ckSongsSync, 800); ckSongsSync(); return; }
  // you picked it, so you hear it (not the low lock-in level); it carries on through the list after
  clearTimeout(FM.introT); FM.soft = false; FM.tag = state.focus.activeSession ? 'lock' : 'pick';
  if(FM.playing){ FM.idx = i; FM.bar = 0; FM.switching = true; focusMusicStop(); setTimeout(function(){ FM.switching = false; focusMusicPlay(i); fmQuickIn(); dockRefresh(); ckSongsSync(); }, 700); }
  else { focusMusicPlay(i); fmQuickIn(); }
  ckSongsSync(); dockRefresh();
};
function ckSongsSync(){
  const el = document.getElementById('ckSongs'); if(!el) return;
  const k = ckSongsKey(); if(el.dataset.k===k) return;
  el.dataset.k = k; el.innerHTML = ckSongsInner();
  const tr = FOCUS_TRACKS[FM.idx], now = el.parentNode && el.parentNode.querySelector('.ckm-now');
  if(now && tr) now.innerHTML = '<span>'+(FM.playing || FM.switching ? 'Now playing' : 'Paused')+'</span><b>'+escapeHtml(tr.name)+'</b>';
}
// (the list follows the player: a track that ends, ⏭ or ▶ up top)
setInterval(ckSongsSync, 700);

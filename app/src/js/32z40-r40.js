// ============ ROUND 40 ============

// ---- Personal → You: the card turns over cleanly ----
// The 3D flip blanked out halfway and the back spilled out of the card. Now it turns edge-on, swaps
// faces, and opens back out: the same box both sides, nothing disappears.
ACTIONS.ycFlip = function(el){
  const c = el && el.closest('.ycf'), inn = c && c.querySelector('.ycf-in');
  ui.ycFlip = !ui.ycFlip; playTick();
  if(!c || !inn){ renderView(); return; }
  if(inn._t) clearTimeout(inn._t);
  inn.classList.remove('is-turn-in'); inn.classList.add('is-turn-out');
  inn._t = setTimeout(function(){
    c.classList.toggle('is-flipped', !!ui.ycFlip);
    inn.classList.remove('is-turn-out'); void inn.offsetWidth; inn.classList.add('is-turn-in');
    inn._t = setTimeout(function(){ inn.classList.remove('is-turn-in'); }, 220);
  }, 170);
};
// ---- Discipline: the trend arrow sat in the label and wrapped onto its own line ("▲" between
// Consistency and Action). The number carries it now: green when it's climbing, red when it's slipping ----
renderYouTab = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/ <em class="you-tr (is-up|is-down)" title="([^"]*)">[^<]*<\/em>(<\/span><i>[\s\S]*?<\/i>)<b>/g, function(m0, cls, t, mid){
      return mid+'<b class="you-v-'+(cls==='is-up' ? 'up' : 'down')+'" title="'+t+'">';
    });
  };
})(renderYouTab);

// ---- client cards: one-off deliverables show (open ones to tick off, the last few done ones faded), and
// no "Next step" row ----
clientDelivRowsHtml = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    const ones = arr(c.deliverables).filter(function(d){ return !d.recurring; });
    if(!ones.length) return h;
    const open = ones.filter(function(d){ return d.status!=='done'; }).sort(function(a, b){ return (a.dueDate || '9999').localeCompare(b.dueDate || '9999'); });
    const done = ones.filter(function(d){ return d.status==='done'; }).sort(function(a, b){ return (b.completedAt || '').localeCompare(a.completedAt || ''); }).slice(0, 2);
    const row = function(d){
      const late = d.status!=='done' && d.dueDate && d.dueDate < todayStr();
      return '<div class="cc2-deliv cc2-one'+(d.status==='done' ? ' is-done' : '')+(late ? ' is-late' : '')+'" data-key="dv1-'+c.id+'-'+d.id+'">'+
        '<span class="cc2-deliv-title">'+escapeHtml(d.title || 'Deliverable')+'<small class="cc2-deliv-mo">One-off'+(d.dueDate ? ' &middot; '+(late ? 'was due ' : 'due ')+fmtDateShort(d.dueDate) : '')+(d.status==='done' && d.completedAt ? ' &middot; done '+fmtDateShort(d.completedAt) : '')+'</small></span>'+
        '<button class="cc2-one-ck'+(d.status==='done' ? ' is-on' : '')+'" data-action="oneOffToggle" data-client="'+c.id+'" data-id="'+d.id+'" title="'+(d.status==='done' ? 'Done. Tap to undo' : 'Mark it done')+'">'+(d.status==='done' ? '&#10003;' : '')+'</button>'+
      '</div>';
    };
    const rows = open.concat(done).map(row).join('');
    return h ? h.replace(/<\/div>$/, rows+'</div>') : '<div class="cc2-delivs">'+rows+'</div>';
  };
})(clientDelivRowsHtml);
ACTIONS.oneOffToggle = function(el){
  const c = arr(state.business.clients).find(function(x){ return x.id===el.dataset.client; }); if(!c) return;
  const d = arr(c.deliverables).find(function(x){ return x.id===el.dataset.id; }); if(!d) return;
  const t = d.linkedTaskId ? state.tasks.items.find(function(x){ return x.id===d.linkedTaskId; }) : null;
  if(t && t.master && t.master.kind==='dvw'){ if(d.status==='done') dvwUndo(t); else dvwDone(t); return; }
  if(d.status==='done'){ d.status = 'pending'; d.completedAt = null; } else { d.status = 'done'; d.completedAt = todayStr(); playTaskComplete(); }
  persist('business'); if(typeof masterTasksSync==='function') masterTasksSync(); renderView();
};
clientNextHtml = function(){ return ''; };

// ---- the + on Focus → Tasks: no "A client deliverable" (they're made for you from each client) ----
focusAddMenu = (function(base){
  return function(){ return base.apply(this, arguments).filter(function(x){ return !(x && /A client deliverable/.test(x[1])); }); };
})(focusAddMenu);

// ---- work mode and the clock-out pages: a deliverable task says whose and what ("Brothers Mechanical:
// 4 reels, week 1"), not "16 Reels 1/4" ----
function taskNiceTitle(t){
  if(!t || !t.master || t.master.kind!=='dvw' || typeof dvwView!=='function') return t ? t.title : '';
  const v = dvwView(t); if(!v) return t.title;
  return v.x.oneOff ? v.who+': '+v.name : v.who+': '+v.pieces+', week '+v.x.k;
}
function niceTitlePairs(){
  return state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dvw' && t.title; }).map(function(t){ return [t.title, taskNiceTitle(t)]; })
    .filter(function(p){ return p[1] && p[1]!==p[0]; }).sort(function(a, b){ return b[0].length - a[0].length; });
}
function niceTitlesHtml(h){
  if(typeof h!=='string' || !h) return h;
  niceTitlePairs().forEach(function(p){ const a = escapeHtml(p[0]); if(h.indexOf(a) >= 0) h = h.split(a).join(escapeHtml(p[1])); });
  return h;
}
function niceTitlesIn(root){
  if(!root) return;
  const pairs = niceTitlePairs(); if(!pairs.length) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while((n = w.nextNode())){
    let v = n.nodeValue; if(!v || v.length < 3) continue;
    pairs.forEach(function(p){ if(v.indexOf(p[0]) >= 0 && v.indexOf(p[1]) < 0) v = v.split(p[0]).join(p[1]); });
    if(v!==n.nodeValue) n.nodeValue = v;
  }
}
const NICE_SPOTS = '#planOverlay, #lockSeqOverlay, #windOverlay, #recapOverlay, #stopFocusOverlay, #timesUpOverlay, #viewRoot .np, #viewRoot .rest-full';
function niceTitlesSweep(){ document.querySelectorAll(NICE_SPOTS).forEach(function(el){ if(!el.classList.contains('hidden')) niceTitlesIn(el); }); }
['renderPlanRevealInto', 'renderLockSeqInto', 'renderRecapInto', 'renderStopFocusModalInto'].forEach(function(k){
  if(typeof window[k]!=='function') return;
  const base = window[k];
  window[k] = function(){ const r = base.apply(this, arguments); try{ niceTitlesSweep(); }catch(e){} return r; };
});
windHtml = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(windHtml);
renderLockedMinimal = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderLockedMinimal);
renderFocusMinimal = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderFocusMinimal);
renderWeekendOffView = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderWeekendOffView);
afterRenderHooks.push(function(){ try{ niceTitlesSweep(); }catch(e){} });
setInterval(function(){ try{ niceTitlesSweep(); }catch(e){} }, 1500);

// ---- the lock-out screen, rebuilt ----
// It was a long list nobody read. Now it's one screen: how long you've been at it, one reason you're
// doing this (from your own "why"), a line about working hard, what's left, and the way out takes a
// press-and-hold (the friction), not a click. "Keep going" is the big button; "+10 min" for one more push.
const LOCKOUT_QUOTES = [
  ['Work like there is someone working twenty-four hours a day to take it all away from you.', 'Mark Cuban'],
  ['The difference between ordinary and extraordinary is that little extra.', 'Jimmy Johnson'],
  ['Don’t stop when you’re tired. Stop when you’re done.', 'David Goggins'],
  ['Hard work beats talent when talent doesn’t work hard.', 'Tim Notke'],
  ['The dream is free. The hustle is sold separately.', ''],
  ['You don’t get what you wish for. You get what you work for.', ''],
  ['When you think you’re done, you’re only at 40% of what your body is capable of.', 'David Goggins'],
  ['Success isn’t owed. It’s leased, and rent is due every day.', 'Rory Vaden'],
  ['Discipline is doing what needs to be done, even if you don’t want to do it.', ''],
  ['The last ten minutes are where the people who win separate from the people who almost did.', ''],
  ['Nobody cares. Work harder.', 'Cameron Hanes'],
  ['Great things are done by a series of small things brought together.', 'Vincent van Gogh'],
  ['If it were easy, everyone would do it.', ''],
  ['Pain is temporary. Quitting lasts forever.', 'Lance Armstrong'],
  ['Max out the day. Tomorrow you’ll be glad you did.', '']
];
function lockoutPick(list, key){ ui.loPick = ui.loPick || {}; if(ui.loPick[key]==null || ui.loPick[key] >= list.length) ui.loPick[key] = Math.floor(Math.random()*Math.max(1, list.length)); return list[ui.loPick[key]]; }
renderStopFocusModal = function(){
  const as = state.focus.activeSession; if(!as) return '';
  const mins = Math.max(0, Math.round((Date.now() - as.startedAt)/60000) - Math.round(arr(as.breaks).reduce(function(a, b){ return a + Math.max(0, (b.endedAt || Date.now()) - (b.startedAt || Date.now())); }, 0)/60000));
  const toward = arr(state.focus.motivations && state.focus.motivations.toward), away = arr(state.focus.motivations && state.focus.motivations.away);
  const why = toward.length ? lockoutPick(toward, 'why') : null, avoid = away.length ? lockoutPick(away, 'avoid') : null;
  const q = lockoutPick(LOCKOUT_QUOTES, 'q');
  const left = state.tasks.items.filter(function(t){ return t.status==='today' && !(typeof isOngoingDoneToday==='function' && isOngoingDoneToday(t)); });
  const done = arr(as.completedTasks).length, dw = typeof deepWorkMinutesTodayLive==='function' ? deepWorkMinutesTodayLive() : 0, target = state.standards.deepWorkTargetMinutes || 180;
  const next = left[0];
  return '<div class="lo">'+
    '<div class="lo-k">&#128274; Locking out?</div>'+
    '<div class="lo-time"><b>'+fmtDurationLabel(mins)+'</b><span>this session'+(done ? ' &middot; '+done+' done' : '')+'</span></div>'+
    '<div class="lo-bar"><i style="width:'+Math.min(100, dw/target*100).toFixed(1)+'%"></i></div>'+
    '<div class="lo-day">'+fmtDurationLabel(dw)+' of '+fmtDurationLabel(target)+' today'+(dw >= target ? ' &middot; target hit' : ' &middot; '+fmtDurationLabel(target - dw)+' to go')+'</div>'+
    (why || avoid ? '<div class="lo-why"><small>Remember why</small>'+(why ? '<b>'+escapeHtml(why.text)+'</b>' : '')+(avoid ? '<span>Not: '+escapeHtml(avoid.text)+'</span>' : '')+'</div>' : '')+
    '<figure class="lo-q"><blockquote>'+escapeHtml(q[0])+'</blockquote>'+(q[1] ? '<figcaption>'+escapeHtml(q[1])+'</figcaption>' : '')+'</figure>'+
    (left.length ? '<div class="lo-left">'+left.length+' left today'+(next ? ' &middot; next: <b>'+escapeHtml(taskNiceTitle(next))+'</b>' : '')+'</div>' : '<div class="lo-left is-clear">&#10003; Today’s list is clear.</div>')+
    '<div class="lo-btns"><button class="lo-go" data-action="cancelStopFocus">Keep going</button><button class="lo-more" data-action="lockoutMore">+10 min</button></div>'+
    '<button class="lo-hold" id="loHold" title="Press and hold to lock out"><i></i><span>Hold to lock out</span></button>'+
  '</div>';
};
openStopFocus = (function(base){
  return function(){ ui.loPick = null; const o = document.getElementById('stopFocusOverlay'); if(o) o.classList.add('lo-ov'); return base.apply(this, arguments); };
})(openStopFocus);
ACTIONS.lockoutMore = function(){
  const as = state.focus.activeSession; if(!as) return;
  as.plannedMinutes = Math.round((Date.now() - as.startedAt)/60000) + 10; persist('focus');
  closeStopFocus(); playTick(); renderView();
  showToast('Ten more minutes. Then you can go.', {icon:'&#9201;'});
};
(function(){
  let t0 = 0, raf = 0, btn = null;
  const HOLD = 1600;
  const stop = function(){ cancelAnimationFrame(raf); if(btn){ btn.classList.remove('is-holding'); btn.style.setProperty('--p', 0); } btn = null; t0 = 0; };
  const tick = function(){
    if(!btn) return;
    const p = Math.min(1, (Date.now() - t0)/HOLD); btn.style.setProperty('--p', p);
    if(p >= 1){ stop(); closeStopFocus(); reallyConfirmStopFocus(); return; }
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('pointerdown', function(e){ const b = e.target.closest && e.target.closest('#loHold'); if(!b) return; e.preventDefault(); btn = b; t0 = Date.now(); b.classList.add('is-holding'); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(k){ document.addEventListener(k, function(e){ if(btn && (k!=='pointerleave' || e.target===btn)) stop(); }, true); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && overlayOpen('stopFocusOverlay')){ closeStopFocus(); } });
})();

// ---- Op hears all of a long message ----
// He stopped at 60 seconds and after a short pause, and quiet words counted as silence, so long thoughts
// got cut off. Now: up to 5 minutes, the pause he waits out grows the longer you've been talking (up to
// ~3.5 s more), quieter speech still counts once you've started, and a long clip gets the time it needs
// to be sent and written out. Tap the mic any time to send it right away.
scribeListen = async function(cap){
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
  let floor = 0.006, spoke = false, lastLoud = Date.now(), why = null, talked = 0; AI._longWarn = false;
  const t0 = Date.now();
  const finish = function(reason){ if(why) return; why = reason; clearInterval(tick); try{ if(rec.state!=='inactive') rec.stop(); }catch(e){ rec.onstop(); } };
  AI.sendNow = function(){ finish('send'); };
  AI.cancelListen = function(){ finish('cancel'); };
  const tick = setInterval(function(){
    let rms = 0;
    if(an){ an.getFloatTimeDomainData(buf); let s = 0; for(let i = 0; i < buf.length; i++) s += buf[i]*buf[i]; rms = Math.sqrt(s/buf.length); }
    SCR.level = rms;
    if(!spoke) floor = floor*0.94 + Math.min(rms, 0.04)*0.06;
    // (once you've started, quieter speech still counts as talking)
    const loud = spoke ? Math.max(0.008, floor*2) : Math.max(0.014, floor*3);
    if(rms > loud){ if(spoke) talked += 100; lastLoud = Date.now(); if(!spoke && Date.now() - t0 > 120){ spoke = true; opCaption('Listening… take your time'); } }
    // the longer you talk, the longer a pause he waits out (thinking mid-thought isn't the end)
    const pause = (typeof opPauseMs==='function' ? opPauseMs() : 2500) + Math.min(3500, talked*0.12);
    if(spoke && Date.now() - lastLoud > pause) finish('send');
    else if(!spoke && Date.now() - t0 > (an ? 9000 : 6000)) finish(an ? 'silence' : 'send');
    else if(Date.now() - t0 > 300000) finish('send');
    else if(spoke && Date.now() - t0 > 240000 && !AI._longWarn){ AI._longWarn = true; opCaption('Still listening… (tap the mic to send)'); }
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
};
scribeText = (function(base){
  return async function(blob, mime){
    const big = blob && blob.size > 600000;
    if(!big) return base.apply(this, arguments);
    const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, 140000);
    try{
      const r = await fetch(WAKE_HELPER+'stt', {method:'POST', body:blob, headers:{'Content-Type':mime || 'audio/webm'}, signal:ctl.signal});
      let j = null; try{ j = await r.json(); }catch(e){}
      if(!r.ok) throw new Error((j && (j.detail && (j.detail.message || j.detail.status) || j.error)) || 'ElevenLabs said no ('+r.status+')');
      return String((j && j.text) || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    } finally { clearTimeout(tm); }
  };
})(scribeText);

// ---- Op knows what time it is ----
// He'd talk work at 10 PM. Now he's told the time, your work hours and when bed is (from tomorrow's
// alarm and your sleep goal): in work hours work is fair game; after them he doesn't bring work up
// himself; in the last couple of hours before bed (or past it) he steers you toward winding down and
// sleep. His own work check-ins and nudges stay inside the day too.
function opBedTs(){
  const nw = typeof nextWake==='function' ? nextWake() : null; if(!nw || !nw.ts) return null;
  const hrs = Number(state.profile.sleepGoalHours) || 8;
  return nw.ts - hrs*3600000;
}
function opTimeCtx(){
  const now = new Date(), m = now.getHours()*60 + now.getMinutes();
  const phase = typeof workPhase==='function' ? workPhase() : 'off';
  const bed = opBedTs(), toBed = bed ? Math.round((bed - Date.now())/60000) : null;
  const evening = m >= 20*60 + 30 || m < 5*60;
  const late = phase!=='work' && phase!=='lunch' && phase!=='break' && (evening || (toBed!=null && toBed < 150));
  const pastBed = toBed!=null && toBed < 0 && toBed > -360;
  return {now:now, m:m, phase:phase, bed:bed, toBed:toBed, late:late, pastBed:pastBed};
}
function opLateNow(){ try{ return opTimeCtx().late; }catch(e){ return false; } }
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    try{
      const c = opTimeCtx(), w = typeof workToday==='function' ? workToday() : null;
      const t = c.now.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+' on '+c.now.toLocaleDateString(undefined, {weekday:'long'});
      const hours = w && w.enabled && typeof workDayToday==='function' && workDayToday() ? 'Work hours today: '+fmt12Hour(w.start)+' to '+fmt12Hour(w.end)+' (right now: '+({before:'before work', after:'work is over for the day', lunch:'lunch', break:'his break', work:'work hours', off:'not a work day'})[c.phase]+').' : 'Not a work day, or no work hours set.';
      const bed = c.bed ? 'Bedtime for tomorrow’s alarm: about '+new Date(c.bed).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+(c.toBed!=null ? (c.toBed >= 0 ? ' ('+fmtDurationLabel(c.toBed)+' from now)' : ' (that was '+fmtDurationLabel(-c.toBed)+' ago)') : '')+'.' : '';
      const block = 'The time, and what it means (always keep this in mind):\n'+
        '- It’s '+t+'. '+hours+' '+bed+'\n'+
        '- During work hours, work is fair game: push, plan, hold him to it.\n'+
        '- Outside work hours, don’t bring up work, tasks, clients, leads or lock-ins yourself. If he brings work up, help briefly, then suggest it waits for tomorrow’s work block (offer to put it on tomorrow’s list).\n'+
        '- In the last couple of hours before bedtime, steer toward winding down: the wind-down, screens off, tomorrow’s alarm, sleep. Past bedtime, tell him plainly (kind, firm) to go to sleep; sleep is part of the work.\n'+
        '- Before work hours in the morning, keep work talk for when the day starts unless he starts it.'+
        (c.late ? '\n- Right now it’s late: lead with winding down and sleep, not work.' : '');
      if(Array.isArray(s)) s.push({type:'text', text:block});
    }catch(e){}
    return s;
  };
})(aiSystem);
// his own work check-ins and nudges: never late in the evening
acctPing = (function(base){ return function(){ if(opLateNow()){ if(typeof acctSchedule==='function') acctSchedule(); return; } return base.apply(this, arguments); }; })(acctPing);
opNudgeDue = (function(base){ return function(){ if(opLateNow()) return false; return base.apply(this, arguments); }; })(opNudgeDue);
if(typeof maybeNudgeLockIn==='function') maybeNudgeLockIn = (function(base){ return function(){ if(opLateNow()) return; return base.apply(this, arguments); }; })(maybeNudgeLockIn);

// ---- music volume in the minimal views ----
// The little player on the full-screen pages (locked in, Good morning, work mode) gets a speaker: hover it
// (or tab to it) and a slider slides out. The Cockpit's song list has one under "Now playing". Same setting
// as everywhere else.
mctlHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    return h.replace(/<\/span>$/, '<span class="mctl-vol" title="Volume"><span class="mctl-vi">'+musicVolIcon()+'</span>'+musicVolSliderHtml('is-mctl')+'</span></span>');
  };
})(mctlHtml);
cockpitDayHtml = (function(base){
  return function(){ return base.apply(this, arguments).replace(/(<div class="ckm-now">[\s\S]*?<\/div>)/, '$1'+'<div class="ckm-vol"><span class="ckm-vi">'+musicVolIcon()+'</span>'+musicVolSliderHtml('is-ck')+'</div>'); };
})(cockpitDayHtml);
setInterval(function(){ try{ musicVolSync(); const p = musicVolPct(); document.querySelectorAll('.mctl-vi, .ckm-vi').forEach(function(e){ const ic = musicVolIcon(p); if(e.innerHTML!==ic) e.innerHTML = ic; }); }catch(e){} }, 800);
// (the Player: a slider right under its buttons)
renderLockedMinimal = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(lockedStyle()==='cockpit' || h.indexOf('class="np-ctl"') < 0 || h.indexOf('np-vol') >= 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const ctl = tpl.content.querySelector('.np-ctl'); if(!ctl) return h;
    const v = document.createElement('div'); v.className = 'np-vol'; v.innerHTML = '<span class="ckm-vi">'+musicVolIcon()+'</span>'+musicVolSliderHtml('is-npv');
    ctl.parentNode.insertBefore(v, ctl.nextSibling);
    return tpl.innerHTML;
  };
})(renderLockedMinimal);

// ---- locked-in Overview: "Worth doing soon" and "Clients", redone ----
// Clean cards like the rest of the app: compact rows (a priority dot, the task, who it's for, when it's
// due, one tap to put it on today) and client tiles (health, each deliverable's week as a meter, last touch).
function llLastTouch(c){
  let last = '';
  arr(c.touchpoints).concat(arr(c.touches)).forEach(function(t){ const d = typeof t==='string' ? t : t && t.date; if(d && d > last) last = d; });
  return last;
}
function llAgo(d){ if(!d) return 'never'; const n = Math.round((Date.parse(todayStr()) - Date.parse(d))/86400000); return n<=0 ? 'today' : n===1 ? 'yesterday' : n+'d ago'; }
LOCKED_BLOCKS.backlog.render = function(c){
  const list = c.backlog.slice(0, 7), more = c.backlog.length - list.length;
  const pri = {high:'#E5484D', med:'#E8A23D', low:'#6b7280'};
  return '<section class="llx"><div class="llx-h"><b>Worth doing soon</b><span class="llx-n">'+c.backlog.length+'</span><span style="flex:1"></span><button class="llx-link" data-action="nav" data-view="focus" data-tab="tasks">Backlog &rarr;</button></div>'+
    (list.length ? '<div class="llx-rows">'+list.map(function(t){
      const v = t.master && t.master.kind==='dvw' && typeof dvwView==='function' ? dvwView(t) : null;
      const who = v ? v.who : (t.clients && t.clients[0] ? (arr(state.business.clients).find(function(x){ return x.id===t.clients[0]; }) || {}).business : '');
      const late = t.deadline && t.deadline < todayStr();
      return '<div class="llx-row'+(v ? ' is-dlv' : '')+'">'+
        '<i class="llx-dot" style="background:'+(v ? '#a98bff' : (pri[t.priority] || pri.med))+'"></i>'+
        '<span class="llx-t">'+escapeHtml(v ? (v.x.oneOff ? v.name : v.pieces) : t.title)+(v && !v.x.oneOff ? '<em>Week '+v.x.k+'</em>' : '')+'</span>'+
        (who ? '<span class="llx-who">'+escapeHtml(who)+'</span>' : '')+
        (t.deadline ? '<span class="llx-due'+(late ? ' is-late' : '')+'">'+(late ? 'was ' : '')+fmtDateShort(t.deadline)+'</span>' : '')+
        '<button class="llx-go" data-action="promoteTask" data-id="'+t.id+'" title="Put it on today">&rarr; Today</button></div>';
    }).join('')+'</div>'+(more > 0 ? '<div class="llx-more">+'+more+' more in your backlog</div>' : '') : '<div class="llx-empty">Nothing waiting. Clean slate.</div>')+
  '</section>';
};
LOCKED_BLOCKS.clients.render = function(c){
  const cs = c.activeClients;
  const hl = {green:['#3FBE8E', 'Healthy'], yellow:['#E8A23D', 'On pace'], red:['#E5484D', 'Needs you']};
  return '<section class="llx"><div class="llx-h"><b>Clients</b><span class="llx-n">'+cs.length+'</span><span style="flex:1"></span><button class="llx-link" data-action="nav" data-view="business" data-tab="clients">All clients &rarr;</button></div>'+
    (cs.length ? '<div class="llx-cl">'+cs.map(function(x){
      const st = clientHealthStatus(x), h = hl[st.level] || hl.green, last = llLastTouch(x);
      const recs = arr(x.deliverables).filter(function(d){ return d.recurring; });
      return '<button class="llx-c" data-action="openContact" data-kind="client" data-id="'+x.id+'" style="--hc:'+h[0]+'">'+
        '<span class="llx-c-top"><span class="llx-av" style="background:'+clientColor(x)+'">'+escapeHtml(clientInitials(x))+'</span><span class="llx-c-n"><b>'+escapeHtml(x.business || x.name)+'</b><small><i></i>'+h[1]+' &middot; touched '+llAgo(last)+'</small></span></span>'+
        (recs.length ? '<span class="llx-c-d">'+recs.slice(0, 3).map(function(d){
          const done = deliverableWeekCount(d), need = Math.max(1, deliverableWeekNeed(d));
          return '<span class="llx-dv"><span>'+escapeHtml(d.title)+'</span><i><u style="width:'+Math.min(100, done/need*100).toFixed(0)+'%"></u></i><b>'+done+'/'+need+'</b></span>';
        }).join('')+'</span>' : '<span class="llx-c-none">No weekly deliverables</span>')+
      '</button>';
    }).join('')+'</div>' : '<div class="llx-empty">No active clients yet.</div>')+
  '</section>';
};

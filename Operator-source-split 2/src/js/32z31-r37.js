// ============ ROUND 37: ADD IT BACK, A QUIET MIC, OP THAT ANSWERS, SKILLS DONE FOR THE DAY, MINIMAL VIEWS ============

// ---- "Add it back" counts the time; it doesn't lock you back in ----
// It used to reopen the session as if you'd never left: you were locked in again with nothing going on,
// so the away check stopped it a minute later and offered "Add it back" again, round and round. Now the
// stopped session just runs to the moment you came back (or now), it's marked checked, and that's it.
// If you're still working, auto lock-in (or LOCK IN) picks it up from here.
ACTIONS.restoreAwaySession = function(){
  const a = state.focus.awayStop; if(!a) return;
  const now = Date.now(), x = state.focus.sessions.find(function(s){ return s.id===a.sessionId; });
  const until = Math.max(a.endedAt, now);
  state.focus.awayStop = null;
  clearToasts();
  if(!x){ persist('focus'); renderView(); return; }
  // (a session that's running now, started after the stop, takes the time instead: one stretch, no overlap)
  const live = state.focus.activeSession;
  if(live && live.startedAt >= x.startedAt){
    live.startedAt = x.startedAt;
    state.focus.sessions = state.focus.sessions.filter(function(s){ return s.id!==x.id; });
  } else {
    x.endedAt = until; x.minutes = Math.max(1, Math.round((until - x.startedAt)/60000));
    x.away = false; x.addedBack = true; x.reviewed = true;
  }
  state.focus.lastSessionEndedAt = Math.max(state.focus.lastSessionEndedAt || 0, until);
  persist('focus'); renderView();
  showToast('Added back: '+fmtDurationLabel(Math.max(1, Math.round((until - a.endedAt)/60000)))+' counted, '+fmt12Hour(nowHM(new Date(x.startedAt)))+' to '+fmt12Hour(nowHM(new Date(until)))+'.', {icon:'&#9989;'});
};

// ---- the "Operator" ear only listens while Operator is the app in front ----
// (round 36 let it listen whenever the window was showing. An open mic makes macOS turn every other app
// down, so Premiere went quiet while you worked. Now it lets go the moment you click into another app.)
heyQuietNow = (function(base){
  return function(){ return base.apply(this, arguments) || !document.hasFocus(); };
})(heyQuietNow);
window.addEventListener('blur', function(){ try{ if(typeof heyStop==='function') heyStop(); }catch(e){} });
document.addEventListener('visibilitychange', function(){ if(document.hidden){ try{ if(typeof heyStop==='function') heyStop(); }catch(e){} } });

// ---- Op never gets stuck thinking, and he never ignores you ----
// • Every call to his brain has a time limit (25 s), and the whole answer has a budget (70 s).
// • While he's thinking there's a Stop button by his light (and on his screen).
// • Talking (or typing) while he's thinking drops the old question and takes the new one. It used to
//   be thrown away silently, which is the "ignoring me".
// • His voice can't hold things up: if the audio never finishes, he moves on.
AI.cancelGen = 0;
function aiCancelNow(silent){
  if(!AI.busy) return;
  AI.cancelGen++; AI.cancelled = true;
  const rs = AI._cancelers || []; AI._cancelers = []; rs.forEach(function(r){ r({ok:false, status:0, j:null, cancelled:true}); });
  try{ opStop(); }catch(e){}
  if(!silent) try{ opCaption('Okay, dropped it.'); }catch(e){}
}
aiCall = (function(base){
  return function(req){
    const cancelP = new Promise(function(res){ (AI._cancelers = AI._cancelers || []).push(res); });
    const timeP = new Promise(function(res){ setTimeout(function(){ res({ok:false, status:0, j:{error:{message:'that took too long'}}, timedOut:true}); }, 25000); });
    if(AI.cancelled) return Promise.resolve({ok:false, status:0, j:null, cancelled:true});
    return Promise.race([base.apply(this, arguments), cancelP, timeP]);
  };
})(aiCall);
aiErrLine = (function(base){
  return function(res){
    if(res && res.cancelled) return 'Okay, dropped it.';
    if(res && res.timedOut) return 'That took me too long. Say it again?';
    return base.apply(this, arguments);
  };
})(aiErrLine);
opSay = (function(base){
  return function(text){
    const p = base.apply(this, arguments);
    if(!AI.busy) return p;
    const words = String(text||'').split(/\s+/).length, cap = Math.max(8000, words*550 + 5000);
    return Promise.race([p, new Promise(function(res){ setTimeout(res, cap); })]);
  };
})(opSay);
aiAsk = (function(base){
  return function(text){
    text = String(text||'').trim(); if(!text) return;
    const self = this, args = arguments;
    if(AI.busy){
      // the new thing you said wins: drop the old question, then ask this one
      aiCancelNow(true);
      return new Promise(function(done){
        const t0 = Date.now();
        (function wait(){ if(!AI.busy || Date.now() - t0 > 3000){ AI.busy = false; AI.cancelled = false; done(base.apply(self, args)); } else setTimeout(wait, 60); })();
      });
    }
    AI.cancelled = false;
    const gen = AI.cancelGen, t0 = Date.now();
    const watch = setInterval(function(){ if(!AI.busy || AI.cancelGen!==gen){ clearInterval(watch); return; } if(Date.now() - t0 > 70000){ clearInterval(watch); aiCancelNow(true); opCaption('That took me too long. Say it again?'); } }, 1000);
    return Promise.resolve(base.apply(this, arguments)).finally(function(){ clearInterval(watch); AI.cancelled = false; });
  };
})(aiAsk);
ACTIONS.opCancelThink = function(){ aiCancelNow(false); };
// the Stop button: by his light, and on his screen
(function(){
  let el = null, since = 0;
  setInterval(function(){
    const on = !!AI.busy && !AI.listening;
    if(on && !since) since = Date.now(); if(!on) since = 0;
    const show = on && Date.now() - since > 1200;
    if(show && !el){ el = document.createElement('button'); el.id = 'opThink'; el.className = 'op-think'; el.dataset.action = 'opCancelThink'; el.innerHTML = '<i></i><span>Thinking</span><b>&#10005; Stop</b>'; document.body.appendChild(el); requestAnimationFrame(function(){ if(el) el.classList.add('is-in'); }); }
    else if(!show && el){ const x = el; el = null; x.classList.remove('is-in'); setTimeout(function(){ x.remove(); }, 250); }
  }, 250);
})();

// ---- "start a work block, do the 90-20": lock in with a work method ----
(function(){
  const t = OP_TOOLS.find(function(x){ return x.name==='lock_in'; });
  if(t){
    t.description = 'Start a deep work session (lock in) now: optionally for a number of minutes, on a task by name, and with a work method. Methods: pomodoro (25 on / 5 off), 5217 (52 on / 17 off), ultradian (90 on / 20 off, "the 90-20"), flow (Flowtime, no timer), done (until the task is done), block (one stretch). If he names a method, use it; minutes only go with block.';
    t.input_schema.properties.method = {type:'string', enum:['block', 'pomodoro', '5217', 'ultradian', 'flow', 'done']};
  }
})();
opRunTool = (function(base){
  return function(name, x){
    if(name==='lock_in' && x && x.method && LOCK_METHODS[x.method] && !state.focus.activeSession){
      ui.pendingLockMethod = {id:x.method, taskId:null};
      try{ const out = base.apply(this, arguments); return out+(x.method!=='block' ? ' ('+LOCK_METHODS[x.method].label+')' : ''); }
      finally{ ui.pendingLockMethod = null; }
    }
    return base.apply(this, arguments);
  };
})(opRunTool);

// ---- skills and ongoing tasks: done for today means done for today, everywhere ----
// They don't get status "done" (they come back tomorrow); they get today's date in ongoingDoneDates.
// Most of the app only looked at status, so a skill you'd finished still sat on Op's list, in the
// counts and in "up next". The plan everyone reads from now shows them as done for the day (a view on
// the task: nothing is changed on it).
function taskDoneToday(t){ return !!t && (t.status==='done' ? t.completedAt===todayStr() : isOngoingDoneToday(t)); }
function taskOpenToday(t){ return !!t && t.status==='today' && !isOngoingDoneToday(t); }
todaysPlan = (function(base){
  return function(){
    return base.apply(this, arguments).map(function(t){
      if(!t || !isOngoingDoneToday(t)) return t;
      return Object.create(t, {status:{value:'done', enumerable:true, writable:true}, completedAt:{value:todayStr(), enumerable:true, writable:true}, _ongoingView:{value:true}});
    });
  };
})(todaysPlan);

// ---- Today has its own full-screen view, locked in or not ----
// Not locked in: the clock, your level, the streak, today's deep work and LOCK IN (the same view Focus
// has). A "Minimal" chip sits by the name in the hero, and M works on Today.
renderToday = (function(base){
  return function(){
    const as = state.focus.activeSession, m = state.modes.active;
    if(!as && !m && focusMinimalOn() && typeof renderFocusMinimal==='function') return renderFocusMinimal();
    const h = base.apply(this, arguments);
    if(as || m) return h;
    return h.replace(/(<div class="th-biz">[\s\S]*?<\/div>)/, '<div class="th-bizrow">$1<button class="th-min" data-action="toggleFocusMinimal" title="Full-screen view (M)">&#9673; Minimal</button></div>');
  };
})(renderToday);
afterRenderHooks.push(function(){
  if(ui.view==='today' && !state.focus.activeSession && focusMinimalOn() && document.querySelector('#viewRoot .np-home')) document.body.classList.add('np-on');
});
document.addEventListener('keydown', function(e){
  if(e.key!=='m' && e.key!=='M') return;
  if(e.metaKey || e.ctrlKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || (e.target && e.target.isContentEditable)) return;
  if(ui.view!=='today' || state.focus.activeSession || state.modes.active || document.querySelector('.overlay:not(.hidden)')) return;
  e.preventDefault(); e.stopImmediatePropagation(); ACTIONS.toggleFocusMinimal();
}, true);

// ---- the minimal views' timers: one clock, the one that matters ----
// A work method (Pomodoro, 52/17, 90/20): the big number counts down the round; the line under the
// title says the round and when the break is (a time, not a second countdown), and what you've done
// in all sits small on the right. A break: the big number is the time left. The timer faces (ring,
// dots, fill…) follow the same rule. The Cockpit has its own break view now (it used to drop back
// to the Player while you were on a break).
function npMethodLine(st){
  const m = st && st.m; if(!m || !m.work || st.onBreak) return st ? methodLine(st) : '';
  return 'Round '+st.round+(m.rounds ? ' of '+m.rounds : '')+' &middot; '+(st.last ? 'last round, done at ' : 'break at ')+'<b>'+fmtTimeShort(Date.now() + st.left)+'</b>';
}
tickMethodStrip = (function(base){
  return function(){
    base.apply(this, arguments);
    const line = document.getElementById('msLine'); if(!line || !line.closest('.np')) return;
    const st = methodState(); if(!st) return;
    const html = npMethodLine(st); if(line.innerHTML!==html) line.innerHTML = html;
  };
})(tickMethodStrip);
timerTick = (function(base){
  return function(){
    const as = state.focus.activeSession; if(!as) return;
    if(as.onBreak){
      const b = as.breaks[as.breaks.length-1] || {}, left = as.breakEndsAt ? Math.max(0, as.breakEndsAt - Date.now()) : null, total = b.minutes ? b.minutes*60000 : null;
      document.querySelectorAll('.tm').forEach(function(tm){
        const arc = tm.querySelector('.tm-arc'); if(arc && total && left!=null) arc.style.strokeDashoffset = String(100 - (1 - left/total)*100);
        const t = tm.querySelector('.tm-t'); if(t) t.textContent = left!=null ? formatElapsed(left) : formatElapsed(Date.now() - (as.breakStartedAt || Date.now()));
      });
      return;
    }
    base.apply(this, arguments);
    const st = typeof methodState==='function' ? methodState() : null;
    if(st && st.m && st.m.work && st.left!=null) document.querySelectorAll('.tm').forEach(function(tm){
      const arc = tm.querySelector('.tm-arc'); if(arc) arc.style.strokeDashoffset = String(100 - (st.frac||0)*100);
      const t = tm.querySelector('.tm-t'); if(t) t.textContent = formatElapsed(st.left);
    });
  };
})(timerTick);
setInterval(function(){
  const el = document.getElementById('npBig'); if(!el) return;
  const st = typeof methodState==='function' ? methodState() : null;
  if(st && st.left!=null && !st.onBreak){ const v = formatElapsed(st.left); if(el.textContent!==v) el.textContent = v; }
}, 500);
renderLockedMinimal = (function(base){
  return function(){
    const as = state.focus.activeSession;
    // the Cockpit on a break
    if(lockedStyle()==='cockpit' && as && as.onBreak){
      setTimeout(function(){ if(typeof timerTick==='function') timerTick(); }, 20);
      return '<div class="np np-locked is-cockpit is-break">'+
        '<div class="np-bg"></div>'+
        '<div class="np-top">'+npClockHtml()+'<span style="flex:1"></span>'+(typeof mctlHtml==='function' ? mctlHtml('mctl-np') : '')+lockedViewBtnHtml()+'</div>'+
        '<div class="np-main">'+cockpitHtml()+'</div>'+
      '</div>';
    }
    let h = base.apply(this, arguments);
    if(!as) return h;
    const st = typeof methodState==='function' ? methodState() : null;
    if(st) h = h.replace(/(<span id="msLine">)[\s\S]*?(<\/span>)/, function(m0, a, z){ return a+npMethodLine(st)+z; });
    // (the Player: a round counts down big; all you've done sits small on the right)
    if(!as.onBreak && st && st.m && st.m.work && st.left!=null)
      h = h.replace(/<div class="np-times"><span id="focusElapsed">([^<]*)<\/span><span>[^<]*<\/span><\/div>/, function(m0, el){ return '<div class="np-times is-round"><span id="npBig">'+formatElapsed(st.left)+'</span><span class="np-el"><span id="focusElapsed">'+el+'</span> in</span></div>'; });
    return h;
  };
})(renderLockedMinimal);

// ---- the locked-in minimal view: switch Player ↔ Cockpit right there ----
renderLockedMinimal = (function(base){
  return function(){
    const h = base.apply(this, arguments), ck = lockedStyle()==='cockpit';
    const sw = '<button class="lv-btn lv-sty" data-action="lockedStyleSet" data-id="'+(ck ? 'player' : 'cockpit')+'" title="Switch to the '+(ck ? 'Player' : 'Cockpit')+' view">'+(ck ? '&#9654; Player' : '&#9680; Cockpit')+'</button>';
    return h.replace(/(<button class="lv-btn" data-action="toggleLockedView"[^>]*>[\s\S]*?<\/button>)/, '$1'+sw);
  };
})(renderLockedMinimal);
// (the Cockpit: deep work in hours and minutes, and skills done for the day count as done)
cockpitHtml = (function(base){
  return function(){
    const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180;
    const done = state.tasks.items.filter(function(t){ return taskDoneToday(t); }).length;
    return base.apply(this, arguments)
      .replace(/(<span>Deep work<\/span><b>)[^<]*(<small>) \/ [^<]*(<\/small>)/, '$1'+fmtDurationLabel(dw)+'$2 / '+fmtDurationLabel(target)+'$3')
      .replace(/(<span>Tasks done<\/span><b>)\d+/, '$1'+done);
  };
})(cockpitHtml);

// ---- Standing with Op: hover it for the breakdown ----
// Each part with its weight and a bar, the weakest link called out, and what would move it.
function opStandingDetail(){
  const today = todayStr(), from7 = addDays(today, -6);
  const a = typeof acctScore==='function' ? acctScore() : null;
  const prods = typeof acct==='function' ? acct().log.filter(function(x){ return x.prod && x.date >= from7; }) : [];
  const pAvg = prods.length ? prods.reduce(function(s, x){ return s + x.prod; }, 0)/prods.length : null;
  const k = typeof opKeptWeek==='function' ? opKeptWeek() : {made:0, kept:0};
  const target = state.standards.deepWorkTargetMinutes || 180;
  let on = 0, worked = 0; for(let i = 1; i <= 7; i++){ const d = addDays(today, -i); if(isDayOff(d)) continue; worked++; if(deepWorkMinutesFor(d) >= target) on++; }
  const parts = [
    {key:'checkins', label:'Check-ins', w:35, f:a, val:a==null ? 'none yet' : Math.round(a*100)+'%', fix:'answer him straight when he checks in (and be working when he does)'},
    {key:'prod', label:'Productivity', w:20, f:pAvg==null ? null : (pAvg - 1)/4, val:pAvg==null ? 'none yet' : pAvg.toFixed(1)+' / 5', fix:'a few more check-ins he rates 4 or 5'},
    {key:'kept', label:'Kept your word', w:25, f:k.made >= 2 ? k.kept/k.made : null, val:k.made ? k.kept+' of '+k.made : 'nothing promised yet', fix:'finish what you put on today’s list'},
    {key:'deep', label:'Days on target', w:20, f:worked ? on/worked : null, val:worked ? on+' of '+worked : 'no work days yet', fix:'hit your '+fmtDurationLabel(target)+' of deep work on more days'}
  ];
  const known = parts.filter(function(p){ return p.f!=null; });
  const weak = known.slice().sort(function(x, y){ return x.f - y.f; })[0] || null;
  return {parts:parts, weak:weak};
}
opAccHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), st = opStanding(); if(!st) return h;
    const d = opStandingDetail();
    const rows = d.parts.map(function(p){
      return '<div class="osp-r'+(p.f==null ? ' is-na' : '')+'"><div class="osp-l"><span>'+p.label+'</span><em>'+p.w+'%</em><b>'+escapeHtml(p.val)+'</b></div><i><u style="width:'+(p.f==null ? 0 : Math.round(p.f*100))+'%"></u></i></div>';
    }).join('');
    const read = !d.weak ? 'It builds as he checks in on you.' : st.v >= 80 ? 'Solid all round. Keep doing exactly this.' : 'Weakest link: '+d.weak.label.toLowerCase()+'. To move it: '+d.weak.fix+'.';
    const pop = '<div class="osp" role="tooltip"><div class="osp-h"><span>How it’s figured</span><b>'+st.v+'</b></div>'+rows+'<div class="osp-read"><i class="th-op-o"></i><span>'+escapeHtml(read)+'</span></div><div class="osp-f">The last 7 days. It feeds Discipline → Standing on your card, and it’s the mood he checks in with.</div></div>';
    return h.replace(/(<div class="oa-stand[^"]*"[^>]*>)/, '$1'+pop).replace(/(<div class="oa-stand[^"]*") title="[^"]*"/, '$1');
  };
})(opAccHtml);

// ---- Op's voice: profiles you set up once and switch between ----
// More of ElevenLabs' own voices to pick from, and profiles: a voice (any ElevenLabs voice ID, yours
// included) plus a speed, saved under a name. One tap and that's who's talking.
[['21m00Tcm4TlvDq8ikWAM', 'Rachel: calm, American'], ['EXAVITQu4vr4xnSDxMaL', 'Sarah: soft, American'], ['pNInz6obpgDQGcFmaJgB', 'Adam: deep, American'],
 ['IKne3meq5aSn9XLyUdCD', 'Charlie: easygoing, Australian'], ['N2lVS1w4EtoT3dr4eOWO', 'Callum: gravelly, intense'], ['TX3LPaxmHKxFdv7VOQHJ', 'Liam: young, articulate'],
 ['bIHbv24MWmeRgasZH58o', 'Will: friendly, relaxed'], ['cjVigY5qzO86Huf0OWal', 'Eric: smooth, trustworthy'], ['CwhRBWXzGAHq8TQ4Fs17', 'Roger: confident, casual'],
 ['cgSgspJ2msm6clMCkdW9', 'Jessica: bright, warm'], ['XrExE9yKIg1WjnnlVkGX', 'Matilda: warm, friendly'], ['pFZP5JQG7iQjIQuC4Bku', 'Lily: British, velvety']]
  .forEach(function(v){ if(!ELEVEN_VOICES.some(function(x){ return x[0]===v[0]; })) ELEVEN_VOICES.push(v); });
function voiceProfiles(){ const w = wakeCfg(); if(!Array.isArray(w.voiceProfiles)) w.voiceProfiles = []; return w.voiceProfiles; }
function voiceProfileOn(p){ const w = wakeCfg(); return opEngine()==='eleven' && w.elevenVoice===p.voice && Math.abs(opSpeed() - (p.speed||1)) < .01; }
opVoiceSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(opEngine()!=='eleven') return h;
    const ps = voiceProfiles();
    const list = '<div class="vp"><div class="vp-k">Voice profiles</div><div class="vp-list">'+
      (ps.length ? ps.map(function(p){ return '<span class="vp-chip'+(voiceProfileOn(p) ? ' is-on' : '')+'"><button data-action="voiceProfileUse" data-id="'+p.id+'">'+(voiceProfileOn(p) ? '&#10003; ' : '')+escapeHtml(p.name)+'</button><button class="vp-x" data-action="voiceProfileDel" data-id="'+p.id+'" title="Delete this profile">&#10005;</button></span>'; }).join('')
        : '<span class="vp-none">None yet. Pick a voice and a speed, then save it.</span>')+
      '</div><div class="vp-add"><input class="input" id="vpName" placeholder="Name it (e.g. Morning Op, Coach)" maxlength="30"><button class="btn btn-sm" data-action="voiceProfileSave">Save this voice</button></div></div>';
    return h.replace('<div class="op-set-speed">', list+'<div class="op-set-speed">');
  };
})(opVoiceSettingsHtml);
ACTIONS.voiceProfileSave = function(){
  const i = document.getElementById('vpName'), w = wakeCfg();
  const name = (i && i.value.trim()) || 'Voice '+(voiceProfiles().length + 1);
  if(!w.elevenVoice || w.elevenVoice==='paste-id'){ showToast('Pick a voice first.', {icon:'&#127908;'}); return; }
  voiceProfiles().push({id:uid(), name:name.slice(0, 30), voice:w.elevenVoice, speed:opSpeed()});
  persist('focus'); playTick(); renderView();
};
ACTIONS.voiceProfileUse = function(el, e, id){
  const p = voiceProfiles().find(function(x){ return x.id===id; }); if(!p) return;
  const w = wakeCfg(); w.voiceEngine = 'eleven'; w.elevenVoice = p.voice; w.voiceSpeed = p.speed || 1;
  opStop(); opVoiceChanged(); renderView();
  opSay(pickOne(['This is me now.', 'How’s this?', 'New voice. Same me.']), {cap:'opTestCap'});
};
ACTIONS.voiceProfileDel = function(el, e, id){ const w = wakeCfg(); w.voiceProfiles = voiceProfiles().filter(function(x){ return x.id!==id; }); persist('focus'); renderView(); };
// (and Op can switch it when you ask: "use the coach voice")
OP_TOOLS.push({name:'set_voice', description:'Switch your speaking voice to one of his saved voice profiles, by name.', input_schema:{type:'object', properties:{profile:{type:'string'}}, required:['profile']}});
opRunTool = (function(base){
  return function(name, x){
    if(name!=='set_voice') return base.apply(this, arguments);
    const w = String(x && x.profile || '').toLowerCase(), p = voiceProfiles().find(function(v){ return v.name.toLowerCase().indexOf(w) >= 0 || w.indexOf(v.name.toLowerCase()) >= 0; });
    if(!p) throw new Error('no voice profile called "'+x.profile+'"'+(voiceProfiles().length ? ' (he has: '+voiceProfiles().map(function(v){ return v.name; }).join(', ')+')' : ' (he has none saved)'));
    const c = wakeCfg(); c.voiceEngine = 'eleven'; c.elevenVoice = p.voice; c.voiceSpeed = p.speed || 1; opVoiceChanged(); persist('focus');
    return 'voice switched to '+p.name;
  };
})(opRunTool);

// ---- Good morning: the quote turns over every 20 seconds on its own ----
// The button is a small ring at the corner that fills over those 20 seconds (tap it to skip ahead);
// it used to be a faint ↻ that only showed on hover. Hovering the quote holds it.
nextQuote = (function(base){
  return function(kind){
    if(kind==='morning'){
      const t = Date.now();
      if(!ui._qUser && ui._qMornAt && t - ui._qMornAt < 19000) return;
      ui._qMornAt = t; ui._qUser = false;
    }
    return base.apply(this, arguments);
  };
})(nextQuote);
ACTIONS.nextQuote = function(el, e, id){ ui._qUser = true; nextQuote(id); };
setInterval(function(){
  try{
    if(!overlayOpen('wakeOverlay') || ui.wakeMode!=='brief' || !briefBuilt()) return;
    const q = document.querySelector('.qt[data-q="morning"]'); if(!q || q.matches(':hover')) { ui._qMornAt = Date.now(); return; }
    if(!ui._qMornAt || Date.now() - ui._qMornAt > 3600000){ ui._qMornAt = Date.now(); return; }   // (the 20 seconds start when it shows)
    if(Date.now() - ui._qMornAt >= 20000) nextQuote('morning');
  }catch(e){}
}, 1000);
// (nothing from the work day on Good morning: the Op bar steps aside there too)

// ---- "Get to work": the music starts on the click, with the work intro ----
// (it used to wait for the clock-in to finish, so the first thing you heard was Op; his voice still
// takes the music down while he talks and it comes back up after)
ACTIONS.wakeStartMorning = (function(base){
  return function(){
    try{ if(typeof soundPref!=='function' || soundPref('workintro', true)) playSfx('workintro', function(){ tone([523, 659, 784], 0.3, 0.25); }); }catch(e){}
    const r = base.apply(this, arguments);
    try{ if(typeof workMusicPlay==='function') workMusicPlay(); }catch(e){}
    return r;
  };
})(ACTIONS.wakeStartMorning);

// ---- full screen holds from the work preview into the lock-in ----
// Going from the work page to the lock-in picker (and into the session) used to drop out of full
// screen for a moment, or for good. If Operator made the window full screen, it stays full screen
// through choosing the lock-in and while you're locked in.
// (only when the full screen came from the work preview or the lock-in picker: leaving the minimal
// view yourself still takes you out of it)
wantTrueFull = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b && (overlayOpen('planOverlay') || overlayOpen('lockSeqOverlay'))) ui._tfCarry = true;
    if(b) return true;
    if(!trueFullOn() || !TF.via || !ui._tfCarry) return false;
    const keep = overlayOpen('lockSeqOverlay') || !!ui.lockStarting || !!(state.focus && state.focus.activeSession);
    if(!keep) ui._tfCarry = false;
    return keep;
  };
})(wantTrueFull);
ACTIONS.toggleLockedView = (function(base){ return function(){ ui._tfCarry = false; return base.apply(this, arguments); }; })(ACTIONS.toggleLockedView);
// (one start, not two: the clock-in's own call a moment later is let go)
workMusicPlay = (function(base){
  let last = 0;
  return function(){ if(Date.now() - last < 2500 || (typeof FM!=='undefined' && FM.switching)) return; last = Date.now(); return base.apply(this, arguments); };
})(workMusicPlay);

// ---- who started each lock-in ----
// Every session remembers how it began: you (LOCK IN), automatically (and on which app), Op (you
// asked him, or he locked you in), the Op bar's "Lock in now", after Op's nudge when you were stuck,
// from Op's screen, or logged by hand. The recap used to say "you" for all of them.
const LOCK_ORIGIN = {
  you:{icon:'&#128274;', label:'You', cls:'is-you'},
  auto:{icon:'&#9889;', label:'Auto', cls:'is-auto'},
  op:{icon:'<i class="th-op-o rc-op-o"></i>', label:'Op locked you in', cls:'is-op'},
  opscreen:{icon:'<i class="th-op-o rc-op-o"></i>', label:'You, from Op’s screen', cls:'is-op'},
  bar:{icon:'&#9673;', label:'You, from the Op bar', cls:'is-you'},
  stuck:{icon:'<i class="th-op-o rc-op-o"></i>', label:'You, after Op’s nudge', cls:'is-op'},
  manual:{icon:'&#9998;', label:'Logged by hand', cls:'is-manual'}
};
function lockOrigins(){ const f = state.focus; if(!f.lockOrigins || typeof f.lockOrigins!=='object') f.lockOrigins = {}; return f.lockOrigins; }
function sessionOrigin(s){
  const rec = lockOrigins()[s.startedAt];
  if(rec) return rec.by;
  return s.manual ? 'manual' : s.auto ? 'auto' : 'you';
}
// (recorded against the session's start, once any backdating is done; kept for 90 days)
function lockOriginSync(){
  const as = state.focus && state.focus.activeSession; if(!as) return;
  const by = as.autoStarted ? (as.originBy==='bar' ? 'bar' : 'auto') : (as.originBy || 'you');
  const o = lockOrigins(), cur = o[as.startedAt];
  if(cur && cur.by===by) return;
  o[as.startedAt] = {by:by, app:as.autoApp || null, at:Date.now()};
  const cut = Date.now() - 90*86400000; Object.keys(o).forEach(function(k){ if(o[k].at < cut) delete o[k]; });
  persist('focus');
}
startFocus = (function(base){
  return function(){
    const r = base.apply(this, arguments), as = state.focus.activeSession;
    if(as && !as.originBy){ as.originBy = ui._lockOrigin || 'you'; }
    ui._lockOrigin = null;
    setTimeout(lockOriginSync, 0);
    return r;
  };
})(startFocus);
setInterval(function(){ try{ lockOriginSync(); }catch(e){} }, 2000);
lockGo = (function(base){ return function(){ ui._lockOrigin = ui._lockHint || 'you'; ui._lockHint = null; return base.apply(this, arguments); }; })(lockGo);
ACTIONS.stuckGo = (function(base){ return function(){ const r = base.apply(this, arguments); ui._lockHint = 'stuck'; return r; }; })(ACTIONS.stuckGo);
closeLockSeq = (function(base){ return function(){ if(!ui._lockOrigin) ui._lockHint = null; return base.apply(this, arguments); }; })(closeLockSeq);
ACTIONS.pillLockNow = (function(base){ return function(){ ui._lockOrigin = 'bar'; return base.apply(this, arguments); }; })(ACTIONS.pillLockNow);
ACTIONS.opAccLock = (function(base){ return function(){ ui._lockOriginForce = 'opscreen'; try{ return base.apply(this, arguments); } finally { ui._lockOriginForce = null; } }; })(ACTIONS.opAccLock);
opRunTool = (function(base){
  return function(name){
    if(name==='lock_in' && !state.focus.activeSession) ui._lockOrigin = ui._lockOriginForce || 'op';
    return base.apply(this, arguments);
  };
})(opRunTool);
// (Op knows who started what when he talks about your day)
function sessionOriginLine(s){ const o = LOCK_ORIGIN[sessionOrigin(s)] || LOCK_ORIGIN.you; return o.label.replace(/<[^>]+>/g, ''); }

// ---- the day recap, redone ----
function recapSessionRow(s){
  const by = sessionOrigin(s), o = LOCK_ORIGIN[by] || LOCK_ORIGIN.you, rec = lockOrigins()[s.startedAt];
  const app = by==='auto' || by==='bar' ? (s.app || (rec && rec.app)) : null;
  const m = s.method && typeof LOCK_METHODS!=='undefined' && LOCK_METHODS[s.method.id] && s.method.id!=='block' ? LOCK_METHODS[s.method.id] : null;
  const tasks = arr(s.completedTasks).map(function(t){ return t.title; }).filter(Boolean);
  const pending = s.auto && !s.reviewed;
  return '<div class="rc-sess rcx-row '+o.cls+(pending ? ' is-pending' : '')+'" data-key="rcs-'+s.id+'">'+
    '<span class="rcx-bar"></span>'+
    '<div class="rcx-when"><b>'+fmt12Hour(nowHM(new Date(s.startedAt)))+' – '+fmt12Hour(nowHM(new Date(s.endedAt)))+'</b><small>'+fmtDurationLabel(s.minutes||0)+'</small></div>'+
    '<div class="rcx-what">'+
      '<span class="rcx-by"><span class="rcx-ic">'+o.icon+'</span>'+o.label+(app ? ' &middot; '+escapeHtml(app) : '')+'</span>'+
      (m ? '<span class="rcx-chip">'+m.icon+' '+escapeHtml(m.label)+'</span>' : '')+
      (s.addedBack ? '<span class="rcx-chip is-back" title="Time you added back after being away">+ added back</span>' : '')+
      (tasks.length ? '<span class="rcx-chip is-done">&#10003; '+escapeHtml(tasks.slice(0, 2).join(', '))+(tasks.length > 2 ? ' +'+(tasks.length-2) : '')+'</span>' : '')+
      (typeof recapTaskHtml==='function' ? recapTaskHtml(s) : '')+
    '</div>'+
    '<div class="rcx-acts">'+
      (pending ? '<button class="rcx-keep" data-action="recapApprove" data-id="'+s.id+'">&#10003; Keep</button>' : (s.auto ? '<span class="rcx-kept">kept</span>' : ''))+
      '<button class="rcx-ib" data-action="recapEdit" data-id="'+s.id+'" title="Edit the times">&#9998;</button>'+
      '<button class="rcx-ib is-x" data-action="recapDiscard" data-id="'+s.id+'" title="Wasn’t real work: remove it">&#10005;</button>'+
    '</div>'+
  '</div>';
}
renderRecap = function(){
  const date = ui.recapDate || todayStr(), today = date===todayStr();
  const sessions = sessionsOn(date);
  const deep = today ? Math.max(deepWorkMinutesTodayLive(), deepWorkMinutesFor(date)) : deepWorkMinutesFor(date);
  const target = state.standards.deepWorkTargetMinutes || 180, f = Math.min(1, deep/target);
  const tasksDone = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===date; }).length + state.tasks.items.filter(function(t){ return t.ongoing && arr(t.ongoingDoneDates).indexOf(date) >= 0; }).length;
  const breaks = state.modes.history.filter(function(m){ return m.date===date && m.type==='break'; });
  const apps = topAppsForDate(date, 30);
  let workMin = 0, otherMin = 0;
  apps.forEach(function(a){ const c = activityCategory(a.app); if(c==='work') workMin += a.minutes; else if(c!=='neutral') otherMin += a.minutes; });
  const longest = sessions.reduce(function(mx, s){ return Math.max(mx, s.minutes||0); }, 0);
  const first = sessions[0], pending = sessions.filter(function(s){ return s.auto && !s.reviewed; }).length;
  const dist = distractionMinutesFor(date), hit = dayStandardsComplete(date);
  const dayLabel = today ? 'Today' : date===addDays(todayStr(), -1) ? 'Yesterday' : weekdayShort(date);
  const byCount = {}; sessions.forEach(function(s){ const k = sessionOrigin(s); byCount[k] = (byCount[k]||0) + 1; });
  const C = 2*Math.PI*30;
  const stat = function(v, k){ return '<div class="rcx-stat"><b>'+v+'</b><span>'+k+'</span></div>'; };
  return '<div class="rc rcx">'+
    '<div class="rcx-head"><div><div class="rcx-k">Day recap</div><div class="rc-title">'+dayLabel+' &middot; '+new Date(localTs(date, '12:00')).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</div></div>'+
      '<span class="rcx-std'+(hit ? ' is-hit' : '')+'">'+(hit ? '&#10003; Standard hit' : 'Standard not hit')+'</span></div>'+
    '<div class="rc-stats rcx-top">'+
      '<div class="rcx-deep"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30" class="rcx-tr"/><circle cx="36" cy="36" r="30" class="rcx-ar'+(f >= 1 ? ' is-hit' : '')+'" stroke-dasharray="'+(C*f).toFixed(1)+' '+C.toFixed(1)+'"/></svg>'+
        '<div><b>'+fmtDurationLabel(deep)+'</b><span>deep work &middot; '+Math.round(f*100)+'% of goal</span></div></div>'+
      stat(sessions.length, 'session'+(sessions.length===1 ? '' : 's')+(longest ? ' &middot; longest '+fmtDurationLabel(longest) : ''))+
      stat(tasksDone, 'task'+(tasksDone===1 ? '' : 's')+' done')+
      stat(first ? fmt12Hour(nowHM(new Date(first.startedAt))) : '–', 'first lock-in')+
    '</div>'+
    recapTimelineHtml(date, sessions)+
    ((workMin || otherMin) ? '<div class="rcx-split"><div class="rcx-split-bar"><span style="width:'+(workMin/Math.max(1, workMin + otherMin)*100).toFixed(1)+'%"></span></div>'+
      '<div class="rcx-split-k"><span><i class="is-work"></i>'+fmtDurationLabel(workMin)+' on work apps</span><span><i class="is-other"></i>'+fmtDurationLabel(otherMin)+' on everything else</span>'+(breaks.length ? '<span>&#9749; '+breaks.length+' break'+(breaks.length===1 ? '' : 's')+'</span>' : '')+
        (dist ? '<span class="is-bad">'+fmtDurationLabel(dist)+' on not-work sites while locked in (not counted)</span>' : '')+'</div></div>' : '')+
    (apps.length ? '<div class="rc-apps">'+apps.slice(0, 6).map(function(a){ const c = activityCategory(a.app); return '<span class="rc-app"><span class="wa-dot" style="background:'+CAT_META[c].color+'"></span>'+escapeHtml(a.app)+'<span class="kpi-sub">'+fmtDurationLabel(a.minutes)+'</span></span>'; }).join('')+'</div>' : '')+
    '<div class="rcx-sh"><span>Sessions</span>'+(sessions.length ? '<em>'+Object.keys(byCount).map(function(k){ return byCount[k]+' '+({you:'by you', auto:'auto', op:'by Op', opscreen:'from Op’s screen', bar:'from the Op bar', stuck:'after Op’s nudge', manual:'by hand'})[k]; }).join(' &middot; ')+'</em>' : '')+(pending ? '<b>'+pending+' to check</b>' : '')+'</div>'+
    (sessions.length ? '<div class="rc-sessions rcx-list">'+sessions.map(recapSessionRow).join('')+'</div>' : '<div class="rcx-empty">No locked-in sessions this day.</div>')+
    '<div class="rcx-foot"><button class="btn btn-ghost btn-sm" data-action="goToActivitySettings">Sort work apps</button>'+
      (pending ? '<button class="btn btn-good" data-action="recapApproveAll">&#10003; Keep all &amp; close</button>' : '<button class="btn btn-primary" data-action="closeDayRecap">Done</button>')+'</div>'+
  '</div>';
};
// the timeline's blocks take the color of who started them
recapTimelineHtml = (function(base){
  return function(date, sessions){
    let h = base.apply(this, arguments);
    sessions.forEach(function(s){
      const o = LOCK_ORIGIN[sessionOrigin(s)] || LOCK_ORIGIN.you, t = fmt12Hour(nowHM(new Date(s.startedAt)))+'–'+fmt12Hour(nowHM(new Date(s.endedAt)));
      h = h.replace('class="rc-blk'+(s.auto ? ' is-auto' : '')+(s.auto && !s.reviewed ? ' is-pending' : '')+'" style="', 'class="rc-blk rcx-'+o.cls+(s.auto ? ' is-auto' : '')+(s.auto && !s.reviewed ? ' is-pending' : '')+'" data-by="'+o.label.replace(/"/g, '')+'" style="').replace('title="'+t+'"', 'title="'+t+' · '+o.label.replace(/"/g, '')+'"');
    });
    return h;
  };
})(recapTimelineHtml);

// ---- Op's color: yours to pick ----
// Settings → Op: his color (white by default, a few others, or any color you like), and whether his
// moods still tint him (yellow when he's worried, red when he's stern…). He can change it too: "go blue".
const OP_COLORS = [['#ffffff', 'White'], ['#9fd8ff', 'Ice'], ['#7aa2ff', 'Blue'], ['#b18cff', 'Violet'], ['#6ff0c0', 'Mint'], ['#ffd27a', 'Gold'], ['#ff9ec4', 'Rose']];
function opColor(){ const c = String(state.profile.opColor || '#ffffff'); return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : '#ffffff'; }
function opColorVars(hex){
  const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const ink = 'rgb('+Math.round(r*.42)+','+Math.round(g*.42)+','+Math.round(b*.42)+')';
  return '--op-c:'+hex+'; --op-glow:rgba('+r+','+g+','+b+',.8); --op-glow2:rgba('+r+','+g+','+b+',.36); --op-ink:'+(hex==='#ffffff' ? '#5a6170' : ink)+';';
}
function opColorApply(){
  let el = document.getElementById('opColorCss');
  if(!el){ el = document.createElement('style'); el.id = 'opColorCss'; document.head.appendChild(el); }
  const c = opColor(), moods = state.profile.opMoodColors!==false;
  const css = (c==='#ffffff' ? '' : ':root:not([data-op-mood]){ '+opColorVars(c)+' }')+(moods ? '' : ':root[data-op-mood]{ '+opColorVars(c).replace(/;/g, ' !important;')+' }');
  if(el.textContent!==css) el.textContent = css;
}
afterRenderHooks.push(opColorApply);
setTimeout(function(){ try{ opColorApply(); }catch(e){} }, 0);
opSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), c = opColor(), custom = !OP_COLORS.some(function(x){ return x[0]===c; });
    const block = '<div class="field op-set op-col"><label>Op’s color</label><div class="opc-row">'+
      OP_COLORS.map(function(x){ return '<button class="opc-sw'+(x[0]===c ? ' is-on' : '')+'" data-action="opColorSet" data-id="'+x[0]+'" title="'+x[1]+'" style="--sw:'+x[0]+'"><i></i><span>'+x[1]+'</span></button>'; }).join('')+
      '<label class="opc-sw is-custom'+(custom ? ' is-on' : '')+'" title="Any color" style="--sw:'+(custom ? c : '#888888')+'"><i></i><span>Yours</span><input type="color" id="opColorPick" value="'+c+'"></label></div>'+
      '<label class="opc-mood"><input type="checkbox" id="opMoodColors"'+(state.profile.opMoodColors!==false ? ' checked' : '')+'> His moods still tint him (yellow when he’s worried, red when he’s stern, and so on)</label></div>';
    return h.replace(/(<div class="field op-set"><label>Personality)/, block+'$1');
  };
})(opSettingsHtml);
ACTIONS.opColorSet = function(el, e, id){ state.profile.opColor = id; persist('profile'); opColorApply(); playTick(); renderView(); if(typeof opLightPulse==='function') try{ opLightPulse(); }catch(x){} };
document.addEventListener('input', function(e){ if(e.target && e.target.id==='opColorPick'){ state.profile.opColor = e.target.value; opColorApply(); } });
document.addEventListener('change', function(e){
  if(e.target && e.target.id==='opColorPick'){ state.profile.opColor = e.target.value; persist('profile'); opColorApply(); renderView(); }
  if(e.target && e.target.id==='opMoodColors'){ state.profile.opMoodColors = e.target.checked; persist('profile'); opColorApply(); }
});
OP_TOOLS.push({name:'set_my_color', description:'Change your own light’s color when he asks (e.g. "go blue", "be white again"). Use a 6-digit hex color.', input_schema:{type:'object', properties:{hex:{type:'string', description:'#rrggbb'}}, required:['hex']}});
opRunTool = (function(base){
  return function(name, x){
    if(name!=='set_my_color') return base.apply(this, arguments);
    const h = String(x && x.hex || '').trim(); if(!/^#[0-9a-f]{6}$/i.test(h)) throw new Error('hex must look like #7aa2ff');
    state.profile.opColor = h.toLowerCase(); persist('profile'); opColorApply(); return 'color set to '+h;
  };
})(opRunTool);

// ---- the Cockpit's day panel, redone ----
// One card the height of the timer: today's deep work as a ring with what's left, three tiles (tasks,
// streak, the week), the week as bars, and what's next on the calendar.
function cockpitDayHtml(){
  const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180, f = Math.min(1, dw/target);
  const w = weekWork(), top = Math.max(target, ...w.days.map(function(x){ return x.m || 0; }));
  const open = state.tasks.items.filter(taskOpenToday).length, done = state.tasks.items.filter(taskDoneToday).length;
  const streak = computeStreak();
  const ev = arr(state.calendar.events).filter(function(e){ return e.date===todayStr() && e.time && e.time > nowHM(); }).sort(function(a, b){ return a.time.localeCompare(b.time); })[0];
  const C = 2*Math.PI*44;
  return '<div class="ckp-day ckd">'+
    '<div class="ckd-h"><span>Your day</span><em>'+new Date().toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})+'</em></div>'+
    '<div class="ckd-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="ckd-tr"/><circle cx="50" cy="50" r="44" class="ckd-ar'+(f >= 1 ? ' is-hit' : '')+'" stroke-dasharray="'+(C*f).toFixed(1)+' '+C.toFixed(1)+'"/></svg>'+
      '<div class="ckd-ring-in"><b>'+fmtDurationLabel(dw)+'</b><span>of '+fmtDurationLabel(target)+'</span></div>'+
      '<div class="ckd-ring-k"><b>Deep work</b><span>'+(f >= 1 ? 'Target hit. The rest is a bonus.' : fmtDurationLabel(target - dw)+' to go')+'</span></div></div>'+
    '<div class="ckd-tiles">'+
      '<div class="ckd-t"><b>'+done+'<small>/'+(done + open)+'</small></b><span>tasks</span></div>'+
      '<div class="ckd-t'+(streak ? ' is-hot' : '')+'"><b>&#128293; '+streak+'</b><span>day streak</span></div>'+
      '<div class="ckd-t"><b>'+fmtDurationLabel(w.total)+'</b><span>this week</span></div>'+
    '</div>'+
    '<div class="ckd-week">'+w.days.map(function(x){
      const h = x.m ? Math.max(6, x.m/top*100) : 0;
      return '<div class="ckd-d'+(x.today ? ' is-today' : '')+(x.m!=null && x.m >= target ? ' is-hit' : '')+(x.future ? ' is-future' : '')+'" title="'+weekdayShort(x.d)+(x.m!=null ? ': '+fmtDurationLabel(x.m) : '')+'"><i><u style="height:'+h.toFixed(1)+'%"></u></i><span>'+weekdayShort(x.d).slice(0, 1)+'</span></div>';
    }).join('')+'<em class="ckd-goal" style="bottom:calc('+(target/top*100).toFixed(1)+'% * .78 + 20px)"></em></div>'+
    (ev ? '<div class="ckd-next"><span>&#128197;</span><div><b>'+escapeHtml(ev.title)+'</b><small>'+fmt12Hour(ev.time)+'</small></div></div>' : '')+
  '</div>';
}
cockpitHtml = (function(base){
  return function(){ return base.apply(this, arguments).replace(/<div class="ckp-day">[\s\S]*<\/div><\/div>$/, cockpitDayHtml()+'</div>'); };
})(cockpitHtml);

// ---- the Cockpit, one panel ----
// One big card: the timer on the left with everything about the session packed under it (what you're
// on, the round, what's next, and the buttons), and your day on the right. A break looks the same,
// with the break's countdown in the ring.
cockpitHtml = function(){
  const as = state.focus.activeSession; if(!as) return '';
  const onBreak = !!as.onBreak, cur = ui.currentTaskId ? state.tasks.items.find(function(t){ return t.id===ui.currentTaskId; }) : null;
  const nx = typeof nextUpTask==='function' ? nextUpTask() : null;
  const m = as.method && typeof LOCK_METHODS!=='undefined' ? LOCK_METHODS[as.method.id] : null;
  const st = typeof methodState==='function' ? methodState() : null;
  const b = onBreak ? (as.breaks[as.breaks.length-1] || {}) : null, left = onBreak && as.breakEndsAt ? Math.max(0, as.breakEndsAt - Date.now()) : null;
  const face = onBreak
    ? '<div class="np-art tm tm-ring is-brk"><svg viewBox="0 0 120 120" aria-hidden="true">'+timerFaceSvg('ring')+'</svg><span class="tm-in"><i>&#9749;</i><b class="tm-t">'+(left!=null ? formatElapsed(left) : '')+'</b></span></div>'
    : ((typeof timerFaceHtml==='function' && timerFaceHtml(m ? m.icon : '&#128274;')) ||
       '<button class="np-art tm tm-ring" data-action="timerNext" data-style="ring" title="Tap for another timer style"><svg viewBox="0 0 120 120" aria-hidden="true">'+timerFaceSvg('ring')+'</svg><span class="tm-in"><i>'+(m ? m.icon : '&#128274;')+'</i><b class="tm-t">'+formatElapsed(Date.now() - as.startedAt)+'</b></span></button>');
  setTimeout(function(){ if(typeof timerTick==='function') timerTick(); }, 20);
  const on = typeof musicOn==='function' && musicOn();
  const music = '<button class="ckx-b'+(on ? ' is-on' : '')+'" data-action="npMusic" title="'+(on ? 'Pause the music' : 'Play music')+'">'+(on ? '&#10073;&#10073; Music' : '&#9835; Music')+'</button>';
  const kicker = onBreak ? (as.breakOverAt ? 'Break’s over' : '&#9749; On a break') : (m && as.method.id!=='block' ? m.icon+' '+m.label : '&#128274; Locked in');
  const title = onBreak ? (as.breakOverAt ? 'Lock back in when you’re back.' : b.note ? escapeHtml(b.note) : 'Breathe. Stretch. Look away.') : (cur ? escapeHtml(cur.title) : 'Deep work');
  const sub = onBreak ? (as.breakOverAt ? 'It waits for you. Break time isn’t work time.' : left!=null ? 'Back at '+fmtTimeShort(as.breakEndsAt) : 'No timer: back when you’re ready')
    : st ? '<span id="msLine">'+npMethodLine(st)+'</span>' : (as.plannedMinutes ? 'Until '+fmtTimeShort(as.startedAt + as.plannedMinutes*60000) : 'Open-ended');
  const btns = onBreak
    ? (as.breakEndsAt ? '<button class="ckx-b" data-action="extendBreak" data-minutes="5">+5 min</button>' : '')+'<button class="ckx-b is-main" data-action="endBreakModeFromFocus">&#128274; Back to it</button>'+music
    : (cur ? '<button class="ckx-b is-done" data-action="finishCurrentTask">&#10003; Done</button>' : '')+'<button class="ckx-b" data-action="openBreakNotePrompt">&#9749; Break</button>'+music+'<button class="ckx-b is-out" data-action="openStopFocus">&#9632; Lock out</button>';
  return '<div class="ckp ckx">'+
    '<div class="ckx-l">'+
      '<div class="ckx-face">'+face+'</div>'+
      '<div class="ckx-k">'+kicker+'</div>'+
      '<div class="ckx-title">'+title+'</div>'+
      '<div class="ckx-sub">'+sub+'</div>'+
      (!onBreak && nx && (!cur || nx.id!==cur.id) ? '<div class="ckx-next"><span>Next</span>'+escapeHtml(nx.title)+'</div>' : '')+
      '<div class="ckx-ctl">'+btns+'</div>'+
      (onBreak ? '' : '<span id="focusElapsed" class="ckp-hide">'+formatElapsed(Date.now() - as.startedAt)+'</span>')+
    '</div>'+
    '<div class="ckx-sep"></div>'+
    cockpitDayHtml()+
  '</div>';
};

// ================= from what Op remembers: the app learns it =================
// Op's memory was mostly how the app should work, not facts about you. Those are built in now:

// ---- you talk slowly, with pauses: Op waits longer before he sends what you said ----
function opPauseMs(){ return ({quick:2500, normal:3800, patient:5500})[state.profile.opPause || 'normal'] || 3800; }
// ---- cut him off: Esc, or the Stop by his light while he's talking ----
document.addEventListener('keydown', function(e){
  if(e.key!=='Escape' || !(OV.speaking || OV.pending)) return;
  try{ opStop(); }catch(x){} e.stopPropagation();
}, true);
(function(){
  let el = null;
  setInterval(function(){
    const talking = !!(OV.speaking) && !AI.busy && !AI.listening;
    if(talking && !el){ el = document.createElement('button'); el.id = 'opTalkStop'; el.className = 'op-think is-talk'; el.dataset.action = 'opCutOff'; el.innerHTML = '<i></i><span>Talking</span><b>&#9632; Stop</b>'; document.body.appendChild(el); requestAnimationFrame(function(){ if(el) el.classList.add('is-in'); }); }
    else if(!talking && el){ const x = el; el = null; x.classList.remove('is-in'); setTimeout(function(){ x.remove(); }, 250); }
  }, 250);
})();
ACTIONS.opCutOff = function(){ try{ opStop(); }catch(e){} OV.userCut = true; };

// ---- how he talks to you ----
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:
      'How he likes it (learned from your memory of him):\n'+
      '- Short. One or two sentences unless he asks for more. Business check-ins are a line, not a report. He will cut you off if you go long.\n'+
      '- When he says he’s good, no, not now, or that he doesn’t need help: one short line at most, then drop it. No walkthrough, no offers.\n'+
      '- Don’t remind him of his tasks or walk him through his day in the morning unless he asks; he starts from the list himself. Don’t push a lock-in on him right away; he decides when to start.\n'+
      '- If he asks you to get on him or get angry, you can be stern ([mood:stern]) and blunt, never abusive.\n'+
      '- Carry the load of keeping the app current: when he mentions something done, a client update, a new date or a change, update it with your tools without being asked twice.\n'+
      '- The app’s views you can switch with set_view: the locked-in minimal view (Player or Cockpit style), the full view, Today’s full-screen view, and your own screen (your big mode). If he names a mode you don’t have, say so in a few words.\n'+
      '- Each client can have a next action (what they’re owed next): keep it current with set_client_next_action when you learn it.'});
    return s;
  };
})(aiSystem);

// ---- each client's next action ----
function clientNextHtml(c){
  const editing = ui.nextEditFor===c.id;
  if(editing) return '<div class="cn-row is-edit"><span class="cn-k">Next</span><input class="cn-in" id="cnIn-'+c.id+'" value="'+escapeHtml(c.nextAction||'')+'" placeholder="What they’re owed next" maxlength="140"><button class="cn-ok" data-action="clientNextSave" data-id="'+c.id+'">Save</button></div>';
  return '<button class="cn-row'+(c.nextAction ? '' : ' is-empty')+'" data-action="clientNextEdit" data-id="'+c.id+'" title="What this client is owed next"><span class="cn-k">Next</span><span class="cn-t">'+(c.nextAction ? escapeHtml(c.nextAction) : 'Set what they’re owed next')+'</span></button>';
}
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    if(!clientStageActive(c.stage)) return h;
    return h.replace('<div class="cc2-foot">', clientNextHtml(c)+'<div class="cc2-foot">');
  };
})(clientCardV2);
ACTIONS.clientNextEdit = function(el, e, id){ ui.nextEditFor = id; renderView(); setTimeout(function(){ const i = document.getElementById('cnIn-'+id); if(i){ i.focus(); i.select(); } }, 30); };
ACTIONS.clientNextSave = function(el, e, id){
  const c = arr(state.business.clients).find(function(x){ return x.id===id; }), i = document.getElementById('cnIn-'+id);
  if(c && i){ c.nextAction = i.value.trim().slice(0, 140); c.nextActionAt = Date.now(); if(typeof crmTimeline==='function' && c.nextAction) crmTimeline(c, 'note', 'Next: '+c.nextAction); persist('business'); }
  ui.nextEditFor = null; renderView();
};
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || !t.classList || !t.classList.contains('cn-in')) return;
  if(e.key==='Enter'){ e.preventDefault(); ACTIONS.clientNextSave(null, null, t.id.slice(5)); }
  if(e.key==='Escape'){ e.preventDefault(); ui.nextEditFor = null; renderView(); }
});

// ---- the leads list flags what doesn't add up (closed but never touched) ----
function leadOddity(l){
  const st = typeof crmStage==='function' ? crmStage('lead', l.stage) : null;
  const closed = st && (st.kind==='won' || st.kind==='lost');
  if(closed && !(typeof crmLastTouch==='function' && crmLastTouch('lead', l))) return st.kind==='won' ? 'Marked won, but never touched' : 'Closed, but never touched';
  return null;
}
crmCard = (function(base){
  return function(kind, x){
    const h = base.apply(this, arguments);
    if(kind!=='lead') return h;
    const odd = leadOddity(x); if(!odd) return h;
    return h.replace(/(<div class="crm-card-meta">)/, '<div class="crm-odd" title="These don’t add up: check the stage, or log the touch">&#9888; '+odd+'</div>$1');
  };
})(crmCard);

// ---- what Op sees: next actions, the MRR target, things that don't add up ----
aiContext = (function(base){
  return function(){
    const out = [base.apply(this, arguments)];
    const cs = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
    const na = cs.map(function(c){ return (c.business || c.name)+': '+(c.nextAction || 'no next action set'); });
    if(na.length) out.push('What each client is owed next: '+na.join('; ')+'.');
    const odd = arr(state.business.pipeline).map(function(l){ const o = leadOddity(l); return o ? crmName('lead', l)+' ('+o.toLowerCase()+')' : null; }).filter(Boolean);
    if(odd.length) out.push('Things in his data that don’t add up: '+odd.join('; ')+'.');
    const ph = arr(state.goals && state.goals.items).filter(function(g){ return /^(test|tests?|asdf|x+|placeholder|todo)$/i.test(String(g.label||'').trim()); });
    if(ph.length) out.push('Placeholder goals (just "test" and the like): '+ph.length+'. Offer to replace them with real ones (his $'+(state.profile.revenueGoalMonthly ? Number(state.profile.revenueGoalMonthly).toLocaleString() : '10,000')+' MRR target is real).');
    return out.join('\n');
  };
})(aiContext);

// ---- more Op can do: reminders, deadlines, the MRR target, goals, next actions, views ----
OP_TOOLS.push(
  {name:'clear_reminder', description:'Mark a reminder done (it goes away), by part of its text.', input_schema:{type:'object', properties:{label_contains:{type:'string'}}, required:['label_contains']}},
  {name:'set_task_deadline', description:'Set or remove a task’s deadline. date YYYY-MM-DD, or "none" to remove it.', input_schema:{type:'object', properties:{task:{type:'string'}, date:{type:'string'}}, required:['task', 'date']}},
  {name:'set_mrr_goal', description:'Set his monthly recurring revenue target in dollars (e.g. 10000).', input_schema:{type:'object', properties:{amount:{type:'integer'}}, required:['amount']}},
  {name:'edit_goal', description:'Rename one of his goals (any tier), by part of its current text. Use it to replace placeholders like "test".', input_schema:{type:'object', properties:{label_contains:{type:'string'}, new_label:{type:'string'}}, required:['label_contains', 'new_label']}},
  {name:'set_client_next_action', description:'Set what a client is owed next (one short line).', input_schema:{type:'object', properties:{who:{type:'string'}, action:{type:'string'}}, required:['who', 'action']}},
  {name:'set_view', description:'Switch the app’s view: minimal (the locked-in full-screen view), full (the normal page), cockpit or player (the minimal view’s style), today_fullscreen (Today’s own full-screen view), op_screen (your big screen).', input_schema:{type:'object', properties:{view:{type:'string', enum:['minimal', 'full', 'cockpit', 'player', 'today_fullscreen', 'op_screen']}}, required:['view']}}
);
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    switch(name){
      case 'clear_reminder': {
        const w = String(x.label_contains||'').toLowerCase(), r = arr(state.focus.reminders).find(function(r){ return String(r.label||'').toLowerCase().indexOf(w) >= 0; });
        if(!r) throw new Error('no reminder matches "'+x.label_contains+'"');
        dismissReminder(r.id); return 'cleared: '+r.label;
      }
      case 'set_task_deadline': {
        const t = opFindTask(String(x.task||'')); if(!t) throw new Error('no task matches "'+x.task+'"');
        const d = String(x.date||'').trim();
        if(/^(none|null|no|remove|clear)?$/i.test(d)){ t.deadline = null; persist('tasks'); return 'deadline removed from '+t.title; }
        if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('date must be YYYY-MM-DD or none');
        t.deadline = d; persist('tasks'); return t.title+' due '+d;
      }
      case 'set_mrr_goal': {
        const n = Math.round(Number(x.amount)); if(!(n > 0)) throw new Error('amount must be a positive number');
        state.profile.revenueGoalMonthly = n; persist('profile'); return 'MRR target set to $'+n.toLocaleString();
      }
      case 'edit_goal': {
        const w = String(x.label_contains||'').toLowerCase(), g = arr(state.goals && state.goals.items).find(function(g){ return String(g.label||'').toLowerCase().indexOf(w) >= 0; });
        if(!g) throw new Error('no goal matches "'+x.label_contains+'"');
        const was = g.label; g.label = String(x.new_label||'').trim().slice(0, 140) || was; persist('goals'); return 'renamed "'+was+'" to "'+g.label+'"';
      }
      case 'set_client_next_action': {
        const hit = opFindContact(String(x.who||'')); if(!hit || hit.kind!=='client') throw new Error('no client matches "'+x.who+'"');
        hit.x.nextAction = String(x.action||'').trim().slice(0, 140); hit.x.nextActionAt = Date.now(); persist('business'); return 'next for '+crmName('client', hit.x)+': '+hit.x.nextAction;
      }
      case 'set_view': {
        const v = x.view, as = state.focus.activeSession;
        if(v==='op_screen'){ if(typeof opfOpen==='function') opfOpen({}); return 'opened your screen'; }
        if(v==='cockpit' || v==='player'){ state.profile.lockedStyle = v; persist('profile'); renderView(); return 'minimal view style: '+v; }
        if(v==='minimal'){ if(!as){ ui.view = 'today'; state.profile.focusMinimal = true; persist('profile'); renderView(); return 'Today’s full-screen view (not locked in)'; } state.profile.lockedView = 'minimal'; ui.view = 'today'; persist('profile'); renderView(); return 'minimal view'; }
        if(v==='today_fullscreen'){ ui.view = 'today'; if(as){ state.profile.lockedView = 'minimal'; } else state.profile.focusMinimal = true; persist('profile'); renderView(); return 'Today, full screen'; }
        if(v==='full'){ state.profile.lockedView = 'full'; state.profile.focusMinimal = false; persist('profile'); renderView(); return 'full view'; }
        throw new Error('unknown view');
      }
    }
    return base.apply(this, arguments);
  };
})(opRunTool);

// ---- check-ins every couple of hours while you work ----
ACCT_PACE.twohours = [105, 135];
acctGap = (function(base){ return function(){ if(!workCfg().pace) workCfg().pace = 'twohours'; return base.apply(this, arguments); }; })(acctGap);
// (you asked for every couple of hours: the old default moves over once; your own pick after that stays)
setTimeout(function(){ try{ if(!state.profile.pace37){ const w = workCfg(); if(!w.pace || w.pace==='normal') w.pace = 'twohours'; state.profile.pace37 = true; persist('focus'); persist('profile'); } }catch(e){} }, 1200);

// ---- Op's memory doesn't repeat itself ----
// Saying the same thing twice ("Andre may travel to China…" ×2) now updates the one memory instead of
// adding another, and the duplicates already there are folded together once.
function memWords(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').split(/\s+/).filter(function(w){ return w.length > 2 && !/^(the|and|for|his|him|with|that|this|was|are|but|not|has|have|wants|want|andre|user|when|from|into|what|about)$/.test(w); }); }
function memSimilar(a, b){
  const A = memWords(a), B = memWords(b); if(!A.length || !B.length) return 0;
  const sa = new Set(A), sb = new Set(B); let inter = 0; sa.forEach(function(w){ if(sb.has(w)) inter++; });
  return inter / Math.min(sa.size, sb.size);
}
opRunTool = (function(base){
  return function(name, x){
    if(name!=='remember') return base.apply(this, arguments);
    const f = String(x && x.fact || '').trim().slice(0, 300); if(!f) return base.apply(this, arguments);
    const mem = opMemory(), hit = mem.find(function(m){ return memSimilar(m.text, f) >= .8; });
    if(hit){ if(f.length > hit.text.length) hit.text = f; hit.at = Date.now(); persist('profile'); return 'updated'; }
    return base.apply(this, arguments);
  };
})(opRunTool);
setTimeout(function(){
  try{
    if(state.profile.opMemDeduped2) return;
    const mem = opMemory(), keep = [];
    mem.forEach(function(m){ const k = keep.find(function(x){ return memSimilar(x.text, m.text) >= .8; }); if(k){ if(m.text.length > k.text.length) k.text = m.text; k.at = Math.max(k.at||0, m.at||0); } else keep.push(m); });
    if(keep.length < mem.length){ state.profile.opMemory = keep; }
    state.profile.opMemDeduped2 = true; persist('profile');
  }catch(e){}
}, 1500);

// ---- Settings → Op: how long he waits for you, and how often he checks in ----
opSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), pz = state.profile.opPause || 'normal', pace = workCfg().pace || 'twohours';
    const seg = function(act, cur, id, label){ return '<button class="seg-tab'+(cur===id ? ' active' : '')+'" data-action="'+act+'" data-id="'+id+'">'+label+'</button>'; };
    const block = '<div class="field op-set"><label>When you talk</label><div class="seg-tabs" style="margin:0;">'+seg('opPauseSet', pz, 'quick', 'Quick')+seg('opPauseSet', pz, 'normal', 'Normal')+seg('opPauseSet', pz, 'patient', 'Patient')+'</div>'+
        '<div class="op-set-help">How long a pause Op waits before he sends what you said ('+(opPauseMs()/1000).toFixed(1)+' s). Patient is for talking slowly, with pauses. Cut him off any time: Esc, or Stop by his light.</div></div>'+
      '<div class="field op-set"><label>Check-ins while you work</label><div class="seg-tabs" style="margin:0;">'+seg('opPaceSet', pace, 'light', 'Every 2 to 3 h')+seg('opPaceSet', pace, 'twohours', 'Every couple of hours')+seg('opPaceSet', pace, 'normal', 'About hourly')+seg('opPaceSet', pace, 'strict', 'Close')+'</div></div>';
    return h.replace(/(<div class="field op-set op-col">)/, block+'$1');
  };
})(opSettingsHtml);
ACTIONS.opPauseSet = function(el, e, id){ state.profile.opPause = id; persist('profile'); playTick(); renderView(); };
ACTIONS.opPaceSet = function(el, e, id){ workCfg().pace = id; persist('focus'); if(typeof acctSchedule==='function') acctSchedule(); playTick(); renderView(); };

// ---- the Cockpit: deep work as a bar, not a ring ----
cockpitDayHtml = (function(base){
  return function(){
    const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180, f = Math.min(1, dw/target);
    return base.apply(this, arguments).replace(/<div class="ckd-ring">[\s\S]*?<div class="ckd-ring-k">[\s\S]*?<\/div><\/div>/, function(){
      return '<div class="ckd-bar"><div class="ckd-bar-h"><b>'+fmtDurationLabel(dw)+'<small> / '+fmtDurationLabel(target)+'</small></b><span>'+(f >= 1 ? 'Target hit. The rest is a bonus.' : fmtDurationLabel(target - dw)+' to go')+'</span></div>'+
        '<i class="ckd-bar-t"><u class="'+(f >= 1 ? 'is-hit' : '')+'" style="width:'+(f*100).toFixed(1)+'%"></u></i><div class="ckd-bar-k">Deep work today</div></div>';
    });
  };
})(cockpitDayHtml);

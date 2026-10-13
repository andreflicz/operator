// ============ OP, ROUND 32: YOUR ACCOUNTABILITY PARTNER ============
// Talking and typing, any time. On his screen (and in his bubble) you can always just type, even
// while he's listening: the moment you start, the mic lets go and what you type is what he gets. If
// he's mid-thought, it waits its turn instead of vanishing. The mic is there in both views, and a
// line under it says what he's doing (listening, thinking, talking).
// The chat is readable: bigger type, your words tinted, what he did in green.
// And the job he's actually for:
//  • your tasks for today ARE what you committed to. Nothing extra to fill in: you add a task once and
//    he holds you to it. In the morning he runs you through the top of today's list and asks where
//    you're starting; if the list is empty he asks what's on today and adds what you say as tasks
//  • midday he checks the list; if nothing's moving and you go quiet on him, he comes back harder,
//    and if you keep ignoring him he opens his screen and makes you choose: lock in, or tell him why not
//  • at the end of the day he goes through it with you: what got done, what didn't, and why
//  • his screen has the scoreboard: what's up next today (tick it off right there), deep work against
//    your target, tasks done today, promises kept this week, when he'll check on you next, and two
//    buttons: Lock me in, Press me
// Never while you're asleep, shooting, on a break he agreed to, or locked in.

// ---- type or talk, whenever ----
function opStopListening(){
  if(AI.listening){ if(AI.cancelListen) AI.cancelListen(); else { AI.listening = false; AI.sendNow = null; } }
  if(OPF.me && OPF.me.parentNode && OPF.me.classList.contains('is-wait')){ OPF.me.remove(); OPF.me = null; }
  const live = document.getElementById('opfLive'); if(live && live.dataset.wait){ live.textContent = ''; live.dataset.wait = ''; live.classList.remove('is-me'); }
  if(typeof aiUiRefresh==='function') aiUiRefresh();
}
opfInputAt = (function(base){ return function(){ opStopListening(); return base.apply(this, arguments); }; })(opfInputAt);
document.addEventListener('focusin', function(e){ if(e.target && e.target.id==='opfInput' && AI.listening) opStopListening(); });
document.addEventListener('keydown', function(e){ if(e.target && (e.target.id==='opfInput' || e.target.id==='opBubInput' || (e.target.classList && e.target.classList.contains('opf-type'))) && AI.listening && e.key.length===1) opStopListening(); }, true);
// what you type cuts him off and never gets lost: if he's still thinking, it goes right after
const OPQ = {list:[]};
opfSend = (function(base){
  return function(text, at){
    opStopListening();
    if(OV.speaking || OV.pending){ OV.userCut = true; opStop(); }
    AI.lastUserAt = Date.now();
    if(AI.busy){ OPQ.list.push({text:text, at:at}); opfStatus(); return; }
    return base.apply(this, arguments);
  };
})(opfSend);
setInterval(function(){
  if(!OPQ.list.length || AI.busy || AI.listening) return;
  const n = OPQ.list.shift();
  if(OPF.open) opfSend(n.text, n.at || (opfMode()==='plane' ? opfSlot() : null));
  else { AI.typedAt = Date.now(); OV.cap = 'opBubText'; opBubShow(); aiAsk(n.text, 'opBubText'); }
}, 400);
// the bubble's box gets the same: typing there while he's thinking waits its turn
aiAsk = (function(base){
  return function(text, cap){
    AI.lastUserAt = Date.now();
    if(AI.busy && String(text||'').trim() && (cap==='opBubText' || cap==='opfLive') && Date.now() - (AI.typedAt||0) < 2000){ OPQ.list.push({text:text, at:null}); return Promise.resolve(); }
    return base.apply(this, arguments);
  };
})(aiAsk);
// the mic: tap while he's talking and you cut in; tap while listening and it sends
ACTIONS.opfTalk = (function(base){ return function(){ if(OV.speaking || OV.pending){ OV.userCut = true; opStop(); } return base.apply(this, arguments); }; })(ACTIONS.opfTalk);
// what he's doing, in one line under the mic (and in the chat, above the box)
function opfStatus(){
  const el = document.getElementById('opfStatus'); if(!el) return;
  const t = AI.listening ? 'Listening… tap the light to send' : AI.busy ? (OPQ.list.length ? 'Thinking… yours is next' : 'Thinking…') : (OV.speaking || OV.pending) ? 'Talking · tap the light to cut in' : '';
  if(el.textContent!==t) el.textContent = t;
  el.classList.toggle('is-on', !!t);
}

// ---- his screen: the chat mic, the status line, the scoreboard ----
opfEl = (function(base){
  return function(){
    const fresh = !document.getElementById('opFull'), el = base.apply(this, arguments);
    if(fresh){
      const pr = el.querySelector('.opf-prompt');
      if(pr && !pr.querySelector('.opf-pmic')){ const b = document.createElement('button'); b.className = 'opf-pmic'; b.setAttribute('data-action', 'opfTalk'); b.setAttribute('aria-label', 'Talk instead'); b.title = 'Talk instead'; b.innerHTML = '<i></i>'; pr.appendChild(b); }
      const st = document.createElement('div'); st.className = 'opf-status'; st.id = 'opfStatus'; el.appendChild(st);
      const acc = document.createElement('aside'); acc.className = 'opf-acc'; acc.id = 'opfAcc'; el.appendChild(acc);
      el.querySelector('.opf-hint').textContent = 'Click anywhere and write. Or just talk. Either, any time.';
    }
    return el;
  };
})(opfEl);
opfSync = (function(base){ return function(){ const r = base.apply(this, arguments); opfStatus(); return r; }; })(opfSync);
opfOpen = (function(base){ return function(){ const r = base.apply(this, arguments); opAccDraw(); return r; }; })(opfOpen);
// (clicks on the scoreboard aren't "write here")
opfPointer = (function(base){ return function(e){ if(e.target.closest && e.target.closest('.opf-acc, .opf-status')) return; return base.apply(this, arguments); }; })(opfPointer);

// ---- today's list is the commitment ----
function opDay(){
  const f = state.focus, t = todayStr();
  if(!f.opDay || f.opDay.date!==t){
    // (yesterday goes on the record before today starts)
    if(f.opDay && f.opDay.date && !f.opDay.recorded && f.opDay.made) opDayRecord(f.opDay.date, f.opDay.made, f.opDay.kept);
    f.opDay = {date:t, askedAt:0, midAt:0, reviewAt:0, esc:0, escAt:0, waitFrom:0, made:0, kept:0};
  }
  return f.opDay;
}
// today's tasks (the plan, in order) and what got done today; video ideas aren't commitments
function opCommits(){
  const t = todayStr(), plan = (typeof todaysPlan==='function' ? todaysPlan() : state.tasks.items.filter(function(x){ return x.status==='today'; })).filter(function(x){ return !x.isVideoIdea; });
  const done = state.tasks.items.filter(function(x){ return x.status==='done' && x.completedAt===t && !x.isVideoIdea && plan.indexOf(x) < 0; });
  return plan.concat(done).map(function(x){ return {id:x.id, t:x.title, done:x.status==='done'}; });
}
function opOpen(){ return opCommits().filter(function(c){ return !c.done; }); }
// (how today stands, kept on the day so yesterday can be recorded)
function opDayTally(){ const d = opDay(), cs = opCommits(); d.made = cs.length; d.kept = cs.filter(function(c){ return c.done; }).length; return d; }
function opDayRecord(date, made, kept){
  const f = state.focus; f.opDays = arr(f.opDays).filter(function(x){ return x.date!==date; });
  f.opDays.push({date:date, made:made, kept:kept});
  if(f.opDays.length > 60) f.opDays = f.opDays.slice(-60);
}
function opKeptWeek(){
  const ws = startOfWeekStr(todayStr()), d = opDayTally(), past = arr(state.focus.opDays).filter(function(x){ return x.date >= ws && x.date < d.date; });
  // (today's open tasks only count against you once the day's reviewed)
  return {made:past.reduce(function(a, x){ return a + x.made; }, 0) + (d.reviewAt ? d.made : d.kept), kept:past.reduce(function(a, x){ return a + x.kept; }, 0) + d.kept};
}
setInterval(function(){ try{ if(state && state.focus){ const d = opDay(), m = d.made, k = d.kept; opDayTally(); if(d.made!==m || d.kept!==k) persist('focus'); } }catch(e){} }, 60000);

// ---- what he knows, and how he holds you to it ----
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:
      'Accountability (round 32, this is the heart of your job):\n'+
      '- You are his accountability partner. You make him work. Warm, direct, a little relentless; never a pushover, never cruel.\n'+
      '- His tasks for today ARE his commitments. Never ask him to list goals or "three things" separately, and never make him enter anything twice. If today’s list is empty, ask what’s on today and add each thing he names with add_task (list "today").\n'+
      '- Keep the list in front of him. When he says he finished something, call complete_task. When he’s drifting, bring up the one that matters most, by name.\n'+
      '- When he goes quiet on you or dodges, don’t let it slide: name it, and ask for a decision (lock in now, or tell you what’s really going on). Excuses get called, kindly, once. Real reasons (sick, family, a break you agreed to) get respect.\n'+
      '- At the end of the day, go through the list: what got done, what didn’t, and why. Celebrate what he kept, briefly. Make tomorrow’s first move clear.\n'+
      '- Use the numbers you have (deep work vs his target, tasks done, promises kept this week). Specific beats general.'});
    return s;
  };
})(aiSystem);
aiContext = (function(base){
  return function(){
    const d = opDay(), cs = opCommits(), k = opKeptWeek(), s = base.apply(this, arguments);
    const line = cs.length ? '\nToday’s list (his commitments, in order): '+cs.slice(0, 8).map(function(c, i){ return (i + 1)+') '+c.t+(c.done ? ' [done]' : ''); }).join('; ')+(cs.length > 8 ? '; and '+(cs.length - 8)+' more' : '')+'.'
      : '\nToday’s task list is empty.'+(nowMin() < 15*60 ? ' Find out what’s on today and add it with add_task.' : '');
    return s+line+(k.made ? ' Promises kept this week: '+k.kept+' of '+k.made+' tasks.' : '')+
      (d.esc >= 2 ? '\nHe’s been ignoring your last few check-ins. Be firm: ask for a decision, now.' : '')+
      (ui._opCommitAskAt && Date.now() - ui._opCommitAskAt < 15*60000 && !cs.length ? '\nYou just asked what’s on today. If this message says, add each thing with add_task (list "today") now.' : '');
  };
})(aiContext);
// without a key: what you tell him (when he asked what's on today) still becomes today's tasks
aiAsk = (function(base){
  return function(text, cap){
    const asked = ui._opCommitAskAt && Date.now() - ui._opCommitAskAt < 15*60000 && !opCommits().length;
    if(asked && AI.hasKey!==true && String(text||'').trim()){
      const items = String(text).split(/\s*(?:\n|;|,|\band then\b|\bthen\b|\balso\b|\band\b|\d[.)])\s*/i).map(function(x){ return x.trim().replace(/^(i (?:need|have|want) to|i'?ll|i'?m going to|gonna|to)\s+/i, ''); }).filter(function(x){ return x.length > 2; }).slice(0, 6);
      if(items.length){
        ui._opCommitAskAt = 0;
        const added = items.map(function(t){ return opRunTool('add_task', {title:t.charAt(0).toUpperCase()+t.slice(1), list:'today'}) && t; });
        if(typeof opChatLog==='function') opChatLog('me', String(text));
        if(ui.view==='today' || ui.view==='focus') renderView();
        opSpeakUp('On the list: '+added.join(', ')+'. I’ll hold you to it. Which one first?', cap);
        return Promise.resolve();
      }
    }
    return base.apply(this, arguments);
  };
})(aiAsk);

// ---- him, speaking up on his own ----
function opCanSpeakUp(){
  if(!state || !state.focus || AI.busy || AI.listening || OV.speaking || OV.pending) return false;
  if(typeof opHoldQuiet==='function' && opHoldQuiet()) return false;
  const m = state.modes && state.modes.active; if(m && (m.sleep || m.type==='shooting' || m.clockedOut)) return false;
  if(state.focus.activeSession) return false;
  if(typeof acct==='function' && acct().pending) return false;
  if(typeof opPressLevel==='function' && opPressLevel()==='off') return false;
  if(document.querySelector('.overlay:not(.hidden)')) return false;
  // (never on top of something he just said, a check-in, a press, or you talking to him)
  const lastLog = typeof acct==='function' ? (arr(acct().log).slice(-1)[0] || {}) : {};
  if(Date.now() - (Number(lastLog.at) || 0) < 10*60000) return false;
  return Date.now() - Math.max(OV.lastEnd||0, OV.capAt||0, AI.lastAskAt||0, AI.lastUserAt||0, ui._opPressAt||0, ui._opActiveAt||0) > 4*60000;
}
// (when he last put words up, spoken or not)
opCaption = (function(base){ return function(txt){ if(txt && txt!=='…' && txt!=='Listening…') OV.capAt = Date.now(); return base.apply(this, arguments); }; })(opCaption);
function opSpeakUp(line, cap){
  if(!line) return;
  ui._opActiveAt = Date.now();
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  OV.cap = cap && cap!=='opBubText' && document.getElementById(cap) ? cap : 'opBubText'; if(OV.cap==='opBubText') opBubShow();
  if(opVoiceOn()) opSay(line, {cap:OV.cap}); else opCaption(line);
}
async function opWriteOr(fallback, ask){
  if(AI.hasKey!==true || typeof aiWrite!=='function') return fallback;
  const t = await Promise.race([aiWrite(ask, {max:120}), new Promise(function(r){ setTimeout(r, 8000); })]);
  return t || fallback;
}
function opDayStart(){ const w = typeof workToday==='function' ? workToday() : null; if(w && w.enabled && typeof workDayToday==='function' && workDayToday()) return hmMin(w.start); const wk = typeof wakeCfg==='function' ? wakeCfg() : {}; return wk.enabled && wk.time ? hmMin(wk.time) + 60 : 9*60 + 30; }
function opDayEnd(){ const w = typeof workToday==='function' ? workToday() : null; if(w && w.enabled && typeof workDayToday==='function' && workDayToday()) return hmMin(w.end); return 19*60; }
// 1. the morning: the top of today's list, and where you're starting (or what's on today)
async function opAskThree(force){
  const d = opDay(); if(!force && d.askedAt) return false;
  d.askedAt = Date.now(); persist('focus');
  const name = (state.profile.name || '').split(' ')[0], open = opOpen(), top = open.slice(0, 3).map(function(c){ return c.t; });
  const say = function(a){ return a.length===1 ? '“'+a[0]+'”' : a.slice(0, -1).map(function(x){ return '“'+x+'”'; }).join(', ')+' and “'+a[a.length-1]+'”'; };
  let line;
  if(!open.length){
    ui._opCommitAskAt = Date.now();
    line = await opWriteOr(pickOne([(name ? name+', nothing' : 'Nothing')+'’s on today’s list yet. What has to get done today?', 'Your list for today is empty. What are we getting done?']),
      'You’re his accountability partner. It’s the start of his day ('+fmt12Hour(nowHM())+') and his task list for today is empty. In one or two short spoken sentences, ask what has to get done today (you’ll add it to his list). End with the question.');
  } else {
    line = await opWriteOr('Today’s on the board: '+say(top)+(open.length > 3 ? ', and '+(open.length - 3)+' more' : '')+'. Which one are you starting with?',
      'You’re his accountability partner. It’s the start of his day ('+fmt12Hour(nowHM())+'). His task list for today, in order: '+open.slice(0, 6).map(function(c){ return c.t; }).join('; ')+'. In one or two short spoken sentences, name the top of the list (what matters most) and ask where he’s starting. Don’t ask him to list anything. End with the question.');
  }
  if(!force && !opCanSpeakUp()){ d.askedAt = 0; ui._opCommitAskAt = 0; persist('focus'); return false; }
  opSpeakUp(/\?["”’)]*\s*$/.test(line) ? line : line+' Where are you starting?');
  d.waitFrom = Date.now(); persist('focus');
  return true;
}
// 2. midday: nothing moving
async function opMidCheck(){
  const d = opDay(), cs = opCommits(), open = cs.filter(function(c){ return !c.done; });
  d.midAt = Date.now(); persist('focus');
  if(!cs.length) return opAskThree(true);
  if(!open.length) return false;
  const dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180, done = cs.length - open.length;
  const line = await opWriteOr(!done ? 'Halfway through the day and nothing on your list is done. “'+open[0].t+'” first?' : done+' done, '+open.length+' to go. “'+open[0].t+'” is next. When are you starting it?',
    'You’re his accountability partner, checking in midday ('+fmt12Hour(nowHM())+'). His list today: '+cs.slice(0, 8).map(function(c){ return c.t+(c.done ? ' (done)' : ' (open)'); }).join('; ')+'. Deep work so far: '+fmtDurationLabel(dw)+' of '+fmtDurationLabel(target)+'. One or two short spoken sentences: say where he stands, push on the open one that matters most by name, and end with a direct question (when he starts it, or if you should lock him in).');
  if(!done && typeof opMood==='function') opMood('concern', 20000);
  opSpeakUp(line); ui._opPressAt = Date.now(); d.waitFrom = Date.now(); persist('focus');
  return true;
}
// 3. he's ignoring you: firmer, then his screen, and a choice
async function opEscalate(){
  const d = opDay(); d.esc = (d.esc||0) + 1; d.escAt = Date.now(); d.waitFrom = Date.now(); persist('focus');
  const open = opOpen(), dw = deepWorkMinutesTodayLive();
  const thing = open[0] ? '“'+open[0].t+'”' : 'today';
  if(d.esc >= 2){
    if(typeof opMood==='function') opMood('stern', 30000);
    if(typeof opfOpen==='function'){ opfOpen({}); OPF.touched = true; }
    const line = await opWriteOr('I’m not going anywhere. You’ve gone quiet on me and '+thing+' isn’t done. Lock in now, or tell me what’s really going on?',
      'He has ignored your last check-ins. '+(dw ? 'He has '+fmtDurationLabel(dw)+' of deep work today.' : 'No deep work today yet.')+' Still open on his list: '+(open.slice(0, 5).map(function(c){ return c.t; }).join('; ') || 'nothing')+'. Be firm and caring in two short spoken sentences: name it plainly, then make him choose: lock in right now, or tell you what’s really going on. End with that question.');
    opSpeakUp(line); ui._opPressAt = Date.now();
    return true;
  }
  if(typeof opMood==='function') opMood('concern', 20000);
  const line = await opWriteOr(pickOne(['Hey. I asked you something. Where are you at with '+thing+'?', 'Still waiting on you. What’s the plan for '+thing+'?']),
    'He didn’t answer your last check-in. One short spoken sentence, a little firmer than before (no lecture), asking where he is with '+thing+'. End with a question.');
  opSpeakUp(line); ui._opPressAt = Date.now();
  return true;
}
// 4. the end of the day
async function opReview(){
  const d = opDay(), cs = opCommits(); d.reviewAt = Date.now(); persist('focus');
  if(!cs.length) return false;
  const done = cs.filter(function(c){ return c.done; }), open = cs.filter(function(c){ return !c.done; }), dw = deepWorkMinutesTodayLive();
  opDayTally(); opDayRecord(d.date, d.made, d.kept); persist('focus');
  if(!open.length && typeof opMood==='function') opMood('excited', 12000);
  const line = await opWriteOr(!open.length ? 'Everything on today’s list, done. That’s a kept word. What’s the first move tomorrow?' : 'Day’s review. You got '+done.length+' of '+cs.length+' done. What happened with “'+open[0].t+'”?',
    'End-of-day review with him. His list today: '+cs.slice(0, 8).map(function(c){ return c.t+(c.done ? ' (done)' : ' (not done)'); }).join('; ')+'. Deep work: '+fmtDurationLabel(dw)+'. Two or three short spoken sentences: '+(open.length ? 'say what he got done (briefly, genuinely), then ask straight what happened with the one that mattered most that he didn’t do.' : 'celebrate it briefly and genuinely, then ask what tomorrow’s first move is.')+' End with the question.');
  opSpeakUp(line); ui._opPressAt = Date.now();
  return true;
}
// the clock that runs it all
function opAccTick(){
  if(!state || !state.focus || !opCanSpeakUp()) return;
  const d = opDay(), m = nowMin(), start = opDayStart(), end = opDayEnd();
  if(m < start || m >= 23*60) return;
  // ignored: he spoke (a press, a check) and you never answered, and no work since
  if(d.waitFrom && Date.now() - d.waitFrom > 25*60000 && (AI.lastUserAt||0) < d.waitFrom && !deepWorkSince(d.waitFrom) && m < end + 60 && Date.now() - (d.escAt||0) > 50*60000 && (d.esc||0) < 3){ opEscalate(); return; }
  if(!d.askedAt && m >= start + 5 && m < 15*60){ opAskThree(); return; }
  if(!d.midAt && m >= Math.round((start + end)/2) && m < end){ opMidCheck(); return; }
  if(!d.reviewAt && opCommits().length && m >= end && m < 23*60){ opReview(); return; }
}
function deepWorkSince(ts){ return arr(state.focus.sessions).some(function(s){ return (s.startedAt||0) >= ts; }) || !!state.focus.activeSession; }
setInterval(function(){ try{ opAccTick(); }catch(e){} }, 30000);
// (his regular presses also wait for an answer, and count toward the escalation)
opPress = (function(base){ return function(){ return Promise.resolve(base.apply(this, arguments)).then(function(ok){ if(ok){ const d = opDay(); d.waitFrom = Date.now(); persist('focus'); } return ok; }); }; })(opPress);
// (you answering, or getting to work, resets it)
aiAsk = (function(base){ return function(){ const d = opDay(); if(d.waitFrom){ d.waitFrom = 0; d.esc = 0; persist('focus'); } return base.apply(this, arguments); }; })(aiAsk);

// ---- the scoreboard on his screen ----
function opAccHtml(){
  const cs = opCommits(), open = cs.filter(function(c){ return !c.done; }), done = cs.length - open.length, k = opKeptWeek(), dw = deepWorkMinutesTodayLive(), target = state.standards.deepWorkTargetMinutes || 180;
  const ps = typeof opPressStore==='function' ? opPressStore() : {}, next = ps.next && ps.next > Date.now() ? Math.round((ps.next - Date.now())/60000) : null;
  const streak = typeof computeStreak==='function' ? computeStreak() : 0, pct = Math.min(100, Math.round(dw/target*100));
  const date = new Date().toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
  return '<div class="oa-h"><span>Today</span><em>'+date+'</em>'+(streak ? '<b class="oa-streak" title="Days in a row">&#128293; '+streak+'</b>' : '')+'</div>'+
    '<div class="oa-row is-top"><div class="oa-k">Up next</div>'+(cs.length ? '<b>'+done+'<small> of '+cs.length+' done</small></b>' : '')+'</div>'+
    (open.length ? '<div class="oa-three">'+open.slice(0, 3).map(function(c, i){ return '<div class="oa-c" style="--i:'+i+'"><button class="oa-tick" data-action="completeTask" data-id="'+c.id+'" title="Done" aria-label="Mark done"></button><span>'+escapeHtml(c.t)+'</span></div>'; }).join('')+(open.length > 3 ? '<div class="oa-more">+'+(open.length - 3)+' more on today’s list</div>' : '')+'</div>'
      : cs.length ? '<div class="oa-all">&#10003; Everything on today’s list is done.</div>'
      : '<button class="oa-ask" data-action="opAskThree"><span>&#9673;</span>Nothing on today’s list. Tell Op what’s on</button>')+
    '<div class="oa-row"><div class="oa-k">Deep work</div><b>'+fmtDurationLabel(dw)+'<small> / '+fmtDurationLabel(target)+'</small></b></div>'+
    '<div class="oa-bar"><i style="width:'+pct+'%"></i></div>'+
    (k.made ? '<div class="oa-row"><div class="oa-k">Kept this week</div><b class="'+(k.kept/k.made >= .7 ? 'is-good' : k.kept/k.made < .4 ? 'is-bad' : '')+'">'+k.kept+'<small> of '+k.made+' tasks</small></b></div>' : '')+
    '<div class="oa-row"><div class="oa-k">He checks on you</div><b>'+(typeof opHold==='function' && opHold() ? 'after your break' : state.focus.activeSession ? 'while you work' : next!=null ? 'in '+(next < 60 ? next+'m' : Math.floor(next/60)+'h '+(next % 60)+'m') : 'soon')+'</b></div>'+
    '<div class="oa-btns"><button class="oa-lock" data-action="opAccLock">&#9654; Lock me in</button><button class="oa-press" data-action="opAccPress">Press me</button></div>';
}
function opAccDraw(){ const el = document.getElementById('opfAcc'); if(el && OPF.open) morphInto(el, opAccHtml()); }
setInterval(function(){ if(OPF.open) opAccDraw(); }, 15000);
// (a task done anywhere shows up on the scoreboard; finishing the last one gets a word)
completeTask = (function(base){
  return function(){
    const before = opOpen().length, r = base.apply(this, arguments);
    // (the task flips to done a beat later, after its little animation)
    setTimeout(function(){
      opAccDraw();
      if(before && !opOpen().length && opCommits().length && OPF.open){ if(typeof opMood==='function') opMood('excited', 8000); opSpeakUp(pickOne(['That’s the whole list. That’s what keeping your word looks like.', 'Everything on today’s list, done. Remember this feeling tomorrow morning.'])); }
    }, 700);
    return r;
  };
})(completeTask);
ACTIONS.opAskThree = function(){ OPF.touched = true; if(!OPF.open){ OV.cap = 'opBubText'; opBubShow(); } opDay().askedAt = 0; opAskThree(true); };
ACTIONS.opAccPress = function(){ OPF.touched = true; if(typeof opPress==='function') opPress(true); };
ACTIONS.opAccLock = function(){
  OPF.touched = true; if(state.focus.activeSession){ opfClose(); ui.view = 'focus'; renderView(); return; }
  const open = opOpen()[0];
  try{ opRunTool('lock_in', open ? {task:open.t} : {}); }catch(e){ return; }
  if(typeof opChatLog==='function') opChatLog('act', 'Locked in'+(open ? ' on “'+open.t+'”' : ''));
  opfClose(); renderView();
};

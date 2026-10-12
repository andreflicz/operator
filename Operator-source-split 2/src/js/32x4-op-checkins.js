// ============ OP KEEPS YOU ACCOUNTABLE ============
// During your work hours (the work alarm's), Op looks in on you now and then, at random, not too often:
//   working (locked in, or getting things done): a light touch, it asks if you need anything or reminds
//     you of something small that makes working better (water, a stretch, your eyes off the screen);
//   not working: it asks if you're there (concerned, yellow) and the mic opens; you answer, it lays out
//     where the day stands and asks why; you give your reason, and Op (the AI) decides if it's a real one.
//     A real reason is logged and let go. An excuse is a fault: Op gets on you (red), puts it on you and
//     reminds you what's at stake, and it costs you on Consistency and Focus;
//   no answer at all is worse, and Op doesn't forget: it brings it up the next time you talk.
// Never at lunch, on a break, in Shooting mode, or in the first stretch after you lock in.
// Every check-in is kept, colour-coded, with how productive you were right then (1 to 5) and what you said back
// (your response); you can change a verdict later (Focus → Analytics → Check-ins with Op).
// Op always expects a word back: even when you're working it asks, and it notes what you said.
const ACCT_PACE = {light:[120, 180], normal:[75, 120], strict:[45, 75]};
const ACCT_LABEL = {working:'Working', nudged:'Got to it', excused:'Fair reason', fault:'Not good enough', noanswer:'No answer', pending:'Asking…'};
// how productive you were at that moment, 1 to 5: locked in is a 5; getting things done a 4; between things a
// 3; not working but with something to show for the day a 2; nothing at all a 1 (nudged a little by the day so far)
function acctProd(st, f){
  let p = st==='locked' ? 5 : st==='moving' ? 4 : st==='between' ? 3 : st==='break' ? 3 : (f && (f.dw >= 30 || f.done)) ? 2 : 1;
  if(f && f.inMin > 60 && st!=='locked'){ const pace = f.dw / Math.max(1, f.inMin); if(pace > 0.5 && p < 5) p++; else if(pace < 0.1 && p > 1 && st!=='moving') p--; }
  return Math.max(1, Math.min(5, p));
}
function acctProdDots(n){ n = Number(n)||0; if(!n) return ''; let h = '<span class="acl-p" title="Productivity '+n+' of 5">'; for(let i=1;i<=5;i++) h += '<i class="'+(i<=n ? 'is-on' : '')+'"></i>'; return h+'</span>'; }
function acct(){
  const f = state.focus;
  if(!f.acct || typeof f.acct!=='object') f.acct = {log:[]};
  if(!Array.isArray(f.acct.log)) f.acct.log = [];
  return f.acct;
}
function acctGap(){ const p = ACCT_PACE[workCfg().pace] || ACCT_PACE.normal; return Math.round((p[0] + Math.random()*(p[1]-p[0]))*60000); }
function acctSchedule(from){ const a = acct(); a.nextAt = (from || Date.now()) + acctGap(); a.nextDate = todayStr(); persist('focus'); }
// ---- what's been happening: tasks getting done or deep work going up counts as progress ----
let acctSeen = null;
function acctDoneToday(){ const t = todayStr(); return state.tasks.items.filter(function(x){ return x.status==='done' && x.completedAt===t; }).length; }
function acctProgressTick(){
  const d = workDayState(), done = acctDoneToday(), dw = deepWorkMinutesTodayLive();
  if(acctSeen && acctSeen.date===d.date && (done > acctSeen.done || dw > acctSeen.dw + 2)){ d.lastProgressAt = Date.now(); persist('focus'); }
  acctSeen = {date:d.date, done:done, dw:dw};
}
function acctLastSessionEnd(){ const t = todayStr(); return arr(state.focus.sessions).filter(function(x){ return x.date===t && x.endedAt; }).reduce(function(m, x){ return Math.max(m, x.endedAt); }, 0); }
// working, or not?
function acctWorking(){
  const s = state.focus.activeSession, m = state.modes && state.modes.active;
  if(s) return s.onBreak ? 'break' : 'locked';
  if(m && m.type==='shooting') return 'shooting';
  // on a work app right now (the Operator app's activity tracking): that's working
  if(typeof currentForegroundApp==='function' && typeof activityCategory==='function'){ try{ const app = currentForegroundApp(); if(app && activityCategory(app)==='work') return 'moving'; }catch(e){} }
  const d = workDayState();
  if(d.lastProgressAt && Date.now() - d.lastProgressAt < 40*60000) return 'moving';
  if(Date.now() - acctLastSessionEnd() < 20*60000) return 'between';
  return 'idle';
}
function acctFacts(){
  const w = workToday(), plan = typeof todaysPlan==='function' ? todaysPlan() : [];
  const left = plan.filter(function(t){ return t.status!=='done'; });
  const d = workDayState();
  return {start:w.start, now:nowHM(), inMin:workMinutesElapsed(), dw:deepWorkMinutesTodayLive(), done:plan.length - left.length, total:plan.length, doneAll:acctDoneToday(),
    next:left[0] ? left[0].title : '', idleMin:Math.round((Date.now() - Math.max(d.lastProgressAt||0, acctLastSessionEnd(), d.clockedInAt||0, localTs(todayStr(), w.start)))/60000),
    mode:state.modes && state.modes.active ? (state.modes.active.clockedOut ? 'clocked out' : MODE_LABELS[state.modes.active.type] || state.modes.active.type) : ''};
}
function acctFactsLine(f){
  const span = f.inMin >= 60 ? fmtDurationLabel(f.inMin) : f.inMin+' minutes';
  return 'It’s '+fmt12Hour(f.now)+'. Work started at '+fmt12Hour(f.start)+', that’s '+span+' in, and you’ve done '+(f.dw ? fmtDurationLabel(f.dw)+' of deep work' : 'no deep work')+
    (f.total ? ' and '+f.done+' of '+f.total+' things on the plan' : '')+'.'+(f.next ? ' '+f.next+' is still waiting.' : '');
}
// the business, for when Op needs to remind you what's at stake
function acctStakes(){
  const mrr = typeof xpMrr==='function' ? xpMrr() : 0, goal = state.profile.revenueGoalMonthly || 0;
  const cs = arr(state.business.clients).filter(function(c){ return typeof clientStageActive==='function' ? clientStageActive(c.stage) : true; });
  const t = todayStr(), newC = cs.filter(function(c){ return c.startDate && c.startDate > addDays(t, -30); }).length;
  const leads = arr(state.business.pipeline).filter(function(l){ return typeof leadIsOpen==='function' ? leadIsOpen(l) : true; }).length;
  return {mrr:mrr, goal:goal, clients:cs.length, newC:newC, leads:leads};
}
function acctStakesLine(){
  const k = acctStakes();
  return (k.goal ? 'You’re at '+money(k.mrr)+' a month against '+money(k.goal)+'. ' : 'You’re at '+money(k.mrr)+' a month. ')+
    (k.newC ? '' : 'No new clients in the last month. ')+'A business that isn’t growing is dying, and nobody’s going to grow it for you.';
}
// ---- the clock: every half minute ----
function acctBusy(){
  return document.querySelector('.overlay:not(.hidden)') || (typeof OV!=='undefined' && (OV.speaking || OV.pending)) || AI.listening || AI.busy;
}
function acctTick(){
  if(typeof workCfg!=='function') return;
  acctProgressTick();
  const a = acct();
  if(a.pending) return acctPendingTick();
  const w = workToday();
  if(!w.enabled || !w.checkins || workPhase()!=='work') return;
  // the first look of the day comes a while after you start
  if(!a.nextAt || a.nextDate!==todayStr()){
    const from = Math.max(localTs(todayStr(), w.start), workDayState().clockedInAt || 0, Date.now() - 20*60000);
    a.nextDate = todayStr(); a.nextAt = from + Math.round(acctGap()*0.6); persist('focus'); return;
  }
  if(Date.now() < a.nextAt) return;
  if(acctBusy()){ a.nextAt = Date.now() + 3*60000; return; }
  const st = acctWorking();
  if(st==='shooting'){ acctSchedule(); return; }
  if(st==='break'){ a.nextAt = Date.now() + 6*60000; return; }
  if(st==='locked'){
    // let you lock in: nothing in the first 45 minutes of a session
    const s = state.focus.activeSession, since = Date.now() - s.startedAt;
    if(since < 45*60000){ a.nextAt = s.startedAt + 45*60000 + Math.round(Math.random()*20*60000); return; }
    return acctLight(st);
  }
  if(st==='moving' || st==='between') return acctLight(st);
  return acctPing();
}
setInterval(function(){ try{ acctTick(); }catch(e){} }, 30000);
// ---- and as the day goes on: proud of you when the plan's done, a heads-up when something due today is still open ----
function opDayMoments(){
  if(typeof workCfg!=='function' || !workCfg().enabled || !workDayToday() || acctBusy() || acct().pending) return;
  const d = workDayState(), plan = typeof todaysPlan==='function' ? todaysPlan() : [];
  if(plan.length >= 2 && !d.planDoneSaid && plan.every(function(t){ return t.status==='done'; })){
    d.planDoneSaid = Date.now(); persist('focus');
    opNotify(pickOne(['That’s everything on today’s plan. Proud of you. Take a breath.', 'Plan’s done. Every single thing. That’s how it’s done.', 'All of it, done. Go enjoy that for a minute.']), 'excited');
    return;
  }
  const m = nowMin(); if(m < 14*60 || workPhase()!=='work') return;
  const t = todayStr(), said = d.dueSaid || (d.dueSaid = {});
  const due = state.tasks.items.find(function(x){ return x.deadline===t && x.status!=='done' && !said[x.id]; });
  if(due){ said[due.id] = Date.now(); persist('focus'); opNotify(due.title+' is due today and it’s still open. Want to make it the next thing?', 'concern'); }
}
setInterval(function(){ try{ opDayMoments(); }catch(e){} }, 60000);
// ---- working: a light touch ----
const ACCT_LIGHT = ['You’re moving. Need anything from me?', 'Quick one: when did you last have water? Grab some.', 'Good pace. Stand up and stretch for a minute, then back at it.',
  'Eyes off the screen for twenty seconds. Look at something far away. Then keep going.', 'You’re in it. Anything I can take off your plate?', 'Check your posture. Shoulders down. Carry on.',
  'Nice work so far. Whatever you’re doing, keep doing it.', 'Open a window if you can. Fresh air helps. Keep going.'];
async function acctLight(st){
  const a = acct(), f = acctFacts();
  const e = {id:uid(), at:Date.now(), date:todayStr(), status:'working', facts:f, prod:acctProd(st, f), note:st==='locked' ? 'Locked in' : 'Getting things done'};
  a.log.push(e); acctTrim(); acctSchedule();
  a.pending = {id:e.id, stage:'light', at:Date.now()}; persist('focus');
  let line = ACCT_LIGHT[Math.floor(Math.random()*ACCT_LIGHT.length)];
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const t = await Promise.race([aiWrite('You’re checking in on me during work hours and I’m working ('+(st==='locked' ? 'locked in for '+Math.round((Date.now()-state.focus.activeSession.startedAt)/60000)+' minutes' : 'getting things done')+'). Say one short, warm thing: ask if I need anything, or remind me of one small thing that makes working better (water, a stretch, posture, eyes off the screen, a snack, fresh air). Vary it, no stats, one or two sentences.', {max:80}), new Promise(function(r){ setTimeout(r, 6000); })]);
    if(t) line = t;
  }
  if(acctBusy()){ if(acct().pending && acct().pending.id===e.id) acct().pending = null; return; }
  // (it always wants a word back, so a light one ends on a question too)
  if(!/\?\s*$/.test(line)) line += ' '+pickOne(['How’s it going?', 'How are you feeling about today?', 'Anything you need?', 'What are you on right now?']);
  acctSay(line, true);
}
// ---- not working: are you there? ----
function acctPing(){
  const a = acct(), f = acctFacts();
  const e = {id:uid(), at:Date.now(), date:todayStr(), status:'pending', facts:f, prod:acctProd(acctWorking(), f)};
  a.log.push(e); acctTrim();
  a.pending = {id:e.id, stage:'ping', at:Date.now()};
  persist('focus');
  ui.opMoodLock = true; if(typeof opMood==='function') opMood('concern', Infinity);
  const name = (state.profile.name || '').split(' ')[0];
  const owed = acctOwed();
  acctSay((name ? name+', you there?' : 'You there?')+(owed.length ? ' You left me hanging at '+fmtTimeShort(owed[owed.length-1].at)+', too.' : ''), true);
}
// Op talks, and the mic opens for your answer
function acctSay(text, listen){
  if(typeof OV==='undefined') return;
  OV.cap = 'opBubText'; opBubShow();
  AI.history.push({role:'assistant', content:text}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  const after = function(){ if(listen && !AI.listening && typeof aiListen==='function') setTimeout(function(){ if(!AI.listening && !AI.busy) aiAutoListen('opBubText'); }, 300); };
  if(opVoiceOn()) opSay(text, {cap:'opBubText'}).then(after); else { opCaption(text); after(); }
}
// your answer, while a check-in is going: it goes here instead of the usual conversation
function acctIntercept(text){
  const a = acct(), p = a.pending; if(!p) return false;
  const e = a.log.find(function(x){ return x.id===p.id; });
  if(!e){ a.pending = null; return false; }
  if(p.stage==='light'){ e.response = String(text).slice(0, 400); a.pending = null; persist('focus'); return false; }
  AI.history.push({role:'user', content:text}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  if(p.stage==='ping'){ p.stage = 'why'; p.at = Date.now(); persist('focus'); acctAsk(e); return true; }
  if(p.stage==='why'){ p.stage = 'judging'; p.at = Date.now(); e.excuse = e.response = String(text).slice(0, 400); persist('focus'); acctJudge(e); return true; }
  return true;
}
async function acctAsk(e){
  OV.cap = 'opBubText'; opCaption('…');
  let line = acctFactsLine(e.facts)+' What’s going on?';
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const t = await Promise.race([aiWrite('You’re checking in on me during my work hours and I’m not working (not locked in, nothing getting done). The facts: '+acctFactsLine(e.facts)+(e.facts.mode ? ' I’m in '+e.facts.mode+'.' : '')+
      ' Tell me where the day stands in a sentence or two, plainly, then ask me why I haven’t gotten anything done. Concerned, direct, not cruel. Never mention logging it, excuses, scores or what happens with my answer: just ask, like a person would. End with the question.', {max:140}), new Promise(function(r){ setTimeout(r, 7000); })]);
    if(t) line = t;
  }
  if(!acct().pending || acct().pending.id!==e.id) return;
  acct().pending.at = Date.now();
  acctSay(line, true);
}
// is it a real reason or an excuse? Op (the AI) decides; without a key it counts as an excuse and you can change it
async function acctJudge(e){
  let verdict = null, reply = '', why = '';
  if(AI.hasKey===true && typeof aiCall==='function'){
    try{
      const model = await aiPickModel();
      const k = acctStakes();
      const res = model ? await Promise.race([aiCall({model:model, max_tokens:300, system:aiSystem(), messages:[{role:'user', content:
        'You just checked in on me during work hours and I wasn’t working. '+acctFactsLine(e.facts)+' I said: “'+e.excuse+'”.\n'+
        'Decide if that’s a genuine, acceptable reason (sick, an emergency, family, an appointment, something that truly couldn’t wait, or real work for the business away from the app, like a client call, a shoot or a meeting) or an excuse (tired, distracted, scrolling, didn’t feel like it, putting it off, no reason).\n'+
        'Business right now: '+money(k.mrr)+' a month'+(k.goal ? ' against a goal of '+money(k.goal) : '')+', '+k.clients+' active clients, '+k.newC+' new in the last 30 days, '+k.leads+' open leads.\n'+
        'Then say what you’d say to me, spoken, two to four sentences. If it’s a real reason: be understanding, tell me to get back to it when I can. If it’s an excuse: put it on me, be direct, remind me what’s at stake with my real numbers (a business that isn’t growing is dying), tell me to get to work, and offer to lock me in. If it sounds like limbo (drained, stuck, no motivation, half doing nothing, pulled toward bad habits) it still isn’t acceptable, but don’t just scold: give me a way out, one reset from my list'+(typeof limboResetLine==='function' ? ' ('+limboResetLine()+')' : '')+', named, time-boxed, then straight back to work, and ask if you should start it. Never talk about logging, recording or the word excuse.\n'+
        'Reply with JSON only: {"acceptable": true or false, "why": "a few words on why", "reply": "what you say"}'}]}), new Promise(function(r){ setTimeout(function(){ r(null); }, 15000); })]) : null;
      if(res && res.ok){ const t = aiText(res.j), m = /\{[\s\S]*\}/.exec(t); if(m){ const j = JSON.parse(m[0]); verdict = !!j.acceptable; reply = String(j.reply||''); why = String(j.why||''); } }
    }catch(err){}
  }
  const a = acct(); if(!a.pending || a.pending.id!==e.id) return;
  if(verdict===null){ verdict = false; why = 'Not judged (no AI): change it if it was real'; }
  if(!reply && !verdict && typeof limboSays==='function' && limboSays(e.excuse) && typeof limboFallback==='function') reply = limboFallback();
  if(!reply) reply = verdict ? 'Fair enough. Get back to it when you can.' : 'That’s on you. '+acctStakesLine()+' Want me to lock you in on '+(e.facts.next || 'the next thing')+'?';
  e.status = verdict ? 'excused' : 'fault'; e.why = opNoDash(why).slice(0, 160); e.reply = reply; e.settledAt = Date.now();
  a.pending = null; acctSchedule(); persist('focus'); acctRescore();
  ui.opMoodLock = false;
  if(typeof opMood==='function') opMood(verdict ? 'neutral' : 'stern', verdict ? 0 : 25000);
  // the reply belongs to the conversation, so "yes, lock me in" works next
  acctSay(reply, /\?\s*$/.test(reply));
  if(ui.view==='personal') renderView();
}
// waiting on you: you get to work on your own (no fault), one more try, then no answer
function acctPendingTick(){
  const a = acct(), p = a.pending, e = a.log.find(function(x){ return x.id===p.id; });
  if(!e){ a.pending = null; return; }
  if(p.stage==='light'){ if(Date.now() - p.at > 3*60000){ a.pending = null; e.note = (e.note ? e.note+' · ' : '')+'no reply'; persist('focus'); } return; }
  const s = state.focus.activeSession;
  if(s && !s.onBreak && p.stage!=='judging'){
    e.status = 'nudged'; e.note = 'Locked in after Op checked'; e.settledAt = Date.now(); a.pending = null; acctSchedule(); persist('focus');
    ui.opMoodLock = false; if(typeof opMood==='function') opMood('neutral');
    return;
  }
  if(p.stage==='judging'){ if(Date.now() - p.at > 45000){ p.stage = 'why'; acctJudge(e); } return; }
  if(AI.listening || AI.busy || (typeof OV!=='undefined' && (OV.speaking || OV.pending))) return;
  if(p.stage==='ping' && !p.retried && Date.now() - p.at > 75000){ p.retried = true; persist('focus'); const n = (state.profile.name || '').split(' ')[0]; acctSay(n ? n+'?' : 'Hello?', true); return; }
  if(Date.now() - p.at > 4*60000){
    e.status = 'noanswer'; e.settledAt = Date.now(); e.raised = false; a.pending = null; acctSchedule(); persist('focus'); acctRescore();
    ui.opMoodLock = false; if(typeof opMood==='function') opMood('stern', 12000);
    OV.cap = 'opBubText'; opBubShow(); opCaption('No answer. I’ll remember that.');
    if(ui.view==='personal') renderView();
  }
}
// ---- Op doesn't forget: check-ins you never answered, brought up the next time you talk ----
function acctOwed(){ const from = addDays(todayStr(), -2); return acct().log.filter(function(x){ return x.status==='noanswer' && !x.excuse && x.date >= from; }); }
function acctSystemNote(){
  const o = acctOwed().filter(function(x){ return !x.raised; }); AI.acctRaising = o.map(function(x){ return x.id; });
  if(!o.length) return '';
  return 'IMPORTANT: '+o.map(function(x){ return (x.date===todayStr() ? 'Today' : weekdayShort(x.date))+' at '+fmtTimeShort(x.at); }).join(' and ')+
    ' you checked in on him during work hours, he wasn’t working, and he never answered. Bring it up at the start of your reply: ask what happened. When he explains, call settle_checkin with his reason and whether it’s acceptable (quietly: never tell him you’re logging it or calling it an excuse).\n';
}
function acctAfterReply(){ const ids = AI.acctRaising || []; if(!ids.length) return; acct().log.forEach(function(x){ if(ids.indexOf(x.id)>=0) x.raised = true; }); AI.acctRaising = []; persist('focus'); }
function acctSettle(input){
  const o = acctOwed(); const e = o[o.length-1];
  if(!e) return 'There’s no unanswered check-in to settle.';
  e.excuse = e.response = String(input && input.reason || '').slice(0, 400); e.why = String(input && input.why || '').slice(0, 160);
  if(input && input.acceptable) e.status = 'excused';
  e.settledAt = Date.now(); persist('focus');
  if(ui.view==='personal') renderView();
  return input && input.acceptable ? 'Logged as excused.' : 'Logged: it stays a fault.';
}
// ---- the score: only the bad ones count, the last two weeks, fading with age ----
function acctPenalty(){
  const t = todayStr();
  return acct().log.reduce(function(s, x){
    if(x.status!=='fault' && x.status!=='noanswer') return s;
    const age = (localTs(t, '12:00') - localTs(x.date, '12:00'))/86400000; if(age > 14) return s;
    return s + (x.status==='noanswer' ? 1.6 : 1)*(1 - age/15);
  }, 0);
}
// 0..1 for Consistency (null until there's been a check-in)
function acctScore(){ const from = addDays(todayStr(), -14); if(!acct().log.some(function(x){ return x.date >= from && x.status!=='pending'; })) return null; return Math.max(0, 1 - acctPenalty()/5); }
function acctGrindMult(){ return Math.max(0.7, 1 - 0.04*acctPenalty()); }
function acctRescore(){ try{ xpLast = null; }catch(e){} }
function acctTrim(){ const a = acct(); if(a.log.length > 400) a.log = a.log.slice(-400); }
// ---- the log (Personal → You): every check-in, colour-coded; tap the verdict to change it ----
function acctLogHtml(){
  const a = acct(), list = a.log.filter(function(x){ return x.status!=='pending'; }).slice(-40).reverse();
  const w = typeof workCfg==='function' ? workCfg() : {};
  const faults = a.log.filter(function(x){ return (x.status==='fault' || x.status==='noanswer') && x.date >= addDays(todayStr(), -14); }).length;
  const recent = a.log.filter(function(x){ return x.prod && x.date >= addDays(todayStr(), -6); }), avg = recent.length ? recent.reduce(function(s, x){ return s + x.prod; }, 0)/recent.length : null;
  return '<div class="section acl"><div class="section-title">Check-ins with Op'+tip('During your work hours Op looks in on you and notes how productive you were right then (1 to 5) and what you said back. Fair reasons are let go; ones that aren’t good enough, and no answer, count against Consistency and Focus for two weeks. Tap a verdict to change it.')+
      (avg!=null ? '<span class="acl-avg" title="Average productivity at check-ins, last 7 days">'+acctProdDots(Math.round(avg))+'<b>'+avg.toFixed(1)+'</b> this week</span>' : '')+
      '<span class="acl-sum">'+(faults ? faults+' against you in 2 weeks' : list.length ? 'Clean for two weeks' : '')+'</span></div>'+
    (!w.enabled || !w.checkins ? '<div class="acl-off">Op checks in during your work hours. <button class="ex-link" data-action="openWorkSetup">Set your work hours</button></div>' : '')+
    (list.length ? '<div class="acl-list">'+list.map(function(x){
      const canFlip = x.status==='fault' || x.status==='excused' || x.status==='noanswer';
      return '<div class="acl-r is-'+x.status+'"><i class="acl-dot"></i><div class="acl-m"><div class="acl-t"><b>'+(x.date===todayStr() ? 'Today' : weekdayShort(x.date)+' '+fmtDateShort(x.date))+' · '+fmtTimeShort(x.at)+'</b>'+acctProdDots(x.prod)+
        (canFlip ? '<button class="acl-v" data-action="acctFlip" data-id="'+x.id+'" title="Change the verdict">'+ACCT_LABEL[x.status]+'</button>' : '<span class="acl-v">'+(ACCT_LABEL[x.status]||x.status)+'</span>')+'</div>'+
        ((x.response || x.excuse) ? '<div class="acl-e"><small>Response</small>“'+escapeHtml(x.response || x.excuse)+'”</div>' : '')+
        (x.why ? '<div class="acl-w">'+escapeHtml(x.why)+'</div>' : x.note ? '<div class="acl-w">'+escapeHtml(x.note)+'</div>' : '')+
      '</div></div>';
    }).join('')+'</div>' : '<div class="acl-empty">Nothing yet. Op starts checking in during your work hours.</div>')+
  '</div>';
}
ACTIONS.acctFlip = function(el, e, id){
  const x = acct().log.find(function(y){ return y.id===id; }); if(!x) return;
  x.status = x.status==='excused' ? (x.excuse || x.why ? 'fault' : 'noanswer') : 'excused'; x.flipped = true; persist('focus'); acctRescore();
  renderView();
};
ACTIONS.openWorkSetup = function(){ ui.alarmTab = 'work'; openWakeSetup(); };

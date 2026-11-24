// ============ OP HAS YOUR BACK: THE THINGS YOU SAID YOU'D DO ============
// A reminder you set, a follow-up with a client, a task due today or already late: Op brings it up out
// loud, like an assistant who's watching your back. One thing at a time, said plainly, ending on whether
// you want help with it (set a time, draft the message, put it on today). A few times a day at most,
// never while you're locked in or asleep, never the same thing twice in a day. The mic opens for your answer.
// Also: the recap lets you put an auto lock-in on a task (auto lock-in never picks one for you).

function opNudgeItems(){
  const today = todayStr(), out = [];
  (typeof followUpsDue==='function' ? followUpsDue(today) : []).forEach(function(f){
    out.push({id:'fu:'+f.kind+':'+(f.x && f.x.id)+':'+f.date, w:f.late ? 3 : 2, short:'follow up with '+f.name,
      fact:'He set a follow-up with '+f.name+(f.late ? ' for '+f.date+', and it still hasn’t happened' : ' for today')+(f.note ? ' (his note: "'+f.note+'")' : '')+'.'});
  });
  arr(state.focus.reminders).filter(function(r){ return r.date && r.date <= today && !r.done; }).forEach(function(r){
    if(r.time && r.date===today && localTs(r.date, r.time) > Date.now()) return;  // (not yet: it'll ring on time)
    out.push({id:'rm:'+r.id, w:r.date < today ? 3 : 2, short:r.label, fact:'He set himself a reminder: "'+r.label+'"'+(r.date < today ? ' (it was for '+fmtDateShort(r.date)+' and is still open)' : r.time ? ' (it went off at '+fmt12Hour(r.time)+')' : ' (for today)')+'.'});
  });
  state.tasks.items.filter(function(t){ return t.status!=='done' && t.deadline && t.deadline <= today; }).forEach(function(t){
    out.push({id:'td:'+t.id+':'+today, w:t.deadline < today ? 3 : 1, short:t.title, fact:'A task '+(t.deadline < today ? 'that was due '+fmtDateShort(t.deadline)+' and is overdue' : 'due today')+': "'+t.title+'".'});
  });
  return out.sort(function(a, b){ return b.w - a.w; });
}
function opNudgeStore(){ const p = state.profile, t = todayStr(); if(!p.opNudge || p.opNudge.date!==t) p.opNudge = {date:t, n:0, last:0, said:[]}; return p.opNudge; }
function opNudgeNext(){ const s = opNudgeStore(); return opNudgeItems().find(function(x){ return s.said.indexOf(x.id) < 0; }) || null; }
function opNudgeDue(){
  if(!state || !state.profile || AI.busy || AI.listening || (typeof OV!=='undefined' && (OV.speaking || OV.pending))) return false;
  const m = state.modes && state.modes.active;
  if(state.focus.activeSession || (m && (m.sleep || m.type==='shooting'))) return false;
  if(document.querySelector('.overlay:not(.hidden)') || (typeof inspOpenNow==='function' && inspOpenNow())) return false;
  const h = new Date().getHours(); if(h < 9 || h >= 21) return false;
  const s = opNudgeStore(); if(s.n >= 3 || Date.now() - s.last < 100*60000) return false;
  if(Date.now() - (ui._opActiveAt || 0) < 40000) return false;
  return !!opNudgeNext();
}
async function opNudge(force){
  if(!force && !opNudgeDue()) return false;
  const it = opNudgeNext(); if(!it) return false;
  const s = opNudgeStore(); s.n++; s.last = Date.now(); s.said.push(it.id); persist('profile');
  let line = pickOne(['Quick one: ', 'Hey, before I forget: ', 'One thing: '])+it.short.charAt(0).toUpperCase()+it.short.slice(1)+(it.w >= 3 ? ' is still hanging.' : ' is on for today.')+' Want me to help you get it done?';
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const t = await Promise.race([aiWrite('You noticed something I said I’d do and haven’t done yet. '+it.fact+'\nBring it up out loud, like a sharp assistant who has my back: one or two short spoken sentences. Name it plainly, say why it matters if it does, and end by asking if I want your help with it (set a time, draft the message, put it on today, or just mark it done). Don’t nag, don’t guilt, don’t mention reminders or the app.', {max:140}), new Promise(function(r){ setTimeout(r, 9000); })]);
    if(t) line = t;
  }
  if(state.focus.activeSession) return false;
  AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  OV.cap = 'opBubText'; opBubShow();
  if(opVoiceOn()) opSay(line, {cap:'opBubText'}); else opCaption(line);
  return true;
}
setInterval(function(){ try{ if(opNudgeDue()) opNudge(); }catch(e){} }, 60000);
// what Op knows when you answer
aiContext = (function(base){ return function(){ const s = state.profile.opNudge, last = s && s.said.length ? opNudgeItems().find(function(x){ return x.id===s.said[s.said.length-1]; }) : null;
  return base.apply(this, arguments)+(last && Date.now() - s.last < 20*60000 ? '\nYou just brought this up with him: '+last.fact+' If he says yes, help with it right away using your tools (a reminder at a set time, add it to today, draft the message). If he says it’s done, take his word and drop it.' : ''); }; })(aiContext);
// the daily question is said out loud too (and the mic opens for the answer); something you said
// you'd do comes first
opAskQuestion = async function(){
  if(!opQuestionDue() || opNudgeNext()) return;
  state.profile.opAskedOn = todayStr(); persist('profile');
  const q = await aiWrite('Ask me one short, specific question that would help you understand my business or me better and fill a gap in what you know (a client with no notes, a lead going nowhere, a goal you don’t understand, how I like to work). One sentence, no preamble, nothing else.', {max:120});
  if(!q || document.querySelector('.overlay:not(.hidden)') || state.focus.activeSession) return;
  AI.history.push({role:'assistant', content:q}); if(AI.history.length > 16) AI.history = AI.history.slice(-16);
  OV.cap = 'opBubText'; opBubShow();
  if(opVoiceOn()) opSay(q, {cap:'opBubText'}); else opCaption(q);
};

// ---- the recap: put an auto lock-in on a task, if you want ----
function recapTaskList(){ return state.tasks.items.filter(function(t){ return t.status!=='done' && !t.skill; }).sort(function(a, b){ return (a.status==='today' ? 0 : 1) - (b.status==='today' ? 0 : 1); }).slice(0, 8); }
ACTIONS.recapTaskOpen = function(el, e, id){ ui.recapTaskFor = ui.recapTaskFor===id ? null : id; renderView(); if(typeof renderRecapInto==='function') try{ renderRecapInto(); }catch(e2){} };
ACTIONS.recapSetTask = function(el){
  const sid = el.dataset.sid, tid = el.dataset.tid;
  const s = state.focus.sessions.find(function(x){ return x.id===sid; }), t = state.tasks.items.find(function(x){ return x.id===tid; });
  if(!s || !t) return;
  if(s.taskId && s.taskId!==tid){ const o = state.tasks.items.find(function(x){ return x.id===s.taskId; }); if(o) o.trackedMinutes = Math.max(0, (o.trackedMinutes||0) - (s.minutes||0)); }
  if(s.taskId!==tid) t.trackedMinutes = (t.trackedMinutes||0) + (s.minutes||0);
  s.taskId = tid; s.taskTitle = t.title; s.reviewed = true; ui.recapTaskFor = null;
  persist('focus'); persist('tasks'); playTick(); renderView(); if(typeof renderRecapInto==='function') try{ renderRecapInto(); }catch(e){}
};
function recapTaskHtml(s){
  if(!s.auto) return '';
  return '<span class="rc-task">'+(s.taskTitle ? '<button class="rc-task-b is-set" data-action="recapTaskOpen" data-id="'+s.id+'" title="Change the task">&#10003; '+escapeHtml(s.taskTitle)+'</button>' : '<button class="rc-task-b" data-action="recapTaskOpen" data-id="'+s.id+'" title="Put this time on a task">+ Task</button>')+
    (ui.recapTaskFor===s.id ? '<span class="rc-task-menu">'+(recapTaskList().map(function(t){ return '<button data-action="recapSetTask" data-sid="'+s.id+'" data-tid="'+t.id+'">'+escapeHtml(t.title)+'</button>'; }).join('') || '<em>No open tasks</em>')+'</span>' : '')+'</span>';
}

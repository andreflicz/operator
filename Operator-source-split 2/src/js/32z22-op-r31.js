// ============ OP, ROUND 31: CLEAR ACTIONS, REAL BREAKS, QUIET WHEN THERE'S NO ONE TO TALK TO ============
// The bigger problem behind "Op suggested a break and started a lock-in": he was told to act on what
// you "clearly imply", to do the thing right away when you say yes, and (when pressing you) to offer to
// lock you in. So one reply could hold two offers, and a loose "ok" counted as yes to both. Now:
//  • one offer per reply, and the big moves (lock in, clock out, delete) need a plain yes to that move
//  • a break is a break: Op sets a time to check back (check_back) and leaves you alone till then; no
//    lock-in, no presses, no check-ins in the meantime. Same when you're testing the app or resting:
//    nothing starts until you ask. The lock-in tool itself refuses while a break is on, unless you asked
//  • he never checks in while you're asleep or shooting: there's no one to talk to
// Also: goals connect to the business. A goal like "$10k MRR" or "8 clients" links itself to the live
// numbers and shows where it's coming from (each client, and what the open leads would add). And Op knows
// your habits and schedule (when you wake, work, train, sleep) without being told again.

// ---- how he acts ----
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.push({type:'text', text:
      'How you act (round 31, these win over anything above):\n'+
      '- One offer per reply. Never put a break and a lock-in in the same reply.\n'+
      '- The big moves need a plain yes to that exact move: lock_in, clock out, lock_out, delete_task. "Ok" to something else, or to a break, is not a yes to locking in.\n'+
      '- If he needs a break, or says he’s on one, set a time to check back with check_back and let him rest. If he says he’s testing the app, resting or busy with life, use check_back too (reason "testing" or "rest"). Don’t offer or start a lock-in while that’s on unless he asks for it.\n'+
      '- When you do something, say exactly what you did in plain words (what, and when if it’s timed). Nothing silent, nothing vague.'});
    return s;
  };
})(aiSystem);

// ---- breaks and holds ----
function opHold(){ const h = state.focus.opHold; return h && h.until > Date.now() ? h : null; }
OP_TOOLS.push({name:'check_back', description:'He’s taking a break (or testing the app, or resting): leave him alone and check back at a set time. No lock-ins, presses or check-ins until then unless he asks. Use minutes from now, or a time.', input_schema:{type:'object', properties:{minutes:{type:'integer'}, time:{type:'string', description:'HH:MM, 24-hour'}, reason:{type:'string', enum:['break', 'testing', 'rest', 'other']}, note:{type:'string'}}, additionalProperties:false}},
  {name:'end_break', description:'He’s back from his break early (or asked you to stop holding off).', input_schema:{type:'object', properties:{}, additionalProperties:false}});
OP_ACTION_TOOLS.push('check_back', 'end_break');
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='check_back'){
      let until;
      if(x.time){ if(!/^\d{2}:\d{2}$/.test(x.time)) throw new Error('time must be HH:MM'); until = localTs(todayStr(), x.time); if(until < Date.now()) until += 86400000; }
      else until = Date.now() + Math.max(5, Math.min(240, Number(x.minutes) || 15))*60000;
      state.focus.opHold = {until:until, reason:x.reason || 'break', note:String(x.note||'').slice(0, 200), set:Date.now()};
      persist('focus');
      return 'checking back at '+fmt12Hour(nowHM(new Date(until)))+' ('+(x.reason || 'break')+'); nothing until then';
    }
    if(name==='end_break'){ state.focus.opHold = null; persist('focus'); return 'break over'; }
    if(name==='lock_in' && opHold()){
      const said = String(AI.lastUserText||'').toLowerCase();
      if(!/\block(?:ing)?\s*(?:me\s*)?in\b|\bstart (?:a |the )?(?:session|timer|lock)|\blet'?s (?:go|work|lock)|\bback to work\b/.test(said)) throw new Error('he’s on a '+opHold().reason+' until '+fmt12Hour(nowHM(new Date(opHold().until)))+'; don’t lock him in unless he asks');
      state.focus.opHold = null; persist('focus');
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
aiAsk = (function(base){ return function(text){ AI.lastUserText = String(text||''); return base.apply(this, arguments); }; })(aiAsk);
aiContext = (function(base){
  return function(){
    const h = opHold(), s = base.apply(this, arguments);
    return s+(h ? '\nRight now he’s on a '+h.reason+(h.note ? ' ('+h.note+')' : '')+' until '+fmt12Hour(nowHM(new Date(h.until)))+'. Respect it: no lock-in offers, no pressing.' : '');
  };
})(aiContext);
// when the break's up, Op checks back (once)
setInterval(function(){
  try{
    const h = state.focus.opHold; if(!h || h.until > Date.now() || h.checked) return;
    if(opQuietNow() || AI.busy || AI.listening || OV.speaking || OV.pending) return;
    h.checked = true; state.focus.opHold = null; persist('focus');
    if(state.focus.activeSession) return;
    let line = h.reason==='testing' ? 'Done testing? How’s the app treating you?' : h.reason==='rest' ? 'Hope that rest did something. How are you feeling?' : pickOne(['Break’s up. How are you feeling?', 'That’s the break. Feel any better?', 'Time’s up on the break. Ready when you are: what’s first?']);
    const go = function(){ AI.history.push({role:'assistant', content:line}); if(AI.history.length > 16) AI.history = AI.history.slice(-16); OV.cap = 'opBubText'; opBubShow(); if(opVoiceOn()) opSay(line, {cap:'opBubText'}); else opCaption(line); };
    if(AI.hasKey===true && typeof aiWrite==='function') Promise.race([aiWrite('You told him you’d check back after his '+h.reason+(h.note ? ' ('+h.note+')' : '')+'. It’s time. One short spoken line: check in on how he’s doing and ask one question (how he feels, or what he wants to do next). Don’t start or push a lock-in in this line.', {max:60}), new Promise(function(r){ setTimeout(r, 6000); })]).then(function(t){ if(t) line = t; go(); });
    else go();
  }catch(e){}
}, 20000);

// ---- quiet while you're asleep or shooting (and while a break is on) ----
function opQuietNow(){ const m = state.modes && state.modes.active; return !!(m && (m.sleep || m.type==='shooting')); }
function opHoldQuiet(){ return opQuietNow() || !!opHold(); }
acctTick = (function(base){ return function(){ if(opHoldQuiet()){ const a = typeof acct==='function' ? acct() : null; if(a && a.nextAt && a.nextAt < Date.now() + 5*60000) a.nextAt = Date.now() + 5*60000; return; } return base.apply(this, arguments); }; })(acctTick);
opDayMoments = (function(base){ return function(){ if(opHoldQuiet()) return; return base.apply(this, arguments); }; })(opDayMoments);
opQuestionDue = (function(base){ return function(){ if(opHoldQuiet()) return false; return base.apply(this, arguments); }; })(opQuestionDue);
opNudgeDue = (function(base){ return function(){ if(opHoldQuiet()) return false; return base.apply(this, arguments); }; })(opNudgeDue);
opTapDue = (function(base){ return function(){ if(opHoldQuiet()) return false; return base.apply(this, arguments); }; })(opTapDue);
opPressDue = (function(base){ return function(){ if(opHoldQuiet()) return false; return base.apply(this, arguments); }; })(opPressDue);
if(typeof sysRevDue==='function') sysRevDue = (function(base){ return function(){ if(opQuietNow()) return 0; return base.apply(this, arguments); }; })(sysRevDue);

// ---- goals that connect to the business ----
GOAL_TRACKERS.newclients = {icon:'&#129309;', label:'New clients', unit:'clients', src:'from clients you sign (their start date)', periods:true, name:function(g){ return fmtGoalNum(g.target)+' new clients '+goalPeriodLabel(g); }};
GOAL_TRACKERS.leads = {icon:'&#127919;', label:'Open leads', unit:'leads', src:'from Business → Leads (still open)', name:function(g){ return fmtGoalNum(g.target)+' open leads'; }};
function goalOpenLeads(){ return arr(state.business.pipeline).filter(function(l){ return !l.convertedClientId && l.stage!=='lost' && l.stage!=='closed'; }); }
goalLiveCurrentRaw = (function(base){
  return function(g){
    if(g && g.autoTrack==='newclients'){ const r = goalRange(g); return arr(state.business.clients).filter(function(c){ const d = c.startDate || c.createdAt; return d && d >= r[0] && d <= r[1]; }).length; }
    if(g && g.autoTrack==='leads') return goalOpenLeads().length;
    return base.apply(this, arguments);
  };
})(goalLiveCurrentRaw);
// a goal written in words links itself: "$10k MRR", "hit 8 clients", "sign 3 new clients", "5k followers"
function goalGuessTrack(label){
  const t = String(label||'').toLowerCase(), num = function(re){ const m = re.exec(t); if(!m) return null; let n = parseFloat(m[1].replace(/,/g, '')); if(/k/.test(m[2]||'')) n *= 1000; return n; };
  let n;
  if(/mrr|revenue|a month|\/mo|per month|monthly/.test(t) && (n = num(/\$?\s*([\d,.]+)\s*(k)?/))) return {track:'mrr', target:n};
  if(/new clients?|sign\s+\d+|land\s+\d+|close\s+\d+/.test(t) && (n = num(/([\d,.]+)\s*(k)?\s*(?:new\s+)?clients?/) || num(/(?:sign|land|close)\s+([\d,.]+)()/))) return {track:'newclients', target:n};
  if(/clients?/.test(t) && (n = num(/([\d,.]+)\s*(k)?\s*(?:active\s+)?clients?/))) return {track:'clients', target:n};
  if(/leads?/.test(t) && (n = num(/([\d,.]+)\s*(k)?\s*(?:open\s+)?leads?/))) return {track:'leads', target:n};
  if(/followers?/.test(t) && (n = num(/([\d,.]+)\s*(k)?\s*followers?/))) return {track:'followers', target:n};
  return null;
}
function goalAutoLink(){
  let changed = false;
  arr(state.goals && state.goals.items).forEach(function(g){
    if(g.tier || g.autoTrack || g.done || g.linkChecked) return;
    g.linkChecked = true; changed = true;
    const m = goalGuessTrack(g.label); if(!m) return;
    g.autoTrack = m.track; if(!(g.target > 0)) g.target = m.target; g.unit = GOAL_TRACKERS[m.track].unit;
    if(GOAL_TRACKERS[m.track].periods && !g.period) g.period = 'month';
  });
  if(changed) persist('goals');
}
afterRenderHooks.push(function(){ try{ goalAutoLink(); }catch(e){} });
// where an MRR or clients goal stands: who it's coming from, and what the open leads would add
goalCardHtml = (function(base){
  return function(g, compact){
    const h = base.apply(this, arguments);
    if(compact || !g || (g.autoTrack!=='mrr' && g.autoTrack!=='clients' && g.autoTrack!=='newclients')) return h;
    const cs = arr(state.business.clients).filter(function(c){ return c.status==='active' && Number(c.mrr) > 0; }).sort(function(a, b){ return b.mrr - a.mrr; });
    const leads = goalOpenLeads().filter(function(l){ return Number(l.value) > 0; });
    const lv = leads.reduce(function(a, l){ return a + Number(l.value); }, 0);
    const left = g.autoTrack==='mrr' ? Math.max(0, Number(g.target) - activeMrr()) : 0, avg = cs.length ? cs.reduce(function(a, c){ return a + Number(c.mrr); }, 0)/cs.length : 0;
    const from = cs.slice(0, 4).map(function(c){ return '<span class="gl-c">'+escapeHtml(c.business || c.name)+' <b>'+money(c.mrr)+'</b></span>'; }).join('')+(cs.length > 4 ? '<span class="gl-c">+'+(cs.length - 4)+' more</span>' : '');
    const more = '<div class="gl-more">'+(leads.length ? '&#127919; '+leads.length+' open lead'+(leads.length===1 ? '' : 's')+' worth '+money(lv)+'/mo' : 'No open leads with a value yet')+
      (left && avg ? ' &middot; about <b>'+Math.ceil(left/avg)+'</b> more client'+(Math.ceil(left/avg)===1 ? '' : 's')+' at your average to get there' : '')+'</div>';
    const add = '<div class="goal-links">'+(from ? '<div class="gl-from">'+from+'</div>' : '')+more+'</div>';
    const i = h.lastIndexOf('<div class="goal-card-actions">');
    return i > 0 ? h.slice(0, i)+add+h.slice(i) : h.replace(/<\/div>$/, add+'</div>');
  };
})(goalCardHtml);

// ---- Op knows your habits and schedule without being told again ----
function opHabitsLine(){
  const today = todayStr(), days = [];
  for(let i = 1; i <= 14; i++) days.push(addDays(today, -i));
  const dw = days.map(function(d){ return deepWorkMinutesFor(d); }), worked = dw.filter(function(m){ return m > 0; });
  const avg = worked.length ? Math.round(worked.reduce(function(a, m){ return a + m; }, 0)/worked.length) : 0;
  const byDow = [0, 0, 0, 0, 0, 0, 0], nDow = [0, 0, 0, 0, 0, 0, 0];
  days.forEach(function(d, i){ const w = new Date(d+'T12:00').getDay(); byDow[w] += dw[i]; nDow[w]++; });
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], best = byDow.map(function(v, i){ return {i:i, v:nDow[i] ? v/nDow[i] : 0}; }).sort(function(a, b){ return b.v - a.v; });
  const starts = arr(state.focus.sessions).filter(function(s){ return s.date >= days[13]; }).map(function(s){ const t = new Date(s.startedAt); return t.getHours()*60 + t.getMinutes(); }).sort(function(a, b){ return a - b; });
  const firstStart = starts.length ? starts[Math.floor(starts.length/4)] : null;
  const gym = arr(state.health.gymLog).filter(function(w){ return w.date >= days[13]; }).length;
  const w = typeof wakeCfg==='function' ? wakeCfg() : {};
  const sl = arr(state.focus.sleepLog || []).slice(-7);
  return 'His habits (last two weeks): worked '+worked.length+' of 14 days, about '+fmtDurationLabel(avg)+' on a day he works; strongest days '+best.slice(0, 2).map(function(b){ return names[b.i]; }).join(' and ')+
    (firstStart!=null ? '; usually starts around '+fmt12Hour(String(Math.floor(firstStart/60)).padStart(2, '0')+':'+String(firstStart%60).padStart(2, '0')) : '')+
    '; '+gym+' workout'+(gym===1 ? '' : 's')+(w.enabled && w.time ? '; wake alarm '+fmt12Hour(w.time) : '')+(sl.length ? '; sleep logged '+sl.length+' nights lately' : '')+'.';
}
aiContext = (function(base){ return function(){ let s = base.apply(this, arguments); try{ s += '\n'+opHabitsLine(); }catch(e){} return s; }; })(aiContext);
// (and you can pick them when you add a goal)
GOAL_KINDS.splice(GOAL_KINDS.indexOf('clients') + 1, 0, 'newclients', 'leads');
goalNowText = (function(base){ return function(kind){ if(kind==='newclients'){ const m = thisMonthKey(); return arr(state.business.clients).filter(function(c){ return monthKeyOf(c.startDate || c.createdAt || '')===m; }).length+' this month'; } if(kind==='leads') return goalOpenLeads().length+' open'; return base.apply(this, arguments); }; })(goalNowText);

// ---- check-ins are an Op setting now, not part of an alarm ----
workSetupHtml = (function(base){
  return function(){
    return base.apply(this, arguments)
      .replace(/<div class="field"><label>Op checks in on you[\s\S]*?<\/div><\/div>/, '')
      .replace(/<div class="field"><label>How often<\/label>[\s\S]*?<\/div><\/div>/, '')
      .split(' Your work hours are when Op checks in on you.').join('');
  };
})(workSetupHtml);
ACTIONS.opCheckinSet = function(el){ const w = workCfg(), k = el.dataset.k, v = el.dataset.id; w[k] = v==='true' ? true : v==='false' ? false : v; persist('focus'); renderView(); };
operatorSettingsHtml = (function(base){
  return function(){
    const w = workCfg(), seg = function(key, opts){ return '<div class="seg-tabs seg-sm" style="margin:0;">'+opts.map(function(o){ return '<button class="seg-tab'+(String(w[key])===String(o[0]) ? ' active' : '')+'" data-action="opCheckinSet" data-k="'+key+'" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'; };
    return '<div class="card section op-settings"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#128064; Op checks in on you</div><div class="kpi-sub">During your work hours.</div></div>'+
      '<div class="row" style="gap:8px;flex-wrap:wrap;justify-content:flex-end;">'+seg('checkins', [[true, 'On'], [false, 'Off']])+(w.checkins!==false ? seg('pace', [['light', 'Now and then'], ['normal', 'Normal'], ['strict', 'Strict']]) : '')+'</div></div></div>'+
      base.apply(this, arguments);
  };
})(operatorSettingsHtml);

// ---- the revenue goal lives in Goals: an MRR goal there and the revenue target elsewhere stay the same number ----
// (change it in either place and the other follows)
afterRenderHooks.push(function(){
  try{
    const p = state.profile, g = arr(state.goals && state.goals.items).find(function(x){ return x.autoTrack==='mrr' && !x.tier && !x.done; });
    if(!g) return;
    if(p.revGoalSync!=null && Number(p.revenueGoalMonthly)!==Number(p.revGoalSync) && Number(p.revenueGoalMonthly) > 0){ g.target = Number(p.revenueGoalMonthly); persist('goals'); }
    else if(Number(g.target) > 0 && Number(p.revenueGoalMonthly)!==Number(g.target)){ p.revenueGoalMonthly = Number(g.target); }
    if(p.revGoalSync!==p.revenueGoalMonthly){ p.revGoalSync = p.revenueGoalMonthly; persist('profile'); }
  }catch(e){}
});


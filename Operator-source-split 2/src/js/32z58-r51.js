// ============ ROUND 51 ============
// ---- 1. One Op ----
// With live mode on, Op is the ElevenLabs agent and nothing else: everything you say or type goes to him, once.
// Before, a second ear (the "Hey Op" listener, or Scribe) heard the same words the agent heard and passed them
// on as a typed message, so he answered twice; and anything said before the call connected went to the old
// Claude brain, which answered in the other voice. Now:
//  • while the agent is on the line, no other listener runs, and the old voice never speaks over him;
//  • the only text sent to him is what you actually typed (and never words he just heard you say);
//  • anything asked while he's connecting waits and goes to him when he's up; the old brain only answers if
//    the agent can't start at all;
//  • his voice uses the same model and settings as Op's normal voice, so it's the voice you picked, not a
//    flatter copy of it.
const OP1 = {pending:[], heard:null, inputAt:0};
function r51Words(t){ return String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean); }
function r51Same(a, b){
  const A = r51Words(a), B = r51Words(b); if(!A.length || !B.length) return false;
  const s = {}; B.forEach(function(w){ s[w] = 1; });
  return A.filter(function(w){ return s[w]; }).length/Math.max(A.length, B.length) >= 0.6;
}
// (typed: Enter in a text box, or a tap on one of Op's own buttons)
document.addEventListener('keydown', function(e){ const t = e.target; if(e.key==='Enter' && t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA')) OP1.inputAt = Date.now(); }, true);
document.addEventListener('pointerdown', function(e){ if(e.target && e.target.closest && e.target.closest('.op-bub, #opBub, .opf, [data-op-chip], button[type="submit"]')) OP1.inputAt = Date.now(); }, true);
function r51Typed(){ return Date.now() - Math.max(OP1.inputAt, AI.typedAt || 0) < 4000; }
function r51Busy(){ return opLiveOn() && OPRT.state!=='off'; }
aiAsk = (function(base){
  return function(text, cap){
    const t = String(text || '').trim(); if(!t) return;
    if(!opLiveOn()) return base.apply(this, arguments);
    if(OPRT.state==='live'){
      if(OP1.heard && Date.now() - OP1.heard.at < 20000 && r51Same(t, OP1.heard.t)) return;   // he already heard it
      if(!r51Typed()) return;   // another ear picked up what he's already hearing
      return base.apply(this, arguments);
    }
    if(OPRT.state==='connecting'){ OP1.pending.push(t); return; }
    OP1.pending.push(t);
    const self = this, args = arguments;
    OPRT.start().then(function(ok){ if(!ok){ OP1.pending = []; base.apply(self, args); } else if(OPRT.state==='off') OP1.pending = []; });
  };
})(aiAsk);
OPRT.onMsg = (function(base){
  return function(m){
    const r = base.apply(this, arguments);
    if(m && m.type==='user_transcript'){ const t = String((m.user_transcription_event || m).user_transcript || '').trim(); if(t) OP1.heard = {t:t, at:Date.now()}; }
    if(m && m.type==='conversation_initiation_metadata'){
      // the other ears stop the moment he's on the line
      try{ if(typeof heyStop==='function') heyStop(); }catch(e){}
      try{ if(AI.cancelListen) AI.cancelListen(); }catch(e){}
      try{ opStop(); }catch(e){}
      const p = OP1.pending.splice(0), seen = {};
      p.forEach(function(t){ const k = t.toLowerCase(); if(!seen[k]){ seen[k] = 1; OPRT.sendText(t); } });
    }
    return r;
  };
})(OPRT.onMsg);
OPRT.stop = (function(base){ return function(){ OP1.pending = []; return base.apply(this, arguments); }; })(OPRT.stop);
// no second ear while he's live
if(typeof heyStart==='function') heyStart = (function(base){ return function(){ if(r51Busy()) return; return base.apply(this, arguments); }; })(heyStart);
if(typeof scribeListen==='function') scribeListen = (function(base){ return function(){ if(r51Busy()) return; return base.apply(this, arguments); }; })(scribeListen);
aiAutoListen = (function(base){ return function(){ if(r51Busy()) return; return base.apply(this, arguments); }; })(aiAutoListen);
if(typeof opListenWhenDone==='function') opListenWhenDone = (function(base){ return function(){ if(r51Busy()) return; return base.apply(this, arguments); }; })(opListenWhenDone);
// and the old voice never talks over him
opSay = (function(base){ return function(text, opts){ if(r51Busy()) return Promise.resolve(false); return base.apply(this, arguments); }; })(opSay);
// his voice = Op's voice (same model, same settings as the normal voice)
const R51_TTS = [{model_id:'eleven_multilingual_v2', stability:0.45, similarity_boost:0.8, speed:1.06}, {model_id:'eleven_turbo_v2_5', stability:0.45, similarity_boost:0.8}, {model_id:'eleven_turbo_v2'}];
opLiveSig = (function(base){ return function(){ return base.apply(this, arguments)+':v51'; }; })(opLiveSig);
opLiveSync = async function(){
  if(!opAgentId() || state.settings.opAgentSig===opLiveSig()) return true;
  for(let i = 0; i < R51_TTS.length; i++){
    const tts = Object.assign({voice_id:opLiveVoice()}, R51_TTS[i]);
    const body = {conversation_config:{agent:{first_message:'', prompt:{prompt:opLiveBase()}}, tts:tts}};
    const r = await fetchWithin(WAKE_HELPER+'tts/agent/update?a='+encodeURIComponent(opAgentId())+'&b='+hexUtf8(JSON.stringify(body)), 20000);
    if(r && r.ok){ state.settings.opAgentSig = opLiveSig(); state.settings.opAgentTts = tts.model_id; persist('settings'); return true; }
    if(!r) return false;   // (the app didn't answer: try again next time)
  }
  return false;
};
opLiveAgentBody = (function(base){ return function(){ const b = base.apply(this, arguments); try{ b.conversation_config.tts = Object.assign({voice_id:opLiveVoice()}, R51_TTS[1]); }catch(e){} return b; }; })(opLiveAgentBody);
// (and its voice override says the same thing)
opLiveInit = (function(base){ return function(){ const m = base.apply(this, arguments); if(m.conversation_config_override) m.conversation_config_override.tts = {voice_id:opLiveVoice()}; return m; }; })(opLiveInit);

// ---- 2. Client deliverables: this cycle's four weeks, and that's it ----
// Each recurring deliverable is four tasks for the client's current cycle (it starts on their billing day):
// Week 1 to Week 4, each with its share. The one you're in says This week; past ones say Done or Missed;
// the ones still to come are faded and say when they start. Each has its own counter (tap the blocks) and
// Week done. Reels you log for a week count for that week. The same four tasks are what shows on Today and
// in the lineup, so it's one system. (The posting-week tasks from round 42 are off.)
r48WeekStrip = function(){ return ''; };
function r51Since(c){ return c && ((c.reactivated && c.reactivatedAt) || c.startDate) || null; }
// pieces counted by week: the ones logged from a week go to it; the rest fill the weeks in order
function r51Alloc(c, d, cy){
  const needs = dvwNeeds(d).slice(), ws = dvwWeeks(cy), since = r51Since(c);
  ws.forEach(function(w, i){ if(since && w.end < since) needs[i] = 0; });
  const pool = {}; arr(d.completedDates).forEach(function(x){ if(x >= cy.start && x <= cy.end) pool[x] = (pool[x] || 0) + 1; });
  const tags = d.r51Tags && typeof d.r51Tags==='object' ? d.r51Tags : {}, fill = [0, 0, 0, 0], dates = [[], [], [], []];
  needs.forEach(function(n, i){ arr(tags[cy.start+':'+(i + 1)]).forEach(function(x){ if(fill[i] < n && pool[x] > 0){ pool[x]--; fill[i]++; dates[i].push(x); } }); });
  // (a piece made in a week counts for that week; extra ones fill the earliest week still short)
  Object.keys(pool).sort().forEach(function(x){ const i = ws.findIndex(function(w){ return x >= w.start && x <= w.end; }); while(i >= 0 && pool[x] > 0 && fill[i] < needs[i]){ pool[x]--; fill[i]++; dates[i].push(x); } });
  Object.keys(pool).sort().forEach(function(x){ while(pool[x] > 0){ const i = needs.findIndex(function(n, k){ return fill[k] < n; }); if(i < 0) return; pool[x]--; fill[i]++; dates[i].push(x); } });
  return {needs:needs, fill:fill, dates:dates, weeks:ws};
}
dvwFind = (function(base){
  return function(t){
    const m = t && t.master; if(!m || m.kind!=='dvw' || m.oneOff || m.post || !m.cycle) return base.apply(this, arguments);
    const hit = delivFind(m.clientId, m.delivId); if(!hit) return null;
    const cy = {start:m.cycle, end:m.cycleEnd}, a = r51Alloc(hit.c, hit.d, cy), i = m.wk - 1;
    return {c:hit.c, d:hit.d, cy:cy, k:m.wk, need:a.needs[i] || 0, done:a.fill[i] || 0, dates:a.dates[i] || [], wkStart:a.weeks[i].start, wkEnd:a.weeks[i].end, total:monthlyTargetFor(hit.d), count:dvwCycleCount(hit.d, cy)};
  };
})(dvwFind);
function r51SetCount(t, n){
  const x = dvwFind(t); if(!x || !x.cy) return;
  n = Math.max(0, Math.min(x.need, Math.round(n)));
  const key = x.cy.start+':'+x.k, tags = x.d.r51Tags && typeof x.d.r51Tags==='object' ? x.d.r51Tags : (x.d.r51Tags = {});
  const today = todayStr(), when = today < x.cy.start ? x.cy.start : today > x.cy.end ? x.cy.end : today;
  if(n > x.done){ for(let i = x.done; i < n; i++){ delivLogOne({c:x.c, d:x.d}, when); tags[key] = arr(tags[key]).concat([when]); } }
  else if(n < x.done){
    const take = x.dates.slice().sort().slice(n), l = arr(x.d.completedDates);
    take.reverse().forEach(function(dt){ const i = l.lastIndexOf(dt); if(i >= 0) l.splice(i, 1); const tl = arr(tags[key]), j = tl.lastIndexOf(dt); if(j >= 0){ tl.splice(j, 1); tags[key] = tl; } });
    x.d.completedDates = l;
  }
  Object.keys(tags).forEach(function(k){ if(k.slice(0, 10) < addDays(todayStr(), -120)) delete tags[k]; });
  persist('business'); masterTasksSync();
  const y = dvwFind(t);
  if(y && y.done >= y.need && n > x.done){ playTaskComplete(); if(ui.currentTaskId===t.id && typeof releaseCurrentTask==='function') try{ releaseCurrentTask(); }catch(e){} }
  else playTick();
  renderView();
}
r42SetCount = (function(base){ return function(t, n){ const x = dvwFind(t); if(x && x.cy && !x.post) return r51SetCount(t, n); return base.apply(this, arguments); }; })(r42SetCount);
r42CounterHtml = (function(base){
  return function(t, big){
    const x = dvwFind(t); if(!x || x.post || !x.cy) return base.apply(this, arguments);
    if(!x.need) return '';
    let h = ''; for(let i = 1; i <= x.need; i++) h += '<button type="button" class="r42-seg'+(i <= x.done ? ' is-on' : '')+'" data-action="r42SetCount" data-id="'+t.id+':'+i+'" aria-label="'+i+' done">'+i+'</button>';
    return '<div class="r42-count'+(big ? ' is-big' : '')+'" style="--cc:'+clientAccent(x.c)+'" role="group"><div class="r42-segs">'+h+'</div><b>'+x.done+' / '+x.need+'</b></div>';
  };
})(r42CounterHtml);
// Done fills the week (with pieces for that week); Undo takes back what Done put in
dvwDone = (function(base){
  return function(t){
    const x = dvwFind(t); if(!x || !x.cy || x.post) return base.apply(this, arguments);
    if(x.done >= x.need) return;
    t.master.logged = x.need - x.done; r51SetCount(t, x.need);
    showToast(escapeHtml(x.d.title)+' for '+escapeHtml(x.c.business || x.c.name)+': week '+x.k+' is done.', {icon:'&#128230;', actionLabel:'Undo', actionAction:'mtDvUndo', actionId:t.id, duration:5000});
  };
})(dvwDone);
dvwUndo = (function(base){
  return function(t){
    const x = dvwFind(t); if(!x || !x.cy || x.post) return base.apply(this, arguments);
    const back = Math.max(0, x.done - (t.master.logged > 0 ? t.master.logged : x.done)); t.master.logged = 0;
    r51SetCount(t, back);
  };
})(dvwUndo);
// the big Current card gets the counter for these too
r41DvwProgress = function(t, big){ return big ? r42CounterHtml(t, true) : ''; };
// moving over: the open posting-week tasks go (their reels stay logged), and this cycle's four weeks come back
masterTasksSync = (function(base){
  return function(){
    if(mt38Busy || !state || !state.tasks || !state.business) return;
    let changed = false;
    const before = state.tasks.items.length;
    state.tasks.items = state.tasks.items.filter(function(t){ const m = t.master; return !(m && m.kind==='dvw' && m.post && t.status!=='done'); });
    if(state.tasks.items.length!==before) changed = true;
    // (round 42 removed the open weekly ones but left them marked as made, so they never came back)
    const made = mtStore();
    mtActiveClients().forEach(function(c){
      const cy = dvwCycle(c);
      arr(c.deliverables).forEach(function(d){
        if(!d.recurring) return;
        [1, 2, 3, 4].forEach(function(k){
          const key = cy.start+':dvw:'+c.id+':'+d.id+':'+k;
          if(made[key] && !state.tasks.items.some(function(t){ const m = t.master; return m && m.kind==='dvw' && m.clientId===c.id && m.delivId===d.id && m.cycle===cy.start && m.wk===k; })){ delete made[key]; changed = true; }
        });
      });
    });
    if(changed){ persist('tasks'); persist('focus'); }
    const r = base.apply(this, arguments);
    // a week's task is done exactly when its own count is in
    if(!mt38Busy){
      const today = todayStr(); let ch = false;
      state.tasks.items.forEach(function(t){
        const m = t.master; if(!m || m.kind!=='dvw' || m.oneOff || m.post || !m.cycle || m.cycleEnd < today) return;
        const x = dvwFind(t); if(!x) return;
        if(t.status!=='done' && x.done >= x.need){ m.prev = t.status; t.status = 'done'; t.completedAt = today; ch = true; }
        else if(t.status==='done' && x.done < x.need){ t.status = m.prev && m.prev!=='done' ? m.prev : 'backlog'; t.completedAt = null; ch = true; }
      });
      if(ch){ persist('tasks'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
    }
    return r;
  };
})(masterTasksSync);
// the Client backlog
function r51WeekRow(t, x){
  const today = todayStr(), future = x.wkStart > today, past = x.wkEnd < today, done = x.need > 0 && x.done >= x.need;
  const st = !x.need ? 'is-skip' : done ? 'is-done' : future ? 'is-future' : past ? 'is-missed' : 'is-now';
  const label = !future && !past ? 'This week' : 'Week '+x.k;
  const when = fmtDateShort(x.wkStart)+' – '+fmtDateShort(x.wkEnd);
  const sub = !x.need ? 'Nothing due' : future ? 'Starts '+fmtDateShort(x.wkStart) : done ? 'Done' : past ? 'Missed · '+(x.need - x.done)+' short' : (x.need - x.done)+' to go · due '+fmtDateShort(x.wkEnd);
  return '<div class="cbl-w r42-cbl r51-wk '+st+'" data-id="'+t.id+'">'+
    '<div class="r51-wl"><b>'+label+(future ? '<span class="r51-up">Upcoming</span>' : '')+'</b><small>'+(label==='This week' ? 'Week '+x.k+' · ' : '')+when+'</small></div>'+
    '<div class="r51-wc">'+(future ? '<span class="r51-share">'+dvwPieces(x.d, x.need)+'</span>' : r42CounterHtml(t))+'</div>'+
    '<div class="r51-wb"><span class="r51-sub">'+sub+'</span>'+
      (!future && x.need && !done ? '<button class="cbl-done" data-action="dvwDone" data-id="'+t.id+'">Week done</button>'+(t.status!=='done' ? '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="dvwToday" data-id="'+t.id+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button>' : '') : '')+
    '</div></div>';
}
clientBacklogHtml = function(){
  const today = todayStr();
  const blocks = mtActiveClients().map(function(c){
    const cy = dvwCycle(c), ds = arr(c.deliverables).filter(function(d){ return d.recurring; });
    const ones = arr(c.deliverables).filter(function(d){ return !d.recurring; }).map(function(d){ return d.linkedTaskId ? state.tasks.items.find(function(t){ return t.id===d.linkedTaskId && t.master && t.master.kind==='dvw'; }) : null; })
      .filter(function(t){ return t && (t.status!=='done' || t.completedAt===today); });
    if(!ds.length && !ones.length) return '';
    const hs = clientHealthStatus(c);
    if(!ui.r51Dlv) ui.r51Dlv = {};
    const pick = ds.find(function(d){ return d.id===ui.r51Dlv[c.id]; }) || ds[0];
    const tabs = ds.length > 1 ? '<div class="r51-tabs">'+ds.map(function(d){ return '<button class="'+(d===pick ? 'is-on' : '')+'" data-action="r51Dlv" data-id="'+c.id+'|'+d.id+'">'+escapeHtml(String(d.title || 'Deliverable'))+'</button>'; }).join('')+'</div>' : '';
    const body = pick ? (function(d){
      const ts = dvwTasksFor(c, d, cy).sort(function(a, b){ return a.master.wk - b.master.wk; });
      return '<div class="cbl-d"><div class="cbl-dh"><b>'+escapeHtml(String(d.title || 'Deliverable'))+'</b><span>'+dvwCycleCount(d, cy)+' / '+monthlyTargetFor(d)+' this cycle</span></div><div class="cbl-weeks">'+
        (ts.map(function(t){ const x = dvwFind(t); return x ? r51WeekRow(t, x) : ''; }).join('') || '<div class="kpi-sub" style="padding:6px 2px;">Nothing due this cycle.</div>')+'</div></div>';
    })(pick) : '';
    return '<div class="cbl-client" style="--cc:'+clientAccent(c)+'">'+
      '<div class="cbl-h"><span class="r42-cdot"></span><span class="cbl-n"><b>'+escapeHtml(c.business || c.name)+'</b><small>Cycle '+fmtDateShort(cy.start)+' – '+fmtDateShort(cy.end)+'</small></span>'+
        '<span class="cbl-hs"><i class="lc-hs is-'+hs.level+'"></i>'+escapeHtml(clientHealthLabel(hs))+'</span></div>'+
      tabs+body+
      (ones.length ? '<div class="cbl-d"><div class="cbl-dh"><b>One-offs</b><span>'+ones.length+'</span></div><div class="cbl-weeks">'+
        ones.map(function(t){ return '<div class="cbl-w r51-wk'+(t.status==='done' ? ' is-done' : ' is-now')+'"><div class="r51-wl"><b>'+escapeHtml(t.title)+'</b><small>'+(t.deadline ? 'Due '+fmtDateShort(t.deadline) : 'No due date')+'</small></div><div class="r51-wc"></div><div class="r51-wb">'+(t.status==='done' ? '<span class="r51-sub">Done</span>' : '<button class="cbl-done" data-action="dvwDone" data-id="'+t.id+'">Done</button>')+'</div></div>'; }).join('')+'</div></div>' : '')+
    '</div>';
  }).filter(Boolean);
  return '<div class="cbl">'+(blocks.length ? blocks.join('') : '<div class="empty">No client deliverables yet. Give a client a package (or a one-off) and the tasks show up here.</div>')+'</div>';
};
ACTIONS.r51Dlv = function(el, e, id){ const p = String(id).split('|'); if(!ui.r51Dlv) ui.r51Dlv = {}; ui.r51Dlv[p[0]] = p[1]; playTick(); renderView(); };

// ---- 3. Settings → Op, in one place, one way each ----
// One card: on/off, how you talk, "Hey Operator", check-ins, live. "Op checks in on you", "Quiet while you
// work", "Check-ins while you work" and "How hard Op presses you" were four controls for one thing: they're
// one Check-ins row now (Off / Now and then / Normal / Often), and while you're locked in he always holds
// it until you come up. With live on, the settings that belong to the old brain (Brain, When you talk) go.
// The app card, the Anthropic key and Links move to Connections & Data.
const R51_CHECK = {off:{checkins:false, press:'off'}, light:{checkins:true, pace:'light', press:'light'}, normal:{checkins:true, pace:'twohours', press:'normal'}, often:{checkins:true, pace:'normal', press:'hard'}};
function r51CheckLevel(){
  const w = workCfg(), press = typeof opPressLevel==='function' ? opPressLevel() : 'normal';
  if(w.checkins===false && press==='off') return 'off';
  if(w.pace==='light') return 'light';
  if(w.pace==='normal' || w.pace==='strict' || w.pace==='close') return 'often';
  return 'normal';
}
ACTIONS.r51CheckSet = function(el, e, id){
  const v = R51_CHECK[id]; if(!v) return;
  const w = workCfg(); w.checkins = v.checkins; if(v.pace) w.pace = v.pace; persist('focus');
  state.profile.opPress = v.press; state.profile.opQuietWork = true; persist('profile');
  if(typeof acctSchedule==='function') try{ acctSchedule(); }catch(e2){}
  playTick(); renderView();
};
// (locked in, he always waits)
opQuietWork = function(){ return true; };
function r51Seg(act, cur, id, label){ return '<button class="seg-tab'+(cur===id ? ' active' : '')+'" data-action="'+act+'" data-id="'+id+'">'+label+'</button>'; }
function r51Row(label, control, extra){ return '<div class="r51-row"><span class="r51-rl">'+label+'</span><span class="r51-rc">'+control+'</span></div>'+(extra || ''); }
function r51Sw(on, act){ return '<button class="r45-sw'+(on ? ' on' : '')+'" data-action="'+act+'"><span></span></button>'; }
function r51OpRowsHtml(){
  const on = opOn(), mode = opTalkMode(), live = state.settings.opLive===true, lv = r51CheckLevel();
  const keys = mode==='ptt' ? '<div class="r51-sub">'+'<div class="seg-tabs seg-sm">'+Object.keys(OP_PTT_KEYS).map(function(k){ return r51Seg('opPttKeySet', opPttKey(), k, 'Hold '+OP_PTT_KEYS[k]); }).join('')+'</div></div>' : '';
  const agent = live ? '<div class="r51-sub r51-agent"><input class="input" id="opAgentIdIn" placeholder="ElevenLabs agent ID" value="'+escapeHtml(opAgentId())+'" autocomplete="off" spellcheck="false">'+
    '<button class="btn btn-sm '+(opAgentId() ? '' : 'btn-primary')+'" data-action="opLiveCreate">'+(opAgentId() ? 'Update his agent' : 'Make his agent')+'</button></div>'+(OPRT.err ? '<div class="r51-sub"><small class="r45-err">'+escapeHtml(OPRT.err)+'</small></div>' : '') : '';
  const busy = opBusyNow() ? '<div class="r51-sub"><span class="r45-busy">Quiet until '+fmtTimeShort(state.focus.opBusyUntil)+'</span> <button class="btn btn-ghost btn-sm" data-action="opBusyEnd">Bring him back</button></div>' : '';
  return '<div class="r51-rows">'+
    r51Row('On', r51Sw(on, 'opPower'), busy)+
    r51Row('Talking', '<div class="seg-tabs seg-sm">'+r51Seg('opTalkSet', mode, 'free', 'Hands-free')+r51Seg('opTalkSet', mode, 'ptt', 'Push to talk')+'</div>', keys)+
    (OPAPP ? '' : r51Row('“Hey Operator”', '<label class="ws-switch"><input type="checkbox" data-action="heyOpToggle" '+(state.profile.heyOp!==false ? 'checked' : '')+'><span></span></label>'))+
    r51Row('Check-ins', '<div class="seg-tabs seg-sm">'+r51Seg('r51CheckSet', lv, 'off', 'Off')+r51Seg('r51CheckSet', lv, 'light', 'Now and then')+r51Seg('r51CheckSet', lv, 'normal', 'Normal')+r51Seg('r51CheckSet', lv, 'often', 'Often')+'</div>')+
    r51Row('Live conversation', r51Sw(live, 'opLiveToggle'), agent)+
  '</div>';
}
function r51Card(root, title){ return Array.from(root.querySelectorAll('.card')).find(function(c){ const t = c.querySelector('.section-title'); return t && t.textContent.replace(/\?$/, '').trim().indexOf(title) >= 0; }); }
renderSettings = (function(base){
  return function(){
    const tab = ui.settingsTab;
    let h = base.apply(this, arguments);
    if(tab!=='op' && tab!=='system') return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h, root = tpl.content;
    if(tab==='op'){
      ['Op checks in on you', 'The app', 'How hard Op presses you', 'Hey Operator', 'Links'].forEach(function(t){ const c = r51Card(root, t); if(c) c.remove(); });
      const op = Array.from(root.querySelectorAll('.card.op-settings')).find(function(c){ return !!c.querySelector('.field.op-set'); });
      if(op){
        op.querySelectorAll('.r45-top').forEach(function(x){ x.remove(); });
        const live = state.settings.opLive===true;
        op.querySelectorAll('.field.op-set').forEach(function(f){
          const l = ((f.querySelector('label') || {}).textContent || '').replace(/\?$/, '').trim();
          if(/^(Talking|Quiet while you work|Live conversation|Anthropic key|Check-ins while you work)/.test(l)) f.remove();
          else if(live && /^(Brain|When you talk)/.test(l)) f.remove();
        });
        const t = op.querySelector('.section-title'), w = document.createElement('div'); w.innerHTML = r51OpRowsHtml();
        const rows = w.firstChild;
        // Brain and When you talk (without live) become rows like the rest
        op.querySelectorAll('.field.op-set').forEach(function(f){
          const l = ((f.querySelector('label') || {}).textContent || '').replace(/\?$/, '').trim(), seg = f.querySelector('.seg-tabs');
          if(!/^(Brain|When you talk)/.test(l) || !seg) return;
          seg.classList.add('seg-sm'); seg.removeAttribute('style');
          const r = document.createElement('div'); r.className = 'r51-row'; r.innerHTML = '<span class="r51-rl">'+(/^Brain/.test(l) ? 'Brain' : 'Pause before he answers')+'</span><span class="r51-rc"></span>';
          r.querySelector('.r51-rc').appendChild(seg); rows.appendChild(r); f.remove();
        });
        if(t && t.nextSibling) op.insertBefore(rows, t.nextSibling); else op.appendChild(rows);
      }
      root.querySelectorAll('.settings-content > .set-part > .btn.btn-primary.section[data-action="saveProfile"]').forEach(function(b){ b.remove(); });
      // no small grey explainers
      root.querySelectorAll('.op-settings .op-set-help, .op-settings .kpi-sub, .op-settings .qtip, .op-settings .op-voice-help').forEach(function(x){ x.remove(); });
      root.querySelectorAll('.op-settings p, .op-settings .field > small').forEach(function(x){ if(x.textContent.length > 60) x.remove(); });
    } else {
      // Connections & Data: the app, the Anthropic key, links
      ui.settingsTab = 'op'; let oh = ''; try{ oh = base.apply(this, arguments); } finally { ui.settingsTab = tab; }
      const ot = document.createElement('template'); ot.innerHTML = oh;
      const links = r51Card(ot.content, 'Links'), app = r51Card(ot.content, 'The app');
      const keyCard = '<div class="card section op-settings"><div class="section-title">Anthropic</div>'+(typeof aiKeyHtml==='function' ? aiKeyHtml() : '')+'</div>';
      const part = root.querySelector('.settings-content .set-part');
      if(part){ const d = document.createElement('div'); d.innerHTML = (app ? app.outerHTML : '')+keyCard+(links ? links.outerHTML : ''); Array.from(d.children).reverse().forEach(function(x){ part.insertBefore(x, part.firstChild); }); }
    }
    const out = document.createElement('div'); out.appendChild(root.cloneNode(true)); return out.innerHTML;
  };
})(renderSettings);
// (links save the moment you pick)
document.addEventListener('change', function(e){ if(e.target && e.target.id==='setLinkBrowser'){ state.profile.linkBrowser = e.target.value; persist('profile'); showToast('Saved.', {icon:'&#10003;', duration:1500}); } });
// (Goals & Standards: "Content due" was for the posting weeks, which are off)
renderSettings = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(ui.settingsTab!=='standards' || h.indexOf('setContentDueEarly') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const el = tpl.content.getElementById('setContentDueEarly'), f = el && el.closest('.field'); if(f) f.remove();
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(renderSettings);
// (the client cards, pace and health read the same week: this cycle's week you're in)
function r51Now(d){
  const c = typeof r50DelivClient==='function' ? r50DelivClient(d) : null; if(!c || !d.recurring) return null;
  const cy = dvwCycle(c), a = r51Alloc(c, d, cy), today = todayStr(), i = Math.max(0, a.weeks.findIndex(function(w){ return today >= w.start && today <= w.end; }));
  const w = a.weeks[i], len = Math.round((new Date(w.end) - new Date(w.start))/86400000) + 1, into = Math.round((new Date(today) - new Date(w.start))/86400000) + 1;
  return {need:a.needs[i] || 0, done:a.fill[i] || 0, len:len, into:into};
}
deliverableWeekNeed = (function(base){ return function(d){ const n = r51Now(d); return n ? n.need : base.apply(this, arguments); }; })(deliverableWeekNeed);
deliverableWeekCount = (function(base){ return function(d){ const n = r51Now(d); return n ? n.done : base.apply(this, arguments); }; })(deliverableWeekCount);
deliverablePaceStatusRaw = (function(base){
  return function(d){
    const n = r51Now(d); if(!n) return base.apply(this, arguments);
    if(n.done >= n.need) return 'good';
    const due = Math.floor(n.need*n.into/n.len);
    return n.done > due ? 'good' : n.done===due ? 'warn' : 'danger';
  };
})(deliverablePaceStatusRaw);
delivPaceWord = (function(base){ return function(d){ const n = r51Now(d); if(!n) return base.apply(this, arguments); return n.done >= n.need ? 'done for the week' : paceWord(deliverablePaceStatus(d)); }; })(delivPaceWord);
isDeliverableDoneThisWeek = (function(base){ return function(d){ const n = r51Now(d); if(!n) return base.apply(this, arguments); return n.done >= n.need; }; })(isDeliverableDoneThisWeek);

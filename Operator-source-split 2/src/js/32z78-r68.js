// ============ ROUND 68 ============
// Right-click everywhere, Client backlog by month, streaks that follow Today's standard (and their rules), editing
// the session you're in, voice memos that are just saved (Analyze when you want), Op reading every journal (boards
// and client journals too), personal goals in one row, the Journal tabs on the line, and Operator on your iPhone.
const R68 = {ctxT:null, ctxEls:[], an:null};

// ---------------- 1. Right-click: more options, everywhere ----------------
// (the element right-clicked, for the menus below)
document.addEventListener('contextmenu', function(e){ R68.ctxT = e.target; }, true);
// a person is found from any row or card that opens exactly one of them (the Log center rows, the board cards, …)
contactFromEl = (function(base){
  return function(el){
    const r = base.apply(this, arguments); if(r) return r;
    let n = el;
    for(let i = 0; i < 6 && n && n!==document.body; i++, n = n.parentElement){
      if(n.matches && n.matches('[data-pb6-drag]')){ const q = n.getAttribute('data-pb6-drag').split(':'), x = crmFind(q[0], q[1]); if(x) return {kind:q[0], x:x}; }
      if(n.matches && n.matches('[data-action="openContact"][data-kind][data-id]')){ const x = crmFind(n.dataset.kind, n.dataset.id); if(x) return {kind:n.dataset.kind, x:x}; }
      const as = n.querySelectorAll ? n.querySelectorAll('[data-action="openContact"][data-kind][data-id]') : [];
      const ids = {}; as.forEach(function(a){ ids[a.dataset.kind+':'+a.dataset.id] = a; });
      const k = Object.keys(ids); if(k.length===1){ const a = ids[k[0]], x = crmFind(a.dataset.kind, a.dataset.id); if(x) return {kind:a.dataset.kind, x:x}; }
      if(k.length > 1) break;
    }
    return null;
  };
})(contactFromEl);
// a lead or client's menu starts with the moves you make most: Lost / Won (leads), Open, and their card's own buttons
contactMenuHtml = (function(base){
  return function(kind, x){
    const h = base.apply(this, arguments), st = crmStages(kind);
    const lost = st.find(function(s){ return s.kind==='lost'; }), won = st.find(function(s){ return s.kind==='won'; });
    const quick = kind==='lead' ? ((lost && x.stage!==lost.id ? ci('stage', '&#10005; Mark lost', {a:kind+':'+x.id, b:lost.id, cls:'r68-lost'}) : '')+(won && x.stage!==won.id ? ci('stage', '&#10003; Mark won', {a:kind+':'+x.id, b:won.id}) : '')) : '';
    const i = h.indexOf('</div>');
    return quick && i > 0 ? h.slice(0, i + 6)+quick+'<div class="ctx-sep"></div>'+h.slice(i + 6) : h;
  };
})(contactMenuHtml);
// anything else: the buttons of the card you right-clicked, then the app menu
function r68CardButtons(t){
  if(!t || !t.closest) return [];
  const card = t.closest('.card, .task-card, .lc-row, .cbl-client, .cbl-w, .r63-sec, .r65-run, .r67-mc, .pb6-card, .pb6-col, .r43-own, .g39-rev, .r43-mh, section, article, li, [class*="-row"], [class*="-card"]');
  if(!card || card===document.body) return [];
  const seen = {}, out = [];
  card.querySelectorAll('[data-action], [data-hold-act]').forEach(function(b){
    if(out.length >= 10 || b.closest('.ctx-menu')) return;
    const a = b.getAttribute('data-action') || b.getAttribute('data-hold-act'); if(!a || a==='ctx' || a==='noop') return;
    let label = String(b.getAttribute('aria-label') || b.textContent || b.title || '').replace(/\s+/g, ' ').trim();
    if(!label || label.length > 48) label = String(b.title || b.getAttribute('data-hov') || '').trim();
    if(!label || /^[\d\s.,%$:/]+$/.test(label)) return;
    const key = a+'|'+label; if(seen[key]) return; seen[key] = 1;
    out.push({el:b, label:label});
  });
  return out;
}
appMenuHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), L = r68CardButtons(R68.ctxT); R68.ctxEls = L.map(function(x){ return x.el; });
    const sess = state.focus && state.focus.activeSession ? ci('r68Sess', '&#9201; Edit this session’s start') : '';
    if(!L.length && !sess) return h;
    return L.map(function(x, i){ return ci('r68Btn', escapeHtml(x.label), {a:String(i)}); }).join('')+sess+'<div class="ctx-sep"></div>'+h;
  };
})(appMenuHtml);
ctxExtra = (function(base){
  return function(op, a, b){
    if(op==='r68Btn'){ const el = R68.ctxEls[Number(a)]; ctxClose(); if(el && el.isConnected){ if(el.hasAttribute('data-hold-act')){ const act = el.getAttribute('data-hold-act'); if(ACTIONS[act]) ACTIONS[act](el, null, el.dataset.id); } else el.click(); } return; }
    if(op==='r68Sess'){ ctxClose(); r68SessOpen(); return; }
    return base.apply(this, arguments);
  };
})(ctxExtra);

// ---------------- 2. Client backlog: previous and next months ----------------
clientBacklogHtml = (function(base){
  return function(){
    const off = Number(ui.r68CblOff) || 0;
    if(!off) return r68CblBar(0)+base.apply(this, arguments);
    const was = dvwCycle, at = (function(){ const d = new Date(todayStr()+'T12:00:00'); d.setDate(15); d.setMonth(d.getMonth() + off); return todayStr(d); })();
    dvwCycle = function(c, date){ return was(c, date || at); };
    try{ return r68CblBar(off)+base.apply(this, arguments); } finally { dvwCycle = was; }
  };
})(clientBacklogHtml);
function r68CblBar(off){
  const d = new Date(todayStr()+'T12:00:00'); d.setDate(15); d.setMonth(d.getMonth() + off);
  return '<div class="r68-cbl"><button data-action="r68Cbl" data-id="-1" aria-label="Previous month">&lsaquo;</button><b>'+d.toLocaleDateString(undefined, {month:'long', year:'numeric'})+'</b><button data-action="r68Cbl" data-id="1" aria-label="Next month">&rsaquo;</button>'+(off ? '<button class="r68-cbl-t" data-action="r68Cbl" data-id="0">This month</button>' : '')+'</div>';
}
ACTIONS.r68Cbl = function(el, e, d){ ui.r68CblOff = Number(d)===0 ? 0 : (Number(ui.r68CblOff) || 0) + Number(d); playTick(); renderView(); };

// ---------------- 3. Streaks that follow Today's standard ----------------
// A streak can count from Today's standard (the default for a new one): its rules go into Today's standard, and a
// day counts when the standard is done. Its rules are then edited where the standard is (Personal → Streaks), and a
// running streak's rules can be changed there too (✎ on the streak).
function r68StdItems(){ return arr(state.standards.items); }
function r68StdDone(d){ return typeof manualStandardsDoneFor==='function' ? manualStandardsDoneFor(d) : false; }
r63DayDone = (function(base){ return function(c, d){ if(c && c.useStd) return r68StdItems().length > 0 && r68StdDone(d); return base.apply(this, arguments); }; })(r63DayDone);
// (its card shows Today's standard as its rules, ticked the same way)
r65RunHtml = (function(base){
  return function(c){
    if(!c || !c.useStd) return base.apply(this, arguments).replace('<div class="r65-acts">', '<div class="r65-acts"><button data-action="r68RulesEdit" data-id="'+(c && c.id)+'">Rules</button>');
    const rules = c.rules, log = c.log, today = todayStr(), rec = arr(state.standards.completions).find(function(x){ return x.date===today; });
    c.rules = r68StdItems().map(function(it){ return {id:it.id, label:it.label}; }); c.log = {}; c.log[today] = rec ? rec.doneIds.slice() : [];
    try{ return base.apply(this, arguments).replace(/data-action="r63Tick" data-id="[^"|]*\|/g, 'data-action="r68StdTick" data-id="').replace('<div class="r65-acts">', '<div class="r65-acts"><button data-action="r68StdGo">Today’s standard</button>'); }
    finally { c.rules = rules; c.log = log; }
  };
})(r65RunHtml);
ACTIONS.r68StdTick = function(el, e, id){ toggleStandard(id, todayStr()); persist('standards'); playTick(); renderView(); };
ACTIONS.r68StdGo = function(){ const n = document.getElementById('r63Std') || document.querySelector('.r65s .r63-std'); if(n) n.scrollIntoView({block:'center', behavior:'smooth'}); setTimeout(function(){ const i = document.getElementById('r63StdNew'); if(i) i.focus(); }, 300); };
// starting one: "Count it from Today's standard" (on by default)
r63SheetHtml = (function(base){
  return function(){
    const D = ui.r63Draft || {}; if(D.useStd==null) D.useStd = true;
    const sw = '<div class="r63-f r68-usestd"><span>How a day counts</span><div class="seg-tabs seg-sm"><button class="seg-tab'+(D.useStd ? ' active' : '')+'" data-action="r68UseStd" data-id="1">Today’s standard</button><button class="seg-tab'+(!D.useStd ? ' active' : '')+'" data-action="r68UseStd" data-id="0">Its own rules</button></div></div>';
    let h = base.apply(this, arguments);
    const i = h.indexOf('<div class="r63-f"><span>Every day</span>');
    if(i < 0) return h;
    if(D.useStd){
      const items = r68StdItems();
      const now = '<div class="r68-std-now">'+(items.length ? items.map(function(it){ return '<span class="chip">'+escapeHtml(it.label)+'</span>'; }).join('') : '')+'</div>';
      h = h.slice(0, i)+sw+'<div class="r63-f"><span>Today’s standard'+(items.length ? '' : ' (add what counts below)')+'</span>'+now+'</div>'+h.slice(i).replace('<span>Every day</span>', '<span>Add to it</span>');
    } else h = h.slice(0, i)+sw+h.slice(i);
    return h;
  };
})(r63SheetHtml);
ACTIONS.r68UseStd = function(el, e, v){ const D = ui.r63Draft; if(!D) return; D.useStd = v==='1'; if(D.useStd) D.rules = D.rules.filter(function(r){ return String(r.label || '').trim(); }).concat(D.rules.some(function(r){ return !String(r.label || '').trim(); }) ? [] : []); if(!D.rules.length) D.rules = [{label:'', cue:''}]; playTick(); addSheetRefresh('r63Sheet'); };
// (the rules you typed join Today's standard; the run then follows it)
function r68ToStd(rules){
  const have = {}; r68StdItems().forEach(function(it){ have[String(it.label).toLowerCase().trim()] = 1; });
  arr(rules).forEach(function(r){ const v = String(r.label || '').trim(); if(v && !have[v.toLowerCase()]){ state.standards.items.push({id:uid(), label:v.slice(0, 120), createdAt:todayStr()}); have[v.toLowerCase()] = 1; } });
  persist('standards');
}
ACTIONS.r66Next = (function(base){
  return function(){
    const D = ui.r63Draft; if(!D || !D.useStd) return base.apply(this, arguments);
    r68ToStd(D.rules);
    if(!r68StdItems().length){ showToast('Add at least one thing to Today’s standard.'); return; }
    D.rules = r68StdItems().map(function(it){ return {label:it.label, cue:''}; });
    return base.apply(this, arguments);
  };
})(ACTIONS.r66Next);
ACTIONS.r63Start = (function(base){
  return function(){
    const D = ui.r63Draft, std = !!(D && D.useStd);
    if(std){ r68ToStd(D.rules); D.rules = r68StdItems().map(function(it){ return {label:it.label, cue:''}; }); }
    const before = r63List().length; const r = base.apply(this, arguments);
    if(std && r63List().length > before){ const c = r63List()[r63List().length - 1]; c.useStd = true; c.rules = []; persist('standards'); }
    return r;
  };
})(ACTIONS.r63Start);
// a running streak's own rules: change, add, remove (or switch it to Today's standard)
ACTIONS.r68RulesEdit = function(el, e, id){ ui.r68Rules = id; addSheetOpen('r68RulesSheet', r68RulesHtml); };
function r68RulesHtml(){
  const c = r63List().find(function(x){ return x.id===ui.r68Rules; }); if(!c) return asHead('&#128293;', 'Rules');
  return asHead('&#128293;', escapeHtml(c.name)+' · rules')+'<div class="r68-rules">'+
    c.rules.map(function(r){ return '<div class="r63-drr"><input class="input" data-r68-rule="'+r.id+'" value="'+escapeHtml(r.label)+'"><button class="btn btn-ghost btn-sm" data-action="r68RuleDel" data-id="'+r.id+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
    '<div class="r63-drr"><input class="input" id="r68RuleNew" placeholder="Add a rule"><button class="btn btn-sm" data-action="r68RuleAdd">Add</button></div>'+
    '<button class="btn btn-ghost btn-sm" data-action="r68RulesToStd">Count it from Today’s standard instead</button></div>';
}
function r68RulesC(){ return r63List().find(function(x){ return x.id===ui.r68Rules; }); }
ACTIONS.r68RuleAdd = function(){ const c = r68RulesC(), i = document.getElementById('r68RuleNew'), v = i ? i.value.trim() : ''; if(!c || !v) return; c.rules.push({id:uid(), label:v.slice(0, 120), cue:''}); persist('standards'); addSheetRefresh('r68RulesSheet'); renderView(); setTimeout(function(){ const n = document.getElementById('r68RuleNew'); if(n) n.focus(); }, 40); };
ACTIONS.r68RuleDel = function(el, e, id){ const c = r68RulesC(); if(!c || c.rules.length < 2) return; c.rules = c.rules.filter(function(r){ return r.id!==id; }); persist('standards'); addSheetRefresh('r68RulesSheet'); renderView(); };
ACTIONS.r68RulesToStd = function(){ const c = r68RulesC(); if(!c) return; r68ToStd(c.rules); c.useStd = true; c.rules = []; persist('standards'); addSheetClose('r68RulesSheet'); playPositive(); renderView(); };
document.addEventListener('change', function(e){ const t = e.target, id = t && t.getAttribute && t.getAttribute('data-r68-rule'); if(!id) return; const c = r68RulesC(), r = c && c.rules.find(function(x){ return x.id===id; }); if(r && t.value.trim()){ r.label = t.value.trim().slice(0, 120); persist('standards'); renderView(); } });
document.addEventListener('keydown', function(e){ if(e.key==='Enter' && e.target && e.target.id==='r68RuleNew'){ e.preventDefault(); ACTIONS.r68RuleAdd(); } });
// (on Today, a streak that follows the standard adds no chips of its own: the standard's are its)
PANEL_RENDERERS.personalStats = (function(base){
  return function(){ const act = r63Active().filter(function(c){ return c.useStd; }), keep = act.map(function(c){ return c.rules; }); act.forEach(function(c){ c.rules = []; }); try{ return base.apply(this, arguments); } finally { act.forEach(function(c, i){ c.rules = keep[i]; }); } };
})(PANEL_RENDERERS.personalStats);

// ---------------- 4. Edit the session you're in ----------------
// (tap the time on Locked in, or right-click: when it started, as far back as yesterday or before)
function r68SessOpen(){ if(!state.focus.activeSession) return; addSheetOpen('r68Sess', r68SessHtml); }
function r68SessHtml(){
  const s = state.focus.activeSession; if(!s) return asHead('&#9201;', 'Session');
  const d = new Date(s.startedAt), day = todayStr(d), hm = ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  return asHead('&#9201;', 'This session')+'<div class="r68-sess">'+
    '<label class="r63-f"><span>Started</span><div class="row" style="gap:8px"><input class="input" type="date" id="r68SessD" value="'+day+'" max="'+todayStr()+'"><input class="input" type="time" id="r68SessT" value="'+hm+'"></div></label>'+
    '<div class="kpi-sub" id="r68SessLen">'+fmtDurationLabel(Math.max(1, Math.round((Date.now() - s.startedAt)/60000)))+' so far</div>'+
    '<button class="btn btn-primary hs-go" data-action="r68SessSave">Save</button></div>';
}
ACTIONS.r68SessSave = function(){
  const s = state.focus.activeSession; if(!s) return addSheetClose('r68Sess');
  const d = (document.getElementById('r68SessD') || {}).value, t = (document.getElementById('r68SessT') || {}).value;
  const ts = d && t ? localTs(d, t) : 0;
  if(!ts || ts > Date.now()){ showToast('Pick a time before now.'); return; }
  if(Date.now() - ts > 3*86400000){ showToast('A session can go back three days at most.'); return; }
  s.startedAt = ts; s.r56Asked = null; persist('focus'); addSheetClose('r68Sess'); playTick(); renderView();
  showToast('Session now started '+fmtDateShort(d)+' at '+fmtTimeShort(ts)+'.', {icon:'&#9201;'});
};
document.addEventListener('click', function(e){ const t = e.target && e.target.closest && e.target.closest('#focusElapsed, .np-clock-t, .ckp-timer, .sl-clock, .hm-clock'); if(t && state.focus.activeSession && !e.defaultPrevented){ r68SessOpen(); } });
// Op can do it too: "I've been locked in since 9 last night"
OP_TOOLS.push({name:'edit_session', description:'Change when the session he is in started (e.g. "I’ve been locked in since 9pm yesterday"). start: "YYYY-MM-DD HH:MM" (24h, his time).', input_schema:{type:'object', properties:{start:{type:'string'}}, required:['start'], additionalProperties:false}});
opRunTool = (function(base){
  return function(name, x){
    if(name==='edit_session'){
      const s = state.focus.activeSession; if(!s) throw new Error('he isn’t locked in');
      const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/.exec(String(x && x.start || '')); if(!m) throw new Error('start must be YYYY-MM-DD HH:MM');
      const ts = localTs(m[1], m[2].length===4 ? '0'+m[2] : m[2]); if(!ts || ts > Date.now()) throw new Error('that’s in the future');
      s.startedAt = ts; persist('focus'); renderView(); return 'the session now started '+m[1]+' '+m[2];
    }
    return base.apply(this, arguments);
  };
})(opRunTool);

// ---------------- 5. Voice memos: just saved; Analyze when you want ----------------
// An upload, a recording or a pasted transcript is saved as it is (the audio kept so you can play it), and that's all.
// Each memo has Analyze (transcribe if it's audio, then Op reads it: a conversation reads as one, with who said what),
// and "Analyze all" does every one not done yet (it says first what it costs).
function r68MemoAudioPut(id, blob){ try{ return blobTx('readwrite', function(s){ return s.put(blob, 'memoA:'+id); }); }catch(e){ return Promise.resolve(); } }
function r68MemoAudioGet(id){ try{ return blobTx('readonly', function(s){ return s.get('memoA:'+id); }); }catch(e){ return Promise.resolve(null); } }
async function r68Flush(){
  if(R68.flushing || !R67.queue.length) return; R68.flushing = true;
  const Q = R67.queue.slice(); R67.queue = [];
  try{
    for(const q of Q){
      const id = uid(), m = {id:id, name:q.name, src:q.src, date:q.date, dur:Math.round(q.dur || 0), words:0, title:q.name, summary:'', points:[], at:Date.now(), saved:true};
      if(q.text!=null){ await r67MemoPut(id, q.text); m.words = q.text.split(' ').length; m.hasText = true; }
      else if(q.file){ await r68MemoAudioPut(id, q.file); m.audio = true; m.mime = q.file.type || ''; m.fname = q.file.name || ''; }
      r67Memos().push(m);
    }
    persist('journal');
    showToast(Q.length===1 ? 'Memo saved.' : Q.length+' memos saved.', {icon:'&#127908;'});
  } finally { R68.flushing = false; }
  renderView();
}
function r68Unread(){ return r67Memos().filter(function(m){ return !m.summary; }); }
async function r68Analyze(id){
  const m = r67Memos().find(function(x){ return x.id===id; }); if(!m) return;
  let text = await r67MemoGet(id);
  if(!text && m.audio){
    const blob = await r68MemoAudioGet(id); if(!blob) throw new Error('the audio isn’t here any more');
    text = await r67Scribe(blob, m.mime, m.fname || (m.name+'.m4a')); if(!text) throw new Error('no words found');
    await r67MemoPut(id, text); m.words = text.split(' ').length; m.hasText = true;
  }
  if(!text) throw new Error('nothing to read');
  const A = await r67Read(text, m.name); if(!A) throw new Error('Op couldn’t read it');
  m.title = A.title || m.name; m.summary = A.summary; m.points = A.points; persist('journal');
}
r67Read = (function(base){
  return function(text, name){ return base.call(this, text, name+'" (it may be a conversation between several people: if so, say who said what when it matters, and whose points they are)'); };
})(r67Read);
ACTIONS.r68MemoAnalyze = function(el, e, id){
  if(R68.an) return; if(!AI.hasKey){ showToast('Analyzing needs Op’s Anthropic key.'); return; }
  R68.an = {id:id, n:1, i:1}; renderView();
  r68Analyze(id).then(function(){ showToast('Memo read.', {icon:'&#127908;'}); }).catch(function(err){ showToast('Didn’t go through: '+String(err && err.message || err).slice(0, 120), {icon:'&#9888;'}); }).then(function(){ R68.an = null; renderView(); });
};
ACTIONS.r68MemoAll = function(){
  const L = r68Unread(); if(!L.length || R68.an) return; if(!AI.hasKey){ showToast('Analyzing needs Op’s Anthropic key.'); return; }
  const C = r67Cost(L.map(function(m){ return m.audio && !m.hasText ? {dur:m.dur} : {dur:m.dur, text:'x'}; }));
  uiConfirm({title:'Analyze '+L.length+' memo'+(L.length===1 ? '' : 's')+'?', text:'About '+r67Money(C.stt + C.ai)+' ('+(C.free ? 'transcripts free' : r67Money(C.stt)+' to transcribe')+', '+r67Money(C.ai)+' for Op to read).', ok:'Analyze'}).then(async function(yes){
    if(!yes) return; R68.an = {n:L.length, i:0}; let fails = 0, err = '';
    for(const m of L){ R68.an.i++; R68.an.id = m.id; renderView(); try{ await r68Analyze(m.id); }catch(x){ fails++; err = String(x && x.message || x); } }
    R68.an = null; try{ await r67Overview(); }catch(x){} renderView();
    showToast(fails ? fails+' of '+L.length+' didn’t go through: '+err.slice(0, 100) : 'All '+L.length+' read.', {icon:fails ? '&#9888;' : '&#127908;'});
  });
};
ACTIONS.r68MemoPlay = function(el, e, id){
  if(R68.audio){ try{ R68.audio.pause(); URL.revokeObjectURL(R68.audio.src); }catch(x){} if(R68.playing===id){ R68.audio = null; R68.playing = null; renderView(); return; } }
  r68MemoAudioGet(id).then(function(b){ if(!b){ showToast('The audio isn’t here.'); return; } const a = new Audio(URL.createObjectURL(b)); R68.audio = a; R68.playing = id; a.onended = function(){ R68.playing = null; renderView(); }; a.play().catch(function(){}); renderView(); });
};
ACTIONS.r67MemoDel = (function(base){ return function(el, e, id){ try{ blobTx('readwrite', function(s){ return s.delete('memoA:'+id); }); }catch(x){} return base.apply(this, arguments); }; })(ACTIONS.r67MemoDel);
r67MemosHtml = function(){
  if(R67.queue.length) setTimeout(r68Flush, 0);
  const M = r67Memos().slice().sort(function(a, b){ return a.date===b.date ? b.at - a.at : (a.date < b.date ? 1 : -1); });
  const un = r68Unread().length;
  const bar = '<div class="r67-mb">'+
    (R67.rec ? '<button class="r67-rec is-on" data-action="r67Rec"><i></i>Stop <span id="r67RecT">'+r67Clock((Date.now() - R67.rec.at)/1000)+'</span></button>' : '<button class="r67-rec" data-action="r67Rec"><i></i>Record</button>')+
    '<button class="r67-up" data-action="r67MemoPick">&#8679; Upload</button><input type="file" id="r67MemoFile" multiple accept="audio/*,.m4a,.mp3,.wav,.aac,.caf,.ogg,.webm,.flac,.txt,.md,.rtf,text/plain" hidden>'+
    '<button class="r67-up" data-action="r67PasteOpen">&#128203; Paste</button>'+
    '<span class="r67-mt"></span>'+
    (un ? '<button class="r68-all" data-action="r68MemoAll"'+(R68.an ? ' disabled' : '')+'>'+(R68.an && R68.an.n > 1 ? 'Analyzing '+R68.an.i+' of '+R68.an.n+'…' : '&#10022; Analyze all ('+un+')')+'</button>' : '')+
  '</div>';
  const paste = ui.r67Paste ? '<div class="r67-q r67-paste"><input id="r67PasteName" placeholder="Name it (optional)" value=""><textarea id="r67PasteText" rows="6" placeholder="Paste the transcript here"></textarea><div class="r67-q-f"><button class="btn btn-ghost" data-action="r67PasteClose">Cancel</button><button class="btn btn-primary" data-action="r67PasteAdd">Save</button></div></div>' : '';
  const list = M.map(function(m){
    const open = ui.r67Memo===m.id, tx = ui.r67Txt && ui.r67Txt.id===m.id ? ui.r67Txt.t : null, busy = R68.an && R68.an.id===m.id;
    return '<article class="r67-mc r68-mc'+(open ? ' is-open' : '')+'">'+
      '<div class="r68-mh">'+(m.audio ? '<button class="r68-play'+(R68.playing===m.id ? ' is-on' : '')+'" data-action="r68MemoPlay" data-id="'+m.id+'" aria-label="Play">'+(R68.playing===m.id ? '&#10074;&#10074;' : '&#9654;')+'</button>' : '<span class="r68-play is-txt">&#9776;</span>')+
        '<button class="r67-mc-h" data-action="r67MemoOpen" data-id="'+m.id+'"><time>'+escapeHtml(fmtDateShort(m.date))+'</time><b>'+escapeHtml(m.title || m.name)+'</b><small>'+(m.dur ? r67Dur(m.dur) : '')+'</small></button>'+
        (m.summary ? '' : '<button class="r68-an" data-action="r68MemoAnalyze" data-id="'+m.id+'"'+(R68.an ? ' disabled' : '')+'>'+(busy ? 'Analyzing…' : 'Analyze')+'</button>')+
      '</div>'+
      (open ? (m.summary ? '<p>'+escapeHtml(m.summary)+'</p>' : '')+(m.points.length ? '<ul>'+m.points.map(function(p){ return '<li>'+escapeHtml(p)+'</li>'; }).join('')+'</ul>' : '')+
        '<div class="r67-mc-f">'+(m.hasText || m.summary ? '<button data-action="r67MemoTxt" data-id="'+m.id+'">'+(tx ? 'Transcript' : 'Show the transcript')+'</button>' : '')+'<button data-action="r67MemoDel" data-id="'+m.id+'">Remove</button></div>'+
        (tx ? '<div class="r67-tx">'+escapeHtml(tx)+'</div>' : '') : '')+'</article>';
  }).join('');
  return '<div class="r67-m" data-memo-drop="1">'+bar+paste+(list ? '<div class="r67-ml">'+list+'</div>' : '<div class="r67-empty"><b>Your voice memos</b><span>Record, upload or paste one. It’s saved, and read only when you say.</span></div>')+'</div>';
};

// ---------------- 6. Op reads every journal ----------------
// (boards' cards and your clients' journals join read_journal; memos you only saved are found by name and transcript)
opRunTool = (function(base){
  return async function(name, x){
    const r = await base.apply(this, arguments);
    if(name!=='read_journal') return r;
    x = x || {};
    const q = String(x.query || '').toLowerCase().trim(), words = q.split(/\s+/).filter(function(w){ return w.length > 2; });
    const hit = function(s){ s = String(s || '').toLowerCase(); return !words.length || words.some(function(w){ return s.indexOf(w) >= 0; }); };
    let more = '';
    if(!x.tag){
      const B = arr(state.boards && state.boards.boards).map(function(b){ const t = arr(b.elements).map(function(el){ return [el.title, el.body, el.text, el.caption].filter(Boolean).join(' '); }).join(' · ').replace(/\s+/g, ' ').trim(); return {b:b, t:t}; }).filter(function(o){ return o.t && hit((o.b.name || '')+' '+o.t); }).slice(0, 6);
      if(B.length) more += '\n\nBoards:\n'+B.map(function(o){ return (o.b.name || 'Board')+': '+o.t.slice(0, 600); }).join('\n');
      const C = []; arr(state.business && state.business.clients).forEach(function(c){ arr(c.journal).forEach(function(j){ const d = j.date || ''; if((!x.month || d.slice(0, 7)===x.month) && (!x.day || d===x.day) && hit(j.text)) C.push((c.business || c.name)+' · '+d+': '+String(j.text || '').slice(0, 400)); }); });
      if(C.length) more += '\n\nClient journals:\n'+C.slice(0, 12).join('\n');
      const S = r67Memos().filter(function(m){ return !m.summary && (!x.month || m.date.slice(0, 7)===x.month) && (!x.day || m.date===x.day) && hit(m.name); }).slice(0, 8);
      if(S.length) more += '\n\nVoice memos saved but not read yet (use memo_transcript for the words, if it has a transcript):\n'+S.map(function(m){ return '['+m.id+'] '+m.date+' · '+m.name+(m.audio && !m.hasText ? ' (audio only)' : ''); }).join('\n');
    }
    if(!more) return r;
    return (String(r==='nothing matches' ? '' : r)+more).trim().slice(0, 12000);
  };
})(opRunTool);

// ---------------- 7. Operator on your iPhone ----------------
// (the Mac app serves a small page on your Wi-Fi; these are the only things it can ask)
(function(){
  if(!window.operatorPage) return;
  const P = window.operatorPage;
  const ext = {
    phoneState: function(){
      const s = state.focus.activeSession, t = ui.currentTaskId ? state.tasks.items.find(function(x){ return x.id===ui.currentTaskId; }) : null;
      const next = state.tasks.items.find(function(x){ return x.status==='today'; });
      const m = state.modes && state.modes.active;
      return {locked:!!s, mins:s ? fmtDurationLabel(Math.max(1, Math.round((Date.now() - s.startedAt)/60000))) : '', task:t ? t.title : '', next:next ? next.title : '', mode:m ? (m.type==='break' ? 'On a break' : m.type==='offtime' ? 'Off the clock' : m.type==='shooting' ? 'Shooting' : '') : ''};
    },
    phoneLockIn: function(){ try{ opRunTool('lock_in', {}); }catch(e){} renderView(); return ext.phoneState(); },
    phoneLockOut: function(){ try{ if(state.focus.activeSession){ endFocusSessionForSwitch(); renderView(); } }catch(e){} return ext.phoneState(); },
    phoneTask: function(title){ title = String(title || '').trim(); if(!title) return false; try{ opRunTool('add_task', {title:title}); }catch(e){ state.tasks.items.push({id:uid(), title:title.slice(0, 200), status:'today', createdAt:todayStr()}); persist('tasks'); } renderView(); return true; },
    // a message from the phone: Op answers in writing (not out loud on the Mac)
    ask: async function(text){
      text = String(text || '').trim(); if(!text) return '';
      for(let i = 0; i < 40 && AI.busy; i++) await new Promise(function(r){ setTimeout(r, 500); });
      AI.typedAt = Date.now();
      const n0 = AI.history.length;
      await aiAsk(text, 'opBubText');
      for(let i = AI.history.length - 1; i >= n0; i--){ const h = AI.history[i]; if(h && h.role==='assistant'){ const c = h.content; return typeof c==='string' ? c : arr(c).map(function(b){ return b.type==='text' ? b.text : ''; }).join(' ').trim(); } }
      return 'Done.';
    }
  };
  window.operatorPage = Object.freeze(Object.assign({}, P, ext));
})();
// Settings → Connections & data: the iPhone card (in the Mac app)
function r68PhoneCardHtml(){
  if(!window.operatorApp || !operatorApp.phoneInfo) return '';
  if(!ui.r68Phone){ ui.r68Phone = {loading:true}; operatorApp.phoneInfo().then(function(i){ ui.r68Phone = i || {}; if(document.getElementById('r68Phone')) renderView(); }); }
  const I = ui.r68Phone;
  return '<div class="card section op-settings r68-ph" id="r68Phone"><div class="section-title">&#128241; Your iPhone</div>'+
    '<div class="r45-row r46-line"><span>Use Operator from your iPhone</span><button class="r45-sw'+(I.on ? ' on' : '')+'" data-action="r68PhoneToggle"><span></span></button></div>'+
    (I.on ? (I.url ? '<div class="r68-ph-s"><div><small>On your iPhone, in Safari (same Wi-Fi)</small><b>'+escapeHtml(I.url)+'</b></div><div><small>Code</small><b class="r68-code">'+escapeHtml(I.code || '')+'</b></div></div>'+
      '<div class="r68-ph-f"><span>Then Share → Add to Home Screen.</span><button class="btn btn-ghost btn-sm" data-action="r68PhoneCode">New code</button></div>' : '<div class="r68-ph-f"><span>This Mac isn’t on a Wi-Fi network right now.</span></div>') : '')+
  '</div>';
}
operatorAppCardHtml = (function(base){ return function(){ return base.apply(this, arguments)+r68PhoneCardHtml(); }; })(operatorAppCardHtml);
ACTIONS.r68PhoneToggle = function(){ operatorApp.phoneSet(!(ui.r68Phone && ui.r68Phone.on)).then(function(i){ ui.r68Phone = i || {}; playTick(); renderView(); }); };
ACTIONS.r68PhoneCode = function(){ operatorApp.phoneNewCode().then(function(i){ ui.r68Phone = i || {}; renderView(); }); };

// ---------------- 8. Personal goals: one row, with arrows ----------------
afterRenderHooks.push(function(){
  const row = document.querySelector('.r43-owns'); if(!row) return;
  const wrap = row.parentElement; if(!wrap) return;
  row.classList.add('r68-row');
  const many = row.children.length > 2;
  wrap.classList.toggle('r68-goals', many);
  if(!many){ wrap.querySelectorAll('.r68-ga').forEach(function(b){ b.remove(); }); return; }
  if(!wrap.querySelector('.r68-ga')){
    wrap.insertAdjacentHTML('beforeend', '<button class="r68-ga is-l" data-action="r68GoalsGo" data-id="-1" aria-label="Previous goals">&lsaquo;</button><button class="r68-ga is-r" data-action="r68GoalsGo" data-id="1" aria-label="More goals">&rsaquo;</button>');
    row.addEventListener('scroll', r68GoalsArrows, {passive:true});
  }
  r68GoalsArrows();
});
function r68GoalsArrows(){ const row = document.querySelector('.r43-owns'), w = row && row.parentElement; if(!w) return; const l = w.querySelector('.r68-ga.is-l'), r = w.querySelector('.r68-ga.is-r'); if(l) l.disabled = row.scrollLeft < 8; if(r) r.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8; }
ACTIONS.r68GoalsGo = function(el, e, d){ const row = document.querySelector('.r43-owns'); if(!row) return; row.scrollBy({left:Number(d)*row.clientWidth, behavior:'smooth'}); setTimeout(r68GoalsArrows, 420); };

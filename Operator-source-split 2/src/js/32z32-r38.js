// ============ ROUND 38 ============
// • Today's top panel: the full-screen view is an icon up with the time and music (the "◉ Minimal"
//   chip is gone), the weather is a proper card, the left side fills the panel's height, and the
//   streak row is smaller with a wide Tasks bar right under it.
// • Op's light: no eclipse (the dark moon is gone, he's just a white light). New color: Rainbow.
// • Deliverables: the month's number is the plan's (a 16-reel plan is 16 a month, not 18), and work
//   finished as a task counts on the client's card.
// • Tasks can be a client's retainer deliverable: pick it when you add the task and finishing it logs one
//   for them (their count, pace and health move with it).
// • "How we got them" has Outreach.

// ---- how we get clients: Outreach ----
if(!LEAD_SOURCES.some(function(s){ return s.id==='outreach'; })){
  LEAD_SOURCES.splice(Math.max(0, LEAD_SOURCES.length - 1), 0, {id:'outreach', emoji:'📨', label:'Outreach', color:'#5BC0EB'});
}
OP_TOOLS.push({name:'set_client_source', description:'Set how a client or lead was won (e.g. "I got him from outreach").', input_schema:{type:'object', properties:{who:{type:'string'}, source:{type:'string', enum:LEAD_SOURCES.map(function(s){ return s.id; })}}, required:['who', 'source']}});

// ---- deliverables: the plan's number, and what counts ----
function delivStemWords(s){
  const w = String(s||'').toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean).map(function(x){ return x.length > 3 && /s$/.test(x) ? x.slice(0, -1) : x; });
  const long = w.filter(function(x){ return x.length >= 3; });
  return long.length ? long : w;
}
function delivClientOf(d){
  return arr(state.business && state.business.clients).find(function(c){ return arr(c.deliverables).indexOf(d) >= 0; }) || null;
}
// "16 Reels", "16 reels a month", "Reels x16": the number that goes with this deliverable
function delivPlanNumber(d){
  const c = delivClientOf(d), pkg = c && c.packageId ? arr(state.business.packages).find(function(x){ return x.id===c.packageId; }) : null;
  const stems = delivStemWords(d.title); if(!stems.length) return 0;
  const texts = [d.title, pkg && pkg.name, pkg && pkg.description];
  for(let i = 0; i < texts.length; i++){
    const t = String(texts[i]||'').toLowerCase();
    const re = /(\d{1,3})\s*x?\s*([a-z][a-z]+)|([a-z][a-z]+)\s*x\s*(\d{1,3})/g; let m;
    while((m = re.exec(t))){
      const n = Number(m[1] || m[4]), word = delivStemWords(m[2] || m[3])[0];
      if(n > 0 && word && stems.indexOf(word) >= 0) return n;
    }
  }
  return 0;
}
// (a month on a retainer is four weeks of the weekly number, unless the plan says otherwise)
function monthlyTargetFor(d){
  if(Number(d.monthlyTarget) > 0) return Number(d.monthlyTarget);
  const n = delivPlanNumber(d); if(n) return n;
  return Math.max(1, (d.weeklyTarget||1)*4);
}
function delivOne(d){ const t = String(d.title||''); return /[a-z]s$/i.test(t) && t.length > 3 ? t.slice(0, -1) : t; }
function delivMonthLine(d){ return deliverableMonthCount(d)+'/'+monthlyTargetFor(d)+' this month'; }
function clientDelivRowsHtml(c, compact){
  const recurring = arr(c.deliverables).filter(function(d){ return d.recurring; });
  if(!recurring.length) return '';
  const pkg = c.packageId ? arr(state.business.packages).find(function(x){ return x.id===c.packageId; }) : null;
  return '<div class="cc2-delivs">'+(pkg ? '<div class="cc2-pkg"><span class="cc2-pkg-n">'+escapeHtml(pkg.name)+'</span>'+(pkg.price ? '<span class="kpi-sub">$'+Number(pkg.price).toLocaleString()+'/mo</span>' : '')+'</div>' : '')+recurring.map(function(d){
    const done = deliverableWeekCount(d), target = deliverableWeekNeed(d);
    const pace = deliverablePaceStatus(d);
    const today = arr(d.completedDates).indexOf(todayStr())>=0;
    return '<div class="cc2-deliv" data-key="dv-'+c.id+'-'+d.id+'" title="'+escapeHtml(d.title)+': '+done+' of '+target+' this week ('+delivPaceWord(d)+') · '+delivMonthLine(d)+'">'+
      '<span class="cc2-deliv-title">'+escapeHtml(d.title)+'<small class="cc2-deliv-mo">'+deliverableMonthCount(d)+'/'+monthlyTargetFor(d)+' this month</small></span>'+
      weekDotsHtml(Math.min(done, target), target, pace)+
      '<span class="cc2-deliv-count" style="color:'+paceColorOf(pace)+'">'+done+'/'+target+'</span>'+
      (done>=target ? '<span class="cc2-owed is-caught" title="This week\'s number is in">&#10003;</span>' : '')+
      '<button class="cc2-deliv-btn cc2-plus'+(today?' did-today':'')+'" data-action="incrementDeliverableProgress" data-client="'+c.id+'" data-id="'+d.id+'" title="Log one">+</button>'+
    '</div>';
  }).join('')+'</div>';
}
// the card's back: each recurring deliverable says its month too
clientCardFrontHtml = (function(base){
  return function(c){
    const h = base.apply(this, arguments), rec = arr(c.deliverables).filter(function(d){ return d.recurring; });
    let i = 0;
    return h.replace(/(<div class="cf-deliv"><span class="cf-deliv-t">[\s\S]*?<\/span>)(?=<span class="(?:wk-dots|cc2-deliv-bar))/g, function(m){
      const d = rec[i++]; return d ? m.replace(/<\/span>$/, '<small class="cf-deliv-mo">'+delivMonthLine(d)+'</small></span>') : m;
    });
  };
})(clientCardFrontHtml);

// which deliverable a task is: the one you picked, or (for a task tied to one client) the one its title names
function delivFind(cid, did){
  const c = arr(state.business.clients).find(function(x){ return x.id===cid; }), d = c ? arr(c.deliverables).find(function(x){ return x.id===did; }) : null;
  return c && d ? {c:c, d:d} : null;
}
function taskClientIds(t){
  const ids = arr(t.clients).concat(t.client ? [t.client] : []).filter(function(x, i, all){ return x && x!=='personal' && all.indexOf(x)===i; });
  const low = String(t.title||'').toLowerCase();
  arr(state.business.clients).forEach(function(c){ [c.business, c.name].forEach(function(n){ n = String(n||'').trim().toLowerCase(); if(n.length >= 4 && low.indexOf(n) >= 0 && ids.indexOf(c.id) < 0) ids.push(c.id); }); });
  return ids;
}
function delivAutoMatch(t){
  if(!t || t.master || t.isVideoIdea) return null;
  const words = delivStemWords(t.title), hits = [];
  taskClientIds(t).forEach(function(cid){
    const c = arr(state.business.clients).find(function(x){ return x.id===cid; }); if(!c) return;
    arr(c.deliverables).forEach(function(d){
      if(!d.recurring) return;
      const st = delivStemWords(d.title);
      if(st.length && st.every(function(w){ return words.indexOf(w) >= 0; })) hits.push({c:c, d:d});
    });
  });
  return hits.length===1 ? hits[0] : null;
}
function taskDeliv(t){
  if(!t) return null;
  if(t.deliv && t.deliv.c){ return delivFind(t.deliv.c, t.deliv.d); }
  if(t.deliv===false) return null;
  return delivAutoMatch(t);
}
function delivLogOne(hit, date){
  if(!Array.isArray(hit.d.completedDates)) hit.d.completedDates = [];
  hit.d.completedDates.push(date || todayStr());
}
function delivUnlogOne(hit, date){
  const l = arr(hit.d.completedDates), i = l.lastIndexOf(date);
  if(i >= 0){ l.splice(i, 1); hit.d.completedDates = l; }
}
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    const skip = !t || justCompletedTaskId===id || (t.status==='done' && !t.ongoing);
    const r = base.apply(this, arguments);
    if(skip) return r;
    const today = todayStr();
    // the weekly "Deliverables for <client>" task, finished by hand: the rest of this week's number goes in
    if(t.master && t.master.kind==='deliv'){
      const c = arr(state.business.clients).find(function(x){ return x.id===t.master.clientId; }); if(!c) return r;
      const log = [];
      arr(c.deliverables).forEach(function(d){
        if(!d.recurring && !d.weeklyTarget) return;
        const left = Math.max(0, (d.weeklyTarget||1) - deliverableWeekCount(d));
        for(let i = 0; i < left; i++){ delivLogOne({c:c, d:d}, today); log.push({c:c.id, d:d.id, date:today}); }
      });
      if(log.length){ t.delivLog = log; persist('business'); persist('tasks'); }
      return r;
    }
    const hit = taskDeliv(t); if(!hit) return r;
    if(arr(t.delivLog).some(function(e){ return e.date===today; })) return r;
    if(!t.ongoing && arr(t.delivLog).length) return r;
    delivLogOne(hit, today);
    t.delivLog = arr(t.delivLog).concat([{c:hit.c.id, d:hit.d.id, date:today}]);
    persist('business'); persist('tasks');
    setTimeout(function(){ showToast('Counted for '+(hit.c.business || hit.c.name)+': '+hit.d.title+', '+delivMonthLine(hit.d)+'.', {icon:'&#128230;'}); }, 1000);
    return r;
  };
})(completeTask);
// un-finish a task and its deliverable comes back off the card
function delivTaskSync(){
  let changed = false;
  state.tasks.items.forEach(function(t){
    if(!arr(t.delivLog).length || t.ongoing || t.status==='done' || justCompletedTaskId===t.id) return;
    t.delivLog.forEach(function(e){ const hit = delivFind(e.c, e.d); if(hit) delivUnlogOne(hit, e.date); });
    delete t.delivLog; changed = true;
  });
  if(changed){ persist('business'); persist('tasks'); }
}
afterRenderHooks.push(function(){ try{ delivTaskSync(); }catch(e){} });
// once: this month's finished tasks that were a client's deliverable count now (only where the card says 0)
function delivBackfillOnce(){
  if(!state || !state.profile || state.profile.delivBackfill38) return;
  state.profile.delivBackfill38 = true;
  const mk = thisMonthKey(), zero = {};
  arr(state.business.clients).forEach(function(c){ arr(c.deliverables).forEach(function(d){ if(d.recurring && deliverableMonthCount(d)===0) zero[c.id+':'+d.id] = 1; }); });
  let n = 0;
  state.tasks.items.forEach(function(t){
    if(t.status!=='done' || t.ongoing || !t.completedAt || monthKeyOf(t.completedAt)!==mk || arr(t.delivLog).length) return;
    const hit = taskDeliv(t); if(!hit || !zero[hit.c.id+':'+hit.d.id]) return;
    delivLogOne(hit, t.completedAt); t.delivLog = [{c:hit.c.id, d:hit.d.id, date:t.completedAt}]; n++;
  });
  persist('profile');
  if(n){ persist('business'); persist('tasks'); setTimeout(function(){ showToast(n+' finished task'+(n===1 ? '' : 's')+' this month now count on '+(n===1 ? 'a client’s' : 'your clients’')+' deliverables.', {icon:'&#128230;', duration:6000}); }, 2500); }
}
afterRenderHooks.push(function(){ if(state && state.profile && !state.profile.delivBackfill38){ try{ delivBackfillOnce(); setTimeout(renderView, 0); }catch(e){} } });

// ---- adding a task: it can be a client's retainer deliverable ----
function delivChoices(){
  const out = [];
  arr(state.business && state.business.clients).filter(function(c){ return clientStageActive(c.stage) && c.status!=='paused'; }).forEach(function(c){
    arr(c.deliverables).forEach(function(d){ if(d.recurring) out.push({c:c, d:d}); });
  });
  return out;
}
function delivPickerHtml(sel, action, clientsSel){
  const ch = delivChoices(); if(!ch.length) return '';
  const pref = arr(clientsSel).filter(function(x){ return x!=='personal'; });
  ch.sort(function(a, b){ return (pref.indexOf(b.c.id) >= 0) - (pref.indexOf(a.c.id) >= 0); });
  const on = ch.find(function(x){ return sel===x.c.id+':'+x.d.id; });
  return '<div class="field tdv" style="margin-top:10px;"><label>Counts as a client deliverable <span class="tdv-opt">(optional)</span></label><div class="tdv-row">'+
    ch.map(function(x){ const k = x.c.id+':'+x.d.id; return '<button type="button" class="tdv-chip'+(sel===k ? ' is-on' : '')+'" data-action="'+action+'" data-id="'+k+'"><i style="background:'+clientColor(x.c)+'">'+escapeHtml(clientInitials(x.c))+'</i><b>'+escapeHtml(x.d.title)+'</b><em>'+deliverableMonthCount(x.d)+'/'+monthlyTargetFor(x.d)+'</em></button>'; }).join('')+
    '</div>'+(on ? '<div class="tdv-hint">Finishing it logs one '+escapeHtml(delivOne(on.d))+' for '+escapeHtml(on.c.business || on.c.name)+': their count, pace and health move with it.</div>' : '')+'</div>';
}
openAddTaskModal = (function(base){ return function(){ ui.newTaskDeliv = null; return base.apply(this, arguments); }; })(openAddTaskModal);
renderAddTaskModal = (function(base){
  return function(){
    const h = base.apply(this, arguments), pk = delivPickerHtml(ui.newTaskDeliv, 'newTaskDeliv', ui.newTaskClients);
    if(!pk) return h;
    return h.replace(/(<div class="field" style="margin-top:10px;"><label>Priority<\/label>)/, pk+'$1');
  };
})(renderAddTaskModal);
function delivPickInto(list, k){
  const cid = String(k).split(':')[0];
  const i = list.indexOf('personal'); if(i >= 0) list.splice(i, 1);
  if(list.indexOf(cid) < 0) list.push(cid);
}
ACTIONS.newTaskDeliv = function(el, e, id){
  ui.newTaskDeliv = ui.newTaskDeliv===id ? null : id;
  if(ui.newTaskDeliv){
    delivPickInto(ui.newTaskClients, id);
    const ti = document.getElementById('newTaskTitle'), hit = delivFind(id.split(':')[0], id.split(':')[1]);
    if(ti && !ti.value.trim() && hit){ ti.value = delivOne(hit.d)+' for '+(hit.c.business || hit.c.name); }
  }
  playTick(); renderAddTaskModalInto();
};
addTask = (function(base){
  return function(status){
    const n = state.tasks.items.length, k = ui.newTaskDeliv;
    const r = base.apply(this, arguments);
    if(state.tasks.items.length > n){
      const t = state.tasks.items[state.tasks.items.length - 1];
      if(k){ t.deliv = {c:k.split(':')[0], d:k.split(':')[1]}; persist('tasks'); renderView(); }
      ui.newTaskDeliv = null;
    }
    return r;
  };
})(addTask);
// …and when you edit one
openTaskEditModal = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    ui.editTaskDeliv = t && t.deliv && t.deliv.c ? t.deliv.c+':'+t.deliv.d : null;
    return base.apply(this, arguments);
  };
})(openTaskEditModal);
renderTaskEditModal = (function(base){
  return function(){
    const h = base.apply(this, arguments), pk = delivPickerHtml(ui.editTaskDeliv, 'editTaskDeliv', ui.editTaskClientsSel);
    if(!pk || !h) return h;
    return h.replace(/(<div class="field" style="margin-top:10px;"><label>Priority<\/label>)/, pk+'$1');
  };
})(renderTaskEditModal);
ACTIONS.editTaskDeliv = function(el, e, id){
  ui.editTaskDeliv = ui.editTaskDeliv===id ? null : id;
  if(ui.editTaskDeliv) delivPickInto(ui.editTaskClientsSel, id);
  playTick(); if(typeof renderTaskEditModalInto==='function') renderTaskEditModalInto();
};
saveEditTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    const r = base.apply(this, arguments);
    if(t){ const k = ui.editTaskDeliv; t.deliv = k ? {c:k.split(':')[0], d:k.split(':')[1]} : (t.deliv && t.deliv.c ? false : t.deliv); persist('tasks'); }
    return r;
  };
})(saveEditTask);
// the + menu: a client deliverable is its own way in
focusAddMenu = (function(base){
  return function(){
    const items = base.apply(this, arguments);
    if(!delivChoices().length) return items;
    const it = ['&#128230;', 'A client deliverable', function(){ openAddTaskModal(); const ch = delivChoices(); if(ch.length===1) ACTIONS.newTaskDeliv(null, null, ch[0].c.id+':'+ch[0].d.id); else { ui.newTaskDeliv = null; renderAddTaskModalInto(); setTimeout(function(){ const r = document.querySelector('#addTaskOverlay .tdv'); if(r){ r.classList.add('is-ask'); r.scrollIntoView({block:'center'}); } }, 60); } }, 'A retainer piece: it counts on their card'];
    const i = items.findIndex(function(x){ return x && /A task/.test(x[1]); });
    items.splice(i >= 0 ? i + 1 : items.length, 0, it);
    return items;
  };
})(focusAddMenu);
// the task card says which deliverable it is
taskCard = (function(base){
  return function(t){
    const h = base.apply(this, arguments);
    const hit = t && t.deliv && t.deliv.c ? taskDeliv(t) : null; if(!hit) return h;
    return h.replace('<div class="task-card-title">', '<div class="task-card-title"><span class="tdv-badge" title="Counts as a deliverable for '+escapeHtml(hit.c.business || hit.c.name)+'">&#128230; '+escapeHtml(hit.d.title)+'</span>');
  };
})(taskCard);

// Op: knows the sources and the plan numbers; can set a source; knows which tasks are deliverables
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='set_client_source'){
      const hit = opFindContact(String(x.who||'')); if(!hit) throw new Error('no client or lead matches "'+x.who+'"');
      const s = leadSourceById(String(x.source||'')); if(!s) throw new Error('unknown source');
      hit.x.leadSource = s.id; persist('business'); renderView(); return crmName(hit.kind, hit.x)+': came from '+s.label;
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
aiContext = (function(base){
  return function(){
    let s = base.apply(this, arguments);
    const lines = [];
    arr(state.business.clients).forEach(function(c){
      const src = c.leadSource ? leadSourceById(c.leadSource) : null;
      const ds = arr(c.deliverables).filter(function(d){ return d.recurring; }).map(function(d){ return d.title+' '+delivMonthLine(d); });
      if(src || ds.length) lines.push((c.business || c.name)+(src ? ' (came from '+src.label+')' : '')+(ds.length ? ': '+ds.join(', ') : ''));
    });
    if(lines.length) s += '\nClients, where they came from and this month’s deliverables: '+lines.join('; ')+'. (A task can count as a client’s deliverable; finishing it logs one.)';
    return s;
  };
})(aiContext);

// ---- Op's light: white, no eclipse; and Rainbow ----
OP_COLORS.splice(1, 0, ['rainbow', 'Rainbow']);
function opColor(){
  const raw = String(state.profile.opColor || '#ffffff');
  if(raw==='rainbow') return 'rainbow';
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : '#ffffff';
}
function opColorApply(){
  let el = document.getElementById('opColorCss');
  if(!el){ el = document.createElement('style'); el.id = 'opColorCss'; document.head.appendChild(el); }
  const c = opColor(), moods = state.profile.opMoodColors!==false;
  let css;
  if(c==='rainbow'){
    const sel = moods ? ':root:not([data-op-mood])' : ':root';
    css = sel+'{ animation:opRainbow 14s steps(84) infinite; --op-ink:#5a4a8a; }';
  } else {
    css = (c==='#ffffff' ? '' : ':root:not([data-op-mood]){ '+opColorVars(c)+' }')+(moods ? '' : ':root[data-op-mood]{ '+opColorVars(c).replace(/;/g, ' !important;')+' }');
  }
  document.documentElement.classList.toggle('op-rainbow', c==='rainbow');
  if(el.textContent!==css) el.textContent = css;
}
opSettingsHtml = (function(base){
  return function(){
    // (the color picker can't hold "rainbow")
    return base.apply(this, arguments).replace(/(<input type="color" id="opColorPick" value=")rainbow(")/, '$1#ffffff$2');
  };
})(opSettingsHtml);
(function(){
  const t = OP_TOOLS.find(function(x){ return x.name==='set_my_color'; });
  if(t){ t.description = 'Change your own light’s color when he asks (e.g. "go blue", "be white again", "go rainbow"). A 6-digit hex color, or "rainbow".'; t.input_schema.properties.hex.description = '#rrggbb or "rainbow"'; }
})();
opRunTool = (function(base){
  return function(name, x){
    if(name==='set_my_color' && x && /rainbow/i.test(String(x.hex||''))){ state.profile.opColor = 'rainbow'; persist('profile'); opColorApply(); renderView(); return 'now: rainbow'; }
    return base.apply(this, arguments);
  };
})(opRunTool);

// ---- Today's top panel ----
// the full-screen view: an icon with the time and the music, top right (and M, as before)
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(ui.view!=='today' || (state.focus && state.focus.activeSession) || (typeof focusMinimalOn==='function' && focusMinimalOn())) return h;
    const btn = '<button class="md-b md-full" data-action="toggleFocusMinimal" title="Full-screen view (M)"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    return h.replace(/<\/div>\s*$/, btn+'</div>');
  };
})(dockHtml);
afterRenderHooks.push(function(){ try{ dockRefresh(); }catch(e){} });
// the weather: a real little card (icon and temperature, what it's doing, high and low; the sun's day on the right)
function thWxHtml(){
  if(state.profile.skyChip===false) return '';
  const phase = skyPhase(), now = wxNow(), w = dayWindow(), d = new Date(), m = d.getHours()*60 + d.getMinutes();
  const kind = now ? wxKind(now.code) : 'clear';
  const left = m < w.rise ? 'Sun up in '+fmtDurationLabel(w.rise - m) : m < w.set ? fmtDurationLabel(w.set - m)+' of light left' : 'The sun’s down';
  const main = now
    ? '<b class="twx-t">'+now.temp+'&deg;</b><span class="twx-c"><span>'+escapeHtml(wxLabel(now.code))+'</span><small>H '+now.hi+'&deg; &middot; L '+now.lo+'&deg;'+(weatherCfg().place ? ' &middot; '+escapeHtml(String(weatherCfg().place).split(',')[0]) : '')+'</small></span>'
    : '<span class="twx-c"><span>'+escapeHtml(SKY_META[phase].label)+'</span><small><button class="twx-set" data-action="goToSettingsWeather">Add your city for the weather</button></small></span>';
  return '<div class="twx" data-sky="'+phase+'">'+
    '<span class="twx-i">'+wxIcon(kind, phase)+'</span>'+main+
    '<span class="twx-sun"><span class="twx-left">'+left+'</span>'+sunArcHtml({w:104, h:26, pad:5, r:3})+
      '<span class="twx-times"><span>&#8593; '+fmtMinOfDay(w.rise)+'</span><span>&#8595; '+fmtMinOfDay(w.set)+'</span></span></span>'+
  '</div>';
}
ACTIONS.goToSettingsWeather = function(){ ui.view = 'settings'; renderView(); setTimeout(function(){ const i = document.getElementById('wxQuery'); if(i){ i.scrollIntoView({block:'center'}); i.focus(); } }, 120); };
renderToday = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(h.indexOf('class="today-hero') < 0) return h;
    // no "◉ Minimal" chip by the name any more
    h = h.replace(/<div class="th-bizrow">(<div class="th-biz">[\s\S]*?<\/div>)<button class="th-min"[^>]*>[\s\S]*?<\/button><\/div>/, '$1');
    h = h.replace(/<button class="th-min"[^>]*>[\s\S]*?<\/button>/g, '');
    // the weather card
    h = h.replace(/<div class="th-wx">[\s\S]*?<\/div>/, function(){ const x = thWxHtml(); return x ? '<div class="th-wx is-r38">'+x+'</div>' : ''; });
    return h;
  };
})(renderToday);
// the streak row: the streak smaller, the week, and a wide Tasks bar under it
function swTasksBarHtml(done, total){
  const left = Math.max(0, total - done);
  const segs = total > 0 && total <= 16
    ? '<span class="swt-segs">'+Array.from({length:total}, function(_, i){ return '<i'+(i < done ? ' class="on"' : '')+'></i>'; }).join('')+'</span>'
    : '<span class="swt-bar"><i style="width:'+(total ? Math.round(done/total*100) : 0)+'%"></i></span>';
  return '<button class="swt" data-action="goToFinishedTasks" title="Today’s tasks">'+
    '<span class="swt-k">Tasks</span><b class="swt-n">'+done+'<small>/'+total+'</small></b>'+segs+
    '<span class="swt-r">'+(total===0 ? 'Nothing planned yet' : left===0 ? 'All done &#10003;' : left+' left')+'</span>'+
  '</button>';
}
streakWorkHtml = (function(base){
  return function(o){
    let h = base.apply(this, arguments);
    if((o && o.compact) || h.indexOf('is-r36') < 0) return h;
    let done = 0, total = 0;
    h = h.replace(/<button class="sw-tasks"[\s\S]*?<\/button>/, function(m){ const x = /<b>(\d+)<small>\/(\d+)<\/small><\/b>/.exec(m); if(x){ done = Number(x[1]); total = Number(x[2]); } return ''; });
    h = h.replace('class="sw is-row is-r36', 'class="sw is-row is-r36 is-r38');
    return h.replace(/<\/div>\s*$/, swTasksBarHtml(done, total)+'</div>');
  };
})(streakWorkHtml);

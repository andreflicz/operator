// ============ ROUND 57: THE PAGES ============
// Socials → Clients: one client at a time; their content calendar for the month (numbered reels on their posting
// days, done / today / late from what's been delivered), an export to send them, and their report.
// Op: one button opens him full screen (his chat is there), one turns him off (mute, an hour of quiet, or off),
// and ✕. His colour per mood in Settings. His read on a page is a line under the title that writes itself out, not
// a second boxed panel. Health: a fuel log for any day (‹ day ›), and its history counts everywhere food does.
// Analytics: a hero you can read at a glance, and Op's read alive next to it.

// ================= 1. Socials → Clients: the content calendar and the report =================
function r57CliPick(){ const cs = mtActiveClients(); let c = cs.find(function(x){ return x.id===ui.r57Cli; }); if(!c){ c = cs[0] || null; ui.r57Cli = c ? c.id : null; } return c; }
// a client's posting days: their playbook's, else Mon / Wed / Fri
function r57PostDays(c){ const p = c && c.pb && c.pb.id ? pbById(c.pb.id) : null, d = p && arr(p.postDays).length ? p.postDays : ['1', '3', '5']; return d.map(String); }
// this month's pieces: each recurring deliverable numbered (Reel 1, Reel 2 …) on posting days, spread through the month
function r57ContentPlan(c, ym){
  ym = ym || thisMonthKey();
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1, days = new Date(y, m + 1, 0).getDate(), post = r57PostDays(c), today = todayStr(), out = [];
  const slots = []; for(let i = 1; i <= days; i++){ const d = todayStr(new Date(y, m, i)); if(post.indexOf(String(new Date(y, m, i).getDay()))>=0) slots.push(d); }
  arr(c.deliverables).filter(function(d){ return d.recurring; }).forEach(function(d){
    const n = Math.max(0, Math.round(monthlyTargetFor(d) || 0)); if(!n) return;
    const done = arr(d.completedDates).filter(function(x){ return monthKeyOf(x)===ym; }).sort();
    const one = delivOne(d) || 'Piece';
    for(let k = 0; k < n; k++){
      const date = slots.length ? slots[Math.min(slots.length - 1, Math.floor(k*slots.length/n))] : todayStr(new Date(y, m, Math.min(days, 1 + Math.floor(k*days/n))));
      const st = k < done.length ? 'done' : date < today ? 'late' : date===today ? 'today' : 'planned';
      out.push({n:k + 1, of:n, what:one, date:date, st:st, doneOn:done[k] || null, d:d});
    }
  });
  return out.sort(function(a, b){ return a.date.localeCompare(b.date) || a.n - b.n; });
}
function r57CalHtml(c){
  const ym = ui.r57CliMonth || thisMonthKey(), y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1;
  const plan = r57ContentPlan(c, ym), by = {}; plan.forEach(function(x){ (by[x.date] = by[x.date] || []).push(x); });
  const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = todayStr(), post = r57PostDays(c);
  let cells = ''; for(let i = 0; i < first; i++) cells += '<div class="r57-cc-d is-empty"></div>';
  for(let i = 1; i <= days; i++){
    const d = todayStr(new Date(y, m, i)), its = by[d] || [];
    cells += '<div class="r57-cc-d'+(d===today ? ' is-today' : '')+(post.indexOf(String(new Date(y, m, i).getDay())) >= 0 ? ' is-post' : '')+'"><span>'+i+'</span>'+its.map(function(x){ return '<b class="r57-cc-i is-'+x.st+'" title="'+escapeHtml(x.what+' '+x.n+' of '+x.of)+'">'+escapeHtml(x.what)+' '+x.n+'</b>'; }).join('')+'</div>';
  }
  const done = plan.filter(function(x){ return x.st==='done'; }).length, late = plan.filter(function(x){ return x.st==='late'; }).length;
  return '<div class="r57-cc">'+
    '<div class="r57-cc-h"><button data-action="r57CliMonth" data-id="-1" aria-label="Last month">&lsaquo;</button><b>'+new Date(y, m, 1).toLocaleDateString(undefined, {month:'long', year:'numeric'})+'</b><button data-action="r57CliMonth" data-id="1" aria-label="Next month">&rsaquo;</button>'+
      '<span class="r57-cc-sum"><em class="is-done">'+done+' done</em>'+(late ? '<em class="is-late">'+late+' late</em>' : '')+'<em>'+plan.length+' this month</em></span></div>'+
    '<div class="r57-cc-w">'+['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function(w){ return '<span>'+w+'</span>'; }).join('')+'</div>'+
    '<div class="r57-cc-g">'+cells+'</div>'+
    (plan.length ? '' : '<div class="r57-cc-none">No monthly deliverables on '+escapeHtml(c.business || c.name)+'’s plan.</div>')+
  '</div>';
}
r55CliHtml = (function(base){
  return function(){
    const cs = mtActiveClients(); if(!cs.length) return base.apply(this, arguments);
    const c = r57CliPick();
    // (the accounts part is round 55's card, for this one client)
    const tpl = document.createElement('template'); tpl.innerHTML = base.apply(this, arguments);
    const card = Array.from(tpl.content.querySelectorAll('.r55-cli-c')).find(function(x){ const b = x.querySelector('.r55-cli-ch b'); return b && b.textContent===(c.business || c.name); });
    const acc = card ? card.innerHTML.replace(/<div class="r55-cli-ch">[\s\S]*?<b>[\s\S]*?<\/b>/, '<div class="r55-cli-ch">') : '';
    const top = tpl.content.querySelector('.r55-cli-top, .r55-cli-empty');
    const pills = '<div class="r57-cli-p">'+cs.map(function(x){ return '<button class="'+(x.id===c.id ? 'is-on' : '')+'" data-action="r57Cli" data-id="'+x.id+'" style="--cc:'+clientAccent(x)+'"><i></i>'+escapeHtml(x.business || x.name)+'</button>'; }).join('')+'</div>';
    return '<div class="r57-cli">'+pills+
      '<div class="r57-cli-b"><section class="r57-cli-cal">'+r57CalHtml(c)+'</section>'+
        '<aside class="r57-cli-side"><div class="r57-cli-acts"><button class="btn btn-primary" data-action="r55Report" data-id="'+c.id+'">Write their report</button><button class="btn" data-action="r57CliExport" data-id="'+c.id+'">Export the calendar</button></div>'+
          '<div class="r57-cli-acc">'+(acc || (top ? top.outerHTML : ''))+'</div></aside></div></div>';
  };
})(r55CliHtml);
ACTIONS.r57Cli = function(el, e, id){ ui.r57Cli = id; playTick(); renderView(); };
ACTIONS.r57CliMonth = function(el, e, d){ const ym = ui.r57CliMonth || thisMonthKey(), y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + Number(d), dt = new Date(y, m, 1); ui.r57CliMonth = dt.getFullYear()+'-'+pad2(dt.getMonth() + 1); playTick(); renderView(); };
// the export: a list they can read (what, when, done or not), copied and saved as a file
function r57CliExportText(c, ym){
  const plan = r57ContentPlan(c, ym || ui.r57CliMonth || thisMonthKey());
  return [(c.business || c.name)+' · content for '+new Date(localTs((ym || ui.r57CliMonth || thisMonthKey())+'-01', '12:00')).toLocaleDateString(undefined, {month:'long', year:'numeric'}), '']
    .concat(plan.map(function(x){ return x.what+' '+x.n+'  ·  '+new Date(localTs(x.date, '12:00')).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})+'  ·  '+(x.st==='done' ? 'Delivered' : x.st==='late' ? 'Coming' : x.st==='today' ? 'Today' : 'Planned'); })).join('\n');
}
ACTIONS.r57CliExport = function(el, e, id){
  const c = crmFind('client', id); if(!c) return;
  const t = r57CliExportText(c);
  try{ if(!fallbackCopy(t)) navigator.clipboard.writeText(t); }catch(err){}
  try{ const b = new Blob([t], {type:'text/plain'}), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (c.business || c.name || 'client').replace(/[^\w -]/g, '')+' content '+(ui.r57CliMonth || thisMonthKey())+'.txt'; document.body.appendChild(a); a.click(); a.remove(); }catch(err){}
  showToast('Copied and saved: ready to send to '+escapeHtml(c.name || c.business)+'.', {icon:'&#128203;'});
};
// (the report lives here now, a button per client; Op still opens it when you ask him)
opfEl = (function(base){ return function(){ const el = base.apply(this, arguments); try{ if(el) el.querySelectorAll('.r55-opab-b[data-action="r55Report"]').forEach(function(b){ const w = b.closest('.r55-opab') || b; w.remove(); }); }catch(e){} return el; }; })(opfEl);

// ================= 2. Op's bubble: Open, Turn off, ✕ =================
opBubShow = (function(base){
  return function(){
    const b = base.apply(this, arguments);
    if(b && !b.querySelector('.r57-bub-open')){
      const h = b.querySelector('.op-bub-h'), x = b.querySelector('.op-bub-x');
      if(h){
        h.querySelectorAll('.op-bub-full, .op-bub-logb, .op-bub-mute, .op-bub-busy, .op-bub-pw').forEach(function(n){ n.classList.add('r57-gone'); });
        const open = document.createElement('button'); open.className = 'r57-bub-open'; open.setAttribute('data-action', 'r57OpOpen'); open.setAttribute('aria-label', 'Open Op full screen, with your chats'); open.innerHTML = '&#10530;';
        const off = document.createElement('button'); off.className = 'r57-bub-off'; off.setAttribute('data-action', 'r57OpOffMenu'); off.textContent = 'Turn Op off';
        h.insertBefore(open, x || null); h.insertBefore(off, x || null);
      }
    }
    return b;
  };
})(opBubShow);
// one button: full screen with the chat (the history is there)
ACTIONS.r57OpOpen = function(){ state.profile.opfMode = 'chat'; persist('profile'); opfOpen(); };
// one button: how to turn him off
ACTIONS.r57OpOffMenu = function(el){
  const b = document.getElementById('opBub'); if(!b) return;
  let m = b.querySelector('.r57-offm');
  if(m){ m.remove(); return; }
  m = document.createElement('div'); m.className = 'r57-offm';
  m.innerHTML = '<button data-action="r57OpOff" data-id="mute">'+(opMuted() ? 'Voice back on' : 'Mute his voice')+'</button><button data-action="r57OpOff" data-id="busy">Quiet for an hour</button><button data-action="r57OpOff" data-id="off">Off until I turn him on</button>';
  b.appendChild(m);
};
ACTIONS.r57OpOff = function(el, e, v){
  const m = document.querySelector('#opBub .r57-offm'); if(m) m.remove();
  if(v==='mute') ACTIONS.opMuteToggle(); else if(v==='busy') ACTIONS.opBusyTap(); else ACTIONS.opPower();
};
// his colour per mood (Settings → Op's colour): worried, stern, joking, excited, down
function r57MoodColors(){ const m = state.profile.opMoodColorMap; return m && typeof m==='object' ? m : {}; }
function r57MoodCss(){
  const map = r57MoodColors(); let css = '';
  Object.keys(OP_MOODS).forEach(function(k){ if(k==='neutral' || !/^#[0-9a-f]{6}$/i.test(map[k] || '')) return; css += ':root[data-op-mood="'+k+'"]{ '+opColorVars(map[k].toLowerCase()).replace(/;/g, ' !important;')+' }'; });
  let el = document.getElementById('r57MoodCss'); if(!el){ el = document.createElement('style'); el.id = 'r57MoodCss'; document.head.appendChild(el); }
  if(el.textContent!==css) el.textContent = css;
}
afterRenderHooks.push(function(){ try{ r57MoodCss(); }catch(e){} });
opSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), map = r57MoodColors();
    if(state.profile.opMoodColors===false) return h;
    const rows = Object.keys(OP_MOODS).filter(function(k){ return k!=='neutral'; }).map(function(k){ const c = map[k] || OP_MOODS[k].c; return '<label class="r57-mc" style="--sw:'+c+'"><input type="color" data-r57-mood="'+k+'" value="'+c+'"><i></i><span>'+escapeHtml(OP_MOODS[k].label)+'</span></label>'; }).join('');
    return h.replace(/(<label class="opc-mood">[\s\S]*?<\/label>)/, function(m0){ return m0+'<div class="r57-mcs">'+rows+'</div>'; });
  };
})(opSettingsHtml);
document.addEventListener('change', function(e){ const t = e.target; if(!t || !t.getAttribute || !t.hasAttribute('data-r57-mood')) return; const map = Object.assign({}, r57MoodColors()); map[t.getAttribute('data-r57-mood')] = t.value; state.profile.opMoodColorMap = map; persist('profile'); r57MoodCss(); renderView(); });
document.addEventListener('input', function(e){ const t = e.target; if(t && t.getAttribute && t.hasAttribute('data-r57-mood')){ const l = t.closest('.r57-mc'); if(l) l.style.setProperty('--sw', t.value); } });

// ================= 3. Op's read on a page: a line that writes itself out =================
// Not a boxed panel second on every page: a line under the page's title, his dot breathing while he thinks, the
// words typing out the first time you see them. Pattern / Watch / Move read as What's going on / Watch / Next.
const R57_TYPED = {};
opReadHtml = function(kind, kick){
  if(kick) kick();
  const r = opReadStore()[kind], busy = !!ui['opRead_'+kind];
  if(!r && !busy) return '';
  const parts = r ? ['Pattern', 'Watch', 'Move'].map(function(k){ const m = new RegExp('(?:^|\\n|\\s)'+k+':\\s*([^\\n]+?)(?=\\s*(?:Pattern|Watch|Move):|\\n|$)').exec(r.text); return m ? [k, m[1].trim()] : null; }).filter(Boolean) : [];
  const label = {Pattern:'What’s going on', Watch:'Watch', Move:'Next'};
  const typed = r && R57_TYPED[kind]===r.text;
  const body = !r ? '<p class="r57-opl-t"><i class="opi-dots"><b></b><b></b><b></b></i></p>'
    : parts.length >= 2 ? '<div class="r57-opl-rows">'+parts.map(function(x){ return '<div class="r57-opl-r is-'+x[0].toLowerCase()+'"><b>'+label[x[0]]+'</b><span'+(typed ? '' : ' data-r57-type="1"')+'>'+escapeHtml(x[1])+'</span></div>'; }).join('')+'</div>'
    : '<p class="r57-opl-t"'+(typed ? '' : ' data-r57-type="1"')+'>'+escapeHtml(r.text)+'</p>';
  return '<div class="opi r57-opl'+(busy && !r ? ' is-busy' : '')+'" data-opi="'+escapeHtml(kind)+'"><span class="r57-opl-o"></span><div class="r57-opl-b"><span class="r57-opl-k">Op’s read</span>'+body+'</div>'+
    (r ? '<button class="opi-r" data-action="opReadAgain" data-id="'+escapeHtml(kind)+'" title="Another take">&#8635;</button>' : '')+'</div>';
};
// (the first time a take shows, it types itself out; after that it's just there)
afterRenderHooks.push(function(){
  try{
    document.querySelectorAll('.r57-opl[data-opi]').forEach(function(el){
      const kind = el.getAttribute('data-opi'), r = opReadStore()[kind]; if(!r || R57_TYPED[kind]===r.text) return;
      R57_TYPED[kind] = r.text;
      const spans = Array.from(el.querySelectorAll('[data-r57-type]')), texts = spans.map(function(s){ return s.textContent; });
      spans.forEach(function(s){ s.textContent = ''; s.removeAttribute('data-r57-type'); });
      let i = 0, j = 0;
      const step = function(){ if(j >= spans.length) return; const t = texts[j]; i = Math.min(t.length, i + 3); spans[j].textContent = t.slice(0, i); if(i >= t.length){ j++; i = 0; } setTimeout(step, 14); };
      step();
    });
  }catch(e){}
});
// Health: his read sits under the tabs, above the score (not between the panels)
renderFitness = (function(base){
  return function(){
    const sub = ['overview', 'body', 'training'].indexOf(ui.healthSub)>=0 ? ui.healthSub : 'overview';
    if(sub!=='overview') return base.apply(this, arguments);
    const read = opReadHealth();
    const tabs = '<div class="sub-pills">'+[['overview', 'Overview'], ['body', 'Weight &amp; fuel'], ['training', 'Training']].map(function(t){ return '<button class="sub-pill'+(sub===t[0] ? ' is-on' : '')+'" data-action="healthSub" data-id="'+t[0]+'">'+t[1]+'</button>'; }).join('')+'</div>';
    return '<div class="hl">'+tabs+read+'<div class="subtab-panel" data-key="health-overview">'+renderHealthScore()+renderBodyFuel()+renderWorkoutsHero()+'</div></div>';
  };
})(renderFitness);

// ================= 4. Health: food for any day =================
// ‹ day › on Fuel: what you ate that day, its total against your target, and what you log goes to that day. Every
// day's food is the same log the rest of the app reads (Diet on your card, the XP for days in your target, Op).
function r57FuelDay(){ const d = ui.r57FuelDay; return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= todayStr() ? d : todayStr(); }
renderBodyFuel = (function(base){
  return function(){
    const h = base.apply(this, arguments), day = r57FuelDay(), today = todayStr();
    const items = state.health.calorieEntries.filter(function(c){ return c.date===day; });
    const total = items.reduce(function(a, c){ return a + Number(c.calories || 0); }, 0), target = state.profile.calorieTarget || 2000;
    const pct = clamp(Math.round(total/target*100), 0, 999), left = target - total, color = pct > 110 ? 'var(--danger)' : pct >= 85 ? 'var(--good)' : 'var(--accent)';
    const label = day===today ? 'Today' : day===addDays(today, -1) ? 'Yesterday' : new Date(localTs(day, '12:00')).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
    const week = []; for(let i = 6; i >= 0; i--){ const d = addDays(day, -i), t = state.health.calorieEntries.filter(function(c){ return c.date===d; }).reduce(function(a, c){ return a + Number(c.calories || 0); }, 0); week.push({d:d, t:t}); }
    const top = Math.max(target*1.2, Math.max.apply(null, week.map(function(w){ return w.t; })));
    const picks = state.meals.library.slice().sort(function(a, b){ return (b.uses || 0) - (a.uses || 0); }).slice(0, 4);
    const fuel = '<div class="bf-half bf-fuel r57-fuel">'+
      '<div class="r57-fh"><div class="hl-k">Fuel</div><div class="r57-fd"><button data-action="r57FuelDay" data-id="-1" aria-label="The day before">&lsaquo;</button><label><b>'+escapeHtml(label)+'</b><input type="date" id="r57FuelDate" max="'+today+'" value="'+day+'"></label><button data-action="r57FuelDay" data-id="1" aria-label="The day after"'+(day >= today ? ' disabled' : '')+'>&rsaquo;</button></div></div>'+
      '<div class="bf-fuel-top"><div class="hc-ring">'+svgRing(clamp(pct, 0, 100), 92, color, String(total), 'of '+target)+'</div>'+
        '<div class="r57-fw">'+week.map(function(w){ return '<i class="'+(w.d===day ? 'is-on' : '')+(w.t > target*1.1 ? ' is-over' : w.t >= target*0.85 ? ' is-hit' : '')+'" data-action="r57FuelPick" data-id="'+w.d+'" title="'+fmtDateShort(w.d)+': '+w.t+' cal"><u style="height:'+(w.t ? Math.max(6, w.t/top*100) : 0).toFixed(0)+'%"></u><small>'+weekdayShort(w.d).slice(0, 1)+'</small></i>'; }).join('')+'</div></div>'+
      '<div class="hc-left'+(left < 0 ? ' is-over' : '')+'">'+(left >= 0 ? '<b>'+left+'</b> cal left' : '<b>'+(-left)+'</b> cal over')+(day===today ? ' today' : '')+'</div>'+
      '<div class="r57-fl">'+(items.length ? items.map(function(c){ return '<div class="r57-fi"><span>'+escapeHtml(c.name || 'Food')+'</span><b>'+Number(c.calories || 0)+'</b>'+deleteBtn('calorie', c.id)+'</div>'; }).join('') : '<div class="r57-fi is-none">Nothing logged'+(day===today ? ' yet' : '')+'</div>')+'</div>'+
      '<div class="hc-picks">'+picks.map(function(m){ return '<button class="hc-pick" data-action="quickMeal" data-id="'+m.id+'"><span>'+escapeHtml(m.name)+'</span><b>'+m.calories+'</b></button>'; }).join('')+'</div>'+
    '</div>';
    const i = h.indexOf('<div class="bf-half bf-fuel">'); if(i < 0) return h;
    const end = h.lastIndexOf('</div>');
    // (the weight side: three plain numbers under the line, so it isn't half empty)
    const wl = state.health.weightLog.slice().sort(function(a, b){ return a.date.localeCompare(b.date); }), w30 = wl.filter(function(w){ return w.date >= addDays(today, -30); });
    const unit = state.profile.weightUnit==='kg' ? 'kg' : 'lbs', chg = w30.length >= 2 ? w30[w30.length - 1].weight - w30[0].weight : null;
    const stats = wl.length ? '<div class="r57-ws"><div><b>'+(chg==null ? '–' : (chg > 0 ? '+' : '')+chg.toFixed(1))+'</b><span>30 days</span></div><div><b>'+Math.min.apply(null, wl.map(function(w){ return Number(w.weight); }))+'</b><span>lowest '+unit+'</span></div><div><b>'+w30.length+'</b><span>weigh-ins</span></div></div>' : '';
    let wside = h.slice(0, i);
    if(stats) wside = wside.replace(/(<\/div>\s*)$/, function(m0){ return stats+m0; });
    return wside+fuel+h.slice(end);
  };
})(renderBodyFuel);
ACTIONS.r57FuelDay = function(el, e, d){ const nd = addDays(r57FuelDay(), Number(d)); ui.r57FuelDay = nd > todayStr() ? todayStr() : nd; playTick(); renderView(); };
ACTIONS.r57FuelPick = function(el, e, d){ ui.r57FuelDay = d; playTick(); renderView(); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='r57FuelDate' && e.target.value){ ui.r57FuelDay = e.target.value; renderView(); } });
// what you log while looking at an earlier day goes to that day
function r57ToFuelDay(fn){
  return function(){
    const day = r57FuelDay(), before = state.health.calorieEntries.length, r = fn.apply(this, arguments);
    if(day!==todayStr() && ui.view==='personal' && ui.personalTab==='fitness'){ state.health.calorieEntries.slice(before).forEach(function(c){ if(c.date===todayStr()) c.date = day; }); persist('health'); renderView(); }
    return r;
  };
}
quickMeal = r57ToFuelDay(quickMeal);
addCalorieEntry = r57ToFuelDay(addCalorieEntry);
ACTIONS.hsFood = r57ToFuelDay(ACTIONS.hsFood);
// (leaving Health, the next visit starts on today)
afterRenderHooks.push(function(){ if(!(ui.view==='personal' && ui.personalTab==='fitness') && ui.r57FuelDay) ui.r57FuelDay = null; });

// ================= 5. Analytics: read it at a glance =================
// One hero across the top: the deep work for the range against its target (a ring), the days as bars you can
// read without numbers, three plain numbers (sessions, tasks done, workouts), and Op's read alive beside it.
analyticsOverviewHtml = (function(base){
  return function(r){
    const days = rangeDays(r), today = todayStr(), target = state.standards.deepWorkTargetMinutes || 180;
    const span = days ? days.filter(function(d){ return d <= today; }) : lastNDays(14);
    const bars = (days && days.length > 1 ? days : lastNDays(r==='today' ? 7 : 14)).map(function(d){ return {d:d, m:d > today ? null : d===today ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d)}; });
    const deep = span.reduce(function(a, d){ return a + (d===today ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(d)); }, 0);
    const goal = target*Math.max(1, days ? span.length : 1), pct = Math.round(deep/goal*100);
    const sess = state.focus.sessions.filter(function(s){ return sessionType(s)==='deep' && inRange(days, s.date); }).length;
    const done = state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt && inRange(days, t.completedAt); }).length;
    const wk = workoutTotals(days || lastNDays(14));
    const top = Math.max(target, Math.max.apply(null, bars.map(function(b){ return b.m || 0; })));
    const label = {today:'Today', week:'This week', lastweek:'Last week'}[r] || 'Last 14 days';
    const hero = '<div class="r57-an">'+
      '<div class="r57-an-ring">'+svgRing(clamp(pct, 0, 100), 148, pct >= 100 ? 'var(--good)' : '#E8A23D', fmtDurationLabel(days ? deep : deepWorkMinutesTodayLive()), days ? pct+'% of '+fmtHours(goal) : 'today')+'<small>'+label+'</small></div>'+
      '<div class="r57-an-bars">'+bars.map(function(b){ return '<i class="'+(b.d===today ? 'is-today' : '')+(b.m!=null && b.m >= target ? ' is-hit' : '')+(b.m==null ? ' is-future' : '')+'" title="'+fmtDateShort(b.d)+(b.m!=null ? ': '+fmtDurationLabel(b.m) : '')+'"><u style="height:'+(b.m ? Math.max(4, b.m/top*100) : 0).toFixed(1)+'%"></u><small>'+weekdayShort(b.d).slice(0, 1)+'</small></i>'; }).join('')+'<em style="bottom:calc('+(target/top*100).toFixed(1)+'% + 18px)"></em></div>'+
      '<div class="r57-an-n"><div><b>'+sess+'</b><span>sessions</span></div><div><b>'+done+'</b><span>tasks done</span></div><div><b>'+wk.n+'</b><span>workouts</span></div></div>'+
    '</div>';
    return hero+base.apply(this, arguments);
  };
})(analyticsOverviewHtml);

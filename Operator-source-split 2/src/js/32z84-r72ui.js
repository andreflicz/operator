// ============ ROUND 72 (UI): calendar room, XP page, widgets, Command View, alarms list ============

// ---------------- 20. the calendar has room ----------------
// Round 56 squeezed the month's rows to fit the window while each day kept an 84px minimum: on a shorter window the
// days spilled into each other. The rows now have a real height, and the page scrolls when it needs to.
r56CalFit = function(){ const root = document.documentElement; root.classList.remove('r56-fit'); root.style.removeProperty('--r56-rh'); };

// ---------------- 21. no level in the top right ----------------
// (the chip in the music dock is hidden by CSS; the level lives on the XP page)

// ---------------- 22. XP gets its own page ----------------
const R72_STAT_DOC = {
  'Focus':'Deep work a day over the last 30 days. Eight hours a day is the top of the scale.',
  'Deadlines':'Work tasks with a deadline, finished by it (last 30 days).',
  'MRR':'Your monthly recurring revenue against the next rank’s target.',
  'Scaling':'New clients each month against your standard. This month counts most.',
  'Reliability':'Client weeks delivered before the next one started, and deadlines met.',
  'Content':'Videos you planned that you actually posted, this month.',
  'Training':'Workouts a week against your goal, over the last month.',
  'Diet':'Days your food stayed inside your calorie target.',
  'Weight':'How close you are to your goal weight. It caps Health until you’re there.',
  'Mind':'Inspiration: reading, music, making things, time unplugged.',
  'Goals':'Week and month goals you set and finished.',
  'Finances':'Money check-ins done, debt going down, bills on time.',
  'Consistency':'How many days out of the last 30 you showed up: worked, trained, touched a client.',
  'Discipline':'Reliability and consistency together: doing what you said, when you said.'
};
function r72XpSources(){
  const W = XP_BOOK.work, H = XP_BOOK.health, P = XP_BOOK.personal, G = XP_BOOK.goals, O = XP_BOOK.oneoff, B = XP_BOOK.balance;
  return [
    {k:'Work', c:'#ffc56b', rows:[
      ['Deep work', W.deepBase+' XP the first hour, '+W.deepStep+' more each hour after. +'+W.longDay+' at '+(W.longAt/60)+'h, +'+W.goldDay+' at '+(W.goldAt/60)+'h'],
      ['Tasks', 'Up to '+W.taskMax+' each. The more you finish in a day, the more each pays'],
      ['Client work', '+'+W.deliv+' a deliverable, +'+W.early+' when a week is done early'],
      ['Reaching out', W.outreach+' for the first, '+W.outreachEach+' each after (up to '+W.outreachMax+')'],
      ['Shooting', '+'+W.shoot+' for a shoot day'],
      ['New business', '+'+O.client+' a new client, +'+O.mrrPerK+' per $1k of MRR']
    ]},
    {k:'Health', c:'#7ef0c0', rows:[
      ['Workouts', H.workouts.join(' / ')+' for the first four a week, '+H.workoutAfter+' after. First five ever: '+H.firstFive],
      ['Food', H.food+' a meal logged, +'+H.onTarget+' for a day on target'],
      ['Body', H.weighIn+' a weigh-in, +'+H.bed+' for bed on time']
    ]},
    {k:'Personal', c:'#c3a6ff', rows:[
      ['Journal', P.journal+' for an entry (12+ words)'],
      ['Inspiration', P.insp+' each, '+P.inspBig+' for the big ones'],
      ['Habits & skills', P.habit+' a habit, '+P.skill+' a skill session'],
      ['Money', P.money+' for the weekly money check-in']
    ]},
    {k:'Goals', c:'#8fd3ff', rows:[
      ['Week goals', G.week[0]+'–'+G.week[1]+' each, '+G.sweepWeek+' for clearing the week'],
      ['Month goals', G.month[0]+'–'+G.month[1]+' each, '+G.sweepMonth+' for clearing the month'],
      ['Balance', 'Touch all your areas in a day: ×'+B.all]
    ]}
  ];
}
function r72XpPage(){
  const x = xpSummary(), r = RANKS[x.rank] || RANKS[0], next = RANKS[x.rank + 1];
  let Q = []; try{ Q = r70Quests(); }catch(e){}
  const open = Q.filter(function(q){ return !q.done; }), got = Q.length - open.length;
  let card = ''; try{ card = playerCardHtml('you'); }catch(e){}
  let today = ''; try{ today = r43TodayAreasHtml(x); }catch(e){}
  let reward = ''; try{ reward = r43NextRewardHtml() || ''; }catch(e){}
  const pct = Math.min(100, (x.levelPct || 0)*100);
  const quest = function(q){ return '<button class="r72x-q'+(q.done ? ' is-done' : '')+'" data-action="'+q.act+'"><i>'+(q.done ? '&#10003;' : q.icon)+'</i><span>'+escapeHtml(q.label)+(q.weekly ? ' <em>this week</em>' : '')+'</span><b>'+(q.done ? 'done' : '+'+q.xp.toLocaleString())+'</b></button>'; };
  const areas = (x.attrs && x.attrs.areas) || [];
  return '<div class="view-header"><div><div class="view-title">XP</div></div></div>'+
  '<div class="r72x" style="--rc:'+r.color+'">'+
    // the top: your card, and your level
    '<div class="r72x-top">'+
      '<div class="r72x-card">'+card+'</div>'+
      '<div class="r72x-lvl card">'+
        '<div class="r72x-lh"><div><small>Level</small><b>'+x.level+'</b></div><div class="r72x-rank"><span>'+escapeHtml(r.name)+'</span><small>'+escapeHtml(r.tag || '')+'</small></div></div>'+
        '<div class="r72x-bar"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
        '<div class="r72x-ln"><span><b>'+x.total.toLocaleString()+'</b> XP</span><span>'+(x.maxed ? 'Maxed out' : x.canLevel ? 'Level '+(x.level + 1)+' is ready' : (x.levelHi - x.total).toLocaleString()+' to level '+(x.level + 1))+'</span></div>'+
        (x.canLevel ? '<button class="r72x-claim" data-action="r70Claim"><span>&#128293;</span> Claim level '+(x.level + 1)+'</button>' : '')+
        (next ? '<div class="r72x-next">Next rank: <b style="color:'+next.color+'">'+escapeHtml(next.name)+'</b> at level '+next.level+(next.mrr ? ', $'+next.mrr.toLocaleString()+' MRR' : '')+(next.low ? ', every area '+next.low+'+' : '')+'</div>' : '')+
        reward+today+
      '</div>'+
    '</div>'+
    // quests
    (Q.length ? '<section class="card r72x-sec r72x-qsec"><div class="r72x-h"><b>Today’s quests</b><span>'+(open.length ? got+' of '+Q.length+' done · '+open.reduce(function(a, q){ return a + q.xp; }, 0).toLocaleString()+' XP still out there' : 'All done today')+'</span></div>'+
      '<div class="r72x-qs">'+open.map(quest).join('')+Q.filter(function(q){ return q.done; }).map(quest).join('')+'</div></section>' : '')+
    // every stat, and what feeds it
    '<section class="r72x-sec r72x-ssec"><div class="r72x-h"><b>Your stats</b><span>What each number is, and what moves it</span></div>'+
      '<div class="r72x-areas">'+areas.map(function(a){
        return '<div class="card r72x-a" style="--ac:'+a.color+'"><div class="r72x-ah"><b>'+a.v+'</b><span>'+escapeHtml(a.name)+'</span></div>'+
          arr(a.subs).map(function(s){
            const v = s.v==null ? null : s.v, doc = R72_STAT_DOC[s.label] || '';
            return '<div class="r72x-s'+(v==null ? ' is-empty' : '')+'"><div class="r72x-sl"><b>'+escapeHtml(s.label)+'</b><em>'+(v==null ? '–' : v)+'</em></div>'+
              '<i><u style="width:'+(v==null ? 0 : Math.max(0, Math.min(100, (v - 25)/75*100))).toFixed(0)+'%"></u></i>'+
              (doc ? '<p>'+escapeHtml(doc)+'</p>' : '')+(s.note ? '<small>'+escapeHtml(s.note)+'</small>' : '')+'</div>';
          }).join('')+'</div>';
      }).join('')+'</div></section>'+
    // the ranks
    '<section class="card r72x-sec r72x-rsec"><div class="r72x-h"><b>Ranks</b><span>Each needs the level, every area at the number shown, and (with clients) the MRR</span></div>'+
      '<div class="r72x-ranks">'+RANKS.map(function(k, i){
        return '<div class="r72x-r'+(i===x.rank ? ' is-now' : i < x.rank ? ' is-past' : '')+'" style="--k:'+k.color+'"><b>'+escapeHtml(k.name)+'</b><span>Level '+k.level+'</span><small>'+(k.low ? 'Areas '+k.low+'+' : 'Start')+(k.mrr ? ' · $'+(k.mrr >= 1000 ? Math.round(k.mrr/1000)+'k' : k.mrr) : '')+'</small></div>';
      }).join('')+'</div></section>'+
    // where XP comes from
    '<section class="r72x-sec r72x-xsec"><div class="r72x-h"><b>Where XP comes from</b><span>Real actions only. Nothing for opening the app</span></div>'+
      '<div class="r72x-src">'+r72XpSources().map(function(g){
        return '<div class="card r72x-g" style="--gc:'+g.c+'"><div class="r72x-gk">'+escapeHtml(g.k)+'</div>'+g.rows.map(function(rw){ return '<div class="r72x-gr"><b>'+escapeHtml(rw[0])+'</b><span>'+escapeHtml(rw[1])+'</span></div>'; }).join('')+'</div>';
      }).join('')+'</div></section>'+
  '</div>';
}
renderToday = (function(base){ return function(){ if(ui.view==='xp'){ try{ return r72XpPage(); }catch(e){ return '<div class="card section">The XP page couldn’t draw: '+escapeHtml(e.message || String(e))+'</div>'; } } return base.apply(this, arguments); }; })(renderToday);
// the sidebar gets an XP item under Personal; the You tab's XP block points there
function r72XpNav(){
  const nav = document.querySelector('.sidebar nav, .sidebar .nav, nav.nav') || (document.querySelector('.nav-item') || {}).parentNode;
  if(!nav || nav.querySelector('[data-view="xp"]')) return;
  const b = document.createElement('button'); b.className = 'nav-item'; b.dataset.action = 'nav'; b.dataset.view = 'xp';
  b.innerHTML = '<span class="nav-icon">&#9670;</span><span class="nav-label">XP</span>';
  const after = nav.querySelector('[data-view="personal"]');
  if(after && after.nextSibling) nav.insertBefore(b, after.nextSibling); else nav.appendChild(b);
}
afterRenderHooks.push(function(){ try{ r72XpNav(); }catch(e){} });
ACTIONS.openYou = (function(base){ return function(){ ui.view = 'xp'; renderView(); }; })(ACTIONS.openYou);
ACTIONS.r72OpenXp = function(){ ui.view = 'xp'; playTick(); renderView(); };
// on You, the long XP block becomes one line that opens the page
r70XpHtml = function(){
  const x = xpSummary();
  return '<button class="r72-xpline'+(x.canLevel ? ' is-ready' : '')+'" data-action="r72OpenXp"><b>Level '+x.level+'</b><span>'+x.total.toLocaleString()+' XP'+(x.canLevel ? ' · level '+(x.level + 1)+' ready to claim' : '')+'</span><em>XP page &#8594;</em></button>';
};

// ---------------- 24. Command View: customize it on the board ----------------
const R72_CMD_EXTRA = [
  {id:'bigclock', label:'A big clock', def:false},
  {id:'weather', label:'Weather', def:false},
  {id:'today', label:'Today’s calendar', def:false},
  {id:'time', label:'Your time (focus, shooting, breaks)', def:false},
  {id:'mode', label:'What you’re doing now', def:false},
  {id:'note', label:'A note to yourself', def:false}
];
R72_CMD_EXTRA.forEach(function(b){ if(!R71_BANDS.some(function(x){ return x.id===b.id; })) R71_BANDS.push(b); });
function r72CmdCfg(){
  const c = r71Cfg();
  if(!Array.isArray(c.order)) c.order = R71_BANDS.map(function(b){ return b.id; });
  R71_BANDS.forEach(function(b){ if(c.order.indexOf(b.id) < 0) c.order.push(b.id); if(c.bands[b.id]===undefined) c.bands[b.id] = b.def; });
  if(!c.size || typeof c.size!=='object') c.size = {};
  if(typeof c.note!=='string') c.note = '';
  if(typeof c.theme!=='string') c.theme = 'night';
  return c;
}
const R72_CMD_DEF_SIZE = {clock:'l', type:'l', rhythm:'m', numbers:'m', deadlines:'l', standard:'l', vision:'l', quote:'l', bigclock:'l', weather:'s', today:'m', time:'m', mode:'s', note:'m'};
function r72CmdSize(id){ const c = r72CmdCfg(); return c.size[id] || R72_CMD_DEF_SIZE[id] || 'l'; }
// one band at a time, from Round 71's own drawing (so it stays the same board)
function r72CmdBand(id, mode){
  const c = r72CmdCfg();
  if(id==='bigclock') return '<div class="r72c-clock"><b>'+r72Clock()+'</b><span>'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</span></div>';
  if(id==='weather'){ const now = typeof wxNow==='function' ? wxNow() : null; return now ? '<div class="r71-card r72c-wx"><div class="r71-h">Outside</div><b>'+wxIcon(wxKind(now.code), skyPhase())+' '+now.temp+'&deg;</b><span>'+escapeHtml(wxLabel(now.code))+(now.hi!=null ? ' · H '+now.hi+'&deg; L '+now.lo+'&deg;' : '')+'</span></div>' : '<div class="r71-card r72c-wx"><div class="r71-h">Outside</div><span>Add your city in Settings for the weather.</span></div>'; }
  if(id==='today'){
    const t = todayStr(), evs = arr(state.calendar.events).filter(function(e){ return e.date===t; }).sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); });
    return '<div class="r71-card r72c-today"><div class="r71-h">Today</div>'+(evs.length ? evs.slice(0, 6).map(function(e){ const past = e.time && e.time < nowHM(); return '<div class="r72c-ev'+(past ? ' is-past' : '')+'"><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b><span>'+escapeHtml(e.title)+'</span></div>'; }).join('') : '<div class="r71-empty">Nothing on the calendar.</div>')+'</div>';
  }
  if(id==='time') return '<div class="r71-card"><div class="r71-h">Your time</div>'+(typeof r72TimeHtml==='function' ? r72TimeHtml(true).replace(/<div class="r72t-f">[\s\S]*?<\/div>\s*<\/div>$/, '</div>') : '')+'</div>';
  if(id==='mode') return '<div class="r71-card r72c-mode"><div class="r71-h">Right now</div><b>'+escapeHtml(typeof r72Where==='function' ? r72Where() : '')+'</b></div>';
  if(id==='note') return c.note ? '<div class="r71-card r72c-note"><div class="r71-h">Note</div><p>'+escapeHtml(c.note)+'</p></div>' : (ui.r72CmdEdit ? '<div class="r71-card r72c-note"><div class="r71-h">Note</div><p class="r71-empty">Write it in Customize.</p></div>' : '');
  // Round 71's bands: draw the board with only this one switched on, and lift it out
  const saved = c.bands; const only = {}; R71_BANDS.forEach(function(b){ only[b.id] = b.id===id; }); c.bands = only;
  let h = ''; try{ h = r71Html(mode); }finally{ c.bands = saved; }
  h = h.replace(/^<div class="r71[^"]*">/, '').replace(/<\/div>$/, '');
  return h.replace(/^<div class="r71-mid">([\s\S]*)<\/div>$/, '$1');
}
function r72CmdHtml(mode){
  const c = r72CmdCfg(), big = mode!=='panel', edit = big && ui.r72CmdEdit;
  const T = typeof r71Type==='function' ? r71Type() : {id:'work'};
  const ids = c.order.filter(function(id){ return edit || c.bands[id]!==false; });
  const cells = ids.map(function(id, i){
    const on = c.bands[id]!==false, sz = r72CmdSize(id), b = R71_BANDS.find(function(x){ return x.id===id; }) || {label:id};
    let inner = ''; if(on || edit){ try{ inner = r72CmdBand(id, mode); }catch(e){ inner = ''; } }
    if(!inner && !edit) return '';
    const tools = edit ? '<div class="r72c-tools"><b>'+escapeHtml(b.label)+'</b>'+
      '<button data-action="r72CmdMove" data-id="'+id+':-1"'+(i===0 ? ' disabled' : '')+' title="Earlier">&#8593;</button><button data-action="r72CmdMove" data-id="'+id+':1"'+(i===ids.length - 1 ? ' disabled' : '')+' title="Later">&#8595;</button>'+
      ['s', 'm', 'l'].map(function(z){ return '<button class="'+(sz===z ? 'is-on' : '')+'" data-action="r72CmdSize" data-id="'+id+':'+z+'">'+z.toUpperCase()+'</button>'; }).join('')+
      '<button class="r72c-eye'+(on ? ' is-on' : '')+'" data-action="r72CmdBand" data-id="'+id+'" title="'+(on ? 'Hide' : 'Show')+'">'+(on ? '&#128065;' : '&#8212;')+'</button></div>' : '';
    return '<div class="r72c-cell is-'+(big ? sz : 'l')+(on ? '' : ' is-hidden')+'" data-band="'+id+'">'+tools+(inner || '<div class="r71-empty">Nothing to show yet.</div>')+'</div>';
  }).join('');
  return '<div class="r71'+(big ? ' is-big' : ' is-panel')+' r72c is-'+T.id+(edit ? ' is-edit' : '')+' th-'+c.theme+'">'+
    (edit ? '<div class="r72c-bar"><b>Customize the board</b>'+
      '<div class="seg-tabs r72c-th">'+[['night', 'Night'], ['dusk', 'Dusk'], ['mono', 'Mono']].map(function(o){ return '<button class="seg-tab'+(c.theme===o[0] ? ' active' : '')+'" data-action="r72CmdTheme" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
      '<div class="seg-tabs r72c-th">'+[['work', 'Doing the work'], ['action', 'Starting'], ['both', 'Both']].map(function(o){ return '<button class="seg-tab'+(c.tone===o[0] ? ' active' : '')+'" data-action="r71Tone" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'+
      '<input class="input r72c-noteIn" id="r72CmdNote" placeholder="A note for the board" value="'+escapeHtml(c.note)+'">'+
      '<button class="btn btn-sm btn-primary" data-action="r72CmdEdit">Done</button></div>' : '')+
    '<div class="r72c-grid">'+cells+'</div></div>';
}
r71Open = function(){
  let v = document.getElementById('r71Full');
  if(!v){
    v = document.createElement('div'); v.id = 'r71Full'; v.className = 'r71-full';
    document.body.appendChild(v);
    requestAnimationFrame(function(){ v.classList.add('is-in'); });
  }
  // (while you type the note, the half-minute refresh leaves it alone)
  if(ui.r72CmdEdit && document.activeElement && document.activeElement.id==='r72CmdNote') return;
  const html = '<button class="r71-x" data-action="r71Close" aria-label="Close">&#10005;</button>'+
    (ui.r72CmdEdit ? '' : '<button class="r71-gear r72c-cust" data-action="r72CmdEdit" aria-label="Customize">&#9998; Customize</button>')+
    r72CmdHtml('full');
  if(typeof morphInto==='function' && v.firstChild) morphInto(v, html); else v.innerHTML = html;
  document.body.classList.add('r71-on');
};
r71Tick = function(){ if(document.getElementById('r71Full')) r71Open(); };
if(typeof PANEL_RENDERERS!=='undefined') PANEL_RENDERERS.command = function(){
  return '<div><div class="section-title" style="justify-content:center;">Command View<button class="btn btn-ghost btn-sm" data-action="r71Open" style="margin-left:8px;">Full screen</button></div>'+r72CmdHtml('panel')+'</div>';
};
ACTIONS.r71Settings = function(){ ui.r72CmdEdit = true; r71Open(); };
ACTIONS.r72CmdEdit = function(){
  const n = document.getElementById('r72CmdNote'); if(n){ r72CmdCfg().note = n.value.slice(0, 240); persist('settings'); }
  ui.r72CmdEdit = !ui.r72CmdEdit; playTick(); r71Open(); renderView();
};
ACTIONS.r72CmdMove = function(el, e, id){
  const p = String(id).split(':'), c = r72CmdCfg(), o = c.order, i = o.indexOf(p[0]), d = Number(p[1]);
  // move past hidden ones only in edit (they're all visible there)
  const j = i + d; if(i < 0 || j < 0 || j >= o.length) return;
  o.splice(i, 1); o.splice(j, 0, p[0]); persist('settings'); playTick(); r71Open();
};
ACTIONS.r72CmdSize = function(el, e, id){ const p = String(id).split(':'); r72CmdCfg().size[p[0]] = p[1]; persist('settings'); playTick(); r71Open(); };
ACTIONS.r72CmdBand = function(el, e, id){ const c = r72CmdCfg(); c.bands[id] = c.bands[id]===false; persist('settings'); playTick(); r71Open(); };
ACTIONS.r72CmdTheme = function(el, e, id){ r72CmdCfg().theme = id; persist('settings'); playTick(); r71Open(); };
ACTIONS.r71Tone = (function(base){ return function(){ base.apply(this, arguments); r71Open(); }; })(ACTIONS.r71Tone);
document.addEventListener('input', function(e){ if(e.target && e.target.id==='r72CmdNote'){ r72CmdCfg().note = e.target.value.slice(0, 240); persist('settings'); } });
ACTIONS.r71Close = (function(base){ return function(){ if(ui.r72CmdEdit){ const n = document.getElementById('r72CmdNote'); if(n){ r72CmdCfg().note = n.value.slice(0, 240); persist('settings'); } ui.r72CmdEdit = false; } return base.apply(this, arguments); }; })(ACTIONS.r71Close);

// with room in each day, up to three things show before "+N"
cxMonthCardHtml = (function(base){
  return function(){
    const out = base.apply(this, arguments);
    if(typeof r59CalClient==='function' && r59CalClient()) return out;
    return out.replace(/(<button class="cx-d[^"]*" data-action="selectCalDay" data-date="(\d{4}-\d{2}-\d{2})"[^>]*><span>\d+<\/span>)<small class="cx-peek[\s\S]*?(?=<em>)/g, function(m0, open, ds){
      let info; try{ info = calDayInfo(ds); }catch(e){ return m0; }
      const evs = arr(info.events).slice().sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); });
      const all = evs.map(function(e){ return {t:e.title, c:(categoryById(e.categoryId) || {}).color || '#8A90A2', dl:false}; })
        .concat(arr(info.deadlines).map(function(t){ return {t:t.title, c:'#ff6b6b', dl:true}; }));
      if(!all.length) return m0;
      const show = all.slice(0, 3), more = all.length - show.length;
      return open+show.map(function(x){ return '<small class="cx-peek'+(x.dl ? ' is-dl' : '')+'" style="--c:'+x.c+'">'+escapeHtml(x.t)+'</small>'; }).join('')+(more > 0 ? '<small class="cx-more">+'+more+'</small>' : '');
    });
  };
})(cxMonthCardHtml);

// ---------------- 23. Today's widgets: every one sizes, and nothing runs out of its box ----------------
// panels added after Round 60 (Command View, Your time) were never wrapped, so S/M/L did nothing to them
setTimeout(function(){
  try{
    Object.keys(PANEL_RENDERERS).forEach(function(pid){
      if(pid==='heatmap') return;
      const fn = PANEL_RENDERERS[pid]; if(fn._r72) return;
      const w = function(){ const h = fn.apply(this, arguments); if(!h || todayEditing() || h.indexOf('<div class="r60w')===0) return h; return '<div class="r60w" data-wid="'+pid+'" style="--span:'+r60Span(pid)+'">'+h+'</div>'; };
      w._r72 = true; PANEL_RENDERERS[pid] = w;
    });
    if(typeof R60_SPAN_DEF!=='undefined'){ R60_SPAN_DEF.command = R60_SPAN_DEF.command || 12; R60_SPAN_DEF.r72time = R60_SPAN_DEF.r72time || 6; }
  }catch(e){}
}, 0);

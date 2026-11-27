// ============ ROUND 73: THE MIND VIEW ============
// A second interface for the whole app: your life as a living star map. Settings → Look & Sound → Interface (or the
// sidebar's "Mind view") switches it, and the app restarts into it. Same data, same functions: the map is the way
// around, and diving into anything opens the classic page for it in a glass window over the map.
//
// One canvas, drawn by hand (no libraries): Op in the middle with two rings (today's deep work inside, your level
// outside), seven sectors at fixed clock positions (so they're always where your hand expects), and their moons:
// today's tasks, clients (bigger = more MRR, further out = longer since you touched them), the week's calendar,
// health and journal, Inspiration, XP quests. Positions are worked out, not simulated: nothing drifts but a slow
// breath, and nothing runs when nothing moves.
const MIND = {booted:false, nodes:[], byId:{}, links:[], cam:{x:0, y:0, k:0.9}, tgt:{x:0, y:0, k:0.9}, fly:null, hover:null, sel:null,
  sparks:[], pings:[], t0:0, boot:0, raf:0, last:0, built:0, drag:null, stars:null, glow:{}, dpr:1, W:0, H:0, dive:false, pal:null};
const R73M_SECTORS = [
  {id:'focus', label:'FOCUS', clock:12, color:'#FF6B2C', key:'1', dive:{view:'focus', focusTab:'tasks'}},
  {id:'business', label:'BUSINESS', clock:2, color:'#F5C451', key:'2', dive:{view:'business'}},
  {id:'social', label:'SOCIAL', clock:4, color:'#A855F7', key:'3', dive:{view:'convos'}},
  {id:'calendar', label:'CALENDAR', clock:9, color:'#60A5FA', key:'4', dive:{view:'calendar'}},
  {id:'personal', label:'PERSONAL', clock:7, color:'#34D399', key:'5', dive:{view:'personal'}},
  {id:'xp', label:'XP', clock:10.5, color:'#FDE047', key:'6', dive:{view:'xp'}},
  {id:'inspire', label:'INSPIRATION', clock:5, color:'#F472B6', key:'7', dive:{inspire:true}}
];
const R73M_STATE = {
  locked:{c:'#FF6B2C', label:'LOCKED IN'}, shooting:{c:'#FF3B5C', label:'SHOOTING'}, break:{c:'#34D399', label:'ON A BREAK'},
  off:{c:'#64748B', label:'OFF THE CLOCK'}, asleep:{c:'#6366F1', label:'ASLEEP'}, free:{c:'#38BDF8', label:'READY'}
};
function r73MindOn(){ return state.profile && state.profile.viewMode==='mind'; }
function r73Reduce(){ return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || r72P('mindCalm', false); }
function r73Hex(c, a){ const h = c.replace('#', ''); const n = parseInt(h.length===3 ? h.split('').map(function(x){ return x+x; }).join('') : h, 16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }

// ---------------- switching (it restarts the app) ----------------
function r73MindSwitch(mode){
  const to = mode==='mind' ? 'mind' : 'classic';
  if((state.profile.viewMode || 'classic')===to) return;
  uiConfirm({title:to==='mind' ? 'Switch to the Mind view?' : 'Back to the classic view?', text:'Operator restarts into it. Nothing is lost: same data, every feature. You can switch back any time (Settings → Look & Sound, or ⌘K → Classic view).', okLabel:'Restart into it'}).then(function(yes){
    if(!yes) return;
    state.profile.viewMode = to; persist('profile'); try{ persistFlush(); }catch(e){}
    const s = document.createElement('div'); s.id = 'r73Restart'; s.innerHTML = '<div class="r73r-core"></div><b>'+(to==='mind' ? 'Entering the Mind view' : 'Back to classic')+'</b>';
    document.body.appendChild(s); requestAnimationFrame(function(){ s.classList.add('is-in'); });
    setTimeout(function(){ try{ if(window.operatorApp && operatorApp.relaunch){ operatorApp.relaunch(); return; } }catch(e){} location.reload(); }, 900);
  });
}
ACTIONS.r73Interface = function(el, e, id){ r73MindSwitch(id); };
function r73InterfaceSetHtml(){
  const cur = r73MindOn() ? 'mind' : 'classic';
  const opt = function(id, title, sub){ return '<button class="r73-ifc'+(cur===id ? ' is-on' : '')+'" data-action="r73Interface" data-id="'+id+'"><i class="r73ifc-'+id+'"></i><b>'+title+'</b><span>'+sub+'</span></button>'; };
  return '<div class="card section op-settings" id="r73Ifc"><div class="section-title">&#129504; Interface</div>'+
    '<p class="r70t-p">Two completely different ways around the same app. Switching restarts Operator.</p>'+
    '<div class="r73-ifcs">'+opt('classic', 'Classic', 'Sidebar, pages and cards.')+opt('mind', 'Mind view', 'Your life as a star map. Op in the middle, everything orbiting him.')+'</div>'+
    (cur==='mind' ? r51Row('Calm motion (less movement on the map)', '<button class="r45-sw'+(r72P('mindCalm', false) ? ' on' : '')+'" data-action="r73MindCalm"><span></span></button>')+r51Row('Map sounds', '<button class="r45-sw'+(r72P('mindSound', true)!==false ? ' on' : '')+'" data-action="r73MindSound"><span></span></button>') : '')+
  '</div>';
}
ACTIONS.r73MindCalm = function(){ r72Set('mindCalm', !r72P('mindCalm', false)); playTick(); renderView(); };
ACTIONS.r73MindSound = function(){ r72Set('mindSound', !(r72P('mindSound', true)!==false)); playTick(); renderView(); };
soundSettingsHtml = (function(base){ return function(){ const h = base.apply(this, arguments); let x = ''; try{ x = r73InterfaceSetHtml(); }catch(e){} return h.replace('<div class="snd">', '<div class="snd">'+x); }; })(soundSettingsHtml);

// ---------------- what's on the map ----------------
function r73Live(){
  const as = state.focus.activeSession, m = state.modes && state.modes.active;
  if(as && as.onBreak) return 'break';
  if(as) return 'locked';
  if(m && m.sleep) return 'asleep';
  if(m && (m.type==='shooting' || m.type==='training')) return 'shooting';
  if(m && m.type==='break') return 'break';
  if(m && (m.type==='offtime' || m.clockedOut)) return 'off';
  try{ const ph = workPhase(); if(ph==='off' || ph==='after') return 'off'; }catch(e){}
  return 'free';
}
function r73DaysSince(d){ if(!d) return 99; return Math.max(0, Math.round((new Date(todayStr()) - new Date(d))/86400000)); }
function r73MindBuild(){
  const N = [], L = [], td = todayStr();
  const add = function(n){ n.x = n.x || 0; n.y = n.y || 0; N.push(n); return n; };
  const op = add({id:'op', kind:'op', tier:0, r:40, color:'#38BDF8', label:'OP', x:0, y:0});
  const R = 250, sec = {};
  R73M_SECTORS.forEach(function(s){
    const a = (s.clock/12)*Math.PI*2 - Math.PI/2;
    sec[s.id] = add({id:'s:'+s.id, kind:'sector', tier:1, r:24, color:s.color, label:s.label, a:a, x:Math.cos(a)*R, y:Math.sin(a)*R, sector:s});
    L.push({a:op, b:sec[s.id], kind:'spine'});
  });
  // moons fan out from a sector, pointing away from Op
  const fan = function(sid, list, o){
    const S = sec[sid], n = list.length; if(!n) return;
    o = o || {}; const step = Math.min(o.step || 0.36, (o.spread || 2.4)/Math.max(1, n - 1));
    list.forEach(function(m, i){
      const a = S.a + (i - (n - 1)/2)*step, d = (m.dist || o.dist || 92) + (o.stagger && i % 2 ? 26 : 0);
      m.x = S.x + Math.cos(a)*d; m.y = S.y + Math.sin(a)*d; m.parent = S; m.color = m.color || S.color;
      add(m); L.push({a:S, b:m, kind:'moon'});
    });
  };
  // Focus: today's tasks
  const tasks = (typeof lineupOrdered==='function' ? lineupOrdered(state.tasks.items.filter(function(t){ return t.status==='today' && !t.isVideoIdea; })) : []).slice(0, 12);
  fan('focus', tasks.map(function(t){
    const pr = String(t.priority || '').toLowerCase();
    return {id:'t:'+t.id, kind:'task', tier:3, r:pr==='high' || pr==='urgent' ? 9 : pr==='low' ? 6 : 7.5, label:taskName(t), ref:t, late:!!(t.deadline && t.deadline < td), now:ui.currentTaskId===t.id};
  }), {dist:84, stagger:tasks.length > 6, spread:2.6});
  // Business: clients. Size = MRR, distance = days since the last touch, neglected ones go grey and ping.
  const clients = arr(state.business.clients).filter(function(c){ return !/^(lost|churned|archived|paused)$/i.test(c.status || ''); }).slice(0, 14);
  fan('business', clients.map(function(c){
    const mrr = Number(c.mrr) || 0, last = (function(){ try{ return crmLastTouch('client', c); }catch(e){ return null; } })(), days = r73DaysSince(last);
    const neg = days >= 8;
    return {id:'c:'+c.id, kind:'client', tier:2, r:Math.max(10, Math.min(22, 10 + mrr/400)), label:(c.business || c.name || 'Client'), sub:(mrr ? '$'+mrr.toLocaleString()+'/mo · ' : '')+(last ? (days===0 ? 'touched today' : days+'d since a touch') : 'no touch yet'),
      ref:c, days:days, neglected:neg, color:neg ? '#4B5563' : '#F5C451', dist:96 + Math.min(10, days)*8};
  }), {spread:2.8, step:0.55});
  // Social: business and personal content this period
  fan('social', (typeof contentProgress==='function' ? CONTENT_ROLES : []).map(function(r){
    const p = contentProgress(r[0]);
    return {id:'ct:'+r[0], kind:'content', tier:2, r:13, label:r[1]+' content', sub:p.n ? p.done+' of '+p.n+' '+p.label : p.done+' posted '+p.label, frac:p.n ? Math.min(1, p.done/p.n) : null, color:r[2]};
  }), {dist:86, spread:1.2});
  // Calendar: the next seven days
  const evs = []; for(let i = 0; i < 7 && evs.length < 10; i++){
    const d = new Date(); d.setDate(d.getDate() + i); const ds = todayStr(d);
    let info; try{ info = calDayInfo(ds); }catch(e){ info = {events:[], deadlines:[]}; }
    arr(info.events).slice().sort(function(a, b){ return (a.time || '').localeCompare(b.time || ''); }).forEach(function(e){ if(evs.length < 10) evs.push({e:e, ds:ds, i:i, kind:'event'}); });
    arr(info.deadlines).forEach(function(t){ if(evs.length < 10) evs.push({e:{title:t.title, id:t.id}, ds:ds, i:i, kind:'due'}); });
  }
  fan('calendar', evs.map(function(x, j){
    const day = x.i===0 ? 'Today' : x.i===1 ? 'Tomorrow' : new Date(x.ds+'T12:00').toLocaleDateString(undefined, {weekday:'short'});
    return {id:'e:'+(x.e.id || j)+':'+x.ds, kind:'event', tier:3, r:x.i===0 ? 8 : 6.5, label:x.e.title, sub:day+(x.e.time ? ' · '+fmt12Hour(x.e.time) : x.kind==='due' ? ' · due' : ''), due:x.kind==='due', today:x.i===0, color:x.kind==='due' ? '#FF6B6B' : '#60A5FA', dist:80 + x.i*9, ds:x.ds};
  }), {spread:2.6});
  // Personal: the parts of you
  const T = typeof r72TimeFor==='function' ? r72TimeFor(td) : {};
  const wk = (function(){ try{ return arr(state.health && state.health.workouts).filter(function(w){ return w.date >= startOfWeekSundayStr(td); }).length; }catch(e){ return 0; } })();
  const jToday = arr(state.journal && state.journal.entries).some(function(e){ return e.date===td; });
  fan('personal', [
    {id:'p:health', kind:'personal', tier:2, r:13, label:'Health', sub:wk+' workout'+(wk===1 ? '' : 's')+' this week', lit:wk > 0, go:{view:'personal', personalTab:'fitness'}},
    {id:'p:sleep', kind:'personal', tier:2, r:12, label:'Sleep', sub:T.asleep ? fmtDurationLabel(T.asleep)+' last night' : 'not logged', lit:!!T.asleep, go:{view:'personal', personalTab:'fitness'}},
    {id:'p:journal', kind:'personal', tier:2, r:12, label:'Journal', sub:jToday ? 'written today' : 'nothing today', lit:jToday, go:{view:'personal', personalTab:'journal'}},
    {id:'p:money', kind:'personal', tier:2, r:12, label:'Money', sub:'check-ins and finances', go:{view:'personal', personalTab:'finances'}},
    {id:'p:goals', kind:'personal', tier:2, r:12, label:'Goals', sub:'week and month', go:{view:'personal', personalTab:'goals'}}
  ], {dist:90, spread:2.2});
  // XP: your level and today's open quests
  let x = null, Q = []; try{ x = xpSummary(); Q = r70Quests().filter(function(q){ return !q.done; }).slice(0, 6); }catch(e){}
  fan('xp', [{id:'x:level', kind:'xp', tier:2, r:15, label:x ? 'Level '+x.level : 'Level', sub:x ? x.total.toLocaleString()+' XP'+(x.canLevel ? ' · ready to claim' : '') : '', claim:!!(x && x.canLevel)}].concat(Q.map(function(q, i){
    return {id:'q:'+i, kind:'quest', tier:3, r:7, label:q.label, sub:'+'+q.xp.toLocaleString()+' XP', quest:q};
  })), {dist:88, spread:2.2});
  // Inspiration
  fan('inspire', ['Music', 'Make', 'Learn', 'Move', 'Mind', 'People', 'Home', 'Unplugged'].map(function(k){ return {id:'i:'+k, kind:'inspire', tier:3, r:6.5, label:k}; }), {dist:78, spread:2.2});
  // cross links: a task for a client, an event named after a client
  N.forEach(function(n){
    if(n.kind==='task'){ try{ const c = r42ClientOf(n.ref); if(c){ const cn = N.find(function(m){ return m.id==='c:'+c.id; }); if(cn) L.push({a:n, b:cn, kind:'cross'}); } }catch(e){} }
    if(n.kind==='event'){ const cn = N.find(function(m){ return m.kind==='client' && n.label && m.label && n.label.toLowerCase().indexOf(String(m.label).toLowerCase().split(' ')[0]) >= 0; }); if(cn) L.push({a:n, b:cn, kind:'cross'}); }
  });
  N.forEach(function(n, i){ n.ph = (i*1.37) % 6.28; });
  const byId = {}; N.forEach(function(n){ byId[n.id] = n; });
  MIND.nodes = N; MIND.links = L; MIND.byId = byId; MIND.built = Date.now();
  if(MIND.hover && !byId[MIND.hover.id]) MIND.hover = null;
  if(MIND.sel) MIND.sel = byId[MIND.sel.id] || null;
}

// ---------------- the camera ----------------
function r73W2S(x, y){ return [(x - MIND.cam.x)*MIND.cam.k + MIND.W/2, (y - MIND.cam.y)*MIND.cam.k + MIND.H/2]; }
function r73S2W(x, y){ return [(x - MIND.W/2)/MIND.cam.k + MIND.cam.x, (y - MIND.H/2)/MIND.cam.k + MIND.cam.y]; }
function r73FlyTo(x, y, k, ms){
  if(r73Reduce()) ms = 1;
  MIND.fly = {from:{x:MIND.cam.x, y:MIND.cam.y, k:MIND.cam.k}, to:{x:x, y:y, k:Math.max(0.35, Math.min(3, k))}, t0:performance.now(), ms:ms || 450};
}
function r73FlyNode(n, k){ if(!n) return; r73FlyTo(n.kind==='sector' ? n.x*0.62 : n.x, n.kind==='sector' ? n.y*0.62 : n.y, k || (n.kind==='sector' ? 1.35 : n.kind==='op' ? 0.9 : 1.8), 450); }
function r73Fit(){ const k = Math.min(MIND.W, MIND.H - 160)/((250 + 200)*2); r73FlyTo(0, 0, Math.max(0.4, Math.min(1.1, k)), 450); }

// ---------------- drawing ----------------
function r73GlowSprite(color){
  if(MIND.glow[color]) return MIND.glow[color];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, r73Hex(color, 0.9)); g.addColorStop(0.35, r73Hex(color, 0.25)); g.addColorStop(1, r73Hex(color, 0));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); MIND.glow[color] = c; return c;
}
function r73Shape(x, n, cx, cy, r){
  x.beginPath();
  if(n.kind==='client'){ x.moveTo(cx, cy - r); x.lineTo(cx + r*0.85, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r*0.85, cy); x.closePath(); }
  else if(n.kind==='xp' || n.kind==='quest'){ for(let i = 0; i < 6; i++){ const a = i*Math.PI/3 - Math.PI/2; if(i) x.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); else x.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); } x.closePath(); }
  else if(n.kind==='event'){ const s = r*0.85; x.rect(cx - s, cy - s, s*2, s*2); }
  else if(n.kind==='inspire'){ for(let i = 0; i < 8; i++){ const a = i*Math.PI/4 - Math.PI/2, rr = i % 2 ? r*0.45 : r; if(i) x.lineTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); else x.moveTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); } x.closePath(); }
  else x.arc(cx, cy, r, 0, Math.PI*2);
}
function r73Label(x, text, px, py, size, color, alpha, bold){
  if(alpha < 0.03 || !text) return;
  text = String(text); if(text.length > 26) text = text.slice(0, 25)+'…';
  x.font = (bold ? '600 ' : '500 ')+size+'px "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';
  const w = x.measureText(text).width, h = size + 6;
  x.globalAlpha = alpha*0.82; x.fillStyle = 'rgba(7,8,12,0.78)';
  const rx = px - w/2 - 6, ry = py - 2; x.beginPath(); if(x.roundRect) x.roundRect(rx, ry, w + 12, h, h/2); else x.rect(rx, ry, w + 12, h); x.fill();
  x.globalAlpha = alpha; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'top'; x.fillText(text, px, py + 1);
  x.globalAlpha = 1;
}
function r73Arc(x, cx, cy, r, frac, color, w, alpha){
  x.globalAlpha = alpha == null ? 1 : alpha; x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.stroke();
  if(frac > 0){ x.strokeStyle = color; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.min(1, frac)); x.stroke(); x.lineCap = 'butt'; }
  x.globalAlpha = 1;
}
function r73Draw(now){
  const c = MIND.canvas; if(!c) return;
  const x = MIND.ctx, dpr = MIND.dpr, W = MIND.W, H = MIND.H, t = (now - MIND.t0)/1000, calm = r73Reduce();
  const live = r73Live(), L = R73M_STATE[live];
  // camera
  if(MIND.fly){ const f = MIND.fly, p = Math.min(1, (now - f.t0)/f.ms), e = 1 - Math.pow(1 - p, 4);
    MIND.cam.x = f.from.x + (f.to.x - f.from.x)*e; MIND.cam.y = f.from.y + (f.to.y - f.from.y)*e; MIND.cam.k = f.from.k + (f.to.k - f.from.k)*e; if(p >= 1) MIND.fly = null; }
  const k = MIND.cam.k, boot = Math.min(1, (now - MIND.boot)/650), bootE = 1 - Math.pow(1 - boot, 3);
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the void, a little lighter in the middle, tinted by what you're doing
  x.fillStyle = '#07080C'; x.fillRect(0, 0, W, H);
  const o = r73W2S(0, 0);
  const vg = x.createRadialGradient(o[0], o[1], 0, o[0], o[1], Math.max(W, H)*0.75);
  vg.addColorStop(0, r73Hex(L.c, live==='asleep' ? 0.05 : 0.09)); vg.addColorStop(1, 'rgba(7,8,12,0)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  // stars, with a little parallax
  if(!MIND.stars) MIND.stars = Array.from({length:240}, function(){ return {x:Math.random()*2 - 0.5, y:Math.random()*2 - 0.5, s:Math.random(), p:Math.random()*6.28}; });
  MIND.stars.forEach(function(s){
    const px = ((s.x*W - MIND.cam.x*0.08*(0.3 + s.s)) % (W*1.5) + W*1.5) % (W*1.5) - W*0.25, py = ((s.y*H - MIND.cam.y*0.08*(0.3 + s.s)) % (H*1.5) + H*1.5) % (H*1.5) - H*0.25;
    const a = (0.12 + s.s*0.4)*(calm ? 1 : 0.7 + 0.3*Math.sin(t*0.8 + s.p)); x.fillStyle = 'rgba(200,215,255,'+a.toFixed(3)+')'; const z = 0.6 + s.s*1.3; x.fillRect(px, py, z, z);
  });
  // the coordinate rings
  x.strokeStyle = 'rgba(148,163,184,0.07)'; x.lineWidth = 1;
  [130, 250, 400, 560].forEach(function(r){ x.beginPath(); x.arc(o[0], o[1], r*k, 0, Math.PI*2); x.stroke(); });
  for(let i = 0; i < 12; i++){ const a = i*Math.PI/6, r1 = 380*k, r2 = 392*k; x.beginPath(); x.moveTo(o[0] + Math.cos(a)*r1, o[1] + Math.sin(a)*r1); x.lineTo(o[0] + Math.cos(a)*r2, o[1] + Math.sin(a)*r2); x.stroke(); }
  // focus: what lights up and what steps back
  const hov = MIND.hover || MIND.sel, near = {};
  if(hov){ near[hov.id] = 1; MIND.links.forEach(function(l){ if(l.a===hov) near[l.b.id] = 1; if(l.b===hov) near[l.a.id] = 1; }); }
  const dim = function(n){
    let a = 1;
    if(hov && !near[n.id]) a = 0.15;
    if(MIND.palLit && !MIND.palLit[n.id] && n.kind!=='op') a = Math.min(a, 0.08);
    if(live==='locked'){ const sid = n.kind==='sector' ? n.sector.id : n.parent && n.parent.sector ? n.parent.sector.id : null; if(sid && sid!=='focus' && sid!=='business' && !(hov && near[n.id])) a *= 0.28; }
    if(live==='asleep' && n.kind!=='op') a *= 0.25;
    return a;
  };
  const pos = function(n){
    const br = calm || n.tier===0 ? 0 : 2.2 + (n.tier || 0)*0.6;
    const bx = Math.sin(t*0.7 + n.ph)*br, by = Math.cos(t*0.6 + n.ph)*br;
    const px = n.x*bootE + bx, py = n.y*bootE + by; return r73W2S(px, py);
  };
  MIND.nodes.forEach(function(n){ n.sp = pos(n); });
  // links
  MIND.links.forEach(function(l){
    const a = l.a.sp, b = l.b.sp, act = (hov && (l.a===hov || l.b===hov));
    const al = Math.min(dim(l.a), dim(l.b))*(l.kind==='cross' ? 0.32 : l.kind==='spine' ? 0.2 : 0.22)*(act ? 3 : 1);
    if(al < 0.02) return;
    x.globalAlpha = Math.min(0.9, al); x.strokeStyle = act ? r73Hex(l.b.color || '#FFFFFF', 1) : l.kind==='cross' ? '#94A3B8' : r73Hex(l.b.color || '#94A3B8', 1); x.lineWidth = act ? 1.6 : 1;
    if(l.kind==='cross') x.setLineDash([3, 5]); else x.setLineDash([]);
    if(l.b.neglected) x.setLineDash([4, 4]);
    const mx = (a[0] + b[0])/2, my = (a[1] + b[1])/2, dx = b[0] - a[0], dy = b[1] - a[1];
    x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx - dy*0.12, my + dx*0.12, b[0], b[1]); x.stroke();
  });
  x.setLineDash([]); x.globalAlpha = 1;
  // the locked-in beam: Op to what you're working on (or to Focus)
  if(live==='locked' || live==='shooting'){
    const tgt = MIND.nodes.find(function(n){ return n.now; }) || MIND.byId['s:focus'];
    if(tgt){ const a = MIND.byId.op.sp, b = tgt.sp; const g = x.createLinearGradient(a[0], a[1], b[0], b[1]); g.addColorStop(0, r73Hex(L.c, 0.9)); g.addColorStop(1, r73Hex(L.c, 0.25));
      x.strokeStyle = g; x.lineWidth = 2.4; x.shadowColor = L.c; x.shadowBlur = 14; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.shadowBlur = 0;
      const p = (t*0.6) % 1; x.fillStyle = '#fff'; x.beginPath(); x.arc(a[0] + (b[0] - a[0])*p, a[1] + (b[1] - a[1])*p, 2.2, 0, Math.PI*2); x.fill(); }
  }
  // glows (one sprite per color, added light)
  x.globalCompositeOperation = 'lighter';
  MIND.nodes.forEach(function(n){
    if(n.kind==='op') return;
    const s = n.sp, r = n.r*k, lit = n.kind==='personal' ? (n.lit ? 0.5 : 0.18) : n.neglected ? 0.1 : n.kind==='sector' ? 0.42 : 0.32;
    const a = dim(n)*(MIND.sel===n || MIND.hover===n ? 0.85 : lit)*bootE; if(a < 0.02) return;
    const sz = r*(n.kind==='sector' ? 5 : 3.6); x.globalAlpha = a; x.drawImage(r73GlowSprite(n.color), s[0] - sz/2, s[1] - sz/2, sz, sz);
  });
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  // nodes
  MIND.nodes.forEach(function(n){
    if(n.kind==='op') return;
    const s = n.sp, r = Math.max(2.5, n.r*k), a = dim(n)*bootE; if(a < 0.02) return;
    x.globalAlpha = a; r73Shape(x, n, s[0], s[1], r); x.fillStyle = '#0F1420'; x.fill();
    x.lineWidth = n.kind==='sector' ? 1.8 : (MIND.sel===n ? 2.2 : 1.4); x.strokeStyle = n.color; x.stroke();
    if(n.kind==='sector'){ x.globalAlpha = a*0.5; x.beginPath(); x.arc(s[0], s[1], r + 6, 0, Math.PI*2); x.stroke(); x.globalAlpha = a; x.fillStyle = n.color; x.beginPath(); x.arc(s[0], s[1], r*0.28, 0, Math.PI*2); x.fill(); }
    if(n.kind==='task'){ if(n.now){ x.fillStyle = n.color; x.beginPath(); x.arc(s[0], s[1], r*0.45, 0, Math.PI*2); x.fill(); } if(n.late){ x.strokeStyle = '#FF6B6B'; x.beginPath(); x.arc(s[0], s[1], r + 3, 0, Math.PI*2); x.stroke(); } }
    if(n.kind==='content' && n.frac!=null) r73Arc(x, s[0], s[1], r + 4, n.frac, n.color, 2, a);
    if(n.kind==='personal' && n.lit){ x.fillStyle = n.color; x.beginPath(); x.arc(s[0], s[1], r*0.35, 0, Math.PI*2); x.fill(); }
    if(n.kind==='xp' && n.claim){ x.strokeStyle = '#F5C451'; x.globalAlpha = a*(0.5 + 0.5*Math.sin(t*3)); x.beginPath(); x.arc(s[0], s[1], r + 7, 0, Math.PI*2); x.stroke(); }
    if(n.kind==='event' && n.today){ x.fillStyle = n.color; x.fillRect(s[0] - r*0.3, s[1] - r*0.3, r*0.6, r*0.6); }
    // neglected: a slow amber ping
    if(n.neglected && !calm){ const p = ((t + n.ph)/4.5) % 1; x.globalAlpha = a*(1 - p)*0.7; x.strokeStyle = '#F59E0B'; x.lineWidth = 1.2; x.beginPath(); x.arc(s[0], s[1], r + 4 + p*18*k, 0, Math.PI*2); x.stroke(); }
    x.globalAlpha = 1;
  });
  // Op: the orb, his two rings (today's deep work inside, your level outside), his state
  {
    const s = MIND.byId.op.sp, br = calm ? 1 : 1 + Math.sin(t*1.13)*0.035, r = 40*k*br*Math.max(0.2, bootE);
    const opSt = typeof AI!=='undefined' ? (AI.listening ? 'listen' : AI.busy ? 'think' : (typeof OV!=='undefined' && OV.idx >= 0) ? 'speak' : '') : '';
    const oc = opSt==='listen' ? '#38BDF8' : opSt==='think' ? '#C084FC' : (live==='locked' || live==='shooting' || live==='break') ? L.c : live==='asleep' ? '#6366F1' : '#38BDF8';
    x.globalCompositeOperation = 'lighter'; const gs = r*5.5; x.globalAlpha = 0.55; x.drawImage(r73GlowSprite(oc), s[0] - gs/2, s[1] - gs/2, gs, gs); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    const g = x.createRadialGradient(s[0] - r*0.3, s[1] - r*0.35, r*0.1, s[0], s[1], r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, r73Hex(oc, 0.95)); g.addColorStop(1, r73Hex(oc, 0.15));
    x.fillStyle = g; x.beginPath(); x.arc(s[0], s[1], r, 0, Math.PI*2); x.fill();
    // ribbons inside the orb
    x.save(); x.beginPath(); x.arc(s[0], s[1], r, 0, Math.PI*2); x.clip();
    for(let i = 0; i < 3; i++){ x.strokeStyle = 'rgba(255,255,255,'+(0.18 + i*0.06)+')'; x.lineWidth = 1.2; x.beginPath();
      for(let j = 0; j <= 40; j++){ const u = j/40, ax = s[0] - r + u*2*r, amp = r*(opSt==='speak' ? 0.42 : 0.22)*Math.sin(u*Math.PI); const ay = s[1] + Math.sin(u*Math.PI*2 + t*(1.2 + i*0.5)*(calm ? 0.3 : 1) + i*2)*amp; if(j) x.lineTo(ax, ay); else x.moveTo(ax, ay); }
      x.stroke(); }
    x.restore();
    // the rings
    const dw = (typeof deepWorkMinutesFor==='function' ? deepWorkMinutesFor(todayStr()) || 0 : 0), tg = Number(state.standards && state.standards.deepWorkTargetMinutes) || 180;
    let xs = null; try{ xs = xpSummary(); }catch(e){}
    r73Arc(x, s[0], s[1], r + 9*k + 4, dw/tg, '#FF6B2C', 3, bootE);
    r73Arc(x, s[0], s[1], r + 18*k + 8, xs ? (xs.canLevel ? 1 : xs.levelPct || 0) : 0, xs && xs.canLevel ? '#F5C451' : '#FDE047', 2, bootE);
    if(opSt==='think' && !calm){ x.setLineDash([2, 6]); x.strokeStyle = 'rgba(192,132,252,0.7)'; x.lineWidth = 1.2; x.beginPath(); x.arc(s[0], s[1], r + 28*k + 10, t*2, t*2 + Math.PI*1.4); x.stroke(); x.setLineDash([]); }
    // the state, big, under Op
    const as = state.focus.activeSession, m = state.modes.active;
    const since = as ? (as.onBreak ? (arr(as.breaks).slice(-1)[0] || {}).start || as.startedAt : as.startedAt) : m && m.startedAt ? m.startedAt : null;
    const lbl = L.label, tm = since ? (function(){ const sec = Math.max(0, Math.floor((Date.now() - since)/1000)); return String(Math.floor(sec/3600)).padStart(2, '0')+':'+String(Math.floor(sec/60) % 60).padStart(2, '0')+':'+String(sec % 60).padStart(2, '0'); })() : '';
    x.textAlign = 'center'; x.textBaseline = 'top';
    const yy = s[1] + r + 30*k + 18;
    x.font = '600 11px "JetBrains Mono", ui-monospace, Menlo, monospace'; x.fillStyle = r73Hex(L.c, 0.95); x.fillText(lbl.split('').join(' '), s[0], yy);
    if(tm){ x.font = '700 '+Math.round(Math.max(22, 40*Math.min(1.2, k)))+'px "Space Grotesk", "SF Pro Display", -apple-system, sans-serif'; x.fillStyle = '#F8FAFC'; x.fillText(tm, s[0], yy + 16); }
  }
  // labels (only what fits the zoom, and never on top of each other: the important ones win)
  const placed = [];
  const order = MIND.nodes.filter(function(n){ return n.kind!=='op'; }).sort(function(a, b){
    const pa = (MIND.hover===a || MIND.sel===a ? -10 : 0) + (hov && near[a.id] ? -5 : 0) + a.tier, pb = (MIND.hover===b || MIND.sel===b ? -10 : 0) + (hov && near[b.id] ? -5 : 0) + b.tier; return pa - pb; });
  x.font = '500 10px "JetBrains Mono", ui-monospace, Menlo, monospace';
  order.forEach(function(n){
    const s = n.sp, a0 = dim(n)*bootE, isH = MIND.hover===n || MIND.sel===n;
    let show = n.tier===1 || isH || (n.tier===2 && k > 0.62) || (n.tier===3 && k > 1.15) || (hov && near[n.id] && k > 0.5);
    const ly = s[1] + Math.max(3, n.r*k) + (n.kind==='sector' ? 12 : 6);
    if(show){
      const txt = String(n.label || '').slice(0, 26), w = txt.length*6.1 + 14, box = [s[0] - w/2, ly - 2, s[0] + w/2, ly + 16 + (isH && n.sub ? 18 : 0)];
      if(!isH && placed.some(function(p){ return box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]; })) show = false;
      else placed.push(box);
    }
    n.la = (n.la || 0) + ((show ? 1 : 0) - (n.la || 0))*0.3;
    if(n.la < 0.05) return;
    r73Label(x, n.label, s[0], ly, n.tier===1 ? 11 : 10, n.tier===1 ? n.color : '#E2E8F0', a0*n.la, n.tier===1);
    if(isH && n.sub) r73Label(x, n.sub, s[0], ly + 18, 10, '#94A3B8', a0*n.la);
  });
  // sparks: a done thing flies into Op
  MIND.sparks = MIND.sparks.filter(function(sp){
    const p = Math.min(1, (now - sp.t0)/420), e = 1 - Math.pow(1 - p, 3), o2 = MIND.byId.op.sp;
    const a = sp.from || o2, px = a[0] + (o2[0] - a[0])*e, py = a[1] + (o2[1] - a[1])*e;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1 - p*0.3; const gz = 26; x.drawImage(r73GlowSprite(sp.c), px - gz/2, py - gz/2, gz, gz);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 2.5, 0, Math.PI*2); x.fill(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if(p >= 1){ MIND.pings.push({t0:now, c:sp.c}); return false; } return true;
  });
  MIND.pings = MIND.pings.filter(function(pg){ const p = (now - pg.t0)/700; if(p >= 1) return false; const s = MIND.byId.op.sp; x.globalAlpha = 1 - p; x.strokeStyle = pg.c; x.lineWidth = 2; x.beginPath(); x.arc(s[0], s[1], (46 + p*60)*k, 0, Math.PI*2); x.stroke(); x.globalAlpha = 1; return true; });
}
function r73Loop(now){
  MIND.raf = requestAnimationFrame(r73Loop);
  if(document.hidden || MIND.dive) return;
  const live = r73Live(), fps = live==='asleep' ? 6 : document.body.classList.contains('op-idle') ? 8 : (document.hasFocus && !document.hasFocus()) ? 24 : 60;
  if(now - MIND.last < 1000/fps - 2) return; MIND.last = now;
  if(Date.now() - MIND.built > 5000) r73MindBuild();
  try{ r73Draw(now); }catch(e){ if(!MIND.err){ MIND.err = 1; console.error('mind draw', e); } }
  r73HudTick();
}

// ---------------- the HUD (plain HTML over the map) ----------------
function r73HudHtml(){
  return '<div class="r73h-top">'+
      '<div class="r73h-l" id="r73hL"></div>'+
      '<div class="r73h-river" id="r73hRiver"></div>'+
      '<div class="r73h-r" id="r73hR"></div>'+
    '</div>'+
    '<div class="r73h-pill" id="r73hPill"></div>'+
    '<div class="r73-insp" id="r73Insp"></div>'+
    '<div class="r73-dock">'+
      '<button data-action="r73mLock" id="r73mLock"></button>'+
      '<button data-action="r73mAddTask" title="Add a task">+ Task</button>'+
      '<button data-action="r73mPal" title="Search and do anything (⌘K)">&#8984;K</button>'+
      '<button data-action="r73mHome" title="Back to the whole map (0)">&#9678;</button>'+
      '<button data-action="r74Cv" title="Command View (⌘⇧C)">&#128250;</button>'+
      '<button data-action="r73mClassic" title="The classic view">Classic</button>'+
    '</div>'+
    '<div class="r73-keys">click to pick · double-click to open · scroll to zoom · ⌘K</div>';
}
function r73River(){
  // the day as one ribbon: from getting up to bed, coloured by what you were doing
  const td = todayStr(), now = Date.now();
  let up = null; try{ const T = r72TimeFor(td); up = state.focus.r70Gm && state.focus.r70Gm.date===td ? state.focus.r70Gm.up : null; if(!up){ const ls = lastNightSleep(); up = ls && ls.to; } }catch(e){}
  const start = up || new Date(td+'T07:00').getTime(), end = Math.max(start + 3600000, new Date(td+'T23:00').getTime());
  const span = end - start, seg = [];
  const put = function(a, b, c){ a = Math.max(a, start); b = Math.min(b, now, end); if(b > a) seg.push({l:(a - start)/span*100, w:(b - a)/span*100, c:c}); };
  arr(state.focus.sessions).forEach(function(s){ if(s.date===td) put(s.startedAt, s.endedAt, '#FF6B2C'); });
  const as = state.focus.activeSession; if(as) put(as.startedAt, now, as.onBreak ? '#34D399' : '#FF6B2C');
  arr(state.modes.history).forEach(function(h){ if(h.date===td){ const c = h.type==='shooting' || h.type==='training' ? '#FF3B5C' : h.type==='break' ? '#34D399' : h.type==='offtime' ? '#64748B' : null; if(c) put(h.startedAt, h.endedAt, c); } });
  const m = state.modes.active; if(m && !m.sleep){ const c = m.type==='shooting' || m.type==='training' ? '#FF3B5C' : m.type==='break' ? '#34D399' : '#64748B'; put(m.startedAt, now, c); }
  const nowP = Math.min(100, Math.max(0, (now - start)/span*100));
  const evs = arr(state.calendar.events).filter(function(e){ return e.date===td && e.time; }).map(function(e){ const p = (new Date(td+'T'+e.time).getTime() - start)/span*100; return p >= 0 && p <= 100 ? '<i class="r73r-ev" style="left:'+p.toFixed(2)+'%" title="'+escapeHtml(fmt12Hour(e.time)+' '+e.title)+'"></i>' : ''; }).join('');
  return '<div class="r73r-bar">'+seg.map(function(s){ return '<b style="left:'+s.l.toFixed(2)+'%;width:'+Math.max(0.4, s.w).toFixed(2)+'%;background:'+s.c+'"></b>'; }).join('')+evs+'<i class="r73r-now" style="left:'+nowP.toFixed(2)+'%"></i></div>'+
    '<div class="r73r-k"><span>'+fmtTimeShort(start)+'</span><span>'+fmtTimeShort(end)+'</span></div>';
}
function r73HudTick(){
  if(Date.now() - (MIND.hudAt || 0) < 1000) return; MIND.hudAt = Date.now();
  const live = r73Live(), L = R73M_STATE[live];
  let xs = null; try{ xs = xpSummary(); }catch(e){}
  const r = xs ? (RANKS[xs.rank] || RANKS[0]) : null;
  let streak = 0; try{ streak = computeStreak(); }catch(e){}
  const el = function(id){ return document.getElementById(id); };
  if(el('r73hL')) el('r73hL').innerHTML = r ? '<b>LVL '+xs.level+' <i style="color:'+r.color+'">'+escapeHtml(r.name)+'</i></b><span>'+xs.total.toLocaleString()+' XP · '+streak+'-day streak</span>' : '';
  const now = typeof wxNow==='function' ? wxNow() : null;
  if(el('r73hR')) el('r73hR').innerHTML = '<b>'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</b><span>'+new Date().toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})+(now ? ' · '+now.temp+'°' : '')+'</span>';
  if(el('r73hRiver')) el('r73hRiver').innerHTML = r73River();
  const lk = el('r73mLock'); if(lk){ const as = state.focus.activeSession; lk.innerHTML = as ? '&#9632; Lock out' : '&#128274; Lock in'; lk.className = as ? 'is-on' : ''; lk.style.setProperty('--c', L.c); }
  // the sticky reminders (log your meal…) stay up top
  const pill = el('r73hPill'); if(pill){ let n = []; try{ n = r70Nudges(); }catch(e){} const D = n.length && typeof R70_NUDGE!=='undefined' ? R70_NUDGE[n[0].kind] : null; pill.innerHTML = D ? '<button data-action="'+escapeHtml(D.act || 'r73mNudge')+'">'+(D.icon || '')+' '+escapeHtml(D.label)+(n.length > 1 ? ' <em>+'+(n.length - 1)+'</em>' : '')+'</button>' : ''; }
  if(MIND.sel) r73Inspect(MIND.sel, true);
}

// ---------------- the inspector (one click) ----------------
function r73Inspect(n, quiet){
  const box = document.getElementById('r73Insp'); if(!box) return;
  if(!n){ box.classList.remove('is-in'); MIND.sel = null; return; }
  MIND.sel = n;
  const b = function(act, label, id, cls){ return '<button class="'+(cls || '')+'" data-action="'+act+'"'+(id ? ' data-id="'+escapeHtml(id)+'"' : '')+'>'+label+'</button>'; };
  let h = '', acts = '';
  if(n.kind==='op'){ h = '<small>OP</small><b>Your operator</b><p>'+escapeHtml(typeof r72DayReadout==='function' ? r72DayReadout().replace(/\n/g, ' ') : '')+'</p>'; acts = b('opTalk', '&#127897;&#65039; Talk')+b('r73mOpType', 'Type to Op')+b('r73mRead', 'Read me the day'); }
  else if(n.kind==='sector'){ const s = r73SectorSum(n.sector.id); h = '<small>SECTOR · '+n.sector.key+'</small><b style="color:'+n.color+'">'+escapeHtml(n.sector.label.charAt(0)+n.sector.label.slice(1).toLowerCase())+'</b>'+s; acts = b('r73mDive', 'Open '+n.sector.label.toLowerCase()+' &#8594;', n.id, 'is-pri'); }
  else if(n.kind==='task'){ const t = n.ref; h = '<small>TASK'+(n.now ? ' · NOW' : '')+'</small><b>'+escapeHtml(taskName(t))+'</b><p>'+[(function(){ try{ const c = r42ClientOf(t); return c ? escapeHtml(c.business || c.name) : ''; }catch(e){ return ''; } })(), t.deadline ? (n.late ? '<em>overdue · '+fmtDateShort(t.deadline)+'</em>' : 'due '+fmtDateShort(t.deadline)) : '', t.priority ? escapeHtml(t.priority)+' priority' : ''].filter(Boolean).join(' · ')+'</p>';
    acts = b('r73mDone', '&#10003; Done', t.id, 'is-pri')+(n.now ? '' : b('nnStartNext', '&#9654; Start', t.id))+b('nnLockInNext', '&#128274; Lock in on it', t.id)+b('openTaskEditModal', 'Open', t.id); }
  else if(n.kind==='client'){ const c = n.ref; h = '<small>CLIENT</small><b>'+escapeHtml(n.label)+'</b><p>'+escapeHtml(n.sub)+'</p>'+(n.neglected ? '<p class="r73i-warn">Drifting: '+n.days+' days without a touch.</p>' : '');
    acts = b('r73mTouch', '&#9989; Log a touch', c.id, 'is-pri')+b('r73mDive', 'Open Business', 's:business'); }
  else if(n.kind==='event'){ h = '<small>'+(n.due ? 'DEADLINE' : 'CALENDAR')+'</small><b>'+escapeHtml(n.label)+'</b><p>'+escapeHtml(n.sub || '')+'</p>'; acts = b('r73mDive', 'Open the calendar', 's:calendar', 'is-pri'); }
  else if(n.kind==='personal'){ h = '<small>PERSONAL</small><b>'+escapeHtml(n.label)+'</b><p>'+escapeHtml(n.sub || '')+'</p>'; acts = b('r73mGo', 'Open '+escapeHtml(n.label.toLowerCase())+' &#8594;', n.id, 'is-pri'); }
  else if(n.kind==='content'){ h = '<small>CONTENT</small><b>'+escapeHtml(n.label)+'</b><p>'+escapeHtml(n.sub || '')+'</p>'; acts = b('r73mGoContent', 'Open content', n.id, 'is-pri'); }
  else if(n.kind==='xp'){ h = '<small>XP</small><b>'+escapeHtml(n.label)+'</b><p>'+escapeHtml(n.sub || '')+'</p>'; acts = (n.claim ? b('r70Claim', '&#128293; Claim the level', null, 'is-pri') : '')+b('r73mDive', 'Open XP', 's:xp'); }
  else if(n.kind==='quest'){ const q = n.quest; h = '<small>QUEST</small><b>'+escapeHtml(q.label)+'</b><p>'+escapeHtml(n.sub)+'</p>'; acts = b(q.act, 'Do it', null, 'is-pri'); }
  else if(n.kind==='inspire'){ h = '<small>INSPIRATION</small><b>'+escapeHtml(n.label)+'</b><p>Something off the screen.</p>'; acts = b('openInspire', 'Open Inspiration', null, 'is-pri'); }
  const html = '<button class="r73i-x" data-action="r73mUnsel" aria-label="Close">&#10005;</button>'+h+'<div class="r73i-acts">'+acts+'</div>';
  if(quiet && box.dataset.k===n.id+'|'+html.length) return;
  box.dataset.k = n.id+'|'+html.length; box.innerHTML = html; box.style.setProperty('--c', n.color || '#38BDF8'); box.classList.add('is-in');
}
function r73SectorSum(id){
  const row = function(k, v){ return '<div class="r73i-r"><span>'+k+'</span><b>'+v+'</b></div>'; };
  const td = todayStr();
  try{
    if(id==='focus'){ const dw = deepWorkMinutesFor(td) || 0, tg = Number(state.standards.deepWorkTargetMinutes) || 180; return row('Deep work', fmtDurationLabel(dw)+' / '+fmtDurationLabel(tg))+row('Today’s tasks', state.tasks.items.filter(function(t){ return t.status==='today'; }).length)+row('Done today', state.tasks.items.filter(function(t){ return t.status==='done' && t.completedAt===td; }).length); }
    if(id==='business'){ const C = arr(state.business.clients).filter(function(c){ return !/^(lost|churned|archived)$/i.test(c.status || ''); }); const mrr = C.reduce(function(a, c){ return a + (Number(c.mrr) || 0); }, 0); const neg = MIND.nodes.filter(function(n){ return n.neglected; }).length; return row('Clients', C.length)+row('MRR', '$'+mrr.toLocaleString())+row('Drifting', neg); }
    if(id==='calendar'){ const n = arr(state.calendar.events).filter(function(e){ return e.date===td; }).length; return row('Today', n+' thing'+(n===1 ? '' : 's'))+row('Next 7 days', MIND.nodes.filter(function(x){ return x.kind==='event'; }).length); }
    if(id==='xp'){ const x = xpSummary(); return row('Level', x.level)+row('XP', x.total.toLocaleString())+row('Quests open', MIND.nodes.filter(function(n){ return n.kind==='quest'; }).length); }
    if(id==='personal'){ const T = r72TimeFor(td); return row('Slept', T.asleep ? fmtDurationLabel(T.asleep) : '–')+row('Awake', fmtDurationLabel(T.awake || 0)); }
    if(id==='social'){ return CONTENT_ROLES.map(function(r){ const p = contentProgress(r[0]); return row(r[1], p.done+(p.n ? ' / '+p.n : '')+' '+p.label); }).join(''); }
  }catch(e){}
  return '';
}

// ---------------- diving in: the classic page, in a glass window over the map ----------------
function r73Dive(go){
  if(!go) return;
  if(go.inspire){ try{ openInspire(); }catch(e){} return; }
  Object.keys(go).forEach(function(k){ ui[k] = go[k]; });
  MIND.dive = true; document.body.classList.add('mind-dive');
  try{ renderView(); }catch(e){}
  r73Sound('dive');
}
function r73Surface(){
  if(!MIND.dive) return false;
  MIND.dive = false; document.body.classList.remove('mind-dive'); MIND.built = 0; r73Sound('back');
  return true;
}
ACTIONS.r73mSurface = function(){ r73Surface(); };
ACTIONS.r73mDive = function(el, e, id){ const n = MIND.byId[id]; if(n && n.sector) r73Dive(n.sector.dive); };
ACTIONS.r73mGo = function(el, e, id){ const n = MIND.byId[id]; if(n && n.go) r73Dive(n.go); };
ACTIONS.r73mGoContent = function(){ r73Dive({view:'focus', focusTab:'tasks', focusTasksSubTab:'videoIdeas'}); };
ACTIONS.r73mUnsel = function(){ r73Inspect(null); };
ACTIONS.r73mHome = function(){ r73Inspect(null); r73Fit(); };
ACTIONS.r73mClassic = function(){ r73MindSwitch('classic'); };
ACTIONS.r73mDone = function(el, e, id){ const n = MIND.byId['t:'+id]; try{ completeTask(id); }catch(err){} r73Spark(n, '#FF6B2C'); r73Sound('done'); setTimeout(function(){ MIND.built = 0; r73Inspect(null); }, 450); };
ACTIONS.r73mTouch = function(el, e, id){ const n = MIND.byId['c:'+id]; try{ logTouch('client', id); }catch(err){} r73Spark(n, '#F5C451'); r73Sound('done'); MIND.built = 0; showToast('Touch logged.', {icon:'&#9989;'}); };
ACTIONS.r73mRead = function(){ try{ aiAsk('Read me the day'); }catch(e){} };
ACTIONS.r73mOpType = function(){ try{ const b = opBubShow(); b.classList.add('is-in'); const i = document.getElementById('opBubInput'); if(i) i.focus(); }catch(e){} };
ACTIONS.r73mLock = function(){
  if(state.focus.activeSession){ try{ r70LockOutNow(); }catch(e){} r73Sound('back'); }
  else { try{ opRunTool('lock_in', {}); ui.view = ui.view; }catch(e){} r73Sound('lock'); r73Spark(MIND.byId['s:focus'], '#FF6B2C'); }
  MIND.built = 0; MIND.hudAt = 0;
};
ACTIONS.r73mAddTask = function(){ try{ openAddTaskModal(); MIND.built = 0; return; }catch(e){} r73Pal('add '); };
ACTIONS.r73mNudge = function(){ r73Dive({view:'personal', personalTab:'fitness'}); };
ACTIONS.r73mPal = function(){ r73Pal(''); };
// done things fly into Op
function r73Spark(n, c){ if(!n || !n.sp) return; MIND.sparks.push({from:[n.sp[0], n.sp[1]], t0:performance.now(), c:c || n.color || '#fff'}); }
completeTask = (function(base){ return function(id){ const r = base.apply(this, arguments); try{ if(MIND.booted && !MIND.dive){ const n = MIND.byId['t:'+id]; if(n) r73Spark(n, '#FF6B2C'); } }catch(e){} return r; }; })(completeTask);

// ---------------- the command palette (⌘K) ----------------
function r73PalItems(q){
  q = String(q || '').trim().toLowerCase();
  const acts = [
    ['Lock in', function(){ ACTIONS.r73mLock(); }, !state.focus.activeSession], ['Lock out', function(){ ACTIONS.r73mLock(); }, !!state.focus.activeSession],
    ['Take a break', function(){ try{ opRunTool('take_break', {minutes:15}); }catch(e){} }, !!state.focus.activeSession], ['Start shooting', function(){ ACTIONS.r72Shoot(); }, true],
    ['Read me the day', function(){ ACTIONS.r73mRead(); }, true], ['Talk to Op', function(){ try{ ACTIONS.opTalk(); }catch(e){} }, true],
    ['Command View', function(){ ACTIONS.r74Cv(); }, true], ['Settings', function(){ r73Dive({view:'settings'}); }, true], ['Today (classic page)', function(){ r73Dive({view:'today'}); }, true],
    ['Log time (shooting, a break…)', function(){ ACTIONS.r72LogOpen(); }, true], ['Classic view (restart)', function(){ r73MindSwitch('classic'); }, true]
  ].filter(function(a){ return a[2]; }).map(function(a){ return {label:a[0], kind:'Do', run:a[1]}; });
  if(/^add\s+\S/.test(q)){ const title = q.replace(/^add\s+/, ''); return [{label:'Add task “'+title+'”', kind:'Do', run:function(){ try{ opRunTool('add_task', {title:title.charAt(0).toUpperCase()+title.slice(1)}); MIND.built = 0; showToast('Added.', {icon:'&#9989;'}); }catch(e){} }}]; }
  const nodes = MIND.nodes.filter(function(n){ return n.kind!=='op'; }).map(function(n){ return {label:n.kind==='sector' ? n.sector.label.charAt(0)+n.sector.label.slice(1).toLowerCase() : n.label, kind:n.kind==='sector' ? 'Sector' : n.kind.charAt(0).toUpperCase()+n.kind.slice(1), node:n}; });
  const all = acts.concat(nodes);
  if(!q) return all.slice(0, 12);
  return all.filter(function(i){ return String(i.label).toLowerCase().indexOf(q) >= 0; }).slice(0, 14);
}
function r73Pal(start){
  let p = document.getElementById('r73Pal');
  if(!p){ p = document.createElement('div'); p.id = 'r73Pal'; document.body.appendChild(p); }
  p.innerHTML = '<div class="r73p-box"><input id="r73PalIn" placeholder="Find anything, or do it (try: add call JJS)" autocomplete="off" spellcheck="false"><div class="r73p-list" id="r73PalList"></div></div>';
  p.classList.add('is-in'); MIND.pal = {i:0, items:[]};
  const inp = document.getElementById('r73PalIn'); inp.value = start || '';
  const draw = function(){
    MIND.pal.items = r73PalItems(inp.value); MIND.pal.i = Math.min(MIND.pal.i, Math.max(0, MIND.pal.items.length - 1));
    const lit = {}; MIND.pal.items.forEach(function(i){ if(i.node) lit[i.node.id] = 1; }); MIND.palLit = inp.value ? lit : null;
    document.getElementById('r73PalList').innerHTML = MIND.pal.items.map(function(it, i){ return '<div class="r73p-i'+(i===MIND.pal.i ? ' is-on' : '')+'" data-i="'+i+'"><span>'+escapeHtml(it.label)+'</span><em>'+it.kind+'</em></div>'; }).join('') || '<div class="r73p-none">Nothing matches.</div>';
  };
  const go = function(i){ const it = MIND.pal.items[i]; r73PalClose(); if(!it) return; if(it.run) it.run(); else if(it.node){ r73FlyNode(it.node); r73Inspect(it.node); } };
  inp.oninput = function(){ MIND.pal.i = 0; draw(); };
  inp.onkeydown = function(e){
    if(e.key==='ArrowDown'){ MIND.pal.i = Math.min(MIND.pal.items.length - 1, MIND.pal.i + 1); draw(); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ MIND.pal.i = Math.max(0, MIND.pal.i - 1); draw(); e.preventDefault(); }
    else if(e.key==='Enter'){ go(MIND.pal.i); e.preventDefault(); }
    else if(e.key==='Escape'){ r73PalClose(); e.preventDefault(); e.stopPropagation(); }
  };
  p.onclick = function(e){ const r = e.target.closest('.r73p-i'); if(r) go(Number(r.dataset.i)); else if(e.target===p) r73PalClose(); };
  draw(); setTimeout(function(){ inp.focus(); }, 0);
}
function r73PalClose(){ const p = document.getElementById('r73Pal'); if(p) p.classList.remove('is-in'); MIND.pal = null; MIND.palLit = null; }

// ---------------- sound (made, not played: tiny synthesized clicks) ----------------
function r73Sound(kind){
  if(r72P('mindSound', true)===false) return;
  try{
    const c = getAudioCtx(); if(!c) return; const t = c.currentTime;
    const tone = function(f, f2, dur, g, type){ const o = c.createOscillator(), a = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(a); a.connect(c.destination); o.start(t); o.stop(t + dur + 0.02); };
    if(kind==='hover') tone(2800, 0, 0.012, 0.012);
    else if(kind==='select'){ tone(90, 55, 0.09, 0.06); tone(880, 0, 0.06, 0.025); }
    else if(kind==='dive'){ tone(220, 440, 0.18, 0.04, 'triangle'); }
    else if(kind==='back'){ tone(440, 220, 0.16, 0.035, 'triangle'); }
    else if(kind==='done'){ tone(523, 0, 0.12, 0.05, 'triangle'); setTimeout(function(){ tone(784, 0, 0.16, 0.05, 'triangle'); }, 90); }
    else if(kind==='lock'){ tone(55, 0, 0.5, 0.08); tone(110, 0, 0.5, 0.04); }
  }catch(e){}
}

// ---------------- input ----------------
function r73Pick(sx, sy){
  let best = null, bd = 1e9;
  MIND.nodes.forEach(function(n){ if(!n.sp) return; const r = Math.max(8, n.r*MIND.cam.k) + 4, dx = n.sp[0] - sx, dy = n.sp[1] - sy, d = Math.sqrt(dx*dx + dy*dy); if(d < r && d < bd){ bd = d; best = n; } });
  return best;
}
function r73Wire(c){
  c.addEventListener('wheel', function(e){
    e.preventDefault(); MIND.fly = null;
    const f = Math.exp(-e.deltaY*(e.ctrlKey ? 0.01 : 0.0018));
    const w = r73S2W(e.offsetX, e.offsetY), k2 = Math.max(0.35, Math.min(3, MIND.cam.k*f));
    MIND.cam.x = w[0] - (e.offsetX - MIND.W/2)/k2; MIND.cam.y = w[1] - (e.offsetY - MIND.H/2)/k2; MIND.cam.k = k2;
  }, {passive:false});
  c.addEventListener('pointerdown', function(e){ MIND.drag = {x:e.clientX, y:e.clientY, cx:MIND.cam.x, cy:MIND.cam.y, moved:false}; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', function(e){
    if(MIND.drag){ const dx = e.clientX - MIND.drag.x, dy = e.clientY - MIND.drag.y; if(Math.abs(dx) + Math.abs(dy) > 4){ MIND.drag.moved = true; MIND.fly = null; } if(MIND.drag.moved){ MIND.cam.x = MIND.drag.cx - dx/MIND.cam.k; MIND.cam.y = MIND.drag.cy - dy/MIND.cam.k; } return; }
    const n = r73Pick(e.offsetX, e.offsetY); if(n!==MIND.hover){ MIND.hover = n; if(n) r73Sound('hover'); c.style.cursor = n ? 'pointer' : 'grab'; }
  });
  c.addEventListener('pointerup', function(e){
    const d = MIND.drag; MIND.drag = null; if(d && d.moved) return;
    const n = r73Pick(e.offsetX, e.offsetY);
    if(!n){ r73Inspect(null); return; }
    // a task's ring: one click ticks it
    if(n.kind==='task' && MIND.sel===n){ /* second click on a selected task opens it */ }
    r73Sound('select'); r73Inspect(n);
    if(n.kind==='sector' && MIND.cam.k < 1.1) r73FlyNode(n);
  });
  c.addEventListener('dblclick', function(e){
    const n = r73Pick(e.offsetX, e.offsetY); if(!n) return;
    if(n.kind==='sector') r73Dive(n.sector.dive);
    else if(n.kind==='task') openTaskEditModal(n.ref.id);
    else if(n.go) r73Dive(n.go);
    else if(n.kind==='op') ACTIONS.r73mOpType();
    else if(n.parent && n.parent.sector) r73Dive(n.parent.sector.dive);
  });
  window.addEventListener('resize', r73Size);
}
document.addEventListener('keydown', function(e){
  if(!MIND.booted) return;
  const tag = e.target && e.target.tagName; const typing = tag==='INPUT' || tag==='TEXTAREA' || (e.target && e.target.isContentEditable);
  if((e.metaKey || e.ctrlKey) && (e.key==='k' || e.key==='K')){ e.preventDefault(); if(MIND.pal) r73PalClose(); else r73Pal(''); return; }
  if(typing) return;
  if(document.querySelector('.overlay:not(.hidden)')) return;
  if(e.key==='Escape'){ if(MIND.pal){ r73PalClose(); return; } if(r73Surface()) return; if(MIND.sel){ r73Inspect(null); return; } r73Fit(); return; }
  if(MIND.dive) return;
  if(e.key==='0'){ r73Inspect(null); r73Fit(); return; }
  const s = R73M_SECTORS.find(function(x){ return x.key===e.key; });
  if(s){ const n = MIND.byId['s:'+s.id]; r73FlyNode(n); r73Inspect(n); return; }
  if(e.key==='Enter' && MIND.sel){ const n = MIND.sel; if(n.kind==='sector') r73Dive(n.sector.dive); else if(n.go) r73Dive(n.go); else if(n.parent && n.parent.sector) r73Dive(n.parent.sector.dive); return; }
  if((e.key==='x' || e.key==='X') && MIND.sel){ if(MIND.sel.kind==='task') ACTIONS.r73mDone(null, null, MIND.sel.ref.id); else if(MIND.sel.kind==='client') ACTIONS.r73mTouch(null, null, MIND.sel.ref.id); return; }
  // (Round 79: Space no longer locks you in or out; use the Lock in button or ⌘K)
});
function r73Size(){
  const c = MIND.canvas; if(!c) return;
  MIND.dpr = Math.min(2, window.devicePixelRatio || 1); MIND.W = innerWidth; MIND.H = innerHeight;
  c.width = Math.round(MIND.W*MIND.dpr); c.height = Math.round(MIND.H*MIND.dpr); c.style.width = MIND.W+'px'; c.style.height = MIND.H+'px';
}

// ---------------- booting into it ----------------
function r73MindBoot(){
  if(MIND.booted) return; MIND.booted = true;
  document.body.classList.add('mind-on'); try{ const ap = document.getElementById('app'); ap.classList.remove('app-in'); ap.style.animation = 'none'; }catch(e){}
  const root = document.createElement('div'); root.id = 'mindRoot';
  root.innerHTML = '<canvas id="mindCanvas"></canvas><div class="r73-hud">'+r73HudHtml()+'</div>';
  document.body.appendChild(root);
  // the classic page window's way back
  const back = document.createElement('button'); back.id = 'r73Back'; back.dataset.action = 'r73mSurface'; back.innerHTML = '&#9678; Back to the map <kbd>Esc</kbd>'; document.body.appendChild(back);
  MIND.canvas = document.getElementById('mindCanvas'); MIND.ctx = MIND.canvas.getContext('2d');
  r73Size(); r73Wire(MIND.canvas); r73MindBuild();
  MIND.t0 = MIND.boot = performance.now();
  const k = Math.min(MIND.W, MIND.H - 160)/900; MIND.cam = {x:0, y:0, k:Math.max(0.4, Math.min(1.1, k))};
  MIND.raf = requestAnimationFrame(r73Loop);
  MIND.hudAt = 0; r73HudTick();
}
afterRenderHooks.push(function(){
  try{ if(!MIND.booted && r73MindOn()) r73MindBoot(); if(MIND.booted) MIND.built = Math.min(MIND.built, Date.now() - 4600); }catch(e){}
});
// in the Mind view, a nav click (inside a dived page) stays in the window; the sidebar isn't there

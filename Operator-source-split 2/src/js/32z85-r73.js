// ============ ROUND 73: Personal without You, new sidebar icons, calendar scroll, XP width, task views, Command View ============
// The Mind view (the brain-map interface) is in 32z86-r73mind.js.

// ---------------- Personal: no "You" tab (it's the XP page now) ----------------
renderPersonal = (function(base){
  return function(){
    if(!ui.personalTab || ui.personalTab==='you' || ui.personalTab==='growth') ui.personalTab = 'goals';
    return base.apply(this, arguments).replace(/<div class="tab[^"]*" data-action="personalTab" data-tab="you">You<\/div>/, '');
  };
})(renderPersonal);

// ---------------- the sidebar's icons ----------------
const R73_ICON = (function(){
  const s = function(inner){ return '<svg class="r73-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>'; };
  return {
    today:s('<path d="M3 18h18"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/><path d="M12 6.5V8.5"/><path d="M4.6 10.6l1.4 1.1"/><path d="M19.4 10.6l-1.4 1.1"/><path d="M8 21h8"/>'),
    focus:s('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    business:s('<rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7"/><path d="M3 12.5h18"/><path d="M11 12.5h2v2h-2z"/>'),
    convos:s('<path d="M4 15.5V6.8A2.8 2.8 0 0 1 6.8 4h7.4A2.8 2.8 0 0 1 17 6.8v4.4a2.8 2.8 0 0 1-2.8 2.8H8L4 16.5z"/><path d="M17 9h.2A2.8 2.8 0 0 1 20 11.8v8.7L17 18h-5.2A2.8 2.8 0 0 1 9 15.6"/>'),
    calendar:s('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/><circle cx="15.5" cy="15" r="1.6" fill="currentColor" stroke="none"/>'),
    personal:s('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
    xp:s('<path d="M12 2.8l7.6 4.4v9.6L12 21.2l-7.6-4.4V7.2z"/><path d="M8.5 13.2l3.5-3 3.5 3"/><path d="M8.5 16.4l3.5-3 3.5 3"/>'),
    settings:s('<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/><path d="M4 12h6"/><path d="M14 12h6"/><circle cx="12" cy="12" r="2"/>'),
    command:s('<rect x="3" y="4" width="18" height="12.5" rx="2.5"/><path d="M8.5 20h7"/><path d="M12 16.5V20"/><path d="M7 12.5l2.5-3 2.2 2 2.8-3.5 2.5 3"/>'),
    mind:s('<circle cx="12" cy="12" r="2.4"/><circle cx="5" cy="6" r="1.7"/><circle cx="19" cy="6.5" r="1.7"/><circle cx="18" cy="18.5" r="1.7"/><circle cx="5.5" cy="18" r="1.7"/><path d="M6.4 7.1l3.8 3.3"/><path d="M17.6 7.6l-3.8 3"/><path d="M16.7 17.3l-3-3.6"/><path d="M6.9 16.9l3.3-3.1"/><path d="M6.7 6.1L17.3 6.4" stroke-dasharray="1.5 2.5"/>')
  };
})();
function r73Nav(){
  const nav = (document.querySelector('.nav-item') || {}).parentNode; if(!nav) return;
  nav.querySelectorAll('.nav-item').forEach(function(b){
    const v = b.dataset.view || (b.dataset.action==='r73NavCmd' ? 'command' : b.dataset.action==='r73NavMind' ? 'mind' : '');
    const ic = b.querySelector('.nav-icon'); if(!ic || !R73_ICON[v] || ic.dataset.r73===v) return;
    ic.innerHTML = R73_ICON[v]; ic.dataset.r73 = v; ic.classList.add('r73-nav-ic');
  });
  // Command View and Mind view live in the sidebar, under Inspiration
  if(!nav.querySelector('[data-action="r73NavMind"]')){
    const after = nav.querySelector('.nav-insp') || nav.querySelector('[data-view="settings"]');
    const mk = function(act, label, title){ const b = document.createElement('button'); b.className = 'nav-item r73-nav-x'; b.dataset.action = act; b.title = title; b.innerHTML = '<span class="nav-icon"></span><span class="nav-label">'+label+'</span>'; return b; };
    // (Round 74: Command View left the sidebar: one button, top right, is enough)
    const m = mk('r73NavMind', 'Mind view', 'Switch the whole app to the brain map');
    if(after && after.nextSibling) nav.insertBefore(m, after.nextSibling); else nav.appendChild(m);
    r73Nav();
  }
}
afterRenderHooks.push(function(){ try{ r73Nav(); }catch(e){} });
ACTIONS.r73NavCmd = function(){ r71Open(); };
ACTIONS.r73NavMind = function(){ if(typeof r73MindSwitch==='function') r73MindSwitch('mind'); };

// ---------------- Calendar: the page scrolls, so This week and the month are never cut off ----------------
// (an old rule, main:has(.calx){ overflow:hidden }, locked it to the window — in CSS)

// ---------------- XP: no gap on the right ----------------
// (the page used to stop at 1,240px; it now fills the width and goes two columns on wide screens — in CSS)

// ---------------- Command View: always reachable, and it looks unreal ----------------
// it was a button in Today's header, only there when you weren't locked in. Now: the sidebar, the top-right dock
// (there when locked in too), ⌘⇧C anywhere, and the command palette in the Mind view.
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r73-cvb') >= 0) return h;
    return h.replace(/<div class="md-in[^"]*">/, function(m0){ return m0+'<button class="r73-cvb" data-action="r74Cv" title="Command View (⌘⇧C)" aria-label="Command View">'+R73_ICON.command+'</button>'; });
  };
})(dockHtml);
document.addEventListener('keydown', function(e){
  if((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key==='c' || e.key==='C')){
    const t = e.target; if(t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault(); if(document.getElementById('r71Full')) ACTIONS.r71Close(); else r71Open();
  }
});
// Today's header button goes (it was the "bad spot")
renderToday = (function(base){ return function(){ const h = base.apply(this, arguments); return typeof h==='string' ? h.replace(/<button class="r71-cb"[^>]*>[\s\S]*?<\/button>/, '') : h; }; })(renderToday);
// the surreal part: a living sky behind the board (stars, slow aurora, a breathing core), drawn on one canvas
const R73CV = {raf:0, t0:0, stars:null};
function r73CvSky(){
  const host = document.getElementById('r71Full'); if(!host) return;
  let c = host.querySelector('canvas.r73cv-sky');
  if(!c){ c = document.createElement('canvas'); c.className = 'r73cv-sky'; host.insertBefore(c, host.firstChild); }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const fit = function(){ c.width = Math.round(innerWidth*dpr); c.height = Math.round(innerHeight*dpr); c.style.width = innerWidth+'px'; c.style.height = innerHeight+'px'; };
  fit();
  if(!R73CV.stars){ R73CV.stars = Array.from({length:260}, function(){ return {x:Math.random(), y:Math.random(), z:Math.random(), p:Math.random()*6.28}; }); }
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  cancelAnimationFrame(R73CV.raf); R73CV.t0 = performance.now();
  let last = 0;
  const draw = function(now){
    if(!document.getElementById('r71Full')){ cancelAnimationFrame(R73CV.raf); return; }
    R73CV.raf = requestAnimationFrame(draw);
    if(document.hidden || now - last < (reduce ? 1000 : 33)) return; last = now;
    if(c.width !== Math.round(innerWidth*dpr)) fit();
    const x = c.getContext('2d'), W = c.width, H = c.height, t = (now - R73CV.t0)/1000;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#05060a'; x.fillRect(0, 0, W, H);
    // aurora: three slow blobs of light
    x.globalCompositeOperation = 'lighter';
    [[0.22, 0.25, '255,107,44', 0.11], [0.78, 0.3, '56,189,248', 0.10], [0.5, 0.95, '168,85,247', 0.09]].forEach(function(b, i){
      const bx = (b[0] + Math.sin(t*0.05 + i*2)*0.08)*W, by = (b[1] + Math.cos(t*0.04 + i)*0.06)*H, r = Math.max(W, H)*0.55;
      const g = x.createRadialGradient(bx, by, 0, bx, by, r); g.addColorStop(0, 'rgba('+b[2]+','+b[3]+')'); g.addColorStop(1, 'rgba('+b[2]+',0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    });
    // stars, drifting toward you very slowly
    R73CV.stars.forEach(function(s){
      const z = (s.z - t*0.004) % 1, zz = z < 0 ? z + 1 : z;
      const px = (s.x - 0.5)/(zz*0.9 + 0.1)*0.35*W + W/2, py = (s.y - 0.5)/(zz*0.9 + 0.1)*0.35*H + H/2;
      if(px < 0 || px > W || py < 0 || py > H) return;
      const a = (1 - zz)*0.8*(0.6 + 0.4*Math.sin(t*1.3 + s.p)), sz = (1 - zz)*1.8*dpr + 0.3;
      x.fillStyle = 'rgba(220,230,255,'+a.toFixed(3)+')'; x.fillRect(px, py, sz, sz);
    });
    // the core: a breathing ring in the middle of the board
    const cx = W/2, cy = H*0.46, br = Math.min(W, H)*0.32*(1 + Math.sin(t*0.9)*0.015);
    x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 1*dpr;
    for(let i = 0; i < 3; i++){ x.beginPath(); x.arc(cx, cy, br*(1 + i*0.22), t*0.02*(i%2 ? -1 : 1), t*0.02*(i%2 ? -1 : 1) + Math.PI*1.6); x.stroke(); }
  };
  R73CV.raf = requestAnimationFrame(draw);
  window.addEventListener('resize', fit);
}
r71Open = (function(base){ return function(){ const r = base.apply(this, arguments); try{ r73CvSky(); document.getElementById('r71Full').classList.add('r73cv'); }catch(e){} return r; }; })(r71Open);

// ---------------- Focus → Tasks → Overview: other looks ----------------
const R73_TASK_LOOKS = [
  ['classic', 'Classic', 'Up next, your lineup as cards, and what’s worth doing soon'],
  ['board', 'Board', 'Columns: Today, Soon, Later, Done today'],
  ['timeline', 'Timeline', 'Everything on one line by when it’s due'],
  ['focus', 'One thing', 'One huge card for what’s next, the rest stacked behind it'],
  ['orbit', 'Orbit', 'Today’s tasks in a ring around you, closest due nearest']
];
function r73TaskLook(){ return r72P('taskLook', 'classic'); }
function r73TaskRow(t, o){
  o = o || {};
  const c = (function(){ try{ const k = r42ClientOf(t); return k ? (k.business || k.name) : ''; }catch(e){ return ''; } })();
  const late = t.deadline && t.deadline < todayStr(), due = t.deadline ? (t.deadline===todayStr() ? 'Today' : fmtDateShort(t.deadline)) : '';
  const pr = String(t.priority || 'medium').toLowerCase();
  return '<div class="r73t pr-'+escapeHtml(pr)+(t.status==='done' ? ' is-done' : '')+(ui.currentTaskId===t.id ? ' is-now' : '')+'">'+
    '<button class="r73t-chk" data-action="completeTask" data-id="'+t.id+'" title="Done">'+(t.status==='done' ? '&#10003;' : '')+'</button>'+
    '<div class="r73t-m" data-action="openTaskEditModal" data-id="'+t.id+'"><b>'+escapeHtml(taskName(t))+'</b><span>'+[c, due ? (late ? '<em>'+due+'</em>' : due) : ''].filter(Boolean).join(' · ')+'</span></div>'+
    (t.status!=='done' && !o.noStart ? '<button class="r73t-go" data-action="nnStartNext" data-id="'+t.id+'" title="Start it">&#9654;</button>' : '')+
  '</div>';
}
function r73TaskBuckets(){
  const items = state.tasks.items.filter(function(t){ return !t.isVideoIdea; }), td = todayStr();
  const today = lineupOrdered(items.filter(function(t){ return t.status==='today'; }));
  const back = sortByPriorityAndDeadline(items.filter(function(t){ return t.status==='backlog'; }));
  const wk = new Date(); wk.setDate(wk.getDate() + 7); const wks = todayStr(wk);
  return {today:today, soon:back.filter(function(t){ return t.deadline && t.deadline <= wks; }), later:back.filter(function(t){ return !t.deadline || t.deadline > wks; }),
    done:items.filter(function(t){ return t.status==='done' && t.completedAt===td; })};
}
function r73LookSwitch(){
  const cur = r73TaskLook();
  return '<div class="r73-looks" role="tablist">'+R73_TASK_LOOKS.map(function(l){ return '<button class="'+(cur===l[0] ? 'is-on' : '')+'" data-action="r73TaskLook" data-id="'+l[0]+'" title="'+escapeHtml(l[2])+'">'+l[1]+'</button>'; }).join('')+'</div>';
}
ACTIONS.r73TaskLook = function(el, e, id){ r72Set('taskLook', id); playTick(); renderView(); };
function r73BoardHtml(B){
  const col = function(k, label, list, cls){ return '<div class="r73b-col '+cls+'" data-dropzone="'+(k==='today' ? 'today' : k==='done' ? '' : 'backlog')+'"><div class="r73b-h"><b>'+label+'</b><span>'+list.length+'</span></div><div class="r73b-list">'+(list.map(function(t){ return r73TaskRow(t, {noStart:k==='done'}); }).join('') || '<div class="r73-empty">Nothing here.</div>')+'</div></div>'; };
  return '<div class="r73-board">'+col('today', 'Today', B.today, 'is-today')+col('soon', 'Soon (this week)', B.soon, 'is-soon')+col('later', 'Later', B.later.slice(0, 30), 'is-later')+col('done', 'Done today', B.done, 'is-done')+'</div>';
}
function r73TimelineHtml(B){
  const all = B.today.concat(B.soon, B.later), td = todayStr(), tm = (function(){ const d = new Date(); d.setDate(d.getDate() + 1); return todayStr(d); })();
  const groups = [['Overdue', function(t){ return t.deadline && t.deadline < td; }], ['Today', function(t){ return t.deadline===td || (!t.deadline && t.status==='today'); }], ['Tomorrow', function(t){ return t.deadline===tm; }],
    ['This week', function(t){ return t.deadline && t.deadline > tm && B.soon.indexOf(t) >= 0; }], ['Later', function(t){ return t.deadline && t.deadline > tm && B.soon.indexOf(t) < 0; }], ['Whenever', function(t){ return !t.deadline && t.status!=='today'; }]];
  const used = {};
  return '<div class="r73-tl">'+groups.map(function(g){
    const L = all.filter(function(t){ if(used[t.id] || !g[1](t)) return false; used[t.id] = 1; return true; });
    if(!L.length) return '';
    return '<div class="r73tl-g'+(g[0]==='Overdue' ? ' is-late' : g[0]==='Today' ? ' is-today' : '')+'"><div class="r73tl-k"><i></i><b>'+g[0]+'</b><span>'+L.length+'</span></div><div class="r73tl-list">'+L.slice(0, 40).map(function(t){ return r73TaskRow(t); }).join('')+'</div></div>';
  }).join('')+(B.done.length ? '<div class="r73tl-g is-done"><div class="r73tl-k"><i></i><b>Done today</b><span>'+B.done.length+'</span></div><div class="r73tl-list">'+B.done.map(function(t){ return r73TaskRow(t, {noStart:true}); }).join('')+'</div></div>' : '')+'</div>';
}
function r73FocusHtml(B){
  const cur = ui.currentTaskId && state.tasks.items.find(function(t){ return t.id===ui.currentTaskId; });
  const nxt = state.focus.nextTaskId && state.tasks.items.find(function(t){ return t.id===state.focus.nextTaskId && t.status!=='done'; });
  const one = cur || nxt || B.today[0] || B.soon[0];
  if(!one) return '<div class="r73-one is-empty"><b>Nothing lined up.</b><span>Add a task with the + in the corner, or pull one from the backlog.</span></div>';
  const rest = B.today.concat(B.soon).filter(function(t){ return t!==one; });
  const c = (function(){ try{ const k = r42ClientOf(one); return k ? (k.business || k.name) : ''; }catch(e){ return ''; } })();
  return '<div class="r73-one">'+
    '<div class="r73o-card"><small>'+(cur ? 'Working on' : 'Next up')+'</small><b>'+escapeHtml(taskName(one))+'</b><span>'+[c, one.deadline ? 'Due '+fmtDateShort(one.deadline) : ''].filter(Boolean).join(' · ')+'</span>'+
      '<div class="r73o-acts">'+(cur ? '<button class="btn btn-primary" data-action="completeTask" data-id="'+one.id+'">&#10003; Done</button>' : '<button class="btn btn-primary" data-action="nnStartNext" data-id="'+one.id+'">&#9654; Start</button><button class="btn" data-action="nnLockInNext" data-id="'+one.id+'">&#128274; Lock in on it</button>')+
      '<button class="btn btn-ghost" data-action="openTaskEditModal" data-id="'+one.id+'">Open</button></div></div>'+
    (rest.length ? '<div class="r73o-stack">'+rest.slice(0, 5).map(function(t, i){ return '<div class="r73o-s" style="--i:'+i+'">'+r73TaskRow(t)+'</div>'; }).join('')+(rest.length > 5 ? '<div class="r73o-more">+'+(rest.length - 5)+' more</div>' : '')+'</div>' : '')+
  '</div>';
}
function r73OrbitHtml(B){
  const L = B.today.concat(B.soon).slice(0, 12), n = L.length;
  if(!n) return r73FocusHtml(B);
  const td = todayStr();
  const dot = function(t, i){
    const days = t.deadline ? Math.max(0, Math.round((new Date(t.deadline) - new Date(td))/86400000)) : 7;
    const ring = Math.min(3, days <= 0 ? 0 : days <= 1 ? 1 : days <= 4 ? 2 : 3), a = (i/n)*Math.PI*2 - Math.PI/2, r = 20 + ring*6, side = Math.cos(a) < -0.35 ? ' sl' : Math.cos(a) > 0.35 ? ' sr' : '';
    return '<button class="r73orb-t'+side+' ring-'+ring+(t.deadline && t.deadline < td ? ' is-late' : '')+'" style="left:'+(50 + Math.cos(a)*r).toFixed(2)+'%;top:'+(50 + Math.sin(a)*r*0.82).toFixed(2)+'%" data-action="openTaskEditModal" data-id="'+t.id+'"><i></i><span>'+escapeHtml(taskName(t))+'</span></button>';
  };
  return '<div class="r73-orbit"><div class="r73orb-ring r1"></div><div class="r73orb-ring r2"></div><div class="r73orb-ring r3"></div>'+
    '<div class="r73orb-core"><b>'+B.today.length+'</b><span>today</span><small>'+B.done.length+' done</small></div>'+L.map(dot).join('')+'</div>'+
    '<div class="r73orb-key"><span><i class="k0"></i>Due today</span><span><i class="k1"></i>Tomorrow</span><span><i class="k2"></i>This week</span><span><i class="k3"></i>Later</span></div>';
}
renderFocusTasksOverview = (function(base){
  return function(){
    const look = r73TaskLook();
    const sw = '<div class="r73-looksbar"><span>Look</span>'+r73LookSwitch()+'</div>';
    if(look==='classic') return sw+base.apply(this, arguments);
    const B = r73TaskBuckets();
    const body = look==='board' ? r73BoardHtml(B) : look==='timeline' ? r73TimelineHtml(B) : look==='orbit' ? r73OrbitHtml(B) : r73FocusHtml(B);
    return sw+(look==='focus' ? '' : nowNextPanelHtml())+'<div class="r73-look is-'+look+'">'+body+'</div>';
  };
})(renderFocusTasksOverview);
// Settings → Focus & Lock in: the same choice, with what each one is
function r73TaskLookSetHtml(){
  const cur = r73TaskLook();
  return '<div class="card section op-settings" id="r73Looks"><div class="section-title">&#128221; Tasks overview look</div>'+
    '<div class="r73-lookgrid">'+R73_TASK_LOOKS.map(function(l){ return '<button class="r73-lookc'+(cur===l[0] ? ' is-on' : '')+'" data-action="r73TaskLook" data-id="'+l[0]+'"><i class="r73lk-'+l[0]+'"></i><b>'+l[1]+'</b><span>'+escapeHtml(l[2])+'</span></button>'; }).join('')+'</div></div>';
}
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(ui.settingsTab!=='focus' || h.indexOf('id="r73Looks"') >= 0) return h;
    const i = h.indexOf('<div class="card section op-settings" id="r72Auto">');
    return i >= 0 ? h.slice(0, i)+r73TaskLookSetHtml()+h.slice(i) : h;
  };
})(renderSettings);

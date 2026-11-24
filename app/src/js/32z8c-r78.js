// ================= Round 78 =================
// Mind view: one click on a planet opens it, the double-click remembers what you clicked, switching in and out
// of the Mind view happens in place (no restart), and text doesn't get selected by accident. The galaxy: a 3D sun
// in the middle, planets lit from its side, a deeper zoom, and a beacon on anything that needs you.
// Today loses the deep-work and tasks bars. The phone gets XP and a real Log workout. The window stays on its
// monitor (that part is in main.js).

// ---------------- what counts as important on the map ----------------
function r78Imp(n){
  const td = todayStr();
  if(n.kind==='task'){
    const t = n.ref || {};
    if(n.late) return '#FF4D4D';
    if(n.now) return '#FF6B2C';
    if(/^(high|urgent|top)$/i.test(t.priority || '') && t.deadline && t.deadline <= td) return '#FF4D4D';
    return null;
  }
  if(n.kind==='client' && n.neglected) return '#F59E0B';
  if(n.kind==='event' && n.today && n.due) return '#FF4D4D';
  if(n.kind==='xp' && n.claim) return '#F5C451';
  return null;
}
r73MindBuild = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      MIND.nodes.forEach(function(n){ const c = r78Imp(n); n.imp = !!c; n.impC = c; n.impN = 0; });
      MIND.nodes.forEach(function(n){ if(!n.imp) return; let p = n.parent; while(p && p.kind!=='sector') p = p.parent; if(p) p.impN = (p.impN || 0) + 1; });
    }catch(e){}
    return r;
  };
})(r73MindBuild);

// ---------------- the sun ----------------
const R78 = {};
// a tileable sheet of granulation, made once
function r78Gran(){
  if(R78.gran) return R78.gran;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for(let i = 0; i < 700; i++){
    const px = Math.random()*S, py = Math.random()*S, rr = 3 + Math.random()*13, light = Math.random() < 0.55;
    [-S, 0, S].forEach(function(ox){ [-S, 0, S].forEach(function(oy){
      const x0 = px + ox, y0 = py + oy; if(x0 < -rr || x0 > S + rr || y0 < -rr || y0 > S + rr) return;
      const gr = g.createRadialGradient(x0, y0, 0, x0, y0, rr);
      gr.addColorStop(0, light ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, rr, 0, Math.PI*2); g.fill();
    }); });
  }
  return (R78.gran = c);
}
function r78Sun(x, s, r, t, calm, oc, opSt){
  const cx = s[0], cy = s[1], tt = calm ? 0 : t;
  x.globalCompositeOperation = 'lighter';
  // corona, in three layers
  const pulse = 1 + (calm ? 0 : Math.sin(tt*0.8)*0.04);
  [[r*9*pulse, '#FF7A1A', 0.2], [r*5.2, '#FFB347', 0.42], [r*3, '#FFE7A8', 0.5]].forEach(function(L){ x.globalAlpha = L[2]; x.drawImage(r73GlowSprite(L[1]), cx - L[0]/2, cy - L[0]/2, L[0], L[0]); });
  // streamers turning slowly
  if(!calm){
    x.lineCap = 'round';
    for(let i = 0; i < 10; i++){
      const an = i/10*Math.PI*2 + tt*0.03 + Math.sin(tt*0.2 + i)*0.08, len = r*(1.9 + 0.7*Math.sin(tt*0.5 + i*1.7));
      const sx = cx + Math.cos(an)*r*0.8, sy = cy + Math.sin(an)*r*0.8, ex = cx + Math.cos(an)*len, ey = cy + Math.sin(an)*len;
      const g = x.createLinearGradient(sx, sy, ex, ey); g.addColorStop(0, 'rgba(255,200,120,0.32)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      x.strokeStyle = g; x.lineWidth = Math.min(r*0.14, 18); x.globalAlpha = 0.4; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
    }
    x.lineCap = 'butt';
  }
  // Op's state shows as the color of the halo right around him (listening, thinking, locked in)
  x.globalAlpha = opSt ? 0.85 : 0.35; x.drawImage(r73GlowSprite(oc), cx - r*2.6, cy - r*2.6, r*5.2, r*5.2);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // the body: white-hot in the middle, red at the edge
  const g = x.createRadialGradient(cx - r*0.25, cy - r*0.3, r*0.05, cx, cy, r);
  g.addColorStop(0, '#FFFDF2'); g.addColorStop(0.35, '#FFE38F'); g.addColorStop(0.7, '#FFAA3B'); g.addColorStop(0.92, '#F0661E'); g.addColorStop(1, '#A8340C');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.clip();
  // the surface, sliding across as it turns
  const tex = r78Gran(), sz = r*2.2, off = ((tt*0.015) % 1)*sz;
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.55;
  x.drawImage(tex, cx - r*1.1 - off, cy - r*1.1, sz, sz); x.drawImage(tex, cx - r*1.1 - off + sz, cy - r*1.1, sz, sz);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // the edge darkens, which is what makes it round
  const lg = x.createRadialGradient(cx, cy, r*0.55, cx, cy, r); lg.addColorStop(0, 'rgba(120,30,0,0)'); lg.addColorStop(1, 'rgba(120,30,0,0.55)'); x.fillStyle = lg; x.fillRect(cx - r, cy - r, r*2, r*2);
  // Op talking or listening: light ripples across the face
  if(opSt && !calm){
    for(let i = 0; i < 3; i++){ x.strokeStyle = 'rgba(255,255,255,'+(0.22 + i*0.08)+')'; x.lineWidth = 1.3; x.beginPath();
      for(let j = 0; j <= 40; j++){ const u = j/40, ax = cx - r + u*2*r, amp = r*(opSt==='speak' ? 0.4 : 0.2)*Math.sin(u*Math.PI), ay = cy + Math.sin(u*Math.PI*2 + t*(1.2 + i*0.5) + i*2)*amp; if(j) x.lineTo(ax, ay); else x.moveTo(ax, ay); }
      x.stroke(); }
  }
  x.restore();
  // loops of fire on the edge
  if(!calm){
    x.globalCompositeOperation = 'lighter';
    for(let i = 0; i < 3; i++){
      const an = i*2.1 + tt*0.02, h = r*(0.25 + 0.15*Math.sin(tt*0.7 + i*2)), a1 = an - 0.13, a2 = an + 0.13;
      const path = function(){ x.beginPath(); x.moveTo(cx + Math.cos(a1)*r, cy + Math.sin(a1)*r); x.quadraticCurveTo(cx + Math.cos(an)*(r + h*2), cy + Math.sin(an)*(r + h*2), cx + Math.cos(a2)*r, cy + Math.sin(a2)*r); };
      x.strokeStyle = 'rgba(255,110,40,0.18)'; x.lineWidth = Math.max(3, r*0.06); path(); x.stroke();
      x.strokeStyle = 'rgba(255,190,110,0.55)'; x.lineWidth = Math.max(1, r*0.018); path(); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
  }
  x.globalAlpha = 1;
}

// ---------------- the planets: lit from the sun's side ----------------
function r78Shade(hex, f){ const h = String(hex).replace('#', ''), n = parseInt(h.length===3 ? h.split('').map(function(c){ return c+c; }).join('') : h, 16); return 'rgb('+Math.round((n>>16&255)*f)+','+Math.round((n>>8&255)*f)+','+Math.round((n&255)*f)+')'; }
function r78Planet(x, n, s, r, a, t){
  const sun = MIND.byId.op && MIND.byId.op.sp; let lx = -0.5, ly = -0.6;
  if(sun && sun[2] > 0){ const dx = sun[0] - s[0], dy = sun[1] - s[1], d = Math.sqrt(dx*dx + dy*dy) || 1; lx = dx/d; ly = dy/d; }
  const tl = -0.35 + Math.sin(n.a)*0.3;
  // the ring's far side goes behind the planet
  x.strokeStyle = r73Hex(n.color, 0.4); x.lineWidth = Math.max(1, r*0.08);
  x.beginPath(); x.ellipse(s[0], s[1], r*2, r*0.55, tl, Math.PI, Math.PI*2); x.stroke();
  const g = x.createRadialGradient(s[0] + lx*r*0.45, s[1] + ly*r*0.45, r*0.05, s[0], s[1], r*1.05);
  g.addColorStop(0, '#FFF8EC'); g.addColorStop(0.25, n.color); g.addColorStop(0.75, r78Shade(n.color, 0.35)); g.addColorStop(1, '#050608');
  x.fillStyle = g; x.beginPath(); x.arc(s[0], s[1], r, 0, Math.PI*2); x.fill();
  x.save(); x.beginPath(); x.arc(s[0], s[1], r, 0, Math.PI*2); x.clip();
  // faint cloud bands
  x.globalAlpha = a*0.13; x.fillStyle = '#ffffff';
  x.translate(s[0], s[1]); x.rotate(tl*0.6);
  for(let i = -2; i <= 2; i++) x.fillRect(-r, i*r*0.38 - r*0.05 + Math.sin(t*0.1 + i)*r*0.02, r*2, r*0.1);
  x.setTransform(MIND.dpr, 0, 0, MIND.dpr, 0, 0);
  // the night side
  x.globalAlpha = a; const ng = x.createLinearGradient(s[0] + lx*r, s[1] + ly*r, s[0] - lx*r, s[1] - ly*r);
  ng.addColorStop(0, 'rgba(0,0,0,0)'); ng.addColorStop(0.5, 'rgba(0,0,0,0.05)'); ng.addColorStop(1, 'rgba(2,3,8,0.85)'); x.fillStyle = ng; x.fillRect(s[0] - r, s[1] - r, r*2, r*2);
  x.restore();
  // a rim of atmosphere where the light hits
  const la = Math.atan2(ly, lx);
  x.globalAlpha = a*0.8; x.strokeStyle = r73Hex(n.color, 0.9); x.lineWidth = Math.max(1, r*0.07);
  x.beginPath(); x.arc(s[0], s[1], r*0.98, la - 1.2, la + 1.2); x.stroke();
  // and the ring's near side in front
  x.globalAlpha = a; x.strokeStyle = r73Hex(n.color, 0.7); x.lineWidth = Math.max(1.2, r*0.09);
  x.beginPath(); x.ellipse(s[0], s[1], r*2, r*0.55, tl, 0, Math.PI); x.stroke();
}

// ---------------- a beacon on what needs you ----------------
function r78Beacon(x, n, s, r, a, t, calm){
  if(n.kind==='sector'){
    if(!n.impN) return;
    const bx = s[0] + r*0.8, by = s[1] - r*0.8;
    x.globalAlpha = a; x.fillStyle = '#FF4D4D'; x.beginPath(); x.arc(bx, by, 8, 0, Math.PI*2); x.fill();
    x.fillStyle = '#fff'; x.font = '700 10px -apple-system, "SF Pro Text", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n.impN), bx, by + 0.5);
    x.globalAlpha = 1; return;
  }
  if(!n.imp) return;
  const c = n.impC || '#FF4D4D', p = calm ? 0.5 : (t*0.6 + (n.ph || 0)) % 1;
  const top = s[1] - r - 40*Math.min(1.5, MIND.cam.k*s[2]);
  const g = x.createLinearGradient(s[0], s[1] - r, s[0], top); g.addColorStop(0, r73Hex(c, 0.8*a)); g.addColorStop(1, r73Hex(c, 0));
  x.globalAlpha = 1; x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(s[0], s[1] - r - 2); x.lineTo(s[0], top); x.stroke();
  const dy = top + 3, d = 4.5; x.globalAlpha = a; x.fillStyle = c;
  x.beginPath(); x.moveTo(s[0], dy - d); x.lineTo(s[0] + d, dy); x.lineTo(s[0], dy + d); x.lineTo(s[0] - d, dy); x.closePath(); x.fill();
  if(!calm){ x.globalAlpha = a*(1 - p)*0.8; x.strokeStyle = c; x.lineWidth = 1.5; x.beginPath(); x.arc(s[0], s[1], r + 3 + p*14, 0, Math.PI*2); x.stroke(); }
  x.globalAlpha = 1;
}

// ---------------- opening a planet: fly in, then the page ----------------
function r78Open(n){
  if(!n || !n.sector) return;
  if(MIND.opening) return; MIND.opening = true;
  if(!r73Reduce()) r73FlyTo(n.x*0.82, n.y*0.82, 2.4, 360);
  setTimeout(function(){ MIND.opening = false; r73Inspect(null); r73Dive(n.sector.dive); }, r73Reduce() ? 0 : 340);
}
// coming back out: back to the whole map
r73Surface = (function(base){ return function(){ const r = base.apply(this, arguments); if(r){ try{ r73Fit(); }catch(e){} } return r; }; })(r73Surface);
r73Dive = (function(base){ return function(){ try{ r73Inspect(null); if(typeof r73PalClose==='function') r73PalClose(); }catch(e){} return base.apply(this, arguments); }; })(r73Dive);

// ---------------- switching the Mind view on and off, in place ----------------
function r78MindDown(){
  if(!MIND.booted) return;
  try{ cancelAnimationFrame(MIND.raf); }catch(e){}
  MIND.booted = false; MIND.dive = false; MIND.sel = null; MIND.hover = null; MIND.canvas = null; MIND.ctx = null;
  ['mindRoot', 'r73Back', 'r73Insp', 'r73Pal'].forEach(function(id){ const el = document.getElementById(id); if(el && (id==='mindRoot' || id==='r73Back')) el.remove(); });
  document.body.classList.remove('mind-on', 'mind-dive');
  try{ const ap = document.getElementById('app'); ap.style.animation = ''; }catch(e){}
}
r73MindSwitch = function(mode){
  const to = mode==='mind' ? 'mind' : 'classic';
  if((state.profile.viewMode || 'classic')===to) return;
  state.profile.viewMode = to; persist('profile');
  const s = document.createElement('div'); s.id = 'r73Restart'; s.innerHTML = '<div class="r73r-core"></div><b>'+(to==='mind' ? 'Entering the Mind view' : 'Back to classic')+'</b>';
  document.body.appendChild(s); requestAnimationFrame(function(){ s.classList.add('is-in'); });
  setTimeout(function(){
    if(to==='mind'){ ui.view = ui.view || 'today'; try{ r73MindBoot(); }catch(e){ console.error(e); } }
    else { r78MindDown(); ui.view = 'today'; }
    try{ renderView(); }catch(e){}
    s.classList.remove('is-in'); setTimeout(function(){ s.remove(); }, 500);
  }, 420);
};
r73InterfaceSetHtml = (function(base){ return function(){ return base.apply(this, arguments).replace('Switching restarts Operator.', 'Switch any time. It changes in place.'); }; })(r73InterfaceSetHtml);
if(typeof r73PalItems==='function') r73PalItems = (function(base){ return function(){ const out = base.apply(this, arguments); try{ out.forEach(function(it){ if(Array.isArray(it) && typeof it[0]==='string') it[0] = it[0].replace(' (restart)', ''); }); }catch(e){} return out; }; })(r73PalItems);

// ---------------- Today: no deep-work bar, no tasks bar ----------------
streakWorkHtml = (function(base){
  return function(o){
    const h = base.apply(this, arguments);
    if(o && o.compact) return h;
    return h.replace(/<button class="swt[^"]*"[\s\S]*?<\/button>/g, '');
  };
})(streakWorkHtml);

// ---------------- the phone: XP, and a real workout log ----------------
function r78PhoneXp(){
  let x = {}; try{ x = xpSummary() || {}; }catch(e){}
  let q = []; try{ q = r70Quests() || []; }catch(e){}
  let rank = ''; try{ rank = (RANKS[x.rank] || {}).name || ''; }catch(e){}
  return {level:x.level || 0, total:x.total || 0, pct:x.canLevel ? 1 : (x.levelPct || 0), canLevel:!!x.canLevel, toNext:x.levelHi ? Math.max(0, x.levelHi - x.total) : null,
    today:x.todayXp || 0, week:x.week || 0, rank:rank, ovr:x.ovr || null,
    quests:q.slice(0, 8).map(function(z){ return {label:String(z.label || ''), icon:z.icon || '', done:!!z.done, xp:z.xp || 0}; })};
}
function r78WorkoutTypes(){
  try{ return WORKOUT_TYPES.slice(0, 8).map(function(t){ return {id:t.id, label:t.label || t.id, icon:t.icon || ''}; }); }catch(e){}
  return ['Lift', 'Run', 'Cardio', 'Sports', 'Yoga', 'Walk'].map(function(t){ return {id:t, label:t, icon:''}; });
}
r72PhoneCall = (function(base){
  return function(name, a){
    a = a || {};
    if(String(name)==='xp') return r78PhoneXp();
    if(String(name)==='workoutTypes'){ let wk = 0; try{ wk = workoutsThisWeek(); }catch(e){} return {types:r78WorkoutTypes(), week:wk, today:arr(state.health.gymLog).filter(function(g){ return g.date===todayStr(); }).length}; }
    if(String(name)==='workout'){
      const type = String(a.type || '').trim().slice(0, 60); if(!type) return {ok:false, say:'Pick what you did.'};
      const min = Number(a.minutes) > 0 ? Math.round(Number(a.minutes)) : 45;
      try{ opRunTool('log_workout', {type:type, minutes:min}); }catch(e){ return {ok:false, say:'That didn’t save.'}; }
      try{ if(typeof r70NudgeClear==='function') r70NudgeClear('workout'); }catch(e){}
      try{ renderView(); }catch(e){}
      return {ok:true, say:type+' · '+min+' min. Logged.'};
    }
    return base.apply(this, arguments);
  };
})(r72PhoneCall);

// ---------------- Settings → Your iPhone: opening it without turning the VPN on ----------------
r68PhoneCardHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    const T = r70Tags(), I = ui.r68Phone || {};
    if(!I.on) return h;
    const tip = T.tailnet ?
      '<div class="r78-od"><b>&#9889; Open it without touching the VPN</b>'+
        '<p>On your iPhone, open <b>Tailscale</b> → tap your profile picture → <b>VPN On Demand</b>. Turn it on, and set Wi-Fi and Cellular to <b>Always</b>. Tailscale then connects by itself, so the Operator icon (and every tag) works at home and away with nothing to switch on.</p>'+
        (I.home ? '<p class="r78-odh">Rather not run Tailscale at home? Your Mac’s home address is <b>'+escapeHtml(I.home)+'</b>. Scan the code below in Safari for a second, home-only icon.</p><div class="r69-qr r78-qr">'+r69Qr(I.home.replace(/\/?$/, '/')+'#c='+encodeURIComponent(I.code || ''))+'</div>' : '')+
      '</div>' : '';
    return tip ? h.replace(/(<div class="r68-ph-f">)/, tip+'$1') : h;
  };
})(r68PhoneCardHtml);

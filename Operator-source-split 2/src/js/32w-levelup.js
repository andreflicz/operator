// ============ LEVEL UP ============
// XP keeps stacking; levels are claimed. When you have the XP for the next level (and, at a rank's
// level, the MRR and Health it asks for), a Level up button shows up — on your card, on You, in
// Good morning and in your notifications. Press it and the screen goes up in fire. It gets bigger the
// higher you climb: more embers, more rings, the flame changes colour every few levels, and a new rank
// gets its own moment. It ends on one quiet line.
const LVL_LINES = ['Built, not given.', 'The work is working.', 'Quietly, then all at once.', 'Different now.', 'Nobody handed you this.', 'Keep the receipts.',
  'Stay dangerous.', 'Still hungry.', 'One more rung.', 'Earned in the dark.', 'The standard just moved.', 'This is who you are now.', 'Same you. Higher floor.', 'Not luck. Reps.'];
// the flame, by how far up you are: ember orange → crimson → blue → violet → emerald → white gold
const LVL_FIRE = [['#ff9a3c', '#ffd27a', '#ff5a1f'], ['#ff6a3d', '#ffd0a0', '#ff2d55'], ['#4fb7ff', '#d2f0ff', '#2f6bff'], ['#b07bff', '#eadbff', '#7a3dff'], ['#5ff0b4', '#e0fff2', '#16c286'], ['#ffe9a0', '#ffffff', '#ffbf3a']];
function lvlTier(L){ return Math.min(LVL_FIRE.length - 1, Math.floor(L/4)); }

// ---- the button and the caution sign ----
function levelUpBtnHtml(where){
  const x = xpSummary(); if(!x.canLevel) return '';
  return '<button class="lvl-up-btn lvl-up-'+(where||'x')+'" data-action="levelUp" title="You have what it takes for level '+(x.level+1)+'"><span class="lvl-up-f">&#128293;</span>Level up<b>'+(x.level+1)+'</b></button>';
}
function xpCautionHtml(x){
  x = x || xpSummary(); if(!x.blocked || !x.blocked.length) return '';
  const full = x.levelPct >= 1;
  return '<span class="xp-caution" title="'+(full ? 'Your XP for this level is full — it keeps stacking. ' : 'Almost at the top of this level. ')+'Level '+(x.level+1)+' needs '+x.blocked.join(' and ')+'.">&#9888; '+(full ? 'Maxed · needs ' : 'Next needs ')+escapeHtml(x.blocked.join(' & '))+'</span>';
}
// in the notifications, until you claim it
function levelUpPending(){
  const x = xpSummary(); if(!x.canLevel) return [];
  return [{key:'lvl:'+(x.level+1), kind:'level', level:'good', icon:'&#128293;', title:'Level '+(x.level+1)+' is ready', sub:'You’ve got the XP'+(x.gate ? ' and what the rank asks for' : '')+'. Go claim it.', act:{a:'levelUp'}, sort:0}];
}
// once per level: a nudge the moment it's ready
afterRenderHooks.push(function(){
  if(!state || !state.profile || typeof xpSummary!=='function') return;
  const x = xpSummary(), p = state.profile;
  if(x.canLevel && p.xpReadyFor!==x.level+1){ p.xpReadyFor = x.level+1; persist('profile'); if(typeof sysNote==='function') setTimeout(function(){ sysNote('Level '+(x.level+1)+' is ready. Claim it.'); }, 600); if(typeof notifBadge==='function') notifBadge(); }
});

ACTIONS.levelUp = function(){
  const x = xpSummary(); if(!x.canLevel){ renderView(); return; }
  const rankBefore = x.rank;
  state.profile.xpLevel = x.level + 1; state.profile.xpReadyFor = null;
  if(state.profile.xpSeen) state.profile.xpSeen.level = state.profile.xpLevel;
  persist('profile'); xpLast = null;
  const y = xpSummary();
  levelUpFx(y.level, y.rank > rankBefore ? y.rank : null);
  setTimeout(function(){ renderView(); if(typeof notifBadge==='function') notifBadge(); }, 300);
};

// ---- the fire ----
function levelUpFx(L, newRank){
  const old = document.getElementById('lvlFx'); if(old) old.remove();
  const tier = lvlTier(L), pal = LVL_FIRE[tier], rk = newRank!=null ? RANKS[newRank] : null;
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rings = Math.min(6, 1 + Math.floor(L/3)) + (rk ? 2 : 0);
  const line = LVL_LINES[(L*7 + (rk ? 3 : 0)) % LVL_LINES.length];
  const d = document.createElement('div');
  d.id = 'lvlFx'; d.className = 'lvl-fx tier-'+tier+(rk ? ' is-rank' : '');
  d.style.setProperty('--c1', pal[0]); d.style.setProperty('--c2', pal[1]); d.style.setProperty('--c3', pal[2]);
  d.innerHTML = '<div class="lvl-flames"><i></i><i></i><i></i></div><canvas class="lvl-cv"></canvas><div class="lvl-glow"></div>'+
    '<div class="lvl-rings">'+Array.from({length:rings}, function(_, i){ return '<i style="--k:'+i+'"></i>'; }).join('')+'</div>'+
    '<div class="lvl-core">'+
      '<div class="lvl-k">'+(rk ? 'RANK UP' : 'LEVEL UP')+'</div>'+
      '<div class="lvl-n"><span class="lvl-from">'+(L-1)+'</span><b class="lvl-to">'+L+'</b></div>'+
      (rk ? '<div class="lvl-rank" style="--rc:'+rk.color+'">'+rankBadgeSvg(newRank, 54)+'<b>'+escapeHtml(rk.name)+'</b><small>'+escapeHtml(rk.tag||'')+'</small></div>' : '')+
      '<div class="lvl-line">'+line+'</div>'+
    '</div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add('is-in'); });
  // the screen takes the hit — harder the higher you go
  if(!calm && L >= 3){ document.body.style.setProperty('--shake', Math.min(9, 2 + L*0.35)+'px'); document.body.classList.remove('lvl-shake'); void document.body.offsetWidth; document.body.classList.add('lvl-shake'); setTimeout(function(){ document.body.classList.remove('lvl-shake'); }, 700); }
  lvlSound(L, !!rk);
  if(!calm) lvlEmbers(d.querySelector('.lvl-cv'), pal, Math.min(1100, 160 + L*36 + (rk ? 320 : 0)), 1 + Math.min(1.2, L*0.05));
  const close = function(){ if(!d.parentNode) return; d.classList.add('is-out'); setTimeout(function(){ if(d.parentNode) d.remove(); }, 600); };
  setTimeout(function(){ d.addEventListener('click', close); }, 1200);
  setTimeout(close, rk ? 7600 : 5800);
}
// embers: a burst from the middle, then fire rising off the bottom of the screen
function lvlEmbers(cv, pal, n, power){
  if(!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
  cv.width = W*dpr; cv.height = H*dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const ps = [], t0 = performance.now();
  const spawn = function(burst){
    const a = Math.random()*Math.PI*2, sp = (burst ? 3 + Math.random()*9 : 1.5 + Math.random()*3.5)*power;
    ps.push(burst
      ? {x:W/2, y:H/2, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 2, r:1 + Math.random()*3.2, life:1, decay:.008 + Math.random()*.012, col:pal[Math.floor(Math.random()*3)]}
      : {x:Math.random()*W, y:H + 10, vx:(Math.random()-.5)*1.2, vy:-sp, r:1 + Math.random()*3.6, life:1, decay:.004 + Math.random()*.008, col:pal[Math.floor(Math.random()*3)], sway:Math.random()*Math.PI*2});
  };
  for(let i=0;i<Math.round(n*.45);i++) spawn(true);
  let rising = Math.round(n*.55);
  const frame = function(now){
    if(!cv.isConnected) return;
    const el = now - t0;
    if(rising > 0 && el < 3200){ const k = Math.ceil(rising/40); for(let i=0;i<k;i++){ spawn(false); rising--; } }
    c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
    for(let i=ps.length-1;i>=0;i--){
      const p = ps[i];
      p.x += p.vx + (p.sway!=null ? Math.sin(el/300 + p.sway)*.6 : 0); p.y += p.vy; p.vy += p.sway!=null ? -.015 : .06; p.vx *= .985;
      p.life -= p.decay; if(p.life <= 0){ ps.splice(i, 1); continue; }
      // a spark: a short bright streak along the way it's flying, with a faint glow at the head
      const a = Math.max(0, p.life), len = 2.6 + p.r;
      c.globalAlpha = a*.95; c.strokeStyle = p.col; c.lineWidth = p.r*(0.45 + a*.5); c.lineCap = 'round';
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx*len, p.y - p.vy*len); c.stroke();
      if(p.r > 2.4){ c.globalAlpha = a*.12; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r*3, 0, Math.PI*2); c.fill(); }
    }
    if(ps.length || el < 3400) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// a rising run of notes — longer the higher you are; a rank adds a big chord at the end
function lvlSound(L, rank){
  if(typeof tone!=='function') return;
  const base = [392, 494, 587, 659, 784, 988, 1175, 1319], n = Math.min(base.length, 4 + Math.floor(L/3));
  for(let i=0;i<n;i++) setTimeout(function(){ tone([base[i]], 0.2, 0.2); }, i*95);
  setTimeout(function(){ tone([523, 784, 1047], 0.9, 0.22); }, n*95 + 120);
  if(rank) setTimeout(function(){ tone([392, 587, 784, 1175], 1.4, 0.24); }, n*95 + 700);
}

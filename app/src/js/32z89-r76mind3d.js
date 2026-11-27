// ================= Round 76: the Mind view, in 3D =================
// The same map (Op in the middle, seven sectors, everything you've got going on around them), but it's a space
// now, not a sheet: a slow-turning galaxy disk you look down into. Every node floats at its own height on a thin
// stem of light to the floor grid, the stars sit at real depth (they swing past as it turns), and colored nebula
// drifts behind each sector. Drag to turn it and tilt it; Shift-drag (or right-drag) to slide; scroll to zoom.
// Only runs while the Mind view is on and the window is showing (it stops dead otherwise).

MIND.yaw = 0.35; MIND.pitch = -0.42; MIND.spin = 0; MIND.lastT = 0;
const R76_F = 540;      // focal length: lower is more dramatic perspective

// height for anything on the map: sectors ride a gentle wave around the disk, their moons scatter above and below
function r76Z(n){
  if(n.z3!=null) return n.z3;
  if(n.kind==='op') return (n.z3 = 0);
  if(n.kind==='sector') return (n.z3 = Math.sin(n.a*2 + 0.6)*150 + Math.cos(n.a*3.3)*60);
  const p = n.parent ? r76Z(n.parent) : 0, ph = n.ph || 0;
  return (n.z3 = p + Math.sin(ph*3.1)*70 + Math.cos(ph*1.7)*35);
}
// world → screen: slide by the camera, spin (yaw), tilt (pitch), then perspective
function r76P(x, y, z){
  const gx = x - MIND.cam.x, gz = y - MIND.cam.y, gy = -(z || 0);
  const cy = Math.cos(MIND.yaw), sy = Math.sin(MIND.yaw), cp = Math.cos(MIND.pitch), sp = Math.sin(MIND.pitch);
  const rx = gx*cy - gz*sy, rz = gx*sy + gz*cy;
  const ry = gy*cp - rz*sp, d = gy*sp + rz*cp;
  const k = MIND.cam.k, F = R76_F/(1 + Math.max(0, k - 1)*0.55), den = F + d*k;
  if(den < F*0.14) return [-99999, -99999, -1, d];
  const s = F/den;
  return [MIND.W/2 + rx*k*s, MIND.H/2 + ry*k*s, s, d];
}
r73W2S = function(x, y, z){ return r76P(x, y, z); };
// screen → the floor (z = 0), near enough for zooming toward the pointer
r73S2W = function(sx, sy){
  const k = MIND.cam.k, rx = (sx - MIND.W/2)/k, ry = (sy - MIND.H/2)/k, sp = Math.sin(MIND.pitch) || -1;
  const rz = -ry/sp, cy = Math.cos(MIND.yaw), sy2 = Math.sin(MIND.yaw);
  return [rx*cy + rz*sy2 + MIND.cam.x, -rx*sy2 + rz*cy + MIND.cam.y];
};
r73Pick = function(sx, sy){
  let best = null, bd = 1e9;
  MIND.nodes.forEach(function(n){ if(!n.sp || n.sp[2] <= 0) return; const r = Math.max(8, n.r*MIND.cam.k*(n.sp[2] || 1)) + 4, dx = n.sp[0] - sx, dy = n.sp[1] - sy, d = Math.sqrt(dx*dx + dy*dy); if(d < r && d < bd){ bd = d; best = n; } });
  return best;
};

// ---- the scenery: deep stars and nebula, made once ----
function r76Scene(){
  if(MIND.scene) return MIND.scene;
  const stars = [], neb = [];
  for(let i = 0; i < 520; i++){
    const u = Math.random()*2 - 1, th = Math.random()*Math.PI*2, r = 2600 + Math.random()*1800, q = Math.sqrt(1 - u*u);
    stars.push({x:Math.cos(th)*q*r, y:Math.sin(th)*q*r, z:u*r, b:Math.random(), p:Math.random()*6.28, c:Math.random() < 0.12 ? '#FCD9A8' : Math.random() < 0.2 ? '#A5C8FF' : '#E6ECFF'});
  }
  R73M_SECTORS.forEach(function(s, i){
    const a = (s.clock/12)*Math.PI*2 - Math.PI/2;
    for(let j = 0; j < 3; j++){ const rr = 420 + j*170 + Math.random()*80, aa = a + (Math.random() - 0.5)*0.7; neb.push({x:Math.cos(aa)*rr, y:Math.sin(aa)*rr, z:(Math.random() - 0.5)*260, r:260 + Math.random()*260, c:s.color, a:0.05 + Math.random()*0.05, ph:Math.random()*6.28}); }
  });
  for(let j = 0; j < 4; j++) neb.push({x:(Math.random() - 0.5)*300, y:(Math.random() - 0.5)*300, z:-160 - Math.random()*200, r:520, c:'#6366F1', a:0.05, ph:Math.random()*6.28});
  return (MIND.scene = {stars:stars, neb:neb});
}
function r76Star(s){
  // stars only turn with the camera (they're too far to slide)
  const cy = Math.cos(MIND.yaw), sy = Math.sin(MIND.yaw), cp = Math.cos(MIND.pitch), sp = Math.sin(MIND.pitch);
  const rx = s.x*cy - s.y*sy, rz = s.x*sy + s.y*cy, gy = -s.z;
  const ry = gy*cp - rz*sp, d = gy*sp + rz*cp;
  if(d < -R76_F*0.9) return null;
  const sc = R76_F/(R76_F + d + 2600);
  return [MIND.W/2 + rx*sc*0.9, MIND.H/2 + ry*sc*0.9, sc];
}

r73Draw = function(now){
  const c = MIND.canvas; if(!c) return;
  const x = MIND.ctx, dpr = MIND.dpr, W = MIND.W, H = MIND.H, t = (now - MIND.t0)/1000, calm = r73Reduce();
  const live = r73Live(), L = R73M_STATE[live];
  const dt = MIND.lastT ? Math.min(0.1, (now - MIND.lastT)/1000) : 0; MIND.lastT = now;
  // the camera: fly-to, and a slow drift around the disk while you're not touching it
  if(MIND.fly){ const f = MIND.fly, p = Math.min(1, (now - f.t0)/f.ms), e = 1 - Math.pow(1 - p, 4);
    MIND.cam.x = f.from.x + (f.to.x - f.from.x)*e; MIND.cam.y = f.from.y + (f.to.y - f.from.y)*e; MIND.cam.k = f.from.k + (f.to.k - f.from.k)*e; if(p >= 1) MIND.fly = null; }
  if(!calm && !MIND.drag && !MIND.hover && !MIND.sel) MIND.yaw += dt*0.035;
  if(MIND.spin){ MIND.yaw += MIND.spin*dt; MIND.spin *= Math.pow(0.04, dt); if(Math.abs(MIND.spin) < 0.002) MIND.spin = 0; }
  const k = MIND.cam.k, boot = Math.min(1, (now - MIND.boot)/900), bootE = 1 - Math.pow(1 - boot, 3);
  const S = r76Scene();
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // the void
  x.fillStyle = '#04050A'; x.fillRect(0, 0, W, H);
  const o = r76P(0, 0, 0);
  const vg = x.createRadialGradient(o[0], o[1], 0, o[0], o[1], Math.max(W, H)*0.8);
  vg.addColorStop(0, r73Hex(L.c, live==='asleep' ? 0.05 : 0.1)); vg.addColorStop(0.5, 'rgba(20,16,40,0.25)'); vg.addColorStop(1, 'rgba(4,5,10,0)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  // stars at depth
  S.stars.forEach(function(s){
    const p = r76Star(s); if(!p) return;
    const a = (0.25 + s.b*0.6)*(calm ? 1 : 0.75 + 0.25*Math.sin(t*0.9 + s.p))*Math.min(1, p[2]*2.4);
    x.globalAlpha = a; x.fillStyle = s.c; const z = (0.5 + s.b*1.4)*Math.min(1.4, p[2]*2.2); x.fillRect(p[0], p[1], z, z);
  });
  x.globalAlpha = 1;
  // nebula, added light
  x.globalCompositeOperation = 'lighter';
  S.neb.forEach(function(nb){
    const p = r76P(nb.x, nb.y, nb.z + (calm ? 0 : Math.sin(t*0.15 + nb.ph)*20)); if(p[2] <= 0) return;
    const sz = nb.r*k*p[2]*2.2; x.globalAlpha = nb.a*bootE*(calm ? 1 : 0.8 + 0.2*Math.sin(t*0.3 + nb.ph)); x.drawImage(r73GlowSprite(nb.c), p[0] - sz/2, p[1] - sz/2, sz, sz);
  });
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  // the floor: rings and spokes, fading with distance
  const ring = function(r, a){
    x.beginPath(); let first = true;
    for(let i = 0; i <= 72; i++){ const an = i/72*Math.PI*2, p = r76P(Math.cos(an)*r, Math.sin(an)*r, 0); if(p[2] <= 0){ first = true; continue; } if(first){ x.moveTo(p[0], p[1]); first = false; } else x.lineTo(p[0], p[1]); }
    x.globalAlpha = a; x.stroke();
  };
  x.lineWidth = 1; x.strokeStyle = 'rgba(148,163,184,1)';
  [130, 250, 400, 560, 760].forEach(function(r, i){ ring(r, (i===1 ? 0.12 : 0.06)*bootE); });
  for(let i = 0; i < 24; i++){ const an = i*Math.PI/12, a1 = r76P(Math.cos(an)*140, Math.sin(an)*140, 0), a2 = r76P(Math.cos(an)*760, Math.sin(an)*760, 0); if(a1[2] <= 0 || a2[2] <= 0) continue; x.globalAlpha = (i % 2 ? 0.025 : 0.05)*bootE; x.beginPath(); x.moveTo(a1[0], a1[1]); x.lineTo(a2[0], a2[1]); x.stroke(); }
  x.globalAlpha = 1;
  // focus: what lights up and what steps back
  const hov = MIND.hover || MIND.sel, near = {};
  if(hov){ near[hov.id] = 1; MIND.links.forEach(function(l){ if(l.a===hov) near[l.b.id] = 1; if(l.b===hov) near[l.a.id] = 1; }); }
  const dim = function(n){
    let a = 1;
    if(hov && !near[n.id]) a = 0.15;
    if(MIND.palLit && !MIND.palLit[n.id] && n.kind!=='op') a = Math.min(a, 0.08);
    if(live==='locked'){ const sid = n.kind==='sector' ? n.sector.id : n.parent && n.parent.sector ? n.parent.sector.id : null; if(sid && sid!=='focus' && sid!=='business' && !(hov && near[n.id])) a *= 0.28; }
    if(live==='asleep' && n.kind!=='op') a *= 0.25;
    // fog: far things fade
    const s = n.sp ? n.sp[2] : 1; if(s <= 0) return 0; a *= Math.max(0.35, Math.min(1, (s - 0.55)*2.2)); if(s > 2.4) a *= Math.max(0, 1 - (s - 2.4)/1.6);
    return a;
  };
  MIND.nodes.forEach(function(n){
    const br = calm || n.tier===0 ? 0 : 2 + (n.tier || 0)*0.5;
    const bx = Math.sin(t*0.7 + (n.ph || 0))*br, by = Math.cos(t*0.6 + (n.ph || 0))*br, bz = calm ? 0 : Math.sin(t*0.5 + (n.ph || 0)*2)*br*1.6;
    n.sp = r76P(n.x*bootE + bx, n.y*bootE + by, r76Z(n)*bootE + bz);
    n.fp = r76P(n.x*bootE + bx, n.y*bootE + by, 0);
  });
  // stems of light down to the floor, and a dot where each one lands
  MIND.nodes.forEach(function(n){
    if(n.kind==='op' || n.sp[2] <= 0 || n.fp[2] <= 0) return; const a = dim(n)*0.35*bootE; if(a < 0.03) return;
    const g = x.createLinearGradient(n.sp[0], n.sp[1], n.fp[0], n.fp[1]); g.addColorStop(0, r73Hex(n.color, a)); g.addColorStop(1, r73Hex(n.color, 0));
    x.strokeStyle = g; x.lineWidth = 1; x.beginPath(); x.moveTo(n.sp[0], n.sp[1]); x.lineTo(n.fp[0], n.fp[1]); x.stroke();
    x.globalAlpha = a*0.8; x.fillStyle = n.color; x.beginPath(); x.ellipse(n.fp[0], n.fp[1], 2.2*n.fp[2], 1.1*n.fp[2], 0, 0, Math.PI*2); x.fill(); x.globalAlpha = 1;
  });
  // links
  MIND.links.forEach(function(l){
    const a = l.a.sp, b = l.b.sp, act = (hov && (l.a===hov || l.b===hov)); if(a[2] <= 0 || b[2] <= 0) return;
    const al = Math.min(dim(l.a), dim(l.b))*(l.kind==='cross' ? 0.3 : l.kind==='spine' ? 0.22 : 0.22)*(act ? 3 : 1);
    if(al < 0.02) return;
    x.globalAlpha = Math.min(0.9, al); x.strokeStyle = act ? r73Hex(l.b.color || '#FFFFFF', 1) : l.kind==='cross' ? '#94A3B8' : r73Hex(l.b.color || '#94A3B8', 1); x.lineWidth = (act ? 1.6 : 1)*Math.min(1.4, (a[2] + b[2])/2);
    x.setLineDash(l.kind==='cross' ? [3, 5] : l.b.neglected ? [4, 4] : []);
    const mx = (a[0] + b[0])/2, my = (a[1] + b[1])/2, dx = b[0] - a[0], dy = b[1] - a[1];
    x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo(mx - dy*0.12, my + dx*0.12, b[0], b[1]); x.stroke();
    // a mote travelling along the spines
    if(l.kind==='spine' && !calm){ const p = ((t*0.25 + (l.b.ph || 0)) % 1); const qx = (1-p)*(1-p)*a[0] + 2*(1-p)*p*(mx - dy*0.12) + p*p*b[0], qy = (1-p)*(1-p)*a[1] + 2*(1-p)*p*(my + dx*0.12) + p*p*b[1]; x.globalAlpha = al*2.5; x.fillStyle = l.b.color; x.beginPath(); x.arc(qx, qy, 1.6, 0, Math.PI*2); x.fill(); }
  });
  x.setLineDash([]); x.globalAlpha = 1;
  // the locked-in beam
  if(live==='locked' || live==='shooting'){
    const tgt = MIND.nodes.find(function(n){ return n.now; }) || MIND.byId['s:focus'];
    if(tgt && tgt.sp[2] > 0 && MIND.byId.op.sp[2] > 0){ const a = MIND.byId.op.sp, b = tgt.sp; const g = x.createLinearGradient(a[0], a[1], b[0], b[1]); g.addColorStop(0, r73Hex(L.c, 0.95)); g.addColorStop(1, r73Hex(L.c, 0.25));
      x.strokeStyle = g; x.lineWidth = 2.6; x.shadowColor = L.c; x.shadowBlur = 18; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.shadowBlur = 0;
      for(let i = 0; i < 3; i++){ const p = ((t*0.6) + i/3) % 1; x.fillStyle = '#fff'; x.beginPath(); x.arc(a[0] + (b[0] - a[0])*p, a[1] + (b[1] - a[1])*p, 2, 0, Math.PI*2); x.fill(); } }
  }
  // far to near: glow, then body
  const order = MIND.nodes.filter(function(n){ return n.sp[2] > 0; }).sort(function(a, b){ return b.sp[3] - a.sp[3]; });
  order.forEach(function(n){
    if(n.kind==='op'){ r76Op(x, n, t, k, calm, live, L, bootE); return; }
    const s = n.sp, sc = s[2], r = Math.max(2.5, n.r*k*sc), a = dim(n)*bootE; if(a < 0.02) return;
    // glow
    const lit = n.kind==='personal' ? (n.lit ? 0.5 : 0.18) : n.neglected ? 0.1 : n.kind==='sector' ? 0.5 : 0.34;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = a*(MIND.sel===n || MIND.hover===n ? 0.9 : lit);
    const sz = r*(n.kind==='sector' ? 5.5 : 3.8); x.drawImage(r73GlowSprite(n.color), s[0] - sz/2, s[1] - sz/2, sz, sz);
    x.globalCompositeOperation = 'source-over';
    // body: a lit sphere (sectors) or the kind's shape with a soft shade
    x.globalAlpha = a;
    if(n.kind==='sector'){ r78Planet(x, n, s, r, a, t); } else {
      r73Shape(x, n, s[0], s[1], r);
      const g = x.createRadialGradient(s[0] - r*0.3, s[1] - r*0.3, 0, s[0], s[1], r*1.2); g.addColorStop(0, r73Hex(n.color, 0.45)); g.addColorStop(1, '#0B0F19');
      x.fillStyle = g; x.fill(); x.lineWidth = MIND.sel===n ? 2.2 : 1.3; x.strokeStyle = n.color; x.stroke();
    }
    if(n.kind==='task'){ if(n.now){ x.fillStyle = n.color; x.beginPath(); x.arc(s[0], s[1], r*0.45, 0, Math.PI*2); x.fill(); } if(n.late){ x.strokeStyle = '#FF6B6B'; x.beginPath(); x.arc(s[0], s[1], r + 3, 0, Math.PI*2); x.stroke(); } }
    if(n.kind==='content' && n.frac!=null) r73Arc(x, s[0], s[1], r + 4, n.frac, n.color, 2, a);
    if(n.kind==='personal' && n.lit){ x.fillStyle = n.color; x.beginPath(); x.arc(s[0], s[1], r*0.35, 0, Math.PI*2); x.fill(); }
    if(n.kind==='xp' && n.claim){ x.strokeStyle = '#F5C451'; x.globalAlpha = a*(0.5 + 0.5*Math.sin(t*3)); x.beginPath(); x.arc(s[0], s[1], r + 7, 0, Math.PI*2); x.stroke(); }
    if(n.kind==='event' && n.today){ x.fillStyle = n.color; x.fillRect(s[0] - r*0.3, s[1] - r*0.3, r*0.6, r*0.6); }
    if(n.neglected && !calm){ const p = ((t + n.ph)/4.5) % 1; x.globalAlpha = a*(1 - p)*0.7; x.strokeStyle = '#F59E0B'; x.lineWidth = 1.2; x.beginPath(); x.arc(s[0], s[1], r + 4 + p*18*k*sc, 0, Math.PI*2); x.stroke(); }
    x.globalAlpha = 1;
    if(n.imp || n.impN) r78Beacon(x, n, s, r, a, t, calm);
  });
  // labels: important ones win, never on top of each other, far ones only when there's room
  const placed = [];
  const lorder = MIND.nodes.filter(function(n){ return n.kind!=='op' && n.sp[2] > 0; }).sort(function(a, b){
    const pa = (MIND.hover===a || MIND.sel===a ? -10 : 0) + (hov && near[a.id] ? -5 : 0) + a.tier - a.sp[2], pb = (MIND.hover===b || MIND.sel===b ? -10 : 0) + (hov && near[b.id] ? -5 : 0) + b.tier - b.sp[2]; return pa - pb; });
  x.font = '500 10px "JetBrains Mono", ui-monospace, Menlo, monospace';
  lorder.forEach(function(n){
    const s = n.sp, a0 = dim(n)*bootE, isH = MIND.hover===n || MIND.sel===n, kk = k*s[2];
    let show = n.tier===1 || isH || n.imp || (n.tier===2 && kk > 0.62) || (n.tier===3 && kk > 1.15) || (hov && near[n.id] && kk > 0.5);
    const ly = s[1] + Math.max(3, n.r*kk) + (n.kind==='sector' ? 12 : 6);
    if(show){
      const txt = String(n.label || '').slice(0, 26), w = txt.length*6.1 + 14, box = [s[0] - w/2, ly - 2, s[0] + w/2, ly + 16 + (isH && n.sub ? 18 : 0)];
      if(!isH && placed.some(function(p){ return box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]; })) show = false; else placed.push(box);
    }
    n.la = (n.la || 0) + ((show ? 1 : 0) - (n.la || 0))*0.3;
    if(n.la < 0.05) return;
    r73Label(x, n.label, s[0], ly, n.tier===1 ? 11 : 10, n.tier===1 ? n.color : '#E2E8F0', a0*n.la, n.tier===1);
    if(isH && n.sub) r73Label(x, n.sub, s[0], ly + 18, 10, '#94A3B8', a0*n.la);
  });
  // sparks into Op, and the ping when they land
  MIND.sparks = MIND.sparks.filter(function(sp){
    const p = Math.min(1, (now - sp.t0)/420), e = 1 - Math.pow(1 - p, 3), o2 = MIND.byId.op.sp;
    const a = sp.from || o2, px = a[0] + (o2[0] - a[0])*e, py = a[1] + (o2[1] - a[1])*e;
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1 - p*0.3; const gz = 26; x.drawImage(r73GlowSprite(sp.c), px - gz/2, py - gz/2, gz, gz);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 2.5, 0, Math.PI*2); x.fill(); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if(p >= 1){ MIND.pings.push({t0:now, c:sp.c}); return false; } return true;
  });
  MIND.pings = MIND.pings.filter(function(pg){ const p = (now - pg.t0)/700; if(p >= 1) return false; const s = MIND.byId.op.sp; x.globalAlpha = 1 - p; x.strokeStyle = pg.c; x.lineWidth = 2; x.beginPath(); x.ellipse(s[0], s[1], (46 + p*60)*k*s[2], (46 + p*60)*k*s[2]*Math.abs(Math.sin(MIND.pitch)), 0, 0, Math.PI*2); x.stroke(); x.globalAlpha = 1; return true; });
};
// Op: a lit orb with a halo on the disk, his rings tilted with the floor, his state under him
function r76Op(x, n, t, k, calm, live, L, bootE){
  if(!n.sp || !(n.sp[2] > 0)) return;
  const s = n.sp, br = calm ? 1 : 1 + Math.sin(t*1.13)*0.035, r = 46*k*s[2]*br*Math.max(0.2, bootE);
  const opSt = typeof AI!=='undefined' ? (AI.listening ? 'listen' : AI.busy ? 'think' : (typeof OV!=='undefined' && OV.idx >= 0) ? 'speak' : '') : '';
  const oc = opSt==='listen' ? '#38BDF8' : opSt==='think' ? '#C084FC' : (live==='locked' || live==='shooting' || live==='break') ? L.c : live==='asleep' ? '#6366F1' : '#38BDF8';
  const tilt = Math.abs(Math.sin(MIND.pitch));
  r78Sun(x, s, r, t, calm, oc, opSt);
  // his rings lie on the disk: today's deep work inside, your level outside
  const dw = (typeof deepWorkMinutesTodayLive==='function' ? deepWorkMinutesTodayLive() || 0 : 0), tg = Number(state.standards && state.standards.deepWorkTargetMinutes) || 180;
  let xs = null; try{ xs = xpSummary(); }catch(e){}
  const ring = function(rad, frac, color, w){
    x.lineWidth = w; x.strokeStyle = 'rgba(255,255,255,0.1)'; x.beginPath(); x.ellipse(s[0], s[1], rad, rad*tilt, 0, 0, Math.PI*2); x.stroke();
    if(frac > 0){ x.strokeStyle = color; x.lineCap = 'round'; x.beginPath(); x.ellipse(s[0], s[1], rad, rad*tilt, 0, -Math.PI/2, -Math.PI/2 + Math.PI*2*Math.min(1, frac)); x.stroke(); x.lineCap = 'butt'; }
  };
  x.globalAlpha = bootE;
  ring(r + 22*k*s[2] + 6, dw/tg, '#FF6B2C', 3);
  ring(r + 40*k*s[2] + 10, xs ? (xs.canLevel ? 1 : xs.levelPct || 0) : 0, xs && xs.canLevel ? '#F5C451' : '#FDE047', 2);
  x.globalAlpha = 1;
  const as = state.focus.activeSession, m = state.modes.active;
  const since = as ? (as.onBreak ? (arr(as.breaks).slice(-1)[0] || {}).start || as.startedAt : as.startedAt) : m && m.startedAt ? m.startedAt : null;
  const tm = since ? (function(){ const sec = Math.max(0, Math.floor((Date.now() - since)/1000)); return String(Math.floor(sec/3600)).padStart(2, '0')+':'+String(Math.floor(sec/60) % 60).padStart(2, '0')+':'+String(sec % 60).padStart(2, '0'); })() : '';
  x.textAlign = 'center'; x.textBaseline = 'top';
  const yy = s[1] + r + 26;
  x.font = '600 11px "JetBrains Mono", ui-monospace, Menlo, monospace'; x.fillStyle = r73Hex(L.c, 0.95); x.fillText(L.label.split('').join(' '), s[0], yy);
  if(tm){ x.font = '700 '+Math.round(Math.max(22, 40*Math.min(1.2, k)))+'px "Space Grotesk", "SF Pro Display", -apple-system, sans-serif'; x.fillStyle = '#F8FAFC'; x.fillText(tm, s[0], yy + 16); }
}

// ---- turning it: drag to spin and tilt, Shift/right-drag to slide, scroll to zoom ----
r73Wire = function(c){
  c.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  c.addEventListener('wheel', function(e){
    e.preventDefault(); MIND.fly = null;
    const f = Math.exp(-e.deltaY*(e.ctrlKey ? 0.01 : 0.0018)), k2 = Math.max(0.35, Math.min(5.5, MIND.cam.k*f));
    const w = r73S2W(e.offsetX, e.offsetY), pull = (k2 - MIND.cam.k)/k2*0.6;
    MIND.cam.x += (w[0] - MIND.cam.x)*pull; MIND.cam.y += (w[1] - MIND.cam.y)*pull; MIND.cam.k = k2;
  }, {passive:false});
  c.addEventListener('pointerdown', function(e){
    MIND.drag = {x:e.clientX, y:e.clientY, lx:e.clientX, cx:MIND.cam.x, cy:MIND.cam.y, yaw:MIND.yaw, pitch:MIND.pitch, pan:e.shiftKey || e.button===2 || e.button===1, moved:false, vt:0};
    MIND.spin = 0; c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', function(e){
    const d = MIND.drag;
    if(d){
      const dx = e.clientX - d.x, dy = e.clientY - d.y; if(Math.abs(dx) + Math.abs(dy) > 4){ d.moved = true; MIND.fly = null; }
      if(d.moved){
        if(d.pan){
          const cy = Math.cos(MIND.yaw), sy = Math.sin(MIND.yaw), sp = Math.sin(MIND.pitch) || -1, kk = MIND.cam.k, rx = dx/kk, rz = -(dy/kk)/sp;
          MIND.cam.x = d.cx - (rx*cy + rz*sy); MIND.cam.y = d.cy - (-rx*sy + rz*cy);
        } else {
          MIND.yaw = d.yaw + dx*0.006; MIND.pitch = Math.max(-1.5, Math.min(-0.2, d.pitch - dy*0.004));
          d.vt = (e.clientX - d.lx)*0.006*60; d.lx = e.clientX;
        }
      }
      c.style.cursor = 'grabbing'; return;
    }
    const n = r73Pick(e.offsetX, e.offsetY); if(n!==MIND.hover){ MIND.hover = n; if(n) r73Sound('hover'); c.style.cursor = n ? 'pointer' : 'grab'; }
  });
  c.addEventListener('pointerup', function(e){
    const d = MIND.drag; MIND.drag = null; c.style.cursor = 'grab';
    if(d && d.moved){ if(!d.pan && !r73Reduce()) MIND.spin = Math.max(-3, Math.min(3, d.vt)); return; }
    const n = r73Pick(e.offsetX, e.offsetY);
    if(!n){ r73Inspect(null); return; }
    MIND.lastPick = {n:n, at:performance.now()};
    r73Sound('select'); r73Inspect(n);
    // Round 79: a click picks it and glides to it; Open (on its card), a double-click or Enter opens it
    if(n.kind==='sector' && !r73Reduce()) r73FlyNode(n);
  });
  c.addEventListener('dblclick', function(e){
    // (the map moves between the two clicks, so the first click's pick counts)
    const lp = MIND.lastPick && performance.now() - MIND.lastPick.at < 700 ? MIND.lastPick.n : null;
    const n = lp || r73Pick(e.offsetX, e.offsetY); if(!n) return;
    if(n.kind==='sector'){ r78Open(n); return; }
    else if(n.kind==='task') openTaskEditModal(n.ref.id);
    else if(n.go) r73Dive(n.go);
    else if(n.kind==='op') ACTIONS.r73mOpType();
    else if(n.parent && n.parent.sector) r73Dive(n.parent.sector.dive);
  });
  window.addEventListener('resize', r73Size);
};
// the fit view looks a little further down into the disk; heights get rebuilt with the map
r73Fit = (function(base){ return function(){ base.apply(this, arguments); if(!r73Reduce()){ MIND.pitchTo = -0.42; } }; })(r73Fit);
r73MindBuild = (function(base){ return function(){ const r = base.apply(this, arguments); return r; }; })(r73MindBuild);

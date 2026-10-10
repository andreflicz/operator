// ============ MORE SCENES: Tokyo (today), Shanghai, Meadow ============
// Same rules as the others: the still world is painted once; x.more(c, dt, t, w, h) draws the few
// moving things (a train, neon, boats on the river, grass in the wind, fireflies).
SCENES.splice(SCENES.findIndex(function(s){ return s.id==='tokyo'; }), 0, {id:'neotokyo', label:'Tokyo'}, {id:'shanghai', label:'Shanghai'});
SCENES.splice(SCENES.findIndex(function(s){ return s.id==='snow'; }), 0, {id:'meadow', label:'Meadow'});

// lit windows on a block: a grid of small warm/cool lights
function sceneWindows(c, R, bx, top, bw, bottom, night, density, alpha){
  for(let wy = top + 7; wy < bottom - 4; wy += 8){
    for(let wx = bx + 4; wx < bx + bw - 4; wx += 6){
      if(R() > (night ? density : density*0.22)) continue;
      const warm = R() < 0.72;
      c.fillStyle = night ? (warm ? 'rgba(255,205,130,'+alpha+')' : 'rgba(170,215,255,'+alpha+')') : 'rgba(215,235,255,'+(alpha*0.35)+')';
      c.fillRect(wx, wy, 2.5, 3.5);
    }
  }
}
// a row of buildings across the whole width; returns their tops for signs / reflections
function sceneBlocks(c, w, h, R, opt){
  const out = []; let bx = -R()*30;
  while(bx < w){
    const bw = opt.minW + R()*opt.varW, bh = h*(opt.minH + R()*opt.varH), top = opt.base - bh;
    c.fillStyle = opt.col; c.fillRect(bx, top, bw, opt.base - top + 2);
    if(R() < 0.18){ c.fillRect(bx + bw*0.42, top - bh*0.12, Math.max(2, bw*0.08), bh*0.12); }
    if(opt.windows) sceneWindows(c, R, bx, top, bw, opt.base, opt.night, opt.density, opt.alpha);
    out.push({x:bx, w:bw, top:top});
    bx += bw + R()*opt.gap;
  }
  return out;
}

SCENE_DEFS.neotokyo = {
  paint: function(c, w, h, x){
    const hy = h*0.8, night = isDark(x.phase), land = LAND[x.phase];
    paintSky(c, w, h, x.phase, hy, 'clear');
    if(night) paintStars(c, w, hy, Math.round(w*h/5200), rng(61), x.phase==='night' ? 0.6 : 0.3);
    paintOrb(c, w, hy, x.phase, 'clear');
    // the city glow on the horizon
    const hz = c.createLinearGradient(0, h*0.35, 0, h*0.82);
    hz.addColorStop(0, 'rgba(255,90,170,0)'); hz.addColorStop(1, night ? 'rgba(255,90,170,.22)' : 'rgba(255,230,220,.18)');
    c.fillStyle = hz; c.fillRect(0, 0, w, h);
    // far towers
    sceneBlocks(c, w, h, rng(71), {base:h*0.8, minW:14, varW:34, minH:0.1, varH:0.24, gap:2, col:mixHex(land[0], land[1], 0.72), windows:night, night:night, density:0.18, alpha:0.4});
    // Tokyo Skytree
    const sx = vx(w, 0.8), sb = h*0.82, sh = h*0.62, st = sb - sh;
    const sc = night ? '#1a2240' : mixHex(land[0], '#e8eef6', 0.7);
    c.fillStyle = sc;
    c.beginPath(); c.moveTo(sx - w*0.016, sb); c.lineTo(sx - w*0.004, st + sh*0.2); c.lineTo(sx + w*0.004, st + sh*0.2); c.lineTo(sx + w*0.016, sb); c.closePath(); c.fill();
    c.fillRect(sx - w*0.0016, st, w*0.0032, sh*0.22);
    [[0.45, 0.012, 0.035], [0.27, 0.008, 0.02]].forEach(function(d){ c.fillRect(sx - w*d[1], st + sh*d[0], w*d[1]*2, sh*d[2]); });
    if(night){ c.fillStyle = 'rgba(140,170,255,.85)'; c.fillRect(sx - w*0.012, st + sh*0.45, w*0.024, 2); c.fillStyle = 'rgba(200,140,255,.85)'; c.fillRect(sx - w*0.008, st + sh*0.27, w*0.016, 2); }
    // Tokyo Tower: orange and white bands, a lattice A
    const tx = vx(w, 0.3), tb = h*0.84, th = h*0.4, tt = tb - th;
    const tw = function(f){ return w*0.045*Math.pow(1 - f, 1.6) + w*0.002; };
    for(let i=0;i<10;i++){
      const f0 = i/10, f1 = (i+1)/10;
      c.fillStyle = i%2 ? (night ? '#ff9b5a' : '#f2f2f2') : (night ? '#ff5a2a' : '#e2462a');
      c.beginPath(); c.moveTo(tx - tw(f0), tb - th*f0); c.lineTo(tx - tw(f1), tb - th*f1); c.lineTo(tx + tw(f1), tb - th*f1); c.lineTo(tx + tw(f0), tb - th*f0); c.closePath(); c.fill();
    }
    c.fillStyle = night ? '#ffd2a0' : '#d8d8d8'; c.fillRect(tx - tw(0.42)*1.3, tb - th*0.42, tw(0.42)*2.6, th*0.035);
    c.fillStyle = night ? '#ff7a3a' : '#e2462a'; c.fillRect(tx - 1.2, tt - th*0.08, 2.4, th*0.08);
    if(night){ const g = c.createRadialGradient(tx, tb - th*0.4, 0, tx, tb - th*0.4, th*0.7); g.addColorStop(0, 'rgba(255,120,60,.22)'); g.addColorStop(1, 'rgba(255,120,60,0)'); c.fillStyle = g; c.fillRect(tx - th, tb - th*1.2, th*2, th*1.4); }
    // near blocks with neon
    const near = sceneBlocks(c, w, h, rng(83), {base:h*0.9, minW:30, varW:60, minH:0.08, varH:0.16, gap:6, col:mixHex(land[0], '#000000', 0.25), windows:true, night:night, density:0.34, alpha:0.85});
    x.neon = [];
    const NEON = ['#ff3d8b', '#3de0ff', '#ffd23d', '#b06bff', '#3dff9e'];
    const R = rng(97);
    near.forEach(function(b){
      if(R() < 0.55){
        const nx = b.x + 4 + R()*Math.max(4, b.w - 18), ny = b.top + 6 + R()*20, vertical = R() < 0.6;
        x.neon.push({x:nx, y:ny, w:vertical ? 7 : 26 + R()*20, h:vertical ? 30 + R()*30 : 9, col:NEON[Math.floor(R()*NEON.length)], p:R()*6, flick:R() < 0.25});
      }
    });
    // the elevated railway
    x.railY = h*0.885;
    c.fillStyle = mixHex(land[0], '#000000', 0.45);
    c.fillRect(0, x.railY + 6, w, 4);
    for(let px = 20; px < w; px += 90) c.fillRect(px, x.railY + 8, 5, h - x.railY);
    c.fillStyle = mixHex(land[0], '#000000', 0.5); c.fillRect(0, h*0.95, w, h*0.05);
    veil(c, w, h);
  },
  init: function(x){
    const night = isDark(x.phase);
    x.clouds = cloudLayer(x, night ? 2 : 4, 'soft', 0.4);
    if(night) x.twinkle = twinkleLayer(x, 24, 0.6);
    x.cars = carLayer(x, night ? 10 : 6);
    x.train = {x:-400, v:120, next:1.5, cars:5};
    x.more = function(c, dt, t, w, h){
      const nightNow = isDark(x.phase);
      // neon: a soft glow, a few that flicker
      if(nightNow || x.phase==='golden') x.neon.forEach(function(n){
        let a = 0.75 + 0.2*Math.sin(t/700 + n.p);
        if(n.flick && Math.sin(t/90 + n.p*7) > 0.93) a = 0.15;
        c.globalAlpha = a*0.35; c.fillStyle = n.col; c.fillRect(n.x - 4, n.y - 4, n.w + 8, n.h + 8);
        c.globalAlpha = a; c.fillRect(n.x, n.y, n.w, n.h);
      });
      c.globalAlpha = 1;
      // the train glides along the elevated line
      const tr = x.train;
      if(tr.next > 0){ tr.next -= dt; }
      else {
        tr.x += tr.v*dt;
        const len = tr.cars*58;
        for(let k=0;k<tr.cars;k++){
          const cx = tr.x - k*58;
          c.fillStyle = nightNow ? 'rgba(30,36,52,.95)' : 'rgba(225,232,240,.95)'; c.fillRect(cx, x.railY - 9, 54, 14);
          c.fillStyle = nightNow ? 'rgba(255,240,200,.9)' : 'rgba(60,140,90,.8)'; c.fillRect(cx, x.railY + 1, 54, 2);
          if(nightNow){ c.fillStyle = 'rgba(255,236,190,.85)'; for(let wx = cx + 4; wx < cx + 50; wx += 9) c.fillRect(wx, x.railY - 6, 6, 5); }
        }
        if(tr.x - len > w + 20){ tr.x = -60; tr.next = 6 + Math.random()*8; }
      }
    };
  }
};

SCENE_DEFS.shanghai = {
  paint: function(c, w, h, x){
    const hy = h*0.74, night = isDark(x.phase), land = LAND[x.phase];
    paintSky(c, w, h, x.phase, hy, 'clear');
    if(night) paintStars(c, w, hy, Math.round(w*h/5000), rng(131), x.phase==='night' ? 0.6 : 0.3);
    paintOrb(c, w, hy, x.phase, 'clear');
    const bank = h*0.78;
    const far = mixHex(land[0], land[1], 0.7), mid = mixHex(land[0], land[1], 0.38), dark = mixHex(land[0], '#000000', 0.15);
    sceneBlocks(c, w, h, rng(141), {base:bank, minW:16, varW:36, minH:0.06, varH:0.16, gap:3, col:far, windows:night, night:night, density:0.2, alpha:0.45});
    const lights = [];
    // Shanghai Tower: the tallest, tapering with a twist
    const t1x = vx(w, 0.7), t1h = h*0.56, t1w = w*0.034;
    c.fillStyle = night ? '#16203a' : mixHex(land[0], '#cfe0ee', 0.62);
    c.beginPath(); c.moveTo(t1x - t1w, bank); c.bezierCurveTo(t1x - t1w*0.95, bank - t1h*0.5, t1x - t1w*0.55, bank - t1h*0.85, t1x - t1w*0.12, bank - t1h); c.lineTo(t1x + t1w*0.3, bank - t1h*0.97); c.bezierCurveTo(t1x + t1w*0.7, bank - t1h*0.7, t1x + t1w, bank - t1h*0.4, t1x + t1w, bank); c.closePath(); c.fill();
    c.strokeStyle = night ? 'rgba(120,200,255,.5)' : 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(t1x + t1w*0.9, bank); c.bezierCurveTo(t1x + t1w*0.2, bank - t1h*0.35, t1x - t1w*0.6, bank - t1h*0.6, t1x - t1w*0.1, bank - t1h*0.98); c.stroke();
    lights.push([t1x, '#78c8ff']);
    // SWFC — the "bottle opener"
    const t2x = vx(w, 0.6), t2h = h*0.49, t2w = w*0.028;
    c.fillStyle = night ? '#141c34' : mixHex(land[0], '#dbe6ef', 0.55);
    c.beginPath(); c.moveTo(t2x - t2w, bank); c.lineTo(t2x - t2w*0.45, bank - t2h); c.lineTo(t2x + t2w*0.45, bank - t2h); c.lineTo(t2x + t2w, bank); c.closePath(); c.fill();
    c.fillStyle = night ? 'rgba(10,14,30,1)' : mixHex(SKY_PAL[x.phase][1], '#ffffff', 0.1);
    c.beginPath(); c.moveTo(t2x - t2w*0.36, bank - t2h*0.97); c.lineTo(t2x + t2w*0.36, bank - t2h*0.97); c.lineTo(t2x + t2w*0.3, bank - t2h*0.88); c.lineTo(t2x - t2w*0.3, bank - t2h*0.88); c.closePath(); c.fill();
    lights.push([t2x, '#a0c8ff']);
    // Jin Mao: stepped, pagoda-like
    const t3x = vx(w, 0.53), t3h = h*0.42;
    c.fillStyle = night ? '#1a1a30' : mixHex(land[0], '#c8d2dc', 0.5);
    for(let i=0;i<12;i++){ const f = i/12, ww = w*0.022*(1 - f*0.75); c.fillRect(t3x - ww, bank - t3h*(f + 1/12), ww*2, t3h/12 + 1); }
    c.fillRect(t3x - 1.5, bank - t3h*1.14, 3, t3h*0.14);
    lights.push([t3x, '#ffd28a']);
    // Oriental Pearl Tower: three legs, three spheres
    const px = vx(w, 0.3), ph = h*0.5, top = bank - ph;
    const pc = night ? '#2a1830' : mixHex(land[0], '#b8a4b8', 0.5);
    c.strokeStyle = pc; c.lineWidth = Math.max(3, w*0.004);
    [-1, 0, 1].forEach(function(s){ c.beginPath(); c.moveTo(px + s*w*0.02, bank); c.lineTo(px + s*w*0.004, bank - ph*0.62); c.stroke(); });
    c.fillStyle = pc; c.fillRect(px - 2, bank - ph*0.9, 4, ph*0.3);
    c.fillRect(px - 1, top - ph*0.12, 2, ph*0.22);
    const pearl = function(cy, r){
      const g = c.createRadialGradient(px - r*0.35, cy - r*0.35, r*0.1, px, cy, r);
      g.addColorStop(0, night ? '#ffb3d6' : '#f2a6c0'); g.addColorStop(1, night ? '#c8306e' : '#a84466');
      c.fillStyle = g; c.beginPath(); c.arc(px, cy, r, 0, Math.PI*2); c.fill();
      if(night){ const gl = c.createRadialGradient(px, cy, r, px, cy, r*3); gl.addColorStop(0, 'rgba(255,90,170,.28)'); gl.addColorStop(1, 'rgba(255,90,170,0)'); c.fillStyle = gl; c.fillRect(px - r*3, cy - r*3, r*6, r*6); }
    };
    pearl(bank - ph*0.3, h*0.036); pearl(bank - ph*0.66, h*0.026); pearl(bank - ph*0.86, h*0.012);
    lights.push([px, '#ff6fb0']);
    // nearer blocks on the bank
    sceneBlocks(c, w, h, rng(151), {base:bank, minW:24, varW:44, minH:0.04, varH:0.1, gap:5, col:dark, windows:true, night:night, density:0.3, alpha:0.8});
    // the Huangpu: water, and the city's lights stretched across it
    const wg = c.createLinearGradient(0, bank, 0, h);
    wg.addColorStop(0, night ? '#0b1428' : mixHex(SKY_PAL[x.phase][2], '#1d3a52', 0.55)); wg.addColorStop(1, night ? '#04070f' : mixHex(SKY_PAL[x.phase][1], '#0e1e2e', 0.7));
    c.fillStyle = wg; c.fillRect(0, bank, w, h - bank);
    x.reflections = [];
    const R = rng(171);
    for(let i=0;i<70;i++){
      const lx = R()*w, col = night ? (R() < 0.6 ? '255,200,120' : '160,200,255') : '255,255,255';
      x.reflections.push({x:lx, y:bank + 4 + R()*(h - bank)*0.75, len:6 + R()*20, col:col, p:R()*6, a:night ? 0.35 + R()*0.4 : 0.12 + R()*0.12});
    }
    lights.forEach(function(l){ for(let k=0;k<6;k++) x.reflections.push({x:l[0] + (R()-0.5)*14, y:bank + 6 + k*((h - bank)/7), len:14 + R()*16, col:hexRgb(l[1]).join(','), p:R()*6, a:night ? 0.55 : 0.15}); });
    // the Bund promenade lamps
    c.fillStyle = mixHex(land[0], '#000000', 0.5); c.fillRect(0, h*0.965, w, h*0.035);
    x.lamps = []; for(let lx = 24; lx < w; lx += 110) x.lamps.push(lx);
    veil(c, w, h);
  },
  init: function(x){
    const night = isDark(x.phase);
    x.clouds = cloudLayer(x, night ? 2 : 4, 'soft', 0.4);
    if(night) x.twinkle = twinkleLayer(x, 22, 0.55);
    x.boats = [{x:Math.random()*x.w, y:x.h*0.86, v:14, dir:1}, {x:Math.random()*x.w, y:x.h*0.92, v:10, dir:-1}];
    x.more = function(c, dt, t, w, h){
      const nightNow = isDark(x.phase);
      // reflections shimmer
      x.reflections.forEach(function(r){ const a = r.a*(0.55 + 0.45*Math.sin(t/600 + r.p)); c.fillStyle = 'rgba('+r.col+','+a.toFixed(3)+')'; c.fillRect(r.x + Math.sin(t/900 + r.p)*2, r.y, r.len, 1.4); });
      // boats drift by
      x.boats.forEach(function(b){
        b.x += b.v*b.dir*dt; if(b.x > w + 80) b.x = -80; if(b.x < -80) b.x = w + 80;
        c.fillStyle = nightNow ? 'rgba(20,24,40,.95)' : 'rgba(240,240,236,.95)'; c.fillRect(b.x, b.y - 5, 56, 7);
        c.fillStyle = nightNow ? 'rgba(255,214,140,.9)' : 'rgba(180,60,50,.85)'; c.fillRect(b.x + 10, b.y - 10, 30, 5);
        if(nightNow){ for(let k=0;k<5;k++){ c.fillStyle = 'rgba(255,214,140,'+(0.25 - k*0.04).toFixed(2)+')'; c.fillRect(b.x + 10, b.y + 3 + k*4, 30, 1.5); } }
      });
      if(nightNow) x.lamps.forEach(function(lx, i){ const a = 0.5 + 0.12*Math.sin(t/500 + i); const g = c.createRadialGradient(lx, h*0.965, 0, lx, h*0.965, 26); g.addColorStop(0, 'rgba(255,200,120,'+a.toFixed(2)+')'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(lx - 26, h*0.965 - 26, 52, 52); });
    };
  }
};

SCENE_DEFS.meadow = {
  paint: function(c, w, h, x){
    const hy = h*0.64, night = isDark(x.phase);
    paintSky(c, w, h, x.phase, hy, 'clear');
    if(night) paintStars(c, w, hy, Math.round(w*h/2400), rng(201), x.phase==='night' ? 1 : 0.4);
    paintOrb(c, w, hy, x.phase, 'clear');
    const G = night ? ['#0c1a1a', '#10241c', '#143022', '#183a28'] : x.phase==='golden' ? ['#7d8a5a', '#6c8a40', '#5a8a30', '#4a7f28'] : x.phase==='dawn' ? ['#3d4a5a', '#3a5a48', '#36603e', '#2e5a34'] : ['#8fb0b8', '#79a860', '#5f9a3e', '#4c8c30'];
    ridge(c, w, h, h*0.64, h*0.05, rng(211), G[0], 0.3);
    ridge(c, w, h, h*0.72, h*0.06, rng(223), G[1], 0.5);
    // a lone tree on the hill
    const tx = vx(w, 0.72), ty = h*0.73, tr = Math.min(w, h)*0.06;
    c.fillStyle = night ? '#0a120e' : '#3d2c1e'; c.fillRect(tx - tr*0.08, ty - tr*0.9, tr*0.16, tr*0.95);
    const R0 = rng(233);
    for(let i=0;i<14;i++){ const ax = tx + (R0()-0.5)*tr*1.6, ay = ty - tr*(1.1 + R0()*0.8), r = tr*(0.35 + R0()*0.3); c.fillStyle = night ? 'rgba(14,30,22,.95)' : 'rgba('+(46 + R0()*20|0)+','+(100 + R0()*30|0)+','+(40 + R0()*14|0)+',.95)'; c.beginPath(); c.arc(ax, ay, r, 0, Math.PI*2); c.fill(); }
    ridge(c, w, h, h*0.82, h*0.05, rng(241), G[2], 0.7);
    // the near field, lighter at the top where the light hits it
    const fg = c.createLinearGradient(0, h*0.84, 0, h);
    fg.addColorStop(0, G[3]); fg.addColorStop(1, mixHex(G[3], '#000000', 0.35));
    c.fillStyle = fg; c.beginPath(); c.moveTo(0, h);
    for(let px = 0; px <= w; px += 8) c.lineTo(px, h*0.88 - Math.sin(px/w*Math.PI*1.4 + 0.6)*h*0.03);
    c.lineTo(w, h); c.closePath(); c.fill();
    // wildflowers
    const R = rng(251), cols = night ? ['rgba(200,200,230,.35)'] : ['#ffffff', '#ffd84d', '#ff8fb4', '#b48cff', '#ff9a4d'];
    for(let i=0;i<Math.round(w/5);i++){ const fx = R()*w, fy = h*0.86 + R()*h*0.13; c.fillStyle = cols[Math.floor(R()*cols.length)]; c.beginPath(); c.arc(fx, fy, 1.2 + R()*1.8, 0, Math.PI*2); c.fill(); }
    x.grassCol = night ? ['#16301f', '#1c3a26'] : [mixHex(G[3], '#1e4a14', 0.3), mixHex(G[3], '#9ad06a', 0.25)];
    veil(c, w, h);
  },
  init: function(x){
    const night = isDark(x.phase);
    x.clouds = cloudLayer(x, night ? 2 : 5, 'soft', 0.55);
    if(night){ x.twinkle = twinkleLayer(x, 70, 0.6); }
    // grass along the bottom edge, swaying
    const R = rng(271); x.grass = [];
    for(let gx = 0; gx < x.w; gx += 5){ x.grass.push({x:gx + R()*4, h:x.h*(0.03 + R()*0.05), p:R()*6, col:R() < 0.5 ? 0 : 1, lean:(R()-0.5)*6}); }
    x.flies = night ? Array.from({length:26}, function(){ return {x:Math.random()*x.w, y:x.h*(0.72 + Math.random()*0.24), vx:(Math.random()-0.5)*14, vy:(Math.random()-0.5)*8, p:Math.random()*6}; }) : [];
    x.more = function(c, dt, t, w, h){
      // a slow breeze moves through the grass from left to right
      c.lineWidth = 1.6; c.lineCap = 'round';
      [0, 1].forEach(function(ci){
        c.strokeStyle = x.grassCol[ci]; c.beginPath();
        x.grass.forEach(function(g){ if(g.col!==ci) return; const sway = Math.sin(t/1400 - g.x/180 + g.p)*g.h*0.28 + g.lean; c.moveTo(g.x, h); c.quadraticCurveTo(g.x + sway*0.3, h - g.h*0.6, g.x + sway, h - g.h); });
        c.stroke();
      });
      x.flies.forEach(function(f){
        f.x += f.vx*dt + Math.sin(t/900 + f.p)*0.3; f.y += f.vy*dt + Math.cos(t/1100 + f.p)*0.2;
        if(f.x < 0) f.x = w; if(f.x > w) f.x = 0; if(f.y < h*0.68 || f.y > h*0.98) f.vy *= -1;
        const a = Math.max(0, Math.sin(t/700 + f.p*3));
        const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9); g.addColorStop(0, 'rgba(220,255,140,'+(0.9*a).toFixed(2)+')'); g.addColorStop(1, 'rgba(220,255,140,0)');
        c.fillStyle = g; c.fillRect(f.x - 9, f.y - 9, 18, 18);
      });
    };
  }
};


// ============ SCENES ============
// Optional living backgrounds behind the app. Minimal (no scene) stays the default; the others paint
// a slow, quiet world behind the panels that follows the real time of day — and in Sky, the live
// weather. Two canvases: the still world (sky, mountains, skyline…) is painted once into the back
// layer; only the few moving things (twinkles, clouds, snow, petals, lights) are redrawn on the
// front layer, at most ~30 times a second, and nothing runs while Operator isn't the window in front.
const SCENES = [
  {id:'minimal', label:'Minimal'},
  {id:'sky', label:'Sky', sub:'live weather'},
  {id:'space', label:'Space'},
  {id:'city', label:'City'},
  {id:'mountains', label:'Mountains'},
  {id:'tokyo', label:'Kyoto'},
  {id:'snow', label:'Snow'}
];
function sceneId(){ const id = state.profile.scene || 'minimal'; if(id.indexOf('vid:')===0) return videoWallById(id.slice(4)) ? id : 'minimal'; return SCENES.some(function(s){ return s.id===id; }) ? id : 'minimal'; }
function sceneAnimates(){ return state.profile.sceneAnimate!==false && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function rng(seed){ let a = seed>>>0; return function(){ a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1 | a); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14)>>>0) / 4294967296; }; }
function hexRgb(h){ const n = parseInt(h.slice(1), 16); return [n>>16 & 255, n>>8 & 255, n & 255]; }
function mixHex(a, b, t){ const x = hexRgb(a), y = hexRgb(b); return 'rgb('+Math.round(x[0]+(y[0]-x[0])*t)+','+Math.round(x[1]+(y[1]-x[1])*t)+','+Math.round(x[2]+(y[2]-x[2])*t)+')'; }
function rgba(h, a){ const x = hexRgb(h); return 'rgba('+x[0]+','+x[1]+','+x[2]+','+a+')'; }
const SKY_PAL = {night:['#03050d','#0a1230','#1d2b52'], dawn:['#151d45','#6b5a90','#f2a585'], morning:['#4a96d6','#a3cff0','#ffe1b8'],
  day:['#2c7bd4','#76b3ec','#cfe6fa'], golden:['#2b4b8f','#df8e6c','#ffd07c'], dusk:['#0e1332','#4d3870','#d77769']};
// [near, far] land colors for each time of day — far layers fade into the horizon haze
const LAND = {night:['#04060c','#1a2440'], dawn:['#17152c','#7a6b98'], morning:['#20304a','#9fbcd8'], day:['#203750','#97b9da'], golden:['#24192a','#c58873'], dusk:['#0a0b19','#4b3a66']};
function isDark(phase){ return phase==='night' || phase==='dusk' || phase==='dawn'; }
function moonFraction(d){ const days = (d - Date.UTC(2000,0,6,18,14)) / 86400000; return ((days % 29.530589) + 29.530589) % 29.530589 / 29.530589; }
// where the sun (or the moon) sits right now on a w×h canvas with the horizon at hy
let sceneLeft = 0; // the sidebar covers the left edge — landmarks go in the part you can see
function vx(w, f){ return sceneLeft + (w - sceneLeft)*f; }
function celestial(w, hy){
  const d = new Date(), m = d.getHours()*60 + d.getMinutes(), win = dayWindow(d);
  if(m >= win.rise-30 && m <= win.set+30){
    const f = (m - win.rise) / Math.max(60, win.set - win.rise);
    return {sun:true, x:vx(w, 0.08 + 0.84*f), y:hy - Math.sin(Math.PI*Math.max(0, Math.min(1, f)))*hy*0.8 + (f<0 || f>1 ? 12 : 0)};
  }
  const len = (1440 - win.set) + win.rise, into = m >= win.set ? m - win.set : m + 1440 - win.set, f = into/len;
  return {sun:false, x:vx(w, 0.1 + 0.8*f), y:hy - Math.sin(Math.PI*f)*hy*0.72};
}
// ---- painters ----
function paintSky(c, w, h, phase, hy, wx){
  let pal = SKY_PAL[phase];
  if(wx==='cloudy' || wx==='rain' || wx==='storm' || wx==='fog' || wx==='drizzle' || wx==='snow'){
    const grey = isDark(phase) ? '#141820' : '#8d97a6';
    pal = pal.map(function(col, i){ return mixHex(col, grey, i===2 ? 0.55 : 0.45); });
  }
  const g = c.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, typeof pal[0]==='string' && pal[0][0]==='#' ? pal[0] : pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function paintStars(c, w, hy, n, R, alpha){
  for(let i=0;i<n;i++){
    const x = R()*w, y = R()*hy*0.92, s = R();
    c.fillStyle = 'rgba(255,255,255,'+(alpha*(0.25 + 0.75*s*s)).toFixed(3)+')';
    c.fillRect(x, y, s>0.93 ? 2 : 1, s>0.93 ? 2 : 1);
  }
}
function paintOrb(c, w, hy, phase, wx){
  if(wx==='cloudy' || wx==='rain' || wx==='storm' || wx==='fog' || wx==='drizzle' || wx==='snow') return;
  const o = celestial(w, hy), r = Math.max(10, Math.min(w, hy)*0.035);
  if(o.sun){
    const warm = phase==='golden' || phase==='dawn' || phase==='morning';
    const glow = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r*7);
    glow.addColorStop(0, warm ? 'rgba(255,214,140,.55)' : 'rgba(255,250,230,.5)'); glow.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(o.x, o.y, r*7, 0, Math.PI*2); c.fill();
    const core = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r*1.3); core.addColorStop(0, warm ? 'rgba(255,224,160,1)' : 'rgba(255,252,236,.95)'); core.addColorStop(0.6, warm ? 'rgba(255,213,138,.8)' : 'rgba(255,248,225,.55)'); core.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = core; c.beginPath(); c.arc(o.x, o.y, r*1.3, 0, Math.PI*2); c.fill();
  } else {
    const glow = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r*5);
    glow.addColorStop(0, 'rgba(200,215,255,.22)'); glow.addColorStop(1, 'rgba(200,215,255,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(o.x, o.y, r*5, 0, Math.PI*2); c.fill();
    c.fillStyle = '#e9eefc'; c.beginPath(); c.arc(o.x, o.y, r*0.8, 0, Math.PI*2); c.fill();
    // the moon's phase: a shadow disc slid across
    const f = moonFraction(Date.now()), off = (f < 0.5 ? 1 : -1) * r*0.8 * (1 - Math.abs(1 - f*2)) * 2;
    if(f > 0.03 && f < 0.97){ c.save(); c.beginPath(); c.arc(o.x, o.y, r*0.8, 0, Math.PI*2); c.clip(); c.fillStyle = 'rgba(8,12,28,.88)'; c.beginPath(); c.arc(o.x - off, o.y, r*0.8, 0, Math.PI*2); c.fill(); c.restore(); }
  }
}
function ridge(c, w, h, base, amp, R, col, rough){
  const pts = [], n = 9;
  const ph = [R()*6, R()*6, R()*6];
  c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
  for(let x=0; x<=w; x+=Math.max(4, w/220)){
    const t = x/w;
    let y = base - amp*(0.55*Math.sin(t*Math.PI*(1.3+rough) + ph[0]) + 0.3*Math.sin(t*Math.PI*(3.7+rough*2) + ph[1]) + 0.15*Math.sin(t*Math.PI*(9+rough*4) + ph[2]));
    c.lineTo(x, y);
  }
  c.lineTo(w, h); c.closePath(); c.fill();
  return pts;
}
function veil(c, w, h){ c.fillStyle = document.documentElement.getAttribute('data-theme')==='light' ? 'rgba(255,255,255,.10)' : 'rgba(4,6,12,.30)'; c.fillRect(0, 0, w, h); }
// A cloud: a soft shadow underneath, puffy lit tops, and a bright rim where the sun catches it.
function cloudSprite(size, tone, lit){
  const cv = document.createElement('canvas'); cv.width = Math.round(size*2.6); cv.height = Math.round(size*1.15);
  const c = cv.getContext('2d');
  const R = rng(size*7 + tone.length);
  const puffs = [];
  for(let i=0;i<11;i++){ const t = i/10; puffs.push({x:size*(0.35 + t*1.9 + (R()-0.5)*0.2), y:size*(0.62 - Math.sin(t*Math.PI)*0.22 + R()*0.08), r:size*(0.16 + Math.sin(t*Math.PI)*0.2 + R()*0.08)}); }
  const fade = function(col){ return col.replace(/[\d.]+\)$/, '0)'); };
  if(lit){
    // underside shadow
    puffs.forEach(function(p){ const g = c.createRadialGradient(p.x, p.y + p.r*0.35, 0, p.x, p.y + p.r*0.35, p.r*1.05); g.addColorStop(0, 'rgba(120,140,170,.22)'); g.addColorStop(1, 'rgba(120,140,170,0)'); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y + p.r*0.35, p.r*1.05, 0, Math.PI*2); c.fill(); });
  }
  puffs.forEach(function(p){ const g = c.createRadialGradient(p.x, p.y - p.r*0.25, p.r*0.1, p.x, p.y, p.r); g.addColorStop(0, tone); g.addColorStop(1, fade(tone)); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI*2); c.fill(); });
  if(lit){
    puffs.forEach(function(p){ const g = c.createRadialGradient(p.x - p.r*0.2, p.y - p.r*0.45, 0, p.x - p.r*0.2, p.y - p.r*0.45, p.r*0.55); g.addColorStop(0, lit); g.addColorStop(1, fade(lit)); c.fillStyle = g; c.beginPath(); c.arc(p.x - p.r*0.2, p.y - p.r*0.45, p.r*0.55, 0, Math.PI*2); c.fill(); });
  }
  return cv;
}
// ---- the scenes: paint(c,w,h,ctx) draws the still world; init(ctx) builds the moving parts ----
const SCENE_DEFS = {
  sky: {
    paint: function(c, w, h, x){ const hy = h*0.92; paintSky(c, w, h, x.phase, hy, x.wx); if(isDark(x.phase) && (x.wx==='clear' || x.wx==='partly')) paintStars(c, w, hy, Math.round(w*h/2600), rng(11), x.phase==='night' ? 1 : 0.4); paintOrb(c, w, hy, x.phase, x.wx); veil(c, w, h); },
    init: function(x){
      const cover = {clear:2, partly:6, cloudy:11, fog:4, drizzle:9, rain:11, snow:9, storm:12}[x.wx] || 3;
      x.clouds = cloudLayer(x, cover, x.wx==='storm' || x.wx==='rain' ? 'dark' : 'soft');
      if(x.wx==='rain' || x.wx==='drizzle' || x.wx==='storm') x.rain = dropLayer(x, x.wx==='drizzle' ? 70 : 160);
      if(x.wx==='snow') x.snow = flakeLayer(x, 140);
      if(isDark(x.phase) && (x.wx==='clear' || x.wx==='partly')) x.twinkle = twinkleLayer(x, 60, 0.92);
      if(x.wx==='storm') x.flashAt = 3000 + Math.random()*6000;
    }
  },
  space: {
    paint: function(c, w, h, x){
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#02030a'); g.addColorStop(0.5, '#060a1c'); g.addColorStop(1, '#0c1030'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const R = rng(7);
      [['#5b2a86', 0.22], ['#145a7a', 0.18], ['#7a2a5a', 0.14]].forEach(function(n, i){
        const cx = w*(0.2 + R()*0.6), cy = h*(0.2 + R()*0.5), r = Math.max(w, h)*(0.25 + R()*0.2);
        const ng = c.createRadialGradient(cx, cy, 0, cx, cy, r); ng.addColorStop(0, rgba(n[0], n[1])); ng.addColorStop(1, rgba(n[0], 0)); c.fillStyle = ng; c.fillRect(0, 0, w, h);
      });
      // a faint galactic band
      c.save(); c.translate(w/2, h/2); c.rotate(-0.42);
      const bg = c.createLinearGradient(0, -h*0.18, 0, h*0.18); bg.addColorStop(0, 'rgba(180,190,255,0)'); bg.addColorStop(0.5, 'rgba(180,190,255,.07)'); bg.addColorStop(1, 'rgba(180,190,255,0)');
      c.fillStyle = bg; c.fillRect(-w, -h*0.18, w*2, h*0.36);
      const RB = rng(19); for(let i=0;i<Math.round(w*h/900);i++){ c.fillStyle = 'rgba(220,225,255,'+(0.08 + RB()*0.25).toFixed(2)+')'; c.fillRect((RB()-0.5)*w*2, (RB()-0.5)*(RB()-0.5)*h*0.7, 1, 1); }
      c.restore();
      paintStars(c, w, h, Math.round(w*h/1500), rng(3), 0.9);
      // a ringed planet and its moon
      const px = vx(w, 0.82), py = h*0.72, pr = Math.min(w, h)*0.11;
      const ring = function(front){ c.save(); c.translate(px, py); c.rotate(-0.35); c.scale(1, 0.28); c.beginPath(); c.arc(0, 0, pr*1.9, front ? 0 : Math.PI, front ? Math.PI : Math.PI*2); c.strokeStyle = 'rgba(214,190,150,.55)'; c.lineWidth = pr*0.22; c.stroke(); c.lineWidth = pr*0.06; c.strokeStyle = 'rgba(255,235,200,.35)'; c.beginPath(); c.arc(0, 0, pr*1.55, front ? 0 : Math.PI, front ? Math.PI : Math.PI*2); c.stroke(); c.restore(); };
      ring(false);
      const pg = c.createRadialGradient(px - pr*0.4, py - pr*0.4, pr*0.1, px, py, pr); pg.addColorStop(0, '#e6c79a'); pg.addColorStop(0.6, '#a2733f'); pg.addColorStop(1, '#3a2412');
      c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, Math.PI*2); c.fill();
      ring(true);
      const mx = vx(w, 0.16), my = h*0.2, mr = pr*0.32, mg = c.createRadialGradient(mx - mr*0.4, my - mr*0.4, 1, mx, my, mr); mg.addColorStop(0, '#d9dbe6'); mg.addColorStop(1, '#3d4152');
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI*2); c.fill();
      veil(c, w, h);
    },
    init: function(x){ x.twinkle = twinkleLayer(x, 140, 1); x.shoot = {next:2500 + Math.random()*5000, list:[]}; }
  },
  city: {
    paint: function(c, w, h, x){
      const hy = h*0.78; paintSky(c, w, h, x.phase, hy, 'clear');
      if(isDark(x.phase)) paintStars(c, w, hy, Math.round(w*h/4200), rng(5), x.phase==='night' ? 0.8 : 0.35);
      paintOrb(c, w, hy, x.phase, 'clear');
      const land = LAND[x.phase], night = isDark(x.phase);
      x.windows = []; x.beacons = [];
      [[0.62, 0.55, 0.9], [0.72, 0.75, 0.45], [0.8, 1, 0]].forEach(function(L, li){
        const R = rng(31 + li*13), col = mixHex(land[0], land[1], L[2]);
        let bx = -R()*40;
        while(bx < w){
          const bw = 28 + R()*70*(1 + li*0.2), bh = h*(0.12 + R()*0.32)*L[1], top = h*L[0] + h*0.18 - bh;
          c.fillStyle = col; c.fillRect(bx, top, bw, h - top);
          if(R() < 0.25){ c.fillRect(bx + bw*0.45, top - bh*0.18, Math.max(2, bw*0.06), bh*0.18); if(li===2 && R() < 0.6) x.beacons.push([bx + bw*0.47, top - bh*0.18]); }
          if(li===2 || (li===1 && night)){
            for(let wy = top + 8; wy < h*0.94; wy += 9){
              for(let wx = bx + 5; wx < bx + bw - 5; wx += 7){
                const lit = night ? R() < 0.32 : R() < 0.07;
                if(!lit) continue;
                const warm = R() < 0.8;
                const a = night ? (li===2 ? 0.85 : 0.45) : 0.28;
                c.fillStyle = night ? (warm ? 'rgba(255,205,120,'+a+')' : 'rgba(180,220,255,'+a+')') : 'rgba(210,235,255,'+a+')';
                c.fillRect(wx, wy, 3, 4);
                if(li===2 && night && R() < 0.05) x.windows.push([wx, wy]);
              }
            }
          }
          bx += bw + R()*6;
        }
      });
      // the street
      c.fillStyle = mixHex(land[0], '#000000', 0.3); c.fillRect(0, h*0.94, w, h*0.06);
      if(night){ for(let lx = 30; lx < w; lx += 140){ const lg = c.createRadialGradient(lx, h*0.94, 0, lx, h*0.94, 60); lg.addColorStop(0, 'rgba(255,190,110,.22)'); lg.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = lg; c.fillRect(lx-60, h*0.94-60, 120, 120); } }
      veil(c, w, h);
    },
    init: function(x){
      x.clouds = cloudLayer(x, isDark(x.phase) ? 2 : 4, 'soft', 0.45);
      if(isDark(x.phase)){ x.twinkle = twinkleLayer(x, 30, 0.7); x.cars = carLayer(x, 9); }
    }
  },
  mountains: {
    paint: function(c, w, h, x){
      const hy = h*0.66; paintSky(c, w, h, x.phase, hy, 'clear');
      if(isDark(x.phase)) paintStars(c, w, hy, Math.round(w*h/2400), rng(9), x.phase==='night' ? 1 : 0.4);
      paintOrb(c, w, hy, x.phase, 'clear');
      const land = LAND[x.phase];
      [[0.5, 0.2, 0.92, 0.2], [0.6, 0.17, 0.66, 0.6], [0.72, 0.13, 0.38, 1.1], [0.86, 0.1, 0.1, 1.8]].forEach(function(L, i){
        ridge(c, w, h, h*L[0], h*L[1], rng(101 + i*17), mixHex(land[0], land[1], L[2]), L[3]);
        // snow on the far peaks
        if(i===0){ c.save(); c.globalCompositeOperation = 'source-atop'; c.restore(); }
      });
      veil(c, w, h);
    },
    init: function(x){ x.clouds = cloudLayer(x, 4, 'soft', 0.5); x.mist = {x:0}; if(isDark(x.phase)) x.twinkle = twinkleLayer(x, 70, 0.66); else x.birds = {next:4000 + Math.random()*8000, list:[]}; }
  },
  tokyo: {
    paint: function(c, w, h, x){
      const hy = h*0.7; paintSky(c, w, h, x.phase, hy, 'clear');
      // a soft pink wash at both ends of the day
      if(x.phase!=='day' && x.phase!=='night'){ const pg = c.createLinearGradient(0, hy*0.4, 0, hy); pg.addColorStop(0, 'rgba(255,170,200,0)'); pg.addColorStop(1, 'rgba(255,170,200,.18)'); c.fillStyle = pg; c.fillRect(0, 0, w, hy); }
      if(isDark(x.phase)) paintStars(c, w, hy, Math.round(w*h/3000), rng(21), x.phase==='night' ? 0.9 : 0.35);
      paintOrb(c, w, hy, x.phase, 'clear');
      const land = LAND[x.phase];
      // Fuji
      const fx = vx(w, 0.6), fy = h*0.72, fw = (w - sceneLeft)*0.5, fh = h*0.36;
      const fg = c.createLinearGradient(0, fy - fh, 0, fy); fg.addColorStop(0, mixHex(land[0], land[1], 0.9)); fg.addColorStop(1, mixHex(land[0], land[1], 0.55)); c.fillStyle = fg;
      c.beginPath(); c.moveTo(fx - fw/2, fy); c.quadraticCurveTo(fx - fw*0.18, fy - fh*0.55, fx - fw*0.07, fy - fh); c.lineTo(fx + fw*0.07, fy - fh); c.quadraticCurveTo(fx + fw*0.18, fy - fh*0.55, fx + fw/2, fy); c.closePath(); c.fill();
      c.fillStyle = isDark(x.phase) ? 'rgba(225,232,248,.7)' : 'rgba(255,255,255,.96)';
      c.beginPath(); c.moveTo(fx - fw*0.07, fy - fh); c.lineTo(fx + fw*0.07, fy - fh);
      c.quadraticCurveTo(fx + fw*0.12, fy - fh*0.86, fx + fw*0.17, fy - fh*0.7); c.lineTo(fx + fw*0.12, fy - fh*0.75); c.lineTo(fx + fw*0.08, fy - fh*0.64); c.lineTo(fx + fw*0.03, fy - fh*0.74); c.lineTo(fx - fw*0.02, fy - fh*0.62); c.lineTo(fx - fw*0.07, fy - fh*0.73); c.lineTo(fx - fw*0.12, fy - fh*0.66);
      c.quadraticCurveTo(fx - fw*0.12, fy - fh*0.86, fx - fw*0.07, fy - fh); c.closePath(); c.fill();
      ridge(c, w, h, h*0.78, h*0.05, rng(77), mixHex(land[0], land[1], 0.42), 1.2);
      // pagoda
      const night = isDark(x.phase), pc = mixHex(land[0], '#000000', 0.35);
      const pxl = vx(w, 0.1), base = h*0.93; let tw = Math.min(w, h)*0.2, y = base;
      c.fillStyle = pc;
      for(let t=0;t<5;t++){ const th = tw*0.28; c.fillRect(pxl - tw*0.32, y - th, tw*0.64, th); c.beginPath(); c.moveTo(pxl - tw*0.62, y - th); c.quadraticCurveTo(pxl, y - th*1.5, pxl + tw*0.62, y - th); c.lineTo(pxl + tw*0.5, y - th*1.18); c.quadraticCurveTo(pxl, y - th*1.75, pxl - tw*0.5, y - th*1.18); c.closePath(); c.fill(); y -= th*1.35; tw *= 0.84; }
      c.fillRect(pxl - 2, y - tw*0.6, 4, tw*0.6);
      // blossom trees
      const R = rng(55);
      [[vx(w, -0.02), h*0.86, 0.11], [vx(w, 0.97), h*0.83, 0.14], [vx(w, 0.36), h*0.97, 0.07]].forEach(function(t){
        c.fillStyle = pc; c.fillRect(t[0] - 3, t[1], 6, h - t[1]);
        for(let i=0;i<26;i++){ const r = Math.min(w, h)*t[2]*(0.25 + R()*0.35), ax = t[0] + (R()-0.5)*Math.min(w, h)*t[2]*2.2, ay = t[1] - R()*Math.min(w, h)*t[2]*1.1;
          c.fillStyle = night ? 'rgba(200,120,160,'+(0.25 + R()*0.25).toFixed(2)+')' : 'rgba(255,183,210,'+(0.45 + R()*0.35).toFixed(2)+')'; c.beginPath(); c.arc(ax, ay, r, 0, Math.PI*2); c.fill(); }
      });
      c.fillStyle = mixHex(land[0], '#000000', 0.4); c.fillRect(0, h*0.93, w, h*0.07);
      x.lanterns = night ? [[vx(w, 0.42), h*0.9], [vx(w, 0.5), h*0.9], [vx(w, 0.58), h*0.9], [vx(w, 0.66), h*0.9], [pxl - 30, h*0.86], [pxl + 30, h*0.86]] : [];
      veil(c, w, h);
    },
    init: function(x){ x.petals = petalLayer(x, 46); if(isDark(x.phase)) x.twinkle = twinkleLayer(x, 40, 0.7); }
  },
  snow: {
    paint: function(c, w, h, x){
      const hy = h*0.7; paintSky(c, w, h, x.phase, hy, 'partly');
      if(isDark(x.phase)) paintStars(c, w, hy, Math.round(w*h/3600), rng(41), 0.6);
      paintOrb(c, w, hy, x.phase, 'clear');
      const night = isDark(x.phase);
      const snowTone = night ? ['#1b2235', '#2c3654', '#3d4a6e'] : ['#c9d6e8', '#dfe8f4', '#f4f8fd'];
      [[0.68, 0.06, 0], [0.78, 0.05, 1], [0.9, 0.04, 2]].forEach(function(L, i){
        ridge(c, w, h, h*L[0], h*L[1], rng(301 + i*9), snowTone[L[2]], 0.4);
        // pines on each hill
        const R = rng(500 + i*3), n = 6 + i*6;
        for(let k=0;k<n;k++){
          const tx = R()*w, ty = h*L[0] + h*0.02 + R()*h*0.03, th = h*(0.05 + 0.03*i)*(0.7 + R()*0.6);
          c.fillStyle = night ? 'rgba(10,16,30,'+(0.7 + i*0.1)+')' : 'rgba(40,70,80,'+(0.55 + i*0.15)+')';
          c.beginPath(); c.moveTo(tx, ty - th); c.lineTo(tx + th*0.28, ty); c.lineTo(tx - th*0.28, ty); c.closePath(); c.fill();
          c.fillStyle = night ? 'rgba(200,215,240,.35)' : 'rgba(255,255,255,.8)';
          c.beginPath(); c.moveTo(tx, ty - th); c.lineTo(tx + th*0.09, ty - th*0.66); c.lineTo(tx - th*0.09, ty - th*0.66); c.closePath(); c.fill();
        }
      });
      // a cabin with a warm window
      const cx = vx(w, 0.74), cy = h*0.9, cw = Math.min(w, h)*0.07;
      c.fillStyle = night ? '#120d10' : '#5a3b2c'; c.fillRect(cx - cw/2, cy - cw*0.6, cw, cw*0.6);
      c.fillStyle = night ? 'rgba(220,230,250,.6)' : '#ffffff'; c.beginPath(); c.moveTo(cx - cw*0.62, cy - cw*0.6); c.lineTo(cx, cy - cw*1.05); c.lineTo(cx + cw*0.62, cy - cw*0.6); c.closePath(); c.fill();
      c.fillStyle = night ? '#ffc56b' : '#e8d9b0'; c.fillRect(cx - cw*0.12, cy - cw*0.42, cw*0.24, cw*0.2);
      if(night){ const g = c.createRadialGradient(cx, cy - cw*0.32, 0, cx, cy - cw*0.32, cw*1.4); g.addColorStop(0, 'rgba(255,190,100,.35)'); g.addColorStop(1, 'rgba(255,190,100,0)'); c.fillStyle = g; c.fillRect(cx - cw*1.5, cy - cw*1.8, cw*3, cw*3); }
      veil(c, w, h);
    },
    init: function(x){ x.snow = flakeLayer(x, 170); if(isDark(x.phase)) x.twinkle = twinkleLayer(x, 30, 0.6); }
  }
};
// ---- moving parts ----
// Clouds sit at different distances: far ones small, faint and slow near the horizon; near ones
// big, bright and quicker — so the sky has depth as they drift (parallax).
function cloudLayer(x, n, tone, alpha){
  const night = isDark(x.phase);
  const col = tone==='dark' ? (night ? 'rgba(40,46,60,.9)' : 'rgba(110,118,132,.85)') : (night ? 'rgba(120,130,160,.35)' : (x.phase==='golden' ? 'rgba(255,206,184,.8)' : x.phase==='morning' ? 'rgba(255,244,236,.85)' : 'rgba(255,255,255,.88)'));
  const lit = tone!=='dark' && !night ? (x.phase==='golden' ? 'rgba(255,236,190,.9)' : 'rgba(255,255,255,.95)') : null;
  const list = [];
  for(let i=0;i<n;i++){
    const z = 0.3 + 0.7*(i/(Math.max(1, n-1)))*Math.random() + 0.15*Math.random(), size = x.h*(0.04 + 0.11*z);
    list.push({img:cloudSprite(Math.round(size), col, lit), z:z, x:Math.random()*x.w*1.2 - x.w*0.1, y:x.h*(0.48 - 0.42*z + Math.random()*0.08), v:(3 + 11*z)*(0.7 + Math.random()*0.5), a:(alpha||1)*(0.35 + 0.6*z)});
  }
  return list.sort(function(a, b){ return a.z - b.z; });
}
// slow-turning shafts of light from the sun (daytime, clear skies)
function raysLayer(x){ const hy = x.h*0.92, o = celestial(x.w, hy); return o.sun ? {x:o.x, y:o.y, a:0, n:9, warm: x.phase==='golden' || x.phase==='morning' || x.phase==='dawn'} : null; }
function dropLayer(x, n){ const l = []; for(let i=0;i<n;i++) l.push({x:Math.random()*x.w, y:Math.random()*x.h, v:600 + Math.random()*500, len:10 + Math.random()*14}); return l; }
function flakeLayer(x, n){ const l = []; for(let i=0;i<n;i++){ const z = Math.random(); l.push({x:Math.random()*x.w, y:Math.random()*x.h, r:0.8 + z*2.4, v:18 + z*48, sway:Math.random()*Math.PI*2, a:0.35 + z*0.6}); } return l; }
function petalLayer(x, n){ const l = []; for(let i=0;i<n;i++){ const z = Math.random(); l.push({x:Math.random()*x.w, y:Math.random()*x.h, s:2 + z*4, v:14 + z*30, rot:Math.random()*6, vr:(Math.random()-0.5)*2, sway:Math.random()*6}); } return l; }
function twinkleLayer(x, n, maxY){ const l = []; for(let i=0;i<n;i++) l.push({x:Math.random()*x.w, y:Math.random()*x.h*maxY*0.85, p:Math.random()*6, f:0.6 + Math.random()*1.6, s:Math.random() < 0.2 ? 2 : 1.4}); return l; }
function carLayer(x, n){ const l = []; for(let i=0;i<n;i++){ const dir = i%2 ? 1 : -1; l.push({x:Math.random()*x.w, dir:dir, v:60 + Math.random()*90, y:x.h*(dir>0 ? 0.955 : 0.975)}); } return l; }
function sceneTick(x, c, dt, t){
  const w = x.w, h = x.h;
  c.clearRect(0, 0, w, h);
  if(x.twinkle){ x.twinkle.forEach(function(s){ const a = 0.25 + 0.75*Math.max(0, Math.sin(t/1000*s.f + s.p)); c.fillStyle = 'rgba(255,255,255,'+a.toFixed(2)+')'; c.fillRect(s.x, s.y, s.s, s.s); }); }
  if(x.rays){
    const r = x.rays, L = Math.max(w, h)*1.2; r.a += dt*0.012;
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(r.x, r.y);
    for(let i=0;i<r.n;i++){
      const ang = r.a + i*(Math.PI*2/r.n), spread = 0.07 + 0.04*Math.sin(t/4000 + i), al = 0.035 + 0.025*Math.sin(t/3000 + i*1.3);
      const g = c.createLinearGradient(0, 0, Math.cos(ang)*L, Math.sin(ang)*L);
      g.addColorStop(0, r.warm ? 'rgba(255,214,150,'+al.toFixed(3)+')' : 'rgba(255,250,225,'+al.toFixed(3)+')'); g.addColorStop(1, 'rgba(255,240,210,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang-spread)*L, Math.sin(ang-spread)*L); c.lineTo(Math.cos(ang+spread)*L, Math.sin(ang+spread)*L); c.closePath(); c.fill();
    }
    c.restore();
  }
  if(x.clouds){ x.clouds.forEach(function(k){ k.x += k.v*dt; if(k.x > w + 20) k.x = -k.img.width - Math.random()*80; c.globalAlpha = k.a; c.drawImage(k.img, k.x, k.y); }); c.globalAlpha = 1; }
  if(x.mist){ x.mist.x = (x.mist.x + dt*14) % (w*2); const g = c.createLinearGradient(0, h*0.62, 0, h*0.82); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, isDark(x.phase) ? 'rgba(120,135,170,.10)' : 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, h*0.62, w, h*0.2); }
  if(x.rain){ c.strokeStyle = isDark(x.phase) ? 'rgba(170,190,230,.35)' : 'rgba(80,100,140,.35)'; c.lineWidth = 1; c.beginPath(); x.rain.forEach(function(d){ d.y += d.v*dt; d.x -= d.v*dt*0.12; if(d.y > h){ d.y = -d.len; d.x = Math.random()*w*1.1; } c.moveTo(d.x, d.y); c.lineTo(d.x + d.len*0.12, d.y - d.len); }); c.stroke(); }
  if(x.snow){ c.fillStyle = '#ffffff'; x.snow.forEach(function(f){ f.y += f.v*dt; f.sway += dt*0.8; f.x += Math.sin(f.sway)*f.r*0.25; if(f.y > h + 4){ f.y = -4; f.x = Math.random()*w; } c.globalAlpha = f.a; c.beginPath(); c.arc(f.x, f.y, f.r, 0, Math.PI*2); c.fill(); }); c.globalAlpha = 1; }
  if(x.petals){ x.petals.forEach(function(p){ p.y += p.v*dt; p.sway += dt; p.x += Math.sin(p.sway)*0.6 + dt*10; p.rot += p.vr*dt; if(p.y > h + 6){ p.y = -6; p.x = Math.random()*w; } c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = 'rgba(255,184,210,.85)'; c.beginPath(); c.ellipse(0, 0, p.s, p.s*0.55, 0, 0, Math.PI*2); c.fill(); c.restore(); }); }
  if(x.cars){ x.cars.forEach(function(k){ k.x += k.v*k.dir*dt; if(k.x > w + 30) k.x = -30; if(k.x < -30) k.x = w + 30; c.fillStyle = k.dir>0 ? 'rgba(255,245,215,.9)' : 'rgba(255,70,70,.85)'; c.fillRect(k.x, k.y, 7, 2.5); c.fillRect(k.x + (k.dir>0 ? -12 : 12), k.y, 7, 2.5); }); }
  if(x.windows && x.windows.length){ const k = Math.floor(t/1700) % x.windows.length, wv = x.windows[k]; c.fillStyle = 'rgba(255,215,140,'+(0.4 + 0.4*Math.sin(t/400)).toFixed(2)+')'; c.fillRect(wv[0], wv[1], 3, 4); }
  if(x.beacons){ const on = Math.floor(t/900) % 2===0; if(on){ c.fillStyle = 'rgba(255,60,60,.9)'; x.beacons.forEach(function(b){ c.beginPath(); c.arc(b[0], b[1], 2, 0, Math.PI*2); c.fill(); }); } }
  if(x.lanterns && x.lanterns.length){ x.lanterns.forEach(function(l, i){ const a = 0.55 + 0.25*Math.sin(t/300 + i*1.7); const g = c.createRadialGradient(l[0], l[1], 0, l[0], l[1], 16); g.addColorStop(0, 'rgba(255,150,70,'+a.toFixed(2)+')'); g.addColorStop(1, 'rgba(255,150,70,0)'); c.fillStyle = g; c.fillRect(l[0]-16, l[1]-16, 32, 32); c.fillStyle = 'rgba(255,120,60,.95)'; c.fillRect(l[0]-3, l[1]-4, 6, 8); }); }
  if(x.shoot){ x.shoot.next -= dt*1000; if(x.shoot.next <= 0){ x.shoot.next = 5000 + Math.random()*9000; x.shoot.list.push({x:Math.random()*w*0.7 + w*0.2, y:Math.random()*h*0.4, life:0}); }
    x.shoot.list = x.shoot.list.filter(function(s){ s.life += dt; const p = s.life/0.9; if(p >= 1) return false; const hx = s.x - p*w*0.25, hy = s.y + p*h*0.12, g = c.createLinearGradient(hx, hy, hx + 90, hy - 44); g.addColorStop(0, 'rgba(255,255,255,'+(0.9*(1-p)).toFixed(2)+')'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 90, hy - 44); c.stroke(); return true; }); }
  if(x.birds){ x.birds.next -= dt*1000; if(x.birds.next <= 0){ x.birds.next = 9000 + Math.random()*12000; const y0 = h*(0.15 + Math.random()*0.25); x.birds.list.push({x:-40, y:y0, n:3 + Math.floor(Math.random()*4), v:40 + Math.random()*30, t:0}); }
    c.strokeStyle = isDark(x.phase) ? 'rgba(220,225,240,.5)' : 'rgba(30,40,60,.55)'; c.lineWidth = 1.3;
    x.birds.list = x.birds.list.filter(function(b){ b.x += b.v*dt; b.t += dt; for(let i=0;i<b.n;i++){ const bx = b.x - i*14, by = b.y + i*(i%2 ? 6 : -4), f = Math.sin(b.t*8 + i)*3; c.beginPath(); c.moveTo(bx-6, by-f); c.lineTo(bx, by); c.lineTo(bx+6, by-f); c.stroke(); } return b.x < w + 80; }); }
  if(x.more) x.more(c, dt, t, w, h);
  if(x.flashAt!=null){ x.flashAt -= dt*1000; if(x.flashAt <= 0){ x.flash = 0.18; x.flashAt = 5000 + Math.random()*9000; } if(x.flash > 0){ c.fillStyle = 'rgba(230,235,255,'+x.flash.toFixed(2)+')'; c.fillRect(0, 0, w, h); x.flash -= dt*0.6; } }
}
// ---- mounting & the loop ----
let sceneBusyAt = 0;
['pointerdown', 'wheel', 'keydown', 'scroll'].forEach(function(ev){ window.addEventListener(ev, function(){ sceneBusyAt = performance.now(); }, {passive:true, capture:true}); });
const SC = {bg:null, fx:null, x:null, raf:0, last:0, key:'', builtAt:0, running:false};
function sceneCtxFor(id){ return {id:id, phase:id==='space' ? 'night' : skyLook(), wx:id==='sky' && wxNow() ? wxKind(wxNow().code) : 'clear', w:window.innerWidth, h:window.innerHeight}; }
function sceneBuild(){
  const id = sceneId(); if(!SCENE_DEFS[id] || !SC.bg) return;
  const x = sceneCtxFor(id), dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const sb = document.getElementById('sidebarNav'); sceneLeft = sb && window.innerWidth > 900 ? sb.getBoundingClientRect().right : 0;
  SC.bg.width = Math.round(x.w*dpr); SC.bg.height = Math.round(x.h*dpr);
  const c = SC.bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  SCENE_DEFS[id].paint(c, x.w, x.h, x);
  SC.fx.width = x.w; SC.fx.height = x.h;
  SCENE_DEFS[id].init(x);
  if(id!=='space' && !isDark(x.phase) && (x.wx==='clear' || x.wx==='partly')){
    x.rays = raysLayer(x);
    if(!x.birds) x.birds = {next:2500 + Math.random()*5000, list:[]};
    if(id==='sky' && x.clouds && x.clouds.length < 6) x.clouds = x.clouds.concat(cloudLayer(x, 6 - x.clouds.length, 'soft')).sort(function(a, b){ return a.z - b.z; });
  }
  SC.x = x; SC.key = id+'|'+x.phase+'|'+x.wx+'|'+document.documentElement.getAttribute('data-theme'); SC.builtAt = Date.now();
  sceneTick(x, SC.fx.getContext('2d'), 0, performance.now());
}
function sceneLoop(t){
  if(!SC.running){ SC.raf = 0; return; }
  SC.raf = requestAnimationFrame(sceneLoop);
  // ~20 frames a second is plenty for drifting clouds; and while you're clicking, scrolling or
  // typing the scene holds still, so every bit of the computer goes to the app itself
  if(t - SC.last < 50 || performance.now() - sceneBusyAt < 1200) return;
  const dt = SC.last ? Math.min(0.1, (t - SC.last)/1000) : 0.033;
  SC.last = t;
  if(SC.x) sceneTick(SC.x, SC.fx.getContext('2d'), dt, t);
}
function sceneShouldRun(){ return !!SCENE_DEFS[sceneId()] && sceneAnimates() && !document.hidden && document.hasFocus(); }
function sceneStart(){ if(SC.running || !sceneShouldRun()) return; SC.running = true; SC.last = 0; SC.raf = requestAnimationFrame(sceneLoop); }
function sceneStop(){ SC.running = false; if(SC.raf) cancelAnimationFrame(SC.raf); SC.raf = 0; }
function sceneMount(){
  const id = sceneId();
  document.body.classList.toggle('has-scene', id!=='minimal');
  document.body.setAttribute('data-scene', id.indexOf('vid:')===0 ? 'video' : id);
  videoWallMount(id.indexOf('vid:')===0 ? id.slice(4) : null);
  if(!SCENE_DEFS[id]){ sceneStop(); if(SC.bg){ SC.bg.remove(); SC.fx.remove(); SC.bg = SC.fx = SC.x = null; } return; }
  if(!SC.bg){
    SC.bg = document.createElement('canvas'); SC.bg.className = 'scene-layer'; SC.bg.id = 'sceneBg';
    SC.fx = document.createElement('canvas'); SC.fx.className = 'scene-layer'; SC.fx.id = 'sceneFx';
    document.body.insertBefore(SC.fx, document.body.firstChild); document.body.insertBefore(SC.bg, SC.fx);
  }
  sceneBuild(); sceneStart();
}
function sceneRefresh(){ if(SCENE_DEFS[sceneId()] && SC.bg){ sceneBuild(); } }
function onThemeChanged(){ sceneRefresh(); }
// keep the world in step with the clock (the sun moves, the phase changes) and the window
setInterval(function(){
  if(typeof state==='undefined' || !state || !state.profile || sceneId()==='minimal' || !SC.bg) return;
  const x = sceneCtxFor(sceneId()), key = sceneId()+'|'+x.phase+'|'+x.wx+'|'+document.documentElement.getAttribute('data-theme');
  if(key!==SC.key || Date.now()-SC.builtAt > 5*60000) sceneBuild();
}, 60000);
let sceneResizeT = 0;
window.addEventListener('resize', function(){ if(!SC.bg) return; clearTimeout(sceneResizeT); sceneResizeT = setTimeout(sceneBuild, 180); });
window.addEventListener('focus', function(){ if(SC.bg) sceneStart(); });
window.addEventListener('blur', sceneStop);
document.addEventListener('visibilitychange', function(){ if(document.hidden) sceneStop(); else if(SC.bg) sceneStart(); });
// ---- picking one ----
const sceneThumbs = {};
function sceneThumbKey(id){ const x = sceneCtxFor(id); return id+'|'+x.phase+'|'+x.wx+'|'+document.documentElement.getAttribute('data-theme'); }
function sceneThumb(id){ return id==='minimal' ? '' : (sceneThumbs[sceneThumbKey(id)] || ''); }
function paintSceneThumb(id){
  const x = sceneCtxFor(id), key = sceneThumbKey(id);
  if(sceneThumbs[key]) return sceneThumbs[key];
  const cv = document.createElement('canvas'), W = 168, H = 100; cv.width = W*2; cv.height = H*2;
  const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
  x.w = W; x.h = H; const keep = sceneLeft; sceneLeft = 0; SCENE_DEFS[id].paint(c, W, H, x); sceneLeft = keep;
  try{ sceneThumbs[key] = cv.toDataURL('image/jpeg', 0.82); }catch(e){ sceneThumbs[key] = ''; }
  return sceneThumbs[key];
}
function sceneSettingsHtml(){
  const cur = sceneId();
  return '<div class="section"><div class="section-title">Scene'+tip('A living background behind the app — it follows the real time of day (Sky also shows the live weather). Minimal keeps it clean and straight to the point. Scenes pause whenever Operator isn\'t the window in front.')+'</div><div class="card">'+
    '<div class="scene-grid">'+SCENES.map(function(s){
      const th = sceneThumb(s.id);
      return '<button class="scene-card'+(cur===s.id?' is-on':'')+'" data-action="setScene" data-id="'+s.id+'" data-thumb="'+s.id+'">'+
        '<span class="scene-thumb'+(s.id==='minimal'?' is-minimal':'')+'"'+(th ? ' style="background-image:url('+th+')"' : '')+'></span>'+
        '<span class="scene-name">'+s.label+(s.sub ? ' <em>'+s.sub+'</em>' : '')+'</span></button>';
    }).join('')+videoWallCardsHtml(cur)+'</div>'+
    videoWallAddHtml()+
    (SCENE_DEFS[cur] ? '<label class="row" style="gap:8px;margin-top:12px;font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" id="setSceneAnimate" '+(state.profile.sceneAnimate!==false?'checked':'')+'>Animate (stars, clouds, snow…)</label>' : '')+
  '</div></div>';
}
function setScene(id){ state.profile.scene = id; persist('profile'); sceneMount(); renderView(); }
ACTIONS.setScene = function(el, e, id){ setScene(id); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='setSceneAnimate'){ state.profile.sceneAnimate = e.target.checked; persist('profile'); sceneStop(); sceneBuild(); sceneStart(); } });
afterRenderHooks.push(function(){
  const cards = document.querySelectorAll('.scene-card[data-thumb]'); if(!cards.length) return;
  const todo = [].filter.call(cards, function(c){ const t = c.querySelector('.scene-thumb'); return c.dataset.thumb!=='minimal' && t && !t.style.backgroundImage; });
  if(!todo.length) return;
  const idle = window.requestIdleCallback || function(fn){ return setTimeout(fn, 60); };
  const next = function(){ const c = todo.shift(); if(!c) return; if(c.isConnected){ const url = paintSceneThumb(c.dataset.thumb); const t = c.querySelector('.scene-thumb'); if(url && t) t.style.backgroundImage = 'url('+url+')'; } idle(next); };
  idle(next);
});

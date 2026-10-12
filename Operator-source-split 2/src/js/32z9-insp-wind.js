// ============ INSPIRATION, ROUND 28: WIND ============
// The bubbles are alive: each one wanders around its spot on its own little path, all the time.
// Drift is the one effect now (Stream is gone): set the wind, from Calm to Gale, and the same bubbles
// breeze across the sky, leave on one side and come back in on the other, forever. Breeze away blows
// them all off (with a whoosh); press it again and they float back.
// The plane is a sandbox that goes on forever: drag or scroll to wander (like a Milanote board), pinch
// to lean in a little. No zooming way out to see everything at once.
// And Op makes it yours: once a day (with an AI key) it writes a few ideas and quiet lines for you, from
// what you've told it, what you've been doing, how you slept and what you're building.

const INSP_WINDS = [['calm', 'Calm', 0], ['breeze', 'Breeze', 16], ['wind', 'Wind', 42], ['gale', 'Gale', 95]];
function inspWind(){ const s = inspStore(); const i = INSP_WINDS.findIndex(function(w){ return w[0]===s.wind; }); return i < 0 ? 0 : i; }
// (Stream folded into Drift: it's always off now)
inspStreamOn = function(){ return false; };

// ---- the engine: one loop moves every bubble ----
const IW = {raf:0, last:0, off:{}, ret:{}, away:false, awayAt:0, gust:0};
function inspHash(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0)/4294967296; }
function inspField(){
  const lay = typeof inspScatter==='function' ? ui._inspScatter && ui._inspScatter.out : null; const xs = arr(lay).map(function(p){ return p.x; });
  const min = xs.length ? Math.min.apply(null, xs) - 420 : -1500, max = xs.length ? Math.max.apply(null, xs) + 420 : 1500;
  return {min:min, max:max, w:max - min};
}
function inspWindTick(now){
  IW.raf = 0;
  const L = document.getElementById('insp'); if(!L || !L.classList.contains('is-in')){ IW.last = 0; return; }
  const dt = IW.last ? Math.min(0.1, (now - IW.last)/1000) : 0; IW.last = now;
  const t = now/1000, speed = INSP_WINDS[inspWind()][2], f = inspField();
  // a breeze-away: a gust that builds fast and carries everything off to the right
  const gustNow = IW.away ? Math.min(1, (now - IW.awayAt)/900) : 0;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  L.querySelectorAll('#inspWorld .izb').forEach(function(el){
    const id = el.dataset.id; if(!id) return;
    const x0 = el._x0 != null && el._key===el.style.left ? el._x0 : (el._x0 = parseFloat(el.style.left) || 0, el._key = el.style.left, el._x0);
    const h = inspHash(id), held = ui.inspOpenAct===id || el.matches(':hover');
    if(!held && !reduce){ IW.off[id] = (IW.off[id] || 0) + (speed*(0.75 + h*0.5) + gustNow*gustNow*1100)*dt; }
    let off = IW.off[id] || 0;
    // coming back after a breeze-away: in from the left, easing into place
    const r = IW.ret[id]; if(r){ const k = Math.min(1, (now - r.t0)/r.dur), e = 1 - Math.pow(1 - k, 3); off += r.from*(1 - e); if(k >= 1) delete IW.ret[id]; }
    // wrap around the field: out on the right, back in on the left
    let wx = x0 + off; if(!IW.away){ wx = ((wx - f.min) % f.w + f.w) % f.w + f.min; }
    const amp = reduce ? 0 : 1, lift = speed ? 1 + speed/40 : 1;
    const dx = wx - x0 + amp*(Math.sin(t*(0.31 + h*0.2) + h*20)*14 + Math.sin(t*(0.13 + h*0.07) + h*7)*10);
    const dy = amp*(Math.cos(t*(0.27 + h*0.18) + h*11)*12*lift + Math.sin(t*(0.11 + h*0.05) + h*3)*9*lift);
    const rot = amp*Math.sin(t*0.4 + h*9)*(2 + speed/30);
    el.style.transform = 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0) rotate('+rot.toFixed(2)+'deg)';
    // fading at the edges of the field while it travels; gone with the gust
    let op = 1;
    if(speed > 0 && !IW.away){ const d = Math.min(wx - f.min, f.max - wx); op = Math.max(0, Math.min(1, d/260)); }
    if(IW.away) op = Math.max(0, 1 - gustNow*1.15 - Math.max(0, (now - IW.awayAt - 600)/1400));
    if(r && !IW.away) op = Math.min(op, Math.min(1, (now - r.t0)/900));
    // passing the middle (you) or the vision board, a bubble slips behind and goes faint
    const y0 = parseFloat(el.style.top) || 0, px = x0 + dx, py = y0 + dy;
    const nearHub = Math.hypot(px, py*1.15) < 300 ? 1 - Math.max(0, (Math.hypot(px, py*1.15) - 230)/70) : 0;
    const nearBoard = Math.abs(px) < 300 && py < -400 && py > -700 ? 1 : 0;
    const behind = Math.max(nearHub, nearBoard);
    if(behind > 0){ op = Math.min(op, 1 - behind*0.8); }
    el.classList.toggle('is-behind', behind > 0.5);
    el.style.opacity = op < 0.999 ? op.toFixed(3) : '';
    el.style.pointerEvents = op < 0.15 ? 'none' : '';
    // an open idea's card follows its bubble
    if(ui.inspOpenAct===id){ const c = L.querySelector('#inspWorld .izb-card'); if(c) c.style.transform = 'translate3d('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px,0)'; }
  });
  IW.raf = requestAnimationFrame(inspWindTick);
}
function inspWindGo(){ if(!IW.raf) IW.raf = requestAnimationFrame(inspWindTick); }
openInspire = (function(base){
  return function(){
    base.apply(this, arguments);
    const L = document.getElementById('insp');
    if(L){ L.classList.add('is-alive'); L.classList.toggle('is-away', IW.away); if(!L._wind){ L._wind = true; inspBindWander(L); } }
    IW.last = 0; inspWindGo();
    if(typeof inspAiRefresh==='function') setTimeout(inspAiRefresh, 1200);
  };
})(openInspire);
inspRender = (function(base){ return function(){ base.apply(this, arguments); inspWindGo(); }; })(inspRender);

// ---- the wind: Drift is the one effect, and you set how strong ----
ACTIONS.inspDrift = function(){ ui.inspWindOpen = !ui.inspWindOpen; inspRender(); };
ACTIONS.inspWindSet = function(el, e, id){
  const s = inspStore(); s.wind = id; persist('personal'); ui.inspWindOpen = false;
  if(typeof inspChime==='function') inspChime(INSP_WINDS.findIndex(function(w){ return w[0]===id; }) + 1);
  if(id!=='calm') inspWhoosh(0.35 + INSP_WINDS.findIndex(function(w){ return w[0]===id; })*0.15);
  inspRender();
};
// breeze away / call them back
ACTIONS.inspBreezeAway = function(){
  const L = document.getElementById('insp');
  if(!IW.away){
    IW.away = true; IW.awayAt = performance.now(); ui.inspOpenAct = null; inspWhoosh(1);
    if(L) L.classList.add('is-away');
  } else {
    IW.away = false; const now = performance.now(), f = inspField();
    document.querySelectorAll('#inspWorld .izb').forEach(function(el, i){
      const id = el.dataset.id; if(!id) return;
      const x0 = parseFloat(el.style.left) || 0;
      IW.off[id] = 0;
      IW.ret[id] = {from:-(x0 - f.min + 420 + inspHash(id)*500), t0:now + i*70, dur:3200 + inspHash(id+'r')*1600};
    });
    if(L) L.classList.remove('is-away');
    if(typeof inspChime==='function') inspChime(3);
  }
  inspRender();
};
// a soft whoosh: noise swept through a filter, like wind going past
function inspWhoosh(level){
  try{
    const ctx = getAudioCtx(); if(!ctx || typeof fmNoiseBuf!=='function') return;
    const t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.buffer = fmNoiseBuf(ctx); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1500, t + 0.9); f.frequency.exponentialRampToValueAtTime(420, t + 2.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16*(level||1), t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    src.connect(f); f.connect(g);
    if(pan){ pan.pan.setValueAtTime(-0.7, t); pan.pan.linearRampToValueAtTime(0.8, t + 2.2); g.connect(pan); pan.connect(sfxOut(ctx)); } else g.connect(sfxOut(ctx));
    src.start(t); src.stop(t + 2.5);
  }catch(e){}
}
// the toolbar: Stream's gone; Drift opens the wind; Breeze away sits next to it
inspToolsHtml = function(){
  const sky = (INSP_SKIES.find(function(x){ return x[0]===(inspSandStore().sky || 'dusk'); }) || INSP_SKIES[0])[1];
  const b = function(act, ic, label, on){ return '<button class="izk'+(on ? ' is-on' : '')+'" data-action="'+act+'"><span>'+ic+'</span>'+label+'</button>'; };
  const w = inspWind();
  return '<div class="insp-tools">'+b('inspToolThought', '&#9998;', 'Thought')+b('inspToolWish', '&#10022;', 'Wish')+b('inspToolWords', '&#10077;', 'Words')+b('inspBreathe', '&#10061;', 'Breathe')+b('inspSky', '&#9790;', sky)+
    '<span class="izk-wrap">'+b('inspDrift', '&#8776;', 'Drift'+(w ? ' &middot; '+INSP_WINDS[w][1] : ''), w > 0 || ui.inspWindOpen)+
      (ui.inspWindOpen ? '<span class="izk-wind"><small>The wind</small>'+INSP_WINDS.map(function(x, i){ return '<button class="izw-s'+(i===w ? ' is-on' : '')+'" data-action="inspWindSet" data-id="'+x[0]+'"><i style="--n:'+i+'"></i>'+x[1]+'</button>'; }).join('')+'</span>' : '')+'</span>'+
    b('inspBreezeAway', IW.away ? '&#127808;' : '&#127811;', IW.away ? 'Return' : 'Breeze', IW.away)+'</div>';
};

// ---- a sandbox that goes on forever: scroll to wander, pinch to lean in a little ----
inspHome = function(){ const h = window.innerHeight || 900, z = Math.max(0.86, Math.min(1, h/1050)); return {x:0, y:Math.round(150*z), z:z}; };
function inspBindWander(L){
  L.addEventListener('wheel', function(e){
    if(!e.target.closest('#inspPlane') || e.target.closest('textarea')) return;
    e.preventDefault(); e.stopPropagation();
    const v = ui.inspView || (ui.inspView = inspHome());
    if(e.ctrlKey){
      // a pinch: closer or a touch back, never way out
      const z0 = v.z, z = Math.max(0.8, Math.min(1.35, z0*Math.exp(-e.deltaY*0.01)));
      const r = L.getBoundingClientRect(), cx = e.clientX - r.width/2, cy = e.clientY - r.height/2;
      v.x = cx - (cx - v.x)*(z/z0); v.y = cy - (cy - v.y)*(z/z0); v.z = z;
    } else { v.x -= e.deltaX; v.y -= e.deltaY; }
    inspApply(false);
  }, {passive:false, capture:true});
}
// (the hint says how it works now)
inspHtml = (function(base){ return function(){ return base.apply(this, arguments).replace('Drag to wander · scroll to zoom · tap the sky · double-click to write a thought', 'Drag or scroll to wander · tap the sky · double-click to write a thought'); }; })(inspHtml);

// ---- Op makes it yours: a few ideas and quiet lines written for you, once a day ----
function inspAiStore(){ const s = inspStore(); if(!s.ai || typeof s.ai!=='object') s.ai = {}; return s.ai; }
function inspAiActs(){
  const a = inspAiStore(); if(!Array.isArray(a.ideas)) return [];
  return a.ideas.slice(0, 5).map(function(x, i){ return {id:'ai'+i+'-'+(a.date||''), e:x.e, label:x.label, cat:INSP_CATS[x.cat] ? x.cat : 'mind', pts:2, why:x.why, ai:true}; });
}
inspActs = (function(base){ return function(){ return base.apply(this, arguments).concat(inspAiActs()); }; })(inspActs);
if(typeof inspWhisperLines==='function') inspWhisperLines = (function(base){ return function(){ const a = inspAiStore(); return arr(a.whispers).slice(0, 4).concat(base.apply(this, arguments)); }; })(inspWhisperLines);
function inspAiFacts(){
  const s = inspStore(), from = addDays(todayStr(), -14), out = [];
  if(typeof aboutYouContext==='function') out.push(aboutYouContext());
  const done = s.log.filter(function(x){ return x.date >= from; }).map(function(x){ return x.label || inspAct(x.act).label; });
  out.push('What he did for himself the last two weeks: '+(done.length ? done.slice(-20).join(', ') : 'nothing logged')+'.');
  const hidden = typeof inspHidden==='function' ? inspHidden().map(function(id){ return inspAct(id).label; }) : [];
  if(hidden.length) out.push('Ideas he said aren’t him: '+hidden.join(', ')+'.');
  const sl = typeof lastNightSleep==='function' ? lastNightSleep() : null; if(sl) out.push('Slept '+fmtDurationLabel(sl.minutes)+' last night.');
  const wx = typeof wxNow==='function' ? wxNow() : null; if(wx) out.push('Weather: '+wx.temp+'° and '+wxLabel(wx.code).toLowerCase()+'.');
  out.push('Deep work today: '+fmtDurationLabel(deepWorkMinutesTodayLive())+'.');
  const vb = typeof masterVisionBoard==='function' ? masterVisionBoard() : null;
  if(vb) out.push('His vision board ('+vb.name+'): '+arr(vb.elements).map(function(el){ return el.body || el.title || el.text || el.caption || ''; }).filter(Boolean).slice(0, 12).join(', ')+'.');
  const w = typeof wakeCfg==='function' ? wakeCfg() : {}; if(w.places) out.push('Places he likes: '+w.places+'.');
  return out.join('\n');
}
async function inspAiRefresh(){
  const a = inspAiStore(), today = todayStr();
  if(a.date===today || a.busy || AI.hasKey!==true || typeof aiWrite!=='function') return;
  a.busy = true;
  try{
    const t = await Promise.race([aiWrite('You’re filling my Inspiration page: a calm, dreamy place for my mind, away from work. From what you know about me below, write:\n'+
      '1) four small things I could do today or this week that would actually feed me (rest, people, outside, creative, curious). Specific to me and to today, gentle, never productivity or work. Each: one emoji, a label of at most four words, a "why" of at most ten words, and a category from mind, move, home, people, unplug.\n'+
      '2) three quiet lines that might drift across the sky: hopeful, about what I’m building toward and who it’s for, never a nudge or an order, at most twelve words each.\n'+
      'Answer with JSON only: {"ideas":[{"e":"","label":"","why":"","cat":""}],"whispers":[""]}\n\n'+inspAiFacts(), {max:500}), new Promise(function(r){ setTimeout(r, 15000); })]);
    const m = /\{[\s\S]*\}/.exec(String(t||'')); if(!m) return;
    const j = JSON.parse(m[0]);
    const clean = function(x, n){ return String(x||'').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); };
    a.ideas = arr(j.ideas).map(function(x){ return {e:clean(x.e, 8) || '&#10024;', label:clean(x.label, 40), why:clean(x.why, 90), cat:clean(x.cat, 10).toLowerCase()}; }).filter(function(x){ return x.label; }).slice(0, 5);
    a.whispers = arr(j.whispers).map(function(x){ return clean(x, 110); }).filter(Boolean).slice(0, 4);
    a.date = today; persist('personal');
    if(typeof inspOpenNow==='function' && inspOpenNow()) inspRender();
  }catch(e){} finally { a.busy = false; }
}

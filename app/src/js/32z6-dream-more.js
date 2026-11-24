// ============ INSPIRATION, ROUND 27: MORE OF IT, AND KINDER TO USE ============
// More ideas, scattered like they grew there (spaced out, never on top of each other, drifting a little),
// and Stream: the same ideas floating left to right across the sky, forever. The panel bottom-left folds
// away. New wishes, words and thoughts find open sky. Letting something go dissolves it, with a soft
// falling chime, and anything you logged (or an idea that isn't you) can go. Now and then a quiet line
// drifts by, from what you're building and who it's for; never a nudge. And more music, in Tide's vein.

INSP_ACTS.push(
  {id:'sunset', e:'&#127749;', label:'Watch the sunset', cat:'move', pts:1, why:'Phone down. Just watch it go.'},
  {id:'bath', e:'&#128704;', label:'A long hot shower', cat:'home', pts:1, why:'No rush. Let the day wash off.'},
  {id:'swim', e:'&#127946;', label:'Get in the water', cat:'move', pts:2, why:'A pool, the ocean, a cold plunge.'},
  {id:'bookstore', e:'&#128218;', label:'Wander a bookstore', cat:'mind', pts:1, why:'Leave with whatever finds you.'},
  {id:'trip', e:'&#9992;&#65039;', label:'Plan a trip', cat:'mind', pts:1, why:'Somewhere you’ve always wanted. Just look.'},
  {id:'dance', e:'&#128131;', label:'Dance in the kitchen', cat:'home', pts:1, why:'One song, loud. Nobody’s watching.'},
  {id:'letter', e:'&#9993;&#65039;', label:'Write someone a note', cat:'people', pts:1, why:'Tell them what they mean to you.'},
  {id:'stars', e:'&#127756;', label:'Look at the stars', cat:'unplug', pts:1, why:'Five minutes outside after dark.'},
  {id:'grateful', e:'&#128588;', label:'Three good things', cat:'mind', pts:1, why:'Write down three things that went right.'},
  {id:'drive', e:'&#128663;', label:'A drive with music', cat:'unplug', pts:1, why:'Windows down, no destination.'},
  {id:'friends', e:'&#129761;', label:'See a friend', cat:'people', pts:2, why:'In person. Coffee, a walk, anything.'}
);

// ---- the layout: scattered like it grew there (the same every time, so nothing jumps around) ----
function inspRand(seed){ let t = seed >>> 0; return function(){ t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, t | 1); r ^= r + Math.imul(r ^ r >>> 7, r | 61); return ((r ^ r >>> 14) >>> 0)/4294967296; }; }
function inspScatter(acts){
  const key = acts.map(function(a){ return a.id; }).join(',');
  if(ui._inspScatter && ui._inspScatter.key===key) return ui._inspScatter.out;
  const rnd = inspRand(acts.length*7919 + 17), placed = [], out = [];
  acts.forEach(function(a, i){
    const s = 104 + Math.round(rnd()*30);
    let best = null;
    for(let tries = 0; tries < 160; tries++){
      // rings that widen as they fill, wider than tall (screens are)
      const r = 270 + Math.min(900, i*34) * (0.55 + rnd()*0.6), ang = rnd()*Math.PI*2;
      const x = Math.round(Math.cos(ang)*r*1.55), y = Math.round(Math.sin(ang)*r*0.78);
      if(Math.abs(x) < 300 && y < -330 && y > -720) continue;            // the vision board
      if(Math.hypot(x, y*1.15) < 330) continue;                           // you (and Log something), in the middle
      let ok = true; for(let k = 0; k < placed.length; k++){ const q = placed[k]; if(Math.hypot(q.x - x, q.y - y) < (q.s + s)/2 + 46){ ok = false; break; } }
      if(ok){ best = {x:x, y:y}; break; }
    }
    if(!best){ const ang = i*2.39996; best = {x:Math.round(Math.cos(ang)*(1300 + i*12)), y:Math.round(Math.sin(ang)*(620 + i*6))}; }
    placed.push({x:best.x, y:best.y, s:s});
    out.push({a:a, x:best.x, y:best.y, s:s, d:(rnd()*7).toFixed(2)*1, t:(6 + rnd()*6).toFixed(1)*1});
  });
  ui._inspScatter = {key:key, out:out};
  return out;
}
// ideas you said aren't you stay out of the way (bring them back from Log something)
function inspHidden(){ const s = inspStore(); if(!Array.isArray(s.hiddenActs)) s.hiddenActs = []; return s.hiddenActs; }

// ---- Stream: the ideas float across, left to right, forever ----
function inspStreamOn(){ return !!inspStore().stream; }
function inspStreamHtml(){
  if(!inspStreamOn()) return '';
  const acts = inspActs().filter(function(a){ return inspHidden().indexOf(a.id) < 0; }), rnd = inspRand(acts.length*31 + 5);
  // lanes above and below the middle (you stay clear); one speed a lane, evenly spaced, so nothing overtakes
  const LANES = [12, 29, 76], laneOf = {};
  acts.forEach(function(a, i){ (laneOf[i % LANES.length] = laneOf[i % LANES.length] || []).push(a); });
  const t = todayStr(), did = {}; inspStore().log.forEach(function(x){ if(x.date===t) did[x.act] = 1; });
  let html = '';
  Object.keys(laneOf).forEach(function(L){
    const list = laneOf[L], dur = 120 + Number(L)*14 + Math.round(rnd()*10);
    list.forEach(function(a, k){
      const s = 96 + Math.round(rnd()*16), delay = (k/list.length)*dur;
      html += '<button class="izb is-stream c-'+a.cat+(did[a.id] ? ' is-did' : '')+'" data-action="inspOpenAct" data-id="'+a.id+'" style="--s:'+s+'px;top:calc('+LANES[L]+'% + '+Math.round(rnd()*18 - 9)+'px);animation-duration:'+dur+'s, '+(6 + rnd()*5).toFixed(1)+'s;animation-delay:-'+delay.toFixed(1)+'s, -'+(rnd()*7).toFixed(1)+'s">'+
        '<span class="izb-e">'+a.e+'</span><span class="izb-l">'+escapeHtml(a.label)+'</span>'+(did[a.id] ? '<em>&#10003;</em>' : '')+'</button>';
    });
  });
  return '<div class="insp-stream">'+html+'</div>';
}
ACTIONS.inspStream = function(){ const s = inspStore(); s.stream = !s.stream; persist('personal'); ui.inspOpenAct = null; inspChime(s.stream ? 3 : 1); inspRender(); const L = document.getElementById('insp'); if(L) L.classList.toggle('is-stream', !!s.stream); };

// ---- the panel folds away ----
ACTIONS.inspPanelToggle = function(){ const s = inspStore(); s.panelMin = !s.panelMin; persist('personal'); inspRender(); };

// ---- room on the sky: new things land in open space, never on top of each other ----
function inspOccupied(){
  const s = inspSandStore(), pts = [{x:0, y:0, r:200}];
  inspLayout().acts.forEach(function(p){ pts.push({x:p.x, y:p.y, r:p.s/2 + 20}); });
  inspLayout().boards.forEach(function(p){ pts.push({x:p.x, y:p.y + p.h/2, r:Math.max(p.w, p.h)/2 + 20}); });
  s.thoughts.forEach(function(t){ pts.push({x:t.x + 115, y:t.y + 50, r:140}); });
  s.wishes.forEach(function(w){ pts.push({x:w.x, y:w.y, r:110}); });
  s.quotes.forEach(function(q){ pts.push({x:q.x + 130, y:q.y + 50, r:160}); });
  return pts;
}
function inspFreeSpot(r){
  const v = ui.inspView || inspHome(), cx = -v.x/v.z, cy = -v.y/v.z, occ = inspOccupied();
  for(let k = 0; k < 220; k++){
    const ang = k*2.39996, dist = 40 + Math.sqrt(k)*70, x = Math.round(cx + Math.cos(ang)*dist*1.4), y = Math.round(cy + Math.sin(ang)*dist*0.8);
    if(occ.every(function(o){ return Math.hypot(o.x - x, o.y - y) > o.r + r; })) return {x:x, y:y};
  }
  return {x:Math.round(cx + (Math.random() - 0.5)*600), y:Math.round(cy + (Math.random() - 0.5)*300)};
}
inspCenterPt = function(){ return inspFreeSpot(110); };
ACTIONS.inspToolThought = function(){ const p = inspFreeSpot(150); inspAddThought(p.x - 115, p.y - 50); };

// ---- letting go: it dissolves upward, and a soft falling chime ----
function inspLetGoChime(){
  try{ if(typeof soundPref==='function' && !soundPref('ui', true)) return; const ctx = getAudioCtx(); if(!ctx) return; const out = sfxOut(ctx);
    [84, 79, 76, 72].forEach(function(m, i){ fmBell(ctx, out, ctx.currentTime + i*0.09, fmHz(m), 0.016 - i*0.002); }); }catch(e){}
}
function inspVanish(el, then){
  inspLetGoChime();
  if(!el){ then(); return; }
  el.classList.add('is-vanish');
  setTimeout(then, 720);
}
ACTIONS.inspThoughtDel = function(el, e, id){ inspVanish(el && el.closest('.izt'), function(){ const s = inspStore(); s.thoughts = s.thoughts.filter(function(t){ return t.id!==id; }); persist('personal'); inspRender(); }); };
ACTIONS.inspWishDel = function(el, e, id){ inspVanish(el && el.closest('.izw'), function(){ const s = inspSandStore(); s.wishes = s.wishes.filter(function(x){ return x.id!==id; }); persist('personal'); inspRender(); }); };
ACTIONS.inspQuoteDel = function(el, e, id){ inspVanish(el && el.closest('.izq'), function(){ const s = inspSandStore(); s.quotes = s.quotes.filter(function(x){ return x.id!==id; }); persist('personal'); inspRender(); }); };
ACTIONS.inspLogDel = function(el, e, id){ inspVanish(el && el.closest('.izl-r'), function(){ const s = inspStore(); s.log = s.log.filter(function(x){ return x.id!==id; }); persist('personal'); try{ xpLast = null; }catch(err){} inspRender(); }); };
ACTIONS.inspHideAct = function(el, e, id){
  const b = document.querySelector('#insp .izb[data-id="'+id+'"]');
  ui.inspOpenAct = null;
  inspVanish(b, function(){ const h = inspHidden(); if(h.indexOf(id) < 0) h.push(id); persist('personal'); ui._inspScatter = null; inspRender(); });
};
ACTIONS.inspUnhideAct = function(el, e, id){ const s = inspStore(); s.hiddenActs = inspHidden().filter(function(x){ return x!==id; }); persist('personal'); ui._inspScatter = null; inspChime(2); inspRender(); };

// ---- whispers: now and then a quiet line drifts across, about what it's all for ----
const INSP_WHISPERS = ['Good things are slow, and then they’re sudden.', 'You’re allowed to enjoy the way there.', 'Rest is part of the work.', 'Everything you want is on the other side of a lot of quiet hours.',
  'Some of the best days haven’t happened yet.', 'Breathe. There’s time.', 'Small, every day, adds up to everything.', 'Look how far you’ve already come.', 'Keep a little room for wonder.'];
function inspWhisperLines(){
  const a = typeof aboutYou==='function' ? aboutYou() : {}, out = INSP_WHISPERS.slice();
  if(a.building) out.push(a.building.replace(/\.$/, '')+'. One quiet hour at a time.');
  if(a.why) out.push('Remember who it’s for: '+a.why.replace(/\.$/, '')+'.');
  if(a.perfect) out.push('A perfect day: '+a.perfect.replace(/\.$/, '')+'. You’re building toward it.');
  const vb = typeof masterVisionBoard==='function' ? masterVisionBoard() : null;
  if(vb && vb.elements && vb.elements.length) out.push('Your vision board isn’t a wish. It’s a direction.', 'Everything on that board is closer than it looks.');
  try{ if(typeof masterGoalDefs==='function') masterGoalDefs().slice(0, 3).forEach(function(m){ if(m.label) out.push(m.label+'. Step by step.'); }); }catch(e){}
  return out;
}
function inspWhisper(){
  const L = document.getElementById('insp'); if(!L || !inspOpenNow() || ui.inspBreath || document.querySelector('#insp .insp-whisper')) return;
  const lines = inspWhisperLines(); let t = lines[Math.floor(Math.random()*lines.length)];
  if(t===ui._inspLastWhisper) t = lines[(lines.indexOf(t) + 1) % lines.length]; ui._inspLastWhisper = t;
  const w = document.createElement('div'); w.className = 'insp-whisper'; w.textContent = t;
  w.style.top = (18 + Math.random()*10)+'%';
  L.appendChild(w); setTimeout(function(){ if(w.parentNode) w.parentNode.removeChild(w); }, 11000);
}
setInterval(function(){ try{ if(typeof inspOpenNow==='function' && inspOpenNow() && Date.now() - (ui.inspOpenedAt||0) > 20000 && Math.random() < 0.55) inspWhisper(); }catch(e){} }, 30000);

// ---- the music: a small player with the track's name ----
function inspMusicPillHtml(){
  const on = typeof musicOn==='function' && musicOn(), tr = FOCUS_TRACKS[FM.idx] || {};
  return '<div class="insp-mp'+(on ? ' is-on' : '')+'">'+
    '<button class="insp-mp-b" data-action="inspMusic" title="'+(on ? 'Pause' : 'Play')+'">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9654;')+'</button>'+
    '<span class="insp-mp-n" id="inspTrack">'+escapeHtml(tr.name || 'Music')+'</span>'+
    '<button class="insp-mp-b is-next" data-action="inspNext" title="Next track">&#9197;</button></div>';
}
ACTIONS.inspNext = function(){
  const dream = FOCUS_TRACKS.map(function(t, i){ return t.dream ? i : -1; }).filter(function(i){ return i >= 0; });
  const at = dream.indexOf(FM.idx), next = dream.length ? dream[(at + 1) % dream.length] : (FM.idx + 1) % FOCUS_TRACKS.length;
  const was = typeof musicOn==='function' && musicOn();
  if(was){ FM.switching = true; focusMusicStop(); setTimeout(function(){ FM.switching = false; focusMusicPlay(next); ui.inspMusic = true; inspRender(); }, 700); }
  else { FM.idx = next; FM.bar = 0; focusMusicPlay(next); ui.inspMusic = true; setTimeout(inspRender, 60); }
};
setInterval(function(){ const n = document.getElementById('inspTrack'); if(n && FOCUS_TRACKS[FM.idx] && n.textContent!==FOCUS_TRACKS[FM.idx].name) n.textContent = FOCUS_TRACKS[FM.idx].name; }, 1500);

// ---- more music, in Tide's vein ----
FOCUS_TRACKS.push(
  {name:'Moonwater', style:'ocean', dream:true, bpm:38, prog:[[41,48,53,57],[38,45,50,57],[43,50,55,58],[36,43,48,55]], scale:[65,69,72,74,77], hiss:0},
  {name:'Night Rain', style:'rain', dream:true, bpm:52, prog:[[45,52,57,60],[41,48,53,60],[48,55,60,64],[43,50,55,62]], scale:[69,72,74,76,79,81], hiss:0},
  {name:'Lagoon', style:'lagoon', dream:true, bpm:58, prog:[[50,57,62,66],[47,54,59,62],[43,50,55,62],[45,52,57,61]], fig:[0,2,3,2,1,3,2,1], hiss:0}
);
// rain: a soft hiss that comes and goes, slow piano notes falling through it
function fmRain(ctx, out, t, len, vol){
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  const n = Math.floor(ctx.sampleRate*2), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i] = (Math.random()*2 - 1)*(Math.random() < 0.02 ? 1 : 0.35);
  src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 2600 + Math.random()*900; f.Q.value = 0.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len*0.3); g.gain.setValueAtTime(vol, t + len*0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + len*1.08);
  src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + len*1.1);
}
const fmDreamBase = fmDream;
fmDream = function(style){
  if(style==='rain') return function(ctx, out, t, tr, bar){
    const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length];
    fmRain(ctx, out, t, len, 0.02);
    padChord(ctx, out, t, ch.map(fmHz), len*0.5, len*0.25, len*0.9, 0.012);
    const k = bar===0 ? 1 : 2 + Math.floor(fmRand()*2);
    for(let i=0;i<k;i++) fmKey(ctx, out, t + beat*(i*1.5 + fmRand()*0.4), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), beat*3, 0.04);
  };
  if(style==='lagoon') return function(ctx, out, t, tr, bar){
    const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length], step = len/tr.fig.length;
    fmWave(ctx, out, t, len, 0.035);
    padChord(ctx, out, t, ch.slice(0, 3).map(fmHz), len*0.5, len*0.2, len*0.8, 0.011);
    tr.fig.forEach(function(n, i){ if(bar===0 && i > 3) return; fmKey(ctx, out, t + i*step + (i%2 ? 0.02 : 0), fmHz(ch[n % ch.length] + 12), step*4, 0.032 - (i%2 ? 0.008 : 0)); });
  };
  return fmDreamBase(style);
};

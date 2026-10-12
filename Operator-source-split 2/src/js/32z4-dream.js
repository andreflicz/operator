// ============ INSPIRATION, DREAMIER: MORE MUSIC AND A SANDBOX ============
// Five more tracks, made to float (they join the focus playlist; Inspiration opens on one of them), and
// things to play with on the plane: wishes (little stars you name), words worth keeping (a card of old
// wisdom, never a feed), a breathing orb, skies to drift under, Drift (everything else fades and the
// plane slowly wanders on its own) and a soft bloom of light and a chime wherever you tap.

// ---- the music ----
FOCUS_TRACKS.push(
  {name:'Cloud Nine', style:'swell', dream:true, bpm:46, prog:[[50,57,62,64,69],[47,54,59,62,66],[43,50,55,59,64],[45,52,57,61,64]], scale:[74,76,78,81,83,86], hiss:0.002},
  {name:'Lullaby', style:'musicbox', dream:true, bpm:70, prog:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]], fig:[0,2,1,3,2,1,3,2], hiss:0},
  {name:'Glasshouse', style:'glass', dream:true, bpm:62, prog:[[45,52,57,64],[41,48,57,60],[43,50,55,62],[40,47,55,59]], scale:[69,71,72,74,76,79,81,84], hiss:0.001},
  {name:'Tide', style:'ocean', dream:true, bpm:40, prog:[[38,45,50,54],[43,50,55,59],[40,47,52,55],[36,43,48,52]], scale:[62,66,69,71,74], hiss:0},
  {name:'Aurora', style:'swell', dream:true, bpm:44, prog:[[51,58,63,67,70],[48,55,60,63,67],[44,51,56,60,63],[46,53,58,62,65]], scale:[75,77,79,82,84,87], hiss:0.002}
);
// two for work: the same warm sound as the rest of the app, with a steady pulse under it to keep you moving
FOCUS_TRACKS.push(
  {name:'Momentum', style:'drive', work:true, bpm:88, prog:[[45,52,57,60,64],[41,48,53,57,60],[43,50,55,59,62],[40,47,52,55,59]], arp:[0,2,4,2,3,4,2,1], hiss:0.003},
  {name:'Flow State', style:'pulse', work:true, bpm:80, prog:[[50,57,60,65],[46,53,57,62],[43,50,55,58],[45,52,55,60]], scale:[69,72,74,76,79,81], hiss:0.002}
);
// a soft kick: a sine that drops fast, more felt than heard
function fmKick(ctx, out, t, vol){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
}
function fmNoiseBuf(ctx){
  if(FM.noiseBuf && FM.noiseBuf.sampleRate===ctx.sampleRate) return FM.noiseBuf;
  const len = Math.floor(ctx.sampleRate*4), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for(let i=0;i<len;i++){ last = (last + (Math.random()*2-1)*0.08)*0.985; d[i] = last*3; }  // brown-ish: soft, like water
  FM.noiseBuf = buf; return buf;
}
// a wave: soft noise that swells in and draws back over the bar
function fmWave(ctx, out, t, len, vol){
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = fmNoiseBuf(ctx); src.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(1300, t + len*0.45); f.frequency.linearRampToValueAtTime(320, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len*0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + len*1.05);
  src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random()*3); src.stop(t + len*1.1);
}
function fmDream(style){
  if(style==='swell') return function(ctx, out, t, tr, bar){
    const len = 60/tr.bpm*4, ch = tr.prog[bar % tr.prog.length];
    padChord(ctx, out, t, ch.map(fmHz), len*0.55, len*0.25, len*1.1, 0.02);
    padChord(ctx, out, t + len*0.2, ch.slice(2).map(function(m){ return fmHz(m + 12); }), len*0.6, len*0.1, len, 0.006);
    if(bar && fmRand() < 0.6) fmBell(ctx, out, t + len*(0.3 + fmRand()*0.5), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), 0.012);
  };
  if(style==='musicbox') return function(ctx, out, t, tr, bar){
    const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length], step = len/tr.fig.length;
    padChord(ctx, out, t, ch.slice(0, 3).map(fmHz), len*0.4, len*0.3, len*0.6, 0.011);
    tr.fig.forEach(function(n, i){ if(bar===0 && i > 3) return; if((bar + i) % 7===6) return; fmBell(ctx, out, t + i*step + (i%2 ? step*0.06 : 0), fmHz(ch[n % ch.length] + 24), 0.016 - (i%2 ? 0.004 : 0)); });
  };
  if(style==='glass') return function(ctx, out, t, tr, bar){
    const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length];
    padChord(ctx, out, t, ch.map(fmHz), len*0.5, len*0.2, len*0.8, 0.013);
    const k = bar===0 ? 2 : 3 + Math.floor(fmRand()*3);
    for(let i=0;i<k;i++) fmKey(ctx, out, t + beat*(i*(4/k)) + fmRand()*0.12, fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), beat*2.5, 0.035);
  };
  if(style==='drive') return function(ctx, out, t, tr, bar){
    const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length], step = beat/2;
    padChord(ctx, out, t, ch.slice(1).map(fmHz), len*0.3, len*0.4, len*0.5, 0.013);
    fmKey(ctx, out, t, fmHz(ch[0] - 12), len*0.9, 0.07);
    if(bar > 0){ fmKick(ctx, out, t, 0.11); fmKick(ctx, out, t + beat*2, 0.09); if(bar % 2) fmKick(ctx, out, t + beat*3.5, 0.05); }
    for(let i=0;i<8;i++) sfxTap(ctx, out, t + i*step + step*0.5, 5200, i % 2 ? 0.012 : 0.008);
    if(bar > 1) tr.arp.forEach(function(n, i){ if((bar + i) % 6===5) return; fmKey(ctx, out, t + i*step + (i%2 ? 0.012 : 0), fmHz(ch[n % ch.length] + 12), step*2.4, 0.03 - (i%2 ? 0.008 : 0)); });
  };
  if(style==='pulse') return function(ctx, out, t, tr, bar){
    const beat = 60/tr.bpm, len = beat*4, ch = tr.prog[bar % tr.prog.length];
    fmKey(ctx, out, t, fmHz(ch[0] - 12), len, 0.08);
    [0, 1.5, 2.5].forEach(function(b, i){ if(bar===0 && i) return; ch.slice(1).forEach(function(m, k){ fmKey(ctx, out, t + beat*b + k*0.018, fmHz(m), beat*1.6, 0.03); }); });
    if(bar > 0){ fmKick(ctx, out, t, 0.08); fmKick(ctx, out, t + beat*2.5, 0.06); for(let i=0;i<4;i++) sfxTap(ctx, out, t + beat*i + beat*0.5, 6000, 0.01); }
    if(bar > 2 && fmRand() < 0.6) fmBell(ctx, out, t + beat*(1 + Math.floor(fmRand()*3)), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), 0.012);
  };
  if(style==='ocean') return function(ctx, out, t, tr, bar){
    const len = 60/tr.bpm*4, ch = tr.prog[bar % tr.prog.length];
    fmWave(ctx, out, t, len, 0.05);
    padChord(ctx, out, t, ch.map(fmHz), len*0.5, len*0.2, len, 0.014);
    if(bar % 2===1) fmKey(ctx, out, t + len*0.35, fmHz(ch[0] + 12), len*1.2, 0.05);
    if(bar > 1 && fmRand() < 0.45) fmBell(ctx, out, t + len*(0.5 + fmRand()*0.3), fmHz(tr.scale[Math.floor(fmRand()*tr.scale.length)]), 0.01);
  };
  return null;
}
// work mode (Get to work from Good morning, or the work alarm): one of the work tracks, unless music's already on
function workMusicPlay(){
  if(typeof soundPref==='function' && !soundPref('workMusic', true)) return;
  if(typeof musicOn==='function' && musicOn()) return;
  if(typeof opMusicPlaying==='function' && opMusicPlaying()) return;
  const ids = FOCUS_TRACKS.map(function(tr, i){ return tr.work ? i : -1; }).filter(function(i){ return i >= 0; });
  if(typeof focusMusicPlay==='function' && ids.length) focusMusicPlay(ids[Math.floor(Math.random()*ids.length)]);
}
// Inspiration starts on one of the floaty ones
function inspPlayDream(){
  const ids = FOCUS_TRACKS.map(function(tr, i){ return tr.dream ? i : -1; }).filter(function(i){ return i >= 0; });
  if(typeof focusMusicPlay==='function') focusMusicPlay(ids[Math.floor(Math.random()*ids.length)]);
}

// ---- the sandbox ----
const INSP_WORDS = [
  ['What you seek is seeking you.', 'Rumi'], ['Be like a tree and let the dead leaves drop.', 'Rumi'], ['Sell your cleverness and buy bewilderment.', 'Rumi'],
  ['The happiness of your life depends upon the quality of your thoughts.', 'Marcus Aurelius'], ['Very little is needed to make a happy life.', 'Marcus Aurelius'], ['The soul becomes dyed with the colour of its thoughts.', 'Marcus Aurelius'],
  ['Nature does not hurry, yet everything is accomplished.', 'Lao Tzu'], ['The journey of a thousand miles begins with one step.', 'Lao Tzu'],
  ['Go confidently in the direction of your dreams. Live the life you have imagined.', 'Thoreau'], ['I took a walk in the woods and came out taller than the trees.', 'Thoreau'],
  ['Adopt the pace of nature: her secret is patience.', 'Emerson'], ['Do not go where the path may lead; go instead where there is no path and leave a trail.', 'Emerson'],
  ['Let everything happen to you: beauty and terror. Just keep going. No feeling is final.', 'Rilke'],
  ['Keep your face always toward the sunshine, and shadows will fall behind you.', 'Whitman'],
  ['We suffer more often in imagination than in reality.', 'Seneca'], ['Luck is what happens when preparation meets opportunity.', 'Seneca']
];
const INSP_SKIES = [['dusk', 'Dusk'], ['aurora', 'Aurora'], ['deep', 'Deep sea'], ['candy', 'Cotton candy'], ['gold', 'Golden hour']];
const INSP_STAR_HUES = [48, 320, 200, 270, 160];
function inspSandStore(){ const s = inspStore(); if(!Array.isArray(s.wishes)) s.wishes = []; if(!Array.isArray(s.quotes)) s.quotes = []; return s; }
function inspCenterPt(spread){ const v = ui.inspView || inspHome(); return {x:Math.round(-v.x/v.z + (Math.random()-0.5)*(spread||260)), y:Math.round(-v.y/v.z + (Math.random()-0.5)*(spread||260)*0.6)}; }
// anything you can move on the plane: a thought, a wish or some words
function inspFindItem(id){ const s = inspSandStore(); return s.thoughts.find(function(x){ return x.id===id; }) || s.wishes.find(function(x){ return x.id===id; }) || s.quotes.find(function(x){ return x.id===id; }); }
function inspSandHtml(){
  const s = inspSandStore();
  return s.wishes.map(function(w){ return '<div class="izw" data-wish="'+w.id+'" style="left:'+w.x+'px;top:'+w.y+'px;--h:'+w.hue+'"><span class="izw-star" data-drag="'+w.id+'" title="Drag me"><i></i></span><input class="izw-t" value="'+escapeHtml(w.text)+'" placeholder="Make a wish…" maxlength="120"><button class="izw-x" data-action="inspWishDel" data-id="'+w.id+'" title="Let it go">&#10005;</button></div>'; }).join('')+
    s.quotes.map(function(q){ return '<div class="izq" data-drag="'+q.id+'" style="left:'+q.x+'px;top:'+q.y+'px"><p>'+escapeHtml(q.q)+'</p><small>'+escapeHtml(q.by)+'</small><button class="izq-x" data-action="inspQuoteDel" data-id="'+q.id+'" title="Let it go">&#10005;</button></div>'; }).join('');
}
function inspToolsHtml(){
  const sky = (INSP_SKIES.find(function(x){ return x[0]===(inspSandStore().sky || 'dusk'); }) || INSP_SKIES[0])[1];
  const b = function(act, ic, label, on){ return '<button class="izk'+(on ? ' is-on' : '')+'" data-action="'+act+'"><span>'+ic+'</span>'+label+'</button>'; };
  return '<div class="insp-tools">'+b('inspToolThought', '&#9998;', 'Thought')+b('inspToolWish', '&#10022;', 'Wish')+b('inspToolWords', '&#10077;', 'Words')+b('inspBreathe', '&#10061;', 'Breathe')+b('inspSky', '&#9790;', sky)+b('inspDrift', '&#8776;', 'Drift', !!ui.inspDrift)+'</div>';
}
function inspFxHtml(){
  return '<div class="insp-aurora"><i></i><i></i></div><div class="insp-bokeh">'+[0,1,2,3,4,5,6,7,8,9].map(function(i){ return '<i style="--i:'+i+'"></i>'; }).join('')+'</div><div class="insp-glow"></div>';
}
ACTIONS.inspToolThought = function(){ const p = inspCenterPt(); inspAddThought(p.x - 110, p.y - 30); };
ACTIONS.inspToolWish = function(){
  const s = inspSandStore(), p = inspCenterPt(), w = {id:uid(), x:p.x, y:p.y, text:'', hue:INSP_STAR_HUES[s.wishes.length % INSP_STAR_HUES.length], at:Date.now()};
  s.wishes.push(w); persist('personal'); inspRender(); inspChime(2);
  setTimeout(function(){ const i = document.querySelector('#insp [data-wish="'+w.id+'"] input'); if(i) i.focus(); }, 40);
};
ACTIONS.inspToolWords = function(){
  const s = inspSandStore(), have = s.quotes.map(function(q){ return q.q; }), pool = INSP_WORDS.filter(function(w){ return have.indexOf(w[0]) < 0; });
  const w = (pool.length ? pool : INSP_WORDS)[Math.floor(Math.random()*(pool.length || INSP_WORDS.length))], p = inspCenterPt(320);
  s.quotes.push({id:uid(), x:p.x - 130, y:p.y - 40, q:w[0], by:w[1], at:Date.now()}); persist('personal'); inspRender(); inspChime(1);
};
ACTIONS.inspWishDel = function(el, e, id){ const s = inspSandStore(); s.wishes = s.wishes.filter(function(x){ return x.id!==id; }); persist('personal'); inspRender(); };
ACTIONS.inspQuoteDel = function(el, e, id){ const s = inspSandStore(); s.quotes = s.quotes.filter(function(x){ return x.id!==id; }); persist('personal'); inspRender(); };
document.addEventListener('input', function(e){
  const i = e.target; if(!i || !i.closest || !i.closest('#insp .izw')) return;
  const w = inspSandStore().wishes.find(function(x){ return x.id===i.closest('.izw').dataset.wish; }); if(w){ w.text = i.value.slice(0, 120); persist('personal'); }
});
ACTIONS.inspSky = function(){
  const s = inspSandStore(), i = INSP_SKIES.findIndex(function(x){ return x[0]===(s.sky || 'dusk'); });
  s.sky = INSP_SKIES[(i + 1) % INSP_SKIES.length][0]; persist('personal');
  const L = document.getElementById('insp'); if(L) L.setAttribute('data-sky', s.sky);
  inspRender();
};
// ---- a chime and a bloom of light wherever you tap the sky ----
function inspChime(k){
  try{ if(typeof soundPref==='function' && !soundPref('ui', true)) return; const ctx = getAudioCtx(); if(!ctx) return; const out = sfxOut(ctx), notes = [72, 74, 76, 79, 81, 84, 86];
    for(let i=0;i<(k||1);i++) fmBell(ctx, out, ctx.currentTime + i*0.11, fmHz(notes[Math.floor(Math.random()*notes.length)]), 0.022); }catch(e){}
}
function inspBloom(cx, cy){
  const L = document.getElementById('insp'); if(!L) return;
  const b = document.createElement('div'); b.className = 'insp-bloom'; b.style.left = cx+'px'; b.style.top = cy+'px';
  b.innerHTML = '<i class="ib-ring"></i>'+[0,1,2,3,4,5,6,7].map(function(i){ const a = i/8*Math.PI*2 + Math.random()*0.5, d = 40 + Math.random()*50; return '<i class="ib-dot" style="--x:'+Math.round(Math.cos(a)*d)+'px;--y:'+Math.round(Math.sin(a)*d)+'px;--d:'+(Math.random()*0.15).toFixed(2)+'s"></i>'; }).join('');
  document.body.appendChild(b); setTimeout(function(){ if(b.parentNode) b.parentNode.removeChild(b); }, 1500);
  inspChime(1);
}
// ---- breathe: in for four, hold for four, out for six; a minute or more counts as meditating ----
const BREATH = [['Breathe in', 4], ['Hold', 4], ['Breathe out', 6]];
ACTIONS.inspBreathe = function(){
  const L = document.getElementById('insp'); if(!L || document.getElementById('inspBreath')) return;
  const o = document.createElement('div'); o.id = 'inspBreath'; o.className = 'insp-breath';
  o.innerHTML = '<div class="ibr-orb"><i></i><i></i><i></i></div><div class="ibr-t">Breathe in</div><div class="ibr-n"></div><button class="ibr-done" data-action="inspBreatheEnd">I’m done</button>';
  document.body.appendChild(o); void o.offsetWidth; o.classList.add('is-in');
  ui.inspBreath = {start:Date.now()};
  let k = 0;
  const step = function(){
    if(!ui.inspBreath) return;
    const ph = BREATH[k % 3], t = o.querySelector('.ibr-t'), orb = o.querySelector('.ibr-orb');
    t.textContent = ph[0]; orb.className = 'ibr-orb is-'+(k % 3===0 ? 'in' : k % 3===1 ? 'hold' : 'out'); orb.style.setProperty('--dur', ph[1]+'s');
    const s = Math.floor((Date.now() - ui.inspBreath.start)/1000); o.querySelector('.ibr-n').textContent = Math.floor(s/60)+':'+String(s % 60).padStart(2, '0');
    k++; ui.inspBreath.t = setTimeout(step, ph[1]*1000);
  };
  step();
  ui.inspBreath.clock = setInterval(function(){ const n = o.querySelector('.ibr-n'); if(n && ui.inspBreath){ const s = Math.floor((Date.now() - ui.inspBreath.start)/1000); n.textContent = Math.floor(s/60)+':'+String(s % 60).padStart(2, '0'); } }, 1000);
};
ACTIONS.inspBreatheEnd = function(){
  const o = document.getElementById('inspBreath'), b = ui.inspBreath; if(!b) return;
  clearTimeout(b.t); clearInterval(b.clock); ui.inspBreath = null;
  const min = Math.round((Date.now() - b.start)/60000);
  if(o){ o.classList.remove('is-in'); setTimeout(function(){ if(o.parentNode) o.parentNode.removeChild(o); }, 600); }
  if(min >= 1){ inspLogAct('meditate', {min:min, note:'Breathing, on Inspiration'}); inspRender(); showToast('&#129496; '+min+' minute'+(min===1 ? '' : 's')+' of breathing. Logged.', {icon:'&#10024;'}); }
};
// ---- drift: the rest fades, the sky slowly wanders, nothing asks anything of you ----
ACTIONS.inspDrift = function(){ ui.inspDrift ? inspDriftStop() : inspDriftStart(); };
function inspDriftStart(){
  const L = document.getElementById('insp'); if(!L) return;
  ui.inspDrift = {base:{x:ui.inspView.x, y:ui.inspView.y}, t0:performance.now()}; L.classList.add('is-drift');
  const tick = function(now){
    if(!ui.inspDrift || !inspOpenNow()) return;
    const s = (now - ui.inspDrift.t0)/1000;
    ui.inspView.x = ui.inspDrift.base.x + Math.sin(s/9)*140 - Math.sin(s/23)*90;
    ui.inspView.y = ui.inspDrift.base.y + Math.cos(s/11)*70;
    inspApply(false); ui.inspDrift.raf = requestAnimationFrame(tick);
  };
  ui.inspDrift.raf = requestAnimationFrame(tick);
  inspRender();
}
function inspDriftStop(){ const L = document.getElementById('insp'); if(ui.inspDrift) cancelAnimationFrame(ui.inspDrift.raf); ui.inspDrift = null; if(L) L.classList.remove('is-drift'); inspRender(); }
// the soft light that follows you around the sky
document.addEventListener('pointermove', function(e){
  const L = inspOpenNow() && document.getElementById('insp'); if(!L) return;
  L.style.setProperty('--mx', e.clientX+'px'); L.style.setProperty('--my', e.clientY+'px');
}, {passive:true});

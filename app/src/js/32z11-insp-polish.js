// ============ INSPIRATION, ROUND 28: WORDS, SOUNDS, SEARCH, AND LETTING GO GENTLY ============
// Words: about every 45 seconds a few words surface somewhere quiet on the sky (never on top of the middle
// or the toolbar), come into focus, drift a little and dissolve. No author, no quote marks, just words.
// Sounds: Inspiration's effects (taps, chimes, letting go, the wind, a bubble popping) have their own
// sound and their own volume, apart from the music: Chimes, Glass, Droplets, Soft keys or Off.
// Change it from Inspiration's toolbar or Settings → Look & Sound.
// Logging something has a search: type "wa" and Walk is right there.
// Letting go is fluid: a logged thing pops off the ring around the middle, a row in "This week" folds
// away, and the panel itself sinks out of sight (and rises back) instead of jumping between sizes.

// ---- the sound ----
const INSP_SFX = [['chimes', 'Chimes'], ['glass', 'Glass'], ['drops', 'Droplets'], ['soft', 'Soft keys'], ['off', 'Off']];
function inspSfxCfg(){ const p = state.profile; if(!p.inspSfx || typeof p.inspSfx!=='object') p.inspSfx = {}; return p.inspSfx; }
function inspSfxStyle(){ const s = inspSfxCfg().style; return INSP_SFX.some(function(x){ return x[0]===s; }) ? s : 'chimes'; }
function inspSfxVol(){ const v = Number(inspSfxCfg().vol); return isFinite(v) && inspSfxCfg().vol!=null ? Math.max(0, Math.min(1, v)) : 0.8; }
function inspSfxOn(){ return inspSfxStyle()!=='off' && inspSfxVol() > 0 && !(typeof soundPref==='function' && !soundPref('ui', true)) && state.profile.soundEnabled!==false; }
function inspOut(ctx){ const g = ctx.createGain(); g.gain.value = inspSfxVol()*1.25; g.connect(sfxOut(ctx)); return g; }
// one note in the chosen sound
function inspNote(ctx, out, t, midi, vol){
  const st = inspSfxStyle(), f = fmHz(midi);
  if(st==='glass'){ fmKey(ctx, out, t, f*2, 1.4, vol*1.6); return; }
  if(st==='soft'){ fmKey(ctx, out, t, f/2, 2.2, vol*2.2); return; }
  if(st==='drops'){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f*1.6, t); o.frequency.exponentialRampToValueAtTime(f*0.9, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol*2.4, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4); return;
  }
  fmBell(ctx, out, t, f, vol);
}
inspChime = function(k){
  try{ if(!inspSfxOn()) return; const ctx = getAudioCtx(); if(!ctx) return; const out = inspOut(ctx), notes = [72, 74, 76, 79, 81, 84, 86];
    for(let i=0;i<(k||1);i++) inspNote(ctx, out, ctx.currentTime + i*0.11, notes[Math.floor(Math.random()*notes.length)], 0.022); }catch(e){}
};
inspLetGoChime = function(){
  try{ if(!inspSfxOn()) return; const ctx = getAudioCtx(); if(!ctx) return; const out = inspOut(ctx);
    [84, 79, 76, 72].forEach(function(m, i){ inspNote(ctx, out, ctx.currentTime + i*0.09, m, 0.016 - i*0.002); }); }catch(e){}
};
if(typeof inspWhoosh==='function') inspWhoosh = (function(base){ return function(level){ if(!inspSfxOn()) return; return base((level||1)*inspSfxVol()*1.25); }; })(inspWhoosh);
// a bubble popping: a quick bright tick and a little shimmer after it
function inspPopSound(){
  try{ if(!inspSfxOn()) return; const ctx = getAudioCtx(); if(!ctx) return; const out = inspOut(ctx), t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.1);
    inspNote(ctx, out, t + 0.05, 88, 0.008); inspNote(ctx, out, t + 0.12, 91, 0.006);
  }catch(e){}
}
ACTIONS.inspSfxSet = function(el, e, id){ inspSfxCfg().style = id; persist('profile'); inspChime(2); if(typeof inspOpenNow==='function' && inspOpenNow()) inspRender(); else renderView(); };
ACTIONS.inspSfxOpen = function(){ ui.inspSfxOpen = !ui.inspSfxOpen; ui.inspWindOpen = false; inspRender(); };
document.addEventListener('input', function(e){
  const t = e.target; if(!t || !t.matches || !t.matches('[data-insp-vol]')) return;
  inspSfxCfg().vol = Number(t.value)/100; clearTimeout(ui._inspVolT); ui._inspVolT = setTimeout(function(){ persist('profile'); inspChime(1); }, 250);
  document.querySelectorAll('[data-insp-vol-v]').forEach(function(x){ x.textContent = t.value+'%'; });
  document.querySelectorAll('[data-insp-vol]').forEach(function(x){ if(x!==t) x.value = t.value; });
});
function inspSfxControlsHtml(){
  const st = inspSfxStyle(), v = Math.round(inspSfxVol()*100);
  return '<div class="isx-styles">'+INSP_SFX.map(function(x){ return '<button class="isx-s'+(x[0]===st ? ' is-on' : '')+'" data-action="inspSfxSet" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    '<div class="isx-vol'+(st==='off' ? ' is-off' : '')+'"><span>&#128264;</span><input type="range" min="0" max="100" step="5" data-insp-vol value="'+v+'"><b data-insp-vol-v>'+v+'%</b></div>';
}
// in Inspiration's toolbar: a Sounds button with its own little panel
inspToolsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const btn = '<span class="izk-wrap"><button class="izk'+(ui.inspSfxOpen ? ' is-on' : '')+'" data-action="inspSfxOpen"><span>&#127925;</span>Sounds</button>'+
      (ui.inspSfxOpen ? '<span class="izk-wind izk-sfx"><small>Sound effects</small>'+inspSfxControlsHtml()+'</span>' : '')+'</span>';
    return h.replace(/<\/div>$/, btn+'</div>');
  };
})(inspToolsHtml);
// and in Settings → Look & Sound
soundSettingsHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<\/div>$/, '<div class="card section"><div class="snd-h"><div><div class="section-title" style="margin:0;">&#10024; Inspiration</div><div class="kpi-sub">The taps, chimes and pops on Inspiration, apart from the music.</div></div><button class="btn btn-ghost btn-sm" data-action="inspSfxPreview">&#9654; Hear it</button></div>'+inspSfxControlsHtml()+'</div></div>');
  };
})(soundSettingsHtml);
ACTIONS.inspSfxPreview = function(){ inspChime(3); setTimeout(inspPopSound, 600); setTimeout(inspLetGoChime, 1100); };

// ---- words on the sky, about every 45 seconds ----
const INSP_WORD_SLOTS = [[12, 24], [62, 22], [16, 70], [64, 72], [38, 14], [40, 80]];   // [left%, top%] away from the middle and the toolbar
inspWhisper = function(){};   // (the old one sat on the page and blinked out when the page redrew)
function inspWords(){
  if(!inspOpenNow() || ui.inspBreath || document.querySelector('.insp-words')) return;
  const lines = inspWhisperLines(); if(!lines.length) return;
  let t = lines[Math.floor(Math.random()*lines.length)]; if(t===ui._inspLastWhisper) t = lines[(lines.indexOf(t) + 1) % lines.length]; ui._inspLastWhisper = t;
  t = String(t).replace(/^["“]|["”]$/g, '').replace(/\s+[—-]\s+[A-Z][\w .]+$/, '');
  let slot = Math.floor(Math.random()*INSP_WORD_SLOTS.length); if(slot===ui._inspWordSlot) slot = (slot + 1) % INSP_WORD_SLOTS.length; ui._inspWordSlot = slot;
  const w = document.createElement('div'); w.className = 'insp-words';
  w.style.left = INSP_WORD_SLOTS[slot][0]+'%'; w.style.top = INSP_WORD_SLOTS[slot][1]+'%';
  t.split(/\s+/).forEach(function(word, i){ const s = document.createElement('span'); s.textContent = word; s.style.animationDelay = (0.25 + i*0.11).toFixed(2)+'s'; w.appendChild(s); w.appendChild(document.createTextNode(' ')); });
  document.body.appendChild(w);
  setTimeout(function(){ w.classList.add('is-out'); }, 8200);
  setTimeout(function(){ if(w.parentNode) w.parentNode.removeChild(w); }, 10600);
}
setInterval(function(){ try{ if(typeof inspOpenNow==='function' && inspOpenNow() && Date.now() - (ui.inspOpenedAt||0) > 12000 && Date.now() - (ui._inspWordsAt||0) > 44000){ ui._inspWordsAt = Date.now(); inspWords(); } }catch(e){} }, 3000);
closeInspire = (function(base){ return function(){ document.querySelectorAll('.insp-words').forEach(function(w){ w.classList.add('is-out'); setTimeout(function(){ if(w.parentNode) w.parentNode.removeChild(w); }, 900); }); ui.inspSfxOpen = false; return base.apply(this, arguments); }; })(closeInspire);

// ---- search when logging ----
inspHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(ui.inspSheet) h = h.replace('<div class="izs-h">What did you do?</div>', '<div class="izs-h">What did you do?</div><div class="izs-find"><span>&#128269;</span><input id="inspFind" placeholder="Search: walk, read, gym…" autocomplete="off" value="'+escapeHtml(ui.inspFind||'')+'"></div>');
    return h;
  };
})(inspHtml);
function inspFindApply(){
  const i = document.getElementById('inspFind'); if(!i) return;
  const q = i.value.trim().toLowerCase(); ui.inspFind = i.value;
  let n = 0;
  document.querySelectorAll('#insp .izs-grid .izs-a').forEach(function(b){ const hit = !q || b.textContent.toLowerCase().indexOf(q) >= 0; b.classList.toggle('is-hidden', !hit); if(hit) n++; });
  const g = document.querySelector('#insp .izs-grid'); if(g) g.classList.toggle('is-none', n===0);
}
document.addEventListener('input', function(e){ if(e.target && e.target.id==='inspFind') inspFindApply(); });
document.addEventListener('keydown', function(e){
  if(!e.target || e.target.id!=='inspFind' || e.key!=='Enter') return;
  const first = document.querySelector('#insp .izs-grid .izs-a:not(.is-hidden)'); if(first){ e.preventDefault(); first.click(); }
});
ACTIONS.inspLogSheet = (function(base){ return function(){ ui.inspFind = ''; base.apply(this, arguments); if(ui.inspSheet) setTimeout(function(){ const i = document.getElementById('inspFind'); if(i) i.focus(); inspFindApply(); }, 60); }; })(ACTIONS.inspLogSheet);

// ---- letting go, fluidly ----
// a logged thing pops off the ring around the middle (and its row folds away)
function inspPopStone(logId){
  const s = inspStore(), t = todayStr(), today = s.log.filter(function(x){ return x.date===t; }).slice(-8), k = today.findIndex(function(x){ return x.id===logId; });
  if(k < 0) return false;
  const stone = document.querySelectorAll('#inspWorld .izh-stone')[k]; if(!stone) return false;
  const r = stone.getBoundingClientRect(), b = document.createElement('div'); b.className = 'insp-pop'; b.style.left = (r.left + r.width/2)+'px'; b.style.top = (r.top + r.height/2)+'px';
  b.innerHTML = '<i class="ip-ring"></i>'+[0,1,2,3,4,5,6,7,8,9].map(function(i){ const a = i/10*Math.PI*2 + Math.random()*0.4, d = 26 + Math.random()*22; return '<i class="ip-drop" style="--x:'+Math.round(Math.cos(a)*d)+'px;--y:'+Math.round(Math.sin(a)*d)+'px"></i>'; }).join('');
  document.body.appendChild(b); setTimeout(function(){ if(b.parentNode) b.parentNode.removeChild(b); }, 900);
  stone.classList.add('is-pop');
  return true;
}
function inspFoldRow(row, then){
  if(!row){ then(); return; }
  row.style.height = row.offsetHeight+'px'; void row.offsetHeight;
  row.classList.add('is-fold'); row.style.height = '0px';
  setTimeout(then, 460);
}
ACTIONS.inspLogDel = function(el, e, id){
  const popped = inspPopStone(id);
  if(popped) inspPopSound(); else inspLetGoChime();
  inspFoldRow(el && el.closest('.izl-r'), function(){ const s = inspStore(); s.log = s.log.filter(function(x){ return x.id!==id; }); persist('personal'); try{ xpLast = null; }catch(err){} inspRender(); });
};
ACTIONS.inspUndo = (function(base){ return function(el, e, id){ if(inspPopStone(id)) inspPopSound(); const self = this, args = arguments; setTimeout(function(){ base.apply(self, args); }, 320); }; })(ACTIONS.inspUndo);
// "Not for me": the bubble pops instead of fading
ACTIONS.inspHideAct = function(el, e, id){
  const b = document.querySelector('#insp .izb[data-id="'+id+'"]');
  ui.inspOpenAct = null;
  if(b){ const r = b.getBoundingClientRect(), p = document.createElement('div'); p.className = 'insp-pop is-big'; p.style.left = (r.left + r.width/2)+'px'; p.style.top = (r.top + r.height/2)+'px';
    p.innerHTML = '<i class="ip-ring"></i>'+[0,1,2,3,4,5,6,7,8,9,10,11].map(function(i){ const a = i/12*Math.PI*2 + Math.random()*0.3, d = 60 + Math.random()*40; return '<i class="ip-drop" style="--x:'+Math.round(Math.cos(a)*d)+'px;--y:'+Math.round(Math.sin(a)*d)+'px"></i>'; }).join('');
    document.body.appendChild(p); setTimeout(function(){ if(p.parentNode) p.parentNode.removeChild(p); }, 1000); b.classList.add('is-pop'); }
  inspPopSound();
  setTimeout(function(){ const h = inspHidden(); if(h.indexOf(id) < 0) h.push(id); persist('personal'); ui._inspScatter = null; inspRender(); }, 360);
};
// the "This week" panel sinks out of sight (and rises back) instead of jumping between sizes
ACTIONS.inspPanelToggle = function(){
  const s = inspStore();
  if(!s.panelMin){
    const p = document.querySelector('#insp .insp-lately');
    if(p){ p.classList.add('is-leaving'); inspLetGoChime(); setTimeout(function(){ s.panelMin = true; persist('personal'); inspRender(); const m = document.querySelector('#insp .insp-lately-min'); if(m){ m.classList.add('is-arriving'); setTimeout(function(){ m.classList.remove('is-arriving'); }, 600); } }, 420); return; }
    s.panelMin = true;
  } else {
    const m = document.querySelector('#insp .insp-lately-min');
    if(m) m.classList.add('is-leaving');
    inspChime(2);
    setTimeout(function(){ s.panelMin = false; persist('personal'); inspRender(); const p = document.querySelector('#insp .insp-lately'); if(p){ p.classList.add('is-arriving'); setTimeout(function(){ p.classList.remove('is-arriving'); }, 700); } }, m ? 260 : 0);
    return;
  }
  persist('personal'); inspRender();
};

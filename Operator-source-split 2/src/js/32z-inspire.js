// ============ INSPIRATION: A PLACE FOR YOUR MIND ============
// A full-screen, endless, dreamy plane, with no business on it. Bubbles of things that clear your head (a walk,
// a book, ten minutes of breathing, a clean room, a grocery run, meal prep, somewhere new), your vision
// board and your other boards (not the business ones), and thoughts you leave wherever you like
// (double-click anywhere to write one). Music plays while you're here (pause it any time).
// Logging what you do builds Inspiration, a score that only lives on this page, and it feeds Mind, a
// stat on Personal that mixes Inspiration with your Health and Discipline.
const INSP_ACTS = [
  {id:'walk', e:'&#128694;', label:'Go for a walk', cat:'move', pts:2, why:'No podcast. Let your head wander.'},
  {id:'read', e:'&#128214;', label:'Read', cat:'mind', pts:2, why:'Twenty pages of something good.'},
  {id:'meditate', e:'&#129496;', label:'Meditate', cat:'mind', pts:2, why:'Ten minutes. Just breathe.'},
  {id:'journal', e:'&#9997;&#65039;', label:'Write it out', cat:'mind', pts:1, why:'Get what’s in your head onto paper.'},
  {id:'inspire', e:'&#127916;', label:'Watch something inspiring', cat:'mind', pts:1, why:'A talk or a film that lifts you. Not a feed.'},
  {id:'listen', e:'&#127911;', label:'Listen, properly', cat:'mind', pts:1, why:'An album, start to finish, nothing else.'},
  {id:'clean', e:'&#129529;', label:'Clean your room', cat:'home', pts:1, why:'A clear room is a clear head.'},
  {id:'cozy', e:'&#128367;&#65039;', label:'Make the house cozy', cat:'home', pts:1, why:'Tidy up, warm light, make it feel like home.'},
  {id:'groceries', e:'&#128722;', label:'Grocery run', cat:'home', pts:1, why:'Fill the fridge with good food.'},
  {id:'mealprep', e:'&#127857;', label:'Meal prep', cat:'home', pts:2, why:'Future you will thank you.'},
  {id:'cook', e:'&#127859;', label:'Cook something real', cat:'home', pts:1, why:'Take your time with it.'},
  {id:'explore', e:'&#129517;', label:'Explore somewhere new', cat:'move', pts:2, why:'A street, a park, a café you’ve never been to.'},
  {id:'nature', e:'&#127795;', label:'Time in nature', cat:'move', pts:2, why:'Trees, water, sky. Phone in your pocket.'},
  {id:'sun', e:'&#9728;&#65039;', label:'Get some sun', cat:'move', pts:1, why:'Ten minutes of daylight on your face.'},
  {id:'stretch', e:'&#129336;', label:'Stretch or yoga', cat:'move', pts:1, why:'Undo the chair.'},
  {id:'call', e:'&#128222;', label:'Call someone you love', cat:'people', pts:1, why:'A real call, not a text.'},
  {id:'unplug', e:'&#128245;', label:'An hour, no phone', cat:'unplug', pts:2, why:'No scrolling. See how it feels.'},
  {id:'create', e:'&#127912;', label:'Make something for fun', cat:'mind', pts:1, why:'Draw, play, build. No goal.'}
];
const INSP_CATS = {mind:'Mind', move:'Moving', home:'Home', people:'People', unplug:'Unplugged'};
function inspStore(){
  const p = state.personal || (state.personal = {});
  if(!p.inspire || typeof p.inspire!=='object') p.inspire = {};
  const s = p.inspire;
  if(!Array.isArray(s.log)) s.log = [];
  if(!Array.isArray(s.thoughts)) s.thoughts = [];
  return s;
}
// your places (Settings → You) become walks of their own
function inspActs(){
  const places = String((typeof wakeCfg==='function' && wakeCfg() && wakeCfg().places) || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean).slice(0, 4);
  return INSP_ACTS.concat(places.map(function(pl, i){ return {id:'place'+i, e:'&#128205;', label:'Walk to '+pl, cat:'move', pts:2, why:'One of your places.', place:pl}; }));
}
function inspAct(id){ return inspActs().find(function(a){ return a.id===id; }) || INSP_ACTS[0]; }
// ---- the score: Inspiration (0..1) over the last two weeks ----
// each day: what you did (a walk, a book, meditating count double), up to a point; how many days you did
// something; and how varied it was (mind, moving, home, people, unplugged)
function inspDayPts(d){ return Math.min(4, inspStore().log.filter(function(x){ return x.date===d; }).reduce(function(s, x){ return s + (inspAct(x.act).pts || 1); }, 0)); }
function inspScore(){
  const t = todayStr(), log = inspStore().log;
  if(!log.length) return null;
  let pts = 0, active = 0;
  for(let i=0;i<14;i++){ const d = addDays(t, -i), p = inspDayPts(d); pts += p; if(p) active++; }
  const cats = {}; log.forEach(function(x){ if(x.date > addDays(t, -7)) cats[inspAct(x.act).cat] = 1; });
  const variety = Math.min(1, Object.keys(cats).length/4);
  return Math.max(0, Math.min(1, .45*Math.min(1, pts/14/2.5) + .35*active/14 + .2*variety));
}
function inspRate(){ const f = inspScore(); return f==null ? null : Math.round(25 + 75*f); }
function inspStreak(){ let n = 0, d = todayStr(); if(!inspDayPts(d)) d = addDays(d, -1); while(inspDayPts(d) && n < 400){ n++; d = addDays(d, -1); } return n; }
// three things for today (the same three all day; a different three tomorrow)
function inspPicks(){
  const acts = inspActs(), seed = Number(todayStr().replace(/-/g, ''));
  const done = {}; inspStore().log.forEach(function(x){ if(x.date===todayStr()) done[x.act] = 1; });
  const out = []; for(let i=0; out.length < 3 && i < acts.length*2; i++){ const a = acts[(seed*7 + i*5) % acts.length]; if(out.indexOf(a)<0 && !done[a.id]) out.push(a); }
  return out;
}
// ---- logging ----
function inspLogAct(id, opts){
  opts = opts || {};
  const a = inspAct(id), s = inspStore();
  const e = {id:uid(), act:a.id, label:a.label, at:Date.now(), date:todayStr(), min:Number(opts.min)||null, note:String(opts.note||'').slice(0, 280)};
  s.log.push(e); if(s.log.length > 2000) s.log = s.log.slice(-2000);
  persist('personal');
  try{ xpLast = null; }catch(err){}
  return e;
}
ACTIONS.inspLog = function(el, e, id){
  const x = inspLogAct(id);
  inspRipple(); if(typeof playTick==='function') playTick();
  ui.inspOpenAct = null;
  inspRender();
  showToast(inspAct(id).e+' '+inspAct(id).label+'. Logged.', {icon:'&#10024;', actionLabel:'Undo', actionAction:'inspUndo', actionId:x.id, duration:6000});
};
ACTIONS.inspUndo = function(el, e, id){ const s = inspStore(); s.log = s.log.filter(function(x){ return x.id!==id; }); persist('personal'); try{ xpLast = null; }catch(err){} inspRender(); };
ACTIONS.inspOpenAct = function(el, e, id){ ui.inspOpenAct = ui.inspOpenAct===id ? null : id; inspRender(); };
ACTIONS.inspLogSheet = function(){ ui.inspSheet = !ui.inspSheet; ui.inspOpenAct = null; inspRender(); };
ACTIONS.inspLogFromSheet = function(el, e, id){
  const n = document.getElementById('inspNote'), m = document.getElementById('inspMin');
  const x = inspLogAct(id, {note:n ? n.value : '', min:m ? m.value : null});
  ui.inspSheet = false; inspRipple(); inspRender();
  showToast(inspAct(id).e+' '+inspAct(id).label+'. Logged.', {icon:'&#10024;', actionLabel:'Undo', actionAction:'inspUndo', actionId:x.id, duration:6000});
};
// ---- thoughts: double-click anywhere to write one; drag it by its top; they stay where you leave them ----
const INSP_TINTS = ['#ffd1e8', '#d4c8ff', '#c8f2ff', '#fff1c8', '#d0ffe4'];
function inspAddThought(x, y){
  const s = inspStore(), t = {id:uid(), x:Math.round(x), y:Math.round(y), text:'', tint:INSP_TINTS[s.thoughts.length % INSP_TINTS.length], at:Date.now()};
  s.thoughts.push(t); persist('personal'); inspRender();
  setTimeout(function(){ const ta = document.querySelector('#insp [data-thought="'+t.id+'"] textarea'); if(ta) ta.focus(); }, 40);
}
ACTIONS.inspThoughtDel = function(el, e, id){ const s = inspStore(); s.thoughts = s.thoughts.filter(function(t){ return t.id!==id; }); persist('personal'); inspRender(); };
document.addEventListener('input', function(e){
  const ta = e.target; if(!ta || !ta.closest || !ta.closest('#insp .izt')) return;
  const id = ta.closest('.izt').dataset.thought, t = inspStore().thoughts.find(function(x){ return x.id===id; });
  if(t){ t.text = ta.value.slice(0, 2000); persist('personal'); }
});
// ---- the page ----
function inspOpenNow(){ return !!document.querySelector('#insp.is-in'); }
function openInspire(){
  let L = document.getElementById('insp');
  if(!L){ L = document.createElement('div'); L.id = 'insp'; L.className = 'insp'; document.body.appendChild(L); inspBind(L); }
  ui.inspOpen = true; ui.inspSheet = false; ui.inspOpenAct = null;
  if(!ui.inspView) ui.inspView = inspHome();
  try{ xpLast = null; }catch(e){}
  inspRender();
  void L.offsetWidth; L.classList.add('is-in');
  document.body.classList.add('insp-on');
  // music while you're here (yours stays on if it was already playing)
  if(typeof focusMusicPlay==='function' && !(typeof musicOn==='function' && musicOn()) && !(typeof opMusicPlaying==='function' && opMusicPlaying())){ try{ focusMusicPlay(); ui.inspMusic = true; }catch(e){} }
  if(typeof trueFullSet==='function' && typeof trueFullOn==='function' && trueFullOn()) try{ trueFullSet(true); }catch(e){}
  ui.inspHintAt = Date.now();
  setTimeout(function(){ const h = document.querySelector('#insp .insp-hint'); if(h) h.classList.add('is-gone'); }, 6500);
}
function closeInspire(){
  const L = document.getElementById('insp'); if(!L) return;
  L.classList.remove('is-in'); ui.inspOpen = false; document.body.classList.remove('insp-on');
  if(ui.inspMusic && typeof focusMusicStop==='function'){ focusMusicStop(); ui.inspMusic = false; }
  if(typeof trueFullSet==='function' && typeof wantTrueFull==='function' && !wantTrueFull()) try{ trueFullSet(false); }catch(e){}
  if(ui.view==='personal') renderView();
}
ACTIONS.openInspire = function(){ openInspire(); };
ACTIONS.closeInspire = function(){ closeInspire(); };
ACTIONS.inspMusic = function(){
  if(typeof musicOn==='function' && musicOn()){ if(typeof focusMusicStop==='function') focusMusicStop(); ui.inspMusic = false; }
  else if(typeof focusMusicPlay==='function'){ focusMusicPlay(); ui.inspMusic = true; }
  setTimeout(inspRender, 60);
};
ACTIONS.inspCenter = function(){ ui.inspView = inspHome(); inspApply(true); };
ACTIONS.inspBoard = function(el, e, id){ ui.inspBoard = id; inspRender(); };
ACTIONS.inspBoardClose = function(){ ui.inspBoard = null; inspRender(); };
document.addEventListener('keydown', function(e){
  if(!inspOpenNow() || e.key!=='Escape') return;
  if(e.target && /TEXTAREA|INPUT/.test(e.target.tagName)){ e.target.blur(); return; }
  e.stopPropagation();
  if(ui.inspBoard){ ui.inspBoard = null; inspRender(); } else if(ui.inspSheet || ui.inspOpenAct){ ui.inspSheet = false; ui.inspOpenAct = null; inspRender(); } else closeInspire();
}, true);
// the boards that belong here: your vision board first, then the rest that aren't business
function inspBoards(){
  const m = typeof masterVisionBoard==='function' ? masterVisionBoard() : null;
  const all = arr(state.boards && state.boards.boards).filter(function(b){ return !b.parentId && b.category!=='business' && b.elements && b.elements.length; });
  return (m && m.category!=='business' && m.elements.length ? [m] : []).concat(all.filter(function(b){ return !m || b.id!==m.id; })).slice(0, 8);
}
// where things sit on the plane (the middle is 0,0)
function inspLayout(){
  const acts = inspActs(), n = acts.length, out = {acts:[], boards:[]};
  // two loose rings of ideas around you, wider than they are tall (screens are)
  const inner = Math.ceil(n/2), outer = n - inner;
  acts.forEach(function(a, i){
    const ring = i < inner ? 0 : 1, k = ring ? i - inner : i, m = ring ? outer : inner;
    const ang = -Math.PI/2 + (k/m)*Math.PI*2 + (ring ? Math.PI/m : 0);
    const rx = ring ? 700 : 420, ry = ring ? 330 : 232;
    out.acts.push({a:a, x:Math.round(Math.cos(ang)*rx), y:Math.round(Math.sin(ang)*ry), s:ring ? 116 : 126, d:(i*0.37) % 4});
  });
  // your vision board just above, the rest further out (wander to find them)
  inspBoards().forEach(function(b, i, list){
    if(i===0) return out.boards.push({b:b, x:0, y:-545, w:420, h:236});
    const k = i - 1, m = Math.max(1, list.length - 1), ang = Math.PI*0.08 + (k/m)*Math.PI*1.84;
    out.boards.push({b:b, x:Math.round(Math.cos(ang)*1180), y:Math.round(Math.sin(ang)*620 + 120), w:340, h:210});
  });
  return out;
}
// the first look: everything around you, and your vision board, on the screen at once
function inspHome(){ const h = window.innerHeight || 900, z = Math.max(0.55, Math.min(1, h/1150)); return {x:0, y:Math.round(125*z), z:z}; }
function inspHtml(){
  const s = inspStore(), lay = inspLayout(), rate = inspRate(), t = todayStr();
  const todayLog = s.log.filter(function(x){ return x.date===t; });
  const picks = inspPicks().map(function(a){ return a.id; });
  const mind = typeof xpSummary==='function' ? (function(){ try{ const sub = xpSummary().attrs.PER.subs.find(function(x){ return x.label==='Mind'; }); return sub ? sub.v : null; }catch(e){ return null; } })() : null;
  const v = ui.inspView || inspHome();
  const ring = function(val, size){ const r = size/2 - 6, c = 2*Math.PI*r, f = val==null ? 0 : (val-25)/75; return '<svg class="izh-ring" viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'"><defs><linearGradient id="ihG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb3e6"/><stop offset=".5" stop-color="#b8a4ff"/><stop offset="1" stop-color="#8ff0ff"/></linearGradient></defs>'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="izh-track"/><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" class="izh-fill" stroke="url(#ihG)" stroke-dasharray="'+(c*f).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/></svg>'; };
  const open = ui.inspOpenAct ? inspAct(ui.inspOpenAct) : null;
  const board = ui.inspBoard ? arr(state.boards.boards).find(function(b){ return b.id===ui.inspBoard; }) : null;
  const recent = s.log.slice(-12).reverse();
  return '<div class="insp-sky" style="--px:'+(v.x*0.12).toFixed(1)+'px;--py:'+(v.y*0.12).toFixed(1)+'px"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>'+
    '<div class="insp-stars" style="--px:'+(v.x*0.3).toFixed(1)+'px;--py:'+(v.y*0.3).toFixed(1)+'px"></div>'+
    '<div class="insp-plane" id="inspPlane"><div class="insp-world" id="inspWorld" style="transform:translate('+v.x+'px,'+v.y+'px) scale('+v.z+')">'+
      // the middle: you
      '<div class="izh" style="left:0;top:0"><div class="izh-glow"></div>'+ring(rate, 200)+
        '<div class="izh-c"><small>Inspiration</small><b>'+(rate==null ? '&ndash;' : rate)+'</b><span>'+(todayLog.length ? todayLog.length+' today' : 'Nothing yet today')+'</span></div>'+
        '<button class="izh-log" data-action="inspLogSheet">Log something</button>'+
        todayLog.slice(-8).map(function(x, i){ const ang = -Math.PI/2 + i*(Math.PI*2/8); return '<i class="izh-stone" style="--x:'+Math.round(Math.cos(ang)*118)+'px;--y:'+Math.round(Math.sin(ang)*118)+'px" title="'+escapeHtml(x.label)+'">'+inspAct(x.act).e+'</i>'; }).join('')+
      '</div>'+
      // ideas
      lay.acts.map(function(p){ const a = p.a, did = todayLog.some(function(x){ return x.act===a.id; });
        return '<button class="izb'+(picks.indexOf(a.id)>=0 ? ' is-pick' : '')+(did ? ' is-did' : '')+(ui.inspOpenAct===a.id ? ' is-open' : '')+' c-'+a.cat+'" data-action="inspOpenAct" data-id="'+a.id+'" style="left:'+p.x+'px;top:'+p.y+'px;--s:'+p.s+'px;--d:'+p.d.toFixed(2)+'s"><span class="izb-e">'+a.e+'</span><span class="izb-l">'+escapeHtml(a.label)+'</span>'+(did ? '<em>&#10003;</em>' : '')+'</button>'; }).join('')+
      (open ? (function(){ const p = lay.acts.find(function(q){ return q.a.id===open.id; }) || {x:0, y:0};
        return '<div class="izb-card" style="left:'+p.x+'px;top:'+p.y+'px"><div class="izb-card-e">'+open.e+'</div><b>'+escapeHtml(open.label)+'</b><p>'+escapeHtml(open.why)+'</p>'+
          '<div class="izb-card-r"><button class="izb-do" data-action="inspLog" data-id="'+open.id+'">I did this</button><button class="izb-x" data-action="inspOpenAct" data-id="'+open.id+'">Later</button></div></div>'; })() : '')+
      // boards
      lay.boards.map(function(p, i){ return '<div class="izd'+(i===0 ? ' is-vision' : '')+'" data-action="inspBoard" data-id="'+p.b.id+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+p.w+'px;height:'+p.h+'px">'+boardStaticHtml(p.b, 'insp-board')+'<span class="izd-n">'+(i===0 ? '&#9733; ' : '')+escapeHtml(p.b.name)+'</span></div>'; }).join('')+
      // thoughts
      s.thoughts.map(function(t){ return '<div class="izt" data-thought="'+t.id+'" style="left:'+t.x+'px;top:'+t.y+'px;--t:'+t.tint+'"><div class="izt-h" data-drag="'+t.id+'"><span>Thought</span><button data-action="inspThoughtDel" data-id="'+t.id+'" title="Let it go">&#10005;</button></div><textarea placeholder="Write anything…" maxlength="2000">'+escapeHtml(t.text)+'</textarea></div>'; }).join('')+
    '</div></div>'+
    // what stays put
    '<div class="insp-top"><button class="insp-x" data-action="closeInspire" title="Back (Esc)">&#10005;</button><div class="insp-word">Inspiration<small>a place for your mind</small></div>'+
      '<span style="flex:1"></span>'+
      '<button class="insp-b" data-action="inspCenter" title="Back to the middle">&#9678;</button>'+
      '<button class="insp-b'+(typeof musicOn==='function' && musicOn() ? ' is-on' : '')+'" data-action="inspMusic" title="'+(typeof musicOn==='function' && musicOn() ? 'Pause the music' : 'Play music')+'">'+(typeof musicOn==='function' && musicOn() ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9835;')+'</button></div>'+
    '<div class="insp-scores"><div><b>'+(rate==null ? '&ndash;' : rate)+'</b><span>Inspiration</span></div>'+(mind!=null ? '<div><b>'+mind+'</b><span>Mind</span></div>' : '')+'<div><b>'+inspStreak()+'</b><span>day streak</span></div></div>'+
    '<div class="insp-lately"><div class="izl-h">Lately</div>'+(recent.length ? recent.map(function(x){ return '<div class="izl-r"><span>'+inspAct(x.act).e+'</span><b>'+escapeHtml(x.label)+'</b><small>'+(x.date===t ? fmtTimeShort(x.at) : weekdayShort(x.date))+'</small></div>'; }).join('') : '<div class="izl-none">What you log shows up here.</div>')+'</div>'+
    '<div class="insp-hint'+(Date.now() - (ui.inspHintAt||0) > 6500 ? ' is-gone' : '')+'">Drag to wander · scroll to zoom · double-click anywhere to write a thought</div>'+
    (ui.inspSheet ? '<div class="insp-sheet-bg" data-action="inspLogSheet"></div><div class="insp-sheet"><div class="izs-h">What did you do?</div>'+
      '<div class="izs-grid">'+inspActs().map(function(a){ return '<button class="izs-a c-'+a.cat+'" data-action="inspLogFromSheet" data-id="'+a.id+'"><span>'+a.e+'</span>'+escapeHtml(a.label)+'</button>'; }).join('')+'</div>'+
      '<div class="izs-more"><input class="input" id="inspMin" type="number" min="0" placeholder="Minutes (optional)"><input class="input" id="inspNote" placeholder="A note (optional): the book, the place, how it felt"></div></div>' : '')+
    (board ? '<div class="insp-bview" data-action="inspBoardClose">'+boardStaticHtml(board, 'insp-board-big')+'<div class="izv-n">'+escapeHtml(board.name)+'</div><button class="insp-x izv-x" data-action="inspBoardClose">&#10005;</button></div>' : '');
}
function inspRender(){
  const L = document.getElementById('insp'); if(!L) return;
  morphInto(L, inspHtml());
  requestAnimationFrame(function(){ if(typeof fitStaticBoards==='function') fitStaticBoards(L); });
}
// a soft ring of light from the middle when you log something
function inspRipple(){
  const w = document.getElementById('inspWorld'); if(!w) return;
  const r = document.createElement('i'); r.className = 'insp-ripple'; w.appendChild(r);
  setTimeout(function(){ if(r.parentNode) r.parentNode.removeChild(r); }, 1600);
}
// ---- moving around: drag to pan (it glides a little after you let go), wheel to zoom ----
function inspApply(smooth){
  const w = document.getElementById('inspWorld'), v = ui.inspView; if(!w || !v) return;
  w.style.transition = smooth ? 'transform .9s cubic-bezier(.2,.8,.2,1)' : 'none';
  w.style.transform = 'translate('+v.x+'px,'+v.y+'px) scale('+v.z+')';
  const sky = document.querySelector('#insp .insp-sky'), st = document.querySelector('#insp .insp-stars');
  if(sky){ sky.style.setProperty('--px', (v.x*0.12).toFixed(1)+'px'); sky.style.setProperty('--py', (v.y*0.12).toFixed(1)+'px'); }
  if(st){ st.style.setProperty('--px', (v.x*0.3).toFixed(1)+'px'); st.style.setProperty('--py', (v.y*0.3).toFixed(1)+'px'); }
}
function inspBind(L){
  let drag = null, glide = 0;
  L.addEventListener('pointerdown', function(e){
    if(e.button!==0) return;
    const th = e.target.closest('[data-drag]');
    if(th){ const t = inspStore().thoughts.find(function(x){ return x.id===th.dataset.drag; }); if(!t) return; drag = {thought:t, el:th.closest('.izt'), sx:e.clientX, sy:e.clientY, ox:t.x, oy:t.y}; e.preventDefault(); return; }
    if(!e.target.closest('#inspPlane') || e.target.closest('button, textarea, input, .izt, .izd, .izb-card')) return;
    cancelAnimationFrame(glide);
    drag = {sx:e.clientX, sy:e.clientY, ox:ui.inspView.x, oy:ui.inspView.y, lx:e.clientX, ly:e.clientY, lt:performance.now(), vx:0, vy:0};
    L.classList.add('is-panning');
  });
  window.addEventListener('pointermove', function(e){
    if(!drag) return;
    if(drag.thought){ const z = ui.inspView.z; drag.thought.x = Math.round(drag.ox + (e.clientX - drag.sx)/z); drag.thought.y = Math.round(drag.oy + (e.clientY - drag.sy)/z); drag.el.style.left = drag.thought.x+'px'; drag.el.style.top = drag.thought.y+'px'; return; }
    const now = performance.now(), dt = Math.max(1, now - drag.lt);
    drag.vx = (e.clientX - drag.lx)/dt; drag.vy = (e.clientY - drag.ly)/dt; drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
    ui.inspView.x = drag.ox + (e.clientX - drag.sx); ui.inspView.y = drag.oy + (e.clientY - drag.sy); inspApply(false);
  });
  window.addEventListener('pointerup', function(){
    if(!drag) return;
    if(drag.thought){ persist('personal'); drag = null; return; }
    L.classList.remove('is-panning');
    // a little glide, like water
    let vx = drag.vx*16, vy = drag.vy*16; drag = null;
    const step = function(){ vx *= 0.92; vy *= 0.92; if(Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) return; ui.inspView.x += vx; ui.inspView.y += vy; inspApply(false); glide = requestAnimationFrame(step); };
    glide = requestAnimationFrame(step);
  });
  L.addEventListener('wheel', function(e){
    if(!e.target.closest('#inspPlane') || e.target.closest('textarea')) return;
    e.preventDefault();
    const v = ui.inspView, z0 = v.z, z = Math.max(0.35, Math.min(1.6, z0 * Math.exp(-e.deltaY*0.0015)));
    const r = L.getBoundingClientRect(), cx = e.clientX - r.width/2, cy = e.clientY - r.height/2;
    v.x = cx - (cx - v.x)*(z/z0); v.y = cy - (cy - v.y)*(z/z0); v.z = z; inspApply(false);
  }, {passive:false});
  L.addEventListener('dblclick', function(e){
    if(!e.target.closest('#inspPlane') || e.target.closest('button, textarea, .izt, .izd, .izb, .izh, .izb-card')) return;
    const r = L.getBoundingClientRect(), v = ui.inspView;
    inspAddThought((e.clientX - r.width/2 - v.x)/v.z - 110, (e.clientY - r.height/2 - v.y)/v.z - 30);
  });
}
// ---- Good morning: a rainbow bubble, like the journal's, that opens it ----
function inspOrbEnsure(){
  let o = document.getElementById('inspOrb');
  if(!o){ o = document.createElement('button'); o.id = 'inspOrb'; o.className = 'insp-orb'; o.setAttribute('data-action', 'openInspire'); o.title = 'Inspiration'; o.innerHTML = '<span class="io-film"></span><span class="io-core"></span><span class="io-shine"></span>'; document.body.appendChild(o); }
  const gm = typeof overlayOpen==='function' && overlayOpen('wakeOverlay') && ui.wakeMode==='brief';
  o.classList.toggle('is-on', !!gm && !inspOpenNow());
}
setInterval(function(){ try{ inspOrbEnsure(); }catch(e){} }, 400);

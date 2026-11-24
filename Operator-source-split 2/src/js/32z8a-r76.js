// ================= Round 76 =================
// Client cycles start when you say. Holiday music is gone (Apple Music plays a playlist for the holiday instead),
// the season sits right at the top, XP leaves the sidebar and gets a real Quests section, the app goes nearly idle
// in the background, quotes just turn (no editing), Op can write a playbook, Op has personalities, and a touch on
// a lead counts on its client card too.

// ---------------- 1. a lead and its client card are the same people ----------------
// Logged a touch on a lead: if the same company is also a client card (or the lead was converted), the client's
// "overdue" counts it too, and the other way round.
function r76Norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function r76Twin(kind, x){
  if(!x) return null;
  const nm = r76Norm(x.company || x.business || x.name);
  if(kind==='lead'){
    if(x.convertedClientId){ const c = arr(state.business.clients).find(function(c){ return c.id===x.convertedClientId; }); if(c) return c; }
    if(nm.length < 3) return null;
    return arr(state.business.clients).find(function(c){ return r76Norm(c.business || c.name)===nm || r76Norm(c.name)===nm; }) || null;
  }
  const l = arr(state.business.pipeline).find(function(p){ return p.convertedClientId===x.id; }); if(l) return l;
  if(nm.length < 3) return null;
  return arr(state.business.pipeline).find(function(p){ return r76Norm(p.company || p.name)===nm; }) || null;
}
crmLastTouchRaw = (function(base){
  return function(kind, x){
    const a = base.apply(this, arguments), tw = r76Twin(kind, x); if(!tw) return a;
    const b = base.call(this, kind==='lead' ? 'client' : 'lead', tw);
    return !a ? b : !b ? a : (a > b ? a : b);
  };
})(crmLastTouchRaw);
logTouch = (function(base){
  return function(kind, id){
    const r = base.apply(this, arguments);
    try{ const x = crmFind(kind, id), tw = r76Twin(kind, x); if(tw && tw.followUp && tw.followUp.date && todayStr() >= tw.followUp.date){ tw.followUp = null; persist('business'); } }catch(e){}
    return r;
  };
})(logTouch);

// ---------------- 2. when a client's cycle starts ----------------
// Each client's month runs from the day you pick (the 15th to the 14th, say), not the 1st. Click the cycle dates
// in the client backlog to change it. Their weekly tasks re-make themselves for the new cycle.
function r76CycleDay(c){ const d = Number(c && c.cycleDay); return d >= 1 && d <= 28 ? d : Math.max(1, Math.min(28, Number(c && c.billingDay) || 1)); }
dvwCycle = function(c, date){
  const bd = r76CycleDay(c);
  const d = new Date((date || todayStr())+'T12:00:00');
  let y = d.getFullYear(), m = d.getMonth();
  if(d.getDate() < bd){ m--; if(m < 0){ m = 11; y--; } }
  return {start:todayStr(new Date(y, m, bd)), end:addDays(todayStr(new Date(y, m + 1, bd)), -1)};
};
clientBacklogHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/(<div class="cbl-client" data-cid="([^"]+)"[\s\S]*?)<small>Cycle ([^<]*)<\/small>/g, function(m, pre, cid, dates){
      const c = arr(state.business.clients).find(function(x){ return x.id===cid; }); if(!c) return m;
      return pre+'<button class="r76-cyc" data-action="r76Cyc" data-id="'+escapeHtml(cid)+'" title="Change when their cycle starts">Cycle '+dates+' <i>Change</i></button>';
    });
    if(ui.r76Cyc){
      const c = arr(state.business.clients).find(function(x){ return x.id===ui.r76Cyc; });
      if(c){
        const cur = r76CycleDay(c), opts = []; for(let d = 1; d <= 28; d++) opts.push('<option value="'+d+'"'+(d===cur ? ' selected' : '')+'>the '+ordinal(d)+'</option>');
        const cy = dvwCycle(c), ed = '<div class="r76-cyce"><span>Their cycle starts on</span><select class="input input-sm" id="r76CycDay">'+opts.join('')+'</select><span>of each month</span>'+
          '<small>Now: '+fmtDateShort(cy.start)+' – '+fmtDateShort(cy.end)+'</small><button class="btn btn-sm btn-primary" data-action="r76CycSave" data-id="'+escapeHtml(c.id)+'">Save</button><button class="btn btn-sm btn-ghost" data-action="r76Cyc" data-id="">Cancel</button></div>';
        h = h.replace(new RegExp('(<div class="cbl-client" data-cid="'+c.id.replace(/[^\w-]/g, '')+'"[^>]*>[\\s\\S]*?<div class="cbl-h">[\\s\\S]*?</div>)'), '$1'+ed);
      }
    }
    return h;
  };
})(clientBacklogHtml);
ACTIONS.r76Cyc = function(el, e, id){ ui.r76Cyc = id || null; playTick(); renderView(); };
ACTIONS.r76CycSave = function(el, e, id){
  const c = arr(state.business.clients).find(function(x){ return x.id===id; }); if(!c) return;
  const s = document.getElementById('r76CycDay'), d = Math.max(1, Math.min(28, Number(s && s.value) || 1));
  c.cycleDay = d; ui.r76Cyc = null; persist('business');
  try{ masterTasksSync(); }catch(x){}
  playPositive(); renderView();
  const cy = dvwCycle(c); showToast((c.business || c.name)+': this cycle is '+fmtDateShort(cy.start)+' – '+fmtDateShort(cy.end)+'.', {icon:'&#128197;'});
};

// ---------------- 3. holidays: no app music, Apple Music instead; the season fits the top ----------------
r60MusicPlay = function(){ try{ if(typeof r60MusicStop==='function') r60MusicStop(); }catch(e){} };
setTimeout(function(){ try{ if(typeof R60!=='undefined' && R60.music) r60MusicStop(); }catch(e){} }, 0);
const R76_HOL_MUSIC = {
  thanksgiving:{q:'Thanksgiving Dinner', u:'https://music.apple.com/us/search?term=Thanksgiving%20Dinner', icon:'&#129411;'},
  christmas:{q:'Essential Christmas', u:'https://music.apple.com/us/playlist/essential-christmas/pl.b0e04e25887741ea845e1d5c88397fd4', icon:'&#127876;'},
  halloween:{q:'Halloween Party', u:'https://music.apple.com/us/search?term=Halloween%20Party', icon:'&#127875;'},
  newyear:{q:'New Year’s Eve', u:'https://music.apple.com/us/search?term=New%20Years%20Eve%20Party', icon:'&#127878;'},
  valentines:{q:'Love Songs', u:'https://music.apple.com/us/search?term=Valentines%20Day', icon:'&#10084;&#65039;'},
  stpatricks:{q:'St. Patrick’s Day', u:'https://music.apple.com/us/search?term=St%20Patricks%20Day', icon:'&#9752;&#65039;'},
  easter:{q:'Easter', u:'https://music.apple.com/us/search?term=Easter%20Sunday', icon:'&#128035;'},
  july4:{q:'Fourth of July', u:'https://music.apple.com/us/search?term=Fourth%20of%20July', icon:'&#127878;'},
  birthday:{q:'Birthday Party', u:'https://music.apple.com/us/search?term=Birthday%20Party', icon:'&#127874;'}
};
function r76HolMusic(){ const h = typeof holActive==='function' ? holActive() : null; return h && R76_HOL_MUSIC[h] ? Object.assign({h:h}, R76_HOL_MUSIC[h]) : null; }
ACTIONS.r60HolMusic = ACTIONS.r76HolMusic = function(){
  const M = r76HolMusic(); if(!M) return;
  if(typeof helperFetch!=='function'){ window.open(M.u, '_blank'); return; }
  showToast('Putting on '+M.q+'…', {icon:M.icon});
  helperFetch(MUSIC_URL+'pick?k=playlist&q='+hexUtf8(M.q)+'&u='+hexUtf8(M.u), 6000).then(function(r){
    if(r && r.ok) showToast(M.q+' is playing in Apple Music.', {icon:M.icon});
    else showToast('Opened '+M.q+' in Apple Music. Press play, and add it to your library: next time it starts by itself.', {icon:M.icon, duration:8000});
  }).catch(function(){ window.open(M.u, '_blank'); });
};
// the button lives with the others, top right, only while it's a holiday
dockHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), M = r76HolMusic(); if(!M) return h;
    return h.replace(/<\/div>\s*$/, '<button class="md-b r76-holb" data-action="r76HolMusic" title="'+escapeHtml(M.q)+' on Apple Music">'+M.icon+'</button></div>');
  };
})(dockHtml);
// the bunting stops where the buttons start (they get wider when music plays) and starts after the sidebar
function r76BuntFit(){
  const b = document.querySelector('.hx-bunt'); if(!b) return;
  const d = document.querySelector('#musicDock .md-in') || document.getElementById('musicDock'), sb = document.querySelector('.sidebar');
  const r = d ? d.getBoundingClientRect() : null, s = sb ? sb.getBoundingClientRect() : null;
  if(r && r.width) b.style.right = Math.max(16, Math.round(innerWidth - r.left + 14))+'px';
  b.style.left = (s && s.width && getComputedStyle(sb).display!=='none' ? Math.round(s.right) : 0)+'px';
}
afterRenderHooks.push(function(){ setTimeout(r76BuntFit, 30); });
window.addEventListener('resize', function(){ r76BuntFit(); });
setInterval(function(){ if(!document.hidden && document.querySelector('.hx-bunt')) r76BuntFit(); }, 4000);
// a bit more of the season: a warm glow along the top and a little harvest on the floor
holFxHtml = (function(base){
  return function(h){
    const out = base.apply(this, arguments);
    if(h==='thanksgiving'){
      const gourd = function(x, s, c, d){ return '<svg class="hx-pk r76-gourd" style="left:'+x+'%;--s:'+s+';--dl:'+d+'s" viewBox="0 0 64 58" aria-hidden="true"><path d="M30 10 Q31 3 36 1" stroke="#5A4321" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="36" rx="14" ry="18" fill="'+c+'"/><ellipse cx="44" cy="36" rx="14" ry="18" fill="'+c+'"/><ellipse cx="32" cy="36" rx="15" ry="20" fill="'+c+'" style="filter:brightness(1.12)"/><path d="M32 16 Q27 36 32 56 M32 16 Q37 36 32 56" stroke="rgba(0,0,0,.18)" stroke-width="1.3" fill="none"/></svg>'; };
      return '<i class="r76-warm"></i>'+out+'<div class="hx-floor r76-harvest">'+gourd(30, .55, '#D9822B', 0)+gourd(33.5, .4, '#E0B04A', -1)+gourd(66, .5, '#C2571A', -2)+'</div>';
    }
    if(h==='christmas') return '<i class="r76-warm is-cold"></i>'+out;
    return out;
  };
})(holFxHtml);

// ---------------- 4. XP: out of the sidebar; Quests get their own section ----------------
r72XpNav = function(){ document.querySelectorAll('.sidebar [data-view="xp"], .nav-item[data-view="xp"]').forEach(function(b){ b.remove(); }); };
r72XpPage = (function(base){
  return function(){
    const tab = ui.r76XpTab==='progress' ? 'progress' : 'quests';
    let Q = []; try{ Q = r70Quests(); }catch(e){}
    const open = Q.filter(function(q){ return !q.done; }).length;
    const tabs = '<div class="r76x-tabs"><button class="'+(tab==='quests' ? 'is-on' : '')+'" data-action="r76XpTab" data-id="quests"><i>&#9876;&#65039;</i>Quests'+(open ? '<em>'+open+'</em>' : '')+'</button><button class="'+(tab==='progress' ? 'is-on' : '')+'" data-action="r76XpTab" data-id="progress"><i>&#9670;</i>Progress</button></div>';
    let body = '';
    if(tab==='quests') body = r76QuestsHtml(Q);
    else { body = base.apply(this, arguments).replace(/^<div class="view-header">[\s\S]*?<\/div><\/div><\/div>/, ''); body = body.replace(/<section class="card r74x-qs">[\s\S]*?<\/section>/, ''); }
    return '<div class="view-header r76x-head"><div><div class="view-title">XP</div></div>'+tabs+'</div>'+body;
  };
})(r72XpPage);
ACTIONS.r76XpTab = function(el, e, id){ ui.r76XpTab = id; playTick(); renderView(); };
function r76QuestsHtml(Q){
  const x = xpSummary(), r = RANKS[x.rank] || RANKS[0];
  const daily = Q.filter(function(q){ return !q.weekly; }), weekly = Q.filter(function(q){ return q.weekly; });
  const dDone = daily.filter(function(q){ return q.done; }), wDone = weekly.filter(function(q){ return q.done; });
  const got = dDone.reduce(function(a, q){ return a + q.xp; }, 0), left = daily.filter(function(q){ return !q.done; }).reduce(function(a, q){ return a + q.xp; }, 0);
  const pct = daily.length ? dDone.length/daily.length : 0, C = 2*Math.PI*52;
  const mid = new Date(); mid.setHours(24, 0, 0, 0); const mins = Math.max(0, Math.round((mid - Date.now())/60000));
  const card = function(q){
    return '<button class="r76q'+(q.done ? ' is-done' : '')+'" data-action="'+q.act+'"><span class="r76q-i">'+(q.done ? '&#10003;' : q.icon)+'</span>'+
      '<span class="r76q-t"><b>'+escapeHtml(q.label)+'</b><small>'+(q.done ? 'Done' : q.weekly ? 'Before Sunday' : 'Today')+'</small></span>'+
      '<span class="r76q-x">'+(q.done ? '+'+q.xp.toLocaleString() : '+'+q.xp.toLocaleString())+'<small>XP</small></span></button>';
  };
  const sweep = daily.length && dDone.length===daily.length;
  return '<div class="r76x" style="--rc:'+r.color+'">'+
    '<section class="r76x-hero'+(sweep ? ' is-sweep' : '')+'">'+
      '<div class="r76x-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="t"/><circle cx="60" cy="60" r="52" class="a" stroke-dasharray="'+(C*pct).toFixed(1)+' '+C.toFixed(1)+'"/></svg><div><b>'+dDone.length+'<small>/'+daily.length+'</small></b><span>today</span></div></div>'+
      '<div class="r76x-hm"><div class="r76x-k">'+(sweep ? '&#127942; Clean sweep' : 'Today’s quests')+'</div>'+
        '<div class="r76x-big">'+(sweep ? 'Every one done.' : left ? '+'+left.toLocaleString()+' XP still on the table' : 'Nothing left today')+'</div>'+
        '<div class="r76x-sub"><span><b>+'+got.toLocaleString()+'</b> earned from quests today</span><span>Resets in '+(mins >= 60 ? Math.floor(mins/60)+'h '+(mins % 60)+'m' : mins+'m')+'</span></div>'+
        '<div class="r76x-lv"><span>Level '+x.level+' · '+escapeHtml(r.name)+'</span><i><u style="width:'+Math.min(100, (x.levelPct || 0)*100).toFixed(1)+'%"></u></i><span>'+(x.canLevel ? '<button class="r76x-claim" data-action="r70Claim">Claim level '+(x.level + 1)+'</button>' : (x.levelHi - x.total).toLocaleString()+' to level '+(x.level + 1))+'</span></div>'+
      '</div>'+
    '</section>'+
    '<section class="r76x-sec"><div class="r76x-sh"><b>Today</b><span>'+dDone.length+' of '+daily.length+' done</span></div>'+
      '<div class="r76x-grid">'+daily.filter(function(q){ return !q.done; }).map(card).join('')+dDone.map(card).join('')+'</div></section>'+
    (weekly.length ? '<section class="r76x-sec"><div class="r76x-sh"><b>This week</b><span>'+wDone.length+' of '+weekly.length+' done</span></div><div class="r76x-grid">'+weekly.map(card).join('')+'</div></section>' : '')+
    '<p class="r76x-foot">Quests are real things only. Each one opens where you do it. <button data-action="r76XpTab" data-id="progress">Your level, stats and ranks &#8594;</button></p>'+
  '</div>';
}
// the XP line on Personal and the level chip still open it
ACTIONS.r72OpenXp = function(){ ui.view = 'xp'; ui.r76XpTab = 'quests'; playTick(); renderView(); };

// ---------------- 5. nearly idle in the background ----------------
// When Operator isn't the window you're using, nothing animates: CSS animations pause, the season's falling
// leaves stop, and anything drawn frame by frame (Mind view, the Command Center's sky) drops to one frame a
// second. Timers that matter (alarms, the lock-in clock, activity) keep running as before.
const R76_IDLE = {on:false, t:0};
function r76IdleSet(on){
  if(R76_IDLE.on===on) return; R76_IDLE.on = on;
  document.body.classList.toggle('op-idle', on);
}
function r76IdleCheck(){
  const away = document.hidden || (typeof document.hasFocus==='function' && !document.hasFocus());
  clearTimeout(R76_IDLE.t);
  if(!away){ r76IdleSet(false); return; }
  R76_IDLE.t = setTimeout(function(){ if(document.hidden || !document.hasFocus()) r76IdleSet(true); }, 2500);
}
window.addEventListener('blur', r76IdleCheck); window.addEventListener('focus', r76IdleCheck); document.addEventListener('visibilitychange', r76IdleCheck);
document.addEventListener('pointermove', function(){ if(R76_IDLE.on) r76IdleSet(false); }, {passive:true});
(function(){
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function(cb){
    if(R76_IDLE.on && !(typeof R74CV!=='undefined' && R74CV.ext)) return setTimeout(function(){ raf(cb); }, 1000);
    return raf(cb);
  };
})();

// ---------------- 6. the Command Center: one pen, and quotes you just turn ----------------
// Quotes aren't yours to write: click one (or ↻) for the next. "Done is better than perfect / Facebook office
// poster" is gone for good.
ACTIONS.r75QEdit = function(){ ACTIONS.r75QNext(); };
quoteHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<button class="qt-edit"[^>]*>[\s\S]*?<\/button>/, ''); }; })(quoteHtml);
Object.keys(QUOTE_SETS).forEach(function(kind){
  QUOTE_SETS[kind] = (function(base){ return function(){ const L = base.apply(this, arguments).filter(function(q){ return !/Facebook office poster/i.test(q[1] || ''); }); return L.length ? L : base.apply(this, arguments); }; })(QUOTE_SETS[kind]);
});
r75QuoteHtml = function(){
  if(!r75On('quote')) return '';
  const q = r75QNow();
  return '<footer class="r75-q"><button class="r75-qt" data-action="r75QNext" title="Another one">'+
    '<span>&ldquo;'+escapeHtml(q[0])+'&rdquo;</span>'+(q[1] ? '<small>'+escapeHtml(q[1])+'</small>' : '')+'</button>'+
    '<button class="r75-qn" data-action="r75QNext" title="Another one">&#8635;</button></footer>';
};
r75CcHtml = (function(base){ return function(){ return base.apply(this, arguments).replace('<button class="r75-ic" data-action="r72CmdEdit" title="Customize">&#9998;</button>', '<button class="r75-ic" data-action="r72CmdEdit" title="Customize">&#9881;&#65038;</button>'); }; })(r75CcHtml);
r75EditHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<h4>Quotes<\/h4>[\s\S]*?(<\/div><\/div><\/div><\/div>)$/, '<h4>Quotes</h4><p class="r75-ed-p">They turn by themselves every 40 seconds. Click one (or &#8635;) for the next.</p>$1'); }; })(r75EditHtml);
R75_PANELS.forEach(function(p){ if(p.id==='quote') p.label = 'Quotes (they turn by themselves)'; });
// the Today panel's quote: click for the next one
r72CmdHtml = (function(base){
  return function(mode){
    const h = base.apply(this, arguments);
    return mode==='panel' ? h.replace(/<div class="r71-quote" data-action="r75QEdit"[^>]*>/, '<div class="r71-quote" data-action="r76PanelQ" title="Another one">') : h;
  };
})(r72CmdHtml);
ACTIONS.r76PanelQ = function(){ ui.qOff = ui.qOff || {}; ['work', 'action'].forEach(function(k){ ui.qOff[k] = (ui.qOff[k] || 0) + 1; }); playTick(); renderView(); };
// in the Mind view, locking in doesn't throw the Command Center over the map
r75AutoOn = (function(base){ return function(){ if(typeof r73MindOn==='function' && r73MindOn()) return false; return base.apply(this, arguments); }; })(r75AutoOn);

// ---------------- 7. Op writes a playbook ----------------
pb6NewHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const op = '<div class="r76-pbop"><div class="r76-pbop-h"><b>&#10024; Or have Op make it</b><span>Say what it’s for. He writes the stages and the steps; you change anything after.</span></div>'+
      '<textarea class="input" id="r76PbAsk" rows="3" placeholder="e.g. Onboarding a new reels retainer: kickoff call, content plan, shoot day, first 8 reels, ads live, monthly report"></textarea>'+
      '<button class="btn btn-sm r76-pbop-go" data-action="r76PbOp"'+(ui.r76PbBusy ? ' disabled' : '')+'>'+(ui.r76PbBusy ? 'Op is writing it…' : '&#10024; Make it with Op')+'</button></div>';
    return h.replace(/(<div class="as-f">)/, op+'$1');
  };
})(pb6NewHtml);
ACTIONS.r76PbOp = async function(){
  const N = pb6NewRead(), ask = String((document.getElementById('r76PbAsk') || {}).value || '').trim();
  if(!ask){ const t = document.getElementById('r76PbAsk'); if(t) t.focus(); return; }
  if(AI.hasKey===false){ showToast('Op needs his AI key for this: Settings → Connections & Data.', {icon:'&#9888;'}); return; }
  ui.r76PbBusy = true; addSheetOpen('pb6NewSheet', pb6NewHtml);
  const who = N.for==='lead' ? 'lead' : 'client', crmSt = crmStages(who).filter(function(s){ return s.kind!=='lost'; }).map(function(s){ return s.label; });
  const task = 'Write a '+(who==='lead' ? 'lead follow-up' : 'client')+' playbook for my business. What it’s for: '+ask+'\n'+
    (N.name ? 'Its name: '+N.name+'\n' : '')+
    'My '+(who==='lead' ? 'lead' : 'client')+' stages in the app: '+crmSt.join(', ')+'. Use those stage names where they fit.\n'+
    'Reply with ONLY JSON, no prose, in this shape:\n{"name":"…","stages":[{"name":"…","days":7,"steps":[{"title":"…","day":1}]}]}\n'+
    'Rules: 2 to 6 stages, 2 to 7 steps each, steps short and concrete (start with a verb), "day" = which day of that stage it’s due (1 = the day they enter it, max = the stage’s days), days per stage 3 to 30.';
  let txt = null; try{ txt = await aiWrite(task, {max:1800}); }catch(e){}
  ui.r76PbBusy = false;
  let J = null; try{ const m = String(txt || '').match(/\{[\s\S]*\}/); J = m ? JSON.parse(m[0]) : null; }catch(e){}
  if(!J || !Array.isArray(J.stages) || !J.stages.length){ addSheetOpen('pb6NewSheet', pb6NewHtml); showToast('Op couldn’t put that one together. Try saying it another way.', {icon:'&#9888;'}); return; }
  const p = r76PbFromJson(J, who, N);
  pbAll().push(p); ui.pbSel = p.id; ui.pbView = 'build'; ui.pbItem = null; ui.pbWho = who; ui.pb57Stage = p.stages[0].id; ui.pb57StageEdit = false;
  addSheetClose('pb6NewSheet'); pbSave(); playPositive(); renderView();
  showToast('Op made “'+p.name+'”: '+p.stages.length+' stages, '+p.stages.reduce(function(a, s){ return a + s.steps.length; }, 0)+' steps.', {icon:'&#10024;'});
};
function r76PbFromJson(J, who, N){
  const name = String(N.name || J.name || 'New playbook').trim().slice(0, 60);
  const p = pbNew(who, name, 30, {for:who, repeats:N.ends==='again', next:N.ends && N.ends!=='again' ? N.ends : null});
  const st = crmStages(who);
  p.stages = J.stages.slice(0, 8).map(function(s){
    const days = Math.max(1, Math.min(60, Math.round(Number(s.days) || 7)));
    const m = st.find(function(c){ return r76Norm(c.label)===r76Norm(s.name); });
    const S = pb57Stage(String(s.name || 'Stage').slice(0, 50), {crm:m ? m.id : null, days:days});
    S.steps = arr(s.steps).slice(0, 12).map(function(x){
      const d = Math.max(1, Math.round(Number(x.day) || 1));
      return pb57Step(String(x.title || x || 'Step').slice(0, 80), 'task', d >= days ? {rule:'end'} : d<=1 ? {rule:'enter'} : {rule:'day', n:d});
    });
    return S;
  });
  if(!p.stages.length) p.stages = [pb57Stage('Stage 1')];
  p.postDays = []; p.fromOp = true;
  return p;
}

// ---------------- 8. Op's personalities (each with its voice), and a business edge ----------------
const R76_PERSONAS = [
  {id:'operator', name:'The Operator', blurb:'Funny and sharp, with a business brain under it. The default.', voice:'nPczCjzI2devNBz1zQrb', speed:1.05,
   prompt:'Default mode. Funny first, friend first, but when the business comes up you switch on: numbers, offers, the constraint, the next move.'},
  {id:'closer', name:'The Closer', blurb:'Offers, math and volume. Blunt about what makes money.', voice:'N2lVS1w4EtoT3dr4eOWO', speed:1.05,
   prompt:'Closer mode. Talk like a seasoned dealmaker who thinks in offers, math and volume: what’s the constraint, what’s the offer, what’s the number. Short, punchy, a little ruthless about busywork, still funny in a dry way.'},
  {id:'mogul', name:'The Mogul', blurb:'Agency-builder energy: ambition, scale, taste, freedom.', voice:'TX3LPaxmHKxFdv7VOQHJ', speed:1.05,
   prompt:'Mogul mode. Talk like a young agency owner who scaled fast: ambitious, polished, big on systems, hiring, positioning and premium pricing, and on the life the business is supposed to buy. Confident, motivating without being cheesy.'},
  {id:'butler', name:'The Butler', blurb:'Composed, British, dry wit. JARVIS with manners.', voice:'JBFqnCBsd6RMkjVDRZzb', speed:1.0,
   prompt:'Butler mode. Composed, impeccably polite, bone-dry wit. Understatement over hype. Still has opinions and still knows the business cold.'},
  {id:'bro', name:'Big Bro', blurb:'Laid back, real talk, hypes you when it counts.', voice:'bIHbv24MWmeRgasZH58o', speed:1.05,
   prompt:'Big-bro mode. Relaxed, warm, real talk, a little New York in the attitude. Roasts him lightly, has his back, and gets serious fast when money or deadlines are on the line.'},
  {id:'coach', name:'Drill Coach', blurb:'No excuses. Short sentences. Gets you moving.', voice:'pNInz6obpgDQGcFmaJgB', speed:1.1,
   prompt:'Coach mode. Intense and direct, short sentences, zero tolerance for excuses, celebrates effort. Dark humor allowed. Never cruel.'}
];
function r76PersonaId(){ const id = state.profile.opMode; return R76_PERSONAS.some(function(p){ return p.id===id; }) ? id : 'operator'; }
function r76Persona(){ const id = r76PersonaId(); return R76_PERSONAS.find(function(p){ return p.id===id; }); }
const R76_BUSINESS_EDGE = '## Business edge\n'+
  'Under the humor you think like the sharpest people in online business: the offers-and-math obsession of the Hormozi school (what’s the constraint, raise the price, make the offer so good they feel stupid saying no, volume beats luck), the agency-scaling ambition and taste of the Iman Gadzhi crowd (retainers, systems, hiring editors, premium positioning), and a little old-school closer energy. '+
  'You’re still funny and still his friend first. But when money, clients or the business come up, you get sharp: talk in his real numbers (MRR, price per package, hours per reel, cost per client), push retainers over one-offs, higher prices, systems and delegation, and call out busywork that doesn’t move revenue. '+
  'Never put words in those people’s mouths or do impressions of them; it’s a flavour in how you think, not a costume.';
opPersona = (function(base){
  return function(){
    const p = r76Persona();
    return base.apply(this, arguments)+'\n\n'+R76_BUSINESS_EDGE+'\n\n## Mode right now: '+p.name+'\n'+p.prompt;
  };
})(opPersona);
function r76PersonaHtml(){
  const cur = r76PersonaId(), eleven = typeof opEngine==='function' && opEngine()==='eleven';
  return '<div class="card section op-settings" id="r76Persona"><div class="section-title">&#127917; Op’s personality</div>'+
    '<p class="r76-pp">Each one is a way of talking and a voice to match'+(eleven ? '' : ' (the voice changes when Op uses ElevenLabs)')+'. All of them know the business.</p>'+
    '<div class="r76-pgrid">'+R76_PERSONAS.map(function(p){
      return '<button class="r76-pc'+(p.id===cur ? ' is-on' : '')+'" data-action="r76Persona" data-id="'+p.id+'"><b>'+escapeHtml(p.name)+'</b><span>'+escapeHtml(p.blurb)+'</span>'+
        '<em>'+escapeHtml(((ELEVEN_VOICES.find(function(v){ return v[0]===p.voice; }) || [0, ''])[1] || '').split(':')[0])+'</em><i class="r76-pplay" data-action="r76PersonaHear" data-id="'+p.id+'" title="Hear it">&#9654;</i></button>';
    }).join('')+'</div></div>';
}
ACTIONS.r76Persona = function(el, e, id){
  if(e && e.target && e.target.closest && e.target.closest('.r76-pplay')) return;
  const p = R76_PERSONAS.find(function(x){ return x.id===id; }); if(!p) return;
  state.profile.opMode = p.id; persist('profile');
  const w = wakeCfg(); if(opEngine()==='eleven'){ w.elevenVoice = p.voice; w.voiceSpeed = p.speed; persist('focus'); try{ opStop(); opVoiceChanged(); }catch(x){} }
  playTick(); renderView(); showToast('Op is '+p.name+' now.', {icon:'&#127917;'});
};
ACTIONS.r76PersonaHear = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const was = state.profile.opMode, p = R76_PERSONAS.find(function(x){ return x.id===id; }); if(!p) return;
  const w = wakeCfg(), keep = {v:w.elevenVoice, s:w.voiceSpeed};
  if(opEngine()==='eleven'){ w.elevenVoice = p.voice; w.voiceSpeed = p.speed; }
  const line = {operator:'Alright. Three clients, one of them pays most of the bills. Let’s talk about that one.', closer:'Your offer’s fine. Your price isn’t. Fix the price.', mogul:'Retainers, systems, two editors. That’s the whole plan. Let’s build it.', butler:'A reasonable plan, sir. Ambitious, certainly.', bro:'Bro. You said you’d finish those reels yesterday. Let’s go.', coach:'No excuses. Lock in. Now.'}[id];
  try{ opSay(line); }catch(x){ try{ opSpeak(line); }catch(y){} }
  setTimeout(function(){ w.elevenVoice = keep.v; w.voiceSpeed = keep.s; state.profile.opMode = was; }, 400);
};
opVoiceSettingsHtml = (function(base){ return function(){ return r76PersonaHtml()+base.apply(this, arguments); }; })(opVoiceSettingsHtml);

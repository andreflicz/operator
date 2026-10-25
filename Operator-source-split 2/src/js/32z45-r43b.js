// ============ ROUND 43 (build 3b): YOUR AREAS, THE CARD, REWARDS, THE SWITCH-OVER AND THE GUIDE ============

// ---- the card: one rating per area, and the Overall ----
function r43AttrSpans(x, cls){
  return x.attrs.areas.map(function(a){ return '<span style="--ac:'+a.color+'"><b>'+a.v+'</b><small>'+escapeHtml(a.short)+'</small>'+(cls==='lp' ? '<i><u style="width:'+((a.v-25)/75*100).toFixed(0)+'%"></u></i>' : '')+'</span>'; }).join('');
}
function r43SwapAttrs(h, sel, x, cls){
  if(!h || h.indexOf(sel.slice(1))<0) return h;
  const tpl = document.createElement('template'); tpl.innerHTML = h;
  tpl.content.querySelectorAll(sel).forEach(function(el){ el.innerHTML = r43AttrSpans(x, cls); el.style.setProperty('--n', x.attrs.areas.length); el.classList.add('r43-attrs'); });
  return tpl.innerHTML;
}
playerCardHtml = (function(base){ return function(){ return r43SwapAttrs(base.apply(this, arguments), '.pc-attrs', xpSummary()); }; })(playerCardHtml);
playerCardMiniHtml = (function(base){ return function(){ return r43SwapAttrs(base.apply(this, arguments), '.pc-attrs', xpSummary()); }; })(playerCardMiniHtml);
lvlPopHtml = (function(base){
  return function(){
    let h = r43SwapAttrs(base.apply(this, arguments), '.lp-attrs', xpSummary(), 'lp');
    const rw = r43NextRewardHtml(); if(rw) h = h.replace('<div class="lp-stats">', rw+'<div class="lp-stats">');
    return h;
  };
})(lvlPopHtml);
// You: the area ratings, today by area, your areas' habits and timers, the next reward
renderYouTab = (function(base){
  return function(){
    const h = base.apply(this, arguments), x = xpSummary();
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const grid = tpl.content.querySelector('.you-attrs');
    if(grid){ grid.innerHTML = x.attrs.areas.map(r43AttrCardHtml).join(''); grid.classList.add('r43-you-attrs'); grid.style.setProperty('--n', x.attrs.areas.length); grid.insertAdjacentHTML('beforebegin', r43TodayAreasHtml(x)); }
    const bar = tpl.content.querySelector('.you-xpbar'); if(bar){ const rw = r43NextRewardHtml(); if(rw) bar.insertAdjacentHTML('afterend', rw); }
    return tpl.innerHTML;
  };
})(renderYouTab);
function r43AttrCardHtml(a){
  return '<div class="you-attr" style="--ac:'+a.color+'"><div class="you-attr-h"><b>'+a.v+'</b><span>'+escapeHtml(a.name)+'</span>'+
      (a.cap ? '<em class="you-cap'+(a.capped ? ' is-hit' : '')+'" title="At your weight this tops out at '+a.cap+'. It rises as the weight comes down.">max '+a.cap+'</em>' : '')+'</div>'+
    (a.subs.length ? a.subs.map(function(s){ const v = s.v==null ? 25 : s.v; return '<div class="you-sub'+(s.v==null ? ' is-empty' : '')+(s.label==='Mind' ? ' is-link" data-action="openInspire' : '')+'" title="'+escapeHtml(s.note)+'"><span>'+escapeHtml(s.label)+'</span><i><u style="width:'+((v-25)/75*100).toFixed(0)+'%"></u></i><b>'+(s.v==null ? '–' : s.v)+'</b></div>'; }).join('') : '<div class="you-sub is-empty"><span>Tag tasks, habits and goals to '+escapeHtml(a.name)+' and it fills in</span></div>')+
  '</div>';
}
function r43TodayAreasHtml(x){
  const areas = r43Areas(), L = r43Store(), d = todayStr();
  return '<section class="r43-today"><div class="r43-today-h"><b>Today, by area</b><small>'+(x.todayXp ? '+'+x.todayXp.toLocaleString()+' XP' : 'Nothing yet')+'</small></div><div class="r43-today-g" style="--n:'+areas.length+'">'+
    areas.map(function(a){
      const v = Math.round((x.todayArea || {})[a.id] || 0), touch = a.id==='work' ? XP_BOOK.work.touch : XP_BOOK.personal.touch, ok = v >= touch || (a.id==='work' && isDayOff(d));
      const extra = r43Builtin(a.id) ? '' :
        r43Habits(a).map(function(hb){ const on = !!(hb.days && hb.days[d]); return '<button class="r43-hb'+(on ? ' is-on' : '')+'" data-action="r43AreaHabit" data-id="'+a.id+':'+hb.id+'">'+(on ? '&#10003; ' : '')+escapeHtml(hb.label)+'</button>'; }).join('')+
        '<button class="r43-tm'+(L.timer && L.timer.area===a.id ? ' is-on' : '')+'" data-action="r43AreaTimer" data-id="'+a.id+'">'+(L.timer && L.timer.area===a.id ? '&#9632; Stop · <span data-r43-tick>'+fmtDurationLabel(Math.max(0, Math.floor((Date.now() - L.timer.start)/60000)))+'</span>' : '&#9654; Start a session')+'</button>';
      return '<div class="r43-ta'+(ok ? ' is-ok' : '')+'" style="--ac:'+r43AreaColor(a.id)+'"><div class="r43-ta-h"><span>'+escapeHtml(a.name)+'</span><b>+'+v.toLocaleString()+'</b></div><i><u style="width:'+Math.min(100, v/touch*100).toFixed(0)+'%"></u></i>'+(extra ? '<div class="r43-ta-x">'+extra+'</div>' : '')+'</div>';
    }).join('')+'</div></section>';
}

// ---- rewards you set: "Level 10: new headphones" ----
function r43Rewards(){ const p = state.profile; p.xpRewards = arr(p.xpRewards); return p.xpRewards; }
function r43NextRewardHtml(){
  const x = xpSummary(), rw = r43Rewards();
  const open = rw.filter(function(r){ return r.unlockedAt && !r.claimed; })[0];
  if(open) return '<div class="r43-rw is-open"><span>&#127873; Unlocked: <b>'+escapeHtml(r43RwText(open))+'</b></span><button data-action="r43RewardClaim" data-id="'+open.id+'">I got it</button></div>';
  const next = rw.filter(function(r){ return !r.unlockedAt && Number(r.level) > x.level; }).sort(function(a, b){ return a.level - b.level; })[0];
  return next ? '<div class="r43-rw"><span>&#127873; Level '+next.level+': <b>'+escapeHtml(next.text)+'</b></span><small>'+(xpForLevel(next.level) - x.total > 0 ? (xpForLevel(next.level) - x.total).toLocaleString()+' XP away' : 'ready when you level up')+'</small></div>' : '';
}
function r43RwText(r){ return 'Level '+r.level+': '+r.text; }
ACTIONS.r43RewardClaim = function(el, e, id){ const r = r43Rewards().find(function(x){ return x.id===id; }); if(!r) return; r.claimed = todayStr(); persist('profile'); playPositive(); renderView(); showToast('Enjoy it. You earned it.', {icon:'&#127873;'}); };
ACTIONS.r43RewardAdd = async function(){
  const lv = await uiAsk({title:'A reward for a level', text:'Which level?', value:String(xpSummary().level + 5), ok:'Next'}); if(lv==null) return;
  const L = Math.max(1, Math.min(XP_BOOK.level.max, Math.round(Number(lv)||0))); if(!L) return;
  const txt = await uiAsk({title:'Level '+L+' reward', text:'What do you get when you reach it?', placeholder:'e.g. New headphones', ok:'Add reward'}); if(!txt || !String(txt).trim()) return;
  r43Rewards().push({id:uid(), level:L, text:String(txt).trim().slice(0, 80), unlockedAt:xpSummary().level >= L ? todayStr() : null, claimed:null});
  persist('profile'); renderView();
};
ACTIONS.r43RewardRemove = function(el, e, id){ const p = state.profile; p.xpRewards = r43Rewards().filter(function(r){ return r.id!==id; }); persist('profile'); renderView(); };
ACTIONS.levelUp = (function(base){
  return function(){
    const r = base.apply(this, arguments), L = state.profile.xpLevel;
    const got = r43Rewards().filter(function(x){ return !x.unlockedAt && Number(x.level) <= L; });
    if(got.length){ got.forEach(function(x){ x.unlockedAt = todayStr(); }); persist('profile'); setTimeout(function(){ r43RewardFx(got[0]); }, 4200); }
    return r;
  };
})(ACTIONS.levelUp);
function r43RewardFx(rw){
  const old = document.getElementById('r43RwFx'); if(old) old.remove();
  const d = document.createElement('div'); d.id = 'r43RwFx'; d.className = 'r43-rwfx';
  d.innerHTML = '<div class="r43-rwfx-c"><div class="r43-rwfx-k">REWARD UNLOCKED</div><div class="r43-rwfx-i">&#127873;</div><div class="r43-rwfx-t">'+escapeHtml(rw.text)+'</div><small>Level '+rw.level+'</small><div class="r43-rwfx-a"><button data-action="r43RewardFxClose">Later</button><button class="is-go" data-action="r43RewardClaim" data-id="'+rw.id+'">I got it</button></div></div>';
  document.body.appendChild(d); requestAnimationFrame(function(){ d.classList.add('is-in'); });
  if(typeof tone==='function'){ tone([523, 659, 784], 0.6, 0.16); setTimeout(function(){ tone([784, 1047], 0.9, 0.16); }, 260); }
}
ACTIONS.r43RewardFxClose = function(){ const d = document.getElementById('r43RwFx'); if(d){ d.classList.remove('is-in'); setTimeout(function(){ d.remove(); }, 300); } };
document.addEventListener('click', function(e){ const b = e.target.closest && e.target.closest('#r43RwFx [data-action="r43RewardClaim"]'); if(b) setTimeout(ACTIONS.r43RewardFxClose, 50); });

// ---- the one-time switch-over: every day recounted under the book, shown before it's applied ----
function r43RebalanceNeeded(){ const p = state && state.profile; return !!(p && p.xpBook!==43 && typeof p.xpLevel==='number'); }
afterRenderHooks.push(function(){
  if(!r43RebalanceNeeded() || document.getElementById('r43Rebal') || ui.r43RebalLater) return;
  const p = state.profile; xpLast = null; const x = xpSummary();
  const oldT = Number((p.xpSeen && p.xpSeen.total) || 0), oldL = p.xpLevel, newL = x.earned;
  const d = document.createElement('div'); d.id = 'r43Rebal'; d.className = 'overlay r43-rb';
  d.innerHTML = '<div class="r43-rb-c"><div class="r43-rb-k">[ SYSTEM ] · XP, rebuilt</div><h2>The new XP book</h2>'+
    '<p>XP now comes evenly from every area you track, balanced days pay more, and levels cost less. Every day since '+fmtDateShort(xpStart())+' was recounted under the new rules. Nothing changes until you press the button.</p>'+
    '<div class="r43-rb-g"><div><small>Total XP</small><span>'+oldT.toLocaleString()+'</span><i>&rarr;</i><b>'+x.total.toLocaleString()+'</b></div><div><small>Level</small><span>'+oldL+'</span><i>&rarr;</i><b>'+newL+'</b></div></div>'+
    '<p class="r43-rb-n">After this, your level only goes down if XP was marked wrong (a goal deleted, something un-ticked).</p>'+
    '<div class="r43-rb-a"><button data-action="r43RebalLater">Later</button><button class="is-go" data-action="r43RebalApply">Switch over</button></div></div>';
  document.body.appendChild(d);
});
ACTIONS.r43RebalLater = function(){ ui.r43RebalLater = true; const d = document.getElementById('r43Rebal'); if(d) d.remove(); };
ACTIONS.r43RebalApply = function(){
  const p = state.profile; xpLast = null; const x = xpSummary();
  p.xpLevel = x.earned; p.xpBook = 43; p.xpReadyFor = null; p.rankClaimed = null; p.rankBelowSince = null;
  p.xpSeen = {total:x.total, level:x.earned, init:1};
  persist('profile'); xpLast = null; ui.r43SrcHold = true;
  const d = document.getElementById('r43Rebal'); if(d) d.remove();
  renderView(); showToast('Switched over. Level '+x.earned+'.', {icon:'&#9889;'});
};
// (rank and level ceremonies don't fire for the switch itself)
afterRenderHooks.push(function(){ if(ui.r43SrcHold && state.profile.xpBook===43){ const x = xpSummary(); state.profile.rankReadyFor = x.rankReady || null; } });

// ---- Settings → XP & Areas ----
function r43SettingsHtml(){
  const p = state.profile, raw = r43AreasRaw(), onN = r43Areas().length, rw = r43Rewards().slice().sort(function(a, b){ return a.level - b.level; });
  return '<div class="r43-set">'+
    '<div class="section-title">Your areas</div><p class="r43-set-p">What XP and your card are built on. Each area you track should earn about the same in a strong week, and a day that touches all of them pays more. Up to '+XP_BOOK.areas.max+' in all.</p>'+
    '<div class="r43-areas">'+raw.map(function(a){
      const on = a.on!==false;
      return '<div class="r43-ar'+(on ? '' : ' is-off')+'" style="--ac:'+r43AreaColor(a.id)+'"><i></i><input class="input r43-ar-n" data-r43-area="'+a.id+'" value="'+escapeHtml(a.name)+'" maxlength="20">'+
        '<small>'+(a.id==='work' ? 'Deep work, tasks'+(r43ClientsOn() ? ', clients' : '')+(r43ContentOn() ? ', content' : '') : a.id==='health' ? 'Workouts, food, weigh-ins, sleep' : a.id==='personal' ? 'Journal, inspiration, skills, money, the habit' : 'Tasks, habits and sessions you tag to it')+'</small>'+
        '<button class="r43-sw'+(on ? ' is-on' : '')+'" role="switch" aria-checked="'+on+'" data-action="r43AreaToggle" data-id="'+a.id+'"'+(on && onN <= 1 ? ' disabled' : '')+'><span></span></button>'+
        (r43Builtin(a.id) ? '' : '<button class="r43-ar-x" data-action="r43AreaRemove" data-id="'+a.id+'" title="Remove">&#10005;</button>')+
        (r43Builtin(a.id) || !on ? '' : '<div class="r43-ar-h">'+r43Habits(a).map(function(h){ return '<span>'+escapeHtml(h.label)+'<button data-action="r43HabitRemove" data-id="'+a.id+':'+h.id+'">&#10005;</button></span>'; }).join('')+(r43Habits(a).length < XP_BOOK.added.habitMax ? '<button class="r43-ar-hadd" data-action="r43HabitAdd" data-id="'+a.id+'">+ Habit</button>' : '')+'</div>')+
      '</div>';
    }).join('')+'</div>'+
    (raw.length < XP_BOOK.areas.max ? '<button class="btn btn-ghost btn-sm" data-action="r43AreaAdd">+ Add an area</button>' : '')+
    '<div class="section-title" style="margin-top:22px">Sleep</div>'+
    '<div class="field"><label>Your bedtime</label><input class="input" type="time" id="r43Bedtime" value="'+escapeHtml(p.bedtime || '')+'"><small class="r43-set-s">Going to Sleep mode by then counts as in bed on time (+'+XP_BOOK.health.bed+' XP).</small></div>'+
    (r43ClientsOn() ? '<div class="section-title" style="margin-top:22px">Ranks</div><label class="r43-chk"><button class="r43-sw'+(p.rankClientsTrack ? ' is-on' : '')+'" role="switch" aria-checked="'+!!p.rankClientsTrack+'" data-action="r43TrackToggle"><span></span></button><span><b>Clients track</b><small>Each rank also needs the MRR it lists, and the top two are named Mogul and Millionaire.</small></span></label>' : '')+
    '<div class="section-title" style="margin-top:22px">Rewards</div><p class="r43-set-p">Give yourself something for reaching a level. It unlocks when you press Level up.</p>'+
    (rw.length ? '<div class="r43-rws">'+rw.map(function(r){ return '<div class="r43-rwr'+(r.claimed ? ' is-claimed' : r.unlockedAt ? ' is-open' : '')+'"><b>Level '+r.level+'</b><span>'+escapeHtml(r.text)+'</span><small>'+(r.claimed ? 'Claimed' : r.unlockedAt ? 'Unlocked' : 'Locked')+'</small><button data-action="r43RewardRemove" data-id="'+r.id+'">&#10005;</button></div>'; }).join('')+'</div>' : '')+
    '<button class="btn btn-ghost btn-sm" data-action="r43RewardAdd">+ Add a reward</button>'+
    '<div class="r43-set-f"><button class="btn btn-ghost btn-sm" data-action="openXpHow">How XP works</button></div>'+
  '</div>';
}
renderSettings = (function(base){
  return function(){
    const want = ui.settingsTab==='xp';
    if(want) ui.settingsTab = 'standards';
    let h = base.apply(this, arguments);
    if(want){
      ui.settingsTab = 'xp';
      h = h.replace(/<div class="settings-content tab-panel" data-key="settings-[^"]*">[\s\S]*<\/div>\s*<\/div>\s*$/, '<div class="settings-content tab-panel" data-key="settings-xp">'+r43SettingsHtml()+'</div></div>')
           .replace(/(<button class="settings-nav-item) active(")/, '$1$2');
    }
    return h.replace(/(<button class="settings-nav-item[^"]*" data-action="settingsTab" data-tab="standards">[\s\S]*?<\/button>)/, '$1<button class="settings-nav-item'+(want ? ' active' : '')+'" data-action="settingsTab" data-tab="xp"><span style="margin-right:8px;">&#9889;</span>XP &amp; Areas</button>');
  };
})(renderSettings);
document.addEventListener('change', function(e){
  const t = e.target; if(!t) return;
  if(t.dataset && t.dataset.r43Area){ const a = r43Area(t.dataset.r43Area); const v = t.value.trim().slice(0, 20); if(a && v){ a.name = v; persist('profile'); xpLast = null; renderView(); } }
  if(t.id==='r43Bedtime'){ state.profile.bedtime = t.value || null; persist('profile'); xpLast = null; }
});
ACTIONS.r43AreaToggle = function(el, e, id){
  const a = r43Area(id); if(!a) return; const d = todayStr(); a.offs = arr(a.offs);
  if(a.on!==false){ if(r43Areas().length <= 1) return; a.on = false; a.offs.push([addDays(d, 1), null]); }   // (today still counts)
  else { a.on = true; const o = a.offs[a.offs.length - 1]; if(o && !o[1]){ if(o[0] > d) a.offs.pop(); else o[1] = d; } }
  persist('profile'); xpLast = null; renderView();
};
ACTIONS.r43AreaAdd = async function(){
  if(r43AreasRaw().length >= XP_BOOK.areas.max) return;
  const n = await uiAsk({title:'A new area', text:'What else do you want to track?', placeholder:'e.g. Family, Faith, Music, Basketball', ok:'Add area'}); if(!n || !String(n).trim()) return;
  r43AreasRaw().push({id:'a'+uid().slice(0, 6), name:String(n).trim().slice(0, 20), on:true, since:todayStr(), habits:[]});
  persist('profile'); xpLast = null; renderView();
};
ACTIONS.r43AreaRemove = async function(el, e, id){
  const a = r43Area(id); if(!a || r43Builtin(id)) return;
  if(!(await uiConfirm({title:'Remove '+a.name+'?', text:'It stops counting from today. What it already earned stays.', ok:'Remove', danger:true}))) return;
  a.on = false; a.removed = true; a.offs = arr(a.offs).concat([[addDays(todayStr(), 1), null]]);
  // (kept, switched off, so its past XP stays on the record; it no longer shows here)
  persist('profile'); xpLast = null; renderView();
};
ACTIONS.r43HabitAdd = async function(el, e, id){
  const a = r43Area(id); if(!a) return;
  const n = await uiAsk({title:'A habit for '+a.name, text:'Something you do every day.', placeholder:'e.g. Call my mom, 20 minutes of practice', ok:'Add habit'}); if(!n || !String(n).trim()) return;
  a.habits = arr(a.habits); if(a.habits.length >= XP_BOOK.added.habitMax) return;
  a.habits.push({id:uid().slice(0, 8), label:String(n).trim().slice(0, 40), days:{}}); persist('profile'); renderView();
};
ACTIONS.r43HabitRemove = function(el, e, id){ const p = String(id).split(':'), a = r43Area(p[0]); if(!a) return; a.habits = arr(a.habits).filter(function(h){ return h.id!==p[1]; }); persist('profile'); xpLast = null; renderView(); };
ACTIONS.r43TrackToggle = function(){ state.profile.rankClientsTrack = !state.profile.rankClientsTrack; persist('profile'); xpLast = null; renderView(); };
// (removed areas don't show in Settings, but stay on the record)
r43SettingsHtml = (function(base){ return function(){ const p = state.profile, all = p.xpAreas; p.xpAreas = arr(all).filter(function(a){ return !a.removed; }); try{ return base.apply(this, arguments); } finally { p.xpAreas = all; } }; })(r43SettingsHtml);

// ---- the history: the book's lines, and what was taken back ----
xpLedger = function(){
  const x = xpSummary(), start = xpStart(), p = state.profile, out = [], ongoing = [];
  x.oneOffs.forEach(function(e){ out.push({d:e.d < start ? start : e.d, why:e.why, xp:e.xp, k:'client'}); });
  x.goalLines.forEach(function(e){ out.push(e); });
  const hit = p.xpMasterHit || {};
  ['mrr', 'weight', 'streak'].forEach(function(key){ arr(hit[key]).forEach(function(t, i){ ongoing.push({why:'Master goal reached: '+(key==='mrr' ? money(t)+' MRR' : key==='weight' ? t+' '+(p.weightUnit==='kg' ? 'kg' : 'lb') : t+' days in a row'), xp:masterXpFor(key, i ? hit[key][i-1] : masterBase(key), t)}); }); });
  if(x.master && x.master.weeks) ongoing.push({why:x.master.weeks+' week'+(x.master.weeks===1 ? '' : 's')+' you hit a weekly ring', xp:x.master.weeks*MASTER_XP.weekly});
  if(x.mrrXp) ongoing.push({why:'MRR: best ever '+money(x.mrrBest)+' (from '+money(x.mrrBase)+')', xp:x.mrrXp});
  if(x.followerXp) ongoing.push({why:x.followers.toLocaleString()+' followers above where you started', xp:x.followerXp});
  return {events:out, ongoing:ongoing};
};
ACTIONS.openXpHistory = (function(base){
  return function(){
    base.apply(this, arguments);
    const c = document.getElementById('xpHowContent'), m = arr(state.profile.xpMinus).slice().reverse(); if(!c || !m.length) return;
    const sec = c.querySelector('.xpg-sec:last-of-type');
    const html = '<div class="xpg-sec">Taken back</div><div class="xh-day r43-minus"><div class="xh-items">'+m.slice(0, 20).map(function(i){ return '<div class="xh-i"><span>'+escapeHtml(fmtDateShort(i.d))+' · '+escapeHtml(i.why)+'</span><b class="is-neg">'+i.xp.toLocaleString()+'</b></div>'; }).join('')+'</div></div>';
    if(sec) sec.insertAdjacentHTML('beforebegin', html); else c.insertAdjacentHTML('beforeend', html);
  };
})(ACTIONS.openXpHistory);

// ---- Op grades a goal: a number, nothing else. Yours always wins. ----
opRateGoal = async function(g){
  if(g.xpBy==='you') return;
  const G = XP_BOOK.goals, k = g.tier || (g.life ? 'life' : 'long');
  let xp = null, tier = k, area = null;
  try{
    if(typeof aiWrite==='function'){
      const areas = r43Areas().map(function(a){ return a.id+' ('+a.name+')'; }).join(', ');
      const ask = 'Grade this goal for XP in my app. Goal: "'+g.label+'"'+(g.target ? ' (target '+g.target+(g.unit ? ' '+g.unit : '')+(g.current ? ', starting at '+g.current : '')+')' : '')+'. '+
        (k==='week' ? 'It is a goal for this week.' : k==='month' ? 'It is a goal for this month.' : 'It is a long-term goal'+(g.deadline ? ' by '+g.deadline : '')+'.')+
        ' Judge it on five things: how hard it is for me from my real numbers, how long it takes, how much it changes my life (1 nice to have, 5 changes how I live), whether it is a first (first car, first home, first hire: move it toward the top), and what it costs me (money, habits given up, time).'+
        ' Ranges: weekly '+G.week[0]+'–'+G.week[1]+' (typical '+G.week[2]+'), monthly '+G.month[0]+'–'+G.month[1]+' (typical '+G.month[2]+'), long-term '+G.long[0]+'–'+G.long[1]+' (typical '+G.long[2]+'), life milestone '+G.life[0]+'–'+G.life[1]+' (once-in-a-life things).'+
        (k==='long' || k==='life' ? ' If this long-term goal is really a once-in-a-life event, set tier "life".' : '')+
        ' Also pick the area it belongs to, one of: '+areas+'.'+
        ' Reply with only JSON: {"xp": number, "tier": "'+(k==='week' || k==='month' ? k : 'long|life')+'", "area": "id"}. No explanation.';
      const t = await aiWrite(ask, {max:80});
      const m = t && /\{[\s\S]*\}/.exec(t);
      if(m){ const j = JSON.parse(m[0]); if(j.tier==='life' && (k==='long' || k==='life')) tier = 'life'; else if(k==='life' && j.tier==='long') tier = 'long'; const band = G[tier]; if(Number(j.xp) > 0) xp = Math.round(Math.min(band[1], Math.max(band[0], Number(j.xp)))/5)*5; if(j.area && r43Area(j.area)) area = j.area; }
    }
  }catch(e){}
  const live = state.goals.items.find(function(x){ return x.id===g.id; }); if(!live) return;
  delete live.xpPending; delete live.xpWhy;
  if(live.xpBy==='you'){ persist('goals'); return; }
  if(xp){ live.xp = xp; live.xpBy = 'op'; if(!live.tier) live.life = tier==='life'; }
  if(area && !live.areaBy) live.area = area;
  persist('goals'); xpLast = null; renderView();
};
// tap the XP on any goal: a number inside its tier's range (to go higher, change the tier)
ACTIONS.r43GoalXp = async function(el, e, id){
  const g = state.goals.items.find(function(x){ return x.id===id; }); if(!g) return;
  const band = XP_BOOK.goals[g.tier || (g.life ? 'life' : 'long')];
  const v = await uiAsk({title:'XP for this goal', text:band[0].toLocaleString()+' to '+band[1].toLocaleString(), value:String(goalXpOf(g)), ok:'Set XP'});
  if(v==null || String(v).trim()==='') return;
  const n = Math.round(Math.min(band[1], Math.max(band[0], Number(v)||0))/5)*5; if(!n) return;
  g.xp = n; g.xpBy = 'you'; delete g.xpPending; persist('goals'); xpLast = null; renderView();
  if(Number(v)!==n) showToast(g.life || g.tier ? 'Kept inside its range: '+n.toLocaleString()+'.' : 'Kept inside its range: '+n.toLocaleString()+'. Make it a life milestone to go higher.', {icon:'&#9733;'});
};

// ---- How XP works: the master book, written from XP_BOOK (the same numbers the engine uses) ----
XP_BOOK.level.pace = {typical:5000, strong:9500};
function r43Tbl(head, rows){ return '<table class="r43-gt"><thead><tr>'+head.map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+rows.map(function(r){ return '<tr'+(r.opt ? ' class="is-opt"' : '')+'>'+(r.c || r).map(function(c){ return '<td>'+c+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table>'; }
function r43N(n){ return Number(n).toLocaleString(); }
function r43GuideHtml(){
  const B = XP_BOOK, W = B.work, H = B.health, P = B.personal, A = B.added, G = B.goals, O = B.oneoff, x = xpSummary(), areas = r43Areas();
  const nm = function(id){ return escapeHtml(r43AreaName(id)); };
  const hourXp = [1,2,3,4,5,6,7,8,9,10].map(function(h){ return Math.round(r43Deep(h*60) + (h*60 >= W.goldAt ? W.goldDay : h*60 >= W.longAt ? W.longDay : 0)); });
  const taskXp = [1,2,3,4,5,6,7,8,9,10,11,12].map(taskXpAtN);
  const LV = [1, 5, 10, 25, 50, 75, 100], wk = function(L, per){ const w = xpForLevel(L)/per; return w < 1 ? Math.max(1, Math.round(w*7))+' day'+(Math.round(w*7)===1 ? '' : 's') : w < 6 ? Math.round(w*10)/10+' weeks' : Math.round(w/4.33*10)/10+' months'; };
  const deepCost = function(h){ let s = 0; for(let i = 0; i < h; i++) s += W.deepBase + W.deepStep*i; return s; };
  const workRows = [
    ['Deep work, hour 1 → hour '+W.deepHours, r43N(W.deepBase)+', '+r43N(W.deepBase + W.deepStep)+', '+r43N(W.deepBase + 2*W.deepStep)+' … '+r43N(W.deepBase + W.deepStep*(W.deepHours-1)), 'Each hour pays '+W.deepStep+' more than the last. A full '+W.deepHours+' hours is '+deepCost(W.deepHours)],
    ['Deep work past '+W.deepHours+' hours', r43N(W.deepPast)+' an hour', ''],
    ['Long day (6h) / gold day (8h)', '+'+W.longDay+' / +'+W.goldDay, 'Only the higher one'],
    ['Past your own normal', '+'+W.pastNormal+' an hour', 'Normal is your average over the last 14 days'],
    ['Work task', '5, 7, 9 … up to 25 each', 'The more you finish in a day, the more each pays. Up to '+W.taskMax+' a day count'],
    {opt:1, c:['Deliverable done <em>(Clients)</em>', '+'+W.deliv+' each', 'A reel, a post, a design: whatever the client’s plan counts']},
    {opt:1, c:['A client’s week finished before it starts <em>(Clients)</em>', '+'+W.early+' per client, per week', 'The get-ahead bonus']},
    {opt:1, c:['Reaching out to a client or lead <em>(Clients)</em>', W.outreach+', then +'+W.outreachEach+' each', 'Up to '+W.outreachMax+' a day']},
    {opt:1, c:['Shooting or recording <em>(Content)</em>', W.shoot+' an hour', '']},
    ['No Clients piece', 'Deep work and work tasks pay '+W.noClients+'×', 'Keeps Work in the same range for people without client work']
  ];
  const healthRows = [
    ['Workout', H.workouts.join(', ')+', then '+H.workoutAfter, 'The first ones each week, up to your weekly target, then '+H.workoutAfter+' each. Your first five ever pay '+H.firstFive],
    ['Food logged for the day', '+'+H.food, ''], ['Day inside your calorie target ('+Math.round(H.band[0]*100)+'–'+Math.round(H.band[1]*100)+'%)', '+'+H.onTarget, 'Your target is in Settings'],
    ['Weigh-in', '+'+H.weighIn, 'Once a day'], ['A week your weight moved toward your goal', '+'+H.weekToward, 'Checked on Sunday'],
    ['In bed on time', '+'+H.bed, 'Sleep mode by the bedtime you set in Settings → XP &amp; Areas'], ['Health task', '5, 7, 9 … up to 25 each', 'Tasks tagged to this area']
  ];
  const personalRows = [
    ['Journal entry', '+'+P.journal, 'First of the day'], ['Inspiration log', '+'+P.insp+', or +'+P.inspBig+' for a walk, reading or meditation', 'Up to '+P.inspMax+' a day'],
    ['The month’s habit kept today', '+'+P.habit, 'Tick it on Goals'], ['Training Skills time', P.skill+' an hour', ''], ['Your own content (personal video)', '+'+P.video+' each', ''],
    ['Personal task', '5, 7, 9 … up to 25 each', 'Same scale as Work, counted separately'], ['Weekly money check-in', '+'+P.money, 'Once a week, in Finances'],
    ['Debt paid above the minimum', '1 XP per $'+P.debtPer, 'Up to '+P.debtMax+' a month'], ['Bill or debt payment on time', '+'+P.onTime+' each', '']
  ];
  const addedRows = [['Task tagged to the area', '5, 7, 9 … up to 25 each', 'Same scale as everywhere else'], ['Habit for the area, kept today', '+'+A.habit+' each', 'Up to '+A.habitMax+' habits per area'],
    ['Timed session in the area', A.session+' an hour', 'Started from the area’s timer on You'], ['Goals tagged to the area', 'As in Weeks, months and goals', '']];
  const goalRows = [
    ['Set up the week', '+'+G.weekIn, 'Your line, your goals. Plan next week from Thursday'], ['Set up the month', '+'+G.monthIn, 'Your line, the habit to beat, your goals. Plan next month from the '+G.monthFrom+'th'],
    ['Check out of the week / month', '+'+G.weekOut+' / +'+G.monthOut, 'Mark what you hit and missed'],
    ['Weekly goal hit', G.week[0]+' – '+G.week[1]+', usually ~'+G.week[2], 'Op sets it. Up to '+G.maxPer+' a week pay'], ['Monthly goal hit', G.month[0]+' – '+r43N(G.month[1])+', usually ~'+G.month[2], 'Op sets it. Up to '+G.maxPer+' a month pay'],
    ['Clean sweep, week / month', '+'+G.sweepWeek+' / +'+r43N(G.sweepMonth), 'Every goal hit (at least 2 set)'], ['Month’s habit beaten', '+'+G.habit, 'At month check-out'],
    ['New long-term goal set', '+'+G.newLong, 'Up to '+G.newLongMax+' a month. Deleting it takes the '+G.newLong+' back'], ['Long-term goal reached', r43N(G.long[0])+' – '+r43N(G.long[1])+', usually ~'+r43N(G.long[2]), 'Op sets it'],
    ['Life milestone reached', r43N(G.life[0])+' – '+r43N(G.life[1]), 'Firsts and once-in-a-life things: first car, first home, graduating, first hire'],
    {opt:1, c:['Master goal: MRR <em>(Clients)</em>', G.mrrPerK+' per $1k of growth', '2,000 to 20,000 per step']}, ['Master goal: body weight', G.perLb+' per lb toward your goal', '2,000 to 20,000 per step'],
    ['Master goal: days in a row', G.perDay+' per day', '1,500 to 15,000 per step'], ['Weekly ring hit (workouts or deep work)', '+'+G.ring+' a week each', '']
  ];
  const oneRows = [['New client won', '+'+r43N(O.client), 'Counts from their start date'], ['Client reactivated', '+'+O.reactivated, 'Someone you worked with before. Never counts as “new” toward goals'],
    ['MRR, each $1k above your best ever', '+'+O.mrrPerK, 'New highs only. Drops don’t take it back; climbing back to the old high pays nothing'], ['Followers, each above your best ever', '+'+O.follower, 'Same high-water rule (connected account)']];
  const backRows = [['A goal deleted or un-completed', 'Its XP (and the +'+G.newLong+' if it was a new long-term goal)'], ['A client marked reactivated instead of new', r43N(O.client - O.reactivated)],
    ['A task, workout, reel or journal entry deleted or un-ticked', 'What it paid that day, and that day’s multipliers recount'], ['A focus session edited shorter or deleted', 'The deep-work XP for the removed time'], ['A clean sweep that no longer holds', 'The sweep bonus']];
  const cardRows = areas.map(function(a){
    const feeds = a.id==='work' ? 'Focus (deep work a day, last 30 days) · Deadlines (work tasks done by their deadline) · with Clients: MRR, Scaling (new clients each month), Reliability (client weeks done before they start) · with Content: content out against your target'
      : a.id==='health' ? 'Training (workouts against your weekly target) · Diet (days in your calorie target) · Weight (BMI for your height, if you track weight; it also sets a ceiling) · Sleep (nights in bed by your bedtime)'
      : a.id==='personal' ? 'Mind (Inspiration and Training Skills) · Goals (weekly, monthly, long-term) · Finances (debt down, payments on time) · Consistency (journal, the month’s habit) · your own content'
      : 'Consistency (habits kept, time logged) · Deadlines (tasks done by their deadline) · Goals hit';
    return ['<b style="color:'+r43AreaColor(a.id)+'">'+escapeHtml(a.name)+'</b>', feeds];
  });
  const track = r43ClientsTrack();
  return '<div class="xpg-top"><button class="xpg-back" data-action="closeXpHow">&larr; Back</button><div class="xph-k">[ SYSTEM ]</div><button class="xpg-hist-btn" data-action="openXpHistory">&#128220; Your XP history</button></div>'+
    '<h1>How XP works</h1>'+
    '<div class="xph-lead"><b>Level</b> measures effort: the time you put in and what you got done. <b>Rank</b> measures achievement: it needs the level and real results in every area you track, judged by your lowest one. XP is earned once and kept; it only comes back off when it was marked wrong. Every target here (bedtime, calorie target, workouts a week, your normal deep work, goals) comes from your own Settings.</div>'+
    '<div class="xpg-you"><div><small>You</small><b>Level '+x.level+'</b></div><div><small>Total XP</small><b>'+x.total.toLocaleString()+'</b></div><div><small>Level '+(x.level+1)+' at</small><b>'+x.levelHi.toLocaleString()+'</b></div>'+(x.canLevel ? '<div>'+levelUpBtnHtml('guide')+'</div>' : '')+'</div>'+
    '<div class="xpg-sec">Your areas</div>'+
    '<div class="r43-g-areas">'+areas.map(function(a){ return '<span style="--ac:'+r43AreaColor(a.id)+'"><i></i>'+escapeHtml(a.name)+'</span>'; }).join('')+'<button class="r43-g-edit" data-action="r43GuideAreas">Change them</button></div>'+
    '<p class="r43-g-p">Everyone picks what they track: Work, Health and Personal to start. Rename them, turn one off, or add your own, up to '+B.areas.max+'. XP is built so a strong week earns about the same from each area, roughly 1,400 to 1,750. Every action belongs to exactly one area, so nothing counts twice. A task goes to the area it’s tagged with; client work goes to Work, and untagged tasks to Personal.</p>'+
    (r43AreaOn('work') ? '<div class="xpg-sec">'+nm('work')+'</div>'+r43Tbl(['Action', 'XP', 'Notes'], workRows)+'<div class="xpg-grid"><div class="xpg-card"><h3>Deep work, hour by hour</h3>'+xpgBars(hourXp, [1,2,3,4,5,6,7,8,9,10].map(function(h){ return h+'h'; }), r43AreaColor('work'), 'XP for a day of that length, with the long and gold bonus.')+'</div><div class="xpg-card"><h3>Tasks in a day</h3>'+xpgBars(taskXp, taskXp.map(function(_, i){ return '#'+(i+1); }), r43AreaColor('work'), 'What each task pays as the day goes on (the same scale in every area).')+'</div></div><p class="r43-g-o">Rows marked <em>(Clients)</em> or <em>(Content)</em> only apply if you use those pieces of Work.</p>' : '')+
    (r43AreaOn('health') ? '<div class="xpg-sec">'+nm('health')+'</div>'+r43Tbl(['Action', 'XP', 'Notes'], healthRows) : '')+
    (r43AreaOn('personal') ? '<div class="xpg-sec">'+nm('personal')+'</div>'+r43Tbl(['Action', 'XP', 'Notes'], personalRows) : '')+
    '<div class="xpg-sec">Areas you add</div>'+r43Tbl(['Action', 'XP', 'Notes'], addedRows)+
    '<div class="xpg-sec">Balanced days and streaks</div>'+
    '<p class="r43-g-p">A day that touches every one of your areas multiplies everything earned that day. Touched means earning at least '+B.personal.touch+' XP in that area that day ('+B.work.touch+' for Work). Days off count as Work touched, so resting is never punished. With one area, every day counts as balanced.</p>'+
    r43Tbl(['Your areas touched that day', 'Day’s XP ×'], [['All of them', B.balance.all.toFixed(2)], ['At least half', B.balance.half.toFixed(2)], ['Fewer than half', '1.00']])+
    '<p class="r43-g-p">Streak: every balanced day in the last 7 adds another '+Math.round(B.balance.streakEach*100)+'%, up to +'+Math.round(B.balance.streakMax*100)+'%. It stacks on top of the balance multiplier.</p>'+
    '<div class="xpg-sec">Weeks, months and goals</div><p class="r43-g-p">Setting up a period pays a little; finishing what you set pays a lot, and finishing all of it pays a bonus. Every goal is tagged to one of your areas. Goals are completed by pressing and holding for 1.2 seconds, never a single click. When a master goal is hit, its target goes up '+Math.round(G.raise*100)+'% and the next step pays again; a target nudged up by a sliver doesn’t pay twice.</p>'+
    r43Tbl(['What', 'XP', 'Rules'], goalRows)+
    '<div class="xpg-sec">Client and audience one-offs</div><p class="r43-g-p">For anyone using the Clients or Content pieces of Work: big moves pay once, on new highs, and never come back off when numbers dip. Rank is what reflects a dip.</p>'+r43Tbl(['What', 'XP', 'Rules'], oneRows)+
    '<div class="xpg-sec">How Op grades a goal</div><p class="r43-g-p">Op sets a number the moment you add a goal and shows only the number. He judges five things: how hard it is for you from your real numbers, how long it takes, how much it changes your life, whether it’s a first (first car, first home, first hire), and what it costs you. He also picks the tier and the area: a long-term goal that’s really a once-in-a-life event becomes a Life milestone. Tap the XP on any goal to set your own number within its tier’s range; once you do, Op never touches it again.</p>'+
    '<div class="xpg-sec">Levels</div><p class="r43-g-p">Each level costs '+B.level.base+' + '+B.level.lin+'×L + '+B.level.sq+'×L² XP. Early levels come in a day or less; the slowest, at the very top, take about a week and a half. Levels are claimed: when you have the XP, a Level up button appears.</p>'+
    r43Tbl(['Level', 'XP in total', 'Typical pace', 'Strong pace'], LV.map(function(L){ return ['L'+L, '~'+r43N(Math.round(xpForLevel(L)/1000)*1000 || xpForLevel(L)), wk(L, B.level.pace.typical), wk(L, B.level.pace.strong)]; }))+
    '<div class="xpg-sec">Ranks</div><p class="r43-g-p">Each rank needs the level and a rating in every area you track, judged by your lowest one, so one strong area can’t carry you.'+(r43ClientsOn() ? ' Turn on the Clients track (Settings → XP &amp; Areas) and each rank also needs the MRR shown.' : '')+' If you fall below a rank’s line for 30 days straight, the rank follows; XP and level stay.</p>'+
    '<div class="xph-track">'+RANKS.map(function(rk, i){ const stt = i < x.rank ? 'is-done' : i===x.rank ? 'is-cur' : ''; return '<span class="xph-tr '+stt+'" style="--rc:'+rk.color+'">'+rankBadgeSvg(i, 30)+'<b>'+escapeHtml(rk.name)+'</b><small>LVL '+rk.level+(rk.low ? '<br>lowest area '+rk.low : '')+(track && rk.mrr ? '<br>'+money(rk.mrr)+' MRR' : '')+'</small></span>'; }).join('')+'</div>'+
    '<div class="xpg-sec">Your card</div><p class="r43-g-p">One rating per area you track, 25 to 100, plus an Overall that’s their average and only reaches 100 when every area does. A piece you don’t use (no clients, no weigh-ins) simply isn’t counted. Your standing with Op is its own score on his screen and never touches XP, levels, ranks or ratings.</p>'+
    r43Tbl(['Rating', 'What feeds it'], cardRows)+
    '<div class="xpg-sec">When XP comes back off</div><p class="r43-g-p">Only when it was earned wrongly. Normal ups and downs (MRR dipping, a bad week, a broken streak) never take XP away. If your total falls below your level’s line, the level drops to match and you’re told what came off; every removal shows in your XP history.</p>'+
    r43Tbl(['What happened', 'What comes off'], backRows)+
    '<div class="xpg-sec">Rewards</div><p class="r43-g-p">Attach a reward to any level (“Level 10: new headphones”) in Settings → XP &amp; Areas. The next one shows under your level bar, it unlocks when you press Level up, and you mark it claimed once you’ve actually got it.</p>'+
    '<div class="xph-foot">This page is the rulebook. The XP code reads every number from the same table.</div>';
}
ACTIONS.openXpHow = (function(base){
  return function(){
    base.apply(this, arguments);
    const c = document.getElementById('xpHowContent'); if(!c) return;
    const tease = c.querySelector('.pj-tease'), proj = c.querySelector('.xpg-top [data-action="openProjected"]');
    c.innerHTML = r43GuideHtml();
    if(proj){ const top = c.querySelector('.xpg-top .xpg-hist-btn'); if(top) top.insertAdjacentElement('beforebegin', proj); }
    if(tease){ const you = c.querySelector('.xpg-you'); if(you) you.insertAdjacentElement('afterend', tease); }
  };
})(ACTIONS.openXpHow);
ACTIONS.r43GuideAreas = function(){ ACTIONS.closeXpHow(); ui.view = 'settings'; ui.settingsTab = 'xp'; renderView(); };

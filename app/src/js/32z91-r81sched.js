// ================= Round 81: the schedule, rebuilt =================
// A master schedule you set once: your week as a board (when you're up, your work hours, the days you train),
// in seasons (a training season now, a normal 5/2 later: switch, don't redo). Days off in one place: holidays,
// birthdays, regular days off (every other Saturday, the first Monday of the month…), and time off. Your rules and
// "should I say yes?" moved to Streaks; so did nothing else: the streak page's own "Days off" is gone (the schedule
// has them). Master streaks add Read and Meditate; a custom streak is just the things to do (no "when").

// ---------------- seasons ----------------
function r81S(){
  const S = r80S();
  if(!Array.isArray(S.seasons) || !S.seasons.length){
    S.seasons = [{id:'s'+uid(), name:'Normal', week:S.week, train:[false, true, true, true, true, true, false]}];
    S.season = S.seasons[0].id;
  }
  let cur = S.seasons.find(function(x){ return x.id===S.season; });
  if(!cur){ cur = S.seasons[0]; S.season = cur.id; }
  if(!Array.isArray(cur.train) || cur.train.length!==7) cur.train = [false, true, true, true, true, true, false];
  S.week = cur.week;                    // (Round 80's code reads the week from here)
  S.birthdays = arr(S.birthdays); S.regular = arr(S.regular);
  if(S.alarms==null) S.alarms = true;
  return S;
}
function r81Season(){ const S = r81S(); return S.seasons.find(function(x){ return x.id===S.season; }); }
// the day, with everything that can make it a day off
r80Day = (function(base){
  return function(d){
    const S = state.focus && state.focus.schedule; if(!S || !S.on) return null;
    r81S();
    if(arr(state.daysOff && state.daysOff.dates).indexOf(d) >= 0) return {kind:'off', label:'Day off', wake:(S.week[dowOf(d)] || {}).kind==='off' ? S.week[dowOf(d)].wake : '08:30', start:null, end:null, oneoff:true};
    const day = base.apply(this, arguments); if(!day || day.vacation || day.holiday) return day;
    const md = d.slice(5);
    const own = state.profile.birthday && /^\d{4}-\d\d-\d\d$/.test(state.profile.birthday) && state.profile.birthday.slice(5)===md;
    const b = own ? {name:'Your birthday', what:'off'} : S.birthdays.find(function(x){ return x.md===md; });
    if(b){
      const lbl = b.name==='Your birthday' ? b.name : b.name+'’s birthday';
      if(b.what==='off') return {kind:'off', label:lbl, holiday:lbl, wake:'08:30', start:null, end:null};
      if(b.what==='light' && day.start) return Object.assign({}, R80_DAYT.light, {label:lbl, holiday:lbl, wake:day.wake});
      return Object.assign(day, {label:day.label+' · '+lbl});
    }
    const reg = S.regular.find(function(r){ return r81RegHits(r, d); });
    if(reg) return {kind:'off', label:r81RegLabel(reg), wake:'08:30', start:null, end:null, regular:true};
    return day;
  };
})(r80Day);
function r81RegHits(r, d){
  if(Number(r.dow)!==dowOf(d)) return false;
  if(r.kind==='alt'){ if(!r.from || d < r.from) return false; const days = Math.round((new Date(d) - new Date(r.from))/86400000); return days % 14===0; }
  if(r.kind==='nth'){ const dn = Number(d.slice(8)); if(Number(r.n)===-1) return dn + 7 > new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0).getDate(); return Math.ceil(dn/7)===Number(r.n); }
  return false;
}
const R81_DOWS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function r81RegLabel(r){ return r.kind==='alt' ? 'Every other '+R81_DOWS[r.dow] : (['', 'First', 'Second', 'Third', 'Fourth'][r.n] || 'Last')+' '+R81_DOWS[r.dow]+' of the month'; }
// the alarms only follow it while "Runs my alarms" is on (the days off always count)
function r81NoAlarms(fn){ return function(){ const S = state.focus && state.focus.schedule; if(S && S.on && S.alarms===false){ S.on = false; try{ return fn.apply(this, arguments); } finally { S.on = true; } } return fn.apply(this, arguments); }; }
wakeTimeFor = r81NoAlarms(wakeTimeFor); wakeBaseTimeFor = r81NoAlarms(wakeBaseTimeFor); workHoursFor = r81NoAlarms(workHoursFor); workDayToday = r81NoAlarms(workDayToday);
// a workout counts on the days your season trains (rest days don't break it)
R80_TRACK.workout.met = function(d){ const S = state.focus && state.focus.schedule; if(S && S.on){ const se = r81Season(); if(se && !se.train[dowOf(d)] && !trainedDoneFor(d)) return null; } return trainedDoneFor(d); };

// ---------------- the page ----------------
function r81Hm(t){ const m = hmMin(t); return m==null ? null : m; }
function r81Pct(t){ const m = r81Hm(t); if(m==null) return null; return Math.max(0, Math.min(100, (m - 300)/(1380 - 300)*100)); }   // 5 AM → 11 PM
function r81Short(t){ if(!t) return ''; return fmt12Hour(t).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p'); }
r80SchedHtml = function(){
  const S = r81S(), se = r81Season(), t = todayStr(), sel = ui.r81Day==null ? null : Number(ui.r81Day), order = [1, 2, 3, 4, 5, 6, 0];
  const today = r80Day(t);
  let h = '<div class="r81s">';
  // the head: on/off, the season, the alarms
  h += '<div class="r81s-head"><div class="r81s-ht"><b>Your schedule</b><span>'+(S.on ? (today ? 'Today: '+escapeHtml(today.label)+(today.wake ? ' · up '+fmt12Hour(today.wake) : '')+(today.start ? ' · work '+fmt12Hour(today.start)+'–'+fmt12Hour(today.end) : '') : '') : 'Set your week once. It decides your days off, your work hours and when you’re up.')+'</span></div>'+
    '<div class="r81s-hc"><label class="r81s-al"><span>Runs my alarms</span><button class="r45-sw'+(S.on && S.alarms!==false ? ' on' : '')+'" data-action="r81Alarms" aria-label="Runs my alarms"><span></span></button></label>'+
    '<button class="btn btn-sm '+(S.on ? 'btn-ghost' : 'btn-primary')+'" data-action="r80On">'+(S.on ? 'Turn off' : 'Use this schedule')+'</button></div></div>';
  // seasons
  h += '<div class="r81s-seas"><span class="r81s-k">Season</span>'+S.seasons.map(function(x){ return '<button class="r81s-sp'+(x.id===S.season ? ' is-on' : '')+'" data-action="r81Season" data-id="'+x.id+'">'+escapeHtml(x.name)+'</button>'; }).join('')+
    '<button class="r81s-sp is-add" data-action="r81SeasonAdd">+ New season</button>'+
    '<span class="r81s-sx"><button class="r43-link" data-action="r81SeasonRename">Rename</button>'+(S.seasons.length > 1 ? '<button class="r43-link" data-action="r81SeasonDel">Delete</button>' : '')+
    '<select class="input input-sm" data-r81-fill><option value="">Fill from a preset…</option>'+R80_PRESETS.map(function(p){ return '<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>'; }).join('')+'</select></span></div>';
  // the week board
  const hours = [6, 9, 12, 15, 18, 21];
  h += '<div class="r81s-board"><div class="r81s-axis">'+hours.map(function(hh){ return '<i style="top:'+((hh*60 - 300)/(1080)*100)+'%">'+(hh===12 ? '12p' : hh < 12 ? hh+'a' : (hh - 12)+'p')+'</i>'; }).join('')+'</div>'+order.map(function(i){
    const d = S.week[i], K = R80_KIND[d.kind] || R80_KIND.work, tr = se.train[i], isT = dowOf(t)===i;
    const wp = r81Pct(d.wake), sp = d.start ? r81Pct(d.start) : null, ep = d.end ? r81Pct(d.end) : null;
    return '<button class="r81s-col'+(sel===i ? ' is-sel' : '')+(isT ? ' is-today' : '')+' k-'+d.kind+'" style="--c:'+K.c+'" data-action="r81Day" data-id="'+i+'">'+
      '<div class="r81s-ch"><b>'+R81_DOWS[i].slice(0, 3)+'</b><em>'+escapeHtml(K.label.replace(' day', ''))+'</em></div>'+
      '<div class="r81s-tr">'+hours.map(function(hh){ return '<i style="top:'+((hh*60 - 300)/(1080)*100)+'%"></i>'; }).join('')+
        (sp!=null && ep!=null ? '<div class="r81s-blk" style="top:'+sp+'%;height:'+Math.max(4, ep - sp)+'%"><span>'+r81Short(d.start)+'–'+r81Short(d.end)+'</span></div>' : '<div class="r81s-off">Off</div>')+
        (wp!=null ? '<div class="r81s-wk" style="top:'+wp+'%"><span>&#9728; '+r81Short(d.wake)+'</span></div>' : '<div class="r81s-wk is-none" style="top:2%"><span>no alarm</span></div>')+
      '</div>'+
      '<div class="r81s-cf">'+(tr ? '<span class="r81s-trn">&#128170; Train</span>' : '<span class="r81s-rest">Rest</span>')+'</div></button>';
  }).join('')+'</div>';
  // the day you picked
  if(sel!=null){
    const d = S.week[sel];
    h += '<div class="r81s-ed"><b>'+R81_DOWS[sel]+'</b><div class="r43-seg">'+['work', 'shoot', 'light', 'off'].map(function(k){ return '<button type="button" class="'+(d.kind===k ? 'is-on' : '')+'" data-action="r80Kind" data-id="'+sel+'|'+k+'">'+R80_KIND[k].label.replace(' day', '')+'</button>'; }).join('')+'</div>'+
      '<label>Up <input class="input" type="time" data-r80-wk="'+sel+'|wake" value="'+(d.wake || '')+'"></label>'+
      (d.start ? '<label>Work <input class="input" type="time" data-r80-wk="'+sel+'|start" value="'+d.start+'"> – <input class="input" type="time" data-r80-wk="'+sel+'|end" value="'+(d.end || '')+'"></label>' : '')+
      '<label class="r81s-tg">Train <button class="r45-sw'+(se.train[sel] ? ' on' : '')+'" data-action="r81Train" data-id="'+sel+'"><span></span></button></label>'+
      '<button class="r43-link" data-action="r81CopyDay" data-id="'+sel+'">Same on every '+(d.kind==='off' ? 'day off' : 'work day')+'</button>'+
      '<button class="r81s-x" data-action="r81Day" data-id="'+sel+'" aria-label="Close">&#10005;</button></div>';
  } else h += '<div class="r81s-hint">Click a day to change it.</div>';
  // coming up
  let strip = ''; for(let i = 0; i < 14; i++){ const d = addDays(t, i), day = r80Day(d) || Object.assign({label:''}, S.week[dowOf(d)]), K = R80_KIND[day.kind] || R80_KIND.work;
    strip += '<div class="r81s-cd'+(i===0 ? ' is-t' : '')+'" style="--c:'+K.c+'" title="'+escapeHtml(day.label || K.label)+'"><small>'+escapeHtml(weekdayShort(d))+'</small><b>'+Number(d.slice(8))+'</b>'+(day.holiday || day.regular || day.vacation || day.oneoff ? '<em>'+escapeHtml(day.holiday || day.label)+'</em>' : '<i>'+(day.start ? r81Short(day.start) : 'off')+'</i>')+'</div>'; }
  h += '<div class="r81s-card"><div class="r81s-cardh">Next two weeks</div><div class="r81s-cstrip">'+strip+'</div></div>';
  // days off: holidays, birthdays, regular, time off
  const tab = ui.r81Off || 'hol';
  h += '<div class="r81s-card"><div class="r81s-cardh">Days off<div class="r43-seg">'+[['hol', 'Holidays'], ['bday', 'Birthdays'], ['reg', 'Regular'], ['time', 'Time off']].map(function(o){ return '<button type="button" class="'+(tab===o[0] ? 'is-on' : '')+'" data-action="r81Off" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div></div>';
  if(tab==='hol'){
    const y = Number(t.slice(0, 4)), hol = r80Holidays(y).concat(r80Holidays(y + 1)).filter(function(x){ return x.date >= t && x.date <= addDays(t, 366); });
    h += '<div class="r81s-list">'+hol.map(function(x){ const pol = S.holidays[x.id] || x.def;
      return '<div class="r81s-li"><span><b>'+escapeHtml(x.name)+'</b><small>'+escapeHtml(weekdayShort(x.date)+', '+fmtDateShort(x.date))+'</small></span><div class="r43-seg">'+['off', 'light', 'work'].map(function(k){ return '<button type="button" class="'+(pol===k ? 'is-on' : '')+'" data-action="r80Hol" data-id="'+x.id+'|'+k+'" title="'+escapeHtml(R80_HOL_TIP[k])+'">'+(k==='off' ? 'Off' : k==='light' ? 'Light' : 'Work')+'</button>'; }).join('')+'</div></div>'; }).join('')+'</div>';
  } else if(tab==='bday'){
    const own = state.profile.birthday;
    h += '<div class="r81s-list">'+(own ? '<div class="r81s-li"><span><b>Your birthday</b><small>'+escapeHtml(fmtDateShort(String(new Date().getFullYear())+own.slice(4)))+' · always off</small></span></div>' : '<div class="r81s-li is-dim"><span>Add your birthday in Settings → Profile and it’s a day off.</span></div>')+
      S.birthdays.map(function(b, i){ return '<div class="r81s-li"><span><b>'+escapeHtml(b.name)+'</b><small>'+escapeHtml(new Date(2001, Number(b.md.slice(0, 2)) - 1, Number(b.md.slice(3))).toLocaleDateString(undefined, {month:'long', day:'numeric'}))+'</small></span><div class="r43-seg">'+[['off', 'Off'], ['light', 'Light'], ['mark', 'Just mark it']].map(function(o){ return '<button type="button" class="'+(b.what===o[0] ? 'is-on' : '')+'" data-action="r81BdayWhat" data-id="'+i+'|'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div><button class="r81s-del" data-action="r81BdayDel" data-id="'+i+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
      '<div class="r81s-add"><input class="input" id="r81BdName" placeholder="Whose? (Mom, Jay…)"><input class="input" type="date" id="r81BdDate"><select class="input" id="r81BdWhat"><option value="off">Day off</option><option value="light">Light day</option><option value="mark">Just mark it</option></select><button class="btn btn-sm btn-ghost" data-action="r81BdayAdd">Add</button></div></div>';
  } else if(tab==='reg'){
    h += '<div class="r81s-list">'+(S.regular.length ? S.regular.map(function(r, i){ return '<div class="r81s-li"><span><b>'+escapeHtml(r81RegLabel(r))+'</b><small>'+(r.kind==='alt' ? 'starting '+escapeHtml(fmtDateShort(r.from)) : 'every month')+'</small></span><button class="r81s-del" data-action="r81RegDel" data-id="'+i+'" aria-label="Remove">&#10005;</button></div>'; }).join('') : '<div class="r81s-li is-dim"><span>Days off that come round on their own, on top of your week.</span></div>')+
      '<div class="r81s-add"><select class="input" id="r81RgKind"><option value="alt">Every other</option><option value="1">First</option><option value="2">Second</option><option value="3">Third</option><option value="-1">Last</option></select><select class="input" id="r81RgDow">'+R81_DOWS.map(function(n, i){ return '<option value="'+i+'"'+(i===6 ? ' selected' : '')+'>'+n+'</option>'; }).join('')+'</select><input class="input" type="date" id="r81RgFrom" title="Starting (for every other)" value="'+t+'"><button class="btn btn-sm btn-ghost" data-action="r81RegAdd">Add</button></div></div>';
  } else {
    const one = arr(state.daysOff && state.daysOff.dates).filter(function(d){ return d >= t; }).sort();
    h += '<div class="r81s-list">'+S.vacations.map(function(v, i){ return '<div class="r81s-li"><span><b>'+escapeHtml(v.label || 'Time off')+'</b><small>'+escapeHtml(fmtDateShort(v.from)+(v.to!==v.from ? ' – '+fmtDateShort(v.to) : ''))+' · no alarms</small></span><button class="r81s-del" data-action="r80VacDel" data-id="'+i+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
      one.map(function(d){ return '<div class="r81s-li"><span><b>Day off</b><small>'+escapeHtml(weekdayShort(d)+', '+fmtDateShort(d))+'</small></span><button class="r81s-del" data-action="r81OneDel" data-id="'+d+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
      (!S.vacations.length && !one.length ? '<div class="r81s-li is-dim"><span>A trip, a long weekend, one day to yourself.</span></div>' : '')+
      '<div class="r81s-add"><input class="input" id="r80VacLabel" placeholder="What (a trip, a long weekend…)"><input class="input" type="date" id="r80VacFrom"><input class="input" type="date" id="r80VacTo" title="Last day (leave empty for one day)"><button class="btn btn-sm btn-ghost" data-action="r80VacAdd">Add</button></div></div>';
  }
  h += '</div>';
  return h+'</div>';
};
ACTIONS.r81Day = function(el, e, id){ ui.r81Day = ui.r81Day!=null && Number(ui.r81Day)===Number(id) ? null : Number(id); playTick(); renderView(); };
ACTIONS.r81Off = function(el, e, id){ ui.r81Off = id; playTick(); renderView(); };
ACTIONS.r81Alarms = function(){
  const S = r81S();
  if(!S.on){ ACTIONS.r80On(); return; }
  S.alarms = S.alarms===false; persist('focus'); try{ wakeArm(); }catch(x){} playTick(); renderView();
  showToast(S.alarms ? 'Your schedule runs the alarms.' : 'Your alarms are back to how you set them. The days off still count.', {icon:'&#9200;'});
};
ACTIONS.r80On = (function(base){ return function(){ const S = r81S(); const was = S.on; const r = base.apply(this, arguments); if(!was && S.on) S.alarms = true; persist('focus'); return r; }; })(ACTIONS.r80On);
ACTIONS.r81Season = function(el, e, id){ const S = r81S(); S.season = id; r81S(); persist('focus'); try{ wakeArm(); }catch(x){} playTick(); renderView(); showToast(r81Season().name+' season. Your week, alarms and training days follow it.', {icon:'&#128197;'}); };
ACTIONS.r81SeasonAdd = function(){
  const S = r81S(), cur = r81Season();
  const n = {id:'s'+uid(), name:S.seasons.some(function(x){ return /train/i.test(x.name); }) ? 'Season '+(S.seasons.length + 1) : 'Training season', week:cur.week.map(function(d){ return Object.assign({}, d); }), train:cur.train.slice()};
  if(/train/i.test(n.name)) n.train = [true, true, true, true, true, true, true];
  S.seasons.push(n); S.season = n.id; r81S(); persist('focus'); renderView();
  showToast('A copy of your week to change. Rename it, then pick its days.', {icon:'&#128197;'});
};
ACTIONS.r81SeasonRename = function(){
  const cur = r81Season(); const b = document.querySelector('.r81s-sp.is-on'); if(!b) return;
  b.outerHTML = '<input class="input input-sm r81s-rn" id="r81SeRn" value="'+escapeHtml(cur.name)+'" maxlength="30">';
  const i = document.getElementById('r81SeRn'); i.focus(); i.select();
  const done = function(){ const v = i.value.trim(); if(v) cur.name = v.slice(0, 30); persist('focus'); renderView(); };
  i.onblur = done; i.onkeydown = function(e){ if(e.key==='Enter'){ e.preventDefault(); i.blur(); } else if(e.key==='Escape'){ i.value = cur.name; i.blur(); } };
};
ACTIONS.r81SeasonDel = function(){ const S = r81S(), cur = r81Season(); if(S.seasons.length < 2) return; uiConfirm('Delete the '+cur.name+' season?').then(function(ok){ if(!ok) return; S.seasons = S.seasons.filter(function(x){ return x!==cur; }); S.season = S.seasons[0].id; r81S(); persist('focus'); renderView(); }); };
ACTIONS.r81Train = function(el, e, id){ const se = r81Season(); se.train[Number(id)] = !se.train[Number(id)]; persist('focus'); playTick(); renderView(); };
ACTIONS.r81CopyDay = function(el, e, id){
  const S = r81S(), i = Number(id), d = S.week[i], off = d.kind==='off', se = r81Season(); let n = 0;
  S.week.forEach(function(x, j){ if(j===i) return; if((x.kind==='off')===off){ S.week[j] = Object.assign({}, d); se.train[j] = se.train[i]; n++; } });
  persist('focus'); try{ wakeArm(); }catch(x){} renderView(); showToast('Copied to '+n+' day'+(n===1 ? '' : 's')+'.', {icon:'&#128197;'});
};
// (Round 80's kind/time edits keep working on the season's week; the preset fills this season)
ACTIONS.r80Preset = function(el, e, id){
  const p = R80_PRESETS.find(function(x){ return x.id===id; }); if(!p) return;
  const S = r81S(), se = r81Season();
  se.week = p.week.map(function(d){ return Object.assign({}, d); }); S.week = se.week; S.preset = p.id;
  if(!S.rules.length) S.rules = p.rules.slice();
  if(S.social==null) S.social = p.social;
  persist('focus'); try{ wakeArm(); }catch(x){} playPositive(); renderView(); showToast(se.name+' is now '+p.name+'. Click a day to change it.', {icon:'&#128197;'});
};
document.addEventListener('change', function(e){ const t = e.target; if(t && t.hasAttribute && t.hasAttribute('data-r81-fill') && t.value){ ACTIONS.r80Preset(null, null, t.value); } });
ACTIONS.r81BdayAdd = function(){
  const g = function(id){ const x = document.getElementById(id); return x ? x.value.trim() : ''; }, name = g('r81BdName'), date = g('r81BdDate');
  if(!name){ const x = document.getElementById('r81BdName'); if(x) x.focus(); return; } if(!date){ const x = document.getElementById('r81BdDate'); if(x) x.focus(); return; }
  r81S().birthdays.push({id:uid(), name:name.slice(0, 40), md:date.slice(5), what:g('r81BdWhat') || 'off'}); persist('focus'); try{ wakeArm(); }catch(x){} renderView();
};
ACTIONS.r81BdayWhat = function(el, e, id){ const a = String(id).split('|'), b = r81S().birthdays[Number(a[0])]; if(b){ b.what = a[1]; persist('focus'); renderView(); } };
ACTIONS.r81BdayDel = function(el, e, id){ r81S().birthdays.splice(Number(id), 1); persist('focus'); renderView(); };
ACTIONS.r81RegAdd = function(){
  const g = function(id){ const x = document.getElementById(id); return x ? x.value : ''; }, k = g('r81RgKind'), dow = Number(g('r81RgDow'));
  const r = k==='alt' ? {kind:'alt', dow:dow, from:(function(){ let d = g('r81RgFrom') || todayStr(); while(dowOf(d)!==dow) d = addDays(d, 1); return d; })()} : {kind:'nth', dow:dow, n:Number(k)};
  r81S().regular.push(r); persist('focus'); try{ wakeArm(); }catch(x){} renderView();
};
ACTIONS.r81RegDel = function(el, e, id){ r81S().regular.splice(Number(id), 1); persist('focus'); renderView(); };
ACTIONS.r81OneDel = function(el, e, d){ state.daysOff.dates = arr(state.daysOff.dates).filter(function(x){ return x!==d; }); persist('daysOff'); renderView(); };
// time off: one day goes in as a day off; more than one is a stretch of time off
ACTIONS.r80VacAdd = function(){
  const g = function(id){ const x = document.getElementById(id); return x ? x.value.trim() : ''; }, from = g('r80VacFrom'), to = g('r80VacTo') || from;
  if(!from){ const x = document.getElementById('r80VacFrom'); if(x) x.focus(); return; }
  if(to===from && !g('r80VacLabel')){ state.daysOff.dates = arr(state.daysOff.dates).concat([from]); persist('daysOff'); }
  else r81S().vacations.push({from:from <= to ? from : to, to:from <= to ? to : from, label:g('r80VacLabel') || 'Time off'});
  persist('focus'); try{ wakeArm(); }catch(x){} renderView();
};

// ---------------- Streaks: rules and "should I say yes?" live here; no Days off; no "when" ----------------
R80_TRACK.read = {label:'Read', icon:'&#128214;', manual:true, met:function(d){ return r81ManualMet('read', d); }};
R80_TRACK.meditate = {label:'Meditate', icon:'&#129496;', manual:true, met:function(d){ return r81ManualMet('meditate', d); }};
function r81ManualMet(track, d){ const it = arr(state.standards.items).find(function(x){ return x.track===track; }); if(!it) return false; const rec = state.standards.completions.find(function(c){ return c.date===d; }); return !!(rec && rec.doneIds.indexOf(it.id) >= 0); }
[{id:'read', line:'Read every day (you tick it in Today’s standard).', def:false}, {id:'meditate', line:'Sit for a few minutes every day (you tick it).', def:false}].forEach(function(m){ if(!R80_MASTER.some(function(x){ return x.id===m.id; })) R80_MASTER.splice(R80_MASTER.findIndex(function(x){ return x.id==='outreach'; }), 0, m); });
// the master order you asked for: work hours, workouts, calorie deficit, read daily, then the rest
(function(){ const order = ['work', 'workout', 'deficit', 'read', 'journal', 'outreach', 'meditate']; R80_MASTER.sort(function(a, b){ return order.indexOf(a.id) - order.indexOf(b.id); }); })();
R80_TRACK_OPTS.push(['read', 'You tick it: read'], ['meditate', 'You tick it: meditate']);
// a manual master is an item you tick (the app counts the run); it doesn't tick itself
r80Sync = (function(base){
  return function(){
    const keep = {}; Object.keys(R80_TRACK).forEach(function(k){ if(R80_TRACK[k].manual){ keep[k] = R80_TRACK[k]; } });
    const items = arr(state.standards.items), hidden = [];
    items.forEach(function(it){ if(it.track && keep[it.track]){ hidden.push([it, it.track]); delete it.track; } });
    try{ return base.apply(this, arguments); } finally { hidden.forEach(function(p){ p[0].track = p[1]; }); }
  };
})(r80Sync);
toggleStandard = (function(base){
  return function(id){
    const it = arr(state.standards.items).find(function(x){ return x.id===id; });
    if(it && it.track && R80_TRACK[it.track] && R80_TRACK[it.track].manual){ const t = it.track; delete it.track; try{ return base.apply(this, arguments); } finally { it.track = t; } }
    return base.apply(this, arguments);
  };
})(toggleStandard);
r80StdAdd = (function(base){
  return function(track){
    if(R80_TRACK[track] && R80_TRACK[track].manual){
      const items = arr(state.standards.items); let it = items.find(function(x){ return x.track===track; });
      if(!it) it = items.find(function(x){ return !x.track && new RegExp(track==='read' ? 'read' : 'meditat', 'i').test(x.label || ''); });
      if(it) it.track = track; else { it = {id:uid(), label:track==='read' ? 'Read' : 'Meditate', createdAt:todayStr(), track:track}; items.push(it); }
      state.standards.items = items; persist('standards'); return it;
    }
    return base.apply(this, arguments);
  };
})(r80StdAdd);
// on Today and on the Streaks page, a manual master isn't "auto"
PANEL_RENDERERS.personalStats = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    arr(state.standards.items).forEach(function(it){
      if(!it.track || !R80_TRACK[it.track] || !R80_TRACK[it.track].manual) return;
      h = h.replace(new RegExp('<span class="chip ([^"]*) r80-sc is-auto" title="Checked by the app" data-id="'+it.id+'"'), function(m, cls){ return '<span class="chip '+cls+'" data-action="toggleStandard" data-id="'+it.id+'"'; });
    });
    return h;
  };
})(PANEL_RENDERERS.personalStats);
r65StdHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = r81Unauto(h);
    // the schedule decides days off now
    h = h.replace(/<label><span>Days off a week<\/span>[\s\S]*?<\/label>/, function(){ return '<span class="r81-offn">Days off come from your <button class="r43-link" data-action="r80OpenSched">schedule</button>.</span>'; });
    return h;
  };
})(r65StdHtml);
function r81Unauto(h){
  arr(state.standards.items).forEach(function(it){ if(it.track && R80_TRACK[it.track] && R80_TRACK[it.track].manual){ const inp = '<input value="'+escapeHtml(it.label)+'" data-r63-item="'+it.id+'"'; h = h.split('<em class="r80-autot" title="Checked by the app">auto</em>'+inp+' readonly').join(inp); } });
  return h;
}
r63StdHtml = (function(base){ return function(){ return r81Unauto(base.apply(this, arguments)); }; })(r63StdHtml);
// your rules, and should I say yes, after Today's standard
function r81RulesHtml(){
  const S = r81S();
  return '<section class="r65-sec r81-rules"><div class="r65-h">Your rules <span class="r80-hs">what you hold yourself to (Op holds you to them too)</span></div>'+
    '<div class="r80-rules">'+S.rules.map(function(r, i){ return '<div class="r80-rule"><span>'+escapeHtml(r)+'</span><button data-action="r80RuleDel" data-id="'+i+'" aria-label="Remove">&#10005;</button></div>'; }).join('')+
    (S.rules.length ? '' : '<div class="r80-rule is-dim"><span>e.g. No plans before 6 PM on a work day. Two social nights a week, at most.</span></div>')+
    '<div class="r80-rule is-add"><input class="input" id="r80RuleNew" placeholder="Add a rule"><button class="btn btn-sm btn-ghost" data-action="r80RuleAdd">Add</button></div></div>'+
    '<label class="r80-soc">Social nights a week, at most <select class="input input-sm" data-r80-soc>'+[1, 2, 3, 4, 7].map(function(n){ return '<option value="'+n+'"'+(Number(S.social)===n ? ' selected' : '')+'>'+(n===7 ? 'No limit' : n)+'</option>'; }).join('')+'</select></label></section>'+
    '<section class="r65-sec r81-ask">'+r80AskHtml()+'</section>';
}
r63Tab = (function(base){
  return function(){
    const h = base.apply(this, arguments).replace('<button class="r70-offb" data-action="r70OffOpen">&#127796; Days off</button>', '');
    const i = h.search(/<section class="r65-sec"><div class="r65-h">(Start another|Start a streak)/);
    return i > 0 ? h.slice(0, i)+r81RulesHtml()+h.slice(i) : h+r81RulesHtml();
  };
})(r63Tab);
// a custom streak is the things to do: no "when"
r63SheetHtml = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/<input class="input r63-d[^"]*"[^>]*data-r63-d="cue\|\d+"[^>]*>/g, '').replace(/<span[^>]*>\s*When\s*<\/span>/gi, '');
  };
})(r63SheetHtml);

setTimeout(function(){ try{ if(state.focus && state.focus.schedule) r81S(); }catch(e){} }, 0);

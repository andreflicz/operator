// ============ ROUND 42 ============
// Build 2 of the October batch: client deliverables run on posting weeks and are made ahead, the reel
// counter, snooze, waiting on a client, client tasks and client colours.

// ---- 1. deliverables by posting week ----
// A client's monthly number (30 reels) is spread over the days of the month (about one a day), so a
// Monday-to-Sunday posting week needs its share: 30 a month → 7 most weeks, 4 a month → 1. The month's
// weeks always add up to exactly the month's number.
// The work for a posting week is due BEFORE that week starts: by the end of the Sunday before (or earlier,
// Settings → Goals & Standards → "Content due"). So this week's lineup carries next week's reels, and a
// client's pace and health follow that: finished early is ahead; still open once its week has started is late.
// Every piece logged (from the task, the counter or the client card) fills the earliest posting week that
// still needs it and hasn't ended yet.
function r42DueOffset(){ const n = Number(state.standards && state.standards.contentDueDaysEarly); return n >= 0 && n <= 6 ? Math.floor(n) : 0; }
function r42Due(post){ return addDays(post, -1 - r42DueOffset()); }
function r42Dim(y, m){ return new Date(y, m + 1, 0).getDate(); }
// how many of a deliverable a posting week (its Monday) needs: each month's part of the week, by cumulative
// rounding so a month always lands on its number
function r42Need(d, post){
  const n = Math.max(0, Math.round(monthlyTargetFor(d) || 0)); if(!n) return 0;
  let tot = 0;
  for(let i = 0; i < 7; i++){
    const ds = addDays(post, i), p = ds.split('-').map(Number), dim = r42Dim(p[0], p[1] - 1), day = p[2];
    tot += Math.round(n*day/dim) - Math.round(n*(day - 1)/dim);
  }
  return tot;
}
// the posting weeks that matter right now: six back, two ahead
function r42Posts(){ const w0 = thisWeekKey(), out = []; for(let k = -6; k <= 2; k++) out.push(addDays(w0, 7*k)); return out; }
// which logged pieces count for which posting week
function r42Alloc(d){
  if(RC && d.id){ return memo('r42a:'+d.id+':'+arr(d.completedDates).length+':'+JSON.stringify(d.r42Tags||{}).length, function(){ return r42AllocRaw(d); }); }
  return r42AllocRaw(d);
}
function r42AllocRaw(d){
  const posts = r42Posts(), need = {}, fill = {}, dates = {};
  posts.forEach(function(p){ need[p] = r42Need(d, p); fill[p] = 0; dates[p] = []; });
  const first = addDays(posts[0], -21);
  // the pool of logged pieces (a date can appear more than once)
  const pool = {}; arr(d.completedDates).forEach(function(x){ if(x >= first) pool[x] = (pool[x]||0) + 1; });
  // pieces logged from a week's own task count for that week first
  const tags = d.r42Tags && typeof d.r42Tags==='object' ? d.r42Tags : {};
  posts.forEach(function(p){ arr(tags[p]).forEach(function(x){ if(fill[p] < need[p] && pool[x] > 0){ pool[x]--; fill[p]++; dates[p].push(x); } }); });
  // the rest fill the earliest week that still needs them and hasn't ended
  Object.keys(pool).sort().forEach(function(c){
    for(let k = 0; k < pool[c]; k++){
      for(let i = 0; i < posts.length; i++){
        const p = posts[i];
        if(fill[p] >= need[p]) continue;
        if(addDays(p, 6) < c) continue;
        if(p > addDays(c, 21)) break;
        fill[p]++; dates[p].push(c); break;
      }
    }
  });
  return {posts:posts, need:need, fill:fill, dates:dates};
}
// this week you work on next week's posts
function r42WorkPost(){ return addDays(thisWeekKey(), 7); }
function r42Week(d, post){ const a = r42Alloc(d); post = post || r42WorkPost(); return {need:a.need[post] || 0, done:a.fill[post] || 0, dates:a.dates[post] || [], post:post, due:r42Due(post)}; }

// the client card and health read the week being worked on
deliverableWeekNeed = function(d){ return r42Week(d).need; };
deliverableWeekCount = function(d){ return r42Week(d).done; };
isDeliverableDoneThisWeek = (function(base){
  return function(d){ if(!d.recurring) return base.apply(this, arguments); const w = r42Week(d); return w.need===0 || w.done >= w.need; };
})(isDeliverableDoneThisWeek);
deliverablePaceStatusRaw = function(d){
  const now = r42Week(d, thisWeekKey());
  if(now.need && now.done < now.need) return 'danger';                 // this week's posts aren't all made: late
  const w = r42Week(d); if(!w.need || w.done >= w.need) return 'good';
  const daysIn = ((new Date().getDay()+6)%7) + 1, lastDay = 7 - r42DueOffset();
  const due = Math.floor(w.need*Math.min(daysIn, lastDay)/lastDay);
  return w.done > due ? 'good' : w.done===due ? 'warn' : 'danger';
};
delivPaceWord = function(d){
  const now = r42Week(d, thisWeekKey()); if(now.need && now.done < now.need) return 'late for this week';
  const w = r42Week(d); return w.done >= w.need ? 'next week is done' : paceWord(deliverablePaceStatus(d));
};
clientHealthReason = (function(base){
  return function(c, status){
    if(status.level==='green' && status.hasDeliverables) return arr(c.deliverables).every(function(d){ return !d.recurring || isDeliverableDoneThisWeek(d); }) ? 'next week is done' : 'ahead of the week';
    return base.apply(this, arguments);
  };
})(clientHealthReason);

// the tasks: one per client deliverable per posting week, there from the week before
function r42TaskFor(c, d, post){ return state.tasks.items.find(function(t){ const m = t.master; return m && m.kind==='dvw' && !m.oneOff && m.clientId===c.id && m.delivId===d.id && m.post===post; }); }
masterTasksSync = (function(base){
  return function(){
    if(mt38Busy || !state || !state.tasks || !state.business) return;
    // the one-offs and Reach out still run as before; the old four-weeks-a-cycle tasks are retired
    const before = JSON.stringify(state.tasks.items.map(function(t){ return [t.id, t.status, t.title, t.deadline]; }));
    base.apply(this, arguments);
    mt38Busy = true;
    try{
      const today = todayStr(), cs = mtActiveClients(), work = r42WorkPost(), cur = thisWeekKey();
      // old-style weekly tasks (cycle weeks) that are still open go: their pieces now count by posting week
      state.tasks.items = state.tasks.items.filter(function(t){ const m = t.master; return !(m && m.kind==='dvw' && !m.oneOff && !m.post && t.status!=='done'); });
      const live = {};
      cs.forEach(function(c){
        arr(c.deliverables).forEach(function(d){
          if(!d.recurring) return;
          const a = r42Alloc(d);
          [cur, work].forEach(function(post){
            const need = a.need[post] || 0; if(!need) return;
            live[c.id+':'+d.id+':'+post] = 1;
            let t = r42TaskFor(c, d, post);
            // this week's task only exists if it was made last week (or it's still owed)
            if(!t){
              if(post===cur && a.fill[post] >= need) return;
              t = {id:uid(), title:'', client:c.id, clients:[c.id], priority:post===cur ? 'high' : 'med', deadline:r42Due(post), notes:'', status:'backlog', createdAt:today, completedAt:null,
                master:{kind:'dvw', post:post, clientId:c.id, delivId:d.id}};
              state.tasks.items.push(t);
            }
            const title = String(d.title || 'Deliverable').trim();
            if(t.title!==title) t.title = title;
            if(t.deadline!==r42Due(post)) t.deadline = r42Due(post);
            const full = a.fill[post] >= need;
            if(full && t.status!=='done'){ t.master.prev = t.status==='parked' ? (t.parkedFrom || 'backlog') : t.status; t.status = 'done'; t.completedAt = today; t.snoozedUntil = null; t.waitingOn = null; }
            else if(!full && t.status==='done'){ t.status = t.master.prev && t.master.prev!=='done' ? t.master.prev : 'backlog'; t.completedAt = null; }
          });
        });
      });
      // a posting week that's over: what never got made is history; a client or deliverable that's gone takes its open task
      state.tasks.items = state.tasks.items.filter(function(t){
        const m = t.master; if(!m || m.kind!=='dvw' || m.oneOff || !m.post) return true;
        if(t.status==='done') return true;
        if(addDays(m.post, 6) < today){ m.retired = true; t.status = 'done'; t.completedAt = addDays(m.post, 6); t.missed = true; return true; }
        return !!live[m.clientId+':'+m.delivId+':'+m.post];
      });
      const after = JSON.stringify(state.tasks.items.map(function(t){ return [t.id, t.status, t.title, t.deadline]; }));
      if(after!==before){ persist('tasks'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
    } finally { mt38Busy = false; }
  };
})(masterTasksSync);
// what a deliverable task is right now
dvwFind = (function(base){
  return function(t){
    const m = t && t.master; if(!m || m.kind!=='dvw') return null;
    if(m.oneOff || !m.post) return base.apply(this, arguments);
    const hit = delivFind(m.clientId, m.delivId); if(!hit) return null;
    const w = r42Week(hit.d, m.post);
    return {c:hit.c, d:hit.d, cy:null, k:0, post:m.post, due:r42Due(m.post), need:w.need, done:Math.min(w.done, w.need), dates:w.dates, total:monthlyTargetFor(hit.d), count:deliverableMonthCount(hit.d)};
  };
})(dvwFind);
function r42WeekLabel(post){ return 'Week of '+fmtDateShort(post); }
dvwView = (function(base){
  return function(t){
    const x = dvwFind(t); if(!x) return null;
    if(!x.post) return base.apply(this, arguments);
    return {x:x, c:x.c, who:x.c.business || x.c.name || 'Client', name:String(x.d.title || 'Deliverable'), at:x.done, of:x.need, pieces:dvwPieces(x.d, x.need)};
  };
})(dvwView);
dvwDotsHtml = (function(base){
  return function(v){
    if(!v.x || !v.x.post) return base.apply(this, arguments);
    let h = '<span class="dvc-dots is-count" style="--cc:'+clientAccent(v.c)+'">';
    for(let i = 0; i < v.of; i++) h += '<i class="'+(i < v.at ? 'is-on' : '')+'"></i>';
    return h+'</span><b class="dvc-n">'+v.at+'/'+v.of+'</b>';
  };
})(dvwDotsHtml);
dvwWeekLabel = (function(base){ return function(v){ return v.x && v.x.post ? r42WeekLabel(v.x.post) : base.apply(this, arguments); }; })(dvwWeekLabel);
dvProgHtml = (function(base){
  return function(t){
    const x = dvwFind(t); if(!x || !x.post) return base.apply(this, arguments);
    return '<div class="dvw-sub">'+x.done+' of '+x.need+' '+escapeHtml(String(x.d.title||'').toLowerCase())+' &middot; due '+fmtDateShort(x.due)+'</div>';
  };
})(dvProgHtml);
// Done fills the week; the counter sets an exact number; Undo takes back what Done put in
function r42SetCount(t, n){
  const x = dvwFind(t); if(!x || !x.post) return;
  n = Math.max(0, Math.min(x.need, Math.round(n)));
  const today = todayStr();
  const tags = x.d.r42Tags && typeof x.d.r42Tags==='object' ? x.d.r42Tags : (x.d.r42Tags = {});
  if(n > x.done){ for(let i = x.done; i < n; i++){ delivLogOne({c:x.c, d:x.d}, today); tags[x.post] = arr(tags[x.post]).concat([today]); } }
  else if(n < x.done){
    // take back the newest pieces counted for this week
    const take = x.dates.slice().sort().slice(n), l = arr(x.d.completedDates);
    take.reverse().forEach(function(dt){ const i = l.lastIndexOf(dt); if(i >= 0) l.splice(i, 1); const tl = arr(tags[x.post]), j = tl.lastIndexOf(dt); if(j >= 0){ tl.splice(j, 1); tags[x.post] = tl; } });
    x.d.completedDates = l;
  }
  // old tags fall away with their weeks
  Object.keys(tags).forEach(function(p){ if(p < addDays(thisWeekKey(), -56)) delete tags[p]; });
  persist('business');
  masterTasksSync();
  const y = dvwFind(t);
  if(y && y.done >= y.need && n > x.done){ playTaskComplete(); if(ui.currentTaskId===t.id && typeof releaseCurrentTask==='function') try{ releaseCurrentTask(); }catch(e){} }
  else playTick();
  renderView();
}
dvwDone = (function(base){
  return function(t){
    const x = dvwFind(t); if(!x || !x.post) return base.apply(this, arguments);
    if(x.done >= x.need) return;
    const before = x.done; t.master.logged = x.need - before;
    r42SetCount(t, x.need);
    showToast(escapeHtml(x.d.title)+' for '+escapeHtml(x.c.business || x.c.name)+': '+r42WeekLabel(x.post).toLowerCase()+' is done.', {icon:'&#128230;', actionLabel:'Undo', actionAction:'mtDvUndo', actionId:t.id, duration:5000});
  };
})(dvwDone);
dvwUndo = (function(base){
  return function(t){
    const x = dvwFind(t); if(!x || !x.post) return base.apply(this, arguments);
    const back = Math.max(0, x.done - (t.master.logged > 0 ? t.master.logged : x.done)); t.master.logged = 0;
    r42SetCount(t, back);
  };
})(dvwUndo);
ACTIONS.r42SetCount = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const p = String(id||'').split(':'), t = state.tasks.items.find(function(x){ return x.id===p[0]; }); if(!t) return;
  const x = dvwFind(t); if(!x) return;
  const n = Number(p[1]);
  r42SetCount(t, n===x.done ? n - 1 : n);    // tapping the last lit block turns it off
};
// the counter: numbered blocks, tap one to set how many are done
function r42CounterHtml(t, big){
  const x = dvwFind(t); if(!x || !x.post || !x.need) return '';
  let h = '';
  for(let i = 1; i <= x.need; i++) h += '<button type="button" class="r42-seg'+(i <= x.done ? ' is-on' : '')+'" data-action="r42SetCount" data-id="'+t.id+':'+i+'" aria-label="'+i+' done">'+i+'</button>';
  return '<div class="r42-count'+(big ? ' is-big' : '')+'" style="--cc:'+clientAccent(x.c)+'" role="group" aria-label="Set how many are done"><div class="r42-segs">'+h+'</div><b>'+x.done+' / '+x.need+'</b></div>';
}
// the Current card uses the counter (tap a block); the lineup and tiles keep the small dots
r41DvwProgress = function(t, big){ return big ? r42CounterHtml(t, true) : ''; };
r41TaskChips = (function(base){
  return function(t){
    const x = dvwFind(t);
    if(!x || !x.post) return base.apply(this, arguments);
    const late = x.post <= todayStr() && x.done < x.need;
    return clientChipHtml(x.c)+'<span class="tag r42-due'+(late ? ' is-late' : '')+'">'+r42WeekLabel(x.post)+' &middot; '+(late ? 'late' : 'due '+fmtDateShort(x.due))+'</span>';
  };
})(r41TaskChips);
// the calendar: a deliverable's due day says whose and how many
calDayInfo = (function(base){
  return function(ds){
    const info = base.apply(this, arguments);
    if(info && Array.isArray(info.deadlines)) info.deadlines = info.deadlines.map(function(t){
      const x = t && t.master && t.master.kind==='dvw' ? dvwFind(t) : null; if(!x || !x.post) return t;
      return Object.assign({}, t, {title:(x.c.business || x.c.name)+' · '+x.need+' '+String(x.d.title || '').toLowerCase()+(x.done >= x.need ? ' ✓' : '')});
    });
    return info;
  };
})(calDayInfo);

// ---- 2. snooze and waiting on a client ----
// A deliverable or client task can be snoozed (12 hours, or tomorrow at 9) or parked "waiting on" the
// client. Either takes it out of the lineup and the lists (status "parked"); it doesn't count against
// your pace while it's parked. Snoozed ones come back on their own. Waiting ones sit on the client's card
// until you unpark them, and the client shows up in Reach out when it's time to chase them.
function r42Park(t, how){
  if(!t || t.status==='done') return;
  if(t.status!=='parked') t.parkedFrom = t.status;
  t.status = 'parked';
  if(how.snooze){ t.snoozedUntil = how.snooze; t.waitingOn = null; }
  if(how.wait){ t.waitingOn = how.wait; t.snoozedUntil = null; }
  if(ui.currentTaskId===t.id && typeof releaseCurrentTask==='function') try{ releaseCurrentTask(); }catch(e){}
  if(state.focus.nextTaskId===t.id) state.focus.nextTaskId = null;
  if(ui.stagedTaskId===t.id) ui.stagedTaskId = null;
  persist('tasks'); persist('focus');
}
function r42Unpark(t){
  if(!t || t.status!=='parked') return;
  t.status = t.parkedFrom && t.parkedFrom!=='parked' ? t.parkedFrom : 'today';
  t.parkedFrom = null; t.snoozedUntil = null; t.waitingOn = null;
  persist('tasks');
}
function r42ClientOf(t){ const id = arr(t && t.clients).find(function(v){ return v && v!=='personal' && v!=='general' && String(v).indexOf('lead:')!==0; }); return id ? arr(state.business.clients).find(function(c){ return c.id===id; }) : null; }
function r42Tomorrow9(){ const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); }
ACTIONS.r42Snooze = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const p = String(id||'').split(':'), t = state.tasks.items.find(function(x){ return x.id===p[0]; }); if(!t) return;
  const until = p[1]==='tomorrow' ? r42Tomorrow9() : Date.now() + 12*3600000;
  if(typeof closeTaskMenu==='function') closeTaskMenu();
  r42Park(t, {snooze:until}); ui.r42RowOpen = null; playTick(); renderView();
  showToast('Snoozed until '+new Date(until).toLocaleString(undefined, {weekday:'short', hour:'numeric', minute:'2-digit'}), {icon:'&#128164;', actionLabel:'Undo', actionAction:'r42Unpark', actionId:t.id, duration:5000});
};
ACTIONS.r42Unpark = function(el, e, id){ if(e && e.stopPropagation) e.stopPropagation(); const t = state.tasks.items.find(function(x){ return x.id===id; }); if(t){ r42Unpark(t); if(typeof dismissToast==='function') dismissToast(); playTick(); renderView(); } };
// the "waiting on" sheet
ACTIONS.r42WaitOpen = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!t) return;
  ui.r42RowOpen = null; if(typeof closeTaskMenu==='function') closeTaskMenu();
  const c = r42ClientOf(t), who = c ? (c.business || c.name) : 'the client';
  const prev = document.getElementById('r42WaitOverlay'); if(prev) prev.remove();
  const o = document.createElement('div'); o.id = 'r42WaitOverlay'; o.className = 'overlay ui-dlg-ov';
  ui.r42Chase = '2d';
  o.innerHTML = '<div class="card ui-dlg r42-wait" role="dialog" aria-modal="true" aria-labelledby="r42WaitT">'+
    '<div class="r41-ts-k">Waiting on '+escapeHtml(who)+'</div>'+
    '<h3 class="ui-dlg-t" id="r42WaitT">Park &ldquo;'+escapeHtml(t.title)+'&rdquo;</h3>'+
    '<label class="r42-wait-l">Waiting on<input class="ui-dlg-in" id="r42WaitWhat" type="text" placeholder="e.g. access to their ad account" value="'+escapeHtml((t.waitingOn && t.waitingOn.what) || '')+'"></label>'+
    '<div class="r42-wait-l">Remind me to chase them<div class="r42-chase">'+[['1d', 'Tomorrow'], ['2d', 'Every 2 days'], ['none', 'Don\'t']].map(function(x){ return '<button type="button" class="'+(x[0]==='2d' ? 'is-on' : '')+'" data-chase="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div></div>'+
    '<div class="ui-dlg-a r42-wait-a"><button class="btn btn-ghost" data-r42="no">Cancel</button><button class="btn r42-park-b" data-r42="yes">Park it</button></div>'+
  '</div>';
  document.body.appendChild(o);
  const close = function(){ o.remove(); document.removeEventListener('keydown', key, true); };
  const park = function(){
    const what = (document.getElementById('r42WaitWhat').value || '').trim();
    const ch = ui.r42Chase, next = ch==='none' ? null : addDays(todayStr(), ch==='1d' ? 1 : 2);
    r42Park(t, {wait:{what:what, since:todayStr(), chase:ch, next:next, clientId:c ? c.id : null}});
    close(); playTick(); renderView();
    showToast('Parked until '+who+' comes through', {icon:'&#9203;', actionLabel:'Undo', actionAction:'r42Unpark', actionId:t.id, duration:5000});
  };
  const key = function(ev){ if(ev.key==='Escape'){ ev.preventDefault(); close(); } else if(ev.key==='Enter'){ ev.preventDefault(); park(); } };
  document.addEventListener('keydown', key, true);
  o.addEventListener('click', function(ev){
    const ch = ev.target.closest('[data-chase]');
    if(ch){ ui.r42Chase = ch.getAttribute('data-chase'); o.querySelectorAll('[data-chase]').forEach(function(b){ b.classList.toggle('is-on', b===ch); }); return; }
    const b = ev.target.closest('[data-r42]'); if(b){ if(b.getAttribute('data-r42')==='yes') park(); else close(); return; }
    if(ev.target===o) close();
  });
  setTimeout(function(){ const i = document.getElementById('r42WaitWhat'); if(i) i.focus(); }, 30);
};
// snoozes wake up by themselves
setInterval(function(){
  if(!state || !state.tasks) return;
  let woke = false; const now = Date.now();
  state.tasks.items.forEach(function(t){ if(t.status==='parked' && t.snoozedUntil && t.snoozedUntil <= now){ r42Unpark(t); woke = true; } });
  if(woke){ persist('tasks'); try{ renderView(); }catch(e){} }
}, 30000);
// chasing: a client you're waiting on shows up in Reach out on the day you said
reachNeeds = (function(base){
  return function(){
    const list = base.apply(this, arguments), today = todayStr();
    state.tasks.items.forEach(function(t){
      const w = t.status==='parked' && t.waitingOn; if(!w || !w.next || w.next > today || !w.clientId) return;
      const c = arr(state.business.clients).find(function(x){ return x.id===w.clientId; }); if(!c) return;
      if(list.some(function(x){ return x.c.id===c.id; })) return;
      list.unshift({c:c, n:0, red:false, score:50, chase:true});
    });
    return list;
  };
})(reachNeeds);
// logging a touch with them moves the next chase along
logTouch = (function(base){
  return function(kind, id){
    const r = base.apply(this, arguments);
    if(kind==='client') state.tasks.items.forEach(function(t){ const w = t.status==='parked' && t.waitingOn; if(w && w.clientId===id && w.chase!=='none' && w.next && w.next <= todayStr()){ w.next = addDays(todayStr(), w.chase==='1d' ? 1 : 2); } });
    persist('tasks');
    return r;
  };
})(logTouch);

// ---- 3. the lineup row opens its actions in place (no floating menu) ----
// ⋯ on a lineup row opens a strip inside the row: Snooze 12h / Tomorrow 9 AM / Waiting on <client> on
// deliverables and client tasks, then Rename and Delete (and More… for the full menu).
function r42IsClientWork(t){ return !!(t && ((t.master && t.master.kind==='dvw') || r42ClientOf(t))); }
lineupListHtml = (function(base){
  return function(today){
    const h = base.apply(this, arguments);
    if(h.indexOf('tl-row') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.tl-row').forEach(function(row){
      const t = state.tasks.items.find(function(x){ return x.id===row.dataset.taskId; }); if(!t) return;
      const more = row.querySelector('.card-more');
      if(more){ more.setAttribute('data-action', 'r42RowMenu'); more.setAttribute('aria-expanded', ui.r42RowOpen===t.id ? 'true' : 'false'); }
      // the deliverable's count beside its dots
      const x = t.master && t.master.kind==='dvw' ? dvwFind(t) : null;
      if(x && x.post){ const wk = row.querySelector('.dvc-wk'); if(wk){ const b = wk.querySelector('.dvc-n'); if(b) b.textContent = x.done+'/'+x.need; } }
      if(ui.r42RowOpen!==t.id) return;
      row.classList.add('r42-open');
      const c = r42ClientOf(t), strip = document.createElement('div'); strip.className = 'r42-strip';
      strip.innerHTML = (r42IsClientWork(t) ? '<button class="r42-pill" data-action="r42Snooze" data-id="'+t.id+':12h">Snooze 12h</button><button class="r42-pill" data-action="r42Snooze" data-id="'+t.id+':tomorrow">Tomorrow 9 AM</button>'+
          (c ? '<button class="r42-pill is-wait" data-action="r42WaitOpen" data-id="'+t.id+'">Waiting on '+escapeHtml(c.business || c.name)+'</button>' : '') : '')+
        '<span class="r42-strip-sp"></span>'+
        '<button class="r42-pill" data-action="openTaskEditModal" data-id="'+t.id+'">Edit</button>'+
        '<button class="r42-pill" data-action="taskMenuBtn" data-id="'+t.id+'">More&hellip;</button>';
      row.appendChild(strip);
    });
    return tpl.innerHTML;
  };
})(lineupListHtml);
ACTIONS.r42RowMenu = function(el, e, id){ if(e && e.stopPropagation) e.stopPropagation(); ui.r42RowOpen = ui.r42RowOpen===id ? null : id; playTick(); renderView(); };
// the task's right-click menu has them too (cards, tiles, anywhere else), and says Current not Now
openTaskMenu = (function(base){
  return function(t){
    const r = base.apply(this, arguments);
    const m = document.getElementById('taskCtxMenu'); if(!m) return r;
    m.querySelectorAll('.ctx-item').forEach(function(b){ b.innerHTML = b.innerHTML.replace('Put it on Now', 'Make it Current'); });
    if(r42IsClientWork(t) && t.status!=='done' && t.status!=='parked'){
      const c = r42ClientOf(t), title = m.querySelector('.ctx-title');
      const box = document.createElement('div');
      box.innerHTML = '<button class="ctx-item" data-action="r42Snooze" data-id="'+t.id+':12h">&#128164; Snooze 12 hours</button><button class="ctx-item" data-action="r42Snooze" data-id="'+t.id+':tomorrow">&#128164; Snooze to tomorrow 9 AM</button>'+
        (c ? '<button class="ctx-item" data-action="r42WaitOpen" data-id="'+t.id+'">&#9203; Waiting on '+escapeHtml(c.business || c.name)+'&hellip;</button>' : '')+'<div class="ctx-sep"></div>';
      if(title) Array.from(box.childNodes).reverse().forEach(function(n){ title.insertAdjacentElement ? title.after(n) : null; });
    }
    return r;
  };
})(openTaskMenu);
// snoozed tasks gather at the bottom of the lineup
renderFocusTasksOverview = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const sn = state.tasks.items.filter(function(t){ return t.status==='parked' && t.snoozedUntil; });
    if(!sn.length) return h;
    const rows = sn.map(function(t){ return '<div class="r42-snz"><span class="r42-snz-k">Snoozed</span><span class="r42-snz-t">'+escapeHtml(t.title)+(r42ClientOf(t) ? ' &middot; '+escapeHtml(r42ClientOf(t).business || r42ClientOf(t).name) : '')+'</span><span class="r42-snz-w">back '+new Date(t.snoozedUntil).toLocaleString(undefined, {weekday:'short', hour:'numeric', minute:'2-digit'})+'</span><button class="r42-pill" data-action="r42Unpark" data-id="'+t.id+'">Bring back</button></div>'; }).join('');
    const at = h.indexOf('<div class="section r41-soon-sec">');
    return at >= 0 ? h.slice(0, at)+'<div class="r42-snzs">'+rows+'</div>'+h.slice(at) : h+'<div class="r42-snzs">'+rows+'</div>';
  };
})(renderFocusTasksOverview);

// ---- 4. Waiting on clients: its own tab on Focus → Tasks (only while something's parked) ----
function r42Waiting(){ return state.tasks.items.filter(function(t){ return t.status==='parked' && t.waitingOn; }); }
focusTasksSubtabsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), n = r42Waiting().length;
    if(!n && ui.focusTasksSubTab!=='waiting') return h;
    const pill = '<div class="subtab'+(ui.focusTasksSubTab==='waiting' ? ' active' : '')+'" data-action="focusTasksSubTab" data-tab="waiting">&#9203; Waiting on clients <span style="opacity:.7;">'+n+'</span></div>';
    return h.replace(/(<div class="subtab[^"]*" data-action="focusTasksSubTab" data-tab="clientBacklog">[\s\S]*?<\/div>)/, '$1'+pill);
  };
})(focusTasksSubtabsHtml);
function r42WaitRowHtml(t, onCard){
  const w = t.waitingOn || {}, c = r42ClientOf(t), days = w.since ? Math.max(0, Math.round((new Date(todayStr()+'T12:00') - new Date(w.since+'T12:00'))/86400000)) : 0;
  const chase = w.next ? (w.next <= todayStr() ? 'chase today' : 'chase '+fmtDateShort(w.next)) : '';
  return '<div class="r42-wait-row" style="--cc:'+(c ? clientAccent(c) : '#9B8CFF')+'">'+
    '<div class="r42-wait-m"><span class="r42-wait-k">Waiting on '+(onCard ? 'them' : escapeHtml(c ? (c.business || c.name) : 'the client'))+'</span>'+
      '<b>'+escapeHtml(w.what || 'Their reply')+'</b>'+
      '<small>'+escapeHtml(t.title)+' &middot; '+(days ? days+' day'+(days===1 ? '' : 's') : 'since today')+(chase ? ' &middot; '+chase : '')+'</small></div>'+
    '<button class="btn btn-sm r42-unpark" data-action="r42Unpark" data-id="'+t.id+'">Got it, unpark</button>'+
  '</div>';
}
renderFocusTasksTab = (function(base){
  return function(){
    if(ui.focusTasksSubTab==='waiting'){
      const list = r42Waiting();
      return '<div class="subtab-panel" data-key="tasks-waiting"><div class="section"><div class="section-title">Waiting on clients<span class="kpi-sub">'+list.length+'</span></div>'+
        (list.length ? '<div class="r42-wait-list">'+list.map(function(t){ return r42WaitRowHtml(t, false); }).join('')+'</div>' : '<div class="empty">Nothing parked.</div>')+'</div></div>';
    }
    return base.apply(this, arguments);
  };
})(renderFocusTasksTab);

// ---- 5. the client card: what you're waiting on, and its colour ----
clientCardV2 = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    const waits = r42Waiting().filter(function(t){ const x = r42ClientOf(t); return x && x.id===c.id; });
    const cur = clientAccent(c);
    const colors = '<div class="r42-cc-color"><span>Color</span>'+CLIENT_PALETTE.map(function(col){ return '<button type="button" class="r42-sw'+(col.toLowerCase()===cur.toLowerCase() ? ' is-on' : '')+'" style="background:'+col+'" data-action="r42ClientColor" data-id="'+c.id+':'+col.slice(1)+'" aria-label="Use this colour"></button>'; }).join('')+'</div>';
    const extra = (waits.length ? '<div class="r42-cc-waits">'+waits.map(function(t){ return r42WaitRowHtml(t, true); }).join('')+'</div>' : '')+colors;
    const i = h.lastIndexOf('</div>');
    return i > 0 ? h.slice(0, i)+extra+h.slice(i) : h+extra;
  };
})(clientCardV2);
ACTIONS.r42ClientColor = function(el, e, id){
  if(e && e.stopPropagation) e.stopPropagation();
  const p = String(id||'').split(':'), c = arr(state.business.clients).find(function(x){ return x.id===p[0]; }); if(!c) return;
  c.color = '#'+p[1]; persist('business'); playTick(); renderView();
};

// ---- 6. client tasks count toward the client: done on time keeps them healthy, overdue drags them ----
function r42ClientTaskLevel(c){
  const today = todayStr();
  let worst = 0;
  state.tasks.items.forEach(function(t){
    if(t.status==='done' || t.status==='parked' || (t.master && t.master.kind==='dvw') || !t.deadline || t.deadline >= today) return;
    const x = r42ClientOf(t); if(!x || x.id!==c.id) return;
    const late = Math.round((new Date(today+'T12:00') - new Date(t.deadline+'T12:00'))/86400000);
    worst = Math.max(worst, late >= 3 ? 2 : 1);
  });
  return worst===2 ? 'danger' : worst===1 ? 'warn' : 'good';
}
clientHealthStatusRaw = (function(base){
  return function(c){
    const s = base.apply(this, arguments), tl = r42ClientTaskLevel(c), rank = {good:0, warn:1, danger:2};
    if(rank[tl] > rank[s.level==='red' ? 'danger' : s.level==='yellow' ? 'warn' : 'good']){
      s.level = tl==='danger' ? 'red' : 'yellow'; s.taskLevel = tl;
    }
    return s;
  };
})(clientHealthStatusRaw);
clientHealthReason = (function(base){ return function(c, status){ if(status.taskLevel) return status.taskLevel==='danger' ? 'a task for them is overdue' : 'a task for them is late'; return base.apply(this, arguments); }; })(clientHealthReason);

// ---- 7. Settings → Goals & Standards: when content is due ----
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments), v = r42DueOffset();
    const field = '<div class="field"><label>Content due</label><select class="input" id="setContentDueEarly">'+
      [[0, 'By Sunday night, before the week it posts'], [1, 'By Saturday'], [2, 'By Friday'], [3, 'By Thursday']].map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===v ? ' selected' : '')+'>'+o[1]+'</option>'; }).join('')+'</select></div>';
    return h.replace(/(id="setNewClientsPerMonth"[^>]*><\/div>)/, '$1'+field);
  };
})(renderSettings);
saveProfile = (function(base){
  return function(){
    const el = document.getElementById('setContentDueEarly');
    if(el){ state.standards.contentDueDaysEarly = Math.max(0, Math.min(3, Number(el.value)||0)); persist('standards'); }
    return base.apply(this, arguments);
  };
})(saveProfile);

// ---- 8. the Client backlog, by posting week ----
// Per client: each deliverable's week being made now (posts next week) and, if it's not finished, the week
// that's posting now (late). The counter sits right on the row.
clientBacklogHtml = function(){
  const today = todayStr();
  const row = function(t, x){
    const done = x.done >= x.need, posting = x.post <= today, late = !done && posting;
    return '<div class="cbl-w r42-cbl'+(done ? ' is-done' : late ? ' is-late' : ' is-now')+'" data-id="'+t.id+'">'+
      '<button class="cbl-wk" data-action="openTaskEditModal" data-id="'+t.id+'"><b>'+r42WeekLabel(x.post)+'</b><small>'+(done ? 'Done' : late ? 'Late · was due '+fmtDateShort(x.due) : 'Due '+fmtDateShort(x.due))+'</small></button>'+
      r42CounterHtml(t)+
      '<span class="cbl-wb">'+
        (done ? '' : '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="dvwToday" data-id="'+t.id+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button>')+
      '</span></div>';
  };
  const blocks = mtActiveClients().map(function(c){
    const ds = arr(c.deliverables).filter(function(d){ return d.recurring; });
    const ones = arr(c.deliverables).filter(function(d){ return !d.recurring; }).map(function(d){ return d.linkedTaskId ? state.tasks.items.find(function(t){ return t.id===d.linkedTaskId && t.master && t.master.kind==='dvw'; }) : null; })
      .filter(function(t){ return t && (t.status!=='done' || t.completedAt===today); });
    if(!ds.length && !ones.length) return '';
    const hs = clientHealthStatus(c);
    return '<div class="cbl-client" style="--cc:'+clientAccent(c)+'">'+
      '<div class="cbl-h"><span class="r42-cdot"></span>'+
        '<span class="cbl-n"><b>'+escapeHtml(c.business || c.name)+'</b></span>'+
        '<span class="cbl-hs"><i class="lc-hs is-'+hs.level+'"></i>'+escapeHtml(clientHealthLabel(hs))+'</span></div>'+
      ds.map(function(d){
        const ts = state.tasks.items.filter(function(t){ const m = t.master; return m && m.kind==='dvw' && !m.oneOff && m.post && m.clientId===c.id && m.delivId===d.id && (t.status!=='done' || addDays(m.post, 6) >= today) && !t.missed; })
          .sort(function(a, b){ return a.master.post.localeCompare(b.master.post); });
        return '<div class="cbl-d"><div class="cbl-dh"><b>'+escapeHtml(String(d.title || 'Deliverable'))+'</b><span>'+deliverableMonthCount(d)+'/'+monthlyTargetFor(d)+' this month</span></div><div class="cbl-weeks">'+
          (ts.map(function(t){ const x = dvwFind(t); return x ? row(t, x) : ''; }).join('') || '<div class="kpi-sub" style="padding:6px 2px;">Nothing due this week or next.</div>')+'</div></div>';
      }).join('')+
      (ones.length ? '<div class="cbl-d"><div class="cbl-dh"><b>One-offs</b><span>'+ones.length+'</span></div><div class="cbl-weeks">'+
        ones.map(function(t){ return '<div class="cbl-w'+(t.status==='done' ? ' is-done' : '')+'"><button class="cbl-wk" data-action="openTaskEditModal" data-id="'+t.id+'"><b>'+escapeHtml(t.title)+'</b><small>'+(t.status==='done' ? 'Done' : t.deadline ? 'Due '+fmtDateShort(t.deadline) : 'No due date')+'</small></button><span class="cbl-wb">'+(t.status==='done' ? '' : '<button class="cbl-done" data-action="dvwDone" data-id="'+t.id+'">Done</button>')+'</span></div>'; }).join('')+'</div></div>' : '')+
    '</div>';
  }).filter(Boolean);
  return '<div class="cbl">'+
    '<div class="lc-h"><div><div class="lc-t">Client backlog</div></div></div>'+
    (blocks.length ? blocks.join('') : '<div class="empty">No client deliverables yet. Give a client a package (or a one-off) and the tasks show up here.</div>')+
  '</div>';
};

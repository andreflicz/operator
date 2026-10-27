// ============ ROUND 53 ============
// ---- 1. Reach out to leads: a task, like Reach out to clients ----
// It's there only while a lead is due a follow-up, tagged with exactly those leads; its priority follows how
// long it's been. Done logs a touch on each of them.
function r53LeadsDue(){
  return arr(state.business && state.business.pipeline).filter(function(p){ return leadIsOpen(p); }).map(function(p){ return {x:p, n:crmOverdueDays('lead', p)}; })
    .filter(function(r){ return r.n!=null && r.n >= 0; }).sort(function(a, b){ return b.n - a.n; });
}
// ---- 2. Lifecycle: the things you do every week or every month become tasks ----
// A lifecycle item can repeat (Once / Weekly / Monthly, set in the cycle editor). A client on that step gets a
// task each week (due Friday) or each billing cycle (due the cycle's last day), tagged with them: the weekly
// report shows up on its own, so you don't have to remember it. The "Ongoing" steps already had Weekly
// check-in and Monthly results report: the report repeats now (check-ins are Reach out to clients already),
// and retainer cycles get a Weekly report.
function r53SeedRepeats(){
  const cm = crm(); if(!cm || cm.r53Repeats) return false;
  arr(cm.cycles).forEach(function(cy){
    const last = cy.steps && cy.steps[cy.steps.length - 1]; if(!last) return;
    arr(last.checklist).forEach(function(it){ if(it.repeat || !/report/i.test(it.text)) return; if(/\bweekly\b/i.test(it.text)) it.repeat = 'week'; else if(/\bmonthly\b/i.test(it.text)) it.repeat = 'month'; });
    if((/retainer/i.test(cy.name || '') || cy===r53RegularCycle()) && !arr(last.checklist).some(function(it){ return /weekly report/i.test(it.text); })) last.checklist.push(Object.assign(lcItem('Weekly report', 'doc'), {repeat:'week'}));
  });
  cm.r53Repeats = true; return true;
}
// (an established client who isn't on a cycle counts as a regular one: the retainer cycle's last step)
function r53RegularCycle(){ const cs = cycles(); return cs.find(function(cy){ return /retainer/i.test(cy.name || ''); }) || cycleById(crm().defaultCycleId) || cs[0] || null; }
function r53RepStep(c){
  const own = clientCycle(c), cy = own || r53RegularCycle(); if(!cy || !cy.steps || !cy.steps.length) return null;
  if(!own) return cy.steps[cy.steps.length - 1];
  return c.cycleDone ? cy.steps[cy.steps.length - 1] : clientStep(c);
}
function r53Period(c, every){
  if(every==='month'){ const cy = dvwCycle(c); return {key:cy.start, due:cy.end, label:monthName(cy.start.slice(0, 7))}; }
  const wk = thisWeekKey(); return {key:wk, due:addDays(wk, 4), label:'week of '+fmtDateShort(wk)};
}
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(mt38Busy || !state || !state.tasks || !state.business) return r;
    mt38Busy = true; let changed = false;
    try{
      const today = todayStr(), wk = thisWeekKey(), made = mtStore();
      if(r53SeedRepeats()){ persist('business'); changed = true; }
      // reach out to leads
      const due = r53LeadsDue();
      let lt = state.tasks.items.find(function(t){ return t.master && t.master.kind==='reachLeads' && t.status!=='done'; });
      if(due.length){
        if(!lt){ lt = {id:uid(), title:'', client:'general', clients:[], priority:'med', deadline:null, notes:'', status:'today', createdAt:today, completedAt:null, master:{kind:'reachLeads', week:wk}}; state.tasks.items.push(lt); changed = true; }
        const ids = due.map(function(d){ return d.x.id; }), title = 'Reach out to leads ('+due.length+')', pr = due.some(function(d){ return d.n >= 7; }) ? 'high' : due.some(function(d){ return d.n >= 1; }) ? 'med' : 'low';
        if(JSON.stringify(lt.leads || [])!==JSON.stringify(ids)){ lt.leads = ids; changed = true; }
        if(lt.title!==title){ lt.title = title; changed = true; }
        if(lt.priority!==pr){ lt.priority = pr; changed = true; }
      } else if(lt){ lt.status = 'done'; lt.completedAt = today; changed = true; }
      // lifecycle repeats
      const live = {};
      mtActiveClients().forEach(function(c){
        const st = r53RepStep(c); if(!st) return;
        arr(st.checklist).forEach(function(it){
          if(it.repeat!=='week' && it.repeat!=='month') return;
          const p = r53Period(c, it.repeat), key = 'lcrep:'+c.id+':'+it.id+':'+p.key;
          live[key] = 1;
          if(made[key]) return;
          made[key] = 1; changed = true;
          state.tasks.items.push({id:uid(), title:it.text, client:c.id, clients:[c.id], priority:'med', deadline:p.due, notes:'', status:addDays(today, 2) >= p.due ? 'today' : 'backlog', createdAt:today, completedAt:null,
            master:{kind:'lcrep', clientId:c.id, itemId:it.id, period:p.key, every:it.repeat}});
        });
      });
      state.tasks.items.forEach(function(t){
        const m = t.master; if(!m || m.kind!=='lcrep' || t.status==='done') return;
        // a week's report moves onto Today when it's due soon; one that's a week past due goes on the record as missed
        if(t.status==='backlog' && t.deadline && addDays(today, 2) >= t.deadline){ t.status = 'today'; changed = true; }
        if(t.deadline && addDays(t.deadline, 7) < today){ t.status = 'done'; t.completedAt = t.deadline; t.missed = true; changed = true; }
      });
      Object.keys(made).forEach(function(k){ if(k.indexOf('lcrep:')===0 && !live[k] && k.slice(-10) < addDays(today, -120)) delete made[k]; });
      if(changed){ persist('tasks'); persist('focus'); setTimeout(function(){ try{ renderView(); }catch(e){} }, 0); }
    } finally { mt38Busy = false; }
    return r;
  };
})(masterTasksSync);
// done: a touch on each lead
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='reachLeads' && t.status!=='done'){
      const left = r53LeadsDue();
      left.forEach(function(d){ try{ logTouch('lead', d.x.id); }catch(e){} });
      t.status = 'done'; t.completedAt = todayStr(); persist('business'); persist('tasks'); playTaskComplete(); renderView();
      if(left.length) showToast('Reached out to '+left.map(function(d){ return crmName('lead', d.x); }).join(', ')+': a touch logged for each.', {icon:'&#128075;'});
      return;
    }
    return base.apply(this, arguments);
  };
})(completeTask);
// the cards: who they are
taskCard = (function(base){
  return function(t){
    let h = base.apply(this, arguments);
    if(!t || !t.master) return h;
    if(t.master.kind==='reachLeads'){
      const names = arr(t.leads).map(function(id){ const x = crmFind('lead', id); return x ? crmName('lead', x) : null; }).filter(Boolean);
      h = h.replace(/<span class="mt-badge"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-badge is-reach">&#127919; Leads</span>');
      return h.replace(/(<div class="task-card-title">[\s\S]*?<\/div>)/, '$1<div class="mt-reach"><span class="mt-reach-k">'+escapeHtml(names.slice(0, 3).join(', ')+(names.length > 3 ? ' +'+(names.length - 3) : ''))+'</span><button class="mt-log" data-action="openLogCenter">Log center &rarr;</button></div>');
    }
    if(t.master.kind==='lcrep'){
      h = h.replace(/<span class="mt-badge"[^>]*>[\s\S]*?<\/span>/, '<span class="mt-badge is-dv">&#8635; '+(t.master.every==='month' ? 'Monthly' : 'Weekly')+'</span>');
    }
    return h;
  };
})(taskCard);
// the cycle editor: each item can repeat
renderLifecycleEditor = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('select[data-cy-item-type]').forEach(function(sel){
      const p = sel.getAttribute('data-cy-item-type').split(':'), cy = cycleById(p[0]), st = cy && cy.steps.find(function(s){ return s.id===p[1]; }), it = st && st.checklist.find(function(x){ return x.id===p[2]; });
      if(!it) return;
      const r = document.createElement('select'); r.className = 'input input-sm r53-rep'; r.setAttribute('data-cy-item-repeat', p.join(':')); r.title = 'Does it repeat?';
      r.innerHTML = [['', 'Once'], ['week', 'Every week'], ['month', 'Every month']].map(function(o){ return '<option value="'+o[0]+'"'+((it.repeat || '')===o[0] ? ' selected' : '')+'>'+o[1]+'</option>'; }).join('');
      sel.parentNode.insertBefore(r, sel.nextSibling);
    });
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(renderLifecycleEditor);
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute || !t.getAttribute('data-cy-item-repeat')) return;
  const p = t.getAttribute('data-cy-item-repeat').split(':'), cy = cycleById(p[0]), st = cy && cy.steps.find(function(s){ return s.id===p[1]; }), it = st && st.checklist.find(function(x){ return x.id===p[2]; });
  if(!it) return;
  it.repeat = t.value || ''; if(!it.repeat) delete it.repeat;
  persist('business'); masterTasksSync(); showToast(it.repeat ? '“'+escapeHtml(it.text)+'” is a task every '+(it.repeat==='week' ? 'week' : 'month')+' for clients on this step.' : '“'+escapeHtml(it.text)+'” is a one-time item again.', {icon:'&#8635;'});
});

// ---- 3. Get ahead on deliverables ----
// The weeks still to come have their counter and Week done too: do next week's reels this week and they count
// for next week. (They stay marked Upcoming.)
r51WeekRow = function(t, x){
  const today = todayStr(), future = x.wkStart > today, past = x.wkEnd < today, done = x.need > 0 && x.done >= x.need;
  const st = !x.need ? 'is-skip' : done ? 'is-done' : future ? 'is-future' : past ? 'is-missed' : 'is-now';
  const label = !future && !past ? 'This week' : 'Week '+x.k;
  const when = fmtDateShort(x.wkStart)+' – '+fmtDateShort(x.wkEnd);
  const sub = !x.need ? 'Nothing due' : done ? (future ? 'Done early' : 'Done') : future ? 'Starts '+fmtDateShort(x.wkStart) : past ? 'Missed · '+(x.need - x.done)+' short' : (x.need - x.done)+' to go · due '+fmtDateShort(x.wkEnd);
  return '<div class="cbl-w r42-cbl r51-wk '+st+(future && x.done ? ' is-ahead' : '')+'" data-id="'+t.id+'">'+
    '<div class="r51-wl"><b>'+label+(future ? '<span class="r51-up">Upcoming</span>' : '')+'</b><small>'+(label==='This week' ? 'Week '+x.k+' · ' : '')+when+'</small></div>'+
    '<div class="r51-wc">'+(x.need ? r42CounterHtml(t) : '')+'</div>'+
    '<div class="r51-wb"><span class="r51-sub">'+sub+'</span>'+
      (x.need && !done ? '<button class="cbl-done" data-action="dvwDone" data-id="'+t.id+'">'+(future ? 'Done early' : 'Week done')+'</button>'+
        (!future && t.status!=='done' ? '<button class="cbl-today'+(t.status==='today' ? ' is-on' : '')+'" data-action="dvwToday" data-id="'+t.id+'">'+(t.status==='today' ? 'On today' : '&rarr; Today')+'</button>' : '') : '')+
    '</div></div>';
};

// ---- 4. Business → Overview ----
// Four numbers across the top (what comes in each month, what's in the pipeline, what was collected this month
// with the last six months, and your clients), then your clients and your pipeline side by side. No outreach
// graph (who's due a touch is in Reach out and the Log center).
renderBusinessOverview = function(){
  const active = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  const mrr = active.reduce(function(a, c){ return a + Number(c.mrr || 0); }, 0), goal = Number(state.profile.revenueGoalMonthly) || 0;
  const open = arr(state.business.pipeline).filter(leadIsOpen), pipe = open.reduce(function(a, p){ return a + Number(p.value || 0); }, 0);
  const now = new Date(), months = [];
  for(let k = 5; k >= 0; k--){ const d = new Date(now.getFullYear(), now.getMonth() - k, 1), key = d.getFullYear()+'-'+pad2(d.getMonth() + 1); months.push({label:d.toLocaleDateString(undefined, {month:'short'}), v:collectedByMonth(key)}); }
  const maxV = Math.max.apply(null, months.map(function(m){ return m.v; }).concat([1])), thisMonth = months[5].v;
  const health = {green:0, yellow:0, red:0}; active.forEach(function(c){ const l = clientHealthStatus(c).level; if(health[l]!=null) health[l]++; });
  const tile = function(k, v, sub, extra, cls){ return '<div class="r53-kpi '+(cls || '')+'"><small>'+k+'</small><b>'+v+'</b>'+(extra || '')+(sub ? '<span>'+sub+'</span>' : '')+'</div>'; };
  const kpis = '<div class="r53-kpis">'+
    tile('Monthly recurring', money(mrr), goal ? Math.round(mrr/goal*100)+'% of '+money(goal) : active.length+' clients', goal ? '<i class="r53-bar"><u style="width:'+Math.min(100, mrr/goal*100).toFixed(1)+'%"></u></i>' : '', 'is-mrr')+
    tile('Pipeline', money(pipe), open.length+' open lead'+(open.length===1 ? '' : 's'), goal ? '<i class="r53-bar is-pipe"><u style="width:'+Math.min(100, pipe/goal*100).toFixed(1)+'%"></u></i>' : '', 'is-pipe')+
    tile('Collected this month', money(thisMonth), '', '<div class="r53-mb">'+months.map(function(m, i){ return '<i class="'+(i===5 ? 'is-now' : '')+'" style="height:'+Math.max(m.v ? 8 : 3, m.v/maxV*100).toFixed(0)+'%" title="'+m.label+': '+money(m.v)+'"></i>'; }).join('')+'</div>', 'is-cash')+
    tile('Clients', String(active.length), '<em class="is-g">'+health.green+' on track</em><em class="is-y">'+health.yellow+' watch</em><em class="is-r">'+health.red+' behind</em>', '', 'is-cl')+
  '</div>';
  const clients = active.slice().sort(clientSortFn('health'));
  const crow = function(c){
    const hs = clientHealthStatus(c), ds = arr(c.deliverables).filter(function(d){ return d.recurring; });
    const need = ds.reduce(function(a, d){ return a + deliverableWeekNeed(d); }, 0), done = ds.reduce(function(a, d){ return a + Math.min(deliverableWeekNeed(d), deliverableWeekCount(d)); }, 0);
    return '<div class="r53-cr" data-action="openContact" data-kind="client" data-id="'+c.id+'" style="--cc:'+clientAccent(c)+'"><i class="r53-dot"></i>'+
      '<span class="r53-cn"><b>'+escapeHtml(crmName('client', c))+'</b><small>'+(typeof clientNextTouchHtml==='function' ? clientNextTouchHtml(c) : '')+'</small></span>'+
      (need ? '<span class="r53-cw" title="This week’s deliverables"><i><u style="width:'+Math.round(done/need*100)+'%"></u></i><small>'+done+'/'+need+'</small></span>' : '<span class="r53-cw"></span>')+
      '<span class="r53-hs is-'+hs.level+'">'+escapeHtml(clientHealthLabel(hs))+'</span><span class="r53-cv">'+(Number(c.mrr) ? money(c.mrr) : '')+'</span></div>';
  };
  const stages = crmStages('lead').filter(function(s){ return s.kind!=='won' && s.kind!=='lost'; });
  const rows = stages.map(function(s){ const its = open.filter(function(p){ return p.stage===s.id; }); return {s:s, n:its.length, v:its.reduce(function(a, p){ return a + Number(p.value || 0); }, 0)}; });
  const maxN = Math.max.apply(null, rows.map(function(r){ return r.v || r.n; }).concat([1]));
  const leads = open.slice().sort(function(a, b){ return Number(b.value || 0) - Number(a.value || 0); }).slice(0, 5);
  const pipeHtml = '<div class="r53-stages">'+rows.map(function(r){ return '<div class="r53-st" data-action="crmJumpStage" data-id="'+r.s.id+'"><span><i style="background:'+r.s.color+'"></i>'+escapeHtml(r.s.label)+'</span><span class="r53-sb"><u style="width:'+((r.v || r.n)/maxN*100).toFixed(0)+'%;background:'+r.s.color+'"></u></span><span class="r53-sn">'+r.n+'</span><span class="r53-sv">'+(r.v ? money(r.v) : '–')+'</span></div>'; }).join('')+'</div>'+
    (leads.length ? '<div class="r53-leads">'+leads.map(function(p){ const st = crmStage('lead', p.stage); return '<div class="r53-ld" data-action="openContact" data-kind="lead" data-id="'+p.id+'"><b>'+escapeHtml(crmName('lead', p))+'</b><span class="r53-lst" style="--c:'+(st ? st.color : '#888')+'">'+escapeHtml(st ? st.label : '')+'</span><span class="r53-sv">'+(Number(p.value) ? money(p.value) : '–')+'</span></div>'; }).join('')+'</div>' : '<div class="r53-empty">No open leads.</div>');
  return '<div class="hq r53-hq">'+kpis+(typeof opReadBiz==='function' ? opReadBiz() : '')+
    '<div class="r53-cols">'+
      '<section class="r53-col"><div class="r53-ch" data-action="businessTab" data-tab="clients"><b>Clients</b><span>'+active.length+'</span><em>All &rarr;</em></div>'+(clients.length ? clients.slice(0, 8).map(crow).join('') : '<div class="r53-empty">No active clients yet.</div>')+'</section>'+
      '<section class="r53-col"><div class="r53-ch" data-action="businessTab" data-tab="leads"><b>Pipeline</b><span>'+money(pipe)+'</span><em>Leads &rarr;</em></div>'+pipeHtml+'</section>'+
    '</div></div>';
};

// ---- 5. Ads: no totals strip on top; everything you've ever spent is kept ----
// The overview opens straight on your clients. Every campaign's all-time numbers are fetched (and kept, so a
// campaign you delete in Meta still counts): each client card says what they've spent and got, all time, and
// the bottom line adds it all up. "All time" is a range too.
function r53AdLedger(){ const c = igCfg(); if(!c.adLedger || typeof c.adLedger!=='object') c.adLedger = {}; return c.adLedger; }
function r53Num(v){ v = Number(v); return isFinite(v) ? v : 0; }
async function r53AdsAllLoad(force){
  const c = igCfg(), st = znAdsSt(); if(st.allLoading || !znAccs().length) return;
  if(!force && c.adLedgerAt && Date.now() - c.adLedgerAt < 6*3600000) return;
  st.allLoading = true;
  try{
    const accs = await znApi('/v1/accounts?category=ads'), conns = arr(accs.accounts).filter(function(x){ return /meta|facebook|instagram/i.test(String(x.platform || '')); });
    const list = conns.length ? conns : arr(accs.accounts), L = r53AdLedger(), to = todayStr();
    for(const conn of list){
      let r = null; try{ r = await znApi('/v1/ads/campaigns?accountId='+encodeURIComponent(conn._id)+'&fromDate=2015-01-01&toDate='+to+'&limit=100&source=all'); }catch(e){ continue; }
      arr(r && r.campaigns).forEach(function(k){
        const id = k.platformCampaignId || k.id; if(!id) return; const x = adNums(k.metrics || {}), o = L[id] || {};
        L[id] = {name:k.campaignName || k.name || o.name || 'Campaign', currency:k.currency || o.currency, acct:String(k.adAccountId || k.platformAdAccountId || k.accountId || (k.adAccount && k.adAccount.id) || o.acct || conn._id), spend:Math.max(r53Num(o.spend), r53Num(x.spend)), leads:Math.max(r53Num(o.leads), r53Num(x.leads)), results:Math.max(r53Num(o.results), r53Num(x.results)), imp:Math.max(r53Num(o.imp), r53Num(x.imp)), clicks:Math.max(r53Num(o.clicks), r53Num(x.clicks)), seen:o.seen || to};
      });
    }
    c.adLedgerAt = Date.now(); persist('settings');
  }catch(e){} finally { st.allLoading = false; if(ui.view==='convos') renderView(); }
}
// (the numbers you've seen in any range count too: a ledger never goes down)
function r53LedgerFromCache(){
  const c = igCfg(), cache = c.znAdsCache; if(!cache || cache.v!==2) return;
  const L = r53AdLedger(); let ch = false;
  arr(cache.camps).forEach(function(k){ const x = adNums(k.m || {}), o = L[k.id] || {name:k.name, currency:k.currency, acct:k.acct, spend:0, leads:0, results:0, imp:0, clicks:0, seen:todayStr()};
    ['spend', 'leads', 'results', 'imp', 'clicks'].forEach(function(f){ if(r53Num(x[f]) > r53Num(o[f])){ o[f] = r53Num(x[f]); ch = true; } }); if(!L[k.id]){ L[k.id] = o; ch = true; } });
  if(ch) persist('settings');
}
function r53AllFor(clientId){
  const L = r53AdLedger(), T = {spend:0, leads:0, n:0, currency:null};
  Object.keys(L).forEach(function(id){ const cl = adClientOf({id:id, acct:L[id].acct}) || 'none'; if(clientId!=='*' && cl!==clientId) return; T.spend += r53Num(L[id].spend); T.leads += r53Num(L[id].leads); T.n++; T.currency = T.currency || L[id].currency; });
  return T;
}
sxAdsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r49-acg') < 0 && h.indexOf('r49-adt') < 0) return h;
    r53LedgerFromCache(); r53AdsAllLoad(false);
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const cur = (igCfg().znAdsCache && igCfg().znAdsCache.camps[0] && igCfg().znAdsCache.camps[0].currency) || 'USD';
    // the overview: no collective strip; each client card gets its all-time line; the total sits at the bottom
    const grid = tpl.content.querySelector('.r49-acg');
    if(grid){
      Array.from(tpl.content.children).forEach(function(x){ if(x.classList.contains('sx-sum')) x.remove(); });
      grid.querySelectorAll('.r49-ac .r49-acb').forEach(function(b){
        const id = b.getAttribute('data-id') || 'none', T = r53AllFor(id); if(!T.n) return;
        b.insertAdjacentHTML('beforeend', '<div class="r53-all"><span>All time</span><b>'+adsMoney(T.spend, T.currency || cur)+'</b><em>'+(T.leads ? sxNum(T.leads)+' leads · '+adsMoney(T.spend/T.leads, T.currency || cur)+' each' : 'no leads yet')+'</em></div>');
      });
      const A = r53AllFor('*');
      if(A.n) grid.insertAdjacentHTML('afterend', '<div class="r53-alltot"><span>All your ads, all time</span><b>'+adsMoney(A.spend, A.currency || cur)+'</b><em>'+sxNum(A.leads)+' leads'+(A.leads ? ' · '+adsMoney(A.spend/A.leads, A.currency || cur)+' each' : '')+' · '+A.n+' campaign'+(A.n===1 ? '' : 's')+'</em></div>');
    }
    // one client: its all-time line under the range's numbers
    const head = tpl.content.querySelector('.r49-adt');
    if(head && ui.adClient){
      const T = r53AllFor(ui.adClient); if(T.n) head.insertAdjacentHTML('beforeend', '<span class="r53-allh">All time '+adsMoney(T.spend, T.currency || cur)+(T.leads ? ' · '+sxNum(T.leads)+' leads' : '')+'</span>');
    }
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(sxAdsHtml);

// ---- 6. Pop-ups move: drag one by its top edge ----
(function(){
  let drag = null;
  const skip = 'button, input, select, textarea, a, label, [data-action], [contenteditable="true"], .r42-seg';
  document.addEventListener('pointerdown', function(e){
    if(e.button!==0) return;
    const ov = e.target.closest && e.target.closest('.overlay:not(.hidden)'); if(!ov || e.target===ov) return;
    const card = ov.firstElementChild; if(!card || !card.contains(e.target) || e.target.closest(skip)) return;
    const r = card.getBoundingClientRect(); if(e.clientY - r.top > 44) return;   // the top edge is the handle
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(card.style.transform || ''), x0 = m ? Number(m[1]) : 0, y0 = m ? Number(m[2]) : 0;
    drag = {card:card, sx:e.clientX, sy:e.clientY, x0:x0, y0:y0, moved:false};
    card.classList.add('r53-dragging');
  }, true);
  document.addEventListener('pointermove', function(e){
    if(!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if(!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true; e.preventDefault();
    drag.card.style.transform = 'translate('+(drag.x0 + dx)+'px, '+(drag.y0 + dy)+'px)';
  }, true);
  document.addEventListener('pointerup', function(){ if(drag){ drag.card.classList.remove('r53-dragging'); drag = null; } }, true);
  // (closed and opened again, it's back in the middle)
  new MutationObserver(function(ms){ ms.forEach(function(m){ const o = m.target; if(o.classList && o.classList.contains('overlay') && o.classList.contains('hidden') && o.firstElementChild && o.firstElementChild.style.transform) o.firstElementChild.style.transform = ''; }); })
    .observe(document.body, {subtree:true, attributes:true, attributeFilter:['class']});
})();

// ---- 7. Talking to Op: the key and the button work every time ----
// What went wrong: the first press after he'd hung up spent a second or two connecting (updating his voice and
// brief, getting a link) and everything you said in that time was thrown away; a second press in that window
// started a second connection; a tap on the button in push-to-talk mode connected him but never sent your
// voice; a tap while he was live did nothing. Now:
//  • the mic opens the moment you press, and what you say while he connects is sent as soon as he's there;
//  • one connection at a time, whatever you press;
//  • hold the key (or his light) to talk, let go to send;
//  • tap the button (or his light): he listens, hands-free. Tap while he talks: he stops. Tap again: he hangs up.
OPRT.pre = [];
OPRT.mic = function(){
  if(!OPRT.stream || OPRT.proc) return;
  const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = new Ctx(); OPRT.ctxIn = ctx;
  const src = ctx.createMediaStreamSource(OPRT.stream), proc = ctx.createScriptProcessor(4096, 1, 1);
  OPRT.src = src; OPRT.proc = proc; src.connect(proc); proc.connect(ctx.destination);
  const cap = Math.ceil(ctx.sampleRate*20/4096);   // (up to 20 seconds while he connects)
  proc.onaudioprocess = function(ev){
    const out = ev.outputBuffer.getChannelData(0); out.fill(0);
    const sending = !OPRT.ptt || OPX.ptt;
    if(OPRT.state==='connecting'){ if(sending && OPRT.pre.length < cap) OPRT.pre.push(new Float32Array(ev.inputBuffer.getChannelData(0))); return; }
    if(OPRT.state!=='live') return;
    if(OPRT.pre.length){ const p = OPRT.pre; OPRT.pre = []; p.forEach(function(f){ OPRT.send({user_audio_chunk:opPcmB64(opResample(f, ctx.sampleRate, OPRT.inRate))}); }); }
    if(!sending && OPRT.flush <= 0) return;
    const inp = sending ? ev.inputBuffer.getChannelData(0) : new Float32Array(4096);
    if(!sending) OPRT.flush--;
    OPRT.send({user_audio_chunk:opPcmB64(opResample(inp, ctx.sampleRate, OPRT.inRate))});
  };
};
OPRT.start = async function(opts){
  opts = opts || {};
  if(OPRT.state!=='off' || OPRT.ws) return true;
  OPRT.state = 'connecting'; OPRT.ptt = opts.ptt!=null ? !!opts.ptt : opTalkMode()==='ptt'; OPRT.err = ''; OPRT.lastAct = Date.now(); OPRT.pre = []; OPRT.drop = false;
  const me = OPRT.gen = (OPRT.gen || 0) + 1, gone = function(){ return OPRT.gen!==me || OPRT.state!=='connecting'; };
  try{ opStop(); }catch(e){} if(typeof heyStop==='function') heyStop();
  OV.cap = 'opBubText'; opBubShow(); opCaption('…'); OPRT.ui();
  // the mic first, so nothing you say is lost
  try{ OPRT.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1}}); }
  catch(e){ if(OPRT.gen===me){ OPRT.state = 'off'; OPRT.ui(); opCaption('I need the microphone. Allow it for Operator (or type instead).'); } return true; }
  if(gone()){ try{ OPRT.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} if(OPRT.gen===me) OPRT.stream = null; return true; }
  OPRT.mic();
  try{ await Promise.race([opLiveSync(), new Promise(function(r){ setTimeout(r, 4000); })]); }catch(e){}
  if(gone()) return true;
  const u = await opLiveUrl();
  if(gone()) return true;
  if(!u.url){ OPRT.cleanup(); OPRT.state = 'off'; OPRT.pre = []; OPRT.ui(); OPRT.err = String(u.err); showToast('Live mode couldn’t start: '+OPRT.err+'. Using the normal voice.', {icon:'&#9888;', duration:9000}); return false; }
  let ws; try{ ws = new WebSocket(u.url); }catch(e){ OPRT.cleanup(); OPRT.state = 'off'; OPRT.ui(); return false; }
  OPRT.ws = ws;
  ws.onopen = function(){ if(OPRT.ws===ws) OPRT.send(opLiveInit()); };
  ws.onmessage = function(ev){ if(OPRT.ws!==ws) return; let m = null; try{ m = JSON.parse(ev.data); }catch(e){ return; } try{ OPRT.onMsg(m); }catch(e){} };
  ws.onclose = function(ev){
    if(OPRT.ws!==ws) return;
    const why = String(ev && ev.reason || '');
    if(OPRT.state==='connecting' && /override/i.test(why) && !OPRT.noOverride){ OPRT.noOverride = true; const keep = OPRT.pre; OPRT.ws = null; OPRT.cleanup(); OPRT.state = 'off'; OPRT.start(opts).then(function(){ OPRT.pre = keep.concat(OPRT.pre); }); return; }
    if(OPRT.state==='connecting') showToast('Live mode closed: '+(why || 'no reason given')+'.', {icon:'&#9888;', duration:8000});
    OPRT.stop('closed');
  };
  ws.onerror = function(){};
  return true;
};
OPRT.stop = (function(base){ return function(){ OPRT.gen = (OPRT.gen || 0) + 1; OPRT.pre = []; OPRT.drop = false; if(OPRT.state==='connecting' && !OPRT.ws){ OPRT.state = 'off'; OPRT.cleanup(); OPRT.hush(); AI.listening = false; OPRT.ui(); if(typeof opBubHideLater==='function') opBubHideLater(); return; } return base.apply(this, arguments); }; })(OPRT.stop);
// (you stopped him mid-sentence: the rest of that answer doesn't play)
OPRT.onMsg = (function(base){
  return function(m){
    const t = m && m.type;
    if(t==='user_transcript' || t==='interruption') OPRT.drop = false;
    if(t==='audio' && OPRT.drop) return;
    if(t==='agent_response' && OPRT.drop) return;
    return base.apply(this, arguments);
  };
})(OPRT.onMsg);
function r53LiveTap(){
  if(OPRT.state==='connecting'){ OPRT.stop('tap'); return true; }
  if(OPRT.state==='live'){
    if(OV.speaking){ OPRT.drop = true; OPRT.hush(); OPRT.lastAct = Date.now(); opCaption(OPRT.ptt ? 'Hold '+(OP_PTT_KEYS[opPttKey()] || 'the key')+' to talk.' : 'Listening…'); return true; }
    OPRT.stop('tap'); return true;
  }
  if(opLiveOn()){ OPX.userAt = Date.now(); OV.cap = 'opBubText'; opBubShow(); OPRT.start({ptt:false}).then(function(ok){ if(!ok){ try{ aiListen('opBubText'); }catch(e){} } }); return true; }
  return false;
}
ACTIONS.opLightTap = (function(base){
  return function(){
    if(!opOn() || opBusyNow()) return base.apply(this, arguments);
    if(OPX.pttUsed && Date.now() - OPX.pttUsed < 400) return;   // (that was a hold)
    if(r53LiveTap()) return;
    return base.apply(this, arguments);
  };
})(ACTIONS.opLightTap);
ACTIONS.opTalk = (function(base){ return function(){ if(opOn() && r53LiveTap()) return; return base.apply(this, arguments); }; })(ACTIONS.opTalk);
// push to talk: a press while he's connecting doesn't start a second one
opPttDown = function(){
  if(!opOn() || OPX.ptt) return;
  OPX.ptt = true; OPX.pttFrom = Date.now(); OPX.userAt = Date.now(); opLightMark();
  if(opLiveOn()){
    if(OPRT.state==='off'){ OPRT.start({ptt:true}).then(function(ok){ if(!ok && OPX.ptt){ OV.cap = 'opBubText'; opBubShow(); opPttClassic(); } }); }
    else { if(OV.speaking) OPRT.drop = true; OPRT.pttSet(true); }
    return;
  }
  OV.cap = 'opBubText'; opBubShow(); opPttClassic();
};
// one thing said once: no "I'll lock you in" and then "Locked in" too
opLiveRules = (function(base){ return function(){ return base.apply(this, arguments)+'\n- When you use a tool, don’t say what you’re about to do. Do it, then say one short line (or nothing if the tool’s result says it).'; }; })(opLiveRules);
opLivePrompt = (function(base){ return function(){ return base.apply(this, arguments)+'\n- When you use a tool, don’t announce it first. Do it, then one short line.'; }; })(opLivePrompt);

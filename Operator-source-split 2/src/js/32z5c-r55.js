// ============ ROUND 55 ============
// ---- 1. Rank up: every rank says something of its own ----
// What the rank means, what it took (your numbers, how long since the last one), what's ahead, and a line
// worth keeping. Each rank's words only show up when you earn it.
const R55_RANK = [
  null,
  {say:'You stopped waiting to feel ready. This is the rank where showing up stops being an event and starts being who you are. Most people never get here, because most people quit in the first month.',
    q:'Success is the sum of small efforts, repeated day in and day out.', by:'Robert Collier'},
  {say:'You’re not trying things anymore; you’re good at one. Clients can feel it in the work. This is where the reps you didn’t post about start paying rent.',
    q:'I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.', by:'Bruce Lee'},
  {say:'Deals close because you ask, follow up and don’t flinch at the number. Revenue is a decision you keep making. The pipeline answers to you now.',
    q:'Opportunities don’t happen. You create them.', by:'Chris Grosser'},
  {say:'People are counting on you: clients, maybe a team. You set the pace and the standard. The work gets bigger than your own two hands, and that’s the point.',
    q:'A leader is one who knows the way, goes the way, and shows the way.', by:'John C. Maxwell'},
  {say:'You run the field. Systems do what willpower used to. Your week has a shape, your clients have a path, and nothing important depends on you remembering.',
    q:'Discipline equals freedom.', by:'Jocko Willink'},
  {say:'Built to last. You’re making decisions for the business you’ll have in three years, not the week you’re in. The machine runs; you point it.',
    q:'Someone’s sitting in the shade today because someone planted a tree a long time ago.', by:'Warren Buffett'},
  {say:'You own the game you used to play. Money is a tool now, not a scoreboard. The question isn’t whether you can; it’s what’s worth building.',
    q:'Formal education will make you a living; self-education will make you a fortune.', by:'Jim Rohn'},
  {say:'A million a year. Remember the first day you locked in and nobody was watching. This is what every one of those days added up to.',
    q:'The man who moves a mountain begins by carrying away small stones.', by:'Confucius'}
];
rankUpFx = (function(base){
  return function(from, to){
    base.apply(this, arguments);
    const d = document.getElementById('rankFx'); if(!d) return;
    const m = R55_RANK[to], next = RANKS[to + 1], p = state.profile;
    const was = p.rankClaimedAt && p.rankClaimedAt[from], days = was ? Math.max(1, Math.round((Date.now() - Date.parse(was+'T12:00'))/86400000)) : null;
    // the glow sits behind the badge on its own, so nothing clips it
    const bz = d.querySelector('.rfx-badges'); if(bz) bz.insertAdjacentHTML('afterbegin', '<span class="rfx-glow"></span><span class="rfx-wave"></span><span class="rfx-wave is-2"></span>');
    const life = d.querySelector('.rfx-life'), go = d.querySelector('.rfx-go');
    const html = (m ? '<div class="rfx-say">'+escapeHtml(m.say)+'</div>' : '')+
      (days ? '<div class="rfx-days">'+days+' day'+(days===1 ? '' : 's')+' since '+escapeHtml(RANKS[from].name)+'.</div>' : '')+
      (m ? '<figure class="rfx-q"><blockquote>“'+escapeHtml(m.q)+'”</blockquote><figcaption>'+escapeHtml(m.by)+'</figcaption></figure>' : '')+
      (next ? '<div class="rfx-next"><small>Next</small><b>'+escapeHtml(next.name)+'</b><span>Level '+next.level+' · '+money(next.mrr)+' a month · Health '+next.health+'</span></div>' : '<div class="rfx-next is-top"><b>The top.</b><span>There’s no rank above this one.</span></div>');
    if(life) life.insertAdjacentHTML('afterend', html); else if(go) go.insertAdjacentHTML('beforebegin', html);
    // the rays and rings come out of the badge itself, wherever it lands on the screen
    const place = function(){ const b = d.querySelector('.rfx-badges'); if(!b) return; const r = b.getBoundingClientRect(); d.style.setProperty('--rx', (r.left + r.width/2)+'px'); d.style.setProperty('--ry', (r.top + r.height/2)+'px'); };
    place(); requestAnimationFrame(place); setTimeout(place, 400); window.addEventListener('resize', place);
    // (and the listener goes when the moment does)
    const gone = new MutationObserver(function(){ if(!d.isConnected){ window.removeEventListener('resize', place); gone.disconnect(); } }); gone.observe(document.body, {childList:true});
  };
})(rankUpFx);

// ---- 2. The + menu: every choice in one even row (no lonely last tile) ----
// 4 or fewer side by side; 5–6 as two rows of three; 7–8 as two rows of four (a 2×2 on a phone).
addPickHtml = (function(base){
  return function(){
    const n = (ui.fabMenu || []).length || 1, cols = n <= 4 ? n : n <= 6 ? 3 : 4;
    return base.apply(this, arguments).replace(/<div style="--n:\d+" class="r48-apg ap-grid[^"]*"/, '<div style="--c:'+cols+'" class="r55-apg ap-grid"');
  };
})(addPickHtml);

// ---- 3. Your day: two times close together share one label (they never print over each other) ----
cxRibbonHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r52-rib') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.r52-row').forEach(function(row){
      const ls = Array.from(row.querySelectorAll('.r52-l')).map(function(el){ return {el:el, p:parseFloat(el.style.left) || 0}; }).sort(function(a, b){ return a.p - b.p; });
      for(let i = 1; i < ls.length; i++){
        const a = ls[i - 1], b = ls[i];
        if(!a.el.parentNode || b.p - a.p >= 17) continue;
        a.el.insertAdjacentHTML('beforeend', '<em class="r55-sep">·</em>'+b.el.innerHTML);
        a.el.classList.add('r55-pair'); b.el.remove(); ls[i] = a;
        if(a.p > 70){ a.el.classList.add('is-ar'); a.el.classList.remove('is-al'); }
      }
    });
    return tpl.innerHTML;
  };
})(cxRibbonHtml);

// ---- 4. Notifications: opening them clears the count; a new one glows and chimes ----
// The count is what you haven't seen yet. Open the bell and it goes to zero (the list stays until you clear
// it). Something new comes in: the bell glows for a bit and plays a soft chime (not in a focus session).
function r55Seen(){ const f = state.focus; if(!f.notifSeen || typeof f.notifSeen!=='object') f.notifSeen = {}; return f.notifSeen; }
const R55N = {known:null};
notifBadge = function(){
  const el = document.getElementById('notifCount'), bell = document.getElementById('notifBell'); if(!el || !bell) return;
  let list = []; try{ list = notifList(); }catch(e){ return; }
  const seen = r55Seen(), loud = list.filter(function(n){ return n.level!=='info'; });
  if(ui.notifOpen){ let ch = false; list.forEach(function(n){ if(!seen[n.key]){ seen[n.key] = Date.now(); ch = true; } }); if(ch) persist('focus'); }
  const unseen = loud.filter(function(n){ return !seen[n.key]; }).length;
  const txt = unseen ? (unseen > 9 ? '9+' : String(unseen)) : '';
  if(el.textContent!==txt) el.textContent = txt;
  if(el.hidden!==!unseen) el.hidden = !unseen;
  bell.classList.toggle('has-urgent', loud.some(function(n){ return n.level==='danger' && !seen[n.key]; }));
  // something new since the last look: glow + chime
  const keys = list.map(function(n){ return n.key; });
  if(R55N.known){
    const fresh = list.filter(function(n){ return R55N.known.indexOf(n.key) < 0 && !seen[n.key] && n.level!=='info'; });
    if(fresh.length){
      bell.classList.remove('r55-new'); void bell.offsetWidth; bell.classList.add('r55-new');
      clearTimeout(R55N.t); R55N.t = setTimeout(function(){ bell.classList.remove('r55-new'); }, 9000);
      if(!state.focus.activeSession) r55Chime();
    }
  }
  R55N.known = keys;
  // (old "seen" marks for things that are gone are dropped after a week)
  Object.keys(seen).forEach(function(k){ if(keys.indexOf(k) < 0 && Date.now() - seen[k] > 7*86400000) delete seen[k]; });
  if(ui.notifOpen) notifRender(list);
};
function r55Chime(){
  try{
    if(typeof soundOn==='function' && !soundOn()) return;
    const ctx = getAudioCtx(), t0 = ctx.currentTime;
    [[880, 0], [1318.5, 0.11]].forEach(function(n){
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = n[0]; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t0 + n[1]); g.gain.exponentialRampToValueAtTime(0.12, t0 + n[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.6);
      o.start(t0 + n[1]); o.stop(t0 + n[1] + 0.65);
    });
  }catch(e){}
}
ACTIONS.toggleNotifs = (function(base){ return function(){ const r = base.apply(this, arguments); if(ui.notifOpen){ const b = document.getElementById('notifBell'); if(b) b.classList.remove('r55-new'); notifBadge(); } return r; }; })(ACTIONS.toggleNotifs);

// ---- 5. Finances: card payments aren't "Transport" ----
// "CAPITAL ONE MOBILE PMT" was Transport because the gas-station word "mobil" matched inside "mobile". Now money
// you move (card payments, transfers) is recognised first, with more of the ways banks write it (PYMT, PMNT,
// DES:…), and every other kind only matches whole words. Everything already in that you didn't set by hand is
// sorted again once.
const R55_ISSUERS = 'capital one|cap one|capitalone|chase|amex|american express|discover|citi|citibank|barclays?|barclaycard|synchrony|apple card|applecard|goldman|gs bank|wells fargo|bank of america|boa|bofa|us bank|usaa|navy federal|credit one|mission lane|petal|bilt|affirm|klarna|afterpay';
const R55_MOVE = new RegExp('(?:'+R50_MOVE_RE.source+')|(?:\\b(?:'+R55_ISSUERS+')\\b.{0,30}\\b(?:pmt|pymt|pmnt|paymt|payment|autopay|auto pay|epay|e-pay|online|mobile pmt|crcardpmt|card)\\b)|\\b(?:crcardpmt|cc pmt|cc pymt|card pymt|creditcard|credit crd)\\b', 'i');
const R55_EXTRA = {transport:'exxonmobil|parkmobile|spothero|amtrak|jetblue|spirit air|frontier air|citgo|sunoco|valero|marathon petro|speedway|wawa|7-eleven fuel|ev charging|chargepoint|tesla supercharger|ezpass|e-zpass|sunpass|fastrak'};
EXP_CATS.forEach(function(c){
  if(!c.re) return;
  if(c.id==='bills') c.re = new RegExp(c.re.source.replace('|payment to', ''), 'i');
  if(R55_EXTRA[c.id]) c.re = new RegExp(c.re.source+'|'+R55_EXTRA[c.id], 'i');
  if(c.id==='move'){ c.re = R55_MOVE; return; }
  try{ c.re = new RegExp('(?<![a-z0-9])(?:'+c.re.source.replace(/\\b/g, '')+')(?:\'?s)?(?![a-z0-9])', 'i'); }catch(e){}
});
function r55Resort(){
  const f = state.finances; if(!f || f.r55Sorted) return;
  let n = 0;
  finExpenses().forEach(function(e){ if(e.catSet) return; const g = expGuessCat((e.name || '')+' '+(e.desc || '')); if(g!==e.cat){ e.cat = g; n++; } });
  f.r55Sorted = true; persist('finances');
  if(n) console.log('[r55] re-sorted '+n+' transactions');
}
setTimeout(function(){ try{ r55Resort(); }catch(e){} }, 0);

// ---- 6. GoHighLevel is gone ----
// No "Add to GoHighLevel", no GHL panel on contacts and clients, no sync, no stage pushes, no GHL inbox or
// notifications, no GHL settings. (Leads that came from GHL keep "GHL" as where they came from.)
ghlOn = function(){ return false; };
ghlPaneBtnHtml = function(){ return ''; };
if(typeof ghlPushStage==='function') ghlPushStage = function(){};
if(typeof ghlSync==='function') ghlSync = function(){ return Promise.resolve(); };
if(typeof ghlPushRecord==='function') ghlPushRecord = function(){ return Promise.resolve(); };
if(typeof ghlSettingsHtml==='function') ghlSettingsHtml = function(){ return ''; };
if(typeof ghlPaneHtml==='function') ghlPaneHtml = function(){ return ''; };
notifList = (function(base){ return function(){ return base.apply(this, arguments).filter(function(n){ return n.kind!=='ghl'; }); }; })(notifList);
setTimeout(function(){ try{ const g = state.settings && state.settings.ghl; if(g && (g.connected || g.autoSync)){ g.connected = false; g.autoSync = false; g.inbox = []; g.recentLeads = []; persist('settings'); } }catch(e){} }, 0);

// ---- 7. The quote on Overview and Locked in: yours to change ----
// ↻ another one · ✎ write your own (it joins the rotation) · 📌 pin the one you want (it stays until you unpin).
function r55MyQuotes(){ const p = state.profile; if(!Array.isArray(p.myQuotes)) p.myQuotes = []; return p.myQuotes; }
QUOTE_SETS.work = (function(base){ return function(){ return base().concat(r55MyQuotes().map(function(q){ return [q.t, q.by || '']; })); }; })(QUOTE_SETS.work);
quoteFor = (function(base){
  return function(kind){
    const pin = state.profile && state.profile.pinQuote;
    if(kind==='work' && pin && pin.t) return [pin.t, pin.by || ''];
    return base.apply(this, arguments);
  };
})(quoteFor);
quoteHtml = (function(base){
  return function(q, cls, kind){
    let h = base.apply(this, arguments);
    if(kind!=='work') return h;
    const pin = state.profile.pinQuote, on = !!(pin && pin.t===q[0]);
    const tools = '<span class="r55-qt">'+(on ? '' : '<button class="r55-qb" data-action="nextQuote" data-id="work" title="Another one">&#8635;</button>')+
      '<button class="r55-qb" data-action="r55QuoteWrite" title="Write your own">&#9998;</button>'+
      '<button class="r55-qb'+(on ? ' is-on' : '')+'" data-action="r55QuotePin" title="'+(on ? 'Unpin' : 'Pin this one')+'">&#128204;</button></span>';
    // (round 56: the buttons sit on the author's line, after the name, not up against whatever is above the quote)
    h = h.replace(/<button class="qt-next"[^>]*>[\s\S]*?<\/button>/, '');
    h = h.indexOf('</figcaption>') >= 0 ? h.replace('</figcaption>', function(){ return tools+'</figcaption>'; }) : h.replace('</figure>', function(){ return tools+'</figure>'; });
    return h.replace('<figure class="qt ', '<figure class="qt r55-q'+(on ? ' is-pinned' : '')+' ');
  };
})(quoteHtml);
function r55QuoteRefresh(){ document.querySelectorAll('.qt[data-q="work"]').forEach(function(el){ const t = document.createElement('div'); t.innerHTML = quoteHtml(quoteFor('work'), el.dataset.cls || '', 'work'); el.replaceWith(t.firstChild); }); }
ACTIONS.r55QuotePin = function(){
  const p = state.profile, q = quoteFor('work');
  if(p.pinQuote && p.pinQuote.t===q[0]){ p.pinQuote = null; showToast('Unpinned: the quotes turn over again.', {icon:'&#128204;'}); }
  else { p.pinQuote = {t:q[0], by:q[1] || ''}; showToast('Pinned. This one stays.', {icon:'&#128204;'}); }
  persist('profile'); playTick(); r55QuoteRefresh();
};
ACTIONS.r55QuoteWrite = function(){
  uiAsk({title:'Your own quote', text:'Put who said it after a dash if you like: “Stay hungry — Steve Jobs”.', placeholder:'Something you want to see every day', ok:'Add it'}).then(function(v){
    v = String(v || '').trim(); if(!v) return;
    const m = /^(.*?)\s+[—–-]{1,2}\s+([^—–-]{2,60})$/.exec(v), t = (m ? m[1] : v).replace(/^["“]|["”]$/g, '').trim(), by = m ? m[2].trim() : '';
    r55MyQuotes().push({t:t, by:by, at:Date.now()});
    state.profile.pinQuote = {t:t, by:by};
    persist('profile'); playPositive(); r55QuoteRefresh();
    showToast('Added, and pinned for now. Unpin it to let it join the rotation.', {icon:'&#9998;'});
  });
};

// ============ XP: real progress only ============
// ---- 8. Hold to confirm (anything that pays XP for saying you did something) ----
// Setting up the week or the month, checking out of one, the month's habit, your areas' habits, finishing the
// money check-in: you press and hold (just under a second). A tap says "Hold to confirm". Every XP pop-up already
// says what it was for.
const R55_HOLD_ACTS = ['saveIntent', 'saveCheckout', 'r43PlanLock', 'r43HabitToday', 'r43AreaHabit', 'r55MoneyFinish'];
const R55_HOLD_MS = 800;
function r55HoldPrep(root){
  (root || document).querySelectorAll(R55_HOLD_ACTS.map(function(a){ return '[data-action="'+a+'"]'; }).join(',')).forEach(function(el){
    el.setAttribute('data-hold-act', el.getAttribute('data-action')); el.removeAttribute('data-action');
    el.classList.add('r55-hold'); if(!el.title) el.title = 'Press and hold';
    if(!el.querySelector('.r55-hold-f')) el.insertAdjacentHTML('afterbegin', '<i class="r55-hold-f"></i>');
    // (round 56: the button says so, so a tap isn't mistaken for "it doesn't work")
    if(!/hold/i.test(el.textContent)){ const w = Array.from(el.childNodes).find(function(n){ return n.nodeType===3 && n.textContent.trim(); }); if(w) w.textContent = w.textContent.replace(/^\s*(\S)/, function(m, c){ return ' Hold to '+c.toLowerCase(); }); }
  });
}
new MutationObserver(function(ms){
  for(const m of ms){
    if(m.type==='attributes'){ if(R55_HOLD_ACTS.indexOf(m.target.getAttribute('data-action'))>=0){ r55HoldPrep(); return; } continue; }
    for(const n of m.addedNodes){ if(n.nodeType===1){ r55HoldPrep(); return; } }
  }
}).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['data-action']});
(function(){
  let cur = null;
  const stop = function(tap){ if(!cur) return; clearTimeout(cur.t); cur.el.classList.remove('is-holding'); if(tap && Date.now() - cur.at < 300) showToast('Press and hold to confirm.', {icon:'&#9995;', duration:1800}); cur = null; };
  document.addEventListener('pointerdown', function(e){
    const b = e.target.closest && e.target.closest('.r55-hold'); if(!b || b.disabled || e.button > 0) return;
    e.preventDefault(); stop(false);
    cur = {el:b, at:Date.now()}; b.style.setProperty('--hold', R55_HOLD_MS+'ms'); b.classList.add('is-holding');
    cur.t = setTimeout(function(){
      const el = cur && cur.el; if(!el) return; cur = null; el.classList.remove('is-holding');
      const fn = ACTIONS[el.getAttribute('data-hold-act')]; if(fn) fn(el, null, el.dataset.id);
    }, R55_HOLD_MS);
  }, true);
  ['pointerup', 'pointercancel'].forEach(function(k){ document.addEventListener(k, function(){ stop(true); }, true); });
  document.addEventListener('pointerout', function(e){ if(cur && e.target===cur.el && !cur.el.contains(e.relatedTarget)) stop(false); }, true);
})();
// (setting up a week or a month takes at least one goal; checking out takes every goal marked and a word on what went well)
ACTIONS.saveIntent = (function(base){
  return function(el, e, id){
    const kind = id==='week' ? 'week' : 'month', F = INTENT_FIELDS[kind];
    const any = F.goals.some(function(_, i){ const n = document.getElementById('int_goal'+(i ? i+1 : '')); return n && n.value.trim(); });
    if(!any){ showToast('Add at least one goal to check in.', {icon:'&#9998;'}); const i = document.getElementById('int_goal'); if(i) i.focus(); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.saveIntent);
ACTIONS.r43PlanLock = (function(base){
  return function(el, e, kind){
    if(!tierGoals(kind, r43NextKey(kind)).length){ showToast('Add at least one goal first.', {icon:'&#9998;'}); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.r43PlanLock);
ACTIONS.saveCheckout = (function(base){
  return function(el, e, id){
    const p = String(id || '').split(':'), kind = p[0]==='month' ? 'month' : 'week', key = p[1];
    const v = (ui.coPick && ui.coPick.key===kind+key) ? ui.coPick.v : {};
    const open = tierGoals(kind, key).filter(function(g){ return v[g.id]!==1 && v[g.id]!==0; });
    if(open.length){ showToast('Mark every goal hit or missed first ('+open.length+' left).', {icon:'&#9745;'}); return; }
    const well = ((document.getElementById('co_well') || {}).value || '').trim();
    if(!well){ showToast('One line on what went well, then check out.', {icon:'&#9998;'}); const i = document.getElementById('co_well'); if(i) i.focus(); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.saveCheckout);

// ---- 9. The weekly money check-in, for real ----
// Go through the week's spending (fix any category, mark what's money moved, not spent), look at where you stand
// (cash, debt, what's coming in and going out), then hold to finish. The XP comes then, not for a tap.
function r55McWeek(){ return startOfWeekStr(todayStr()); }
function r55McDone(){ const ws = r55McWeek(); return arr(state.finances.checkins).some(function(c){ const d = typeof c==='string' ? c : c.date; return d >= ws; }); }
function r55McTx(){ const from = addDays(todayStr(), -7); return finExpenses().filter(function(e){ return !e.dupOf && e.date >= from; }).sort(function(a, b){ return String(b.date).localeCompare(String(a.date)); }); }
function r55McHtml(){
  const S = ui.r55Mc || (ui.r55Mc = {spend:false, where:false}), tx = r55McTx(), f = r44F(), today = todayStr(), ev = r44Events(today, addDays(today, 13)).filter(function(e){ return !e.done; });
  const accts = r44Accounts(), cash = accts.filter(function(a){ return a.type!=='credit'; }).reduce(function(s, a){ return s + Number(a.balance || 0); }, 0);
  const debt = f.debts.reduce(function(s, d){ return s + Math.max(0, Number(d.balance || 0)); }, 0);
  const inSum = ev.filter(function(e){ return e.kind==='in'; }).reduce(function(s, e){ return s + e.amount; }, 0), outSum = ev.filter(function(e){ return e.kind==='out'; }).reduce(function(s, e){ return s + e.amount; }, 0);
  const spent = tx.filter(function(e){ return e.cat!=='move'; }).reduce(function(s, e){ return s + Number(e.amount || 0); }, 0), other = tx.filter(function(e){ return e.cat==='other'; }).length;
  const cents = function(n){ return '$'+Number(n || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); };
  const opt = function(sel){ return EXP_CATS.map(function(c){ return '<option value="'+c.id+'"'+(c.id===sel ? ' selected' : '')+'>'+escapeHtml(c.label)+'</option>'; }).join(''); };
  const row = function(e){ return '<div class="r55-mc-tx'+(e.cat==='other' ? ' is-q' : '')+'"><span class="r55-mc-n"><b>'+escapeHtml(e.name || 'Expense')+'</b><small>'+fmtDateShort(e.date)+(e.account ? ' · '+escapeHtml(e.account) : '')+'</small></span><span class="r55-mc-a">'+cents(Math.abs(Number(e.amount || 0)))+'</span><select class="input input-sm" data-r55-cat="'+e.id+'">'+opt(e.cat)+'</select></div>'; };
  const step = function(n, k, title, sub, body){ const ok = S[k]; return '<section class="r55-mc-s'+(ok ? ' is-ok' : '')+'"><div class="r55-mc-h"><span class="r55-mc-i">'+(ok ? '&#10003;' : n)+'</span><b>'+title+'</b><em>'+sub+'</em><button class="btn btn-sm '+(ok ? 'btn-ghost' : 'btn-primary')+'" data-action="r55McOk" data-id="'+k+'">'+(ok ? 'Reviewed' : 'Looks right')+'</button></div>'+body+'</section>'; };
  return '<button class="int-x hs-x" data-action="addSheetClose" title="Close">&#10005;</button>'+
    '<div class="as-h"><span class="as-ic">&#128181;</span><div><div class="hs-h">Weekly money check-in</div><div class="hs-s">Week of '+fmtDateShort(r55McWeek())+'</div></div></div>'+
    step(1, 'spend', 'This week’s spending', cents(spent)+' spent'+(other ? ' · '+other+' without a category' : ''),
      '<div class="r55-mc-list">'+(tx.length ? tx.map(row).join('') : '<div class="r44-empty">Nothing came in from your bank this week.</div>')+'</div>')+
    step(2, 'where', 'Where you stand', 'cash, debt, the next 2 weeks',
      '<div class="r55-mc-tiles"><div><small>Cash</small><b>'+(accts.length ? money(cash) : '–')+'</b></div><div><small>Debt</small><b class="is-r">'+money(debt)+'</b></div><div><small>Coming in</small><b class="is-g">+'+money(inSum)+'</b></div><div><small>Going out</small><b>−'+money(outSum)+'</b></div></div>')+
    '<div class="r55-mc-f">'+(function(){ const t = state.tasks.items.find(function(x){ return x.master && x.master.kind==='money' && x.status!=='done'; }); return t ? '<button class="btn btn-ghost btn-sm r55-edt" data-action="r55EditTask" data-id="'+t.id+'">Edit the task</button>' : ''; })()+(S.spend && S.where ? '<button class="btn btn-primary r55-mc-go" data-action="r55MoneyFinish">Hold to finish · +'+XP_BOOK.personal.money+' XP</button>' : '<span class="r55-mc-wait">Review both to finish</span>')+'</div>';
}
function r55McOpen(){ ui.r55Mc = {spend:false, where:false}; addSheetOpen('r55Money', r55McHtml); }
ACTIONS.r43MoneyCheckin = function(){ if(r55McDone()){ showToast('Already checked in on your money this week.', {icon:'&#128181;'}); return; } r55McOpen(); };
ACTIONS.r55McOk = function(el, e, k){ const S = ui.r55Mc || (ui.r55Mc = {}); S[k] = !S[k]; playTick(); addSheetRefresh('r55Money'); };
ACTIONS.r55MoneyFinish = function(){
  if(r55McDone() || !(ui.r55Mc && ui.r55Mc.spend && ui.r55Mc.where)) return;
  const f = state.finances; f.checkins = arr(f.checkins); f.checkins.push({date:todayStr(), at:Date.now(), reviewed:r55McTx().length});
  persist('finances'); xpLast = null; playPositive(); addSheetClose('r55Money'); renderView();
  xpToast(XP_BOOK.personal.money, 'Money check-in: '+r55McTx().length+' transactions reviewed.');
  try{ masterTasksSync(); }catch(e){}
};
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.getAttribute || !t.hasAttribute('data-r55-cat')) return;
  const x = finExpenses().find(function(v){ return v.id===t.getAttribute('data-r55-cat'); }); if(!x) return;
  x.cat = t.value; x.catSet = true; persist('finances'); addSheetRefresh('r55Money');
});
// (the Finances button: no "+75 XP" bait on it)
renderPersonalFinances = (function(base){
  return function(){ return base.apply(this, arguments).replace(/Weekly check-in <b>\+\d+ XP<\/b>/, 'Weekly check-in'); };
})(renderPersonalFinances);
// ---- 10. …and it's a task, once a week ----
// "Weekly money check-in" goes on your list each week until it's done; tapping it opens the check-in.
masterTasksSync = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    if(mt38Busy || !state || !state.tasks || !state.finances) return r;
    const ws = r55McWeek(), done = r55McDone();
    let t = state.tasks.items.find(function(x){ return x.master && x.master.kind==='money' && x.master.week===ws; });
    if(!t && !done){ state.tasks.items.push({id:uid(), title:'Weekly money check-in', client:'personal', clients:['personal'], priority:'med', deadline:addDays(ws, 6), notes:'', status:'today', createdAt:todayStr(), completedAt:null, master:{kind:'money', week:ws}}); persist('tasks'); }
    else if(t && done && t.status!=='done'){ t.status = 'done'; t.completedAt = todayStr(); persist('tasks'); }
    // (last week's, never done: off the list)
    const before = state.tasks.items.length;
    state.tasks.items = state.tasks.items.filter(function(x){ return !(x.master && x.master.kind==='money' && x.master.week < ws && x.status!=='done'); });
    if(state.tasks.items.length!==before) persist('tasks');
    return r;
  };
})(masterTasksSync);
completeTask = (function(base){
  return function(id){
    const t = state.tasks.items.find(function(x){ return x.id===id; });
    if(t && t.master && t.master.kind==='money' && t.status!=='done'){ r55McOpen(); return; }
    return base.apply(this, arguments);
  };
})(completeTask);
// (the task itself can still be edited or deleted: "Edit the task" in the sheet opens the normal editor)
ACTIONS.r55EditTask = function(el, e, id){ ['r55Money', 'r55Report'].forEach(function(k){ try{ addSheetClose(k); }catch(x){} }); ui.r55Raw = true; try{ openTaskEditModal(id); } finally { ui.r55Raw = false; } };
openTaskEditModal = (function(base){ return function(id){ const t = state.tasks.items.find(function(x){ return x.id===id; }); if(!ui.r55Raw && t && t.master && t.master.kind==='money' && t.status!=='done'){ r55McOpen(); return; } return base.apply(this, arguments); }; })(openTaskEditModal);

// ---- 11. Something's up: the sidebar says where ----
// A soft glow on the section that needs you (hover it to see why), gone once it's handled:
//  Personal: the money check-in (from Thursday) or a payment due in the next 2 days;
//  Business: leads to reach out to, clients due a touch, or a late playbook task;
//  Focus: a task that's overdue; Calendar: something starting within 30 minutes.
function r55Signals(){
  const out = {}, today = todayStr(), add = function(v, why){ (out[v] = out[v] || []).push(why); };
  try{ const dow = new Date().getDay(); if(!r55McDone() && (dow===0 || dow >= 4)) add('personal', 'Money check-in for this week'); }catch(e){}
  try{ const soon = r44Events(today, addDays(today, 2)).filter(function(e){ return !e.done && e.kind==='out'; }); if(soon.length) add('personal', soon.length+' payment'+(soon.length===1 ? '' : 's')+' due in the next 2 days'); }catch(e){}
  try{ const n = r54LeadRows().filter(function(x){ return x.due; }).length; if(n) add('business', n+' lead'+(n===1 ? '' : 's')+' to reach out to'); }catch(e){}
  try{ const n = mtActiveClients().filter(function(c){ const d = crmOverdueDays('client', c); return d!=null && d >= 0; }).length; if(n) add('business', n+' client'+(n===1 ? '' : 's')+' due a touch'); }catch(e){}
  try{ const n = state.tasks.items.filter(function(t){ return t.status!=='done' && t.master && t.master.kind==='pb' && t.deadline && t.deadline < today; }).length; if(n) add('business', n+' playbook task'+(n===1 ? '' : 's')+' late'); }catch(e){}
  try{ const n = state.tasks.items.filter(function(t){ return t.status!=='done' && t.deadline && t.deadline < today && !(t.master && t.master.kind==='pb'); }).length; if(n) add('focus', n+' task'+(n===1 ? '' : 's')+' overdue'); }catch(e){}
  try{ const now = Date.now(); const ev = arr(state.calendar.events).find(function(e){ if(e.date!==today || !e.time) return false; const m = (localTs(e.date, e.time) - now)/60000; return m >= -5 && m <= 30; }); if(ev) add('calendar', ev.title+' at '+fmt12Hour(ev.time)); }catch(e){}
  return out;
}
function r55SignalPaint(){
  if(!state || !state.tasks) return;
  const s = r55Signals();
  document.querySelectorAll('.nav-item[data-view]').forEach(function(b){
    const v = b.getAttribute('data-view'), why = s[v];
    b.classList.toggle('r55-sig', !!why);
    if(why){ b.setAttribute('data-r55-why', why.join(' · ')); b.title = why.join('\n'); } else if(b.hasAttribute('data-r55-why')){ b.removeAttribute('data-r55-why'); b.removeAttribute('title'); }
  });
}
afterRenderHooks.push(function(){ clearTimeout(r55SignalPaint._t); r55SignalPaint._t = setTimeout(r55SignalPaint, 300); });
setInterval(function(){ try{ r55SignalPaint(); }catch(e){} }, 30000);

setTimeout(function(){ try{ if(!state.profile.r55Since){ state.profile.r55Since = todayStr(); persist('profile'); } }catch(e){} }, 0);
// ---- 12. A journal entry pays when it's really one ----
// Something you wrote yourself, at least a dozen words. Inspiration you saved, time capsules coming back and app
// updates don't count as journal entries for XP (inspiration pays on its own).
function r55JournalCounts(e){
  // (what you already earned stays earned: this only applies from the day this update came in)
  const since = state.profile && state.profile.r55Since; if(!since || e.date < since) return true;
  if(e.capsuleFrom || e.mood==='inspiration' || /^✨ Inspiration/.test(e.title || '') || (typeof isUpdateEntry==='function' && isUpdateEntry(e))) return false;
  return String(e.text || '').trim().split(/\s+/).filter(Boolean).length >= 12;
}

// ---- 13. Finances, cleaner (same features) ----
// The four numbers get their own colour and a small mark; spending by kind is one bar split by colour with each
// kind's share, and its own colour on every row; transactions are grouped by day with that day's total.
r44SpentHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments); if(!h) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const rows = Array.from(tpl.content.querySelectorAll('.ex-c')), vals = rows.map(function(r){ const b = r.querySelector('b'); return b ? Number(String(b.textContent).replace(/[^0-9.]/g, '')) || 0 : 0; });
    const sum = vals.reduce(function(a, v){ return a + v; }, 0) || 1;
    const ids = rows.map(function(r){ const t = (r.querySelector('span') || {}).textContent || ''; const c = EXP_CATS.find(function(k){ return t.indexOf(k.label) >= 0; }); return c ? c.id : 'other'; });
    rows.forEach(function(r, i){ const col = R44_CAT_COLORS[ids[i]] || '#8A90A2'; r.style.setProperty('--c', col); r.classList.add('r55-exc'); const b = r.querySelector('b'); if(b) b.insertAdjacentHTML('beforebegin', '<em class="r55-pct">'+Math.round(vals[i]/sum*100)+'%</em>'); });
    const cats = tpl.content.querySelector('.ex-cats');
    if(cats && rows.length > 1) cats.insertAdjacentHTML('afterbegin', '<div class="r55-share">'+rows.map(function(r, i){ return '<i style="flex:'+vals[i].toFixed(2)+';background:'+(R44_CAT_COLORS[ids[i]] || '#8A90A2')+'" title="'+escapeHtml(((r.querySelector('span') || {}).textContent || '').trim())+'"></i>'; }).join('')+'</div>');
    return tpl.innerHTML;
  };
})(r44SpentHtml);
r44TxHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const rows = Array.from(tpl.content.querySelectorAll('.r44-tx')); if(!rows.length) return h;
    const today = fmtDateShort(todayStr()), yest = fmtDateShort(addDays(todayStr(), -1));
    let last = null, head = null, tot = 0;
    const close = function(){ if(head){ head.querySelector('em').textContent = (tot >= 0 ? '+' : '−')+'$'+Math.abs(tot).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); } };
    rows.forEach(function(r){
      const f = r.querySelector('.r44-txn .r44-faint'), d = f ? f.textContent.replace(/^·\s*/, '').trim() : '';
      const a = r.querySelector('.r44-a'), v = a ? (a.textContent.indexOf('+')===0 ? 1 : -1)*(Number(a.textContent.replace(/[^0-9.]/g, '')) || 0) : 0;
      if(d!==last){ close(); last = d; tot = 0; head = document.createElement('div'); head.className = 'r55-txd'; head.innerHTML = '<b>'+escapeHtml(d===today ? 'Today' : d===yest ? 'Yesterday' : d)+'</b><em></em>'; r.parentNode.insertBefore(head, r); }
      tot += v; if(f) f.remove(); r.classList.add('r55-tx'); if(a) a.textContent = a.textContent.replace(/^([+−-])\s*[-−]/, '$1');
    });
    close();
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(r44TxHtml);
renderPersonalFinances = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const ic = ['&#127974;', '&#128179;', '&#8600;', '&#8599;'], cls = ['is-cash', 'is-debt', 'is-in', 'is-out'];
    let i = 0;
    return h.replace(/<div class="card r44-tile">/g, function(){ const k = i++; return '<div class="card r44-tile r55-tile '+(cls[k] || '')+'"><span class="r55-ti">'+(ic[k] || '')+'</span>'; });
  };
})(renderPersonalFinances);

// ---- 14. The sweep: what was removed, or isn't connected to anything, comes out ----
//  • Focus → Analytics → "Check-ins with Op" (those check-ins are gone).
//  • The Work alarm's "Op checks in on you" and "How often" (Op's rules don't use them any more).
//  • How XP works: the "Check-ins with Op" card; Standing reads "the commitments you kept and the days you hit".
//  • Social: "No Meta developer app, no GoHighLevel" under Your social numbers.
//  • The GHL quick link, and GHL as a lead source to pick (leads that came from it still say so).
//  • Clients grouped by cycle (cycles are playbooks now); the + on Playbooks makes a playbook.
acctLogHtml = function(){ return ''; };
workSetupHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments), tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.field').forEach(function(f){ const l = f.querySelector('label'); if(l && /^(Op checks in on you|How often)/.test(l.textContent.trim())) f.remove(); });
    return tpl.innerHTML;
  };
})(workSetupHtml);
setTimeout(function(){
  try{
    const qi = QUICK_LINK_DEFS.findIndex(function(q){ return q.key==='ghl'; }); if(qi >= 0) QUICK_LINK_DEFS.splice(qi, 1);
    const used = arr(state.business.pipeline).concat(arr(state.business.clients)).some(function(x){ return x.leadSource==='ghl'; });
    const li = LEAD_SOURCES.findIndex(function(s){ return s.id==='ghl'; }); if(li >= 0 && !used) LEAD_SOURCES.splice(li, 1);
    if(typeof crmUi==='function'){ const u = crmUi('client'); if(u && u.group==='cycle'){ u.group = null; } }
  }catch(e){}
}, 0);
if(typeof cycleGroupBar==='function') cycleGroupBar = function(){ return ''; };
socialConnectHtml = (function(base){ return function(){ return base.apply(this, arguments).replace(/<span>No Meta developer app, no GoHighLevel\.[^<]*<\/span>/, ''); }; })(socialConnectHtml);
fabContext = (function(base){
  return function(){
    if(ui.view==='business' && ui.businessTab==='lifecycle') return {label:'New playbook', run:function(){ const p = pbSel(); ACTIONS.pbNew(null, null, p ? p.kind : 'onboarding'); }};
    return base.apply(this, arguments);
  };
})(fabContext);
// (areas are fixed since round 48 (Work, Health, Personal), so How XP works has no "Change them" button leading nowhere)
// (How XP works, once it's drawn: no "Check-ins with Op" card, no check-ins in Standing, and no "Change them" for areas, which are fixed since round 48)
function r55XpHowClean(){
  const el = document.getElementById('xpHowContent'); if(!el) return;
  el.querySelectorAll('.xpg-card').forEach(function(c){ const h = c.querySelector('h3'); if(h && /Check-ins with Op/.test(h.textContent)) c.remove(); });
  el.querySelectorAll('*').forEach(function(n){ if(n.children.length===0 && /answering his check-ins/.test(n.textContent)) n.textContent = n.textContent.replace(/answering his check-ins, how productive you said you were, /, ''); });
  el.querySelectorAll('[data-action="r43GuideAreas"]').forEach(function(b){ b.remove(); });
  el.querySelectorAll('.r43-g-p').forEach(function(p){ if(/Rename them|add your own/.test(p.textContent)) p.textContent = 'XP comes from three areas: Work, Health and Personal. A day that touches all of them pays more.'; });
}
ACTIONS.openXpHow = (function(base){ return function(){ const r = base.apply(this, arguments); r55XpHowClean(); setTimeout(r55XpHowClean, 0); return r; }; })(ACTIONS.openXpHow);

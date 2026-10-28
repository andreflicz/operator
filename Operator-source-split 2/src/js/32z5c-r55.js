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
  try{ c.re = new RegExp('(?<![a-z0-9])(?:'+c.re.source.replace(/\\b/g, '')+')(?![a-z0-9])', 'i'); }catch(e){}
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
    return h.replace(/<button class="qt-next"[^>]*>[\s\S]*?<\/button>/, tools).replace('<figure class="qt ', '<figure class="qt r55-q'+(on ? ' is-pinned' : '')+' ');
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

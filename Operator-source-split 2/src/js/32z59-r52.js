// ============ ROUND 52 ============
// ---- 1. The Calendar never opens with a check-in on top of it ----
// It used to pop the month / week check-in (or a check-out) over the Calendar the first time you opened it.
// Now the Calendar is just the calendar: what's waiting shows as one line at the top, and you tap it when
// you want it.
(function(){ for(let i = afterRenderHooks.length - 1; i >= 0; i--){ const s = String(afterRenderHooks[i]); if(/openIntentForm\('month', true\)/.test(s) && /ui\.view!=='calendar'/.test(s)) afterRenderHooks.splice(i, 1); } })();
function r52CheckAsk(){
  try{
    const due = checkoutDue()[0];
    if(due) return {t:(due.kind==='month' ? 'Check out of '+monthName(due.key) : 'Check out of last week'), a:'openCheckout', id:due.kind+':'+due.key};
    if(!checkedIn('month', monthKey())) return {t:'Check in for '+monthName(monthKey()), a:'openIntent', id:'month'};
    if(!checkedIn('week', weekKey())) return {t:'Check in for the week', a:'openIntent', id:'week'};
  }catch(e){}
  return null;
}
renderCalendar = (function(base){
  return function(){
    const h = base.apply(this, arguments), q = r52CheckAsk(); if(!q) return h;
    const bar = '<button class="r52-ask" data-action="'+q.a+'" data-id="'+q.id+'"><i></i><span>'+escapeHtml(q.t)+'</span><b>&rarr;</b></button>';
    const i = h.indexOf('</div></div>'); // after the view header
    return h.indexOf('view-header') >= 0 && i >= 0 ? h.slice(0, i + 12)+bar+h.slice(i + 12) : bar+h;
  };
})(renderCalendar);

// ---- 2. Settings: sub-tabs where a page has more than one part, and less of each ----
// Look & Sound is Appearance | Sound, Connections & Data is Integrations | Your data | App updates: one part
// at a time instead of one long page. The locked-in timer picker is gone (tap the timer to change it). Op's
// voice is ElevenLabs, one voice (the same one live mode uses), so no engine to pick.
opEngine = function(){ return 'eleven'; };
renderSettings = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const root = tpl.content, box = root.querySelector('.settings-content');
    if(!box) return h;
    // the timer picker
    root.querySelectorAll('.tm-picks').forEach(function(x){ const k = x.previousElementSibling; if(k && /Locked-in timer/.test(k.textContent)) k.remove(); x.remove(); });
    // the voice engine tabs
    const vs = root.querySelector('#opVoiceSet'); if(vs){ const seg = vs.querySelector(':scope > .seg-tabs'); if(seg && /Mac voice/.test(seg.textContent)) seg.remove(); }
    // sub-tabs
    const parts = Array.from(box.querySelectorAll(':scope > .set-part'));
    if(parts.length > 1){
      if(!ui.r52Sub) ui.r52Sub = {};
      const grp = box.getAttribute('data-key') || 'g', ids = parts.map(function(p){ return p.id.replace('setPart-', ''); });
      const cur = ids.indexOf(ui.r52Sub[grp]) >= 0 ? ui.r52Sub[grp] : ids[0];
      const nav = document.createElement('div'); nav.className = 'seg-tabs r52-sub';
      nav.innerHTML = parts.map(function(p, i){ const hd = p.querySelector('.set-part-h'); return '<button class="seg-tab'+(ids[i]===cur ? ' active' : '')+'" data-action="r52Sub" data-id="'+escapeHtml(grp+'|'+ids[i])+'">'+escapeHtml(hd ? hd.textContent : ids[i])+'</button>'; }).join('');
      box.insertBefore(nav, box.firstChild);
      parts.forEach(function(p, i){ const hd = p.querySelector(':scope > .set-part-h'); if(hd) hd.remove(); if(ids[i]!==cur) p.classList.add('r52-off'); });
    }
    const out = document.createElement('div'); out.appendChild(root.cloneNode(true)); return out.innerHTML;
  };
})(renderSettings);
ACTIONS.r52Sub = function(el, e, id){ const p = String(id).split('|'); if(!ui.r52Sub) ui.r52Sub = {}; ui.r52Sub[p[0]] = p[1]; playTick(); renderView(); };

// ---- 3. Pop-ups: no ✕, tap outside to close ----
// Every sheet and pop-up closes when you tap the dark area around it (or press Esc), so the ✕ buttons are
// gone and the space they held at the top went with them. (Not the alarm, Good morning or anything
// full-screen: a stray tap shouldn't dismiss those.)
const R52_X = '.int-x, .hs-x, .r43-x, .wd-close, .mn-x, .tn-x, .izq-x, .izw-x, .izg-x, .izl-x, .irc-x, .qj3-x, .vp-x, .modal-close, [data-action$="Close"].icon-x';
const R52_KEEP = /wake|alarm|plan|brief|lvl|level|boot|lock|focusDone|stopFocus|celebr|cine|np-/i;
document.addEventListener('pointerdown', function(e){
  const o = e.target; if(!o || !o.classList || !o.classList.contains('overlay') || o.classList.contains('hidden')) return;
  if(R52_KEEP.test(o.id || '') || o.classList.contains('is-cine')) return;
  const x = o.querySelector(R52_X) || o.querySelector('[data-action*="close" i], [data-action*="Close"], [data-action*="cancel" i]');
  if(x){ e.preventDefault(); x.click(); return; }
  hideOverlay(o.id);
}, true);

// ---- 4. Calendar: the week's and the month's numbers sit under Your day ----
// (Deep / Gym / Reels / Goals for this week and for this month, in the day card; the This week / This month
// card is just the goals now, so they get the whole panel.)
function r52TierStats(kind){
  const was = ui.cxTier; ui.cxTier = kind;
  let h = ''; try{ h = r52TierBase(); } finally { ui.cxTier = was; }
  const m = /<div class="r44-tstats">[\s\S]*?<\/div><\/div>(?=<div class="cx-tierbody")/.exec(h);
  return m ? m[0] : '';
}
const r52TierBase = cxTierCardHtml;
cxTierCardHtml = function(){ return r52TierBase.apply(this, arguments).replace(/<div class="r44-tstats">[\s\S]*?<\/div><\/div>(?=<div class="cx-tierbody")/, ''); };
renderCalendar = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('cx-ribbon') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const rib = tpl.content.querySelector('.cx-now .cx-ribbon');
    if(rib){
      const d = document.createElement('div'); d.className = 'r52-nums';
      d.innerHTML = [['week', 'This week'], ['month', 'This month']].map(function(x){ return '<div class="r52-nr is-'+x[0]+'"><span class="r52-nk">'+x[1]+'</span>'+r52TierStats(x[0])+'</div>'; }).join('');
      rib.parentNode.insertBefore(d, rib.nextSibling);
    }
    const out = document.createElement('div'); out.appendChild(tpl.content.cloneNode(true)); return out.innerHTML;
  };
})(renderCalendar);

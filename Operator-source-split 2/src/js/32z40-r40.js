// ============ ROUND 40 ============

// ---- Personal → You: the card turns over cleanly ----
// The 3D flip blanked out halfway and the back spilled out of the card. Now it turns edge-on, swaps
// faces, and opens back out: the same box both sides, nothing disappears.
ACTIONS.ycFlip = function(el){
  const c = el && el.closest('.ycf'), inn = c && c.querySelector('.ycf-in');
  ui.ycFlip = !ui.ycFlip; playTick();
  if(!c || !inn){ renderView(); return; }
  if(inn._t) clearTimeout(inn._t);
  inn.classList.remove('is-turn-in'); inn.classList.add('is-turn-out');
  inn._t = setTimeout(function(){
    c.classList.toggle('is-flipped', !!ui.ycFlip);
    inn.classList.remove('is-turn-out'); void inn.offsetWidth; inn.classList.add('is-turn-in');
    inn._t = setTimeout(function(){ inn.classList.remove('is-turn-in'); }, 220);
  }, 170);
};
// ---- Discipline: the trend arrow sat in the label and wrapped onto its own line ("▲" between
// Consistency and Action). The number carries it now: green when it's climbing, red when it's slipping ----
renderYouTab = (function(base){
  return function(){
    return base.apply(this, arguments).replace(/ <em class="you-tr (is-up|is-down)" title="([^"]*)">[^<]*<\/em>(<\/span><i>[\s\S]*?<\/i>)<b>/g, function(m0, cls, t, mid){
      return mid+'<b class="you-v-'+(cls==='is-up' ? 'up' : 'down')+'" title="'+t+'">';
    });
  };
})(renderYouTab);

// ---- client cards: one-off deliverables show (open ones to tick off, the last few done ones faded), and
// no "Next step" row ----
clientDelivRowsHtml = (function(base){
  return function(c){
    const h = base.apply(this, arguments);
    const ones = arr(c.deliverables).filter(function(d){ return !d.recurring; });
    if(!ones.length) return h;
    const open = ones.filter(function(d){ return d.status!=='done'; }).sort(function(a, b){ return (a.dueDate || '9999').localeCompare(b.dueDate || '9999'); });
    const done = ones.filter(function(d){ return d.status==='done'; }).sort(function(a, b){ return (b.completedAt || '').localeCompare(a.completedAt || ''); }).slice(0, 2);
    const row = function(d){
      const late = d.status!=='done' && d.dueDate && d.dueDate < todayStr();
      return '<div class="cc2-deliv cc2-one'+(d.status==='done' ? ' is-done' : '')+(late ? ' is-late' : '')+'" data-key="dv1-'+c.id+'-'+d.id+'">'+
        '<span class="cc2-deliv-title">'+escapeHtml(d.title || 'Deliverable')+'<small class="cc2-deliv-mo">One-off'+(d.dueDate ? ' &middot; '+(late ? 'was due ' : 'due ')+fmtDateShort(d.dueDate) : '')+(d.status==='done' && d.completedAt ? ' &middot; done '+fmtDateShort(d.completedAt) : '')+'</small></span>'+
        '<button class="cc2-one-ck'+(d.status==='done' ? ' is-on' : '')+'" data-action="oneOffToggle" data-client="'+c.id+'" data-id="'+d.id+'" title="'+(d.status==='done' ? 'Done. Tap to undo' : 'Mark it done')+'">'+(d.status==='done' ? '&#10003;' : '')+'</button>'+
      '</div>';
    };
    const rows = open.concat(done).map(row).join('');
    return h ? h.replace(/<\/div>$/, rows+'</div>') : '<div class="cc2-delivs">'+rows+'</div>';
  };
})(clientDelivRowsHtml);
ACTIONS.oneOffToggle = function(el){
  const c = arr(state.business.clients).find(function(x){ return x.id===el.dataset.client; }); if(!c) return;
  const d = arr(c.deliverables).find(function(x){ return x.id===el.dataset.id; }); if(!d) return;
  const t = d.linkedTaskId ? state.tasks.items.find(function(x){ return x.id===d.linkedTaskId; }) : null;
  if(t && t.master && t.master.kind==='dvw'){ if(d.status==='done') dvwUndo(t); else dvwDone(t); return; }
  if(d.status==='done'){ d.status = 'pending'; d.completedAt = null; } else { d.status = 'done'; d.completedAt = todayStr(); playTaskComplete(); }
  persist('business'); if(typeof masterTasksSync==='function') masterTasksSync(); renderView();
};
clientNextHtml = function(){ return ''; };

// ---- the + on Focus → Tasks: no "A client deliverable" (they're made for you from each client) ----
focusAddMenu = (function(base){
  return function(){ return base.apply(this, arguments).filter(function(x){ return !(x && /A client deliverable/.test(x[1])); }); };
})(focusAddMenu);

// ---- work mode and the clock-out pages: a deliverable task says whose and what ("Brothers Mechanical:
// 4 reels, week 1"), not "16 Reels 1/4" ----
function taskNiceTitle(t){
  if(!t || !t.master || t.master.kind!=='dvw' || typeof dvwView!=='function') return t ? t.title : '';
  const v = dvwView(t); if(!v) return t.title;
  return v.x.oneOff ? v.who+': '+v.name : v.who+': '+v.pieces+', week '+v.x.k;
}
function niceTitlePairs(){
  return state.tasks.items.filter(function(t){ return t.master && t.master.kind==='dvw' && t.title; }).map(function(t){ return [t.title, taskNiceTitle(t)]; })
    .filter(function(p){ return p[1] && p[1]!==p[0]; }).sort(function(a, b){ return b[0].length - a[0].length; });
}
function niceTitlesHtml(h){
  if(typeof h!=='string' || !h) return h;
  niceTitlePairs().forEach(function(p){ const a = escapeHtml(p[0]); if(h.indexOf(a) >= 0) h = h.split(a).join(escapeHtml(p[1])); });
  return h;
}
function niceTitlesIn(root){
  if(!root) return;
  const pairs = niceTitlePairs(); if(!pairs.length) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while((n = w.nextNode())){
    let v = n.nodeValue; if(!v || v.length < 3) continue;
    pairs.forEach(function(p){ if(v.indexOf(p[0]) >= 0 && v.indexOf(p[1]) < 0) v = v.split(p[0]).join(p[1]); });
    if(v!==n.nodeValue) n.nodeValue = v;
  }
}
const NICE_SPOTS = '#planOverlay, #lockSeqOverlay, #windOverlay, #recapOverlay, #stopFocusOverlay, #timesUpOverlay, #viewRoot .np, #viewRoot .rest-full';
function niceTitlesSweep(){ document.querySelectorAll(NICE_SPOTS).forEach(function(el){ if(!el.classList.contains('hidden')) niceTitlesIn(el); }); }
['renderPlanRevealInto', 'renderLockSeqInto', 'renderRecapInto', 'renderStopFocusModalInto'].forEach(function(k){
  if(typeof window[k]!=='function') return;
  const base = window[k];
  window[k] = function(){ const r = base.apply(this, arguments); try{ niceTitlesSweep(); }catch(e){} return r; };
});
windHtml = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(windHtml);
renderLockedMinimal = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderLockedMinimal);
renderFocusMinimal = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderFocusMinimal);
renderWeekendOffView = (function(base){ return function(){ return niceTitlesHtml(base.apply(this, arguments)); }; })(renderWeekendOffView);
afterRenderHooks.push(function(){ try{ niceTitlesSweep(); }catch(e){} });
setInterval(function(){ try{ niceTitlesSweep(); }catch(e){} }, 1500);

// ================= Round 81 =================
// Mind view: space all the way around (the stars are a real sky, the camera turns any way, the planets sit high and
// low), easier to click. Calendar: Your day's times never run off the card. Playbooks: Edit and "Change it with Op"
// on every playbook; the new-playbook sheet asks how you want to start first. Money: a transfer between your own
// accounts is never spending twice; accounts are marked Business or Personal, and Spending can show either.

// ================= Mind view: a full 360 =================
// the stars are a sky: they surround you, and you see the ones in front of you wherever you look
r76Star = function(s){
  const cy = Math.cos(MIND.yaw), sy = Math.sin(MIND.yaw), cp = Math.cos(MIND.pitch), sp = Math.sin(MIND.pitch);
  const rx = s.x*cy - s.y*sy, rz = s.x*sy + s.y*cy, gy = -s.z;
  const ry = gy*cp - rz*sp, d = gy*sp + rz*cp;
  const F = R76_F, z = d + F*1.6;
  if(z < 60) return null;
  const sc = F/z;
  return [MIND.W/2 + rx*sc, MIND.H/2 + ry*sc, Math.min(1.6, sc*3)];
};
// more of them, all the way round
(function(){
  const base = r76Scene;
  r76Scene = function(){
    if(MIND.scene && MIND.scene.r81) return MIND.scene;
    MIND.scene = null; const S = base.apply(this, arguments);
    for(let i = 0; i < 520; i++){
      const u = Math.random()*2 - 1, th = Math.random()*Math.PI*2, r = 2200 + Math.random()*2400, q = Math.sqrt(1 - u*u);
      S.stars.push({x:Math.cos(th)*q*r, y:Math.sin(th)*q*r, z:u*r, b:Math.random(), p:Math.random()*6.28, c:Math.random() < 0.1 ? '#FCD9A8' : Math.random() < 0.2 ? '#A5C8FF' : '#E6ECFF'});
    }
    S.r81 = true; return S;
  };
})();
// the planets spread up and down as well as around (it's a space, not a table)
const r81Z = r76Z;
r76Z = function(n){
  const z = r81Z.apply(this, arguments);
  if(n.kind==='sector') return (n.z3 = Math.sin(n.a*2 + 0.6)*230 + Math.cos(n.a*3.3)*110);
  return z;
};
// click hits are bigger, and the name under a planet counts too; the nearest thing wins
r73Pick = function(sx, sy){
  let best = null, bs = -1;
  MIND.nodes.forEach(function(n){
    if(!n.sp || n.sp[2] <= 0) return;
    const r = Math.min(n.kind==='op' ? 70 : 90, Math.max(14, n.r*MIND.cam.k*(n.sp[2] || 1)) + 8), dx = n.sp[0] - sx, dy = n.sp[1] - sy, d = Math.sqrt(dx*dx + dy*dy);
    const inBody = d < r, inLabel = n.kind!=='op' && Math.abs(dx) < Math.max(50, r*1.4) && sy > n.sp[1] && sy - n.sp[1] < r + 24;
    if(!inBody && !inLabel) return;
    const score = (inBody ? 1000 - d/r*200 : 500 - d) + (n.kind==='op' ? -150 : 0);
    if(score > bs){ bs = score; best = n; }
  });
  return best;
};
// the sidebar's Map button, when the sidebar is folded
// (styles: .sidebar.collapsed .nav-map)

// ================= Calendar: Your day's times stay on the card =================
cxRibbonHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(h.indexOf('r52-l') < 0) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.r52-l').forEach(function(el){
      const p = parseFloat(el.style.left) || 0;
      if(p < 22){ el.classList.add('is-al'); el.classList.remove('is-ar'); }
      else if(p > 78){ el.classList.add('is-ar'); el.classList.remove('is-al'); }
    });
    return tpl.innerHTML;
  };
})(cxRibbonHtml);

// ================= Playbooks: edit any of them; Op can change one too =================
function r81PbJson(p){
  const DOWN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {name:p.name, stages:pbStages(p).map(function(s){ return {name:s.name, days:s.days || 7, repeat:s.repeat==='month' ? 'month' : 'none', steps:arr(s.steps).map(function(it){
    const d = it.due || {}, w = d.rule==='week' ? 'weekly' : d.rule==='day' ? 'day' : d.rule==='end' ? 'end' : 'enter';
    return {title:it.title, type:it.type || 'task', when:w, day:d.rule==='day' ? d.n : undefined, weekday:d.rule==='week' ? DOWN[d.dow] : undefined, checklist:arr(it.checklist).map(function(c){ return c.t; }), notes:it.notes || ''};
  })}; })};
}
function r81PbBar(p){
  return '<div class="r81-pbbar"><button class="btn btn-sm btn-ghost" data-action="r81PbEdit" data-id="'+p.id+'">&#9998; Edit</button><button class="btn btn-sm btn-ghost" data-action="r81PbOpOpen" data-id="'+p.id+'">&#10024; Change it with Op</button></div>';
}
ACTIONS.r81PbEdit = function(el, e, id){ const p = pbById(id); if(!p) return; ui.pbSel = p.id; ui.pbWho = pbFor(p); ui.pbView = 'build'; ui.pbItem = null; ui.pb57Stage = (pbStages(p)[0] || {}).id || null; ui.pb57StageEdit = false; playTick(); renderView(); };
function r81PbOpHtml(){
  const p = pbById(ui.r81PbOp); if(!p) return '';
  return asHead('&#10024;', 'Change '+escapeHtml(p.name)+' with Op')+
    '<p class="r81-pbop-s">Say what to change. He rewrites the playbook and keeps everyone on it where they are (a stage with the same name keeps its people).</p>'+
    '<textarea class="input" id="r81PbOpAsk" rows="5" placeholder="e.g. Add a stage for the first 30 days of ads. Move the content plan to day 3. Every Friday, send a short update text. Add a checklist to the shoot day: shot list, batteries, mics, release form."></textarea>'+
    '<div class="as-f"><button class="btn btn-ghost" data-action="addSheetClose">Cancel</button><button class="btn btn-primary hs-go" data-action="r81PbOpGo"'+(ui.r81PbBusy ? ' disabled' : '')+'>'+(ui.r81PbBusy ? 'Op is working on it…' : '&#10024; Make the change')+'</button></div>';
}
ACTIONS.r81PbOpOpen = function(el, e, id){ ui.r81PbOp = id; ui.r81PbBusy = false; addSheetOpen('r81PbOp', r81PbOpHtml, 'r81PbOpAsk'); };
ACTIONS.r81PbOpGo = async function(){
  const p = pbById(ui.r81PbOp), ask = String((document.getElementById('r81PbOpAsk') || {}).value || '').trim();
  if(!p) return; if(!ask){ const t = document.getElementById('r81PbOpAsk'); if(t) t.focus(); return; }
  if(typeof AI!=='undefined' && AI.hasKey===false){ showToast('Op needs his AI key for this: Settings → Connections & Data.', {icon:'&#9888;'}); return; }
  ui.r81PbBusy = true; addSheetRefresh('r81PbOp');
  const who = pbFor(p);
  const task = 'Here is one of my '+(who==='lead' ? 'lead' : 'client')+' playbooks as JSON:\n'+JSON.stringify(r81PbJson(p))+'\n\nChange it like this:\n"""'+ask+'"""\n'+
    'Keep everything I didn’t ask to change exactly as it is (same stage names, same steps). Reply with ONLY the whole playbook as JSON in the same shape: {"name":"…","stages":[{"name":"…","days":14,"repeat":"none|month","steps":[{"title":"…","type":"task|call|report|send|access|doc","when":"enter|day|end|weekly","day":3,"weekday":"Mon","checklist":["…"],"notes":"…"}]}]}';
  let txt = null; try{ txt = await aiWrite(task, {max:4000}); }catch(err){}
  ui.r81PbBusy = false;
  let J = null; try{ const m = String(txt || '').match(/\{[\s\S]*\}/); J = m ? JSON.parse(m[0]) : null; }catch(err){}
  if(!J || !Array.isArray(J.stages) || !J.stages.length){ addSheetRefresh('r81PbOp'); showToast('Op couldn’t make that change. Try saying it another way.', {icon:'&#9888;'}); return; }
  r81PbApply(p, J);
  addSheetClose('r81PbOp'); pbSave(); playPositive(); ACTIONS.r81PbEdit(null, null, p.id);
  showToast('Op changed “'+p.name+'”.', {icon:'&#10024;', duration:5000});
};
// the new stages go in; people stay on the stage with the same name (or the first one), and old open steps come off
function r81PbApply(p, J){
  const tmp = r76PbFromJson(J, pbFor(p), {name:p.name, for:pbFor(p), ends:p.repeats ? 'again' : (p.next || '')});
  const old = pbStages(p), map = {};
  old.forEach(function(s){ const m = tmp.stages.find(function(t){ return r76Norm(t.name)===r76Norm(s.name); }); if(m){ m.id = s.id; m.crm = m.crm || s.crm; map[s.id] = s.id; } });
  const first = tmp.stages[0];
  p.stages = tmp.stages;
  pbCountsFor(pbFor(p)).forEach(function(x){ if(x.pb && x.pb.id===p.id && x.pb.stage && !map[x.pb.stage]){ x.pb.stage = first.id; x.pb.enteredAt = todayStr(); x.pb.seq = (Number(x.pb.seq) || 0) + 1; } });
  state.tasks.items = state.tasks.items.filter(function(t){ return !(t.master && t.master.kind==='pb' && t.master.pb===p.id && t.status!=='done'); });
  persist('tasks');
}
// every playbook says Edit / Change it with Op: on the overview's picks and at the top of the builder
renderView = (function(base){
  return function(){
    const r = base.apply(this, arguments);
    try{
      if(ui.view==='business' && ui.businessTab==='lifecycle'){
        const root = document.getElementById('viewRoot');
        const p = typeof pbSel==='function' ? pbSel() : null;
        if(root && p && !root.querySelector('.r81-pbbar')){
          const anchor = root.querySelector('.pb57-bh, .pb6-bh, .r64-pbs, .pb6-tabs, [data-action="pb6View"]');
          const host = anchor ? (anchor.closest('.pb6-top, .seg-tabs, .r64-pbs') || anchor.parentElement) : null;
          if(host) host.insertAdjacentHTML('afterend', r81PbBar(p));
        }
      }
    }catch(e){}
    return r;
  };
})(renderView);
// ---- the new-playbook sheet: first, how you want to start; then only that ----
pb6NewHtml = (function(base){
  return function(){
    const mode = ui.r81PbMode || 'op';
    const h = base.apply(this, arguments);
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    const C = tpl.content;
    const head = C.querySelector('.as-h'), or = C.querySelector('.r77-or');
    const tabs = '<div class="r81-pbm">'+[['op', '&#10024;', 'Describe it', 'Op builds the whole thing'], ['tpl', '&#128203;', 'From a template', 'Onboarding, monthly, save a client…'], ['blank', '&#9998;', 'Blank', 'Name it and build it yourself']].map(function(o){
      return '<button class="r81-pbmb'+(mode===o[0] ? ' is-on' : '')+'" data-action="r81PbMode" data-id="'+o[0]+'"><span>'+o[1]+'</span><b>'+o[2]+'</b><small>'+o[3]+'</small></button>'; }).join('')+'</div>';
    if(or) or.remove();
    const keep = {op:['r76-pbop'], tpl:['r60-pres'], blank:['r59-nf', 'r59-nf-row', 'as-f']}[mode] || [];
    ['r76-pbop', 'r60-pk-k', 'r60-pres', 'r59-nf', 'r59-nf-row', 'as-f'].forEach(function(cls){
      if(keep.indexOf(cls) >= 0) return;
      Array.prototype.slice.call(C.children).forEach(function(n){ if(n.classList.contains(cls)) n.remove(); });
    });
    if(head) head.insertAdjacentHTML('afterend', tabs); else C.prepend(document.createRange().createContextualFragment(tabs));
    return tpl.innerHTML;
  };
})(pb6NewHtml);
ACTIONS.r81PbMode = function(el, e, id){ try{ pb6NewRead(); }catch(x){} ui.r81PbMode = id; playTick(); addSheetRefresh('pb6NewSheet'); };
ACTIONS.pb6NewOpen = (function(base){ return function(){ ui.r81PbMode = 'op'; return base.apply(this, arguments); }; })(ACTIONS.pb6NewOpen);

// ================= Money: a transfer is never spending twice; business and personal accounts =================
function r81F(){ const f = r44F(); f.bankIn = arr(f.bankIn); f.acctUse = f.acctUse && typeof f.acctUse==='object' ? f.acctUse : {}; return f; }
// the bank sync also remembers money coming into your accounts (not as income: so a transfer's two sides can meet)
finSync = async function(loud){
  const b = finBank(); if(b.busy) return;
  b.busy = true; if(loud) renderView();
  const since = Math.floor((b.lastSync ? b.lastSync - 7*86400000 : Date.now() - 60*86400000)/1000);
  const r = await fetchWithin(WAKE_HELPER+'fin/accounts?s='+since, 50000);
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  b.busy = false;
  if(!r || !r.ok || !j || !Array.isArray(j.accounts)){
    if(r && r.status===401){ b.connected = false; }
    b.err = !r ? 'The Operator app isn’t answering.' : r.status===401 ? 'Not connected.' : 'Couldn’t reach your bank just now ('+((j && (j.error || (arr(j.errors)[0]))) || r.status)+').';
    persist('finances'); if(loud) renderView(); return;
  }
  b.err = arr(j.errors).length ? String(j.errors[0]) : null;
  b.connected = true;
  b.accounts = j.accounts.map(function(a){ return {id:a.id, name:a.name, org:(a.org && (a.org.name || a.org.domain)) || '', balance:Number(a.balance), at:Number(a['balance-date'])*1000 || Date.now()}; });
  const f = r81F(), ex = finExpenses(), have = {}, haveIn = {};
  ex.forEach(function(e){ if(e.txId) have[e.txId] = e; });
  f.bankIn.forEach(function(x){ haveIn[x.txId] = 1; });
  let added = 0;
  j.accounts.forEach(function(a){
    arr(a.transactions).forEach(function(t){
      const amt = Number(t.amount); if(!amt || t.pending) return;
      const id = a.id+':'+t.id, name = String(t.payee || t.description || t.memo || (amt < 0 ? 'Card purchase' : 'Deposit')).replace(/\s+/g, ' ').trim().slice(0, 80);
      const when = Number(t.transacted_at || t.posted)*1000, date = todayStr(new Date(when || Date.now()));
      if(amt > 0){ if(!haveIn[id]){ f.bankIn.push({txId:id, date:date, amount:Math.round(amt*100)/100, name:name, account:a.name, acct:a.id}); haveIn[id] = 1; } return; }
      if(have[id]) return;
      ex.push({id:uid(), txId:id, date:date, amount:Math.round(-amt*100)/100, name:name, cat:expGuessCat(name+' '+(t.description || '')), src:'bank', account:a.name, acct:a.id});
      added++;
    });
  });
  const cut = addDays(todayStr(), -400); f.bankIn = f.bankIn.filter(function(x){ return x.date >= cut; });
  b.lastSync = Date.now();
  const moved = r81Transfers();
  persist('finances');
  if(loud || added) renderView();
  if(loud) showToast((added ? added+' new expense'+(added===1 ? '' : 's')+' from your bank.' : 'Up to date with your bank.')+(moved ? ' '+moved+' transfer'+(moved===1 ? '' : 's')+' between your accounts left out of spending.' : ''), {icon:'&#127974;'});
};
// money that left one of your accounts and landed in another (same amount, within 4 days) is a transfer; so is
// paying one of your own cards (its name and a payment word in the description)
function r81Transfers(){
  const f = r81F(), accts = r44Accounts(), ex = finExpenses(); let n = 0;
  const used = {};
  const cards = accts.filter(function(a){ return a.type==='credit'; }).map(function(a){ return [a.org, a.name].concat(/american express|amex/i.test(a.org + ' ' + a.name) ? ['amex', 'american express'] : []).filter(function(s){ return s && String(s).length >= 4; }).map(function(s){ return String(s).toLowerCase(); }); });
  ex.forEach(function(e){
    if(e.dupOf || (e.cat==='move' && e.xfer)) return;
    const amt = Math.abs(Number(e.amount || 0)); if(!amt) return;
    const t0 = new Date(e.date).getTime();
    const twin = f.bankIn.find(function(x){ return !used[x.txId] && Math.abs(x.amount - amt) < 0.01 && x.account!==e.account && Math.abs(new Date(x.date).getTime() - t0) <= 4*86400000; });
    let why = null;
    if(twin){ used[twin.txId] = 1; why = twin.account; }
    else {
      const nm = String(e.name || '').toLowerCase();
      if(/payment|pymt|pmt|autopay|epay|e-pay|transfer|xfer|thank you/.test(nm) && cards.some(function(words){ return words.some(function(w){ return nm.indexOf(w) >= 0; }); })) why = 'your card';
    }
    if(why){ e.cat = 'move'; e.xfer = why; n++; }
  });
  if(n) persist('finances');
  return n;
}
// business or personal: what an account is decides its charges (one you changed by hand stays as you set it)
r70Typ = (function(base){
  return function(e){
    if(e && !(e.typ==='business' || e.typ==='client' || e.typ==='personal')){
      const u = r81F().acctUse[e.account || ''];
      if(u==='business' || u==='personal') return u;
    }
    return base.apply(this, arguments);
  };
})(r70Typ);
ACTIONS.r81AcctUse = function(el, e, id){ const a = String(id).split('|'), f = r81F(); f.acctUse[a[0]] = a[1]; persist('finances'); playTick(); renderView(); };
function r81AcctUseHtml(){
  const accts = r44Accounts(); if(!accts.length) return '';
  const f = r81F();
  return '<div class="r81-use"><div class="r81-use-h"><b>Business or personal?</b><span>Charges on a business account count as business (you can still change one by hand).</span></div>'+
    accts.map(function(a){ const u = f.acctUse[a.name] || 'personal';
      return '<div class="r81-use-r"><span><i style="background:'+a.color+'"></i>'+escapeHtml((a.org ? a.org+' · ' : '')+a.name)+'</span><div class="r43-seg">'+[['personal', 'Personal'], ['business', 'Business']].map(function(o){ return '<button type="button" class="'+(u===o[0] ? 'is-on' : '')+'" data-action="r81AcctUse" data-id="'+escapeHtml(a.name)+'|'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div></div>'; }).join('')+
    '</div>';
}
r44AccountsHtml = (function(base){ return function(accts){ const h = base.apply(this, arguments); return accts && accts.length ? h+r81AcctUseHtml() : h; }; })(r44AccountsHtml);
// Spending: All, Personal or Business
r79MonthTx = (function(base){
  return function(ym){
    const L = base.apply(this, arguments), u = ui.r81Use || 'all';
    return u==='all' ? L : L.filter(function(e){ const t = r70Typ(e); return u==='business' ? (t==='business' || t==='client') : t==='personal'; });
  };
})(r79MonthTx);
r79SpendHtml = (function(base){
  return function(){
    const u = ui.r81Use || 'all';
    const seg = '<div class="r81-useseg r43-seg">'+[['all', 'All'], ['personal', 'Personal'], ['business', 'Business']].map(function(o){ return '<button type="button" class="'+(u===o[0] ? 'is-on' : '')+'" data-action="r81Use" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>';
    return seg+base.apply(this, arguments);
  };
})(r79SpendHtml);
ACTIONS.r81Use = function(el, e, id){ ui.r81Use = id; ui.r79Cat = undefined; playTick(); renderView(); };
setTimeout(function(){ try{ if(r81Transfers()) renderView(); }catch(e){} }, 1600);

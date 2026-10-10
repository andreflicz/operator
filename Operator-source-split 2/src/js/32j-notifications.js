
// ============ NOTIFICATIONS ============
// The bell next to "Operator." collects what needs you, worked out fresh from your data:
//  • deadlines — tasks overdue, due today or tomorrow; one-off client deliverables coming due
//  • clients — behind on this week's deliverables, a check-in due, a retainer to invoice
//  • leads — follow-ups that are due
//  • the calendar — what's coming up in the next few hours
//  • GoHighLevel — new messages waiting for a reply, and leads that just came in
// Click one to go straight to it. ✕ hides it for today (it comes back tomorrow if it still
// applies); "Clear all" does that for everything showing.
function notifDismissed(){ const d = state.focus.notifDismissed; return d && typeof d==='object' ? d : (state.focus.notifDismissed = {}); }
function notifList(){
  const today = todayStr(), tomorrow = addDays(today, 1), out = [];
  const add = function(n){ out.push(n); };
  // deadlines
  state.tasks.items.forEach(function(t){
    if(t.status==='done' || !t.deadline || t.deadline > tomorrow) return;
    const over = t.deadline < today;
    add({key:'task:'+t.id+':'+t.deadline, kind:'deadline', level: over ? 'danger' : t.deadline===today ? 'warn' : 'info', icon:'&#9201;',
      title:t.title, sub: over ? 'Overdue since '+fmtDateShort(t.deadline) : t.deadline===today ? 'Due today'+(t.deadlineTime ? ' at '+fmt12Hour(t.deadlineTime) : '') : 'Due tomorrow',
      act:{a:'openTaskEditModal', id:t.id}, sort: over ? 0 : t.deadline===today ? 1 : 3});
  });
  // clients
  arr(state.business.clients).filter(function(c){ return c.status==='active'; }).forEach(function(c){
    const name = c.business || c.name || 'Client';
    arr(c.deliverables).forEach(function(d){
      if(d.recurring){
        if(deliverablePaceStatus(d)==='danger') add({key:'pace:'+c.id+':'+d.id+':'+thisWeekKey(), kind:'client', level:'danger', icon:'&#127916;',
          title:name+' — '+d.title+' behind', sub:deliverableWeekCount(d)+' of '+(d.weeklyTarget||1)+' this week', act:{a:'openClientModal', id:c.id}, sort:1});
      } else if(d.status!=='done' && d.dueDate && d.dueDate<=tomorrow){
        add({key:'deliv:'+c.id+':'+d.id, kind:'client', level: d.dueDate<today ? 'danger' : 'warn', icon:'&#128230;', title:name+' — '+d.title,
          sub: d.dueDate<today ? 'Deliverable overdue' : d.dueDate===today ? 'Deliverable due today' : 'Deliverable due tomorrow', act:{a:'openClientModal', id:c.id}, sort:1});
      }
    });
    const care = clientCareTier(c);
    if(care.cls==='tag-danger') add({key:'care:'+c.id+':'+today, kind:'client', level:'warn', icon:'&#128075;', title:'Check in with '+name, sub:care.label, act:{a:'openClientModal', id:c.id}, sort:2});
    if(Number(c.mrr)>0 && typeof clientInvoicedThisMonth==='function' && !clientInvoicedThisMonth(c.id) && new Date().getDate() >= (c.billingDay||1))
      add({key:'inv:'+c.id+':'+thisMonthKey(), kind:'client', level:'warn', icon:'&#128176;', title:'Invoice '+name, sub:'$'+Number(c.mrr).toLocaleString()+' retainer — billing day passed', act:{a:'openClientModal', id:c.id}, sort:2});
  });
  // leads
  arr(state.business.pipeline).forEach(function(x){
    if(x.convertedClientId) return;
    const n = typeof crmOverdueDays==='function' ? crmOverdueDays('lead', x) : null;
    if(n==null || n<0 || !(x.followUp && x.followUp.date) && n<1) return;
    add({key:'lead:'+x.id+':'+today, kind:'lead', level: n>2 ? 'danger' : 'warn', icon:'&#127919;', title:'Follow up with '+(x.company || x.name || 'lead'),
      sub: dueLabel(n, 'lead', x).replace(/<[^>]+>/g, ''), act:{a:'openProspectEditModal', id:x.id}, sort:2});
  });
  // calendar: the next few hours
  const now = Date.now();
  arr(state.calendar.events).forEach(function(e){
    if(e.date!==today || !e.time) return;
    const ts = localTs(e.date, e.time), mins = Math.round((ts-now)/60000);
    if(mins < -15 || mins > 180) return;
    add({key:'ev:'+e.id+':'+e.date, kind:'calendar', level: mins<=30 ? 'warn' : 'info', icon:'&#128197;', title:e.title,
      sub: mins<=0 ? 'Happening now' : 'In '+fmtDurationLabel(mins)+' · '+fmt12Hour(e.time), act:{a:'openCalItem', kind:'event', id:e.id}, sort: mins<=30 ? 0 : 4});
  });
  // GoHighLevel
  const g = state.settings && state.settings.ghl;
  if(g && g.connected){
    arr(g.inbox).forEach(function(m){
      add({key:'ghlmsg:'+m.contactId+':'+m.at, kind:'ghl', level:'warn', icon:'&#128172;', title:(m.name || 'Someone')+' messaged you', sub:String(m.body||'').slice(0, 90) || 'New message in GoHighLevel',
        act:{a:'openGhlContact', id:m.contactId}, sort:1, at:m.at});
    });
    arr(g.recentLeads).forEach(function(l){
      if(Date.now()-l.at > 2*86400000) return;
      add({key:'ghllead:'+l.id, kind:'ghl', level:'info', icon:'&#10024;', title:'New lead: '+l.name, sub:'From GoHighLevel', act:{a:'openProspectEditModal', id:l.id}, sort:3, at:l.at});
    });
  }
  // the month's and the week's intentions, until they're written
  if(typeof intentPending==='function') intentPending().forEach(add);
  const dis = notifDismissed();
  return out.filter(function(n){ return dis[n.key]!==today; }).sort(function(a, b){ return a.sort-b.sort || (b.at||0)-(a.at||0); });
}
function notifBadge(){
  const el = document.getElementById('notifCount'), bell = document.getElementById('notifBell'); if(!el || !bell) return;
  let list = [];
  try{ list = notifList(); }catch(e){ return; }
  const urgent = list.filter(function(n){ return n.level!=='info'; }).length;
  const txt = urgent ? (urgent>9 ? '9+' : String(urgent)) : '';
  if(el.textContent!==txt) el.textContent = txt;
  if(el.hidden!==!urgent) el.hidden = !urgent;
  bell.classList.toggle('has-urgent', list.some(function(n){ return n.level==='danger'; }));
  if(ui.notifOpen) notifRender(list);
}
function notifPanelHtml(list){
  const groups = [['deadline','Deadlines'],['client','Clients'],['lead','Leads'],['calendar','Coming up'],['ghl','GoHighLevel']];
  return '<div class="nt-head"><span class="nt-title">Notifications</span>'+(list.length ? '<button class="nt-clear" data-action="notifClearAll">Clear all</button>' : '')+'<button class="nt-x" data-action="toggleNotifs" title="Close">&#10005;</button></div>'+
    (list.length ? groups.map(function(gr){
      const items = list.filter(function(n){ return n.kind===gr[0]; }); if(!items.length) return '';
      return '<div class="nt-group"><div class="nt-k">'+gr[1]+'</div>'+items.map(function(n){
        return '<div class="nt-item is-'+n.level+'" data-key="np-'+escapeHtml(n.key)+'">'+
          '<button class="nt-main" data-action="notifOpen" data-id="'+escapeHtml(n.key)+'"><span class="nt-i">'+n.icon+'</span><span class="nt-txt"><span class="nt-t">'+escapeHtml(n.title)+'</span><span class="nt-s">'+escapeHtml(n.sub||'')+'</span></span></button>'+
          '<button class="nt-dismiss" data-action="notifDismiss" data-id="'+escapeHtml(n.key)+'" title="Hide for today">&#10005;</button></div>';
      }).join('')+'</div>';
    }).join('') : '<div class="nt-empty"><div style="font-size:26px;">&#10024;</div>All clear — nothing needs you right now.</div>');
}
function notifRender(list){ const el = document.getElementById('notifPanel'); if(el) morphInto(el, notifPanelHtml(list || notifList())); }
ACTIONS.toggleNotifs = function(){
  ui.notifOpen = !ui.notifOpen;
  const el = document.getElementById('notifPanel'); if(!el) return;
  el.hidden = !ui.notifOpen;
  if(ui.notifOpen){ notifRender(); playTick(); }
};
function notifByKey(key){ return notifList().find(function(n){ return n.key===key; }); }
ACTIONS.notifOpen = function(el, e, key){
  const n = notifByKey(key); if(!n) return;
  ui.notifOpen = false; const p = document.getElementById('notifPanel'); if(p) p.hidden = true;
  const a = n.act;
  if(a.a==='openTaskEditModal') openTaskEditModal(a.id);
  else if(a.a==='openClientModal') openClientModal(a.id);
  else if(a.a==='openProspectEditModal') openProspectEditModal(a.id);
  else if(a.a==='openCalItem') openCalItem(a.kind, a.id);
  else if(a.a==='openGhlContact' && ACTIONS.openGhlContact) ACTIONS.openGhlContact(null, null, a.id);
  else if(a.a==='openIntent' && typeof openIntentForm==='function') openIntentForm(a.id);
};
ACTIONS.notifDismiss = function(el, e, key){ notifDismissed()[key] = todayStr(); persist('focus'); notifBadge(); notifRender(); };
ACTIONS.notifClearAll = function(){ const d = notifDismissed(), t = todayStr(); notifList().forEach(function(n){ d[n.key] = t; }); persist('focus'); notifBadge(); notifRender(); };
// clicking anywhere else closes it
document.addEventListener('pointerdown', function(e){
  if(!ui.notifOpen) return;
  if(e.target.closest && (e.target.closest('#notifPanel') || e.target.closest('#notifBell'))) return;
  ui.notifOpen = false; const p = document.getElementById('notifPanel'); if(p) p.hidden = true;
}, true);
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && ui.notifOpen){ ACTIONS.toggleNotifs(); } });
// keep the badge current: after changes, and once a minute (deadlines and meetings come due on their own)
let notifT = 0;
afterRenderHooks.push(function(){ if(notifT) return; notifT = setTimeout(function(){ notifT = 0; notifBadge(); }, 400); });
setInterval(function(){ if(typeof state!=='undefined' && state && state.tasks) notifBadge(); }, 60000);
// old "hidden for today" marks don't need keeping
function notifPrune(){ const d = notifDismissed(), t = todayStr(); Object.keys(d).forEach(function(k){ if(d[k] < addDays(t, -2)) delete d[k]; }); }
setTimeout(function(){ try{ notifPrune(); }catch(e){} }, 5000);

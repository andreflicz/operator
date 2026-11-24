// ============ OP'S READS, ACROSS THE APP ============
// The same short take Op gives on Personal → You (Pattern / Watch / Move), wherever there are numbers
// worth reading: Health, Finances, Goals, the Business overview, the Calendar and Training Skills.
// Each is made at most once a day for the same numbers (↻ for another take), and only with a key.
function opFactsAttr(key){
  try{ const a = xpSummaryFresh().attrs[key]; return (a.subs||[]).map(function(s){ return s.label+': '+(s.v==null ? 'not rated yet' : s.v+'/99')+' ('+(s.note||'')+')'; }).join('\n'); }catch(e){ return ''; }
}
function opFactsHealthPage(){
  const t = todayStr(), wl = arr(state.health.weightLog).slice().sort(function(a, b){ return a.date.localeCompare(b.date); });
  const w30 = wl.filter(function(x){ return x.date >= addDays(t, -30); });
  const gym = arr(state.health.gymLog).filter(function(g){ return g.date >= addDays(t, -14); });
  const cal = arr(state.health.calorieEntries).filter(function(c){ return c.date >= addDays(t, -6); });
  const days = {}; cal.forEach(function(c){ days[c.date] = (days[c.date]||0) + Number(c.calories||0); });
  const avg = Object.keys(days).length ? Math.round(Object.values(days).reduce(function(a, b){ return a + b; }, 0)/Object.keys(days).length) : null;
  const lines = [opFactsAttr('HLT')];
  if(w30.length >= 2) lines.push('Weight: '+w30[0].weight+' → '+w30[w30.length-1].weight+' over the last 30 days');
  else if(wl.length) lines.push('Weight: last weigh-in '+wl[wl.length-1].weight+' on '+wl[wl.length-1].date);
  lines.push('Workouts in 14 days: '+gym.length+(gym.length ? ' ('+gym.map(function(g){ return g.type; }).slice(-6).join(', ')+')' : ''));
  if(avg!=null) lines.push('Calories: about '+avg+' a day logged this week, target '+(state.profile.calorieTarget || 2000));
  if(!gym.length && !wl.length && avg==null) return '';
  return lines.filter(Boolean).join('\n');
}
function opFactsMoneyPage(){
  const mk = thisMonthKey(), f = state.finances;
  const inc = arr(f.income).filter(function(i){ return monthKeyOf(i.date)===mk; }).reduce(function(a, i){ return a + Number(i.amount||0); }, 0);
  const ex = arr(f.expenses).filter(function(e){ return monthKeyOf(e.date)===mk; });
  const by = {}; ex.forEach(function(e){ by[e.cat] = (by[e.cat]||0) + e.amount; });
  const top = Object.keys(by).sort(function(a, b){ return by[b] - by[a]; }).slice(0, 3).map(function(c){ return c+' $'+Math.round(by[c]); });
  const debt = arr(f.debts).reduce(function(a, d){ return a + Number(d.balance||0); }, 0);
  const paid = arr(f.payments).filter(function(p){ return p.date >= addDays(todayStr(), -30); }).reduce(function(a, p){ return a + Number(p.amount||0); }, 0);
  if(!inc && !ex.length && !debt) return '';
  return ['Income this month: $'+Math.round(inc), 'Spent this month: $'+Math.round(ex.reduce(function(a, e){ return a + e.amount; }, 0))+(top.length ? ' (most on '+top.join(', ')+')' : ''), 'Debt left: $'+Math.round(debt)+', paid down $'+Math.round(paid)+' in 30 days', 'Day of the month: '+Number(todayStr().slice(8))].join('\n');
}
function opFactsGoalsPage(){
  const out = [];
  try{ ['week', 'month'].forEach(function(k){ const gs = tierGoals(k, periodKey(k)); if(gs.length) out.push('This '+k+': '+gs.filter(function(g){ return g.done; }).length+'/'+gs.length+' done ('+gs.map(function(g){ return (g.done ? '✓ ' : '· ')+g.label; }).join('; ')+')'); }); }catch(e){}
  const open = arr(state.goals.items).filter(function(g){ return !g.tier && !g.master && !g.done; });
  if(open.length) out.push('Long-term goals open: '+open.slice(0, 6).map(function(g){ return g.title || g.label || ''; }).join('; '));
  if(!out.length) return '';
  out.push('Day of the week: '+new Date().toLocaleDateString('en-US', {weekday:'long'}));
  return out.join('\n');
}
function opFactsBizPage(){
  const f = opFactsAttr('BUS'); if(!f) return '';
  const leads = arr(state.business.pipeline).filter(function(l){ return typeof leadIsOpen==='function' ? leadIsOpen(l) : true; });
  return f+'\nOpen leads: '+leads.length;
}
function opFactsWeekAhead(){
  const t = todayStr(), ev = arr(state.calendar.events).filter(function(e){ return e.date >= t && e.date <= addDays(t, 6); });
  const dl = state.tasks.items.filter(function(x){ return x.deadline && x.status!=='done' && x.deadline <= addDays(t, 6); });
  if(!ev.length && !dl.length) return '';
  const by = {}; ev.forEach(function(e){ by[e.date] = (by[e.date]||0) + 1; });
  return ['Events in the next 7 days: '+ev.length+(ev.length ? ' ('+ev.slice(0, 8).map(function(e){ return weekdayShort(e.date)+' '+(e.title||e.name||'event'); }).join('; ')+')' : ''),
    'Busiest day: '+(Object.keys(by).sort(function(a, b){ return by[b] - by[a]; })[0] ? weekdayShort(Object.keys(by).sort(function(a, b){ return by[b] - by[a]; })[0]) : 'none'),
    'Deadlines this week: '+dl.length+(dl.length ? ' ('+dl.slice(0, 6).map(function(x){ return x.title+(x.deadline < t ? ' (overdue)' : ''); }).join('; ')+')' : '')].join('\n');
}
function opFactsSkillsPage(){
  const sk = typeof skillTasks==='function' ? skillTasks() : []; if(!sk.length) return '';
  return sk.map(function(x){ const by = taskMinutesByDay(x.id), t = todayStr(), wk = []; for(let k=3;k>=0;k--){ let m = 0; for(let i=0;i<7;i++) m += by[addDays(t, -(7*k + i))] || 0; wk.push(Math.round(m)); }
    return x.title+': weekly minutes, oldest to this week: '+wk.join(', ')+(Number(x.skillGoal) ? ' (aim '+x.skillGoal+' a week)' : ''); }).join('\n');
}
// where they go (each returns '' without a key or without enough to say)
function opReadHealth(){ return typeof opRead==='function' ? opRead('health', opFactsHealthPage, 'Give him your read on his health: training, food and weight.', {angles:'health', triad:true}) : ''; }
function opReadMoney(){ return typeof opRead==='function' ? opRead('money', opFactsMoneyPage, 'Give him your read on his money this month: what’s coming in, where it’s going and the debt.', {angles:'money', triad:true}) : ''; }
function opReadGoals(){ return typeof opRead==='function' ? opRead('goals', opFactsGoalsPage, 'Give him your read on his goals: the week, the month and the long game.', {angles:'goals', triad:true}) : ''; }
function opReadBiz(){ return typeof opRead==='function' ? opRead('biz', opFactsBizPage, 'Give him your read on the business: revenue, the pipeline, the work going in.', {angles:'biz', triad:true}) : ''; }
function opReadWeek(){ return typeof opRead==='function' ? opRead('week', opFactsWeekAhead, 'Give him your read on the week ahead: how loaded it is and what to watch.', {angles:'week', triad:true}) : ''; }
function opReadSkills(){ return typeof opRead==='function' ? opRead('skills', opFactsSkillsPage, 'Give him your read on the skills he’s training: where the time is going and what’s slipping.', {angles:'skills', triad:true}) : ''; }
Object.assign(OP_ANGLES, {
  health:['the weakest of training, food and weight, and the one fix', 'the trend over the last month', 'how consistent the training is', 'what the food log says, or doesn’t'],
  money:['where the money actually goes', 'income versus spending this month', 'the debt and how fast it’s moving', 'one leak to plug'],
  goals:['which goal is at risk this week', 'the gap between the week’s goals and the month’s', 'what he keeps setting and not hitting', 'the long-term goal that has gone quiet'],
  biz:['the weakest of revenue, grind, scaling and content', 'what would move revenue fastest', 'the pipeline and what is stuck', 'whether the hours are going to what pays'],
  week:['the most loaded day and how to protect the work', 'deadlines at risk', 'where the free time is'],
  skills:['which skill is getting the time and which isn’t', 'the four-week trend', 'whether the weekly aims are realistic']
});

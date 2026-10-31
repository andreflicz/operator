// Round 57: playbook tasks stay where you put them, due rules, behind-the-guide health, Op never refuses,
// the Update tag, break starts, video idea form resets, goodnight has no tomorrow task.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r57.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 9, d, h, m || 0).getTime();
  const seed = {profile:{name:'Andre Lopez'}, business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, startDate:'2026-10-01', deliverables:[]}], pipeline:[]}};
  const p = await newPage(b, OUT+'/r57.html', seed, at(21, 10));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false;");
  // a 30-day play: week 1 task, week 2 task, report due on the last day
  await E(`const P = pbNew('client', 'Retainer', 30, {for:'client', repeats:true}); P.items.push(pbItem('Kickoff', 'call', 2)); P.items.push(pbItem('Plan', 'task', 9)); P.items.push(pbItem('Monthly report', 'report', 1, {endOff:0})); pbAll().push(P);
    pbStart('client', state.business.clients[0], P.id, '2026-10-01', true); persist('business'); masterTasksSync();`);
  const tasks = () => E("JSON.stringify(state.tasks.items.filter(t => t.master && t.master.kind==='pb').map(t => [t.title, t.status, t.deadline]))").then(JSON.parse);
  let ts = await tasks();
  check('playbook tasks exist', ts.length>=2, ts);
  const rep = ts.find(t => t[0]==='Monthly report');
  check('"last day" due rule: the report is due on the last day of the cycle (Oct 31), not a week early', rep && rep[2]==='2026-10-31', rep);
  // put the open task on the backlog; a sync must not move it back
  await E("const t = state.tasks.items.find(t => t.master && t.master.kind==='pb' && t.title==='Plan'); t.status='backlog'; persist('tasks'); masterTasksSync(); masterTasksSync();");
  ts = await tasks(); check('moved to the backlog: it stays there after syncs', (ts.find(t => t[0]==='Plan') || [])[1]==='backlog', ts);
  await E("const t = state.tasks.items.find(t => t.master && t.master.kind==='pb' && t.title==='Plan'); t.title='Plan the month'; t.deadline='2026-10-25'; persist('tasks'); masterTasksSync();");
  ts = await tasks(); check('a name and a date you changed stay', ts.some(t => t[0]==='Plan the month' && t[2]==='2026-10-25'), ts);
  await E("state.tasks.items.find(t => t.master && t.master.kind==='pb' && t.title==='Monthly report').status='today'; persist('tasks'); masterTasksSync();");
  // health: only behind when a past week of the guide has open steps
  const lvl = () => E("clientHealthStatus(state.business.clients[0]).pbLate || 0");
  check('week 3 with week 1 and 2 steps open: behind the guide', (await lvl())>0);
  await E(`const x = state.business.clients[0]; pbState('client', x).occ.forEach(o => { if(o.date < '2026-10-15') x.pb.done[o.key] = '2026-10-10'; }); persist('business')`);
  check('past weeks done: not behind, even with the report not due yet', (await lvl())===0, await lvl());
  // Op: no refusal rules, Update tag
  const rules = await E("(function(){ const s = aiSystem(); const txt = JSON.stringify(s); return /tell him plainly \\(kind, firm\\) to go to sleep/.test(txt) || /suggest it waits for tomorrow/.test(txt); })()");
  check('Op’s instructions no longer tell him to refuse or send you to sleep', rules===false);
  await E("opRunTool('add_journal', {text:'Push to talk cuts off after a minute', title:'PTT', tag:'update'})");
  check('add_journal with tag update lands under the Updates type', await E("(function(){ const e = state.journal.entries[state.journal.entries.length-1]; return isUpdateEntry(e); })()"));
  // break from focus mode starts without a dialog
  await E("state.focus.activeSession = {id:'s1', startedAt:Date.now()-60000, plannedMinutes:60, breaks:[]}; persist('focus');");
  await E("opRunTool('take_break', {minutes:10})");
  check('take_break starts the break right away', await E("!!state.focus.activeSession.onBreak && state.focus.activeSession.breaks.length===1"));
  // away stop is opt-in
  check('a session is not ended for being away unless you turn it on', await E("state.settings.appTracking.awayStop!==true"));
  // video idea form clears
  await E("openAddVideoIdeaModal()"); await p.fill('#newVideoIdeaTitle', 'First idea'); await p.fill('#newVideoIdeaNotes', 'notes one');
  await E("addVideoIdea()"); await E("openAddVideoIdeaModal()");
  check('the video idea form is empty after saving', await E("document.getElementById('newVideoIdeaTitle').value==='' && document.getElementById('newVideoIdeaNotes').value===''"));
  // goodnight: no tomorrow task
  await E("state.tasks.items.push({id:uid(), title:'ZZ tomorrow task', client:'general', clients:['general'], priority:'med', deadline:addDays(todayStr(),1), notes:'', status:'today', createdAt:todayStr(), completedAt:null}); window.__said=''; opSay = function(t){ window.__said = t; return Promise.resolve(); }; opCaption = function(t){ window.__said = t; }; state.settings.opOn = true; state.focus.opNightSaid = null;");
  await E("opGoodnight()"); await p.waitForTimeout(400);
  const said = await E("window.__said");
  check('goodnight: warm, short, no tomorrow task', typeof said==='string' && !/ZZ tomorrow|Tomorrow starts/.test(said) && /ood ?night/i.test(said), said);
  console.log('errors', JSON.stringify(p.errors));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });

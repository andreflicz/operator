// Round 71 — the Command View.
// Run: node scripts/e2e/r71-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');

const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r71.html');
instrument(SRC, FILE);

const ds = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.toISOString().slice(0, 10); };
const at = (off, h, m) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); d.setHours(h, m, 0, 0); return d.getTime(); };

// three weeks of starts, mostly around 9:40, so there is a rhythm to find
const sessions = [];
[[-1, 9, 35], [-2, 9, 48], [-3, 9, 40], [-4, 11, 20], [-5, 9, 30], [-7, 9, 52], [-8, 9, 38], [-9, 14, 10], [-10, 9, 44]]
  .forEach(function(x, i){ sessions.push({id: 's' + i, date: ds(x[0]), type: 'deep', startedAt: at(x[0], x[1], x[2]), endedAt: at(x[0], x[1] + 3, x[2]), minutes: 180, breaks: []}); });

const seed = {
  profile: {name: 'Andre'},
  standards: {deepWorkTarget: 240, items: [{id: 'st1', label: 'Deep work'}, {id: 'st2', label: 'Train'}], completions: []},
  focus: {sessions: sessions},
  daysOff: {dates: []},
  tasks: {items: [
    {id: 't1', title: 'Coral Energy edit', status: 'today', deadline: ds(1)},
    {id: 't2', title: 'Invoice run', status: 'today', deadline: ds(-2)},
    {id: 't3', title: 'Pitch deck', status: 'today', deadline: ds(9)},
    {id: 't4', title: 'No date on this one', status: 'today'}
  ]},
  business: {clients: [], pipeline: []}
};

(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---- it reads your work hours and says where you are ----
  const work = await ev(`
    const cfg = workCfg(); cfg.enabled = true; cfg.start = '09:00'; cfg.end = '18:00'; delete cfg.override; persist('profile');
    const W = r71Work();
    const h = r71Html('full');
    return {none:W.none, start:W.start, end:W.end, span:W.span,
      sane:W.pct >= 0 && W.pct <= 1, states:(W.before?1:0)+(W.open?1:0)+(W.after?1:0),
      bar:h.indexOf('r71-bar') > 0, shows:/09:00|9:00|Starts|Done for the day/.test(h)};
  `);
  check('work hours: it reads them, no duplicate setting', !work.none && work.start === 540 && work.end === 1080 && work.span === 540, work);
  check('work hours: exactly one of before / in / after, and the bar is drawn', work.states === 1 && work.sane && work.bar && work.shows, work);

  // ---- no hours set is said plainly, not left blank ----
  const nohours = await ev(`
    const cfg = workCfg(); const keep = cfg.enabled; cfg.enabled = false;
    const h = r71Html('full'), none = r71Work().none;
    cfg.enabled = keep;
    return {none:none, says:/No work hours set/.test(h)};
  `);
  check('no work hours: it says so instead of showing an empty bar', nohours.none && nohours.says, nohours);

  // ---- the day type relabels, and never moves the target ----
  const type = await ev(`
    const base = r71Target();
    const normal = r71Type();
    state.modes.history = [{type:'shooting', date:todayStr(), minutes:300}];
    const shoot = r71Type(), shootTarget = r71Target();
    state.modes.history = [];
    state.daysOff.dates = [todayStr()];
    const off = r71Type(), offTarget = r71Target();
    state.daysOff.dates = [];
    return {normal:normal.id, shoot:shoot.id, off:off.id, note:shoot.note,
      sameTarget:base === shootTarget && base === offTarget, base:base};
  `);
  check('day type: a logged shoot makes it a shoot day', type.shoot === 'shoot' && /Same target/.test(type.note), type);
  check('day type: a marked day off is read from the existing system', type.off === 'off', type);
  check('day type: the target never moves — it relabels only', type.sameTarget && type.base === 240, type);

  // ---- the rhythm: the point of the whole thing ----
  const rhythm = await ev(`
    const R = r71Rhythm();
    return {n:R.n, usual:R.usual, days:R.days.length, today:R.today,
      plausible:R.usual > 9*60 && R.usual < 10*60,
      outlierProof:R.usual < 11*60};
  `);
  check('rhythm: it finds your usual start from real sessions', rhythm.n === 9 && rhythm.plausible, rhythm);
  check('rhythm: a couple of odd days don’t drag it (median, not mean)', rhythm.outlierProof && rhythm.usual === 584, rhythm);   // 9:44, not pulled by the 11:20 and 14:10
  check('rhythm: three weeks of dots', rhythm.days === 21, rhythm);

  // ---- what it says about today's start ----
  const says = await ev(`
    const out = {};
    state.focus.sessions.push({id:'today1', date:todayStr(), type:'deep', startedAt:(function(){ const d=new Date(); d.setHours(9,38,0,0); return d.getTime(); })(), endedAt:Date.now(), minutes:60, breaks:[]});
    out.onRhythm = /On rhythm/.test(r71Html('full'));
    state.focus.sessions.pop();
    state.focus.sessions.push({id:'today2', date:todayStr(), type:'deep', startedAt:(function(){ const d=new Date(); d.setHours(13,10,0,0); return d.getTime(); })(), endedAt:Date.now(), minutes:60, breaks:[]});
    out.late = /later than usual/.test(r71Html('full'));
    state.focus.sessions.pop();
    out.notYet = /Not yet today/.test(r71Html('full'));
    return out;
  `);
  check('rhythm: starting near your usual time says you’re on rhythm', says.onRhythm, says);
  check('rhythm: starting hours late says how late, without scolding', says.late, says);
  check('rhythm: not started yet is stated, not nagged', says.notYet, says);

  // ---- too little history is admitted, not faked ----
  const cold = await ev(`
    const keep = state.focus.sessions;
    state.focus.sessions = keep.slice(0, 2);
    const R = r71Rhythm(), h = r71Html('full');
    state.focus.sessions = keep;
    return {usual:R.usual, honest:/Still learning your rhythm/.test(h)};
  `);
  check('rhythm: under three days it says it’s still learning', cold.usual === null && cold.honest, cold);

  // ---- deadlines, sorted and coloured by how close they are ----
  const dues = await ev(`
    const D = r71Deadlines(4), h = r71Html('full');
    return {n:D.length, first:D[0] && D[0].title, late:D[0] && D[0].days < 0,
      order:D.map(x => x.date).join('<') === D.map(x => x.date).sort().join('<'),
      noUndated:!D.some(x => !x.date), isLate:h.indexOf('is-late') > 0, urgency:r71Urgency(-1)+r71Urgency(0)+r71Urgency(2)+r71Urgency(9)};
  `);
  check('deadlines: read from the existing field, soonest first', dues.n >= 3 && dues.order && dues.noUndated, dues);   // (the app makes its own dated tasks too)
  check('deadlines: an overdue one leads and is marked late', dues.first === 'Invoice run' && dues.late && dues.isLate, dues);
  check('deadlines: colour only when it’s actually close', dues.urgency === 'latetodaysoon', dues);

  // ---- the quote is about starting and doing the work ----
  const quote = await ev(`
    r71Cfg().tone = 'work'; const w = r71Quote();
    r71Cfg().tone = 'action'; const a = r71Quote();
    const inWork = WORK_QUOTES.some(q => q[0] === w.text), inAction = ACTION_QUOTES.some(q => q[0] === a.text);
    r71Cfg().tone = 'work';
    return {w:w.kind, a:a.kind, inWork:inWork, inAction:inAction, has:!!w.text};
  `);
  check('the one line comes from the app’s own work and action sets', quote.w === 'work' && quote.a === 'action' && quote.inWork && quote.inAction, quote);

  // ---- full screen, and the panel ----
  const views = await ev(`
    ACTIONS.r71Open();
    const full = !!document.getElementById('r71Full'), big = full && !!document.querySelector('#r71Full .r71.is-big');
    const locked = document.body.classList.contains('r71-on');
    ACTIONS.r71Close();
    const panel = PANEL_RENDERERS.command ? PANEL_RENDERERS.command() : '';
    const listed = PANEL_DEFS.some(p => p.id === 'command');
    const today = pageEditBtnHtml('toggleTodayEdit');
    return {full:full, big:big, locked:locked, panel:panel.indexOf('r71 is-panel') > 0, listed:listed, button:today.indexOf('r71Open') > 0};
  `);
  check('full screen opens, fills the screen and locks the page behind it', views.full && views.big && views.locked, views);
  check('it’s also a panel you can put on Today', views.panel && views.listed, views);
  check('and there’s a way in from the Today header', views.button, views);

  // ---- display only: the whole point ----
  const passive = await ev(`
    const before = JSON.stringify({t:state.tasks.items, s:state.focus.sessions.length, st:state.standards.completions, m:state.modes.history});
    r71Html('full'); r71Html('panel'); ACTIONS.r71Open(); r71Tick(); ACTIONS.r71Close();
    const after = JSON.stringify({t:state.tasks.items, s:state.focus.sessions.length, st:state.standards.completions, m:state.modes.history});
    const acts = Object.keys(ACTIONS).filter(k => k.indexOf('r71') === 0);
    return {same:before === after, acts:acts.sort().join(','),
      noPrompt:!/did you|still working|have you|are you/i.test(r71Html('full'))};
  `);
  check('it changes nothing it reads', passive.same, passive);
  check('its only actions are open, close, settings and the two toggles', passive.acts === 'r71Band,r71Close,r71Open,r71Settings,r71Tone', passive);
  check('it never asks you anything', passive.noPrompt, passive);

  // ---- bands can be turned off ----
  const bands = await ev(`
    const c = r71Cfg();
    const all = r71Html('full');
    ACTIONS.r71Band(null, null, 'vision'); ACTIONS.r71Band(null, null, 'quote');
    const less = r71Html('full');
    ACTIONS.r71Band(null, null, 'vision'); ACTIONS.r71Band(null, null, 'quote');
    const back = r71Html('full');
    return {off:less.indexOf('r71-quote') < 0, on:back.indexOf('r71-quote') > 0, wasOn:all.indexOf('r71-quote') > 0,
      settings:(function(){ ui.view='settings'; ui.settingsTab='focus'; const h = renderSettings(); return h.indexOf('r71Set') > 0 && h.indexOf('r71Band') > 0; })()};
  `);
  check('every band can be switched off and back on', bands.wasOn && bands.off && bands.on, bands);
  check('the switches live in Settings → Focus & Lock in', bands.settings, bands);

  await ev(`ui.view='today'; renderView(); ui.view='settings'; ui.settingsTab='focus'; renderView(); return 1;`);
  await page.waitForTimeout(400);
  check('no page errors', page.errors.length === 0, page.errors.slice(0, 6));

  await browser.close();
  process.exit(report() ? 1 : 0);
})();

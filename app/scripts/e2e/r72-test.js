// Round 72 — alarms, tags, mornings, your time, music, Op, the UI fixes and the phone.
// Run: node scripts/e2e/r72-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');

const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r72.html');
instrument(SRC, FILE);
const ds = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.toISOString().slice(0, 10); };

const seed = {
  profile: {name: 'Andre'},
  focus: {sessions: [], wake: {enabled: true, time: '07:00', days: [0, 1, 2, 3, 4, 5, 6]}, work: {enabled: true, start: '10:00', end: '17:00', days: [0, 1, 2, 3, 4, 5, 6]}},
  tasks: {items: [{id: 't1', title: 'Coral Energy edit', status: 'today', deadline: ds(0)}, {id: 't2', title: 'Invoice run', status: 'backlog'}]},
  calendar: {events: [{id: 'e1', title: 'JJS shoot', date: ds(0), time: '23:50'}, {id: 'e2', title: 'Call with iFix', date: ds(0), time: '23:55'}, {id: 'e3', title: 'Batusha meet', date: ds(0), time: '23:58'}, {id: 'e4', title: 'Weekly money', date: ds(0), time: '23:59'}]},
  business: {clients: [{id: 'c1', name: 'Batusha Corp', status: 'active', mrr: 1200}], pipeline: []}
};

(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---------------- 1–4. the alarm ----------------
  const ring = await ev(`
    fireWake({test:false});
    const h = document.getElementById('wakeContent').innerHTML;
    return {snooze:h.indexOf('data-action="wakeSnooze"') > 0, up:h.indexOf('data-action="r72Up"') > 0, off:h.indexOf('data-action="r72AlarmOff"') > 0, gm:h.indexOf('Start Good morning') > 0};
  `);
  check('2 the ring has Snooze, I’m up and Turn off, with Good morning under them', ring.snooze && ring.up && ring.off && ring.gm, ring);

  const tagSnooze = await ev(`
    const g = r70TMake('Nightstand', '', [{id:uid(), act:'sleep', when:{}}]);
    R70T.last = {};
    const r = r70TRun(g, {});
    const sn = state.focus.snooze;
    return {say:r.say, wake:!!(sn && sn.wake), reminder:!!(sn && sn.alarm), mode:ui.wakeMode, ringing:!!wakeRing, screen:document.getElementById('wakeContent').innerHTML.indexOf('Rings again at') > 0, clock:!!document.querySelector('#wakeContent #wakeClock')};
  `);
  check('1 the Sleep tag snoozes the real alarm, not a reminder', /Snoozed until/.test(tagSnooze.say) && tagSnooze.wake && !tagSnooze.reminder && !tagSnooze.ringing, tagSnooze);
  check('1 snoozed, the screen goes back to the time and says when it rings again', tagSnooze.mode === 'snooze' && tagSnooze.screen && tagSnooze.clock, tagSnooze);

  const again = await ev(`
    const g = r70TagList().find(x => x.name === 'Nightstand'); R70T.last = {};
    return r70TRun(g, {}).say;
  `);
  check('1 a second tap while snoozed doesn’t stack another snooze', /Already snoozed/.test(again), again);

  const off = await ev(`
    const r = r72AlarmOff();
    return {say:r, mode:ui.wakeMode, snooze:state.focus.snooze, clock:!!document.querySelector('#wakeContent #wakeClock'), open:overlayOpen('wakeOverlay')};
  `);
  check('3 Turn off stops it and leaves just the clock', off.mode === 'r72clock' && !off.snooze && off.clock && off.open, off);

  const keep = await ev(`
    ACTIONS.r72ClockClose(); hideOverlay('wakeOverlay'); ui.wakeMode = null;
    fireWake({test:false});
    let finished = 0, stopped = 0; const f0 = finishWakeMedia, s0 = stopWakeMedia;
    finishWakeMedia = function(){ finished++; }; stopWakeMedia = function(){ stopped++; };
    const g = r70TMake('Awake', '', [{id:uid(), act:'awake', when:{}}]); R70T.last = {};
    const r = r70TRun(g, {});
    finishWakeMedia = f0; stopWakeMedia = s0;
    return {say:r.say, finished:finished, stopped:stopped, ringing:!!wakeRing, up:!!(state.focus.r70Gm && state.focus.r70Gm.up)};
  `);
  check('4 I’m awake stops the alarm, logs you up, and keeps your song playing', /Alarm off|Morning/.test(keep.say) && keep.finished >= 1 && keep.stopped === 0 && !keep.ringing && keep.up, keep);

  const pref = await ev(`
    r72Set('awakeStopsMusic', true);
    fireWake({test:false});
    let stopped = 0; const s0 = stopWakeMedia; stopWakeMedia = function(){ stopped++; };
    r70QuietUp();
    stopWakeMedia = s0; r72Set('awakeStopsMusic', false);
    return {stopped:stopped};
  `);
  check('4 …unless Settings says “I’m awake stops the music”', pref.stopped >= 1, pref);

  // ---------------- 5–7. Good morning tag, hand-off, the work alarm ----------------
  const starters = await ev(`
    const gm = R70T_STARTERS.find(s => s.id === 'gm'), aw = R70T_STARTERS.find(s => s.id === 'awake');
    return {gm:!!gm && gm.steps[0].act === 'goodmorning', awake:aw && aw.steps[0].act === 'awake', snoozeAct:!!r70TAct('snooze'), offAct:!!r70TAct('alarmoff')};
  `);
  check('5 a Good morning tag in the starter set; Awake just wakes you', starters.gm && starters.awake, starters);
  check('2 snooze and turn-off are their own tag steps', starters.snoozeAct && starters.offAct, starters);

  const handoff = await ev(`
    hideOverlay('wakeOverlay'); ui.wakeMode = null; hideOverlay('planOverlay');
    ACTIONS.sleepGoodMorning();
    const h = document.getElementById('wakeContent').innerHTML;
    const label = /Start the day/.test(h) && !/Get to [Ww]ork/.test(h);
    ACTIONS.wakeStartMorning();
    return {label:label, plan:overlayOpen('planOverlay'), view:ui.view};
  `);
  await page.waitForTimeout(700);
  check('6 Good morning hands off to Today, not the lock-in page', handoff.label && !handoff.plan && handoff.view === 'today', handoff);

  const work = await ev(`
    hideOverlay('wakeOverlay'); ui.wakeMode = null;
    const w = workCfg(); w.enabled = true; const n = new Date(); w.start = String(n.getHours()).padStart(2,'0')+':'+String(Math.max(0, n.getMinutes()-1)).padStart(2,'0'); w.end = '23:59'; w.days = [0,1,2,3,4,5,6];
    workDayState().rangAt = null; workDayState().clockedInAt = Date.now();   // (he's been on the Mac all morning)
    checkWorkAlarm();
    const full = overlayOpen('wakeOverlay') && ui.wakeMode === 'work';
    const h = document.getElementById('wakeContent').innerHTML;
    const tiles = (h.match(/r72w-t"/g) || []).length;
    ACTIONS.workRingNext();
    return {full:full, tiles:tiles, plan:overlayOpen('planOverlay')};
  `);
  check('7 the work alarm takes over the screen even after a morning on the Mac', work.full && work.tiles === 3, work);
  check('6/7 its button opens the lock-in page', work.plan, work);

  // ---------------- 9–10. tags: no questions, and a moment ----------------
  const tag = await ev(`
    hideOverlay('planOverlay'); ui.planReveal = null;
    const g = r70TMake('Desk', '', [{id:uid(), act:'lockin', when:{locked:'out'}}, {id:uid(), act:'lockout', when:{locked:'in'}}]);
    R70T.last = {}; const a = r70TRun(g, {});
    const fx = !!document.querySelector('#r72LockFx.is-in');
    const locked = !!state.focus.activeSession;
    R70T.last = {}; const b = r70TRun(g, {});
    const asked = !!document.querySelector('.ui-dialog, .uiconfirm, [data-ui-confirm]');
    return {a:a.say, fx:fx, locked:locked, b:b.say, out:!state.focus.activeSession, asked:asked};
  `);
  check('10 locking in from a tag plays the lock-in moment', tag.fx && tag.locked && /Locked in/.test(tag.a), tag);
  check('9 a lock-out tap right after locks out, no pop-up', /Locked out/.test(tag.b) && tag.out && !tag.asked, tag);
  await page.waitForTimeout(2600);
  const landed = await ev(`return {view:ui.view, tab:ui.focusTab};`);
  const door = await ev(`
    const g = r70TMake('Door2', '', [{id:uid(), act:'out', kind:'ask', when:{away:'no'}}, {id:uid(), act:'back', when:{away:'yes'}}]);
    R70T.last = {}; const r = r70TRun(g, {});
    const o = r70TOut(); const kind = o && o.kind;
    R70T.last = {}; r70TRun(g, {});
    return {say:r.say, kind:kind, asked:!!document.getElementById('r70Ask') && document.getElementById('r70Ask').offsetParent !== null};
  `);
  check('9 heading out never asks which: a shoot on the calendar means shooting', door.kind === 'shooting' && !door.asked, door);
  const wiz = await ev(`ACTIONS.r70TWizOpen(); const w = ui.r70TWiz.how; ui.r70TWiz = null; return w;`);
  check('9 new tags are hands-free by default', wiz === 'hands', wiz);

  // ---------------- 11–12. Good morning's words, and the day in three lines ----------------
  const gm = await ev(`
    state.focus.r72Gm = null;
    const L = r72GmLines();
    const lines = r72GmApply([{at:0, text:'x', key:'hero'}, {at:1000, text:'y', key:'day'}, {at:2000, text:'z', key:'news'}, {at:3000, text:'q', key:'cta'}]);
    const said = [L.hello, L.wx, L.day, L.go].join(' ');
    // fourteen mornings in a row never repeat a hello
    const seen = []; for(let i = 0; i < 14; i++){ seen.push(r72Pick(R72_GM_HELLO, 'gmtest')); }
    return {n:lines.length, keys:lines.map(l => l.key).join(','), coffee:/coffee/i.test(said) || /coffee/i.test(JSON.stringify(OP_GREETS)), big:/Big one|Shoot day/.test(L.day), uniq:new Set(seen).size, greet:opBriefGreeting() === L.hello};
  `);
  check('11 Good morning: three things, not a rundown of the day', gm.n === 3 && gm.keys === 'r72hello,r72day,r72go', gm);
  check('11 no coffee, anywhere in his greetings', !gm.coffee, gm);
  check('11 a remark on how big the day is (a shoot today)', gm.big, gm);
  check('11 fourteen mornings, fourteen different hellos', gm.uniq === 14 && gm.greet, gm);

  const read = await ev(`
    const t = r72DayReadout().split('\\n');
    return {n:t.length, where:t[0], next:t[1], shape:t[2], re:R72_READ_RE.test('Read me the day: where I am, what’s next, in three short lines.')};
  `);
  check('12 read me the day: three short lines (where, next, how it’s going)', read.n === 3 && /locked in|Not locked in|Shooting|Off|break|night|Out/i.test(read.where) && /^Next|Nothing lined up/.test(read.next) && /deep work/.test(read.shape) && read.re, read);

  // ---------------- 13. Op can do everything ----------------
  const op = await ev(`
    const t0 = Date.now() - 6*3600000;
    const add = opRunTool('add_session', {start:todayStr()+' '+new Date(t0).toTimeString().slice(0,5), end:todayStr()+' '+new Date(t0 + 3*3600000).toTimeString().slice(0,5)});
    const s = state.focus.sessions[state.focus.sessions.length - 1];
    const cut = opRunTool('change_session', {id:s.id, minus_minutes:70});
    const after = s.minutes;
    const list = opRunTool('list_sessions', {});
    const logged = opRunTool('log_time', {kind:'shooting', start:todayStr()+' 00:10', end:todayStr()+' 00:40'});
    const press = opRunTool('press', {action:'r72OpenXp'});
    const view = ui.view; ui.view = 'today'; renderView();
    let refused = ''; try{ opRunTool('press', {action:'resetAll'}); }catch(e){ refused = e.message; }
    const sys = aiSystem(); const txt = Array.isArray(sys) ? sys.map(b => b.text || '').join(' ') : String(sys);
    return {add:add, after:after, cut:cut, list:list.indexOf(s.id) >= 0, logged:logged, press:press, view:view, refused:refused, sysArray:Array.isArray(sys) || typeof sys === 'string', told:/YOU ARE THE APP/.test(txt), noObj:!/\\[object Object\\]/.test(txt)};
  `);
  check('13 Op adds a session, then takes 1h10m off it', /added 3h/.test(op.add) && op.after === 110, op);
  check('13 Op lists sessions and logs shooting time after the fact', op.list && /30m of shooting/.test(op.logged), op);
  check('13 Op can press any button (but not the ones that wipe things)', /pressed|ran/.test(op.press) && op.view === 'xp' && /deletes things/.test(op.refused), op);
  check('13 his instructions say he is the app, and the prompt stays intact', op.told && op.noObj, op);

  // ---------------- 14. memory ----------------
  const mem = await ev(`
    const L = opChat(); L.length = 0;
    for(let i = 0; i < 700; i++) L.push({r:'op', t:'x'.repeat(3000), at:Date.now()});
    r72TrimOp();
    return {n:L.length, longest:Math.max.apply(null, L.map(e => e.t.length))};
  `);
  check('14 Op’s chat keeps 250 lines of at most 1,200 characters', mem.n === 250 && mem.longest <= 1201, mem);

  // ---------------- 15. auto lock-in ----------------
  const auto = await ev(`
    if(state.focus.activeSession) r70LockOutNow();
    // (the earlier steps logged shooting, and a shooting day counts as a day off for the streak)
    state.modes.history = state.modes.history.filter(h => h.type !== 'shooting'); state.modes.active = null; state.focus.r70Out = null;
    if(state.daysOff && state.daysOff.r70Kinds) delete state.daysOff.r70Kinds[todayStr()];
    state.settings.appTracking = Object.assign({}, state.settings.appTracking, {enabled:true, autoLockIn:true, thresholdMinutes:12});
    setActivityCategory('Firefox', 'work');
    const now = Date.now();
    state.appActivity.todayIntervals = [{app:'Firefox', start:now - 40*60000, end:now - 1000}];
    const w = workCfg(); w.start = '00:00'; w.end = '23:59'; workDayState().rangAt = Date.now();
    autoLockInMeta = {app:null, intervalStart:null}; state.focus.autoRejectedAt = null; state.focus.lastSessionEndedAt = 0; state.focus.lastManualStopAt = 0; state.modes.lastEndedAt = 0;
    checkAutoLockIn();
    const browser = !!state.focus.activeSession;
    state.appActivity.todayIntervals = [{app:'Final Cut Pro', start:now - 40*60000, end:now - 1000}];
    autoLockInMeta = {app:null, intervalStart:null};
    checkAutoLockIn();
    const editor = !!(state.focus.activeSession && state.focus.activeSession.autoStarted);
    // and it ends itself 10 minutes after the work stops, back-dated
    const s = state.focus.activeSession;
    if(s){ s.startedAt = now - 3*3600000; state.appActivity.todayIntervals = [{app:'Final Cut Pro', start:now - 3*3600000, end:now - 25*60000}]; }
    lastRawSampleAt = Date.now();
    r72SessionGuard();
    const ended = !state.focus.activeSession, last = state.focus.sessions[state.focus.sessions.length - 1];
    return {browser:browser, editor:editor, ended:ended, mins:last && last.minutes};
  `);
  check('15 Firefox (even sorted as work) never starts an automatic lock-in', !auto.browser, auto);
  check('15 a real work app still does', auto.editor, auto);
  check('15 an automatic session ends where the work stopped', auto.ended && auto.mins >= 150 && auto.mins <= 160, auto);
  const hours = await ev(`
    const w = workCfg(); w.start = '00:00'; w.end = '00:01';
    const r = autoLockInBlockedReason();
    startMode('shooting', {}); const r2 = autoLockInBlockedReason(); endMode();
    w.start = '10:00'; w.end = '17:00';
    return {hours:r, shoot:r2};
  `);
  check('15 not outside work hours, and never while shooting', hours.hours === 'hours' && hours.shoot === 'mode', hours);
  const lockTab = await ev(`ui.focusTab = 'analytics'; startFocus(null); const t = ui.focusTab; r70LockOutNow(); return t;`);
  check('18 locking in lands on Tasks', lockTab === 'tasks', lockTab);

  // ---------------- 16. the long ones ----------------
  const long = await ev(`
    state.focus.sessions.push({id:'L1', type:'deep', date:todayStr(), startedAt:Date.now() - 11*3600000, endedAt:Date.now() - 3600000, minutes:600, breaks:[]});
    ui.view = 'focus'; ui.focusTab = 'analytics'; ui.sessionsPage = true; ui.r72Long = true; renderView();
    const shown = !!document.querySelector('.r72-long');
    ACTIONS.r72LongCut(null, null, 'L1');
    const s = state.focus.sessions.find(x => x.id === 'L1');
    ui.sessionsPage = false; ui.view = 'today'; renderView();
    return {shown:shown, mins:s && s.minutes};
  `);
  check('16 sessions over 6 hours are listed, and Cut to 3h works', long.shown && long.mins === 180, long);

  // ---------------- 17. your time ----------------
  const time = await ev(`
    if(state.focus.activeSession) r70LockOutNow();
    startFocus(null); state.focus.activeSession.startedAt = Date.now() - 30*60000;
    ACTIONS.r72Shoot();
    const shootingNow = state.modes.active && state.modes.active.type === 'shooting', notLocked = !state.focus.activeSession;
    state.modes.active.startedAt = Date.now() - 45*60000;
    const T = r72TimeFor(todayStr());
    endMode();
    const panel = PANEL_RENDERERS.r72time();
    return {shootingNow:shootingNow, notLocked:notLocked, shoot:T.shooting, kinds:(panel.match(/r72t-k/g) || []).length, wrapped:panel.indexOf('class="r60w"') >= 0};
  `);
  check('17 shooting ends the lock-in (no more “locked in” on a shoot day)', time.shootingNow && time.notLocked, time);
  check('17 shooting time counts, and Your time shows six kinds', time.shoot >= 44 && time.kinds === 6, time);
  check('23 the Your time widget sizes like the others', time.wrapped, time);

  // ---------------- 19. music ----------------
  await page.waitForTimeout(2700);   // (workMusicPlay lets go of a second start within 2.5 s)
  const music = await ev(`
    r72Set('autoMusic', 'off');
    try{ stopWakeMedia(true); }catch(e){} wakeFinishing = false; wakeMusicApp = false;
    if(FM.playing) focusMusicStop();
    workMusicPlay();
    const offWorks = !FM.playing;
    r72Set('autoMusic', 'fade'); r72Set('musicFadeMin', 6);
    const why = {musicOn:musicOn(), op:opMusicPlaying(), sw:String(FM.switching), tag:FM.tag, song:wakeSongOn(), mode:r72Music(), mom:r72MomentOn('work'), wp:soundPref('workMusic', true), prof:JSON.stringify(state.profile.r72)};
    const st = []; const fs0 = focusMusicStop; focusMusicStop = function(){ st.push(String(new Error().stack).slice(0, 400)); return fs0.apply(this, arguments); };
    const fp0 = focusMusicPlay; let fpc = 0; focusMusicPlay = function(){ fpc++; return fp0.apply(this, arguments); };
    workMusicPlay();
    focusMusicStop = fs0; focusMusicPlay = fp0; why.stops = st; why.fpc = fpc; why.ctx = !!getAudioCtx();
    const playing = FM.playing, auto = R72.musicAuto, armed = !!R72.fadeT;
    ACTIONS.mctlToggle(); ACTIONS.mctlToggle();
    const mine = R72.musicAuto === null && !R72.fadeT;
    if(FM.playing) focusMusicStop();
    ui.view = 'settings'; ui.settingsTab = 'sound'; renderView();
    const set = !!document.getElementById('r72Music');
    ui.view = 'today'; renderView();
    return {why:why, offWorks:offWorks, playing:playing, auto:auto, armed:armed, mine:mine, set:set};
  `);
  check('19 automatic music off means off', music.offWorks, music);
  check('19 by default it fades away (the timer is set when the app starts it)', music.playing && music.auto === 'work' && music.armed, music);
  check('19 music you press play on is yours: no fade', music.mine, music);
  check('19 the Music settings are in Settings → Sound', music.set, music);

  // ---------------- 20–24. looks ----------------
  await page.setViewportSize({width: 1288, height: 640});
  const cal = await ev(`
    ui.view = 'calendar'; renderView();
    const cells = Array.from(document.querySelectorAll('.calx .cx-grid .cx-d:not(.is-empty)'));
    let overlap = 0; for(let i = 0; i + 7 < cells.length; i++){ const a = cells[i].getBoundingClientRect(), b = cells[i + 7].getBoundingClientRect(); if(a.bottom > b.top + 1) overlap++; }
    const peeks = cells.map(c => c.querySelectorAll('.cx-peek').length);
    return {overlap:overlap, h:Math.round(cells[0].getBoundingClientRect().height), most:Math.max.apply(null, peeks)};
  `);
  check('20 the calendar’s days never overlap, even on a short window', cal.overlap === 0 && cal.h >= 110, cal);
  check('20 a day shows up to three things before “+N”', cal.most === 3, cal);
  await page.setViewportSize({width: 1400, height: 900});
  const lvl = await ev(`ui.view = 'today'; renderView(); const c = document.querySelector('#musicDock .md-lvl'); return c ? getComputedStyle(c).display : 'none';`);
  check('21 no level in the top right', lvl === 'none', lvl);
  // (Round 76 turned the XP page into Quests / Progress tabs and took it out of the sidebar)
  const xp = await ev(`
    ui.view = 'xp'; ui.r76XpTab = 'progress'; renderView();
    const root = document.getElementById('viewRoot'), r = root.getBoundingClientRect();
    let wide = 0; root.querySelectorAll('*').forEach(el => { const q = el.getBoundingClientRect(); if(q.width && q.right > r.right + 2) wide++; });
    ui.r76XpTab = 'quests'; renderView(); const qs = !!document.querySelector('.r76x-tabs');
    return {wide:wide, quests:qs};
  `);
  check('22 XP has its own page with Quests and Progress', xp.quests, xp);
  check('22 nothing on the XP page runs off to the right', xp.wide === 0, xp);

  const widgets = await ev(`
    const dp = state.dashboardPanels; dp.order.forEach(id => { dp.enabled[id] = true; }); dp.r60Span = dp.r60Span || {};
    let bad = [];
    [4, 6].forEach(function(sz){
      dp.order.forEach(id => { dp.r60Span[id] = sz; }); ui.view = 'today'; ui.todayEdit = false; renderView();
      document.querySelectorAll('.r60w').forEach(function(w){
        const r = w.getBoundingClientRect();
        w.querySelectorAll('*').forEach(function(el){ const q = el.getBoundingClientRect(); if(q.width > 1 && q.height > 1 && (q.right > r.right + 2 || q.left < r.left - 2) && getComputedStyle(el).position !== 'fixed') bad.push(sz+':'+w.dataset.wid+':'+String(el.className).slice(0, 30)); });
      });
    });
    return {bad:bad.slice(0, 6), n:bad.length};
  `);
  check('23 at S and M every widget stays inside its box', widgets.n === 0, widgets);

  const cmd = await ev(`
    ui.view = 'today'; renderView();
    ACTIONS.r71Open(); ACTIONS.r72CmdEdit();
    const edit = !!document.querySelector('#r71Full .r72c.is-edit .r72c-tools');
    const c = r72CmdCfg(); const first0 = c.order[0];
    ACTIONS.r72CmdMove(null, null, first0+':1'); const moved = c.order[1] === first0;
    ACTIONS.r72CmdSize(null, null, 'deadlines:s'); const sized = !!document.querySelector('#r71Full .r72c-cell.is-s[data-band="deadlines"]');
    ACTIONS.r72CmdBand(null, null, 'bigclock'); const added = c.bands.bigclock === true;
    ACTIONS.r72CmdEdit();
    const big = !!document.querySelector('#r71Full .r72c-clock'), hiddenTools = !document.querySelector('#r71Full .r72c-tools');
    ACTIONS.r71Close();
    return {edit:edit, moved:moved, sized:sized, added:added, big:big, hiddenTools:hiddenTools, extras:R71_BANDS.length};
  `);
  check('24 Command View: Customize on the board — reorder, size, show/hide', cmd.edit && cmd.moved && cmd.sized && cmd.added, cmd);
  check('24 new parts (a big clock and more), and Done hides the tools', cmd.big && cmd.hiddenTools && cmd.extras >= 14, cmd);

  const alarms = await ev(`
    ui.view = 'calendar'; ui.cxDesk = 'alarms'; renderView();
    const al = document.querySelector('.cx-al.is-work'), main = al.querySelector('.cx-al-main'), sw = al.querySelector('.cx-switch');
    const b = main.querySelector('b').getBoundingClientRect(), s = sw.getBoundingClientRect(), name = main.querySelector('small');
    const cs = getComputedStyle(name);
    return {overlap:b.right > s.left + 1, bold:Number(cs.fontWeight) >= 700, centered:getComputedStyle(main).textAlign === 'center', order:getComputedStyle(name).order};
  `);
  check('8 the alarm list: bold name in the middle, time under it, no overlap', !alarms.overlap && alarms.bold && alarms.centered, alarms);

  // ---------------- 25. the phone's side ----------------
  const phone = await ev(`
    const d = r72PhoneCall('dash'), t = r72PhoneCall('tasks'), c = r72PhoneCall('cal'), cl = r72PhoneCall('clients'), a = r72PhoneCall('alarms');
    const j0 = r72PhoneCall('journal').length; r72PhoneCall('journalAdd', {text:'From the phone'}); const j1 = r72PhoneCall('journal').length;
    r72PhoneCall('taskDone', {id:'t1'});
    const done = state.tasks.items.find(x => x.id === 't1');
    const off = r72PhoneCall('alarm', {which:'wake', on:false}).wake.on;
    r72PhoneCall('alarm', {which:'wake', on:true});
    return {dash:typeof d.deep === 'number' && !!d.readout, tasks:t.today.length >= 1 && Array.isArray(t.backlog), cal:c.length >= 1 && c[0].label === 'Today', clients:cl.length === 1 && cl[0].mrr === 1200,
      alarms:!!a.wake && !!a.work, journal:j1 === j0 + 1, done:done && (done.status === 'done' || typeof justCompletedTaskId !== 'undefined' && justCompletedTaskId === 't1'), off:off === false, unknown:r72PhoneCall('nope').ok === false};
  `);
  check('25 the phone gets a dashboard, tasks, calendar, clients and alarms', phone.dash && phone.tasks && phone.cal && phone.clients && phone.alarms, phone);
  check('25 from the phone: tick a task, write in the journal, switch an alarm', phone.journal && phone.done && phone.off && phone.unknown, phone);

  check('no page errors', page.errors.length === 0, page.errors.slice(0, 5));
  await browser.close();
  process.exit(report() ? 1 : 0);
})();

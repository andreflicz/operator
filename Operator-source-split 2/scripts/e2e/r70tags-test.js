// Round 70 — part 2: the tags.
// Run: node scripts/e2e/r70tags-test.js dist/command-center-2.html
const path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common');

const SRC = process.argv[2] || 'dist/command-center-2.html';
const FILE = path.join(OUT, 'r70tags.html');
instrument(SRC, FILE);

const seed = {
  profile: {name: 'Andre'},
  meals: {library: [{id: 'm1', name: 'Chicken and rice', calories: 700, uses: 12}, {id: 'm2', name: 'Eggs', calories: 300, uses: 3}]},
  health: {gymLog: [], weightLog: [{id: 'w0', date: '2026-11-01', weight: 182}], calorieEntries: [], workouts: []},
  standards: {items: [{id: 'st1', label: 'Deep work'}], completions: []},
  focus: {sessions: []},
  business: {clients: [], pipeline: []}
};

(async () => {
  const browser = await launch();
  const page = await newPage(browser, FILE, seed);
  const ev = (code) => page.evaluate((c) => window.__op.ev(c), `(function(){ ${code} })()`);

  // ---- 19/20/21 a tag, its own secret, its own link ----
  const made = await ev(`
    const g = r70TMake('Desk', 'your desk', [{id:uid(), act:'lockin', when:{locked:'out'}}, {id:uid(), act:'lockout', when:{locked:'in'}}]);
    const a = g.secret, b = r70TMake('Other', '', [{id:uid(), act:'water', when:{}}]).secret;
    r70Tags().host = 'andre-mac.local';
    const link = r70TLink(g);
    return {len:a.length, unique:a !== b, hex:/^[0-9a-f]{32}$/.test(a), link:link, found:r70TagBySecret(a) === g, notFound:r70TagBySecret('nope') === null, on:g.on};
  `);
  check('20 each tag gets its own 128-bit secret', made.len === 32 && made.hex && made.unique, made);
  check('21 the link carries the secret and nothing else', /\/t\/[0-9a-f]{32}$/.test(made.link) && made.found && made.notFound, made);

  // ---- 22/23/25 a tap runs the steps, rules decide which, already-done is fine ----
  const tap = await ev(`
    const g = r70TagList()[0];
    const first = r70TRun(g, {});
    const locked = !!state.focus.activeSession;
    R70T.last = {};
    const again = r70TRun(g, {});
    const mins = state.focus.activeSession ? Math.round((Date.now() - state.focus.activeSession.startedAt)/60000) : 0;
    state.focus.activeSession.startedAt = Date.now() - 2*3600000;
    R70T.last = {};
    const out = r70TRun(g, {});
    return {first:first.say, locked:locked, again:again.say, out:out.say, ended:!state.focus.activeSession, taps:g.taps, logged:r70Tags().log.length};
  `);
  check('22 a tap runs the tag', /Locked in/.test(tap.first) && tap.locked, tap);
  check('25 a rule decides which step runs: in when out, out when in', /only locked in|asked on the Mac/i.test(tap.again), tap);
  check('23 tapping again later locks you out, with the length', /Locked out/.test(tap.out) && tap.ended, tap);
  check('28 every tap is counted and logged', tap.taps >= 3 && tap.logged >= 3, tap);

  // ---- a second read of the same sticker is one tap ----
  const dbl = await ev(`
    const g = r70TagList()[1];
    R70T.last = {};
    const a = r70TRun(g, {}), b = r70TRun(g, {});
    return {a:a.say, repeat:!!b.repeat, same:a.say === b.say, taps:g.taps};
  `);
  check('22 a sticker read twice in a second is still one tap', dbl.repeat && dbl.same && dbl.taps === 1, dbl);

  // ---- 23 already done is an answer, not an error ----
  const already = await ev(`
    const g = r70TMake('Just lock in', '', [{id:uid(), act:'lockin', when:{}}]);
    R70T.last = {}; r70TRun(g, {});
    R70T.last = {};
    const r = r70TRun(g, {});
    const brk = r70TMake('Break only', '', [{id:uid(), act:'breakend', when:{}}]);
    R70T.last = {};
    const nb = r70TRun(brk, {});
    try{ if(state.focus.activeSession) r70LockOutNow(); }catch(e){}
    return {ok:r.ok, say:r.say, nb:nb.say, nbOk:nb.ok};
  `);
  check('23 "already locked in" comes back as an answer, not a failure', already.ok && /Already locked in/.test(already.say), already);
  check('23 so does "you weren\'t on a break"', already.nbOk && /weren.t on a break/.test(already.nb), already);

  // ---- 26/29 off, a new link, and the catalog as the only thing a tag can run ----
  const safe = await ev(`
    const g = r70TagList()[1], old = g.secret;
    g.on = false;
    const offTap = r70TRun(g, {});
    g.on = true;
    const fresh = r70TNewSecret(g);
    const deadLink = r70TagBySecret(old);
    const junk = r70TRun(null, {});
    const acts = R70T_ACTS.map(a => a.id);
    return {off:offTap.code, dead:deadLink === null, fresh:fresh !== old, junk:junk.code, catalog:acts.length, noDelete:!acts.some(a => /delete|remove|wipe/.test(a))};
  `);
  check('20 a new link kills the old one, and an off tag does nothing', safe.off === 'off' && safe.dead && safe.fresh, safe);
  check('26/29 an unknown secret is turned away; nothing in the catalog deletes anything', safe.junk === 'unknown' && safe.noDelete && safe.catalog > 20, safe);

  // ---- 24 one tag, many steps ----
  const many = await ev(`
    const g = r70TMake('Morning', 'the nightstand', [{id:uid(), act:'water', when:{}}, {id:uid(), act:'task', when:{}, title:'Plan the day'}]);
    R70T.last = {};
    const r = r70TRun(g, {});
    const task = state.tasks.items.find(t => t.title === 'Plan the day');
    return {did:r.did.length, say:r.say, task:!!task};
  `);
  check('24 one tag runs several steps in order', many.did === 2 && many.task, many);

  // ---- 25 the rules themselves ----
  const rules = await ev(`
    const now = {locked:true, onbreak:false, sleeping:false, ringing:false, away:false, hour:9, part:'am'};
    const t = (w, first) => r70TStepFits({when:w}, now, first === undefined ? false : first);
    return {none:t({}), lockedIn:t({locked:'in'}), lockedOut:t({locked:'out'}), am:t({part:'am'}), night:t({part:'night'}),
      first:t({first:'yes'}, true), notFirst:t({first:'yes'}, false), away:t({away:'no'}), window:t({from:'08:00', to:'10:00'}), outside:t({from:'22:00', to:'23:00'})};
  `);
  check('25 no rule means it always runs', rules.none, rules);
  check('25 locked in / not locked in', rules.lockedIn && !rules.lockedOut, rules);
  check('25 time of day, and a window', rules.am && !rules.night && rules.window && !rules.outside, rules);
  check('25 the first tap of the day', rules.first && !rules.notFirst && rules.away, rules);

  // ---- 47.3 / 47.4 sleep and waking, measured by the taps ----
  const sleep = await ev(`
    const g = r70TMake('Nightstand', 'the nightstand', [{id:uid(), act:'sleep', when:{}}]);
    R70T.last = {};
    const night = r70TRun(g, {});
    const down = !!(state.modes.active && state.modes.active.sleep);
    r70TSleep().bed = Date.now() - 7*3600000 - 12*60000;
    const up = r70TWakeUp();
    const S = r70TSleep();
    return {night:night.say, down:down, up:up, mins:S.minutes, source:S.source, awake:!(state.modes.active && state.modes.active.sleep),
      kept:arr(state.focus.r70Sleeps).length, lastNight:lastNightSleep()};
  `);
  check('47.3 Sleep puts you down for the night', /Goodnight/.test(sleep.night) && sleep.down, sleep);
  check('47.4 Awake saves how long you slept, and says it', sleep.awake && sleep.mins > 420 && sleep.mins < 450 && /in bed at/.test(sleep.up), sleep);
  check('47.4 the number is kept, and the morning reads it', sleep.kept === 1 && sleep.lastNight === sleep.mins && sleep.source === 'tag', sleep);

  // ---- snooze when the alarm is going ----
  const snooze = await ev(`
    const g = r70TagList().find(x => x.name === 'Nightstand');
    state.focus.snooze = {wake:true, ts:Date.now() + 9*60000};
    R70T.last = {};
    const r = r70TRun(g, {});
    state.focus.snooze = null;
    return {say:r.say};
  `);
  check('47.3 the same tag snoozes when the alarm is going', /Snoozed/.test(snooze.say), snooze);

  // ---- 47.4 no tap in the morning: estimated, not lost ----
  const est = await ev(`
    state.focus.r70Sleeps = [];
    const S = r70TSleep(); S.bed = Date.now() - 8*3600000; S.awake = null; S.minutes = 0; S.source = 'tag';
    R70.lastInput = Date.now();
    const h = new Date().getHours();
    S.source = 'estimated'; r70TWakeUp();
    const last = arr(state.focus.r70Sleeps)[0];
    return {source:last && last.source, mins:last && last.minutes};
  `);
  check('47.4 no tap and it still counts, marked estimated', est.source === 'estimated' && est.mins > 400, est);

  // ---- 47.5 the door: out, and a break when you were locked in ----
  const door = await ev(`
    const g = r70TMake('Door', 'by the door', [{id:uid(), act:'out', kind:'training', when:{away:'no'}}, {id:uid(), act:'back', when:{away:'yes'}}]);
    try{ opRunTool('lock_in', {}); }catch(e){}
    R70T.last = {};
    const leave = r70TRun(g, {});
    const as = state.focus.activeSession;
    const onBreak = !!(as && as.onBreak), out = !!r70TOut();
    R70T.last = {};
    state.focus.r70Out.startedAt = Date.now() - 50*60000;
    const home = r70TRun(g, {});
    const back = !!(state.focus.activeSession && !state.focus.activeSession.onBreak);
    const nudge = r70Nudges().some(n => n.kind === 'workout');
    try{ if(state.focus.activeSession) r70LockOutNow(); }catch(e){}
    return {leave:leave.say, onBreak:onBreak, out:out, home:home.say, back:back, nudge:nudge, still:!r70TOut()};
  `);
  check('47.5 leaving while locked in becomes a break, with the reason', door.out && door.onBreak && /on a break until you.re back/i.test(door.leave), door);
  check('47.5 the same tag brings you back, and the session carries on', door.back && door.still && /Welcome back/.test(door.home), door);
  check('47.5 coming back from training leaves a reminder to log it', door.nudge, door);

  // ---- 46 the sticky reminder ----
  const nudge = await ev(`
    r70NudgeClear('workout'); r70NudgeClear('meal'); r70NudgeClear('weigh');
    r70NudgeAdd('meal');
    r70NudgePill();
    const pill = !!document.getElementById('r70Nudge'), txt = (document.getElementById('r70Nudge')||{}).textContent || '';
    r70NudgeAdd('weigh');
    r70NudgePill();
    const stacked = ((document.getElementById('r70Nudge')||{}).textContent || '').indexOf('+1') > 0;
    const dupe = r70NudgeAdd('meal');
    const n = r70Nudges().length;
    r70NudgeClear('meal'); r70NudgeClear('weigh');
    r70NudgePill();
    return {pill:pill, txt:txt, stacked:stacked, noDupe:dupe === null, n:n, gone:!document.getElementById('r70Nudge')};
  `);
  check('46 the pill shows, says the thing in plain words, and stacks', nudge.pill && /Log your meal/.test(nudge.txt) && nudge.stacked, nudge);
  check('46 one per kind, and it goes when you log it', nudge.noDupe && nudge.n === 2 && nudge.gone, nudge);

  // ---- 47.7 weigh-in, from the phone, with the change ----
  const weigh = await ev(`
    const first = r70TRunStep({act:'weigh'}, null, 180);
    const second = r70TRunStep({act:'weigh'}, null, 178.5);
    const asked = r70TRunStep({act:'weigh'}, null, '');
    const n = arr(state.health.weightLog).length;
    const stillNudged = r70Nudges().some(x => x.kind === 'weigh');
    r70NudgeClear('weigh');
    return {first:first, second:second, asked:asked, n:n, stillNudged:stillNudged};
  `);
  check('47.7 a weight saves and says the change from last time', /180/.test(weigh.first) && /Down 1\.5/.test(weigh.second) && weigh.n === 3, weigh);
  check('47.7 no number and it asks instead of failing', /What are you weighing/.test(weigh.asked) && weigh.stillNudged, weigh);

  // ---- 47.6 the kitchen, and the phone's meal picker ----
  const meal = await ev(`
    r70NudgeClear('meal');
    const say = r70TRunStep({act:'meal'}, null);
    const asked = r70Nudges().some(x => x.kind === 'meal');
    const list = r70PhoneApi.phoneMeals();
    const n = arr(state.health.calorieEntries).length;
    const ok = r70PhoneApi.phoneMeal('m1');
    const cleared = !r70Nudges().some(x => x.kind === 'meal');
    return {say:say, asked:asked, top:list[0] && list[0].name, logged:ok && arr(state.health.calorieEntries).length > n, cleared:cleared};
  `);
  check('47.6 the kitchen tag asks, and keeps asking', /What did you eat/.test(meal.say) && meal.asked, meal);
  check('47.6 the phone offers your most-used meals first; one tap logs it', meal.top === 'Chicken and rice' && meal.logged && meal.cleared, meal);

  // ---- 38/39/49 what the phone can ask for ----
  const phone = await ev(`
    const tags = r70PhoneApi.phoneTags(), today = r70PhoneApi.phoneToday();
    const q = r70PhoneApi.phoneQuick('water');
    const ran = r70PhoneApi.phoneRunTag(tags[0] && tags[0].id);
    return {tags:tags.length, named:!!(tags[0] && tags[0].name && tags[0].icon), secretOut:tags.every(t => typeof t.secret === 'string'),
      tasks:Array.isArray(today.tasks), standard:Array.isArray(today.standard), streak:typeof today.streak === 'number',
      nudges:Array.isArray(today.nudges), quick:q.ok, ran:!!(ran && ran.ok)};
  `);
  check('38 the phone can list the tags and run one as a button', phone.tags > 0 && phone.named && phone.ran, phone);
  check('39/49 the phone gets today: tasks, the standard, the streak, what is still to log', phone.tasks && phone.standard && phone.streak && phone.nudges, phone);
  check('39 the quick logs work from the phone', phone.quick, phone);

  // ---- a tap through the link, the way the Mac serves it ----
  const link = await ev(`
    const g = r70TMake('From a link', '', [{id:uid(), act:'water', when:{}}]);
    R70T.last = {};
    const good = r70PhoneApi.phoneTag(g.secret);
    const bad = r70PhoneApi.phoneTag('deadbeef');
    return {good:good.ok, say:good.say, bad:bad.ok, code:bad.code};
  `);
  check('21/22 the secret alone runs the tag; a wrong one is turned away', link.good && !link.bad && link.code === 'unknown', link);

  // ---- 33/47 the starter set ----
  const starters = await ev(`
    state.tags.list = [];
    ACTIONS.r70TStarterAll();
    const names = r70TagList().map(g => g.name);
    const desk = r70TagList().find(g => g.starter === 'desk');
    const door = r70TagList().find(g => g.starter === 'door');
    const off = R70T_STARTERS.filter(s => s.off).map(s => s.name);
    return {names:names, n:names.length, deskSteps:desk ? desk.steps.length : 0,
      deskRules:!!(desk && desk.steps[0].when.locked === 'out' && desk.steps[1].when.locked === 'in'),
      doorRules:!!(door && door.steps[0].when.away === 'no' && door.steps[1].when.away === 'yes'),
      extras:off.length, noneOfTheExtras:off.every(n => names.indexOf(n) < 0), secrets:new Set(r70TagList().map(g => g.secret)).size};
  `);
  check('47 the starter set goes in in one tap: Desk, Break, Sleep, Awake, Door, Kitchen, Weigh-in, Talk to Op', starters.n === 8 && starters.secrets === 8, starters);
  check('47.1 Desk is a toggle out of the box', starters.deskSteps === 2 && starters.deskRules, starters);
  check('47.5 so is the Door', starters.doorRules, starters);
  check('47 Gym bag, Reading chair, Phone box and Add a task ship but stay off', starters.extras === 4 && starters.noneOfTheExtras, starters);

  // ---- 30/31/32/35 the wizard, and the card ----
  const wiz = await ev(`
    ui.view = 'settings'; ui.settingsTab = 'tags';
    ACTIONS.r70TWizOpen();
    const one = r70TWizHtml();
    ACTIONS.r70TWizPick(null, null, 'lockin'); ACTIONS.r70TWizPick(null, null, 'lockout');
    const picked = ui.r70TWiz.picks.length, named = ui.r70TWiz.name;
    ACTIONS.r70TWizStep(null, null, '2');
    const two = r70TWizHtml();
    ACTIONS.r70TWizStep(null, null, '3');
    const three = r70TWizHtml();
    const g = r70TagById(ui.r70TWiz.made);
    const rules = !!(g && g.steps[0].when.locked === 'out' && g.steps[1].when.locked === 'in');
    const waiting = three.indexOf('Tap your tag now') > 0;
    g.lastTap = Date.now(); g.lastSay = 'Locked in.';
    const heard = r70TWizHtml().indexOf('Heard it') > 0;
    ACTIONS.r70TWizDone();
    return {one:one.indexOf('r70TWizPick') > 0, picked:picked, named:named, two:two.indexOf('r70TWizName') > 0,
      how:two.indexOf('Hands-free') > 0, three:three.indexOf('/t/') > 0, qr:three.indexOf('<svg') > 0,
      rules:rules, waiting:waiting, heard:heard, shut:!ui.r70TWiz, opened:!!ui.r70TOpen};
  `);
  check('30 the wizard: pick what it does, several at once', wiz.one && wiz.picked === 2 && !!wiz.named, wiz);
  check('30 then a name, a suggested place, and tap-and-open or hands-free', wiz.two && wiz.how, wiz);
  check('35 then the link and a QR of it, nothing to type', wiz.three && wiz.qr, wiz);
  check('30 it writes the toggle rules for you', wiz.rules, wiz);
  check('30 "Tap your tag now" turns into "Heard it" when the tap lands', wiz.waiting && wiz.heard && wiz.shut && wiz.opened, wiz);

  // ---- 19/31/32/34 the settings page itself ----
  const settings = await ev(`
    ui.view = 'settings'; ui.settingsTab = 'tags';
    const h = renderSettings();
    const body = r70TSettingsHtml();
    return {tab:h.indexOf('data-tab="tags"') > 0, panel:h.indexOf('settings-tags') > 0,
      list:body.indexOf('r70t-card') > 0, check:body.indexOf('r70t-check') > 0,
      copy:(function(){ ui.r70TOpen = r70TagList()[0].id; const b = r70TSettingsHtml(); ui.r70TOpen = null; return b.indexOf('r70TCopy') > 0 && b.indexOf('r70TTest') > 0 && b.indexOf('r70TNewLink') > 0 && b.indexOf('r70TDupe') > 0; })(),
      away:body.indexOf('Tailscale') > 0, speak:body.indexOf('r70TSpeak') > 0};
  `);
  check('19 Settings → Tags, with every tag on it', settings.tab && settings.panel && settings.list, settings);
  check('34 the ready-to-tap check is at the top', settings.check, settings);
  check('31/32/27 Test it now, Copy, Duplicate and New link on every card', settings.copy, settings);
  check('44/42 away from home, and where Op speaks', settings.away && settings.speak, settings);

  // ---- 36/40 what Op can do, and what he knows ----
  const opside = await ev(`
    const tools = ['list_tags','create_tag','run_tag','tag_status','tags_help'].filter(n => OP_TOOLS.some(t => t.name === n));
    const list = opRunTool('list_tags');
    const out = opRunTool('create_tag', {name:'From Op', place:'the hallway', steps:[{act:'lockin', when:{locked:'out'}}, {act:'nope'}]});
    const g = r70TFind('From Op');
    const ran = opRunTool('run_tag', {name:'From Op'});
    const status = opRunTool('tag_status');
    const help = opRunTool('tags_help', {});
    let threw = ''; try{ opRunTool('run_tag', {name:'nothing like this'}); }catch(e){ threw = e.message; }
    const sys = aiSystem();
    const sysText = typeof sys === 'string' ? sys : sys.map(b => b.text || '').join(' ');
    try{ if(state.focus.activeSession) r70LockOutNow(); }catch(e){}
    return {tools:tools.length, list:/Desk/.test(list), made:/From Op/.test(out), oneStep:g && g.steps.length === 1,
      ran:typeof ran === 'string', status:/phone server/i.test(status), help:help.length > 10, threw:/no tag called/.test(threw),
      knows:/TAGS HE TAPPED TODAY|slept/.test(sysText)};
  `);
  check('36/40 Op can list, make, run and check the tags', opside.tools === 5 && opside.list && opside.made && opside.ran, opside);
  check('36 a step that isn\'t in the catalog is dropped, not run', opside.oneStep, opside);
  check('36 tag_status and tags_help say the next real step', opside.status && opside.help && opside.threw, opside);
  check('43 Op knows what you tapped and how you slept', opside.knows, opside);

  // ---- 45 one host, and it says when it changed ----
  const host = await ev(`
    r70Tags().tailnet = 'andre-mac.tailnet.ts.net'; r70Tags().tailserve = true;
    const tail = r70TLink(r70TagList()[0]);
    delete r70Tags().tailnet; delete r70Tags().tailserve;
    r70Tags().host = 'andre-mac.local';
    ui.r68Phone = null;
    const wifi = r70TLink(r70TagList()[0]);
    r70Tags().lastBase = 'http://192.168.1.9:8940';
    r70THostWatch();
    const moved = r70Tags().lastBase;
    return {tail:tail, wifi:wifi, oneHost:tail.indexOf('192.168') < 0, moved:moved};
  `);
  check('44 with Tailscale on, every link uses the tailnet', /^https:\/\/andre-mac\.tailnet/.test(host.tail), host);
  check('45 one host at a time, never a mix', /^http:\/\/andre-mac\.local:8940/.test(host.wifi) && host.oneHost, host);
  check('45 a changed address is noticed', host.moved === 'http://andre-mac.local:8940', host);

  // ---- 44/45 away from home: one address, and the pairing card uses it too ----
  const away = await ev(`
    const T = r70Tags();
    // (the card draws nothing without the Mac bridge, so stand one up)
    if(!window.operatorApp) window.operatorApp = {phoneInfo:function(){ return Promise.resolve({on:true, url:'http://192.168.1.9:8940', code:'123456'}); }};
    ui.r68Phone = {on:true, url:'http://192.168.1.9:8940', code:'123456'};
    delete T.tailnet; delete T.tailserve;
    const wifi = r70TBase(), card0 = r68PhoneCardHtml();
    T.tailnet = 'andre-mac.tail1234.ts.net'; T.tailserve = false;
    const plain = r70TBase();
    T.tailserve = true;
    const served = r70TBase(), card1 = r68PhoneCardHtml();
    delete T.tailnet; delete T.tailserve; ui.r68Phone = null;
    return {wifi:wifi, plain:plain, served:served,
      cardWifi:card0.indexOf('192.168.1.9') > 0 && card0.indexOf('r70t-away') < 0,
      cardAway:card1.indexOf('tail1234.ts.net') > 0 && card1.indexOf('r70t-away') > 0,
      keepsWifi:card1.indexOf('192.168.1.9') > 0};
  `);
  check('45 no Tailscale: the Wi-Fi address', away.wifi === 'http://192.168.1.9:8940', away);
  check('44 plain Tailscale reaches it on its own port', away.plain === 'http://andre-mac.tail1234.ts.net:8940', away);
  check('44 tailscale serve: https, no port (what the mic needs)', away.served === 'https://andre-mac.tail1234.ts.net', away);
  check('44 the pairing QR uses the away address, and still says what the Wi-Fi one is', away.cardWifi && away.cardAway && away.keepsWifi, away);

  // ---- nothing threw ----
  await ev(`renderView(); ui.view='settings'; ui.settingsTab='tags'; renderView(); ui.view='today'; renderView(); return 1;`);
  await page.waitForTimeout(400);
  check('no page errors', page.errors.length === 0, page.errors.slice(0, 6));

  await browser.close();
  process.exit(report() ? 1 : 0);
})();

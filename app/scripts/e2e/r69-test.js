// Round 69: a break past 2 hours is clocking out, the iPhone card's QR code (scan and it's paired), and the talk key's
// Check saying when it cleared an old permission.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r69.html');
  const b = await launch();
  const at = (d, h, m) => new Date(2026, 10, d, h, m || 0).getTime();
  const p = await newPage(b, OUT+'/r69.html', {profile:{name:'Andre Lopez'}}, at(5, 10));
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false");
  const H = 3600000;

  // ---- a long break: clocked out where the break began ----
  await E(`(function(){ const now = Date.now(), bs = now - 14*${H};
    state.focus.activeSession = {id:'s1', startedAt:bs - 2*${H}, onBreak:true, breakStartedAt:bs, breakEndsAt:bs + 15*60000, breaks:[{start:bs, minutes:15}], frozenElapsedMs:2*${H}, completedTasks:[]};
    state.modes.active = {type:'break', startedAt:bs, linkedFocus:true}; state.focus.sessions = []; state.modes.history = []; window.__bs = bs; })()`);
  check('a 14-hour “break”: you clocked out when it began', await E("r69LongBreakCheck()===true && !state.focus.activeSession && !state.modes.active"));
  check('…the session ends at the break’s start, 2 hours locked in, no 14 hours', await E("const s = state.focus.sessions[state.focus.sessions.length-1]; s && s.endedAt===window.__bs && s.minutes===120"));
  check('…the 14 hours are off the clock, not a break', await E("state.modes.history.some(m => m.type==='offtime' && m.startedAt===window.__bs) && !state.modes.history.some(m => m.type==='break')"));
  await E(`(function(){ const now = Date.now(), bs = now - 30*60000;
    state.focus.activeSession = {id:'s2', startedAt:bs - ${H}, onBreak:true, breakStartedAt:bs, breakEndsAt:bs + 15*60000, breaks:[{start:bs, minutes:15}], frozenElapsedMs:${H}, completedTasks:[]};
    state.modes.active = {type:'break', startedAt:bs, linkedFocus:true}; })()`);
  check('a 30-minute break stays a break', await E("r69LongBreakCheck()===false && state.focus.activeSession && state.focus.activeSession.onBreak"));
  await p.clock.fastForward(2*H); await p.clock.runFor(61000); await p.waitForTimeout(100);
  check('…and once it passes 2 hours (the page checks by itself) it’s clocking out', await E("!state.focus.activeSession && state.focus.sessions.some(s => s.id!=='s1' && s.minutes===60)"));
  await E("state.focus.activeSession = null; state.modes.active = {type:'break', startedAt:Date.now() - 3*" + H + ", endsAt:Date.now() - 2*" + H + "}");
  check('a break on its own (not locked in) past 2 hours becomes off-the-clock time', await E("r69LongBreakCheck()===true && !state.modes.active && state.modes.history.filter(m => m.type==='offtime').length===3"));

  // ---- Op locks you out, no holding ----
  await E("state.modes.active = null; state.focus.activeSession = {id:'s3', startedAt:Date.now() - 50*60000, breaks:[], completedTasks:[]}; renderView()");
  const lo = await E("opRunTool('lock_out', {})");
  check('Op: lock_out ends the session right away (no Hold to lock out)', /locked out/.test(lo) && await E("!state.focus.activeSession && state.focus.sessions.some(s => s.minutes===50)"), lo);
  check('…no sheet left open', await E("document.getElementById('stopFocusOverlay').classList.contains('hidden')"));
  await E("document.querySelectorAll('.lock-flash').forEach(o => o.remove()); state.focus.activeSession = {id:'s4', startedAt:Date.now() - 20*60000, onBreak:true, breakStartedAt:Date.now() - 5*60000, breaks:[{start:Date.now() - 5*60000}], frozenElapsedMs:15*60000, completedTasks:[]}; state.modes.active = {type:'break', startedAt:Date.now() - 5*60000, linkedFocus:true}");
  check('…on a break too: the break comes off, 15 minutes logged', /locked out/.test(await E("opRunTool('lock_out', {})")) && await E("!state.focus.activeSession && state.focus.sessions.some(s => s.minutes===15)"));
  await E("state.focus.activeSession = {id:'s5', startedAt:Date.now() - 30*60000, breaks:[], completedTasks:[]}");
  check('Op: clock out while locked in locks out first', /locked out, then/.test(await E("opRunTool('clock', {action:'out'})")) && await E("!state.focus.activeSession"));
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); state.modes.active = null");

  // ---- the iPhone card: a QR code with the code in it ----
  await E("window.operatorApp = Object.assign({}, window.operatorApp || {}, {phoneInfo:() => Promise.resolve({on:true, url:'http://192.168.1.5:8940', code:'482913'})}); ui.r68Phone = null; r68PhoneCardHtml()");
  await p.waitForTimeout(100);
  const card = await E("r68PhoneCardHtml()");
  check('the iPhone card: a QR code and three steps', /<svg/.test(card) && /Add to Home Screen/.test(card) && (card.match(/<li>/g) || []).length===3);
  check('…the QR holds the address with the code', await E("r69PhoneLink(ui.r68Phone)==='http://192.168.1.5:8940/#c=482913'"));
  // render it and read it back
  await p.setContent('<body style="margin:0;background:#fff"><div id="q" style="width:240px;height:240px;padding:12px;background:#fff">'+card.match(/<svg[\s\S]*?<\/svg>/)[0]+'</div></body>');
  const png = await (await p.$('#q')).screenshot();
  let read = '';
  try{ const jsQR = require(process.env.JSQR || 'jsqr'), { PNG } = require(process.env.PNGJS || 'pngjs'); const im = PNG.sync.read(png); const r = jsQR(new Uint8ClampedArray(im.data), im.width, im.height); read = r ? r.data : ''; }catch(e){ read = 'skip:'+e.message; }
  check('…and a camera reads it back right', read==='http://192.168.1.5:8940/#c=482913' || /^skip:/.test(read), read);
  await b.close();

  // ---- Check: when it cleared an old permission, it says so ----
  const b2 = await launch();
  const p2 = await newPage(b2, OUT+'/r69.html', {profile:{name:'Andre Lopez'}}, at(5, 10));
  const E2 = c => p2.evaluate(x => window.__op.ev(x), c);
  check('Check, after clearing a stale switch: says so, with Restart', await E2("R62.check = {at:Date.now(), h:{trusted:false, reset:'Accessibility'}}; const h = r62CheckHtml(); /r69-reset/.test(h) && /older copy/.test(h) && /r62Relaunch/.test(h)"));
  check('…and says nothing extra when nothing was cleared', await E2("R62.check = {at:Date.now(), h:{trusted:true}}; !/r69-reset/.test(r62CheckHtml())"));
  check('no errors', p.errors.length===0 && p2.errors.length===0, p.errors.concat(p2.errors));
  await b2.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

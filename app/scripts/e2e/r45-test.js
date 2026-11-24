// Round 45 (build 5): Op. On/off, quiet while you work, "I'm busy", the wrap-up and goodnight, push to talk,
// no memory list, and the live ElevenLabs agent (against a stand-in server).
const { instrument, newPage, check, report, OUT } = require('./common.js');
const { chromium } = require('playwright');
const fs = require('fs');
function chromePath(){ try{ const d = fs.readdirSync('/opt/pw-browsers').filter(n => /^chromium-\d+$/.test(n)).sort().pop(); for(const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome']){ const f = '/opt/pw-browsers/'+d+'/'+sub; if(fs.existsSync(f)) return f; } }catch(e){} return undefined; }
(async () => {
  instrument(process.argv[2], OUT+'/r45.html');
  const b = await chromium.launch({args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const T = new Date(2026, 9, 26, 11, 0).getTime();   // Mon Oct 26, work hours
  const p = await newPage(b, OUT+'/r45.html', {profile:{name:'Andre Lopez', xpBook:43, xpLevel:0, opMemory:[{id:'m1', text:'Andre runs a video agency.', at:1}]},
    tasks:{items:[{id:'t1', title:'Edit JJS reel', status:'done', completedAt:'2026-10-26'}, {id:'t2', title:'Send Kiko invoice', status:'today'}]},
    focus:{wake:{voice:false, enabled:true, time:'07:30', days:[0,1,2,3,4,5,6]}}}, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  const bub = async () => (await p.$('#opBubText')) ? (await p.textContent('#opBubText')) : '';
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; ui.view='today'; renderView()"); await p.waitForTimeout(300);

  // on / off
  await E("ACTIONS.opPower()");
  await E("opNotify('Off test line.')"); await p.waitForTimeout(100);
  check('off: he says nothing, and his light dims', !(await E("opOn()")) && !/Off test line/.test(await bub()) && await E("document.body.classList.contains('op-off')"));
  await E("ACTIONS.opLightTap()");
  check('tapping the light turns him back on', await E("opOn()") && !(await E("document.body.classList.contains('op-off')")));

  // quiet while you work
  await E("OPX.userAt = 0; state.focus.activeSession = {startedAt:Date.now() - 50*60000, plannedMinutes:90, completedTasks:[], breaks:[], onBreak:false}; renderView()");
  await E("opNotify('Edit JJS reel is due today and it’s still open.')"); await p.waitForTimeout(100);
  check('locked in: he says nothing, and nothing waits for later (round 54)', !/still open/.test(await bub()) && await E("OPX.held.length")===0 && !(await E("typeof opPressDue==='function' ? opPressDue() : false")));
  check('…and the light shows nothing waiting', !(await E("document.getElementById('opLight').classList.contains('has-held')")));
  await E("OPX.userAt = Date.now(); opNotify('Answering you.')"); await p.waitForTimeout(100);
  check('talk to him while locked in and he answers', /Answering you/.test(await bub()));
  await E("OPX.userAt = 0; state.focus.activeSession = null; renderView()"); await p.waitForTimeout(6000);
  check('come out of it: what he’d have said is gone, not dumped on you', !/still open/.test(await bub()) && await E("OPX.held.length")===0, await bub());

  // I'm busy
  const says = JSON.parse(await E("JSON.stringify(['I’m busy', 'im on a call', 'busy, give me 30 min', 'not now', 'I’m busy tomorrow at 3, add a meeting', 'what’s next'].map(t => [opBusySays(t), opBusyMins(t)]))"));
  check('he hears busy (and how long), not a request that happens to say busy', says[0][0] && says[1][0] && says[2][0] && says[2][1]===30 && says[3][0] && !says[4][0] && !says[5][0], says);
  await E("const a = acct(); a.log.push({id:'ck1', status:'pending', at:Date.now(), date:todayStr(), facts:{}}); a.pending = {id:'ck1', stage:'ping', at:Date.now()}");
  await E("aiAsk('I’m busy, on a call')"); await p.waitForTimeout(150);
  check('“I’m busy” settles the check-in as a real reason', await E("acct().log.find(e => e.id==='ck1').status")==='excused' && await E("acct().pending")===null && await E("acct().log.find(e => e.id==='ck1').why")==='Busy');
  check('…and he backs off for an hour', await E("Math.round((state.focus.opBusyUntil - Date.now())/60000)")===60 && /Back in 1 hour/.test(await bub()));
  await E("OPX.userAt = 0; opNotify('Busy test line.')");
  check('while you’re busy he says nothing', !/Busy test line/.test(await bub()) && !(await E("OPX.held.some(h => /Busy test/.test(h.t))")));
  await E("ACTIONS.opBusyEnd()");
  check('Busy has a way back', !(await E("opBusyNow()")));
  check('the bubble has Busy and the off switch', !!(await p.$('#opBub .op-bub-busy')) && !!(await p.$('#opBub .op-bub-pw')));

  // wrap-up and goodnight
  await E("OPX.held = []; OPX.userAt = 0; workDayState().wrapSaid = 0; opNotify('That’s the end of your work hours. Wrap up what you’re on, then clock out.')"); await p.waitForTimeout(300);
  const wrap = await bub();
  check('end of work hours: no scripted wrap-up (round 54 taps in instead)', !/That’s the day/.test(wrap), wrap);
  await E("opCaption('x'); opWrapUp('clockout')"); await p.waitForTimeout(200);
  check('…once a day', !/That’s the day/.test(await bub()));
  await E("opGoodnight()"); await p.waitForTimeout(300);
  check('going to sleep: goodnight, with the alarm', /Goodnight, see you then/.test(await bub()) /* (round 57: “Goodnight, see you then”, as asked) */ && /7:30 AM/.test(await bub()), await bub());

  // settings: no memory list; the switch, talking, live
  await E("ui.view='settings'; ui.settingsTab='connections'; renderView()"); await p.waitForTimeout(200);
  const sh = await E("opSettingsHtml()");
  check('Settings: what he remembers is gone from the screen (the memory still works)', !/What Op remembers/.test(sh) && !/Andre runs a video agency/.test(sh) && await E("opMemory().length")===1);
  check('Settings: the switch, how you talk, quiet while you work, live', /r45-pw/.test(sh) && /Hands-free/.test(sh) && /Push to talk/.test(sh) && /Quiet while you work/.test(sh) && /Live conversation/.test(sh));

  // (push to talk and live conversation: round 54 replaced them with the talk key and one voice; see r54-test)
  await p.screenshot({path:OUT+'/r45-op.png'});
  check('no page errors (round 45)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();

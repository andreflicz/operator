// Work vs not-work apps/sites, auto lock-in (backdated, no prompt), auto end, the activity
// pill, and the end-of-day recap.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const T0 = new Date(2026,9,8,10,0).getTime();
(async () => {
  instrument(process.argv[2], OUT+'/ac.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/ac.html', {profile:{name:'Andre'}, settings:{appTracking:{enabled:true, autoLockIn:true, thresholdMinutes:12, graceMinutes:3, cooldownMinutes:15, idleSeconds:60}}}, T0);
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  let log = '';
  const add = (fromMin, toMin, app, site) => { for(let m=fromMin; m<=toMin; m+=1/6){ log += Math.round(T0+m*60000)+'\t'+app+'\t0\t'+(site||'')+'\n'; } };
  await p.route('http://127.0.0.1:8934/**', r => r.fulfill({status:200, body:log, headers:{'Access-Control-Allow-Origin':'*'}}));
  const poll = async (atMin) => { await p.clock.setSystemTime(T0+atMin*60000+1000); await E('pollAppActivity()'); await p.waitForTimeout(60); };
  check('log lines with a site parse to the site', await E("JSON.stringify(parseActivityLogText('1\\tGoogle Chrome\\t0\\tyoutube.com\\n2\\tFinal Cut Pro\\t0\\n').map(s=>s.app+'|'+(s.via||'')))")==='["youtube.com|Google Chrome","Final Cut Pro|"]');
  // 15 min of YouTube: not work, no lock-in
  add(0, 15, 'Google Chrome', 'youtube.com');
  await poll(15);
  check('not-work site never auto-locks in', !(await E("!!state.focus.activeSession")));
  check('pill shows the site', (await p.textContent('#activityPill')).includes('youtube.com') && await p.isVisible('#activityPill'));
  check('pill is visible with the sidebar closed', await (async()=>{ await E("state.profile.sidebarCollapsed=true; applySidebarState(); renderView()"); return p.isVisible('#activityPill'); })());
  // 13 min of Final Cut Pro (work by default): locks in, backdated
  add(15.2, 28.2, 'Final Cut Pro');
  await poll(28.2);
  check('work app for 12+ min locks in automatically', await E("!!state.focus.activeSession && state.focus.activeSession.autoStarted"));
  check('session is dated back to when the work started', Math.abs(await E("state.focus.activeSession.startedAt") - (T0+15.2*60000)) < 30000);
  check('no prompt — just a toast', !(await p.isVisible('.overlay:not(.hidden)')) && (await p.textContent('#toastContainer')).includes('Locked in automatically'));
  // a quick Operator check (neutral) doesn't end it
  add(28.4, 30, 'Google Chrome', 'Operator');
  await poll(30);
  check('glancing at Operator keeps the session going', await E("!!state.focus.activeSession"));
  // Messages for 4 min: ends at the last work moment
  add(30.2, 34.5, 'Messages');
  await poll(34.5);
  const sess = await E("state.focus.sessions[state.focus.sessions.length-1]");
  check('moving off work apps ends it', !(await E("!!state.focus.activeSession")) && !!sess);
  check('ended at the last work moment', sess && Math.abs(sess.endedAt-(T0+28.2*60000)) < 30000 && sess.minutes===13, sess);
  check('marked as auto, to review', sess && sess.auto===true && sess.reviewed===false);
  // pill menu: mark YouTube as work
  add(34.7, 36, 'Google Chrome', 'youtube.com');
  await poll(36);
  await p.click('#activityPill');
  check('pill menu asks "is this work?"', await p.isVisible('#activityPillMenu') && (await p.textContent('#activityPillMenu')).includes('youtube.com'));
  await p.click('#activityPillMenu [data-action="pillSetCat"][data-id="work"]');
  check('site marked as work', await E("activityCategory('youtube.com')")==='work');
  // settings list
  await E("ui.pillMenu=null; renderPillMenu(); ui.view='settings'; ui.settingsTab='focus'; renderView()");
  check('settings lists apps & sites to sort', await p.isVisible('#workAppsSection') && (await p.textContent('#workAppsSection')).includes('Messages'));
  await p.click('#workAppsSection [data-name="Messages"][data-id="other"]');
  check('sorting from settings', await E("activityCategory('Messages')")==='other');
  // recap
  await E("openDayRecap(todayStr())");
  check('recap shows the day', await p.isVisible('#recapOverlay .rc-stats') && (await p.textContent('#recapOverlay')).includes('Final Cut Pro'));
  check('recap lists the auto session to check', (await p.$$('.rc-sess.is-pending')).length===1);
  await p.click('[data-action="recapApproveAll"]');
  check('keep all marks them reviewed', await E("state.focus.sessions.every(s=>!s.auto || s.reviewed)") && !(await p.isVisible('#recapOverlay')));
  // recap pops up the next morning when yesterday has unchecked auto sessions
  await E("state.focus.sessions.push({id:'old', type:'deep', date:addDays(todayStr(),-1), startedAt:Date.now()-86400000, endedAt:Date.now()-86400000+3600000, minutes:60, completedTasks:[], auto:true, reviewed:false}); delete state.focus.recapSeen[addDays(todayStr(),-1)]; maybeShowRecap()");
  check('yesterday\'s recap pops up if sessions need checking', await p.isVisible('#recapOverlay') && (await p.textContent('#recapOverlay')).includes('Yesterday'));
  await p.click('#recapOverlay [data-action="recapDiscard"][data-id="old"]');
  check('discard removes a session (undo available)', !(await E("state.focus.sessions.some(s=>s.id==='old')")) && (await p.textContent('#toastContainer')).includes('Undo'));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();

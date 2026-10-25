// Round 44c: holiday takeovers and the birthday.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r44c.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r44c.html', {profile:{name:'Andre Lopez', xpBook:43, xpLevel:0, birthday:'1998-03-14'}}, new Date(2026,9,25,11,0).getTime());
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='today'; renderView()"); await p.waitForTimeout(400);
  check('Oct 25 is Halloween week: the app takes it on', await E("document.documentElement.getAttribute('data-holiday')")==='halloween' && !!(await p.$('#holFx .hx-bat')) && /Scary-good week, Andre/.test(await p.textContent('#viewRoot')));
  await p.screenshot({path:OUT+'/r44-halloween.png'});
  check('Thanksgiving is the week of the 4th Thursday', await E("holThanksgiving(2026)")==='2026-11-26' && await E("holToday('2026-11-23')")==='thanksgiving' && await E("holToday('2026-11-30')")===null);
  check('Christmas Dec 18 – 26', await E("holToday('2026-12-20')")==='christmas' && await E("holToday('2026-12-27')")===null);
  check('the app knows your birthday and your age', await E("holToday('2027-03-14')")==='birthday' && await E("holAge()")===28);
  for(const h of ['thanksgiving', 'christmas', 'birthday']){ await E("ui.holPreview='"+h+"'; renderView()"); await p.waitForTimeout(500); await p.screenshot({path:OUT+'/r44-'+h+'.png'}); }
  check('the birthday banner says how old', /Happy 28th, Andre/.test(await p.textContent('#viewRoot')) && !!(await p.$('#holFx .hx-bal')));
  await E("ui.holPreview=null; state.profile.holidayMode='colors'; renderView()"); await p.waitForTimeout(200);
  check('Colors only: no moving layer', await E("document.documentElement.getAttribute('data-holiday')")==='halloween' && !(await p.$('#holFx')));
  await E("state.profile.holidayMode='off'; renderView()"); await p.waitForTimeout(200);
  check('Off: back to normal', !(await E("document.documentElement.getAttribute('data-holiday')")));
  await E("ui.view='settings'; ui.settingsTab='look'; renderView()"); await p.waitForTimeout(200);
  check('Settings has the holiday options and your birthday', !!(await p.$('[data-action="holMode"]')) && !!(await p.$('#holBirthday')));
  check('no page errors (round 44c)', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();

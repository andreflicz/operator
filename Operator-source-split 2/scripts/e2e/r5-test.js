// Round 5: locked-in clock fits its card past an hour, themes (dark / light / auto by day & night),
// sky + scenes, leads/clients/tasks carousel layout, board backgrounds, right-click menu, touch upgrades.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r5.html');
  const b = await launch();
  const NOW = new Date(2026,9,8,15,0).getTime();
  const tasks = {items:[{id:'t1', title:'Edit Nina reel #2', status:'today', priority:'high', clients:['personal']}]};

  // ---- locked-in clock ----
  for(const [mins, label] of [[95, '1h35'], [660, '11h']]){
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre'}, tasks, focus:{activeSession:{startedAt:NOW-mins*60000, breaks:[], onBreak:false, completedTasks:[]}}}, NOW);
    await p.clock.runFor(2500);
    const t = await p.evaluate(() => { const e = document.getElementById('focusElapsed'); return {text:e.textContent, fits:e.scrollWidth <= e.clientWidth+1, long:e.classList.contains('has-hours')}; });
    check('locked in '+label+': the clock fits inside its card', t.fits && t.long, t);
    check('…and reads without a leading zero', /^1?\d:\d\d:\d\d$/.test(t.text) && !/^0/.test(t.text), t.text);
    await p.context().close();
  }
  {
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre'}, tasks, focus:{activeSession:{startedAt:NOW-(59*60000+57000), breaks:[], onBreak:false, completedTasks:[]}}}, NOW);
    const before = await p.evaluate(() => document.getElementById('focusElapsed').classList.contains('has-hours'));
    await p.clock.runFor(5000);
    const after = await p.evaluate(() => { const e = document.getElementById('focusElapsed'); return {text:e.textContent, long:e.classList.contains('has-hours')}; });
    check('crossing the hour mark switches the clock to its hours size live', !before && after.long && after.text.startsWith('1:00:0'), {before, after});
    await p.context().close();
  }

  // ---- themes: dark / light / auto (light while the sun is up) ----
  {
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre', theme:'light'}, tasks}, NOW);
    check('light theme is on before the app even renders (no dark flash)', await p.evaluate(() => document.documentElement.getAttribute('data-theme'))==='light');
    check('…and the page is actually light', await p.evaluate(() => getComputedStyle(document.body).backgroundColor)==='rgb(243, 244, 247)');
    await p.evaluate(() => window.__op.ev("ACTIONS.setTheme(null, null, 'dark')"));
    await p.waitForTimeout(400);
    check('switching to dark from settings applies at once', await p.evaluate(() => document.documentElement.getAttribute('data-theme')==='dark' && getComputedStyle(document.body).backgroundColor==='rgb(11, 13, 18)'));
    check('…and is remembered', await p.evaluate(() => JSON.parse(localStorage.getItem('opsdash:profile')).theme)==='dark');
    await p.click('[data-action="nav"][data-view="settings"]'); await p.click('[data-action="settingsTab"][data-tab="display"]');
    await p.click('[data-action="setTheme"][data-id="auto"]'); await p.waitForTimeout(300);
    check('Auto at 3 PM (default 7 AM–7 PM) is light', await p.evaluate(() => document.documentElement.getAttribute('data-theme'))==='light');
    check('Auto shows the day / night times to edit', await p.isVisible('#setDayStart') && await p.isVisible('#setNightStart'));
    await p.fill('#setNightStart', '14:30'); await p.dispatchEvent('#setNightStart', 'change'); await p.waitForTimeout(400);
    check('…moving "night starts" before now flips it to dark', await p.evaluate(() => document.documentElement.getAttribute('data-theme'))==='dark');
    const sun = await p.evaluate(() => window.__op.ev("(function(){ state.settings.weather = Object.assign(state.settings.weather||{}, {lat:40.71, lon:-74.0, place:'New York'}); const w = dayWindow(new Date(2026,9,8,12)); return w; })()"));
    check('with a location, auto follows the real sunrise / sunset', sun.real && sun.rise > 0 && sun.set > sun.rise, sun);
    await p.context().close();
  }
  {
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre', theme:'auto'}, tasks}, new Date(2026,9,8,18,58).getTime());
    check('Auto before 7 PM: light', await p.evaluate(() => document.documentElement.getAttribute('data-theme'))==='light');
    await p.clock.runFor(3*60*1000); await p.waitForTimeout(500);
    check('…turns dark on its own once the night starts', await p.evaluate(() => document.documentElement.getAttribute('data-theme'))==='dark');
    await p.context().close();
  }

  // ---- sky chip, weather and scenes ----
  {
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre'}, tasks}, new Date(2026,9,8,18,20).getTime());
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    check('Today shows what it looks like outside (golden hour before sunset)', /Golden hour/.test(await p.textContent('.sky-chip')) && await p.getAttribute('.today-hero', 'data-sky')==='golden');
    // the weather service, stubbed (no internet in the test box)
    await p.evaluate(() => { window.fetch = async (u) => ({ ok:true, json: async () => /geocoding/.test(u)
      ? {results:[{name:'Brooklyn', admin1:'New York', country_code:'US', latitude:40.65, longitude:-73.95}]}
      : {current:{temperature_2m:61.4, apparent_temperature:59, weather_code:63, is_day:1, cloud_cover:90, wind_speed_10m:8}, daily:{temperature_2m_max:[66], temperature_2m_min:[52]}} }); });
    await p.click('[data-action="nav"][data-view="settings"]'); await p.click('[data-action="settingsTab"][data-tab="display"]');
    await p.fill('#wxQuery', 'Brooklyn'); await p.click('[data-action="wxSearch"]'); await p.waitForTimeout(200);
    await p.click('.wx-result'); await p.waitForTimeout(400);
    const wx = await E("state.settings.weather");
    check('picking a city saves the place and pulls the weather', wx.place==='Brooklyn, New York' && wx.current && wx.current.temp===61 && wx.current.code===63, wx);
    await p.click('[data-action="nav"][data-view="today"]'); await p.waitForTimeout(150);
    const chip = await p.textContent('.sky-chip');
    check('…and Today shows it (61°, rain)', /61°/.test(chip) && /rain/.test(chip), chip);
    // scenes
    await p.click('[data-action="nav"][data-view="settings"]'); await p.click('[data-action="settingsTab"][data-tab="display"]');
    check('scene picker shows a live preview of each scene', (await p.$$eval('.scene-thumb', els => els.filter(e => /url\("?data:image/.test(e.style.backgroundImage)).length)) >= 6);
    await p.click('[data-action="setScene"][data-id="city"]'); await p.waitForTimeout(300);
    const sc = await p.evaluate(() => ({has:document.body.classList.contains('has-scene'), bg:(document.getElementById('sceneBg')||{}).width||0, fx:!!document.getElementById('sceneFx'), panel:getComputedStyle(document.querySelector('.card')).backgroundColor}));
    check('choosing City paints a scene behind the app', sc.has && sc.bg > 0 && sc.fx, sc);
    check('…with see-through panels', /rgba\(.*0\.86\)/.test(sc.panel), sc.panel);
    check('…remembered', (await E("JSON.parse(localStorage.getItem('opsdash:profile')).scene"))==='city');
    await E("window.dispatchEvent(new Event('blur'))");
    check('the scene stops animating when Operator isn\'t the window in front', (await E("SC.running"))===false);
    for(const id of ['sky','space','mountains','tokyo','snow']){ await p.click('[data-action="setScene"][data-id="'+id+'"]'); await p.waitForTimeout(120); }
    check('every scene paints without errors', !p.errors.length && (await E("SC.x && SC.x.id"))==='snow', p.errors);
    await p.click('[data-action="setScene"][data-id="minimal"]'); await p.waitForTimeout(150);
    check('Minimal removes the scene completely', await p.evaluate(() => !document.getElementById('sceneBg') && !document.body.classList.contains('has-scene')));
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

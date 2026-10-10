// Round 5: locked-in clock fits its card past an hour, themes (dark / light / auto by day & night),
// sky + scenes, leads/clients/tasks carousel layout, board backgrounds, right-click menu, touch upgrades.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r5.html');
  const b = await launch();
  const NOW = new Date(2026,9,8,15,0).getTime();
  // round 13: settings are 5 groups in the side nav (display/sound → 'look', business → 'work')
  const settingsGroup = async (p, grp) => { await p.click('[data-action="nav"][data-view="settings"]'); await p.click('.settings-sidenav [data-action="settingsTab"][data-tab="'+grp+'"]'); await p.waitForTimeout(60); };
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
    check('…and the page is actually light', await p.evaluate(() => getComputedStyle(document.body).backgroundColor)==='rgb(205, 210, 219)');
    await p.evaluate(() => window.__op.ev("ACTIONS.setTheme(null, null, 'dark')"));
    await p.waitForTimeout(400);
    check('switching to dark from settings applies at once', await p.evaluate(() => document.documentElement.getAttribute('data-theme')==='dark' && getComputedStyle(document.body).backgroundColor==='rgb(11, 13, 18)'));
    check('…and is remembered', await p.evaluate(() => JSON.parse(localStorage.getItem('opsdash:profile')).theme)==='dark');
    await settingsGroup(p, 'look');
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
    check('Today shows what it looks like outside (golden hour before sunset)', /Golden hour/.test(await p.textContent('.skyp')) && await p.getAttribute('.today-hero', 'data-sky')==='golden');
    // the weather service, stubbed (no internet in the test box)
    await p.evaluate(() => { window.fetch = async (u) => ({ ok:true, json: async () => /geocoding/.test(u)
      ? {results:[{name:'Brooklyn', admin1:'New York', country_code:'US', latitude:40.65, longitude:-73.95}]}
      : {current:{temperature_2m:61.4, apparent_temperature:59, weather_code:63, is_day:1, cloud_cover:90, wind_speed_10m:8}, daily:{temperature_2m_max:[66], temperature_2m_min:[52]}} }); });
    await settingsGroup(p, 'look');
    await p.fill('#wxQuery', 'Brooklyn'); await p.click('[data-action="wxSearch"]'); await p.waitForTimeout(200);
    await p.click('.wx-result'); await p.waitForTimeout(400);
    const wx = await E("state.settings.weather");
    check('picking a city saves the place and pulls the weather', wx.place==='Brooklyn, New York' && wx.current && wx.current.temp===61 && wx.current.code===63, wx);
    await p.click('[data-action="nav"][data-view="today"]'); await p.waitForTimeout(150);
    const chip = await p.textContent('.skyp');
    check('…and Today shows it (61°, rain)', /61°/.test(chip) && /rain/i.test(chip), chip);
    // scenes
    await settingsGroup(p, 'look');
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

  // ---- leads board fits the screen (Grid) / slides as a 3D carousel (Carousel) ----
  {
    const leads = []; for(let i=0;i<8;i++) leads.push({id:'l'+i, company:'Lead '+i, stage:['lead','contacted','call','proposal'][i%4], value:900, createdAt:'2026-09-20', touchpoints:[]});
    const clients = []; for(let i=0;i<6;i++) clients.push({id:'c'+i, name:'C'+i, business:'Biz '+i, status:'active', stage:'active', mrr:1000, createdAt:'2026-09-01', touches:['2026-10-07'], touchpoints:[], deliverables:[], journal:[]});
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre'}, tasks, business:{packages:[], pipeline:leads, clients}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="leads"]'); await p.waitForTimeout(200);
    const fit = await p.evaluate(() => { const t = document.querySelector('.crm-car .car-track'); return {sw:t.scrollWidth, cw:t.clientWidth, cols:t.querySelectorAll('.crm-col').length, arrows:[...document.querySelectorAll('.crm-car .car-arrow')].filter(a => getComputedStyle(a).opacity!=='0').length}; });
    check('Grid: every lead stage fits across the screen — no sideways scrolling', fit.cols>=6 && fit.sw <= fit.cw+2 && fit.arrows===0, fit);
    await settingsGroup(p, 'look');
    await p.click('.set-more > summary[data-action="toggleSetMore"]'); await p.waitForTimeout(100); // card layout is folded under "More appearance options" now
    await p.click('[data-action="setCardLayout"][data-id="carousel"]'); await p.waitForTimeout(150);
    await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="leads"]'); await p.waitForTimeout(300);
    const car = await p.evaluate(() => { const w = document.querySelector('.crm-car'), t = w.querySelector('.car-track'); return {threeD:w.classList.contains('is-3d'), over:t.scrollWidth > t.clientWidth, next:w.classList.contains('can-next'), prev:w.classList.contains('can-prev'), fade:t.classList.contains('fade-r'), bar:getComputedStyle(t).scrollbarWidth}; });
    check('Carousel: the board slides — faded edge and a › arrow, no scrollbar', car.threeD && car.over && car.next && !car.prev && car.fade && car.bar==='none', car);
    await p.click('.crm-car .car-next'); await p.waitForTimeout(800);
    const moved = await p.evaluate(() => { const w = document.querySelector('.crm-car'); return {left:w.querySelector('.car-track').scrollLeft, prev:w.classList.contains('can-prev')}; });
    check('…the arrow slides it along and the ‹ arrow appears', moved.left > 100 && moved.prev, moved);
    const tilt = await p.evaluate(() => [...document.querySelectorAll('.crm-car .crm-col')].some(c => getComputedStyle(c).transform!=='none' && getComputedStyle(c).transform!=='matrix(1, 0, 0, 1, 0, 0)'));
    check('…columns near the ends tilt in 3D', tilt);
    await p.click('[data-action="businessTab"][data-tab="clients"]'); await p.waitForTimeout(200);
    check('client cards ride the same carousel', await p.isVisible('.carousel .cc2-car') || await p.isVisible('.cc2-car'));
    await p.click('[data-action="nav"][data-view="focus"]'); await p.waitForTimeout(200);
    check('…and so does today\'s lineup of tasks', (await p.$$('[data-dropzone="today"] .carousel .task-card')).length===1 || (await p.$$('[data-dropzone="today"] .car-track > *')).length>=1);
    check('carousel layout is remembered', (await E("JSON.parse(localStorage.getItem('opsdash:profile')).cardLayout"))==='carousel');
    check('no errors in either layout', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- board backgrounds ----
  {
    const els=[{id:'e1', type:'note', header:false, title:'', body:'Hi', x:40, y:40, w:200, h:80},{id:'e4',type:'line',color:'#E7E9EE',width:2,arrow:true,x1:300,y1:60,x2:500,y2:120}];
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre'}, tasks, boards:{boards:[{id:'v1',kind:'vision',name:'Vision Board',parentId:null,elements:els,viewport:{x:0,y:0,zoom:1}}], masterId:'v1'}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="journal"]'); await p.click('[data-action="journalMode"][data-id="boards"]'); await p.waitForTimeout(250);
    check('boards start on "Match theme" (dark in dark mode)', await p.evaluate(() => getComputedStyle(document.getElementById('boardHost')).backgroundColor)==='rgb(10, 12, 16)');
    await p.click('[data-action="boardBgToggle"]'); await p.waitForTimeout(150);
    check('the Background button opens a picker of looks + photo upload', (await p.$$('.board-bg-sw')).length>=10 && await p.isVisible('[data-action="boardBgUpload"]'));
    await p.click('[data-action="boardSetBg"][data-id="paper"]'); await p.waitForTimeout(200);
    const paper = await p.evaluate(() => { const h = document.getElementById('boardHost'); return {bg:getComputedStyle(h).backgroundColor, light:h.classList.contains('board-light'), card:getComputedStyle(h.querySelector('.bel-note')).backgroundColor, line:getComputedStyle(h.querySelector('.board-lines line')).stroke}; });
    check('Paper: light background, white cards, dark lines', paper.bg==='rgb(246, 242, 233)' && paper.light && paper.card==='rgb(255, 255, 255)' && paper.line==='rgb(42, 47, 60)', paper);
    check('…saved on the board', (await E("state.boards.boards[0].bg"))==='paper');
    await p.click('[data-action="boardSetBg"][data-id="sunset"]'); await p.waitForTimeout(200);
    check('gradients paint the still layer under the cards', /gradient/.test(await p.evaluate(() => document.querySelector('#boardHost > .board-bg').style.backgroundImage)));
    await p.click('[data-action="nav"][data-view="today"]'); await p.waitForTimeout(250);
    check('the vision board on Today shows its background too', /gradient/.test(await p.evaluate(() => (document.querySelector('.vision-panel-box .board-static')||{style:{}}).style.background||'')));
    check('no errors', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- right-click everywhere ----
  {
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre'}, tasks, journal:{entries:[{id:'j1',timestamp:NOW-3600e3,date:'2026-10-08',text:'Shot two reels.'},{id:'j2',timestamp:NOW-7200e3,date:'2026-10-08',text:'Batch edits tomorrow.'}]},
      business:{packages:[], pipeline:[{id:'l1',company:'Peak Roofing',stage:'proposal',value:2000,createdAt:'2026-09-20',touchpoints:[]}], clients:[]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.mouse.click(1200, 600, {button:'right'}); await p.waitForTimeout(100);
    check('right-click on the page opens Operator\'s own menu (short: lock in, new task, note — no theme/scene clutter since round 18)', await p.isVisible('#appCtxMenu') && /Lock in/.test(await p.textContent('#appCtxMenu')) && !/Theme|Scene/.test(await p.textContent('#appCtxMenu')));
    await p.keyboard.press('Escape'); await E("ctxClose()");
    await p.mouse.click(1200, 600, {button:'right'}); await p.click('#appCtxMenu [data-op="add"][data-a="task"]'); await p.waitForTimeout(150);
    check('…quick add opens the new-task pop-up', await p.isVisible('#addTaskOverlay:not(.hidden)'));
    await p.keyboard.press('Escape');
    await p.click('#newTaskTitle', {button:'right'}).catch(()=>{});
    check('text fields keep the normal menu', !(await p.isVisible('#appCtxMenu')));
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
    // journal: no buttons on the entry, everything on right-click
    await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="journal"]'); await p.waitForTimeout(200);
    check('journal entries no longer show Pin / Edit / Remove buttons', (await p.$$('.journal-entry [data-action="togglePinJournal"], .journal-entry [data-action="openJournalEditModal"], .journal-entry [data-action="armDelete"]')).length===0);
    await p.click('.journal-entry[data-journal-id="j2"] .journal-text', {button:'right'}); await p.waitForTimeout(100);
    await p.click('#appCtxMenu [data-op="jPin"]'); await p.waitForTimeout(150);
    check('right-click → Pin pins the entry', (await E("state.journal.entries.find(e=>e.id==='j2').pinned"))===true);
    // the journal page grew (titles, types), so j1 can sit below the fold: scroll it in first, since any scroll closes the menu
    await p.locator('.journal-entry[data-journal-id="j1"] .journal-text').scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
    await p.click('.journal-entry[data-journal-id="j1"] .journal-text', {button:'right'}); await p.click('#appCtxMenu [data-op="jRemove"]'); await p.waitForTimeout(150);
    check('right-click → Remove removes it…', (await E("state.journal.entries.length"))===1);
    await E("ACTIONS.undoJournalRemove()"); await p.waitForTimeout(100);
    check('…with Undo', (await E("state.journal.entries.length"))===2);
    await p.locator('.journal-entry[data-journal-id="j1"] .journal-text').scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
    await p.click('.journal-entry[data-journal-id="j1"] .journal-text', {button:'right'}); await p.click('#appCtxMenu [data-op="jEdit"]'); await p.waitForTimeout(150);
    check('right-click → Edit opens the editor', await p.isVisible('#journalEditOverlay:not(.hidden)'));
    await p.keyboard.press('Escape');
    // leads
    await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="leads"]'); await p.waitForTimeout(200);
    await p.click('.crm-card .crm-card-name', {button:'right'}); await p.waitForTimeout(100);
    await p.click('#appCtxMenu [data-op="touch"][data-b="call"]'); await p.waitForTimeout(150);
    check('right-click a lead → log a call', (await E("state.business.pipeline[0].touchpoints.length"))===1 && (await E("state.business.pipeline[0].touchpoints[0].type"))==='call');
    await p.click('.crm-card .crm-card-name', {button:'right'}); await p.click('#appCtxMenu [data-op="stage"][data-b="discovery"]').catch(()=>{}); await p.waitForTimeout(150);
    check('…or move it to another stage', (await E("state.business.pipeline[0].stage"))==='discovery');
    check('no errors', !p.errors.length, p.errors);
    await p.context().close();
  }

  // ---- outreach: follow-ups, one-tap reach out, meetings, the week ----
  {
    const tp = (d,t) => ({id:'tp'+d+(t||''), type:t||'text', date:d, note:''});
    const p = await newPage(b, OUT+'/r5.html', {profile:{name:'Andre Flicz'}, tasks,
      calendar:{events:[{id:'ev1', date:'2026-10-08', time:'10:00', title:'Strategy call', linkedClient:'lead:l1'}, {id:'ev2', date:'2026-10-08', time:'17:00', title:'Later call', linkedClient:'c1'}]},
      business:{packages:[], crm:{autoMeetingSince:'2026-10-01'}, pipeline:[{id:'l1', company:'Peak Roofing', name:'Mike Brown', phone:'(555) 201-3344', email:'mike@peak.com', stage:'proposal', value:2000, createdAt:'2026-09-20', touchpoints:[tp('2026-10-06','call')]}, {id:'l2', company:'No Phone Co', stage:'lead', value:500, createdAt:'2026-10-07', touchpoints:[]}],
        clients:[{id:'c1', name:'Nina Park', business:'Nina Co', status:'active', stage:'active', mrr:2500, createdAt:'2026-09-01', touches:[], touchpoints:[tp('2026-10-07','dm')], deliverables:[], journal:[]}]}}, NOW);
    const E = c => p.evaluate(x => window.__op.ev(x), c);
    await p.waitForTimeout(4500);
    check('a calendar meeting linked to a lead logs a "meeting" touch once it starts', (await E("state.business.pipeline[0].touchpoints.some(t=>t.type==='meeting' && t.date==='2026-10-08')")) && (await E("state.calendar.events[0].touchLogged"))===true);
    check('…but not one that hasn\'t started yet', !(await E("state.business.clients[0].touchpoints.some(t=>t.type==='meeting')")));
    await E("autoLogMeetings()");
    check('…and only once', (await E("state.business.pipeline[0].touchpoints.filter(t=>t.type==='meeting').length"))===1);
    // follow-up with a reason
    await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="leads"]'); await p.waitForTimeout(200);
    await p.click('.crm-card[data-crm-drag="lead:l1"] .crm-card-name', {button:'right'}); await p.click('#appCtxMenu [data-op="fu"][data-b="3"]'); await p.waitForTimeout(100);
    await p.fill('#fuNote', 'send the case study'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    const fu = await E("state.business.pipeline[0].followUp");
    check('right-click → Follow up in 3 days, with a reason', fu && fu.date==='2026-10-11' && fu.note==='send the case study', fu);
    check('…the card says when and why', /follow up Sun · send the case study/.test(await p.textContent('.crm-card[data-crm-drag="lead:l1"] .crm-due')));
    check('…and it replaces the usual rhythm', (await E("crmNextDue('lead', state.business.pipeline[0])"))==='2026-10-11');
    await E("state.business.pipeline[0].followUp.date='2026-10-08'; renderView()");
    check('on the day, it shows up in the reach-out list', await E("reachOutList().some(r=>r.x.id==='l1')"));
    // one tap
    await E("openExternal = function(u){ window.__ext = u; }");
    await p.click('.crm-card[data-crm-drag="lead:l1"] .crm-card-name', {button:'right'}); await p.click('#appCtxMenu [data-op="reach"][data-b="text"]'); await p.waitForTimeout(150);
    const url = await p.evaluate(() => window.__ext || '');
    check('Text opens Messages with the template filled in', url.indexOf('sms:5552013344&body=')===0 && /Hey%20Mike!%20Andre%20Flicz%20here/.test(url), url.slice(0, 90));
    check('…logs the text', (await E("state.business.pipeline[0].touchpoints.slice(-1)[0].type"))==='text');
    check('…and completes the follow-up', (await E("state.business.pipeline[0].followUp"))===null);
    await E("reachOut('lead','l1','email')");
    check('Email opens Mail with subject + body', /^mailto:mike%40peak\.com\?subject=Quick%20follow-up&body=Hi%20Mike/.test(await p.evaluate(() => window.__ext)));
    await p.evaluate(() => { window.__ext = ''; });
    await E("reachOut('lead','l2','text')");
    check('no phone number: asks for one instead of texting', !(await p.evaluate(() => window.__ext)) && (await E("state.business.pipeline[1].touchpoints.length"))===0 && await p.isVisible('#contactOverlay:not(.hidden)'));
    await p.keyboard.press('Escape');
    // the week
    await p.click('[data-action="businessTab"][data-tab="overview"]'); await p.waitForTimeout(200);
    const wk = await p.evaluate(() => { const o = document.querySelector('.hq-outreach'); return o ? {text:o.textContent, bars:o.querySelectorAll('.ow-day').length} : null; });
    check('Business overview shows this week\'s outreach (reached, due, streak)', wk && wk.bars===7 && /people reached/.test(wk.text) && /day streak/.test(wk.text) && /Peak Roofing/.test(wk.text), wk && wk.text.slice(0, 120));
    // templates
    await settingsGroup(p, 'work'); await p.waitForTimeout(150);
    await p.fill('[data-tpl="leadText"]', 'Yo {first}, {me} here'); await p.waitForTimeout(500);
    check('message templates are editable in Settings → Business', (await E("crm().templates.leadText"))==='Yo {first}, {me} here' && (await E("fillTemplate(crm().templates.leadText,'lead',state.business.pipeline[0])"))==='Yo Mike, Andre Flicz here');
    check('no errors', !p.errors.length, p.errors);
    await p.context().close();
  }

  await b.close();
  process.exit(report() ? 1 : 0);
})();

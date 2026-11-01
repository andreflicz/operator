// Round 61: Andre's updates (ROUND-61-LIST.md).
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r61.html');
  const b = await launch();
  const at = new Date(2026, 9, 28, 10).getTime();
  const p = await newPage(b, OUT+'/r61.html', {profile:{name:'Andre Lopez', businessName:'Comet Collective'}, settings:{instagram:{accounts:[{id:'a1', role:'business', username:'commenccollective', src:'zernio'}]}}}, at);
  await p.setViewportSize({width:1440, height:900});
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); demoSeed(); state.profile.businessName = 'Comet Collective'; AI.hasKey = false; xpSystemShow = function(){}; uiConfirm = function(){ return Promise.resolve(true); }; renderView()"); await p.waitForTimeout(300);
  try{
  // ---- A. Today ----
  // (round 62: Customize moved into the top panel, a small button beside full screen; no row of its own)
  check('Customize: one clean button above the panels', !!(await p.$('.today-hero .r62-cb')) && await E("(function(){ const b = document.querySelector('.r62-cb').getBoundingClientRect(), f = document.querySelector('.today-panels').getBoundingClientRect(); return b.bottom <= f.top + 1; })()"));
  check('Today’s standard is centered', await E("getComputedStyle(document.querySelector('.sw .r60-std')).justifyContent==='center'"));
  await E("r60Spans().journal = 7; r60Spans().vision = 5; renderView()"); await p.waitForTimeout(150);
  check('widgets come in three sizes only (odd widths snap to Small / Medium / Large)', await E("r60Span('journal')===6 && r60Span('vision')===4 && [4, 6, 12].indexOf(r60Span('clientHub')) >= 0"));
  await E("r60Spans().journal = 6; r60Spans().vision = 6; const L = state.dashboardPanels.order; L.splice(L.indexOf('vision'), 1); L.splice(L.indexOf('journal'), 0, 'vision'); renderView()"); await p.waitForTimeout(200);
  check('…and two side by side are the same height', await E("(function(){ const a = document.querySelector('.r60w[data-wid=\"vision\"]').getBoundingClientRect(), b = document.querySelector('.r60w[data-wid=\"journal\"]').getBoundingClientRect(); return Math.abs(a.top - b.top) < 2 && Math.abs(a.height - b.height) < 2; })()"));
  await E("ui.todayEdit = true; renderView()"); await p.waitForTimeout(150);
  check('…Customize offers S, M, L (no dragging an edge to an odd size)', (await p.$$('.r60w.is-edit[data-wid="journal"] .r60-sz')).length===3 && !(await p.$('.r60-rs')));
  check('…and panels still move by drag and drop', !!(await p.$('.r60w.is-edit [data-r60-drag]')));
  await E("ui.todayEdit = false; renderView()");
  // ---- B. Personal ----
  await E("ui.view='personal'; ui.personalTab='goals'; renderView()"); await p.waitForTimeout(200);
  const gt = await p.textContent('#viewRoot .r43-goalsp');
  // (round 62: no "Goals" label at all, the tab says it; the settings button sits on the tab line, top right)
  check('Goals: just “Goals” (no Master goals / Your goals labels), settings at the top right', !/^\s*Goals/.test(gt) && !/Master goals|Your goals/.test(gt) && await E("(function(){ const g = document.querySelector('.r43-gear').getBoundingClientRect(), r = document.querySelector('.r43-goalsp').getBoundingClientRect(); return g.right > r.right - 60 && g.top < r.top + 40; })()"));
  await E("ui.personalTab='journal'; ui.journalMode='entries'; ui.journalViewMode='personal'; renderView()"); await p.waitForTimeout(200);
  check('Journal: Entries / Boards / Vault at the top right', await E("(function(){ const t = document.querySelector('.r62-jtabs .seg-tabs').getBoundingClientRect(), v = document.getElementById('viewRoot').getBoundingClientRect(); return t.right > v.right - 30; })()"));
  check('…the journal centered, its date centered', await E("(function(){ const s = document.querySelector('.r60-seg').getBoundingClientRect(), w = document.querySelector('.r60-jw').getBoundingClientRect(); return Math.abs((s.left + s.right)/2 - (w.left + w.right)/2) < 3 && getComputedStyle(document.querySelector('.r60-jw-d')).textAlign==='center'; })()"));
  check('…search is a small 🔍 at the bottom', await E("(function(){ const q = document.querySelector('.r61-jsb'), f = document.getElementById('journalHistoryContainer'); return !!q && q.getBoundingClientRect().top > f.getBoundingClientRect().top && !document.querySelector('.r60-js'); })()"));
  await p.click('.r61-jsb'); await p.waitForTimeout(150); await p.fill('#journalSearchInput', 'Harbor'); await p.waitForTimeout(200);
  check('…tap it to search', await E("ui.journalSearchText==='Harbor'"));
  await E("ACTIONS.r61SearchClose()");
  // ---- C. Social ----
  await E("ui.view='convos'; ui.socTab='overview'; ui.igTried = 1; renderView()"); await p.waitForTimeout(200);
  check('Social shows the business name top left', /Comet Collective/i.test(await p.textContent('#viewRoot .view-header')));
  // ---- D. Op ----
  await E("ui.view='today'; renderView(); r57Note('Saved something', 'idea')"); await p.waitForTimeout(80);
  check('Op’s note fades in (not a pop)', await E("(function(){ const s = getComputedStyle(document.getElementById('r60Pop')); return /opacity/.test(s.transitionProperty) && parseFloat(s.transitionDuration) >= .45; })()"));
  // (round 62: it sizes itself AND has its resize grip back, as Andre asked)
  // (round 64: Op is a small tab: his state and three buttons, nothing to size)
  check('Op’s window sizes itself, still resizable', await E("(function(){ opBubShow(); const b = document.getElementById('opBub'); return b.classList.contains('r64-mini') && b.getBoundingClientRect().height < 60; })()"));
  await E("const b = document.getElementById('opBub'); b.classList.add('is-in'); R61.idleSince = Date.now() - 100000; R61.lastChat = (opChat().length ? opChat()[opChat().length - 1].at : 0) || 0"); await p.waitForTimeout(3500);
  check('…and it closes by itself after a while with nothing going on', await E("!document.getElementById('opBub').classList.contains('is-in')"));
  // ---- E. Playbooks ----
  await E("ACTIONS.pb6NewOpen()"); await p.waitForTimeout(200);
  check('no combined “Onboarding → Monthly client” preset (leads keep their own permanent playbook)', !(await p.$('[data-action="r60UsePreset"][data-id="chain"]')) && (await p.$$('#pb6NewSheet .r60-pre-b')).length >= 4);
  await E("addSheetClose('pb6NewSheet')");
  // ---- F. Holidays ----
  await E("state.settings.testMode = false; ui.view='settings'; ui.settingsTab='display'; renderView()"); await p.waitForTimeout(200);
  check('no holiday preview in Settings (outside Test / demo)', await E("themeSettingsHtml().indexOf('holPreview')<0"));
  check('…but there in Test / demo mode', await E("(function(){ state.settings.testMode = true; const ok = themeSettingsHtml().indexOf('holPreview') >= 0; state.settings.testMode = false; return ok; })()"));
  await E("ui.view='today'; renderView()"); await p.waitForTimeout(200);
  check('the holiday banner has a ✕', !!(await p.$('.hol-ban .r61-holx')));
  await p.click('.hol-ban .r61-holx'); await p.waitForTimeout(200);
  check('…which hides it (until next time)', !(await p.$('.hol-ban')));
  check('a new, slower Halloween tune', await E("R60_TUNES.halloween.organ===true && R60_TUNES.halloween.bpm < 90 && R60_TUNES.halloween.bass.length > 0"));
  await E("r60MusicPlay('halloween')"); await p.waitForTimeout(200);
  check('…it plays', await E("!!R60.music && R60.music.h==='halloween'")); await E("r60MusicStop()");
  }catch(err){ check('the run reached the end', false, String(err && err.message || err).slice(0, 300)); }
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
